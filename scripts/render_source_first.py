"""Run one source-first audition with resource limits and durable progress receipts."""
import argparse
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

import psutil
from singing_response import digest, load_plan, source_conditioning

ROOT = Path(__file__).resolve().parents[1]
GIB = 1024**3


def resource_problem(available, disk, rss=0, elapsed=0, swap_growth=0, starting=False):
    if available < (8 * GIB if starting else GIB):
        return 'Available memory floor reached'
    if disk < 15 * GIB:
        return 'Free disk reserve reached'
    if rss > 8 * GIB:
        return 'Render process memory limit reached'
    if swap_growth > 2 * GIB:
        return 'Swap growth limit reached'
    if elapsed > 600:
        return 'Ten-minute render deadline reached'
    return None


def run(work, output):
    work, output = work.resolve(), output.resolve()
    if not work.is_relative_to(ROOT / 'renders') or not output.is_relative_to(work):
        raise ValueError('Keep the private audition and its output under renders')
    receipt = output.with_name(output.name + '-execution.json')
    log = output.with_name(output.name + '-execution.log')
    if output.exists() or receipt.exists() or receipt.with_suffix('.tmp').exists() or log.exists():
        raise FileExistsError('Preserve previous attempts; choose a fresh output name')
    plan_path, conditioning_path = work / 'plan.json', work / 'conditioning.json'
    plan = load_plan(plan_path)
    if len(plan['cases']) != 1 or plan['cases'][0]['duration'] != 30:
        raise ValueError('This bounded audition requires one 30-second case')
    conditioning = source_conditioning(conditioning_path)
    if not conditioning['instrumental']:
        raise ValueError('This audition generates an instrumental response only')
    state = {'status': 'NOT RUN', 'attempts': 0, 'paid_compute': False,
             'listening': 'NOT RUN', 'plan_sha256': digest(plan_path),
             'conditioning_sha256': digest(conditioning_path),
             'disk_floor_bytes': 15 * GIB, 'running_memory_floor_bytes': GIB,
             'starting_memory_floor_bytes': 8 * GIB,
             'rss_limit_bytes': 8 * GIB, 'swap_growth_limit_bytes': 2 * GIB,
             'timeout_seconds': 600, 'peak_process_group_rss_bytes': 0}
    started = time.monotonic()
    initial_swap = psutil.swap_memory().used
    process = None
    def interrupted(signum, _frame):
        raise InterruptedError(f'Render interrupted by signal {signum}')
    handlers = {number: signal.signal(number, interrupted)
                for number in (signal.SIGTERM, signal.SIGINT)}

    def checkpoint():
        state['seconds'] = time.monotonic() - started
        temporary = receipt.with_suffix('.tmp')
        with temporary.open('w') as stream:
            stream.write(json.dumps(state, indent=2) + '\n')
            stream.flush()
            os.fsync(stream.fileno())
        temporary.replace(receipt)

    try:
        problem = resource_problem(psutil.virtual_memory().available,
                                   shutil.disk_usage(ROOT).free, starting=True)
        if problem:
            raise RuntimeError(problem)
        command = [str(ROOT / '.venv-singer/bin/python'),
                   str(ROOT / 'scripts/singing_response.py'), 'sing',
                   '--runtime', str(ROOT / 'build-style-training/upstream'),
                   '--plan', str(plan_path), '--conditioning', str(conditioning_path),
                   '--case', plan['cases'][0]['id'], '--output', str(output),
                   '--mac-small-decode']
        state['status'] = 'RUNNING'
        checkpoint()
        with log.open('x') as stream:
            process = subprocess.Popen(command, cwd=ROOT, stdout=stream,
                stderr=subprocess.STDOUT, start_new_session=True,
                env={**os.environ, 'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1',
                     'HF_HUB_DISABLE_TELEMETRY': '1', 'JAMLOOM_INFERENCE_DEVICE': 'mps',
                     'JAMLOOM_VOCAL_IDENTITY_ENABLED': 'false',
                     'PYTORCH_ENABLE_MPS_FALLBACK': '1'})
            state['attempts'] = 1
            while process.poll() is None:
                rows = subprocess.check_output(['ps', '-axo', 'pgid=,rss='], text=True)
                rss = sum(int(row.split()[1]) * 1024 for row in rows.splitlines()
                          if int(row.split()[0]) == process.pid)
                state['peak_process_group_rss_bytes'] = max(rss, state['peak_process_group_rss_bytes'])
                state['available_memory_bytes'] = psutil.virtual_memory().available
                state['free_disk_bytes'] = shutil.disk_usage(ROOT).free
                state['swap_growth_bytes'] = max(0, psutil.swap_memory().used - initial_swap)
                checkpoint()
                problem = resource_problem(state['available_memory_bytes'],
                    state['free_disk_bytes'], rss, state['seconds'], state['swap_growth_bytes'])
                if problem:
                    raise RuntimeError(problem)
                time.sleep(1)
            state['exit_code'] = process.returncode
            if process.returncode:
                raise RuntimeError('Local generation failed; see retained log')
        complete = json.loads((output / 'complete.json').read_text())
        if (complete.get('technical') != 'PASS' or complete.get('device') != 'mps'
                or complete.get('trained_adapter') is not False
                or complete.get('source_conditioning') != conditioning
                or complete.get('audio_sha256') != digest(output / 'singer.wav')
                or digest(plan_path) != state['plan_sha256']
                or digest(conditioning_path) != state['conditioning_sha256']):
            raise ValueError('Completed render provenance differs from the prepared audition')
        state.update(status='PASS technical; listening NOT RUN', audio_sha256=complete['audio_sha256'])
    except BaseException as error:
        state.update(status='FAIL' if process is not None else 'NOT RUN', error=str(error))
        raise
    finally:
        if process is not None:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.wait()
        for number, handler in handlers.items():
            signal.signal(number, handler)
        checkpoint()
        print(json.dumps(state), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    run(args.work, args.output)
