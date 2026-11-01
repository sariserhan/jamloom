# Apple payment closure — 2026-10-31

**PASS real iPhone sandbox purchase/Restore and local server verification; PARTIAL release.** No deployment, App Store upload, live charge, paid compute or sales activation occurred.

## Completed evidence

- Actual Apple catalogue on iPhone 14 Pro/iOS 27.0.1: Creator USD15 monthly, top-up USD10 and Singing USD39 have the expected product types. No Xcode StoreKit fixture was attached.
- Actual top-up and Creator sandbox purchases passed. The owner confirmed the sandbox sheet. Both receipts passed independent Apple certificate/signature verification, exact product/price/account/environment validation and isolated PostgreSQL fulfillment before explicit device acknowledgement.
- Creator Restore passed on the phone after owner confirmation. The restored receipt has the same transaction identity despite a different signed payload. Initial purchases plus restored replay grant **450 test credits total, exactly two lots**, not 750.
- Authenticated real localhost HTTP delivery passes through Better Auth and `/api/payments/apple`; missing session, wrong origin/account and forged receipts are rejected. Live wallet remains zero. This uses a Node HTTP client; native phone-to-deployed-server delivery is still NOT RUN.
- The new In-App Purchase key supplied by the owner authenticates to Apple's sandbox API. Apple's signed TEST notification passes the independent verifier and local HTTP reconciliation/deduplication. Raw JWS, account token, credentials and `.xcresult` attachments remain in ignored private output, not this evidence folder.
- Added separate sandbox notification URL, selected before payload decoding; its verifier and ledger remain sandbox even under production defaults. Apple callbacks bypass the public-preview and maintenance page gates, while purchase routes remain gated.
- Added missing Apple app ID/bundle/environment/trust-root variables to Vercel production and saved separate V2 production/sandbox URLs in App Store Connect. No deployment or existing secret replacement occurred. Saved variables do not update an existing deployment.
- 184 website checks, typecheck, production qualification build, bundle audit and signed physical test build pass. Read-only production migration audit remains 33/33 hashes with no pending/changed migrations.

[Device results](device-checks.json), [receipt and HTTP verification](receipt-verification.json), [validation](validation.json), [prepared configuration](vercel-apple-prepared.json), [notification URLs](apple-notification-config.json), [read-only preflight](preflight.json).

## Delivery and release limits

**FAIL deployed sandbox delivery:** Apple's test delivery reported `UNSUCCESSFUL_HTTP_RESPONSE_CODE`; the new sandbox route and Apple verification variables are not deployed. Local validation is not public webhook delivery evidence.

**PARTIAL production API access:** the production test request returned HTTP401 with the supplied IAP key, while sandbox succeeds. Apple staff state that production API access is unavailable before a production release. This is consistent with the unreleased app, not evidence that sandbox authentication failed. Production delivery must be verified at the appropriate release stage; do not rotate a working sandbox key just because production returns401. [Apple staff guidance](https://developer.apple.com/forums/thread/806452), [test notification API](https://developer.apple.com/documentation/appstoreserverapi/request-a-test-notification).

**NOT RUN:** real Creator renewal/refund notification reconciliation, native transport to deployed backend, and live settlement. Initial transaction-filtered sandbox notification history was empty; no renewal/refund is inferred from the TEST event. Existing local fixtures and Stripe sandbox lifecycle evidence remain separate.

**PARTIAL Apple review:** final purchasable-screen screenshots, review account/instructions, product approval and enabled release candidate are incomplete. Build35 still has purchases disabled. Before review, explicitly qualify how sandbox App Review transactions reach the deployed backend and how the reviewer sees the corresponding test balance; the current production-only purchase verifier must not be assumed to handle them. Do not grant sandbox receipts into live credit balances.

**FAIL configured cost-cap compatibility / NOT RUN attributable economics:** current qualification ceiling remains USD0.92/song against USD0.07/0.14 budgets. The catalog, target margin and guards were not weakened. This is still a blocker to paid generation activation.

Publication and live-charge activation remain held by the current root AGENTS.md. Research/scoring deferrals and owner music acceptance are unchanged.

## Reproduction

From `apps/site`, use Node22, an already-built `.next-qualification`, a disposable loopback PostgreSQL server, and the private files retained on this Mac:

```sh
JAMLOOM_TEST_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/postgres \
node --import tsx scripts/qualify-apple-receipts.ts \
  --account-token ACCOUNT_UUID \
  --receipt PRIVATE_TOPUP_JWS --receipt PRIVATE_CREATOR_JWS \
  --receipt PRIVATE_RESTORED_JWS --http \
  --notification PRIVATE_APPLE_TEST_RESPONSE_JSON
```

The helper verifies actual Apple signatures, creates/drops its own database, starts/stops only its own loopback HTTP server, and logs hashes/results instead of signed receipts. It does not contact payment APIs to create purchases or enable sales. Device proofs are retained privately under `build-payment-closure-20261031/`. The native restore extension adds Creator to the existing explicitly opted-in physical sandbox test; normal test runs do not initiate purchases.
