# Website SDK and Academy CI repair — 2026-10-31

**PASS local repairs and scoped validation; NOT RUN remote rerun.** Both reported failures reproduce locally. Production build/payment behavior remains unchanged; fixes update stale integration fixtures and strengthen assertions. No push, deployment, live payment or paid compute.

## Website SDK bootstrap

`python3 tests/integration/verify_web_sdk.py` reproduced the empty `AssertionError` at the first bootstrap assertion. `web_build.sh` now enters through `studio_build_lock.py`, but the fixture replaced every `python3` invocation with a successful no-op and did not copy the wrapper. Consequently no SDK setup ran, the process returned 0 rather than the fixture's expected 42, and stderr was empty.

The fixture now copies and executes the real lock wrapper, stubbing only Python version probes so the integration check remains independent of CI's older baseline Python. It clears an inherited `JAMLOOM_STUDIO_BUILD_LOCKED`, reports the full subprocess result on failure, and bounds subprocess execution. A fourth case holds a competing lock and verifies rejection before SDK setup. Fresh setup, warm reuse, partial-cache preservation and conflicting user-file preservation remain covered. Both system `sh` and `/bin/dash` pass all four cases. The dash run also starts with an inherited lock flag to check that the fixture clears it. The production build lock is not bypassed or changed.

## Academy wallet and dispatcher

The [latest failed Academy job](https://github.com/sariserhan/jamloom/actions/runs/41224226929/job/124604897934), at `bd11aebe`, fails in the generation queue and watchdog tests. [Retained excerpts](github-academy-failures.log) show expected available credits 49 versus actual 50. Both reproduce against a new isolated local PostgreSQL 16 database.

These expectations predate the approved full technical-failure refund policy. The tests now require all 50 credits back after failure/cancellation while independently checking that the nonzero provider cost remains stored. They also check zero capture entries for failed work, one charge for successful work, immutable settlement retries, recovery after a crash, and preservation of the existing cost/shutdown/dispute guards.

Continuing through the complete Academy command sequence exposed the later standalone dispatcher test, which the earlier failures had prevented CI from reaching. It expected a legacy allowance allocation instead of fixed-credit capture, and its live-mode mock budget exceeded the catalog cap. The fixture now uses a synthetic $0.012 cap (within the $0.014 DJ minute budget), asserts one two-credit capture, no legacy allowance allocations, and a 23-credit remaining balance from 25. The real child process is killed after the renderer response and restarted: two requests must reuse one rendered result and charge only once. Test and live ledger modes both pass with a loopback mock renderer. This fixture budget is not production cost evidence; no real worker budget or cost qualification flag changed.

## Validation

[Machine-readable results and retained local log hashes](validation.json):

| Check | Result |
|---|---|
| SDK integration, system sh and dash | PASS: four cases per shell |
| Studio packaging/lock unit checks | PASS: two tests |
| `npm run studio:prepare` | PASS: actual studio compile/preparation and bundle audit |
| `node --test ../web/tests/*.test.js` | PASS: 201 tests |
| `npm run test:academy` | PASS: 15 tests |
| `npm run test:admin` | PASS: 11 tests |
| `npm run test:wallet` | PASS: 57 tests |
| `npm run test:ai-dj-sessions` | PASS: 35 tests |
| `node --import tsx --test tests/pro.test.ts` | PASS: six tests |
| `npm run typecheck` | PASS |
| Temporary database cleanup | PASS: no test databases remain; server stopped |
| New GitHub run / Linux container execution | NOT RUN |

The Academy checks use Node 22 and isolated loopback PostgreSQL 16.14 on macOS, with existing installed lockfile dependencies; CI uses Linux/PostgreSQL 16.15 and fresh installs. Docker's local daemon was unavailable. All Academy build/test commands were exercised locally (325 tests total), but this does not assert a fresh remote CI pass. The unrelated existing packaging test emits a TemporaryDirectory cleanup ResourceWarning on its intentional failure path; its assertions pass.

Reproduce the SDK failure check from the repository root. Run the Academy npm/node commands above from `apps/site` with `JAMLOOM_TEST_DATABASE_URL` pointing to an isolated loopback PostgreSQL database server capable of creating/dropping test databases. Never substitute production credentials. Raw local test logs are retained under ignored `build-ci-repair-20261031/`.
