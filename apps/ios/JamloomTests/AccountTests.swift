import XCTest
import CryptoKit
@testable import Jamloom

private final class AccountProtocol: URLProtocol {
    static var handle: ((URLRequest) throws -> (Int, Data))!
    static var headers = ["Content-Type": "application/json"]
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, data) = try Self.handle(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: Self.headers)!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
@MainActor final class AccountTests: XCTestCase {
    func testCommunityCollectionsAndPaginationWithoutSignIn() async throws {
        let transport = transport(), account = AccountModel(transport: transport), library = SongLibraryModel()
        defer { transport.session.invalidateAndCancel() }
        let first = String(repeating: "a", count: 32), second = String(repeating: "b", count: 32)
        var queries: [[String: String]] = []
        AccountProtocol.headers = ["Content-Type": "application/json"]
        AccountProtocol.handle = { request in
            if request.url?.path == "/api/ai-dj/sets" { return (200, Data(#"{"sets":[],"next":null}"#.utf8)) }
            let query = Dictionary(uniqueKeysWithValues: URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!.queryItems!.map { ($0.name, $0.value!) })
            queries.append(query); XCTAssertEqual(request.httpMethod, "GET")
            let id = query["after"] == nil ? first : second
            return (200, Data("{\"songs\":[{\"id\":\"\(id)\",\"title\":\"Original groove\",\"language\":\"en\"}],\"next\":\(query["after"] == nil ? "\"\(first)\"" : "null")}".utf8))
        }
        await library.load(.community, account: account)
        XCTAssertEqual(library.songs.count, 2); XCTAssertEqual(Set(library.songs.map(\.key)).count, 2)
        await library.load(.community, account: account, more: true)
        XCTAssertEqual(library.songs.count, 4); XCTAssertTrue(library.next.isEmpty)
        XCTAssertEqual(queries.filter { $0["after"] == first }.count, 2)
        let count = queries.count; await library.load(.mine, account: account)
        XCTAssertEqual(queries.count, count); XCTAssertTrue(library.songs.isEmpty); XCTAssertTrue(library.message.contains("Sign in"))
        for query in [["view": "public", "after": "../private"], ["view": "all-users"], ["view": "mine", "owner": "other"]] {
            do { let _: LibraryPage = try await transport.request("/api/taste/song", query: query); XCTFail("Reject invalid collection query") } catch { }
        }
        XCTAssertEqual(queries.count, count)
    }
    func testAllSongsIncludesTheCompleteWebsiteManifestsAndPublicPages() async throws {
        let transport = transport(), account = AccountModel(transport: transport), library = SongLibraryModel()
        defer { transport.session.invalidateAndCancel() }
        func manifest(_ name: String, key: String) throws -> [[String: Any]] {
            let url = try XCTUnwrap(Bundle(for: AccountTests.self).url(forResource: name, withExtension: "json"))
            let json = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
            return try XCTUnwrap(json[key] as? [[String: Any]])
        }
        let validation = try manifest("music-validation", key: "songs"), examples = try manifest("dna-examples", key: "examples")
        let expected = Set(validation.map { "\($0["product"]!):\($0["id"]!)" } + examples.map { "music-dna:\($0["id"]!)" })
        var requests = 0
        AccountProtocol.headers = ["Content-Type": "application/json"]
        AccountProtocol.handle = { request in
            requests += 1
            if request.url?.path == "/api/ai-dj/sets" { return (200, Data(#"{"sets":[],"next":null}"#.utf8)) }
            let q = Dictionary(uniqueKeysWithValues: URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!.queryItems!.map { ($0.name, $0.value!) })
            let product = request.url!.path.contains("improvise") ? "improvise" : "music-dna"
            var rows: [[String: Any]] = [], next: Any = NSNull()
            if q["view"] == "validation" { rows = validation }
            else if q["view"] == "examples" { rows = examples }
            else {
                XCTAssertEqual(q["view"], "public")
                let id = String(repeating: q["after"] == nil ? "f" : "e", count: 32)
                rows = [["id": id, "title": "Public original", "language": "en", "product": product]]
                if q["after"] == nil {
                    rows.append(validation.first { $0["product"] as? String == product }!)
                    next = id
                } else { XCTAssertEqual(q["after"], String(repeating: "f", count: 32)) }
            }
            return (200, try JSONSerialization.data(withJSONObject: ["songs": rows, "next": next]))
        }
        await library.load(.all, account: account)
        XCTAssertEqual(requests, 6); XCTAssertEqual(library.songs.count, expected.count + 2)
        XCTAssertTrue(expected.isSubset(of: Set(library.songs.map(\.key))))
        XCTAssertTrue(library.message.isEmpty); XCTAssertFalse(library.needsSignIn)
        await library.load(.all, account: account, more: true)
        XCTAssertEqual(requests, 8); XCTAssertEqual(library.songs.count, expected.count + 4)
        XCTAssertTrue(library.next.isEmpty); XCTAssertEqual(Set(library.songs.map(\.key)).count, library.songs.count)
    }
    func testPublicDJSetsValidateAndPersistAsFavorites() async throws {
        let transport = transport(); defer { transport.session.invalidateAndCancel() }
        let page = try JSONDecoder().decode(PublicSetPage.self, from: Data(#"{"sets":[{"id":"cccccccccccccccccccccccccccccccc","title":"Rooftop party","seconds":7200}],"next":null}"#.utf8))
        let song = try XCTUnwrap(page.songPage().validated(product: .aiDJ).first)
        XCTAssertEqual(song.key, "ai-dj:cccccccccccccccccccccccccccccccc"); XCTAssertEqual(song.productName, "DJ sets")
        XCTAssertEqual(try transport.publicSetURL(song.id).path, "/api/ai-dj/sets/" + song.id + "/audio")
        XCTAssertThrowsError(try transport.publicSetURL("../private"))
        let suite = "jamloom-set-favorite-" + UUID().uuidString, defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let library = SongLibraryModel(defaults: defaults); library.loadFavorites(owner: nil); library.toggleFavorite(song)
        let restored = SongLibraryModel(defaults: defaults); restored.loadFavorites(owner: nil)
        XCTAssertEqual(restored.favorites, [song])
        let bad = try JSONDecoder().decode(PublicSetPage.self, from: Data(#"{"sets":[{"id":"cccccccccccccccccccccccccccccccc","title":"Invalid","seconds":-1}],"next":null}"#.utf8))
        XCTAssertThrowsError(try bad.songPage())
    }
    func testPublicSongOutageDoesNotAskForOwnerSignIn() async throws {
        let transport = transport(), account = AccountModel(transport: transport), library = SongLibraryModel()
        defer { transport.session.invalidateAndCancel() }
        AccountProtocol.headers = ["Content-Type": "application/json"]
        AccountProtocol.handle = { _ in (503, Data(#"{"error":"Jamloom is coming soon. Public access is not open yet."}"#.utf8)) }
        await library.load(.all, account: account)
        XCTAssertTrue(library.songs.isEmpty); XCTAssertFalse(library.needsSignIn)
        XCTAssertEqual(library.message, "Public songs are temporarily unavailable. Please try again later.")
        AccountProtocol.handle = { r in (200, Data((r.url?.path == "/api/ai-dj/sets" ? #"{"sets":[],"next":null}"# : #"{"songs":[],"next":null}"#).utf8)) }
        await library.load(.all, account: account)
        XCTAssertFalse(library.needsSignIn); XCTAssertTrue(library.message.isEmpty)
    }
    func testSongFavoritesPersistWithoutAudioAndStayAccountScoped() throws {
        let suite = "jamloom-favorites-test-" + UUID().uuidString, defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let page = try JSONDecoder().decode(LibraryPage.self, from: Data("{\"songs\":[{\"id\":\"\(String(repeating: "c", count: 32))\",\"title\":\"A favorite\",\"language\":\"en\",\"visibility\":\"private\"}],\"next\":null}".utf8))
        let song = try XCTUnwrap(page.validated(product: .improvise).first), first = SongLibraryModel(defaults: defaults)
        first.loadFavorites(owner: "alice"); first.toggleFavorite(song); XCTAssertEqual(first.favorites.first?.source, .improvise)
        let restored = SongLibraryModel(defaults: defaults); restored.loadFavorites(owner: "alice")
        XCTAssertEqual(restored.favorites, [song]); XCTAssertNil(restored.audio)
        restored.loadFavorites(owner: "bob"); XCTAssertTrue(restored.favorites.isEmpty)
        restored.loadFavorites(owner: nil); XCTAssertTrue(restored.favorites.isEmpty)
        restored.loadFavorites(owner: "alice"); restored.toggleFavorite(song)
        first.loadFavorites(owner: "alice"); XCTAssertTrue(first.favorites.isEmpty)
        let bad = try JSONDecoder().decode(LibraryPage.self, from: Data(#"{"songs":[{"id":"../account","title":"Invalid","language":"en"}],"next":null}"#.utf8))
        XCTAssertThrowsError(try bad.validated(product: .musicDNA))
    }
    func testFavoritesSyncAcrossClientsAndKeepFailedWritesVisible() async throws {
        let suite = "jamloom-sync-test-" + UUID().uuidString, defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let transport = transport(), account = AccountModel(transport: transport), first = SongLibraryModel(defaults: defaults), second = SongLibraryModel(defaults: defaults)
        defer { transport.session.invalidateAndCancel() }
        var saved = false, fail = false
        AccountProtocol.headers = ["Content-Type": "application/json"]
        AccountProtocol.handle = { request in
            if request.url?.path == "/api/auth/sign-in/email" { return (200, Data(#"{"user":{"id":"owner","email":"test@example.test"}}"#.utf8)) }
            if request.url?.path == "/api/account" { return (200, Data(#"{"user":{"id":"owner","email":"test@example.test","emailVerified":true},"balance":{"available":10,"reserved":0},"purchasesReleased":false}"#.utf8)) }
            XCTAssertEqual(request.url?.path, "/api/favorites")
            if request.httpMethod != "GET" {
                if fail { return (503, Data(#"{"error":"Unavailable"}"#.utf8)) }
                saved = request.httpMethod == "POST"; return (200, Data(#"{"saved":true}"#.utf8))
            }
            let track = #"{"id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","kind":"sets","title":"Party","language":""}"#
            return (200, Data("{\"owner\":\"owner\",\"tracks\":[\(saved ? track : "")],\"unavailable\":[]}".utf8))
        }
        await account.signIn(email: "test@example.test", password: "test-password-1234")
        XCTAssertNotNil(account.snapshot, account.message)
        let song = try SyncedMusic(id: String(repeating: "a", count: 32), kind: "sets", title: "Party", language: "", mood: nil).song()
        XCTAssertEqual(song.key, "ai-dj:" + song.id)
        await first.toggleFavorite(song, account: account); await second.syncFavorites(account: account)
        XCTAssertEqual(first.favorites, second.favorites); XCTAssertEqual(second.favorites.count, 1)
        fail = true; await second.toggleFavorite(song, account: account); XCTAssertEqual(second.favorites.count, 1); XCTAssertTrue(second.favoriteSync.contains("not saved"))
        fail = false; await second.toggleFavorite(song, account: account); await first.syncFavorites(account: account); XCTAssertTrue(first.favorites.isEmpty)
        for kind in ["private", "catalogue", "aurowall"] { XCTAssertThrowsError(try SyncedMusic(id: "../escape", kind: kind, title: "Invalid", language: nil, mood: nil).song()) }
        first.loadFavorites(owner: nil); first.toggleFavorite(song)
        await first.load(.favorites, account: account); XCTAssertEqual(first.deviceFavorites.count, 1); XCTAssertTrue(first.favorites.isEmpty)
        fail = true; await first.importDeviceFavorites(account: account); XCTAssertEqual(first.deviceFavorites.count, 1)
        fail = false; await first.importDeviceFavorites(account: account); XCTAssertEqual(first.favorites.count, 1)
        await first.load(.favorites, account: account); XCTAssertTrue(first.deviceFavorites.isEmpty)
        account.reset(); await first.load(.favorites, account: account); XCTAssertTrue(first.favorites.isEmpty)
    }
    func testAccountDeletionRequestRequiresSignInAndKeepsAccountUntilReviewed() async throws {
        let transport = transport(), account = AccountModel(transport: transport)
        var requested = false, requests = 0
        let id = UUID().uuidString
        AccountProtocol.handle = { request in
            requests += 1
            if request.url?.path == "/api/auth/sign-in/email" { return (200, Data(#"{"user":{"id":"owner","email":"test@example.test"}}"#.utf8)) }
            let receipt = "{\"id\":\"\(id)\",\"status\":\"open\",\"created_at\":\"2026-10-24T00:00:00Z\"}"
            if request.url?.path == "/api/account/deletion" {
                XCTAssertEqual(request.httpMethod, "POST"); XCTAssertEqual(request.value(forHTTPHeaderField: "Origin"), "https://www.jamloom.com")
                requested = true; return (200, Data("{\"request\":\(receipt)}".utf8))
            }
            XCTAssertEqual(request.url?.path, "/api/account")
            return (200, Data("{\"user\":{\"id\":\"owner\",\"email\":\"test@example.test\"},\"balance\":{\"available\":0,\"reserved\":0},\"purchasesReleased\":false,\"deletionRequest\":\(requested ? receipt : "null")}".utf8))
        }
        await account.requestAccountDeletion(); XCTAssertEqual(requests, 0)
        await account.signIn(email: "test@example.test", password: "fixture password")
        XCTAssertNil(account.snapshot?.deletionRequest)
        await account.requestAccountDeletion()
        XCTAssertEqual(account.snapshot?.deletionRequest?.id.uuidString, id)
        XCTAssertEqual(account.snapshot?.user.id, "owner")
        XCTAssertTrue(account.message.contains("not been deleted yet"))
    }
    func testCatalogueSearchUsesPublicRouteWithoutSigningIn() async throws {
        let transport = transport(), account = AccountModel(transport: transport)
        defer { transport.session.invalidateAndCancel() }
        AccountProtocol.handle = { request in
            XCTAssertEqual(request.url?.path, "/api/music-search"); XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
            return (200, Data(#"{"suggestions":[{"reference":"Daft Punk","kind":"Artist","metadata":{"reference":"Daft Punk","genre":"Electronic","source":"itunes","id":5468295}},{"reference":"One More Time — Daft Punk","kind":"Track"}]}"#.utf8))
        }
        XCTAssertNil(account.snapshot)
        let result: MusicSearchResult = try await account.transport.request("/api/music-search", method: "POST", body: Data(#"{"query":"Daft Punk"}"#.utf8))
        XCTAssertEqual(result.suggestions.map(\.kind), ["Artist", "Track"])
        XCTAssertEqual(result.suggestions.first?.metadata?.source, "itunes"); XCTAssertNil(account.snapshot)
    }
    func testCloudDownloadFollowsOnlySignedSongStorageWithoutCredentials() async throws {
        let transport = transport(); defer { transport.session.invalidateAndCancel(); AccountProtocol.headers = ["Content-Type": "application/json"] }
        let id = String(repeating: "b", count: 32), data = try CloudRecording.wav(AudioInput(samples: [Float](repeating: 0.1, count: 48000), rate: 48000), start: 0, end: 1)
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        var location = "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.r2.cloudflarestorage.com/test/improvise/private/\(id)/\(digest).wav?X-Amz-Signature=test"
        var downloads = 0, corrupt = false
        AccountProtocol.handle = { request in
            if request.url?.host == "www.jamloom.com" { AccountProtocol.headers = ["Location": location]; return (307, Data()) }
            downloads += 1
            XCTAssertNil(request.value(forHTTPHeaderField: "Cookie")); XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
            AccountProtocol.headers = ["Content-Type": "audio/wav"]
            return (200, corrupt ? Data(repeating: 0, count: data.count) : data)
        }
        let file = try await transport.songAudio(id); defer { try? FileManager.default.removeItem(at: file) }
        XCTAssertEqual(try Data(contentsOf: file), data); XCTAssertEqual(downloads, 1)
        corrupt = true
        do { _ = try await transport.songAudio(id); XCTFail("Must reject a corrupted download") } catch { }
        location = "https://example.com/recording.wav"
        do { _ = try await transport.songAudio(id); XCTFail("Must reject a foreign redirect") } catch { }
        XCTAssertEqual(downloads, 2)
        corrupt = false
        location = "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.r2.cloudflarestorage.com/test/improvise/private/\(id)/\(digest).wav?X-Amz-Signature=test"
        do { _ = try await transport.songAudio(id, product: .musicDNA); XCTFail("Must reject another product's storage") } catch { }
        XCTAssertEqual(downloads, 2)
        location = location.replacingOccurrences(of: "/improvise/", with: "/music-dna/")
        let dnaFile = try await transport.songAudio(id, product: .musicDNA); defer { try? FileManager.default.removeItem(at: dnaFile) }
        XCTAssertEqual(try Data(contentsOf: dnaFile), data); XCTAssertEqual(downloads, 3)
    }
    func testMusicDNAQuotesCompleteFavoritesAndRecoversAnInterruptedSubmission() async throws {
        let transport = transport(), account = AccountModel(transport: transport), cloud = CloudSongModel(product: .musicDNA)
        let user = UUID().uuidString, key = "jamloom-native-music-dna-\(user)"
        defer { cloud.stopPolling(); UserDefaults.standard.removeObject(forKey: key); transport.session.invalidateAndCancel() }
        var submitted = "", quoted: [String: Any]?, actions: [String] = []
        var profile = TasteProfile(); profile.references = (0..<5000).map { "Favorite song \($0) — Artist" }; profile.vocalLanguage = "tr"
        profile.referenceMetadata = profile.references.enumerated().map { TasteReferenceMetadata(reference: $0.element, genre: "Rock", source: "itunes", id: $0.offset + 1) }
        AccountProtocol.handle = { request in
            let url = try XCTUnwrap(request.url)
            XCTAssertEqual(url.host, "www.jamloom.com", "DNA must not upload source audio")
            if url.path == "/api/auth/sign-in/email" { return (200, Data("{\"user\":{\"id\":\"\(user)\",\"email\":\"test@example.test\"}}".utf8)) }
            if url.path == "/api/account" { return (200, Data("{\"user\":{\"id\":\"\(user)\",\"email\":\"test@example.test\"},\"balance\":{\"available\":20,\"reserved\":0},\"purchasesReleased\":false}".utf8)) }
            XCTAssertEqual(url.path, "/api/taste/song")
            if request.httpMethod == "GET" { return (200, Data((url.query == nil ? "{\"creditsEnabled\":true,\"signedIn\":true}" : "{\"id\":\"\(submitted)\",\"state\":\"completed\"}").utf8)) }
            var data = request.httpBody ?? Data()
            if let stream = request.httpBodyStream { stream.open(); defer { stream.close() }; var bytes = [UInt8](repeating: 0, count: 4096); while stream.hasBytesAvailable { let count = stream.read(&bytes, maxLength: bytes.count); if count <= 0 { break }; data.append(contentsOf: bytes.prefix(count)) } }
            let body = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any]), input = try XCTUnwrap(body["profile"] as? [String: Any])
            XCTAssertEqual(body["visibility"] as? String, "private"); XCTAssertEqual(body["publicConsent"] as? Bool, false)
            let action = try XCTUnwrap(body["action"] as? String); actions.append(action)
            if action == "quote" {
                XCTAssertEqual((input["references"] as? [String])?.count, 5000); XCTAssertEqual((input["referenceMetadata"] as? [[String: Any]])?.count, 5000)
                XCTAssertEqual(input["vocalLanguage"] as? String, "tr"); quoted = input
                return (200, Data("{\"credits\":9,\"token\":\"dna-quote\",\"expiresAt\":\(Date().addingTimeInterval(300).timeIntervalSince1970 * 1000)}".utf8))
            }
            XCTAssertEqual(action, "submit"); XCTAssertEqual(input as NSDictionary, quoted! as NSDictionary)
            submitted = try XCTUnwrap(body["requestId"] as? String); XCTAssertEqual(UserDefaults.standard.string(forKey: key), submitted)
            XCTAssertEqual(body["token"] as? String, "dna-quote")
            throw URLError(.networkConnectionLost)
        }
        await account.signIn(email: "test@example.test", password: "test-password"); await cloud.connect(account)
        await cloud.reviewTaste(profile); XCTAssertTrue(actions.isEmpty)
        XCTAssertFalse(cloud.keepPrivate); cloud.keepPrivate = true
        cloud.consent = true; await cloud.reviewTaste(profile); XCTAssertEqual(actions, ["quote"])
        await cloud.submit(); XCTAssertEqual(actions, ["quote", "submit"])
        for _ in 0..<50 { if cloud.state == "completed" { break }; try await Task.sleep(for: .milliseconds(100)) }
        XCTAssertEqual(cloud.state, "completed"); XCTAssertEqual(cloud.job, submitted)
        let recovered = CloudSongModel(product: .musicDNA); defer { recovered.stopPolling() }
        await recovered.connect(account); XCTAssertEqual(recovered.job, submitted)
        await recovered.submit(); XCTAssertEqual(actions, ["quote", "submit"], "Recovery must never double submit")
    }

    func testNativeCloudFlowQuotesBeforeSubmissionAndKeepsStorageUnauthenticated() async throws {
        let transport = transport(), account = AccountModel(transport: transport), cloud = CloudSongModel()
        let user = UUID().uuidString
        defer { cloud.stopPolling(); UserDefaults.standard.removeObject(forKey: "jamloom-native-improvise-\(user)") }
        var uploads = 0, quotes = 0, submits = 0, submittedID = ""
        AccountProtocol.handle = { request in
            let url = request.url!
            if url.host != "www.jamloom.com" {
                uploads += 1
                XCTAssertEqual(request.httpMethod, "PUT"); XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "audio/wav")
                XCTAssertNil(request.value(forHTTPHeaderField: "Cookie")); XCTAssertNil(request.value(forHTTPHeaderField: "Origin")); XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
                return (200, Data())
            }
            if url.path == "/api/auth/sign-in/email" { return (200, Data("{\"user\":{\"id\":\"\(user)\",\"email\":\"test@example.test\"}}".utf8)) }
            if url.path == "/api/account" { return (200, Data("{\"user\":{\"id\":\"\(user)\",\"email\":\"test@example.test\"},\"balance\":{\"available\":20,\"reserved\":0},\"purchasesReleased\":false}".utf8)) }
            if request.httpMethod == "GET" {
                return (200, Data((url.query == nil ? "{\"creditsEnabled\":true,\"signedIn\":true}" : "{\"id\":\"\(submittedID)\",\"state\":\"completed\"}").utf8))
            }
            var data = request.httpBody ?? Data()
            if let stream = request.httpBodyStream { stream.open(); defer { stream.close() }; var bytes = [UInt8](repeating: 0, count: 4096); while stream.hasBytesAvailable { let count = stream.read(&bytes, maxLength: bytes.count); if count <= 0 { break }; data.append(contentsOf: bytes.prefix(count)) } }
            let body = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
            switch body["action"] as? String {
            case "upload":
                XCTAssertEqual(body["consent"] as? Bool, true)
                XCTAssertEqual((body["sha256"] as? String)?.count, 64)
                return (200, Data("{\"id\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"url\":\"https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.r2.cloudflarestorage.com/test/uploads/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.wav?X-Amz-Signature=test\"}".utf8))
            case "quote":
                quotes += 1; XCTAssertEqual(submits, 0); XCTAssertEqual(body["visibility"] as? String, "public")
                return (200, Data("{\"credits\":7,\"token\":\"test-quote\",\"expiresAt\":\(Date().addingTimeInterval(300).timeIntervalSince1970 * 1000)}".utf8))
            case "submit":
                submits += 1; submittedID = try XCTUnwrap(body["requestId"] as? String)
                XCTAssertEqual(UserDefaults.standard.string(forKey: "jamloom-native-improvise-\(user)"), submittedID)
                XCTAssertEqual(body["token"] as? String, "test-quote"); XCTAssertEqual(body["publicConsent"] as? Bool, true)
                return (202, Data("{\"id\":\"\(submittedID)\",\"state\":\"queued\"}".utf8))
            default: throw URLError(.badServerResponse)
            }
        }
        await account.signIn(email: "test@example.test", password: "test-password")
        await cloud.connect(account)
        let input = AudioInput(samples: [Float](repeating: 0.1, count: 48000), rate: 48000)
        await cloud.review(input: input, start: 0, end: 1); XCTAssertEqual(uploads, 0)
        cloud.consent = true
        await cloud.review(input: input, start: 0, end: 1)
        XCTAssertEqual(uploads, 1); XCTAssertEqual(quotes, 1); XCTAssertEqual(submits, 0); XCTAssertEqual(cloud.quote?.credits, 7, cloud.message)
        cloud.keepPrivate = true
        XCTAssertNil(cloud.quote, "Changing privacy must invalidate the price before charging")
        cloud.keepPrivate = false
        await cloud.review(input: input, start: 0, end: 1)
        XCTAssertEqual(uploads, 1); XCTAssertEqual(quotes, 2)
        await cloud.submit()
        for _ in 0..<50 { if cloud.state == "completed" { break }; try await Task.sleep(for: .milliseconds(20)) }
        XCTAssertEqual(cloud.state, "completed"); XCTAssertEqual(submits, 1)
        await cloud.submit(); XCTAssertEqual(submits, 1)
        cloud.newSong(); XCTAssertNil(cloud.job); XCTAssertFalse(cloud.consent)
        AccountProtocol.handle = { _ in XCTFail("Unsafe upload destination must be rejected before transport"); return (200, Data()) }
        do { try await transport.uploadSong(Data(repeating: 0, count: 100), to: URL(string: "https://example.com/private")!); XCTFail("Expected storage restriction") } catch { }
    }
    func testSongTransportKeepsOriginQueryAndAcceptedResponseBoundaries() async throws {
        let transport = transport(); defer { transport.session.invalidateAndCancel() }
        let id = String(repeating: "a", count: 32)
        AccountProtocol.handle = { request in
            XCTAssertEqual(request.url?.host, "www.jamloom.com")
            XCTAssertEqual(request.value(forHTTPHeaderField: "X-Jamloom-DNA"), "1")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Origin"), "https://www.jamloom.com")
            return (202, Data("{\"id\":\"\(id)\",\"state\":\"queued\"}".utf8))
        }
        let accepted: CloudSongModel.Job = try await transport.request("/api/improvise/song", method: "POST", body: Data("{}".utf8))
        XCTAssertEqual(accepted.id, id)
        AccountProtocol.handle = { request in
            XCTAssertEqual(URLComponents(url: request.url!, resolvingAgainstBaseURL: false)?.queryItems, [URLQueryItem(name: "id", value: id)])
            return (200, Data("{\"id\":\"\(id)\",\"state\":\"completed\"}".utf8))
        }
        let done: CloudSongModel.Job = try await transport.request("/api/improvise/song", query: ["id": id]); XCTAssertEqual(done.state, "completed")
        AccountProtocol.handle = { _ in XCTFail("Invalid query must not leave device"); return (200, Data()) }
        for query in [["id": "../account"], ["id": id, "url": "https://example.com"], ["id": id, "file": "source"]] {
            do { let _: CloudSongModel.Job = try await transport.request("/api/improvise/song", query: query); XCTFail("Expected query restriction") } catch { }
        }
        do { let _: AccountSnapshot = try await transport.request("/api/account", query: ["id": id]); XCTFail("Account query must stay restricted") } catch { }
        AccountProtocol.handle = { _ in (402, Data("{\"error\":\"You need more credits.\"}".utf8)) }
        do { let _: CloudSongModel.Job = try await transport.request("/api/improvise/song", method: "POST"); XCTFail("Expected credit failure") }
        catch let error as SongRequestError { XCTAssertEqual(error.status, 402); XCTAssertEqual(error.message, "You need more credits.") }
    }
    func testCloudUnavailableAndNoConsentNeverUpload() async throws {
        let account = AccountModel(transport: transport()), cloud = CloudSongModel()
        var calls = 0
        AccountProtocol.handle = { request in
            calls += 1; XCTAssertEqual(request.httpMethod, "GET"); XCTAssertEqual(request.url?.path, "/api/improvise/song")
            return (200, Data("{\"available\":false,\"creditsEnabled\":false}".utf8))
        }
        await cloud.connect(account)
        XCTAssertFalse(cloud.available)
        let input = AudioInput(samples: [Float](repeating: 0.1, count: 48000), rate: 48000)
        await cloud.review(input: input, start: 0, end: 1)
        cloud.consent = true
        await cloud.review(input: input, start: 0, end: 1)
        await cloud.submit()
        XCTAssertEqual(calls, 1); XCTAssertNil(cloud.quote); XCTAssertNil(cloud.job)
    }
    func transport() -> AccountTransport {
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [AccountProtocol.self]
        return AccountTransport(configuration: config)
    }
    func testAccountBalanceTasteConflictAndSignout() async throws {
        let transport = transport(), account = AccountModel(transport: transport)
        var conflict = false, saves = 0
        AccountProtocol.handle = { request in
            XCTAssertEqual(request.value(forHTTPHeaderField: "Origin"), "https://www.jamloom.com")
            let body: String
            switch request.url!.path {
            case "/api/auth/sign-in/email": body = "{\"user\":{\"id\":\"one\",\"email\":\"one@example.test\"}}"
            case "/api/account": body = "{\"user\":{\"id\":\"one\",\"email\":\"one@example.test\"},\"balance\":{\"available\":10,\"reserved\":2},\"purchasesReleased\":false}"
            case "/api/taste":
                if request.httpMethod == "GET" { return (200, try JSONEncoder().encode(TasteResponse(saved: Saved(profile: TasteProfile(), revision: 7)))) }
                saves += 1
                if conflict { return (409, Data("{}".utf8)) }
                body = "{\"revision\":8}"
            case "/api/auth/sign-out": body = "{\"success\":true}"
            default: throw URLError(.badURL)
            }
            return (200, Data(body.utf8))
        }
        await account.signIn(email: "one@example.test", password: "local-test-password")
        XCTAssertEqual(account.snapshot?.balance.available, 10)
        do { try await account.saveTaste(TasteProfile()); XCTFail("Must load revision first") } catch { }
        XCTAssertEqual(saves, 0)
        let loaded = try await account.loadTaste(); XCTAssertEqual(loaded, TasteProfile())
        try await account.saveTaste(TasteProfile()); XCTAssertEqual(saves, 1)
        conflict = true
        do { try await account.saveTaste(TasteProfile()); XCTFail("Must surface conflict") } catch AccountError.conflict { }
        await account.signOut(); XCTAssertNil(account.snapshot)
        do { _ = try await account.loadTaste(); XCTFail("Must require account") } catch AccountError.signedOut { }
    }
    func testOversizedUnauthorizedAndInvalidEndpointResponses() async throws {
        let transport = transport(); defer { transport.session.invalidateAndCancel() }
        AccountProtocol.handle = { _ in (200, Data(repeating: 32, count: 65537)) }
        do { let _: AccountSnapshot = try await transport.request("/api/account"); XCTFail("Expected byte cap") } catch { }
        AccountProtocol.handle = { _ in (401, Data("{}".utf8)) }
        do { let _: AccountSnapshot = try await transport.request("/api/account"); XCTFail("Expected session expiry") } catch AccountError.signedOut { }
        let foreign = AccountTransport(base: URL(string: "https://foreign.example")!)
        defer { foreign.session.invalidateAndCancel() }
        do { let _: AccountSnapshot = try await foreign.request("/api/account"); XCTFail("Expected origin restriction") } catch { }
    }
    func testActualPublicWebsiteSongsWithoutSignIn() async throws {
        guard let origin = ProcessInfo.processInfo.environment["JAMLOOM_PUBLIC_SONGS_TEST_ORIGIN"] else { throw XCTSkip("Run against the local production server with its launch gate enabled.") }
        let base = try XCTUnwrap(URL(string: origin)); XCTAssertEqual(base.host, "127.0.0.1")
        let account = AccountModel(transport: AccountTransport(base: base)), library = SongLibraryModel()
        defer { library.clearAudio(); account.transport.session.invalidateAndCancel() }
        await library.load(.all, account: account)
        XCTAssertNil(account.snapshot); XCTAssertFalse(library.needsSignIn); XCTAssertTrue(library.message.isEmpty, library.message)
        for (file, key, fallback) in [("music-validation", "songs", ""), ("dna-examples", "examples", "music-dna")] {
            let url = try XCTUnwrap(Bundle(for: AccountTests.self).url(forResource: file, withExtension: "json"))
            let json = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
            let rows = try XCTUnwrap(json[key] as? [[String: Any]])
            let expected = Set(rows.map { "\($0["product"] as? String ?? fallback):\($0["id"]!)" })
            XCTAssertTrue(expected.isSubset(of: Set(library.songs.map(\.key))), "Every website manifest song must load anonymously")
        }
        for product in [CloudSongProduct.improvise, .musicDNA] {
            let song = try XCTUnwrap(library.songs.first { $0.source == product })
            let prepared = await library.prepare(song, account: account)
            let url = try XCTUnwrap(prepared, library.message)
            XCTAssertGreaterThan(try Data(contentsOf: url).count, 44)
            library.clearAudio(); XCTAssertFalse(FileManager.default.fileExists(atPath: url.path))
        }
    }
    func testActualLocalAccountAndProfileSync() async throws {
        guard let origin = ProcessInfo.processInfo.environment["JAMLOOM_ACCOUNT_TEST_ORIGIN"] else { throw XCTSkip("Run the disposable local account harness for HTTP integration.") }
        let base = try XCTUnwrap(URL(string: origin))
        XCTAssertEqual(base.host, "127.0.0.1")
        let account = AccountModel(transport: AccountTransport(base: base))
        await account.signIn(email: "native@example.test", password: "Jamloom-native-test-password-739")
        XCTAssertEqual(account.snapshot?.user.email, "native@example.test", account.message)
        XCTAssertEqual(account.snapshot?.balance.available, 10)
        let first = try await account.loadTaste(); XCTAssertNil(first)
        var profile = TasteProfile(); profile.references = ["Native test preference"]
        profile.catalogue = [TasteChoice(id: try XCTUnwrap(TasteCatalogue.tracks.first).id, rating: "love", weight: 3)]
        try await account.saveTaste(profile)
        let loaded = try await account.loadTaste(); XCTAssertEqual(loaded, profile)
        try await account.deleteTaste()
        let deleted = try await account.loadTaste(); XCTAssertNil(deleted)
        await account.signOut(); XCTAssertNil(account.snapshot)
        do { let _: AccountSnapshot = try await account.transport.request("/api/account"); XCTFail("Sign-out must revoke the session") } catch AccountError.signedOut { }
    }
    private struct Saved: Encodable { let profile: TasteProfile; let revision: Int }
    private struct TasteResponse: Encodable { let saved: Saved }
}
