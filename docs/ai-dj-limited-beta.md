# AI DJ limited beta preparation — 2026-10-25

**PASS local admission and bounded hosted-GPU session qualification; PARTIAL production operation and musical acceptance. Production beta remains disabled.** The separately authorized [hosted qualification](ai-dj-hosted-operation.md) completed twenty tracks for $0.169 observed GPU cost, with cleanup recovery documented. No purchase, invitation, paid tariff or live billing was activated. This supersedes the old website-deployment status in [the historical qualification](ai-dj-beta-readiness.md); the public website was deployed separately.

## Entry and operation

Production `/ai-dj` and its session/recording APIs require `JAMLOOM_AI_DJ_BETA_ENABLED=true`, a verified account and an exact email in `JAMLOOM_AI_DJ_BETA_EMAILS` (comma-separated; at most 50, no wildcard). The existing local development preview is preserved. The entry page is dynamically authorized; a build made while the flag is off cannot cache the closed page permanently. Public Community song/set reads remain separate.

The beta uses the existing test ledger and bounded warm-worker protocol. Admission to the page does not enable generation: the existing generation flag, valid budget, storage and healthy registered worker are still required. Two active listeners are the hard admission limit; rejected Starts cannot charge credits. The status panel reports free slots, worker heartbeat/deadline/budget health, expired job leases, observed/allocated rental costs and render latency. “Worker heartbeat healthy” is a runtime signal, not an uptime or musical-quality certification.

Read the panel at `/admin/operations`, or run `node --import tsx scripts/dj-beta-readiness.ts` from `apps/site`. That command is read-only. [Current production snapshot](evidence/connected-library-20261025/production-dj-readiness.json): **Held**, no worker or active listener. [Provider reconciliation](evidence/connected-library-20261025/provider-reconciliation.json): complete rental inventory empty; latest observed charge for the completed twenty-track campaign is **$0.144**, superseding its earlier $0.134 observation. Final invoice is unverified.

## Completed funded qualification packet

The owner accepted this proposed $6 / one GPU / 40-minute window with “finish it.” The new `jamloom-dj-qualification-20261025-hosted` campaign is now completed and its authorization is consumed. Twenty fresh tracks, two listeners, dispatcher crash recovery, Stop/credit exhaustion, R2 access and deletion checks passed. The initial third-account fixture cleanup failed; guarded recovery and the harness correction passed. A source-origin quiet passage remains for human review. See the [complete report](ai-dj-hosted-operation.md). Do not rerun either completed campaign or reuse its permit.

For any later separately authorized window: Before renting, create a new immutable campaign ID/permit tied to the actual approved budget and exact database/storage targets. Complete read-only readiness, destination checks and backup as applicable. The independent provider watchdog must exist before rental creation. Start bounded database supervision after worker registration; retain the original deadline through retries. The supervisor cannot create or renew rentals. Keep public beta entry off during qualification.

Acceptance checks:

1. Two separate verified accounts obtain distinct fresh music with bounded preparation and no library replay. A third Start is refused without spending or reserving credits.
2. Mood/energy updates affect the next immutable batch. Occasional voice remains subject to beat/length checks; failed candidates preserve the instrumental.
3. Lost audio response resumes the same job without regeneration. Restart a dispatcher with a valid lease; stale heartbeat, expired lease, budget exhaustion or ambiguous shutdown must hold admission and reconcile before settlement.
4. Stop affects that listener only; running work drains within its existing deadline. Credit exhaustion prevents new reservations. Neither case charges twice or exposes another listener’s recording.
5. Complete named Public/Private recordings are decoded from R2, checked for duration/continuity and authorized access. Private output stays out of anonymous feeds and share pages. Only played, completed public recordings enter Community.
6. Check browser heap/CPU and render queue at both listeners. Fresh captures must cover the quiet-ending repair; existing retained-audio replays do not substitute for this.
7. Confirm the full provider inventory is empty and record final observed cost. Preserve failures and stop the campaign on failure; no silent replacement or deadline extension.

After a passing window, a separately authorized invited beta can use the same bounded operator window and test credits. Public entry, live purchases and continuous always-on rentals remain off. Closing entry must not substitute for settling running jobs and verifying provider cleanup. Never disable recovery APIs mid-session without first draining/stopping listeners and verifying saved recordings.

## Evidence and economics

The current local database suite exercises admission races, disconnect/Stop, lease recovery, stale worker deadlines/budgets, supervisor termination, credits, R2 visibility contracts and readiness holds. The production-build HTTP check covers invited/other/anonymous access and refuses an unfunded Start without creating a session. The later bounded campaign used a real GPU and R2 with a local controller/database; it does not establish continuous hosted operation or new musical acceptance.

The completed campaign's observed GPU-only cost is **$0.432 per generated hour**, or approximately **$0.5505 per hour of its original captured mixes**. Overlap means these denominators differ. These are not customer prices or complete production costs. [Reconciliation](evidence/connected-library-20261025/economics-reconciliation.json) and [full-cost scenarios](evidence/connected-library-20261025/operating-costs.json) retain idle utilization, storage retention, database, shared infrastructure, support and failure assumptions. Actual sustained utilization and invoices are still required; indefinite retention has no finite guaranteed one-time cost.

**NOT RUN:** continuous-host process-loss recovery, venue use, new expert listening, rights-cleared DJ demonstration training and public beta activation. The owner-skipped first-user trial and mobile release checks remain skipped.
