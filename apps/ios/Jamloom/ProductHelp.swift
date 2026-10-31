import SwiftUI

struct ProductHelpButton: View {
    let product: String
    @State private var showing = false
    private var guide: (String, String, [String], String) {
        switch product {
        case "music-dna": return ("Music DNA", "Create original music guided by favorite songs and artists.", ["Search for a song or artist and review the suggestions. You can also use an available playlist import.", "Review your favorites and creation options, then check the credit quote and generate when the service is available.", "Listen to the result, save it and rate the groove, voice or a particular moment."], "Favorite names guide the direction; the original recordings are not sampled. Apple Music favorites import needs permission and a suitable account, but catalogue search does not. Public visibility and optional training permission are separate.")
        case "community": return ("Community", "Browse public Jamloom songs and full AI DJ performances, or revisit your own creations.", ["Choose a collection, search loaded songs or filter by language.", "Tap Play. Use the bottom player to pause, rewind, move forward or seek with the slider.", "Tap the heart to save a favorite, or Rate to tell us what worked. Sign in through Account to sync."], "Private cloud creations appear only for their owner. On-device mixes stay local unless you explicitly upload them. A rating never makes music public or uploads its audio. Only the owner can grant separate training permission.")
        case "cloud": return ("Improvise", "Turn a short recorded sound into an original song and arrangement.", ["Record or import a sound you have permission to use. Preview and trim the part you want.", "Choose the style and available options, sign in and review the credit quote and public or private saving.", "Generate when available, then play, share and rate your song."], "Cloud processing sends the selected sound to the song service. Credits and available generation capacity are required. Private and public saving use the same credits. Training permission is optional and separate from generation and public sharing.")
        default: return ("Improvise & Local Remixes", "Start with your voice, a clap or another short sound. Make quick on-device remixes or a longer cloud song.", ["Record a sound or import a file. Preview it and adjust the selected section.", "Choose Local Remixes for on-device variations, or Improvise for cloud song creation with a credit quote.", "Play the results, compare styles, share a favorite and rate each creation. Find saved local results under On device in Community."], "Local Remixes keep audio on this device and do not need cloud credits. Export anything you want to keep before deleting app data. Cloud generation requires an account and permission to process the sound. A rating does not upload local audio.")
        }
    }
    var body: some View {
        Button { showing = true } label: { Image(systemName: "questionmark.circle").frame(minWidth: 44, minHeight: 44) }
            .accessibilityLabel("How to use " + guide.0)
            .sheet(isPresented: $showing) {
                NavigationStack {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 22) {
                            Text(guide.0).font(.largeTitle.bold())
                            Label("What it does", systemImage: "sparkles").font(.headline)
                            Text(guide.1)
                            Label("How to use it", systemImage: "list.number").font(.headline)
                            ForEach(Array(guide.2.enumerated()), id: \.offset) { index, step in HStack(alignment: .top, spacing: 14) { Text(String(index + 1)).font(.headline).foregroundStyle(.mint); Text(step) } }
                            Divider(); Text(guide.3).font(.callout).foregroundStyle(.secondary)
                        }.padding(24)
                    }.toolbar { Button("Close") { showing = false } }
                }.presentationBackground(.ultraThinMaterial)
            }
    }
}
