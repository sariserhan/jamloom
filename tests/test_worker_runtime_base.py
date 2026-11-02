import importlib.util
import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("runtime_base", ROOT / "scripts/check_worker_runtime_base.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RuntimeBaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        manifest = json.loads((ROOT / "services/runpod/runtime-base.json").read_text())
        files = list(manifest["unchangedInputs"]) + manifest["runtimeFiles"] + ["services/runpod/runtime-base.json", "services/runpod/Dockerfile.runtime", "services/runpod/Dockerfile.runtime.dockerignore"]
        for name in files:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
        # Unit fixtures test validation independently of the checkout's release
        # status. Main includes newer code than the pinned isolated base. The CI
        # runtime recipe separately validates the real checkout before building.
        manifest['unchangedInputs'] = {name: hashlib.sha256((self.root / name).read_bytes()).hexdigest()
                                       for name in manifest['unchangedInputs']}
        (self.root / 'services/runpod/runtime-base.json').write_text(json.dumps(manifest))

    def test_verified_base_and_current_overlay(self):
        result = module.validate(self.root)
        self.assertEqual(result["runtimeFiles"], 3)
        self.assertEqual(result["status"], "PASS")

    def test_missing_or_extra_build_context_is_rejected(self):
        path = self.root / "services/runpod/Dockerfile.runtime.dockerignore"
        original = path.read_text()
        for changed in (original.replace("!scripts/vocal_identity.py\n", ""), original + "!.env\n"):
            path.write_text(changed)
            with self.assertRaisesRegex(AssertionError, "build context"):
                module.validate(self.root)

    def test_changed_model_or_dependency_is_rejected(self):
        path = self.root / "assets/manifests/singing-model.json"
        path.write_text(path.read_text() + " ")
        with self.assertRaisesRegex(AssertionError, "Base input changed"):
            module.validate(self.root)

    def test_changed_destination_is_rejected(self):
        path = self.root / "services/runpod/Dockerfile.runtime"
        path.write_text(path.read_text().replace("./scripts/", "./wrong/"))
        with self.assertRaisesRegex(AssertionError, "destination changed"):
            module.validate(self.root)

    def test_new_install_step_is_rejected(self):
        path = self.root / "services/runpod/Dockerfile.runtime"
        path.write_text(path.read_text() + "RUN pip install unexpected-package\n")
        with self.assertRaisesRegex(AssertionError, "only overlay source"):
            module.validate(self.root)
