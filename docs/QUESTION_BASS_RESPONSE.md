# Question phrase: revised bass-led direction — 2026-10-30

**PASS — owner accepts this pilot’s musical direction and exact user crop.**
[Hash-bound verdict](evidence/question-bass-response-20261030/owner-acceptance.json):
“Musical direction works; crop is correct.” Broader quality remains **PARTIAL**.

The owner rejected all four A–D arrangements at port 8774 as too
piano-heavy. That is a **FAIL** musical verdict, regardless of their passing
technical checks. The earlier three Afro House acceptances are unchanged.
[Exact feedback and candidate hashes](evidence/finish-local-20261030/owner-rejection.json).

One new 31.38-second pilot is ready at <http://127.0.0.1:8775>. It has original
electronic percussion, sub bass and moving bass coloured by the permitted input's
spectrum, with a call, rise, drop, break, changed return and ending. There is no
piano. Source stresses determine bass attack positions. Three calls preserve the
chosen crop at its original rate, with fades and gain; other events use signal
fragments and echoes. This is authored local synthesis. The owner confirms that
the original crop contains the complete user phrase without Mr Wobble’s voice,
and accepts the musical direction of this exact pilot. This does not establish
a trained model or acceptance across other sources and arrangements.

## What the reference supports

The artist's [official SoundCloud release](https://soundcloud.com/misterwobbles/question)
and [Apple Music release](https://music.apple.com/us/album/question-single/1876441234)
identify *Question?*; Apple categorizes it as dubstep. The
[Beatport artist catalogue](https://www.beatport.com/artist/mr-wobbles/89565/tracks?page=1&preorders=false)
lists 79 BPM and D minor. These are published metadata checked October 30, not
facts inferred by listening. The local recording's matching title and approximately
155-second duration support its identity, but no online audio hash was verified.

The exact permitted local MP3 independently shows recurring pulse candidates near
79/158 BPM and measured energy/texture changes around 10, 40, 60, 80 and 135 seconds.
These are coarse signal observations, not verified beat grids, instrument labels
or reconstructed performer actions. The pilot uses the 79/158 pulse, but derives
its register from the user crop rather than copying the published key.
[Full signal analysis](evidence/question-bass-response-20261030/reference-analysis.json).

A source-order spectral search across five duration ratios and frequency offsets
has only weak separation from eight equally searched shuffled-order controls:
best later candidate 0.495 versus maximum control 0.467. **No repeated phrase,
transformation or expert label is verified by this result.** A regression exposed
FFT residue producing false matches in silent windows; the matcher now masks
numerically empty windows, the failing case passes, and the real analysis was
rerun. No training examples were admitted. This session had no listening-capable
tool, so it does not claim to have heard or musically evaluated the reference.

## Verification

- **PASS:** six focused tests cover spectral match recovery/noisy backgrounds,
  shuffled controls, invalid inputs, causal source-colour changes, exact clean
  calls, stem reconstruction and silent/long-input rejection.
- **PASS:** all seven raw WAV hashes and independent decodes; quantized stems
  reconstruct the full mix within 0.0000611 amplitude. The listening copy measures
  -23.00 LUFS integrated and -9.01 dBTP. Input and original reference remain unchanged.
- **PASS:** desktop and mobile Chrome playback, seeking, exclusive playback,
  correct page content, no overflow or JavaScript errors. Screenshots inspected.
  Existing repository Playwright workflow used because the browser plugin's
  required execution tool was unavailable. **NOT RUN:** physical-device playback
  of this new audition. **PASS:** owner listening for this pilot’s direction and crop.
- **NOT RUN:** diverse source/seed coverage, expert decision labels, M1
  qualification and learned-model benefit.

[Audio receipt](evidence/question-bass-response-20261030/audio-validation.json),
[arrangement plan](evidence/question-bass-response-20261030/arrangement-plan.json),
[browser checks](evidence/question-bass-response-20261030/browser-validation.json),
[reference tests](evidence/question-bass-response-20261030/reference-tests.log),
[bass tests](evidence/question-bass-response-20261030/bass-tests.log).

## Reproduce without a model or paid service

Use a fresh output path; prior auditions are preserved. Existing analysis venv is
required; the renderer retains a 15 GiB disk reserve.

```sh
.venv-analysis/bin/python scripts/source_bass_response.py \
  --source renders/question-user-crop-20261030/hook-candidate.wav \
  --output renders/question-bass-NEW --user-input-consent
.venv-analysis/bin/python scripts/question_reference_structure.py \
  --source "$HOME/Downloads/improvise/question.mp3" \
  --permission docs/evidence/improvise-reference-study-20261030/permission.json \
  --output renders/question-reference-NEW
python3 scripts/review_serve.py \
  --root renders/question-bass-response-20261030/review --port 8775
```

Raw outputs and the level-adjusted private review page remain in `renders/`.
No reference backing, maker-voice model, cloud audio upload or application-default
change is part of this pilot. The separately approved hosted diagnostic uses
only a procedural signal; its outcome is recorded in the current completion report.
