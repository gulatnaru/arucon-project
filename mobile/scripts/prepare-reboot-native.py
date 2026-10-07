"""Fetch pinned public SDK/model into ignored workspace paths; no system install."""
import pathlib
import urllib.request
import json
import hashlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
EVIDENCE = ROOT.parent / "evidence/reboot-01-2026-10-07"
VENDOR = ROOT / "native/arucon-embedding/ios/vendor"
MODEL = "litert-community/embeddinggemma-2-text-270m-litert-lm"
REVISION = "9be6e8b90982095dc05c2bd162e4b954ee4dbac7"
FILES = {
    "MediaPipeTasksCommon": "d2194b929b91f0c866b2f8d65003e08c474f6c85e8ca7293511e9ff4a780aa68",
    "MediaPipeTaskGraphs": "6e59def0a86dcf8b357d6dc4220c8f45a3704449e7c7734677f2db50671c7def",
    "MediaPipeTasksVision": "d66d9929a28febdd52aba49b3336e1550e4526ab0b772c49321db05af5c7614e",
    "MediaPipeTasksText": "b99e9f993a4e5c366122a62f2a14a654fa5625d6f96035cd2c1bafd4c69eaa0f",
    "MediaPipeTasksAudio": "9c4506f23169a0387a745d67f4fe8872e0c381f4b67e33babd75b2187c463d11",
    "MediaPipeTasksRetrieval": "e9703c40ce7becef0e1302a80a7fc8e6bb3205de41f367934d50f5e06f43de44",
    "MediaPipeTasksDecision": "aec1c72c583d25161b68750e19656c2b4092feded7ca4acb62c76de0cc479efb",
}


def download(url, path):
    if not path.exists():
        temporary = path.with_suffix(path.suffix + ".part")
        urllib.request.urlretrieve(url, temporary)
        temporary.replace(path)
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for part in iter(lambda: f.read(4 * 1024 * 1024), b""):
            digest.update(part)
    return digest.hexdigest()


def main():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    VENDOR.mkdir(parents=True, exist_ok=True)
    results = []
    for name, expected in FILES.items():
        url = "https://dl.google.com/cpdc/20261005-190020/" + name + "-1.1.0.xcframework.zip"
        p = EVIDENCE / (name + "-1.1.0.xcframework.zip")
        digest = download(url, p)
        if digest != expected:
            raise ValueError("SDK checksum mismatch: " + name)
        with zipfile.ZipFile(p) as z:
            for i in z.infolist():
                target = (VENDOR / i.filename).resolve()
                if VENDOR.resolve() not in target.parents:
                    raise ValueError("Archive path escaped vendor")
                if not i.is_dir():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(z.read(i))
        results.append({"artifact": name, "version": "1.1.0", "sha256": digest})
        print("Verified " + name, flush=True)
    name = "embeddinggemma-2-text-270m.litertlm"
    model_path = EVIDENCE / name
    digest = download(f"https://huggingface.co/{MODEL}/resolve/{REVISION}/{name}", model_path)
    receipt = {"modelId": MODEL, "revision": REVISION, "license": "Apache-2.0", "file": name,
               "bytes": model_path.stat().st_size, "sha256": digest, "sdk": results,
               "sdkSourceRevision": "f46269cdd44896b0801c113470eee212a050e0d3"}
    (EVIDENCE / "native-model-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt), flush=True)


if __name__ == "__main__":
    main()
