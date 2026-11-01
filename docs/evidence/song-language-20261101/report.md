# Song language filters — 2026-11-01

**PASS implementation and scoped validation.** Language filters cover the Music DNA/Improvise galleries (including personal songs), Community, favorites, playlists, playback queue, catalogue/creator/cloud-mix collections, shared DJ sets, the DJ track list, Aurowall picker, and Singing Academy. The native library includes public, personal, favorite and on-device collections; the bundled Singing Academy also filters its songs. A playlist plays the visible filtered queue.

Filters normalize language codes and legacy names. Missing/automatic metadata is shown as “Language not specified”; verified instrumental metadata has its own category. No language is guessed from a title or genre. Some mix/partner catalogues do not yet supply language metadata and therefore appear under the unspecified category. Warm-ups are not treated as sung songs. No database migration is required.

**PASS** database: language filtering occurs before pagination for generated songs, retains full visible language options, and preserves private/withdrawn/other-product isolation. Personal and public filters reset cursors when language changes; unknown and legacy metadata are covered.

**PASS** rendered Chrome and WebKit: mobile Community filters, later-page language requests, cursor resets, personal songs, favorites, missing metadata, style notes, Singing English/French selections and Aurowall. No page exceptions or horizontal overflow. [Browser receipt](browser.json), screenshots in this folder. [Native offline WebKit receipt](offline.json) checks all 14 songs, French filtering and unchanged warm-ups.

**PASS** physical iPhone 14 Pro (iOS 27.0.1): two account/language checks, the language/favorites UI flow, and style-note decoding/persistence. [Language receipt](native-language.json), [style receipt](native-style-note.json). Initial signing configuration and a Swift expression error were corrected before these passing runs; they were not counted as passes.

**PASS** native 0.11.0 (37) signed archive/export and bundle audit; uploaded to App Store Connect, processing pending. It includes these changes and the owner-approved Music DNA style guidance. Upload is not App Review approval. [Bundle audit](native-archive-audit.json).

The website production build, typecheck, 201 site tests, 30 database tests and bundle audit pass. Public activation remains held by the separately tracked hosted/economic/review requirements. [Style delivery and release work](../style-guidance-20261101/report.md).
