# AI DJ completion campaign — 2026-10-25

**PARTIAL implementation; FAIL musical recovery after owner review on 2026-10-26.** The owner requested the remaining music, vocals, performance, hosting and release work together. This is not approval to declare failed music acceptable, reuse consumed rental permits, activate live billing or publish the product.

## Latest follow-through — 2026-10-26

A [separate-singing candidate](dj-isolated-singing.md) now preserves the instrumental and selects quiet-bounded short phrases. Its approved run stopped after the first raw candidate hit the level guard; no mixed hook passed. The owner heard singing but rated it unnatural or unclear. The GPU is deleted; provider-specific observed charges are $0.072. 81 final local checks pass, including a corrected pre-export normalization setting and failure diagnostics, but those corrections have no new GPU qualification. Natural singing remains FAIL; no replacement is authorized.

The subsequent [planner comparison](dj-planner-comparison.md) favors semantic planning in both matched house/bass pairs, with fresh house preferred to fresh bass. This is relative preference, not consistency or release acceptance. The [spoken-hook audition](dj-spoken-hooks.md) failed the natural musical-vocal target; the owner requested Music DNA-style singing. A [bounded sung-edit comparison](dj-sung-hooks.md) completed technically after an independently verified package repair and separately approved replacement: four edits, $0.112580 total observed debit and zero rentals. Owner rejected all four for no audible singing; clip 1 also loses accompaniment. The new continuity guard rejects that retained failure, but natural singing remains unsolved. A subsequent [mode-isolation comparison](dj-vocal-mode.md) ended after its first candidate failed audio validation; the remaining three calls were not run. Both attempts total about $0.040 observed debit with zero rentals; no vocal improvement is established. [Session response recovery](dj-session-recovery.md) now passes a real-browser lost-response/private-recording check. Serving, live billing and publication remain held.

## Music recovery

The six guided-set tracks are rejected. Keep the accepted short vocal repeat, echo and combined treatment unchanged. The earlier composition-study clip 2 remains the comparison anchor, not a qualified general generator.

Local diagnosis verifies that the first three rejected tracks have the exact same caption, tempo, energy and mood as the preferred sample. Removing their explicit default beat does not change guide events. The random seed changes both composition notes and model noise, so the previous consistency test cannot distinguish those effects. The retained measurements show less midrange/presence and stereo side energy in the rejected tracks, but these are not validated quality predictors. [Diagnosis](evidence/dj-recovery-20261025/regression.json).

The approved [recovery plan](evidence/dj-recovery-20261025/gpu-plan.json) isolates the two factors. Four instrumentals cross model seeds 301025/311025 with guide seeds 301025/311025; two further requests use new model seeds with the preferred guide and allow a brief original vocal. No reference audio, extracted stems or reference-derived model weights enter this study. This uses an already authored Jamloom score as a diagnostic fixture, not a proposal to repeat that composition for every customer.

Bounds: six 60-second outputs, at most two 10-second voice candidates, eight model calls total, $3 total, one GPU, 20 minutes, stop on failure, independent cleanup, no public activation. The owner explicitly approved “Approve the capped $3 recovery study”. The guide request and score hash are separate from the model request. The first rental stopped during startup before rendering any tracks; it was deleted after 158.46 seconds with $0.00908 observed debit. An independent inventory confirms zero remaining rentals. The old probe did not retain enough information to distinguish renderer exit from SSH transport failure; no exact cause is claimed. The revised probe records classified outcomes, tolerates at most two consecutive transient SSH failures, and stops immediately on any renderer exit. The owner approved one replacement within the original $3 total cap and 1,041 seconds remaining; it completed six tracks and was deleted after 489.24 seconds. [Failure](evidence/dj-recovery-20261025/first-failure.json), [replacement bounds](evidence/dj-recovery-20261025/replacement-plan.json). [Verification](evidence/dj-recovery-20261025/audio-checks.json) confirms six unique, complete 60-second WAVs, pinned executed scripts, byte-identical guides within each composition group and different guides between groups. The preferred baseline is reproduced byte-for-byte. This is a reproducibility check, not an improvement claim; accepting only the replay would leave consistency unresolved. The new [blinded listening page](http://localhost:8766/recovery-originals/review/) passes muted Chromium/WebKit play/seek, one-at-a-time playback and mobile layout checks. Owner ratings are now recorded below.

Neither vocal opportunity produced a placed hook. Both retained outputs also fail the unchanged local steady-grid check; the worker checks timing before generating a voice. The receipt does not record whether an unplaced candidate was rendered, so do not claim two fresh voices were generated or audited. [Vocal timing evidence](evidence/dj-recovery-20261025/vocal-grid-checks.json). Existing accepted effects remain unchanged; fresh vocal qualification remains FAIL.

[Accounting](evidence/dj-recovery-20261025/costs.json): both attempts total 647.70 seconds, approximately **$0.05960 observed debit including the failed attempt**, and zero remaining rentals confirmed independently. The six render timings total 20.45 seconds; this excludes startup, guide preparation, analysis, transport and cleanup and must not be used alone to price the service. Observed debit is not a settled invoice. The authorization is consumed; no additional rental is permitted under it.

## Owner review — 2026-10-26

**FAIL musical recovery.** The owner said: “they are all bad but 2 is just okay”. All six raw and listening-copy hashes were verified before unblinding. [Owner feedback](evidence/dj-recovery-20261025/owner-feedback.json).

| Listening clip | Model seed | Guide seed | Owner result |
|---|---|---|---|
| 1 | 301025 | 311025 | FAIL — bad |
| 2 | 301025 | 301025 | PARTIAL — just okay |
| 3 | 311025 | 311025 | FAIL — bad |
| 4 | 311025 | 301025 | FAIL — bad |
| 5 | 313025 | 301025 | FAIL — bad |
| 6 | 312025 | 301025 | FAIL — bad |

Clip 2 is the exact raw WAV previously preferred in the composition comparison. Its earlier preference is preserved as historical evidence; the current rating is only okay, not party-ready approval. Changing the model seed while retaining that guide failed for all three alternatives tested. Changing the guide with the preferred model seed also failed. This small study does not identify a universal failure cause, but it demonstrates no accepted improvement or reliable generation recipe.

Do not promote the recovery batch or treat another seed sweep as a supported quality fix. Revise the composition/sound-generation approach and define an audible hypothesis before preparing another paid comparison. The existing accepted vocal effects remain accepted; fresh voices remain unqualified. This reply does not rate the full mix, so full-set listening remains NOT RUN. No additional compute or activation is authorized by this feedback.

## Operator implementation

The session API, dispatcher, watchdog and readiness command now share `JAMLOOM_AI_DJ_BILLING_MODE`, defaulting to `test`. Selecting `live` additionally requires `CREDIT_BILLING_MODE=live`. A live worker permit must explicitly contain `billingLive: true`; historical permits without this field remain test-only. Resume checks verify the recorded mode. The example environment files document disabled/test defaults. No actual environment values, purchases or live wallets were changed.

The new `/api/ai-dj/supervisor` endpoint is prepared for the existing website scheduler. It requires the cron secret, `JAMLOOM_DJ_SUPERVISOR_ENABLED=true`, the exact `JAMLOOM_WATCHDOG_TARGET`, storage/budget/provider configuration and a production deployment when running on Vercel. It remains reachable during the launch/maintenance hold, but unauthorized callers cannot inspect or mutate state. It checks both ledgers so switching the operator mode cannot orphan an older registered rental.

A transaction-scoped advisory lock serializes overlapping cron calls and releases on failure. The existing worker reconciliation confirms rental identity, requests deletion, confirms absence on a subsequent pass, then settles/refunds unfinished work. Identity conflicts and pending deletion return 503; sensitive exceptions are not returned. The adapter has no rental-creation capability. This is an additional cleanup mechanism for **registered** workers, not a replacement for the independent pre-rental watchdog, a guaranteed spending cutoff or proof of uninterrupted playback.

The one-minute schedule is prepared in `vercel.json`; deployment and enablement have not occurred. Provider scheduling may be late or duplicated, so cleanup remains idempotent and lock-protected. Existing provider checks retain bounded network timeouts. [Official scheduling/security guidance](https://vercel.com/docs/cron-jobs/manage-cron-jobs). Context7 was unavailable; the installed Next route-handler guide and the official scheduler documentation were consulted.

A DJ-only cached image recipe is prepared in `services/ai-dj/Dockerfile`, using the existing pinned upstream code, lockfile and model revisions. It includes only the turbo generator, embedding model and VAE, explicit worker sources and a restrictive build context; it starts no listener automatically. One static packaging check passes. **Image build, size, GPU compatibility and cold startup are NOT RUN**. Avoiding downloads on every rental is the intended improvement, not a measured result. No image was built or published and no model files were downloaded to this Mac.

## Local verification

**PASS:** 62 Python tests plus one image-boundary test, 148 website tests, 36 isolated session/allowance/process tests, typecheck, optimized build and bundle audit. Website checks were rerun with Node 22.23.1. Both test/live ledger modes recover from a killed dispatcher with one generation and one allowance capture. Hosted-supervisor tests exercise authorization, target checks, overlapping-call suppression, failure cleanup, stale heartbeat, deletion and refund only after confirmed absence. Anonymous local requests return 503 while the supervisor is disabled; its nested fake path returns 404. The configured read-only runtime reports test billing, held capacity, zero listeners and no registered workers/jobs. These are local checks, not hosted execution or live purchase evidence.

## Complete-set capture

The real browser DJ engine played all six study outputs into a retained **5:26.34** recording and stopped cleanly. It executed three automatic gestures: a filter sweep, one-beat roll and echo. The published set passes Chromium/WebKit playback, seek and mobile layout checks. PCM peak/RMS checks pass; FFmpeg detected no silence lasting 250 ms or more below -60 dB. These checks do not prove that the transitions sound musical or that the deck movements are appropriate. [Capture](evidence/dj-recovery-20261025/mix-capture.json), [audio checks](evidence/dj-recovery-20261025/mix-audio.json), [listen to the full set](http://localhost:8766/recovery-performance/review/). This is a recording of retained diagnostic tracks, not a continuous-generation qualification.

## Production qualification still required

| Gate | Current evidence | Exit requirement |
|---|---|---|
| Original music | Recovery rejected; later matched pairs favor semantic planning; no consistency acceptance | Fresh seeds and directions accepted as a complete musical result; no promotion based on signal statistics |
| Vocals | Existing treatments accepted; new spoken hooks rejected/only okay; Music DNA-style sung edits rejected: no audible singing; clip 1 dropout | Actual new, short, intelligible hooks accepted in music, with occasional restrained use |
| Performance | Audio-clock moves and manual cancellation pass; bounded mixes captured | Fresh complete sets accepted for musical handoffs, energy direction and restraint |
| Continuous service | Earlier bounded two-user checks exist; slower planned generator needs separate capacity qualification | Controller and independent supervisor on approved hosts; multi-hour GPU operation, model/host loss, recovery and complete recordings |
| Costs | Full-rental accounting and conservative utilization/retention scenarios exist | Actual startup/idle/failure costs and realistic utilization/retention policy support the customer tariff |
| Venue and release | Browser/device evidence is distinct from venue acceptance | Physical sound-system review, approved release and enablement, post-deployment authenticated/anonymous/privacy checks |

The existing renderer/permit limit remains 40 minutes and the prepared recovery study is only 20 minutes. Neither has been silently converted into an always-on rental. A longer hosted qualification needs a prepared capacity/budget policy and explicit spending authorization. The current two-listener limit is retained; there is no claim of unbounded concurrency or immediate cold startup.

## Reproduction

- Python: the existing vocal, warm-engine, composition, track-worker, sample-trial and Vast-trial suites. The recovery permit tests reject modified guide seeds, request counts, budgets and generic approval text.
- Site: `npm test`, `npm run typecheck`, `npm run build`; isolated `dj-sessions`, `dj-allowance` and `dj-worker-process` suites against loopback PostgreSQL. No provider mutation occurs in these tests.
- Approved recovery execution: `scripts/dj_sample_trial.py --recovery-study`; consumed authorization cannot be reused. After cleanup, `scripts/review_dj_composition.py --recovery-study --replacement` publishes local audio-only copies, and `tests/dj-listening-comparison.mjs --recovery-study --blind` checks playback/seek.
