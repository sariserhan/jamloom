# AI DJ hosted-operation qualification — 2026-10-25

**PASS session operation, privacy and recovered cleanup; PARTIAL musical acceptance.** The owner accepted the proposed $6 maximum, one GPU, 40-minute qualification with “finish it.” The immutable [authorization](evidence/ai-dj-hosted-20261025/authorization.json) belongs to this new campaign only. Stop on failure, no replacement rental, automatic cleanup, no public activation or live billing.

## Scope and changes

This uses a real Vast.ai GPU and real R2 recordings, with two isolated listener accounts, local PostgreSQL/API handling, the existing browser deck and the actual standalone dispatcher. It qualifies the bounded hosted-GPU path. It does not move the controller off the Mac or establish an always-on production service.

The standalone worker and watchdog now select the same test allowance mode as the beta API. Existing settlement already follows each reservation's stored charge metadata; this alignment does not assert that historical charges were wrong or alter old ledger entries. The idle dispatcher checks renderer readiness when queued work exists, allowing prepared music to finish after the renderer's bounded request allowance has been consumed.

A test-only preload kills the actual dispatcher process with SIGKILL immediately after it receives a completed render, before acknowledging delivery. Its replacement resumes the stored worker identity and job lease. The qualification requires the same complete receipt, engine identity, audio hash and original deadline, without a second model generation or customer charge. The injection is restricted to isolated local test database names and is never loaded by the application.

The regression is included in the existing CI database lane. Local testing passes 29 Python rental-bound tests, 24 dispatcher/session/renderer checks and the final 34-check session/allowance/process suite, including an actual separate-process restart. New paid compute is not required for these regressions.

## Reproduction

From the repository root, run `python3 -m unittest discover -s tests -p test_vast_trial.py`. From `apps/site`, use Node 22 and run:

```sh
JAMLOOM_TEST_DATABASE_URL=postgresql://127.0.0.1:5432/postgres npm run test:ai-dj-sessions
```

The process test owns loopback port 8768 and refuses non-local database targets. Do not run it against the tunnel of an active rental.

The paid campaign uses `scripts/vast_trial.py` with `--dj-qualification --dj-sessions --dj-beta --dj-hosted` and `tests/dj-warm-qualification.mjs --apply --beta --hosted`. These commands require the campaign's private permit/token and an unconsumed authorization; they are not permission to repeat the rental. The independent provider watchdog starts before creation, and both the GPU process and operator permit retain the same absolute deadline. Local watchdog/network availability can affect deletion latency; this is not a provider-enforced spending cap.

## Evidence boundaries

Unit tests and signal screening do not establish human musical acceptance. The first-user trial and mobile release checks remain skipped. Continuous-host operation, venue evidence and public activation remain outside this bounded campaign.

## Executed result

- **PASS:** twenty fresh 60-second tracks, twenty distinct seeds and audio hashes; ten per listener. Bright/deep initial directions and the later warm/energy-5 update appear in immutable batch receipts. No vocals were inserted in this batch.
- **PASS:** actual dispatcher SIGKILL after a completed GPU response, followed by recovery in approximately 1.1 seconds with the identical full receipt, engine, job and original deadline. This restarts the controller process, not the GPU model process.
- **PASS:** a third Start is refused without spending/reserving credits. The public listener stops independently; the private listener exhausts its test credits and finishes its prepared music. Both release all outstanding reservations.
- **PASS:** named R2 captures fully decode to 384.530 and 508.279 seconds, within 19 ms of their recorded durations. Wrong-account playback fails; anonymous private playback fails; public playback succeeds. Both temporary objects return 404 after deletion.
- **PARTIAL signal/quality screening:** public longest near-silence is 0.257 seconds. The private capture exceeds the conservative 0.75-second screen with 1.103 seconds near 3:44. The original fifth private track at actual playback gain contains the corresponding 1.057-second quiet passage; it is about 15 seconds inside the track, far from either transition. This is source music, not evidence of a transport gap. Preserve the failed broad screen and flag the passage for human review; do not silently cut or regenerate it. No long quiet transition was identified.
- **PASS resource bounds:** 210 browser samples, at most two active audio sources and 76.1 MiB browser heap. Harness RSS peaks at 278.9 MiB; the whole harness/browser process tree peaks at 1.32 GiB and 84.5% summed sampled CPU. These are 52 process samples, not a profiling trace or production-host sizing guarantee.
- **PASS bounded cost/shutdown:** GPU rental lasted 19m32s, including approximately 10m44s startup. Model render time was 1.604–6.979 seconds per track, p95 4.016 seconds. Observed provider charge **$0.169**; final invoice remains unverified. Complete provider inventory is empty. No replacement rental or deadline extension occurred.

**Initial automatic cleanup FAIL, recovery PASS:** the harness purged both listener sessions and R2 captures, then incorrectly called the guarded purge on the unsuspended third-account fixture. The GPU had already been deleted. Suspended that isolated fixture, exercised the same purge successfully and dropped the isolated database; original nonzero exit and failure log are retained. The harness now suspends all three fixtures before purge and includes the successful access/deletion assertions directly. This corrected teardown was verified against the leftover isolated fixture; the entire paid campaign was not rerun.

[Checks](evidence/ai-dj-hosted-20261025/checks.json), [crash proof](evidence/ai-dj-hosted-20261025/process-recovery.json), [privacy](evidence/ai-dj-hosted-20261025/privacy.json), [captures](evidence/ai-dj-hosted-20261025/captures.json), [quiet-passage source comparison](evidence/ai-dj-hosted-20261025/quiet-passage-diagnostic.json), [cleanup](evidence/ai-dj-hosted-20261025/cleanup.json), [observed cost](evidence/ai-dj-hosted-20261025/provider-cost.json).

## Listening and reproduction

Listen at <http://localhost:8766/hosted-sessions/review/>. Twenty hash-verified, level-matched clips and both original captures are retained locally; no customer recording was published. The full-set players now use finalized MP3 listening copies, with original captures preserved. This review has no autoplay. Run `python3 scripts/review_serve.py` for byte-range playback on loopback port 8766. Both full-set players now pass duration, Play/Pause and seeking checks in Chromium and WebKit; the earlier start-only check missed Chromium reporting infinite duration for the raw WebM. New human acceptance remains **NOT RUN**.

From `apps/site`, `node --import tsx tests/dj-padding-analysis.mjs --hosted` reproduces source analysis and planned transition positions without GPU use. From the root, `python3 scripts/review_dj_warm.py --beta --hosted` builds the review into a new folder and refuses overwriting existing review files. Full recording decode/signal screening uses `ffmpeg -nostdin -hide_banner -xerror -i RECORDING -af silencedetect=noise=-60dB:d=0.25,volumedetect -progress pipe:1 -f null -`; both decode logs and hashes are retained.

The bounded operator qualification is completed with the documented cleanup correction and source-quality caveat. Always-on hosting, production controller/GPU restart, new expert listening, venue acceptance and public beta activation remain unqualified. No live billing or beta flag was enabled.

## Publication

**PASS:** code `d21a640a` was pushed through GitHub and deployed READY to production. All eight GitHub jobs passed, including the new isolated dispatcher regression in the database lane. Read-only production checks confirm Community and real public song audio remain available, private account APIs require sign-in, and the AI DJ session API remains disabled (503). [Release receipt](evidence/ai-dj-hosted-20261025/release.json), [live checks](evidence/ai-dj-hosted-20261025/production-checks.json). No mobile installation or release submission occurred.
