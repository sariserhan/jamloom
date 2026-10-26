"""Serve the local listening copies, including byte ranges for native audio controls."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / 'renders' / 'club-studies-20261024'


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def list_directory(self, path):
        self.send_error(404)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        self.remaining = None
        path = Path(self.translate_path(self.path)).resolve()
        if not path.is_relative_to(ROOT.resolve()):
            self.send_error(404)
            return None
        value = self.headers.get('Range')
        if not value or not path.is_file():
            return super().send_head()
        match = re.fullmatch(r'bytes=(\d{0,20})-(\d{0,20})', value)
        size = path.stat().st_size
        start, end = 0, size - 1
        if match and any(match.groups()):
            left, right = match.groups()
            start = int(left) if left else max(0, size - int(right))
            end = min(size - 1, int(right)) if left and right else size - 1
        else:
            start = size
        if start >= size or start > end:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        source = path.open('rb')
        source.seek(start)
        self.remaining = end - start + 1
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(self.remaining))
        self.end_headers()
        return source

    def copyfile(self, source, output):
        try:
            if self.remaining is None:
                return super().copyfile(source, output)
            while self.remaining:
                chunk = source.read(min(self.remaining, 64 * 1024))
                if not chunk:
                    break
                output.write(chunk)
                self.remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Seeking cancels the previous media request.


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    ROOT = args.root.resolve()
    if not 1024 <= args.port <= 65535:
        parser.error('Choose a local port between 1024 and 65535')
    if not ROOT.is_dir():
        raise SystemExit('Prepare the local listening copies first.')
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
