# Converted components for Improvise — November 1–2, 2026 (New York)

**PASS publication, one hosted Improvise request and cleanup; PARTIAL release.**

The owner approved resuming publication and the original check within the same $1. The FFmpeg-only CI repair passed all **61 Linux checks**, and workflow [41390835167](https://github.com/sariserhan/jamloom/actions/runs/41390835167) published the image. Verification preserved all 29 base layers and runtime configuration, checked the three patched files against the reviewed source, and found only 13,154 additional compressed bytes. Application pin `c504624b` passed eight profile checks, both typechecks, production build, bundle audit and both dry runs. [Publication](publication-result.json); [image](image.json).

Exactly **one 43-second Improvise song completed** on one RTX 4090. The private WAV's hash, length and format passed; anonymous access was denied, exactly ten test credits were captured, and the live wallet remained unchanged. There was one deployment, activation and generation, with no retry or warmup. The permit is consumed. [Hosted result](hosted-result.json).

The pipeline finished in **119.648 seconds inside its unchanged 120-second limit**, leaving only **352 ms headroom**. Provider execution, which includes boundary overhead, was 120.701 seconds; queue delay was 26 ms. Converted-component export took 1.862 seconds, verified component reuse took 250 ms, and arrangement took 11.830 seconds. This confirms the duplicate separator was avoided on this take. It does **not** establish reliable latency across inputs or call the new musical output owner-approved. [Content-free timings](phase-timings.json).

Independent cleanup confirmed **workers 0/0**, original GPU configuration, no workers or pending jobs, all **three remote test objects absent**, zero reserved credits, and the held public website restored. The four public product pages returned HTTP 200; anonymous generation remained unavailable. Runpod reported current spend **$0/hour** after cleanup. [Cleanup](cleanup.json); [final verification](final-verification.json).

The request estimate is **$0.06598**, below its $0.0694 cap, but it excludes the complete attributable startup/idle/storage bill. Worker and endpoint billing rows were still unposted at the final read; missing rows are not zero. The $1 bounded permit does not authorize ongoing workers. Production demand-start/idle-stop behavior, full operating economics and final sales/App Review activation remain open. [Billing status](billing-summary.json).

## Earlier publication stop (resolved by the approved resume)

**Publication attempt — FAIL CI setup; PASS unchanged-runtime repair; NOT RUN GPU check.** The owner approved image publication and one $1 check. Worker `99b1682b` was pushed and workflow [41390558360](https://github.com/sariserhan/jamloom/actions/runs/41390558360) ran. The first 41 Linux checks passed; studio decoding tests failed because the Ubuntu runner lacked `ffmpeg`. Image build/publication never started. No GPU activation, upload, generation, private app deployment or lease occurred. The stop-on-failure condition was honored; no workflow retry was submitted before resume approval. The independent provider snapshot at that stop showed 0/0 with zero workers/jobs.

Worker commit `a0eacb50` adds only five workflow lines to install/check FFmpeg before tests. All three worker runtime files, model/dependency inputs and image recipe are byte-identical to approved `99b1682b`. Workflow YAML and shell syntax pass. The main full-build workflow now declares the same audio-tool/test dependencies. At that stop, the repair had not yet run on Linux and the lease had not begun. The owner subsequently approved the [same-$1 resume plan](ci-resume-plan.json), now completed above. [Stopped-attempt evidence](ci-publication-stop.json).

The previous [one-request diagnostic](../improvise-timing-20261101/hosted-result.json) timed out at 120.394 seconds. Identity processing took 61.042 seconds, including its own separation and conversion. A second separator started at 106.868 seconds and was still running at timeout. The prior permit is consumed and cleanup passed.

Improvise now asks its singing subprocess to retain the converted vocal and drums at the final master gain. The backing is the verified base audio minus its verified original vocal estimate. The converted vocal is derived from the **actual final PCM export minus that backing**, including export quantization residual. The drums retain their original source-separation provenance and use the same master gain. This does not copy the old singer into the new mix. The mixer, model revisions, inference parameters, source selection, arrangement rules, durations, prices and timeout limits are unchanged. The generated WAV is not rewritten by this optimization.

Each result binds the generated WAV, base WAV, source separation receipt, derived arrays and final conversion receipt with hashes. A declared result with missing/corrupt/wrong-shape/nonfinite stems, mismatched source/identity/gain, symlinks or partial markers fails. Verified components skip the second separator. Legacy output, unconverted singing and instrumental output retain the separator path. The opt-in environment variable is set only on Improvise's singing child; Music DNA does not enable it.

Added content-free identity substage timing names for separation, integrity verification, model loading, inference and component export. The existing bounded trace validation, parent-timeout cleanup and privacy limits remain in place.

## Verification

- **PASS — 86 main-tree checks:** component integrity/mixing, singer identity, studio flow, subprocess timing, hosted identity separator, phrase editing, singing and worker boundaries. [Counts](local-tests.json).
- **PASS — 73 checks on the isolated worker source:** same relevant runtime checks plus immutable-base/build-context validation. These are local macOS Python checks; the subsequent Linux CI and single hosted execution are recorded above. [Counts](isolated-tests.json).
- **PASS — synthetic component benchmark:** 30/39/45-second cases; writing plus validating components takes approximately 0.056/0.075/0.091 seconds on this Mac. Each source WAV remains byte-identical. These figures exclude every music model and are not a hosted speedup claim. [Measurements](component-benchmark.json); reproduce with `.venv-singer/bin/python docs/evidence/identity-stems-20261101/component_benchmark.py`.
- **PASS — integration:** the real phrase editor consumes the new components, retains a complete 1.22-second synthetic call, keeps audio outside the edit byte-identical and maintains the peak check. It is an automated audio check, not human listening.
- **PASS — source integrity:** unchanged mixer/conversion-parameter ASTs; 37 model/dependency inputs pinned to the verified image. Exactly three runtime source files change. [Source checks](source-integrity.json).
- **PASS — controller and HTTP dry runs:** zero provider operations; approved source hash/format, ten credits, 120-second execution and 130-second TTL retained. Harness typecheck passes.
- **PASS — provider read-only check:** workers 0/0, zero active/queued jobs and zero workers. [Snapshot](disabled-provider.json). No provider mutation, image publication, paid generation or deployment occurred during this local repair.

The new component representation can affect arrangement placement because it replaces a second estimated vocal separation with the known converted component. The single hosted duration/placement path now passes; broader latency and new human musical acceptance remain unverified. The owner's closed listening/endurance studies remain closed; this work does not fabricate a new musical acceptance.

## Source and consumed bounded check

Main implementation: `49a8b16201eba14dd3d148ad8234f97534470c3d`.
Isolated worker: `99b1682bed75777a0dde402277d9ca39933ab724`, based on `bdbc4a37`.
At initial preparation neither commit had been pushed or published. The publication attempt and its stopped state are recorded above. The isolated branch includes only the runtime patch, packaging/validation changes and required existing test fixtures; unrelated main-tree musical experiments are excluded.

The [consumed plan](hosted-plan.json) authorized publication of that exact worker, immutable-image verification, and one private Improvise check: fresh **$1 total**, one RTX 4090, one request, a single 40-minute lease including deployment/preparation plus 130 seconds shutdown, no generation retry or warmup. Image publication/verification happens first while workers remain 0/0. Before use, bind the verified image digest, update only the app image pin, rerun required checks/build/dry runs, then deploy once. Read-only monitoring can reconnect after a transport error; confirmed failure or unresolved mutation state stops the attempt. Independent cleanup restores workers 0/0, deletes remote test audio, verifies credits, and restores the held website. Sales activation and Apple submission are excluded.

The archived harness restores to `build-identity-stems-20261101/`. The image is bound to the verified digest and both plans are CONSUMED, so the apply guards cannot activate another worker. The one lease has a fixed expiry of 2026-11-02 05:43:13.630 UTC; cleanup completed earlier, at 05:15:34 UTC. The held website remains restored; no sales activation or Apple submission occurred.
