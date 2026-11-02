# Continuous release follow-through — 2026-11-01

**PARTIAL overall; PASS local preparation and current read-only checks.** The owner asked to complete release work in one run. No new paid compute was authorized by that request; every previous bounded permit is consumed. Existing authorization covers local work and staged deployment/activation after gates pass. Apple approval remains an external provider decision.

## Current state verified

- Apple 0.11.0 build 38 is **VALID**, selected for **MANUAL** release. Version and submission are **READY_FOR_REVIEW**, with no submitted date. No App Review or product submission was made.
- Runpod has endpoint min/max **0/0**, no workers, no queued/in-progress jobs and no retried jobs. The prior endpoint hardware selection remains restored. No GPU was activated.
- The catalog reports **LOW** L4 Serverless availability in EU-RO-1, and **LOW** A5000 Serverless availability in US-CA-2 and US-IL-1. Both have 24 GB and listed Serverless price $0.75/hour. Availability is an ephemeral provider estimate, not reserved capacity. This motivates an alternate-hardware experiment; it does not establish a resolved root cause or sufficient stock.
- Latest endpoint billing for the preceding active-capacity attempt still has no posted records. This is provisional and is not a confirmed zero-cost result.
- Read-only schema verification passes: 33 migrations, none pending/changed/unknown. No database migration was required. The preflight configuration describes the local process, not proof of currently deployed billing flags.

## Prepared change

Added an explicit **A5000 diagnostic-only profile**. The existing L4 production profile remains unchanged and cannot select A5000. Ordinary generation configuration rejects the diagnostic profile. Only the private review-account path can construct it, with an existing valid 40-minute/$3 maximum active-worker lease; the provider verifies exactly one A5000, unchanged published image, one active/max worker, no additional storage, and the same $0.75/hour ceiling. Mixed/new GPU types, unknown profiles, expired/missing leases and higher prices are rejected.

Retail credit prices, request cost caps, model code/weights, output quality checks and generation deadlines are unchanged. This does not qualify A5000 for customers or enable checkout. It prepares a controlled test of whether the exact same model can execute on an alternate 24-GB GPU.

The [prepared plan](hosted-plan.json) requests one aggregate **$3** permit: one A5000, one private Music DNA request followed only on success by one private Improvise request, maximum 40 minutes including deployment/preparation plus 130 seconds shutdown, no repeated submissions, stop on failure. Improvise uploads only the previously confirmed 1.22-second crop; test objects are independently deleted afterward. No worker image publication, AI DJ rental, ongoing review funding, live charge or public activation is included.

The archived harness preserves absolute deadlines, single-use submission claims, at least 16 minutes reserved after preparation, full test/live ledger isolation, local and hosted shutdown guards, remote-object cleanup and held-site restoration. It now captures bounded private system/container logs while short-lived workers exist, rather than depending on retired-worker logs that return 404. Startup failure remains unresolved until provider execution supplies evidence.

## Validation

**PASS:** 206 site tests, 12 focused profile/provider tests, site typecheck, isolated production build, harness typecheck, both no-operation dry runs, the exact approved source checksum and the 113-file public studio bundle audit. Tests cover private-only alternate hardware, unchanged L4 behavior, exact hardware/price/concurrency bounds, finite-lease enforcement and unchanged credit budgets.

**NOT RUN:** A5000 hosted execution; current-image successful Music DNA delivery; final complete operating-cost qualification; separately funded AI DJ operating qualification; ongoing App Review capacity; customer activation; Apple submission/approval/public release. Owner-deferred scoring/training and closed listening/endurance studies remain closed.

## Documentation consulted

Context7 was unavailable. Official Runpod [worker states](https://docs.runpod.io/serverless/workers/overview), [product-specific GPU availability](https://docs.runpod.io/api-reference-v2/catalog/get-a-gpu-type), [worker log streaming](https://docs.runpod.io/api-reference-v2/serverless/stream-serverless-worker-logs), and [failure billing](https://www.runpod.io/blog/failed-requests-real-charges-how-runpod-serverless-billing-works-when-workers-fail) were consulted. No provider support message was sent. The image-loading observation alone does not prove a model, registry or hardware defect.
