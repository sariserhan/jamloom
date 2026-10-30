# Approved worker publication and diagnostic — 2026-10-30

**PASS for this single technical diagnostic.** The owner approved “Approve image
publication and one $3 diagnostic.” One image build and one provider request ran;
there were no agent-triggered build reruns or request retries. The permit is consumed.

## Publication

- Exact reviewed source: `1e80c647ae5800c010539cee86a5a4ef125f0c68`, fast-forwarded
  from `85b2ce7ba542af67963376f6ae89c04e8201401e` on `codex/runpod-setup`.
- [GitHub build 41116754823](https://github.com/sariserhan/jamloom/actions/runs/41116754823)
  succeeded. Its 17 worker-boundary and two hosted-identity routing tests passed;
  the prepared source had already passed 22 checks including duration cases.
- Published image:
  `ghcr.io/sariserhan/jamloom/music-worker@sha256:9c726241c7d281c2643f68121011ef9b6f4ff22f97c94bc3bacedfb8756ab751`.
  The exact source tag and digest resolve to the same hashed registry manifest;
  Linux amd64, handler command and isolated separator interpreter were checked.
- Only `imageName` changed on template `jbpcd0xgbf`; environment hash, 60 GB disk
  and other checked settings matched before/after. Endpoint limits stayed 0/0
  until the trial. Website deployment remains disabled on this branch.

[Publication](publication.json), [CI checks](ci-boundary-checks.log),
[template update](template-update.json), [reviewed hashes](input-hashes.json).

## One bounded request

**PASS:** 30-second synthetic-source reggae diagnostic on endpoint `jl77hn92npt65k`.
Job `91c2bc55-aaf7-47e6-8a54-eeba338586c1-u2` reached `COMPLETED`.
The tested image runs the corrected Spleeter identity path with identity enabled;
the returned Improvise receipt verifies the completed arrangement and source hash.
It does not expose a separate identity-conversion or clean-stem quality receipt.

- Start: 19:54:03.277 UTC; cleanup finished: 20:10:49.656 UTC (16m46s total).
- Cold initialization: 890 seconds; provider queue delay: 13.751 seconds;
  provider execution: 83.157 seconds.
- Source: original procedural three-second WAV, no human audio.
- Result: stereo 48 kHz PCM16, exactly 30 seconds; SHA-256
  `01d0418f00d1e359bbff6687aaa553cdc9a3afd184b2d199a2fec11278f7365b`;
  peak 0.891266, no clipped samples or truncated PCM.
- The arrangement receipt binds the original input hash, records one inserted
  half-second source excerpt, and passes source-use checks. This is not evidence
  of complete-phrase preservation or of the separately accepted bass strategy.
- One worker maximum, 20-minute limit plus shutdown allowance, independent
  watchdog and temporary test storage/database/credits were used.

[Trial receipt](../improvise-finish/cloud/2026-10-30T19-54-03.275Z/trial-result.json),
[provider completion](provider-job-status.json), [audio checks](audio-check.json).

## Cleanup and cost

**PASS:** independent provider GETs confirm limits 0/0, zero workers and zero
queued/running jobs. A local SQL check found no temporary trial database, and the
local PostgreSQL server was stopped afterward. The harness removed three storage
objects. Of 50 test credits, one was charged and 49 remain, with zero reserved;
the four-credit quote settled correctly. No live purchases were involved.

The published rates passed the conservative $1.35 bound for the entire approved
window, below $3. This is a software/watchdog bound, not a provider-enforced dollar
cap. The application estimated $0.117 for the request. Provider billing before,
after and at the independent check still contains only the earlier 18:00 UTC
$0.0281956936 entry; the new diagnostic's final charge has **not posted**. Do not
present that historical amount or the application estimate as this run's invoice.

[Independent cleanup](postcheck.json), [final provider recheck](provider-final-readonly.json),
[local cleanup](local-cleanup.json),
[pricing preflight and official sources](pricing-preflight.json).

## Remaining limits

**PARTIAL overall:** cold startup remains slow, with provider worker replacements
and image-download retries observed. Those are provider provisioning events, not
additional submitted model requests; their exact cause is not established.
The image is about 27.19 GB compressed. This run does not close sustained capacity,
restart, latency or cost qualification.

**NOT RUN:** owner listening for this procedural diagnostic, broader genre/DNA/
AI DJ qualification, maximum-duration hosted cases, or musical-quality acceptance.
The accepted bass pilot/crop remain accepted separately. Website/app publication
and live sales were excluded. [Current remaining work](../../UNFINISHED_CURRENT.md).
