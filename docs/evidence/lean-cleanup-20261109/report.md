# Lean local cleanup — November 9, 2026

**PARTIAL cleanup; FAIL preservation of two early accepted development auditions.** The owner explicitly chose: “Permanently delete obsolete generated takes; preserve original recordings and accepted final work.” The cleanup removed 7,637 generated WAV files and 19 verified public model downloads. However, the generated-audio selection also included two older accepted house auditions and their listening copies. They have **not been recovered**. Further deletion stopped when this was detected.

## Storage result

- Public model downloads removed: **17.58 GiB**. All 19 files matched their pinned SHA-256 checksums; their pinned public download URLs returned HTTP 200 before removal. Model code, configuration, manifests, credentials and custom/nonverified model files remain.
- Generated audio removed: **44.86 GiB** across 7,637 WAV paths. These counts include the four mistakenly retired files described below; they must not all be described as obsolete.
- Observed free disk space increased from **36.31 GiB** to **76.87 GiB**, approximately **40.56 GiB** during this pass. Project directory usage reports **73.02 GiB**. Logical bytes, allocated folder totals and physical free space differ because APFS clones share blocks and other macOS activity continues.

## Preservation incident

The affected October 24 GPU-comparison cases are **house-baseline** and **house-phrased**, accepted as development auditions. Their original PCM WAVs and level-matched `listen-01.wav` / `listen-05.wav` copies were removed. The acceptance record identified clips by number and case name; the hashes lived in a separate measurements file. The deletion guard protected hashes found directly in owner-decision records but failed to resolve this indirect reference first.

The acceptance record and all measurements remain. Exact missing paths and hashes are in [preservation-incident.json](preservation-incident.json). No matching copies were found among remaining project files, temporary/download locations, matching project paths in Trash, the headless checkout at the original paths, Spotlight exact-filename results, or the scanned Dia cache. No local Time Machine snapshots were listed. These checks do not prove recovery is universally impossible, but **no recovery is claimed**. No newly generated replacement was substituted.

Any later retirement pass must resolve numbered/named listening decisions through their companion manifests and verify the resulting complete keep-set before deletion. This incident must not be obscured by the successful checks below.

## Verified retained work and scope

**PASS:** all **6,968 files in the retained-audio inventory** were read again and matched their original SHA-256 checksums, inode, size, mode and modification time. This includes protected source recordings, normalized inputs, owner-decision audio, current sample/fixture paths, and retained work outside the retired studies. The four incident files were absent from that keep-set; this check does not establish that every accepted artifact was preserved.

Canonical current accepted work outside the retired study scope remains, including the question bass pilot/crop, accepted Afro House output folders, final four Improvise song folder, produced singing material, and local song libraries. All original/source/input paths selected by the audit were retained. Models were removed only from the audited public-download list; this was not a blanket removal of `build-style-training`.

Reports, plans, receipts, recordings, custom model work, Git worktrees, source code, credentials, signed releases and test-result bundles remain. No app was stopped. No remote file, deployment, database, payment or worker state changed; the headless check was read-only. Retired study folders contain `RETIRED_AUDIO_20261109.md` notices: historical player links to removed files no longer work, and previous reports remain historical evidence rather than current replay availability.

## Checks and recovery instructions

**PASS:** 18 focused local audio, Music DNA example and Academy catalog/manifest tests; the isolated Postgres test was explicitly outside this filesystem-only check. No database was changed. [Test output](checks.log).

**PASS:** five disposable model-restoration checks: verified installation, matching-existing-file reuse without download, incorrect-hash rejection, size-limit rejection and preservation of an existing different file. No model was downloaded by those checks. The initial disposable test used macOS's unresolved `/var` alias; canonicalizing its temporary root fixed the harness setup. [Checks](restore-checks.log).

Local AI generation now requires restoring the removed downloads. List the exact pinned files without downloading:

```sh
python3 docs/evidence/lean-cleanup-20261109/restore_models.py
```

Restore all 17.58 GiB only when local model execution is needed:

```sh
python3 docs/evidence/lean-cleanup-20261109/restore_models.py --restore
```

`--only` accepts an exact path from [models-restore.json](models-restore.json). The helper verifies size and SHA-256 before installing and refuses to overwrite different existing files. Historical obsolete takes are permanently deleted, not archived; the model restoration helper cannot recover them or the two incident auditions.

Full selection, deletion and retention manifests remain privately under `build-lean-cleanup-20261109/`. [Summary and audit hashes](summary.json). These manifests are evidence, not a recipe to repeat deletion automatically.
