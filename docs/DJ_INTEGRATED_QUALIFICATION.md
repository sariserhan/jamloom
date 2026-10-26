# Current-code two-listener qualification

**FAIL startup; permit CONSUMED; rental deleted.** [Exact permit and source hashes](evidence/dj-integrated-20261026/authorization.json). Earlier permits are consumed. Account read-only check on 2026-10-26 returned $7.437156 credit and zero rentals; no top-up or purchase requested.

One GPU, $6 total maximum, forty minutes from rental creation, twenty fresh sixty-second tracks and at most four ten-second vocal candidates. Stop on first failure, automatic watchdog deletion, no replacements and no public activation. The existing $0.50/hour ceiling and reserved-cost checks remain. The watchdog is not a provider-enforced financial cap; outages can delay confirmed deletion.

This uses the existing production-receipt renderer, pinned ACE-Step code/checkpoint and original lyrics. The new 210-second stem prototype is a separate retained-source listening experiment. It is not silently substituted for fresh music. The professional quality target remains open.

## Execution after exact approval

1. Record the owner's exact approval, mark this permit AUTHORIZED, verify all recorded source hashes, then prepare a new private SSH key/token and output folder under `build-dj-integrated-20261026`. Preserve prior campaigns.
2. Use the existing rental controller with `--dj-qualification --dj-sessions --dj-beta --dj-hosted --dj-integrated`. `rent` checks the new unconsumed permit; `watch` inherits the campaign flag and its own deadline. Never reuse an older authorization or rental state.
3. Bootstrap the pinned renderer through `cloud_dj_warm.sh` with the absolute rental deadline and maximum 24 model requests. Keep its endpoint on the authenticated SSH loopback tunnel. Do not enable study-only model receipts in customer delivery.
4. Create the private warm-worker permit from the actual account/instance/rate/deadline and the authorization hash. Use the existing hosted dispatcher harness:

```sh
JAMLOOM_QUALIFICATION_ORIGIN=http://localhost:3008 \
  node --import tsx tests/dj-warm-qualification.mjs \
  --apply --beta --hosted --integrated
```

The renderer token and warm permit are supplied through the existing private-file environment variables; never put secret values in commands, reports or Git. Run from `apps/site` using Node 22. The separate loopback development server requires `JAMLOOM_QUALIFICATION_BUILD=1 JAMLOOM_COMING_SOON=false`; these settings do not change the stable preview or public site.

5. Check two independent listeners, ten distinct tracks each, initial two-track preparation, mood/energy commands, worker recovery after a lost completed response, third-listener capacity denial, Public Stop and Private exhausted credits. Verify no credit reservations remain, both complete recordings can be read from R2, private/cross-account access is denied, and all synthetic objects/accounts/database are removed.
6. Scan the two complete recordings, preserve provenance and measured runtime/memory, delete the rental, independently verify zero matching rentals and reconcile observed provider spend. Mark the permit CONSUMED after any attempt, including startup failure. Musical acceptance is separate from delivery/credit/storage checks.

## Local rehearsal

The same customer harness supports `--apply --beta --retained-rehearsal` on a disposable loopback database, with explicitly synthetic renderer receipts and twenty hash-verified retained originals. It never constructs a real Vast provider or opens a GPU connection. It uses actual browser playback, session/billing handlers and private R2, then removes its objects. This rehearsal does not establish GPU generation latency, fresh musical diversity or paid capacity.

The retained rehearsal passed with twenty distinct sources and full 307.392/420.340-second recordings. Stop, exhausted credits, lost-response recovery, access checks and cleanup passed. [Evidence](evidence/coherent-performance-20261026/retained-rehearsal.json). The owner approved “Approve the capped $6 integrated qualification”. One RTX 3090 was rented at a quoted $0.258889/hour including disk. The readiness check failed before the renderer became ready, after about 407 rental seconds. No audio was generated, no customer harness/database was started, and no replacement was rented. Cleanup and an independent complete inventory both confirmed zero rentals. Provider charges observed so far are $0.036; the earlier account-debit snapshot was $0.02783. These are provisional observations, not a final invoice. [Result](evidence/dj-integrated-20261026/result.json), [provider reconciliation](evidence/dj-integrated-20261026/provider-cost.json). The final remote setup error was not retained before automatic deletion; do not claim an identified model/package/host root cause.
