# Local storage cleanup — November 9, 2026

**PASS.** Removed **8.37 GiB** of audited disposable files. Observed available disk space increased by approximately **8.50 GiB**, from **25.80 GiB** to **34.30 GiB**. Project directory usage now reports **132.87 GiB**, down from **141.23 GiB**. APFS sharing and concurrent macOS activity mean reported file sizes and the observed free-space change are different measurements.

## Removed

- Source files from **18 inactive deployment copies**, totaling 6.33 GiB. Every removed file matched its mode and Git blob in a reachable source commit, checked again immediately before deletion. Local environment and Vercel configuration files remain in their original directories. Historical source can be recovered from the recorded commits.
- **3,864 regenerable cache directories**, totaling 2.04 GiB: inactive Next.js build output, Xcode intermediate/module/index caches, and Python/Numba bytecode caches. Current installed development dependencies remain. Future builds regenerate these caches and may take longer initially.
- The new detailed audit manifests were losslessly compressed after verification, avoiding another 80 MiB of audit-file overhead.

## Preserved and checked

**PASS:** 379,530 retained files have unchanged inode, size, modification time and mode. This includes source, local configuration, credentials, worktrees, models, recordings, release artifacts and unique evidence. All **12,090 inventoried audio files** retain their original paths, inodes, sizes, modes and modification times. Git status remained unchanged before these documentation updates.

**PASS:** 18 focused local audio, Music DNA example and Academy catalog/manifest checks. Command: `TSX_DISABLE_CACHE=1 NODE_DISABLE_COMPILE_CACHE=1 /opt/homebrew/opt/node@22/bin/node --import tsx --test --test-skip-pattern='isolated Postgres' tests/audio.test.ts tests/dna-examples.test.ts tests/academy.test.ts` from `apps/site`. The isolated Postgres test is explicitly outside this filesystem-cleanup check; no database was changed.

**PASS preservation:** The earlier APFS audio consolidation is still present. Forty-four remaining duplicate candidates were checked with the same metadata-preserving clone procedure, including a disposable independence/metadata self-test. None passed all replacement safety checks, so every original was retained and no audio was changed. No additional audio space saving is claimed.

Two unmatched source snapshots remain intact; existing worktrees and a cache directory containing a debug-symbol bundle were also preserved. Signed archives, test-result bundles, accepted audio, unique render studies, model weights and the PosterBoard recovery backup remain. No app was stopped, no data was uploaded, and no remote deployment, storage, payment or worker state was changed.

The remaining bulk is retained audio and models. Removing those originals would require a separate verified archive; this cleanup did not silently discard them.

Detailed path lists, source-commit mappings, file verification manifests, receipts and scripts remain under `build-storage-cleanup-20261109/`. Large manifests use `.gz`; they can be read with a gzip reader. Script hashes and evidence hashes are in [summary.json](summary.json), with [focused test output](checks.log). Raw open-file inventories remain private and are excluded from the public report.
