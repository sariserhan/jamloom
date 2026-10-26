"""Exercise the shipped package without access to repository-relative data."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]


class SungPackageTests(unittest.TestCase):
    def test_isolated_package_requires_both_music_dna_manifests(self):
        plan=json.loads((ROOT/'docs/evidence/dj-sung-hooks-20261026/gpu-plan.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);package=root/'ace-step';package.mkdir()
            for name in plan['worker_sha256']:
                if name.endswith('.py'):shutil.copyfile(ROOT/'scripts'/name,package/name)
            shutil.copyfile(ROOT/'assets/manifests/dj-styles.json',package/'dj-styles.json')
            code="import sys;sys.path.insert(0,sys.argv[1]);import dj_warm_engine,dj_sung_hooks;assert dj_sung_hooks.__file__.startswith(sys.argv[1]);print('PACKAGED_IMPORT_PASS')"
            def check():return subprocess.run([sys.executable,'-I','-c',code,str(package)],cwd=root,capture_output=True,text=True,timeout=30)
            first=check();self.assertNotEqual(first.returncode,0);self.assertIn('song-durations.json',first.stderr)
            manifests=root/'assets/manifests';manifests.mkdir(parents=True)
            shutil.copyfile(ROOT/'assets/manifests/song-durations.json',manifests/'song-durations.json')
            second=check();self.assertNotEqual(second.returncode,0);self.assertIn('dna-languages.json',second.stderr)
            shutil.copyfile(ROOT/'assets/manifests/dna-languages.json',manifests/'dna-languages.json')
            third=check();self.assertEqual(third.returncode,0,third.stderr);self.assertEqual(third.stdout.strip(),'PACKAGED_IMPORT_PASS')
            shell=(ROOT/'scripts/cloud_dj_warm.sh').read_text()
            self.assertIn('mkdir -p /workspace/assets/manifests',shell)
            for name in ['song-durations.json','dna-languages.json']:self.assertIn('/workspace/'+name,shell)


if __name__=='__main__':unittest.main()
