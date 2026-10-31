import json
from pathlib import Path
import sys
import tempfile
import unittest
import wave
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from check_neural_quiet import check,selection_check

class NeuralQuiet(unittest.TestCase):
    def test_absence_or_changed_capture_cannot_pass(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);self.assertEqual(check(root)['status'],'NOT RUN')
            (root/'quiet.wav').write_bytes(b'changed')
            (root/'qa-silence.json').write_text(json.dumps(dict(kind='silence',status='OWNER_SUBMITTED_REQUIRES_EVALUATION',payload=dict(file='quiet.wav',sha256='old',consent=True,kind='recorded_room_silence'))))
            with self.assertRaisesRegex(ValueError,'Recording changed'):check(root)

    def test_synthetic_zero_validates_selector_only_not_owner_recording(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'isolated-zero.wav'
            with wave.open(str(path),'wb') as wav:wav.setparams((1,2,16000,0,'NONE','not compressed'));wav.writeframes(bytes(96000))
            self.assertEqual(selection_check(path)['status'],'PASS')
            self.assertEqual(check(Path(folder))['status'],'NOT RUN')

if __name__=='__main__':unittest.main()
