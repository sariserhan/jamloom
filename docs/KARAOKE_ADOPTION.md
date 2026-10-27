# Accepted karaoke and DJ review — 2026-10-27

**PASS owner karaoke acceptance, overall DJ listening acceptance and local replacement. PARTIAL overall product completion.**

The owner answered **“Both new backings sound good”** for the same-source Spleeter comparison. The exact accepted candidate MP3s replace only the two karaoke assets in the local course. `assets/singing-recordings/manifest.json` now pins their hashes and sizes. Singer recordings, lyric sheets, lesson IDs, progress, entitlements and $39 once price remain unchanged. The original reviewed sources and previous versions in Git remain retained.

[Exact feedback, old/new hashes and model provenance](evidence/karaoke-adoption-20261027/owner-feedback.json). No runtime or weight is shipped: separation is offline preparation using the previously checked publisher MIT grant. The Mac dependency overrides remain documented and are not promoted into a production worker.

The owner also answered **“yes”** to the four fresh local DJ clips and automatic set. This is recorded as **overall positive listening acceptance**, with exact source/listening/mix hashes. It supplies no individual clip ranking and no separate natural-vocal assessment. It does not prove independent professional quality, better-than-human performance or sustained generation capacity. [Exact DJ feedback](evidence/dj-local-genres-20261027-ready/owner-feedback.json). No customer generation recipe was changed based on this aggregate answer.

## Actual checks

- **PASS:** protected recording route test verifies exact asset bytes, course access denial, invalid IDs, byte ranges and private caching.
- **PASS:** fresh localhost HTTP responses and prepared native studio assets match all six manifest entries. [Delivery evidence](evidence/karaoke-adoption-20261027/delivery.json).
- **PASS:** native studio preparation and shared/offline bundle audit. The initial audit exposed a misplaced research license: the app's root notice glob expected it in a fixed public bundle. Moving it to `assets/licenses/spleeter/LICENSE.txt` retains its provenance without introducing a runtime dependency or broadening the public asset allowlist. Initial failure and corrected preparation are retained.
- **PASS:** existing Chromium/WebKit regression, both songs at desktop and phone widths: actual muted play, seek, repeat, lyrics, no overflow and zero checked Axe violations. Both pass synthetic pitch input, pause cleanup, permission denial/cancellation, startup timeout/retry and no fabricated progress.
- The initial browser run exposed a test race: it asserted four analysis frames immediately after the first pitch display appeared. The corrected assertion waits for the **same** `frames > 3` criterion within the existing timeout. No app logic, input threshold or pass criterion changed. [Initial failure](evidence/karaoke-adoption-20261027/browser-initial-failure.txt), [successful full rerun](evidence/karaoke-adoption-20261027/browser.json).
- Browser runtime execution tools were unavailable after tool discovery, so the existing project Playwright regression provided the non-interactive check. Screenshots are retained locally under `/tmp/jamloom-karaoke-adoption-browser-fixed/`.

Reproduction: `npm run test:singing-recordings` from `apps/site`; `SINGING_EVIDENCE_DIR=/tmp/jamloom-karaoke-check node tests/singing-produced-browser.mjs` against port 3010; `python3 scripts/prepare_ios_studio.py` and `python3 scripts/verify_web_bundle.py` from the root with the project's Node on PATH. No engine rebuild or new software dependency was needed.

**NOT RUN:** a new signed iPhone build/install or new physical-device check. The prepared assets are for the next build; prior installed build-33 evidence remains separate. No push, deployment, paid generation, provider mutation or live sales.

**Still open:** verified sung-word/note targets before grading these produced recordings; broader independent musical/learning evidence and updated-worker hosted qualification. This closes the specific replacement-backing listening gate, not every release requirement.
