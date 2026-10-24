# Homepage galleries, local review — 2026-10-24

**Implementation and local verification PASS. Not pushed or deployed.**

The owner now handles GitHub pushes in batches. Do not push or deploy subsequent work unless the owner explicitly changes that instruction. Leave the local preview available for review.

Both homepage listening collections use three rows per page: nine cards at the checked wide layout, six at the medium layout, three on narrow phones. Improvise has 56 examples and Music DNA has 101. Pagination and filters are independent; changing viewport column count resets that gallery to page one. Each showcase filters its source by product, so Improvise samples cannot appear in Music DNA. The separate listening-room validation view retains its mixed-product collection.

Reused the existing gallery with a homepage row count and unique section IDs; existing product-page anchors and row counts remain unchanged. The compact Music DNA preview stays available with a distinct accessible name. The invitation below the galleries reads “Your next song could be here,” offers both creation paths and preserves the choice to keep songs private. It does not automatically publish or feature user songs.

- PASS: `npm run typecheck`.
- PASS: Chromium and WebKit regression suite; exact three-row counts at 1280/800/390/320, next/previous navigation, genre filter/clear, correct product IDs and counts, no overflow, zero page errors, zero scoped Axe violations. Existing muted Music DNA example playback also passes. [Report](evidence/homepage-three-rows-20261024/browser.json).
- PASS: rendered inspection of [Improvise](evidence/homepage-three-rows-20261024/improvise.png), [Music DNA](evidence/homepage-three-rows-20261024/music-dna.png), [mobile](evidence/homepage-three-rows-20261024/mobile.png) and [invitation](evidence/homepage-three-rows-20261024/invitation.png).
- PASS: existing local development server returns HTTP 200 at `http://localhost:3000`, with the full homepage available. Server left running.
- NOT RUN: fresh production build, physical-device testing or deployment for this local presentation change. Existing Browser runtime is unavailable; the previously authorized Playwright fallback was used. No new generation, spending, data migration or publication.

Reproduce: with the site dev server running, execute `JAMLOOM_TEST_URL=http://127.0.0.1:3000 node --import tsx tests/visual-products-browser.mjs` from `apps/site`.
