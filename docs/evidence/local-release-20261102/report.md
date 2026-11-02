# Local completion on main — November 2, 2026

**PASS local capacity implementation and release preparation; PARTIAL full release.** The owner requested finishing on `main` without pushing. Implementation commit: `1e811c05`. All changes in this increment are local. No image publication, website deployment, production migration, paid provider request, sales activation, Apple upload or submission was performed.

Music DNA and Improvise now have explicit preparation controls on web/mobile web/iPhone. Page loads and availability reads cannot start a worker. Preparation checks verified identity, spendable credits and account suspension before any operator-funded activation; it makes no recording upload, song job or customer credit hold. Existing private defaults, prices, model/image pin and deadlines are preserved.

The new opt-in capacity controller records a durable intent, serializes concurrent starts and reserves the entire cycle allowance against an immutable aggregate permit. Activation is attempted once; a lost response causes shutdown. One new preparation per account per 24 hours and a global permit cap limit startup abuse. Readiness validates exact hardware, image, current price, remaining lease time and a fresh independent guardian heartbeat. Admission shares the shutdown lock; pending jobs prevent idle shutdown. Startup timeout, two-minute idle timeout, finite expiry, guardian failure and removed/invalid permit configuration all lead to shutdown. Full reservations remain spent within the operator ledger until actual billing is reconciled externally.

The separate watchdog only checks/stops capacity and never activates or renews it. Authenticated web cron provides fallback shutdown; removing the permit retains cleanup from persisted configuration. Both configuration templates leave this feature disabled. [Operating procedure and release order](../../CLOUD_CAPACITY.md).

## Validation

| Check | Result |
|---|---|
| Site unit suites | PASS, 208 tests |
| Isolated PostgreSQL capacity, cloud songs, wallet, generation, Academy and course checks | PASS, 85 checks; migration 0034 and repeat no-op migration included |
| SDK bootstrap regression | PASS, four fresh/cache/conflict/concurrency cases |
| Production build, TypeScript, client bundle/secrets audit | PASS |
| Real rendered explicit preparation | PASS, Chromium/WebKit at 1440 and 390 px; both products, three explicit preparations per browser/width including one lost response; no automatic activation retries or generation requests |
| Existing product entry/free lesson/sign-in/credit/input retention/recovery suite | PASS, both engines and widths; no page exceptions; expected anonymous-account 401 messages retained in evidence |
| iOS 27 simulator AccountTests | PASS, 23 tests; two environment-dependent integration cases skipped, zero failures |
| Native new preparation controls | Both product models covered by simulator transport tests; no new physical-device/provider purchase claim |
| Hosted capacity lifecycle and ranking speedup | NOT RUN |

[Counts and local log hashes](validation.json), [capacity browser results](capacity-browser.json), [product entry results](product-entry-browser.json), [phone screenshot](phone-preparation.png), [desktop screenshot](desktop-preparation.png). Screenshots were visually inspected for readable status, disabled generation until ready and overflow. Browser runtime tools were unavailable; repository Playwright used the already-authorized local fallback. All browser APIs were fixture-bound, with a disposable local PostgreSQL database and external browser requests blocked. Local test databases and preview server were stopped afterward.

The first browser launch used an unavailable test database and was corrected to a disposable migrated cluster. The new test also needed an explicit Improvise input fixture. A concurrent harness restart briefly reused the preview port; both were stopped, and the final clean sequential run passed both suites. These were harness setup failures, not hosted operations. No paid request was made.

## Remaining external release gates

1. Owner push and hosted CI; reviewed production backup/migration 0034; candidate deployment and supervised watchdog installation. No live permit is present in this commit.
2. Separately approved bounded hosted qualification of the complete lifecycle and desired worker optimization, reliable runtime headroom, and full attributable cost allocation. The previous 119.648-second Improvise pipeline result had only 352 ms headroom; local optimization is not a replacement measurement. No consumed permit is reusable.
3. Separate AI DJ operating capacity/economics, without reopening the owner's closed two-hour endurance study. Existing musical acceptance and deferred scoring/training work remain closed/deferred for v1.
4. After those gates pass: existing Stripe catalog/webhook and customer generation activation, a new native build containing these preparation controls, funded review-account availability, App Review submission, Apple approval and manual release. Previously uploaded build 38 is not this new source.

Provider state was not changed or reread in this local-only increment. The prior [05:19 UTC read](../release-finish-20261102/provider-readiness.json) recorded workers 0/0, no work, inactive sales and an unsubmitted build 38. It remains a dated snapshot, not a new live verification. Production release is not claimed complete.
