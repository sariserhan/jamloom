# Payments — 2026-10-31

**Current credit catalog:** [Credit system and remaining activation gates](CREDIT_SYSTEM.md). Creator $15/300 monthly, $10/150 top-ups and 20 one-time trial credits are implemented across web/mobile website/iPhone. All paid credits are nonexpiring. Fixed generation prices replace the historical packs below for new sales. Stripe sandbox renewal/refund checks, local StoreKit and browser checks pass; live purchases/deployment remain held. Migration 0033 is applied with a private backup and 33 matching hashes.

## Earlier payment preparation — preserved history

**PASS current local payment checks and scoped preparation; PARTIAL activation.**
The owner deferred verified produced-song scoring, custom learned-planner
training and missing formal measurements for v1, then requested payment work.
Those are no longer v1 completion blockers. The two produced songs remain
ungraded practice, the accepted generator stays in use, and historical evidence
is preserved. [Decision](evidence/payment-readiness-20261031/scope.json).

Website payment preparation is the current focus. No new checkout, customer
charge, refund, app upload, website deployment or sales activation was made.
Existing previously authorized Pro configuration is preserved.

## Products and current preparation

| Product | Current USD price before applicable tax | Preparation |
|---|---:|---|
| DJ Studio Pro | $49 once | Existing live catalogue/webhook retained. Local credentials recovered from the private Pro files; signing key matches the desktop app. Local checkout stays disabled. |
| DJ Academy | $79.99 once | Existing live catalogue/webhook and production variable names confirmed. Sensitive deployed values are unreadable; no secret was rotated or redacted placeholder copied. |
| Singing Academy | $39 once | Existing inactive product/price retained. Dedicated live webhook created and disabled; secret saved privately. Three deployment variables are prepared locally and still absent on Vercel. |
| Song credits | 10/$9.99, 25/$24.99, 50/$49.99 | Existing live webhook remains disabled. Local tax/signing configuration is present. Live checkout now also requires the application's paid-generation release flag. |

Prices are the existing product decisions, not a pricing change. Stripe's
read-only account inventory confirms charges/payouts enabled, no currently due
account requirements and active tax settings. It does not prove settlement or
the correctness of tax classifications for every jurisdiction.
[Inventory](evidence/payment-readiness-20261031/stripe-readonly.json).

## Changes and validation

- Live credit checkout can no longer be opened solely with the environment
  purchase toggle while `paidGenerationReleased` is false. Test-mode checkout
  remains usable.
- Credit reversals now ignore unrelated legacy direct charges and other products,
  reject paginated/ambiguous matches, and verify payment intent and mode before
  freezing the matched purchase. Existing duplicate/refund holds remain intact.
- Release preflight now includes Pro checkout/signing and credit checkout/tax
  readiness. Neither secrets nor license tokens appear in its report.
- Both environment templates include Pro, Singing, publishable keys and Apple
  environment/app ID fields, with purchase switches false.
- **11 focused checks PASS; 30 actual PostgreSQL payment/ledger checks PASS;
  TypeScript PASS.** Coverage includes grants, duplicates, account isolation,
  refunds, disputes, course access and wallets. The disposable database server
  was stopped. No production ledger was changed.
- Read-only production migration audit: **32/32 hashes PASS**, no pending or
  changed migrations; the database's billing selection remains `test`.

[Unit checks](evidence/payment-readiness-20261031/payment-unit-tests.log),
[database checks](evidence/payment-readiness-20261031/database-payment-tests.log),
[cleanup](evidence/payment-readiness-20261031/database-payment-tests.json),
[typecheck](evidence/payment-readiness-20261031/typecheck.log),
[database/configuration audit](evidence/payment-readiness-20261031/release-preflight.json).

The new Singing endpoint is pinned to the installed SDK's API version and has
the same five event types as the course handler. Stripe creates an endpoint
enabled; this preparation immediately disabled it and independently read back
the disabled state. Its product and price remained inactive throughout. No
existing endpoint was changed. Its signing secret and environment backups are
in private ignored files, never in Git.
[Dry run](evidence/payment-readiness-20261031/singing-webhook-dryrun.json),
[preparation](evidence/payment-readiness-20261031/singing-webhook-prepared.json),
[independent readback](evidence/payment-readiness-20261031/provider-final-readback.json).

Pro credentials came from `apps/site/.env.pro-billing` and `.env.pro-license`;
they were validated against the current Stripe catalogue and desktop public key
before filling absent local fields. The Vercel production inventory was fetched
read-only into a private file. Sensitive values are redacted, so the attempted
DJ credential recovery correctly stopped without modifying local or remote
settings. Presence is not a signature verification result. Configured Vercel
variables also do not identify the currently running deployment revision.
[Pro recovery](evidence/payment-readiness-20261031/pro-configuration-recovered.json),
[production inventory](evidence/payment-readiness-20261031/production-configuration.json),
[prepared local configuration](evidence/payment-readiness-20261031/prepared-local-configuration.json).

## Remaining activation sequence — not executed

1. At the authorized website release, add only
   `SINGING_STRIPE_LIVE_PRODUCT_ID`, `SINGING_STRIPE_LIVE_PRICE_ID` and
   `SINGING_STRIPE_LIVE_WEBHOOK_SECRET` from the prepared private local values.
   Preserve existing Pro, Academy and credit settings. Deploy the reviewed
   compatible website; adding these variables does not itself activate sales.
2. Verify signature rejection, correct environment/account routing, duplicate
   delivery and entitlement reconciliation through the deployed endpoints.
   Existing historical Stripe test purchase/refund/dispute evidence is retained;
   the new local tests do not substitute for deployed delivery.
3. For each product authorized for live activation, enable its required product,
   price, webhook and application switches together. Credit sales additionally
   require an operational generation service. Do not open paid access while its
   delivery path is unavailable. Preserve the earlier Pro release configuration
   unless an explicitly reviewed change requires otherwise.
4. Native payments remain a separate follow-through: actual sandbox purchases
   and Restore passed historically, but deployed/native receipt delivery,
   actual Apple refund notifications and outstanding reviewer metadata still
   need qualification. No new phone purchase or Apple setting change was made.

Readiness checks can be repeated from `apps/site`:

```sh
node --import tsx scripts/release-preflight.ts --database
node --import tsx --test tests/economics.test.ts tests/release-preflight.test.ts
npm run typecheck
```

The Singing preparation script is a one-time guarded operation and refuses an
existing endpoint; do not rerun it as a readiness check.

References consulted: [Stripe webhook verification and delivery](https://docs.stripe.com/webhooks),
[Stripe go-live checklist](https://docs.stripe.com/get-started/checklist/go-live),
[webhook creation](https://docs.stripe.com/api/webhook_endpoints/create),
[disabling a webhook](https://docs.stripe.com/api/webhook_endpoints/update),
[Vercel sensitive variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables).
Context7 was unavailable; official documentation and the installed Next.js route
handler guide were used. No unrelated library upgrade was made.
