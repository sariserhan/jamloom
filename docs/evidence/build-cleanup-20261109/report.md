# Build-folder cleanup — 2026-11-09

**PASS.** Owner instructed removal of the root `build-*` folders and a manifest of retained renders. Free disk space went from about 73 GiB to 87 GiB.

- Deleted all 173 git-ignored `build-*` folders (about 19 GiB). These are rebuildable outputs; the first web/iOS rebuild downloads the Emscripten toolchain again.
- Kept the signed archives for submitted builds 39 and 40, including their debug symbols, in `dist/ios-archives/` (verified with a per-file SHA-256 tree comparison). Archives for builds 24–38 were removed; none had been publicly released. No build-40 export existed.
- Rescued 652 audio files outside app bundles/archives (391 unique, 1.4 GB) into `renders/preserved-build-audio-20261109/`, each verified by SHA-256 before deletion. [Original path → hash map](preserved-build-audio-manifest.json). Audio inside `.app`/`.xcarchive`/export bundles was a copy of shipped assets and was not kept.
- `renders/` stays local at the owner's request (“Keep local for now”). [Per-folder manifest](renders-manifest.json): 999 entries, 50.6 GiB; 109 entries (10.1 GiB) are referenced by scripts/tests and must stay local, and 40.6 GiB is movable if a destination is chosen later.
- Git-tracked files were unchanged by the deletion. About 1,000 historical evidence references now name removed `build-*` paths; their recorded hashes remain the evidence.

## Renders deletion — 2026-11-09

**PASS.** The owner approved deleting renders that are neither referenced by scripts/tests nor linked to recorded owner approvals. Deleted 874 entries (33.3 GiB), including the build-audio rescue above; [deleted list with sizes](renders-deleted.json). No kept entry symlinks into a deleted one. Kept 125 entries: 109 used by code (10.1 GiB) and 16 linked to owner approvals (7.2 GiB); [current manifest](renders-manifest.json). renders/ is now about 16 GiB; free space about 110 GiB. Evidence reports retain hashes/measurements for deleted audio, which cannot be recovered.
