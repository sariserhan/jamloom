import XCTest
import WebKit
@testable import Jamloom

@MainActor final class SetPlayerTests: XCTestCase {
    func testWebMSetPlaysMutedAndStopsOnDismissal() async throws {
        let file = try XCTUnwrap(Bundle(for: SetPlayerTests.self).url(forResource: "set-player", withExtension: "webm"))
        let url = try XCTUnwrap(URL(string: "data:audio/webm;base64," + Data(contentsOf: file).base64EncodedString()))
        let coordinator = SetAudioView.Coordinator()
        let player = SetAudioView.player(url: url, muted: true, coordinator: coordinator)
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
        let window = UIWindow(windowScene: scene)
        let controller = UIViewController()
        window.rootViewController = controller
        window.makeKeyAndVisible()
        player.frame = controller.view.bounds
        controller.view.addSubview(player)
        defer { SetAudioView.dismantleUIView(player, coordinator: coordinator); window.isHidden = true }
        var started = false
        for _ in 0..<100 {
            if let state = try? await player.evaluateJavaScript("(()=>{const a=document.querySelector('audio');return a&&a.muted&&a.currentTime>0&&!a.paused})()") as? Bool, state { started = true; break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertTrue(started, "The actual iOS WebKit player must decode WebM/Opus without audible output")
        _ = try await player.evaluateJavaScript("document.getElementById('toggle').click()")
        let paused = try await player.evaluateJavaScript("document.querySelector('audio').paused") as? Bool
        XCTAssertEqual(paused, true)
        _ = try await player.evaluateJavaScript("const s=document.getElementById('seek');s.value=1;s.dispatchEvent(new Event('input'))")
        let position = try await player.evaluateJavaScript("document.querySelector('audio').currentTime") as? Double
        XCTAssertEqual(try XCTUnwrap(position), 1, accuracy: 0.15)
        _ = try await player.evaluateJavaScript("document.getElementById('back').click()")
        let rewound = try await player.evaluateJavaScript("document.querySelector('audio').currentTime") as? Double
        XCTAssertEqual(rewound, 0)
        _ = try await player.evaluateJavaScript("document.getElementById('forward').click()")
        let atEnd = try await player.evaluateJavaScript("document.querySelector('audio').currentTime") as? Double
        let duration = try await player.evaluateJavaScript("document.querySelector('audio').duration") as? Double
        XCTAssertEqual(try XCTUnwrap(atEnd), try XCTUnwrap(duration), accuracy: 0.05)
        SetAudioView.dismantleUIView(player, coordinator: coordinator)
        try await Task.sleep(for: .milliseconds(200))
        let stopped = try await player.evaluateJavaScript("!document.querySelector('audio') || document.querySelector('audio').paused")
        XCTAssertEqual(stopped as? Bool, true)
    }
    func testAuthenticatedPlayerCopiesCookiesAndCancellationDoesNotRestartAudio() async throws {
        let cookie = try XCTUnwrap(HTTPCookie(properties: [.domain: "www.jamloom.com", .path: "/", .name: "fixture", .value: "session"]))
        let coordinator = SetAudioView.Coordinator()
        let player = SetAudioView.player(url: URL(string: "data:audio/wav;base64,")!, muted: true, cookies: [cookie], coordinator: coordinator)
        await coordinator.loading?.value
        let stored = await player.configuration.websiteDataStore.httpCookieStore.allCookies()
        XCTAssertEqual(stored.first?.value, "session")
        SetAudioView.dismantleUIView(player, coordinator: coordinator)
        let stopped = SetAudioView.Coordinator()
        let second = SetAudioView.player(url: URL(string: "data:audio/wav;base64,")!, muted: true, cookies: [cookie], coordinator: stopped)
        SetAudioView.dismantleUIView(second, coordinator: stopped)
        await stopped.loading?.value
        XCTAssertTrue(stopped.loading?.isCancelled == true)
    }

}
