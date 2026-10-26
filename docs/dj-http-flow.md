# Fresh HTTP archive and two-track qualification

**FAIL hosted startup; PASS cleanup.** The owner approved “Approve the capped $3 HTTP two-track qualification”. This is a new, independently bounded campaign; the failed prior campaign and its spent permit remain preserved. [Exact plan](evidence/dj-flow-http-20261026/gpu-plan.json).

The controller, playback harness, workers, mixer and model manifests are hash-bound. The new flag uses separate work, evidence, render and mix directories. It cannot reuse the previous permit, reset previous execution state, or overwrite earlier audio. The fixed authenticated HTTP raw archive and exactly-two-track startup are unchanged.

Requested scope: twelve newly generated sixty-second tracks, two with distinct brief sung-hook opportunities; at most **$3 total**, **one GPU**, **forty minutes**, stop on failure, automatic watchdog shutdown and cleanup, **no replacements and no public activation**. Both playable masters and raw model outputs must transfer and hash-verify before startup and before the next request. The actual browser mixer begins after exactly two tracks and receives later tracks while playing.

Prepared local checks: five archive/permit/startup tests, fifteen controller permit/failure tests and thirteen model-study tests. These use mocks where provider operations would otherwise occur; the unapproved plan is rejected. The exact owner response subsequently authorized this run; one bounded rental was attempted and deleted.

After authorization only:

```sh
PATH=/opt/homebrew/opt/node@22/bin:$PATH .venv-analysis/bin/python scripts/dj_sample_trial.py --http-flow-study
```

The earlier framework and shared audio checks cannot establish hosted generation throughput. A failure ends this permit. A successful run still requires listening acceptance and does not activate public paid generation.

## Actual result

Instance 57831083 never established SSH within the five-minute startup allowance. The controller stopped before generating or transferring any audio and deleted it after 303.06 seconds. Separate account verification confirms **zero rentals** and approximately **$0.001336** observed debit; billing can settle later. No replacement was started. The twelve-track playback and fixed HTTP transfer remain **NOT RUN on fresh outputs** in this attempt; this is a host-startup failure, not evidence about the mixer or music quality. [Run result](evidence/dj-flow-http-20261026/gpu-result.json), [independent cleanup](evidence/dj-flow-http-20261026/cleanup.json).

The recorded plan is a consumed authorization, not a reusable permit. Do not execute the command above again against new state or new rentals without a new capped authorization.
