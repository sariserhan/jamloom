# Operating automation

Owner follow-through, November 9: configure remaining provider funding, Apple proceeds and Creator continuation. The 20% net-revenue rule and 65% margin target remain.

## Apple financial reporting

Source `e87d6241` is publicly deployed and the independent headless services are running. The Apple reader runs daily at 13:00 UTC with up to five minutes of jitter; its initial September–November checks all returned `no_sales`. The independent headless service downloads the current and two preceding fiscal-month FINANCIAL reports for region ZZ daily. It uses the owner-supplied vendor number and existing App Store Connect key, stored only in the server’s private configuration. The product bindings are independently verified against Apple: Creator `6829266841`, top-up `6829266772`. Other products are excluded; a conflicting SKU/Apple ID, unknown currency, inconsistent unit totals or malformed report fails closed. USD proceeds include Apple’s commission and taxes, and returns reduce the total. Empty reports and “no sales” are not invented revenue. The key is not added to public deployment environment variables.

The financial report describes collected sales/receivables, not proof that Apple paid the developer’s bank. Positive reports remain `pending_payment`. `npm run finance:apple -- --confirm-payment <reviewed-manifest.json>` admits only a matching report, actual net USD payment no greater than report proceeds, unique payment reference, past settlement date, and SHA-256 of the reviewed bank/payment evidence file. The manifest requires `reviewed:true`, `vendor`, `month`, `reportSha256`, `netPaidMicros`, `paymentReference`, `evidenceSha256`, `evidenceFile`, `settledAt`. This is an operator reconciliation command, not an automatic bank-verification API. Bank fees and attributable adjustments must already be deducted from `netPaidMicros`.

Confirmed payments contribute 20% to the shared GPU ledger once. Duplicate confirmations are harmless; conflicting confirmations fail. Negative report proceeds reduce funding immediately. A changed report is held rather than silently replacing settled evidence. Any verified live Apple refund holds all positive Apple funding pending operator reconciliation; test receipts never do. Held corrections/refunds intentionally require financial review and cannot be cleared by a later paid event. Reports/checks retain hashes and Jamloom-only aggregates, not other apps’ line-item financial data. No spendable Apple proceeds existed at configuration time.

## Provider replenishment

The owner approved and saved native auto-pay: **add $25 when the balance falls below $10**, with low-balance notifications below $5. API readback verifies all three settings. This replaces the initially approved $50-below-$5 configuration, which the console rejected. The cash buffer may refill repeatedly; it has no monthly cap shown and is separate from the 20% net-revenue GPU usage rule. A deposit never creates GPU revenue or renews the seed allowance.

Before the correction, auto-pay was enabled with the old $100 threshold. Runpod confirms one $50 recharge at 9:19:24 a.m. Eastern on November 9; the prepaid balance became $61.384561. The agent warned about the incorrect threshold and did not execute a payment mutation. The corrected settings prevent the old $100 trigger from remaining active.

`JAMLOOM_PROVIDER_AUTO_PAY_POLICY=25-below-10` makes the operations monitor reread the provider settings and alert on a disabled or mismatched cash buffer. It suppresses obsolete manual $10 recharge recommendations while this separately approved native policy is configured. If provider reads fail, the existing monitor failure alert fires. New GPU starts still require verified settled revenue or the unchanged finite seed, provider credit and the independent guardian. Monitoring does not modify Runpod billing settings or charge cards.

## Creator continuation

Renewal continuation is configured but remains held until the current catalog’s existing economic qualification is valid and fresh guardian/provider/ledger capacity checks pass. If funding later fails, collection protection pauses future renewal invoices. Resumption removes only Jamloom’s own indefinite `void` funding pause, preserves billing dates, applies no proration, and refuses canceled/scheduled/older-catalog subscriptions, an imminent billing boundary, or any draft/open/uncollectible invoice. It never resurrects catch-up invoices. Existing nonexpiring credits remain intact.

The live qualification remains `held`. Refreshed posted provider totals still reconcile with zero residual, but the $150/month shared-cost assumption fails the 65% scenario at low volume and full supported lifecycle/retention evidence is still incomplete. A configuration switch cannot supply that evidence. No new qualification GPU request is included in this work.

See [financial follow-through](evidence/finance-followthrough-20261109/report.md) and [Apple reconciliation implementation](evidence/operating-automation-20261109/report.md).
