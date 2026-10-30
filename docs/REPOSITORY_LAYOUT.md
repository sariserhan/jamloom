# Repository layout and ownership

The shared studio already has one source directory. The website and iPhone
copies are generated delivery formats, not separate implementations to merge.

| Area | Edit here | Generated output / entry point |
| --- | --- | --- |
| Portable engine | `core/`, `schemas/` | CMake builds and `dist/web/engine/` |
| Shared studio and singing | `apps/web/` | `scripts/web_build.sh` → `dist/web/` |
| Website shell and protected course | `apps/site/scripts/studio-site-shell.mjs` | `prepare-studio.mjs` → ignored `apps/site/public/studio/` |
| Native studio shell | `apps/ios/Studio/` | `scripts/prepare_ios_studio.py` → ignored `build-ios-studio/Studio/` |
| Native app | `apps/ios/Jamloom/`, `apps/ios/project.yml` | Xcode builds; signed archives are retained separately |
| Hosted worker | `services/runpod/`, shared `scripts/` | Explicit Docker copies; no implicit repository upload |
| Cleared assets and rights | `assets/` | Hash-checked packaging; recordings stay outside public web/offline bundles |
| Research and operational commands | [Script directory](../scripts/README.md) | Stable command/import paths; generated audio under ignored `renders/` |
| Current work | [TODO](../TODO.md), [progress](progress.md), [status](STATUS.md) | Dated sections preserve prior evidence, not an additive backlog |
| Acceptance and provenance | `docs/evidence/`, linked topical reports | Preserve failed runs, rights records and build-specific receipts |

The website transforms `index.html` and `dj.html` for site navigation and
`singing-course.js` for authenticated lesson delivery. Its offline worker is
regenerated from those exact bytes. Broad copying or symlinking would undo that
access boundary. `apps/site/scripts/audit-bundle.mjs` checks every shared asset
against its source or explicit transform. Native packaging has a separate audit.

Scripts remain at their existing paths because Python imports, CMake, CI,
Docker's explicit copies, uploaded archives and historical reproducibility all
depend on them. Use the grouped index to find commands. The caller map records
code and documentation references separately; a directory move must update the
actual callers and remote archive contract together. No source or evidence was
deleted just because it appeared old or duplicated.

Refresh the index and make a new caller map from the repository root:

```sh
python3 scripts/audit_repository.py --index --output /tmp/jamloom-script-callers.json
```

The scanner reads tracked and non-ignored local text plus top-level script filenames. It does not
read environment files, execute a provider command, or import a model. Dynamic
references are outside this static audit; an empty caller list is not a deletion
recommendation. Broad physical relocation remains deferred until a concrete
move has its compatibility checks.
