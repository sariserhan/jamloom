"""Run the focused suite against main or the isolated deployed-source candidate."""
import argparse
import json
from pathlib import Path
import platform
import sys
import unittest

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('root',type=Path)
parser.add_argument('report',type=Path)
parser.add_argument('--deployed-source',action='store_true',help='Accepted older source has no test_runpod_spleeter module')
args=parser.parse_args()
sys.path.insert(0,str(args.root.resolve()))
names=['test_identity_preload','test_generation_timing','test_hosted_identity_separator',
       'test_vocal_identity','test_identity_stems','test_singer_studio','test_singing_response',
       'test_runpod_worker','test_runpod_spleeter','test_local_call_edit','test_worker_runtime_base']
if args.deployed_source:names.remove('test_runpod_spleeter')
parts=[unittest.defaultTestLoader.loadTestsFromName('tests.'+name) for name in names]
counts={name:part.countTestCases() for name,part in zip(names,parts)}
result=unittest.TextTestRunner(verbosity=1).run(unittest.TestSuite(parts))
report={'status':'PASS' if result.wasSuccessful() else 'FAIL','platform':platform.platform(),
        'python':platform.python_version(),'checks':result.testsRun,'failures':len(result.failures),
        'errors':len(result.errors),'skipped':len(result.skipped),'counts':counts,
        'realGPUInference':False,'hostedSpeedupMeasured':False,
        'sourceScope':'accepted older deployed source' if args.deployed_source else 'main',
        'absentFromOlderSource':['test_runpod_spleeter'] if args.deployed_source else []}
args.report.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
raise SystemExit(0 if result.wasSuccessful() else 1)
