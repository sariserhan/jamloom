# Disk cleanup — 2026-11-01 local date

**PASS.** Removed 7.75 GiB of audited regenerable caches and duplicate source snapshots, across 42 exact paths. Free space increased from about 4.9 GiB to about 17 GiB. Free-space changes can additionally reflect macOS reclamation or concurrent activity; the removed-path total is recorded separately.

Removed inactive Xcode intermediate/module/index caches, the stopped local Next.js qualification build, caches inside shutdown simulators, stale Notion/Colima installer downloads, npm package cache and six deployment source snapshots. Every removed snapshot file matched a reachable Git commit; copies with any differences were preserved. No snapshot was a Git worktree or in use by an active process.

All simulators were confirmed shut down. Candidate paths were checked for symlinks, tracked files and open handles. Simulator app data, application support, installed models, source recordings, generated audio/evidence, project source, credentials, signed builds and release archives remain. Dia and the other open applications stayed open; their active browser caches were left alone. The stopped Docker VM and its data were preserved.

Git status matched the pre-cleanup snapshot before this documentation was added. Focused routing/capacity tests and the active diagnostic harness hash/dry-run check pass. The running controller, independent watchdog, remote capacity check and their dependencies were not removed or interrupted. Deleted caches will regenerate when needed.
