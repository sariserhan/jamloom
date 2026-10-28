#!/usr/bin/env python3
"""Run the prepared, one-rental Afro House qualification after exact owner approval."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

import vast_trial as vast

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/evidence/afro-house-qualification-20261028'
WORK = ROOT / 'build-afro-house-qualification-20261028'
OUTPUT = ROOT / 'renders/afro-house-qualification-20261028'
LABEL = 'jamloom-afro-house-quality-20261028'
SOURCES = (
    'scripts/afro_house_qualification.py', 'scripts/afro_house_trial.py',
    'scripts/cloud_music_setup.sh', 'scripts/cloud_dj_warm.sh',
    'scripts/dj_track_worker.py', 'scripts/dj_warm_engine.py',
    'scripts/dj_vocal.py', 'scripts/dj_model_study.py',
    'scripts/club_benchmark_cases.py', 'scripts/vast_trial.py',
    'assets/manifests/dj-styles.json', 'assets/manifests/dj-base-model.json',
    'renders/dj-quality-20261025/house-0.wav',
    'renders/dj-quality-20261025/report.json',
)


def configure_vast():
    vast.WORK, vast.STATE, vast.LABEL = WORK, WORK / 'trial-state.json', LABEL
    vast.LEASE_SECONDS, vast.HOURLY_CEILING, vast.QUOTE_CEILING = 2400, .75, 6


def validate_permit(permit):
    expected = dict(status='AUTHORIZED', campaign=LABEL, budget_usd=6,
        instances_max=1, max_elapsed_seconds=2400, model_calls_max=24,
        stop_on_failure=True, automatic_cleanup=True, retries=0,
        public_activation=False, source_audio_used=False, training=False,
        owner_statement='Approve the capped $6 Afro House qualification')
    if any(permit.get(key) != value for key, value in expected.items()):
        raise ValueError('Fresh exact Afro House compute authorization required')
    hashes = permit.get('code_sha256', {})
    if set(hashes) != set(SOURCES) or any(
        hashlib.sha256((ROOT / path).read_bytes()).hexdigest() != hashes[path]
        for path in SOURCES
    ):
        raise ValueError('Afro House qualification sources changed after authorization')


def preflight():
    configure_vast()
    permit = json.loads((EVIDENCE / 'gpu-plan.json').read_text())
    validate_permit(permit)
    if vast.STATE.exists() or vast.instances():
        raise RuntimeError('Existing trial state or rental prevents a new one-GPU run')
    account = vast.api('v0/users/current')
    offers = [offer for offer in vast.offers() if offer['gpu_name'] == 'RTX 3090'
        and offer['geolocation'].endswith(', US')]
    if not offers:
        raise RuntimeError('No compatible US RTX 3090 offer within prepared price limits')
    offer = offers[0]
    if float(account['credit']) < offer['reserved_lease_plus_transfer']:
        raise RuntimeError('Prepaid balance is below the reserved quote')
    return permit, account, offer


def run():
    _, account, offer = preflight()
    if OUTPUT.exists():
        raise RuntimeError('Output exists; refusing to overwrite prior qualification evidence')
    WORK.mkdir(exist_ok=True)
    OUTPUT.mkdir(parents=True)
    key = WORK / 'trial-key'
    subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(key)], check=True)
    state = dict(label=LABEL, offer=offer, starting_credit=float(account['credit']),
        started_at=time.time(), deadline=int(time.time()) + vast.LEASE_SECONDS,
        budget_usd=6, observed_debit_stop_usd=5.5, disk_gb=60,
        confirm_absence=True, status='starting')
    vast.write_state(state)
    with (WORK / 'watchdog.log').open('a') as log:
        subprocess.Popen(['caffeinate', '-i', sys.executable, str(Path(__file__).resolve()), '--watch'],
            stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
    report = dict(status='FAIL', campaign=LABEL, tracks=[], reference_audio_used=False,
        human_listening='NOT RUN', cleanup_confirmed=False, quote=offer)
    ssh = scp = None
    try:
        result = vast.api('v0/asks/' + str(offer['id']), 'PUT', dict(
            image='pytorch/pytorch@sha256:b85566342b86d13a67712e9315d40cdc2dad7f8d86df1aff3831f80835edbcca',
            disk=60, label=LABEL, runtype='ssh_direct', target_state='running', cancel_unavail=True))
        state['id'] = result['new_contract']; state['status'] = 'rented'; vast.write_state(state)
        vast.attach_key(state['id'], key.with_suffix('.pub').read_text().strip())
        options = ['-i', str(key), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
            '-o', 'StrictHostKeyChecking=accept-new', '-o', 'UserKnownHostsFile=' + str(WORK / 'known_hosts')]
        end = min(state['started_at'] + 300, state['deadline'] - 240)
        while time.time() < end:
            item = next((row for row in vast.instances() if row['id'] == state['id']), None)
            if item and item.get('ssh_host') and item.get('ssh_port'):
                ssh = ['ssh', *options, '-p', str(item['ssh_port']), 'root@' + item['ssh_host']]
                if subprocess.run([*ssh, 'true'], capture_output=True, timeout=15).returncode == 0:
                    break
            time.sleep(10)
        else:
            raise RuntimeError('SSH startup deadline failed')
        scp = ['scp', *options, '-P', str(item['ssh_port'])]
        files = [ROOT / path for path in SOURCES if path.startswith('scripts/') and path != 'scripts/afro_house_trial.py']
        files += [ROOT / 'scripts/afro_house_qualification.py', ROOT / 'assets/manifests/dj-styles.json',
            ROOT / 'assets/manifests/dj-base-model.json', ROOT / 'renders/dj-quality-20261025/house-0.wav',
            ROOT / 'renders/dj-quality-20261025/report.json']
        subprocess.run([*scp, *map(str, files), 'root@' + item['ssh_host'] + ':/workspace/'],
            check=True, capture_output=True, timeout=90)
        command = vast.dj_bootstrap_command(state['deadline'], 24, afro_house=True)
        subprocess.run([*ssh, command], check=True, capture_output=True, timeout=20)
        (WORK / 'boot.log').write_text('')
        while time.time() < state['deadline'] - 30:
            probe = subprocess.run([*ssh, 'if test -f /workspace/run.exit; then cat /workspace/run.exit; fi'],
                capture_output=True, text=True, timeout=20)
            if probe.stdout.strip():
                if probe.stdout.strip() != '0':
                    raise RuntimeError('Remote qualification exited with code ' + probe.stdout.strip())
                break
            time.sleep(10)
        else:
            raise RuntimeError('Qualification reached its deadline without an exit receipt')
        subprocess.run([*scp, '-r', 'root@' + item['ssh_host'] + ':/workspace/results/afro-house-qualification', str(OUTPUT)],
            check=True, capture_output=True, timeout=180)
        for remote, local in (('/workspace/results/executed-scripts.sha256', 'executed-scripts.sha256'),
                              ('/workspace/results/weights.sha256', 'weights.sha256'),
                              ('/workspace/boot.log', 'boot.log'), ('/workspace/run.exit', 'run.exit'),
                              ('/workspace/setup.stage', 'setup.stage')):
            subprocess.run([*scp, 'root@' + item['ssh_host'] + ':' + remote, str(OUTPUT / local)],
                check=True, capture_output=True, timeout=30)
        hashes = {Path(name.split(maxsplit=1)[1]).name: name.split(maxsplit=1)[0]
            for name in (OUTPUT / 'executed-scripts.sha256').read_text().splitlines()}
        for relative in ('scripts/afro_house_qualification.py', 'scripts/dj_model_study.py',
                         'scripts/dj_track_worker.py', 'scripts/dj_warm_engine.py',
                         'scripts/dj_vocal.py', 'scripts/club_benchmark_cases.py'):
            if hashes.get(Path(relative).name) != hashlib.sha256((ROOT / relative).read_bytes()).hexdigest():
                raise RuntimeError('Remote execution provenance mismatch: ' + relative)
        package = OUTPUT / 'afro-house-qualification'
        report.update(json.loads((package / 'report.json').read_text()))
    except Exception as error:
        report.update(failure_type=type(error).__name__, failure=str(error)[:500])
        if ssh and scp:
            try:
                remote_output = subprocess.run([*ssh,
                    'test -d /workspace/results/afro-house-qualification'], capture_output=True, timeout=15)
                if remote_output.returncode == 0 and not (OUTPUT / 'afro-house-qualification').exists():
                    subprocess.run([*scp, '-r', 'root@' + item['ssh_host'] + ':/workspace/results/afro-house-qualification', str(OUTPUT)],
                        capture_output=True, timeout=120)
                for remote, local in (('/workspace/results/executed-scripts.sha256', 'executed-scripts.sha256'),
                                      ('/workspace/results/weights.sha256', 'weights.sha256'),
                                      ('/workspace/boot.log', 'boot.log'), ('/workspace/run.exit', 'run.exit'),
                                      ('/workspace/setup.stage', 'setup.stage')):
                    subprocess.run([*scp, 'root@' + item['ssh_host'] + ':' + remote, str(OUTPUT / local)],
                        capture_output=True, timeout=20)
                (OUTPUT / 'boot-tail.log').write_bytes(subprocess.run([*ssh, 'tail -160 /workspace/boot.log'],
                    capture_output=True, timeout=15).stdout)
            except (OSError, subprocess.TimeoutExpired):
                pass
    finally:
        try:
            state = json.loads(vast.STATE.read_text())
            vast.destroy(state)
            remaining = [row for row in vast.instances() if row.get('label') == LABEL or row['id'] == state.get('id')]
            report['cleanup_confirmed'] = not remaining
            if not remaining:
                state['destroy_confirmed_at'] = time.time(); vast.write_state(state)
            report['observed_debit_usd'] = max(0, state['starting_credit'] - float(vast.api('v0/users/current')['credit']))
        except Exception as error:
            report['cleanup_error'] = type(error).__name__
        report.setdefault('status', 'FAIL')
        report['human_listening'] = 'NOT RUN'
        (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preflight', action='store_true')
    parser.add_argument('--watch', action='store_true')
    args = parser.parse_args()
    configure_vast()
    if args.watch:
        vast.watch()
    elif args.preflight:
        _, account, offer = preflight()
        print(json.dumps(dict(credit=account['credit'], offer=offer), indent=2))
    else:
        print(json.dumps(run(), indent=2))


if __name__ == '__main__':
    main()
