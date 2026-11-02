# Improvise runtime check — 2026-11-01 local date

**FAIL runtime; PASS independent cleanup; release PARTIAL.**

The owner approved “Approve one extra request within $3 total.” Exact source `14b9d38a34e1d31b49ca1c7bccfc899441c1fa5f` was deployed to `https://jamloom-newlozj4y-ssari.vercel.app`. The candidate shutdown guard and private-account preflight passed before activation. The one additional request is consumed; there was no retry and Music DNA was not repeated.

## Observed result

- One RTX 4090 was active at a time. Runpod replaced two initializing workers before the third reached RUNNING. Activation was 03:12:34 UTC; provider readiness was observed at 03:23:41 and deployed application admission at 03:24:02.
- Exactly one Improvise request was submitted at 03:24:05 UTC using only the approved 1.22-second question crop. The ordinary random output duration was 33 seconds, with male voice and drum and bass.
- The provider returned FAILED / `worker-timeout` after **120,564 ms execution**, with **19 ms queue delay**. No finished audio was delivered. The private captured provider log confirms the static timeout. It does not identify the internal processing stage; no bottleneck claim is made.
- The 120-second execution allocation was insufficient. Total TTL remained 130 seconds, request cap $0.0694, price 10 credits and the accepted model unchanged. Do not extend the limit again without first identifying the expensive processing stage and reconciling the unchanged catalog budget.

## Cleanup and restoration

Independent cleanup PASS: original hardware settings restored, endpoint workers 0/0, empty worker inventory, zero queued/running jobs, two remote test objects deleted and verified absent with HEAD 404. All 10 test credits were released; the test wallet remains 2,970 available / 0 reserved and the live wallet 0 / 0 unchanged. Cost reservations and provider receipts are retained.

Controller and observer completed. The held website `https://jamloom-of9eta19v-ssari.vercel.app` was restored. Final checks at 03:27:22 UTC confirm all four public product routes return 200 and anonymous generation remains unavailable. Sales and Apple submission remain closed.

## Costs and remaining work

The request estimate is **$0.06598**, not a complete provider bill. Current worker-specific and endpoint-hour billing rows have not posted; missing rows are not zero. This stage stayed under the enforced $1 lease cap, with $2 reserved for the two prior leases within the original $3 aggregate. The conservative bound for each full 40-minute lease plus 130-second shutdown is $0.9814. No further request or lease is authorized by the consumed permit.

Music DNA's previous technical delivery PASS remains valid. Improvise runtime/cost compatibility, reliable customer/reviewer capacity, complete attributable operating costs and final release activation remain open. Existing owner-closed studies and deferred research are not reopened. The next useful technical work is phase-level timing for the timeout path, rather than another uninstrumented runtime increase.

Local validation on the executed source remains PASS: 208 site tests, 20 disposable-database checks, site/harness typechecks, production build, bundle audit and both dry runs. These checks do not override the hosted failure.

[Machine-readable result](execution-result.json), [cleanup](style-cleanup.json), [final checks](final-verification.json), [billing](endpoint-billing.json), [consumed permit](hosted-plan.json).
