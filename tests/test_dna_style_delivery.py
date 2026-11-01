"""A genre warning must never bypass technical validation or spend on another take."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import music_dna_song as song

class StyleDelivery(unittest.TestCase):
    def test_one_render_and_unchanged_assessment(self):
        for accepted,technical in [(True,'PASS'),(False,'PASS'),(False,'FAIL'),(False,None)]:
            with self.subTest(accepted=accepted,technical=technical),tempfile.TemporaryDirectory() as folder:
                work=Path(folder);direction={'id':'jazz'}
                (work/'input.json').write_text(json.dumps({'profile':{'references':['Fixture']}}))
                fit={'accepted':accepted,'technical':technical,'delivery_policy':'style-guidance-v1'}
                def process(command,**kwargs):
                    if command[2]=='draft':
                        (work/'plan.json').write_text(json.dumps({'input_sha256':song.digest(work/'input.json'),'direction':direction,'cases':[{'id':'fixture'}]}))
                    else:(work/'singer').mkdir()
                def check(work,env):(work/'fit.json').write_text(json.dumps(fit))
                with patch.object(song,'favorites',return_value=[]),patch.object(song,'direction_for',return_value=direction),patch.object(song.subprocess,'run',side_effect=process) as called,patch.object(song,'check_render',side_effect=check):
                    if technical=='PASS':song.run(work)
                    else:
                        with self.assertRaisesRegex(ValueError,'technical'):song.run(work)
                self.assertEqual(called.call_count,2)
                self.assertEqual(json.loads((work/'fit.json').read_text()),fit)
                self.assertEqual(json.loads((work/'status.json').read_text())['state'],'completed' if technical=='PASS' else 'failed')
                self.assertFalse((work/'rejected-1').exists())

if __name__=='__main__':unittest.main()
