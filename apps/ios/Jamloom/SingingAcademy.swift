import SwiftUI
import WebKit

@MainActor
final class SingingModel: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    @Published var error: String?
    @Published var purchaseRequested = false
    private var hasCourse = !CreditPurchases.singingReleased
    private var freeLessons: Set<String> = []
    let webView: WKWebView
    private var server: StudioServer?
    private var home: URL?
    private var started = false
    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = .all
        let saved = UserDefaults.standard.string(forKey: "singingProgress") ?? "{}"
        let value = (try? JSONSerialization.data(withJSONObject: [saved])).flatMap { String(data: $0, encoding: .utf8) } ?? "[\"{}\"]"
        config.userContentController.addUserScript(WKUserScript(source: "if(!sessionStorage.getItem('singingSeeded')){localStorage.setItem('jamloom.singing.course.v1',\(value)[0]);sessionStorage.setItem('singingSeeded','1');}", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            config.userContentController.addUserScript(WKUserScript(source: "window.jamloomMobileMuted=true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
            // iOS 27 WebKit ends muted MP3 elements immediately on the simulator
            // and physical iPhone. Zero volume
            // keeps the real decoder/clock running while automation stays silent.
            config.userContentController.addUserScript(WKUserScript(source: "window.jamloomMobileMuteMode='volume';", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        #endif
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        config.userContentController.add(self, name: "singingProgress")
        webView.isOpaque = false
        webView.backgroundColor = .black
    }
    func start() {
        guard !started else { return }; started = true; error = nil
        guard let root = Bundle.main.url(forResource: "Studio", withExtension: nil) else { error = "Singing Academy is missing. Reinstall Jamloom."; return }
        if let data = try? Data(contentsOf: root.appendingPathComponent("singing-free-lessons.json")), let ids = try? JSONDecoder().decode([String].self, from: data) { freeLessons = Set(ids) }
        let server = StudioServer(root: root, singing: true); self.server = server
        do { try server.start { [weak self] result in Task { @MainActor in
            guard let self else { return }
            switch result {
            case .success(let url): self.home = url; self.webView.load(URLRequest(url: url))
            case .failure: self.error = "Singing Academy could not open. Close and reopen Jamloom."
            }
        } } } catch { self.error = "Singing Academy could not open. Close and reopen Jamloom." }
    }
    private func trusted(_ url: URL?) -> Bool {
        guard let url, let home else { return false }
        let folder = home.deletingLastPathComponent().path
        let page = url.deletingLastPathComponent().path == folder && ["singing-home.html", "singing.html"].contains(url.lastPathComponent)
        let notice = url.path.hasPrefix(folder + "/licenses/") && url.pathExtension == "txt"
        return url.scheme == home.scheme && url.host == home.host && url.port == home.port && (page || notice)
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if Self.requiresPurchase(action.request.url, hasCourse: hasCourse, freeLessons: freeLessons) { stop(); purchaseRequested = true; decisionHandler(.cancel); return }
        if action.navigationType == .linkActivated, let url = action.request.url, url.scheme == "https", ["jamloom.com", "www.jamloom.com"].contains(url.host ?? "") { UIApplication.shared.open(url); decisionHandler(.cancel); return }
        decisionHandler(action.targetFrame?.isMainFrame == true && trusted(action.request.url) ? .allow : .cancel)
    }
    static func requiresPurchase(_ url: URL?, hasCourse: Bool, freeLessons: Set<String>) -> Bool {
        guard !hasCourse, let url, url.lastPathComponent == "singing.html" else { return false }
        let id = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "lesson" })?.value ?? ""
        return !freeLessons.contains(id)
    }
    func updateAccess(_ purchased: Bool) {
        let allowed = !CreditPurchases.singingReleased || purchased
        if hasCourse && !allowed { showHome() }
        hasCourse = allowed
    }
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        guard type == .microphone, frame.isMainFrame, trusted(frame.request.url), frame.request.url?.lastPathComponent == "singing.html", let home,
              origin.protocol == home.scheme, origin.host == home.host, origin.port == home.port else { decisionHandler(.deny); return }
        decisionHandler(.prompt)
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, trusted(message.frameInfo.request.url), message.frameInfo.request.url?.lastPathComponent == "singing.html", let value = message.body as? [String: Any], value.count <= 64,
              let data = try? JSONSerialization.data(withJSONObject: value), data.count <= 16384,
              let json = String(data: data, encoding: .utf8) else { return }
        // The shared course parser validates IDs and score bounds when reading this local-only progress.
        UserDefaults.standard.set(json, forKey: "singingProgress")
    }
    func showHome() { stop(); if let home { webView.load(URLRequest(url: home)) } }
    func stop() {
        webView.evaluateJavaScript("window.jamloomSingingStop?.()", completionHandler: nil)
        webView.setMicrophoneCaptureState(.none, completionHandler: nil)
        webView.pauseAllMediaPlayback(completionHandler: nil)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { self.error = "The lesson could not load. Close and reopen Singing Academy." }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { stop(); started = false; error = "The lesson stopped to free memory. Reopen Singing Academy." }
}
private struct SingingWebView: UIViewRepresentable {
    let model: SingingModel
    func makeUIView(context: Context) -> WKWebView { model.webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
struct SingingAcademyView: View {
    @ObservedObject var singing: SingingModel
    @ObservedObject var model: AppModel
    @ObservedObject var decks: DJModel
    @ObservedObject var account: AccountModel
    @State private var showCourse = false
    var body: some View {
        VStack(spacing: 0) {
            HStack { Button("Songs", systemImage: "chevron.left") { singing.showHome() }; Spacer(); Text("Singing Academy").font(.headline); Spacer(); Button("Course", systemImage: "person.crop.circle.badge.checkmark") { singing.stop(); showCourse = true } }.padding(.horizontal).frame(minHeight: 44)
            if let error = singing.error { Text(error).padding().accessibilityIdentifier("singingError") }
            SingingWebView(model: singing)
        }
        .background(.black)
        .onAppear { model.suspendAudio(cancelRender: false); decks.stop(); singing.start() }
        .onDisappear { singing.stop() }
        .onChange(of: account.snapshot?.singing?.access) { _, access in singing.updateAccess(access == true) }
        .onChange(of: singing.purchaseRequested) { _, requested in if requested { showCourse = true; singing.purchaseRequested = false } }
        .task { if account.snapshot != nil { await account.refresh() }; singing.updateAccess(account.snapshot?.singing?.access == true) }
        .sheet(isPresented: $showCourse) {
            NavigationStack {
                Form {
                    Section("Singing Academy") {
                        Text("Original songs and familiar melodies, twelve warm-ups and unlimited practice.")
                        if account.snapshot?.singing?.access == true { Label("Course purchased", systemImage: "checkmark.seal.fill") }
                        else if account.canPurchaseSinging, let product = account.singingProduct {
                            Button("Unlock course · \(product.displayPrice)") { Task { await account.buySinging() } }.disabled(account.busy)
                        } else { Text("Free preview. Course sales are not open yet.") }
                    }
                    if account.snapshot != nil {
                        Button("Restore Singing Academy purchase") { Task { await account.restoreSinging() } }.disabled(account.busy)
                    } else { Text("Use the Account tab to sign in before buying or restoring a course.") }
                    if !account.message.isEmpty { Text(account.message) }
                }
                .navigationTitle("Your course")
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { showCourse = false } } }
                .task { await account.loadSingingProduct() }
            }
        }
    }
}
