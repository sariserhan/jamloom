**Current follow-through:** [Exact remaining gates](UNFINISHED_CURRENT.md) now includes broader input checks, an anonymous owner comparison and the prepared corrected worker source. The dated evidence below remains historical.

# Approved hosted diagnostic — 2026-10-30

**FAIL qualification; PASS shutdown and test-credit settlement.** The owner
approved one request, one GPU worker, up to $3, with a 1,200-second runtime and
130-second shutdown allowance, and no retries. Exactly one provider request ran.
The permit is consumed; no additional request or image publication occurred.

The current immutable image started after 891 seconds of prewarming and provider
worker replacements. Its manifest contains 27,194,880,328 compressed bytes (23
layers); system logs show download/extraction, then successful runtime fitness
checks and handler startup. These observations do not establish the cause of
every replacement. One worker at a time was observed. Both RTX 4090 and the
provider's 48 GB Blackwell MIG class appeared during startup; the latter's
published $1.75/hour serverless rate remains within the conservative budget.
[Provider pricing](https://www.runpod.io/pricing).

The one procedural-signal reggae request reached **FAILED** after 42,476 ms of
execution, with sanitized location `improvise-singing@vocal_identity.py:138`.
That source line unconditionally imported the local research separator. The
hosted image intentionally does not package that module or its restricted
checkpoint; it already packages an isolated Spleeter runtime for the subsequent
arrangement stage. Thus identity conversion failed before the intended hosted
separator inference could be tested. No completed audio was delivered.

## Local correction

`finish_identity` now honors `JAMLOOM_SEPARATOR_PYTHON` and invokes the already
packaged Spleeter entry point with bounded subprocess execution, before voice
conversion. The local research route remains available when no hosted separator
is configured. No restricted checkpoint was added to the hosted image, and no
voice conversion or musical-quality requirement was disabled.

**PASS: 29 focused tests** (2 new routing, 8 identity, 17 worker and 2 hosted
Spleeter checks). [Routing](evidence/finish-local-20261030/identity-routing-tests.log),
[identity](evidence/finish-local-20261030/identity-regression-tests.log),
[worker](evidence/finish-local-20261030/worker-regression-tests.log),
[Spleeter](evidence/finish-local-20261030/spleeter-regression-tests.log).

The regression tests remove the research module from Python's importable modules:
the hosted path still invokes its configured separator. They also check that a
separator failure preserves the base audio and incomplete marker, never starts
conversion, and never publishes a completed song; a successful mocked separator
must complete before conversion starts. This is **PASS local routing**, not actual
Linux inference or end-to-end conversion. The existing 30–45 second Spleeter
input bound remains; long Music DNA qualification is still open.

A rebuilt immutable image and a separately authorized bounded verification run
are still required. This diagnostic did not reach Spleeter, so it cannot close
that gate or broader Improvise/Music DNA/AI DJ qualification.

## Cleanup and billing

Independent GET/SELECT checks at 18:10:48 UTC confirm limits 0/0, zero active
workers, zero queued/running jobs, and no temporary trial databases. Two staged
objects were removed, all 50 test credits are available, and zero credits remain
reserved. The local PostgreSQL server started for this attempt was stopped after
verification. The provider reports an empty daily billing result at this check;
**that is not a final $0 charge**. The application's conservative request cost
estimate is $0.065, which is not a provider invoice or the full prewarm cost.

[Authorization and consumed permit](evidence/finish-local-20261030/hosted-next-step.json),
[trial receipt](evidence/improvise-finish/cloud/2026-10-30T17-54-27.986Z/trial-result.json),
[independent cleanup](evidence/finish-local-20261030/approved-diagnostic-postcheck.json),
[startup/failure log observation](evidence/finish-local-20261030/worker-failure-observation.json),
[image size](evidence/finish-local-20261030/image-size-observation.json).
