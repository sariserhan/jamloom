#!/usr/bin/env python3
"""Owner-approved two-track listening trial; reuses the bounded Vast controller."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
import urllib.request
import uuid
import wave
import vast_trial as vast

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT/'docs/evidence/dj-audible-comparison-20261025'
WORK = ROOT/'build-dj-style-samples-20261025'
OUTPUT = ROOT/'renders/dj-style-samples-20261025'
LABEL = 'jamloom-dj-style-samples-20261025'
vast.WORK, vast.STATE, vast.LABEL = WORK, WORK/'trial-state.json', LABEL
vast.LEASE_SECONDS, vast.HOURLY_CEILING, vast.QUOTE_CEILING = 1200, .50, 2
REPLACEMENT = False
QUALITY = False
HOUSE = False
COMPOSITION = False
GUIDED_SET = False
RECOVERY = False
PLANNER = False
SUNG = False


def configure_quality(house=False, composition=False, guided_set=False, recovery=False, planner=False, sung=False):
    global EVIDENCE, WORK, OUTPUT, LABEL, QUALITY, HOUSE, COMPOSITION, GUIDED_SET, RECOVERY, PLANNER, SUNG
    QUALITY = True
    HOUSE = house
    COMPOSITION = composition or guided_set or recovery
    GUIDED_SET = guided_set
    RECOVERY = recovery
    PLANNER = planner
    SUNG = sung
    campaign='dj-sung-hooks-20261026' if sung else 'dj-planner-20261026' if planner else 'dj-recovery-20261025' if recovery else 'dj-guided-set-20261025' if guided_set else 'dj-composition-20261025' if composition else 'dj-house-consistency-20261025' if house else 'dj-quality-20261025'
    EVIDENCE = ROOT/'docs/evidence'/campaign
    WORK = ROOT/('build-'+campaign)
    OUTPUT = ROOT/'renders'/campaign
    LABEL = 'jamloom-'+campaign
    vast.WORK, vast.STATE, vast.LABEL = WORK, WORK/'trial-state.json', LABEL


def validate_quality(plan,house=False,composition=False,guided_set=False,recovery=False,planner=False):
    from dj_track_worker import request, arranged_brief, focused_house_brief, CODE_REVISION, WEIGHTS_REVISION, RECOVERY_CASES, recovery_guide
    if planner and (composition or house or guided_set or recovery):raise ValueError('Planner requires its own paired study')
    if recovery and (not composition or house or guided_set):raise ValueError('Recovery requires its own composition study')
    if guided_set and (not composition or house):raise ValueError('Guided set requires composition mode')
    if (plan['status'] != 'AUTHORIZED' or plan['campaign'] != ('jamloom-dj-planner-20261026' if planner else 'jamloom-dj-recovery-20261025' if recovery else 'jamloom-dj-guided-set-20261025' if guided_set else 'jamloom-dj-composition-20261025' if composition else 'jamloom-dj-house-consistency-20261025' if house else 'jamloom-dj-quality-20261025')
        or plan['owner_statement'] != ('Approve the capped $3 music-planner comparison' if planner else 'Approve the capped $3 recovery study' if recovery else 'Approve the capped $3 guided set' if guided_set else 'Approve the capped $3 composition comparison' if composition else 'Approve the capped $3 house study' if house else 'Approve the capped $3 quality comparison')
        or plan['budget_usd'] != 3 or plan['max_workers'] != 1 or plan['max_minutes'] != 20
        or plan['max_requests'] != (8 if recovery or planner else 9 if guided_set else 4 if composition else 6) or plan['stop_on_failure'] is not True or plan['automatic_cleanup'] is not True
        or plan['source_audio_used'] is not composition
        or any(plan[key] is not False for key in ['public_activation','learned_reference_weights_used'])
        or plan['model'] != dict(code=CODE_REVISION,weights=WEIGHTS_REVISION)):
        raise ValueError('Fresh bounded quality-comparison authorization required')
    if composition and (house or plan.get('source_audio_origin')!='original_authored_notes_and_synthesis' or plan.get('reference_audio_used') is not False or plan.get('guide_strength')!=.5):raise ValueError('Original composition guides required')
    if planner and plan.get('planner')!={'model':'acestep-5Hz-lm-1.7B','backend':'pt','caption_rewritten':False}:raise ValueError('Pinned semantic planner required')
    expected = [('house',0,401026,False),('house',1,401026,False),('bass',2,411026,False),('bass',3,411026,False),('house',7,421026,True),('bass',17,431026,True)] if planner else [('bass',seq,pair[0],seq in (7,12)) for seq,pair in RECOVERY_CASES.items()] if recovery else [('bass',seq,311025+i*1000,seq in (2,7,12)) for i,seq in enumerate([0,1,2,7,12,13])] if guided_set else [('house',0,291025,False),('house',1,291025,False),('bass',2,301025,False),('bass',3,301025,False)] if composition else [('house',i,seed,False) for i,seed in enumerate([261025,261025,271025,271025,281025,281025])] if house else [('house',0,251025,False),('bass',1,251025,False),('house',2,261025,True),('bass',7,261025,True)]
    if len(plan['tracks']) != len(expected): raise ValueError('Exact prepared track count required')
    for i,(row,(style,sequence,seed,vocals)) in enumerate(zip(plan['tracks'],expected)):
        value=request(row['request'])
        if (set(value) != {'version','session','sequence','seed','style','energy','mood',*(['beat'] if guided_set else [])}
            or (value['style'],value['sequence'],value['seed'],row['vocals']) != (style,sequence,seed,vocals)
            or type(row['vocals']) is not bool or value['energy'] != ([4,4,4,5,4,2][i] if guided_set else 4) or value['mood'] != (['deep','deep','deep','bright','warm','warm'][i] if guided_set else 'deep')
            or row['seconds'] != 60 or (focused_house_brief(value) if house and sequence%2 else arranged_brief(value)) != (row['caption'],row['bpm'])):
            raise ValueError('Prepared quality request changed')
        if guided_set and value['beat']!={'bpm':140,'groove':['syncopated','syncopated','syncopated','rolling','steady','steady'][i]}:raise ValueError('Prepared beat direction changed')
    if composition:
        from dj_composition import score
        for row in plan['tracks']:
            guide_request=recovery_guide(row['request']) if recovery else row['request']
            if recovery and row.get('guide_request')!=guide_request:raise ValueError('Prepared guide seed changed')
            expected_score=hashlib.sha256((json.dumps(score(guide_request),indent=2)+'\n').encode()).hexdigest() if recovery or guided_set or row['request']['sequence']%2 else None
            if row.get('guide_score_sha256')!=expected_score:raise ValueError('Prepared composition changed')
    for filename,digest in plan['worker_sha256'].items():
        if filename not in ['cloud_music_setup.sh','cloud_dj_warm.sh','dj_track_worker.py','dj_warm_engine.py','dj_vocal.py','club_benchmark_cases.py',*(['dj_composition.py','prepare_electronic_bank.py'] if composition else [])] or hashlib.sha256((ROOT/'scripts'/filename).read_bytes()).hexdigest()!=digest:
            raise ValueError('Prepared worker changed')
    if len(plan['worker_sha256']) != (8 if composition else 6) or hashlib.sha256((ROOT/'assets/manifests/dj-styles.json').read_bytes()).hexdigest()!=plan['manifest_sha256']:
        raise ValueError('Prepared worker manifest changed')


def validate_sung(plan,replacement=False):
    from dj_track_worker import CODE_REVISION, WEIGHTS_REVISION
    from dj_sung_hooks import caption
    if (plan['status']!='AUTHORIZED' or plan['campaign']!='jamloom-dj-sung-hooks-20261026'
        or plan['owner_statement']!=('Approve one replacement within the original cap' if replacement else 'Approve the capped $3 musical-vocal comparison')
        or plan['budget_usd']!=3 or plan['max_workers']!=1 or plan['max_minutes']!=20 or plan['max_requests']!=4
        or plan['stop_on_failure'] is not True or plan['automatic_cleanup'] is not True
        or plan['source_audio_used'] is not True or plan['source_audio_origin']!='jamloom_generated_originals'
        or any(plan[k] is not False for k in ['public_activation','reference_audio_used','learned_reference_weights_used'])
        or plan['model']!=dict(code=CODE_REVISION,weights=WEIGHTS_REVISION)):
        raise ValueError('Fresh bounded musical-vocal authorization required')
    evidence=ROOT/'docs/evidence/dj-sung-hooks-20261026'
    fixture=evidence/'sung-fixtures.json'
    if hashlib.sha256(fixture.read_bytes()).hexdigest()!=plan['fixture_sha256'] or json.loads(fixture.read_text())['cases']!=plan['cases']:
        raise ValueError('Prepared sung fixture changed')
    expected_sources={'sung-house-1.wav':'909a45b9da691b9f440506b268a9ced1bb364e713166bbdbdac7981b5f61daf1',
                      'sung-house-7.wav':'99f7bb05427656f9eebf4c185d3a17a7c418d6bc35568d05e0b0905acb46fb68'}
    if plan['source_sha256']!=expected_sources or len(plan['cases'])!=4 or len(plan['tracks'])!=4:raise ValueError('Exact two-original four-edit study required')
    for i,(case,row) in enumerate(zip(plan['cases'],plan['tracks'])):
        expected=dict(version=1,session='26102611111111111111111111111111',sequence=i,seed=501026+i,style='house',energy=4,mood='deep')
        source='sung-house-1.wav' if i<2 else 'sung-house-7.wav'
        if (case['request']!=expected or row['request']!=expected or case['source_file']!=source
            or case['source_sha256']!=expected_sources[source] or case['vocal_profile']!=('male-tenor' if i%2==0 else 'female-mezzo')
            or case['phrase']!=('Feel alive' if i<2 else 'We rise') or row['vocals'] is not False or row['seconds']!=60
            or row['caption']!=caption(case) or not 0<case['cue']['seconds']<=2):raise ValueError('Prepared sung case changed')
        if hashlib.sha256((ROOT/'renders/dj-planner-20261026'/source.removeprefix('sung-')).read_bytes()).hexdigest()!=expected_sources[source]:raise ValueError('Original source changed')
    names={'cloud_music_setup.sh','cloud_dj_warm.sh','dj_track_worker.py','dj_warm_engine.py','dj_vocal.py','club_benchmark_cases.py','dj_sung_hooks.py','singing_response.py','song_duration.py','dna_language.py'}
    if set(plan['worker_sha256'])!=names or any(hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest()!=digest for name,digest in plan['worker_sha256'].items()):raise ValueError('Prepared sung worker changed')
    if hashlib.sha256((ROOT/'assets/manifests/dj-styles.json').read_bytes()).hexdigest()!=plan['manifest_sha256']:raise ValueError('Style manifest changed')
    manifests={name:hashlib.sha256((ROOT/'assets/manifests'/name).read_bytes()).hexdigest() for name in ['song-durations.json','dna-languages.json']}
    if plan.get('dna_manifest_sha256')!=manifests:raise ValueError('Music DNA manifests required')
    if replacement and (plan.get('budget_usd_total')!=3 or plan.get('remaining_rental_seconds')!=vast.LEASE_SECONDS
        or plan.get('original_permit_sha256')!=hashlib.sha256((evidence/'gpu-plan.json').read_bytes()).hexdigest()):
        raise ValueError('Replacement must retain original total bounds')


def configure_replacement():
    global WORK, OUTPUT, LABEL, REPLACEMENT
    previous = json.loads(vast.STATE.read_text())
    failed = json.loads((OUTPUT/'report.json').read_text())
    if (previous.get('destroy_confirmed_at') is None or not failed['cleanup_confirmed'] or failed['tracks']
        or previous['label'] != LABEL): raise ValueError('Confirmed unused first attempt required')
    remaining = int(1200-(previous['destroy_confirmed_at']-previous['started_at']))
    if remaining < 300: raise ValueError('Insufficient original rental allowance')
    REPLACEMENT = True
    WORK = WORK.with_name(WORK.name+'-replacement')
    OUTPUT = OUTPUT.with_name(OUTPUT.name+'-replacement')
    LABEL += '-replacement'
    vast.WORK, vast.STATE, vast.LABEL, vast.LEASE_SECONDS = WORK, WORK/'trial-state.json', LABEL, remaining


def validate(plan):
    if SUNG: return validate_sung(plan,replacement=REPLACEMENT)
    if QUALITY: return validate_quality(plan,house=HOUSE,composition=COMPOSITION,guided_set=GUIDED_SET,recovery=RECOVERY,planner=PLANNER)
    if (plan['status'] != 'AUTHORIZED' or plan['campaign'] != 'jamloom-dj-style-samples-20261025' or plan['budget_usd'] != 3
        or plan['max_workers'] != 1 or plan['max_minutes'] != 20
        or plan['stop_on_failure'] is not True or plan['automatic_cleanup'] is not True
        or plan['public_activation'] is not False or plan['source_audio_used'] is not False
        or plan['learned_reference_weights_used'] is not False
        or plan['owner_statement'] != 'Approve the capped $3 sample pair'):
        raise ValueError('Current two-track authorization required')
    from dj_track_worker import request, brief, CODE_REVISION, WEIGHTS_REVISION
    if plan['model'] != dict(code=CODE_REVISION, weights=WEIGHTS_REVISION):
        raise ValueError('Pinned model changed')
    rows = plan['tracks']
    if len(rows) != 2 or [r['request']['style'] for r in rows] != ['house', 'bass']:
        raise ValueError('Exactly the approved house/bass pair required')
    for i, row in enumerate(rows):
        value = request(row['request'])
        if (row['seconds'] != 60 or value['sequence'] != i or value['seed'] != 251025
            or value['energy'] != 4 or value['mood'] != 'deep'
            or brief(value) != (row['caption'], row['bpm'])):
            raise ValueError('Prepared generation request changed')
    if hashlib.sha256((ROOT/'assets/manifests/dj-styles.json').read_bytes()).hexdigest() != plan['manifest_sha256']:
        raise ValueError('Style manifest changed')


def preflight():
    plan = json.loads((EVIDENCE/('replacement-plan.json' if SUNG and REPLACEMENT else 'gpu-plan.json')).read_text()); validate(plan)
    if REPLACEMENT:
        permit = json.loads((EVIDENCE/'replacement-plan.json').read_text())
        if (permit['status'] != 'AUTHORIZED' or permit['budget_usd_total'] != 3
            or permit['remaining_rental_seconds'] != vast.LEASE_SECONDS
            or permit['owner_statement'] != 'Approve one replacement within the original cap'):
            raise ValueError('Fresh replacement approval required')
    if vast.instances(): raise RuntimeError('Existing rental prevents this one-GPU trial')
    account = vast.api('v0/users/current')
    if float(account['credit']) < 3: raise RuntimeError('Insufficient prepaid balance')
    proven = json.loads((ROOT/('build-dj-house-consistency-20261025' if COMPOSITION else 'build-dj-quality-20261025' if HOUSE else 'build-dj-style-samples-20261025-replacement' if QUALITY else 'build-dj-style-samples-20261025' if REPLACEMENT else 'build-dj-qualification-20261025-hosted')/'trial-state.json').read_text())['offer']['host_id']
    offers = vast.offers(proven)
    if (HOUSE or COMPOSITION) and not offers:
        for name in ['build-dj-style-samples-20261025-replacement','build-dj-qualification-20261025-hosted']:
            host=json.loads((ROOT/name/'trial-state.json').read_text())['offer']['host_id']
            offers=vast.offers(host)
            if offers: break
    if not offers:
        failed = [json.loads((ROOT/name/'trial-state.json').read_text())['offer']['host_id'] for name in
                  ['build-dj-qualification-20261024', 'build-dj-qualification-20261024-sessions-finish', 'build-dj-qualification-20261024-sessions-finish-retry']]
        offers = [o for o in vast.offers() if o['host_id'] not in failed and o['gpu_name'] == 'RTX 3090'
                  and o['geolocation'].endswith(', US') and o['cpu_ram'] >= 60000]
    if not offers: raise RuntimeError('No compatible host within bounds')
    return plan, account, offers[0]


def startup_probe(code, output):
    if code==255:return 'transport_unavailable'
    if code!=0:raise RuntimeError('Unexpected startup probe exit code '+str(code))
    if output.strip():
        if not output.strip().isdigit():raise RuntimeError('Invalid renderer exit receipt')
        return 'renderer_exited'
    return 'pending'


def run():
    plan, account, offer = preflight()
    if vast.STATE.exists(): raise RuntimeError('Trial already attempted; no replacement authorized')
    WORK.mkdir(exist_ok=True); OUTPUT.mkdir()
    key = WORK/'trial-key'
    subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(key)], check=True)
    token = secrets.token_hex(32); (WORK/'renderer-token').write_text(token); (WORK/'renderer-token').chmod(0o600)
    anchor = json.loads((ROOT/('build-dj-sung-hooks-20261026' if SUNG else 'build-dj-recovery-20261025' if RECOVERY else 'build-dj-style-samples-20261025')/'trial-state.json').read_text())['starting_credit'] if REPLACEMENT else float(account['credit'])
    if max(0, anchor-float(account['credit']))+offer['reserved_lease_plus_transfer'] > 3:
        raise RuntimeError('Original budget unavailable')
    state = dict(label=LABEL, offer=offer, starting_credit=anchor, started_at=time.time(),
                 deadline=int(time.time())+vast.LEASE_SECONDS, budget_usd=3, observed_debit_stop_usd=2,
                 confirm_absence=True, disk_gb=60)
    vast.write_state(state)
    with (WORK/'watchdog.log').open('a') as log:
        subprocess.Popen(['caffeinate', '-i', sys.executable, str(Path(__file__).resolve()), '--watch', *(['--replacement'] if REPLACEMENT else []), *(['--sung-study'] if SUNG else ['--planner-study'] if PLANNER else ['--recovery-study'] if RECOVERY else ['--guided-set'] if GUIDED_SET else ['--composition-study'] if COMPOSITION else ['--house-study'] if HOUSE else ['--quality'] if QUALITY else [])],
                         stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
    report = dict(status='FAIL', scope='Four short sung edits on two retained Jamloom originals; no TTS or external references' if SUNG else 'Paired unconditioned generation with or without semantic music planning; no reference material' if PLANNER else 'Four guide/model seed controls plus two original vocal opportunities; no reference material' if RECOVERY else 'Six guided bass originals with at most three short vocal candidates; direction and consistency study' if GUIDED_SET else 'Four paired originals; same captions/model/seeds, with and without newly authored audio guides' if COMPOSITION else 'Six paired instrumental house tracks; no reference audio or research weights' if HOUSE else 'Four arrangement candidates with at most two brief vocal candidates; no reference audio or research weights' if QUALITY else 'Two original style prompts; same seed and base model; no reference audio or research weights', tracks=[])
    tunnel = None; ssh = None; scp = None
    try:
        result = vast.api('v0/asks/'+str(offer['id']), 'PUT', dict(
            image='pytorch/pytorch@sha256:b85566342b86d13a67712e9315d40cdc2dad7f8d86df1aff3831f80835edbcca',
            disk=60, label=LABEL, runtype='ssh_direct', target_state='running', cancel_unavail=True))
        state['id'] = result['new_contract']; vast.write_state(state)
        vast.attach_key(state['id'], key.with_suffix('.pub').read_text().strip())
        options = ['-i', str(key), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'UserKnownHostsFile='+str(WORK/'known_hosts')]
        print(f'One GPU rented; independent {vast.LEASE_SECONDS}-second/$3 total watchdog active.', flush=True)
        while time.time() < min(state['started_at']+(420 if REPLACEMENT else 300), state['deadline']-240):
            item = next((i for i in vast.instances() if i['id'] == state['id']), None)
            if item and item.get('ssh_host') and item.get('ssh_port'):
                ssh = ['ssh', *options, '-p', str(item['ssh_port']), 'root@'+item['ssh_host']]
                if subprocess.run([*ssh, 'true'], capture_output=True, timeout=15).returncode == 0: break
            time.sleep(10)
        else: raise RuntimeError('SSH startup deadline failed')
        scp = ['scp', *options, '-P', str(item['ssh_port'])]
        files = [ROOT/'scripts'/name for name in ['cloud_music_setup.sh', 'cloud_dj_warm.sh', 'dj_track_worker.py', 'dj_warm_engine.py', 'dj_vocal.py', 'club_benchmark_cases.py',*(['dj_composition.py','prepare_electronic_bank.py'] if COMPOSITION else []),*(['dj_sung_hooks.py','singing_response.py','song_duration.py','dna_language.py'] if SUNG else [])]]
        files += [ROOT/'assets/manifests/dj-styles.json', WORK/'renderer-token']
        subprocess.run([*scp, *map(str, files), 'root@'+item['ssh_host']+':/workspace/'], check=True, capture_output=True, timeout=60)
        if SUNG:
            subprocess.run([*scp,str(EVIDENCE/'sung-fixtures.json'),str(ROOT/'renders/dj-planner-20261026/house-1.wav'),str(ROOT/'renders/dj-planner-20261026/house-7.wav'),*[str(ROOT/'assets/manifests'/name) for name in plan['dna_manifest_sha256']],'root@'+item['ssh_host']+':/workspace/'],check=True,capture_output=True,timeout=60)
        subprocess.run([*ssh, vast.dj_bootstrap_command(state['deadline'], plan.get('max_requests', 2), arranged=QUALITY and not HOUSE and not COMPOSITION and not PLANNER and not SUNG, house_study=HOUSE, composition_study=COMPOSITION and not GUIDED_SET and not RECOVERY, guided_set=GUIDED_SET, recovery_study=RECOVERY, planner_study=PLANNER,sung_study=SUNG)], check=True, capture_output=True, timeout=20)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
        with (WORK/'tunnel.log').open('a') as log:
            tunnel = subprocess.Popen([*ssh[:-1], '-o', 'ExitOnForwardFailure=yes', '-N', '-L', f'127.0.0.1:{port}:127.0.0.1:8768', ssh[-1]], stdout=log, stderr=log)
        def request(path, body=None, timeout=5):
            return urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}'+path,
                data=None if body is None else json.dumps(body).encode(), headers={'Authorization':'Bearer '+token, 'Content-Type':'application/json'}), timeout=timeout)
        print('Installing pinned model and waiting for renderer.', flush=True)
        transport_failures=0
        while time.time() < state['deadline']-100:
            if tunnel.poll() is not None: raise RuntimeError('SSH tunnel failed')
            try:
                check = subprocess.run([*ssh, 'if test -f /workspace/run.exit; then cat /workspace/run.exit; fi'], capture_output=True, timeout=15)
                outcome=startup_probe(check.returncode,check.stdout)
            except subprocess.TimeoutExpired:outcome='transport_unavailable'
            with (WORK/'startup-probes.jsonl').open('a') as log:log.write(json.dumps(dict(at=time.time(),outcome=outcome))+'\n')
            if outcome=='renderer_exited':raise RuntimeError('Renderer process exited during startup')
            transport_failures=transport_failures+1 if outcome=='transport_unavailable' else 0
            if transport_failures>=3:raise RuntimeError('Three consecutive startup transport probes failed')
            try:
                with request('/health') as response: ready = json.load(response)
                if ready['ready']: break
            except OSError: pass
            time.sleep(15)
        else: raise RuntimeError('Renderer startup exhausted time allowance')
        for row in plan['tracks']:
            if time.time() >= state['deadline']-80: raise RuntimeError('Insufficient bounded rendering time')
            body = dict(job=str(uuid.uuid4()), request=row['request'], vocals=row.get('vocals',False))
            with request('/render', body, 40) as response:
                receipt = json.loads(response.headers['X-Jamloom-Receipt']); data = response.read(12_000_001)
            if receipt['request'] != row['request'] or receipt['sha256'] != hashlib.sha256(data).hexdigest() or len(data) != 11_520_044:
                raise RuntimeError('Generated track integrity failed')
            if SUNG:
                proof=receipt.get('musical_hook',{})
                case=plan['cases'][row['request']['sequence']]
                if (receipt.get('vocal') is not None or proof.get('task_type')!='repaint' or proof.get('text_to_speech') is not False
                    or proof.get('source_sha256')!=case['source_sha256'] or proof.get('cue')!=case['cue']
                    or proof.get('phrase')!=case['phrase'] or proof.get('vocal_profile')!=case['vocal_profile']
                    or len(proof.get('raw_sha256',''))!=64):raise RuntimeError('Musical candidate proof mismatch')
            if PLANNER:
                planning=receipt.get('planning',{}).get('track')
                if row['request']['sequence']%2:
                    if not planning or planning.get('model')!='acestep-5Hz-lm-1.7B' or planning.get('backend')!='pt' or planning.get('caption_rewritten') is not False or planning.get('source_audio_used') is not False or not 1<=planning.get('code_tokens',0)<=4096 or len(planning.get('audio_codes_sha256',''))!=64:raise RuntimeError('Semantic planning proof missing')
                elif planning:raise RuntimeError('Control unexpectedly used semantic planning')
                if receipt.get('composition'):raise RuntimeError('Planner comparison unexpectedly used a source guide')
            if COMPOSITION:
                guide=receipt.get('composition')
                if RECOVERY or GUIDED_SET or row['request']['sequence']%2:
                    if not isinstance(guide,dict) or guide.get('request')!=(row['guide_request'] if RECOVERY else row['request']) or guide.get('origin')!='original_authored_notes_and_synthesis' or guide.get('reference_audio_used') is not False or guide.get('bpm')!=row['bpm'] or guide.get('seconds')!=60 or guide.get('score_sha256')!=row['guide_score_sha256'] or len(guide.get('guide_sha256',''))!=64:raise RuntimeError('Original guide provenance mismatch')
                elif guide is not None:raise RuntimeError('Control unexpectedly used a guide')
            with wave.open(io.BytesIO(data)) as audio:
                if (audio.getnchannels(), audio.getframerate(), audio.getnframes(), audio.getsampwidth()) != (2, 48000, 2880000, 2):
                    raise RuntimeError('Generated audio format failed')
            filename = row['request']['style']+(('-'+str(row['request']['sequence'])) if QUALITY else '')+'.wav'; (OUTPUT/filename).write_bytes(data)
            report['tracks'].append(dict(file=filename, receipt=receipt))
            print(row['label']+' rendered and verified.', flush=True)
        subprocess.run([*scp, 'root@'+item['ssh_host']+':/workspace/results/executed-scripts.sha256', str(OUTPUT)], check=True, capture_output=True, timeout=30)
        executed = {Path(name).name: digest for digest,name in (line.split(maxsplit=1) for line in (OUTPUT/'executed-scripts.sha256').read_text().splitlines())}
        for path in files[:-1]:
            if executed.get(path.name) != hashlib.sha256(path.read_bytes()).hexdigest():
                raise RuntimeError('Executed worker provenance mismatch')
        if SUNG:
            subprocess.run([*scp,'-r','root@'+item['ssh_host']+':/workspace/ace-step/sung-candidates',str(OUTPUT)],check=True,capture_output=True,timeout=60)
            for row in report['tracks']:
                raw=OUTPUT/'sung-candidates'/('raw-'+str(row['receipt']['request']['sequence'])+'.wav')
                if hashlib.sha256(raw.read_bytes()).hexdigest()!=row['receipt']['musical_hook']['raw_sha256']:raise RuntimeError('Raw sung candidate hash mismatch')
            for name,digest in plan['source_sha256'].items():
                if executed.get(name)!=digest:raise RuntimeError('Sung source execution proof mismatch')
            if executed.get('sung-fixtures.json')!=plan['fixture_sha256']:raise RuntimeError('Sung fixture execution proof mismatch')
            if any(executed.get(name)!=digest for name,digest in plan['dna_manifest_sha256'].items()):raise RuntimeError('Music DNA manifest execution proof mismatch')
        report['status'] = 'PASS technical'; report['human_listening'] = 'NOT RUN'
    finally:
        if ssh:
            try:
                log = subprocess.run([*ssh, 'tail -160 /workspace/boot.log'], capture_output=True, timeout=15)
                (WORK/'boot-tail.log').write_bytes(log.stdout)
                if SUNG and scp and not (OUTPUT/'sung-candidates').exists():
                    subprocess.run([*scp,'-r','root@'+item['ssh_host']+':/workspace/ace-step/sung-candidates',str(OUTPUT)],capture_output=True,timeout=30)
            except (OSError,subprocess.TimeoutExpired): pass
        if tunnel: tunnel.terminate()
        try:
            state = json.loads(vast.STATE.read_text()); vast.destroy(state)
            remaining = [i for i in vast.instances() if i.get('label') == LABEL or i['id'] == state.get('id')]
            report['cleanup_confirmed'] = not remaining
            if not remaining: state['destroy_confirmed_at'] = time.time(); vast.write_state(state)
            report['observed_debit_usd'] = max(0, state['starting_credit']-float(vast.api('v0/users/current')['credit']))
            report['rental_seconds'] = time.time()-state['started_at']
        finally:
            (OUTPUT/'report.json').write_text(json.dumps(report, indent=2)+'\n')
        print('Cleanup confirmed: '+str(report.get('cleanup_confirmed', False)), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--watch', action='store_true'); parser.add_argument('--preflight', action='store_true'); parser.add_argument('--replacement', action='store_true'); parser.add_argument('--quality', action='store_true')
    parser.add_argument('--house-study',action='store_true')
    parser.add_argument('--composition-study',action='store_true')
    parser.add_argument('--guided-set',action='store_true')
    parser.add_argument('--recovery-study',action='store_true')
    parser.add_argument('--planner-study',action='store_true')
    parser.add_argument('--sung-study',action='store_true')
    args = parser.parse_args()
    if sum([args.quality,args.replacement,args.house_study,args.composition_study,args.guided_set,args.recovery_study,args.planner_study,args.sung_study])>(2 if args.replacement and (args.recovery_study or args.sung_study) else 1): parser.error('Choose one campaign; replacements require a new prepared permit')
    if args.quality or args.house_study or args.composition_study or args.guided_set or args.recovery_study or args.planner_study or args.sung_study: configure_quality(house=args.house_study,composition=args.composition_study,guided_set=args.guided_set,recovery=args.recovery_study,planner=args.planner_study,sung=args.sung_study)
    if args.replacement: configure_replacement()
    if args.watch: vast.watch()
    elif args.preflight:
        _, account, offer = preflight()
        print(json.dumps(dict(credit=account['credit'], offer=offer), indent=2))
    else: run()
