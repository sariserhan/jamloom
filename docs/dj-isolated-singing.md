# Separate musical singing — 2026-10-26

**PARTIAL implementation; FAIL natural singing after owner review.** The previous
two-second repaint attempts have failed. This candidate generates a separate
ten-second voice with the existing Music DNA singer descriptions, then mixes
at most one short phrase over an unchanged Jamloom instrumental. The model
receives no backing audio. No TTS, downloaded recordings, reference-derived
weights, new dependencies or production activation are involved.

The shared selector previously measured from the first active sample to the
last active sample in the entire ten-second candidate. Several separate short
phrases could therefore be rejected as one long phrase. The new selector groups
activity only across gaps shorter than half a second, checks the quiet tail,
and takes the first complete bounded sound that fits four beats (at most two
seconds). It does not compress or cut a sustained sound to make it fit. Its
receipt records the exact source interval. Quiet boundaries do not establish
complete words, singing, naturalness or harmonic fit: those still need listening.

The mix uses the existing brief 20% duck and 30 ms fades. For the prepared
originals, the PCM outside the vocal window remains unchanged. A candidate
without a safe phrase leaves the original unchanged, records `no_short_phrase`,
and retains the raw audio for review. It is not labeled a successful vocal and
does not trigger another model call. Invalid/clipped audio, provider failures
and failed integrity checks stop the run. Repaint continuity protection remains.

## Prepared comparison

[Exact plan](evidence/dj-isolated-hooks-20261026/gpu-plan.json): four ten-second
voice candidates, two male-tenor and two female-mezzo, using the same two retained
house originals, original two-word lyrics and seeds as the repaint study. There
are no new instrumental generations. The experiment tests separate singing and
phrase selection, not music consistency or new model weights.

Bounds: **$3 total, one GPU, 20 minutes, four model calls, stop on failure,
independent cleanup, no automatic replacements, no public activation.** The owner approved “Approve the capped $3 isolated-singing comparison”; its single attempt has ended and this permit is consumed. No replacement is authorized. Prior permits are consumed. The
existing controller refuses generic approval, changed inputs, changed workers
and implicit replacements. Historical execution command (cannot be reused):

```sh
.venv-analysis/bin/python scripts/dj_sample_trial.py --isolated-hooks
.venv-singer/bin/python scripts/review_dj_sung_hooks.py --isolated
```

The full review generator is prepared to verify raw/source hashes, independently
recreate phrase selection and mixed PCM, and offer the original groove, mix and
uncut voice. **That four-candidate review was NOT RUN** because the run failed.
Instead, the [diagnostic page](http://localhost:8766/isolated-hooks/review/) serves
only the unchanged first raw candidate and marks it rejected. Its WAV hash
matches the retained output exactly.

## Verification and remaining gates

**PASS:** 81 final Python checks covering phrase separation, within-word pauses,
quiet sustained tails, truncated ends, invalid audio, bounded mixing, exact
model parameters, unchanged originals on failed selection, raw-candidate
retention, isolated package imports, model allowances, prior repaint regressions
and strict permit bounds. The waveform fixtures are synthetic engineering tests,
not human singing evidence. [Test output](evidence/dj-isolated-hooks-20261026/final-python-tests.txt).

**PASS browser mechanics:** the one raw diagnostic plays/seeks without autoplay or page errors in Chromium/WebKit, at 1440×1000 and 390×844. Mobile screenshot inspected; no overlap. The in-app Browser runtime tool was unavailable after discovery, so the existing muted Playwright fallback was used. [Browser evidence](evidence/dj-isolated-hooks-20261026/browser-isolated-hooks.json).

**NOT RUN:** the remaining three candidates, a successful short-hook mix, sustained hosted capacity and physical venue use. No image build or model download was started on the nearly full Mac.
Music consistency, hosted qualification, complete operating costs and release
remain open in the [completion campaign](ai-dj-finish-campaign.md).

Private worker tracebacks now retain the reason for failed renders; the authenticated HTTP response stays generic. A regression test confirms this separation. Website readiness now reports zero available listener slots when there is no healthy worker, instead of showing the theoretical two-slot limit as available. 150 site tests, 38 isolated database/session/allowance/process checks and TypeScript pass. The database tests use disposable loopback databases, not production writes.

The two previous vocal-mode rentals now have provider-specific observed charges of $0.004 and $0.040 ($0.044 combined), independently bound to their contracts. These later charge rows differ from the earlier $0.039556 account-debit snapshot; neither is a settled invoice. [Charge recheck](evidence/dj-isolated-hooks-20261026/prior-charges.json).

## Actual run and owner verdict

The first ten-second candidate was generated, retained, then rejected by the level
guard with HTTP 422. Private logs preserve the exact rejection. No edited track
was delivered; the remaining three calls were NOT RUN. Deletion was confirmed
independently after **337.58 seconds**. The account-debit snapshot was
**$0.048793**; a later provider-specific charge row reports **$0.072**. Neither
is a settled invoice. The one-worker, 20-minute and $3 bounds were respected.
[Failure](evidence/dj-isolated-hooks-20261026/failure.json),
[costs](evidence/dj-isolated-hooks-20261026/costs.json),
[independent inventory](evidence/dj-isolated-hooks-20261026/final-inventory.json).

The owner said **“Singing, but unnatural or unclear”** after hearing the unchanged
raw output. Vocal presence is owner-confirmed, but naturalness/clarity fails; the
reply does not distinguish the two defects. This does not approve a production
voice. [Hash-bound feedback](evidence/dj-isolated-hooks-20261026/owner-feedback.json).

The raw file has one full-scale negative sample at 0.811958 seconds. The pinned
[decoder](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/acestep/core/generation/handler/generate_music_decode.py)
can normalize its output to exactly full scale. Consequently, this sample alone
does not prove audible clipping. The pre-export tensor was not retained. The
isolated study inherited disabled normalization from repaint, whereas the
[inference API](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/acestep/inference.py)
defaults to -1 dBFS peak normalization. Context7 was unavailable; these exact
primary sources were checked. [Source hashes and limits](evidence/dj-isolated-hooks-20261026/normalization-research.json).

A temporary -1 dBFS copy in memory still supplies **no complete quiet-bounded
phrase within four beats**. No normalized or repaired audio was saved or promoted.
Tiny-Whisper returns no words, but prior positive-control failure means that
empty transcript cannot override the owner's observation of singing.
[Reproducible analysis](evidence/dj-isolated-hooks-20261026/check_retained.py),
[measurements](evidence/dj-isolated-hooks-20261026/retained-analysis.json).

The local correction now requests -1 dBFS normalization **before** float WAV
export for standalone voices, leaving repaint behavior unchanged. Parameter
checks pass; no further GPU run validates the correction. This is a headroom
fix, not a naturalness fix. The [worker used in the failed run](evidence/dj-isolated-hooks-20261026/worker-at-run.py)
is retained and matches its permit hash. Historical permit hashes remain unchanged.
Provider-side executed-script hashes were not retrieved before this failed
rental was deleted. Failure cleanup now collects that file as well, with a
simulated startup-failure/deletion regression test; actual provider execution
of that collection correction is NOT RUN.

No further rental, public activation, live billing, model training, push or
deployment occurred. The music and voice quality gate remains open; neither
technical tests nor repaired export parameters close it.
