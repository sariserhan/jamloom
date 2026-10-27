# Completion checkpoint — 2026-10-27

**PASS scoped candidate preparation and current iPhone acceptance. PARTIAL full specification.** The owner requested finishing remaining work, with the existing no-publication/no-new-spend boundaries. This pass installs the accepted karaoke replacements, prepares the current native archive and verifies account/billing/schema readiness. It does not turn unverified teaching data or missing independent evidence into a PASS.

## Actual results

| Check | Result and scope |
|---|---|
| Website regression | PASS, 168 tests |
| Real local HTTP account/billing checks | PASS, disposable loopback database: sign-up/verification/session, user isolation, Music DNA revisions/bounds, private account views, course-specific purchase state, blocked checkout, signature/replay/live-mode rejection; no real email or provider transactions |
| Production schema observation | PASS read-only: 32 matching migrations, no pending/changed/unknown migration; billing remains test mode; Singing price remains USD39 |
| Native candidate | PASS signed/audited 0.10.4 build 34, six exact singer/karaoke/lyric files match the current manifest |
| Installation and launch | PASS; signed Release reinstalled and relaunched after the test attempt |
| Physical native tests | PASS, two StudioServer tests: bounded loopback asset access and microphone document restrictions |
| Physical UI automation | FAIL before test initialization: timed out enabling automation mode; Community/Singing UI taps were NOT RUN |
| Owner physical check | PASS: “Both play and stop correctly” for Sing karaoke on Long Way Home and Leave It All Outside, followed by Community |
| Local archive | PASS archive, bundle/hash audit and strict code-signature verification; no export, upload, App Store submission or publication |

Evidence is retained in [the validation manifest](evidence/completion-candidate-20261027/validation.json), [owner phone feedback](evidence/completion-candidate-20261027/owner-phone-feedback.json), [test summary](evidence/completion-candidate-20261027/phone-tests.json) and associated logs/receipts. The full `.xcresult` and `.xcarchive` remain under `renders/completion-candidate-20261027/`, outside Git. The archive contains the accepted files; it is not an Apple-processed build.

No production rows, user balances, provider settings, purchases, releases or generation recipes were changed. The database preflight uses a read-only transaction and rolls it back. The integration suite creates and drops its own local database and sends mail only to its temporary local outbox. No new SDK/model/dependency download or GPU rental was required. About 15 GiB of disk space remained after archiving; original audio and prior release evidence were retained.

## What prevents full completion

1. **Produced-song scoring is unfinished.** The two accepted full productions are playable open practice. Existing recorded-song grading code is available, but actual sung words, note identities and timing still need verified/corrected targets. Current automatic estimates contain errors. They must not award course completion or masquerade as ground-truth lyrics. The twelve existing graded songs retain their behavior; those do not substitute for the new produced-song targets.
2. **Current hosted quality/capacity is unqualified.** Selected prior trials and owner-accepted sets pass, but current Improvise/Music DNA worker parity, maximum-library/genre/language coverage and sustained AI DJ capacity are not closed by these local checks. The existing Runpod endpoint is disabled on the older restored image. Prior paid permits are consumed. Publication/provider changes and fresh paid trials require their explicit authorization; none occurred here.
3. **Formal independent and learned-model requirements remain open.** The master requires blinded independent reviews, appropriate category/quality evidence and prerequisites before production learned AI. Suitable reviewers and cleared expert demonstration/decision labels are unavailable or unqualified. The owner's reviews are retained; they cannot be fabricated into independent participants or a trained, benchmarked production policy.

**Held, not silently attempted:** website/phone publication, live sales and production-dependent payment/provider verification. **Excluded/deferred:** physical iPad/unavailable hardware. Optional popular-song additions still need permissions/assets under the no-purchase instruction; accepted originals are already playable.

The [active TODO section](../TODO.md#current-completion-targets--2026-10-27) now separates these current requirements from the historical log. Earlier unchecked snapshots remain historical evidence, not instructions to repeat completed work. The immutable master is unchanged. There is no percentage-complete or “everything finished” claim.

## Reproduction

From `apps/site`, using Node 22.23.1:

```sh
npm test
npm run release:preflight -- --database
JAMLOOM_QUALIFICATION_BUILD=1 JAMLOOM_TEST_DATABASE_URL=postgresql://serhansari@127.0.0.1:5432/postgres JAMLOOM_TEST_EVIDENCE=/tmp/jamloom-http-result.json node --import tsx tests/product-http.mjs
```

The native build uses the existing Xcode project/scheme and signing team. Build 34 changes only the build number; accepted audio is drawn from the existing shared package. `xcodegen` introduced only whitespace in the Apple sandbox scheme; structural XML equality was verified and the original formatting preserved. The archive was produced with `xcodebuild archive` into the retained path, then audited by `scripts/verify_ios_bundle.py` and `codesign --verify --deep --strict`. Do not rerun tests against production or infer hosted evidence from the local fixtures.
