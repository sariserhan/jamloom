import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

from services.runpod import prepare_spleeter_model as prepare_model
from services.runpod import separate_spleeter


class SpleeterTests(unittest.TestCase):
    def test_model_archive_is_hash_checked_before_extraction(self):
        files={'checkpoint':b'model_checkpoint_path: model\n','model.index':b'index'}
        archive=io.BytesIO()
        with tarfile.open(fileobj=archive,mode='w:gz') as tar:
            for name,data in files.items():
                info=tarfile.TarInfo(name);info.size=len(data);tar.addfile(info,io.BytesIO(data))
        payload=archive.getvalue()
        manifest={'archive_url':'https://models.invalid/model.tar.gz','archive_bytes':len(payload),
            'archive_sha256':hashlib.sha256(payload).hexdigest(),'model_dir':'model',
            'files':{name:{'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()} for name,data in files.items()}}
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);manifest_path=root/'manifest.json';manifest_path.write_text(json.dumps(manifest))
            with patch.object(prepare_model,'ROOT',root),patch.object(prepare_model,'MANIFEST',manifest_path),patch.object(prepare_model.urllib.request,'urlopen',return_value=io.BytesIO(payload)):
                prepare_model.prepare()
                self.assertEqual({p.name:p.read_bytes() for p in (root/'model').iterdir()},files)

    def test_overlap_add_covers_audio_and_rejects_missing_stems(self):
        audio=np.zeros((100,2),dtype=np.float32)
        def predict(chunk):return {name:np.ones_like(chunk) for name in ('vocals','drums','bass','other')}
        stems=separate_spleeter.overlap_add(audio,predict,size=40,overlap=10)
        self.assertEqual(set(stems),{'vocals','drums','bass','other'})
        self.assertTrue(all(np.allclose(value,1) for value in stems.values()))
        with self.assertRaisesRegex(ValueError,'Unexpected Spleeter stems'):
            separate_spleeter.overlap_add(audio,lambda chunk:{'vocals':chunk},size=40,overlap=10)


if __name__=='__main__':unittest.main()
