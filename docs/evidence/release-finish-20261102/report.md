# Release finish and branch integration — November 2, 2026

**PASS local ranking optimization and branch integration; PARTIAL release.** Arrangement ranking now maintains group/history counts instead of recounting them for every candidate. It preserves candidate order, exact floating-point weights and seeded random calls. Three compatibility tests cover full ordered results, repeated fingerprints, empty/singleton lists and 160 seeded history cases; all 18 existing audio arrangement tests pass. The synthetic 422-option benchmark improved from 1.928 seconds to 0.01675 seconds on this Mac, with an identical complete order. [Benchmark](ranking-benchmark.json). This is not a new hosted runtime measurement.

Fresh read-only checks at 05:19 UTC confirm workers 0/0 and no jobs, build 38 VALID in the unsubmitted manual App Review draft, and Stripe account/tax readiness with the Creator catalog and webhook still inactive. Exact-worker billing for the latest run remains unposted. Previous single-request technical success is recorded [here](../identity-stems-20261101/report.md).

Production demand-start/idle-stop, complete cost allocation, further hosted runtime qualification and final sales/App Review activation remain open. No new paid compute, publication, payment activation or submission occurred in this increment. Existing closed studies and deferred research remain closed.

The latest isolated worker branch is merged into main, including the ancestry of all seven outstanding worker branches. Fourteen conflicts were reviewed: preserve main's newer optional-vocal/Metal/source-boundary features, CI repairs, recovery cron, private diagnostics and safe model-download repairs. The branch-only runtime recipe, strict context/base validator and tests are integrated. The workflow supports explicit full/runtime recipes and defaults to the full-source build. No history was rebased or force-pushed.

All **67 merged worker/packaging checks PASS**; the 18 arrangement checks had already passed before the merge, whose audio source is byte-identical to that tested commit. Workflow YAML/shell syntax and whitespace checks pass. [Test counts](merge-tests.json); [branch/file audit](merge-audit.json); [packaging verification](merge-packaging.json).

The historical three-file overlay manifest remains pinned to its reviewed base. It validates on the original isolated checkout and deliberately refuses current main because newer runtime source differs. This prevents publishing an incomplete image while allowing a full-source build by default. Merging does not claim the newer main features or ranking change have passed hosted qualification. The deployed image pin stays unchanged. [Fresh provider status](provider-readiness.json).

No push, image publication, deployment or paid request was performed by the merge.
