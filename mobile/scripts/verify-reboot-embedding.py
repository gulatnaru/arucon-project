"""Public pinned model, synthetic Korean only. Host proof is not native proof."""
import argparse
import hashlib
import json
import os
import pathlib
import resource
import sys
import time

MODEL = "google/embeddinggemma-2"
REVISION = "914f7f89142e33e77833254d9c9b90c3cef7303b"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--cache", required=True)
    parser.add_argument("--cases")
    args = parser.parse_args()
    os.environ["HF_HOME"] = str(pathlib.Path(args.cache).resolve())
    os.environ["HF_XET_CACHE"] = str(pathlib.Path(args.cache).resolve() / "xet")
    os.environ["HF_HUB_DISABLE_XET"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    import numpy as np
    import torch
    import transformers
    from transformers import AutoConfig, AutoTokenizer, AutoModel
    torch.set_num_threads(2)
    start = time.perf_counter()
    config = AutoConfig.from_pretrained(MODEL, revision=REVISION, cache_dir=args.cache,
                                        vision_config=None, audio_config=None, trust_remote_code=False)
    tokenizer = AutoTokenizer.from_pretrained(MODEL, revision=REVISION, cache_dir=args.cache, trust_remote_code=False)
    model = AutoModel.from_pretrained(MODEL, revision=REVISION, config=config, cache_dir=args.cache,
                                      dtype=torch.float32, trust_remote_code=False).eval()
    def encode(texts, prompt_name):
        prefix = "task: search result | query: " if prompt_name == "SearchQuery" else "title: none | text: "
        inputs = tokenizer([prefix + x for x in texts], padding=True, return_tensors="pt")
        with torch.inference_mode():
            output = model(**inputs).last_hidden_state.float()
            mask = inputs["attention_mask"].unsqueeze(-1).float()
            pooled = (output * mask).sum(1) / mask.sum(1).clamp(min=1)
            return torch.nn.functional.normalize(pooled, dim=-1).cpu().numpy()
    load_ms = (time.perf_counter() - start) * 1000
    query = "새 모자가 낯설어서 이마를 살폈어."
    documents = ["아루가 처음 모자를 쓰고 이마를 살펴봤다.", "쿠션을 오른쪽으로 옮겼다."]
    start = time.perf_counter()
    q = encode([query], "SearchQuery")
    docs = encode(documents, "Document")
    first_ms = (time.perf_counter() - start) * 1000
    assert q.shape == (1, 768) and docs.shape == (2, 768)
    assert np.isfinite(q).all() and np.isfinite(docs).all()
    assert np.allclose(np.linalg.norm(docs, axis=1), 1, atol=0.001)
    start = time.perf_counter()
    warm = encode([query], "SearchQuery")
    warm_ms = (time.perf_counter() - start) * 1000
    files = []
    for p in pathlib.Path(args.cache).rglob("*.safetensors"):
        digest = hashlib.sha256()
        with p.open("rb") as f:
            for block in iter(lambda: f.read(4 * 1024 * 1024), b""):
                digest.update(block)
        files.append({"name": p.name, "bytes": p.stat().st_size, "sha256": digest.hexdigest()})
    result = {"status": "REAL_LOCAL_HOST_VERIFIED", "nativeSimulator": "NOT_RUN",
              "model": MODEL, "revision": REVISION, "license": "Apache-2.0",
              "library": {"transformers": transformers.__version__, "torch": torch.__version__,
                          "pooling": "official mask-aware mean then float32 L2 normalization",
                          "processor": "AutoTokenizer, text-only; no multimodal processor"},
              "device": "CPU / macOS host", "modalities": "text only",
              "dimensions": 768, "query": query, "documents": documents,
              "cosine": (warm @ docs.T).tolist(), "modelFiles": files,
              "loadMs": load_ms, "firstPairMs": first_ms, "warmQueryMs": warm_ms,
              "maxRssMiB": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / (1024 * 1024 if sys.platform == "darwin" else 1024),
              "externalInputTransmission": False}
    if args.cases:
        fixture = json.loads(pathlib.Path(args.cases).read_text())
        corpus, cases = fixture["corpus"], fixture["cases"]
        doc_vectors = encode([x["text"] for x in corpus], "Document")
        query_vectors = encode([x["query"] for x in cases], "SearchQuery")
        rows = []
        for i, case in enumerate(cases):
            candidates = [j for j, x in enumerate(corpus) if case["gate"] == "awake" and x["completed"]
                          and x["petId"] == case["petId"] and x["item"] == case["item"]]
            a = [corpus[j]["id"] for j in candidates if corpus[j]["context"] == case["context"]][:2]
            b = [corpus[j]["id"] for j in sorted(candidates, key=lambda j: float(query_vectors[i] @ doc_vectors[j]), reverse=True)[:2]]
            rows.append({"query":case["query"], "gate":case["gate"], "gold":case["gold"], "A":a, "B":b})
        def metrics(key):
            positive = [x for x in rows if x["gold"]]
            return {"RecallAt2":sum(len(set(x[key]) & set(x["gold"])) / len(x["gold"]) for x in positive) / len(positive),
                    "unnecessaryMemoryUse":sum(bool(x[key]) for x in rows if not x["gold"]),
                    "illegalMemoryOrAction":sum(any(y not in [corpus[j]["id"] for j in range(len(corpus)) if corpus[j]["completed"] and corpus[j]["petId"] == "main"] for y in x[key]) for x in rows)}
        result["comparison"] = {"scope":"24 synthetic host cases; native quantized model evaluated separately",
                                "cases":rows, "A":metrics("A"), "B":metrics("B"),
                                "conclusion":"Neither gameplay benefit nor native support follows from retrieval metrics alone"}
    pathlib.Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k != "modelFiles"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
