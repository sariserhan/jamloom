# Automatic AI DJ recordings and saved sets — 2026-10-24

**Overall PARTIAL.** Automatic local recording and authenticated private saving
are implemented in the development preview. This is storage and playback work,
not continuous generation or a musical-quality qualification.

## Owner's current product rule

Every generated session is recorded automatically. There is no separate recording
opt-in. **Public is the default:** the full finished set and party name appear on
the public page. **Private costs more credits** and must never be published.
Show both choices and their actual quote before Start, and bind that selection to
the session and every generation reservation. Reuse the wallet's existing private
premium (`privacyCredits`: 25%, rounded up). Never turn a private set public to
handle insufficient credits, a retry or a disconnect.

Public publication and credit-backed continuous generation remain unfinished.
The local-file engineering preview is private and free; imported tracks are not
silently published. No paid generation, credit charge, publication or deployment
was performed in this increment.

## Implemented

- Starting playback waits until the recorder is ready. No recording/save checkbox
  or separate Record button. Pause/Resume keeps one encoded take. Stop and the
  natural end finish it; a recording failure stops the test set rather than
  allowing unrecorded playback. The existing Studio/Academy host retains its
  explicit recording controls and consent behavior.
- Party names are captured with the take and used for audio/details downloads.
  Starting another local test protects an existing take until it is deleted.
- Signed-in completed takes save automatically. The browser keeps one bounded
  pending take in IndexedDB until R2 completion is verified. Reload/retry is bound
  to the original account. Deletion also checks the expected account before
  clearing a pending recovery copy. An interrupted request does not mean the file is saved.
- Immutable recording identities and provider-issued multipart IDs live in Neon. Input bounds, owner
  authentication, mutation origin, immutable retry identity and transaction-locked
  quotas protect the API. Clients never choose a storage key or upload ID.
- Parts go directly to R2 with short-lived grants. Completion checks provider-listed
  parts, exact bytes, container signature and streamed SHA-256. An already-completed
  R2 object can recover after a lost response or SQL failure, without reuploading.
- Saved sets support authenticated playback, named downloads and deletion. Failed
  deletions are retryable. Expired incomplete uploads and pending deletions use the
  existing maintenance path when the dedicated bucket is configured.
- Account deletion cannot cascade past stored audio: the foreign key restricts
  user deletion. Fulfilment must suspend the account, call
  `new DJRecordings(pool, djSessionStore()).purgeOwner(owner)`, then remove the user.
  The existing account-deletion support ticket names AI DJ storage. This is not
  a claim that the existing manual deletion workflow became fully automated.
- The preview page and API remain development-only. R2 remains private; CORS now
  additionally permits signed browser uploads from `http://localhost:3000`.

## Limits still requiring implementation

This preview uses the existing **60-minute / 96-MB** recorder and uploads a finished
take. Its recovery outbox holds one take; it is not a progressive, unlimited
recording pipeline. An incomplete capture interrupted before finalization is not
recoverable. Keep the page open until saving finishes. No public customer promise
of uninterrupted venue playback or unlimited recording is made.

The preview permits ten stored/pending takes per account, twenty new requests per
day and a 10-GiB global reservation ceiling. Expired incomplete uploads are removed
after 24 hours; completed audio has no automatic expiry. Deleted-record tombstones
retain identity for retry safety until account-deletion fulfilment; titles are
cleared. Production capacity, retention and pricing need review alongside the
continuous-generation queue.

Still required: fresh per-session generation ahead of playback; wallet-backed
reservations and orderly credit exhaustion; progressive capture/upload with crash
recovery; verified generated-source publication; public listing/playback and
private exclusion; held-out musical and venue qualification. Technical storage
checks do not close those gates.

## Verification

- PASS: eight isolated PostgreSQL service/boundary checks, including concurrency,
  ownership, lost completion response, expiry and deletion recovery.
- PASS: real Chromium and WebKit recording → private R2 → named download/playback
  → deletion. A separate 6,652,627-byte AAC take exercises two parts, failed-upload
  recovery and a lost completion response followed by reload/retry without another
  upload. Retrieved bytes are identical. Synthetic accounts and their objects are
  removed after testing. No microphone access; test speaker output is muted.
- PASS: Neon migration 0022 after a private PostgreSQL 18 backup and archive-catalogue
  verification; repeated application is empty. Existing migration hashes unchanged.
- PASS: 118 site tests, 163 shared web tests, existing deck/performance/Autopilot
  and automatic-recorder workflows in Chromium and WebKit, production build
  (including TypeScript), and bundle audit. The production page/API return 404
  even with the launch gate disabled in a separate local process.
- [Verification receipt and source hashes](evidence/ai-dj-saved-sets-20261024/verification.json),
  [real provider checks](evidence/ai-dj-saved-sets-20261024/provider-browser.json),
  [automatic recorder checks](evidence/ai-dj-saved-sets-20261024/recording-browser.json).

[Migration evidence](evidence/ai-dj-saved-sets-20261024/migration.json).
The ignored backup is `build-neon/dj-recordings-20261024/before-0022.dump` (0600);
no database dump or credentials are committed.

Reproduce local service checks: `npm --prefix apps/site run test:ai-dj-storage`
(loopback PostgreSQL with permission to create a disposable database). The real
provider browser test is deliberately opt-in:
`npm --prefix apps/site run test:ai-dj-storage-browser -- --apply`.
It requires the existing localhost app, the explicitly checked Neon target,
local-only email outbox and the retained synthetic AAC fixture.

CORS format follows the [Cloudflare R2 API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/cors/methods/update/).
