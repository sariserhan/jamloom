"""Improvise-only arrangement choice; this is direction, not a quality judgment."""
import hashlib

INSTRUMENTAL_STYLES = {
    'house': 'house, four-on-the-floor drums, rounded dance bass, rich chords and evolving melodic hooks',
    'drumandbass': 'liquid drum and bass, fast broken drums, deep rolling bass, atmospheric chords and melodic development',
    'edm': 'melodic EDM, driving drums, layered synthesizers, rising builds and a developed drop',
    'dj': 'DJ club performance, dance drums, looping bass groove, filtered percussion, breakdown and drop',
    'techno': 'techno, pounding four-on-the-floor drums, pulsing sequenced bass, metallic percussion and evolving synth textures',
    'funk': 'live funk, syncopated electric bass, tight pocket drums, muted rhythm guitar, clavinet and horn interplay',
    'jazz': 'small-group jazz, swinging brushed drums, walking upright bass, piano and saxophone improvisation',
    'lofi': 'lo-fi, loose dusty drums, mellow jazz chords, soft bass, warm tape texture and developing melodic motifs',
    'chill': 'chill downtempo, spacious percussion, floating pads, warm bass and gentle melodic guitar',
    'synthwave': 'synthwave, analog arpeggios, gated drums, pulsing synth bass, lush pads and soaring melodic hooks',
}


def choose_instrumental(genre, voice, seed):
    if voice not in ('surprise', 'male', 'female') or type(seed) is not int or not 0 <= seed < 2**32:
        raise ValueError('Invalid Improvise vocal choice')
    # Explicit singer choices always win. Automatic arrangements keep sung
    # replies as the majority, with music-led alternatives in suitable styles.
    value=int.from_bytes(hashlib.sha256(f'jamloom-improvise-vocals-1:{genre}:{seed}'.encode()).digest()[:8],'big')
    return voice == 'surprise' and genre in INSTRUMENTAL_STYLES and value % 3 == 0
