# Continuous release follow-through — 2026-11-01

**PARTIAL release; FAIL hosted admission; PASS cleanup and local repair.** The owner approved the prepared two-request/$3 A5000 diagnostic. It was stopped before either generation when a deterministic readiness bug was identified. The permit is consumed; no retry or deadline extension occurred. [Execution and repair](execution.md).

## What the approved run established

The exact reviewed source `d5c49101` built successfully and passed private-account, public-route and hosted-expiry checks. One A5000 downloaded/extracted the existing model image, was briefly throttled, then reached RUNNING. The account reported enough balance and no funding restriction. This was not simply an absence of GPU capacity.

Our admission predicate required both `workers.running > 0` and `workers.ready > 0`. Four actual running health samples reported `running=1, ready=0`. Runpod's [CLI documentation](https://github.com/runpod/runpodctl#waiting-until-a-resource-is-usable) explains that active workers stay running and do not enter the cached-ready counter. This conjunction incorrectly prevented admission. Neither counter alone proves a loaded handler or successful generation. [Observed health](running-health.json), [exact hardware](observed-hardware.json), [account check](account-capacity.json).

Stopped through the existing controller failure path at 01:40:51 UTC, before the fixed 01:59:41 deadline. **Zero requests, uploads, credit reservations or model executions were submitted.** Independent cleanup confirms limits 0/0, previous hardware restored, empty provider inventory/queue, no pending database jobs and no test objects. Test balance remains 2,990 with zero reserved; live balance remains zero. The held public deployment `f3fdfd63` is restored; all four product workspaces return 200 and customer generation/purchases remain closed. [Cleanup](style-cleanup.json), [final verification](final-verification.json).

Provider worker and endpoint billing have no posted rows yet. This is provisional, not proof of zero charges or viable operating costs. [Worker billing](style-provider-billing.json), [endpoint billing](endpoint-billing.json). Raw provider logs stay private; only [keyword counts](log-summary.json) are recorded here, without interpreting them as model readiness.

## Local repair

The admission condition now accepts a running placement with an empty queue while rejecting cached-only, initializing, throttled, unhealthy or malformed states. Fixed credit prices, one-worker limits, reservation concurrency, request TTL, execution deadline and full failed-job credit release remain enforced. The same check serves web and native requests.

**PASS:** actual-state regression fails before the fix and passes afterward; 206 site tests, 11 focused provider/profile checks, 20 disposable-Postgres checks and typecheck. The database checks include availability, credit holds, simultaneous requests, cancellation, privacy and ambiguous submission. Disposable test data was removed. [Validation](readiness-repair-validation.json).

**NOT RUN:** deployment and hosted song verification of this repair. The completed diagnostic's archived harness and plan remain unchanged apart from outcome metadata; it must not be reused as permission to resume.

## Remaining release gates

Successful deployed Music DNA and Improvise delivery on the repaired admission path; complete attributable operating costs; separately bounded AI DJ operating qualification and ongoing App Review capacity; final sales activation and Apple submission/approval/release. Apple 0.11.0 build 38 is VALID in the unsubmitted MANUAL-release draft. Stripe setup is ready but the existing product/price/webhook remain inactive or disabled. [Apple](apple-readonly.json), [Stripe](stripe-readiness.json), [activation sequence](../../LAUNCH_ACTIVATION.md).

Owner-deferred scoring/training and closed listening/endurance studies stay closed. No new model/image, price change, live charge, Apple submission or provider support message was made.

## Prior preparation

The private A5000 diagnostic profile is lease-bound and cannot widen ordinary L4 production hardware. Earlier source validation passed 206 tests, typechecks, isolated production build, 33-migration read-only verification, the 113-file public bundle audit and both no-operation harness dry runs. The existing model/image and approved 1.22-second crop were preserved. Context7 was unavailable; current official Runpod documentation was used for provider behavior, including [worker states](https://docs.runpod.io/serverless/workers/overview), [availability](https://docs.runpod.io/api-reference-v2/catalog/get-a-gpu-type) and [logs](https://docs.runpod.io/api-reference-v2/serverless/stream-serverless-worker-logs).
