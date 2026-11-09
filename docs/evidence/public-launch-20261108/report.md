# Public web launch — November 8, 2026

**PASS preparation; activation in progress.** Following the explanation of the cost-based web hold, the owner explicitly requested public launch now and approved **$10 maximum for seven days**. This is a bounded launch exception, not measured 65% cost qualification. The target and $35/300 monthly, $20/150 top-up catalog remain unchanged.

[Permit](permit.json): one L4, thirteen complete $0.75 cycle reservations at most, automatic idle/expiry shutdown, no renewal. The previous review-only permit is replaced without spending its unused balance. The new allowance covers public customers and the existing two review accounts; no new free-trial pool is funded. iOS release still requires Apple approval. AI DJ generation and paid course/Pro launches remain separately held.

## Validation

[229 site tests](site-tests.log), [TypeScript](typecheck.log), [production build](build.log), [bundle audit](bundle-audit.log) and [Chromium/WebKit](browser-report.json) pass. Real Stripe test checkout sessions show $35 subscriptions and $20 top-ups at 1280/390 widths; no card charge, GPU request or grant is made. Temporary test sessions, customers, local database and server are cleaned up.

The explicit owner-launch setting is separate from `JAMLOOM_CREDIT_COST_QUALIFICATION`, which remains unset. It requires the current catalog and an active bounded L4 permit. New checkout requests also require the matching fresh guardian and enough unreserved permit allowance for a new cycle; stale/changed/exhausted configurations fail closed. Subscription management and webhook/receipt recovery remain available. Existing subscription renewals are not cancelled by closing new-checkout admission; operating funding must be reviewed before this permit expires.

[Stripe preflight](stripe-preflight.json) confirms the expected account, active tax configuration, charge/payout capability, exact existing $35 price and reusable product/webhook. Those objects are still inactive at this preparation checkpoint. Its historical webhook URL query is retained; receipt catalog metadata, not that URL marker, controls verification.

Protected deployment, guardian rotation, existing Stripe activation, staged checks, final public promotion and live checks remain in progress. No Git push.
