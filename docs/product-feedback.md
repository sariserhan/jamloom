# Product guides, music feedback and bug reports

**PASS implementation and local verification; PARTIAL release.** The 0.9.5 candidate and website changes are prepared locally. Public deployment, physical-device acceptance and App Store privacy publication remain separate.

Each website product page has a question-mark button opening a modal guide with a blurred backdrop, purpose, usage steps and current limitations. The same guide module covers the standalone Local Remixes and DJ Studio. Native product screens have a help sheet and the bundled DJ deck has its guide in the tool bar. Escape/Close, focus return, modal focus containment, scrolling and narrow layouts use platform dialog behavior.

Generated Music DNA, Improvise, cloud-saved local mixes and saved DJ performances share account ratings. Local browser/native remixes and manual recordings can retain device ratings without uploading audio. Signed-in local ratings send only the hash, product and rating. Curated Jamloom examples can be rated, but listeners cannot grant training rights. Partner Aurowall audio is not treated as Jamloom-generated training material.

`/api/creation-feedback` authenticates a verified active account, validates references and feedback, checks current owner/public access and bounds marked moments. Training is optional and off by default. Only the owner can grant permission for cloud-saved audio and must confirm rights to included compositions, recordings and voices for commercial training, retained models and commercial outputs. Visibility is independent. This does not retroactively grant permission to existing music or downloaded DJ references.

`/admin/feedback` shows ratings/tags/moments and records an audited rights review for the exact saved audio hash. `apps/site/scripts/export-creation-feedback.ts /absolute/private/path.json` creates a mode-0600 manifest with a thirty-second validity window. Export recomputes owner consent, rights approval, source availability and audio hash. Changed/deleted/withdrawn sources and revoked permissions are excluded; negative ratings remain explicitly labeled, not positive training targets. The manifest contains references, not raw uploads or favorite recordings. Every training consumer must revalidate before use. No training job or paid compute starts automatically and no improvement in model weights is claimed.

The footer's **Report a bug** page uses the existing bounded, rate-limited contact transaction and durable email outbox. Reports appear as `bug` in the private admin inbox and use the existing reply/status/audit controls. Public users need no account. Tests use local mail only.

## Migration

**PASS:** reviewed `0030_creation_feedback.sql` on the authorized Neon production target `ep-flat-hill-b4q0lix4.c-6.us-east-2.aws.neon.tech/neondb`, after a full compressed backup, archive-list verification and target comparison with `docs/neon-setup.md`. Backup is private outside Git; 136899 bytes, SHA-256 `305b5efae93ac923afeda097c4e386e84928a7a888a02be8bb73fb8c9c13b404`. Repeat migration applied nothing. The additive tables and widened ticket kind preserve existing users/audio/tickets. This is not a website deployment.

## Privacy release preparation

Website disclosure and native privacy manifest now cover optional model-improvement use. Audio/user-content/user-ID include `Other`; rating content and account IDs also include `Analytics`, using [Apple's defined purpose keys](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatypepurposes). No tracking is added. App Store Connect answers were updated and published on October 26 after the owner's release authorization: Audio Data adds Other Purposes; Other User Content and User ID add Analytics and Other Purposes. Existing purposes and identity linkage are preserved, with no tracking. [Publication evidence](evidence/product-release-20261026/app-privacy.json). Private music remains private even if its owner separately grants training permission. Deleting permission stops future intake, not a promise to undo completed training.

## Evidence

- **PASS:** 56 website/database regression checks, including eight new feedback checks; production website build and TypeScript.
- **PASS:** Chromium and WebKit, ten guide routes at 1440/390 pixels; blur/Close/Escape/focus/accessible dialog, bug submission → admin inbox, rating persistence/deletion, listener ownership restriction and owner permission → admin rights review. [Browser evidence](evidence/product-feedback-20261026/browser.json). Disposable database, real Better Auth, local mail and muted audio. The in-app browser runtime was unavailable, so the established Playwright fallback was used.
- **PASS:** eighteen native account tests (two environment-dependent tests skipped in that suite), Simulator Community help/rating sheet and landscape DJ guide checks. The separate real Simulator URLSession → Better Auth → disposable Postgres check passed sign-in, rating save/load/delete, training permission/withdrawal and sign-out without credit consumption. The first query-validator and WebKit locator failures were fixed and rerun. [Native HTTP evidence](evidence/product-feedback-20261026/ios-http.json), [deck check](evidence/product-feedback-20261026/ios-deck.json).
- **PASS:** unsigned iOS 0.9.5/build 18 device Release build, native privacy/bundle audit and web bundle audit. No physical-device install or acceptance for this candidate; install for customer use after the matching feedback endpoint is deployed.
- **NOT RUN:** new model training, production website deployment, physical 0.9.5 acceptance, App Store privacy publication/upload/submission or public activation. The separate approved [GPU consistency study](dj-preferred-consistency.md) completed six originals and cleanup; musical acceptance remains open.

## Authorized release follow-through — October 26

The owner authorized deploying the completed website, updating Apple privacy answers and verifying the physical 0.9.5 candidate. **PASS:** 152 website tests, 71 isolated database tests, Chromium/WebKit feedback and deck checks, production build, bundle audit, signed native Release build and Apple privacy publication. Website deployment and physical acceptance are tracked separately in [release evidence](evidence/product-release-20261026/local-checks.json). New GPU use and public AI DJ activation are not included.
