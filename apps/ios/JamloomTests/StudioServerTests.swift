import XCTest
@testable import Jamloom

final class StudioServerTests: XCTestCase {
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
