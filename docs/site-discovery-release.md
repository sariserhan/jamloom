# Website discovery and listening release — 2026-10-25

The owner requested all eight proposed improvements and explicitly authorized pushing and deploying after verification. This replaces the earlier no-push instruction for this release. Generation quality gates, new compute budgets, live purchases and autonomous DJ service activation are separate.

## Customer changes

1. `/start` is a visual chooser for all six existing products, with screenshots and one-sentence directions. The homepage and navigation link to it. Unreleased studios take anonymous visitors to the matching product-tour chapter instead of sending them back to the homepage.
2. `/community` brings together all 166 curated songs, public Improvise and Music DNA results, public complete DJ recordings and approved uploaded mixes. Search, style/mood, activity shortcuts, collection tabs and sorting operate on loaded results; explicit Load more follows each collection’s own cursor. Pagination shows three rows at the actual screen width. Published artist credits have `/creators/[credit]` pages; these do not reveal account identities or claim verified identity.
3. The existing persistent player now includes previous/next, a visible editable queue and browser favorites. Playback continues across Next.js page navigation. Standalone local studios remain separate audio workspaces; private My songs playback stays on its own page. Existing account playlists remain available. Favorites are stored in this browser, not synchronized to other devices.
4. `/listen/[kind]/[id]` provides public song/set pages, deterministic cover artwork, metadata cards, sharing and a bounded 15-second waveform video export. Exports run on-device only when requested, provide cancellation, release audio/video resources and report unsupported browsers. Playback routes recheck publication status; no private song becomes public through sharing.
5. Existing Music DNA feedback supports an optional timestamp, current-player marker, Weak opening and Awkward transition. Cloud timestamps cannot exceed the stored audio duration. Account isolation, explicit training/personalization choices, withdrawal and owner-only training permission remain enforced. Feedback on stored songs works independently of generation availability.
6. Narrow screens have a menu button, meaningful loading/empty/retry states and bounded visible song cards. Collection requests run independently so available music appears while other sources load; audio stays `preload=none` and starts only on user action.
7. `/admin/operations` uses the existing administrator check and shows seven-day job outcomes, recorded costs, pending cost records, credit returns, purchase credit reversals, stored audio and newly retained bytes. The 166 curated audio receipts are listed separately. It does not claim provider-invoice reconciliation or net R2 bucket growth; temporary/untracked objects and idle compute are excluded explicitly.
8. `/tour` presents actual workspace images, concise product descriptions and a working two-deck crossfade demonstration using existing cleared practice music. Release screenshots and a launch copy pack accompany the implementation.

## Boundaries

- Homepage, starting points, discovery, public track pages and the tour are published. Existing private collections, accounts, administration, generation and purchase authorization remain enforced. Public catalogue read routes are narrowly allowed through the launch gate.
- No new database migration is required. The production Neon ledger was checked read-only: 28 applied files, no missing migrations and no checksum differences.
- No new dependencies, rented GPUs, purchased assets or paid APIs.
- Automated media checks establish functioning playback/export, not new musical-quality acceptance. Venue use and expert DJ phrasing remain open in the AI DJ readiness tracker.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Website unit tests | PASS — 136 | [Log](evidence/site-release-20261025/unit-tests.log) |
| Database, credits, privacy and recording regressions | PASS — 45 | [Log](evidence/site-release-20261025/integration-tests.log) |
| TypeScript and production build | PASS | [Build](evidence/site-release-20261025/build.log) |
| Browser flows | PASS — Chromium and WebKit | [Checks](evidence/site-release-20261025/browser-checks.json) |
| Responsive layout | PASS — 1440, 390 and 320 px; three rows; menu and player | [Mobile](evidence/site-release-20261025/community-390.png), [desktop](evidence/site-release-20261025/community-1440.png) |
| Accessibility | PASS — no WCAG A/AA violations in chooser, Community and tour | Browser checks above |
| Video exports | PASS — both engines, video plus measured audible audio, approximately 15 seconds; cancellation | Browser checks above; synthetic tone fixture only |
| Client bundle | PASS — 47 client files, no server secrets | [Audit](evidence/site-release-20261025/bundle-audit.json) |
| Production database compatibility | PASS — read-only ledger comparison and operations queries | [Database check](evidence/site-release-20261025/database-check.json) |
| GitHub push and production deployment | PASS — correction `0d67151`, Vercel `dpl_CkNGc2yMq73XdEkV2tFtyanUY116` | [Deployment](https://vercel.com/ssari/jamloom/CkNGc2yMq73XdEkV2tFtyanUY116) |
| Anonymous production APIs and real R2 playback/export | PASS — 166 curated songs, both browser engines, mobile, favorites and continuous navigation | [Live checks](evidence/site-release-20261025/production-checks.json) |
| Full hosted CI | PASS — all eight jobs, including iPhone compilation, Mac companion, sanitizers and cross-platform comparison | [CI receipt](evidence/site-release-20261025/hosted-ci.json) |
| Corrected wallet/allowance suite | PASS — 55 locally; hosted Academy and website jobs pass | [Wallet log](evidence/site-release-20261025/wallet-ci-fix.log), [CI](https://github.com/sariserhan/jamloom/actions/runs/40177186575) |

The browser suite exercises real authentication and isolated PostgreSQL state, public/private/withdrawn metadata, artist-credit lookup, failed-feed recovery, continuous playback across navigation, favorites after reload, actual canvas/audio video export, artwork download, feedback save/reload and administrator isolation. Audio export uses a synthetic tone; no generated-quality claim is inferred.

Browser verification caught and fixed URL-encoded artist credits, resize callbacks after unmount, speculative-prefetch cancellation in WebKit and cancellation during export startup. Song writes now compare their Origin with the configured application origin, because Next.js can expose an internal localhost origin to route handlers; forged origins remain rejected.

Reproduce from `apps/site` with Node 22, a built site, Playwright browsers, FFmpeg and local PostgreSQL:

```sh
npm test
JAMLOOM_TEST_DATABASE_URL=postgresql://127.0.0.1:5432/postgres node --import tsx tests/discovery-browser.mjs
npm run audit:bundle
```

The isolated browser suite cleans its test database, accounts and audio. Real production audio and the public collection/audio endpoints consumed by the phone now pass after the GitHub deployment. Physical iPhone playback has not been repeated in this website release.

## First hosted verification and corrections

Implementation `80c1243` was pushed through GitHub and Vercel deployment `dpl_2YCJzKZXc8QoS5Wm3LX1Bv7arERr` reached READY on the production domains. Initial read-only verification found the public DJ-set feed returning 503 because Production lacked `R2_AI_DJ_BUCKET`. The already-existing dedicated bucket `jamloom-ai-dj-sessions` is now configured for the next Git deployment; no new bucket, credential permissions, generation flag or purchase flag was introduced.

GitHub run [40176946471](https://github.com/sariserhan/jamloom/actions/runs/40176946471) passed the website and desktop jobs but exposed a hard-coded passwordless database URL in the DJ allowance test and concurrent database-drop timeouts in the wallet test group. The allowance test now uses the existing isolated test URL and loopback guard; wallet test files run sequentially while their internal concurrency assertions remain intact. Production database timeouts are unchanged. The correction deployment passes anonymous production APIs and real R2 playback/video export in Chromium and WebKit. No hosted customer data was written by these checks.

Production Community currently contains 166 curated songs; public customer DNA/Improvise collections, DJ sets and uploaded catalogue feeds return valid empty lists. Test qualification outputs were not republished. The browser harness waits for populated cards rather than assuming an empty feed response means all collections have finished. Reproduce the read-only live check with `node tests/discovery-live.mjs` from `apps/site`.

All eight hosted CI jobs pass on `0d67151`. The final follow-up contains release evidence, tracker updates and live-check timing/screenshot stabilization only; application runtime source is unchanged from that fully verified deployment.
