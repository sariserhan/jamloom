"""Paired text-only club-generation benchmark; no reference audio or adapters."""
CASES = []
for style, bpm, seed, character in [
    ('house', 124, 61024, 'warm chord stabs, syncopated bass answers, swung offbeat hats'),
    ('tech-house', 128, 61025, 'dry punchy drums, rolling bass, sparse percussive hook and deliberate rests'),
    ('techno', 136, 61026, 'driving four-on-the-floor kick, pulsing low bass, evolving rhythmic synth motif'),
]:
    baseline = f'Instrumental {style}, {bpm} BPM. Club music with drums, bass and synthesizers. No vocals.'
    revised = (f'Original instrumental {style}, {bpm} BPM, {character}. '
               'A short DJ-friendly percussion intro, a clear rhythmic motif, an eight-bar rise, '
               'a strong bass-and-kick drop, brief contrast and a changed return. '
               'Keep the kick and bass separated, controlled low end, expressive percussion accents, '
               'purposeful fills at phrase ends and room between phrases. No vocals or spoken words.')
    CASES.extend([(style+'-baseline', baseline, bpm, seed, False),
                  (style+'-phrased', revised, bpm, seed, False)])

assert len(CASES) == 6 and all(not row[4] for row in CASES)

# Owner accepted both house arms and rejected the other genres; this is development, not held-out validation.
REVISION_CASES = []
for brief, seed, character in [
    ('driving', 71024, 'Warm chord stabs, short syncopated bass answers, crisp swung offbeat hats and claps. Clear eight-bar phrases, a brief percussion fill before a strong bass return, clean percussive ending.'),
    ('rolling', 71025, 'Rolling bass groove, crisp clap, shuffled high hats and a sparse memorable percussive synth hook. Layer percussion into the hook, one brief stripped-back phrase, immediate full-drum return and a DJ-friendly percussion outro.'),
]:
    for bpm in (128, 132):
        caption = (f'Original instrumental energetic club house, {bpm} BPM. '
                   'Punchy four-on-the-floor kick and tight bass from the first beat. '
                   'Maintain a strong continuous dancefloor groove through most of the track. '
                   + character + ' No vocals.')
        REVISION_CASES.append((f'{brief}-house-{bpm}', caption, bpm, seed, False))
assert len(REVISION_CASES) == 4 and all(row[2] in (128,132) and not row[4] for row in REVISION_CASES)
