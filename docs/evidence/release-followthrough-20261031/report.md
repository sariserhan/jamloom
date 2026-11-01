# Release follow-through — 2026-10-31

**PARTIAL.** The owner authorized staged deployment/activation after gates pass. Public Apple callback delivery is now verified; customer sales remain disabled because generation economics and native review qualification are incomplete. Earlier blanket release holds are superseded only within this authorized scope.

## Completed

- **PASS deployment:** reviewed commit `3f6124e1` built on Vercel with Node 22 and was promoted to `www.jamloom.com`. Deployment `dpl_7QhctYELzkAz5E5HW2xDDzYr4TaT`. Previous production `dpl_A8D5QQFLEmMPb6xdLcuCQqVWETnT` is retained for rollback. No private environment files were uploaded with the source.
- **PASS real provider delivery:** Apple reports `SUCCESS` for a fresh Sandbox TEST notification to the public sandbox route. Signed sandbox events are rejected by the production route; invalid bodies are rejected. [Receipt](apple-test-delivery.json).
- **PASS local reviewer payment isolation:** operator-selected authenticated accounts can verify actual Sandbox receipts and see only their test wallet. Ordinary accounts retain production verification/live balances; reviewer accounts cannot initiate Stripe checkout. Actual receipt/Restore duplicates produce exactly two grants/450 credits. [HTTP evidence](review-http-verification.jsonl). The mode is disabled by default and expires; this code is not yet deployed or a complete App Review generation flow.
- **PASS corrected physical refund submission:** the original attempt could not find a finished consumable, explaining why no sheet appeared. Including consumable history fixed that lookup; the exact signed development build passed the one-device refund request test with zero skips. Submission is not approval. Signed REFUND and DID_RENEW events have not yet arrived. [Independent signature/ledger evidence](apple-lifecycle.jsonl).
- **PASS local checks:** 187 site tests, typecheck, production qualification build and bundle audit. The native refund-history build/test passes. Failed first attempts are retained privately.

## Work in progress

- Stripe's matching prepared secret is now saved in Vercel. A callback-only deployment of the same reviewed commit is building, with sales and cloud generation explicitly disabled. A nonfinancial product metadata event will verify provider delivery; no real charge or paid credit grant is requested. [Exact plan](stripe-delivery-plan.json).
- The owner approved the [L4 cost diagnostic](cost-diagnostic-plan.json): three private requests in two sequential stages, one GPU, $3/stage and $6 total, 40 minutes/stage plus shutdown, no repeated requests, stop on failure. Both dry runs pass. The request budgets are candidates only; cold initialization, idle, failed work and storage/operations must be attributed separately before any economic qualification.
- The hosted harness now checks fixed 10/20-credit settlement and full failure refunds, replacing an obsolete variable-price expectation. Candidate settings live only in diagnostic scripts; customer cost guards and prices are unchanged.

## Remaining release gates

1. Measured and enforceable costs within the catalog budgets, including AI DJ economics. The owner-closed endurance/music-study requirements are not reopened.
2. Finish deployed Stripe verification; final live settlement/tax checks and sale activation after economics passes.
3. Receive and independently reconcile actual Apple renewal/refund events; complete authenticated native-to-deployed receipt flow.
4. Complete the funded App Review generation context, actual purchase-screen screenshots, metadata/reviewer instructions and purchase-enabled native candidate, then upload/review. The current disabled-purchase IPA is not the final release.
5. Apple/provider approval and any owner-only legal/tax/sign-in interactions cannot be replaced by automated tests.

Private artifacts remain under `build-release-closure-20261031/` and `build-payment-closure-20261031/`, excluded from Git. Raw JWS, account tokens, device receipts and credentials are never committed. Provider readbacks do not prove final settlement or tax compliance.

Documentation checked: [Apple consumable history](https://developer.apple.com/documentation/bundleresources/information-property-list/skincludeconsumableinapppurchasehistory), [Apple refund testing](https://developer.apple.com/documentation/storekit/testing-refund-requests), [Runpod pricing](https://www.runpod.io/pricing), [billable worker lifecycle](https://docs.runpod.io/serverless/pricing), [Stripe webhook delivery](https://docs.stripe.com/webhooks), [endpoint configuration](https://docs.stripe.com/api/webhook_endpoints/update).
