"""Bounded startup diagnosis. Caller retains the independent watchdog/finally cleanup."""
import json
import math
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request

# Collect evidence during startup, so cleanup never has to wait for another SSH call.
STATUS_COMMAND = """printf 'EXIT='
test ! -f /workspace/run.exit || head -c 16 /workspace/run.exit
printf '\\nSTAGE='
test ! -f /workspace/setup.stage || head -c 80 /workspace/setup.stage
printf '\\nALIVE='
if test -f /workspace/renderer.pid && kill -0 "$(cat /workspace/renderer.pid)" 2>/dev/null; then printf yes; else printf no; fi
printf '\\nLOG\\n'
test ! -f /workspace/boot.log || tail -c 65536 /workspace/boot.log
"""


def private_write(path, data):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as stream:
        os.fchmod(stream.fileno(), 0o600)
        stream.write(data)


def wait_ready(ssh, token, deadline, evidence, *, clock=time.time, sleep=time.sleep,
               execute=subprocess.run, open_url=urllib.request.urlopen):
    """Stop on first SSH/setup failure. Never retry or extend the rental deadline."""
    if not isinstance(token, str) or len(token) != 64 or any(c not in '0123456789abcdef' for c in token):
        raise ValueError('Invalid renderer token')
    if not math.isfinite(deadline) or not clock() < deadline <= clock() + 2400:
        raise ValueError('Invalid readiness deadline')
    evidence = Path(evidence)
    evidence.mkdir(parents=True, exist_ok=True)
    last = {'stage': 'unknown', 'polls': 0}
    def save(status, **fields):
        last.update(status=status, **fields)
        private_write(evidence/'startup.json', json.dumps(last, indent=2)+'\n')
    while clock() < deadline:
        try:
            result = execute([*ssh, STATUS_COMMAND], capture_output=True, text=True,
                             timeout=min(10, deadline-clock()))
        except subprocess.TimeoutExpired:
            save('ssh_timeout')
            raise RuntimeError('Renderer startup SSH probe timed out') from None
        except OSError:
            save('ssh_unavailable')
            raise RuntimeError('Renderer startup SSH probe could not launch') from None
        last['polls'] += 1
        private_write(evidence/'ssh-private.log', result.stderr.replace(token, '[redacted]')[-8192:])
        if result.returncode:
            save('ssh_failed', ssh_exit=result.returncode)
            raise RuntimeError('Renderer startup SSH probe failed; not a confirmed renderer exit')
        header, separator, log = result.stdout.partition('\nLOG\n')
        fields = dict(line.split('=', 1) for line in header.splitlines() if '=' in line)
        private_write(evidence/'boot-private.log', log.replace(token, '[redacted]')[-65536:])
        if not separator or set(fields) != {'EXIT', 'STAGE', 'ALIVE'}:
            save('invalid_status')
            raise RuntimeError('Invalid renderer startup status')
        last['stage'] = fields['STAGE'][:80]
        if fields['EXIT']:
            save('renderer_exited', renderer_exit=fields['EXIT'][:16])
            raise RuntimeError('Renderer exited before readiness; startup evidence retained')
        if fields['ALIVE'] != 'yes':
            save('renderer_missing')
            raise RuntimeError('Renderer startup process is no longer running')
        if clock() >= deadline:
            break
        request = urllib.request.Request('http://127.0.0.1:8768/health',
                                         headers={'Authorization': 'Bearer '+token})
        try:
            with open_url(request, timeout=min(5, deadline-clock())) as response:
                health = json.loads(response.read(65537))
            if health.get('ready') is True and clock() < deadline:
                save('ready')
                return health
        except urllib.error.HTTPError:
            save('health_http_error')
            raise RuntimeError('Renderer health endpoint rejected the startup probe') from None
        except (OSError, ValueError):
            pass  # Connection refused is expected while dependencies/model load.
        save('waiting')
        sleep(max(0, min(15, deadline-clock())))
    save('deadline')
    raise RuntimeError('Renderer readiness deadline exceeded; startup evidence retained')
