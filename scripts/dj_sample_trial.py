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


def configure_quality(house=False):
    global EVIDENCE, WORK, OUTPUT, LABEL, QUALITY, HOUSE
    QUALITY = True
    HOUSE = house
    campaign='dj-house-consistency-20261025' if house else 'dj-quality-20261025'
    EVIDENCE = ROOT/'docs/evidence'/campaign
    WORK = ROOT/('build-'+campaign)
    OUTPUT = ROOT/'renders'/campaign
    LABEL = 'jamloom-'+campaign
    vast.WORK, vast.STATE, vast.LABEL = WORK, WORK/'trial-state.json', LABEL


def validate_quality(plan,house=False):
    from dj_track_worker import request, arranged_brief, focused_house_brief, CODE_REVISION, WEIGHTS_REVISION
    if (plan['status'] != 'AUTHORIZED' or plan['campaign'] != ('jamloom-dj-house-consistency-20261025' if house else 'jamloom-dj-quality-20261025')
        or plan['owner_statement'] != ('Approve the capped $3 house study' if house else 'Approve the capped $3 quality comparison')
        or plan['budget_usd'] != 3 or plan['max_workers'] != 1 or plan['max_minutes'] != 20
        or plan['max_requests'] != 6 or plan['stop_on_failure'] is not True or plan['automatic_cleanup'] is not True
        or any(plan[key] is not False for key in ['public_activation','source_audio_used','learned_reference_weights_used'])
        or plan['model'] != dict(code=CODE_REVISION,weights=WEIGHTS_REVISION)):
        raise ValueError('Fresh bounded quality-comparison authorization required')
    expected = [('house',i,seed,False) for i,seed in enumerate([261025,261025,271025,271025,281025,281025])] if house else [('house',0,251025,False),('bass',1,251025,False),('house',2,261025,True),('bass',7,261025,True)]
    if len(plan['tracks']) != len(expected): raise ValueError('Exact prepared track count required')
    for row,(style,sequence,seed,vocals) in zip(plan['tracks'],expected):
        value=request(row['request'])
        if (set(value) != {'version','session','sequence','seed','style','energy','mood'}
            or (value['style'],value['sequence'],value['seed'],row['vocals']) != (style,sequence,seed,vocals)
            or type(row['vocals']) is not bool or value['energy'] != 4 or value['mood'] != 'deep'
            or row['seconds'] != 60 or (focused_house_brief(value) if house and sequence%2 else arranged_brief(value)) != (row['caption'],row['bpm'])):
            raise ValueError('Prepared quality request changed')
    for filename,digest in plan['worker_sha256'].items():
        if filename not in ['cloud_music_setup.sh','cloud_dj_warm.sh','dj_track_worker.py','dj_warm_engine.py','dj_vocal.py','club_benchmark_cases.py'] or hashlib.sha256((ROOT/'scripts'/filename).read_bytes()).hexdigest()!=digest:
            raise ValueError('Prepared worker changed')
    if len(plan['worker_sha256']) != 6 or hashlib.sha256((ROOT/'assets/manifests/dj-styles.json').read_bytes()).hexdigest()!=plan['manifest_sha256']:
        raise ValueError('Prepared worker manifest changed')


def configure_replacement():
    global WORK, OUTPUT, LABEL, REPLACEMENT
    previous = json.loads(vast.STATE.read_text())
    failed = json.loads((OUTPUT/'report.json').read_text())
    if (previous.get('destroy_confirmed_at') is None or not failed['cleanup_confirmed'] or failed['tracks']
        or previous['label'] != LABEL): raise ValueError('Confirmed unused first attempt required')
    remaining = int(1200-(previous['destroy_confirmed_at']-previous['started_at']))
    if remaining < 300: raise ValueError('Insufficient original rental allowance')
    REPLACEMENT = True
    WORK = ROOT/'build-dj-style-samples-20261025-replacement'
    OUTPUT = ROOT/'renders/dj-style-samples-20261025-replacement'
    LABEL += '-replacement'
    vast.WORK, vast.STATE, vast.LABEL, vast.LEASE_SECONDS = WORK, WORK/'trial-state.json', LABEL, remaining


def validate(plan):
    if QUALITY: return validate_quality(plan,house=HOUSE)
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
    plan = json.loads((EVIDENCE/'gpu-plan.json').read_text()); validate(plan)
    if REPLACEMENT:
        permit = json.loads((EVIDENCE/'replacement-plan.json').read_text())
        if (permit['status'] != 'AUTHORIZED' or permit['budget_usd_total'] != 3
            or permit['remaining_rental_seconds'] != vast.LEASE_SECONDS
            or permit['owner_statement'] != 'Approve one replacement within the original cap'):
            raise ValueError('Fresh replacement approval required')
    if vast.instances(): raise RuntimeError('Existing rental prevents this one-GPU trial')
    account = vast.api('v0/users/current')
    if float(account['credit']) < 3: raise RuntimeError('Insufficient prepaid balance')
    proven = json.loads((ROOT/('build-dj-quality-20261025' if HOUSE else 'build-dj-style-samples-20261025-replacement' if QUALITY else 'build-dj-style-samples-20261025' if REPLACEMENT else 'build-dj-qualification-20261025-hosted')/'trial-state.json').read_text())['offer']['host_id']
    offers = vast.offers(proven)
    if HOUSE and not offers:
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


def run():
    plan, account, offer = preflight()
    if vast.STATE.exists(): raise RuntimeError('Trial already attempted; no replacement authorized')
    WORK.mkdir(exist_ok=True); OUTPUT.mkdir()
    key = WORK/'trial-key'
    subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(key)], check=True)
    token = secrets.token_hex(32); (WORK/'renderer-token').write_text(token); (WORK/'renderer-token').chmod(0o600)
    anchor = json.loads((ROOT/'build-dj-style-samples-20261025/trial-state.json').read_text())['starting_credit'] if REPLACEMENT else float(account['credit'])
    if max(0, anchor-float(account['credit']))+offer['reserved_lease_plus_transfer'] > 3:
        raise RuntimeError('Original budget unavailable')
    state = dict(label=LABEL, offer=offer, starting_credit=anchor, started_at=time.time(),
                 deadline=int(time.time())+vast.LEASE_SECONDS, budget_usd=3, observed_debit_stop_usd=2,
                 confirm_absence=True, disk_gb=60)
    vast.write_state(state)
    with (WORK/'watchdog.log').open('a') as log:
        subprocess.Popen(['caffeinate', '-i', sys.executable, str(Path(__file__).resolve()), '--watch', *(['--replacement'] if REPLACEMENT else []), *(['--house-study'] if HOUSE else ['--quality'] if QUALITY else [])],
                         stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
    report = dict(status='FAIL', scope='Six paired instrumental house tracks; no reference audio or research weights' if HOUSE else 'Four arrangement candidates with at most two brief vocal candidates; no reference audio or research weights' if QUALITY else 'Two original style prompts; same seed and base model; no reference audio or research weights', tracks=[])
    tunnel = None; ssh = None
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
        files = [ROOT/'scripts'/name for name in ['cloud_music_setup.sh', 'cloud_dj_warm.sh', 'dj_track_worker.py', 'dj_warm_engine.py', 'dj_vocal.py', 'club_benchmark_cases.py']]
        files += [ROOT/'assets/manifests/dj-styles.json', WORK/'renderer-token']
        subprocess.run([*scp, *map(str, files), 'root@'+item['ssh_host']+':/workspace/'], check=True, capture_output=True, timeout=60)
        subprocess.run([*ssh, vast.dj_bootstrap_command(state['deadline'], plan.get('max_requests', 2), arranged=QUALITY and not HOUSE, house_study=HOUSE)], check=True, capture_output=True, timeout=20)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
        with (WORK/'tunnel.log').open('a') as log:
            tunnel = subprocess.Popen([*ssh[:-1], '-o', 'ExitOnForwardFailure=yes', '-N', '-L', f'127.0.0.1:{port}:127.0.0.1:8768', ssh[-1]], stdout=log, stderr=log)
        def request(path, body=None, timeout=5):
            return urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}'+path,
                data=None if body is None else json.dumps(body).encode(), headers={'Authorization':'Bearer '+token, 'Content-Type':'application/json'}), timeout=timeout)
        print('Installing pinned model and waiting for renderer.', flush=True)
        while time.time() < state['deadline']-100:
            if tunnel.poll() is not None: raise RuntimeError('SSH tunnel failed')
            check = subprocess.run([*ssh, 'if test -f /workspace/run.exit; then cat /workspace/run.exit; fi'], capture_output=True, timeout=15)
            if check.returncode or check.stdout.strip(): raise RuntimeError('Renderer startup failed')
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
        report['status'] = 'PASS technical'; report['human_listening'] = 'NOT RUN'
    finally:
        if ssh:
            try:
                log = subprocess.run([*ssh, 'tail -160 /workspace/boot.log'], capture_output=True, timeout=15)
                (WORK/'boot-tail.log').write_bytes(log.stdout)
            except subprocess.TimeoutExpired: pass
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
    args = parser.parse_args()
    if sum([args.quality,args.replacement,args.house_study])>1: parser.error('Choose one campaign; replacements require a new prepared permit')
    if args.quality or args.house_study: configure_quality(house=args.house_study)
    if args.replacement: configure_replacement()
    if args.watch: vast.watch()
    elif args.preflight:
        _, account, offer = preflight()
        print(json.dumps(dict(credit=account['credit'], offer=offer), indent=2))
    else: run()
