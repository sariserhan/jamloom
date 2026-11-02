# Direct product entry — 2026-11-01

**PASS implementation, local verification and website deployment. Full release PARTIAL.**

The owner requested the actual product on each public product URL, with account and credit requirements at generation. The coming-soon proxy previously redirected these routes to the multi-product tour. Music DNA, Improvise, DJ Academy and Singing Academy now render their own workspaces anonymously. Free lessons and course catalogs remain browseable; existing paid lesson entitlements remain enforced.

Music generation opens an account/credit confirmation after input selection. Anonymous visitors see sign-in, signed-in visitors see their balance and price, and unavailable capacity prevents the final request. Music DNA favorites remain local. Improvise saves the selected recording and direction locally only when leaving for sign-in, restores it once, and expires abandoned drafts after 24 hours. Safari requires ArrayBuffer storage rather than Blob storage. No recording is uploaded until the explicit final Generate action.

## Verification

- PASS: 205 site tests, 20 isolated database checks, typecheck, production build and bundle/private-asset audit.
- PASS: Chrome and WebKit production UI at 1440 and 390 pixels, four direct routes, both free lessons, sign-in/credit/capacity behavior, recording restoration and active-job recovery. Zero generation POSTs and page errors. Expected anonymous 401 responses are recorded.
- PASS: screenshots visually reviewed; no horizontal overflow. Browser harness settles background requests before navigation to avoid WebKit interception cancellation artifacts.
- NOT RUN: paid generation in this increment, native app submission and full release activation.

## Remaining generation work

Provider idle/cached readiness did not prove allocated execution capacity. Admission now requires both running and ready, with an empty queue. A finite active-worker lease additionally permits exactly one active L4 only for an explicitly funded window. It validates image, hardware, current price, duration and expiry; new requests are denied before there is insufficient time for their original deadline and cancellation grace. No active lease or GPU is enabled by this website publication.

The [prepared diagnostic](hosted-plan.json) needs a fresh $3 permit: one request, one active L4, up to 40 minutes plus shutdown, no retries. It includes a separate local shutdown watchdog and authenticated hosted expiry shutdown, absolute preparation checks before quote/submit, private test wallet, remote-audio removal and independent cleanup. This diagnostic cannot by itself establish ongoing unit economics or reviewer availability.

Prior permit billing remains provisional: four observed workers have no returned billing rows. Missing billing is not zero cost. AI DJ operating-cost qualification, complete generation economics, finite reviewer funding, final App Review submission/approval and customer activation remain open. Previously deferred research and owner-closed listening/endurance studies stay closed.

The current Apple read-only check confirms 0.11.0 build 38 VALID, all five draft items READY_FOR_REVIEW and MANUAL release. No submission or activation was performed. The cost audit remains PARTIAL_PROVIDER_COSTS. Hosted lease expiry recovery is prepared as a follow-up to website source `f3fdfd63`; it must be present and verified in the diagnostic deployment before any worker is activated.

## Website deployment

Source `f3fdfd63` is live at https://www.jamloom.com via `dpl_6bA5QCLSMvBSXZ178kxHzFMBUqgC` (`https://jamloom-of9eta19v-ssari.vercel.app`). The isolated candidate passed before promotion. All four public workspaces and both free lessons return 200; anonymous generation and checkout remain 503, and status reports unavailable. No credits were spent or recording uploaded. Provider read-only verification confirms limits 0/0, no workers and no pending jobs. Rollback remains `https://jamloom-lq7mqh2ui-ssari.vercel.app`.

The separate hosted lease-expiry guard is committed in `2720f8c5` and must be deployed with the new private diagnostic configuration after approval. Its production build, typecheck and updated 205-test suite pass. The new $3 permit is requested, not inferred from prior consumed permissions. Prices, research deferrals and prior musical approvals remain unchanged.

**PASS live browser verification:** Chrome at desktop size and WebKit at phone size open all four product workspaces directly. Both generation dialogs request sign-in; generation stays disabled. Zero mutation requests, no uploaded audio and zero page errors. These checks use real anonymous deployed account/status responses. See `live-browser.json`, `live-http.json` and the live screenshots. The harness waits for the actual controls, avoiding a network-idle wait on a live polling site.

**Follow-up:** the approved active-worker diagnostic has now stopped with FAIL capacity and PASS cleanup/held restoration. No generation was submitted, wallets are unchanged, and the endpoint is disabled. See [final diagnostic result](active-diagnostic-report.md). The permit is consumed, and billing remains provisional.
