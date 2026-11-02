#!/usr/bin/env python3
"""Reject runtime overlays that silently retain changed model/dependency inputs."""
import hashlib
import json
from pathlib import Path


def validate(root: Path) -> dict:
    manifest = json.loads((root / "services/runpod/runtime-base.json").read_text())
    recipe = (root / "services/runpod/Dockerfile.runtime").read_text().splitlines()
    assert [line for line in recipe if line.startswith("FROM ")] == ["FROM " + manifest["baseImage"]], "Runtime base image changed"
    commands = [line for line in recipe if line.strip() and not line.startswith("#")]
    assert all(line.split()[0] in {"FROM", "WORKDIR", "COPY"} for line in commands), "Runtime recipe may only overlay source files"
    assert [line for line in commands if line.startswith("WORKDIR ")] == ["WORKDIR /opt/jamloom"]
    for line in commands:
        if line.startswith("COPY "):
            sources, destination = line.split()[1:-1], line.split()[-1]
            assert all(destination == "./" + str(Path(source).parent) + "/" for source in sources), "Runtime copy destination changed"
    copied = [p for line in recipe if line.startswith("COPY ") for p in line.split()[1:-1]]
    assert sorted(copied) == sorted(manifest["runtimeFiles"]), "Runtime overlay file list changed"
    assert set(copied).isdisjoint(manifest["unchangedInputs"])
    rules = (root / "services/runpod/Dockerfile.runtime.dockerignore").read_text().splitlines()
    allowed = {"**", *["!" + str(Path(name).parent) + "/" for name in copied], *["!" + name for name in copied]}
    assert set(rules) == allowed, "Runtime build context must include exactly its reviewed source files"
    for name, expected in manifest["unchangedInputs"].items():
        assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, f"Base input changed: {name}; build and verify a new full base image first"
    for name in copied:
        assert (root / name).is_file(), f"Missing runtime overlay: {name}"
    return {"status": "PASS", "baseImage": manifest["baseImage"], "unchangedInputs": len(manifest["unchangedInputs"]), "runtimeFiles": len(copied)}


if __name__ == "__main__":
    print(json.dumps(validate(Path(__file__).resolve().parents[1])))
