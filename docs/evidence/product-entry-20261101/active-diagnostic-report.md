# Active-capacity diagnostic — 2026-11-01 local date

**FAIL capacity qualification; PASS independent cleanup and website restoration. Permit consumed.** Owner approved one active-GPU check up to $3. The exact original expiry is 2026-11-02 01:12:07.596 UTC, plus up to 130 seconds for shutdown. One private German Jazz request was permitted, with no retries and no user recording upload.

Source `2720f8c5` was deployed at `https://jamloom-lnxsomcjb-ssari.vercel.app` and was temporarily promoted for private review-account qualification. Ordinary generation and purchases remain closed. Vercel CLI disconnected during build; read-only inspection confirmed the same deployment completed. No duplicate deployment was started.

The production cron credential is sensitive and redacted by environment pull; its previously saved private source was recovered. The authenticated deployed shutdown guard returned the expected receipt before any GPU activation. The local independent watchdog also started before activation.

One active L4 was enabled at 00:36:31 UTC. Provider v2 inventory confirmed NVIDIA L4, EU-RO-1 and INITIALIZING. Preparation ended at 00:56:31 UTC. Submission required both running/ready provider capacity and deployed availability to pass. The initial wallet had 2990 test credits, no reservation, and zero live credits. No new credit grant or customer charge was made.

The single attempt is finished and must not be restarted under this consumed permit. The controller/HTTP results and provider were inspected independently; the zero-worker, object-absence and wallet checks passed, and the previous public deployment was restored. The fixed public product pages remain in both deployments.

## Final result

The preparation window expired without a running/ready worker. The controller disabled the endpoint at **00:56:33.675 UTC**, well before the original absolute deadline. Runpod cycled through ten observed initializing worker instances with intermittent throttling; there was no submitted generation and the provider job retry count stayed zero. This was provider-managed allocation under the same maximum-one-worker endpoint, not repeated generation requests. The available worker log reported “loading container image from cache”; retired worker log reads returned 404. The precise provider startup cause is unresolved; there is no evidence here of model execution or a generated-audio defect.

**PASS:** independent endpoint limits 0/0, empty provider inventory/queue, previous hardware settings restored, no remote test audio created, and both wallets unchanged (2990 test credits available, zero reserved; zero live credits). The fixed product website is restored to `https://jamloom-of9eta19v-ssari.vercel.app`, source `f3fdfd63`; four public product pages still return 200 and public generation remains closed. The local watchdog was stopped only after zero-worker cleanup; the hosted expiry guard was verified before activation, but expiry-triggered shutdown was not needed or claimed.

**PROVISIONAL billing:** neither the ten worker IDs nor endpoint-level hourly billing has posted charges. Missing rows are not proof of zero cost. The $3 permit is consumed and cannot be repeated. No retries, warmup generation, recording upload, sales activation or App Review submission occurred. Reliable capacity and actual generation/cost qualification remain open.

The current provider inventory and log endpoints are documented at [worker inventory](https://docs.runpod.io/api-reference-v2/serverless/list-serverless-endpoint-workers) and [worker logs](https://docs.runpod.io/api-reference-v2/serverless/stream-serverless-worker-logs). Endpoint billing uses the documented [hourly billing API](https://docs.runpod.io/api-reference-v2/billing/get-serverless-billing-history); its rounded window is retained with the receipt. No provider support message was sent.

During this run, the owner requested disk cleanup. The separate [cleanup report](../disk-cleanup-20261101/report.md) records 7.75 GiB of audited removals and preserved runtime dependencies. The controller, watchdog and observer continued uninterrupted.
