import json,sys,tempfile,unittest,shutil,subprocess
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_composition import score,render,prepare,RATE

class CompositionTests(unittest.TestCase):
    def value(self,**kwargs):return dict(version=1,session='a'*32,sequence=1,seed=291025,style='house',energy=4,mood='deep')|kwargs
    def test_score_identity_form_and_bounds(self):
        a=score(self.value());self.assertEqual(a,score(self.value()));self.assertNotEqual(a['motif'],score(self.value(seed=301025))['motif'])
        self.assertEqual({e['bus']for e in a['events']},{'kick','drums','bass','chords','hook'})
        self.assertEqual([s['name']for s in a['sections']],['establish','answer','contrast','build','return','handoff'])
        self.assertTrue(all(0<=e['beat']<a['bpm'] and 0<e['duration']<=a['bpm']-e['beat']+.0001 for e in a['events']))
        self.assertTrue(any(e['bus']=='hook' and e['beat']==0 for e in a['events']))
        self.assertFalse(any(e['bus']=='hook' and e['beat']>=112 for e in a['events']))
        self.assertFalse(a['reference_audio_used'])
        with self.assertRaises(ValueError):score(self.value(style='chill'))
        with self.assertRaises(ValueError):score(self.value(beat={'bpm':86,'groove':'rolling'}))
        self.assertNotEqual(score(self.value(style='bass'))['events'],a['events'])
    def test_staged_guide_has_all_dependencies_and_the_predeclared_score(self):
        root=Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory()as d:
            stage=Path(d)
            for name in ('dj_composition.py','dj_track_worker.py','prepare_electronic_bank.py'):
                shutil.copyfile(root/'scripts'/name,stage/name)
            shutil.copyfile(root/'assets/manifests/dj-styles.json',stage/'dj-styles.json')
            run=subprocess.run([sys.executable,'-c','import json,hashlib;from dj_composition import score;print(hashlib.sha256((json.dumps(score(json.loads('+repr(json.dumps(self.value()))+')),indent=2)+"\\n").encode()).hexdigest())'],cwd=stage,check=True,capture_output=True,text=True)
            import hashlib
            self.assertEqual(run.stdout.strip(),hashlib.sha256((json.dumps(score(self.value()),indent=2)+'\n').encode()).hexdigest())

    def test_guided_set_routes_hooks_without_source_conditioning(self):
        from unittest.mock import patch
        from dj_track_worker import composition_set
        with patch('dj_track_worker.ace',return_value='audio')as generate:
            self.assertEqual(composition_set(self.value(sequence=2),Path('/tmp')), 'audio')
            self.assertTrue(generate.call_args.kwargs['guided'])
            composition_set(self.value(sequence=2),Path('/tmp'),hook='We rise')
            self.assertFalse(generate.call_args.kwargs['guided']);self.assertEqual(generate.call_args.kwargs['hook'],'We rise')
    def test_direction_changes_score_and_closing_removes_build_rolls(self):
        base=self.value(style='bass',beat={'bpm':140,'groove':'syncopated'})
        kept=score(base);changed=score(base|{'beat':{'bpm':140,'groove':'rolling'}})
        self.assertNotEqual([e for e in kept['events']if e['bus']=='kick'],[e for e in changed['events']if e['bus']=='kick'])
        closing=score(base|{'energy':2})
        self.assertLess(sum(e['velocity']for e in closing['events']),sum(e['velocity']for e in kept['events']))
        self.assertLess(len([e for e in closing['events']if 88<=e['beat']<96]),len([e for e in kept['events']if 88<=e['beat']<96]))

    def test_render_stems_silence_and_determinism(self):
        a=render(score(self.value()));b=render(score(self.value()));mix=sum(a.values())
        self.assertEqual(mix.shape,(60*RATE,2));self.assertLess(np.max(np.abs(mix)),.851)
        self.assertTrue(all(np.array_equal(a[k],b[k])for k in a))
        self.assertTrue(np.array_equal(a['bass'][:,0],a['bass'][:,1]));self.assertFalse(np.array_equal(a['hook'][:,0],a['hook'][:,1]))
        self.assertTrue(all(np.sqrt(np.mean(mix[i*RATE:(i+1)*RATE]**2))>.001 for i in range(60)))
        with tempfile.TemporaryDirectory()as d:
            p=Path(d)/'guide';r=prepare(self.value(),p)
            self.assertEqual(r['bpm'],128);self.assertEqual(len(r['guide_sha256']),64)
            with self.assertRaises(FileExistsError):prepare(self.value(),p)

if __name__=='__main__':unittest.main()
