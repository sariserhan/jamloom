# Warm AI DJ worker, measured timing and short vocals — 2026-10-24

**PASS local implementation and regression checks; hosted qualification and new musical acceptance NOT RUN.** No paid rental, website deployment, public activation or live customer billing occurred. The owner approved one new $6 / one-GPU / 40-minute qualification, six 60-second tracks and at most two 10-second hook candidates. This is inference and a deterministic timing policy, not newly trained expert DJ intelligence.

## Continuous worker

A single authenticated loopback renderer holds the pinned ACE model warm. The operator reaches it over an SSH tunnel; no public renderer port, database credential or provider key is sent to the GPU. One global capacity lock covers this rental and the existing generation queue. Fresh user/session/sequence seeds and the two-track preparation bound remain unchanged.

The worker validates request identity, pinned revisions, duration, byte count and audio SHA before delivery. Its in-memory last-result cache handles a repeated identical request without generating it again. Earlier consumed leases, changed requests, the absolute deadline and exhausted model-call allowance are rejected. Model calls include hook candidates in the eight-request cap. Model initialization, idle GPU time and unacknowledged failures remain operator costs; only an acknowledged metered compute slice reaches a test wallet. This is not a claim of final provider-invoice reconciliation or a production price.

A job can complete while the rental remains warm. Stop, expired client/worker heartbeat, budget or absolute deadline closes dispatch. Failed or unacknowledged jobs stay held until complete provider inventory proves the rental absent, then refund. Settlement retries do not charge twice, including a crash after shutdown proof. The existing provider watchdog remains independent of the customer dispatcher. Production always-on supervision and multi-hour uptime remain unqualified.

Migration 0026 adds the warm rental ledger and per-batch compute/vocal metadata. Applied to the verified Neon target after a private PostgreSQL 18 backup; repeat application is empty and existing row counts are preserved. The initial version-16 backup tool refused the server version before any migration ran.

## Timing and vocals

Low-frequency attacks are checked across three independent windows. A stable tempo/phase with at least 80% supported beats in every window can supply short measured handoff regions; eight consecutive supported attacks bound each region. Four-beat handoffs have at most 2% tempo adjustment and a real bass exchange. Human-reviewed eight-bar phrases retain their existing separate path. Uncertain timing keeps a short handoff without automatic FX. Neither these measurements nor energy changes establish downbeats, phrase meaning or expert decisions.

The accepted earlier clips 1 and 3 measure 128 BPM; clip 2 remains uncertain and uses the fallback. Hash-bound numerical results are retained. This is a development measurement, not a held-out quality score. Reproduce from `apps/site` with `node --import tsx scripts/dj-grid-audit.ts <canonical track.wav> ...`.

The sparse vocal candidate uses one project-authored two-word phrase on sequence 2 and then every fifth track, only with vocals enabled and energy at least 3. It generates a separate 10-second candidate, crops/fades a maximum two-second phrase and inserts it near 30 seconds over measured timing. Instrumental edges remain untouched. The listener can disable future vocals; closing energy suppresses new hooks. Candidate isolation, word intelligibility and musical quality still need listening review.

Alternating eligible phrases can repeat twice through the actual Web Audio deck. The player independently measures the decoded, hash-verified audio and requires matching tempo/phase plus uninterrupted attacks around the hook. It cancels/replans a future handoff around the loop, resumes after the phrase and uses the same source clock for the visible pad/deck event. It does not animate a fake gesture or add random periodic tricks. Missed/uncertain timing means no loop.

## Validation

| Gate | Status / evidence |
|---|---|
| Session, receipt, measured-grid and vocal cue tests | PASS: 24 checks, disposable PostgreSQL included |
| Existing wallet/product queue regression | PASS: 42 checks |
| General site unit tests | PASS: 120 checks |
| Python worker, request cap/idempotence, vocal bounds and budget guards | PASS: 28 checks total |
| Typecheck, production build and client secret/bundle audit | PASS |
| Chromium deck performance | PASS: actual PCM changes for vocal repeat and existing pads/effects; no speaker output |
| Chromium Autopilot regression | PASS: reviewed transition, bass movement, pause/resume, takeover and offline exhaustion |
| Real R2 customer regression | PASS: Public/Private, energy, Stop, upload interruption/reload/retry, playback and cleanup; procedural local sources, not the new GPU adapter |
| Desktop/mobile rendered checks | PASS: existing 1440px deck and 390px saved-set layouts, no overflow/errors, scoped accessibility, screenshots inspected |
| Two users on the actual warm GPU adapter | NOT RUN: prepared, fresh capped approval received; execution pending |
| New vocal/transition listening and physical venue / multi-hour runtime | NOT RUN |

[Retained evidence](evidence/ai-dj-warm-20261024/). Browser plugin runtime tooling was unavailable; existing authorized Playwright fallback was used. Chromium screenshots remain in ignored `renders/ai-dj-pipeline-20261024/regression/` and `renders/ai-dj-stream-flow-20261024/`. WebKit was not rerun for this increment. No release or learned-policy promotion is implied.

## Prepared operator execution

The exact caps and source hashes are in [qualification-plan.json](evidence/ai-dj-warm-20261024/qualification-plan.json). The owner's fresh approval is recorded in `authorization.json`; no earlier allowance is reused. The separate `vast_trial.py --dj-qualification --dj-sessions` profile cannot reuse the completed trial or retry approval. It starts the existing independent debit/deadline watchdog before rental creation.

After an authorized rental, upload only the pinned setup/renderer scripts and a fresh mode-0600 renderer token, then run `cloud_dj_warm.sh <absolute authorized deadline>` and forward localhost port 8768 over the instance-specific SSH connection. Prepare a mode-0600 warm permit with the verified account/instance/label, approval SHA, quoted hourly ceiling, $6 cap and integer-millisecond original start/deadline. The renderer allows eight model calls and the dispatcher stops on failure.

`apps/site/tests/dj-warm-qualification.mjs --apply` uses two isolated local test accounts/databases, the real loopback renderer and actual private R2 recording storage. It checks six distinct songs, future energy changes, one user stopping and the other exhausting credits, saves both mixed recordings locally for review, then removes its R2 test objects and confirms GPU shutdown. Authentication is injected in this test; this does not qualify hosted login or authorize live sales.

The general internal consumer is `apps/site/scripts/dj-warm-worker.ts`; `--register` consumes a permit once and stores its private identity, subsequent runs resume that identity. It requires the exact database target confirmation and operator files. Run the independent `dj-watchdog.ts --apply --warm` supervisor as well as the provider watchdog; the command can inspect/destroy/reconcile only and cannot rent GPUs. No production daemon or public feature flag was enabled.
