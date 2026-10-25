# Public cloud music and mobile deck repair — 2026-10-25

**PASS implementation, website deployment and public production API checks; PARTIAL native release.** Jamloom 0.9.2 (15) is signed, installed and launched on the owner's iPhone. The owner-authorized website deployment removes the blanket public-song gate. Anonymous production reads now return all 166 curated songs, public collection feeds and valid R2 audio. A new physical iPhone Community check and App Store upload remain NOT RUN. [Website release and live evidence](site-discovery-release.md).

The cause of the missing mobile songs was the blanket coming-soon proxy gate returning HTTP 503 before the public song handlers ran. The initial 0.9.1 owner-sign-in explanation was incorrect and is superseded. A narrow GET exception now admits public song collections, authorized audio and public DJ sets. Existing handlers still check private ownership, public consent, withdrawal, billing mode and recording completeness. Generation, input recordings and other launch-gated APIs remain closed.

## Behavior

- Community opens on **All songs**, combining the website's 166 curated songs, published Improvise/Music DNA songs and complete public AI DJ sets. Public collections need no account. Favorites include sets; My songs still requires an account.
- Cloud creation defaults to Public on web and iPhone, with an explicit Private choice before quoting/submitting. Private pricing remains bound to the quote. Changing native privacy invalidates the quote. The creation UI explains public sharing, including source-clip portions incorporated into an Improvise result.
- Existing private/withdrawn songs stay private. No rows were republished. No migration or hosted database write was needed.
- Homepage Improvise/Music DNA showcases include community songs first, retain three-row pagination and refresh on focus/each minute. A public DJ-set preview links to the paginated complete-set page.
- This policy applies only to cloud-saved results. Local Remixes, manual on-device DJ recordings and original source files retain their existing local storage/upload consent behavior.
- Full sets stream through an iOS WebKit audio player; they are not downloaded into the short-song WAV path. Playback stops on closing, leaving Community or backgrounding. WebM/Opus set playback requires iOS 17.4 or newer; older supported systems receive an update explanation. [WebKit support](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/).
- Mobile deck corner ornaments are removed so they cannot cover headings. Compact landscape wheels show BPM and elapsed time without the redundant deck name, with a larger center display. Narrow landscape pitch controls use one column so they do not collide with the wheel. Desktop styling is unchanged.

## Evidence

| Check | Result |
|---|---|
| Website tests | PASS 129 |
| Private/public songs, quoted prices, withdrawals and AI DJ session/recording access | PASS 46, disposable local PostgreSQL |
| Homepage community entries, refresh, three-row paging, DJ sets, privacy default, pricing, actual muted audio and accessibility | PASS Chromium + WebKit |
| Cloud upload/submit, Public/Private pricing, reconnection and cancellation | PASS Chromium + WebKit, fixture generation only |
| Native account/catalogue/privacy/set validation and actual WebM playback | PASS 15; two optional HTTP harnesses skipped in the general run |
| Separate native public HTTP harness | PASS all 166 curated entries, no account, two actual R2 audio downloads verified and removed |
| Native Community/Favorites/playback, outage, landscape and rotation | PASS four iPhone simulator UI tests |
| Deck collision assertions, loaded playback/Stop, pads and rotation sizes | PASS WebKit; portrait, compact landscape, iPad dimensions and injected fold geometry |
| Final production HTTP reads with coming-soon enabled | PASS public collection/audio routing; private-input and generation routes remain gated |
| Production build, client-secret audit, signed iOS bundle | PASS; test-only manifests/audio excluded from Release |
| Physical installation/launch | PASS 0.9.2 (15), launched after the owner unlocked the phone |
| Owner review of this landscape update | PASS: owner says “Looks clear now” on installed 0.9.2 |
| Physical iPad/foldable | NOT RUN |
| Website push/deployment and anonymous production collection/audio checks | PASS — GitHub deployment and Chromium/WebKit real R2 checks |
| Fresh physical iPhone Community check and App Store upload | NOT RUN |

[Machine-readable checks](evidence/public-community-20261025/checks.json), [HTTP status/counts](evidence/public-community-20261025/public-http.json), [homepage browser checks](evidence/public-community-20261025/home-browser.json), [deck geometry](evidence/public-community-20261025/deck-webkit.json), [before](evidence/public-community-20261025/deck-before.png), [after](evidence/public-community-20261025/deck-after.png), [native landscape](evidence/public-community-20261025/deck-native-landscape.png).

Full local Xcode logs/xcresults are retained in `renders/mobile-community-fix-20261025/`: `final-phone-tests`, `final-native-http`, `final-device-build.log`, `final-bundle.json`, `final-install.txt` and `final-launch-unlocked.txt`. The first WebM test used an unattached view and failed; attaching it to a real window fixes the harness and actual playback passes. No codec workaround or production bypass was introduced. Existing owner evidence for 0.9.0 remains historical and does not count as acceptance of this update.

On 2026-10-25 the owner reported Community was unavailable. A fresh anonymous production GET `/api/catalogue` returned HTTP 503 with the coming-soon message, confirming the website fix was then awaiting owner deployment. The later owner-authorized website release resolves this HTTP gate; the hosted verification above supersedes that result. Signing in or reinstalling the phone app does not remove that server gate.
