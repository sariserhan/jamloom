# Credit system checkpoint — 2026-10-31

**PASS implementation and scoped verification; PARTIAL activation.** Owner approved payment implementation across web and phone, with all paid credits nonexpiring. [Current design and exact release gates](../../CREDIT_SYSTEM.md).

| Gate | Result | Evidence / boundary |
|---|---|---|
| Site unit suite | PASS | 179/179, `site-unit-tests.log` |
| Focused payment/real PostgreSQL suite | PASS | 92/92, `credit-tests.log`; includes allocation margin, renewal period uniqueness, duplicate/refund races, privacy, failure refunds, legacy credit/DJ conversion, trial caps, Apple expiry and DJ session limits |
| TypeScript | PASS | `typecheck.log`, exit 0 |
| Real Stripe sandbox lifecycle | PASS | `stripe-lifecycle.jsonl`: concurrent checkout reuse, paid initial invoice, monthly renewal, duplicate deliveries, end-of-period cancellation preserving credits and refund reconciliation; test clock and database removed |
| Stripe test catalog and portal | PASS | `stripe-catalog.jsonl`; $15/300 monthly, cancellation at period end, no plan switching; private local configuration saved |
| Browser | PASS | `browser.json`, desktop + 390px mobile screenshots; verified account, one-time trial, repeated claim, both test Checkout redirects, no overflow or console errors; no card entered |
| iPhone StoreKit/account tests | PASS | `ios.json`: 27 reported, 4 explicit opt-in skips, 0 failures; 23 actual local tests pass; unfinished delivery/recovery, account binding, Creator restore and product types |
| Native iOS device compilation | PASS | Unsigned generic-iOS Debug build; no physical-device purchase, distribution or submission implied |
| Neon migration | PASS | `migration.json`: private full backup; verified production target; migration 0033 applied; all 33 hashes match; second apply no-op |
| Actual generation economics for new prices | NOT RUN | Budgets are constraints, not observed costs; live cost qualification remains unset |
| New real Apple products / sandbox receipts | NOT RUN | Fixtures exist; App Store Connect creation/approval and physical-device qualification remain |
| Live charging / deployment | NOT RUN | Existing holds remain; no live charge, release or GPU rental |

New behavior: Creator $15/300 per month; optional $10/150 top-up; bounded 20-credit trial; fixed Improvise 10, Music DNA 20 and DJ 2/generated-minute prices; private default without extra cost; nonexpiring paid balances retained after cancellation; full technical-failure/cancellation refunds; same quality across offers; same account wallet on web/iPhone. Existing Pro/course entitlements remain separate. Old available credit units convert 15:1 and unused DJ bank returns once without modifying historical ledger entries.

Scope includes server catalog/ledger/migration, Stripe Billing and Customer Portal, Apple signed renewal handling, website and iPhone purchase/restore/manage UI, operation quotes and DJ minute limits, provider preparation/test tooling and owner setup documentation. Initial purchase verification is USD only. Unsupported storefront currencies are hidden in iOS and rejected by the verifier.

Observed provider tests validate payments, not musical quality or per-song costs. Current live budget maximums are $0.07 Improvise, $0.14 Music DNA and $0.014 per DJ generated minute against a conservative $0.02 net/credit floor and 65% contribution target. Actual allocated proceeds are checked too. Activation requires cost evidence that the enforceable worker caps fit these budgets, or an owner-reviewed catalog change.

Failures resolved during this increment: old tests expected public defaults/privacy premiums; the new defaults and fixed prices required updated expectations. Concurrent subscription Checkout initially exhausted the two-connection pool by acquiring nested connections; all work now reuses its locked transaction client and the real concurrent-provider check passes. StoreKit unfinished transactions required waiting for their asynchronous delivery sequence. The browser harness initially mistook Next's dev portal for an error, lacked its test-only webhook fixture, then raced navigation while reading a response; interception now captures the response before navigation. Repeated fixture signups hit the real local auth rate limiter; only the disposable database's rate-limit rows were reset. None of these failures was treated as a passing run. Initial backup attempts with only the database URL environment did not connect. PostgreSQL 18 with explicit private connection environment produced the verified backup before any migration.

No raw auth/verification tokens, payment credentials or private backup data are included here. Test-only checkout sessions/customers are removed in `browser-provider-cleanup.json`. Existing user applications, recordings and unrelated working-tree changes are preserved.
