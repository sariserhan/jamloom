import sys
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from separate_singer import separate


class SeparationBoundsTests(unittest.TestCase):
    def test_stem_selection_is_explicit_and_typed(self):
        for value in [1, 'yes', None]:
            with self.assertRaisesRegex(ValueError, 'stem selection'):
                separate('missing.wav', 'unused', value)

    def test_short_voices_dj_tracks_and_existing_songs_keep_checkpoint_validation(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'source.wav'
            for seconds in (10, 30, 45, 60, 100, 140):
                with self.subTest(seconds=seconds):
                    self.write_audio(source, seconds)
                    with patch('separate_singer.model_digest', return_value='changed'):
                        with self.assertRaisesRegex(ValueError, 'checkpoint mismatch'):
                            separate(source, Path(folder) / 'output')
                    self.assertFalse((Path(folder) / 'output').exists())

    def test_duration_and_format_limits_still_reject_before_model_loading(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'source.wav'
            for seconds, channels, rate in ((9, 2, 48000), (141, 2, 48000), (10, 1, 48000), (10, 2, 44100)):
                with self.subTest(seconds=seconds, channels=channels, rate=rate):
                    self.write_audio(source, seconds, channels, rate)
                    with self.assertRaisesRegex(ValueError, 'supported-length stereo PCM|supported audio limit'):
                        separate(source, Path(folder) / 'output')
                    self.assertFalse((Path(folder) / 'output').exists())

    @staticmethod
    def write_audio(path, seconds, channels=2, rate=48000):
        with wave.open(str(path), 'wb') as audio:
            audio.setparams((channels, 2, rate, 0, 'NONE', 'not compressed'))
            audio.writeframes(b'\0' * (seconds * rate * channels * 2))
