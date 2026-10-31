# Launch activation handoff — 2026-10-31

**Release is held.** [Current preparation evidence](evidence/launch-preparation-20261031/report.md) records completed work. These are remaining steps, not an authorization to execute paid compute, publication or live sales. Research/scoring deferrals and owner music acceptance are unchanged.

## 1. Resolve generation economics

Keep the catalog and safeguards unchanged until a viable cost design is reviewed. Current qualification cap is $0.92/song, exceeding $0.07 Improvise and $0.14 Music DNA. AI DJ must also fit $0.014 per generated minute. Queue, startup, execution, failures, cancellation, storage and operational/support allocation must be included; credits refunded to users do not erase provider costs.

Use `apps/site/scripts/credit-cost-audit.ts` and `release-preflight.ts` to inspect the gap. Establish a provider-enforced runtime/cost bound for the accepted worker and measure it with attributable billing. Record request IDs, immutable image, start/end, successful/failed/cancelled counts, provider bill interval/finality, cold-start/idle allocation, storage/operations allocation, net receipt proceeds and independent cleanup. Obtain a concrete bounded paid-test approval before new compute. Do not invent a smaller rate or stamp the qualification environment variable to bypass this requirement. If the costs cannot fit the current prices, obtain owner agreement on revised pricing/margin before changing the catalog.

## 2. Website and Stripe delivery

Creator live product/price and nine-event webhook already exist; do not create duplicates. Their IDs are in the preparation receipt. The product/price are inactive, webhook disabled; the cancellation portal exists with login disabled. Creator/Singing configuration is already added to Vercel production, but not deployed. Existing Pro/Academy settings remain unchanged.

After economics and explicit release approval, prepare a deployment with the matching application commit and `CREDIT_STRIPE_LIVE_WEBHOOK_SECRET` from the private `build-launch-preparation-20261031/credits-production.env`. Keep purchase switches off during initial deployed verification. Never print the file, put it into Git or substitute another product's secret. Preserve the old endpoint disabled and retain rollback configuration privately. Activate the new webhook for signed delivery verification only at the reviewed step; verify signature rejection, retries, duplicate events, initial/renewal grants, cancellation, refunds and reconciliation against the exact catalog. No success redirect may grant credits.

Review settlement/tax/account configuration, then separately authorize product/price activation, funded trial capacity and customer sales. Configure the measured worker cap and reviewed qualification version, not merely a syntactically valid value. Recheck production image decoding, account/session flows, private uploads, balance and generation confirmation at desktop/mobile widths after deployment. Keep a rollback that disables new sales/generation without breaking account history or completed downloads. Any real payment/refund test needs its own explicit authorization.

## 3. Apple review and device qualification

API access is resolved. App `6826480059` has both new products, exact USD 10/15 prices, English localization and USA-only availability. Both remain `MISSING_METADATA`; neither has a review screenshot. Confirm any additional required metadata in App Store Connect. Complete actual final purchase-screen screenshots and subscription disclosures, review account/instructions, server-notification environment URLs and tax/banking agreements. Do not use a simulated or hidden purchase screen as proof of a purchasable release UI.

Agent work: prepare the final approved purchase-enabled candidate, configure metadata/notification URLs, verify signed transaction/notification reconciliation and build/archive/export. Owner/device work: Apple sign-in or legal/tax acceptance when required, actual physical-iPhone sandbox purchase/renewal/restore/refund/account-sync interactions. Provider work: product/app review and approval. Local StoreKit fixtures do not replace these observations.

Current IPA `build-ios-store/export-0.11.0-35/Jamloom.ipa` is signed/audited but keeps purchases disabled; no upload or submission occurred. Its existing build 35 must not be represented as the final enabled release. Upload/submit only the final validated candidate after authorization. Website-first release does not require claiming App Store approval, and must not advertise native paid availability before it exists.
