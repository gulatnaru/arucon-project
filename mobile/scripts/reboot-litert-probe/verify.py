#!/usr/bin/env python3
"""Standalone synthetic Swift EmbeddingEngine check; never edits the game or DB.

All SDK/cache/build/model-copy outputs must stay in the ignored evidence folder.
No global install, account, chat Engine, health input or external inference.
"""
from pathlib import Path
import argparse
import hashlib
import json
import plistlib
import shutil
import subprocess
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[3]
TEMPLATES = Path(__file__).resolve().parent
REVISION = "b2f686e2ed4718fb84ec398a61dd59ca0f0aff27"
MODEL_SHA = "2d079ee2f6f066b1f368e8d7c819f55214eaef1d0513b312321901f30ab286fb"
ARTIFACTS = {
    "CLiteRTLM.xcframework.zip": "d765b99592d4ec3d0c9e2bd69469454af06c834861340672da1891c0c121c347",
    "CLiteRTLM_mac.xcframework.zip": "5f6ee68d95eeccb084c6e66d5ee47255e3020fa0fb29696dd0301ae26d6cfb4f",
}
SOURCES = ["Benchmark.swift", "Config.swift", "Conversation.swift", "EmbeddingEngine.swift", "EmbeddingEngineConfig.swift", "Engine.swift", "ExperimentalFlags.swift", "LiteRTLMError.swift", "Message.swift", "ModelInfo.swift", "ResponseFormat.swift", "Tool.swift", "ToolManager.swift"]


def run(args, log):
    result = subprocess.run(list(map(str, args)), capture_output=True, text=True)
    log.write_text(result.stdout + result.stderr)
    if result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}); inspect {log}")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, required=True, help="Existing pinned public text270m file; no download of private inputs")
    parser.add_argument("--output", type=Path, default=ROOT / "evidence/reboot-litert-swift-probe")
    parser.add_argument("--device", help="Optional already-booted ARM64 Simulator UDID; installs only a separate synthetic probe")
    args = parser.parse_args()
    out = args.output.resolve()
    # Refuse accidental SDK/build/weight outputs in tracked source directories.
    evidence = (ROOT / "evidence").resolve()
    if evidence not in out.parents:
        raise ValueError("--output must be under the repository's ignored evidence/")
    if hashlib.sha256(args.model.read_bytes()).hexdigest() != MODEL_SHA:
        raise ValueError("Model bytes differ from the verified public text270m revision; preserving input")
    out.mkdir(parents=True, exist_ok=True)
    receipt = []
    for name, expected in ARTIFACTS.items():
        url = f"https://github.com/google-ai-edge/LiteRT-LM/releases/download/v0.18.0/{name}"
        archive = out / name
        if not archive.exists():
            with urllib.request.urlopen(url) as source, archive.open("wb") as target:
                shutil.copyfileobj(source, target)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        if digest != expected:
            raise ValueError(f"Checksum mismatch; preserving {archive}")
        with zipfile.ZipFile(archive) as z:
            if any(Path(n).is_absolute() or ".." in Path(n).parts for n in z.namelist()):
                raise ValueError("Unsafe SDK archive path")
            z.extractall(out / "vendor")
        receipt.append({"sdk": "0.18.0", "sourceRevision": REVISION, "artifact": name, "url": url, "sha256": digest})
    for name in SOURCES:
        url = f"https://raw.githubusercontent.com/google-ai-edge/LiteRT-LM/{REVISION}/swift/{name}"
        data = urllib.request.urlopen(url).read()
        (out / name).write_bytes(data)
        receipt.append({"source": name, "revision": REVISION, "sha256": hashlib.sha256(data).hexdigest()})
    (out / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    swift = [out / name for name in SOURCES]
    host = out / "build-host"
    host.mkdir(exist_ok=True)
    mac = out / "vendor/CLiteRTLM_mac.xcframework/macos-arm64_x86_64"
    base = ["xcrun", "swiftc", "-swift-version", "5", "-parse-as-library", "-module-cache-path", out / "module-cache"]
    run(base + ["-module-name", "LiteRTLM", "-emit-library", "-emit-module", "-emit-module-path", host / "LiteRTLM.swiftmodule", "-I", mac / "Headers", "-L", mac, "-lCLiteRTLM_mac", "-Xlinker", "-rpath", "-Xlinker", mac, *swift, "-o", host / "libLiteRTLM.dylib"], out / "host-wrapper.log")
    run(base + ["-I", host, "-I", mac / "Headers", "-L", host, "-lLiteRTLM", "-Xlinker", "-rpath", "-Xlinker", host, TEMPLATES / "ProbeCore.swift", TEMPLATES / "HostMain.swift", "-o", host / "probe"], out / "host-build.log")
    cache = out / "cache-host"
    cache.mkdir(exist_ok=True)
    run([host / "probe", args.model.resolve(), cache, out / "real-swift-host.json"], out / "host-run.log")
    print((out / "real-swift-host.json").read_text())
    if not args.device:
        return
    sim = out / "build-simulator"
    sim.mkdir(exist_ok=True)
    sdk = subprocess.check_output(["xcrun", "--sdk", "iphonesimulator", "--show-sdk-path"], text=True).strip()
    ios = out / "vendor/CLiteRTLM.xcframework/ios-arm64-simulator"
    base = ["xcrun", "swiftc", "-swift-version", "5", "-parse-as-library", "-target", "arm64-apple-ios15.1-simulator", "-sdk", sdk, "-module-cache-path", out / "module-cache-simulator"]
    run(base + ["-module-name", "LiteRTLM", "-emit-library", "-emit-module", "-emit-module-path", sim / "LiteRTLM.swiftmodule", "-F", ios, "-framework", "CLiteRTLM", "-Xlinker", "-install_name", "-Xlinker", "@rpath/libLiteRTLM.dylib", *swift, "-o", sim / "libLiteRTLM.dylib"], out / "sim-wrapper.log")
    app = out / "RebootEmbeddingProbe.app"
    frameworks = app / "Frameworks"
    frameworks.mkdir(parents=True, exist_ok=True)
    run(base + ["-I", sim, "-F", ios, "-L", sim, "-lLiteRTLM", "-framework", "CLiteRTLM", "-framework", "UIKit", "-Xlinker", "-rpath", "-Xlinker", "@executable_path/Frameworks", TEMPLATES / "ProbeCore.swift", TEMPLATES / "SimulatorMain.swift", "-o", app / "RebootEmbeddingProbe"], out / "sim-app-build.log")
    shutil.copy2(sim / "libLiteRTLM.dylib", frameworks)
    shutil.copytree(ios / "CLiteRTLM.framework", frameworks / "CLiteRTLM.framework", dirs_exist_ok=True)
    shutil.copy2(args.model, app / "model.litertlm")
    (app / "Info.plist").write_bytes(plistlib.dumps({"CFBundleExecutable": "RebootEmbeddingProbe", "CFBundleIdentifier": "com.arucon.reboot.embeddingprobe", "CFBundleName": "RebootEmbeddingProbe", "CFBundleVersion": "1", "CFBundleShortVersionString": "0.18.0", "CFBundlePackageType": "APPL", "MinimumOSVersion": "15.1", "LSRequiresIPhoneOS": True, "UILaunchScreen": {}, "UIDeviceFamily": [1, 2]}))
    for i, target in enumerate([frameworks / "CLiteRTLM.framework", frameworks / "libLiteRTLM.dylib", app]):
        run(["codesign", "--force", "--sign", "-", target], out / f"sim-sign-{i}.log")
    run(["xcrun", "simctl", "install", args.device, app], out / "sim-install.log")
    run(["xcrun", "simctl", "launch", args.device, "com.arucon.reboot.embeddingprobe"], out / "sim-launch.log")
    print("Read Documents/real-swift-simulator.json in the separate probe container; process launch is not an inference PASS.")


if __name__ == "__main__":
    main()
