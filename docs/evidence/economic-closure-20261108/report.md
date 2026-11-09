# Operating economics — November 8, 2026

**PASS cost-report implementation and posted DJ reconciliation; FAIL conservative Improvise/DJ planning scenarios; PARTIAL commercial qualification.** The owner authorized conservative planning allowances. They are kept separate from measured provider charges and cannot enable sales.

The [DJ receipt](dj-billing.json) attributes $0.058 to the unsuccessful startup resource and $0.102 to the successful resource: **$0.16 for 20 delivered generated minutes, or $0.008/minute**. This replaces the earlier balance-difference estimate for this cohort. All 20 retained WAVs independently match their recorded hashes, sizes and 60-second durations ([audio integrity](dj-audio-integrity.json)). Posted resource charges are not a final monthly invoice. No new DJ run or listening study occurred.

The private-staging Improvise resource still has no posted billing entry ([billing](improvise-billing.json)). Its recorded $0.05014 estimate is $0.03014 estimated GPU execution plus a $0.02000 fixed allowance. The model replaces that fixed allowance with itemized overhead, avoiding double counting; it adds $0.02640 estimated two-minute idle cost for the observed single-song cycle. Startup/failure billing remains missing. Missing charges are not zero. The measured [DJ](dj-cost-report.json) and [Improvise](improvise-cost-report.json) reports therefore remain PARTIAL.

## Conservative allowances

[Reproducible calculator](calculate-allowances.py) and [all 18 scenarios](conservative-allowances.json). The planning envelope is $150/month shared hosting, database, guardian/monitoring/backups and contingency, allocated over 30,000, 150,000 or 300,000 redeemed credits. This is a sensitivity assumption, not observed customer traffic or a guaranteed spending ceiling.

Support assumes 5% of purchases need ten minutes at $30/hour, allocated over the smaller 150-credit purchase. Other allowances cover orchestration, non-GPU inference contingency, metadata bandwidth, and 2% of the net-credit floor for FX/tax risk. Provider fees are already reflected in the net floor; this does not charge the same GPU execution twice.

At 300,000 redeemed credits/month and a five-year storage planning horizon (one song per Improvise cycle; shared multi-song cycles would reduce idle cost per song):

| Product / unit | Catalog cost budget | Non-GPU allowances | Provider basis | Combined planning cost |
|---|---:|---:|---:|---:|
| Improvise / song | $0.070000 | $0.038767 | $0.056540 execution + single-song idle estimate | Forecast $0.095307 under these assumptions — FAIL |
| Music DNA / song | $0.140000 | $0.084634 | Complete cohort missing | $0.055366 remains for the entire provider lifecycle — PARTIAL |
| AI DJ / generated minute | $0.014000 | $0.008334 | $0.008000 posted cohort | $0.016334 — FAIL |

Storage uses $0.015/GB-month from [R2 pricing](https://developers.cloudflare.com/r2/pricing/). R2 egress itself is free, and saved songs/sets use signed redirects in `audio-response.ts` and `dj-recordings-http.ts`; the separate bandwidth amount reserves metadata/other traffic, not a fictional R2 audio-transfer fee. The hosting envelope is informed by usage-based [Vercel function pricing](https://vercel.com/docs/functions/usage-and-pricing) and [Neon pricing](https://neon.com/pricing), but does not assert an actual subscription bill. The software currently retains completed songs and ready saved sets until deletion; a one/five-year forecast does not impose expiry or bound lifetime expense. DJ uses 2 MB/minute, above twice the 128 kbit/s bitrate requested in `apps/web/set-recording.js`; browser bitrate is advisory and actual saved bytes still need measurement. Playback/download assumptions are not new product limits.

These scenarios cannot qualify the unchanged prices at the 65% margin target and $0.02 net-credit floor. Actual transfer paths, saved-set encoding, retention exposure, support demand and attributable provider billing must narrow the allowances or costs must be reduced. No prices, credit grants, storage policy or qualification flags were changed.

## Verification and independent review phase

Eight focused cost-report checks, all **222 website tests**, and TypeScript pass. The offline report validates catalog identity, integer money, resource attribution, duplicate charges, complete overhead categories and evidence-backed zero claims. It includes failed-resource costs and never turns a passing cohort into production qualification. Reproduce with `npm run cost:report -- <cohort.json>` in `apps/site`.

Both existing review accounts authenticate, sign out and preserve live wallets; local review configuration validates the unchanged operation prices. The owner separately approved updating the production hostname for these two accounts and funding at most $7.50/seven days while commercial qualification continues. [Approved review plan](../review-phase-20261108/approved-plan.json). This exception does not enable public sales/generation or remove the commercial economic gate.

The subsequent [reviewer creation](../review-phase-20261108/report.md) delivered 38 seconds in 93.188 provider seconds. Its $0.04068 estimate includes the same $0.02000 fixed allowance. This shorter take does not replace the retained 44-second planning cohort or establish complete billed economics; review-cycle billing is also unposted. The app is now submitted with manual release.
