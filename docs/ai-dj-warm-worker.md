# Warm AI DJ worker, measured timing and short vocals — 2026-10-24

**PASS two-user GPU/session/R2 qualification; PARTIAL musical performance.** The approved replacement delivered six distinct 60-second tracks with fresh seeds, future energy updates, Stop and credit exhaustion, and two complete Public/Private R2 recordings (152.096 / 176.109 seconds). Test accounts, objects and database were removed; complete rental inventory is empty. Observed combined debit $0.099958 within $6, 1,037 cumulative rental seconds within 2,400; final invoice unverified. All six tracks failed the strict measured-grid gate, so the player used conservative fades and inserted no vocals or loops. New listening, precise beat transitions, vocal quality, multi-hour and venue qualification remain open. No push, deployment, public activation or live billing. This is inference and a deterministic timing policy, not newly trained expert DJ intelligence.

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
| Python worker, request cap/idempotence, vocal bounds and budget guards | PASS: 29 checks total |
| Typecheck, production build and client secret/bundle audit | PASS |
| Chromium deck performance | PASS: actual PCM changes for vocal repeat and existing pads/effects; no speaker output |
| Chromium Autopilot regression | PASS: reviewed transition, bass movement, pause/resume, takeover and offline exhaustion |
| Real R2 customer regression | PASS: Public/Private, energy, Stop, upload interruption/reload/retry, playback and cleanup; procedural local sources, not the new GPU adapter |
| Desktop/mobile rendered checks | PASS: existing 1440px deck and 390px saved-set layouts, no overflow/errors, scoped accessibility, screenshots inspected |
| Two users on the actual warm GPU adapter | PASS: six distinct tracks/seeds, future energy updates, Stop/credits, Public/Private R2 recording and full cleanup |
| Fresh-track measured handoffs and vocal loops | NOT QUALIFIED: all six grids rejected; conservative fades, zero inserted vocal cues |
| New vocal/transition listening and physical venue / multi-hour runtime | NOT RUN |

[Retained evidence](evidence/ai-dj-warm-20261024/). Browser plugin runtime tooling was unavailable; existing authorized Playwright fallback was used. Chromium screenshots remain in ignored `renders/ai-dj-pipeline-20261024/regression/` and `renders/ai-dj-stream-flow-20261024/`. WebKit was not rerun for this increment. No release or learned-policy promotion is implied.

## Prepared operator execution

The exact caps and source hashes are in [qualification-plan.json](evidence/ai-dj-warm-20261024/qualification-plan.json). The owner's fresh approval is recorded in `authorization.json`; no earlier allowance is reused. The separate `vast_trial.py --dj-qualification --dj-sessions` profile cannot reuse the completed trial or retry approval. It starts the existing independent debit/deadline watchdog before rental creation.

After an authorized rental, upload only the pinned setup/renderer scripts and a fresh mode-0600 renderer token, then run `cloud_dj_warm.sh <absolute authorized deadline>` and forward localhost port 8768 over the instance-specific SSH connection. Prepare a mode-0600 warm permit with the verified account/instance/label, approval SHA, quoted hourly ceiling, $6 cap and integer-millisecond original start/deadline. The renderer allows eight model calls and the dispatcher stops on failure.

`apps/site/tests/dj-warm-qualification.mjs --apply` uses two isolated local test accounts/databases, the real loopback renderer and actual private R2 recording storage. It checks six distinct songs, future energy changes, one user stopping and the other exhausting credits, saves both mixed recordings locally for review, then removes its R2 test objects and confirms GPU shutdown. Authentication is injected in this test; this does not qualify hosted login or authorize live sales.

The general internal consumer is `apps/site/scripts/dj-warm-worker.ts`; `--register` consumes a permit once and stores its private identity, subsequent runs resume that identity. It requires the exact database target confirmation and operator files. Run the independent `dj-watchdog.ts --apply --warm` supervisor as well as the provider watchdog; the command can inspect/destroy/reconcile only and cannot rent GPUs. No production daemon or public feature flag was enabled.

## Hosted attempt and local provider correction

The pinned GPU model initialized and all three weight-file hashes matched the earlier accepted trial. Customer dispatch then failed before its first request: the provider account endpoint responded with HTTP 301 to add a trailing slash, and the Node adapter's `redirect:error` policy rejected it. The Python rental controller uses the canonical redirect, so setup itself succeeded. The rental was shut down immediately; complete inventory is empty. Zero generated tracks and zero R2 recording objects. Observed debit is $0.045873, not a final invoice; confirmed rental time is 547 seconds.

The adapter now constructs canonical slash-terminated URLs, including paths with query parameters, while preserving redirect rejection and credential protection. Unit tests and a real read-only Node account/complete-inventory request pass. Endpoint behavior was checked against the [official Vast CLI documentation](https://github.com/vast-ai/vast-cli/blob/master/vastai/SKILL.md) and the actual 301/200 responses. No rental was used for the fix verification.

[Replacement plan](evidence/ai-dj-warm-20261024/retry-plan.json): one new worker, the same six tracks / at most two hook candidates, original $6 total including the failed attempt and 1,853 remaining cumulative rental seconds. The owner explicitly approved this replacement in [retry-authorization.json](evidence/ai-dj-warm-20261024/retry-authorization.json). The controller retains the original credit anchor and cumulative rental deadline. A free two-user rehearsal caught a recording-duration check that ended at generation shutdown rather than the last prepared track; the guard now permits the acknowledged final track and bounded vocal repeat, capped by elapsed wall time. Storage regression passes; the repeated full rehearsal passes both real R2 saves, visibility, Stop/credit endings, held-credit settlement and cleanup. The approved replacement has completed; results follow.

## Completed replacement

[Execution and cost](evidence/ai-dj-warm-20261024/retry/execution.json), [session results and exact receipts](evidence/ai-dj-warm-20261024/retry/result.json), [cleanup](evidence/ai-dj-warm-20261024/retry/cleanup.json), [measured grids](evidence/ai-dj-warm-20261024/retry/measured-grids.json), [recording media](evidence/ai-dj-warm-20261024/retry/recording-media.json).

The three pinned weight hashes match the previously accepted trial. Both sessions received three independently seeded, hash-distinct 60-second tracks. First four jobs took 1.976–3.806 seconds; the two timing-checked eligible jobs took 12.535 / 13.037 seconds. Both requested higher energy for sequence 2. Python timing validation rejected both insertion grids before generating a hook; six model song requests, no inserted vocals. The browser independently rejected measured grids for all six files, preserving fallback fades. Technical continuity is not proof of expert musical phrasing.

Both actual private R2 objects were verified and downloaded, then deleted with their disposable users and database. Public Stop produced 152.096 seconds; private exhausted credits produced 176.109 seconds. Both have non-silent decoded audio and true peaks below -7 dBTP. No held credits remain. The GPU was destroyed once all six tracks were retained while playback finished locally; complete provider inventory is empty. Authentication is injected and credits are test credits; hosted login, live pricing and production capacity remain unqualified. Disconnect/in-flight shutdown evidence remains the local regression suite rather than a third paid scenario.

The free rehearsal exposed a final-save bug: `ended_at` describes generation settlement, which can precede the final prepared track. The seal guard now bounds duration by the acknowledged last 60-second track plus its at-most-four-second repeat, also enforcing elapsed wall time. Nine storage tests, a repeated two-user synthetic rehearsal and the real GPU/R2 flow pass. This bound is not a qualification of indefinitely extended manual loops.

Six level-matched clips and both mixes are available at [the local review page](http://localhost:8766/warm-sessions/review/). `scripts/review_dj_warm.py` reproduces hash/PCM/level checks and exports only audio and HTML, never worker identities. Chromium desktop/mobile review layout passes with no overflow, console errors or autoplay. Audio and screenshots stay in ignored `renders/`; numerical evidence is committed. Human listening remains NOT RUN for this new batch. No new model training, push/deployment or public activation occurred.
