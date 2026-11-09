#!/usr/bin/env python3
"""Run a command on a simulator; shut down only a device booted by this run."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile


def run(device, command, simctl=None):
    simctl = simctl or ['xcrun', 'simctl']
    if not re.fullmatch(r'[A-Fa-f0-9-]{36}', device) or not command:
        raise ValueError('A simulator UUID and command are required')
    lock_path = Path(tempfile.gettempdir()) / ('jamloom-simulator-' + device + '.lock')
    with lock_path.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        devices = json.loads(subprocess.check_output(simctl + ['list', 'devices', '--json']))
        found = next((d for group in devices['devices'].values() for d in group if d['udid'] == device), None)
        if not found or found['state'] not in ['Shutdown', 'Booted']:
            raise RuntimeError('Simulator is missing or transitioning; leave it unchanged')
        owned = found['state'] == 'Shutdown'
        started = False
        child = None
        previous = {}
        def interrupt(signum, _frame):
            if child and child.poll() is None:
                os.killpg(child.pid, signum)
            raise KeyboardInterrupt
        for sig in (signal.SIGINT, signal.SIGTERM):
            previous[sig] = signal.signal(sig, interrupt)
        try:
            if owned:
                subprocess.run(simctl + ['boot', device], check=True)
                started = True
            subprocess.run(simctl + ['bootstatus', device, '-b'], check=True, timeout=180)
            child = subprocess.Popen(command, env={**os.environ, 'JAMLOOM_SIMULATOR_MANAGED': device}, start_new_session=True)
            return child.wait()
        except KeyboardInterrupt:
            if child and child.poll() is None:
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(child.pid, signal.SIGKILL)
                    child.wait()
            return 130
        finally:
            for sig in previous:
                signal.signal(sig, signal.SIG_IGN)
            try:
                if started:
                    subprocess.run(simctl + ['shutdown', device], check=True, timeout=60)
            finally:
                for sig, handler in previous.items():
                    signal.signal(sig, handler)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device', required=True)
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    sys.exit(run(args.device, command))
