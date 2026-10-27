# DNA-only worker startup smoke — 2026-10-27

## Result

- **PASS:** 16 worker-boundary tests; GitHub Actions image build; immutable image publication; update of the existing RunPod template while endpoint workers remained at 0/0; environment and container disk preserved.
- **FAIL:** One authorized startup Music DNA job. The worker initialized after 314 seconds, started the request, then failed after 59,148 ms with the sanitized stage `composing-exit-1`. No completed song or audio was accepted.
- **PASS:** Trial cleanup removed the staged object, dropped the disposable database, disabled the endpoint, and verified no active workers or queued/in-progress jobs.
- **PARTIAL:** Cost reconciliation. Configured timing records `delayTime=292206` ms and `executionTime=59148` ms; the run's conservative cost estimate was 372,000 micros ($0.372). RunPod billing queries returned empty records immediately before and after the run. The final charge is unconfirmed; the authorized hard cap was $1.
- **NOT RUN:** Retry, jazz/balance diagnostics, maximum-library run, broader genre/language checks, sustained AI DJ capacity, human listening, and full hosted qualification.

## Failure diagnosis

RunPod status returned only `Jamloom generation failed at composing-exit-1; no completed song was accepted.` The job logs endpoint returned HTTP 404, and the trial's temporary database was removed after successful cleanup. The root cause is therefore unknown. Do not retry until a diagnosis is available.

The failed job used image `ghcr.io/sariserhan/jamloom/music-worker@sha256:790e6950bf22f11a107f9c5c49bd76f5bf6c25d20463d086cc82411337e74343`, built by [workflow 40574921962](https://github.com/sariserhan/jamloom/actions/runs/40574921962). The current template remains set to this image while its endpoint is disabled. See [template update receipt](worker-update.json) and [full bounded trial receipt](../song-finish/startup/2026-10-27T20-19-50.236Z/trial-result.json).

The worker image and request boundary are DNA-only. Improvise requests are rejected and the image omits the source-separation implementation/checkpoint until commercially usable rights are established.
