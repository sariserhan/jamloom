import SwiftUI
import CryptoKit

struct MusicRatingButton: View {
    let kind: String
    let id: String
    let title: String
    @ObservedObject var account: AccountModel
    var localAudio: URL? = nil
    @State private var showing = false
    var body: some View {
        Button("Rate this music", systemImage: "hand.thumbsup") { showing = true }
            .accessibilityIdentifier("rateMusic")
            .sheet(isPresented: $showing) { MusicFeedbackView(kind: kind, id: id, title: title, account: account, localAudio: localAudio) }
    }
}

struct MusicFeedbackValue: Codable {
    var rating: String
    var tags: [String] = []
    var personalize = false
    var trainingConsent = false
    var momentSeconds: Double? = nil
}
struct MusicFeedbackResponse: Decodable {
    let owner: String
    let feedback: MusicFeedbackValue?
    let canTrain: Bool
    let rightsConfirmed: Bool
}
struct MusicFeedbackView: View {
    let kind: String
    let id: String
    let title: String
    @ObservedObject var account: AccountModel
    var localAudio: URL?
    @Environment(\.dismiss) private var dismiss
    @State private var reference = ""
    @State private var value: MusicFeedbackValue?
    @State private var busy = true
    @State private var loaded = false
    @State private var edited = false
    @State private var showSignIn = false
    @State private var message = ""
    @State private var moment = ""
    private var owner: String? { account.snapshot?.user.id }
    private var localKey: String { "jamloom-music-rating-" + (owner ?? "guest") + ":" + kind + ":" + reference }
    private var tags: [(String, String)] { value?.rating == "like" ? [("groove","Groove"),("vocals","Singing"),("energy","Energy"),("variety","Variety"),("ending","Ending"),("style","Style")] : [("weak_opening","Weak opening"),("awkward_transition","Transition"),("robotic_vocals","Robotic voice"),("unclear_words","Unclear words"),("repetitive","Repetitive"),("too_soft","Too soft")] }
    var body: some View {
        NavigationStack {
            Form {
                if owner == nil && localAudio == nil {
                    Section { Button("Sign in to save a rating", systemImage: "person.crop.circle") { showSignIn = true } }
                }
                if busy { Label(loaded ? "Saving rating…" : "Loading saved rating…", systemImage: "arrow.clockwise") }
                if !message.isEmpty { Text(message).accessibilityIdentifier("ratingStatus") }
                if !loaded && !busy && owner != nil { Button("Try again") { Task { await load() } } }
                Section(title) {
                    HStack { rating("like", "Like", "hand.thumbsup.fill"); rating("dislike", "Needs work", "hand.thumbsdown.fill") }
                    if value != nil {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 110))]) { ForEach(tags, id: \.0) { tag in
                            Button(tag.1) { if value!.tags.contains(tag.0) { value!.tags.removeAll { $0 == tag.0 } } else if value!.tags.count < 6 { value!.tags.append(tag.0) } }
                                .buttonStyle(.bordered).tint(value!.tags.contains(tag.0) ? .mint : .gray)
                                .accessibilityAddTraits(value!.tags.contains(tag.0) ? .isSelected : [])
                        } }
                        TextField("Moment in seconds (optional)", text: $moment).keyboardType(.decimalPad)
                        if kind == "music-dna" { Toggle("Shape my future Music DNA songs", isOn: Binding(get: { value?.personalize ?? false }, set: { value?.personalize = $0 })) }
                    }
                }.disabled(busy && loaded)
                if value != nil {
                    Section {
                        Button("Delete rating", role: .destructive) { Task { await save(remove: true) } }.disabled(busy || !loaded)
                    }
                }
            }
            .navigationTitle("Your feedback").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save rating") {
                    if owner == nil && localAudio == nil { showSignIn = true }
                    else { Task { await save(remove: false) } }
                }.disabled(busy || value == nil) }
            }
            .sheet(isPresented: $showSignIn) { AccountView(account: account) }
            .task(id: (owner ?? "guest") + kind + id) {
                let keepSelection = showSignIn && owner != nil
                if keepSelection { showSignIn = false }
                await load(preservingDraft: keepSelection)
            }
        }
    }
    private func rating(_ selected: String, _ text: String, _ icon: String) -> some View {
        Button { edited = true; if value?.rating != selected { let consent = value?.trainingConsent ?? false; value = MusicFeedbackValue(rating: selected, trainingConsent: consent) } } label: { Label(text, systemImage: icon).frame(minHeight: 44) }
            .buttonStyle(.bordered).tint(value?.rating == selected ? .mint : .gray)
            .accessibilityAddTraits(value?.rating == selected ? .isSelected : [])
    }
    private func load(preservingDraft: Bool = false) async {
        let draft = preservingDraft ? value : nil, draftMoment = moment
        let expected = owner; busy = true; loaded = false; edited = false; value = nil; message = ""; moment = ""
        defer { if expected == owner { busy = false } }
        do {
            if let localAudio {
                let data = try Data(contentsOf: localAudio, options: .mappedIfSafe)
                guard data.count <= 96 * 1024 * 1024 else { throw URLError(.dataLengthExceedsMaximum) }
                reference = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
            } else { reference = id }
            if expected == nil && localAudio != nil {
                if let data = UserDefaults.standard.data(forKey: localKey) { value = try JSONDecoder().decode(MusicFeedbackValue.self, from: data) }
                message = "Saved on this device. Sign in to sync a rating."
            } else {
                guard let expected else { throw RemixError.message("Sign in through Account to rate this music.") }
                let response: MusicFeedbackResponse = try await account.transport.request("/api/creation-feedback", query: ["kind": kind, "id": reference])
                guard expected == owner, response.owner == expected, !Task.isCancelled else { return }
                if !edited { value = response.feedback }
                else { value?.trainingConsent = response.feedback?.trainingConsent ?? false }
            }
            guard expected == owner, !Task.isCancelled else { return }
            if var draft {
                draft.trainingConsent = value?.trainingConsent ?? false
                value = draft; moment = draftMoment; edited = true
            }
            if !edited, let seconds = value?.momentSeconds { moment = String(Int(seconds)) }; loaded = true
        } catch { if expected == owner && !Task.isCancelled {
            if let draft { value = draft; moment = draftMoment; edited = true }
            message = error.localizedDescription
        } }
    }
    private func save(remove: Bool) async {
        guard !busy, value != nil else { return }
        if !loaded { await load(preservingDraft: true) }
        guard loaded, !busy, var feedback = value else { return }; let expected = owner
        busy = true; defer { if expected == owner { busy = false } }
        do {
            if !moment.isEmpty { guard let seconds = Double(moment), seconds.isFinite, (0...36000).contains(seconds) else { throw RemixError.message("Enter a valid time in seconds.") }; feedback.momentSeconds = seconds } else { feedback.momentSeconds = nil }
            if expected == nil && localAudio != nil {
                if remove { UserDefaults.standard.removeObject(forKey: localKey) } else { UserDefaults.standard.set(try JSONEncoder().encode(feedback), forKey: localKey) }
            } else {
                guard let expected else { throw AccountError.signedOut }
                var body = try JSONSerialization.jsonObject(with: JSONEncoder().encode(feedback)) as! [String: Any]
                body["owner"] = expected; body["rightsConfirmed"] = feedback.trainingConsent
                if remove { body = ["owner": expected] }
                let encoded = try JSONSerialization.data(withJSONObject: body)
                _ = try await account.transport.requestData("/api/creation-feedback", method: remove ? "DELETE" : "POST", body: encoded, query: ["kind": kind, "id": reference])
            }
            guard expected == owner else { return }
            if remove { value = nil }; message = remove ? "Rating and future training permission deleted." : "Rating saved."
        } catch { if expected == owner { message = error.localizedDescription } }
    }
}
