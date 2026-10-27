# Completion follow-through — 2026-10-27

**PASS scoped preparation and real sandbox purchase delivery; PARTIAL overall release readiness.** The owner requested all remaining work, retaining the hold on deployment and live sales. This pass changes reviewed database schema under standing migration authorization, creates one inactive Stripe course product/price, and performs explicitly authorized Apple sandbox tests. It makes no public release, live purchase or new GPU rental.

## Database — PASS

Applied `0031_singing_price.sql` and `0032_account_deletion.sql` to the previously authorized direct Neon target. All **32** applied hashes match, with no missing, changed or unknown migration. Production remains in test billing mode. [Readback](evidence/completion-followthrough-20261027/release-preflight.json).

Before applying, created a private full custom-format backup, restored its data to an isolated PostgreSQL 18 instance on a private Unix socket, applied both migrations there, and verified repeat application does nothing. Purchase, credit-lot, wallet-ledger and track counts/checksums match before and after. The temporary database and successful local cluster were removed. Restore excludes original role/ACL reconstruction; this is not a complete disaster-recovery certification. [Execution](evidence/completion-followthrough-20261027/migrations.json), [guarded runner](evidence/completion-followthrough-20261027/apply-reviewed-migrations.mjs).

Earlier local rehearsals stopped before production mutation: PostgreSQL 16 could not restore the PostgreSQL 18 dump; the first private socket path exceeded macOS's length limit; and differing server time zones changed timestamp serialization in row checksums. The final comparison explicitly fixes UTC and C collation. Private backups and diagnostic logs remain outside Git; do not delete them as generic build caches. Latest backup: `build-release-followthrough-20261027-pg18-verified/before-0031-0032.dump` (0600).

## iPhone — PASS scoped build and physical flows

**0.10.2 build 29** is archived, signed, audited and exported locally. It includes the shared per-note singing advice. Three physical tests pass: Community playback, Community language/Favorites, and Singing demonstration/tab cleanup. These checks do not establish singing accuracy, hardware latency or the private owner's authenticated rating acceptance. [Bundle audit](evidence/completion-followthrough-20261027/ios-bundle.json), [validation](evidence/completion-followthrough-20261027/ios-validation.json).

The final **0.10.2 build 30** additionally corrects stale privacy copy to say cloud songs are public unless private saving is selected; local recordings remain local. It is archived, signed, audited, exported, installed and launched preserving app data. The three functional physical checks were run on build 29, not repeated for this text-only increment. [Final bundle audit](evidence/completion-followthrough-20261027/ios-bundle30.json).

Final archive: `build-ios-store/Jamloom-0.10.2-30.xcarchive`; exported IPA: `build-ios-store/export-0.10.2-30/Jamloom.ipa`. Build-29 artifacts remain as historical evidence. No Apple upload/submission. Physical iPad remains excluded at the owner's request.

## Apple purchases — real sandbox delivery PASS

The test previously required `AppTransaction.refresh()` before starting a purchase. That checks the app-download transaction and can prompt for authentication; it does not establish the environment of an in-app purchase. The revised opt-in test requires an exact test-host hash from a verified development-signed build, then verifies the actual purchase is Sandbox, matches the product and account, and has the expected USD price. [Apple sandbox documentation](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox), [app transaction refresh](https://developer.apple.com/documentation/storekit/apptransaction/refresh/). The installed SDK and app payment architecture are preserved.

Actual physical purchases of **10 credits at $9.99** and **Singing Academy at $39** passed. Unchanged private receipts independently passed Apple's certificate/signature and online checks in the existing server verifier. A disposable local ledger rejects the wrong account and grants once despite replay. The credits transaction was acknowledged only after server verification. The course then passed the actual `AppStore.sync()`/`CreditPurchases.restoreCourse` path on the phone; its restored signed receipt verified again and retained exactly one course grant. [Restore evidence](evidence/completion-followthrough-20261027/apple-restore.json). [Credits](evidence/completion-followthrough-20261027/apple-starter.json), [course](evidence/completion-followthrough-20261027/apple-course.json).

The same receipts also pass the actual authenticated local website endpoint. Missing session, wrong origin, wrong account and forged receipt fail; duplicate delivery leaves exactly one credit lot and one course purchase. This uses a Node HTTP client, not the phone's native HTTP transport. [HTTP evidence](evidence/completion-followthrough-20261027/apple-http.json), [reproducible harness](../apps/site/tests/apple-sandbox-http.mjs). Raw JWS, credential fixtures and xcresults remain private. The disposable sandbox database and temporary HTTP server were removed after verification. [Cleanup](evidence/completion-followthrough-20261027/sandbox-cleanup.json). Course Restore also passed again after the owner reset their sandbox password; no new purchase was needed.

Real provider refund notification, deployed receipt delivery and Apple review readiness remain open. Three credit products still report MISSING_METADATA; the Singing draft remains READY_TO_SUBMIT. The selected older Apple build is unchanged. [Read-only inventory](evidence/completion-followthrough-20261027/apple-products.json).

## Stripe — inactive Singing preparation PASS; activation HELD

Read-only account inventory found that the DJ Academy live product and webhook already exist; they are not recreated. The local environment lacks their complete configuration. The existing live keys were verified against the Jamloom Stripe account.

Created **one inactive Singing Academy product and one inactive USD39 one-time price**, retaining the existing course tax classification. No customer, checkout, payment or subscription was created. Existing products/webhooks are unchanged. [Exact IDs and state](evidence/completion-followthrough-20261027/stripe-singing-preparation.json). Inactive products/prices cannot be used for new purchases under Stripe's [product](https://docs.stripe.com/api/products/create) and [price](https://docs.stripe.com/api/prices/create) configuration.

The prepared product/price IDs are saved in the private local environment. The Singing webhook and deployed environment remain unconfigured while publication is held. At a later authorized release, configure the existing `/api/academy/stripe?mode=live&course=singing-complete` handler with a separate signing secret and the prepared IDs; verify event delivery before activation. Keep the existing application release flags false until the relevant release gates pass. A configured or inactive price is not payment acceptance evidence.

## Musical and external gates still open

The owner heard no benefit from the retained eight-beat overlap candidate; it remains unadopted. In the retained twenty-track batch, **14 of 18** handoffs lack a valid grid on one or both tracks and use conservative fades; four use measured beat/bass handoffs. [Diagnosis](evidence/completion-followthrough-20261027/dj-continuity-diagnosis.json). This supports testing beat/arrangement compatibility before another fade-only experiment; it does not prove detector accuracy or perceptual causation.

Fresh short singing, reliably cohesive original DJ material, broader Improvise/Local Remix/Music DNA style-language quality, hosted jazz and 5,000-favorite qualification, and sustained capacity/cost remain substantive open work. Previous paid permits are consumed; no new spending was inferred. Broader live singing accuracy/physical latency, independent listeners and Tency's popular-song permissions/assets remain unavailable. Do not label these finished from build or service tests.
