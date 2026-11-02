# Prepared active-capacity diagnostic source

These are byte-for-byte snapshots of the reviewed local harness, without credentials or results. Restore them to `build-active-capacity-20261101/` at the repository root to retain their relative imports. The hashes in `../hosted-plan.json` bind those execution paths. Run only dry runs while the plan is PREPARED. New paid execution requires the explicit owner approval described in that plan.

The private review-account files, provider/database credentials and deployment configuration are intentionally excluded. `prepare-deploy.mts --apply` refuses a plan without APPROVED status and creates one non-reusable, 40-minute lease. It does not start a GPU. Deploy the exact reviewed application source and that lease configuration, then verify the authenticated hosted expiry guard before activating capacity. Do not reuse an expired lease or consumed request claim.

Start `observe.mts` and `http.mts --apply`, wait for the private account preflight receipt, then start `control.mts --apply`. The controller launches its independent local watchdog before enabling one active L4. The hosted authenticated recovery cron separately disables expired capacity. Preparation and HTTP submission share the original absolute deadline. The HTTP process sends at most one quote and submit, never a retry.

After the controller stops, run `cleanup.mts`, restore the held website configuration, and run `billing.mts` read-only. Confirm the provider inventory, remote object absence and both credit wallets. Retain immutable cost/credit evidence. No test result alone enables sales or submits the app for review.
