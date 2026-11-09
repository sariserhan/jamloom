# Qualification harness archive

Audit copies for the consumed November 8 permit. Do not execute these from the evidence directory or reuse the permit/claimed files. Runtime paths deliberately refer to ignored private configuration, exact source snapshots and one-use claims in the repository build directory. No credentials, permit values, raw provider logs, database backups or private audio are included.

The application/source hashes are recorded in [the consumed plan](../../release-recovery-20261108/hosted-plan.json). Read-only observation, billing and post-run retirement helpers were added after activation; they do not submit songs or activate capacity. `sha256.json` identifies every archived helper. Private HTTP uses Vercel protection bypass through the signed-in CLI and the configured production Origin; it proves hosted API behavior, not normal-browser authentication on the preview hostname. Physical UI evidence is separate.

Reviewed CLI behavior: [Vercel curl](https://vercel.com/docs/cli/curl), [protected automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation), [remove exact deployments](https://vercel.com/docs/cli/remove). Database isolation uses an empty [Neon database](https://neon.com/docs/manage/databases) on existing compute. Context7 tools were unavailable; official documentation and installed CLI help were used.

Billing uses exact observed worker IDs and an hourly query window, per the [Runpod billing API schema](https://github.com/runpod/docs/blob/main/api-reference/openapi.json). A missing row remains unreported, never zero cost.
