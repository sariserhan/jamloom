# Mobile Community and Favorites — 2026-10-24

**Update 2026-10-25:** 0.9.2 (15) adds All songs, public DJ sets, anonymous catalogue access, Public-by-default cloud creation and landscape layout fixes. The earlier owner-preview restriction is removed for public reads in local website code; deployment is still pending. [Current report and evidence](public-community.md). The 0.9.0 acceptance below is historical.

**PASS implementation, iPhone owner check and iPhone/iPad simulator checks.** Jamloom 0.9.0 (13) adds Community as a main tab, with Jamloom examples, Community songs, Favorites, My songs and On device collections. Both Improvise and Music DNA use the existing website APIs and visibility rules. Songs load in pages, play on demand and have large play/heart controls, search, product and genre filters.

Favorites survive app relaunch and are isolated by account on this device. They store references, not offline audio or a new cloud library. Sign-out does not expose another account's favorites. Downloads retain the existing signed R2 URL allowlist, size and SHA-256 checks; leaving the screen or backgrounding stops playback and removes its temporary audio.

| Gate | Result |
|---|---|
| Native collection queries, malformed metadata/cursors, favorites persistence/account isolation | PASS automated AccountTests |
| Community, favorite, playback, relaunch and removal | PASS iPhone and iPad simulators using a debug-only fixture |
| Signed Release build, bundle verification, physical install/launch | PASS |
| Physical iPhone browsing/playback/Favorites | PASS owner: “Everything works” |
| Physical iPad, offline playback, cross-device favorite sync | NOT RUN / not implemented |
| App Store upload, push and deployment | NOT RUN |

[Retained evidence](evidence/community-20261024/). The initial iPad UI test assumed a bottom tab bar; the corrected platform-independent Community button selector passes. The authenticated preview keeps the existing website launch gate. The shipped release excludes the test fixture. A subsequent small retry-button fix stops existing playback before refreshing; covered by the updated simulator build, not a second owner observation.
