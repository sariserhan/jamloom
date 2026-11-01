# Release follow-through — 2026-10-31

**PARTIAL.** The owner authorized staged deployment/activation after gates pass. Public Apple callback delivery is now verified; customer sales remain disabled because generation economics and native review qualification are incomplete. Earlier blanket release holds are superseded only within this authorized scope.

## Completed

- **PASS deployment:** reviewed commit `3f6124e1` built on Vercel with Node 22 and was promoted to `www.jamloom.com`. Deployment `dpl_7QhctYELzkAz5E5HW2xDDzYr4TaT`. Previous production `dpl_A8D5QQFLEmMPb6xdLcuCQqVWETnT` is retained for rollback. No private environment files were uploaded with the source.
- **PASS real provider delivery:** Apple reports `SUCCESS` for a fresh Sandbox TEST notification to the public sandbox route. Signed sandbox events are rejected by the production route; invalid bodies are rejected. [Receipt](apple-test-delivery.json).
- **PASS local reviewer payment isolation:** operator-selected authenticated accounts can verify actual Sandbox receipts and see only their test wallet. Ordinary accounts retain production verification/live balances; reviewer accounts cannot initiate Stripe checkout. Actual receipt/Restore duplicates produce exactly two grants/450 credits. [HTTP evidence](review-http-verification.jsonl). The mode is disabled by default and expires; this payment context is deployed, but it is not a complete App Review generation flow.
- **PASS corrected physical refund submission:** the original attempt could not find a finished consumable, explaining why no sheet appeared. Including consumable history fixed that lookup; the exact signed development build passed the one-device refund request test with zero skips. Submission is not approval. Signed REFUND delivery and independent reconciliation now pass; DID_RENEW is still pending. [Independent signature/ledger evidence](apple-lifecycle.jsonl).
- **PASS local checks:** 188 site tests, typecheck, production qualification build and bundle audit. The native refund-history build/test passes. Failed first attempts are retained privately.

## Work in progress

- Stripe's matching prepared secret is now saved in Vercel. The matching-secret deployment passed staging checks and promotion. A real Stripe `product.updated` event was independently received/verified and recorded; invalid signatures were rejected, with zero live credit grants/charges. The endpoint is disabled again, with its original event list and product metadata restored. [Delivery receipt](stripe-delivery.json). [Exact plan](stripe-delivery-plan.json).
- The owner approved the [L4 cost diagnostic](cost-diagnostic-plan.json): three private requests in two sequential stages, one GPU, $3/stage and $6 total, 40 minutes/stage plus shutdown, no repeated requests, stop on failure. Both dry runs pass. The request budgets are candidates only; cold initialization, idle, failed work and storage/operations must be attributed separately before any economic qualification.
- The hosted harness now checks fixed 10/20-credit settlement and full failure refunds, replacing an obsolete variable-price expectation. Candidate settings live only in diagnostic scripts; customer cost guards and prices are unchanged.

## Remaining release gates

1. Measured and enforceable costs within the catalog budgets, including AI DJ economics. The owner-closed endurance/music-study requirements are not reopened.
2. Finish deployed Stripe verification; final live settlement/tax checks and sale activation after economics passes.
3. Receive and independently reconcile the actual Apple renewal event. Native-to-deployed Creator/Singing receipts, Singing Restore and actual REFUND delivery/reconciliation now pass.
4. Complete the funded App Review generation context, actual purchase-screen screenshots, metadata/reviewer instructions and purchase-enabled native candidate, then upload/review. The current disabled-purchase IPA is not the final release.
5. Apple/provider approval and any owner-only legal/tax/sign-in interactions cannot be replaced by automated tests.

Private artifacts remain under `build-release-closure-20261031/` and `build-payment-closure-20261031/`, excluded from Git. Raw JWS, account tokens, device receipts and credentials are never committed. Provider readbacks do not prove final settlement or tax compliance.

Documentation checked: [Apple consumable history](https://developer.apple.com/documentation/bundleresources/information-property-list/skincludeconsumableinapppurchasehistory), [Apple refund testing](https://developer.apple.com/documentation/storekit/testing-refund-requests), [Runpod pricing](https://www.runpod.io/pricing), [billable worker lifecycle](https://docs.runpod.io/serverless/pricing), [Stripe webhook delivery](https://docs.stripe.com/webhooks), [endpoint configuration](https://docs.stripe.com/api/webhook_endpoints/update).

## Native deployed follow-through

The reviewer account configuration was deployed in `dpl_F5b4g9j1mwjP6qVw9SRCiVKNJqsX` from `86034e2d`, with a dedicated private account and three-hour expiry. Authenticated staging checks pass: test balance zero, review mode true, new purchases false. No email was sent and no live credit was granted. The account is retained temporarily for signed renewal/refund reconciliation.

The first physical native HTTP check **FAIL** exposed the launch proxy blocking `/api/payments/apple` after successful authentication. The exact receipt endpoint now bypasses preview/maintenance gating and retains its own authentication, origin, signature/account binding and purchase-release checks. Checkout/subscription paths remain gated. A new regression fails before the fix and passes afterward. Sandbox course access is also isolated for the allowlisted reviewer; ordinary accounts and expired review configuration cannot use it. 188 site tests, two database-backed course checks and the updated production qualification build pass. **PASS corrected Creator native deployed verification:** the signed iPhone test uses the normal AccountModel sign-in and receipt delivery path against the public server; duplicate delivery yields exactly one Sandbox grant of 300 credits and zero live grants. [Independent database readback](native-creator-ledger.json). Deployment `dpl_CPjpyfUg692GdbxePSxAjXYWY3aR` contains the fix.

**PASS public UI/image check:** Chrome at 1440px and 390px: meaningful homepage, no page errors or horizontal overflow, all eight WebP previews decode, and the Privacy link opens its intended page. [Results](public-browser.json). Screenshots are `/tmp/jamloom-public-qa-20261031/home-1440.png` and `home-390.png`; mobile first viewport was visually inspected. Browser plugin invocation was unavailable because the required execution tool is absent, so the existing Playwright/installed Chrome fallback was used. The first scripted check expected the brand in the title; it was corrected to the actual declared homepage title before rerunning. No frontend behavior was changed by this check.

## Singing native deployed receipt

**PASS:** the existing Apple Sandbox nonconsumable belongs to an earlier sandbox account token. The first attempted delivery correctly failed its account-binding check. Independent Apple signature verification and a read-only production lookup found no linked production account. A separate temporary test account now preserves the original token; no purchase or transfer of ownership was needed. The exact development-signed iPhone test passes normal sign-in, course receipt delivery, duplicate delivery, course access and sign-out against the deployed server. Independent database readback confirms one Sandbox course purchase, zero credit grants and zero live charges. [Evidence](native-singing-ledger.json). Both reviewer accounts retain the original three-hour expiry.

**PASS Singing Restore:** the physical iPhone restored the original course transaction. Its Apple signature was independently verified, its original account/token preserved, and two deployed deliveries retained one entitlement. [Restore proof](native-singing-restore.json).

**PASS actual Apple refund:** Apple approved the earlier top-up refund and delivered its signed REFUND notification to the public Sandbox callback. Independent verification/replay in a disposable ledger removes the 150 refunded credits, preserving the separate 300-credit subscription grant and zero live balance. The deployed server records one refund hold, accepts duplicate notification delivery, and rejects the old pre-refund purchase receipt. [Public delivery/hold checks](apple-refund-delivery.json). No consumption data was submitted. [Read-only signed subscription status](apple-lifecycle-status.json) shows automatic renewal enabled and the next renewal due at 2026-11-01 04:00:04 UTC.
