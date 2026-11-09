# Authorized credit repricing — 2026-11-08

**PASS implementation and scoped checks; PARTIAL release.** The owner approved $35/month for 300 credits and $20 for 150-credit top-ups while retaining the 65% margin target. Paid credits remain nonexpiring; Improvise costs 10 credits, Music DNA 20 and DJ 2/generated minute. No public commercial activation or new GPU work is part of this increment.

## Catalog and payment compatibility — PASS

Catalog `2026-11-08-v3` publishes the approved amounts. Explicit immutable v2 receipt definitions preserve original $15/$10 prices, credits and proceeds. Stripe renewals validate the matching catalog and configured historical price ID; Apple accepts only exact independently signed current or historical USD amounts. Older low-net credit lots retain their original spend limits. Stale catalog qualification cannot enable current sales. Old pending Creator checkouts are expired before a new-price offer is returned.

The existing Stripe Creator products, portal and webhook are reused. [Test price preparation](stripe-test-prepared.json) creates an active $35 test price; [live price preparation](stripe-live-prepared.json) creates an **inactive** $35 live price. Neither modifies existing subscriptions, old prices, webhooks, the default environment or sales flags. Top-ups use version-bound inline Checkout amounts. Provider-side price preparation is not commercial activation.

Build 39 filtered StoreKit products against hardcoded $15/$10 values. Build 40 validates each StoreKit price against the authenticated server catalog, known product and unchanged credit count; missing or inconsistent catalogs fail closed. It works with both v2 and v3 backend offers. Native fixtures and price checks use $35/$20.

## Economics — PASS planning scenarios; PARTIAL qualification

[Reproducible calculation](calculate-pricing.mts) and [18 scenarios](pricing-scenarios.json) retain prior support, infrastructure, storage and provider estimates and the conservative 40% retained-proceeds assumption. That is not an asserted Apple commission. The net floor is 46,666 microdollars/credit. At 65%, attributable-cost caps are $0.163331 per Improvise, $0.326662 per DNA and $0.032666 per generated DJ minute.

At 30,000 redeemed credits/month and five-year storage planning: Improvise planning cost $0.155071 gives 66.77% margin; DJ $0.026401/min gives 71.71%. The staging worker now has a posted $0.065970 charge including its billed runtime ([receipt](capacity-retest-20261108-provider-billing.json)); this replaces the execution-plus-idle estimate without double counting. Broader failed/review cohorts and final billing remain incomplete and can reduce the $0.008260 headroom. DNA overhead alone is $0.185301, leaving $0.141361 for its still-unqualified provider cohort. No optimization savings are assumed. Full attributable billing, actual demand and storage beyond the forecast remain unresolved; none of these estimates qualifies commercial activation.

## Verification — PASS

- [227 website tests](site-tests-final.log), [102 isolated database/payment checks](database-tests.log), [TypeScript](typecheck-final.log), [production build](site-build.log) and [bundle audit](bundle-audit.log).
- [Real Stripe test-mode lifecycle](creator-provider.log): $35 initial subscription/renewal, duplicate-event handling, cancellation preserving credits and refund reconciliation. Own test clock/customer/database removed; zero live charges or GPU calls.
- [Chromium and WebKit](browser-report.json): authenticated real local HTTP at 1280px and 390px, exact $35/$20 displays, server account catalog and actual Stripe test Checkout amounts. Hosted checkout navigation is intercepted; this does not claim a real card payment or hosted Stripe UI test. Own test sessions expired, test customers and temporary PostgreSQL removed. [Phone screenshot](browser-chromium-390.png), [desktop](browser-webkit-1280.png).
- [Simulator account checks](account-simulator-summary.json): 24 pass, two optional local HTTP tests skipped. [Three StoreKit tests](storekit-simulator-summary.json) pass at the new fixture prices, including recovery/renewal/Restore.
- Signed 0.11.0 build 40 archived, exported and [uploaded successfully](ios-upload.log). Physical-device verification, Apple processing/review replacement and coordinated review-backend/catalog transition are still pending at this checkpoint.

Browser harness setup initially lacked the matching browser binaries and a local-only webhook secret. A response-body read also raced navigation; capturing the real API response before fulfilling it fixed the harness. Final checks above passed; none of these harness failures changed product code or caused a real charge.

## Release state — PARTIAL

The existing build-39 submission remains WAITING_FOR_REVIEW with MANUAL release while build 40 is prepared. Apple price points for exact USA $35/$20 exist, but prices have not yet been changed. The current reviewer backend remains unchanged at this checkpoint. Only the existing two review accounts retain their bounded access; the $7.50/seven-day permit is not expanded or reused for optimization. [Fresh provider/guardian readback](review-phase-20261108-final-readback.json) confirms workers 0/0, no jobs, no held test credits, active guardian and unchanged $6/eight-cycle remainder. [Five reviewer worker IDs still have unposted charges](review-phase-20261108-provider-billing.json). Public customer sales/generation/trials stay disabled until all commercial gates pass. No Git push.

Stripe price migration follows [Stripe's immutable-price guidance](https://docs.stripe.com/products-prices/manage-prices). Apple transition uses [subscription pricing](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions/), [scheduled IAP price changes](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-inapppurchasepriceschedules) and [review replacement rules](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/remove-a-submission-from-review/). Context7 tools were unavailable; official provider documentation was consulted directly.
