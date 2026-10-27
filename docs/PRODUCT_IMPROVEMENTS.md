# Cross-product improvements — 2026-10-27

**PASS scoped implementation and checks; PARTIAL overall product readiness. Publication HELD.**
The owner authorized the proposed improvement pass, then unlocked the phone for
verification. No push, deployment, new paid compute, licence purchase, live sales
activation or App Store submission occurred. Singing Academy remains **USD39 once**.

## What changed

| Product | Implemented change | Evidence and boundary |
|---|---|---|
| Singing Academy | Optional twelve-second comfortable-register check uses the existing microphone worklet and pitch gate, then recommends one of the three existing registers. Explicit octave feedback and actual song-section names improve practice advice. | Bounded note numbers only, no recording/upload; insufficient input preserves the selection. Grades and detector thresholds are unchanged. This is a starting register, not a measured full vocal range. Twelve songs and twelve warm-ups are bundled on iPhone. Natural sung demonstrations and broad physical accuracy remain open. |
| DJ Academy | The three most frequently failed tasks in the current lesson session produce specific practice suggestions. | Existing evaluator, controls, evidence and completion rules remain authoritative. No inferred artistic score or demonstrated novice-learning outcome. |
| Community | Explore → Discover for you uses saved styles/languages and ratings explicitly allowed for personalization, mixing familiar styles with new discoveries. | Only existing public-feed candidates can appear. Saved and disliked candidates are excluded. Private owner preferences are fetched once when selected, bounded to 500, with account matching and abort/timeout cleanup. No new polling or schema. Native Community keeps its existing filters/favorites/player; this discovery selector is web-only. |
| Improvise / Music DNA | Terminal status exposes the server's released credit reservation; failure/cancellation explains balance/retry, while reconnecting discourages duplicate paid requests. | Release follows the existing transactional settlement. No speculative refund on connection loss. Isolated database tests cover reserved/released state. This does not qualify new genres, voices, languages or hosted maximum-library generation. |
| Local Remixes | A short clean opening is followed by a quiet rhythmic pickup after the complete source plus breathing space, rather than an empty introduction. | Hip-hop/reggae/funk regression, block-size identity, preserved source bounds and full CTest pass. One actual 30-second synthetic-fixture render reduces the longest quiet opening from 4.00 to 0.48 seconds; the first source second, body events and voice events remain unchanged. Listening across styles is still required. |
| Website | Eight lossless WebP product images replace PNG delivery across homepage/products/Start/Tour. Original PNGs remain as source and AI DJ social metadata. | 1,595,650 → 954,958 bytes: **40.15% smaller**; all decoded RGBA pixels identical. No optimizer service, runtime dependency or extra Vercel CPU work. Field loading/CPU savings are not measured. |
| iPhone | Signed **0.10.3 build 31**, current shared songs/register/advice and remix engine; audited Release reinstalled after UI tests. | Three physical Community/Singing tests pass. Release install passes; subsequent automatic launch was denied because the phone relocked. No new archive/export/upload; retained build-30 archive remains historical. No physical iPad claim. |

## AI DJ experiment — not adopted

`apps/site/tests/dj-compatibility-audit.mjs` verifies hashes of twenty retained
original WAVs and reuses the actual analysis/planner for eighteen handoffs. A
finite-library candidate ordering improves eligible measured-beat handoffs only
from **4/18 to 5/18**, with average absolute normalized edge-energy difference
**1.36 → 1.07 dB**. Energy is not arrangement, harmonic fit or perceived intensity;
the experiment also has future knowledge unavailable to endless generation.
These results do not establish an audible improvement. The runtime mixer,
customer ordering, quality gates and generation recipes are unchanged.

The next quality experiment must produce fresh, compatible musical material and
qualify short natural singing; previously approved GPU trials are consumed.
Do not replay old outputs as fresh generation or claim this study trained a model.

## Verification

- 166 site tests, 44 shared audio/offline tests and 26 isolated PostgreSQL tests PASS.
- 20 CTest suites PASS, including the new short-source pickup regression.
- TypeScript, production website build, WASM/native build, Release signing and
  bundle privacy/resource checks PASS.
- Chromium/WebKit checks exercise synthetic register assessment, silence,
  permission denial/cancellation, discovery fixtures, practice suggestions,
  responsive layout and decoded product images. See the final browser report.
- Actual iPhone: Community language/favorites, bottom-player pause/seek/browsing,
  and Singing demo/tab cleanup: **3/3 PASS**. Community uses controlled fixtures;
  these checks do not prove provider playback, actual singing accuracy or payment delivery.

Reproduce from the repository unless otherwise noted:

```sh
node --test apps/web/tests/product-improvements.test.js apps/web/tests/singing*.test.js apps/web/tests/academy.test.js apps/web/tests/generation-progress.test.js apps/web/tests/offline-build.test.js
ctest --test-dir build-finish --output-on-failure
```

From `apps/site`, with Node 22 and the existing disposable loopback database:

```sh
npm test
npx tsc --noEmit
JAMLOOM_TEST_DATABASE_URL=postgresql://127.0.0.1:5432/jamloom_readiness_preview node --import tsx --test --test-concurrency=1 tests/cloud-songs.test.ts tests/creation-feedback.test.ts tests/apple-notifications-ledger.test.ts
node tests/product-improvements-browser.mjs
node --import tsx tests/dj-compatibility-audit.mjs
npm run release:preflight -- --database
```

Browser checks use the built, isolated preview at `http://127.0.0.1:3010`; existing
Playwright is used because the browser skill's runtime tool was unavailable.
No external request is permitted by the browser harness. A test-only microphone
stub initially interfered with DJ device initialization; it is scoped to Singing
pages. No application change is inferred from that harness failure.

Local remix comparison: <http://localhost:8766/product-improvements/review/>.
Listen before broad musical acceptance; the input is a synthetic one-second tone,
not an owner recording or a new generated DJ performance.

## Release checks and remaining gates

Read-only configuration/schema preflight finds **32 matching migration hashes**,
none pending/changed/unknown, with generation and checkout held. Live Stripe
read-only retrieval confirms the prepared **USD39 one-time** Singing product and
price are **inactive**. Its dedicated notification endpoint is absent; this is a
release prerequisite, not permission to activate or modify Stripe. Earlier real
Apple sandbox purchases/Restore remain valid historical evidence, separate from
real refund notifications and deployed/native receipt delivery, which are open.

Still PARTIAL / NOT RUN: professional DJ cohesion and fresh short singing;
sustained production generation capacity/cost; hosted jazz/voice/language and
5,000-favorite qualification; broadly accepted remix realism; natural sung lesson
guides; broader singing accuracy/physical latency and independent novice/listener
studies; reviewer access/credit-product metadata; deployed payment delivery and
provider refunds. Popular-song composition permissions/assets remain unavailable;
Tency's paid master quote is not accepted. Physical iPad is excluded by the owner.

See [evidence](evidence/product-improvements-20261027/validation.json) and
[all-product ledger](PRODUCT_COMPLETION.md). Historical dated checklists retain
their evidence; this pass supersedes their native-install and catalogue counts,
not their unfulfilled musical/provider requirements.
