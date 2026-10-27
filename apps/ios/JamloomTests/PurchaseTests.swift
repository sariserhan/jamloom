import XCTest
import StoreKit
import StoreKitTest
@testable import Jamloom

@MainActor final class PurchaseTests: XCTestCase {
    func testLiveSandboxReceiptWhenExplicitlyRequested() async throws {
        let env = ProcessInfo.processInfo.environment
        try XCTSkipUnless(env["JAMLOOM_APPLE_SANDBOX"] == "purchase" || env["JAMLOOM_APPLE_SANDBOX"] == "acknowledge", "Explicit Apple sandbox qualification only")
        #if targetEnvironment(simulator)
        throw XCTSkip("Physical sandbox device required")
        #else
        let token = try XCTUnwrap(UUID(uuidString: env["JAMLOOM_APPLE_ACCOUNT_TOKEN"] ?? ""))
        let id = env["JAMLOOM_APPLE_PRODUCT"] ?? ""
        guard ["com.jamloom.credits.starter", CreditPurchases.singingProduct].contains(id) else { XCTFail("Unsupported sandbox test product"); return }
        if env["JAMLOOM_APPLE_SANDBOX"] == "acknowledge" {
            let expected = try XCTUnwrap(UInt64(env["JAMLOOM_APPLE_ACK_TRANSACTION"] ?? ""))
            for await value in Transaction.unfinished {
                if case .verified(let transaction) = value, transaction.id == expected {
                    guard transaction.environment == .sandbox, transaction.appAccountToken == token, transaction.productID == id else { XCTFail("Sandbox acknowledgement mismatch"); return }
                    await transaction.finish(); return
                }
            }
            XCTFail("Expected unfinished sandbox transaction"); return
        }
        // Conservative pre-purchase check; the individual transaction is verified separately below.
        guard case .verified(let app) = try await AppTransaction.refresh(), app.environment == .sandbox else { XCTFail("Sandbox app receipt required before a test purchase"); return }
        let products = try await Product.products(for: [id])
        let product = try XCTUnwrap(products.first)
        guard product.id == id, product.priceFormatStyle.currencyCode == "USD",
              product.price == (id == CreditPurchases.singingProduct ? Decimal(39) : Decimal(string: "9.99")!),
              !product.description.contains("Local test") else { XCTFail("Real Apple sandbox product required"); return }
        switch try await product.purchase(options: [.appAccountToken(token)]) {
        case .success(let result):
            guard case .verified(let transaction) = result, transaction.environment == .sandbox,
                  transaction.appAccountToken == token, transaction.productID == id else { XCTFail("Sandbox transaction verification failed"); return }
            let proof = XCTAttachment(string: result.jwsRepresentation)
            proof.name = "Private Apple sandbox JWS - do not publish"; proof.lifetime = .keepAlways; add(proof)
            // Remains unfinished until the isolated server confirms delivery, then explicit acknowledgement.
        case .pending: XCTFail("Sandbox purchase pending")
        case .userCancelled: XCTFail("Sandbox purchase cancelled")
        @unknown default: XCTFail("Unknown sandbox result")
        }
        XCTAssertFalse(CreditPurchases.released); XCTAssertFalse(CreditPurchases.singingReleased)
        #endif
    }
    func testLiveAppleCatalogueWhenExplicitlyRequested() async throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["JAMLOOM_APPLE_CATALOGUE"] == "1", "Explicit real Apple catalogue check only")
        #if targetEnvironment(simulator)
        throw XCTSkip("Use a physical device without a StoreKit configuration")
        #else
        // App-download transactions do not prove an in-app purchase's environment.
        // This opt-in catalogue check never qualifies receipts or starts a purchase.
        let expected: [String: Decimal] = ["com.jamloom.credits.starter": Decimal(string: "9.99")!, "com.jamloom.credits.creator": Decimal(string: "24.99")!, "com.jamloom.credits.studio": Decimal(string: "49.99")!, CreditPurchases.singingProduct: 39]
        let products = try await Product.products(for: Array(expected.keys))
        let rows = products.map { ["id": $0.id, "name": $0.displayName, "description": $0.description, "price": NSDecimalNumber(decimal: $0.price).stringValue, "currency": $0.priceFormatStyle.currencyCode, "type": $0.type.rawValue] }
        let proof = XCTAttachment(data: try JSONSerialization.data(withJSONObject: rows, options: .sortedKeys), uniformTypeIdentifier: "public.json")
        proof.name = "Product catalogue only - receipt environment not qualified"; proof.lifetime = .keepAlways; add(proof)
        XCTAssertEqual(Set(products.map(\.id)), Set(expected.keys))
        for product in products {
            XCTAssertEqual(product.price, expected[product.id]); XCTAssertEqual(product.priceFormatStyle.currencyCode, "USD")
            XCTAssertEqual(product.type, product.id == CreditPurchases.singingProduct ? .nonConsumable : .consumable)
        }
        XCTAssertFalse(CreditPurchases.released); XCTAssertFalse(CreditPurchases.singingReleased)
        #endif
    }
    func testSingingFreeLessonGateUsesPackagedCourseIds() throws {
        let root = try XCTUnwrap(Bundle.main.url(forResource: "Studio", withExtension: nil))
        let ids = Set(try JSONDecoder().decode([String].self, from: Data(contentsOf: root.appendingPathComponent("singing-free-lessons.json"))))
        XCTAssertEqual(ids.count, 13); XCTAssertTrue(ids.contains("first-light")); XCTAssertTrue(ids.contains("first-note"))
        for id in ["first-light", "first-note", "city-lights", "unknown", ""] {
            let url = URL(string: "http://127.0.0.1/token/singing.html?lesson=\(id)")!
            XCTAssertEqual(SingingModel.requiresPurchase(url, hasCourse: false, freeLessons: ids), !ids.contains(id))
            XCTAssertFalse(SingingModel.requiresPurchase(url, hasCourse: true, freeLessons: ids))
        }
        XCTAssertFalse(SingingModel.requiresPurchase(URL(string: "http://127.0.0.1/token/singing-home.html"), hasCourse: false, freeLessons: ids))
    }
    private func deliveredTransaction(_ product: String) async throws -> VerificationResult<StoreKit.Transaction> {
        for _ in 0..<50 {
            if let result = await StoreKit.Transaction.latest(for: product) { return result }
            try await Task.sleep(for: .milliseconds(100))
        }
        throw URLError(.timedOut)
    }
    func testSingingCourseRestoreDoesNotDeliverCreditsOrCrossAccounts() async throws {
        let session = try SKTestSession(configurationFileNamed: "LocalCredits")
        session.disableDialogs = true; session.clearTransactions()
        defer { session.clearTransactions() }
        let course = CreditPurchases(course: true), token = UUID()
        let products = try await course.products()
        XCTAssertEqual(products.count, 1); XCTAssertEqual(products.first?.type, .nonConsumable)
        XCTAssertEqual(products.first?.price, Decimal(39))
        _ = try await session.buyProduct(identifier: CreditPurchases.singingProduct, options: [.appAccountToken(token)])
        let result = try await deliveredTransaction(CreditPurchases.singingProduct)
        do { try await course.deliverVerified(result, accountToken: UUID()) { _, _ in XCTFail("Wrong account delivered") }; XCTFail("Account must match") }
        catch CreditPurchases.PurchaseError.wrongAccount { }
        var delivered = 0
        try await CreditPurchases().reconcileUnfinished(accountToken: token) { _, _ in XCTFail("Course must never deliver credits") }
        try await course.deliverVerified(result, accountToken: token) { _, _ in delivered += 1 }
        for await entitlement in StoreKit.Transaction.currentEntitlements {
            try await course.deliverVerified(entitlement, accountToken: token) { _, _ in delivered += 1 }
        }
        XCTAssertEqual(delivered, 2, "Finished non-consumable remains restorable; server deduplicates")
        XCTAssertFalse(CreditPurchases.singingReleased)
    }
    func testLocalStoreKitAcknowledgmentRecoveryAndAccountBinding() async throws {
        let session = try SKTestSession(configurationFileNamed: "LocalCredits")
        session.disableDialogs = true; session.clearTransactions()
        defer { session.clearTransactions() }
        let product = "com.jamloom.credits.starter", token = UUID(), purchases = CreditPurchases()
        let products = try await purchases.products()
        XCTAssertEqual(products.first?.id, product)
        XCTAssertFalse(try XCTUnwrap(products.first).displayPrice.isEmpty)
        let transaction = try await session.buyProduct(identifier: product, options: [.appAccountToken(token)])
        let result = try await deliveredTransaction(product)
        var delivered = 0
        do {
            try await purchases.deliverVerified(result, accountToken: UUID()) { _, _ in delivered += 1 }
            XCTFail("Wrong account must remain unfinished")
        } catch CreditPurchases.PurchaseError.wrongAccount { }
        do {
            try await purchases.deliverVerified(result, accountToken: token) { _, _ in throw URLError(.notConnectedToInternet) }
            XCTFail("Failed server delivery must remain unfinished")
        } catch { }
        XCTAssertEqual(delivered, 0)
        var unfinished: [UInt64] = []
        for await value in StoreKit.Transaction.unfinished { if case .verified(let tx) = value { unfinished.append(tx.id) } }
        XCTAssertTrue(unfinished.contains(transaction.id))
        try await purchases.reconcileUnfinished(accountToken: token) { jws, account in
            XCTAssertEqual(account, token); XCTAssertEqual(jws.split(separator: ".").count, 3); delivered += 1
        }
        XCTAssertEqual(delivered, 1)
        unfinished = []
        for await value in StoreKit.Transaction.unfinished { if case .verified(let tx) = value { unfinished.append(tx.id) } }
        XCTAssertFalse(unfinished.contains(transaction.id))
        XCTAssertFalse(CreditPurchases.released)
    }
}
