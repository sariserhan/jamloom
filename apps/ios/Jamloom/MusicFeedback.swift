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
    @State private var canTrain = false
    @State private var busy = true
    @State private var loaded = false
    @State private var message = ""
    @State private var moment = ""
    private var owner: String? { account.snapshot?.user.id }
    private var localKey: String { "jamloom-music-rating-" + (owner ?? "guest") + ":" + kind + ":" + reference }
    private var tags: [(String, String)] { value?.rating == "like" ? [("groove","Groove"),("vocals","Singing"),("energy","Energy"),("variety","Variety"),("ending","Ending"),("style","Style")] : [("weak_opening","Weak opening"),("awkward_transition","Transition"),("robotic_vocals","Robotic voice"),("unclear_words","Unclear words"),("repetitive","Repetitive"),("too_soft","Too soft")] }
    var body: some View {
        NavigationStack {
            Form {
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
                }.disabled(busy || !loaded)
                if value != nil {
                    Section("Help improve Jamloom") {
                        Toggle("Allow this music and rating for training", isOn: Binding(get: { value?.trainingConsent ?? false }, set: { value?.trainingConsent = $0 }))
                            .disabled(!canTrain || busy)
                        Text(canTrain ? "Optional. By enabling this, you confirm training rights to all included music and voices and allow commercial training, retained models and commercial generated outputs. Uncheck or delete to stop future use; completed training may not be reversible." : "Only the owner of cloud-saved music can grant training permission. Local audio is not uploaded by a rating.").font(.footnote)
                        if localAudio != nil { Link("Save an eligible mix to the cloud library", destination: URL(string: "https://www.jamloom.com/library")!) }
                    }
                    Section {
                        Button("Save rating") { Task { await save(remove: false) } }.disabled(busy || !loaded)
                        Button("Delete rating", role: .destructive) { Task { await save(remove: true) } }.disabled(busy || !loaded)
                    }
                }
                if busy { ProgressView() }
                if !message.isEmpty { Text(message).accessibilityIdentifier("ratingStatus") }
                if !loaded && !busy { Button("Try again") { Task { await load() } } }
            }
            .navigationTitle("Your feedback").navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Done") { dismiss() } }
            .task(id: (owner ?? "guest") + kind + id) { await load() }
        }
    }
    private func rating(_ selected: String, _ text: String, _ icon: String) -> some View {
        Button { if value?.rating != selected { value = MusicFeedbackValue(rating: selected) } } label: { Label(text, systemImage: icon).frame(minHeight: 44) }
            .buttonStyle(.bordered).tint(value?.rating == selected ? .mint : .gray)
            .accessibilityAddTraits(value?.rating == selected ? .isSelected : [])
    }
    private func load() async {
        let expected = owner; busy = true; loaded = false; value = nil; canTrain = false; message = ""; moment = ""
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
                value = response.feedback; canTrain = response.canTrain
            }
            guard expected == owner, !Task.isCancelled else { return }
            if let seconds = value?.momentSeconds { moment = String(Int(seconds)) }; loaded = true
        } catch { if expected == owner && !Task.isCancelled { message = error.localizedDescription } }
    }
    private func save(remove: Bool) async {
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
            if remove { value = nil }; message = remove ? "Rating and future training permission deleted." : "Rating saved. Training requires separate rights review."
        } catch { if expected == owner { message = error.localizedDescription } }
    }
}
