# Targeted German Jazz diagnosis — 2026-11-01

**PASS diagnostic and independent cleanup; FAIL song qualification; owner musical acceptance PASS; general screen calibration PARTIAL.**

The owner approved one request, one L4, up to $3, 40 minutes plus shutdown, with private rejected-audio retention and no repeated provider submission. The permit is consumed. The fixture used the original failed case's seed 998959027, 134 seconds, Jazz, German and Take Five metadata on the unchanged published image. It does not establish bit-identical generation across runs.

The request failed with `style-rejected:matched-1-of-4` after 251.325 execution seconds. The private 25,728,044-byte stereo 48 kHz WAV was captured before remote cleanup; its SHA-256 is `b972071f1c3293545ca1fdaf9e1bc02da8f7e123d0c297955007ae63d7ad91d1`. All 20 reserved test credits were released, with no capture or live credits. The $0.075440 request estimate is not a complete provider bill.

The unchanged pinned CLAP screen on local CPU also matched one of four windows:

| Passage | Jazz score | Strongest other label | Other score | Gap | Match |
| --- | ---: | --- | ---: | ---: | --- |
| 0:15–0:25 | 0.534250 | Lo-fi | 0.578440 | 0.044190 | No |
| 0:49–0:59 | 0.593609 | Soul | 0.639556 | 0.045947 | No |
| 1:24–1:34 | 0.653785 | Soul | 0.675486 | 0.021701 | Yes |
| 1:59–2:09 | 0.633337 | Soul | 0.675108 | 0.041772 | No |

The screen requires at least three matching windows within a 0.03 cosine gap, Jazz mean at least 0.25, and Jazz mean within 0.03 of the strongest unrelated mean. Jazz mean is 0.603745, versus Soul 0.641569: both relative criteria fail. These are embedding similarities, not probabilities, genre truth or musical-quality ratings. The failed windows exceed the allowed gap by only 0.011772–0.015947. The owner subsequently heard this exact take and said “it is good.” This is positive musical acceptance despite the screen rejection. It does not explicitly label the genre or calibrate the screen across other recordings. No thresholds, genre relationships or success status were changed.

The [local analysis](style-capture-analysis.json) used `scripts/check_dna_audio.py`'s `assess(score_audio(path), 'jazz')`, its pinned offline model, exact direction texts and existing four ten-second windows. It finished in 6.05 seconds at approximately 1,052 MiB RSS, with unchanged swap and no apps closed. The exact command can be reproduced from the repository root:

```sh
HF_HUB_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1 PYTHONPATH=scripts .venv-singer/bin/python -c 'from check_dna_audio import assess,score_audio; import json; print(json.dumps(assess(score_audio("build-dna-completion/cloud/2026-11-01T05-27-29.150Z/1416aff7a32f4377a4b5b9fa72bb965e-rejected.wav"),"jazz"),indent=2))'
```

Independent GET/HEAD/SELECT checks confirm endpoint limits 0/0, original hardware placement restored, no workers including unhealthy workers, no queued/running jobs, remote staging object absent, no disposable trial databases and zero held test credits. [Postcheck](style-independent-postcheck.json). Exactly one provider request was made; the accepted worker's existing internal two-take policy was unchanged. The harness's exit 1 records rejected song qualification after successful capture/cleanup, not a reason to resubmit.

Before paid activation, preflight found and repaired a trial-only capture restriction hardcoded to 100 seconds. It now validates the existing 100–140 second product bounds and uses the approved duration for the WAV byte bound. Twelve focused fixture/capture checks and typecheck pass. No paid request preceded this repair and no approved scope or budget changed.

The exact unmodified WAV is available privately on this Mac at [the listening page](http://127.0.0.1:8777/jazz-diagnostic-20261101/), with passage jump controls. Page HTTP 200, WAV range HTTP 206, RIFF/WAVE header and identical source hash pass. The owner listened and accepted this exact new take: “it is good.” [Hash-bound feedback](style-owner-feedback.json). This is a direct new judgment, not an inferred extension of earlier blanket approvals. No new study or additional GPU request is started.

[Result](style-diagnostic-result.json), [consumed permit](style-rejection-diagnostic-plan.json), [provider billing attribution](provider-cost-attribution.json). Next: preserve the accepted take while resolving general screen calibration. Do not rewrite the failed provider receipt, add an explicit genre verdict the owner did not give, weaken global thresholds, or spend on another speculative generation. Complete billing/capacity and bounded App Review availability remain separate release gates. Customer sales and App Review submission remain held.
