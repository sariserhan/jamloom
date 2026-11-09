# Operating automation

Owner follow-through, November 9: configure remaining provider funding, Apple proceeds and Creator continuation. The 20% net-revenue rule and 65% margin target remain.

## Apple financial reporting

The independent headless service downloads the current and two preceding fiscal-month FINANCIAL reports for region ZZ daily. It uses the owner-supplied vendor number and existing App Store Connect key, stored only in the server’s private configuration. The product bindings are independently verified against Apple: Creator `6829266841`, top-up `6829266772`. Other products are excluded; a conflicting SKU/Apple ID, unknown currency, inconsistent unit totals or malformed report fails closed. USD proceeds include Apple’s commission and taxes, and returns reduce the total. Empty reports and “no sales” are not invented revenue. The key is not added to public deployment environment variables.

The financial report describes collected sales/receivables, not proof that Apple paid the developer’s bank. Positive reports remain `pending_payment`. `npm run finance:apple -- --confirm-payment <reviewed-manifest.json>` admits only a matching report, actual net USD payment no greater than report proceeds, unique payment reference, past settlement date, and SHA-256 of the reviewed bank/payment evidence file. The manifest requires `reviewed:true`, `vendor`, `month`, `reportSha256`, `netPaidMicros`, `paymentReference`, `evidenceSha256`, `evidenceFile`, `settledAt`. This is an operator reconciliation command, not an automatic bank-verification API. Bank fees and attributable adjustments must already be deducted from `netPaidMicros`.

Confirmed payments contribute 20% to the shared GPU ledger once. Duplicate confirmations are harmless; conflicting confirmations fail. Negative report proceeds reduce funding immediately. A changed report is held rather than silently replacing settled evidence. Any verified live Apple refund holds all positive Apple funding pending operator reconciliation; test receipts never do. Held corrections/refunds intentionally require financial review and cannot be cleared by a later paid event. Reports/checks retain hashes and Jamloom-only aggregates, not other apps’ line-item financial data. No spendable Apple proceeds existed at configuration time.

## Provider replenishment

Runpod’s saved native auto-pay setting is $50 per refill at a $100 balance threshold; it is OFF. Current prepaid balance is $11.384561. Public documentation provides fixed amount/threshold auto-pay, not a percentage-of-revenue recharge cap. Its public API specification does not document a supported recharge mutation. Introspection was refused; no attempt was made to bypass it.

The operations monitor prepares a $10 recharge recommendation only when prepaid credit is below three preparation cycles and the remaining settled revenue exceeds the current provider balance by at least $10. It sends the existing owner alert. This is a reviewed cash-transfer recommendation; it does not execute a card charge or track arbitrary manual top-ups. Native auto-pay remains OFF unless a separate cash-float policy is approved and configured. Provider deposits are not counted as new revenue or charged again as GPU usage.

## Creator continuation

Renewal continuation is configured but remains held until the current catalog’s existing economic qualification is valid and fresh guardian/provider/ledger capacity checks pass. If funding later fails, collection protection pauses future renewal invoices. Resumption removes only Jamloom’s own indefinite `void` funding pause, preserves billing dates, applies no proration, and refuses canceled/scheduled/older-catalog subscriptions, an imminent billing boundary, or any draft/open/uncollectible invoice. It never resurrects catch-up invoices. Existing nonexpiring credits remain intact.

The live qualification remains `held`. Refreshed posted provider totals still reconcile with zero residual, but the $150/month shared-cost assumption fails the 65% scenario at low volume and full supported lifecycle/retention evidence is still incomplete. A configuration switch cannot supply that evidence. No new qualification GPU request is included in this work.

See [implementation and deployment evidence](evidence/operating-automation-20261109/report.md).
