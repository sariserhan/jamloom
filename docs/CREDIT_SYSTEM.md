# Credits — current implementation, 2026-11-08

The owner approved implementation across web and phone and selected **nonexpiring paid credits everywhere**. Public web payments and bounded song capacity are **live** under the explicit November 8 launch exception below; iOS approval and measured economic qualification remain separate. This supersedes older prepaid-only proposals and the one-month rollover suggestion.

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

**Public launch exception, November 8:** After the cost-based hold was explained, the owner instructed “lets do public launch now” and approved **$10 maximum for seven days**. Source `8f5701d0` is publicly deployed; existing Stripe Creator product/price/webhook are active. `JAMLOOM_CREDIT_LAUNCH_APPROVAL=2026-11-08-v3` records this exception separately from the still-unset measured cost qualification. New checkout requires a valid funded permit and fresh matching guardian. The permit ends November 15 at 10:49:57 p.m. Eastern; it does not renew. Thirteen $0.75 cycles maximum; the unused former review allowance is not reused. Creator renewal protection is now prepared for deployment: future collections pause after the initial payment, with no automatic resume or catch-up billing. Free trials remain unfunded; iOS build 40 is WAITING_FOR_REVIEW. [Live checks and exact limits](evidence/public-launch-20261108/report.md). The earlier hold statements below describe superseded checkpoints.

**Latest launch audit, November 8:** [Endpoint and worker posted totals reconcile](evidence/launch-audit-20261108/report.md); six DNA-window workers without bills were last observed throttled, rather than confirmed billable work. Assigning the entire posted mixed cohort to its one DNA result gives a 73.29% scenario margin at 30,000 monthly redeemed credits and five-year storage. All three product scenarios fail at 10,000 monthly redeemed credits under the same shared-cost assumption. These remain conditional forecasts; full operating qualification is not enabled. Build 40 is still WAITING_FOR_REVIEW.

**Historical repricing decisions, November 8 (launch exception above supersedes the activation hold):** “Keep 65%; reduce costs first,” followed by approval of **$35/300 monthly and $20/150 top-ups**. A lower-margin introductory launch is not approved. The new prices pass the conservative low-volume Improvise/DJ planning scenarios; full provider startup/idle/failure billing and Music DNA cost qualification remain incomplete. [Repricing evidence](evidence/credit-repricing-20261108/report.md). The [local preload candidate](evidence/cost-reduction-20261108/report.md) remains disabled and does not establish passing commercial economics.

**November 8:** The owner-approved finite review-only backend is active and build 39 is WAITING_FOR_REVIEW with manual release. This is the historical review checkpoint before the authorized price change; commercial qualification remains incomplete. Posted DJ resource charges are $0.008/generated minute before non-GPU overhead; conservative complete-cost planning does not qualify the catalog. [Cost analysis](evidence/economic-closure-20261108/report.md), [review access and remaining allowance](evidence/review-phase-20261108/report.md).

Catalog version: `2026-11-08-v3`. The conservative supported-channel planning floor is **$0.046666 net per credit**, with a **65% contribution-margin target**. Live generation must satisfy both the catalog cap and the actual allocated purchase-lot proceeds; a low-net purchase cannot bypass the budget guard. At that floor, the maximum attributable cost is $0.163331 per Improvise, $0.326662 per Music DNA song and $0.032666 per DJ generated minute. This uses the existing conservative 40% retained-proceeds allowance, not an asserted Apple commission rate. Original low-net purchase lots retain their smaller budgets.

These are **allowable budgets, not measured production costs or a claim that current workers meet them**. Qualification must include startup/idle allocation, generation, failed work, storage/operations, support, tax and provider fees. If measured reliable caps exceed these budgets, optimize the service or review the catalog with the owner before activation. Do not silently charge a different number of credits. A paid request fails closed when its cap exceeds budget.

`JAMLOOM_CREDIT_COST_QUALIFICATION` does not select the qualified catalog, ordinary public generation and purchases instead use the explicit finite launch approval plus funded-capacity checks. The two temporary Apple review accounts retain their isolated sandbox purchase exception. The live trial pool is zero until an explicit promotional budget is set; the isolated test pool is 1,000 accounts. A verified email is required, with authentication rate limits and an atomic global claim cap.

**November 2 update:** Explicit preparation across web/mobile web/iPhone is implemented and locally verified. Preparation uses a separate finite operator allowance and holds no customer credits. It is disabled until configured and hosted-qualified. Startup/idle/failure costs still belong in economic qualification; the new budget ledger is not evidence of profitability. [Current evidence](evidence/local-release-20261102/report.md), [operating and release order](CLOUD_CAPACITY.md). No push or activation occurred. The earlier dated activation details below remain historical evidence.

Current follow-through ([evidence](evidence/operations-20261108/report.md)):

1. **PARTIAL economics:** posted endpoint/worker charges reconcile; the 65% target remains unqualified at low volume and for full cycle/lifetime costs. No savings from the unpublished preload candidate are assumed.
2. **PASS public web activation:** Creator, top-ups and bounded song capacity are live; exact checkout and webhook delivery checks passed without a charge. Renewal protection and operating alerts are prepared for deployment.
3. **PASS submission/device scope; PARTIAL iOS release:** build 40 remains VALID and WAITING_FOR_REVIEW with MANUAL release. Apple approval is external; the two review accounts share the new public $10 permit, not the retired $6 remainder.
4. **PARTIAL continuing operations:** permit ends November 15 at 10:49:57 p.m. Eastern. No automatic refill. Preserve paid credits, subscription management and receipt recovery if funding stops. Trials and separate AI DJ/course launches remain unfunded/held.

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
