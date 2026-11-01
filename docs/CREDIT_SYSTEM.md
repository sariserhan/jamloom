# Credits — current implementation, 2026-10-31

The owner approved implementation across web and phone and selected **nonexpiring paid credits everywhere**. Implementation and scoped sandbox checks are complete; live activation remains **PARTIAL** pending the explicit gates below. This supersedes older prepaid-only proposals and the one-month rollover suggestion.

| Offer | USD before applicable tax | Credits |
|---|---:|---:|
| Free studio plus one-time verified-account trial | Free, subject to trial capacity | 20 |
| Creator | $15/month | 300 per successful monthly payment |
| Top-up, no subscription needed | $10 once | 150 |

All paid credits, including subscription grants, remain after cancellation. No automatic top-ups, unlimited plan, annual plan or Studio tier is offered. Existing Pro and Academy entitlements are separate. Credits are internal usage units, not cash or tokens traded outside Jamloom.

| Successful creation | Published credits | Supported duration |
|---|---:|---|
| Improvise arrangement | 10 | 30–45 seconds |
| Music DNA song | 20 | 100–140 seconds |
| AI DJ generated minute | 2 | Explicit session limit, 1–120 generated minutes |

Private is the default and costs the same as public. Quality does not depend on plan or payment channel. Existing-result playback/download costs nothing. Technical failure or cancellation returns all held credits; actual incurred provider cost remains recorded. Completed portions of DJ sessions remain charged; crossfades make playback shorter than generated minutes. The chosen minute limit and maximum session credits appear before starting.

## Accounting and recovery

One server ledger is shared by the website, mobile website and native iPhone app. Purchases are account-bound and test/live balances are isolated. Stripe Checkout success redirects cannot grant credits by themselves: the server rereads the paid invoice, payment, captured charge, fees, tax, exact catalog and customer binding. Monthly grants are unique by both receipt and subscription period. Cancellation stops future renewal and preserves unused paid credits. Refund/dispute handling removes affected available credits and freezes the wallet for reconciliation; it does not silently mint replacements.

Apple uses a consumable `com.jamloom.credits.topup150` and auto-renewable `com.jamloom.creator.monthly`. StoreKit supplies localized price display; the initial verifier supports USD at $10/$15 only and other currencies are not offered. Independent JWS verification checks account, product, bundle, environment and period. Transactions finish only after server acknowledgement. Restore and unfinished transaction recovery are supported; notifications grant successful renewals and reconcile cancellation/revocation. Apple course purchases remain separate. No external web checkout is introduced in the native app.

Legacy receipts remain verifiable. Available old credits convert once at **15:1** after old active reservations finish. Historical ledger entries remain immutable. Unspent legacy DJ allowance returns as new credits, rounded up in the customer's favor. Migration 0033 is additive; its default unit version remains 1 for compatibility with old code. New grants explicitly use version 2. The reviewed migration was applied to the verified Neon production target after a private full backup; all 33 migration hashes and a second no-op migration pass match. This does not deploy the new application.

## Economics and release gates

Catalog version: `2026-10-31-v2`. The conservative supported-channel planning floor is **$0.02 net per credit**, with a **65% contribution-margin target**. Live generation must satisfy both the catalog cap and the actual allocated purchase-lot proceeds; a low-net purchase cannot bypass the budget guard. At that floor, the maximum attributable cost is $0.07 per Improvise, $0.14 per Music DNA song and $0.014 per DJ generated minute.

These are **allowable budgets, not measured production costs or a claim that current workers meet them**. Qualification must include startup/idle allocation, generation, failed work, storage/operations, support, tax and provider fees. If measured reliable caps exceed these budgets, optimize the service or review the catalog with the owner before activation. Do not silently charge a different number of credits. A paid request fails closed when its cap exceeds budget.

`JAMLOOM_CREDIT_COST_QUALIFICATION` does not select the qualified catalog, ordinary public generation and live purchases remain closed, and only the existing temporary Apple review accounts have the sandbox purchase exception. The live trial pool is zero until an explicit promotional budget is set; the isolated test pool is 1,000 accounts. A verified email is required, with authentication rate limits and an atomic global claim cap.

Remaining activation work ([current evidence](evidence/style-guidance-20261101/report.md), [ordered handoff](LAUNCH_ACTIVATION.md)):

1. **PASS cap compatibility; FAIL cold-start delivery; PARTIAL operating qualification:** the production L4 profile caps Improvise at $0.0684 and Music DNA at $0.1388, within the catalog budgets. The older $0.92 diagnostic profile is not production. Deployed Improvise passed; the repaired-image Music DNA request expired in queue while L4 capacity was throttled and returned all twenty test credits. Capacity-aware admission is deployed; the readiness-first check stopped before submission, with unchanged balances and independent cleanup. The approved resumption submitted once after transient readiness, then expired in queue without execution. Full 20-credit release, unchanged live wallet, independent cleanup and held restoration pass; the original aggregate $3 permit is consumed. Hosted readiness, full cost allocation and separate AI DJ operating capacity remain open; the owner-closed endurance/music studies stay closed.
2. **PARTIAL live activation:** Stripe account/tax setup and deployed signed delivery are verified in the release evidence. Creator product/price and the new credit webhook remain inactive/disabled; no real charge was collected. Activate the existing objects only after economic gates pass.
3. **PASS scoped Apple preparation; PARTIAL review/release:** real iPhone purchases/Restore, signed refund and renewal reconciliation, test/live isolation and duplicate handling pass. Creator, top-up and Singing metadata/screenshots are ready; all five app/product/group items are in the unsubmitted review draft. Native 0.11.0 (38), including language filters, style notes and capacity-aware admission, is VALID and selected for manual release. Finite App Review GPU funding, final submission, Apple approval and public availability remain separate open steps.
4. **PASS held website deployment; NOT RUN customer activation:** language filters, style guidance and disabled-generation availability are deployed under held settings. Customer generation/sales stay closed. A successful diagnostic alone does not authorize unbounded ongoing GPU spending or prove complete operating economics.

## Validation and reproduction

See [evidence report](evidence/credit-system-20261031/report.md). From `apps/site`, using Node 22:

```sh
npm test
npx tsc --noEmit
JAMLOOM_TEST_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/postgres npm run test:credit-catalog
npm run credits:prepare                 # test catalog dry run
npm run credits:prepare -- --apply-test # explicit sandbox setup, never live
JAMLOOM_TEST_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/postgres npm run test:creator-provider
```

The database suites create/drop isolated loopback databases. The provider test creates a Stripe test clock/customer, pays only with test payment methods, advances renewal, checks duplicates/cancellation/refund and deletes the clock. It exercises authoritative provider reconciliation, not public webhook network delivery.

Current official policy/API references: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [Stripe invoice object](https://docs.stripe.com/api/invoices/object). Context7 was unavailable in this session; official documentation was used directly.
