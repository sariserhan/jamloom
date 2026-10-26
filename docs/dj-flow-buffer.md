# Incremental raw archives and two-track-buffer qualification

**PASS local archive, authorization and failure tests; PASS local replay; paid run NOT AUTHORIZED.** This follows the consumed twelve-track campaign whose final archive transfer failed. Its recordings and failure evidence remain intact.

## Archive correction

Each raw model output is now transferred immediately after its playable master. The filename, size and SHA-256 are validated; only a complete matching temporary file is atomically published. A failed or timed-out transfer removes only that temporary file and preserves earlier verified raw audio and the new playable master. No recursive end-of-run archive or implicit retry remains for model studies. The flow's measured request time includes generation, playable delivery and raw archiving: at most 120 seconds for the first cold request and thirty seconds for every warm request. Cleanup remains independently bounded by the campaign watchdog.

## Exact startup and ongoing delivery

After exactly two tracks and their raw files are verified, the controller starts the actual muted browser mixer. It waits for a receipt containing the matching two hashes, session and actual playing state before beginning track three. Remaining requests start on a thirty-second cadence. A premature playback exit stops further requests; archive or cadence failure ends the attempt and deletes the GPU. The GPU is deleted after generation, before waiting for the final playback recording. The controller verifies the completed recording's source hashes as well as subprocess success.

The playback harness no longer loads unrelated old default fixtures in flow mode. It asserts a two-track startup, twelve ordered unique tracks, no early stop/error/pause, non-clipped output and a single final stop. Receipt timestamps expose both producer availability and consumer waits. The accepted long-intro correction and selective overlap/bass handoff are bound into the new plan by hashes.

## Verification

- 66 Python checks: four archive/startup cases, fifteen controller cases, thirteen model-study cases, five warm-engine cases and twenty-nine Vast cleanup/budget cases.
- Free fault injection: two short retained clips followed by a missing third delivery. The real mixer capture is rejected promptly, rather than waiting the full recording timeout. [Result](evidence/dj-flow-buffer-20261026/failure-check.json).
- Free full rehearsal: twelve existing verified masters, exactly two initially available, then a deliberately delayed delivery at 28 seconds on each thirty-second cadence. This is retained audio, not a fresh-generation benchmark. The rehearsal passed: 507.12 seconds, all twelve tracks, no error/pause/early stop, peak 0.3732; largest consumer wait 0.021 seconds. [Playback](evidence/dj-flow-buffer-20261026/local-replay.json), [startup](evidence/dj-flow-buffer-20261026/local-startup.json).

## Prepared paid scope

The [new plan](evidence/dj-flow-buffer-20261026/gpu-plan.json) is PREPARED, not authorized. Twelve new sixty-second preferred-turbo outputs use fresh seeds and a fresh session; tracks three and eight request distinct brief musical hooks. Maximum $3 total, one GPU, forty minutes, twelve requests, stop on failure, automatic shutdown/cleanup, no replacement and no public activation. The previous campaign cannot authorize this one.

After explicit approval, run from the repository with Node 22 on PATH:

```sh
PATH=/opt/homebrew/opt/node@22/bin:$PATH .venv-analysis/bin/python scripts/dj_sample_trial.py --flow-study
```

The controller now launches playback itself; do not start a separate manual player. The original campaign's command is historical, and its permit remains consumed.

A passing bounded one-listener run will not establish unlimited hosting, multiple listeners, professional musical quality or public release. R2, credit and release checks are separate. This task changes research tooling, not customer billing or public activation.
