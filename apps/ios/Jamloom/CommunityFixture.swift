#if DEBUG
import Foundation
import StoreKit

// Launch directly without XCTest to distinguish Apple responses from test-session injection.
@MainActor enum AppleCatalogueProbe {
    static func run() async {
        guard ProcessInfo.processInfo.arguments.contains("--apple-catalogue-check") else { return }
        var result: [String: Any] = ["receiptQualification": "NOT RUN", "purchaseAttempted": false]
        do {
            let products = try await Product.products(for: CreditPurchases().productIDs + [CreditPurchases.singingProduct])
            result["products"] = products.map { ["id": $0.id, "name": $0.displayName, "description": $0.description, "price": NSDecimalNumber(decimal: $0.price).stringValue, "currency": $0.priceFormatStyle.currencyCode] }
        } catch { result["error"] = error.localizedDescription }
        let file = URL.cachesDirectory.appendingPathComponent("apple-catalogue-check.json")
        do { try JSONSerialization.data(withJSONObject: result, options: .sortedKeys).write(to: file, options: .atomic) }
        catch { NSLog("Apple catalogue diagnostic could not be saved") }
    }
}

// Isolated UI-test responses; never installed by a release build or an ordinary launch.
final class CommunityFixture: URLProtocol {
    static func playbackAudio() throws -> Data {
        if ProcessInfo.processInfo.arguments.contains("--community-player") {
            return try CloudRecording.wav(AudioInput(samples: Array(repeating: 0, count: 720000), rate: 48000), start: 0, end: 15)
        }
        return try Data(contentsOf: Bundle.main.url(forResource: "synthetic-speech", withExtension: "wav")!)
    }
    static func transport() -> AccountTransport {
        guard ProcessInfo.processInfo.arguments.contains("--ui-testing"), ProcessInfo.processInfo.arguments.contains("--community-fixture") else { return AccountTransport() }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [CommunityFixture.self]
        return AccountTransport(configuration: configuration)
    }
    override class func canInit(with request: URLRequest) -> Bool { request.url?.host == "www.jamloom.com" }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        guard let url = request.url else { return }
        let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        do {
            if ProcessInfo.processInfo.arguments.contains("--community-gated") {
                let response = HTTPURLResponse(url: url, statusCode: 503, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                client?.urlProtocol(self, didLoad: Data(#"{"error":"Jamloom is coming soon. Public access is not open yet."}"#.utf8))
                client?.urlProtocolDidFinishLoading(self); return
            }
            let audio = query.contains { $0.name == "file" && $0.value == "audio" }
            let data: Data
            if ProcessInfo.processInfo.arguments.contains("--rating-fixture"), url.path == "/api/auth/sign-in/email" {
                data = Data(#"{"user":{"id":"rating-listener","email":"listener@example.test"}}"#.utf8)
            } else if ProcessInfo.processInfo.arguments.contains("--rating-fixture"), url.path == "/api/account" {
                data = Data(#"{"user":{"id":"rating-listener","email":"listener@example.test"},"balance":{"available":0,"reserved":0},"purchasesReleased":false}"#.utf8)
            } else if ProcessInfo.processInfo.arguments.contains("--rating-fixture"), url.path == "/api/creation-feedback" {
                let key = "rating-fixture-" + (ProcessInfo.processInfo.environment["JAMLOOM_UI_TEST_LIBRARY"] ?? "") + url.absoluteString
                if request.httpMethod == "POST" {
                    var body = request.httpBody ?? Data()
                    if let stream = request.httpBodyStream {
                        stream.open(); defer { stream.close() }
                        var bytes = [UInt8](repeating: 0, count: 4096)
                        while stream.hasBytesAvailable { let n = stream.read(&bytes, maxLength: bytes.count); if n <= 0 { break }; body.append(contentsOf: bytes.prefix(n)) }
                    }
                    let feedback = try JSONDecoder().decode(MusicFeedbackValue.self, from: body)
                    guard !feedback.trainingConsent else { throw URLError(.badServerResponse) }
                    UserDefaults.standard.set(try JSONEncoder().encode(feedback), forKey: key)
                }
                let stored = UserDefaults.standard.data(forKey: key)
                data = try JSONSerialization.data(withJSONObject: ["owner": "rating-listener", "feedback": try stored.map { try JSONSerialization.jsonObject(with: $0) } ?? NSNull(), "canTrain": false, "rightsConfirmed": false])
            } else if audio { data = try Self.playbackAudio() }
            else if url.path == "/api/ai-dj/sets" { data = Data(#"{"sets":[{"id":"cccccccccccccccccccccccccccccccc","title":"Rooftop party","seconds":600}],"next":null}"#.utf8) }
            else if query.contains(where: { $0.name == "view" && $0.value == "mine" }) { data = Data(#"{"songs":[],"next":null,"signIn":true}"#.utf8) }
            else {
                let product = url.path.contains("improvise") ? "improvise" : "music-dna"
                let id = String(repeating: product == "improvise" ? "a" : "b", count: 32)
                var rows = [["id": id, "title": product == "improvise" ? "Night lights" : "Morning groove", "language": "en", "direction": "House", "product": product]]
                if ProcessInfo.processInfo.arguments.contains("--community-languages"), product == "improvise" {
                    rows.append(["id": String(repeating: "d", count: 32), "title": "Gece ritmi", "language": "tr", "direction": "House", "product": product])
                }
                let languages = Array(Set(rows.compactMap { $0["language"] })).sorted()
                if let language = query.first(where: { $0.name == "language" })?.value { rows = rows.filter { $0["language"] == language } }
                data = try JSONSerialization.data(withJSONObject: ["songs": rows, "next": NSNull(), "filters": ["languages": languages]])
            }
            let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: ["Content-Type": audio ? "audio/wav" : "application/json", "Content-Length": String(data.count)])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed); client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
#endif
