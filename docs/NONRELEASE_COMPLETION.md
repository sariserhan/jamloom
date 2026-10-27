# Non-release completion work — 2026-10-27

**PARTIAL overall; website and phone release excluded by the owner.** This pass
continues the remaining evidence and quality work. It does not reopen previously
passed purchases, device flows or accepted products merely because older dated
TODO entries retain historical failures. No push, deployment, live checkout
activation, App Store upload or external supplier message.

## Actual audio timing

**PASS scoped physical measurement:** the owner ran the new local chirp check
using the MacBook Air built-in microphone/speaker route. All five probes measured
**54.5 ms**, with zero reported spread. Input was 48 kHz with browser echo
cancellation, noise suppression and automatic gain disabled. The
[owner's exact scalar result](evidence/nonrelease-completion-20261027/owner-audio-timing.json)
is retained; no microphone recording was saved or uploaded.

This measures the combined output, room and input path against the AudioContext
sample clock. It does not measure screen response, separately identify capture
delay, qualify headphones/Bluetooth, calibrate the native Live Source route, or
establish singing accuracy. No global grading offset is inferred or applied.

The diagnostic reuses the existing capture worklet and one context. It requires
an explicit button, stops on completion/cancel/background/permission failure,
and releases late microphone permissions after cancellation. Two correlation
tests cover delayed/inverted probes at three rates, noise/silence/tone rejection
and unstable/incomplete measurements. Ten Chromium/WebKit cases pass: baseline
loopback, +60 ms delay, silence, denial and cancellation. Both measure exactly
the additional 60 ms. The synthetic zero-delay route itself adds 20.67 ms in
Chromium and 50 ms in WebKit; it must not be mistaken for physical-device latency.
[Browser results](evidence/nonrelease-completion-20261027/timing-browser.json).

Reproduce with `node --test apps/web/tests/audio-timing.test.js`, then from
`apps/site`, `node tests/singing-timing-browser.mjs` while the diagnostic is served
at `http://localhost:8767/singing-timing.html`. The Browser runtime tool was not
available; the existing installed Playwright test dependency was used.

## Singing detector alternative: do not adopt

An independent normalized-autocorrelation/MPM candidate, informed by the audited
MIT `SmashingGoodTime/vocal-trainer` architecture, was compared with the current
centered YIN detector. No JUCE code/runtime, application assets or new dependency
was copied. The shared production acceptance gate was unchanged.

The same 35 previously inspected eligible recordings and 23,077 labelled voiced
frames give:

| Metric | Current detector | MPM candidate |
| --- | ---: | ---: |
| Within 50 cents, including missed voiced frames | 17,738 / 23,077 (76.86%) | 16,996 / 23,077 (73.65%) |
| False voiced frames | 2 | 1 |
| Detector CPU on this run | 12.54 s | 20.91 s |

**REJECT this candidate for runtime adoption:** less accurate and about 67%
slower. This is development-data evidence, not an independent new-singer study.
The two timeline-invalid recordings remain excluded, and no threshold was tuned
to hide failures. [Full measurements](evidence/nonrelease-completion-20261027/mpm-development.json).

Reproduce without overwriting prior evidence:

```sh
node scripts/benchmark_singing_difference.mjs scripts/experiments/singing-mpm.mjs /tmp/jamloom-mpm-new.json '' build-singing-holdout-20261027 apps/web/singing-pitch.js
```

The runner retains its original default baseline for historical comparisons;
the optional last path selects and fingerprints the explicit comparison baseline.

A second fixed-gate comparison uses the same current detector with 4,096 rather
than 2,048 samples, aligned to identical frame centers. It also regresses:
76.88% → 55.12% within 50 cents, two → five false voiced frames, 12.40 → 30.02 s
CPU, and 21.33 ms additional window-center delay. **Do not adopt.** Different
edge exclusion gives 23,072 voiced frames, so compare the two arms of this run,
not denominators from the MPM run. [Window results](evidence/nonrelease-completion-20261027/window-development.json).
Append `4096` to the benchmark command, with `apps/web/singing-pitch.js` as both
candidate and baseline, to reproduce. The live detector/worklet remains unchanged.

## AI DJ analysis and fresh generation

Twenty hash-verified retained originals and eighteen actual consecutive pairs
were checked with separate 24-second entry/exit beat grids. The existing 25 ms
timing and coverage gates were preserved. **No adoption:** measured beat handoffs
remain **4 of 18**, with four plan changes but no demonstrated musical benefit.
An edge grid cannot qualify effects or singing in the middle of a track.
[Results](evidence/nonrelease-completion-20261027/edge-grid-study.json).
Reproduce from `apps/site` using `node --import tsx tests/dj-edge-audit.mjs`.

The owner explicitly approved the new [six-output genre comparison](DJ_GENRE_MODELS.md)
at $3 maximum, one GPU, forty minutes, no replacement and no public activation.
It compares the two already pinned ACE-Step recipes on house, tech-house and
techno with new matched seeds. **FAIL before audio generation:** the renderer
exited during system-package installation. Zero tracks were generated. The
rental was deleted after about 365 seconds; initial observed account debit was
$0.02379 and the later [account check](evidence/dj-genre-models-20261027/provider-cost.json)
shows $0.02671, not a final invoice. An independent inventory confirms zero rentals. The permit
is consumed and no replacement is authorized. [Result and cleanup](DJ_GENRE_MODELS.md#actual-attempt).

The retained log ends during package unpacking; the exact exit code was not
captured, so a package-install timeout is plausible but unproven. Local setup now
excludes recommended packages, and future startup probes retain the exit code.
No provider retest or musical improvement is claimed from these corrections.

## Catalogue and payment boundaries

The four existing new lesson arrangements are hash-verified and copied to one
local [audition page](http://localhost:8766/singing-catalogue/review/). Both browser
engines play/seek/pause all four, allow only one player at a time and fit the
390-pixel viewport. No music was regenerated for that initial audition. **FAIL
owner acceptance:** the owner calls all four too childlike, simple, basic and
boring. [Exact feedback](evidence/nonrelease-completion-20261027/catalogue-owner-review.json).

Two new local drafts revise Paper Kites and Neon Tide together: complete original
lyrics, less regular melodic phrasing, breath spaces, minor/extended harmony,
syncopated bass/drums, section dynamics and a distinct chorus. The existing WASM
instrument engine renders them; there is no new engine, sample pack or paid
generation. All supported registers, section practice, note pairing, silent-input
rejection and ideal-note grading pass. Both PCM-to-MP3 outputs decode without
clipping. The [matched-loudness Before/Revised player](http://localhost:8766/singing-arrangements/review/)
passes Chromium/WebKit play/seek/pause/one-player checks. **FAIL owner acceptance:**
both revised drafts remain bad/boring; the piano sound does not meet the desired
song experience. [Exact decision and reference](evidence/nonrelease-completion-20261027/arrangement-owner-review.json).
**No shared course content is replaced.** Natural recorded singing guides remain open.

Reproduce with `node scripts/render_singing_catalogue.mjs --arrangement-study`
and `.venv-analysis/bin/python scripts/review_singing_arrangements.py` (the review
builder refuses to overwrite an existing audition). Earlier rejected files are
preserved, not overwritten by the draft render.

### Corrected song-production target

The owner supplied [EENIE MEENIE — DADE RMX](https://www.youtube.com/watch?v=lQRHrIRGPVs)
as the desired direction. YouTube metadata describes melodic deep house, credits
Labelle Remix, and reports 310 seconds. These are verified metadata, **not an
audio audition**: groove, instrumentation, vocal quality and arrangement have not
been measured or heard in this inspection. No production permission was found in
the retrieved description. A remix does not erase underlying composition rights;
see the [Copyright Office explanation](https://www.copyright.gov/engage/musicians/)
and [YouTube's licensing guidance](https://support.google.com/youtube/answer/2797468).
No download, training, reuse, licence purchase or outreach is performed.

The next acceptance unit is **one original produced song**, not more catalogue
entries: engaging drums/bass and accompaniment, a memorable original melody and
lyrics, natural sung demonstration, and verse/chorus development. These are the
new production requirements, not claims about the linked audio. Derive a matching
instrumental from the same performance; do not generate two unrelated versions.
Keep the instrumental available without the piano melody during singing.

Before course integration, validate the full lyrics and vocal note/onset timing
against that actual performance, review stem-separation artefacts and musical
quality, and test section offsets, repeat, register/tempo support, live scoring
and microphone cleanup on web and phone. Reuse the existing course/player clock
and grading pipeline; do not add a second engine or assume a generated song is
already a scored lesson. Preserve working lessons and progress. Paid generation
requires a newly scoped permit; the failed genre permit remains consumed.

Stripe test-mode course purchase, refund, dispute and signed CLI-to-local-HTTP
delivery already passed in the retained provider report. Repeating those tests
would not establish the missing deployed notification endpoint. Real Apple
sandbox purchases/Restore and local verified receipt delivery also remain PASS.
Deployment-dependent native/payment/refund delivery stays separate and is not
claimed by this local pass. The $39 offer and inactive live sales are unchanged.

## Remaining substantive work

- Professional fresh-music consistency, natural brief sung hooks and fresh
  independent parts need musical acceptance, not another UI check. Sustained
  capacity/cost and hosted Improvise/DNA genre, language and 5,000-favorite
  generation are distinct bounded qualifications, not covered by the six clips.
- Natural sung lesson guides and broader singing/input/device evidence remain
  unqualified. The built-in-route timing result closes only that measurement.
- Popular-song composition/master permissions and delivery assets are not
  supplied under approved no-cost terms. Tency's paid quote is not accepted;
  prepared artist enquiries remain unsent.
- The required independent listener cohort and novice learning study cannot be
  replaced by automated scores or invented reviewers. The owner currently cannot
  arrange that cohort. Physical iPad is excluded and deferred hardware checks
  stay deferred.
- Website/phone publication and checks requiring that deployment are intentionally
  outside this continuation. No product-wide or specification-wide completion
  claim is made while these substantive requirements remain open.
