import SwiftUI
import CryptoKit

enum SongCollection: String, CaseIterable, Identifiable {
    case jamloom = "Jamloom", community = "Community", favorites = "Favorites", mine = "My songs", device = "On device"
    var id: String { rawValue }
    var view: String { self == .jamloom ? "validation" : self == .community ? "public" : "mine" }
}
struct LibrarySong: Codable, Identifiable, Equatable {
    let id: String
    let title: String
    let language: String
    let direction: String?
    let product: String?
    let visibility: String?
    let withdrawn_at: String?
    var source: CloudSongProduct = .musicDNA
    enum CodingKeys: String, CodingKey { case id, title, language, direction, product, visibility, withdrawn_at }
    var key: String { source.rawValue + ":" + id }
    var productName: String { source == .improvise ? "Improvise" : "Music DNA" }
    var languageName: String { Locale.current.localizedString(forLanguageCode: language) ?? language }
}
struct LibraryFavorite: Codable { let song: LibrarySong; let product: String }
struct LibraryPage: Decodable {
    let songs: [LibrarySong]
    let next: String?
    let signIn: Bool?
    let available: Bool?
    func validated(product: CloudSongProduct) throws -> [LibrarySong] {
        guard songs.count <= 500, next == nil || next?.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil else { throw URLError(.cannotParseResponse) }
        return try songs.filter { $0.product == nil || $0.product == product.rawValue }.map { song in
            guard song.id.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil,
                  !song.title.isEmpty, song.title.count <= 300, song.language.count <= 32,
                  (song.direction?.count ?? 0) <= 100 else { throw URLError(.cannotParseResponse) }
            var value = song; value.source = product; return value
        }
    }
}
@MainActor final class SongLibraryModel: ObservableObject {
    @Published private(set) var songs: [LibrarySong] = []
    @Published private(set) var busy = false
    @Published private(set) var message = ""
    @Published private(set) var next: [String: String] = [:]
    @Published private(set) var loadingSong: String?
    @Published private(set) var audio: URL?
    @Published private(set) var audioKey: String?
    @Published private(set) var favorites: [LibrarySong] = []
    private var favoriteKey = ""
    private let defaults: UserDefaults
    private var revision = 0
    private var audioRevision = 0
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    func loadFavorites(owner: String?) {
        var namespace = "jamloom-song-favorites-"
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") { namespace += "test-" + (ProcessInfo.processInfo.environment["JAMLOOM_UI_TEST_LIBRARY"] ?? "isolated") }
        #endif
        favoriteKey = namespace + SHA256.hash(data: Data((owner ?? "guest").utf8)).map { String(format: "%02x", $0) }.joined()
        favorites = []
        guard let data = defaults.data(forKey: favoriteKey), data.count <= 1024 * 1024,
              let saved = try? JSONDecoder().decode([LibraryFavorite].self, from: data), saved.count <= 1000 else { return }
        for row in saved {
            guard let product = CloudSongProduct(rawValue: row.product), let song = try? LibraryPage(songs: [row.song], next: nil, signIn: nil, available: nil).validated(product: product).first,
                  !favorites.contains(where: { $0.key == song.key }) else { continue }
            favorites.append(song)
        }
    }
    func toggleFavorite(_ song: LibrarySong) {
        guard !favoriteKey.isEmpty else { return }
        let previous = favorites
        if favorites.contains(where: { $0.key == song.key }) { favorites.removeAll { $0.key == song.key } }
        else if favorites.count < 1000 { favorites.insert(song, at: 0) }
        else { message = "Favorites is full. Remove a song before adding another."; return }
        do { let data = try JSONEncoder().encode(favorites.map { LibraryFavorite(song: $0, product: $0.source.rawValue) }); guard data.count <= 1024 * 1024 else { throw URLError(.dataLengthExceedsMaximum) }; defaults.set(data, forKey: favoriteKey) }
        catch { favorites = previous; message = "Favorites could not be saved." }
    }
    func clearAudio() {
        audioRevision += 1; loadingSong = nil
        if let audio { try? FileManager.default.removeItem(at: audio) }
        audio = nil; audioKey = nil
    }
    func reset() { revision += 1; songs = []; next = [:]; busy = false; message = ""; clearAudio() }
    func load(_ collection: SongCollection, account: AccountModel, more: Bool = false) async {
        if more && busy { return }
        if !more { reset() }
        loadFavorites(owner: account.snapshot?.user.id)
        if collection == .favorites { return }
        guard collection != .device else { return }
        guard collection != .mine || account.snapshot != nil else { message = "Sign in to see your songs."; return }
        let current = revision, owner = account.snapshot?.user.id
        busy = true; message = ""
        defer { if current == revision { busy = false } }
        for product in [CloudSongProduct.improvise, .musicDNA] {
            if more && next[product.rawValue] == nil { continue }
            do {
                var query = ["view": collection.view]
                if more { query["after"] = next[product.rawValue] }
                let page: LibraryPage = try await account.transport.request(product.path, query: query)
                try Task.checkCancellation()
                guard current == revision, owner == account.snapshot?.user.id else { return }
                let rows = try page.validated(product: product)
                let existing = Set(songs.map(\.key))
                songs += rows.filter { !existing.contains($0.key) }
                if more && page.next == query["after"] { throw URLError(.cannotParseResponse) }
                next[product.rawValue] = page.next
                if page.signIn == true { message = "Sign in to see your songs." }
                else if page.available == false { message = "This collection is not available yet." }
                if collection == .jamloom && product == .musicDNA {
                    let examples: LibraryPage = try await account.transport.request(product.path, query: ["view": "examples"])
                    try Task.checkCancellation()
                    guard current == revision, owner == account.snapshot?.user.id else { return }
                    let known = Set(songs.map(\.key))
                    songs += try examples.validated(product: product).filter { !known.contains($0.key) }
                }
            } catch {
                guard current == revision, !Task.isCancelled else { return }
                if case AccountError.signedOut = error { account.reset(); reset(); message = "Sign in again to see your songs."; return }
                message = "Some songs could not load. Pull to refresh or try again."
            }
        }
    }
    func prepare(_ song: LibrarySong, account: AccountModel) async -> URL? {
        clearAudio(); let current = audioRevision, owner = account.snapshot?.user.id
        loadingSong = song.key
        defer { if current == audioRevision { loadingSong = nil } }
        do {
            let file = try await account.transport.songAudio(song.id, product: song.source, temporaryID: UUID())
            guard current == audioRevision, owner == account.snapshot?.user.id, !Task.isCancelled else { try? FileManager.default.removeItem(at: file); return nil }
            audio = file; audioKey = song.key; return file
        } catch {
            if current == audioRevision && !Task.isCancelled { message = "This song could not play. Try again." }
            return nil
        }
    }
}
struct SongLibraryView: View {
    @ObservedObject var account: AccountModel
    @ObservedObject var model: AppModel
    @StateObject private var library = SongLibraryModel()
    @State private var collection: SongCollection = .jamloom
    @State private var search = ""
    @State private var product = ""
    @State private var genre = ""
    @State private var showAccount = false
    @State private var playbackTask: Task<Void, Never>?
    @Environment(\.scenePhase) private var scenePhase
    private let accent = Color(red: 0.78, green: 0.96, blue: 0.32)
    private var selection: String { collection.rawValue + ":" + (account.snapshot?.user.id ?? "") }
    private var filtered: [LibrarySong] {
        (collection == .favorites ? library.favorites : library.songs).filter { (product.isEmpty || $0.source.rawValue == product) && (genre.isEmpty || $0.direction == genre) && (search.isEmpty || [$0.title, $0.languageName, $0.direction ?? ""].joined(separator: " ").localizedCaseInsensitiveContains(search)) }
    }
    private func stop() { playbackTask?.cancel(); playbackTask = nil; model.stopPlayback(); library.clearAudio() }
    var body: some View {
        NavigationStack {
            List {
                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack { ForEach(SongCollection.allCases) { item in
                            Button(item.rawValue) { collection = item }.buttonStyle(.bordered).tint(collection == item ? accent : .gray)
                                .accessibilityAddTraits(collection == item ? .isSelected : []).accessibilityIdentifier("collection-\(item.rawValue)")
                        } }.padding(.vertical, 4)
                    }
                    if collection != .device {
                        HStack {
                            Picker("Product", selection: $product) { Text("All music").tag(""); Text("Improvise").tag("improvise"); Text("Music DNA").tag("music-dna") }
                            Picker("Genre", selection: $genre) { Text("All genres").tag(""); ForEach(Array(Set((collection == .favorites ? library.favorites : library.songs).compactMap(\.direction))).sorted(), id: \.self) { Text($0).tag($0) } }
                        }.labelsHidden()
                    }
                }
                if collection == .device {
                    Section("Your local mixes") {
                        ForEach(model.sessions) { session in
                            ForEach(session.styles, id: \.self) { style in
                                if let url = model.library?.wav(session, style: style) {
                                    Button { Task { await model.play(url) } } label: {
                                        Label(session.isTaste ? "Music DNA · \(style)" : style.capitalized, systemImage: model.playing == url ? "stop.circle.fill" : "play.circle.fill").padding(.vertical, 8)
                                    }
                                }
                            }
                        }
                        if model.sessions.isEmpty { ContentUnavailableView("No local mixes", systemImage: "waveform", description: Text("Your on-device creations will appear here.")) }
                    }
                } else {
                    if collection == .favorites { Text("Saved on this device. Connect to the internet to listen.").font(.caption).foregroundStyle(.secondary) }
                    if library.busy { ProgressView("Loading songs…") }
                    if !library.message.isEmpty {
                        Text(library.message).foregroundStyle(.secondary)
                        Button("Try again") { stop(); Task { await library.load(collection, account: account) } }
                    }
                    if collection == .mine && account.snapshot == nil { Button("Sign in", systemImage: "person.crop.circle") { showAccount = true } }
                    ForEach(filtered, id: \.key) { song in
                        let playing = library.audioKey == song.key && model.playing == library.audio && model.playing != nil
                        HStack {
                        Button {
                            if playing { model.stopPlayback(); return }
                            stop(); playbackTask = Task { if let file = await library.prepare(song, account: account), !Task.isCancelled { await model.play(file) } }
                        } label: {
                            HStack(spacing: 14) {
                                Image(systemName: playing ? "stop.circle.fill" : "play.circle.fill").font(.system(size: 38)).foregroundStyle(accent)
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(song.title).font(.headline).foregroundStyle(.primary)
                                    Text([song.productName, song.languageName, song.direction].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary)
                                    if collection == .mine { Label(song.visibility == "private" ? "Private" : song.withdrawn_at == nil ? "Public" : "Unlisted", systemImage: song.visibility == "private" ? "lock.fill" : "globe").font(.caption2) }
                                }
                                Spacer(minLength: 0)
                                if library.loadingSong == song.key { ProgressView() }
                            }.padding(.vertical, 8).frame(minHeight: 60)
                        }.buttonStyle(.plain).accessibilityLabel("\(playing ? "Stop" : "Play") \(song.title)").accessibilityIdentifier("librarySong-\(song.key)")
                        Button { library.toggleFavorite(song) } label: {
                            Image(systemName: library.favorites.contains(where: { $0.key == song.key }) ? "heart.fill" : "heart").font(.title2).frame(minWidth: 44, minHeight: 44)
                        }.buttonStyle(.plain).foregroundStyle(accent).accessibilityLabel("\(library.favorites.contains(where: { $0.key == song.key }) ? "Unfavorite" : "Favorite") \(song.title)")
                        }
                    }
                    if !library.next.isEmpty { Button("Load more songs") { Task { await library.load(collection, account: account, more: true) } }.disabled(library.busy) }
                    if filtered.isEmpty && !library.busy && library.message.isEmpty { ContentUnavailableView(collection == .favorites ? "Your favorites" : "No songs yet", systemImage: collection == .favorites ? "heart" : "music.note.list", description: Text(collection == .favorites ? "Tap a heart beside a song to find it here later." : search.isEmpty ? "Your generated music could be here." : "Try another search or filter.")) }
                }
            }
            .navigationTitle("Community").searchable(text: $search, prompt: "Search loaded songs")
            .toolbar { Button("Account", systemImage: "person.crop.circle") { stop(); showAccount = true } }
            .sheet(isPresented: $showAccount) { AccountView(account: account) }
            .refreshable { stop(); await library.load(collection, account: account); await model.loadLibrary() }
            .task(id: selection) { stop(); genre = ""; await library.load(collection, account: account); if collection == .device { await model.loadLibrary() } }
            .onDisappear { stop(); library.reset() }
            .onChange(of: scenePhase) { _, phase in if phase != .active { stop() } }
            .tint(accent).preferredColorScheme(.dark)
        }
    }
}
