# Interrupted-work recovery audit — 2026-10-31

**PASS local implementation review and verification.** This checkpoint finishes the previously uncommitted October 30 work and preserves its original evidence. It does not reopen Improvise qualification, the two-hour DJ test, deferred v1 research or consumed hosted permits. [Current payment/release gates](../../CREDIT_SYSTEM.md) remain unchanged.

## Changes reviewed and completed

- **Native iPhone:** retain Music DNA's bottom safe-area editing bar instead of the conditional keyboard toolbar. Debug UI automation uses zero-volume WebKit playback on both simulator and physical iPhone; normal Release playback is unchanged. Retain the opt-in, memory-only microphone test and bounded polling for loopback playback. No new physical-microphone permission or recording is requested in this run.
- **Listening tools:** preserve owner drafts by immutable freeze/block identity, locked owner identity, anonymous candidate playback and complete/attested-only CSV exports. The aggregate study packager now builds in a temporary sibling directory and installs only the complete package; a failed copy leaves no incomplete destination blocking a retry. Existing reviews, source freezes and actual owner judgments remain intact. No new study is requested from the owner.
- **Worker installation:** accept only the exact checksum-pinned publisher metadata entry, never install it, and continue rejecting unknown, duplicate and non-regular archive members. Fixed a genuine interrupted-install failure: pre-existing partial files formerly caused exclusive writes to fail on every retry. Model downloads now stop at the pinned byte bound, all extracted files are verified in staging, and verified files replace partial model files. The next run repairs an interrupted replacement; a fully verified installation needs no download.
- **Diagnostics:** retain safe Python basename/line diagnostics for composing/writing failures while rejecting paths, URLs and transcript text.
- **Documentation and evidence:** retain original PASS/PARTIAL/FAIL/NOT RUN receipts, including failed image attempts, disconnected-device observations, old pricing/preflight snapshots and historical owner-study results. Added current-scope pointers so old pending work and old `AUTHORIZED` plans cannot be mistaken for current permission or a new listening requirement. Commit the generated Next.js project instructions as well.

## Current validation

| Check | Status | Evidence |
|---|---|---|
| Site suite, including safe provider diagnostics | PASS | 179 tests, `site-tests.log` |
| Worker/archive tests | PASS | 18 tests, `worker-tests.log`; includes interrupted installation repair, bounded download and verified-cache reuse |
| Review/study packaging | PASS | 29 checks, `review-packaging.log`; includes failed-copy cleanup, retry and existing-review preservation |
| Actual macOS clone path | PASS | Five synthetic audio hashes retained; organizer keys excluded, `clone-packaging.log` |
| Owner-study browser checks | PASS | Installed Chrome and Playwright WebKit, `study-browser.log` and `study-browser/`; draft recovery, block isolation, no incomplete exports, CSV validation, playback, mobile/desktop layout |
| Original single-block review | PASS | Chrome and WebKit, `review-browser.log` and `review-browser/`; blank judgments and original export behavior preserved |
| TypeScript | PASS | `typecheck.log` |
| Native/loopback/iPhone UI | PASS | `ios.json`: 8 passed, 1 physical-microphone opt-in skip, 0 failures and 0 runtime warnings; includes Music DNA persistence/editing bar and produced-singing tab cleanup |
| Historical evidence integrity | PASS | JSON parsed; no credential/private-key/signed-query patterns found in new evidence; immutable master untouched |

Browser inputs and packaging sources were temporary synthetic fixtures, removed by their test runners. These automated results are not musical acceptance, training labels or human measurements. Screenshots and summary JSON are retained; audio, builds and result bundles stay in ignored local artifact directories. The original evidence has not been rewritten to turn failed/unrun checks into passes.

## Reproduce

From the repository root with Python 3 and Node 22:

```sh
python3 tests/integration/verify_listening_review.py
python3 -m unittest discover -s tests -p test_runpod_worker.py
npm --prefix apps/site test
JAMLOOM_TEST_CHROME=1 node tests/listening_study_browser.mjs
JAMLOOM_TEST_CHROME=1 node tests/listening_review_browser.mjs
node apps/site/node_modules/typescript/bin/tsc --noEmit --project apps/site/tsconfig.json
```

Browser tests require installed Chrome (when `JAMLOOM_TEST_CHROME=1`) and the project's Playwright WebKit runtime. They run their own loopback servers and delete temporary synthetic responses. The study runner now has bounded UI timeouts. Browser runtime setup downloaded WebKit only; the existing Chrome installation avoided another Chromium copy.

No website deployment, worker image publication, paid GPU request, app submission or live payment occurred. The earlier scoped physical receipts remain historical evidence, not newly repeated tests.
