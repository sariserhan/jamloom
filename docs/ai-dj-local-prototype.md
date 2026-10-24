# AI DJ local prototype — 2026-10-24

Historical first increment. The [performance deck and private party reference](ai-dj-performance.md) supersede its controls and prepared bank.

Owner authorized the first local prototype after discussing an instrumental-led continuous DJ set, occasional vocal moments, energy/mood direction, shared controls and a planned ending. **No push, deployment, paid generation or public activation is authorized by this increment.**

Open http://localhost:3000/ai-dj with the development server running and `JAMLOOM_COMING_SOON=false`. The development navbar includes **AI DJ · Preview**. The page and its single-sample audio route return 404 in a production build; the production navbar omits the link.

## Implemented

- Start explicitly creates/resumes a real Web Audio graph using the existing Jamloom mixer, EQ, echo and limiter. No microphone, autoplay, generation request, account mutation or saved-recording change.
- Two prepared decks, audio-clock-driven platters/playheads, decoded waveforms, real output meter, automatic scheduled crossfades and a visible next direction. Mix next requests an earlier transition. Source gain envelopes keep the crossfade sum bounded.
- Energy and mood select the next available track; recent tracks are avoided where possible. Vocal selections require three preceding instrumental selections. Disabling vocals or planning an ending prevents new vocal selections.
- Autopilot owns transitions. Play together enables real bass/treble shaping and echo; returning to Autopilot resets those effects. Master volume remains available in both modes.
- Built-in commands support more/less energy, warm/bright/deep moods, vocal preference, next track, keeping the vibe, stopping, continuing and finishing in a supported interval. Unsupported/negated/invalid timing requests do not silently choose an ending.
- End after the current track or in a chosen interval. The closing selections ease toward lower energy during the final two minutes, and the output fades during the final eight seconds. The deadline rounds to the current estimated bar. Cancelling the plan restores continuous playback.
- Stop cancels loading, queued sources and scheduled transitions and silences effect tails. Hidden tabs, page departure and audio-context interruption stop playback; resuming requires another explicit Start.
- Failed/timeout/checksum-invalid tracks are excluded for that session. Another prepared track is tried; if the next bank is exhausted, the existing groove loops with an explicit message. A failed initial bank yields a recoverable error. A new set retries the bank.

## Prepared music and limits

Five existing CC0 practice tracks are reused unchanged: Atmosphere, Rhythm Garden, Party Sector, Funked Up and Next to You. Credits remain in the UI and `apps/web/practice-audio/manifest.json`. One existing published Improvise house example (`9547b2b976f83213a4ccb264da6b0cb7`) provides the vocal slot. Its existing metadata is **not-checked**, not owner quality acceptance. The development-only audio route reads exactly that public storage key with the existing bounded reader; it accepts no alternate URL, object key or song ID. The browser verifies every prepared file against its existing SHA-256 before decoding.

Only two prepared audio buffers are retained. Each selection uses at most 96 seconds, and its final phrase-sized region provides a reserve loop. The six-track bank repeats in longer sets. **This is a prepared-music prototype, not continuous AI music generation or unrestricted language understanding.** Editorial energy/mood labels and pulse estimates are prototype inputs. Estimated tempo is displayed as such; these tracks have no verified beat/downbeat grids or key matching. Crossfades do not establish beatmatching, harmonic compatibility or musical quality.

The current shared-control mode has tone and echo only. Scratching, arbitrary track loading, stems, crowd sensing, learned direction, live generation, validated loudness matching and venue/background reliability are not implemented in this increment. Existing DJ Studio/Live DJ remain separate.

## Verification ledger

[Final technical evidence](evidence/ai-dj-local-20261024/verification.json) is recorded below. Automated audio measurements do not replace listening acceptance.

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Director, command, timing and PCM unit checks | PASS | Six focused tests in `apps/site/tests/ai-dj.test.ts`; the one-hour check is timing arithmetic, not a real-time endurance session. |
| Full website tests, typecheck, production build, bundle audit | PASS | 110 tests; typecheck/build/audit pass. Both production preview routes return 404. |
| Chromium / WebKit real playback and controls | PASS | Real PCM, crossfade, tone filter, closing/cancellation, stopped effect tails, late-load cancellation, hidden-tab stop, corrupt-bank recovery and muted speakers. |
| Unattended automatic transition and spaced vocal playback | PASS | Chromium: an unattended transition followed by the first vocal selection after three instrumentals. Captured real mixer audio: 86.58 seconds; WebKit capture: 20.86 seconds. Finite PCM, peak below 1 and silent final half-second. |
| Responsive visual inspection / focused Axe | PASS | Chromium and WebKit at 1440, 800, 390 and 320 pixels; deck, mixer and direction controls remain reachable. |
| Human listening and DJ-quality acceptance | NOT RUN | No claim of seamless beatmatching, professional musical quality or superiority to a human DJ. |
| Real venue, background/device and 30–60 minute endurance | NOT RUN | Foreground local browser preview only. |
| Live generation and cost-per-hour qualification | NOT RUN | No new generation or paid worker launched. |
| Push / deployment / public activation | NOT RUN | Owner handles batch pushes; production access is closed. |

Run from `apps/site`: `npm test`, `npm run typecheck`, `npm run build`, `npm run audit:bundle`, and, with the local development server running, `npm run test:ai-dj-browser`.

Browser recordings tap the real mixer upstream of a test-only speaker mute, with no microphone capture. Screenshots and audio remain in ignored `renders/ai-dj-local-20261024/`. These are technical evidence, not approved musical masters.

## Next quality gate

Listen to the prototype and choose/annotate a coherent cleared DJ bank, verified beat/downbeat grids, key and loudness. Then qualify transitions and an uninterrupted 30–60 minute set before adding generation-ahead. A later generation stage must measure render time, failure rate and actual cost per playing hour, keep a prepared reserve and obtain the required paid-compute approval. None of those gates is closed by this prototype.
