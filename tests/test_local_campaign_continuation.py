import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from run_local_improvise_qualification import retained_trials,digest


class LocalContinuation(unittest.TestCase):
    def test_reuses_only_matching_stopped_results_and_preserves_elapsed_budget(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);trial=root/'renders'/'trial';trial.mkdir(parents=True)
            manifest=root/'manifest.json';manifest.write_text('{}');audio=trial/'performance.wav';audio.write_bytes(b'original retained fixture')
            fixture={'label':'source-funk'};row=dict(label=fixture['label'],directory=str(trial),sha256=digest(audio))
            result=dict(fixture=fixture,status='PASS technical',sha256=digest(audio))
            (trial/'result.json').write_text(json.dumps(result));(trial/'execution.json').write_text(json.dumps(dict(status='PASS technical',child_stopped=True)))
            campaign=root/'renders'/'campaign.json';state=dict(status='FAIL stopped',manifest_sha256=digest(manifest),completed=[row],seconds=123.5)
            def write():campaign.write_text(json.dumps(state))
            write()
            with patch('run_local_improvise_qualification.ROOT',root):
                self.assertEqual(retained_trials(campaign,manifest,[fixture],set()),([row],123.5))
                with self.assertRaises(ValueError):retained_trials(campaign,manifest,[fixture],{'source-funk'})
                state['status']='RUNNING';write()
                with self.assertRaises(ValueError):retained_trials(campaign,manifest,[fixture],set())
                state['status']='FAIL stopped';write();audio.write_bytes(b'changed')
                with self.assertRaises(ValueError):retained_trials(campaign,manifest,[fixture],set())


if __name__=='__main__':unittest.main()
