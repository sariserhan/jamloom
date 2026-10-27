# Singing Academy — no-license-fee catalogue, 2026-10-27

**PASS local implementation and controlled browser/audio qualification; human listening and physical installation NOT RUN. Publication HELD.** No license purchase, GPU rental, new paid service, external message or deployment.

## Delivered repertoire

The catalogue grows from eight to **twelve** songs while retaining the twelve warm-ups and **$39 USD once** course offer. “No license fee” describes our content procurement, not a change to the course price. Existing access controls remain: when sales/entitlement gating applies, the free content remains warm-ups and First Light.

| Added lesson | Material | Practice focus |
| --- | --- | --- |
| Paper Kites | New Jamloom original, acoustic-soul backing | Melodic leaps and relaxed phrasing |
| Neon Tide | New Jamloom original, electronic-pop backing | Short entries and sustained vowels |
| Frère Jacques | Traditional French melody/words, new Jamloom groove | Complete round twice; connected syllables and repeat phrasing |
| Ode to Joy | Beethoven theme, new Jamloom English practice lyrics/backing | Stepwise melody, dotted rhythm and bridge |

These are bounded approximately 37–49-second practice arrangements, with instrumental piano melody guides, not recordings by the original artists or newly generated human singers. They are not substitutes labelled as the six requested chart hits. Full lyrics, current/upcoming words, live pitch, section practice and repeated attempts use the existing engine and audio clock.

## Rights and sources

[Machine-readable inventory](../assets/manifests/singing-catalogue.json) separates composition, lyrics, recording, alterations and training scope. [Pinned source hashes](../assets/licenses/singing/sources.json) and [bundled notice](../assets/licenses/SINGING-REPERTOIRE.txt) retain provenance.

- **Ode to Joy:** [Mutopia 528](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=528), typeset by Peter Chubb, marked Public Domain; [Mutopia dedication terms](https://www.mutopiaproject.org/legal.html). We use its melody, not its recorded MIDI/audio. English practice lyrics are newly authored for Jamloom. The bridge’s low cadence is lifted one octave for the supported registers; new accompaniment is rendered locally.
- **Frère Jacques:** [Noctave’s score](https://noctavepiano.com/en/sheet-music/trad-frere-jacques/) declares CC0 1.0, with the declaration inside its retained MusicXML. Traditional French words/melody have an eighteenth-century historical basis; [historical catalogue](https://imslp.org/wiki/Frère_Jacques_(Rameau,_Jean-Philippe)). We lift the low closing bell one octave and use our own backing. No modern translation, Noctave recording, artwork, branding or application code is included.
- **Originals:** no outside score, lyric or recording imported; the existing cleared instrument bank supplies the sound.
- **CC/independent-artist research:** Josh Woodward is a promising vocal/instrumental lead but first-party terms were inaccessible; Scott Buckley’s page combines CC BY with additional standalone-use wording, and does not supply verified vocal targets. Both remain unadmitted. Jamendo’s paid catalogue is excluded from this procurement. No bulk downloading or AI training occurred.

The rights basis applies to these selected sources and our arrangements, not every recording or modern adaptation of the same title. Artist voice/model training, private learner recordings and generative-product use are not inferred from lesson rights.

## Tency and outreach

The owner pasted Tency’s reply: €30/track/year US, €70/track/year worldwide, including stems, metadata and LRCs, with/without lead and backing vocals. Six masters would be €180 or €420; composition clearance remains separate. No complete all-rights price or vocal pitch score is confirmed. **No order accepted or payment made.** The six famous titles remain held and absent from playable lessons.

[Prepared artist and Tency follow-ups](SINGING_ARTIST_OUTREACH.md) specify commercial lessons, full lyrics, target melody, key/tempo practice, delivery and annotations. They request no-cost/non-binding terms and exclude training, cloning and public cover redistribution. **Prepared, not sent.** External artist permissions and a complete composition quote remain external work, not completed agreements.

## Implementation and verification

The shared course adds two originals and two score-based arrangements; there is no second engine. Whole-word lyric highlights now remain on the same word through multiple notes. Section accompaniment derives its starting bar from the source phrase. All eight existing songs retain exactly the same notes, lyrics, timings and 80 compared backing/guide event sequences.

- **PASS:** 24 audio/course/offline tests, including all songs at all supported registers/paces, silence and constant-note rejection, phrase boundaries, melisma highlights, source-section harmony, pinned source hashes and progress preservation.
- **PASS:** 165 website tests; two course access/payment-fixture tests on a disposable local PostgreSQL database; TypeScript and production build. The payment fixture is not new Apple/provider evidence.
- **PASS:** four actual WASM renders, MP3 encode/decode, finite PCM, nonzero signal and no clipping. Files in `renders/singing-free-catalogue/` total about 2.7 MB; no giant PCM intermediates retained. This is technical audio validation, not listening approval.
- **PASS:** audited browser/offline asset allowlists include the new repertoire notice. Native studio assets are prepared using the same course and notice; the iPhone catalogue and course copy are updated in source.
- **PASS:** Chromium 149 and WebKit 26.5, desktop 1280/mobile 390 px: twelve-song catalogue, automated accessibility, pricing, actual WASM audio for all four additions, whole-word highlights, synthetic section completion, microphone stop, full Ode to Joy/Frère Jacques completion and preserved progress after reload. No uncaught page errors. [Browser result](evidence/singing-free-catalogue-20261027/browser.json).
- **NOT RUN:** human listening acceptance, physical singer accuracy on these songs, new native archive/install/device verification, manual screen reader, global legal opinion and any publication.

[Evidence directory](evidence/singing-free-catalogue-20261027/).

## Reproduce and review

```sh
node --test apps/web/tests/singing*.test.js apps/web/tests/offline-build.test.js
node scripts/render_singing_catalogue.mjs
python3 scripts/prepare_ios_studio.py
cd apps/site
npm test
JAMLOOM_TEST_DATABASE_URL=postgresql://127.0.0.1:5432/postgres node --import tsx --test tests/apple-course.test.ts
npm run typecheck
JAMLOOM_QUALIFICATION_BUILD=1 npm run build
SINGING_BASE_URL=http://127.0.0.1:3010 node tests/singing-catalogue-browser.mjs
```

Browser screenshots go to `/tmp/jamloom-free-songs-qa`. The built local preview is http://127.0.0.1:3010/singing-academy. The installed iPhone still has its prior catalogue until a new native build is installed. Sales remain closed, prices unchanged, and the publication hold remains in force.
