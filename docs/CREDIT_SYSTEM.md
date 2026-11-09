# Credits — current implementation, 2026-11-08

The owner approved implementation across web and phone and selected **nonexpiring paid credits everywhere**. Implementation and scoped sandbox checks are complete; live activation remains **PARTIAL** pending the explicit gates below. This supersedes older prepaid-only proposals and the one-month rollover suggestion.

| Offer | USD before applicable tax | Credits |
|---|---:|---:|
| Free studio plus one-time verified-account trial | Free, subject to trial capacity | 20 |
| Creator | $35/month | 300 per successful monthly payment |
| Top-up, no subscription needed | $20 once | 150 |

All paid credits, including subscription grants, remain after cancellation. No automatic top-ups, unlimited plan, annual plan or Studio tier is offered. Existing Pro and Academy entitlements are separate. Credits are internal usage units, not cash or tokens traded outside Jamloom.

| Successful creation | Published credits | Supported duration |
|---|---:|---|
| Improvise arrangement | 10 | 30–45 seconds |
| Music DNA song | 20 | 100–140 seconds |
| AI DJ generated minute | 2 | Explicit session limit, 1–120 generated minutes |

Private is the default and costs the same as public. Quality does not depend on plan or payment channel. Existing-result playback/download costs nothing. Technical failure or cancellation returns all held credits; actual incurred provider cost remains recorded. Completed portions of DJ sessions remain charged; crossfades make playback shorter than generated minutes. The chosen minute limit and maximum session credits appear before starting.

## Accounting and recovery

One server ledger is shared by the website, mobile website and native iPhone app. Purchases are account-bound and test/live balances are isolated. Stripe Checkout success redirects cannot grant credits by themselves: the server rereads the paid invoice, payment, captured charge, fees, tax, exact catalog and customer binding. Monthly grants are unique by both receipt and subscription period. Cancellation stops future renewal and preserves unused paid credits. Refund/dispute handling removes affected available credits and freezes the wallet for reconciliation; it does not silently mint replacements.

Apple uses a consumable `com.jamloom.credits.topup150` and auto-renewable `com.jamloom.creator.monthly`. StoreKit supplies localized price display; the verifier supports the current USD $20/$35 catalog and original $10/$15 signed receipts; other currencies are not offered. Build 40 matches StoreKit prices against the authenticated server catalog. Build 39 hardcodes the old amounts; build 40 is uploaded/VALID and selected for the coordinated Apple catalog transition. Physical iPhone checks confirm the actual $35/$20 StoreKit catalog and authenticated offers. Independent JWS verification checks account, product, bundle, environment and period. Transactions finish only after server acknowledgement. Restore and unfinished transaction recovery are supported; notifications grant successful renewals and reconcile cancellation/revocation. Apple course purchases remain separate. No external web checkout is introduced in the native app.

Catalog-v2 receipts and renewals remain verifiable at their exact original amounts. The current and previous Stripe price IDs are separate environment settings; old subscriptions are not automatically migrated. Pending old Creator checkouts are expired before quoting the current offer. Legacy receipts remain verifiable. Available old credits convert once at **15:1** after old active reservations finish. Historical ledger entries remain immutable. Unspent legacy DJ allowance returns as new credits, rounded up in the customer's favor. Migration 0033 is additive; its default unit version remains 1 for compatibility with old code. New grants explicitly use version 2. The reviewed migration was applied to the verified Neon production target after a private full backup; all 33 migration hashes and a second no-op migration pass match. This does not deploy the new application.

## Economics and release gates

**Owner decisions, November 8:** “Keep 65%; reduce costs first,” followed by approval of **$35/300 monthly and $20/150 top-ups**. A lower-margin introductory launch is not approved. The new prices pass the conservative low-volume Improvise/DJ planning scenarios; full provider startup/idle/failure billing and Music DNA cost qualification remain incomplete. [Repricing evidence](evidence/credit-repricing-20261108/report.md). The [local preload candidate](evidence/cost-reduction-20261108/report.md) remains disabled and does not establish passing commercial economics.

**November 8:** The owner-approved finite review-only backend is active and build 39 is WAITING_FOR_REVIEW with manual release. This is the historical review checkpoint before the authorized price change; commercial qualification remains incomplete. Posted DJ resource charges are $0.008/generated minute before non-GPU overhead; conservative complete-cost planning does not qualify the catalog. [Cost analysis](evidence/economic-closure-20261108/report.md), [review access and remaining allowance](evidence/review-phase-20261108/report.md).

Catalog version: `2026-11-08-v3`. The conservative supported-channel planning floor is **$0.046666 net per credit**, with a **65% contribution-margin target**. Live generation must satisfy both the catalog cap and the actual allocated purchase-lot proceeds; a low-net purchase cannot bypass the budget guard. At that floor, the maximum attributable cost is $0.163331 per Improvise, $0.326662 per Music DNA song and $0.032666 per DJ generated minute. This uses the existing conservative 40% retained-proceeds allowance, not an asserted Apple commission rate. Original low-net purchase lots retain their smaller budgets.

These are **allowable budgets, not measured production costs or a claim that current workers meet them**. Qualification must include startup/idle allocation, generation, failed work, storage/operations, support, tax and provider fees. If measured reliable caps exceed these budgets, optimize the service or review the catalog with the owner before activation. Do not silently charge a different number of credits. A paid request fails closed when its cap exceeds budget.

`JAMLOOM_CREDIT_COST_QUALIFICATION` does not select the qualified catalog, ordinary public generation and live purchases remain closed, and only the existing temporary Apple review accounts have the sandbox purchase exception. The live trial pool is zero until an explicit promotional budget is set; the isolated test pool is 1,000 accounts. A verified email is required, with authentication rate limits and an atomic global claim cap.

**November 2 update:** Explicit preparation across web/mobile web/iPhone is implemented and locally verified. Preparation uses a separate finite operator allowance and holds no customer credits. It is disabled until configured and hosted-qualified. Startup/idle/failure costs still belong in economic qualification; the new budget ledger is not evidence of profitability. [Current evidence](evidence/local-release-20261102/report.md), [operating and release order](CLOUD_CAPACITY.md). No push or activation occurred. The earlier dated activation details below remain historical evidence.

Remaining activation work ([current evidence](evidence/credit-repricing-20261108/report.md), [ordered handoff](LAUNCH_ACTIVATION.md)):

1. **PARTIAL operating qualification:** hosted Music DNA and Improvise deliveries, credit settlement and cleanup have passed in bounded diagnostics. Full startup/idle/failure/review cohort billing remains incomplete. Improvise/DJ conservative planning margins at the new prices exceed 65%; forecasts do not qualify sales. Music DNA still lacks complete attributable provider costs. Closed endurance/music studies remain deferred.
2. **PARTIAL live activation:** deployed payment verification and the new Stripe sandbox lifecycle pass. The $35 live price and existing Creator product/webhook remain inactive. Activate existing objects only after economic gates pass; no real charge is required for a test.
3. **PASS scoped Apple/device checks; PARTIAL review/release:** build 40 is VALID, selected with manual release and passes 28 scoped physical checks, including actual $35/$20 StoreKit offers. Existing signed historical payments and fixture tests are separate evidence; no new $35 real Apple purchase is claimed. The finite review allowance has $6/eight cycles remaining until November 16 02:06:50.894 UTC. Both updated review images are COMPLETE and the five-item submission containing build 40 is WAITING_FOR_REVIEW; Apple approval and public release remain open.
4. **PASS review-only backend; NOT RUN customer activation:** source `4bde975e` serves the new catalog at `www.jamloom.com` for the two existing review accounts. Public sales/generation/trials stay closed. Commercial deployment/activation remains last, after the cost and review gates pass.

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
