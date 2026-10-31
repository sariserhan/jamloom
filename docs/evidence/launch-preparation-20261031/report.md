# Launch preparation — 2026-10-31

**PARTIAL overall.** Provider preparation, local validation and a signed iPhone distribution export are complete. Full paid release is not ready: the qualification harness's spending cap exceeds the credit catalog budget; attributable cost qualification, deployed payment delivery, Apple review metadata and physical sandbox transactions remain incomplete. No push, deployment, app upload/submission, live charge or new GPU execution occurred.

The owner requested all available preparation and supplied the correct Apple Issuer ID. Existing research deferrals and musical acceptance remain intact. Neither historical estimates nor provider draft creation is treated as release evidence.

| Gate | Result | Evidence |
|---|---|---|
| Site tests and typecheck | PASS: 182 tests | [Tests](unit-tests.log), [typecheck](typecheck.log) |
| Production database schema | PASS: 33 matching migration hashes; no migration needed | [Preflight](release-preflight.json) |
| Stripe live preparation | PASS: inactive Creator product/price, disabled credit webhook, cancellation portal | [Provider receipt](stripe-live-prepared.json), [read-only second plan](stripe-readback-plan.json) |
| Vercel configuration | PASS: six missing production variables added; no deployment or switches changed | [Receipt](vercel-prepared.json) |
| Apple product preparation | PARTIAL: exact prices, English metadata, USA only; both MISSING_METADATA with absent review screenshots | [Readback](apple-readback.json), [metadata](apple-metadata.json), [prices](apple-prices.json), [top-up price readback](apple-topup-price-readback.json) |
| iPhone distribution candidate | PASS: archive/export, strict code-sign verification and static bundle audit, 0.11.0 (35) | [Export/hash](ios-export.json), [archive audit](ios-bundle.json), [export audit](ios-export-bundle.json) |
| Cap versus catalog | FAIL: retained qualification setup permits $0.92 per song against $0.07 Improvise / $0.14 Music DNA budgets | [Cost audit](cost-audit.json) |
| Actual attributable cost qualification | NOT RUN: mixed historical billing cannot qualify current worker/catalog economics | [Provider billing observation](runpod-billing.json) |
| Deployed checkout/webhook delivery and physical Apple sandbox | NOT RUN | Local fixtures and provider draft records do not close these gates |
| Publication and live sales | NOT RUN / HELD | No release or activation performed |

## Provider preparation

Stripe account `acct_1TxA3vDlEXWDEeHO`: Creator product `prod_VXlMg867UjAY5B`, monthly USD 15 price `price_1UWfq5DlEXWDEeHOohZJG7PI`, portal `bpc_1UWfq5DlEXWDEeHOHhRCQY1f`, credit webhook `we_1UWfqYDlEXWDEeHOuJRHbAos`. Product and price are inactive; webhook disabled. The first portal became Stripe's account default and cannot be deactivated; its hosted login page is disabled and no portal session was created. It permits cancellation at period end without proration and disallows plan updates. Existing Pro/Academy and legacy credit endpoints are preserved. The top-up still uses the existing one-time Checkout catalog.

The new webhook uses the installed SDK's API version, `2026-09-30.endive`, and all nine required events. Its signing secret is retained only in the ignored private preparation folder. The existing deployed/local credit webhook secret was not replaced. Three Creator identifiers and three Singing variables were added to Vercel production configuration. Configuration presence is not deployment evidence. Vercel environment guidance was consulted; no values were logged. Stripe product/price/webhook preparation follows its [product](https://docs.stripe.com/api/products/create), [price](https://docs.stripe.com/api/prices/create), [portal](https://docs.stripe.com/api/customer_portal/configurations/create) and [webhook](https://docs.stripe.com/api/webhook_endpoints/create) APIs; Vercel configuration uses [its environment CLI](https://vercel.com/docs/cli/env).

Apple app `6826480059`, bundle `com.djayvo.app`: consumable `com.jamloom.credits.topup150` (`6829266772`, USD 10), monthly subscription `com.jamloom.creator.monthly` (`6829266841`, USD 15), group `22532513`. Price readbacks and USA-only availability pass; automatic new-territory availability is off. Both products remain unsubmitted and `MISSING_METADATA`; review screenshots are absent. Existing app version/build selection was not changed. Authentication was repaired using the owner's Issuer ID and the existing private key, following [Apple's token documentation](https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests). No private key, JWT or signing secret is included here.

## Cost finding and boundaries

The conservative floor remains $0.02 net per credit with a 65% contribution target. Current 10/20/2-per-minute prices therefore allow $0.07/$0.14/$0.014 in attributable cost. The historical qualification harness pins 1,000 microdollars per second and permits a 900-second queue/startup/execution window plus $0.02 fixed cost: $0.92 maximum. This is a cap, not an average bill or the verified deployed configuration. The local environment has no configured cloud rate; preflight reports `NOT_CONFIGURED`.

Recent retained job estimates span $0.107–$0.299 for successful Improvise requests and $0.157–$0.229 for successful Music DNA requests. They include conservative queue allowances, are not invoices, and span different worker images. The provider billing endpoint returned nonzero hourly observations, but hours mix products and work. Dividing those totals by selected successful songs would omit failures/startup or misattribute other work. No such average is used as qualification.

The new preflight displays cap compatibility even if a catalog qualification token is present. `PASS_CAP_ONLY` explicitly does not assert measured economics. The audit leaves prices, guards and qualification unchanged. At the unchanged $0.92 cap, the planning floor would require 132 credits per song; this is arithmetic, not an approved or recommended price change. First design and validate a lower enforceable cost bound, or review pricing/margin with the owner, before spending on another qualification campaign.

Runpod still has minimum and maximum workers set to zero; [readback](runpod-workers.json). No new paid benchmark was authorized or run.

## Reproduction and handoff

From `apps/site`, with Node 22:

```sh
node --import tsx scripts/prepare-credit-live.ts # read-only provider inventory/plan
node --import tsx scripts/credit-cost-audit.ts   # offline retained-receipt audit
node --import tsx scripts/release-preflight.ts --database
npm test
npm run typecheck
```

`prepare-credit-live.ts --apply-inactive` is the explicit provider-preparation mutation mode, not an activation command. It verifies the exact account and held sales flags and resumes existing prepared objects. Do not replay raw Apple/Vercel mutation scripts as verification. Their local copies and archive logs are retained under the ignored `build-launch-preparation-20261031/`; [artifact hashes](retained-artifacts.json).

The signed IPA is `build-ios-store/export-0.11.0-35/Jamloom.ipa` (SHA-256 `db302ac4837cea6ba7f7b3de0979d4d60e46cd988be55f77eb054e7a15be7f2c`). This build retains disabled native purchase flags; it is a validated preparation candidate, not the final purchasable App Store release. A final enabled candidate needs separate build/device/review evidence. Prior StoreKit results and pre-push browser/build validation remain in their original reports; those checks were not rerun or relabeled as physical provider evidence here.

[Ordered activation handoff](../../LAUNCH_ACTIVATION.md).
