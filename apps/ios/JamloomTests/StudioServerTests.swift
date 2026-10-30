import XCTest
import WebKit
import AVFoundation
@testable import Jamloom

final class StudioServerTests: XCTestCase {
    @MainActor
    func testProducedSongPagePlaysAndStops() async throws {
        let model = SingingModel()
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
        let window = UIWindow(windowScene: scene), controller = UIViewController()
        window.rootViewController = controller; window.makeKeyAndVisible()
        model.webView.frame = controller.view.bounds; controller.view.addSubview(model.webView)
        defer { model.stop(); model.webView.removeFromSuperview(); window.isHidden = true }
        model.start()
        for _ in 0..<100 {
            if let ready = try? await model.webView.evaluateJavaScript("!!document.querySelector('a[href*=\"long-way-home\"]')") as? Bool, ready { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        _ = try await model.webView.evaluateJavaScript("document.querySelector('a[href*=\"long-way-home\"]').click()")
        for _ in 0..<100 {
            if let ready = try? await model.webView.evaluateJavaScript("!!document.querySelector('#recording-player')") as? Bool, ready { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        _ = try await model.webView.evaluateJavaScript("document.querySelector('#recording-player').volume=0; document.querySelector('#demo').click()")
        var playing = false
        for _ in 0..<100 {
            if let ready = try? await model.webView.evaluateJavaScript("(()=>{const a=document.querySelector('#recording-player');return a.currentTime>.2&&!a.paused&&a.duration>119})()") as? Bool, ready { playing = true; break }
            try await Task.sleep(for: .milliseconds(100))
        }
        let diagnostic = try await model.webView.evaluateJavaScript("(()=>{const a=document.querySelector('#recording-player');return JSON.stringify({duration:a.duration,time:a.currentTime,paused:a.paused,ready:a.readyState,error:a.error?.message,feedback:document.querySelector('#feedback').textContent})})()")
        XCTAssertTrue(playing, "Actual song page: \(String(describing: diagnostic))")
        model.stop()
        try await Task.sleep(for: .milliseconds(200))
        let stopped = try await model.webView.evaluateJavaScript("document.querySelector('#recording-player').paused") as? Bool
        XCTAssertEqual(stopped, true)
    }
    @MainActor
    func testProducedRecordingsKeepTheirDurationOverLoopbackHTTP() async throws {
        let root = try XCTUnwrap(Bundle.main.url(forResource: "Studio", withExtension: nil))
        let server = StudioServer(root: root, singing: true)
        let home: URL = try await withCheckedThrowingContinuation { continuation in
            do { try server.start { continuation.resume(with: $0) } }
            catch { continuation.resume(throwing: error) }
        }
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        let webView = WKWebView(frame: .zero, configuration: config)
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
        let window = UIWindow(windowScene: scene)
        let controller = UIViewController()
        window.rootViewController = controller
        window.makeKeyAndVisible()
        webView.frame = controller.view.bounds
        controller.view.addSubview(webView)
        defer { webView.stopLoading(); webView.removeFromSuperview(); window.isHidden = true }
        webView.loadHTMLString("<!doctype html><title>Recording transport check</title>", baseURL: home)
        for _ in 0..<100 {
            if !webView.isLoading { break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        for song in ["long-way-home", "leave-it-all-outside"] {
            for kind in ["song", "karaoke"] {
                let path = "singing-audio/\(song)-\(kind).mp3"
                let native = try await AVURLAsset(url: root.appendingPathComponent(path)).load(.duration)
                XCTAssertEqual(native.seconds, 120, accuracy: 0.1, path)
                let result = try await webView.callAsyncJavaScript("""
                    const audio = document.createElement('audio');
                    audio.preload = 'metadata'; audio.volume = 0; document.body.append(audio);
                    try {
                        return await new Promise((resolve, reject) => {
                            const timer = setTimeout(() => reject('Metadata timeout'), 15000);
                            audio.onloadedmetadata = async () => {
                                const metadataDuration = audio.duration;
                                try { await audio.play(); }
                                catch (error) { clearTimeout(timer); reject(String(error)); return; }
                                setTimeout(() => { clearTimeout(timer); resolve({metadataDuration, duration:audio.duration, time:audio.currentTime, paused:audio.paused, readyState:audio.readyState}); }, 400);
                            };
                            audio.onerror = () => { clearTimeout(timer); reject('Media error '+audio.error?.code); };
                            audio.src = url;
                        });
                    } finally { audio.pause(); audio.removeAttribute('src'); audio.load(); audio.remove(); }
                    """, arguments: ["url": home.deletingLastPathComponent().appendingPathComponent(path).absoluteString], in: nil, contentWorld: .page)
                let values = try XCTUnwrap(result as? [String: Any])
                let duration = try XCTUnwrap(values["duration"] as? Double)
                XCTAssertEqual(duration, 120, accuracy: 0.1, "\(path): \(values)")
                XCTAssertGreaterThan(try XCTUnwrap(values["time"] as? Double), 0.1, "\(path): \(values)")
            }
        }
        withExtendedLifetime(server) {}
    }
    func testOnlyBundledAssetsCanBeReadThroughExactLoopbackAuthority() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        try Data("console".utf8).write(to: root.appendingPathComponent("dj.html"))
        try FileManager.default.createSymbolicLink(at: root.appendingPathComponent("escape.txt"), withDestinationURL: URL(fileURLWithPath: "/etc/hosts"))
        func response(_ path: String, method: String = "GET", host: String = "127.0.0.1:1234", extra: String = "") -> String {
            let request = "\(method) \(path) HTTP/1.1\r\nHost: \(host)\r\n\(extra)\r\n"
            return String(decoding: StudioServer.response(Data(request.utf8), root: root, prefix: "/token/", authority: "127.0.0.1:1234"), as: UTF8.self)
        }
        XCTAssertTrue(response("/token/dj.html").hasPrefix("HTTP/1.1 200"))
        XCTAssertTrue(response("/token/dj.html").hasSuffix("console"))
        XCTAssertTrue(response("/token/dj.html").contains("connect-src 'self' blob:"))
        XCTAssertFalse(response("/token/dj.html", method: "HEAD").hasSuffix("console"))
        for path in ["?", "????", "/dj.html", "/wrong/dj.html", "/token/../dj.html", "/token/%2e%2e/dj.html", "/token/escape.txt", "/token/missing.js", "/token//dj.html"] {
            XCTAssertTrue(response(path).hasPrefix("HTTP/1.1 404"), path)
        }
        XCTAssertTrue(response("/token/dj.html", method: "POST").hasPrefix("HTTP/1.1 405"))
        for extra in ["Origin: https://example.com\r\n", "Sec-Fetch-Site: cross-site\r\n", "Content-Length: 1\r\n", "Transfer-Encoding: chunked\r\n"] {
            XCTAssertTrue(response("/token/dj.html", extra: extra).hasPrefix("HTTP/1.1 403"))
        }
        XCTAssertTrue(response("/token/dj.html", host: "attacker.invalid:1234").hasPrefix("HTTP/1.1 403"))
        XCTAssertTrue(response("/token/dj.html", extra: "Host: localhost\r\n").hasPrefix("HTTP/1.1 400"))
        for (range, body) in [("bytes=0-1", "co"), ("bytes=3-", "sole"), ("bytes=-2", "le"), ("bytes=4-999", "ole")] {
            let result = response("/token/dj.html", extra: "Range: \(range)\r\n")
            XCTAssertTrue(result.hasPrefix("HTTP/1.1 206")); XCTAssertTrue(result.hasSuffix(body))
            XCTAssertTrue(result.contains("Content-Range: bytes "))
        }
        for range in ["bytes=", "bytes=-0", "bytes=8-", "bytes=3-2", "bytes=0-1,3-4", "bytes=+1-2", "items=1-2", "bytes=9999999999999999999999999-"] {
            XCTAssertTrue(response("/token/dj.html", extra: "Range: \(range)\r\n").hasPrefix("HTTP/1.1 416"), range)
        }
        XCTAssertTrue(response("/token/dj.html", method: "HEAD", extra: "Range: bytes=0-1\r\n").hasPrefix("HTTP/1.1 200"))
    }
    func testOnlyAuthorizedSingingDocumentAllowsMicrophone() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        for file in ["singing.html", "singing-home.html", "dj.html"] { try Data("page".utf8).write(to: root.appendingPathComponent(file)) }
        for file in ["singing.html", "singing-home.html", "dj.html"] {
            let request = Data("GET /token/\(file) HTTP/1.1\r\nHost: 127.0.0.1:1234\r\n\r\n".utf8)
            for singing in [false, true] {
                let response = String(decoding: StudioServer.response(request, root: root, prefix: "/token/", authority: "127.0.0.1:1234", singing: singing), as: UTF8.self)
                XCTAssertTrue(response.contains(singing && file == "singing.html" ? "microphone=(self)" : "microphone=()"))
            }
        }
    }

}
