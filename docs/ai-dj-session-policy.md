# AI DJ session pricing and sharing — 2026-10-24

**PARTIAL product; PASS tested local implementation.** The generated-session setup,
wallet-backed session service and public-listing rules are prepared. The customer
Start action remains disabled because no rolling DJ renderer/shutdown adapter is
connected. No real session, live credit charge, paid worker, publication or
website deployment was started.

## User flow

- [Plan a set](http://localhost:3000/ai-dj/session): party name, Public/Private,
  house/tech-house/techno and starting energy. Public is selected initially.
- Public explicitly names the full recording and party name as public. Private
  explains the extra credits and keeps the set out of public listing/playback.
- Recording is automatic. There is no recording permission checkbox for generated
  sessions. This does not change microphone consent or grant training permission.
- Exact quotes are calculated by the existing wallet service. They are not shown
  as invented customer prices while the renderer and its cost budget remain
  unqualified. The setup explains the existing 25% private premium, rounded up.
- [Public sets](http://localhost:3000/ai-dj/sets) has a real empty state and a
  12-set cursor-paginated listing with full-set playback when eligible audio exists.
  No demonstration tracks or imported local files are published to fill the page.
- The existing local playback-test deck remains available and its recordings stay
  private. New links connect the setup, deck and public sets pages.

## Server implementation

`DJSessions` reuses `Wallet`, signed generation quotes and the existing ledger.
A caller supplies a reviewed per-track cost/runtime budget; there is no default
commercial DJ price and no provider dispatch side effect in this class.

- Start binds owner, session ID, party title, style/energy, visibility, budget and
  accepted maximum credits per track. It reserves the first track atomically with
  its session record. Unchanged retries recover the same reservation, even after
  the original quote has expired. Changed or cross-owner requests cannot reuse it.
- Every session/sequence has its own reservation and server-derived seed. Retries
  reuse the identity; byte-identical completed audio is rejected across sessions.
  Fresh seeds/bytes do not prove perceptually different or professional music.
- At most one generation reservation is active per owner and at most two completed
  tracks await playback. Playback acknowledgements must follow sequence order.
  Stop and new reservations serialize through the session row.
- The internal DJ claim method and existing generation queue share the same worker
  lock/capacity check. A disconnected session cannot claim new work. A 75-second
  heartbeat expiry closes queued work when the expiry sweep is called.
- Stop releases queued reservations. Running work remains held until the internal
  server worker supplies its terminal cost receipt. Failed/cancelled work follows
  the existing wallet cost settlement rules. A receipt is not a browser operation.
- Completed tracks require a validated, non-silent, unclipped 60-second stereo PCM
  WAV, verified stored bytes and immutable receipt. An altered retry cannot replace
  a stored track. Suspended/frozen accounts cannot accept new completed music.
- Private reservations reuse the existing surcharge and settlement logic. Credit
  exhaustion or an increased quote ends new preparation; neither changes Private
  to Public. Retried settlement cannot capture credits twice.

These are internal service boundaries. **There is no browser session-start,
worker-claim or worker-completion endpoint yet.** This prevents the setup from
reserving credits without a functioning renderer and performance pipeline.

## Publication and deletion

A recording can link to a generated session only for the same owner and title,
after the session has ended with settled, played generated audio. Its identity
and session link cannot be changed on retry. One recording is allowed per session.

The anonymous listing and playback query both require a ready recording, ended
Public session, completed/played/settled source, unsuspended owner, matching billing
mode and no withdrawal. Private, unbound local, unfinished, withdrawn and deleted
recordings fail those checks. Session association is not proof of the captured master’s musical contents; player
binding and publication review still need end-to-end qualification. Public requests
never return owner identities,
ledger details, source keys or upload IDs. The R2 bucket itself stays private.

Owners can remove a generated set from the public page through Saved sets.
New playback grants then fail; already-issued signed links expire within five
minutes. Deleting the recording also removes its listing. Existing local takes
cannot be converted to Public by editing an upload request.

Account-deletion fulfilment must suspend the account, reconcile worker shutdown,
call `DJRecordings.purgeOwner(owner)` to remove recordings, then
`DJSessions.purgeOwner(owner)` for each billing mode to remove generated track
objects and session rows, before completing the existing account deletion.
Foreign keys prevent silent orphaning. This remains a manual fulfilment workflow.

## Verification

- PASS: isolated PostgreSQL session/recording/queue checks, including immutable
  quotes/receipts, concurrent Start, Stop/reservation race, credit exhaustion,
  private premium capture, price increase, cross-queue worker capacity, account
  freeze, deletion ordering, public/private exclusion and withdrawal.
- PASS: Chromium and WebKit setup choices, party title, direction controls,
  automatic-recording disclosure, disabled Start, real empty public list and
  unknown-set denial. Screenshots at desktop, 390 and 320 pixels; scoped WCAG
  2A/AA checks pass. No generation or credit mutations during this browser test.
- PASS: both browsers retain the real private R2 save/download/playback/deletion,
  multipart retry and lost-response recovery behavior after the schema changes.
- PASS: migration 0023 on the verified Neon target after a private PostgreSQL 18
  backup and archive-catalogue check. Repeated migration is empty; no sessions were
  created in Neon by these tests. The money/session tests use disposable loopback
  databases and synthetic ledger lots, not customer balances.
- Final build, unit totals and source hashes: [verification receipt](evidence/ai-dj-session-policy-20261024/verification.json).

The browser fixture initially needed an explicit select label and a real browser
context for axe. A stale development-server module caused an API method mismatch;
restarting the local server resolved it. WebKit checks wait for navigation, fonts
and paint before measuring contrast. These issues were corrected and rerun.

## Still unfinished

The actual original-music worker and its approved runtime/global spending budget; durable provider
shutdown/cost evidence and lease watchdog; automatic refill/polling/playback wiring;
live mood changes; progressive recording/upload and crash recovery; track-object
retention/scheduled cleanup; populated public-gallery browser and generated-public
R2 end-to-end proof; reporting/moderation and public release configuration; musical
listening and venue/endurance qualification. The preview retains the earlier
60-minute/96-MB recording limit. No unlimited-session or professional-quality
claim is made by this increment.

Reproduce: `npm --prefix apps/site run test:ai-dj-sessions` (loopback PostgreSQL),
`npm --prefix apps/site run test:ai-dj-session-browser` (localhost), and the existing
opt-in `test:ai-dj-storage-browser -- --apply` private-provider test.
