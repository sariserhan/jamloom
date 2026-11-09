# Margin verification — November 9, 2026

**PASS available-source collection and deployed renewal hold; FAIL low-volume planning scenarios; PARTIAL complete 65% qualification.** This audit does not qualify the catalog. The task remains open for actual expense evidence, a supported retention model and representative complete GPU cycles. No cost, funding or release setting was changed.

**Owner decision after the audit — November 9:** “keep it at $150.” Retain **$150/month** for shared operating costs in planning. This resolves the requested choice of allowance; no replacement expense amount is requested. It does not turn the allowance into a measured invoice or change the 65% target, prices, storage policy, GPU authority or renewal hold. Existing scenario calculations already use $150 and remain unchanged.

## What was verified

- [Live ledger](ledger.json), read in a repeatable-read, read-only Neon transaction at 9:45 a.m. Eastern: zero settled Stripe proceeds, no Apple proceeds, no live paid credit lots or live Creator subscriptions. Existing receipts are test/sandbox. No observed customer margin can be divided by zero revenue. Support tickets and saved DJ recordings are empty; that does not establish future zero support or recording cost.
- [Runpod billing](provider-billing.json): all posted current-endpoint charges from November 1 through the read time total **$0.823207124**. Independent endpoint and worker views agree with **zero residual**. The window includes development, diagnostics and review, so it is not all customer cost. The historical Improvise cohort remains $0.065969652, the mixed DNA/failed-Improvise cohort $0.063947570, and the review hour $0.053587985. These include posted whole-worker billing rather than adding job estimates again. They are posted usage, not final invoices or proof of representative future cycles. No new GPU was started.
- [Vercel usage](hosting.json): **$2.772938 effective / $1.119091 billed** within the requested November 1–9 window, measured before that window ends. This includes $1.414 effective build CPU; other effective usage is $1.358938. It excludes unallocated plan/seats/add-ons and other providers. Do not subtract build cost and then call the result a complete business invoice, or add full effective usage to a platform fee without accounting for included credit.
- [Song object inventory](storage.json): **167 objects, 2,874,823,348 bytes (2.875 decimal GB)**. No audio downloaded. At the current Standard storage tariff, current bytes imply $0.043122/month before account-level rounding, operations and free-tier allocation. This is not measured historical GB-months or a final bill. [Dedicated DJ bucket](dj-storage.json): zero objects. The song bucket contains existing product/evaluation assets, not a demonstrated paying-customer cohort. Bucket lifecycle read returned **403 AccessDenied**; no permission or lifecycle rule was changed.
- [Independent-service settings](configuration.json): catalog cost qualification `held`, guarded continuation configured, GPU allocation 20%, original $10 seed unchanged, $0.75/2,400-second cycle cap. [Public operating readback](renewal-hold.json) at 9:48 a.m. Eastern: continuation **held**, zero resumed, healthy guardian, zero workers, no alerts, $9.75 unreserved seed capacity, $0 revenue allocation and $61.384561 provider credit. Provider credit is prepaid cash, not income or cost savings. The existing monitor performs its usual reconciliation; this audit made no configuration update or manual renewal mutation.

A focused search of the connected Gmail mailbox for October/November invoices or receipts from Vercel, Runpod, Cloudflare, Neon and Resend returned no messages. That is a search result, not proof that no bills exist. The [earlier same-day Neon plan read](../finance-followthrough-20261109/neon-plan.json) established Free plan and unavailable metered history on that plan; it was not refreshed here and is not lifetime capacity proof.

## Complete cost inventory and evidence gaps

| Cost | Evidence available | Still needed for qualification |
| --- | --- | --- |
| GPU startup, execution, idle, failed work and container disk | Posted whole-endpoint/worker reconciliation; exact historical cohorts | Representative current-image cold starts, supported durations, idle/cancel/failure cycles and delivered units; final posted reconciliation for those windows |
| Web functions, transfers, cron and build operations | Project-attributed Vercel usage | Complete billing-period invoice and reviewed shared plan/seat/add-on allocation; customer workload coverage |
| Database | Same-day Free-plan read; working database | Usage/limits at supported workload and future paid-tier treatment, rather than assuming unlimited free capacity |
| Saved songs, DJ sets and temporary uploads | Current object byte counts; source retention behavior | Historical GB-months/operation billing and a funded model for retained output beyond five years; lifecycle administration evidence if used |
| Audio/metadata traffic | Signed R2 downloads, published free R2 egress; Vercel transfer usage | Account operation rounding, API/metadata workload and playback assumptions; no invented R2 egress fee |
| Headless guardian, monitoring, backups and domain | Services are running | Actual monthly hosting/electricity/depreciation, backup/domain expense and allocation; not automatically zero for an owned machine |
| Email and support | Resend transport in code; no recorded support tickets | Plan/invoice and allocated support labor; retain the approved conservative support allowance until evidenced |
| Non-GPU inference | Existing separate contingency allowance | Reconcile any external billed inference; do not charge again for models already included in GPU time |
| Payment fees, taxes, refunds, FX | Durable receipt verification exists; no settled live proceeds | Actual receipts when present; conservative 40% retained floor stays a planning floor, not a claim about Apple/Stripe commission |
| Nonexpiring paid-credit and saved-output obligations | Full redemption assumed; saved output has no application deletion deadline | A reviewed funded retention/reserve model; five-year forecast is not an expiry policy or proof of indefinite cost coverage |

Unknown items retain their uncertainty. The existing owner-approved $150/month shared infrastructure and support assumptions are not replaced with incomplete usage snapshots. No customer data is deleted and no storage/credit policy is changed.

## Reproducible decision

[Calculator](calculate.py) and [machine-readable result](qualification.json) preserve the current $35/300 and $20/150 prices, conservative $0.046666 net per credit, full redemption, existing support/overhead assumptions and five-year storage forecast. No hypothetical optimization savings are used. Unit margin is `(allocated net proceeds - total attributable cost) / allocated net proceeds`; the 65% target includes shared costs because the product specification requires them.

| Product | Margin at 10,000 redeemed credits/month | Maximum shared monthly cost at that volume | Minimum monthly redeemed credits under the $150 allowance |
| --- | ---: | ---: | ---: |
| Improvise | **45.34% — FAIL scenario** | $58.26 | 25,747 |
| Music DNA | **51.87% — FAIL scenario** | $88.7065 | 16,910 |
| AI DJ, separately held | **50.28% — FAIL scenario** | $81.325 | 18,445 |

These are separate all-one-product sensitivities, not three amounts to add together. At 30,000 credits/month the existing scenarios pass, but no observed demand establishes that denominator. A price increase is not authorized by this audit.

The current **$0.75 cycle reservation is not an actual $0.75 bill**. Nevertheless, it cannot itself certify 65% at one song per cycle: the net-floor cost budget is only $0.163331 per Improvise or $0.326662 per DNA. Spending the full ceiling would need at least five Improvise or three DNA deliveries just to cover that cycle at the target, before other costs. The software does not guarantee those deliveries; failed preparation can deliver none. The 20% revenue funding cap bounds spending but does not prove full paid-credit fulfillment at the required lifetime margin. Preparation funding must not be omitted from economic costs or counted twice with the same worker bill.

## What closes the task

1. Retain the owner-confirmed **$150/month** shared allowance. The planning-input decision is complete. Under the other existing assumptions, the Improvise scenario requires at least **25,747 redeemed credits/month** at this allowance; 10,000 credits/month remains a failing scenario. Actual invoices and customer utilization remain operating evidence to collect, rather than grounds to silently lower the selected allowance or assume more customers.
2. Establish a funded retained-output model: retain the current policy with an explicit, supportable lifetime reserve, or obtain owner approval for a different storage policy. Paid credits remain nonexpiring. This audit cannot silently delete saved music to manufacture margin.
3. Qualify representative current-image complete GPU lifecycles and failure exposure, then reconcile their provider charges and delivered results. New paid qualification requires a concrete bounded permit under AGENTS.md; neither the customer/review seed nor native card auto-pay automatically authorizes an optimization study. The shared allowance is now confirmed at $150. No new paid test is authorized by that decision; a test cannot by itself make the low-volume scenario pass.
4. Recalculate using the supported workload, actual receipt mix or the conservative floor, and all attributable cost/reserve evidence. Only a passing reviewed qualification may set the catalog gate; guarded continuation must then independently confirm funded capacity. Actual realized customer margin additionally requires settled customer revenue and corresponding costs.

**Renewals remain held.** Source `creator-renewals.ts` requires both the renewal configuration and matching economic qualification; a passing illustrative cohort cannot enable it. There are currently no live Creator subscriptions to unpause.

## Reproduction and sources

From `apps/site`, with existing private service credentials: `node --import tsx ../../docs/evidence/margin-verification-20261109/collect.mts`. This uses read-only database/provider requests and object metadata listing; it does not fetch audio or secrets into reports. The DJ inventory and protected-monitor readers are retained under ignored `build-margin-verification-20261109/`. From repo root: `python3 docs/evidence/margin-verification-20261109/calculate.py`. Vercel command: `vercel usage --from 2026-11-01 --to 2026-11-09 --group-by project --json --scope ssari`; the CLI interprets dates in Los Angeles time, recorded explicitly in the receipt's UTC window. Unrelated account usage remains private.

Current official sources checked directly because Context7 tools were unavailable: [Runpod billed cold-start/execution/waiting and storage](https://docs.runpod.io/serverless/pricing), [R2 storage/operations/rounding/free egress](https://developers.cloudflare.com/r2/pricing/), [R2 lifecycle API compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [Vercel platform fee and included credit](https://vercel.com/docs/plans/pro-plan). Published rates are not account invoices.

Validation: **PASS**, 23 existing cost-report, economics and Creator-renewal protection tests under Node 22.23.1. The calculator produces byte-identical results on repeat; zero revenue remains an undefined observed margin, missing costs do not become zero, the low-volume scenarios fail, and qualification stays disabled ([checks](validation.json)). Test log: ignored `build-margin-verification-20261109/tests.log`. No application source or dependency lockfile changed.
