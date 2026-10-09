#!/usr/bin/env python3
"""Catch storyboard mistakes before spending minutes on a render.

    python3 scripts/check-storyboard.py <explainer-folder>

Checks references (ids in edges, groups and actions), word anchors against
timeline.json (when the narration has been generated), layout (overlapping
cards, arrows that cut through other cards, groups that swallow non-members),
and text that will not fit or will be mispronounced. Exit code 1 on errors.
"""
import json, re, sys
from pathlib import Path

NODE_W, NODE_H = 360, 160  # keep in sync with packages/renderer/src/explainer/geometry.ts

root = Path(sys.argv[1])
story = json.loads((root / "storyboard.json").read_text())
tl_path = root / "timeline.json"
tl = json.loads(tl_path.read_text()) if tl_path.exists() else None
errors, warnings = [], []
err, warn = errors.append, warnings.append

nodes = {n["id"]: n for n in story["diagram"]["nodes"]}
edges = {e["id"]: e for e in story["diagram"]["edges"]}
groups = {g["id"]: g for g in story["diagram"].get("groups", [])}
everything = set(nodes) | set(edges)

# --- references ------------------------------------------------------------
if len(nodes) != len(story["diagram"]["nodes"]): err("duplicate node ids")
for e in edges.values():
    for end in ("from", "to"):
        if e[end] not in nodes: err(f"edge {e['id']}: {end} '{e[end]}' is not a node")
for g in groups.values():
    for m in g["members"]:
        if m not in nodes: err(f"group {g['id']}: member '{m}' is not a node")

norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
shown, drawn = set(), set()
for i, beat in enumerate(story["beats"]):
    words = tl["beats"][i]["words"] if tl and i < len(tl["beats"]) else None
    for a in beat.get("do", []):
        where = f"beat {i} ({beat.get('say', '')[:40]!r})"
        for key in ("show", "group"):
            for x in a.get(key, []) or []:
                if x not in (nodes if key == "show" else groups): err(f"{where}: {key} '{x}' unknown")
        shown.update(a.get("show", []) or [])
        for key in ("draw", "packet"):
            if key in a and a[key] not in edges: err(f"{where}: {key} '{a[key]}' is not an edge")
        if "draw" in a: drawn.add(a["draw"])
        if "packet" in a and a["packet"] not in drawn and not any(b.get("overview") for b in beat.get("do", [])):
            warn(f"{where}: packet on '{a['packet']}' before it is drawn")
        for key in ("chip", "note"):
            if key in a and a[key] not in nodes: err(f"{where}: {key} '{a[key]}' is not a node")
        if isinstance(a.get("focus"), list):
            for x in a["focus"]:
                if x not in nodes: err(f"{where}: focus '{x}' is not a node")
        if isinstance(a.get("spot"), list):
            for x in a["spot"]:
                if x not in everything: err(f"{where}: spot '{x}' unknown")
        if a.get("at") and words is not None:
            w, _, nth = a["at"].partition("#")
            hits = [x for x in words if norm(x["w"]).startswith(norm(w))]
            if len(hits) < (int(nth) if nth else 1):
                err(f"{where}: anchor '{a['at']}' is not spoken in this beat")
        if a.get("label") and len(a["label"]) > 42: warn(f"{where}: packet label is long ({len(a['label'])} chars)")
        if a.get("note") and len(a.get("text") or "") > 46: warn(f"{where}: note text is long")
        if a.get("principle"):
            p = a["principle"]
            if len(p["name"]) > 40: warn(f"{where}: principle name is long")
            if len(p["text"]) > 150: warn(f"{where}: principle text is long ({len(p['text'])} chars)")
    say = beat.get("say", "")
    for m in re.findall(r"\b(?:[A-Z]{2,}\w*|\d[\d.,]*)\b", say):
        warn(f"beat {i}: '{m}' in say — spell it as it should sound and add captionFix")
for n in nodes:
    if n not in shown: warn(f"node '{n}' is never shown (only visible in the overview)")
for e in edges:
    if e not in drawn: warn(f"edge '{e}' is never drawn (only visible in the overview)")

# --- timing: packets must not land on cards that are not on screen yet ------
if tl:
    fps = tl["fps"]
    def frame_of(i, a):
        words = tl["beats"][i]["words"]; f = tl["beats"][i]["start"]
        if a.get("at"):
            w, _, nth = a["at"].partition("#")
            hits = [x for x in words if norm(x["w"]).startswith(norm(w))]
            k = (int(nth) if nth else 1) - 1
            if k < len(hits): f = hits[k]["start"]
        return f + round(a.get("delay", 0) * fps)
    show_at = {}
    for i, beat in enumerate(story["beats"]):
        for a in beat.get("do", []):
            for n in a.get("show", []) or []:
                show_at[n] = min(show_at.get(n, 1e9), frame_of(i, a))
    for i, beat in enumerate(story["beats"]):
        for a in beat.get("do", []):
            if "packet" in a and a["packet"] in edges:
                e = edges[a["packet"]]
                land = frame_of(i, a) + round(a.get("dur", 1.2) * fps)
                for end, when in ((e["from"], frame_of(i, a)), (e["to"], land)):
                    if show_at.get(end, 1e9) > when:
                        warn(f"beat {i}: packet on '{e['id']}' reaches '{end}' before it is shown")

# --- layout ----------------------------------------------------------------
inside = lambda x, y, n, pad=0: abs(x - n["x"]) < NODE_W / 2 + pad and abs(y - n["y"]) < NODE_H / 2 + pad
ids = list(nodes)
for i, a in enumerate(ids):
    for b in ids[i + 1:]:
        A, B = nodes[a], nodes[b]
        if abs(A["x"] - B["x"]) < NODE_W + 40 and abs(A["y"] - B["y"]) < NODE_H + 40:
            err(f"cards '{a}' and '{b}' overlap or touch")
for e in edges.values():
    a, b = nodes.get(e["from"]), nodes.get(e["to"])
    if not a or not b: continue
    bend = e.get("bend", 0)
    L = max(1, ((b["x"] - a["x"]) ** 2 + (b["y"] - a["y"]) ** 2) ** 0.5)
    cx = (a["x"] + b["x"]) / 2 - (b["y"] - a["y"]) / L * bend * 2
    cy = (a["y"] + b["y"]) / 2 + (b["x"] - a["x"]) / L * bend * 2
    for k in range(1, 60):
        t = k / 60
        x = (1 - t) ** 2 * a["x"] + 2 * (1 - t) * t * cx + t * t * b["x"]
        y = (1 - t) ** 2 * a["y"] + 2 * (1 - t) * t * cy + t * t * b["y"]
        hit = [n for n in ids if n not in (e["from"], e["to"]) and inside(x, y, nodes[n], 8)]
        if hit:
            err(f"edge '{e['id']}' ({e['from']}→{e['to']}) runs through '{hit[0]}'"); break
for g in groups.values():
    ms = [nodes[m] for m in g["members"] if m in nodes]
    if not ms: continue
    pad, top = g.get("pad", 46), g.get("padTop", 78)
    x0 = min(n["x"] for n in ms) - NODE_W / 2 - pad; x1 = max(n["x"] for n in ms) + NODE_W / 2 + pad
    y0 = min(n["y"] for n in ms) - NODE_H / 2 - top; y1 = max(n["y"] for n in ms) + NODE_H / 2 + pad
    for n in nodes.values():
        if n["id"] not in g["members"] and x0 < n["x"] < x1 and y0 < n["y"] < y1:
            err(f"group '{g['id']}' box contains non-member '{n['id']}'")

# --- report ----------------------------------------------------------------
if tl:
    print(f"length {tl['totalFrames'] / tl['fps']:.0f}s, {len(tl['beats'])} beats")
    for i, b in enumerate(tl["beats"]):
        print(f"  beat {i:2d}  frames {b['start']:5d}-{b['end']:5d}  ({(b['end'] - b['start']) / tl['fps']:4.1f}s)")
for w in warnings: print("warn ", w)
for e in errors: print("ERROR", e)
print(f"{len(errors)} errors, {len(warnings)} warnings")
sys.exit(1 if errors else 0)
