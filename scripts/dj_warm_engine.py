#!/usr/bin/env python3
"""Bounded, authenticated loopback renderer; rental shutdown is independently supervised."""
import argparse
from functools import partial
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, HTTPServer
import io
import json
from pathlib import Path
import secrets
import tempfile
import time
import uuid
import wave

from dj_track_worker import ace, house_study, composition_study, composition_set, canonical, load_ace, request, CODE_REVISION, WEIGHTS_REVISION
from dj_vocal import add_hook


class Renderer:
    def __init__(self, deadline, limit, engine=None, generate=ace):
        if not time.time() < deadline <= time.time()+2400 or type(limit) is not int or not 1 <= limit <= 100:
            raise ValueError('Invalid renderer bounds')
        self.deadline, self.limit, self.engine, self.generate = deadline, limit, engine, generate
        self.identity, self.seen, self.cached = secrets.token_hex(16), set(), None
        self.requests = 0

    def render(self, value):
        if not isinstance(value, dict) or set(value) != {'job', 'request', 'vocals'} or type(value['vocals']) is not bool or str(uuid.UUID(value['job'])) != value['job']:
            raise ValueError('Invalid job')
        track = request(value['request'])
        fingerprint = hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()
        if time.time()+30 >= self.deadline:
            raise ValueError('Renderer expired')
        if self.cached and self.cached[0] == fingerprint:
            return self.cached[1:]
        if value['job'] in self.seen or self.requests >= self.limit:
            raise ValueError('Job already consumed or request allowance exhausted')
        self.seen.add(value['job'])
        started = time.monotonic()
        def generate(*args, **kwargs):
            if self.requests >= self.limit: raise ValueError('Model request allowance exhausted')
            self.requests += 1
            return self.generate(*args, **kwargs)
        with tempfile.TemporaryDirectory(prefix='jamloom-dj-') as directory:
            samples, rate = generate(track, Path(directory), self.engine)
            vocal = None
            if self.requests < self.limit and value['vocals'] and track['sequence'] % 5 == 2 and track['energy'] >= 3:
                samples, vocal = add_hook(track, samples, rate, Path(directory), self.engine, generate)
            pcm = canonical(samples, rate)
            guide_path=Path(directory)/'guide/receipt.json'
            composition=json.loads(guide_path.read_text()) if guide_path.is_file() else None
        stream = io.BytesIO()
        with wave.open(stream, 'wb') as audio:
            audio.setparams((2, 2, 48000, 0, 'NONE', 'not compressed'))
            audio.writeframes(pcm.tobytes())
        data = stream.getvalue()
        elapsed = max(1, round((time.monotonic()-started)*1000))
        if elapsed > 30000 or time.time() >= self.deadline:
            raise ValueError('Generation-ahead deadline failed')
        receipt = dict(version=1, engine=self.identity, job=value['job'], request=track,
                       code_revision=CODE_REVISION, weights_revision=WEIGHTS_REVISION,
                       compute_ms=elapsed, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), vocal=vocal)
        if composition is not None:receipt['composition']=composition
        self.cached = fingerprint, receipt, data
        return receipt, data


def handler(renderer, token):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_GET(self):
            if self.path != '/health' or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer '+token):
                self.send_error(403); return
            ready = time.time()+90 < renderer.deadline and renderer.requests < renderer.limit
            data = json.dumps(dict(ready=ready, code_revision=CODE_REVISION, weights_revision=WEIGHTS_REVISION)).encode()
            self.send_response(200 if ready else 503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self):
            self.connection.settimeout(35)
            if self.path != '/render' or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer '+token):
                self.send_error(403); return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 1 <= length <= 4096 or self.headers.get('Transfer-Encoding'):
                    raise ValueError('Invalid body')
                receipt, data = renderer.render(json.loads(self.rfile.read(length)))
            except (ValueError, TypeError, KeyError):
                self.send_error(422); return
            except Exception:
                self.send_error(503); return
            self.send_response(200)
            self.send_header('Content-Type', 'audio/wav')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Jamloom-Receipt', json.dumps(receipt, separators=(',', ':')))
            self.end_headers()
            self.wfile.write(data)
    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--token-file', type=Path, required=True)
    parser.add_argument('--expires-unix', type=float, required=True)
    parser.add_argument('--max-requests', type=int, required=True)
    modes=parser.add_mutually_exclusive_group()
    modes.add_argument('--arranged', action='store_true', help='Use the unqualified arrangement candidate for a bounded listening trial')
    modes.add_argument('--house-study', action='store_true', help='Paired house-only study; sequence selects the predeclared condition')
    modes.add_argument('--composition-study',action='store_true',help='Paired original-score conditioning experiment')
    modes.add_argument('--guided-set',action='store_true',help='Original-score set with sparse original vocal candidates')
    args = parser.parse_args()
    if args.token_file.stat().st_mode & 0o077:
        raise ValueError('Token file must be private')
    token = args.token_file.read_text().strip()
    if len(token) != 64 or any(c not in '0123456789abcdef' for c in token):
        raise ValueError('Invalid token')
    renderer = Renderer(args.expires_unix, args.max_requests, generate=composition_set if args.guided_set else composition_study if args.composition_study else house_study if args.house_study else partial(ace, arranged=args.arranged))
    renderer.engine = load_ace()
    server = HTTPServer(('127.0.0.1', 8768), handler(renderer, token))
    server.timeout = 1
    print('Jamloom renderer ready', flush=True)
    try:
        while time.time()+30 < renderer.deadline:
            server.handle_request()
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
