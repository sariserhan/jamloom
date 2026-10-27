# Cross-product maintenance — 2026-10-27

**PASS for the fixes below; PARTIAL overall readiness.** The current product ledger is [PRODUCT_COMPLETION.md](PRODUCT_COMPLETION.md). All changes remain local. Singing Academy stays **$39 USD once**; no sales flags, hosted data, GPU rentals, deployment or Apple submission changed.

## Fixed

- **iPhone Community:** a load now retains its original collection revision and account before awaiting Favorites. Switching collection cannot let an older request adopt the newer revision and load the wrong songs. The loading indicator includes Favorites synchronization; obsolete failures cannot overwrite a newer successful sync. The regression holds both successful and failed responses and reproduced the bug before the fix.
- **Website player:** an older rejected play request cannot mark a newer song or a closed player as failed. A successful native Play event clears the previous error. Active failures still offer Retry. Audio source validation, account-change cleanup and the shared player remain intact.
- **Community discovery:** merge and render keys include the product, using the existing shared track key. Different products with the same ID remain visible, while repeated entries from the same product are merged.
- **Bug reporting, Contact and Support:** stalled submissions time out after 15 seconds, retain the draft and permit manual retry; malformed responses show a useful fallback. There is no automatic retry that could create duplicate tickets. An unconfirmed response does not prove that the server failed to receive the message.
- **Direct Report a bug visits:** this nonce-protected page now renders dynamically, matching Contact and Support. Its previously prerendered scripts were blocked by the request's CSP, leaving a native GET form that put entered test fields in the URL. Forms now use POST and disable submission until hydrated, with a visible email fallback if JavaScript is off. The strict CSP is unchanged; other marketing pages retain static rendering.

The rendering correction follows the installed Next 16.4.2 CSP guide and the [official nonce documentation](https://nextjs.org/docs/app/guides/content-security-policy#how-nonces-work-in-nextjs). Context7 and the in-app browser runtime were unavailable in this session; existing repository Playwright suites exercised the actual built pages instead. The build manifest contains no prerendered routes in the existing nonce-protected route groups.

## Verification

- **160 website unit tests PASS**, production build and TypeScript PASS on Node 22.23.1.
- **19 iOS AccountTests PASS, two explicit HTTP integration skips**, on iPhone 18 Pro / iOS 27 simulator. [Summary](evidence/product-maintenance-20261027/native-tests.json). This is not installation or acceptance of this source change on the physical phone.
- **Chromium and WebKit recovery PASS:** product-scoped identity, stale playback failures, native Play recovery, close during pending playback, direct bug-page hydration under its real CSP, timeout/malformed-response draft retention, manual retry, and safe no-JavaScript forms on all three contact routes. [Report](evidence/product-maintenance-20261027/recovery-browser.json). Media promises and contact transport are controlled here; no audible or provider-delivery claim is made.
- **Real local bug-to-admin and feedback PASS** in both engines with disposable accounts/database: eleven guides, saved/reopened/deleted ratings, rights-review controls and admin inbox delivery. [Report](evidence/product-maintenance-20261027/feedback-browser.json). Mail stayed in the local outbox; the disposable database was removed.
- **18-route browser sweep PASS** in Chromium/WebKit at 1440/390/320 px, including DNA persistence, source decoding and permission/error simulations. Both engines supplied synthetic audio tracks in this final run, so PCM filter/bypass/stop passes in both; earlier NOT RUN evidence is preserved. [Report](evidence/product-maintenance-20261027/product-browser.json). The initial repeat used the accounts-disabled diagnostic server and stalled waiting for product responses; it was stopped and repeated on the correctly configured isolated preview.

[Validation manifest](evidence/product-maintenance-20261027/validation.json) records the base commit, failures before the fixes, log paths/hashes and scope. Earlier reports retain their original evidence; their old open-state descriptions do not override the current ledger.

From `apps/site`, against a built loopback preview:

```sh
npm test
JAMLOOM_TEST_URL=http://127.0.0.1:3010 node tests/recovery-browser.mjs
JAMLOOM_TEST_URL=http://127.0.0.1:3010 npm run test:product-browser
JAMLOOM_QUALIFICATION_BUILD=1 JAMLOOM_TEST_DATABASE_URL=postgresql://127.0.0.1:5432/postgres node --import tsx tests/feedback-browser.mjs
```

The current built preview is **http://127.0.0.1:3010**, with the existing isolated loopback preview database, local email/audio directories and generation disabled. Older previews at 3000/3008 remain untouched.

Use an explicit fresh `JAMLOOM_EVIDENCE_DIR` for the existing browser suites to preserve historical reports. The iOS command uses `-only-testing:JamloomTests/AccountTests`; its two skipped tests need their separate live-server harnesses.

## Remaining boundaries

Real Apple sandbox purchase/restore/refund delivery, outstanding credit-product review metadata/reviewer access, physical deployment of this new native fix, broader singing accuracy/physical latency, sustained AI DJ generation capacity and reliable natural short singing remain open. The retained vocal was rejected by the owner; timing probes do not overturn that decision. Popular-song permissions/assets are still pending Tency's reply. Existing bounded DJ sets and accepted v1 products retain their scoped acceptance. None of these external or musical gates is marked passed by this maintenance work.
