import json
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import Mock,patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import run_local_dj_qualification as runner


class LocalQualification(unittest.TestCase):
    def test_startup_failure_stops_only_its_matching_supervisor(self):
        for matching in (True,False):
            with tempfile.TemporaryDirectory() as directory:
                root=Path(directory).resolve();folder=root/'renders/dj-metal-endurance-test';engine=folder/'engine';engine.mkdir(parents=True)
                (engine/'watchdog.json').write_text(json.dumps({'status':'FAIL','supervisor_pid':123}))
                supervisor=Mock();supervisor.cmdline.return_value=['python','scripts/dj_metal_server.py','--output',str(engine if matching else root/'another-engine')]
                with patch.object(runner,'ROOT',root),patch('psutil.Process',return_value=supervisor),patch.object(runner.subprocess,'Popen') as launch:
                    with self.assertRaisesRegex(RuntimeError,'stopped during startup'):runner.run(folder)
                self.assertEqual(supervisor.terminate.call_count,int(matching));launch.assert_not_called()
                self.assertFalse((folder/'permit.json').exists())

    def test_waits_for_readiness_and_cleans_up_failed_client(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory).resolve();folder=root/'renders/dj-metal-endurance-test';engine=folder/'engine';engine.mkdir(parents=True)
            (engine/'watchdog.json').write_text(json.dumps({'status':'RUNNING','supervisor_pid':123}))
            (folder/'provider.json').write_text(json.dumps({'label':'local-test'}))
            def ready(_):
                (engine/'ready.json').write_text(json.dumps({'device':'mps','max_requests':180,'per_request_seconds':30,'deadline':time.time()+8900}))
            supervisor=Mock();supervisor.cmdline.return_value=['python','scripts/dj_metal_server.py','--output',str(engine)]
            child=Mock();child.wait.return_value=1;child.poll.return_value=1
            with patch.object(runner,'ROOT',root),patch('psutil.Process',return_value=supervisor),patch.object(runner.time,'sleep',side_effect=ready) as wait,patch.object(runner.subprocess,'Popen',return_value=child) as launch:
                with self.assertRaisesRegex(RuntimeError,'qualification failed'):runner.run(folder)
            wait.assert_called_once_with(1);supervisor.terminate.assert_called_once();launch.assert_called_once()
            self.assertEqual(launch.call_args.kwargs['env']['VASTAI_KEY'],'local-test-provider-only')
            self.assertIn('--local-metal',launch.call_args.args[0])


if __name__=='__main__':unittest.main()
