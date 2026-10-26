# Current candidate: Jamloom 0.10.2 build 24 — 2026-10-26

**PASS archive, distribution export, static privacy/license audit, Apple validation and upload; processing VALID with icon; build 24 selected in draft 0.10.2; review NOT SUBMITTED.** [Closure report](RELEASE_CLOSURE.md). App Store draft metadata now describes the current original-song Singing Academy, Community, local favorites/sync, DJ Deck and existing creation flows, with cloud generation and purchases explicitly unavailable. Reviewer notes and content-rights declaration are saved. [Exact listing](evidence/release-closure-20261026/apple-draft-request.json).

Six actual-UI screenshots in required iPhone/iPad sizes report COMPLETE. [Apple screenshot evidence](evidence/release-closure-20261026/apple-screenshots.json). This closes screenshot preparation, not actual iPad/Duo singing qualification. Current distribution package: `build-ios-store/export-0.10.2-24/Jamloom.ipa`; [hash and validation](evidence/release-closure-20261026/distribution-export.json). The historical build 12 is VALID and includes its icon. Current app record is Jamloom, ID 6826480059, bundle com.djayvo.app.

Three consumable records still report MISSING_METADATA; availability, purchase-review screenshots and real Apple sandbox/server delivery remain open. Dedicated reviewer credentials and the account-deletion operating process must be ready before submission. No review submission, live purchase activation or public release is authorized by this draft preparation.

Earlier candidate notes below are historical and must not be treated as current build or upload status.

## 0.9.6 build 21 rating correction — 2026-10-26

**PASS build, signed bundle audit, installation and isolated Simulator save/reopen flow; PARTIAL physical save verification.** Save now opens sign-in when necessary instead of staying disabled, retains the chosen rating through sign-in, and allows retry after loading errors. “Help improve Jamloom” is removed from the phone rating screen as requested; this grants no training permission. The website endpoint is deployed. The owner confirms Save opens sign-in, clarifies they do not sign in and requests moving on. Authenticated saving was not exercised on their phone. No App Store submission or public release.

[Owner/device evidence](evidence/product-release-20261026/ios-feedback.json), [bundle audit](evidence/product-release-20261026/ios-096-21-bundle.json), [saved Simulator rating](evidence/product-release-20261026/ios-rating-saved.png).

# Jamloom 0.9.5 candidate addendum — build 18

**PARTIAL release preparation.** Question-mark product guides, cross-product ratings and explicit training permission are implemented. Simulator account/API tests and help/landscape interaction checks pass; the signed device Release build and bundle privacy audit pass. This candidate is not installed on the physical phone, uploaded or submitted. Deploy the matching website feedback endpoint before installing it for customer use.

Privacy delta from the published October 24 answers: optional account-linked generated audio, ratings and user IDs may be used for model improvement after owner permission and rights review. Audio, user content and user ID add Other Purposes; rating/user-ID analysis adds Analytics. No tracking or analytics SDK is added. The native manifest and website disclosure are updated; **App Store Connect answers for this delta were published October 26**; [evidence](evidence/product-release-20261026/app-privacy.json). Public/private visibility does not decide training permission. Local ratings do not upload audio.

[Implementation and verification](product-feedback.md). Historical listing text and evidence below describe the earlier candidate and must not be mistaken for 0.9.5 release evidence.

## Historical Jamloom 0.8.0 release packet

Status: **PARTIAL — prepared for owner review, not submitted to Apple.** Bundle `com.djayvo.app`, version 0.8.0, build 12. The historical bundle ID preserves existing installations; the product name is Jamloom.

## Reviewable listing draft

**Name:** Jamloom

**Subtitle:** Record, remix and mix music

**Category:** Music

**Support:** https://www.jamloom.com/support

**Privacy:** https://www.jamloom.com/privacy

**Contact:** support@jamloom.com

Record a short phrase and turn it into a musical preview. Load your own tracks into two DJ decks, shape the mix with the crossfader, and explore performance pads and effects. Save your creations locally and share a WAV through Files or another app you choose.

Jamloom adapts its controls for iPhone portrait, landscape and iPad layouts. Music DNA uses your favorite tracks and preferred language to guide the same song service as the website. Type a song or artist to see catalogue suggestions without an Apple Music account. Import public or unlisted YouTube Music playlists, review catalogue-matched songs and add them to your favorites. Optionally connect Apple Music to preview and import starred names from your library. Optional cloud creation shows its availability and asks for consent and a price confirmation before starting. Cloud creation and credit purchases are not publicly available in this candidate.

Use recordings and music you have permission to process. Local creation works without an account. An account is required for cloud features. Spotify playback, import and AI ingestion are not included.

**What's new:** Simplified Music DNA with automatic saving and removable favorites; manual musical-direction controls removed; in-app account-deletion requests; YouTube Music playlist import with catalogue matching and review; account-free song and artist suggestions while typing; optional Apple Music starred song and artist import with explicit permission and review; shared professional landscape DJ deck; native cloud Music DNA flow with language choice, catalogue search and up to 5,000 favorites; quote confirmation, interrupted-request recovery and verified private audio downloads; improved saved-profile loading.

## Reviewer notes

Start with local Improvise and DJ Deck; these do not require sign-in. Microphone capture starts only after Record and system permission. An imported recording is also supported. Open DJ Deck and rotate to landscape to see both decks and the mixer. Load cleared tracks through Music. Playback stops on backgrounding or when leaving the deck.

Music DNA supports local favorites and retains earlier instrumental previews. New Music DNA songs use the shared cloud service. Its cloud button deliberately reports unavailable while the public service is gated. Purchases are disabled in this binary. Do not describe these unavailable services as released functionality in final metadata. No reviewer credentials are embedded in source or this packet; configure a dedicated verified review account only when a final submission is authorized.

Signed archive, distribution export, bundle audit and physical installation pass. Upload passed; Apple processing, App Review approval and public availability remain separate gates.

## Privacy answers for review

No tracking or advertising. Pasting a YouTube Music playlist link sends it to Jamloom for public playlist lookup and catalogue matching; only reviewed catalogue names and genres are saved. No YouTube audio or artwork is imported. Apple Music authorization and library requests occur on device; only reviewed names and available genres are stored, with no audio or artwork copied. Imported preferences leave the device only through the existing explicit account sync or cloud-creation flows. The native manifest and published App Store privacy answers declare account-linked email, user ID, user content, audio, purchase history, customer support and coarse country for app functionality. User content, country and user ID also support product personalization. Music searches are cached without account identity for at most one hour and declared as unlinked search history. Local recordings/previews stay local; explicit cloud creation uploads the selected recording or favorite metadata. Account profile sync is explicit. Private generated audio uses authenticated access and temporary signed storage URLs. The native app does not include an analytics SDK. Exported copies remain under the destination app's control.

These answers were published and verified after reloading App Store Connect on October 24. Account deletion can now be requested inside the app; support completion and retention timing still need operational confirmation before public release. Deleting local data or a Music DNA profile does not delete the account.

## Remaining external gates

- Jamloom App Store Connect draft (6826480059) and three consumable product records now exist, with English localizations and draft USD prices ($9.99, $24.99, $49.99). Availability, review metadata and signed receipt/notification delivery remain unfinished. The owner confirmed an existing Sandbox Apple Account is signed in on the phone. Existing local StoreKit tests do not prove Apple sandbox delivery. Current credit verification accepts USD list prices only; product availability must match that supported storefront before activation.
- Distribution signing/export and published privacy answers pass; age-rating answers are saved. Upload/processing, App Store screenshots in required sizes, content-rights answers, reviewer access and owner submission approval remain tracked separately.
- Actual iPad and Duo, headphones/Bluetooth/MIDI routes and unplugged battery measurements. Simulator and injected fold geometry cannot substitute for these.
- Independent listening and novice Academy observations where required by the product release gates. Owner Academy acceptance already exists; do not ask for that same acceptance again.

Technical screenshots: [native Music DNA](evidence/project-completion-20261023/native-dna-cloud.png), [owner-accepted iPhone deck](evidence/project-completion-20261023/iphone-pro-studio-landscape.png). These are evidence captures, not a completed App Store screenshot set.

Apple references checked: [privacy details](https://developer.apple.com/app-store/app-privacy-details/), [server verification library](https://github.com/apple/app-store-server-library-node). Original master specification is unchanged.

## App Store icon

PASS: the signed app includes the iPhone/iPad AppIcon assets and the source asset has a 1024px App Store icon. At the time of this historical note, App Store Connect reported zero uploaded builds. Current verification supersedes it: build 12 is VALID with an icon asset, and build 24 has uploaded. No icon-only upload is needed. [Apple instructions](https://developer.apple.com/help/app-store-connect/manage-app-information/add-an-app-icon/). Upload/submission remain separate from local build and draft metadata preparation.
