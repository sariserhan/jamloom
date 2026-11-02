# Converted components for Improvise — November 1, 2026 (New York)

**PASS local implementation, regression checks and preparation; PARTIAL release; NOT RUN changed-image hosted qualification.**

The previous [one-request diagnostic](../improvise-timing-20261101/hosted-result.json) timed out at 120.394 seconds. Identity processing took 61.042 seconds, including its own separation and conversion. A second separator started at 106.868 seconds and was still running at timeout. The prior permit is consumed and cleanup passed.

Improvise now asks its singing subprocess to retain the converted vocal and drums at the final master gain. The backing is the verified base audio minus its verified original vocal estimate. The converted vocal is derived from the **actual final PCM export minus that backing**, including export quantization residual. The drums retain their original source-separation provenance and use the same master gain. This does not copy the old singer into the new mix. The mixer, model revisions, inference parameters, source selection, arrangement rules, durations, prices and timeout limits are unchanged. The generated WAV is not rewritten by this optimization.

Each result binds the generated WAV, base WAV, source separation receipt, derived arrays and final conversion receipt with hashes. A declared result with missing/corrupt/wrong-shape/nonfinite stems, mismatched source/identity/gain, symlinks or partial markers fails. Verified components skip the second separator. Legacy output, unconverted singing and instrumental output retain the separator path. The opt-in environment variable is set only on Improvise's singing child; Music DNA does not enable it.

Added content-free identity substage timing names for separation, integrity verification, model loading, inference and component export. The existing bounded trace validation, parent-timeout cleanup and privacy limits remain in place.

## Verification

- **PASS — 86 main-tree checks:** component integrity/mixing, singer identity, studio flow, subprocess timing, hosted identity separator, phrase editing, singing and worker boundaries. [Counts](local-tests.json).
- **PASS — 73 checks on the isolated worker source:** same relevant runtime checks plus immutable-base/build-context validation. These are local macOS Python checks; Linux CI and hosted inference have not run on this change. [Counts](isolated-tests.json).
- **PASS — synthetic component benchmark:** 30/39/45-second cases; writing plus validating components takes approximately 0.056/0.075/0.091 seconds on this Mac. Each source WAV remains byte-identical. These figures exclude every music model and are not a hosted speedup claim. [Measurements](component-benchmark.json); reproduce with `.venv-singer/bin/python docs/evidence/identity-stems-20261101/component_benchmark.py`.
- **PASS — integration:** the real phrase editor consumes the new components, retains a complete 1.22-second synthetic call, keeps audio outside the edit byte-identical and maintains the peak check. It is an automated audio check, not human listening.
- **PASS — source integrity:** unchanged mixer/conversion-parameter ASTs; 37 model/dependency inputs pinned to the verified image. Exactly three runtime source files change. [Source checks](source-integrity.json).
- **PASS — controller and HTTP dry runs:** zero provider operations; approved source hash/format, ten credits, 120-second execution and 130-second TTL retained. Harness typecheck passes.
- **PASS — provider read-only check:** workers 0/0, zero active/queued jobs and zero workers. [Snapshot](disabled-provider.json). No provider mutation, image publication, paid generation or deployment occurred during this local repair.

The new component representation can affect arrangement placement because it replaces a second estimated vocal separation with the known converted component. Full hosted duration, placement success and musical output remain unverified. The owner's closed listening/endurance studies remain closed; this work does not fabricate a new musical acceptance.

## Source and next bounded check

Main implementation: `49a8b16201eba14dd3d148ad8234f97534470c3d`.
Isolated worker: `99b1682bed75777a0dde402277d9ca39933ab724`, based on `bdbc4a37`.
Neither commit has been pushed or published by this increment. The isolated branch includes only the runtime patch, packaging/validation changes and required existing test fixtures; unrelated main-tree musical experiments are excluded.

The [prepared plan](hosted-plan.json) requests publication of that exact worker, immutable-image verification, and one private Improvise check: fresh **$1 total**, one RTX 4090, one request, a single 40-minute lease including deployment/preparation plus 130 seconds shutdown, no generation retry or warmup. Image publication/verification happens first while workers remain 0/0. Before use, bind the verified image digest, update only the app image pin, rerun required checks/build/dry runs, then deploy once. Read-only monitoring can reconnect after a transport error; confirmed failure or unresolved mutation state stops the attempt. Independent cleanup restores workers 0/0, deletes remote test audio, verifies credits, and restores the held website. Sales activation and Apple submission are excluded.

The archived harness restores to `build-identity-stems-20261101/`. Its image field is intentionally unset and status is awaiting approval, so it cannot activate a worker now. No fresh lease has been created.
