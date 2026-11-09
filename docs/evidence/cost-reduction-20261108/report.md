# Cost reduction preparation — November 8, 2026

**PASS local candidate and isolated packaging; NOT RUN hosted speedup; PARTIAL release.** The owner explicitly chose **“Keep 65%; reduce costs first.”** Prices, nonexpiring credits, the accepted audio recipe and the commercial qualification gate remain unchanged. This decision does not extend the separate $7.50 App Review permit or authorize new paid optimization runs.

## Implemented candidate

With the explicit hosted-only `JAMLOOM_IDENTITY_PRELOAD=1` setting, voice-model verification/loading and CPU stem separation run concurrently after ACE releases its GPU memory. The converter waits for completed, hash-bound stems before writing its input or generating audio. Both children share a finite orchestration deadline; separator/converter/launch failures and timeouts kill and reap every started child. Existing parent-death and outer worker process-group cleanup remain in place. A failure preserves the base and partial marker instead of publishing completion.

The default remains sequential. Model revisions, reference excerpts, diffusion steps, guidance, seed, inference precision, mixing and export format are preserved. Source extraction does not advance the NumPy RNG; the fixture model test exercises both complete conversion paths and obtains byte-identical exported WAVs with the same recipe. **This is fixture parity, not actual model/CUDA audio equivalence or new owner listening acceptance.** Concurrent RAM/CPU demand needs hosted measurement before enabling the option.

Timing diagnostics now validate matching starts/ends for overlapping phases. Timestamping and bounded append happen under one process-shared file lock. The phase allowlist, event/byte/time limits and content-free payload remain intact.

## Measured opportunity, not a cost result

The retained successful 38-second reviewer take spent **19.008 seconds separating stems** and **16.577 seconds loading the voice model**. [Reproducible extraction](analyze-retained-timings.py), [sanitized timings and calculation](retained-timing-analysis.json). Nested stage times must not be added together.

Overlapping the load alone could avoid at most those 16.577 seconds under the simplified timing hypothesis: approximately **$0.003647** at the existing $0.00022/second planning rate. Actual savings are **unknown**; contention, imports, allocation and memory pressure may reduce or erase them.

Even applying that hypothetical saving to the separate conservative 44-second cohort would lower its $0.095307 planning cost only to **$0.091660**, above the **$0.070000** budget. That extrapolation is explicitly hypothetical and still excludes missing startup/failure billing. It is not a new passing cohort. The existing [DJ and Music DNA cost gaps](../economic-closure-20261108/report.md) also remain open. Reducing runtime alone does not establish 65% commercial margins; complete lifecycle billing and capacity/idle, storage, support and shared-infrastructure costs still matter.

## Source isolation and validation

- **PASS: 102 main-tree checks**, including seven preload checks and eight timing checks. [Receipt](main-tests.json).
- **PASS: 97 checks on isolated candidate `bf57ca04830843c1b554e0c611c188fcbf405dee`**, based on accepted worker source `a0eacb50`. [Receipt](isolated-tests.json). The first runner invocation incorrectly requested a newer main-only Spleeter test module absent from that older source; the [initial loader failure](isolated-tests-initial.json) is retained. The explicit deployed-source suite fixes the runner selection without changing runtime code or weakening tests.
- **PASS: two actual Linux x86_64 subprocess checks**, covering overlap, failure, launch error and both timeout stages. These used a disposable directory on the existing host; no dependencies, services, models or GPU were installed/changed. [Receipt](linux-control-tests.json), [reproducer](check-linux-control.py).
- **PASS: all 37 immutable base inputs and exact runtime context.** Main deliberately fails the historical overlay check because it contains newer unrelated worker changes. The isolated candidate preserves the accepted singer-studio file and all pinned model/dependency inputs. Its 13,958-byte context contains only the recipe, ignore file and three runtime files. [Hashes and candidate identity](candidate.json), [reproducer](package-candidate.py).
- **NOT RUN: full Linux image build/publication, CUDA throughput/peak memory, real-model output comparison and full provider-cost qualification.** Docker is installed locally but its daemon is unavailable. The small Linux process checks do not substitute for the image/GPU checks.

The candidate is retained at `build-identity-preload-20261108/source`; the reproducible build context is `build-identity-preload-20261108/runtime-context.tar.gz`. The accepted live image remains `e5a0050e…`; there was no Git push, publication, deployment, new GPU allocation or commercial activation.

## Release still outstanding

1. Reduce and verify complete attributable costs against the unchanged 65% requirement, including the unresolved DJ and Music DNA costs. Do not remove failed-resource charges, assume missing bills are zero, shorten retention or assume customer volume to manufacture a pass.
2. Build and verify the isolated worker, prepare a concrete bounded qualification permit and obtain authorization before any new paid benchmark. Keep optimization compute separate from App Review funding; preserve the owner's Git-push control. This single candidate does not yet justify declaring commercial qualification.
3. Obtain Apple approval. The fresh **2026-11-09 02:47 UTC** read still shows build 39 VALID, the five-item submission WAITING_FOR_REVIEW and release MANUAL. Reviewer-cycle billing still has five unposted workers; no final invoice exists.
4. After economics/provider gates pass, activate the existing qualified payment/generation settings, complete deployed smoke checks and perform public release last. iOS public availability additionally requires Apple's approval.

The earlier funded reviewer flow, physical-device checks, signed sandbox payment evidence and successful delivery receipts remain valid within their recorded scopes. No closed listening/endurance study was restarted and no deferred v1 research was reopened.


## Later CPU image follow-through — November 9

The retained isolated candidate has now completed a Linux image build on the existing headless CPU server, with exact runtime/context hashes and 15 in-image fixture checks passing. [Current image evidence](../final-audit-20261108/worker-image.json). It remains unpublished and disabled; actual CUDA throughput/memory/audio comparison and representative 65% operating economics are unproven. The earlier prices and release holds above describe that historical checkpoint; [current launch and funding status](../final-audit-20261108/report.md) supersedes them. No hypothetical optimization savings are counted.
