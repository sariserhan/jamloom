import copy
import json
import tempfile
from unittest.mock import patch
from types import SimpleNamespace
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from music_dna_song import favorites, draft
from dna_direction import direction_for
from dna_sound import unknown


class LyricSectionRepair(unittest.TestCase):
    def setUp(self):
        self.refs = favorites({'references': ['A — Artist One', 'B — Artist Two'],
                               'referenceMetadata': [{'reference': 'A — Artist One', 'genre': 'Soul'}]})
        self.data = {'title': 'A new day', 'summary': 'A warm, intimate direction, based partly on genre.',
                     'influences': [{'index': 1, 'basis': 'genre_only', 'description': 'Warm soul harmony'},
                                    {'index': 2, 'basis': 'unknown', 'description': 'Unknown recording'}],
                     'sound': 'Live brushed drums, warm piano and an expressive vocal crescendo',
                     'direction_id': 'soul', 'energy': direction_for(self.refs)['energy'], 'instruments': direction_for(self.refs)['instruments'], 'voice': 'female', 'bpm': 94,
                     'lyrics': '\n'.join('['+s+']\n'+'New days bring us closer to the light\n'*4
                                         for s in ['Verse 1', 'Chorus', 'Verse 2', 'Bridge', 'Chorus', 'Outro'])}


    def test_line_count_repair_preserves_other_sections_and_rejects_extra_changes(self):
        from music_dna_song import structured_lyrics
        parts={key:[f"We carry every {word} toward the morning light" for word in words]
               for key,words in [('verse_1',['letter','promise','memory','story']),
                                 ('chorus',['hope','song','dream','voice']),
                                 ('verse_2',['lantern','parcel','picture','message']),
                                 ('bridge',['question','answer']),('outro',['kindness'])]}
        for invalid,repairs in [({'outro':parts['outro']*3},{'outro':parts['outro']}),
                                ({'bridge':[], 'outro':[]},{'bridge':parts['bridge'],'outro':parts['outro']})]:
            with self.subTest(invalid=invalid):
                data={**copy.deepcopy(self.data),'lyrics':{**parts,**invalid}}
                # A repair may not replace valid sections or unrelated plan fields.
                outputs=iter([data,{'lyrics':{**repairs,'chorus':['unrequested change']*4}}, {'lyrics':repairs}])
                prompts=[]
                def generate(*args,**kwargs):
                    messages=json.loads(kwargs['prompt'])
                    if messages[0]['content'].startswith('Describe how each'):
                        batch=json.loads(messages[1]['content'])['favorites']
                        return json.dumps({'tracks':[{'index':i+1,**unknown(ref)} for i,ref in enumerate(batch)]})
                    prompts.append(messages);return json.dumps(next(outputs))
                tokenizer=SimpleNamespace(apply_chat_template=lambda messages,**kwargs:json.dumps(messages))
                with tempfile.TemporaryDirectory() as folder,patch('music_dna_song.planner_functions',return_value=(lambda _:None,generate,lambda **_:None)),patch('music_dna_song.lyric_model',return_value=(None,tokenizer,{'revision':'fixture'})):
                    work=Path(folder);profile={'references':[r['reference'] for r in self.refs],'referenceMetadata':[{'reference':self.refs[0]['reference'],'genre':'Soul'}],'vocalLanguage':'en'}
                    (work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(self.refs),'seed':123,'duration_seconds':140}))
                    draft(work);plan=json.loads((work/'plan.json').read_text())
                self.assertEqual(len(prompts),3)
                for prompt in prompts[1:]:
                    request=json.loads(prompt[1]['content'])
                    self.assertEqual(set(request['repair_sections']),set(repairs))
                    self.assertEqual(request['repair_sections']['outro'],[1,2])
                    self.assertEqual(request['draft_lyrics'],data['lyrics'])
                self.assertEqual(plan['cases'][0]['lyrics'],structured_lyrics(parts))
                self.assertEqual(plan['title'],self.data['title'])


    def test_invalid_section_repairs_stop_at_the_existing_attempt_limit(self):
        data={**copy.deepcopy(self.data),'lyrics':{key:[] for key in ['verse_1','chorus','verse_2','bridge','outro']}}
        calls=[]
        def generate(*args,**kwargs):
            messages=json.loads(kwargs['prompt'])
            if messages[0]['content'].startswith('Describe how each'):
                batch=json.loads(messages[1]['content'])['favorites']
                return json.dumps({'tracks':[{'index':i+1,**unknown(ref)} for i,ref in enumerate(batch)]})
            calls.append(messages)
            return json.dumps(data if len(calls)==1 else {'lyrics':data['lyrics']})
        tokenizer=SimpleNamespace(apply_chat_template=lambda messages,**kwargs:json.dumps(messages))
        with tempfile.TemporaryDirectory() as folder,patch('music_dna_song.planner_functions',return_value=(lambda _:None,generate,lambda **_:None)),patch('music_dna_song.lyric_model',return_value=(None,tokenizer,{'revision':'fixture'})):
            work=Path(folder);profile={'references':[r['reference'] for r in self.refs],'referenceMetadata':[{'reference':self.refs[0]['reference'],'genre':'Soul'}],'vocalLanguage':'en'}
            (work/'input.json').write_text(json.dumps({'profile':profile,'direction':direction_for(self.refs),'seed':123}))
            with self.assertRaisesRegex(ValueError,'sung lines'):draft(work)
            self.assertFalse((work/'plan.json').exists())
        self.assertEqual(len(calls),4)


if __name__ == '__main__':unittest.main()
