"""Exercise the deployed-error boundary without uploading audio or invoking a model."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('arrangement_worker',ROOT/'services/runpod/handler.py')
worker=importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ArrangementDiagnostics(unittest.TestCase):
    def test_static_reasons_survive_but_private_or_malformed_details_do_not(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);work=root/'improvise'/'case';work.mkdir(parents=True)
            for diagnostic,expected in [
                ([{'reason':'no-placement','options_considered':0}],'no-placement'),
                ([{'reason':'no-safe-mix','rejected_candidates':4}]*4,'no-safe-mix'),
                ([{'reason':'validation'}],'validation'),
                ([{'reason':'private phrase /Users/person/recording.wav'}],None),
                ([{'reason':['private']}],None),
                ([{'reason':'no-placement'},None],None),
                ([{'reason':'no-placement'},{'reason':'no-safe-mix'}],None),
                ([{'reason':'no-placement'}]*5,None),
                ([],None),
            ]:
                with self.subTest(diagnostic=diagnostic):
                    (work/'failure.json').write_text(json.dumps({'stage':'Blending your sound into the song',
                        'arrangement_diagnostics':diagnostic}))
                    self.assertEqual(worker.failure_location(root),'improvise-arrangement'+(':'+expected if expected else ''))


if __name__=='__main__':unittest.main()
