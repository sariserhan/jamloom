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

`JAMLOOM_CREDIT_COST_QUALIFICATION` remains empty, public generation and native purchase release flags remain false, and live purchase switches remain off. The live trial pool is zero until an explicit promotional budget is set; the isolated test pool is 1,000 accounts. A verified email is required, with authentication rate limits and an atomic global claim cap.

Remaining activation work:

1. **NOT RUN:** measured attributable cost qualification for this exact catalog, supported currencies and worker versions. Record actual invoices/costs, failure distribution and enforceable per-job caps, then review the qualification version and funded trial cap.
2. **PARTIAL:** Stripe sandbox Creator catalog/portal and real renewal/refund lifecycle pass. Create/review corresponding live catalog and end-of-period cancellation portal; configure signed production event delivery, validate tax/category/settlement and reconciliation, then explicitly authorize activation. Existing live endpoints are unchanged and credit sales remain held.
3. **NOT RUN:** create the two new App Store Connect products, complete metadata/territories/prices and obtain approval. Qualify their actual sandbox transactions, renewal, refund and account sync on a physical iPhone. Local StoreKit fixtures do not prove these provider/device gates. This session has no configured App Store Connect administration tool or credentials for these new records.
4. **NOT RUN:** deploy the website and submit/release the mobile build after approval. No production charge, public deployment, app submission or GPU rental occurred in this increment.

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
