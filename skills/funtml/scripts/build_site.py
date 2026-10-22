#!/usr/bin/env python3
"""Build a funtml page: python build_site.py project.json [out.html]

Reads the project JSON, fixes the usual small mistakes (wrong block names, plain strings where an
object is wanted), prints WARN/ERROR lines, and writes ONE self-contained html file.
Exit code 1 only when the page cannot be drawn (bad JSON, no sections, unresolvable graph).
Standard library only.
"""
import html
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "src"

TYPES = {"cards", "stats", "steps", "pipeline", "layers", "graph", "bars", "line", "donut", "timeline",
         "tree", "text", "code", "faq", "table", "gallery"}
ALIASES = {
    "features": "cards", "feature": "cards", "list": "cards", "grid": "cards", "highlights": "cards", "card": "cards",
    "numbers": "stats", "metrics": "stats", "kpi": "stats", "stat": "stats",
    "howto": "steps", "how-to": "steps", "step": "steps", "guide": "steps",
    "flow": "pipeline", "flowchart": "pipeline", "process": "pipeline", "workflow": "pipeline",
    "architecture": "layers", "stack": "layers", "layer": "layers",
    "diagram": "graph", "network": "graph", "map": "graph", "dependency": "graph", "dependencies": "graph", "nodes": "graph",
    "bar": "bars", "barchart": "bars", "chart": "bars", "bar-chart": "bars",
    "linechart": "line", "line-chart": "line", "lines": "line", "trend": "line",
    "pie": "donut", "piechart": "donut", "doughnut": "donut",
    "roadmap": "timeline", "history": "timeline",
    "files": "tree", "filetree": "tree", "folders": "tree",
    "about": "text", "paragraph": "text", "markdown": "text", "story": "text",
    "faqs": "faq", "questions": "faq",
    "compare": "table", "comparison": "table",
    "images": "gallery", "screenshots": "gallery", "photos": "gallery",
}
# what the single list of a block is called, and what a bare string in it should become
LIST_KEY = {"cards": ("items", "title"), "stats": ("items", "label"), "steps": ("items", "title"),
            "timeline": ("items", "title"), "faq": ("items", "q"), "gallery": ("items", "src"),
            "bars": ("items", "label"), "donut": ("items", "label")}
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF\U00002B50\U00002B06\U0000FE0F]")
warnings, errors = [], []


def warn(msg):
    warnings.append(msg)


def err(msg):
    errors.append(msg)


def strip_emoji(v, path="$"):
    """Emoji look cheap and render differently everywhere. Remove them and say so once."""
    if isinstance(v, str):
        if EMOJI.search(v):
            warn(f"emoji removed at {path} (funtml draws SVG icons instead; use the 'icon' field)")
            return re.sub(r"\s{2,}", " ", EMOJI.sub("", v)).strip()
        return v
    if isinstance(v, list):
        return [strip_emoji(x, f"{path}[{i}]") for i, x in enumerate(v)]
    if isinstance(v, dict):
        return {k: strip_emoji(x, f"{path}.{k}") for k, x in v.items()}
    return v


def num(v, where):
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return v
    try:
        return float(str(v).replace(",", "").rstrip("%"))
    except ValueError:
        err(f"{where}: '{v}' is not a number. Charts need real numbers, not words.")
        return 0


def norm_section(i, s):
    if not isinstance(s, dict):
        err(f"sections[{i}] is not an object, skipped")
        return None
    t = str(s.get("type", "")).strip().lower()
    t = ALIASES.get(t, t)
    if t not in TYPES:
        err(f"sections[{i}] has unknown type '{s.get('type')}'. Use one of: {', '.join(sorted(TYPES))}")
        return None
    s["type"] = t
    name = s.get("title") or f"#{i}"
    if t in LIST_KEY:
        key, main = LIST_KEY[t]
        items = s.get(key)
        if items is None:  # models sometimes use the wrong list name
            for alt in ("data", "values", "entries", "points", "list", "cards", "images", "faqs", "events"):
                if isinstance(s.get(alt), list):
                    items = s.pop(alt)
                    break
        items = items or []
        fixed = []
        for it in items:
            if isinstance(it, str):
                it = {main: it}
            elif isinstance(it, (list, tuple)) and t in ("bars", "donut") and len(it) >= 2:
                it = {"label": str(it[0]), "value": it[1]}
            if isinstance(it, dict):
                if t == "faq":
                    it.setdefault("q", it.pop("question", it.pop("title", "")))
                    it.setdefault("a", it.pop("answer", it.pop("text", "")))
                if t in ("bars", "donut"):
                    if "name" in it and "label" not in it:
                        it["label"] = it.pop("name")
                    it["value"] = num(it.get("value"), f"{name}.{it.get('label')}")
                if t == "cards" and "name" in it and "title" not in it:
                    it["title"] = it.pop("name")
                if t == "cards" and "description" in it and "text" not in it:
                    it["text"] = it.pop("description")
                if t == "stats" and isinstance(it.get("value"), str):
                    m = re.fullmatch(r"\s*([^\d\-]*)(-?[\d,]*\.?\d+)\s*(\D*)", it["value"])
                    if m:
                        it["prefix"], it["value"], it["suffix"] = m.group(1) or it.get("prefix", ""), float(m.group(2).replace(",", "")), m.group(3) or it.get("suffix", "")
                        if it["value"] == int(it["value"]):
                            it["value"] = int(it["value"])
                fixed.append(it)
        s[key] = fixed
        if not fixed:
            err(f"section '{name}' ({t}) has no items")
        if t in ("cards", "steps") and len(fixed) > 9:
            warn(f"section '{name}' has {len(fixed)} items; more than 9 is a wall of text, consider splitting")
        for it in fixed:
            for k in ("text", "a", "note"):
                if isinstance(it.get(k), str) and len(it[k]) > 260:
                    warn(f"'{name}': a '{k}' is {len(it[k])} chars; keep it under ~200 so cards stay light")
    if t == "pipeline":
        s["steps"] = [({"label": x} if isinstance(x, str) else x) for x in s.get("steps", s.get("items", []))]
        if len(s["steps"]) < 2:
            err(f"pipeline '{name}' needs 2+ steps")
        if len(s["steps"]) > 7:
            warn(f"pipeline '{name}' has {len(s['steps'])} steps; 7 or fewer reads best")
    if t == "layers":
        s["layers"] = s.get("layers", s.get("items", []))
        for L in s["layers"]:
            L.setdefault("name", L.pop("title", "Layer"))
    if t == "line":
        ser = s.get("series")
        if not ser and isinstance(s.get("points"), list):
            ser = [{"name": s.get("name", "value"), "points": s.pop("points")}]
        for q in ser or []:
            q["points"] = [{"x": p[0], "y": num(p[1], f"{name}.{q.get('name')}")} if isinstance(p, list) else {**p, "y": num(p.get("y"), name)} for p in q.get("points", [])]
        s["series"] = ser or []
        if not s["series"]:
            err(f"line '{name}' has no series")
    if t == "graph":
        nodes = []
        for n in s.get("nodes", []):
            n = {"id": n, "label": n} if isinstance(n, str) else n
            n.setdefault("id", n.get("label"))
            n.setdefault("label", str(n.get("id")))
            if len(str(n["label"])) > 22:
                warn(f"graph node '{n['label']}' is long; labels of 2-3 words fit boxes best (put detail in 'note')")
            nodes.append(n)
        s["nodes"] = nodes
        ids = {str(n["id"]) for n in nodes}
        edges = []
        for e in s.get("edges", s.get("links", [])):
            if isinstance(e, (list, tuple)):
                e = {"from": e[0], "to": e[1], **({"label": e[2]} if len(e) > 2 else {})}
            e["from"] = e.get("from", e.pop("source", e.pop("a", None)))
            e["to"] = e.get("to", e.pop("target", e.pop("b", None)))
            if str(e["from"]) not in ids or str(e["to"]) not in ids:
                warn(f"graph '{name}': edge {e['from']} -> {e['to']} points at an id that is not in nodes, dropped")
                continue
            edges.append(e)
        s["edges"] = edges
        if len(nodes) < 3:
            err(f"graph '{name}' needs 3+ nodes")
        if len(nodes) > 30:
            warn(f"graph '{name}' has {len(nodes)} nodes; above ~24 it gets crowded, group or drop the small ones")
        if nodes and not edges:
            warn(f"graph '{name}' has no edges, so nothing shows what goes into what")
    if t == "text":
        b = s.get("body", s.get("text", ""))
        s["body"] = [x for x in re.split(r"\n\s*\n", b)] if isinstance(b, str) else b
    if t == "table":
        s["columns"] = s.get("columns", s.get("headers", []))
        s["rows"] = [[str(c) for c in r] for r in s.get("rows", [])]
    if t == "code" and not s.get("code"):
        err(f"code '{name}' has no 'code'")
    if t == "tree" and not (s.get("root") or s.get("nodes")):
        err(f"tree '{name}' needs 'root' (or 'nodes')")
    if not s.get("title"):
        warn(f"section {i} ({t}) has no title; it will not appear in the top menu")
    return s


def build(project_path, out_path):
    try:
        data = json.loads(Path(project_path).read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        print(f"ERROR: {project_path} not found")
        return 1
    except json.JSONDecodeError as e:
        print(f"ERROR: {project_path} is not valid JSON ({e}). Check for trailing commas, missing quotes, // comments.")
        return 1
    data = strip_emoji(data)
    meta = data.setdefault("meta", {})
    if not meta.get("name"):
        meta["name"] = (data.get("hero") or {}).get("title") or "Untitled project"
        warn("meta.name missing, used hero.title")
    if meta.get("theme") not in (None, "wall", "notebook", "ink", "blueprint"):
        warn(f"theme '{meta['theme']}' unknown, using 'wall' (choose wall, notebook, ink or blueprint)")
        meta["theme"] = "wall"
    if not (data.get("hero") or {}).get("subtitle") and not meta.get("tagline"):
        warn("add meta.tagline: one sentence saying what the project is")
    secs = [norm_section(i, s) for i, s in enumerate(data.get("sections", []))]
    data["sections"] = [s for s in secs if s]
    if not data["sections"]:
        err("no usable sections")
    kinds = {s["type"] for s in data["sections"]}
    if len(data["sections"]) < 4:
        warn("fewer than 4 sections; a good page usually has 6-9")
    if not kinds & {"graph", "pipeline", "layers"}:
        warn("no diagram (graph / pipeline / layers) so nothing explains how the project fits together")
    if not kinds & {"bars", "line", "donut", "stats"}:
        warn("no chart or stats block")

    todos = []

    def find_todo(v, path="$"):
        if isinstance(v, str):
            if re.search(r"TODO|lorem ipsum", v, re.I):
                todos.append(path)
        elif isinstance(v, list):
            for i, x in enumerate(v):
                find_todo(x, f"{path}[{i}]")
        elif isinstance(v, dict):
            for k, x in v.items():
                find_todo(x, f"{path}.{k}")

    find_todo(data)
    if todos:
        warn(f"{len(todos)} placeholder(s) still say TODO / lorem ipsum, for example {todos[0]}. Replace every one with real words before you finish")

    for m in errors:
        print("ERROR:", m)
    for m in warnings:
        print("WARN: ", m)
    if not data["sections"]:
        return 1

    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    css = (SRC / "style.css").read_text(encoding="utf-8")
    js = (SRC / "engine.js").read_text(encoding="utf-8")
    blob = json.dumps(data, ensure_ascii=False, indent=1).replace("</", "<\\/").replace("<!--", "<\\!--")
    desc = html.escape(str(meta.get("tagline") or (data.get("hero") or {}).get("subtitle") or ""), quote=True)
    out = (shell.replace("__TITLE__", html.escape(str(meta["name"])))
           .replace("__DESC__", desc)
           .replace("/*__CSS__*/", css.replace("</style", "<\\/style"))
           .replace("/*__JS__*/", js.replace("</script", "<\\/script"))
           .replace("__PROJECT_JSON__", blob))
    Path(out_path).write_text(out, encoding="utf-8")
    kb = len(out.encode("utf-8")) / 1024
    print(f"OK: wrote {out_path} ({kb:.0f} KB, {len(data['sections'])} sections: {', '.join(s['type'] for s in data['sections'])})")
    return 1 if errors else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "index.html"))
