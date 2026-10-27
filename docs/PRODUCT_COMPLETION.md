# Product completion — 2026-10-27

**PARTIAL overall; publication HELD.** This is the current all-product ledger, refreshed against [final-gate evidence](FINAL_GATES.md), [completed payment/access work](COMPLETION_FOLLOWUP.md) and the [cross-product maintenance pass](PRODUCT_MAINTENANCE.md). Older dated reports retain their evidence, not a second backlog to reopen. Existing accepted products keep their scoped acceptance. Singing Academy is **$39 USD once**. No push, deployment, live purchase activation or App Store submission is authorized by this local continuation.

## Current maintenance and retained completion evidence

- Community loading races, stale player errors, cross-product discovery IDs and stalled support submissions are fixed locally. The direct bug-report page now hydrates under its actual CSP; forms prevent pre-hydration GET submission. [Tests and limitations](PRODUCT_MAINTENANCE.md).
- The latest archived/installed release remains **0.10.2 build 26**. This new Community source fix passes simulator tests but has not yet been packaged or installed on the disconnected physical phone. Apple still has build 24 selected in the unsubmitted draft. The earlier build-24 physical checks below remain historical evidence.

- Singing Academy now appears in the existing homepage choices and product chapters, Start, Tour and coming-soon catalogue. Its image is a capture of the actual original-song interface. Access flags are unchanged.
- The coming-soon footer now exposes the existing public Report a bug flow. Eleven product guides, rating persistence and bug delivery to the private admin inbox pass in Chromium and WebKit against disposable local accounts.
- DJ Studio structured data correctly distinguishes free Basic from $49 Pro. The existing product and payment flows are unchanged.
- Product regressions now follow the shared catalogue and current four-MiB Music DNA request limit. Invalid profiles, oversized requests, authentication, account isolation and disabled credit purchases are separately checked.
- Earlier signed **iPhone 0.10.2 (24)** passed bundle/signature audits and was installed/launched. Five physical tests passed: two local-server tests, Community language/favorites, player pause/seek/browsing, and Singing playback/tab cleanup. That build carried the then-current shared audio implementation; it does not establish real singing accuracy or an authenticated owner rating save.
- The old temporary R2 probe returns authenticated HEAD 404 after its expiry deadline. This establishes current absence, not the exact deletion time or independently proven deletion cause.

## Every product

| Product | Current result | What remains |
|---|---|---|
| DJ Studio Basic / Pro and Live DJ | **PASS accepted v1**, historical owner acceptance retained; current site smoke PASS | Deferred MIDI/headphone/unplug qualifications remain NOT RUN, not reopened v1 blockers. [Accepted scope](pro-v1-release.md) |
| DJ Academy | **PASS accepted course**, historical owner acceptance retained; guide/navigation regression PASS | Novice learning outcomes and future course-sales activation are separate. [Evidence](academy-release-checks.md) |
| Local Remixes | **PASS implemented local flow / PARTIAL musical coverage** | Broader style-quality acceptance; current work does not promise professional output in every style. Cloud-only public sharing still excludes local recordings unless explicitly saved online |
| Improvise | **PARTIAL**: functional local/cloud implementation and selected accepted songs | Remaining hosted style/voice quality and production operating qualification. Preserve failed jazz balance evidence; a local correction is not a hosted retest. [Prior qualification](completion-followthrough.md) |
| Music DNA | **PARTIAL**: favorites, catalogue search/imports, 5,000-reference planning, cloud result flows implemented | Broad musical/language quality and maximum-library hosted qualification; optional personal Apple Music import has no owner account test. Spotify access does not establish permission to train on its music. [Evidence](music-dna-completion.md), [scale](project-completion-20261023.md) |
| Singing Academy | **PASS song-course mechanics / PARTIAL analysis**: eight originals, complete lyrics, sections, warm-ups, unlimited practice and live feedback; owner accepted web and iPhone flow | Latest paired quiet capture rejects all frames; instructed singing detects pitched input in all three phases with zero quiet detections. The current-source labelled corpus measures 86.76% within 50 cents including misses across 40 recordings/29 singers; this previously inspected corpus is not an independent holdout. These measurements remain separate from the owner diagnostic; physical latency and broader live accuracy remain unqualified. Six popular songs require supplier permissions/assets; owner reports no reply. [Course](SINGING_COMPLETION.md), [input evidence](RELEASE_CLOSURE.md) |
| AI DJ | **PARTIAL**: controls, beat/mixer actions, buffering, bounded fresh sessions, credits, recording/privacy and stem prototype implemented | Broader professional musical acceptance, reliably cohesive new material, fresh independent parts and sustained customer capacity/cost qualification. The retained short vocal was rejected by the owner; local boundary/onset corrections are technical improvements, not natural-singing acceptance. Accepted 192.863-second stem arrangement develops one original; it is not endless fresh generation. The corrected fresh twenty-track two-listener qualification now passes recovery, complete recording, credits, privacy and cleanup. Owner accepts these two instrumental sets and transitions (“they are fine”); historical failed attempts and broader quality gates are retained. [Latest result](DJ_RELEASE_QUALIFICATION.md) |
| Community, Favorites, ratings, guides, bug reporting/admin | **PASS scoped implemented flows**, current browser persistence/admin checks and physical Community playback PASS | Actual signed-in owner rating save was not performed on the phone. No private recordings were made public; only cloud-saved results enter sharing flows |
| iPhone app | **PASS previous build-26 install/launch and scoped physical checks; PASS new Community simulator regression** | Build 24 remains VALID with icon and selected in the unsubmitted Apple draft. Build 26 is the latest signed local archive and was installed/restored. The new Community source fix is not yet packaged/installed; the phone is currently disconnected. Real Apple sandbox receipt chain, physical iPad and unavailable audio routes remain NOT RUN. No physical foldable/dual-screen qualification is claimed |
| Account, privacy, billing and operations | **PASS scoped service tests / PARTIAL launch** | Live payment acceptance and product-specific activation remain separate; no existing sales settings changed. Deletion fulfillment passes isolated failures, disposable R2 storage and 1,000-track resumption; no real customer was deleted. Singing $39 Stripe test-mode purchase/refund/dispute and protected course-content checks PASS. Apple Singing is READY_TO_SUBMIT at exact USD39, while credit products still need review metadata and reviewer access. The real Apple sandbox purchase/restore/refund chain remains NOT RUN; local Xcode StoreKit receipts do not qualify. Cost guards remain local, so production Vercel savings are unmeasured |

## Reproducible evidence

[Latest maintenance manifest](evidence/product-maintenance-20261027/validation.json) records current regression checks. The [earlier product-closure manifest](evidence/product-closure-20261026/validation.json) retains its base commit, log hashes and screenshot provenance. Earlier database and physical checks below were not all repeated during this maintenance pass.

- **160/160 website tests**, **100/100 isolated Postgres tests**, TypeScript and isolated production build/bundle audit PASS.
- [18-route browser report](evidence/product-closure-20261026/browser.json): Chromium/WebKit at 1440, 390 and 320 px, server rendering, DNA persistence, audio decode and capture-permission simulations. WebKit supplied no synthetic audio tracks, so its PCM filter subcheck is explicitly NOT RUN.
- [Visual report](evidence/product-closure-20261026/visual.json): all seven choices fit the tested initial viewport, preview switching and images, three-row galleries/pagination and seven product routes; zero checked Axe violations. Coming-soon HTML is a rendered response fixture, not production deployment.
- [Feedback report](evidence/product-closure-20261026/feedback.json): eleven guides, focus/blur/escape/close, rating save/reopen/delete and anonymous bug-to-admin. Email stays in the local outbox.
- [HTTP report](evidence/product-closure-20261026/http.json): real local auth, isolation, concurrency, request bounds and payment signature/replay/live-mode rejection. No provider transaction or credits minted.
- [Physical tests](evidence/product-closure-20261026/phone-tests.json), [signed release](evidence/product-closure-20261026/phone-release.json), [R2 observation](evidence/product-closure-20261026/storage-expiry.json).

Commands used from `apps/site` with Node 22.23.1:

```sh
npm test
npx tsc --noEmit
JAMLOOM_TEST_URL=http://127.0.0.1:3008 npm run test:product-browser
JAMLOOM_TEST_URL=http://127.0.0.1:3008 node --import tsx tests/visual-products-browser.mjs
```

The HTTP/feedback scripts require `JAMLOOM_QUALIFICATION_BUILD=1` and an isolated loopback `JAMLOOM_TEST_DATABASE_URL`; they create/dispose test databases. This pass used unique `JAMLOOM_EVIDENCE_DIR` destinations to preserve older reports. Database suites: academy, admin, account-deletion, creation-feedback, dj-recordings, dj-sessions, wallet, dna-commerce, cloud-songs and listening-library, serial execution.

## Next actual closure work

1. Qualify singing accuracy and physical latency beyond the latest successful silence rejection and observable pitched input. The owner performed a 30-second silent paired capture and a subsequent live singing check; audio stays only in their tab. Do not lower thresholds to hide historical failures.
2. Continue AI DJ musical/coherence work using accepted material and existing engines. A fresh paid qualification needs a new bounded authorization because prior permits are consumed. Repeated local mixes alone cannot establish nonstop unique generation.
3. Complete provider-specific payment/device/release gates when the corresponding environment is available. Publish this tested candidate only after explicit approval; keep current flags and rollback review attached to that release.
4. Wait for concrete popular-song permissions and assets. No purchase, unlicensed recording import or new supplier message is authorized by this completion pass.

The updated candidate is built in `apps/site/.next-qualification`; the earlier account-enabled previews remain at **http://localhost:3008** and **http://localhost:3000**. The updated preview is **http://127.0.0.1:3010**, with the existing isolated loopback preview database, local email/audio directories and generation disabled. Automated authenticated tests use their own disposable server/database. No percentage-complete claim is made: the open quality and provider gates are substantive.
