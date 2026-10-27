# Completion follow-up — 2026-10-26

**PARTIAL overall; publication remains HELD by the owner.** This pass closes more implementation and provider-test gaps. It does not enable live sales, rent GPUs, upload an app, submit review or deploy the website.

## Completed and verified

- Singing Academy remains **$39 USD once**. The existing Stripe integration now passes a real test-mode purchase, decline, signed webhook, duplicate delivery, wrong-owner denial, refund, repurchase, refund-before-delayed-grant, and both won/lost disputes. Paid lesson HTML and scores/lyrics follow the verified course entitlement. The test product and price are archived after use; no funds move. See [provider evidence](evidence/completion-followup-20261026/stripe-final/provider.json).
- The public browser bundle no longer includes all song scores/lyrics. The course catalogue sends only listing metadata, and lesson content uses a private, uncached authenticated endpoint. First Light and all twelve warm-ups form the free subset when paid access is enabled. With sales held, the existing eight-song free preview stays available. The standalone/native package still contains its local content; this is access control, not DRM or a promise to recall previously downloaded preview material.
- Apple non-consumable course receipts use `com.jamloom.singing.complete`, with independent JWS verification, exact app/environment/account/product/quantity/USD price validation and an original-transaction identity. Restore is idempotent, never grants generation credits or DJ Academy access, and cannot override a refund. Refund-before-delivery and wrong-account cases pass isolated database checks.
- Native Singing has a Course panel, purchase/restore integration and a navigation gate driven by the shared free-lesson IDs. Sales flags remain false on web and phone. Local StoreKit tests cover real test transactions, account binding, finish-after-acknowledgment, credit/course separation and restored non-consumable entitlements. These are **not** real Apple sandbox-to-server qualification.
- Account deletion passes against **real disposable R2 objects** and a temporary local database. The deleted keys return NoSuchKey; another test account's object remains readable; all test objects are cleaned up afterward. No customer account or audio was deleted.
- A **1,000-track / 2,000-file** account cleanup deliberately fails after 500 removals, retains the recovery rows, then completes through the actual operator command. Unrelated files remain intact. This closes the tested large-account operator recovery gap.

## Remaining external evidence and release conditions

| Scope | Current boundary |
|---|---|
| Website and phone release | Intentionally not deployed, uploaded or submitted. New server access/receipt endpoints must be released with the compatible app before sales activation. |
| Apple real purchases | Read-only API recheck confirms draft 0.10.2 remains PREPARE_FOR_SUBMISSION; three credit products remain MISSING_METADATA and no Singing product exists. Complete the prepared product/reviewer setup and real sandbox receipt/notification chain before enabling sales. Local StoreKit success does not close this. |
| Physical phone | Build 26 is installed and launched on iPhone 14 Pro. Physical Debug checks pass for Singing demo/course panel/tab cleanup and Community player controls. The uninterrupted language/favorites filter retry also passes. [Device evidence](evidence/phone-reconnected-20261026/device.json); fixture songs do not prove live catalogue delivery. |
| Singing analysis | The exact current-source rerun covers 40 recordings/29 singers: 86.76% of reference voiced frames match within 50 cents including misses, 87.87% voiced recall and 97.26% voiced precision. [Measured report](evidence/completion-followup-20261026/pitch-benchmark.json). This previously inspected corpus is not an independent holdout for the quiet-input change or evidence of universal live accuracy. The owner's instructed capture confirms quiet rejection and pitched singing. Physical microphone-to-display latency and broader rooms/devices remain unmeasured. |
| AI DJ | Preserve the accepted bounded twenty-track/two-listener qualification and owner listening approval. Reliable brief singing, fresh independent stems and sustained customer-scale operation remain separate quality/capacity work. No unused paid permit exists; this pass starts no rental. |
| Improvise / Music DNA / Local Remixes | Accepted flows and examples remain; broader styles, languages, voices and maximum-library hosted musical quality are not established by new billing/storage checks. |
| Popular songs | No supplier permission or backing/lyrics/score assets have been provided in this session. No popular recording, lyric or score is added. The original-song course is independent of that catalogue. |

## Reproduction and limitations

Use Node 22 and the existing scripts. `tests/academy-provider.mjs` supports `JAMLOOM_TEST_COURSE=singing-complete`, requires a test Stripe key and a disposable loopback database, and archives its qualification product/price. It reuses the existing DJ course **test** tax classification; production tax classification remains a launch configuration review.

`tests/account-purge.test.ts` uses controlled memory storage by default. Its explicitly selected R2 mode requires `JAMLOOM_PURGE_R2_TEST_BUCKET` to equal the configured bucket, creates unique keys, and refuses to remove anything outside its own manifest. `tests/account-purge-scale.test.ts` uses a disposable directory/database and invokes the same operator CLI used for real recovery.

Earlier failed harness runs are retained. The initial Stripe product lacked a tax code; a later run's address suggestions prevented a test submission. The initial simulator did not provide StoreKit test entitlements; the configured simulator and bounded transaction-delivery wait pass. The first course browser run caught a missing local progress-key import after the module split; it was corrected before the final candidate.

No claim is made about live revenue, Apple review approval, physical latency, unlimited DJ capacity or newly improved musical quality from this work.

## Current local preview and verification

Both http://localhost:3000 and http://127.0.0.1:3008 serve the latest built candidate using an isolated local preview database and local email/audio paths. Production accounts and data are not changed. The old preview process was refreshed because it did not contain the new protected-content endpoint.

The current regression includes 160 site checks, 10 isolated course/Apple/deletion checks, 16 shared Singing checks, four simulator checks, eighteen routes in Chromium/WebKit at 1440/390/320px, real Stripe test-mode lifecycle checks and disposable R2 cleanup. [Validation manifest](evidence/completion-followup-20261026/validation.json). The final song-course browser run also checks that saving a free lesson preserves existing paid-song progress when the server returns only free content.

The free-lesson IDs are generated from the shared course for native packaging; the web progress parser retains all known lesson IDs independently of access. Both avoid silently losing progress after a refund or temporary loss of access.

The Apple implementation follows the installed server library and Apple's [current entitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements) and [signed transaction payload](https://apple.github.io/app-store-server-library-node/interfaces/JWSTransactionDecodedPayload.html) contracts. Stripe test catalogue preparation uses [one-time prices in cents](https://docs.stripe.com/api/prices/create). Context7 was unavailable; installed SDK sources and official documentation were used instead. Browser runtime invocation was unavailable because this session exposed no Node REPL tool, so the existing Playwright qualification suites supplied rendered evidence.

The final IPA is `build-ios-store/export-0.10.2-26-final/Jamloom.ipa`. Its exported signature and bundled resources were independently checked after extraction. Only this turn's superseded, never-installed build-26 intermediate archive/export were removed; final build 26 and historical builds 24/25 remain. No source, credential, recording or model was deleted.

## Reconnected iPhone follow-up

The exact prepared development-signed Release archive was installed and launched without test arguments. No new release binary was needed. Targeted UI tests now scope tab queries to the tab bar and tap measured visible bounds when accessibility supplies an invalid hit point; failures retain an app screenshot and hierarchy. The failed attempts are preserved locally in the referenced result bundles. The final uninterrupted language-filter check passes for Turkish, English, all languages, favorite filtering and Clear filters. Release build 26 was restored and launched afterward. This closes the targeted physical UI checks; it does not establish real Apple purchases, live catalogue delivery or physical microphone latency.
