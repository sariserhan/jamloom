# Popular-song karaoke preparation

2026-10-26. **PASS supplier/catalogue research; BLOCKED playable lessons pending permissions and assets.** The owner asked to proceed with six recognizable songs. Work remains local; no audio/lyrics downloaded, no purchases, no provider contact and no new paid compute.

## Exact candidate recordings

These are supplier-produced covers, not the named artists' original masters. All six provider pages list an instrumental and karaoke formats. Availability in their catalogue does not grant Jamloom embedding or distribution rights. Durations and keys describe these exact versions; timestamps from another recording cannot be reused.

| Song / artist | Supplier serial | Instrumental ISRC | Length | Key / nominal tempo |
|---|---:|---|---|---|
| [Bad Romance — Lady Gaga](https://www.tencymusic.com/music-licensing/lady-gaga/bad-romance.html) | 25701 | FR3Z80905225 | 4:23 | Am / 119 BPM |
| [Do I Wanna Know? — Arctic Monkeys](https://www.tencymusic.com/music-licensing/arctic-monkeys/do-i-wanna-know.html) | 44323 | FR3Z81306416 | 4:33 | Gm / 85 BPM |
| [Don't Stop Me Now — Queen](https://www.tencymusic.com/music-licensing/queen/don-t-stop-me-now.html) | 12257 | FR3Z80701952 | 3:46 | F / variable, around 148 BPM |
| [Eenie Meenie — Justin Bieber & Sean Kingston](https://www.tencymusic.com/music-licensing/justin-bieber/eenie-meenie.html) | 29498 | FR3Z81013077 | 3:22 | Bbm / 121.18 BPM |
| [lovely — Billie Eilish & Khalid](https://www.tencymusic.com/music-licensing/billie-eilish/lovely.html) | 56015 | FR3Z81803018 | 3:18 | Em / 115 BPM |
| [Someone You Loved — Lewis Capaldi](https://www.tencymusic.com/music-licensing/lewis-capaldi/someone-you-loved.html) | 57377 | FR3Z81900786 | 3:03 | Db / 110 BPM |

The first five references explicitly identify versions without backing vocals. The sixth lists a single instrumental version; verify its contents before acceptance. [Machine-readable acquisition shortlist](evidence/singing-popular-20261026/catalogue.json). No entries are connected to the playable lesson registry.

## Supplier and permission findings

Tency advertises app licensing, instrumental/cover/stem delivery and metadata including tempo maps, structure, lyrics and cues. This fits the asset requirements better than extracting vocals from consumer streams. Its public page does not confirm that each of these six recordings includes a machine-readable lead melody or word-level timestamps; those are explicit enquiry items. [Services](https://www.tencymusic.com/services.php).

Tency states that its license covers the supplied master; composition and lyric-display permissions may need separate clearance. Its publishing guidance names Easy Song Licensing (USA) and Blokur (Europe) as possible partners. No all-rights agreement is established. [Rights scope](https://www.tencymusic.com/help/licensing_52.html), [publishing guidance](https://www.tencymusic.com/help/licensing_55.html).

For this use, pricing is an unknown custom quote, not the price of a consumer download or karaoke subscription. The supplier requests exact tracks, versions, use, audience and term. Prepared scope is in [the unsent enquiry](SINGING_LICENSING_ENQUIRY.md). No price, availability by country or royalty obligation is invented. [Quote requirements](https://www.tencymusic.com/help/pricingdelivery_57.html).

## Existing-code compatibility review

The live microphone worklet, MIT pitch detector, canvas trace, full-lyric highlighting and native cleanup can be retained. Existing songs use a known original score and synthetic backing on one AudioContext; they are not a general recorded-karaoke loader.

Changes needed after asset format and permission are confirmed:

1. Load the authorized backing and cue/score data for one exact recording; verify hashes, duration, permitted territory/term and version. Keep private masters out of public static/offline/native bundles unless distribution is expressly permitted.
2. Add recorded backing playback to the current singing session and stop lifecycle. Use its actual playback position for lyrics and target pitch; align microphone sample timestamps to that position. Do not add another DJ engine or independent animation timer. Test count-in, seek, pause, interruptions and final release against actual PCM.
3. Use a checked vocal score rather than the instrumental's dominant pitch. Preserve separately timed syllables, sustained/melismatic notes, instrumental gaps and distinct duet parts for Eenie Meenie and lovely. Supplier lyric cues alone do not establish vocal pitches.
4. Grade bounded phrases: the current `SingingPhrase` allows 96 segments, 0.2–6-second notes and MIDI 45–81; `SingingScore` has a 120-second event horizon. These constraints must not simply be removed to fit 3–5-minute recordings. Segment the vocal score and keep bounded scoring state. Use each recording's timing map, particularly Queen's variable tempo, rather than the original-song 60–128 BPM selector.
5. Confirm permitted key/speed changes before adding controls to recorded tracks. Measure memory and audio quality on iPhone; decoded stereo tracks can exceed 100 MB. Reuse the established player/decoder capabilities where appropriate and keep only required assets active.
6. Run one full lesson end to end first, then admit the remaining five only with aligned lyrics/score and listening evidence. Test wrong-pitch/silence controls, phrase retry, duet selection, progress persistence and all cleanup paths on browser and phone.

Current original lessons remain usable. No misleading playable cards, extracted copyrighted lyrics, guessed melody maps or placeholder instrumentals were shipped. Provider-specific code is deferred until actual deliverable formats are known; the catalogue pages do not specify an integration API.

## Completion gates

- **PASS:** six exact catalogue listings and recording identifiers; metadata-only shortlist; existing engine compatibility audit; concrete supplier enquiry drafted.
- **NOT RUN:** enquiry submission, provider response, price/territory/term negotiation, execution of licenses, delivery of backing/cues/score, playback integration and listening/accuracy acceptance for these songs.
- **HELD:** publication by the owner's “Keep local for now” instruction. Existing prohibition on buying music/licenses remains; this research creates no purchase commitment.
