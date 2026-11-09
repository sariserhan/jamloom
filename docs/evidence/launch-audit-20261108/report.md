# Launch follow-through — November 8, 2026

**PASS posted-cost reconciliation and current release checks; PARTIAL commercial qualification; NOT RUN public launch.** The owner instructed “lets do all those and launch it.” This continues the existing launch authorization after the 65% economic and Apple gates pass. It does not waive the owner's margin target or fund unbounded capacity.

## Current external state

[Apple readback](apple-state.json) at 10:42 p.m. Eastern on November 8 confirms build 40 **VALID**, version/submission **WAITING_FOR_REVIEW**, release **MANUAL**. Apple has not approved the app; there is no approved version to release. The five-item submission and $35/$20 review images were completed in [the preceding release increment](../credit-repricing-20261108/report.md).

[Capacity readback](capacity-readback.json) confirms workers 0/0, no queued/running work, unchanged live wallet, no held test credits and a healthy independent guardian. The existing review permit still has $6/eight cycles remaining until **November 15, 9:06:50 p.m. Eastern**. It remains restricted to the two existing review accounts. No new GPU cycle, real charge, activation, deployment or Git push occurred in this audit.

## Posted charges reconcile; absent rows are not all delayed bills

[Endpoint-to-worker reconciliation](endpoint-reconciliation.json) independently queries complete hourly windows grouped by endpoint and by worker. Both views agree exactly, with **zero unexplained posted balance** and no charged worker outside the retained observation inventory:

| Window | All posted endpoint charges | Billed worker runtime | Observed workers without posted rows |
|---|---:|---:|---|
| November 2 Music DNA plus failed Improvise | $0.063947570 | 303.615 seconds | Six last observed THROTTLED |
| November 8 review generation/repeat preparation | $0.053587985 | 253.889 seconds | One last observed THROTTLED; three EXITED without full lifecycle evidence |

The older “pending workers” count meant **observed IDs absent from billing**, not provider-confirmed charges awaiting posting. Runpod documents scaled-down/throttled workers as unbilled and running cold-start/processing/idle-timeout periods as billed. This is consistent with the six throttled DNA-window workers; snapshots do not prove every unobserved transition or certify a zero lifetime bill. We retain that distinction instead of manufacturing zero-cost receipts. [Official worker lifecycle](https://docs.runpod.io/serverless/workers/overview), [official billing API schema](https://github.com/runpod/docs/blob/main/api-reference/openapi.json).

The staging Improvise worker remains [posted at $0.065969652](staging-posted-billing.json). These are current provider billing records, not final invoices. The endpoint reconciliation resolves the previously unexplained posted-total question; it does not make production-wide costs known.

## Updated conservative scenarios

The [reproducible calculations](scenarios.py) use the existing owner-approved $150/month infrastructure allowance, support and other overhead categories, five-year storage forecast, current catalog, full credit redemption and conservative retained-proceeds floor. The entire posted mixed DNA/failed-Improvise hour is assigned to the one successful DNA song, rather than omitting its failed work. [All twelve volume scenarios](cost-scenarios.json).

| Product/unit | Posted provider basis | Scenario total at 30,000 redeemed credits/month | Scenario margin |
|---|---:|---:|---:|
| Improvise/song | $0.065970 | $0.155071 | 66.77% |
| Music DNA/song | $0.063948 | $0.249249 | 73.29% |
| DJ/generated minute | $0.008000 | $0.026401 | 71.71% |

The separate posted review-window Improvise scenario is 69.42%. All are **PASS scenarios only**. The infrastructure assumption requires approximately 25,747 monthly redeemed credits for Improvise, 16,910 for DNA or 18,445 for DJ to maintain 65% under the same respective cost mixes. At 10,000 credits/month, each scenario fails. These are allocation sensitivities, not customer-demand evidence or new minimum-purchase rules.

The remaining economic qualification must address actual startup/idle/failure exposure across the supported operation envelope, realistic shared-cost allocation, and storage beyond the finite forecast. The current product retains completed music until deletion; this audit does not silently introduce a retention limit. The existing per-job cost cap also does not certify the separately operator-funded preparation lifecycle. Higher prices and one reconciled cohort do not establish a guaranteed margin for every permitted cycle/purchase.

## Remaining launch sequence

1. Complete economic qualification with the existing 65% requirement. Do not set `JAMLOOM_CREDIT_COST_QUALIFICATION` from scenario-only results. Any necessary new paid qualification needs a concrete bounded permit; the review permit is not an optimization budget.
2. Receive Apple's approval. Submission is complete and needs no duplicate submission or new build merely to wait for review. Preserve manual release and the finite review deadline.
3. Once those gates pass, activate the existing payment objects and qualified customer generation under an explicit finite operating budget, deploy the final public configuration, verify it, and release the approved iOS version. Git-push control remains with the owner.

The release instruction is authorized; no repeat confirmation of general launch intent is needed. The remaining restrictions are evidence and provider state, not missing general permission.

Reproduce the read-only billing audit from `apps/site` with Node 22: `node --import tsx ../../docs/evidence/launch-audit-20261108/reconcile.mts`. It requires the retained private worker observations and existing provider credential, and never logs the credential. Run `python3 docs/evidence/launch-audit-20261108/scenarios.py` from the repository root for the arithmetic. Context7 tools were unavailable; current official provider documentation was consulted directly.
