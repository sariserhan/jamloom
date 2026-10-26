# Local release readiness — 2026-10-26

**PARTIAL overall. Publication HELD by the owner.** The instruction is to prepare everything locally and make Singing Academy $39. No push, website deployment, hosted migration, live payment activation, GPU rental, App Store upload or review submission is part of this pass.

## Price and course commerce

Singing Academy's planned price is **$39 USD once, before applicable tax**. The shared offer supplies the homepage, Singing Academy, general pricing and native course screen. The existing free original-song preview and unlimited practice remain available. DJ Academy retains its separate $79.99 price; Pro retains $49.

The existing embedded Academy checkout and signed-receipt implementation now distinguish `singing-complete` from `academy-complete`. Exact amount, currency, one-time price, product identity, environment, owner, duplicate events, refunds and disputes are checked. A Singing receipt cannot unlock DJ Academy or mint generation credits. Old DJ checkout URLs and idempotency keys remain unchanged. The legacy DJ confirmation page also checks the course; both courses appear by name and amount in account purchase history and admin billing.

Migration `0031_singing_price.sql` extends the existing purchase table with a paired product/price constraint. Test configuration uses `SINGING_STRIPE_PRICE_ID`, `SINGING_STRIPE_PRODUCT_ID`, `SINGING_STRIPE_WEBHOOK_SECRET` and `SINGING_STRIPE_SANDBOX_ENABLED`; live configuration has the `SINGING_STRIPE_LIVE_` prefix. The shared Stripe account keys are reused. No provider catalogue, webhook destination or purchase setting was changed.

**NOT READY for paid Singing activation:** the new Stripe catalogue/provider purchase still needs qualification, production course-access enforcement and native purchase/restore integration remain required, and no live release flag has been enabled. A verified local receipt test is not a purchased lesson entitlement demonstrated end to end. The preview remains explicitly free, so nobody is being charged for currently open lessons. Popular commercial songs are not promised in the $39 offer.

## Avoid unnecessary feedback requests

Collapsed rating panels now load saved feedback on first opening. The shared component retains drafts when closed/reopened and still loads immediately when displayed outside a disclosure. This removes per-song feedback requests from unopened gallery cards; actual production CPU savings are not measured while publication is held. Browser checks require real rendered cards, zero closed-panel reads, one read on opening, draft retention and saved-rating reload/delete.

## Account-deletion fulfillment

The existing account-holder request now has an owner-admin fulfillment action in its inbox ticket. It requires recent administrator sign-in, a matching account-holder request and explicit DELETE confirmation. It suspends access, freezes spending, revokes sessions and requests bounded work to stop. It waits for settled reservations, confirmed rental cleanup and expiry of existing upload permissions before removing objects.

Storage failures leave resumable records; completion is recorded only after storage removal and the final database transaction. Cloud audio, local-to-cloud assets, DJ recordings/sessions, taste profiles, favorites, playlists, lesson attempts, feedback/training eligibility, support content, authentication credentials and password-reset records are removed. A suspended, inaccessible pseudonymous identity and financial receipts/ledger are retained. Another customer's data is unchanged.

Migration `0032_account_deletion.sql` records pending/completed deletion. Suspended accounts cannot finalize or reserve new audio, or be restored while deletion is underway. No real customer account was deleted in this pass.

For large accounts that exceed the 60-second admin HTTP limit, run the same workflow through `apps/site/scripts/fulfill-deletion.ts` on a trusted operator machine. It defaults to a target preview. Supply the administrator ID, account-holder ticket UUID and matching owner ID; `--apply` additionally requires `JAMLOOM_DELETION_TARGET` to match the displayed database host/path. It does not rent compute. A pending result means reconcile existing worker shutdown or wait until the stated time, then resume. Do not repeatedly delete or abandon active provider rentals.

Deletion tests use isolated Postgres and controlled storage failure, not a real customer/R2 deletion. Device-only files and browser progress are not remotely erased. Provider backups, already-delivered email, external training exports and previously trained weights are not erased by this database/storage workflow. Handle those separately under the applicable retention policy. Do not claim machine unlearning.

## Candidate and evidence

- Current built web preview: **http://127.0.0.1:3008**. It uses a separate loopback preview database and local email/audio directories; it does not use production accounts or their private library. Shipped public examples remain available. Stable older preview at port 3000 is left intact.
- iPhone **0.10.2 build 25** is built, signed, archived and exported as a local IPA. The exported IPA was independently extracted and its signature/bundle rechecked; the temporary extraction was removed. [Bundle evidence](evidence/local-readiness-20261026/phone.json). The package is `build-ios-store/export-0.10.2-25/Jamloom.ipa`. Physical tests of build 24 remain their own historical evidence; build 25 is not installed or uploaded by this pass.
- `0031` and `0032` were applied only to disposable test databases and the new isolated preview database. Hosted migration requires the normal target verification and backup when publication is authorized.
- [Admin browser evidence](evidence/local-readiness-20261026/admin/browser.json): actual local authentication, own deletion request, administrator confirmation, recent-session enforcement, wait/resume/completion, support replies, suspension and maintenance recovery in Chromium/WebKit. Zero checked Axe violations. Test accounts contain no remote recordings.
- [HTTP evidence](evidence/local-readiness-20261026/http.json): account isolation, native balance authentication, request bounds, payment signature/replay/environment rejection, no real charges or credits minted.
- **246 unique automated checks PASS** (160 site, 35 course/admin/audio and 51 DJ/feedback checks), plus the targeted password-reset cleanup repeat.
- [Product browser evidence](evidence/local-readiness-20261026/products/browser.json): 18 routes plus the $39 checkout at 1440/390/320px; both browsers pass. [Feedback evidence](evidence/local-readiness-20261026/feedback/browser.json): eleven guides, rating persistence and zero closed-panel reads.
- [Validation manifest](evidence/local-readiness-20261026/validation.json) records final commands, results and limitations; historical failed runs are not reclassified as successful.

## What can be released, and what must remain held

| Scope | Readiness | Remaining condition |
|---|---|---|
| Accepted DJ Studio/Live DJ v1, DJ Academy preview, Community/Favorites/player, guides, bug reporting | **PASS within accepted scope** | Publish the tested candidate only when authorized; preserve existing paid-feature flags. No new MIDI/headphone qualification claimed |
| Singing original-song preview | **PASS mechanics / PARTIAL measurement** | Owner accepted music, live feedback and iPhone behavior. Labelled pitch accuracy/physical latency are not established by the live diagnostic |
| Singing $39 sales | **PARTIAL prepared** | Provider product/payment, complete access enforcement and native purchase/restore qualification; keep free preview and sales hold |
| Local Remixes, Improvise and Music DNA | **PARTIAL broader release** | Keep existing accepted examples; broader hosted style/voice/language and maximum-library quality/capacity gates remain open |
| AI DJ fresh sessions | **PASS bounded two-listener qualification / PARTIAL unrestricted operation** | Owner accepted the last two instrumental sets. This is not proof of indefinite capacity, professional quality in every style, or reliable short singing. No fresh paid trial authorized here |
| Popular-song Singing Academy catalogue | **BLOCKED** | Supplier permissions and exact backing/lyrics/score assets; owner previously reported no Tency reply |
| App Store / live purchases | **PARTIAL prepared** | Existing draft build 24 is separate from local build 25. Real Apple sandbox receipt chain, unfinished product metadata and reviewer access remain. No submission or public release |
| Account deletion | **PASS local workflow / PARTIAL provider qualification** | Actual R2 cleanup under a real authorized customer request and large-account operator execution have not been performed |

## When publication is authorized

Use the current candidate commit and this evidence, review release flags, back up the verified hosted database and apply the two reviewed migrations before code relying on them. Push only through the existing GitHub deployment. Verify public routes, private-account isolation and production CPU savings after deployment. Upload the new local phone candidate only under the separate App Store release instruction; do not submit the older draft as though it contains the new price. Keep missing paid/licensed/experimental capabilities closed.

A rollback to the previous code can retain these additive schema changes and receipts; do not drop new purchase data to restore the old price constraint. The accepted music and preserved reference evidence are untouched.
