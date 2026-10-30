"""Exercise the actual worker plan-file boundary without models or hosted calls."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile

checkout = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(checkout / 'scripts'))
from music_dna_song import song_plan
from dna_direction import direction_for
from dna_sound import unknown
from singing_response import load_plan, CODE_REVISION, WEIGHT_REVISION

assert Path(load_plan.__code__.co_filename).resolve() == checkout / 'scripts/singing_response.py'
refs = [{'reference': f'Track {i} — Singer {i}', 'catalogue_genre': 'Soul'} for i in range(5000)]
direction = direction_for(refs)
data = {'title': 'Boundary fixture', 'summary': 'Genre-only fixture, not a listening result.',
        'influences': [{'index': i + 1, 'basis': 'genre_only', 'description': 'Catalogue genre only.'} for i in range(2)],
        'sound': 'Live drums, expressive bass and warm organ', 'direction_id': direction['id'],
        'energy': direction['energy'], 'instruments': direction['instruments'], 'voice': 'female', 'bpm': 94,
        'lyrics': '\n'.join('[' + section + ']\n' + 'New days bring us closer to the light\n' * 4
                           for section in ['Verse 1', 'Chorus', 'Verse 2', 'Bridge', 'Chorus', 'Outro'])}
plan = song_plan(data, refs[:2], 123, all_refs=refs, track_profiles=[unknown(ref) for ref in refs])
with tempfile.TemporaryDirectory() as folder:
    path = Path(folder) / 'plan.json'
    raw = json.dumps(plan, ensure_ascii=False, indent=2).encode()
    assert len(raw) > 262144
    path.write_bytes(raw)
    assert load_plan(path) == plan
    for field in ('favorites', 'influences', 'track_profiles'):
        assert len(plan[field]) == 5000 and plan[field][-1]['reference'] == refs[-1]['reference']
        path.write_text(json.dumps({**plan, field: plan[field] + [plan[field][-1]]}))
        try:
            load_plan(path)
        except ValueError:
            pass
        else:
            raise AssertionError('Unbounded reference count: ' + field)
    path.write_bytes(raw + b' ' * (12 * 1024 * 1024))
    try:
        load_plan(path)
    except ValueError:
        pass
    else:
        raise AssertionError('Unbounded DNA file')
    reply = {'schema': 'jamloom-sung-response-1', 'model_code': CODE_REVISION, 'weights': WEIGHT_REVISION,
             'phrase': 'I have a question', 'cases': [{'id': 'funk-male', 'genre': 'funk', 'voice': 'male',
             'seed': 123, 'duration': 35, 'bpm': 108, 'source_repetitions': 1,
             'lyrics': 'You have a question and I am listening'}]}
    path.write_text(json.dumps(reply));assert load_plan(path) == reply
    path.write_text(json.dumps(reply) + ' ' * 262144)
    try:
        load_plan(path)
    except ValueError:
        pass
    else:
        raise AssertionError('Reply size budget changed')
print(json.dumps({'status': 'PASS', 'source_root': str(checkout), 'fixture_bytes': len(raw),
                  'references_retained_per_list': 5000, 'oversized_reference_lists_rejected': 3,
                  'dna_file_budget_enforced': True, 'reply_original_budget_enforced': True,
                  'source_sha256': hashlib.sha256((checkout / 'scripts/singing_response.py').read_bytes()).hexdigest(),
                  'hosted_calls': 0}))
