#if DEBUG
import Foundation

// Isolated UI-test responses; never installed by a release build or an ordinary launch.
final class CommunityFixture: URLProtocol {
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
            let audio = query.contains { $0.name == "file" && $0.value == "audio" }
            let data: Data
            if audio { data = try Data(contentsOf: Bundle.main.url(forResource: "synthetic-speech", withExtension: "wav")!) }
            else if query.contains(where: { $0.name == "view" && $0.value == "mine" }) { data = Data(#"{"songs":[],"next":null,"signIn":true}"#.utf8) }
            else {
                let product = url.path.contains("improvise") ? "improvise" : "music-dna"
                let id = String(repeating: product == "improvise" ? "a" : "b", count: 32)
                data = Data("{\"songs\":[{\"id\":\"\(id)\",\"title\":\"\(product == "improvise" ? "Night lights" : "Morning groove")\",\"language\":\"en\",\"direction\":\"House\",\"product\":\"\(product)\"}],\"next\":null}".utf8)
            }
            let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: ["Content-Type": audio ? "audio/wav" : "application/json", "Content-Length": String(data.count)])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed); client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
#endif
