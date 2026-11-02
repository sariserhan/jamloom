# Empty GPU exclusion-list repair — 2026-11-01 local date

**PASS repair and local validation; PARTIAL release; paid continuation NOT RUN.**

The owner approved the private two-request 4090 diagnostic from `5c85b0f8`, up to $3 total. Its deployment and authenticated expiry guard passed. At 2026-11-02 02:35:20.848 UTC the controller activated capacity, then stopped because its immediate endpoint readback failed the profile validator. Capacity was disabled at 02:35:22.350. No worker was observed and no generation/upload/credit hold occurred. Independent cleanup and held-site restoration pass. This does not establish zero provider cost. [Execution](../release-capacity-audit-20261101/execution-result.json).

## Reproduction and fix

With capacity fixed at 0/0, one reversible configuration roundtrip reproduced a concrete validation bug: setting `gpu.excludedTypes: []` yields a PATCH response and repeated GET responses with that property omitted. The probe preserved the original hardware configuration and verified zero workers/jobs throughout. The active readback from the stopped attempt was not retained; this separate reproducible response explains the failure path without inventing an active receipt. [Recorded disabled responses](../release-capacity-audit-20261101/disabled-config-probe.json).

The validator now interprets an absent exclusion property as an empty list. Explicit null, non-array and non-string entries remain invalid. The current catalog must still resolve the chosen pool/exclusions to exactly the reviewed GPU at or below its price ceiling; new pool members, different hardware, extra workers and changed images remain rejected. No credit price, request budget, model or quality change.

The [official endpoint response example](https://docs.runpod.io/api-reference-v2/serverless/get-a-serverless-endpoint) also omits the exclusion property. Context7 was unavailable; the official API reference and actual disabled receipts were used.

## Verification

- PASS: the regression failed before repair with the same validation error, then passed after repair; all 208 site tests pass.
- PASS: replay of all four actual disabled receipts with active limits simulated locally; no provider operations in replay.
- PASS: 20 disposable PostgreSQL checks, site and harness typechecks, production build, bundle audit and both dry runs.
- PASS: independent zero-worker/queue/job cleanup, unchanged test/live wallets and restored public routes.
- NOT RUN: resumed GPU allocation, generated delivery and full attributable costs. Billing remains provisional.

## Prepared continuation

The [new plan](hosted-plan.json) requires explicit permission to resume because the original required stopping on failure. It keeps the original $3 aggregate: reserve $1 for the stopped attempt, more than its conservative $0.9814 entire-lease bound, and allow at most $2 for the continuation. A fresh 40-minute window includes preparation/deployment, with 130 seconds shutdown. One RTX 4090, Music DNA first and Improvise only on success; at most two generation submissions across both attempts, no retries, stop on failure, independent cleanup and held-site restoration.

The harness now saves sanitized PATCH and immediate GET receipts before validation, preserving a concrete mismatch if another configuration guard fails. The unchanged accepted image and request ceilings remain enforced. No sales activation, Apple submission, additional $3 budget or ongoing reviewer/customer funding is included.

This repair is local until the continuation is approved and deployed. Reliable delivery, complete operating economics, sustainable customer/reviewer capacity and final release gates remain open; owner-closed and deferred work stays closed.
