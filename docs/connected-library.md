# Connected listening library — 2026-10-25

**PASS implementation, local tests and production migration. Website release verification pending.** The owner selected favorites sync, Community playlists and limited AI DJ beta preparation; first-user trials and mobile release checks are explicitly skipped.

## Customer behavior

Signed-in listeners save and remove the same favorite identities on the website and in the updated iPhone source. The website refreshes on navigation/focus and every 30 seconds while visible; the phone refreshes on collection loading, pull-to-refresh and foregrounding. Saves are acknowledged by the server; failed writes remain visible and do not pretend to succeed. No offline write queue is introduced. Signed-out favorites remain on the device. Earlier local favorites move to the account only through an explicit import; interrupted imports preserve the original list and retries are idempotent. Successful import clears its old local source.

Community songs, full public AI DJ sets, reviewed catalogue tracks and Aurowall tracks can enter the existing private playlists. Playlist playback uses the shared player/queue. No duplicate playlist system or new audio storage exists. Existing catalogue playlist entries remain readable and removable. Limits are 500 account favorites, 20 playlists and 100 tracks per playlist.

The service stores only account-owned references, resolves current metadata/availability on reads and rechecks authorization for playback. A private Music DNA/Improvise song can appear only in its owner's collection, without a public share link. Withdrawn/unavailable references show a removable placeholder. Aurowall playback retains the existing Pro requirement. Native streaming copies only destination-scoped account cookies into an ephemeral player and cancels pending loading on dismissal. No on-device audio is uploaded, and private audio is not republished.

## Database and validation

Migration `0029_listening_collections.sql` adds two reference tables; it does not rewrite existing playlists, songs or audio. Production target was verified, a private backup was restored into isolated local PostgreSQL, the migration and idempotent rerun passed there, and production application/idempotence passed with existing selected table counts unchanged. [Receipt](evidence/connected-library-20261025/migration.json). The backup remains outside Git under ignored `build-neon/connected-library-20261025/`.

- PASS: 137 website unit tests; isolated database session/library checks including concurrent collection limits, removals, legacy playlist entries, account isolation, suspended users and deletion cascades.
- PASS: optimized production build and 47-client-file secret/bundle audit.
- PASS: iOS simulator AccountTests/SetPlayerTests, 19 tests with 2 optional HTTP tests skipped and zero failures. Includes cross-client mocked transport, failed writes/imports, successful import cleanup, cookie transfer, muted WebM playback and dismissal. This is not physical-device or App Store release evidence.
- PASS: Chromium and WebKit at desktop/mobile sizes: cross-client save/removal, explicit guest import, account isolation, private-song metadata/audio denial, existing playlist queue playback and visible failed-save errors. Production-build beta HTTP admits only invited verified accounts and refuses unfunded Start with no session created. [Browser receipt](evidence/connected-library-20261025/browser.json).
- Production website deployment verification is recorded separately.

[AI DJ beta handoff](ai-dj-limited-beta.md) separates completed admission/operations preparation from funded hosting and musical gates. No new compute or live billing was enabled.

## Verification commands

From `apps/site`, with Node 22:

```sh
npm test
npm run build
npm run audit:bundle
JAMLOOM_TEST_DATABASE_URL=postgresql://127.0.0.1:5432/postgres node --import tsx --test tests/dj-sessions.test.ts tests/listening-library.test.ts
JAMLOOM_TEST_DATABASE_URL=postgresql://127.0.0.1:5432/postgres node --import tsx tests/listening-library-browser.mjs
```

The database/browser harnesses create and remove their own isolated local databases. Browser media is muted; synthetic audio proves playback mechanics, not generated musical quality. Mobile source changes are not installed or uploaded in this task.
