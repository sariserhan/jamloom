# Audio and artifact cleanup — 2026-11-01

**PASS safe local storage cleanup.** Observed available disk space rose by approximately **29.1 GB**, to **52.2 GB** (48.6 GiB). This is a filesystem observation, not an exact sum of removed file sizes; macOS/background activity and existing APFS sharing affect it.

## What changed

- Replaced **5,176 byte-identical audio copies**, representing **33.35 GB** of logical data, with APFS copy-on-write clones of verified identical files. Every filename and byte is retained. These are independent files, not hard links or symlinks: editing or deleting one does not change the other. Redundant physical data blocks are released when unreferenced. Folder-size tools can still report the original logical size.
- Deleted **five inactive deployment source snapshots**, 1,857,343,488 allocated bytes. Every source file was checked again against the recorded reachable Git commit before deletion; no worktree, tracked file, active file, credential or unique edit was removed. The unmatched capacity-probe snapshot remains.
- Left **44 candidate copies unchanged** when open-file or exact metadata preservation checks did not pass. No relaxed fallback was used.

The entire `renders` folder was audited for large media, but was not deleted wholesale. Unique recordings, final music, generated variants, reports, signed app archives, XCTest evidence, model weights, source code and all open applications remain. No R2 upload/delete, provider activation, publication or payment operation occurred.

## Verification

**PASS:** 12,090 inventoried media files retain their original paths, sizes, modes and modification times. All 5,176 replaced copies were independently read back and SHA-256 verified after completion. Unchanged files retain their original inodes; replacements have independent inodes and no temporary clone files remain. Original metadata and extended attributes were checked before replacement. The disposable self-test verified independent writes and survival after source deletion. Git status stayed identical until this documentation update.

**PASS:** 18 focused audio, Music DNA example and lesson checks. Three existing local listening pages served successfully, including nine audio reads with valid headers. These are file-serving checks, not fresh human listening judgments.

**NOT RUN:** isolated Postgres Academy integration. An initial broad invocation encountered a missing isolated database URL (`ERR_INVALID_URL`); the appropriate local-only rerun excludes that database test and passes. No production database was used.

The initial disposable self-test caught missing Python xattr helpers; native macOS metadata APIs were used instead. During the first audio batch an exact attribute comparison stopped before replacing the affected file. Completed copies were verified on resume; remaining metadata-sensitive cases were skipped. No file was accepted with different audio bytes or metadata.

Local detailed manifests, per-file receipts and audit scripts are retained under `build-audio-cleanup-20261101/`; their hashes are recorded in [summary.json](summary.json). Signed bundles and private open-file listings are not copied into this public report. See [file verification](verification.json), [source snapshot removals](snapshot-removal.json), [independent clone self-test](clone-selftest.json) and [local playback files](local-playback-files.json).
