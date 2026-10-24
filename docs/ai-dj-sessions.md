# AI DJ continuous sessions and saved performances — 2026-10-24

**Overall PARTIAL.** The owner clarified the product: generate original DJ-ready
music continuously until the user stops or cannot fund the next generation.
Different users and new sessions should receive fresh music and a distinct set.
A fixed library, automatic repeats, or a preselected session duration is not the
product. The current `/ai-dj` local-file player is a mixing/recording test only;
its finite session-length selector has been removed and the page says so.

The owner also requires the complete mixed experience to be saved as **one audio
file in R2** when the session ends. Recording is automatic: there is no separate
recording opt-in. **Public is the default generated-session choice** and publishes
the completed set on the public page. **Private costs more credits** and must never
be published. Show visibility and the actual credit quote before Start; record the
Start action and selected quote, without a separate recording permission checkbox.
This supersedes the earlier private-only final-product wording. This includes transitions, EQ, loops and any
manual performance heard through the master output, not a concatenation of
unmixed source songs. Session recording is not consent to train on the take.

## Product contract

- Reuse the existing wallet visibility pricing: private creation adds
  `privacyCredits(baseCredits)` (25%, rounded up). Quote and reserve each generated
  batch consistently with the session choice; no flat fee or invented estimate.
  Publication waits for complete, verified audio. A private session cannot become
  public because credits run out, a request retries, or the user disconnects.
- Start creates an authenticated session with fresh generation identity, seeds
  and musical variation. Use the accepted rolling-house draft as a development
  reference; do not recycle it as a shared default song.
- Prepare fresh music ahead of playback, keeping a small reserve. One active
  generation per user must respect the existing wallet reservation and worker
  limits. Reserve credits before dispatch; give each session/sequence an
  idempotent job identity so reconnecting cannot charge or generate twice.
- Energy/mood requests shape the next uncommitted generation and a musically
  appropriate transition. They must not repeatedly discard paid prepared music.
- User Stop prevents further dispatch, cancels pending work through the existing
  reconciliation process and finalizes the recording. Insufficient credits
  stops new generation and permits an orderly ending of already-funded audio.
  Do not silently replay a previous track to conceal a generation failure.
- Fresh seeds alone do not prove unique-sounding music. Check duplicate content,
  variation and held-out listening before promising distinct professional sets.
- Build the recording progressively while playback runs. Upload fixed-size
  encoded fragments, then complete one object at the end. A continuous encoder
  produces those fragments; independently encoded songs cannot simply be joined
  and called a recording of the actual DJ performance.
- Interrupted uploads need durable progress, retry/cancel handling and recovery.
  Do not mark a session saved until the finalized object is verified. Retention,
  account deletion and owner-only replay must be integrated before activation.

## Session pricing and sharing follow-up

[Current implementation and evidence](ai-dj-session-policy.md): Public-default setup,
wallet-backed session/batch reservations and public-listing exclusion rules are
implemented locally. The rolling renderer, automatic refill and progressive capture
remain disconnected; no live session or paid dispatch is enabled.

## Earlier local recording increment

**Superseded by [automatic recording and saved sets](ai-dj-saved-sets.md).**
The details below preserve the earlier increment and its evidence.

## Implemented local recording

The AI DJ page reuses `apps/web/set-recording.js`, its worklet and the existing
Opus/AAC path. Consent is explicit; no microphone, automatic upload or training
permission is requested. Pause finishes the take before suspending the audio
clock. Normal stop and library exhaustion finish it too. Hidden-page/audio
interruptions discard incomplete captures; completed takes remain until deleted
or the page is left. Downloads include the actual audio and its hash/clock receipt.

This **local test recorder** retains the Studio's 60-minute / 96 MB cap. Those
limits are not the continuous product's session length and are not a substitute
for progressive R2 recording. The shared recorder now supports host teardown,
new audio contexts, bounded finalization and protection against stale errors.
The existing Studio/Academy host uses its original default configuration.

## Party and venue names — 2026-10-24

The preview asks for a **Party or venue name** before Start set. Blank names do
not start playback; the name stays locked while the set is active. A recording
snapshots the session title so later edits cannot rename an earlier take.
The readable title is included in the recording receipt; audio and receipt
filenames use a bounded, safe stem such as `rooftop-friday-jamloom.webm` and
`rooftop-friday-jamloom-details.json`. AAC browsers use `.m4a`. International
letters are retained; path separators and control characters cannot become
filename syntax. Existing Studio/Academy downloads keep their original names.

The R2 adapter accepts the title for its signed download disposition, including
UTF-8 filenames. Internal object keys remain owner/session identities, so two
parties with the same name cannot overwrite each other. Persisting that title
with the authenticated session remains part of the unfinished session service.
The original live R2 receipt below predates named downloads; the new disposition
is checked locally through the actual SDK signer, without another provider write.

[Naming verification](evidence/ai-dj-sessions-20261024/naming-verification.json):
118 site tests, 161 web tests, final filename-boundary checks and Chromium/WebKit
required-name, named download, preserved prior filename, layout/accessibility and
legacy Studio checks PASS. The first WebKit run failed inside the test harness
when suspending every created audio context; the corrected test targets the
active recording context and passes in both engines.

The old “Practice bank” and “Your music · stays on this device” labels are now
**Load test tracks** and **Local playback test**. These controls load example or
user-selected local files for engineering checks; they do not generate music.

## R2 infrastructure and storage adapter

Created **`jamloom-ai-dj-sessions`** in the existing Cloudflare account, ENAM,
Standard storage, default jurisdiction. `r2.dev` is disabled and there are no
custom domains. The existing runtime key can access it; no credential permission
was expanded. Local ignored configuration now has `R2_AI_DJ_BUCKET`.
[Bucket/settings receipt](evidence/ai-dj-sessions-20261024/bucket.json).

CORS reuses the existing production policy: `https://jamloom.com` and
`https://www.jamloom.com`, GET/PUT/HEAD. This does not make objects public.
The default seven-day incomplete-multipart abort rule is retained; completed
session objects have no automatic deletion rule.

`lib/dj-session-store.ts` reuses the existing S3 client configuration. It provides
multipart initiation, five-minute signed part uploads, server-listed part
validation/completion, private signed playback/download, abort and removal.
Keys separate hashed owner IDs and random session IDs. All nonfinal parts are
exactly 5 MiB; the last is at most 5 MiB. The adapter permits up to 10,000 parts,
with one finalized object. It refuses the existing song bucket.

**This is a server storage adapter, not an authenticated session API.** Callers
must derive keys from the authenticated owner and persist the unique session and
upload identity. The adapter is not wired to the browser recorder, purchases,
worker dispatch or live user sessions. No new public upload endpoint exists.
Generation, durable session/credit orchestration and automatic R2 saving remain
unfinished; no live continuous-generation claim is made.

## Verification

- **PASS:** real R2 multipart provider test: two parts complete into one
  **6,652,627-byte, 220-second stereo AAC/M4A** synthetic test recording with
  identical SHA-256 after retrieval. Signed-length mismatch rejected, production
  CORS preflight accepted, byte-range playback/download and unsigned denial
  checked. The test object was deleted and absence verified. This synthetic
  fixture proves container/storage behavior, not musical quality.
  [Provider evidence](evidence/ai-dj-sessions-20261024/r2-provider.json).
- **PASS:** 117 site unit tests, 159 shared web tests and TypeScript. Actual
  Chromium/WebKit compressed capture, decoded audio and hash receipts, pause/stop
  finalization, permission withdrawal, interruption recovery, responsive layout,
  scoped accessibility and existing Studio/Academy recording regression pass.
  No microphone access; automated speaker output remained muted.
- **PASS:** complete AI DJ browser suite in Chromium and WebKit (library,
  performance, Autopilot and recording), production build and bundle audit
  (42 client files; server secrets absent).
  [Verification receipt](evidence/ai-dj-sessions-20261024/verification.json),
  [recording browser evidence](evidence/ai-dj-sessions-20261024/recording-report.json).
  The report retains an existing WebKit navigation-only aborted site-status
  diagnostic and expected guest Academy authorization diagnostics; AI DJ itself
  produced no application errors. No paid GPU, new music API, model training,
  website push or deployment occurred.
- **NOT RUN:** long-running progressive browser upload, crash/reconnect recovery,
  authenticated cross-user session API, real-credit exhaustion, continuous cloud
  generation and professional musical acceptance.

Reproduce provider test (explicitly writes/deletes only random test objects):
`JAMLOOM_R2_TEST_BUCKET=jamloom-ai-dj-sessions node --import tsx tests/dj-session-r2-live.ts --apply`
from `apps/site`, with the retained synthetic fixture available. The test stays
out of default CI. Reproduce local recording checks with
`node tests/ai-dj-recording-browser.mjs` while localhost:3000 is running.

References: [Cloudflare multipart uploads](https://developers.cloudflare.com/r2/objects/upload-objects/),
[private/public bucket behavior](https://developers.cloudflare.com/r2/buckets/public-buckets/),
[S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/).
