# Jamloom agent instructions

Read the complete master specification before implementation. Jamloom is the official product name.

## Current rules

This section summarizes the owner's decisions currently in force. The dated
[authorization record](docs/AUTHORIZATIONS.md) is authoritative: read it before any
spending, pricing, deployment, payment or release action, and whenever this summary is unclear.
Record new owner decisions there, then update this summary.

**Spending and GPU capacity**
- Public launch permit: at most $10 over seven days (expires 2026-11-15 22:49 ET), one L4, at most thirteen $0.75 preparation cycles, automatic idle shutdown, no automatic permit renewal.
- After the seed permit: 20% of each payment's net proceeds (after payment fees, taxes and refunds) funds GPU use, one worker. A captured live Stripe charge counts immediately (owner, 2026-11-13); refunds/disputes revoke it. Apple proceeds still count only after bank-payment confirmation. This does not renew the seed grant or authorize unbounded card top-ups.
- Owner principle (2026-11-13): spending is acceptable when customers pay more than it costs. Still confirm each concrete spending change with the owner.
- Runpod native auto-pay is approved at $25 below $10 with a $5 notification. It replenishes prepaid cash only; it is not a generation allowance.
- Any other paid compute, new permit, worker-limit change or retry needs explicit owner approval with a concrete bound.
- The guardian runs from the every-minute Vercel `/api/song-jobs` cron and the headless `jamloom-capacity.service`; keep both stop-only. Both check Runpod first and touch the database every tick only while capacity is active (every 30 minutes when idle) so Neon can scale to zero; start-of-capacity accepts a 35-minute heartbeat, song admission 3 minutes.

**Pricing and economics**
- Catalog: Creator $35/month for 300 credits, $20 for 150-credit top-ups, nonexpiring credits, fixed operation prices. Preserve old receipts and subscriptions at their original amounts.
- The 65% contribution-margin target is retained and not yet verified. Never report it as passing without measured evidence.
- Future web Creator collections are paused; renewal continuation stays held until economic qualification passes. Preserve paid credits and initial purchase/recovery.

**Deployment and release**
- The public web launch is live under the bounded exception above. Pushing `main` deploys production: push only when the owner approved that deploy in the current task.
- Apply necessary reviewed database migrations with target verification, backup and checks; no per-migration confirmation needed.
- Public iOS release requires Apple approval and the owner's manual release.

**Operations and privacy**
- Operating alerts go to the privately configured owner address. Keep bank access private; never infer received Apple deposits from financial reports. Apple Vendor Number: 94477248.

**Product and evaluation**
- The owner is the sole required musical-evaluation listener. Preserve actual judgments and coverage; never infer acceptance of unreviewed audio.
- Music DNA: deliver technically valid songs with an honest style-match note when the genre matcher is uncertain. Technical audio, receipt integrity, privacy and credit checks stay mandatory.
- Deferred for v1: verified produced-song scoring, custom learned-planner training, formal measurements, Improvise qualification, the two-hour DJ test.
- Brand: use Jamloom; preserve historical Djayvo evidence, fixture provenance and storage identities. Neon project `misty-cherry-32516479`, branch `production`.

## Standing engineering rules

Do not modify the master specification except for the explicit owner-authorized listening amendment.

Do not claim missing human listening or Mac/device execution has passed, and do
not bypass quality evidence required before learned AI or production release.
Keep shared C++17 free of platform APIs and third-party runtime dependencies. Never
equate unit test results with human listening validation. Report every gate using
PASS, PARTIAL, FAIL, or NOT RUN and retain reproducible evidence.

Maintain `TODO.md` as the active-task tracker. When work or evidence changes, update
it, add a dated line to [work history](docs/TODO_HISTORY.md) with the supporting
commit/report, and keep `docs/progress.md` consistent. Completing code does not close
tasks that require human listening or real-device evidence.
