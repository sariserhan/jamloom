# Operating follow-through — November 8, 2026

**PASS local renewal protection, alert delivery and cost reconciliation; PARTIAL hosted rollout, simulator observation, measured economics and Apple release.** The owner instructed “do all those” after renewal protection, alert verification, economics, iOS release, tracker reconciliation and simulator cleanup were listed. The owner supplied the operational recipient privately. The existing $10/seven-day permit, $35/300 and $20/150 catalog, nonexpiring credits and deferred research scope are unchanged.

## Renewal protection

Live Creator renewal collection defaults to paused after the first payment, via Stripe `pause_collection.behavior=void`, with no automatic resume. First payments, paid-credit recovery, refunds and cancellation remain available. Webhook reconciliation and an independent monitor protect related subscriptions and existing unpaid renewal invoices. Account/customer, catalog, product and environment checks prevent changes to unrelated subscriptions. Resume requires explicitly enabled, qualified operating policy and separate review of already-paused subscriptions; it never catches up paused months automatically.

The [real Stripe test-clock check](renewal-provider.json) passed: first sandbox payment succeeded, next renewal was void with zero payment, a draft created before protection was voided, duplicate handling passed, and an old automatic resume was removed. Its clock/customer/subscriptions were deleted. No live subscription existed at preflight. No real charge was made. Twelve focused checks and 241 site tests passed; typecheck, production build and bundle audit passed. Funding-pause disclosure appears on pricing, account credits and Stripe Checkout.

## Alerts

The two monitor entrypoints share six-hour idempotency for persistent incidents. They detect fewer than three remaining cycles, expiry within 48 hours, exhausted/expired allowance, stale or mismatched guardian, unconfirmed shutdown/provider identity, workers after expiry, recent failed live jobs/overdue cleanup and renewal-check errors. Email bodies contain no customer records, recordings, credentials or exception dumps. Monitoring can pause renewal collection but cannot start a GPU, renew funding or retry a song.

One clearly labeled test message was sent to the owner-approved Yahoo address. [Provider delivery receipt](alert-delivery.json) says **delivered**; this proves recipient-server acceptance, not that the owner opened it. Tests cover all incident classifiers, deduplication and send failures. Hosted Vercel cron plus a separate headless-server timer are the intended independent execution paths; installation/readback will be recorded below.

## Economics

[Fresh posted endpoint/worker charges](endpoint-reconciliation.json) still reconcile exactly. At 30,000 redeemed credits/month with the recorded $150/month shared allowance and five-year storage estimate: Improvise 66.77%, Music DNA 73.29%, AI DJ 71.71%. These are **planning scenarios**, not measured qualification; low-volume 10,000-credit scenarios still fail.

[Full-cycle sensitivity](worst-case-cycle-costs.json) allocates the entire approved $0.75 cycle reservation rather than treating a per-job execution bill as a complete startup/idle cost. At the same 30,000-credit assumptions, the target requires at least **11 Improvise deliveries or 6 Music DNA deliveries per fully charged cycle**. This does not assert that the supported cycle can deliver those counts or that the reservation is an actual charge. Sparse cycles do not establish 65% margin.

No new GPU request, cap increase, permit renewal or cost-qualification flag change occurred. Qualification remains **PARTIAL** pending representative observed cycle utilization, full costs and continuing low-volume allocation/retention evidence. The approved launch exception remains the basis for public service.

## Apple and simulator

Apple readback at 2026-11-09 04:27 UTC: version 0.11.0/build 40 remains **WAITING_FOR_REVIEW**, release **MANUAL**. No release can be performed before approval. Deferred scoring, learned planner, formal measurements and separate paid course/AI DJ launches remain deferred/held.

A fresh simulator boot reproduced PosterBoard SIGTRAP. Its log identifies `PRPosterDescriptor` initialization failing because a ClockPoster ambient configuration lacks a descriptor identifier. With the affected simulator shut down, only its PosterBoard stores/preferences were moved to a separate local backup. All **3,584 files / 1,519,877,488 bytes** were hash-verified before and after; app containers were untouched. [Repair receipt](posterboard-repair.json). The reset state is being observed before declaring repair success.

`scripts/with_ios_simulator.py` wraps `scripts/ios_smoke.sh`, preserves previously booted devices and shuts down devices started by its run on success, test failure or interruption. Four tests verify failed test cleanup, preserving an already-running simulator, failed boot ownership and SIGTERM cleanup. Ad hoc simulator tests should use the same wrapper. Do not use `shutdown all` or erase unrelated devices.

## Operational procedure

Before November 15 at 10:49:57 p.m. Eastern (or earlier exhaustion), inspect funding and delivery evidence. A replacement allowance needs explicit owner authorization; do not refill automatically. If funding ends, keep new work/sales closed and Creator collections paused. Existing credits remain nonexpiring, recovery/management stay available, and support remains responsible for customer requests.

Relevant official documentation: [Stripe collection pauses](https://docs.stripe.com/billing/subscriptions/pause-payment), [subscription webhook events](https://docs.stripe.com/billing/subscriptions/webhooks), [Resend delivery lookup](https://resend.com/docs/api-reference/emails/retrieve-email). Context7 tools were unavailable; official docs and installed SDK/Next.js references were used.
