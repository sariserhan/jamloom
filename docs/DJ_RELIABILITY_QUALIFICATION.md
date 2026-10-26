# Fresh customer-session reliability qualification

**CONSUMED; final harness assertion FAIL, customer-session evidence PARTIAL.** The owner replied “Approve the capped $6 reliability qualification.” This is a new campaign, not a replacement under the consumed integrated permit. Exact limits: $6 total, one GPU, forty minutes from rental creation, twenty fresh sixty-second originals plus at most four ten-second vocal candidates, stop on first failure, independent watchdog and automatic deletion, no replacements, no public activation. No paid acquisition or new infrastructure.

This reuses the existing production-receipt generator and two-listener customer harness. It qualifies generation ahead of playback, mood commands, recovery of a lost completed response, Public Stop, Private exhausted credits, complete R2 recordings and privacy/cleanup. It does not substitute the retained stem study, or claim that matching prompts guarantees professional musical quality.

## Startup changes

- `cloud_music_setup.sh` records the current stage without logging credentials.
- `vast_trial.dj_bootstrap_command` saves the remote process ID while still detaching SSH pipes.
- `dj_renderer_readiness.wait_ready` takes a bounded remote status/log snapshot every readiness poll. It distinguishes SSH error/timeout, remote exit, disappeared process, malformed status, health rejection and deadline. It stops on first failure; no rental or generation retry is hidden here.
- Log snapshots are capped at 64 KiB, token-redacted and private (0600). They are collected before failure, so cleanup never waits for a new diagnostic connection. The existing independent watchdog retains its absolute deadline. A tunnel cleanup exception cannot bypass the provider deletion in the prepared runner.
- The failed attempt's final setup log is irrecoverable from the deleted rental. The underlying package/host failure remains unconfirmed; the new diagnostics do not retroactively prove its cause.

## Prepared execution

The separate permit is [authorization.json](evidence/dj-reliability-20261026/authorization.json). Source hashes and private runner hashes are bound before approval. Private preparation is `build-dj-reliability-20261026`; it now contains the consumed rental state and retained private diagnostics. Never overwrite the consumed integrated receipt or files.

After exact approval, use the existing `vast_trial.py` controller with `--dj-qualification --dj-sessions --dj-beta --dj-hosted --dj-integrated --dj-reliability`. Its new campaign validation requires this permit, current hashes and the exact owner statement. The watchdog inherits the same flags. The prepared pipeline uses the checked-in readiness helper and the existing `dj-warm-qualification.mjs --apply --beta --hosted --integrated --reliability` harness on an isolated local server/database.

Preserve all outputs before deleting the rental, independently check the provider inventory, reconcile provisional charges, mark the permit consumed after any attempt, and leave listening acceptance separate from runtime checks. Browser tests remain muted. No public settings change.

## Local evidence

Five readiness regressions pass with controlled process/health failures; thirty controller tests pass including rejection of prepared, consumed and previous-campaign permission. Shell syntax and prepared-runner compilation pass. These tests incur no GPU cost and are not a real provider startup pass.

## Actual result

The rental produced twenty distinct sixty-second originals and both complete R2 recordings (Public Stop: 416.188 seconds; Private exhausted credits: 400.836 seconds). Lost-response dispatcher crash/recovery, third-listener capacity refusal, per-customer end/credit assertions, owner playback, private/cross-account denial and temporary-data cleanup completed. [Scoped results](evidence/dj-reliability-20261026/result.json).

The final harness assertion **failed** after the old started-minus-ended browser meter reached −1. Its exact extra event was not retained, so this is not claimed as a proven production audio defect or a complete technical pass. The sampler aborted immediately. The test meter now tracks successfully started node identities and records duplicate/unstarted end events separately; a focused regression preserves concurrent live sources and rejects failed starts. A small real-browser repeated-stop probe did not reproduce the original event sequence. A separate retained-audio rehearsal passes with twenty retained tracks, both saved sets, credit/Stop end states, privacy and cleanup: maximum three active sources, no duplicate or unstarted endings. It validates the corrected instrument without new GPU usage; the original exact event sequence remains unconfirmed.

A concurrent cleanup DELETE also returned HTTP 404 after another cleanup path removed the rental. Cleanup now accepts that response only after an independent inventory confirms that exact instance is absent; all other failures and label checks remain intact. The GPU was deleted and independent inventory shows zero rentals. Rental duration: 1,333.601 seconds; provisionally reconciled provider usage **$0.104**, not a final invoice. The $6/one-GPU/forty-minute permit is consumed; no replacement or public activation occurred. [Deletion](evidence/dj-reliability-20261026/provider-cleanup.json), [cost](evidence/dj-reliability-20261026/provider-cost.json), [privacy](evidence/dj-reliability-20261026/privacy.json).

The original approved source hashes remain unchanged in the consumed authorization. Subsequent instrumentation and cleanup fixes are separate local changes. Listen to the retained complete sets at http://localhost:8766/reliability-sessions/review/; human acceptance remains NOT RUN.
