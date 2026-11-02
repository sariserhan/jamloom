# Approved A5000 check — 2026-11-01 local date

**FAIL admission; PASS shutdown, independent cleanup and local repair.** The owner approved “Approve the two requests, $3 total”. The fixed lease was set to expire at 2026-11-02 01:59:41.861 UTC, with at most 130 seconds for shutdown. It was stopped early at 01:40:51 UTC after a deterministic admission bug was identified. This permit is consumed; no repeat or resumption occurred.

The candidate from `d5c49101` built and passed its private account and hosted-expiry guard checks. One exact A5000 was enabled at 01:23:42 UTC. Provider records showed image download/extraction, transient throttling, then a running worker at 01:39:06 UTC. The health samples reported `running=1, ready=0`. The controller incorrectly required both counters to be positive, so no request reached Music DNA and Improvise never uploaded the owner recording.

Runpod's [CLI documentation](https://github.com/runpod/runpodctl#waiting-until-a-resource-is-usable) explains that an active worker stays in running, while ready counts scaled-down cached workers. Neither count proves a hot model handler. The old conjunction was impossible for this single active worker. The operator signaled the controller's existing failure path; it restored the previous hardware and zero-worker settings. No paid harness, hardware selection, deadline or request limit was changed to continue the attempt.

Independent cleanup and final checks confirm endpoint 0/0, empty worker inventory/queue, no pending database jobs, no remote test objects and unchanged wallets (2,990 test credits, zero reserved; zero live credits). The held `f3fdfd63` deployment was restored and all four product routes return 200; customer generation and sales remain closed. Billing has not yet posted and is provisional, not zero cost.

The local repair admits a running placement with an empty queue and rejects cached-only, initializing, throttled, unhealthy or malformed state. Existing deadlines, prices, one-request reservation and failure-release behavior remain unchanged. The observed-state regression fails before the repair and passes after it; 206 site tests, 11 focused checks, 20 disposable-Postgres checks and typecheck pass. The repair is not deployed or hosted-qualified.

[Execution](execution-result.json), [running samples](running-health.json), [hardware](observed-hardware.json), [cleanup](style-cleanup.json), [final checks](final-verification.json), [billing](style-provider-billing.json), [local repair](readiness-repair-validation.json).
