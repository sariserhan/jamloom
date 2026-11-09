# Revenue-funded GPU capacity

Owner decision, November 9, 2026: reserve 20% of net payment proceeds for GPU usage; keep one L4 worker initially.

The verified Stripe purchase adapter records gross amount, actual processor fee and tax separately from the wallet’s conservative planning reserves. The GPU allocation is `(gross cents - fee cents - tax cents) * 10000 / 5`, floored at zero. USD micros avoid floating-point accumulation. Receipt, charge and balance-transaction IDs are unique. Financial evidence survives account anonymization.

Pending payments create pending allocations. The five-minute operations monitor rereads Stripe’s captured live charge and balance transaction; only available funds become spendable. Test, trial, promotional and estimated Apple receipts cannot fund this pool. Apple actual settlement reconciliation is not implemented; no Apple proceeds are assumed. Refunds/disputes revoke the whole original allocation conservatively, including partial refunds. Already reserved costs remain recorded; negative available funds must be covered by later revenue before further revenue-funded starts.

The original $10/seven-day seed grant retains its exact dates and thirteen-cycle limit. While valid it funds cycles first. `JAMLOOM_GPU_REVENUE_SHARE_BPS=2000` allows subsequent cycles from the separate durable revenue pool. The seed grant’s stored hash stays unchanged, while the guardian policy hash changes. Disabling the flag restores finite-only admission and stops cycles after the old expiry. Never delete the revenue ledger or reuse spent funds during a rollout or rollback.

Each explicit preparation reserves its entire $0.75 maximum before activating the one L4 worker. Concurrent starts share the recorded cycle. Lost activation responses retain their reservation and trigger stop-only recovery. Shutdown never invents a refund from an estimated runtime. Existing startup, idle, lease, per-owner and job-credit cost limits stay enforced. More revenue buys additional funded preparation cycles, not additional simultaneous workers.

Runpod prepaid credit is checked before each activation; a fresh monitor read also gates new sales. This does not transfer Stripe money to Runpod or enable card auto-pay. The current provider credit covers the initial allowance; later provider recharge remains an operating action. Funding exhaustion closes new sales and preparation; existing paid credits, result access, cancellation and receipt recovery remain available. No first-payment bootstrap is possible after all funding is exhausted without an authorized seed or newly settled earlier payments.

The 65% contribution target is still unqualified. Creator collections remain paused after the initial payment, as disclosed, with no automatic resume or catch-up billing. Ongoing renewal activation and actual Apple proceeds require their existing qualification/reconciliation. A 20% allocation is a spending rule, not evidence of margin or complete credit-liability coverage.

Evidence: [November 9 implementation and rollout](evidence/revenue-funding-20261109/report.md).
