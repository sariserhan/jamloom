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
