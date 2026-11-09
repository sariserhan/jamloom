# Public web launch — November 8, 2026

**PASS public web launch; PARTIAL iOS approval and measured economics.** Following the explanation of the cost-based web hold, the owner explicitly requested public launch now and approved **$10 maximum for seven days**. This is a bounded launch exception, not measured 65% cost qualification. The target and $35/300 monthly, $20/150 top-up catalog remain unchanged.

[Permit](permit.json): one L4, thirteen complete $0.75 cycle reservations at most, automatic idle/expiry shutdown, no renewal. The previous review-only permit is replaced without spending its unused balance. The new allowance covers public customers and the existing two review accounts; no new free-trial pool is funded. iOS release still requires Apple approval. AI DJ generation and paid course/Pro launches remain separately held.

## Validation

[229 site tests](site-tests.log), [TypeScript](typecheck.log), [production build](build.log), [bundle audit](bundle-audit.log) and [Chromium/WebKit](browser-report.json) pass. Real Stripe test checkout sessions show $35 subscriptions and $20 top-ups at 1280/390 widths; no card charge, GPU request or grant is made. Temporary test sessions, customers, local database and server are cleaned up.

The explicit owner-launch setting is separate from `JAMLOOM_CREDIT_COST_QUALIFICATION`, which remains unset. It requires the current catalog and an active bounded L4 permit. New checkout requests also require the matching fresh guardian and enough unreserved permit allowance for a new cycle; stale/changed/exhausted configurations fail closed. Subscription management and webhook/receipt recovery remain available. Existing subscription renewals are not cancelled by closing new-checkout admission; operating funding must be reviewed before this permit expires.

[Stripe preflight](stripe-preflight.json) confirms the expected account, active tax configuration, charge/payout capability, exact existing $35 price and reusable product/webhook. Those objects were inactive at this preparation checkpoint and are now active as verified below. Its historical webhook URL query is retained; receipt catalog metadata, not that URL marker, controls verification.

## Public release — PASS

[Deployment](deployment.json) `dpl_6scAZBUzQJsnXqt7FuSj8YDrTtUg`, source `8f5701d0`, is READY at **https://www.jamloom.com**. The candidate was built without public aliases, passed [ordinary-account live checkout checks](candidate-check.json), and was promoted last. [Production checks](public-check.json) independently created exact $35/$20 live Stripe sessions for an ordinary verified account and expired them unpaid. This proves session creation, not a new charged purchase.

[Stripe activation](stripe-activated.json) reuses the existing Creator product, current price and webhook. Existing subscriptions and historical prices are unchanged. [A real Stripe-origin product.updated event](stripe-delivery.json) reached the deployed endpoint with verified signature and durable handled state; invalid signatures were rejected, no credits were granted, and the original event list/product metadata were restored while the live webhook stayed enabled. No real purchase is claimed by this nonfinancial probe.

[Production Chromium/WebKit](public-browser.json) at 1280/390 widths verify live enabled offers, disabled unfunded trial, no test-mode label, no coming-soon notice, no overflow or page exceptions. [Phone](public-chromium-390.png), [desktop](public-webkit-1280.png). [Temporary-account cleanup](check-cleanup.json) confirms the owned unpaid sessions expired, customer deleted and fixture account removed. Initial deletion was blocked by the empty wallet foreign key; after verifying zero grants/jobs, its owned wallet/customer rows were removed and cleanup passed.

[Guardian rotation](guardian-rotated.json) preserves the reviewed shutdown executable and replaces only the permit. [Final readback](final-readback.json) confirms one-worker policy, workers 0/0, no queued/running jobs, fresh matching guardian, **$10 unused**, thirteen possible cycles, and old permit reservation unchanged at $1.50. The old $6 remainder was not reused. No new paid generation ran during this release; earlier delivery evidence remains separate. The public creation flow requires existing credits and explicit Prepare, and may wait for provider capacity.

[Production environment](production-env-updated.json) preserves these settings for future builds. The finite permit expires **November 15, 2026 at 10:49:57 p.m. Eastern** (November 16 03:49:57.659 UTC). There is no automatic refill. New checkout closes on expiry/exhaustion or stale guardian; subscription management and receipt recovery remain available. Existing monthly renewals are not automatically cancelled: the operator must review funding before expiry and address customer service or cancellation if capacity will not continue.

[Apple review notes](apple-review-updated.json) now accurately disclose the public website launch. Existing review credentials and manual release remain unchanged; build 40 is still WAITING_FOR_REVIEW. No public iOS release or Git push occurred.

Rollback: close `JAMLOOM_CREDIT_PURCHASES_ENABLED` and `JAMLOOM_CLOUD_SONGS_ENABLED`, clear the owner launch approval, and deploy the held configuration. Keep guardian/cron/provider credentials until all jobs and workers are confirmed stopped. Do not disable webhook recovery or cancellation for existing customers. Previous held deployment `dpl_Aj7ZfGt9SkYSZNFEgxwQ7m7WaDiP` is retained; its old capacity configuration is not a funded public fallback.

Stripe launch verification follows [official live-mode/webhook guidance](https://docs.stripe.com/get-started/checklist/go-live). Context7 tools were unavailable; provider documentation and the installed CLI were used directly.
