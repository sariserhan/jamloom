# Continuation within the original $1 — execution recovered

**FAIL overall execution; PASS Music DNA delivery and independent cleanup. CONSUMED.** The owner approved this continuation and both requests ran on November 2. Music DNA delivered; Improvise failed during a guardian shutdown sequence. The original receipts were recovered on November 8. [Current recovery, evidence and next steps](../release-recovery-20261108/report.md).

The following describes the historical preparation, before that execution: The original check stopped on failure before either authorized song request. Source `37a0d0be` fixes that observed readiness regression and is already deployed with customer sales/generation held.

[Exact plan](hosted-plan.json): one additional L4 capacity cycle, one Music DNA request followed only on success by one Improvise request, no retries. Fresh 60-minute window including deployment, at most 40 minutes of capacity plus 130 seconds shutdown. Reserve $0.25 for the stopped attempt; limit this continuation to $0.75, keeping the original $1 aggregate. [Conservative reserve calculation](budget-reserve.json) is not a provider invoice; attributable billing remains provisional.

The independently supervised guardian on the existing headless server will run only for this diagnostic. It cannot activate capacity and is stopped/cleared afterward. The Mac's fixed-deadline watchdog remains an additional stop path. No new rental host or ongoing hosting is authorized. [Disabled-service preview](remote-guardian-preview.json).

Use the existing private course-review account, which has no prior capacity cycle. The other account remains subject to its 24-hour startup limit. The harness prepares exactly 30 **synthetic test-only** credits; these are not a verified Stripe purchase, not revenue and not live wallet value. The live wallet is checked unchanged. Preserve all original capacity reservations and cost records.

**PASS:** controller and HTTP dry runs; harness typecheck; remote read-only preview. No GPU activation, fixture grant, upload, generation or new diagnostic deployment has occurred. The archived harness is under `qualification-harness/`; private environment and account files are excluded. Restore files to the plan's `build-readiness-recovery-20261102/` paths before using the hashed harness.

Historical execution procedure (already consumed; do not rerun): after explicit approval, prepare the one-use permit and private configuration, deploy exact source `37a0d0be` without Git push, verify the authenticated shutdown guard and only then run the controller/HTTP pair. Independent cleanup must confirm empty provider health/inventory, remote guardian inactive with blank permit, no pending jobs/held credits and remote test objects absent. Restore `https://jamloom-52zn6fde6-ssari.vercel.app` even on failure. Read-only monitoring may reconnect; generation and activation mutations must never be repeated after ambiguous results. A stopped execution does not authorize another attempt.

This excludes Git push, image publication, sales activation, Apple submission and ongoing capacity. Existing owner musical acceptance is preserved.
