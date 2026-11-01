# Release follow-through — 2026-10-31

**PARTIAL; full paid release is not ready.** Native Creator/Singing receipt delivery, Singing Restore and an actual signed Apple refund now pass against the deployed server. The approved three-request cost diagnostic completed: Improvise and English Metal passed; German Jazz failed lyric planning. Both GPU stages are independently cleaned up. A targeted planner repair passes local and isolated checks; its publication and a new hosted request need a fresh bounded permit. Prices and customer sales remain unchanged.

## Deployed payments and mobile

- **PASS public deployment:** current `dpl_3uXq2EYVHLtwXCAZ2DU8UbvcR6rR` from `6a228d34` serves `www.jamloom.com`. It includes the receipt-route fix and two isolated reviewer accounts with the original expiry `2026-11-01T06:23:09.313Z`. No private environment files were uploaded with source. Previous `dpl_CPjpyfUg692GdbxePSxAjXYWY3aR` and original `dpl_A8D5QQFLEmMPb6xdLcuCQqVWETnT` remain rollback references.
- **PASS Apple callback:** actual Sandbox TEST delivery succeeds; invalid signatures and sandbox events on the production verifier are rejected. [Provider receipt](apple-test-delivery.json).
- **PASS Creator native transport:** physical iPhone uses normal AccountModel sign-in and receipt delivery against the public server. Duplicate delivery produces one 300-credit Sandbox grant, zero reserved credits and zero live grants. [Independent database readback](native-creator-ledger.json).
- **PASS Singing native transport and Restore:** Apple returned an older, already-owned Sandbox course. Its original account token had no linked production account; a separate temporary qualification account preserves that identity. The first wrong-account delivery correctly failed. Normal native delivery, duplicate delivery, course access and sign-out pass; one course entitlement and zero credit grants result. Actual physical Restore and two deployed deliveries of the independently verified restored JWS also pass. No repurchase or ownership transfer. [Course receipt](native-singing-ledger.json), [Restore proof](native-singing-restore.json).
- **PASS actual refund:** Apple approved the earlier Sandbox top-up refund and delivered its signed REFUND to the public Sandbox callback. Independent signature/ledger replay removes 150 refunded credits while preserving the separate 300-credit subscription grant and zero live balance. The deployed server records one hold, accepts duplicate callbacks and rejects the old pre-refund receipt. [Public delivery and hold checks](apple-refund-delivery.json), [disposable-ledger replay](apple-lifecycle.jsonl). No consumption data was submitted.
- **PARTIAL renewal:** signed subscription status shows automatic renewal enabled and due at `2026-11-01T04:00:04Z`; a real DID_RENEW has not yet been received/qualified. [Status](apple-lifecycle-status.json).
- **PASS Stripe nonfinancial delivery:** a real signed `product.updated` event reached the prepared live webhook; independent database verification and invalid-signature rejection pass with zero live grants/charges. The webhook is disabled again with its original nine events; inactive product metadata was restored. This does not assert real live purchase settlement. [Evidence](stripe-delivery.json), [plan](stripe-delivery-plan.json).

The original native HTTP attempt exposed the preview proxy blocking `/api/payments/apple`. The corrected exact-route exception retains authentication, origin and signature/account binding; new checkout remains gated. Reviewer wallets and course access remain isolated from ordinary live accounts and expire. Failed attempts and raw receipts remain private.

## Approved L4 cost diagnostic

The [original $6 permit](cost-diagnostic-plan.json) is **CONSUMED**, with three requests and no repeats:

| Fixture | Result | GPU request execution | Request estimate | Test credits charged |
| --- | --- | ---: | ---: | ---: |
| 45-second Improvise | PASS | 134.126 s | $0.05190 | 10 |
| 140-second English Metal | PASS | 158.616 s | $0.05718 | 20 |
| 100-second German Jazz | FAIL before audio | 41.663 s | $0.02924 | 0; full release |

These are request estimates including a fixed allocation, **not full attributable provider bills**. Worker preparation took 510 and 419 seconds; image preparation is not interchangeable with billed initialization. The latest endpoint/pod-grouped billing query returned no rows, so billed cost is pending, not zero. [Results and limitations](cost-diagnostic-results.json).

**PASS independent cleanup:** limits 0/0, original GPU placement restored, no workers or queued/running jobs, disposable databases removed, and all six remote test objects confirmed absent. [Stage 1](cost-stage-1-cleanup.json), [stage 2](cost-stage-2-cleanup.json). Private raw reports were preserved with SHA-256 provenance; the tracked trial summaries omit transcript fragments and storage keys. Local outputs remain available.

## Lyric planner repair

The provider's static failure location is `writing-exit-1@music_dna_song.py:51`: a lyric-section line-count rejection. The exact private model draft was not retained, so the specific malformed section and model wording are unknown.

The repair identifies malformed arrays and asks only for those sections, preserving other lyrics and production choices. It never truncates lines, loosens validation, or increases the existing four planner attempts. A focused regression reproduces the failure class on the accepted base and passes after the repair; it also rejects unrequested section changes and verifies exhaustion still fails without a plan.

**PASS local:** 79 Python checks, 23 isolated worker/regression checks, six harness checks, typecheck and the single-request dry run. Initial generic Python runs lacked NumPy/soundfile; the existing singer runtime passes without dependency installation or model execution. [Validation](lyric-repair-validation.txt).

**NOT RUN hosted repair:** isolated source commit `e8d54bf39139ddf9fcc59c2df1b89b0ab33d2e03` changes one runtime file plus its focused tests on accepted base `68bf2b39`. [Concrete publication and one-request plan](lyric-repair-diagnostic-plan.json): one L4, one German Jazz request using the same seed, $3 maximum, 40 minutes plus shutdown, no repeated request, stop on failure. No new publication or compute has occurred under that pending plan.

## Release gates remaining

1. Qualify the corrected worker and measured, enforceable generation costs, including failure/startup/idle/storage/operating allocation and AI DJ economics. The owner-closed endurance/music-study requirements are not reopened. Existing customer cost configuration and prices are unchanged; diagnostic success alone cannot activate sales.
2. Receive/reconcile the actual Apple renewal. Refund, Creator/Singing native delivery and Singing Restore are now closed checks.
3. Complete the funded App Review generation context, actual purchase-screen screenshots, reviewer instructions/metadata and purchase-enabled native candidate, then upload/review. [Current ASC readback](apple-release-status.json) still shows `MISSING_METADATA`, no credit-product review screenshots and draft version 0.10.2. The disabled-purchase 0.11.0 (35) IPA is not the final release.
4. Finish provider settlement/tax/account review and staged sale activation once the economic gates pass. No actual customer charge was authorized or collected. Apple review/approval and any required owner-only legal/sign-in interaction remain external gates.

The owner authorized staged deployment/activation after gates pass. A fresh bounded permit remains required for new paid GPU work. Private artifacts stay in ignored `build-release-closure-20261031/` and `build-payment-closure-20261031/`; raw JWS, account tokens and credentials are not committed.

## Public UI and validation

**PASS:** 188 site tests, course-ledger checks, typecheck, production qualification build, bundle audit and Vercel Linux builds. Chrome at 1440px and 390px has no page errors or horizontal overflow, all eight WebP previews decode, and Privacy navigation works. [Browser results](public-browser.json). Screenshots are `/tmp/jamloom-public-qa-20261031/home-1440.png` and `home-390.png` and were visually inspected. The required browser execution tool was unavailable; existing Playwright/installed Chrome was used. These checks do not substitute for the pending paid-release UI.

References checked: [Apple consumable history](https://developer.apple.com/documentation/bundleresources/information-property-list/skincludeconsumableinapppurchasehistory), [refund testing](https://developer.apple.com/documentation/storekit/testing-refund-requests), [refund history](https://developer.apple.com/documentation/appstoreserverapi/get-refund-history), [subscription status](https://developer.apple.com/documentation/appstoreserverapi/get-all-subscription-statuses), [Runpod billing lifecycle](https://docs.runpod.io/serverless/pricing), [endpoint billing API](https://docs.runpod.io/api-reference/billing/GET/billing/endpoints), [Stripe webhooks](https://docs.stripe.com/webhooks).
