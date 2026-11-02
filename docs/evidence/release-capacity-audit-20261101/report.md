# Release capacity audit — 2026-11-01 local date

**PASS local preparation; PARTIAL release; hosted 4090 qualification NOT RUN.**

The prior A5000 continuation is consumed: no worker was allocated in its preparation window and no song was submitted. Cleanup and held-site restoration passed. This audit made no provider configuration, billing, deployment, sales or App Review mutations.

## Capacity and next candidate

The live [catalog](catalog.json), read at 2026-11-02 02:24 UTC, reported LOW serverless availability for L4/A5000 and HIGH for RTX 4090. A separate read reported no 3090 availability. Catalog availability is not a reservation or a guarantee of handler readiness. The existing endpoint is stopped, has no regional restriction, and retains the accepted immutable image. [Sanitized endpoint](endpoint.json).

A separate private-only `4090-diagnostic-2026-11-01` profile now validates exactly one RTX 4090 in ADA_24, a serverless price no higher than $1.34/hour, the unchanged image/storage/scaler, and a finite funded active lease. Ordinary customer configuration rejects it. L4 defaults and the existing A5000 diagnostic remain unchanged.

The 4090 diagnostic rate is conservatively 380 microdollars/second. Improvise execution/TTL is 100/130 seconds with a $0.0694 cap; Music DNA is 250/310 seconds with a $0.1378 cap. Prices remain 10/20 credits and the $0.07/$0.14 catalog ceilings are unchanged. These deadlines are feasibility hypotheses, not benchmark results. No audio-quality setting or model changed. The full 40-minute lease plus 130-second shutdown has a conservative $0.9814 funding floor; request costs are part of the total, not additive.

The [prepared plan](hosted-plan.json) requests a new $3 maximum, one active GPU and two sequential private requests: German Jazz Music DNA first, then the approved question crop only after success. No warmup generations, repeated requests or automatic retries. Stop on failure, retain local evidence, independently remove remote test audio, stop all workers and restore the held deployment. The controller, local watchdog, hosted expiry guard, observer and cleanup are archived in `qualification-harness/`; restore them to the named ignored build directory to execute. Approval must precede lease creation or deployment.

## Billing finding

The documented GraphQL billing query returned six hourly serverless rows totaling $1.034453363 and storage totaling $0.0062499996 for the queried historical window. Every endpoint/GPU/instance/worker-type field was null despite grouping by instance. These are account-level reported usage records, not an attributable final invoice. They cannot close recent-attempt or per-song economics; empty recent periods are not zero-cost evidence. [Sanitized records](billing-summary.json). Account balance, keys and raw endpoint environment remain private.

## Validation

- PASS: 207 website tests, including private-only 4090 access, product budget compatibility, rate-aware lease funding and hardware/price drift rejection.
- PASS: 20 disposable PostgreSQL checks for admission, concurrency, credits, provider recovery and privacy; only the temporary local database was created and removed.
- PASS: site and harness typechecks, production build, secret/content bundle audit, controller and HTTP dry runs with zero provider operations.
- NOT RUN: hosted 4090 allocation, timing, delivery and attributable full operating cost. No permit has been consumed for this candidate.

## Remaining release work

1. Execute an explicitly approved bounded generation check and reconcile actual startup, idle, execution, failed-job and storage costs.
2. Establish a viable customer/reviewer capacity lifecycle. Current admission requires an allocated running worker; a scale-to-zero endpoint alone does not establish a working first-request path. A short diagnostic lease is not ongoing App Review funding or customer availability. AI DJ economics/capacity also remain separate from the owner-closed endurance study.
3. After the technical and economic gates pass, complete authorized sales activation, deployed verification and Apple submission. Apple approval remains external.

Do not reopen owner-closed musical/endurance studies or deferred scoring/training. Do not treat local tests, catalog stock or mathematical request caps as full release qualification.

Official references consulted: [Runpod GraphQL schema](https://graphql-spec.runpod.io/), [GPU catalog](https://docs.runpod.io/api-reference-v2/catalog/get-a-gpu-type), [worker lifecycle](https://docs.runpod.io/serverless/workers/overview). No provider contact or feedback was sent.
