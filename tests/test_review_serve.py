import importlib.util
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location('review_serve', Path(__file__).resolve().parents[1] / 'scripts/review_serve.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class ReviewServerTests(unittest.TestCase):
    def test_audio_ranges_and_private_path_boundary(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'public'
            root.mkdir()
            (root / 'set.mp3').write_bytes(b'0123456789')
            private = Path(directory) / 'private'
            private.write_text('not public')
            (root / 'escape').symlink_to(private)
            server.ROOT = root
            http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
            thread = threading.Thread(target=http.serve_forever, daemon=True)
            thread.start()
            base = f'http://127.0.0.1:{http.server_port}'
            try:
                for value, body, content_range in [('bytes=0-1', b'01', '0-1'), ('bytes=4-', b'456789', '4-9'), ('bytes=-3', b'789', '7-9'), ('bytes=8-99', b'89', '8-9')]:
                    with self.subTest(value=value), urlopen(Request(base + '/set.mp3', headers={'Range': value})) as response:
                        self.assertEqual(response.status, 206)
                        self.assertEqual(response.headers['Content-Range'], f'bytes {content_range}/10')
                        self.assertEqual(response.read(), body)
                with urlopen(Request(base + '/set.mp3', method='HEAD', headers={'Range': 'bytes=2-5'})) as response:
                    self.assertEqual(response.headers['Content-Length'], '4')
                    self.assertEqual(response.read(), b'')
                for value in ['bytes=10-', 'bytes=4-2', 'bytes=-0', 'bytes=-', 'bytes=0-1,4-5', 'bytes=' + '9' * 100 + '-']:
                    with self.subTest(value=value), self.assertRaises(HTTPError) as error:
                        urlopen(Request(base + '/set.mp3', headers={'Range': value}))
                    self.assertEqual(error.exception.code, 416)
                    error.exception.close()
                for path in ['/escape', '/']:
                    with self.assertRaises(HTTPError) as error:
                        urlopen(base + path)
                    self.assertEqual(error.exception.code, 404)
                    error.exception.close()
                with urlopen(base + '/set.mp3') as response:
                    self.assertEqual(response.read(), b'0123456789')
            finally:
                http.shutdown()
                http.server_close()
                thread.join()
