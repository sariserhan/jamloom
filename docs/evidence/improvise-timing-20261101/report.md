# Runtime repair and release follow-through — November 1, 2026 (New York)

**PASS local implementation and tests; PARTIAL release.**

Improvise verified all five singer checkpoint files before drafting lyrics even though that command never loads the singer. The sing command then verified them again. The redundant pass reads **10,029,206,151 bytes**. Drafting now checks pinned runtime code and its own lyric weights; singing still verifies all pinned singer weights before loading. Generation parameters, model revisions, prices, durations and technical/privacy checks are unchanged. No measured hosted speedup is claimed.

Each isolated job now keeps an allowlisted phase/timing trace. On completion or timeout, the handler kills descendants and emits a validated summary before removing its temporary directory. No recording, words, model draft, signed URL or arbitrary exception text is emitted. Invalid/oversized traces are discarded. A real timed-out subprocess test confirms the active stage survives and its private stdout does not escape. The next harness also captures private terminal logs before shutdown, with a bounded five-second read.

The publication candidate applies only these changes to the accepted worker source, keeping unrelated newer local musical changes out of this diagnostic. It overlays five files on the exact accepted image; 35 unchanged base inputs are checked. Source `bdbc4a377bc659d51fca538aae376490878ca0a7`; [build](https://github.com/sariserhan/jamloom/actions/runs/41383942024). Publication and immutable digest verification PASS: all 26 base layers retained, three added layers total 24,996 compressed bytes, unchanged runtime configuration and all five source files verified byte-for-byte against the isolated commit. [Image proof](image.json). The disabled endpoint is updated to the verified image and independently confirmed 0/0 with zero jobs. No GPU was activated.

Main Python checks: **64 PASS**. Isolated worker checks: **53 PASS**. Site tests: **208 PASS**. Site and harness typechecks: **PASS**. Production build and bundle audit PASS. The image pin was changed afterward; its profile regression and harness typecheck pass. Both final dry runs PASS with zero provider operations. Early test runs selected environments without NumPy/soundfile; the complete relevant suites pass in the existing audio environment. No model install or new local GPU generation occurred.

## Current release state

Read-only checks confirm Stripe charges/payouts and tax configuration ready, existing Creator product/price inactive and webhook disabled. iPhone 0.11.0 build 38 is VALID and the manual-release review draft remains unsubmitted. All 33 database migration hashes match; no new migration is needed. Local environment configuration is not represented as deployed configuration.

The owner's Runpod notice warns about the cost of leaving a minimum worker enabled indefinitely. A fresh independent check found min/max 0/0, zero workers/jobs and provider-reported current spend $0/hour. Earlier diagnostic billing is still provisional; absent rows are not zero. GPUs remain disabled throughout this local work and image publication.

The next [prepared plan](hosted-plan.json) is one private Improvise request, a fresh **$1 total maximum**, one RTX 4090, 40 minutes including preparation plus 130 seconds shutdown, no retries, stop on failure, independent cleanup and held-site restoration. It preserves 120 seconds execution, 130 seconds TTL, the $0.0694 request cap and ten-credit price. No Music DNA repeat, customer sales, ongoing capacity, AI DJ rental or Apple submission. It needs explicit bounded compute approval under AGENTS.md; the earlier $3 campaign is consumed.

[Release path and remaining dependencies](release-path.md), [local validation](local-validation.json), [provider state](provider-readonly.json), [Apple](apple-readonly.json), [Stripe](stripe-readiness.json), [database/configuration](release-preflight.json).
