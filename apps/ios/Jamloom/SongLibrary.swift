import SwiftUI
import CryptoKit
import WebKit

enum SongCollection: String, CaseIterable, Identifiable {
    case all = "All songs", jamloom = "Jamloom", community = "Community", favorites = "Favorites", mine = "My songs", device = "On device"
    var id: String { rawValue }
    var view: String { self == .jamloom ? "validation" : (self == .community || self == .all) ? "public" : "mine" }
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
    var listeningKind: String? = nil
    enum CodingKeys: String, CodingKey { case id, title, language, direction, product, visibility, withdrawn_at, listeningKind }
    var key: String { (listeningKind == "sets" ? "ai-dj" : listeningKind ?? source.rawValue) + ":" + id }
    var productName: String { listeningKind == "catalogue" ? "Community mix" : listeningKind == "aurowall" ? "Aurowall" : source == .aiDJ ? "DJ sets" : source == .improvise ? "Improvise" : "Music DNA" }
    var languageCode: String {
        let value = language.trimmingCharacters(in: .whitespacesAndNewlines)
        return TasteProfile.languages.first { $0.value.caseInsensitiveCompare(value) == .orderedSame }?.key ?? value.lowercased()
    }
    var languageName: String { Locale.current.localizedString(forLanguageCode: languageCode) ?? language }
    static func validLanguage(_ value: String) -> Bool { value.count <= 32 && value.range(of: "^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$", options: .regularExpression) != nil }
}
struct SyncedMusic: Decodable {
    let id: String; let kind: String; let title: String; let language: String?; let mood: String?
    func song() throws -> LibrarySong {
        let pattern = kind == "catalogue" ? "^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$" : kind == "aurowall" ? "^[a-f0-9]{24}$" : "^[a-f0-9]{32}$"
        guard ["music-dna", "improvise", "sets", "catalogue", "aurowall"].contains(kind), id.range(of: pattern, options: .regularExpression) != nil,
              !title.isEmpty, title.count <= 300, (language?.count ?? 0) <= 32, (mood?.count ?? 0) <= 100 else { throw URLError(.cannotParseResponse) }
        let source: CloudSongProduct = kind == "sets" ? .aiDJ : kind == "improvise" ? .improvise : .musicDNA
        return LibrarySong(id: id, title: title, language: language ?? "", direction: mood, product: source.rawValue, visibility: nil, withdrawn_at: nil, source: source, listeningKind: kind)
    }
}
struct SyncedFavorites: Decodable {
    struct Reference: Decodable, Identifiable { let kind: String; let id: String; var key: String { kind + ":" + id } }
    let owner: String; let tracks: [SyncedMusic]; let unavailable: [Reference]
}
struct LibraryFavorite: Codable { let song: LibrarySong; let product: String }
struct LibraryPage: Decodable {
    struct Filters: Decodable { let languages: [String] }
    let songs: [LibrarySong]
    let next: String?
    let signIn: Bool?
    let available: Bool?
    var filters: Filters? = nil
    func validated(product: CloudSongProduct) throws -> [LibrarySong] {
        guard songs.count <= 500, next == nil || next?.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil else { throw URLError(.cannotParseResponse) }
        if let filters { guard filters.languages.count <= 256, filters.languages.allSatisfy({ $0.isEmpty || LibrarySong.validLanguage($0) }) else { throw URLError(.cannotParseResponse) } }
        return try songs.filter { $0.product == nil || $0.product == product.rawValue }.map { song in
            guard song.id.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil,
                  !song.title.isEmpty, song.title.count <= 300, song.language.count <= 32,
                  (song.direction?.count ?? 0) <= 100 else { throw URLError(.cannotParseResponse) }
            var value = song; value.source = product; return value
        }
    }
}
struct PublicSetPage: Decodable {
    struct Entry: Decodable { let id: String; let title: String; let seconds: Double }
    let sets: [Entry]
    let next: String?
    func songPage() throws -> LibraryPage {
        guard sets.count <= 12 else { throw URLError(.cannotParseResponse) }
        let songs = try sets.map { set -> LibrarySong in
            guard set.seconds.isFinite, set.seconds > 0, set.seconds < 366 * 86400 else { throw URLError(.cannotParseResponse) }
            return LibrarySong(id: set.id, title: set.title, language: "", direction: "\(Int(ceil(set.seconds / 60))) min · Full set", product: "ai-dj", visibility: "public", withdrawn_at: nil, source: .aiDJ)
        }
        return LibraryPage(songs: songs, next: next, signIn: nil, available: nil)
    }
}
@MainActor final class SongLibraryModel: ObservableObject {
    @Published private(set) var songs: [LibrarySong] = []
    @Published private(set) var busy = false
    @Published private(set) var message = ""
    @Published private(set) var needsSignIn = false
    @Published private(set) var next: [String: String] = [:]
    @Published private(set) var languages: Set<String> = []
    @Published private(set) var loadingSong: String?
    @Published private(set) var audio: URL?
    @Published private(set) var audioKey: String?
    @Published private(set) var favorites: [LibrarySong] = []
    @Published private(set) var favoriteSync = "Saved on this device."
    @Published private(set) var syncingFavorites = false
    @Published private(set) var deviceFavorites: [LibrarySong] = []
    @Published private(set) var unavailableFavorites: [SyncedFavorites.Reference] = []
    private var favoriteEpoch = 0
    private var favoriteKey = ""
    private var importKey = ""
    private let defaults: UserDefaults
    private var revision = 0
    private var audioRevision = 0
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    func loadFavorites(owner: String?) {
        favoriteEpoch += 1
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
    func syncFavorites(account: AccountModel) async {
        guard let owner = account.snapshot?.user.id else { favoriteSync = "Saved on this device. Sign in to sync."; unavailableFavorites = []; return }
        favoriteEpoch += 1; let epoch = favoriteEpoch
        do {
            let result: SyncedFavorites = try await account.transport.request("/api/favorites")
            guard epoch == favoriteEpoch, owner == account.snapshot?.user.id, result.owner == owner else { return }
            guard result.tracks.count + result.unavailable.count <= 500 else { throw URLError(.cannotParseResponse) }
            favorites = try result.tracks.map { try $0.song() }; unavailableFavorites = result.unavailable
            favoriteSync = "Synced with your account."
        } catch { if epoch == favoriteEpoch, owner == account.snapshot?.user.id { favoriteSync = "Favorites could not sync. Pull to refresh and retry." } }
    }
    func toggleFavorite(_ song: LibrarySong, account: AccountModel) async {
        guard let owner = account.snapshot?.user.id else { toggleFavorite(song); return }
        guard !syncingFavorites else { return }; favoriteEpoch += 1; syncingFavorites = true
        defer { syncingFavorites = false }
        let remove = favorites.contains { $0.key == song.key } || unavailableFavorites.contains { $0.id == song.id && $0.kind == song.listeningKind }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["owner": owner, "id": song.id, "kind": song.listeningKind ?? (song.source == .aiDJ ? "sets" : song.source.rawValue)])
            _ = try await account.transport.requestData("/api/favorites", method: remove ? "DELETE" : "POST", body: body)
            guard owner == account.snapshot?.user.id else { return }; await syncFavorites(account: account)
        } catch { if owner == account.snapshot?.user.id { favoriteSync = "Favorite was not saved. Refresh and try again."; message = favoriteSync } }
    }
    func importDeviceFavorites(account: AccountModel) async {
        guard let owner = account.snapshot?.user.id, !syncingFavorites else { return }; syncingFavorites = true
        defer { syncingFavorites = false }
        do {
            for song in deviceFavorites {
                guard owner == account.snapshot?.user.id else { return }
                let body = try JSONSerialization.data(withJSONObject: ["owner": owner, "id": song.id, "kind": song.listeningKind ?? (song.source == .aiDJ ? "sets" : song.source.rawValue)])
                _ = try await account.transport.requestData("/api/favorites", method: "POST", body: body)
            }
            guard owner == account.snapshot?.user.id else { return }
            defaults.removeObject(forKey: importKey); deviceFavorites = []; await syncFavorites(account: account)
        } catch { favoriteSync = "Import paused. Device favorites are kept; try again." }
    }
    func clearAudio() {
        audioRevision += 1; loadingSong = nil
        if let audio { try? FileManager.default.removeItem(at: audio) }
        audio = nil; audioKey = nil
    }
    func reset(clearPlayback: Bool = true) { revision += 1; songs = []; next = [:]; languages = []; busy = false; message = ""; needsSignIn = false; if clearPlayback { clearAudio() } }
    func load(_ collection: SongCollection, account: AccountModel, more: Bool = false, language: String = "") async {
        if more && busy { return }
        if !more { reset(clearPlayback: false) }
        let current = revision, owner = account.snapshot?.user.id
        busy = true; message = ""
        defer { if current == revision { busy = false } }
        loadFavorites(owner: owner)
        deviceFavorites = favorites; importKey = favoriteKey
        if account.snapshot != nil && deviceFavorites.isEmpty { let guest = SongLibraryModel(defaults: defaults); guest.loadFavorites(owner: nil); deviceFavorites = guest.favorites; importKey = guest.favoriteKey }
        await syncFavorites(account: account)
        guard current == revision, owner == account.snapshot?.user.id, !Task.isCancelled else { return }
        if collection == .favorites { return }
        guard collection != .device else { return }
        guard collection != .mine || account.snapshot != nil else { message = "Sign in to see your songs."; needsSignIn = true; return }
        let products: [CloudSongProduct] = [.improvise, .musicDNA]
        let curated: [(CloudSongProduct, String)] = [(.improvise, "validation"), (.musicDNA, "validation"), (.musicDNA, "examples")]
        let publicSources = (products + [.aiDJ]).map { ($0, "public") }
        let requests: [(CloudSongProduct, String)]
        if more { requests = (products + [.aiDJ]).filter { next[$0.rawValue] != nil }.map { ($0, collection.view) } }
        else if collection == .all { requests = publicSources + curated }
        else if collection == .jamloom { requests = curated }
        else if collection == .community { requests = publicSources }
        else { requests = products.map { ($0, collection.view) } }
        for (product, view) in requests {
            do {
                var query = ["view": view]
                if more { query["after"] = next[product.rawValue] }
                if !language.isEmpty && product != .aiDJ && ["public", "mine"].contains(view) { query["language"] = language }
                let page: LibraryPage
                if product == .aiDJ {
                    query.removeValue(forKey: "view")
                    let sets: PublicSetPage = try await account.transport.request(product.path, query: query)
                    page = try sets.songPage()
                } else { page = try await account.transport.request(product.path, query: query) }
                try Task.checkCancellation()
                guard current == revision, owner == account.snapshot?.user.id else { return }
                let rows = try page.validated(product: product)
                languages.formUnion((page.filters?.languages ?? []) + rows.map(\.languageCode))
                let existing = Set(songs.map(\.key))
                songs += rows.filter { !existing.contains($0.key) }
                if more && page.next == query["after"] { throw URLError(.cannotParseResponse) }
                if view == collection.view { next[product.rawValue] = page.next }
                if page.signIn == true { message = "Sign in to see your songs."; needsSignIn = true }
                else if page.available == false { message = "This collection is not available yet." }
            } catch {
                guard current == revision, !Task.isCancelled else { return }
                if case AccountError.signedOut = error { account.reset(); reset(); message = "Sign in again to see your songs."; needsSignIn = true; return }
                if let failure = error as? SongRequestError, failure.status == 503,
                   failure.message == "Jamloom is coming soon. Public access is not open yet." {
                    message = "Public songs are temporarily unavailable. Please try again later."
                } else if message.isEmpty { message = "Some songs could not load. Pull to refresh or try again." }
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
    @State private var collection: SongCollection = .all
    @State private var search = ""
    @State private var product = ""
    @State private var genre = ""
    @State private var language = ""
    @State private var showAccount = false
    @State private var playingSet: LibrarySong?
    @State private var ratingSong: LibrarySong?
    @State private var playbackTask: Task<Void, Never>?
    @Environment(\.scenePhase) private var scenePhase
    private let accent = Color(red: 0.78, green: 0.96, blue: 0.32)
    private var selection: String { collection.rawValue + ":" + (account.snapshot?.user.id ?? "") + ":" + language }
    private var languageOptions: [String] {
        Set((collection == .favorites ? library.favorites.map(\.languageCode) : Array(library.languages)) + [language]).filter { LibrarySong.validLanguage($0) }.sorted {
            (Locale.current.localizedString(forLanguageCode: $0) ?? $0).localizedStandardCompare(Locale.current.localizedString(forLanguageCode: $1) ?? $1) == .orderedAscending
        }
    }
    private var filtered: [LibrarySong] {
        (collection == .favorites ? library.favorites : library.songs).filter { (product.isEmpty || $0.source.rawValue == product) && (genre.isEmpty || $0.direction == genre) && (language.isEmpty || $0.languageCode == language) && (search.isEmpty || [$0.title, $0.languageName, $0.direction ?? ""].joined(separator: " ").localizedCaseInsensitiveContains(search)) }
    }
    private func stop() { playingSet = nil; playbackTask?.cancel(); playbackTask = nil; model.stopPlayback(); library.clearAudio() }
    private func streamURL(_ song: LibrarySong) -> URL? {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-testing"), ProcessInfo.processInfo.arguments.contains("--community-fixture"), let audio = try? CommunityFixture.playbackAudio() {
            return URL(string: "data:audio/wav;base64," + audio.base64EncodedString())
        }
        #endif
        return try? account.transport.listeningURL(song)
    }
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
                            Picker("Product", selection: $product) { Text("All music").tag(""); Text("Improvise").tag("improvise"); Text("Music DNA").tag("music-dna"); Text("DJ sets").tag("ai-dj") }
                            Picker("Genre", selection: $genre) { Text("All genres").tag(""); ForEach(Array(Set((collection == .favorites ? library.favorites : library.songs).compactMap(\.direction) + [genre])).filter { !$0.isEmpty }.sorted(), id: \.self) { Text($0).tag($0) } }
                        }.labelsHidden()
                        Picker(selection: $language) {
                            Text("All languages").tag("")
                            ForEach(languageOptions, id: \.self) { Text(Locale.current.localizedString(forLanguageCode: $0) ?? $0).tag($0) }
                        } label: { Label("Language", systemImage: "globe") }
                        .pickerStyle(.menu).accessibilityIdentifier("communityLanguage")
                    }
                }
                if collection == .device {
                    Section("Your local mixes") {
                        ForEach(model.sessions) { session in
                            ForEach(session.styles, id: \.self) { style in
                                if let url = model.library?.wav(session, style: style) {
                                    Button {
                                        let wasPlaying = model.playing == url; stop()
                                        if !wasPlaying { Task { await model.play(url, title: session.isTaste ? "Music DNA · \(style)" : style.capitalized) } }
                                    } label: {
                                        Label(session.isTaste ? "Music DNA · \(style)" : style.capitalized, systemImage: model.playing == url ? "stop.circle.fill" : "play.circle.fill").padding(.vertical, 8)
                                    }
                                    MusicRatingButton(kind: "local-remix", id: session.id.uuidString + style, title: style.capitalized, account: account, localAudio: url)
                                }
                            }
                        }
                        if model.sessions.isEmpty { ContentUnavailableView("No local mixes", systemImage: "waveform", description: Text("Your on-device creations will appear here.")) }
                    }
                } else {
                    if collection == .favorites { Text(library.favoriteSync).font(.caption).foregroundStyle(.secondary) }
                    if collection == .favorites && account.snapshot != nil && !library.deviceFavorites.isEmpty {
                        Button("Import device favorites") { Task { await library.importDeviceFavorites(account: account) } }.disabled(library.syncingFavorites)
                    }
                    if collection == .favorites {
                        ForEach(library.unavailableFavorites, id: \.key) { item in
                            Button("Remove unavailable song") { if let song = try? SyncedMusic(id: item.id, kind: item.kind, title: "Unavailable song", language: nil, mood: nil).song() { Task { await library.toggleFavorite(song, account: account) } } }.disabled(library.syncingFavorites)
                        }
                    }
                    if library.busy { ProgressView("Loading songs…") }
                    if !library.message.isEmpty {
                        Text(library.message).foregroundStyle(.secondary)
                        Button("Try again") { Task { await library.load(collection, account: account, language: language) } }
                    }
                    if library.needsSignIn { Button(account.snapshot == nil ? "Sign in" : "Change account", systemImage: "person.crop.circle") { showAccount = true } }
                    ForEach(filtered, id: \.key) { song in
                        let playing = playingSet?.key == song.key || (library.audioKey == song.key && model.playing == library.audio && model.playing != nil)
                        HStack {
                        Button {
                            if playing { stop(); return }
                            stop()
                            if song.source == .aiDJ || ["catalogue", "aurowall"].contains(song.listeningKind ?? "") { playingSet = song; return }
                            playbackTask = Task { if let file = await library.prepare(song, account: account), !Task.isCancelled { await model.play(file, title: song.title) } }
                        } label: {
                            HStack(spacing: 14) {
                                Image(systemName: playing ? "stop.circle.fill" : "play.circle.fill").font(.system(size: 38)).foregroundStyle(accent)
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(song.title).font(.headline).foregroundStyle(.primary)
                                    Text([song.productName, song.languageName, song.direction].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary)
                                    if collection == .mine { Label(song.visibility == "private" ? "Private" : song.withdrawn_at == nil ? "Public" : "Unlisted", systemImage: song.visibility == "private" ? "lock.fill" : "globe").font(.caption2) }
                                }
                                Spacer(minLength: 0)
                                if library.loadingSong == song.key { ProgressView() }
                            }.padding(.vertical, 8).frame(minHeight: 60)
                        }.buttonStyle(.plain).accessibilityLabel("\(playing ? "Stop" : "Play") \(song.title)").accessibilityIdentifier("librarySong-\(song.key)")
                        Button { Task { await library.toggleFavorite(song, account: account) } } label: {
                            Image(systemName: library.favorites.contains(where: { $0.key == song.key }) ? "heart.fill" : "heart").font(.title2).frame(minWidth: 44, minHeight: 44)
                        }.buttonStyle(.plain).disabled(library.syncingFavorites).foregroundStyle(accent).accessibilityLabel("\(library.favorites.contains(where: { $0.key == song.key }) ? "Unfavorite" : "Favorite") \(song.title)")
                        }.contextMenu { if song.listeningKind != "aurowall" { Button("Rate this music", systemImage: "hand.thumbsup") { ratingSong = song } } }
                        if song.listeningKind != "aurowall" {
                            Button { ratingSong = song } label: { Label("Rate", systemImage: "hand.thumbsup").frame(maxWidth: .infinity, minHeight: 44, alignment: .leading) }
                                .buttonStyle(.borderless).font(.caption).accessibilityIdentifier("rateMusic-\(song.key)")
                        }
                    }
                    if !library.next.isEmpty { Button("Load more songs") { Task { await library.load(collection, account: account, more: true, language: language) } }.disabled(library.busy) }
                    if filtered.isEmpty && !library.busy && library.message.isEmpty {
                        if !language.isEmpty || !genre.isEmpty || !product.isEmpty || !search.isEmpty {
                            ContentUnavailableView("No matching songs", systemImage: "line.3.horizontal.decrease", description: Text("Try another language or clear your filters."))
                            Button("Clear filters") { language = ""; genre = ""; product = ""; search = "" }
                        } else { ContentUnavailableView(collection == .favorites ? "Your favorites" : "No songs yet", systemImage: collection == .favorites ? "heart" : "music.note.list", description: Text(collection == .favorites ? "Tap a heart beside a song to find it here later." : "Your generated music could be here.")) }
                    }
                }
            }
            .navigationTitle("Community").searchable(text: $search, prompt: "Search loaded songs")
            .toolbar { ProductHelpButton(product: "community"); Button("Account", systemImage: "person.crop.circle") { stop(); showAccount = true } }
            .sheet(item: $ratingSong) { song in MusicFeedbackView(kind: song.listeningKind == "catalogue" ? "library" : song.source == .aiDJ ? "sets" : song.source.rawValue, id: song.id, title: song.title, account: account) }
            .sheet(isPresented: $showAccount) { AccountView(account: account) }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if let song = playingSet {
                    VStack(spacing: 0) {
                        HStack { Text(song.title).font(.headline).lineLimit(1); Spacer(); Button { stop() } label: { Image(systemName: "xmark").frame(width: 44, height: 44) }.accessibilityLabel("Close music player") }.padding(.horizontal, 16)
                        if #available(iOS 17.4, *), let url = streamURL(song) {
                            SetAudioView(url: url, cookies: account.transport.session.configuration.httpCookieStorage?.cookies(for: url) ?? []).id(song.key).frame(height: 150)
                        } else { Text("DJ set playback requires iOS 17.4 or later.").padding() }
                    }.frame(maxWidth: 760).frame(maxWidth: .infinity).background(.ultraThinMaterial)
                } else { PlaybackBar(model: model) }
            }
            .refreshable { await library.load(collection, account: account, language: language); await model.loadLibrary() }
            .task(id: selection) { await library.load(collection, account: account, language: language); if collection == .device { await model.loadLibrary() } }
            .onChange(of: account.snapshot?.user.id) { _, _ in stop() }
            .onChange(of: collection) { _, _ in genre = "" }
            .onDisappear { stop(); library.reset() }
            .onChange(of: scenePhase) { _, phase in if phase != .active { stop() } else { Task { await library.syncFavorites(account: account) } } }
            .tint(accent).preferredColorScheme(.dark)
        }
    }
}

// Stream long performances through the same audio element used on the website.
struct SetAudioView: UIViewRepresentable {
    let url: URL
    var cookies: [HTTPCookie] = []
    final class Coordinator { var loading: Task<Void, Never>? }
    func makeCoordinator() -> Coordinator { Coordinator() }
    static func player(url: URL, muted: Bool = false, cookies: [HTTPCookie] = [], coordinator: Coordinator = Coordinator()) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.isOpaque = false; view.backgroundColor = .black; view.scrollView.backgroundColor = .black
        let source = url.absoluteString.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "\"", with: "&quot;").replacingOccurrences(of: "<", with: "&lt;")
        let html = """
        <!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; media-src data: https://www.jamloom.com https://*.r2.cloudflarestorage.com http://127.0.0.1:*; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'">
        <style>body{background:#101310;color:#fff;font:14px -apple-system;margin:0;padding:8px 16px}audio{display:none}.controls{display:flex;align-items:center;gap:16px}button{font:24px -apple-system;color:#c7f550;background:transparent;border:0;min-width:44px;min-height:44px;border-radius:24px}#toggle{background:#c7f550;color:#101310;font-size:24px}#time{margin-left:auto;font-variant-numeric:tabular-nums;color:#bcc5bf}input{box-sizing:border-box;width:100%;height:40px;accent-color:#c7f550}#error{display:none;font-size:13px}#error button{font-size:14px}:focus-visible{outline:3px solid #c7f550;outline-offset:2px}</style></head><body>
        <audio autoplay playsinline \(muted ? "muted" : "") src="\(source)"></audio>
        <div class="controls"><button id="back" aria-label="Rewind 15 seconds">↶15</button><button id="toggle" aria-label="Pause">Ⅱ</button><button id="forward" aria-label="Forward 15 seconds">15↷</button><span id="time" aria-live="off">0:00 / 0:00</span></div>
        <input id="seek" type="range" min="0" max="1" value="0" step="0.1" aria-label="Playback position" disabled>
        <div id="error" role="status">This recording could not play. <button id="retry">Retry playback</button></div>
        <script>
        const a=document.querySelector('audio'),seek=document.getElementById('seek'),toggle=document.getElementById('toggle'),back=document.getElementById('back'),forward=document.getElementById('forward'),error=document.getElementById('error');
        function ready(){return Number.isFinite(a.duration)&&a.duration>0}
        function clock(t){t=Number.isFinite(t)?Math.max(0,Math.floor(t)):0;return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
        function update(){const valid=ready();seek.disabled=back.disabled=forward.disabled=!valid;seek.max=valid?a.duration:1;seek.value=Number.isFinite(a.currentTime)?a.currentTime:0;seek.setAttribute('aria-valuetext',clock(a.currentTime)+' of '+clock(a.duration));toggle.textContent=a.paused?'▶':'Ⅱ';toggle.setAttribute('aria-label',a.paused?'Play':'Pause');document.getElementById('time').textContent=clock(a.currentTime)+' / '+clock(a.duration)}
        function jump(t){if(ready()&&Number.isFinite(t)){a.currentTime=Math.min(a.duration,Math.max(0,t));update()}}
        toggle.onclick=()=>{if(a.paused){if(a.ended)a.currentTime=0;a.play().catch(()=>error.style.display='block')}else a.pause()};back.onclick=()=>jump(a.currentTime-15);forward.onclick=()=>jump(a.currentTime+15);seek.oninput=()=>jump(Number(seek.value));
        ['loadedmetadata','durationchange','timeupdate','play','pause','ended','seeked'].forEach(event=>a.addEventListener(event,update));a.addEventListener('error',()=>error.style.display='block');document.getElementById('retry').onclick=()=>{error.style.display='none';a.load();a.play().catch(()=>error.style.display='block')};update();
        </script></body></html>
        """
        let base = ["http", "https"].contains(url.scheme ?? "") ? url.deletingLastPathComponent() : nil
        coordinator.loading = Task { @MainActor [weak view] in
            guard let view else { return }
            for cookie in cookies {
                guard !Task.isCancelled else { return }
                await view.configuration.websiteDataStore.httpCookieStore.setCookie(cookie)
            }
            guard !Task.isCancelled else { return }
            view.loadHTMLString(html, baseURL: base)
        }
        return view
    }
    func makeUIView(context: Context) -> WKWebView {
        #if DEBUG
        return Self.player(url: url, muted: ProcessInfo.processInfo.arguments.contains("--ui-testing"), cookies: cookies, coordinator: context.coordinator)
        #else
        return Self.player(url: url, cookies: cookies, coordinator: context.coordinator)
        #endif
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        coordinator.loading?.cancel()
        uiView.pauseAllMediaPlayback(completionHandler: nil); uiView.stopLoading(); uiView.loadHTMLString("", baseURL: nil)
    }
}
