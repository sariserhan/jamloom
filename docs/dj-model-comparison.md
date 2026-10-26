# Base-model quality comparison — 2026-10-26

**PASS bounded GPU run, cleanup and technical checks; PARTIAL overall, listening NOT RUN.** The latest instruction is to
complete every remaining AI DJ gate. Rejected vocals and inconsistent originals
remain rejected. This compares generation recipes before more prompt tuning.

## Exact prepared run

Six fresh sixty-second outputs: planned house, planned bass and planned house
with sparse original sung phrases, each generated once with turbo and once with
the base model. Each pair shares seed, caption, lyrics, tempo, energy and mood.
Both use the existing semantic planner. Turbo uses eight steps and shift 1;
base uses sixty-four steps, adaptive guidance and shift 3. This compares full
recipes, not an isolated causal effect of weights or step count.

The vocal pair contains “Feel alive” and “We rise” within an arrangement. It tests
whether intelligible singing appears in context. It does not qualify two-second
phrase selection, naturalness or placement; those need output analysis and
listening before integration. No reference audio, downloaded DJ sets, TTS,
conversion, adapter training or extra vocal call is used. Raw candidates remain.

Bounds: **$3 total, one GPU, forty minutes, six model calls, stop on failure,
no replacement, automatic cleanup, no public activation.** The existing controller
retains its independent watchdog and confirms deletion. It rejects generic
“finish everything” as a spending permit and rejects changed requests, worker
hashes, model hashes or limits. Previous permits remain consumed. The owner approved the
[exact plan](evidence/dj-model-comparison-20261026/gpu-plan.json) with “Approve the capped $3 base-model comparison”.
Its single attempt completed and is consumed; no replacement is authorized.

Research permits at most 120 seconds per request to measure the slower candidate.
Default serving still permits thirty seconds. A slower output cannot be promoted
based on quality alone. This is not continuous hosting or concurrency proof.

## Model and rights evidence

The [pinned upstream guide](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/INFERENCE.md#best-practices)
distinguishes turbo speed and base quality recipes. Context7 was unavailable;
primary sources and the pinned implementation were checked directly. This is
not evidence that Jamloom's outputs will improve.

Base weights are pinned to `ACE-Step/acestep-v15-base` revision
`e432212fec32b8965a14ffa57ae653438d6abd14`. The
[publisher card](https://huggingface.co/ACE-Step/acestep-v15-base/blob/e432212fec32b8965a14ffa57ae653438d6abd14/README.md)
declares MIT and permits commercial outputs. Configuration/model Python files
retain Apache-2.0 headers. These declarations are not an independent audit of
underlying recordings/compositions or a guarantee about outputs. There is no new
training dataset. Preserve notices in any later distribution; no candidate image
is published.

The [manifest](../assets/manifests/dj-base-model.json) pins required file sizes and
SHA-256 hashes, including remote code. Approximately 125 KB of code/configuration/
model-card text was downloaded locally; the 4.79 GB weights were not. The custom
module imports in the existing singer environment without loading weights.
CUDA execution and per-request latency now pass the research bounds. Musical quality and sustained capacity remain unqualified.

## Verification

**PASS:** 76 final local tests cover recipes, exact spending permits, refusal before
provider access, packaged imports, file checks, model switching, raw retention,
research/default deadlines, existing vocals and cleanup. Provider calls in tests
are mocks. Bootstrap shell syntax checks pass.
[Final test output](evidence/dj-model-comparison-20261026/local-tests-final.txt).

Historical plans retain their original hashes and cannot authorize this changed
worker. Production defaults and cached-image model selection remain unchanged.
No deployment, activation or live billing is included.

The executed command was
`.venv-analysis/bin/python scripts/dj_sample_trial.py --model-study`. Its permit is consumed; do not rerun.
Local checks use the `test_dj_model_study`, `test_dj_warm_engine`,
`test_dj_sample_trial`, `test_vast_trial`, `test_dj_track_worker`,
`test_dj_sung_hooks`, `test_dj_sung_package` and `test_dj_image` unittest modules.

The website explicitly rejects `model_comparison` receipts before completing or
charging a customer batch, including null/forged comparison markers. Both the
ordinary thirty-second guard and response-recovery checks remain. 150 website
tests, 38 isolated database/session/process checks and TypeScript pass. The
configured runtime is held, with zero workers/listeners/jobs and zero free slots;
the standalone research rental is not registered as customer capacity. Home
speakers/headphones are available for owner listening; venue PA acceptance is
still NOT RUN. Full-rental accounting now accepts this exact campaign label in
the existing read-only cost tool.

## Completed comparison

Six unique sixty-second stereo originals and all six raw float outputs are retained,
with executed worker hashes matching the approved plan. The run lasted **739.997
seconds**; independent inventory confirms zero remaining rentals. Observed account
debit was **$0.103553** and the provider's rental-specific charge is **$0.11**.
These are snapshots, not a settled invoice. No further GPU work is authorized.
[Receipts](evidence/dj-model-comparison-20261026/result.json),
[cleanup](evidence/dj-model-comparison-20261026/final-inventory.json),
[cost](evidence/dj-model-comparison-20261026/cost.json).

The [six-clip listening page](http://localhost:8766/model-comparison/review/)
uses matched integrated loudness, with conditions hidden until owner feedback.
Chromium and WebKit desktop/mobile checks pass all six players, seeking, no
autoplay, one player at a time and no horizontal overflow. The mobile screenshot
was visually inspected. Waveform checks establish complete, unclipped PCM;
they do not establish natural singing or professional musical quality.

Cold model initialization plus first generation took 86.499 / 84.478 seconds.
Warm requests took 20.480–20.716 / 27.585–28.315 seconds. Only two warm samples
per model were measured. Do not treat these as percentiles or sustained throughput.
Production's thirty-second limit stays unchanged, and research receipts are
explicitly rejected by customer dispatch before completion or charging.

Offline CPU separation of both musical-vocal candidates completed in 19.15 seconds,
with sampled peak RSS below 1.76 GiB. Neither estimated vocal stem supplied a
quiet-bounded four-beat phrase under the existing selector. No word was cut to
force a passing hook and no cue was attached. This does not establish that singing
is absent: separation can contain bleed, and vocal presence/naturalness still
require listening. [Phrase evidence](evidence/dj-model-comparison-20261026/vocal-bounds.json).

After the GPU was deleted, raw preservation was moved ahead of semantic-code and
PCM validation so a future rejected candidate is retained too. The exact executed
[worker snapshot](evidence/dj-model-comparison-20261026/worker-at-run.py) preserves
the original approved hash. The consumed plan deliberately rejects the changed
worker. A regression checks retention on missing codes and invalid audio without
allowing a retry; all six outputs from this completed run had already been retained.

Fresh consistency, natural short-hook acceptance, final-generator sustained
hosting and full operating economics, venue PA and release remain open.
Home speakers/headphones cover listening only. No public activation, deployment,
new training or reference-audio use occurred.

## Actual mixer and capacity screening

The six new originals, in the same numbered listening order, passed through the
actual browser player. It completed **289.32 seconds** with all six tracks once,
filter, roll and echo events, peak 0.390, and no detected silence at −60 dB lasting
250 ms or longer. Speakers were muted while the real graph was captured. No
short-vocal cue was fabricated. This is prepared-track playback, not concurrent
online generation or human transition acceptance. The full-set player also passes
Chromium/WebKit desktop/mobile playback and seeking; its mobile layout was
visually inspected.
[Full set](http://localhost:8766/model-performance/review/),
[capture and audio checks](evidence/dj-model-comparison-20261026/mix-checks.json).

The shortest current handoff interval was **44.30 seconds**. Two serialized warm
renders consume 41.432 seconds in the faster recipe and 56.630 seconds in the
slower recipe before transport, storage, retries and analysis. The former has
only 2.868 seconds of measured compute-only margin; the latter exceeds the
interval by 12.33 seconds. Both need fresh sustained qualification and an
appropriate admission limit. These tiny samples cannot justify two-listener
production capacity. [Screening](evidence/dj-model-comparison-20261026/capacity-screen.json).
