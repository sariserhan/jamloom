# Headless shutdown guardian

This stop-only user service runs independently of the website. It requires a supervised Linux host with Node 22 or 24 and a user systemd manager with lingering enabled. No listening port, GPU runtime or model files are needed. The bundle uses the repository's installed dependency versions and includes no credentials.

Build from the reviewed checkout:

```sh
node scripts/package_capacity_watchdog.mjs build-capacity-watchdog
node --check build-capacity-watchdog/watchdog.mjs
```

The same command also builds `operations.mjs` (operating monitor, `jamloom-operations.service`) and `finance.mjs` (Apple finance reader, `jamloom-finance.service`) from the same commit; install each into its own `~/.local/share/jamloom-<service>/<commit>/` revision and repoint that service's `current`.

Copy the bundle and manifest into an immutable revision directory beneath `~/.local/share/jamloom-capacity/`, then point `current` to it. Install `jamloom-capacity.service` into `~/.config/systemd/user/` and run `systemd-analyze --user verify` and `systemctl --user daemon-reload`. The service remains disabled and its `enabled` marker absent during preparation.

The private `~/.config/jamloom-capacity/capacity.env` must be mode 0600 and contain only `DATABASE_URL`, `RUNPOD_API_KEY`, `RUNPOD_ENDPOINT_ID`, `JAMLOOM_CLOUD_COST_PROFILE`, `JAMLOOM_WATCHDOG_TARGET` and the explicitly approved `JAMLOOM_CLOUD_CAPACITY_PERMIT`. Never commit it or copy the application's full environment. `JAMLOOM_WATCHDOG_TARGET` is the exact database `host[:port]/database`. First run the bundled script without `--apply`; this previews recorded cycles and cannot contact the GPU provider or write the database.

Only after the operating permit is approved and configured on both the server and application, create the `enabled` marker and enable/start the user service. Validate its heartbeat and the independent web recovery cron before admitting any work. A successful diagnostic permit does not authorize an ongoing operating allowance. Do not run this service alongside an unrelated qualification on the same endpoint; its job is to stop work outside its configured permit.

For shutdown, disable new generation first, stop the service, and verify the provider has zero workers/jobs. Keep the application recovery cron and credentials until cleanup is confirmed. Remove the marker and disable the unit after cleanup. Monitor `journalctl --user -u jamloom-capacity.service` for errors; the service itself sends no email or chat messages. Retain previous bundles for rollback, but never restore an expired permit to activate capacity.

The full budget, expiration and release rules are in [the capacity runbook](../../docs/CLOUD_CAPACITY.md). A prepared service is not proof of GPU capacity, delivery reliability or operating economics.
