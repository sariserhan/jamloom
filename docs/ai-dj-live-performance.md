# AI DJ performance and beat direction

2026-10-25. Scope: real deck choreography, quieter track edges and user beat direction. No new GPU rental, training, publication or public service activation.

The player now schedules sparse filter sweeps, one-beat slip rolls and echo on measured stable beats. Its wheel display, pads, filter knobs, echo readout, channel levels, waveform positions and crossfader reflect the audio timeline. It holds when timing is uncertain, during vocals, near section changes or before a transition. Automatic rolls also inspect the actual audio slice and reject quiet repeats. Scheduled voice retirement now has an explicit gain anchor: scheduling a future return no longer starts fading the current voice early. Manual takeover cancels automatic effects; manual jog, backspin, cue, loop and EQ controls remain available. These are deterministic performance decisions, not a newly trained DJ model.

Transitions use sustained-energy entry/exit bounds and equal-power fades. Unverified timing uses up to four seconds of overlap; measured compatible timing and reviewed instrumental phrases retain their tempo/bass handoffs. Internal musical rests remain in the music. A late or missing generated track still follows the existing safe-stop policy; this change does not invent replacement audio or guarantee unlimited hosting capacity.

“Keep this beat” and “Change the beat” work through buttons and the typed command field. Keep retains the current measured tempo and the delivered track's requested groove; Change requests another of three rhythmic directions (steady, syncopated, rolling). The immutable next-batch settings, renderer request, receipt and model brief carry that direction. Already generated or in-flight music is preserved; the instruction reaches the next unprepared original. This is rhythmic guidance, not sample-identical drum preservation or speech recognition. Local-file preview can choose another track but cannot regenerate its drums.

No schema migration is needed: beat direction lives in the existing JSON settings. Validation rejects extra fields, invalid tempos and unknown grooves before credit reservation. Retry, price, reservation and receipt protections remain in place. The procedural engineering fixture explicitly rejects unsupported beat-directed generation rather than pretending to follow it.

## Verification

- PASS: 142 site tests, 47 focused session/analysis/client/worker tests, five Python worker tests, TypeScript checking and the optimized production build.
- PASS: Chromium/WebKit manual DSP checks. All 12 gestures change actual PCM; stop cancels pending returns, manual cue/loop/jog/echo and bounded output pass.
- PASS: four final retained-original browser captures (two sets in Chromium and WebKit), typed/button beat commands, manual takeover, return to Autopilot and Stop. All four recordings fully decode with no silence at -60 dB lasting 250 ms; peaks range from -7.8 to -6.5 dBFS. Each is a three-track excerpt, not a new hosted session.
- PASS: reviewed phrase/bass transitions, pause/resume, takeover during a transition and offline prepared playback in both browsers. The scheduled-roll regression retains at least 94.65% of baseline RMS in each tested 100 ms window.
- PASS: all 20 retained originals through the offline timing replay. No public-set silence at -60 dB lasting 250 ms; one 1.058-second quiet span inside a private source track. This replay excludes browser EQ/FX, hosted dispatch and recordings.
- Initial live capture: transitions had no detected quiet spans, but two automatic rolls introduced dips (340/334 ms). Slice-energy protection alone did not remove them. A constant-tone offline reproduction confirmed that scheduling retirement faded the voice before the intended 6 ms release. The explicit gain anchor removes that regression; the browser test now checks every 100 ms window through a roll. Beat-boundary rounding and quiet-slice protection remain. Initial and pre-anchor captures remain preserved. An intermediate replay was stopped during development edits, and an intermediate WebKit control check timed out. Final checks run against frozen source.
- NOT RUN: human acceptance of the new moves/transitions, a fresh GPU test of beat-prompt adherence, native Safari/device/venue performance, new model training. Earlier acceptance of the source music does not approve these new mixes.

Reproduce from `apps/site` with localhost running:

```sh
npm test
npm run typecheck
node --import tsx --test tests/ai-dj-plan.test.ts tests/ai-dj.test.ts tests/dj-session-client.test.ts tests/dj-sessions.test.ts tests/dj-remote-worker.test.ts
node tests/ai-dj-performance-browser.mjs
node tests/ai-dj-autopilot-browser.mjs
node tests/dj-live-moves-browser.mjs
node tests/dj-live-moves-browser.mjs --webkit
node --import tsx tests/dj-padding-analysis.mjs --hosted
```

From the repository root:

```sh
.venv-analysis/bin/python -m unittest discover -s tests -p test_dj_track_worker.py
python3 scripts/replay_dj_padding.py renders/ai-dj-hosted-20261025/padding-analysis.json renders/ai-dj-live-moves-20261025/offline-timing-new
```

Browser replays use three hash-verified retained originals per listener, real local-file import, analysis, audio-clock processing and the actual recorder. Physical speakers are muted downstream of recording; no generation, R2 writes, account mutations or credits are used. Large originals/captures stay in ignored `renders/ai-dj-live-moves-20261025`; compact evidence is retained with this report.

Listen locally: <http://localhost:8766/live-performance/review/>. Open the deck: <http://localhost:3000/ai-dj>. Both review players start stopped; MP3 playback, finite duration, seeking, single-player behavior and mobile layout pass Chromium/WebKit. [Compact checks](evidence/ai-dj-live-performance-20261025/checks.json), [DSP regression](evidence/ai-dj-live-performance-20261025/performance.json), [reviewed transitions](evidence/ai-dj-live-performance-20261025/reviewed-transitions.json).
