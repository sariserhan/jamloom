#!/usr/bin/env python3
"""Exercise SDK bootstrap with real Git and a tiny local SDK stand-in."""
import os
import fcntl
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[2]
script = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'scripts/web_build.sh'
git = shutil.which('git')
assert git


def executable(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    path.chmod(0o755)


with tempfile.TemporaryDirectory(prefix='jamloom-sdk-test-') as directory:
    temp = Path(directory)
    fixture = temp / 'sdk-source'
    fixture.mkdir()
    # dash cannot discover a sourced script's path; the real SDK requires its own cwd.
    (fixture / 'emsdk.py').touch()
    (fixture / 'emsdk_env.sh').write_text('[ -f ./emsdk.py ] || { echo WRONG_SDK_CWD >&2; return 1; }\nPATH="$EMSDK_PATH/bin:$PATH"; export PATH\n')
    executable(fixture / 'emsdk', '#!/bin/sh\ncd "$(dirname "$0")"\nprintf "%s\\n" "$*" >> calls\n[ "$1" != activate ] || touch .emscripten\n')
    executable(fixture / 'bin/emcc', '#!/bin/sh\necho "emcc 6.0.1 (fixture)"\n')
    executable(fixture / 'bin/emcmake', '#!/bin/sh\necho BOOTSTRAP_READY\nexit 42\n')
    for args in [['init', '--quiet'], ['add', '.'], ['-c', 'user.name=SDK test', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'SDK fixture'], ['tag', '6.0.1']]:
        subprocess.run([git, '-C', str(fixture), *args], check=True)
    tools = temp / 'tools'
    # Only intercept network location and unrelated tool discovery; Git checkout is real.
    executable(tools / 'git', '#!' + sys.executable + '\nimport os,sys\nargs=[x.replace("https://github.com/emscripten-core/emsdk.git",' + repr(str(fixture)) + ') for x in sys.argv[1:]]\nos.execv(' + repr(git) + ',["git",*args])\n')
    # Stub version probes even on CI's older Python, but execute the real lock wrapper.
    executable(tools / 'python3', '#!' + sys.executable + '\nimport os,sys\nif sys.argv[1:2] == ["-c"]: sys.exit(0)\nos.execv(' + repr(sys.executable) + ',[' + repr(sys.executable) + ',*sys.argv[1:]])\n')
    executable(tools / 'cmake', '#!/bin/sh\nexit 0\n')
    env = {k: v for k, v in os.environ.items() if k not in ['JAMLOOM_EMSDK', 'DJAYVO_EMSDK', 'JAMLOOM_STUDIO_BUILD_LOCKED']}
    env['PATH'] = str(tools) + os.pathsep + env['PATH']

    def run(name, partial=False, conflict=False, locked=False):
        project = temp / name
        (project / 'scripts').mkdir(parents=True)
        shutil.copyfile(script, project / 'scripts/web_build.sh')
        shutil.copyfile(root / 'scripts/studio_build_lock.py', project / 'scripts/studio_build_lock.py')
        sdk = project / 'build-web-tools/emsdk'
        if locked:
            lock_path = project / 'build-web-tools/studio-build.lock'
            lock_path.parent.mkdir(parents=True)
            with lock_path.open('a') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                result = subprocess.run(['sh', str(project / 'scripts/web_build.sh')], env=env, text=True, capture_output=True, timeout=30)
                assert result.returncode != 0 and 'Another studio build is running' in result.stderr, result
                assert not sdk.exists(), 'A rejected build must not start SDK setup'
            print('PASS:', name)
            return
        if partial:
            cached = sdk / 'node/cached/node_modules/preserved.txt'
            cached.parent.mkdir(parents=True)
            cached.write_text('cached dependency')
        if conflict:
            (sdk / 'emsdk').write_text('user-owned file')
        result = subprocess.run(['sh', str(project / 'scripts/web_build.sh')], env=env, text=True, capture_output=True, timeout=30)
        if conflict:
            assert result.returncode != 42 and 'BOOTSTRAP_READY' not in result.stdout
            assert (sdk / 'emsdk').read_text() == 'user-owned file'
        else:
            assert result.returncode == 42 and 'BOOTSTRAP_READY' in result.stdout, result
            assert (sdk / 'calls').read_text().splitlines() == ['install 6.0.1', 'activate 6.0.1']
            again = subprocess.run(['sh', str(project / 'scripts/web_build.sh')], env=env, text=True, capture_output=True, timeout=30)
            assert again.returncode == 42 and 'BOOTSTRAP_READY' in again.stdout, again
            assert (sdk / 'calls').read_text().splitlines() == ['install 6.0.1', 'activate 6.0.1'], 'Warm SDK must not be reinstalled'
        if partial:
            assert cached.read_text() == 'cached dependency'
        print('PASS:', name)

    run('fresh-and-warm')
    run('partial-cache-and-warm', partial=True)
    run('conflicting-user-file-preserved', partial=True, conflict=True)
    run('concurrent-build-rejected', locked=True)
