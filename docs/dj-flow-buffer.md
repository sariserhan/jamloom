# Incremental raw archives and two-track-buffer qualification

**PASS local archive, authorization and failure tests; PASS local replay; FAIL fresh qualification; PASS cleanup.** The authorized attempt stopped on the first raw transfer. One playable original survives, but no raw archive or fresh two-track playback was completed. The permit is consumed; no replacement is authorized.

## Archive correction

Each raw model output is now transferred immediately after its playable master. The filename, size and SHA-256 are validated; only a complete matching temporary file is atomically published. A failed or timed-out transfer removes only that temporary file and preserves earlier verified raw audio and the new playable master. No recursive end-of-run archive or implicit retry remains for model studies. The flow's measured request time includes generation, playable delivery and raw archiving: at most 120 seconds for the first cold request and thirty seconds for every warm request. Cleanup remains independently bounded by the campaign watchdog.

The paid attempt used a separate SCP connection for each raw. Its first transfer exited 255; stderr was not retained, so the precise transport cause is unknown. The follow-up local fix downloads the latest verified raw through the existing authenticated renderer tunnel. Only the exact current sequence/hash is accepted, with size/hash checks on both ends and no file listing or arbitrary path access. Final archiving remains available after the generation allowance is exhausted, until the existing absolute deadline. This removes the separate raw-transfer SSH connection; remote throughput is still unverified.

## Exact startup and ongoing delivery

After exactly two tracks and their raw files are verified, the controller starts the actual muted browser mixer. It waits for a receipt containing the matching two hashes, session and actual playing state before beginning track three. Remaining requests start on a thirty-second cadence. A premature playback exit stops further requests; archive or cadence failure ends the attempt and deletes the GPU. The GPU is deleted after generation, before waiting for the final playback recording. The controller verifies the completed recording's source hashes as well as subprocess success.

The playback harness no longer loads unrelated old default fixtures in flow mode. It asserts a two-track startup, twelve ordered unique tracks, no early stop/error/pause, non-clipped output and a single final stop. Receipt timestamps expose both producer availability and consumer waits. The accepted long-intro correction and selective overlap/bass handoff are bound into the new plan by hashes.

## Verification

- 67 Python checks after the HTTP correction: four archive/startup cases, fifteen controller cases, thirteen model-study cases, six warm-engine cases and twenty-nine Vast cleanup/budget cases. The HTTP integration covers authentication, wrong/stale references, corruption, missing files, expiration and archiving the final allowed output.
- An existing 23,040,088-byte raw passed an actual local authenticated HTTP transfer and hash verification in 0.034 seconds. This is a local transport check, not remote throughput or fresh generation. [Evidence](evidence/dj-flow-buffer-20261026/http-archive-check.json).
- Free fault injection: two short retained clips followed by a missing third delivery. The real mixer capture is rejected promptly, rather than waiting the full recording timeout. [Result](evidence/dj-flow-buffer-20261026/failure-check.json).
- Free full rehearsal: twelve existing verified masters, exactly two initially available, then a deliberately delayed delivery at 28 seconds on each thirty-second cadence. This is retained audio, not a fresh-generation benchmark. The rehearsal passed: 507.12 seconds, all twelve tracks, no error/pause/early stop, peak 0.3732; largest consumer wait 0.021 seconds. [Playback](evidence/dj-flow-buffer-20261026/local-replay.json), [startup](evidence/dj-flow-buffer-20261026/local-startup.json).

## Consumed paid attempt

The [approved plan](evidence/dj-flow-buffer-20261026/gpu-plan.json) retains the exact owner statement and executed hashes as historical evidence. Its scope was twelve new sixty-second preferred-turbo outputs, with distinct brief musical hooks on tracks three and eight; maximum $3 total, one GPU, forty minutes, stop on failure, automatic cleanup, no replacement and no public activation.

Instance `57793043` was deleted after 421.72 seconds. The first playable track and executed-worker provenance verified; cold generation took 83.064 seconds. Raw transfer failed before playback began. A separate account check confirmed zero rentals and an observed debit of $0.064502. Provider billing may settle later. [Incident](evidence/dj-flow-buffer-20261026/incident.json), [original result](evidence/dj-flow-buffer-20261026/gpu-result.json), [cleanup](evidence/dj-flow-buffer-20261026/cleanup-check.json).

Historical command (already consumed; do not rerun):

```sh
PATH=/opt/homebrew/opt/node@22/bin:$PATH .venv-analysis/bin/python scripts/dj_sample_trial.py --flow-study
```

The controller launches playback itself; do not start a separate manual player. Its state refuses another attempt, and the preserved approval hashes reject the post-failure code changes. A new hosted qualification requires a newly prepared plan and explicit capped approval. No additional rental was started.

A passing bounded one-listener run will not establish unlimited hosting, multiple listeners, professional musical quality or public release. R2, credit and release checks are separate. This task changes research tooling, not customer billing or public activation.
