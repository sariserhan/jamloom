import XCTest
import WebKit
@testable import Jamloom

@MainActor final class SetPlayerTests: XCTestCase {
    func testWebMSetPlaysMutedAndStopsOnDismissal() async throws {
        let file = try XCTUnwrap(Bundle(for: SetPlayerTests.self).url(forResource: "set-player", withExtension: "webm"))
        let url = try XCTUnwrap(URL(string: "data:audio/webm;base64," + Data(contentsOf: file).base64EncodedString()))
        let player = SetAudioView.player(url: url, muted: true)
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
        let window = UIWindow(windowScene: scene)
        let controller = UIViewController()
        window.rootViewController = controller
        window.makeKeyAndVisible()
        player.frame = controller.view.bounds
        controller.view.addSubview(player)
        defer { SetAudioView.dismantleUIView(player, coordinator: ()); window.isHidden = true }
        var started = false
        for _ in 0..<100 {
            if let state = try? await player.evaluateJavaScript("(()=>{const a=document.querySelector('audio');return a&&a.muted&&a.currentTime>0&&!a.paused})()") as? Bool, state { started = true; break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertTrue(started, "The actual iOS WebKit player must decode WebM/Opus without audible output")
        SetAudioView.dismantleUIView(player, coordinator: ())
        try await Task.sleep(for: .milliseconds(200))
        let stopped = try await player.evaluateJavaScript("!document.querySelector('audio') || document.querySelector('audio').paused")
        XCTAssertEqual(stopped as? Bool, true)
    }
}
