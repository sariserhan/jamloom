# Specification closure follow-through — 2026-10-27

**PASS scoped fixes and checks; PARTIAL complete product.** The owner requested
all remaining work, connected the iPhone and confirmed independent listeners
cannot currently be arranged. Publication remains held. Zero new GPU rental,
purchases, provider mutations, app uploads or deployments in this pass.

## Completed

- iPhone 0.10.2 **build 27** archives, passes resource/privacy/license audit and
  signature verification, exports an App Store IPA locally, installs and launches.
  The exact final Release is restored after physical tests.
- Three actual iPhone checks pass: stale Community response rejection, language
  filter/Favorites and Singing demo/tab audio cleanup. These are scoped UI and
  lifecycle checks, not human listening or singing accuracy.
- Three local StoreKit checks pass on the iOS 27 simulator; the separate real
  Apple test is skipped. Coverage includes account binding, failed delivery
  recovery, course restore, credit/course separation and free lesson access.
- Actual native URLSession talks to Better Auth and disposable local Postgres:
  sign-in, wallet, Music DNA profile, rating save/read/delete, training permission
  withdrawal and logout pass. Database/messages removed afterward. This does not
  claim the owner's physical signed-in rating acceptance or an Apple receipt.
- Shared studio packaging now rejects competing writers. Native packaging stages
  complete inputs and preserves unchanged files instead of deleting Xcode's
  resource directory. Two regressions pass through CTest. Build sequentially and
  do not edit source while archiving; this is not a general concurrent-revision
  build guarantee.
- Existing blind packet rechecked: five audio hashes match and four rating rows/
  three comparison rows remain blank. No invitations or invented judgments.
  Historical packet integrity does not qualify current models.
- Apple draft inventory refreshed read-only: three credit consumables remain
  MISSING_METADATA without review screenshots; Singing is READY_TO_SUBMIT with
  COMPLETE screenshot. Existing exact USD39 course price is unchanged.
- Stale spec entries now point to the current map instead of reporting implemented
  cloud/model/payment/plan-import work absent. Master files are unchanged.

## Retained failures

Initial concurrent archive/simulator builds raced over shared generated files.
One failed deleting the resource tree; the first archive later failed its bundle
audit because license notices were duplicated by overlapping writers. It is not
the validated candidate. After the lock/staging fix, the new
`Jamloom-0.10.2-27-final.xcarchive` and post-test audit pass. Two old CMake caches
still referenced the historical `djayvo` checkout; a fresh isolated configuration
passed. Original logs/hashes are retained in the validation manifest.

## Remaining gates and next action

| Gate | Status / owner | Required next evidence |
| --- | --- | --- |
| Independent M1 | NOT RUN / owner + reviewers | At least 10 initial listeners, at least three independent judgments per assigned comparison, verified diverse cohort and preregistered rubric. Owner cannot arrange listeners yet; [materials ready](listening-review.md) |
| Original music/DJ quality | PARTIAL / engineering + listeners | Broader voice/style coverage, cohesive fresh material, natural short singing and sustained capacity/cost. Rejected vocal stays excluded; permits consumed. Prepare a targeted experiment before requesting new capped compute |
| Singing accuracy/latency | PARTIAL / engineering + physical setup | Independent labelled holdout and calibrated microphone-to-output/display measurement across rooms/devices. Current 40-recording/29-singer corpus was previously inspected; software timestamps are not physical latency |
| Apple credit metadata | PARTIAL / release preparation | Genuine credit-purchase review screenshots and reviewer access, then product readiness verification. Do not substitute unrelated course screenshots or activate public purchases |
| Real Apple payment chain | NOT RUN / sandbox device + server | Provider-signed purchase, delivery, balance/access, replay, restore and refund/notification evidence. Local StoreKit fixtures do not qualify |
| Hardware/venue matrix | PARTIAL / equipment | Separate cue/MIDI, physical iPad, deferred route hot-plug and calibrated latency on supported setups. No foldable-device claim |
| Six popular songs | NOT RUN / supplier | Tency permissions and authorized backing/lyrics/timing assets. Owner last reports no reply; no new contact or paid license authorized |
| Publication | HELD / owner | Matching deployment/app release, approved provider settings and rollback review after explicit instruction. Postlaunch indexing, field performance and customer outcomes cannot be measured locally |

Apple distinguishes an app download transaction from individual purchases. Its
sandbox guide says development-signed apps can test without uploading an app,
and instructs checking the purchase transaction's environment. The prior Xcode
environment observation remains a failed preflight, not proof an upload is
required or the receipt chain passed. No receipt validation was weakened.
[Apple sandbox guide](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox),
[AppTransaction](https://developer.apple.com/documentation/storekit/apptransaction).

## Evidence and reproduction

[Validation](evidence/spec-closure-20261027/validation.json),
[native HTTP](evidence/spec-closure-20261027/native-account-http.json),
[bundle](evidence/spec-closure-20261027/phone-bundle.json),
[signed export](evidence/spec-closure-20261027/phone-release.json),
[Apple inventory](evidence/spec-closure-20261027/apple-products.json),
[review packet](evidence/spec-closure-20261027/listening-packet.json).

```sh
python3 -m unittest discover -s tests -p test_studio_packaging.py
cmake -S . -B build-spec-closure -DPython3_EXECUTABLE=/usr/bin/python3
ctest --test-dir build-spec-closure -R '^studio_packaging$' --output-on-failure
python3 scripts/verify_ios_bundle.py build-ios-store/Jamloom-0.10.2-27-final.xcarchive/Products/Applications/Jamloom.app
```

Native HTTP reproduction, after sequential `xcodebuild build-for-testing`, from
`apps/site` with Node 22 and the current isolated production build:

```sh
JAMLOOM_TEST_DATABASE_URL=postgresql://127.0.0.1:5432/postgres \
JAMLOOM_QUALIFICATION_BUILD=1 node --import tsx tests/ios-account-http.mjs \
  ../../build-ios-simulator/Build/Products/Jamloom_iphonesimulator27.1-arm64.xctestrun \
  97D4D9E6-9DFD-4798-8C77-A385DB05F900 /tmp/NEW-jamloom-native-http-evidence
```

Simulator UUID/SDK name are machine-specific; use the current test product and a
new evidence directory. Website source is unchanged in this pass; prior
160-unit/two-browser evidence is retained, not claimed rerun.
