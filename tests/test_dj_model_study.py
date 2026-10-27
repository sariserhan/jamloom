import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch, MagicMock
import uuid
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from dj_model_study import cases, parameters, verify_base, ModelStudy, BASE_REVISION
from dj_sample_trial import validate_model_study
from dj_warm_engine import Renderer


class ModelStudyTests(unittest.TestCase):
    def test_genre_matrix_and_new_permit_preserve_existing_studies(self):
        rows=cases(genres=True)
        self.assertEqual([r['request']['style'] for r in rows],['house','tech-house','techno']*2)
        self.assertTrue(all(r['instrumental'] and not r['vocals'] and r['seconds']==60 for r in rows))
        for a,b in zip(rows[:3],rows[3:]):
            self.assertEqual(a['caption'],b['caption'])
            self.assertEqual(a['request']['seed'],b['request']['seed'])
            self.assertEqual(a['bpm'],b['bpm'])
        self.assertTrue(all(r['request']['session']!=cases()[0]['request']['session'] for r in rows))
        with self.assertRaises(ValueError):cases(consistency=True,genres=True)
        plan=json.loads((ROOT/'docs/evidence/dj-genre-models-20261027/gpu-plan.json').read_text())
        plan['status']='PREPARED'
        with self.assertRaises(ValueError):validate_model_study(plan,genres=True)
        plan.update(status='AUTHORIZED',owner_statement='Approve the capped $3 genre-model comparison')
        with self.assertRaises(ValueError):validate_model_study(plan,genres=True)
        plan['controller_sha256']=hashlib.sha256((ROOT/'scripts/dj_sample_trial.py').read_bytes()).hexdigest()
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        validate_model_study(plan,genres=True)
        for change in ({'owner_statement':'do all'},{'max_requests':7},{'max_workers':2},{'max_minutes':41},{'budget_usd':4},{'replacements':True},{'public_activation':True},{'controller_sha256':'0'*64}):
            with self.assertRaises(ValueError):validate_model_study({**plan,**change},genres=True)
        with self.assertRaises(ValueError):validate_model_study(plan)
        import dj_sample_trial as trial
        with tempfile.TemporaryDirectory() as folder:
            evidence=Path(folder);(evidence/'gpu-plan.json').write_text(json.dumps({**plan,'status':'PREPARED'}))
            with patch.object(trial,'MODEL_STUDY',True),patch.object(trial,'GENRES',True),patch.object(trial,'EVIDENCE',evidence),patch.object(trial.vast,'instances') as provider:
                with self.assertRaises(ValueError):trial.preflight()
                provider.assert_not_called()
        from vast_trial import dj_bootstrap_command
        self.assertIn(' 6 --genre-study >',dj_bootstrap_command(1900000000,6,genres_study=True))
        with self.assertRaises(ValueError):dj_bootstrap_command(1900000000,6,genres_study=True,model_study=True)

    def test_fresh_consistency_preserves_preferred_recipes_and_needs_its_own_permit(self):
        rows=cases(True); originals=cases()
        self.assertEqual(len(rows),6)
        self.assertEqual([r['request']['seed'] for r in rows],[701026,711026,721026]*2)
        for index,row in enumerate(rows):
            original=originals[2 if index<3 else 5]
            self.assertEqual({k:v for k,v in row.items() if k!='request'}, {k:v for k,v in original.items() if k!='request'})
            self.assertEqual(row['request']['sequence'],index)
        plan=json.loads((ROOT/'docs/evidence/dj-preferred-consistency-20261026/gpu-plan.json').read_text())
        plan['status']='PREPARED'
        with self.assertRaises(ValueError):validate_model_study(plan,True)
        plan.update(status='AUTHORIZED',owner_statement='Approve the capped $3 preferred-music consistency study')
        with self.assertRaises(ValueError):validate_model_study(plan,True)
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        validate_model_study(plan,True)
        with self.assertRaises(ValueError):validate_model_study(plan,False)
        with self.assertRaises(ValueError):validate_model_study({**plan,'max_requests':7},True)

    def test_consistency_can_use_quoted_4090_without_relaxing_memory_or_region(self):
        import dj_sample_trial as trial
        offer=dict(host_id=999999,gpu_name='RTX 4090',geolocation='Michigan, US',cpu_ram=128000)
        evidence=ROOT/'docs/evidence/dj-preferred-consistency-20261026'
        with patch.object(trial,'validate',return_value=None),patch.object(trial,'CONSISTENCY',True),patch.object(trial,'MODEL_STUDY',True),patch.object(trial,'EVIDENCE',evidence),patch.object(trial.vast,'instances',return_value=[]),patch.object(trial.vast,'api',return_value={'credit':3}):
            with patch.object(trial.vast,'offers',side_effect=lambda host=None,**kwargs: [] if host else [offer]):
                self.assertEqual(trial.preflight()[2],offer)
            for change in [dict(cpu_ram=32000),dict(geolocation='Sweden, SE'),dict(gpu_name='RTX A5000')]:
                with patch.object(trial.vast,'offers',side_effect=lambda host=None,**kwargs: [] if host else [{**offer,**change}]):
                    with self.assertRaisesRegex(RuntimeError,'No compatible'):trial.preflight()

    def test_offer_query_filters_memory_before_the_thirty_result_limit(self):
        import vast_trial as vast
        with patch.object(vast,'api',return_value={'offers':[]}) as call:
            self.assertEqual(vast.offers(minimum_ram=60000),[])
            self.assertEqual(call.call_args.args[2]['cpu_ram'],{'gte':60000})
            with self.assertRaises(ValueError):vast.offers(minimum_ram=1)
            self.assertEqual(call.call_count,1)

    def test_pairs_share_composition_controls_and_retain_the_planner(self):
        rows=cases();self.assertEqual(len(rows),6)
        for a,b in zip(rows[:3],rows[3:]):
            self.assertEqual({**a['request'],'sequence':b['request']['sequence']},b['request'])
            self.assertEqual({k:v for k,v in parameters(a).items() if k not in ('inference_steps','use_adg','shift')},
                             {k:v for k,v in parameters(b).items() if k not in ('inference_steps','use_adg','shift')})
            self.assertTrue(parameters(a)['thinking']);self.assertEqual(parameters(a)['inference_steps'],8)
            self.assertEqual(parameters(b)['inference_steps'],64);self.assertTrue(parameters(b)['use_adg'])
        self.assertEqual([r['instrumental'] for r in rows],[True,True,False]*2)

    def test_permit_rejects_generic_approval_changed_scope_and_expired_worker_hashes(self):
        plan=json.loads((ROOT/'docs/evidence/dj-model-comparison-20261026/gpu-plan.json').read_text())
        with self.assertRaises(ValueError):validate_model_study({**plan,'status':'PREPARED'})
        # The consumed permit must not authorize the later retention repair.
        with self.assertRaises(ValueError):validate_model_study(plan)
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        plan.update(status='AUTHORIZED',owner_statement='Approve the capped $3 base-model comparison')
        validate_model_study(plan)
        for key,value in [('owner_statement','finish everything'),('budget_usd',4),('max_minutes',41),('max_requests',7),
                          ('max_workers',2),('replacements',True),('public_activation',True),('source_audio_used',True),
                          ('research_render_limit_seconds',121),('production_render_limit_seconds',120)]:
            with self.subTest(key=key),self.assertRaises(ValueError):validate_model_study({**plan,key:value})
        for kind in ('track','worker','manifest'):
            changed=copy.deepcopy(plan)
            if kind=='track':changed['tracks'][0]['request']['seed']+=1
            elif kind=='worker':changed['worker_sha256']['dj_model_study.py']='0'*64
            else:changed['base_manifest_sha256']='0'*64
            with self.assertRaises(ValueError):validate_model_study(changed)

    def test_unapproved_plan_stops_before_provider_access(self):
        import dj_sample_trial as trial
        plan=json.loads((ROOT/'docs/evidence/dj-model-comparison-20261026/gpu-plan.json').read_text())
        plan['status']='PREPARED'
        with tempfile.TemporaryDirectory() as folder:
            evidence=Path(folder);(evidence/'gpu-plan.json').write_text(json.dumps(plan))
            with patch.object(trial,'MODEL_STUDY',True),patch.object(trial,'EVIDENCE',evidence),patch.object(trial.vast,'instances') as provider:
                with self.assertRaises(ValueError):trial.preflight()
                provider.assert_not_called()

    def test_review_refuses_incomplete_or_changed_campaigns(self):
        from review_dj_models import validate_result
        from dj_track_worker import CODE_REVISION, WEIGHTS_REVISION
        report=dict(status='PASS technical',cleanup_confirmed=True,rental_seconds=100,observed_debit_usd=.1,tracks=[])
        for case in cases():
            proof=dict(model=case['model'],parameters=parameters(case),source_audio_used=False,trained_adapter=False,
                       weights_revision=BASE_REVISION if case['model'].endswith('base') else WEIGHTS_REVISION)
            report['tracks'].append(dict(receipt=dict(request=case['request'],code_revision=CODE_REVISION,
                weights_revision=WEIGHTS_REVISION,compute_ms=1000,vocal=None,model_comparison=proof)))
        validate_result(report)
        for key,value in [('status','FAIL'),('cleanup_confirmed',False),('rental_seconds',2401),('observed_debit_usd',3.01),('tracks',[])]:
            with self.assertRaises(ValueError):validate_result({**report,key:value})
        changed=copy.deepcopy(report);changed['tracks'][0]['receipt']['model_comparison']['parameters']['seed']+=1
        with self.assertRaises(ValueError):validate_result(changed)

    def test_base_manifest_checks_every_file_and_rejects_missing_hashes(self):
        manifest=json.loads((ROOT/'assets/manifests/dj-base-model.json').read_text())
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            for name in manifest['files']:
                content=name.encode();(root/name).write_bytes(content)
                manifest['files'][name]={'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()}
            path=root/'manifest.json';path.write_text(json.dumps(manifest))
            self.assertEqual(verify_base(root,path)['revision'],BASE_REVISION)
            (root/'model.safetensors').write_bytes(b'x'*len('model.safetensors'))
            with self.assertRaisesRegex(ValueError,'checksum'):verify_base(root,path)
            manifest['files']={};path.write_text(json.dumps(manifest))
            with self.assertRaises(ValueError):verify_base(root,path)

    def test_model_switch_releases_old_engine_and_retains_every_raw_candidate(self):
        samples=np.full((2880000,2),.1,dtype=np.float32)
        with tempfile.TemporaryDirectory() as folder:
            work=Path(folder)/'ace-step';work.mkdir();(work.parent/'results').mkdir()
            source=work/'raw.wav';source.write_bytes(b'fake model audio')
            generated=[]
            def generate(dit,lm,params,config,save_dir):
                generated.append(params)
                return SimpleNamespace(success=True,audios=[dict(path=str(source),params={'audio_codes':'<|audio_code_1|>'})])
            torch=MagicMock();lm=SimpleNamespace(llm_initialized=True)
            inference=SimpleNamespace(GenerationParams=lambda **kw:kw,GenerationConfig=lambda **kw:kw,generate_music=generate)
            with patch.dict(sys.modules,{'torch':torch,'soundfile':SimpleNamespace(read=lambda *a,**k:(samples,48000)),
                                         'acestep':SimpleNamespace(),'acestep.inference':inference}),\
                 patch('dj_model_study.Path.cwd',return_value=work),patch('dj_model_study.load_ace',return_value=(object(),lm)) as load,\
                 patch('dj_model_study.verify_base') as verify:
                study=ModelStudy()
                with self.assertRaises(ValueError):study(cases()[1]['request'],work)
                for case in cases():
                    output=work/str(case['request']['sequence']);output.mkdir()
                    study(case['request'],output)
                    proof=json.loads((output/'model-study.json').read_text())
                    self.assertEqual(proof['model'],case['model']);self.assertEqual(proof['parameters'],parameters(case))
                    self.assertFalse(proof['short_hook_qualification'])
                with self.assertRaises(ValueError):study(cases()[5]['request'],work)
                self.assertEqual(load.call_count,2);self.assertEqual(verify.call_count,1)
                self.assertEqual(torch.cuda.empty_cache.call_count,2)
            self.assertEqual(len(list((work.parent/'results').glob('model-raw-*.wav'))),6)
            self.assertEqual(len(generated),6)

    def test_rejected_output_is_retained_without_allowing_a_retry(self):
        for codes in ('', '<|audio_code_1|>'):
            with self.subTest(codes=codes), tempfile.TemporaryDirectory() as folder:
                work=Path(folder)/'ace-step';work.mkdir();(work.parent/'results').mkdir()
                source=work/'raw.wav';source.write_bytes(b'rejected candidate')
                generated=SimpleNamespace(success=True,audios=[dict(path=str(source),params={'audio_codes':codes})])
                inference=SimpleNamespace(GenerationParams=lambda **kw:kw,GenerationConfig=lambda **kw:kw,generate_music=lambda *a,**k:generated)
                with patch.dict(sys.modules,{'torch':MagicMock(),'soundfile':SimpleNamespace(read=lambda *a,**k:(np.zeros((10,2)),48000)),
                                             'acestep':SimpleNamespace(),'acestep.inference':inference}),\
                     patch('dj_model_study.Path.cwd',return_value=work),\
                     patch('dj_model_study.load_ace',return_value=(object(),SimpleNamespace(llm_initialized=True))):
                    study=ModelStudy()
                    with self.assertRaises((ValueError,RuntimeError)):study(cases()[0]['request'],work)
                    self.assertEqual((work.parent/'results/model-raw-0.wav').read_bytes(),source.read_bytes())
                    with self.assertRaises(ValueError):study(cases()[0]['request'],work)
                    self.assertFalse((work/'model-study.json').exists())

    def test_research_deadline_does_not_relax_the_default_live_limit(self):
        signal=np.full((480000,2),.1,dtype=np.float32)
        value=dict(job=str(uuid.uuid4()),request=cases()[0]['request'],vocals=False)
        for seconds,passes in [(30,False),(120,True)]:
            renderer=Renderer(time.time()+300,1,generate=lambda *a:(signal,8000),render_seconds=seconds)
            with patch('dj_warm_engine.time.monotonic',side_effect=[0,31]):
                if passes:self.assertEqual(renderer.render(value)[0]['compute_ms'],31000)
                else:
                    with self.assertRaisesRegex(ValueError,'deadline'):renderer.render(value)
        for seconds in (0,31,121,True):
            with self.assertRaises(ValueError):Renderer(time.time()+300,1,render_seconds=seconds)
        self.assertEqual(Renderer(time.time()+300,1).render_seconds,30)

    def test_packaged_import_and_shell_mode_require_no_repository_data(self):
        with tempfile.TemporaryDirectory() as folder:
            package=Path(folder)/'ace-step';package.mkdir()
            for name in ('dj_model_study.py','dj_track_worker.py','club_benchmark_cases.py'):
                shutil.copyfile(ROOT/'scripts'/name,package/name)
            shutil.copyfile(ROOT/'assets/manifests/dj-styles.json',package/'dj-styles.json')
            code='import sys;sys.path.insert(0,sys.argv[1]);from dj_model_study import cases;assert len(cases())==6;assert len(cases(genres=True))==6'
            result=subprocess.run([sys.executable,'-I','-c',code,str(package)],cwd=folder,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
        from vast_trial import dj_bootstrap_command
        self.assertIn(' 6 --model-study >',dj_bootstrap_command(1900000000,6,model_study=True))
        with self.assertRaises(ValueError):dj_bootstrap_command(1900000000,6,model_study=True,planner_study=True)


if __name__=='__main__':unittest.main()

class FlowStudyTests(unittest.TestCase):
    def test_sparse_distinct_musical_hooks_and_fresh_permission(self):
        rows=cases(flow=True)
        self.assertEqual(len(rows),12)
        self.assertEqual([i for i,r in enumerate(rows) if not r['instrumental']],[2,7])
        self.assertNotEqual(rows[2]['lyrics'],rows[7]['lyrics'])
        self.assertTrue(all(r['model']=='acestep-v15-turbo' for r in rows))
        self.assertTrue(all(r['seconds']==60 and not r['vocals'] for r in rows))
        self.assertEqual(len({r['request']['seed'] for r in rows}),12)
        self.assertNotIn('[Outro]',rows[2]['lyrics'])
        plan=json.loads((ROOT/'docs/evidence/dj-flow-buffer-20261026/gpu-plan.json').read_text());plan['status']='PREPARED'
        with self.assertRaises(ValueError):validate_model_study(plan,flow=True)
        plan.update(status='AUTHORIZED',owner_statement='Approve the capped $3 two-track-buffer qualification')
        with self.assertRaises(ValueError):validate_model_study(plan,flow=True)
        plan['controller_sha256']=hashlib.sha256((ROOT/'scripts/dj_sample_trial.py').read_bytes()).hexdigest()
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        with self.assertRaisesRegex(ValueError,'playback changed'):validate_model_study({**plan,'playback_sha256':'0'*64},flow=True)
        plan['playback_sha256']=hashlib.sha256((ROOT/'apps/site/tests/dj-mix-comparison.mjs').read_bytes()).hexdigest()
        plan['mixer_sha256']={name:hashlib.sha256((ROOT/'apps/site/lib'/name).read_bytes()).hexdigest() for name in plan['mixer_sha256']}
        validate_model_study(plan,flow=True)
        for change in [{'startup_tracks':6},{'incremental_raw_archive':False},{'mixer_sha256':{}},{'cadence_seconds':35},{'max_requests':13},{'max_minutes':41},{'replacements':True},{'owner_statement':'do all'}]:
            with self.assertRaises(ValueError):validate_model_study({**plan,**change},flow=True)
        with self.assertRaises(ValueError):validate_model_study(plan,consistency=True)
        from vast_trial import dj_bootstrap_command
        self.assertIn('12 --flow-study >',dj_bootstrap_command(1900000000,12,flow_study=True))
        with self.assertRaises(ValueError):dj_bootstrap_command(1900000000,12,flow_study=True,model_study=True)
