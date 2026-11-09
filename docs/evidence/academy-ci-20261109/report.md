# Academy CI correction — 2026-11-09

**PASS local regression; NOT RUN updated GitHub job.**

The [reported Academy job](https://github.com/sariserhan/jamloom/actions/runs/42575946703/job/129023572430) passed its web and Academy suites, then failed `tests/admin.test.ts:8` because it expected `generationCheckoutEnabled` to remain false. Public song generation was released on November 8; `lib/product.ts` correctly sets that release flag to true. The unchanged test failed locally with the same `true !== false` assertion.

Updated the admin expectation to true with an explanatory comment. Academy checkout remains asserted false. No application behavior, billing configuration, release gate or workflow was changed.

Validation uses existing lockfile-installed dependencies, Node 22.23.1 and a fresh loopback-only PostgreSQL 18.6 cluster on this Mac. GitHub uses Ubuntu and PostgreSQL 16, so local success is not a claim of a green hosted run. The temporary cluster was stopped and removed in `finally`.

From `apps/site`, with `JAMLOOM_TEST_DATABASE_URL` pointing at that disposable cluster:

| Command | Result |
| --- | --- |
| `npm run studio:prepare` | PASS |
| `node --test ../web/tests/*.test.js` | PASS, 201 tests |
| `npm run test:academy` | PASS, 15 tests |
| `npm run test:admin` | PASS, 11 tests |
| `npm run test:wallet` | PASS, 90 tests |
| `npm run test:ai-dj-sessions` | PASS, 35 tests |
| `node --import tsx --test tests/pro.test.ts` | PASS, 6 tests |
| `npm run typecheck` | PASS |

Local command logs and the disposable-database runner are retained under ignored `build-academy-ci-20261109/`. No production database access, deployment, paid generation or customer charge was needed. The fix must reach GitHub before a new workflow can validate it there; rerunning the old commit would retain the stale assertion.
