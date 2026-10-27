"""Fail closed when two jobs try to mutate the shared generated studio."""
from contextlib import contextmanager
import fcntl
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


@contextmanager
def studio_build_lock(path=ROOT / 'build-web-tools/studio-build.lock'):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('Another studio build is running. Retry after it finishes.') from None
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


if __name__ == '__main__':
    try:
        with studio_build_lock():
            result = subprocess.run(['sh', str(ROOT / 'scripts/web_build.sh')], cwd=ROOT,
                                    env={**os.environ, 'JAMLOOM_STUDIO_BUILD_LOCKED': '1'})
            sys.exit(result.returncode)
    except RuntimeError as error:
        raise SystemExit(str(error))
