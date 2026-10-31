# Pre-push audit — 2026-10-31

PASS for this code batch. This is local release preparation, not deployment or live-payment qualification.

## Repairs

- Library saves now start private and reset to private after saving, including after an explicitly public submission. Imported browser sessions retain the visibility already chosen by their owner. Public sharing still requires explicit permission and catalogue review.
- Corrected old public-default and privacy-surcharge text on the homepage, library, AI DJ, shared web help and iOS help/privacy sheet. Session descriptions now include the chosen generated-minute limit.
- `/account/credits` reaches its own authentication in preview mode. Payment and generation APIs remain held. Unrecognized account subpaths remain gated.
- Removed the superseded independent-listener prerequisite from the examples copy.
- Updated browser checks and their quote fixtures for the current 20-credit Music DNA price and private defaults. Repaired a dangling conditional in the commerce runner, outdated homepage player selectors, hidden navigation-cache form selectors and refresh timing.
- The preceding image repair is commit `87476cff`; all product WebP previews bypass the launch proxy.

## Verification

- **PASS:** production build with Node 22 and `JAMLOOM_QUALIFICATION_BUILD=1`; 181 site unit tests; TypeScript check; browser bundle/packaged studio audit (50 client files).
- **PASS:** Chrome and WebKit, public home/tour/start/pricing/AI DJ/Live DJ/privacy pages at 1440, 390 and 320 px. All rendered images decode, no horizontal overflow or page errors. [Results](public-pages-library.json).
- **PASS:** real local PostgreSQL/auth/upload flow: new and reloaded saves are private, private uploads reject anonymous playback, and a public submission resets the next save to private. Both browsers pass.
- **PASS:** Music DNA confirmation, 20-credit initial price, higher-quote second confirmation, private default, community refresh, pagination and exclusive audio playback; scoped accessibility checks report zero violations in both browsers. Generation transport is a fixture. [Results](dna-prompt-browser.json).
- **PASS:** real local HTTP/auth/ledger and synthetic worker: public and private Music DNA each consume 20 credits, replay is not charged twice, private audio rejects anonymous and other-account requests, and withdrawal removes the public listing. Chrome/WebKit, 1280/390/320 px, zero scoped accessibility violations. No model/GPU or Stripe calls. [Results](dna-commerce-browser.json).
- **PASS:** production-build preview mode: anonymous Credits navigation reaches sign-in, the verified test account reaches its balance, purchase/trial buttons are disabled, and payment/private-generation endpoints return 503. Images still decode. [Results](preview-gate.json).
- **PASS:** read-only production schema audit: all 33 migration hashes match; no pending, changed or unknown migrations. This reads local process configuration, not deployed environment variables. Live checkouts remain disabled; cost qualification and live Creator price/portal configuration are absent. [Results](release-preflight.json).
- **PASS:** Swift parser check for the two text-only native edits; JavaScript syntax checks for updated browser runners.
- **NOT RUN:** a fresh native build/device run for these copy-only changes. The full landing/audio-generation suite and development-only AI DJ setup suite were not completed in this production-build audit; focused library coverage is above. The AI DJ setup route correctly remains unavailable in production.
- **NOT RUN:** deployed verification after the owner's next push, live purchase activation, new GPU/model generation or additional human musical judgments. Existing v1 deferrals remain unchanged.

## Reproduction and artifacts

From `apps/site`, use Node 22:

```sh
npm test
npm run typecheck
JAMLOOM_QUALIFICATION_BUILD=1 npm run build
JAMLOOM_QUALIFICATION_BUILD=1 npm run audit:bundle
node --import tsx scripts/release-preflight.ts --database
JAMLOOM_TEST_CHROME=1 JAMLOOM_TEST_URL=http://127.0.0.1:3014 node tests/dna-prompt-home-browser.mjs
JAMLOOM_QUALIFICATION_BUILD=1 JAMLOOM_TEST_CHROME=1 JAMLOOM_TEST_DATABASE_URL=postgresql://LOCAL_USER@127.0.0.1:LOCAL_PORT/postgres node --import tsx tests/dna-commerce-browser.mjs
```

The prompt runner requires a local server with preview gating disabled; the commerce runner creates and removes its own isolated database/server and synthetic worker. Never point fixture tests at a hosted database. The targeted smoke/preview scripts, screenshots and build logs are retained locally under `/tmp/jamloom-prepush/`; credentials and authentication cookies are not committed. Test servers and fixture databases are shut down/removed after validation. User preview servers and apps are preserved.
