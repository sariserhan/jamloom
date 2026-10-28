#!/usr/bin/env python3
"""Run the prepared, one-rental Afro House qualification after exact owner approval."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import time

import vast_trial as vast

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/evidence/afro-house-qualification-20261028'
WORK = ROOT / 'build-afro-house-qualification-20261028'
OUTPUT = ROOT / 'renders/afro-house-qualification-20261028'
LABEL = 'jamloom-afro-house-quality-20261028'
REPLACEMENT_LABEL = LABEL + '-replacement'
FOLLOWUP_LABEL = LABEL + '-followup-003'
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
REMOTE_SOURCES = (
    'scripts/afro_house_qualification.py', 'scripts/cloud_music_setup.sh', 'scripts/cloud_dj_warm.sh',
    'scripts/dj_track_worker.py', 'scripts/dj_warm_engine.py', 'scripts/dj_vocal.py',
    'scripts/dj_model_study.py', 'scripts/club_benchmark_cases.py',
    'assets/manifests/dj-styles.json', 'assets/manifests/dj-base-model.json',
    'renders/dj-quality-20261025/house-0.wav',
)


def configure_vast(replacement=False, followup=False):
    if replacement and followup:
        raise ValueError('Choose one Afro House campaign attempt')
    suffix, label = ('-followup-003', FOLLOWUP_LABEL) if followup else ('-replacement', REPLACEMENT_LABEL) if replacement else ('', LABEL)
    work = WORK.with_name(WORK.name + suffix) if suffix else WORK
    vast.WORK, vast.STATE, vast.LABEL = work, work / 'trial-state.json', label
    vast.LEASE_SECONDS, vast.HOURLY_CEILING, vast.QUOTE_CEILING = 2400, .75, 6


def validate_permit(permit, replacement=False, followup=False):
    if replacement and followup:
        raise ValueError('Choose one Afro House campaign attempt')
    label = FOLLOWUP_LABEL if followup else REPLACEMENT_LABEL if replacement else LABEL
    budget = 5.97 if followup else 5.99 if replacement else 6
    expected = dict(status='AUTHORIZED', campaign=label,
        budget_usd=budget,
        instances_max=1, max_elapsed_seconds=2400, model_calls_max=24, attempts_max=1,
        stop_on_failure=True, automatic_cleanup=True, retries=0,
        public_activation=False, source_audio_used=False, training=False,
        owner_statement='Approve one additional attempt up to $5.97 within the $6 aggregate cap' if followup
            else 'complete it' if replacement else 'Approve $6 max (recommended)')
    if any(permit.get(key) != value for key, value in expected.items()):
        raise ValueError('Fresh exact Afro House compute authorization required')
    if replacement and (permit.get('aggregate_budget_cap_usd') != 6 or
            permit.get('aggregate_budget_used_usd') != 0.005716488299999156 or
            permit.get('exclude_failed_host') is not True):
        raise ValueError('Replacement must stay within the original aggregate cap and exclude the failed host')
    if replacement and hashlib.sha256((EVIDENCE / 'gpu-attempt-001.json').read_bytes()).hexdigest() != permit.get('prior_attempt', {}).get('sha256'):
        raise ValueError('Replacement permit does not match the reconciled first attempt')
    if followup and (permit.get('aggregate_budget_cap_usd') != 6 or
            permit.get('aggregate_budget_used_usd') != 0.025320318200000358 or
            permit.get('exclude_failed_hosts_and_machines') is not True or
            [item.get('receipt') for item in permit.get('prior_attempts', [])] != ['gpu-attempt-001.json', 'gpu-attempt-002.json']):
        raise ValueError('Follow-up must bind both failed attempts and stay within the aggregate cap')
    if followup:
        prior_debit = 0.0
        for index, item in enumerate(permit['prior_attempts'], start=1):
            path = EVIDENCE / item['receipt']
            receipt_bytes = path.read_bytes()
            if hashlib.sha256(receipt_bytes).hexdigest() != item.get('sha256'):
                raise ValueError('Follow-up attempt receipt changed')
            receipt = json.loads(receipt_bytes)
            prior_debit += receipt['observed_debit_usd']
            report_path = ROOT / receipt['provider_report']
            report_bytes = report_path.read_bytes()
            report = json.loads(report_bytes)
            expected_campaign = LABEL if index == 1 else REPLACEMENT_LABEL
            if (receipt.get('attempt') != index or receipt.get('campaign') != expected_campaign or
                    not receipt.get('cleanup_confirmed') or receipt.get('model_setup_reached') or
                    receipt.get('generation_calls_completed') or receipt.get('stem_extraction_calls_completed') or
                    hashlib.sha256(report_bytes).hexdigest() != receipt.get('provider_report_sha256') or
                    report.get('status') != 'FAIL' or report.get('tracks') or not report.get('cleanup_confirmed') or
                    report.get('observed_debit_usd') != receipt.get('observed_debit_usd')):
                raise ValueError('A prior paid attempt is not reconciled for a follow-up')
        if prior_debit != permit['aggregate_budget_used_usd']:
            raise ValueError('Follow-up aggregate debit does not match prior receipts')
    hashes = permit.get('code_sha256', {})
    if set(hashes) != set(SOURCES) or any(
        hashlib.sha256((ROOT / path).read_bytes()).hexdigest() != hashes[path]
        for path in SOURCES
    ):
        raise ValueError('Afro House qualification sources changed after authorization')


def avoids_failed_hosts(offer, previous):
    return all(offer['host_id'] != old['host_id'] and offer['machine_id'] != old['machine_id'] for old in previous)


def preflight(replacement=False, followup=False):
    configure_vast(replacement, followup)
    plan_file = 'followup-plan-003.json' if followup else 'replacement-plan.json' if replacement else 'gpu-plan.json'
    permit = json.loads((EVIDENCE / plan_file).read_text())
    validate_permit(permit, replacement, followup)
    suffix = '-followup-003' if followup else '-replacement' if replacement else ''
    target_output = OUTPUT.with_name(OUTPUT.name + suffix) if suffix else OUTPUT
    if vast.STATE.exists() or target_output.exists():
        raise RuntimeError('Prior output exists; refusing to overwrite qualification evidence')
    previous = None
    if replacement:
        previous_state = json.loads((WORK / 'trial-state.json').read_text())
        previous_report_path = OUTPUT / 'report.json'
        previous_report_bytes = previous_report_path.read_bytes()
        previous_report = json.loads(previous_report_bytes)
        attempt = json.loads((EVIDENCE / 'gpu-attempt-001.json').read_text())
        if (previous_state.get('label') != LABEL or not previous_report.get('cleanup_confirmed') or
                not previous_state.get('destroy_confirmed_at') or previous_report.get('status') != 'FAIL' or
                previous_report.get('tracks') or previous_report.get('observed_debit_usd') != permit['aggregate_budget_used_usd'] or
                hashlib.sha256(previous_report_bytes).hexdigest() != attempt.get('provider_report_sha256') or
                attempt.get('cleanup_confirmed') is not True or not attempt.get('failure', '').startswith("Command '['scp'")):
            raise RuntimeError('The first failed attempt is not reconciled for a replacement')
        previous = previous_state['offer']
    if followup:
        previous = [json.loads((EVIDENCE / item['receipt']).read_text())['offer'] for item in permit['prior_attempts']]
    if vast.instances():
        raise RuntimeError('Existing trial state or rental prevents a new one-GPU run')
    account = vast.api('v0/users/current')
    offers = [offer for offer in vast.offers() if offer['gpu_name'] == 'RTX 3090'
        and offer['geolocation'].endswith(', US') and
        (not replacement or offer['host_id'] != previous['host_id'] and offer['machine_id'] != previous['machine_id']) and
        (not followup or avoids_failed_hosts(offer, previous))]
    if not offers:
        raise RuntimeError('No compatible US RTX 3090 offer within prepared price limits')
    offer = offers[0]
    if float(account['credit']) < offer['reserved_lease_plus_transfer']:
        raise RuntimeError('Prepaid balance is below the reserved quote')
    if (replacement or followup) and (offer['reserved_lease_plus_transfer'] > permit['budget_usd'] or
            permit['aggregate_budget_used_usd'] + offer['reserved_lease_plus_transfer'] > permit['aggregate_budget_cap_usd']):
        raise RuntimeError('Afro House quote exceeds the remaining aggregate cap')
    for command in ('caffeinate', 'ssh', 'scp', 'ssh-keygen', 'tar'):
        if not shutil.which(command):
            raise RuntimeError('Missing local launch dependency: ' + command)
    return permit, account, offer


def run(replacement=False, followup=False):
    permit, account, offer = preflight(replacement, followup)
    suffix, label = ('-followup-003', FOLLOWUP_LABEL) if followup else ('-replacement', REPLACEMENT_LABEL) if replacement else ('', LABEL)
    work = WORK.with_name(WORK.name + suffix) if suffix else WORK
    output = OUTPUT.with_name(OUTPUT.name + suffix) if suffix else OUTPUT
    if output.exists():
        raise RuntimeError('Output exists; refusing to overwrite prior qualification evidence')
    work.mkdir(exist_ok=True)
    output.mkdir(parents=True)
    payload = work / 'afro-house-payload.tar.gz'
    with tarfile.open(payload, 'w:gz') as archive:
        for source in REMOTE_SOURCES:
            archive.add(ROOT / source, arcname=Path(source).name)
    payload_sha256 = hashlib.sha256(payload.read_bytes()).hexdigest()
    key = work / 'trial-key'
    subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(key)], check=True)
    state = dict(label=label, offer=offer, starting_credit=float(account['credit']),
        started_at=time.time(), deadline=int(time.time()) + vast.LEASE_SECONDS,
        budget_usd=permit['budget_usd'], observed_debit_stop_usd=5.5 if not replacement and not followup else permit['budget_usd'],
        disk_gb=60, payload_sha256=payload_sha256,
        confirm_absence=True, status='starting')
    vast.write_state(state)
    with (work / 'watchdog.log').open('a') as log:
        subprocess.Popen(['caffeinate', '-i', sys.executable, str(Path(__file__).resolve()), '--watch'] +
            (['--followup'] if followup else ['--replacement'] if replacement else []),
            stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
    report = dict(status='FAIL', campaign=label, tracks=[], reference_audio_used=False,
        human_listening='NOT RUN', cleanup_confirmed=False, quote=offer)
    ssh = scp = None
    try:
        result = vast.api('v0/asks/' + str(offer['id']), 'PUT', dict(
            image='pytorch/pytorch@sha256:b85566342b86d13a67712e9315d40cdc2dad7f8d86df1aff3831f80835edbcca',
            disk=60, label=label, runtype='ssh_direct', target_state='running', cancel_unavail=True))
        state['id'] = result['new_contract']; state['status'] = 'rented'; vast.write_state(state)
        vast.attach_key(state['id'], key.with_suffix('.pub').read_text().strip())
        options = ['-i', str(key), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
            '-o', 'ServerAliveInterval=10', '-o', 'ServerAliveCountMax=3',
            '-o', 'StrictHostKeyChecking=accept-new', '-o', 'UserKnownHostsFile=' + str(work / 'known_hosts')]
        end = min(state['started_at'] + 300, state['deadline'] - 240)
        connected = 0
        while time.time() < end:
            item = next((row for row in vast.instances() if row['id'] == state['id']), None)
            if item and item.get('ssh_host') and item.get('ssh_port'):
                ssh = ['ssh', *options, '-p', str(item['ssh_port']), 'root@' + item['ssh_host']]
                if subprocess.run([*ssh, 'true'], capture_output=True, timeout=15).returncode == 0:
                    connected += 1
                    if connected >= 2:
                        break
                    time.sleep(3)
                    continue
                connected = 0
            time.sleep(10)
        else:
            raise RuntimeError('SSH startup deadline failed')
        scp = ['scp', *options, '-P', str(item['ssh_port'])]
        subprocess.run([*scp, str(payload), 'root@' + item['ssh_host'] + ':/workspace/afro-house-payload.tar.gz'],
            check=True, capture_output=True, timeout=120)
        subprocess.run([*ssh, 'mkdir -p /workspace && tar -xzf /workspace/afro-house-payload.tar.gz -C /workspace && rm /workspace/afro-house-payload.tar.gz'],
            check=True, capture_output=True, timeout=30)
        state['payload_uploaded_at'] = time.time(); vast.write_state(state)
        command = vast.dj_bootstrap_command(state['deadline'], 24, afro_house=True)
        subprocess.run([*ssh, command], check=True, capture_output=True, timeout=20)
        (work / 'boot.log').write_text('')
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
        subprocess.run([*scp, '-r', 'root@' + item['ssh_host'] + ':/workspace/results/afro-house-qualification', str(output)],
            check=True, capture_output=True, timeout=180)
        for remote, local in (('/workspace/results/executed-scripts.sha256', 'executed-scripts.sha256'),
                              ('/workspace/results/weights.sha256', 'weights.sha256'),
                              ('/workspace/boot.log', 'boot.log'), ('/workspace/run.exit', 'run.exit'),
                              ('/workspace/setup.stage', 'setup.stage')):
            subprocess.run([*scp, 'root@' + item['ssh_host'] + ':' + remote, str(output / local)],
                check=True, capture_output=True, timeout=30)
        hashes = {Path(name.split(maxsplit=1)[1]).name: name.split(maxsplit=1)[0]
            for name in (output / 'executed-scripts.sha256').read_text().splitlines()}
        for relative in ('scripts/afro_house_qualification.py', 'scripts/dj_model_study.py',
                         'scripts/dj_track_worker.py', 'scripts/dj_warm_engine.py',
                         'scripts/dj_vocal.py', 'scripts/club_benchmark_cases.py'):
            if hashes.get(Path(relative).name) != hashlib.sha256((ROOT / relative).read_bytes()).hexdigest():
                raise RuntimeError('Remote execution provenance mismatch: ' + relative)
        package = output / 'afro-house-qualification'
        report.update(json.loads((package / 'report.json').read_text()))
    except Exception as error:
        report.update(failure_type=type(error).__name__, failure=str(error)[:500])
        if ssh and scp:
            try:
                remote_output = subprocess.run([*ssh,
                    'test -d /workspace/results/afro-house-qualification'], capture_output=True, timeout=15)
                if remote_output.returncode == 0 and not (output / 'afro-house-qualification').exists():
                    subprocess.run([*scp, '-r', 'root@' + item['ssh_host'] + ':/workspace/results/afro-house-qualification', str(output)],
                        capture_output=True, timeout=120)
                for remote, local in (('/workspace/results/executed-scripts.sha256', 'executed-scripts.sha256'),
                                      ('/workspace/results/weights.sha256', 'weights.sha256'),
                                      ('/workspace/boot.log', 'boot.log'), ('/workspace/run.exit', 'run.exit'),
                                      ('/workspace/setup.stage', 'setup.stage')):
                    subprocess.run([*scp, 'root@' + item['ssh_host'] + ':' + remote, str(output / local)],
                        capture_output=True, timeout=20)
                (output / 'boot-tail.log').write_bytes(subprocess.run([*ssh, 'tail -160 /workspace/boot.log'],
                    capture_output=True, timeout=15).stdout)
            except (OSError, subprocess.TimeoutExpired):
                pass
    finally:
        try:
            state = json.loads(vast.STATE.read_text())
            vast.destroy(state)
            remaining = [row for row in vast.instances() if row.get('label') == label or row['id'] == state.get('id')]
            report['cleanup_confirmed'] = not remaining
            if not remaining:
                state['destroy_confirmed_at'] = time.time(); vast.write_state(state)
            report['observed_debit_usd'] = max(0, state['starting_credit'] - float(vast.api('v0/users/current')['credit']))
        except Exception as error:
            report['cleanup_error'] = type(error).__name__
        report.setdefault('status', 'FAIL')
        report['human_listening'] = 'NOT RUN'
        (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preflight', action='store_true')
    parser.add_argument('--watch', action='store_true')
    parser.add_argument('--replacement', action='store_true')
    parser.add_argument('--followup', action='store_true')
    args = parser.parse_args()
    configure_vast(args.replacement, args.followup)
    if args.watch:
        vast.watch()
    elif args.preflight:
        _, account, offer = preflight(args.replacement, args.followup)
        print(json.dumps(dict(credit=account['credit'], offer=offer), indent=2))
    else:
        print(json.dumps(run(args.replacement, args.followup), indent=2))


if __name__ == '__main__':
    main()
