# AI DJ performance deck — 2026-10-24

**Superseded:** the owner rejected automatic timing/technique and clarified Blood Club was only a quality reference. Current correction, disabled Autopilot and training status: [source review](ai-dj-training-sources.md). Historical technical results below do not establish musical acceptance.

**Local implementation and technical checks PASS. Musical qualification PARTIAL. No push or deployment.** This supersedes the original vinyl-style preview described in [the first increment](ai-dj-local-prototype.md).

The owner requested a modern DJ controller and an audible, visible performance rather than track-to-track playback, then supplied `Downloads/blood_club.mp3` as the party reference and asked to conserve computer resources.

Open http://localhost:3000/ai-dj. Start in Autopilot to watch the first automatic loop after roughly eight estimated beats. Switch to Play together to use the pads, drag a jog wheel horizontally or use its ± buttons, and adjust the channel controls. Stop remains the global stop. The tab must stay visible.

## What changed

- Replaced vinyl grooves and tonearms with compact jog wheels, center displays, eight pads per deck, loop readouts, three-band EQ, filters, vertical channel faders and a live-move history. Jog hardware moves during actual jog/backspin gestures; there is no constant vinyl rotation. Waveforms and transport counters reflect the playing audio.
- Autopilot schedules loop, roll, echo, filter, nudge and occasional backspin moves at estimated musical intervals. Energy controls density and the available move sequence. Vocal selections use filter/echo instead of chopping or reversing the vocal. During transitions the crossfader and bass exchange operate on real gain/EQ parameters.
- Pads perform Cue 1, Cue 2, half-beat and one-beat slip rolls, two- and four-beat loops, echo and backspin. Cue 2 seeks eight estimated beats into the sample. Loop pads run for eight beats with manual Release; rolls return to the advancing source timeline after two beats. Backspin plays a bounded reversed slice, then returns to the advancing source position. Jog bends rate and pitch temporarily; it is not an unrestricted scratch engine or key-locked time stretch.
- Transport moves are excluded during a crossfade and controls reflect that ownership. Play together pauses automatic performance moves while the AI continues managing track transitions. Autopilot resets manual channel settings. Effects and scheduled source returns cannot restart playback after Stop. New decks clear old delay buffers.
- The same source timeline drives the jog position, pad activity and loop readout. Loop segments have short edge fades; reverse slices and live voice lists are bounded. Audio parameters and source start/stop times use the Web Audio clock.

## Local reference and resource limits

The original 634.067-second, 12,013,484-byte `blood_club.mp3` was read, not modified or uploaded. Three 80-second excerpts, starting at 30, 240 and 450 seconds, occupy **3,843,261 bytes total**. They are clearly labeled excerpts of the owner's reference mix, not newly generated songs or separate original tracks. Energy labels are editorial preview labels, not a claim of measured crowd response.

The clips and their checksums live under ignored `renders/ai-dj-reference/`. The development-only `/ai-dj/reference` route serves only three validated IDs, checks size/hash, rejects cross-site requests and provides no arbitrary-path/URL access. Neither the original nor its excerpts is tracked in Git or included in production file traces. Production returns 404 for the preview page, published-sample relay and private-reference route.

Slow/ambient selections were removed from the bank. When the private bank is available it is preferred; existing cleared Dance/Drum-and-bass practice assets provide a fallback. The existing published house vocal sample retains its spaced-vocal eligibility, with three instrumental selections between vocal selections. No new music generation, paid worker or publication occurred.

Only two prepared tracks are retained; the ten-minute original is never fully decoded by the browser. Excerpts are prepared serially with a single ffmpeg thread, browser engines are tested sequentially, and only short captures are retained. Disk free space was about 22 GiB before and 23 GiB after the work; macOS reported 53% system-wide memory free at the initial check. No user apps, source files, recordings or unique evidence were deleted.

To recreate the private bank, run from `apps/site`:

```sh
npm run ai-dj:reference -- /absolute/path/to/blood_club.mp3
```

## Verification

The flow under test is `/ai-dj` → Start → automatic loop → Play together → roll/backspin/cue/echo/jog/release → Stop with a future return pending → silence. Browser runtime tooling was unavailable; the existing Playwright fallback was used. No new dependency was installed.

| Gate | Status | Evidence |
| --- | --- | --- |
| Website tests and typecheck | PASS | 112 tests, including reference metadata validation and performance transport arithmetic. |
| Build and client bundle audit | PASS | Production build and existing secret/static-asset audit. |
| Page identity, meaningful content, no overlay, console health | PASS | Chromium and WebKit; no page errors in both browser suites. |
| Responsive layout and scoped accessibility | PASS | 1440, 800, 390 and 320 pixels; no horizontal overflow, scoped Axe checks pass. Desktop and phone screenshots inspected. |
| Actual audio transformations | PASS | Both engines render eleven actions through OfflineAudioContext. Each changes real PCM from baseline; all samples are finite and measured peaks remain below 1. |
| Watching and controlling the deck | PASS | Automatic lit loop pad; real loop/roll buffers; reversed backspin slice; hot cue seek; echo parameters; pointer jog; loop release; exact active-pad color. |
| Playback lifecycle and recovery | PASS | Two-deck crossfade, unattended transition, spaced vocal selection, ending/cancellation, stop during load, corrupt-source recovery, hidden-tab stop, and no playback after a scheduled loop return is cancelled. Test speakers remain muted. |
| Private reference boundaries | PASS | Invalid IDs and cross-site requests return 404. All three preview routes return 404 in production. Private assets absent from production file traces. |
| Human musical acceptance / verified beat grid | NOT RUN | Tempo estimates remain provisional. Bass-focused diagnostics did not establish a verified reference grid; no claim of beat/downbeat, key or loudness qualification. |
| 30–60 minute / venue / background reliability | NOT RUN | Short local browser checks; hiding the page stops it. |
| Live AI generation, push and deployment | NOT RUN | Prepared audio and deterministic direction rules; no paid generation or publication. |

Commands from `apps/site`: `npm test`, `npm run typecheck`, `npm run build`, `npm run audit:bundle`, `npm run test:ai-dj-browser`. The browser command runs the playback/recovery suite followed by the performance suite. The latter includes direct PCM rendering checks and real UI controls, not mocked audio actions.

[Machine-readable evidence](evidence/ai-dj-performance-20261024/verification.json). A 12-second WAV capture also passes finite-PCM, non-silence and peak checks (peak 0.636). Local screenshots, short mixer recordings and raw browser reports remain in ignored `renders/ai-dj-performance-20261024/`.

## Remaining quality work

Listen to the reference-driven set and judge timing, restraint, transitions and whether the moves feel musical. Calibrate beat/downbeat grids, compatible keys and loudness before professional/venue claims or generation-ahead. The bass-focused diagnostic changed several pulse estimates without establishing ground truth, so it was not promoted as a verified tempo detector. Technical PCM tests prove sound manipulation; they do not prove that the performance sounds good.
