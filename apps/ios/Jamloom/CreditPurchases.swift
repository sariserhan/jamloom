import Foundation
import StoreKit

// No public purchase UI until server verification, account binding and quality pass.
@MainActor final class CreditPurchases {
    enum PurchaseError: Error { case unavailable, unverified, wrongAccount, wrongProduct }
    static let released = false
    static let singingReleased = false
    static let singingProduct = "com.jamloom.singing.complete"
    static let creatorProduct = "com.jamloom.creator.monthly"
    static let topUpProduct = "com.jamloom.credits.topup150"
    let course: Bool
    init(course: Bool = false) { self.course = course }
    var productIDs: [String] { course ? [Self.singingProduct] : [Self.creatorProduct, Self.topUpProduct, "com.jamloom.credits.starter", "com.jamloom.credits.creator", "com.jamloom.credits.studio"] }
    private func productType(_ id: String) -> Product.ProductType { course ? .nonConsumable : id == Self.creatorProduct ? .autoRenewable : .consumable }
    func products() async throws -> [Product] { try await Product.products(for: course ? [Self.singingProduct] : [Self.creatorProduct, Self.topUpProduct]) }
    func purchase(_ product: Product, accountToken: UUID,
                  deliver: (String, UUID) async throws -> Void) async throws {
        guard course ? Self.singingReleased : Self.released else { throw PurchaseError.unavailable }
        guard productIDs.contains(product.id), product.type == productType(product.id) else { throw PurchaseError.wrongProduct }
        switch try await product.purchase(options: [.appAccountToken(accountToken)]) {
        case .success(let result): try await deliverVerified(result, accountToken: accountToken, deliver: deliver)
        case .pending, .userCancelled: break
        @unknown default: throw PurchaseError.unverified
        }
    }
    func deliverVerified(_ result: VerificationResult<Transaction>, accountToken: UUID,
                         deliver: (String, UUID) async throws -> Void) async throws {
        guard case .verified(let transaction) = result else { throw PurchaseError.unverified }
        guard productIDs.contains(transaction.productID), transaction.productType == productType(transaction.productID),
              transaction.revocationDate == nil else { throw PurchaseError.wrongProduct }
        guard transaction.appAccountToken == accountToken else { throw PurchaseError.wrongAccount }
        // The backend must verify the JWS independently and atomically acknowledge its ledger grant.
        try await deliver(result.jwsRepresentation, accountToken)
        await transaction.finish()
    }
    func reconcileUnfinished(accountToken: UUID, deliver: (String, UUID) async throws -> Void) async throws {
        for await result in Transaction.unfinished {
            // Another Jamloom account's pending purchase must not block this account's recovery.
            if case .verified(let transaction) = result, transaction.appAccountToken != accountToken || !productIDs.contains(transaction.productID) { continue }
            try await deliverVerified(result, accountToken: accountToken, deliver: deliver)
        }
    }
    func restoreSubscription(accountToken: UUID, deliver: (String, UUID) async throws -> Void) async throws {
        guard !course else { throw PurchaseError.wrongProduct }
        try await AppStore.sync()
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result, transaction.productID == Self.creatorProduct else { continue }
            try await deliverVerified(result, accountToken: accountToken, deliver: deliver)
        }
    }
    func restoreCourse(accountToken: UUID, deliver: (String, UUID) async throws -> Void) async throws {
        guard course else { throw PurchaseError.wrongProduct }
        // Call AppStore.sync only from the explicit Restore button, not every account refresh.
        try await AppStore.sync()
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, !productIDs.contains(transaction.productID) { continue }
            try await deliverVerified(result, accountToken: accountToken, deliver: deliver)
        }
    }
}
