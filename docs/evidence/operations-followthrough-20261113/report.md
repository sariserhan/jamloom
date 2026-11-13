# Operations follow-through — 2026-11-13

**PASS.** Owner: “do all those you can commit and push at the end.” The $3 reviewer permit was not created: it spends without customer payment, outside the owner's rule, and needs an explicit yes.

- **Song-jobs failure alert:** migration 0037 adds `operation_heartbeats`; `/api/song-jobs` records each fully successful run and both operations monitors send `song-jobs-failing` after 10 minutes without one. Production: heartbeat 39 s old after deploy; headless monitor re-run reports no alerts. One false `song-jobs-failing` email was sent at 15:50 UTC because the headless monitor ran before the Vercel deploy finished. [Migration and backup](migration.json).
- **Integration tests:** they refused to run because `.env.local` points at production. `npm run test:integration` now always uses a local database, auth origin and email outbox: 32/32 pass.
- **Headless services:** `scripts/package_capacity_watchdog.mjs` now builds the guardian, operations and finance bundles from one commit. Installed revision `e63138679813798df703a604baa055015d17282a` for all three; remote hashes match the [manifest](headless-manifest.json); guardian active and enabled at boot; previous revisions retained for rollback. The finance reader now reports Apple's error code.
- **Docs:** `docs/progress.md` keeps entries from November 8; the full log is archived verbatim as `docs/PROGRESS_ARCHIVE.md`.
- **Vercel CLI** upgraded to 65.15.0.
- Tests: 249 site, 90 wallet/capacity database, 32 integration; typecheck PASS.

**Disclosure — earlier backups lost:** the November 9 `build-*` cleanup also deleted private pre-migration database dumps stored there (for example `build-operating-automation-20261109/before-0036.dump`). The rescue kept audio and app archives only. The live database was unaffected and a fresh verified backup now exists under the git-ignored `backups/`.
