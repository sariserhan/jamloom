"""Bounded, content-free stage timings shared by one job's subprocesses."""
from contextlib import contextmanager
from functools import wraps
import fcntl
import json
import os
from pathlib import Path
import time

PHASES = frozenset(('pipeline', 'improvise', 'source', 'transcription', 'selection',
    'lyrics', 'runtime-verify', 'lyric-load', 'lyric-generate', 'singing',
    'sing-import', 'sing-load', 'sing-generate', 'separation', 'arrangement', 'identity',
    'identity-separate', 'identity-verify', 'identity-load', 'identity-generate', 'identity-stems'))
MAX_BYTES = 32768
MAX_EVENTS = 128
MAX_MS = 1200000


def mark(name, event):
    if name not in PHASES or event not in ('start', 'end'):
        raise ValueError('Unknown timing event')
    target = os.environ.get('JAMLOOM_TIMING_FILE')
    if not target:
        return
    # Diagnostics must never turn an otherwise valid generation into a failure.
    try:
        fd = os.open(target, os.O_WRONLY | os.O_APPEND | os.O_NOFOLLOW)
        try:
            # Parallel subprocesses must timestamp and append in the same order.
            fcntl.flock(fd, fcntl.LOCK_EX)
            elapsed = (time.monotonic_ns() - int(os.environ['JAMLOOM_TIMING_START_NS'])) // 1000000
            if not 0 <= elapsed <= MAX_MS:
                return
            data = (json.dumps({'phase': name, 'event': event, 'ms': elapsed}) + '\n').encode()
            if os.fstat(fd).st_size + len(data) <= MAX_BYTES:
                os.write(fd, data)
        finally:
            os.close(fd)
    except (OSError, ValueError, KeyError):
        pass


@contextmanager
def phase(name):
    mark(name, 'start')
    try:
        yield
    finally:
        mark(name, 'end')


def timed(name):
    def decorate(function):
        @wraps(function)
        def measured(*args, **kwargs):
            with phase(name):
                return function(*args, **kwargs)
        return measured
    return decorate


def snapshot(path):
    """Strict allowlist: never echo arbitrary file values into provider logs."""
    try:
        with Path(path).open('rb') as source:
            raw = source.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            return None
        lines = raw.splitlines()
        if not 1 <= len(lines) <= MAX_EVENTS:
            return None
        events = []
        active = []
        previous = -1
        for line in lines:
            event = json.loads(line)
            if (not isinstance(event, dict) or set(event) != {'phase', 'event', 'ms'}
                    or not isinstance(event['phase'], str) or event['phase'] not in PHASES
                    or event['event'] not in ('start', 'end') or type(event['ms']) is not int
                    or not previous <= event['ms'] <= MAX_MS or event['ms'] < 0):
                return None
            previous = event['ms']
            if event['event'] == 'start':
                if event['phase'] in active:return None
                active.append(event['phase'])
            else:
                if event['phase'] not in active:return None
                active.remove(event['phase'])
            events.append(event)
        return {'schema': 'jamloom-phase-timing-1', 'events': events, 'active': active}
    except (OSError, ValueError, TypeError, KeyError):
        return None
