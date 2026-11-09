# Operating follow-through — November 8, 2026

**PASS deployed renewal protection, delivered operating alerts, simulator repair and cost reconciliation; PARTIAL measured economics and Apple release.** The owner instructed “do all those” after renewal protection, alert verification, economics, iOS release, tracker reconciliation and simulator cleanup were listed. The owner supplied the operational recipient privately. The existing $10/seven-day permit, $35/300 and $20/150 catalog, nonexpiring credits and deferred research scope are unchanged.

## Renewal protection

Live Creator renewal collection defaults to paused after the first payment, via Stripe `pause_collection.behavior=void`, with no automatic resume. First payments, paid-credit recovery, refunds and cancellation remain available. Webhook reconciliation and an independent monitor protect related subscriptions and existing unpaid renewal invoices. Account/customer, catalog, product and environment checks prevent changes to unrelated subscriptions. Resume requires explicitly enabled, qualified operating policy and separate review of already-paused subscriptions; it never catches up paused months automatically.

The [real Stripe test-clock check](renewal-provider.json) passed: first sandbox payment succeeded, next renewal was void with zero payment, a draft created before protection was voided, duplicate handling passed, and an old automatic resume was removed. Its clock/customer/subscriptions were deleted. No live subscription existed at preflight. No real charge was made. Twelve focused checks and 241 site tests passed; typecheck, production build and bundle audit passed. Funding-pause disclosure appears on pricing, account credits and Stripe Checkout.

## Alerts

The two monitor entrypoints share six-hour idempotency for persistent incidents. They detect fewer than three remaining cycles, expiry within 48 hours, exhausted/expired allowance, stale or mismatched guardian, unconfirmed shutdown/provider identity, workers after expiry, recent failed live jobs/overdue cleanup and renewal-check errors. Email bodies contain no customer records, recordings, credentials or exception dumps. Monitoring can pause renewal collection but cannot start a GPU, renew funding or retry a song.

One clearly labeled test message was sent to the owner-approved Yahoo address. [Provider delivery receipt](alert-delivery.json) says **delivered**; this proves recipient-server acceptance, not that the owner opened it. Tests cover all incident classifiers, deduplication and send failures. Hosted Vercel cron and a separate headless-server timer are installed. The headless timer has completed an automatic scheduled run; Vercel’s five-minute schedule is registered against the promoted deployment and its authenticated endpoint passes. A platform-scheduled Vercel invocation has not separately been observed.

## Economics

[Fresh posted endpoint/worker charges](endpoint-reconciliation.json) still reconcile exactly. At 30,000 redeemed credits/month with the recorded $150/month shared allowance and five-year storage estimate: Improvise 66.77%, Music DNA 73.29%, AI DJ 71.71%. These are **planning scenarios**, not measured qualification; low-volume 10,000-credit scenarios still fail.

[Full-cycle sensitivity](worst-case-cycle-costs.json) allocates the entire approved $0.75 cycle reservation rather than treating a per-job execution bill as a complete startup/idle cost. At the same 30,000-credit assumptions, the target requires at least **11 Improvise deliveries or 6 Music DNA deliveries per fully charged cycle**. This does not assert that the supported cycle can deliver those counts or that the reservation is an actual charge. Sparse cycles do not establish 65% margin.

No new GPU request, cap increase, permit renewal or cost-qualification flag change occurred. Qualification remains **PARTIAL** pending representative observed cycle utilization, full costs and continuing low-volume allocation/retention evidence. The approved launch exception remains the basis for public service.

## Apple and simulator

Apple readback at 2026-11-09 04:40 UTC: version 0.11.0/build 40 remains **WAITING_FOR_REVIEW**, release **MANUAL**. No release can be performed before approval. Web Stripe collection pauses do not pause Apple subscriptions; continuing operating funding and the native renewal policy must be checked before manual iOS distribution. Deferred scoring, learned planner, formal measurements and separate paid course/AI DJ launches remain deferred/held.

A fresh simulator boot reproduced PosterBoard SIGTRAP. Its log identifies `PRPosterDescriptor` initialization failing because a ClockPoster ambient configuration lacks a descriptor identifier. With the affected simulator shut down, only its PosterBoard stores/preferences were moved to a separate local backup. All **3,584 files / 1,519,877,488 bytes** were hash-verified before and after; app containers were untouched. [Repair receipt](posterboard-repair.json). The reset passed **359 seconds of observation without another crash**, PosterBoard remained running with last exit 0, all **41 installed app identities** matched, and a second boot also passed. A real intentionally failing child command returned exit 7 while the wrapper shut down its owned simulator. The simulator is now shut down; the backup remains outside its device directory. This is scoped observation, not a guarantee against every future Apple runtime failure.

`scripts/with_ios_simulator.py` wraps `scripts/ios_smoke.sh`, preserves previously booted devices and shuts down devices started by its run on success, test failure or interruption. Four tests verify failed test cleanup, preserving an already-running simulator, failed boot ownership and SIGTERM cleanup. Ad hoc simulator tests should use the same wrapper. Do not use `shutdown all` or erase unrelated devices.

## Operational procedure

Before November 15 at 10:49:57 p.m. Eastern (or earlier exhaustion), inspect funding and delivery evidence. A replacement allowance needs explicit owner authorization; do not refill automatically. If funding ends, keep new work/sales closed and Creator collections paused. Existing credits remain nonexpiring, recovery/management stay available, and support remains responsible for customer requests.

Relevant official documentation: [Stripe collection pauses](https://docs.stripe.com/billing/subscriptions/pause-payment), [subscription webhook events](https://docs.stripe.com/billing/subscriptions/webhooks), [Resend delivery lookup](https://resend.com/docs/api-reference/emails/retrieve-email). Context7 tools were unavailable; official docs and installed SDK/Next.js references were used.

## Hosted rollout and final state — PASS

Source **`054b8a8c`** is READY and promoted at **https://www.jamloom.com**, deployment `dpl_AhCnzGTJ8azFRW3e8n8rCnr8YD9n`. [Deployment receipt](deployment.json). Private and public ordinary-account live $35/$20 checkout sessions passed and expired unpaid; Creator Checkout includes the renewal-pause disclosure. No customer charge or new GPU run was made. [Public check](public-check.json), [Chromium/WebKit at 1280/390 widths](public-browser.json), [phone screenshot](webkit-390.png).

[Public monitor](public-monitor.json) returns 401 without the cron secret and passes with the original production secret. Initial verification used an absent/redacted local secret and correctly received 401; using the retained original secret resolved the test fixture without rotating credentials or weakening authentication. Final readback shows workers zero, fresh matching guardian, no failed live jobs or overdue cleanup, no live subscriptions, and the full $10 allowance unchanged.

The [independent monitor](monitor-installed.json) is installed on the headless host with a five-minute user timer and linger enabled. Its [automatic timer run](monitor-final.json) passed. Running the test alert through that host returned the same idempotent delivered email receipt, without another email. The existing stop-only guardian executable/configuration and GPU permit were not changed.

The existing Stripe webhook now also receives `invoice.created` and `invoice.finalized`, preserving all original events. A [fresh actual Stripe-origin delivery](stripe-delivery.json) passed signature verification and durable processing; invalid signatures were rejected. The nonfinancial `product.updated` probe restored product metadata and retained the expanded event list. It is not a real paid lifecycle claim. [Owned temporary account/session/customer cleanup](check-cleanup.json) passed.

`JAMLOOM_OPERATIONS_EMAIL` and disabled `JAMLOOM_CREATOR_RENEWALS_ENABLED` are persisted for future production builds. The recipient stays in private configuration. The prior public deployment is retained for rollback, but rolling back application code alone would remove webhook renewal protection: keep the independent monitor/timer and expanded webhook events running, close new purchases if necessary, and preserve paid-credit recovery. Never restore an expired funding permit or unpause subscriptions automatically.

No Git push, native binary update, Apple release, extra funding or qualification-flag change occurred. The only unresolved completion claims are external Apple approval/manual iOS readiness and evidence-backed 65% economics; these are explicitly not marked PASS.
