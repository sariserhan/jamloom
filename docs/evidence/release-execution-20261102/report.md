# Release execution — November 2, 2026

**PARTIAL release. PASS migration, held deployment and Apple build preparation. FAIL the bounded capacity check; PASS cleanup and regression repair.** No Git push occurred. No customer sale or Apple review submission occurred.

## Completed

- **PASS production migration:** backed up the verified Neon production database, successfully restored that backup into disposable PostgreSQL, applied only `0034_cloud_capacity.sql`, checked all 34 migration hashes and confirmed a second apply was a no-op. Song and ledger counts were unchanged. The private backup remains outside Git. [Receipt](migration.json).
- **PASS website:** direct Music DNA, Improvise, DJ Academy and Singing Academy pages pass Chrome desktop and WebKit phone checks, including anonymous browsing, sign-in at generation and no recording upload before confirmation. [Browser evidence](live-browser.json). The final held deployment is `https://jamloom-52zn6fde6-ssari.vercel.app`, source `37a0d0be146c701cee43419fa7f51508db4994a7`, promoted to www.jamloom.com. Its authenticated shutdown route and six live route/held-generation checks pass. [Guard](repair-candidate-guard.json), [live checks](repair-live-http.json).
- **PASS iPhone packaging/upload:** version 0.11.0 build 39 includes explicit preparation controls. Export, signature and private-content bundle checks passed; Apple reports VALID and the build is selected in the existing manual-release draft. Review remains unsubmitted. [Selection](apple-selection.json), [bundle](ios-release-bundle.json), [current Apple readback](final-apple-readonly.json). This is not a new physical-device or App Review acceptance claim.
- **PASS independent guardian installation:** packaged the exact locked dependencies from source `37a0d0be` and installed them on the owner's existing headless server. Node syntax, database preview, systemd unit validation and a supervised read-only run pass. The user service is inactive, has no enabled marker and has no operator permit. It cannot activate capacity. [Receipt](guardian-installation.json), [operations guide](../../../ops/capacity-watchdog/README.md).

## Authorized $1 check

The owner approved one startup cycle and at most two requests. The cycle began at 05:46 UTC. Provider health briefly reported running, then returned to initializing. Our cycle incorrectly retained its ready state, allowing the two-minute idle timer to stop preparation. The check stopped on failure before either song submission, upload or credit hold.

**FAIL qualification; PASS cleanup:** zero generation requests, zero credits used, zero remote test audio; endpoint limits 0/0, empty independent worker inventory, no pending jobs and original hardware settings restored. The held website was restored. The permit is consumed and has not been reused. [Result](qualification-result.json), [independent cleanup](style-cleanup.json), [current provider readback](final-provider-readonly.json), [consumed plan](hosted-plan.json).

Two worker identities were observed during this single provider-managed startup cycle. Attributable billing has not posted for either: missing rows are **not zero cost**. [Provisional billing](current-cycle-billing.json).

## Repair and verification

Commit `37a0d0be` returns a ready cycle to preparation if running capacity disappears without admitted work. It retains the original startup deadline; later readiness starts a new idle window. Shutdown preserves the initial stop reason. The guardian now has a narrowly identity-checked, disable-only emergency path if database reconciliation fails.

**PASS:** 208 site tests, 88 isolated database checks, typecheck, production build and client bundle audit. Tests cover ready → initializing → ready, original-deadline enforcement and emergency stop identity checks. [Validation](repair-validation.json). The repaired held deployment is verified; the repaired hosted lifecycle remains **NOT RUN**.

## Remaining gates

1. A corrected capacity lifecycle and the two unsubmitted requests, including independent shutdown proof. A [same-$1 continuation](../readiness-recovery-20261102/hosted-plan.json) is PREPARED, not approved: $0.25 reserved for the stopped attempt and $0.75 maximum for one additional cycle. Original reservations remain immutable; this is an explicit proposed allocation, not an automatic refund.
2. Attributable operating economics and bounded ongoing customer/reviewer capacity. A diagnostic allowance does not fund ongoing hosting. Prices and request caps remain unchanged.
3. After those gates pass: sales activation, funded App Review submission, then Apple's approval and manual public release. Apple approval is external.

Owner-closed Improvise/endurance studies and deferred scoring/training measurements remain closed/deferred for v1. No repeat listening exercise is requested.
