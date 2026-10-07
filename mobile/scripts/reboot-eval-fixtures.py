# -*- coding: utf-8 -*-
"""Authored synthetic gold cases, not observed user memories."""
import pathlib
import json

root = pathlib.Path(__file__).resolve().parents[1]
corpus = [
    {"id": "h-first", "petId": "main", "item": "hat", "context": "first", "completed": True, "text": "처음 진주빛 모자를 쓰고 몇 걸음 걸으며 낯선 모자를 살펴보았다."},
    {"id": "h-repeat", "petId": "main", "item": "hat", "context": "repeat", "completed": True, "text": "같은 모자를 다시 쓰고 익숙하게 앞발 인사를 했다."},
    {"id": "h-busy", "petId": "main", "item": "hat", "context": "busy", "completed": True, "text": "주변을 탐색하던 중 모자를 쓰고 잠깐 확인한 뒤 활동을 이어갔다."},
    {"id": "c-left", "petId": "main", "item": "cushion", "context": "old", "completed": True, "text": "쿠션이 왼쪽에 있을 때 그 자리에서 편안히 쉬었다."},
    {"id": "c-right", "petId": "main", "item": "cushion", "context": "current", "completed": True, "text": "쿠션을 오른쪽으로 옮긴 뒤 새 위치를 찾아가 앉았다."},
    {"id": "hand", "petId": "main", "item": "hand", "context": "contact", "completed": True, "text": "내민 손에 천천히 다가와 닿고, 손을 거두자 원래 생활로 돌아갔다."},
    {"id": "canceled", "petId": "main", "item": "hat", "context": "first", "completed": False, "text": "모자가 처음이라 살펴보려다 중간에 취소되었다."},
    {"id": "other", "petId": "other", "item": "hat", "context": "first", "completed": True, "text": "다른 아이가 처음 모자를 쓰고 조심스럽게 움직였다."},
]
groups = [
    ("hat", "first", "h-first", ["머리 위에 얹은 것이 처음이라 낯설었다.", "새 모자를 쓰고 살핀 경험", "처음 모자를 만났을 때 조심스러웠지."]),
    ("hat", "repeat", "h-repeat", ["또 썼는데 이제 익숙한 모자야.", "같은 모자를 다시 쓰고 편해졌어.", "낯설지 않아서 발로 인사한 모자 경험"]),
    ("hat", "busy", "h-busy", ["구경하다 모자를 쓰고 계속했어.", "하던 일을 방해하지 않고 모자를 확인했어.", "할 일이 있어서 모자 반응은 잠깐만"]),
    ("cushion", "old", "c-left", ["예전에 쿠션이 왼쪽에 있었지.", "옛 왼쪽 휴식 자리", "쿠션을 옮기기 전 편하게 쉬던 곳"]),
    ("cushion", "current", "c-right", ["오른쪽으로 옮긴 쿠션을 찾아갔어.", "새 쿠션 위치를 보고 앉았어.", "왼쪽 기억과 달리 현재 오른쪽에 있는 쿠션"]),
    ("hand", "contact", "hand", ["손에 다가왔다 손을 놓으니 돌아갔어.", "내민 손을 확인하고 기대었다가 돌아갔어.", "손을 거두고 다시 탐색한 기억"]),
]
cases = [{"query": text, "petId": "main", "item": item, "context": context, "gold": [gold], "gate": "awake"}
         for item, context, gold, texts in groups for text in texts]
cases += [
    {"query": "모자를 안 쓸 거야.", "petId": "main", "item": "hat", "context": "first", "gold": [], "gate": "negated"},
    {"query": "잠자는 동안 모자를 써.", "petId": "main", "item": "hat", "context": "first", "gold": [], "gate": "sleeping"},
    {"query": "조회 중 상태가 바뀌었어.", "petId": "main", "item": "hat", "context": "first", "gold": [], "gate": "stale"},
    {"query": "다른 아이의 모자 기억", "petId": "unknown", "item": "hat", "context": "first", "gold": [], "gate": "awake"},
    {"query": "없는 안경의 경험", "petId": "main", "item": "glasses", "context": "first", "gold": [], "gate": "awake"},
    {"query": "취소된 사건만 참고", "petId": "main", "item": "canceled-only", "context": "first", "gold": [], "gate": "awake"},
]
assert len(cases) == 24
p = root / "fixtures/reboot-memory-cases.json"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(json.dumps({"schemaVersion": 1, "scope": "SYNTHETIC_EVALUATION_ONLY", "corpus": corpus, "cases": cases}, ensure_ascii=False, indent=2) + "\n")
print("24 synthetic gold cases saved")
