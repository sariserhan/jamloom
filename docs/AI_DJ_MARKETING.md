# AI DJ public discovery — 2026-10-27

**PASS local marketing scope; PARTIAL overall product readiness; publication HELD.**

AI DJ now appears in the shared homepage hero selector and product chapter, desktop/mobile navigation, Start page, product tour and coming-soon catalogue. The hero retains Music DNA as its initial selection; choose **Let AI DJ** to see the deck preview. The shared navigation also reaches hosted static studios through the existing studio preparation step.

`/ai-dj` now provides an anonymous product overview in production when beta access is unavailable. Invited beta users and local development retain the existing performing deck. The overview explains party naming, direction controls, session continuation, complete recordings and public/private choices. It prominently states that public generation is not open. Links lead to the existing public sets page and related studios, not a paid Start action. Sitemap, robots, canonical metadata and social image cover the public overview.

The marketing image is a screenshot of the actual deck with two existing cleared practice tracks, waveforms, jog wheels, mixer and pads. It is labelled as a preview; it is not evidence of freshly generated music or new musical quality. [Image provenance](evidence/ai-dj-marketing-20261027/artwork.json).

## Verification

| Check | Result |
| --- | --- |
| Website test suite | PASS: 165 tests, no skips or failures |
| TypeScript and production qualification build | PASS |
| Chromium 149 / WebKit 26.5 | PASS: 1440, 1280, 390 and 320 px |
| Hero selection, image loading, main navigation, overview, FAQ, public sets, Start and Tour links | PASS |
| Overview automated WCAG 2 A/AA, 2.1 AA and 2.2 AA scans | PASS: no reported violations at all eight browser/viewport combinations |
| Overflow and uncaught page errors | PASS: none in scoped browser run |
| Anonymous session/recording reads and session-start denial | PASS: existing restrictions remain |
| Launch-hold overview and private/paid API boundary regression | PASS |
| Manual visual inspection | PASS: captured real deck, desktop hero and mobile overview |
| Physical phone / screen reader / production publication | NOT RUN in this marketing pass |

[Browser evidence](evidence/ai-dj-marketing-20261027/browser.json), [site tests](evidence/ai-dj-marketing-20261027/site-tests.log), [build](evidence/ai-dj-marketing-20261027/build.log).

Reproduce against a built production preview with beta/cloud generation disabled:

```sh
cd apps/site
npm test
npm run typecheck
JAMLOOM_QUALIFICATION_BUILD=1 npm run build
JAMLOOM_TEST_URL=http://127.0.0.1:3010 node tests/ai-dj-marketing-browser.mjs
```

The browser check defaults to `/tmp/jamloom-ai-dj-qa` for screenshots and JSON. It blocks external traffic and asserts a loopback target. This pass does not rerun the database-backed listening-library workflow or paid generation. Its obsolete anonymous AI DJ 404 assertion is updated for the public overview; private API assertions remain intact.

Preview: http://127.0.0.1:3010/ and http://127.0.0.1:3010/ai-dj. No dependency, audio engine, price, customer database or feature activation changed. No push, deployment, GPU rental, app upload or sales activation. Wider musical quality, capacity and external release gates remain in [the product ledger](PRODUCT_COMPLETION.md).
