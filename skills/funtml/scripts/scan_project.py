#!/usr/bin/env python3
"""Collect REAL facts about a project so the page never has to guess.

    python scan_project.py <project_dir> [--out facts.json] [--draft project.json]

facts.json   : languages, line counts, components, which component uses which, manifests, git stats, README text.
project.json : a starter page (graph, bars, donut, tree, stats already filled with real numbers).
               You still write the words: tagline, feature cards, steps, notes. Numbers and edges stay true.
Standard library only.
"""
import argparse
import json
import os
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", "dist", "build", "out", "target", "__pycache__", ".venv", "venv", "env", ".godot", ".import",
             ".next", ".nuxt", ".cache", "vendor", "coverage", ".idea", ".vscode", "bin", "obj", ".gradle", "Pods", ".dart_tool",
             "site-packages", ".turbo", ".svelte-kit", "_ref", "assets-src", ".claude"}
LANGS = {".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript",
         ".gd": "GDScript", ".cs": "C#", ".rs": "Rust", ".go": "Go", ".java": "Java", ".kt": "Kotlin", ".swift": "Swift",
         ".c": "C", ".h": "C", ".cpp": "C++", ".hpp": "C++", ".cc": "C++", ".rb": "Ruby", ".php": "PHP", ".lua": "Lua",
         ".sol": "Solidity", ".dart": "Dart", ".vue": "Vue", ".svelte": "Svelte", ".html": "HTML", ".css": "CSS", ".scss": "CSS",
         ".sh": "Shell", ".sql": "SQL", ".glsl": "Shader", ".gdshader": "Shader", ".tscn": "Godot scenes", ".md": "Markdown"}
CODE_LANGS = {v for v in LANGS.values()} - {"Markdown", "Godot scenes"}
CONTAINER_DIRS = {"src", "lib", "app", "packages", "apps", "source", "pkg", "internal", "cmd"}
MAX_FILES, MAX_BYTES = 6000, 800_000


def walk(root):
    n = 0
    for dp, dn, fn in os.walk(root):
        dn[:] = sorted(d for d in dn if d not in SKIP_DIRS and not d.startswith(".") or d in (".github",))
        for f in sorted(fn):
            n += 1
            if n > MAX_FILES:
                return
            yield Path(dp) / f


def component_of(rel):
    parts = rel.split("/")
    if len(parts) == 1:
        return "(root)"
    if parts[0] in CONTAINER_DIRS and len(parts) > 2:
        return f"{parts[0]}/{parts[1]}"
    return parts[0]


def read_json(p):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8-sig"))
    except Exception:
        return None


def git(root, *args):
    try:
        return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception:
        return ""


IMPORT_RES = [
    re.compile(r"""(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]"""),
    re.compile(r"""import\s*['"]([^'"]+)['"]"""),
    re.compile(r"""require\(\s*['"]([^'"]+)['"]\s*\)"""),
    re.compile(r"""import\(\s*['"]([^'"]+)['"]\s*\)"""),
    re.compile(r"""(?:preload|load)\(\s*["']res://([^"']+)["']"""),
    re.compile(r"""^\s*from\s+([\w\.]+)\s+import""", re.M),
    re.compile(r"""^\s*import\s+([\w\.]+)""", re.M),
    re.compile(r"""^\s*use\s+(?:crate::)?(\w+)""", re.M),
    re.compile(r'^\s*#include\s+"([^"]+)"', re.M),
    re.compile(r"""^\s*using\s+([\w\.]+);""", re.M),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--out")
    ap.add_argument("--draft")
    a = ap.parse_args()
    root = Path(a.dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"not a folder: {root}")

    files, lang_loc, lang_files, comp_loc, comp_files = [], Counter(), Counter(), Counter(), Counter()
    comp_langs = defaultdict(Counter)
    sources = []
    for p in walk(root):
        rel = p.relative_to(root).as_posix()
        ext = p.suffix.lower()
        files.append(rel)
        lang = LANGS.get(ext)
        if not lang:
            continue
        try:
            if p.stat().st_size > MAX_BYTES:
                continue
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        loc = sum(1 for ln in text.splitlines() if ln.strip())
        lang_loc[lang] += loc
        lang_files[lang] += 1
        c = component_of(rel)
        if lang in CODE_LANGS or lang == "Godot scenes":
            comp_loc[c] += loc if lang in CODE_LANGS else 0
            comp_files[c] += 1
            comp_langs[c][lang] += loc
            if lang in CODE_LANGS:
                sources.append((rel, c, ext, text))

    comps = [c for c, _ in comp_loc.most_common(16) if comp_loc[c] > 0]
    comp_set = set(comps)
    by_last = {}
    for c in comps:
        by_last.setdefault(c.split("/")[-1].lower(), c)
    for rel, c, ext, text in sources:
        if c == "(root)":
            by_last.setdefault(Path(rel).stem.lower(), c)

    edges = Counter()
    for rel, c, ext, text in sources:
        if c not in comp_set:
            continue
        for rx in IMPORT_RES:
            for m in rx.finditer(text):
                spec = m.group(1)
                tgt = None
                if spec.startswith("."):  # relative path import
                    base = os.path.normpath(os.path.join(os.path.dirname(rel), spec)).replace("\\", "/")
                    if not base.startswith(".."):
                        tgt = component_of(base)
                elif "/" in spec and not spec.startswith("@") and ext in (".gd",):
                    tgt = component_of(spec)
                elif spec.startswith(("@/", "~/", "src/")):
                    tgt = component_of(("src/" + spec[2:]) if spec[:2] in ("@/", "~/") else spec)
                else:
                    head = re.split(r"[./:]", spec.lstrip("@"))
                    for seg in head[:2] + head[-1:]:
                        if seg.lower() in by_last:
                            tgt = by_last[seg.lower()]
                            break
                if tgt in comp_set and tgt != c:
                    edges[(c, tgt)] += 1

    facts = {"name": root.name, "path": str(root), "file_count": len(files), "languages": [], "components": [], "edges": [],
             "manifests": {}, "git": {}, "readme": {}, "top_dirs": [], "scripts": {}}
    code_total = sum(v for k, v in lang_loc.items() if k in CODE_LANGS) or 1
    for lang, loc in lang_loc.most_common(10):
        facts["languages"].append({"name": lang, "lines": loc, "files": lang_files[lang]})
    for c in comps:
        facts["components"].append({"id": c, "lines": comp_loc[c], "files": comp_files[c], "main_language": comp_langs[c].most_common(1)[0][0] if comp_langs[c] else "",
                                    "sample_files": [f for f in files if component_of(f) == c][:5]})
    facts["edges"] = [{"from": a_, "to": b_, "weight": w} for (a_, b_), w in edges.most_common(40)]
    facts["code_lines"] = code_total if lang_loc else 0

    # manifests
    pj = read_json(root / "package.json")
    if pj:
        facts["manifests"]["package.json"] = {k: pj.get(k) for k in ("name", "description", "version", "license") if pj.get(k)}
        facts["manifests"]["package.json"]["dependencies"] = sorted((pj.get("dependencies") or {}).keys())[:25]
        facts["manifests"]["package.json"]["devDependencies"] = sorted((pj.get("devDependencies") or {}).keys())[:15]
        facts["scripts"] = pj.get("scripts") or {}
    for fn in ("pyproject.toml", "Cargo.toml", "go.mod", "project.godot", "pubspec.yaml", "requirements.txt", "composer.json", "Gemfile", "pom.xml", "build.gradle", "foundry.toml", "hardhat.config.js"):
        fp = root / fn
        if fp.exists():
            txt = fp.read_text(encoding="utf-8", errors="ignore")
            facts["manifests"][fn] = txt[:700]
    # readme
    for rn in ("README.md", "readme.md", "README.MD", "README.txt", "README"):
        rp = root / rn
        if rp.exists():
            txt = rp.read_text(encoding="utf-8", errors="ignore")
            title = next((ln.lstrip("# ").strip() for ln in txt.splitlines() if ln.startswith("#")), "")
            paras = [p.strip() for p in re.split(r"\n\s*\n", txt) if p.strip() and not p.strip().startswith(("#", "![", "[!", "<", "```", "|", "---"))]
            heads = [ln.lstrip("# ").strip() for ln in txt.splitlines() if ln.startswith("##")][:14]
            facts["readme"] = {"title": title, "first_paragraphs": [p[:420] for p in paras[:3]], "headings": heads}
            break
    # git
    if (root / ".git").exists():
        cnt = git(root, "rev-list", "--count", "HEAD")
        facts["git"] = {"remote": git(root, "config", "--get", "remote.origin.url"), "commits": int(cnt) if cnt.isdigit() else None,
                        "first_commit": git(root, "log", "--reverse", "--format=%ad", "--date=short", "-1") or git(root, "log", "--format=%ad", "--date=short", "--max-parents=0", "-1"),
                        "last_commit": git(root, "log", "-1", "--format=%ad", "--date=short"),
                        "authors": len(set(git(root, "log", "--format=%an").splitlines()))}
        per_month = Counter(git(root, "log", "--format=%ad", "--date=format:%Y-%m").splitlines())
        facts["git"]["commits_per_month"] = [{"month": m, "commits": n} for m, n in sorted(per_month.items())][-18:]
    # top level tree (2 levels)
    tops = defaultdict(list)
    for f in files:
        parts = f.split("/")
        if len(parts) > 1:
            tops[parts[0]].append(parts[1])
    for d in sorted(tops):
        facts["top_dirs"].append({"dir": d, "files": sum(1 for f in files if f.startswith(d + "/")), "children": sorted(set(tops[d]))[:12]})

    if a.out:
        Path(a.out).write_text(json.dumps(facts, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"facts -> {a.out}")
    else:
        print(json.dumps(facts, indent=1, ensure_ascii=False)[:12000])

    if a.draft:
        Path(a.draft).write_text(json.dumps(make_draft(facts), indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"draft -> {a.draft}  (every 'TODO' must be replaced with real words before you build)")


def make_draft(f):
    name = (f["readme"].get("title") or f["manifests"].get("package.json", {}).get("name") or f["name"])
    desc = f["manifests"].get("package.json", {}).get("description") or (f["readme"].get("first_paragraphs") or ["TODO one sentence about what this project is"])[0][:140]
    top_lang = [l["name"] for l in f["languages"] if l["name"] in CODE_LANGS][:3]
    deps = (f["manifests"].get("package.json", {}).get("dependencies") or [])[:3]
    stats = [{"label": "files", "value": f["file_count"]}, {"label": "lines of code", "value": f["code_lines"]}, {"label": "languages", "value": len([l for l in f["languages"] if l["name"] in CODE_LANGS])}]
    if f["git"].get("commits"):
        stats.append({"label": "commits", "value": f["git"]["commits"]})
    comps = f["components"]
    groups, nodes = {}, []
    for c in comps:
        g = c["main_language"] or "other"
        groups.setdefault(g, {"name": g})
        nodes.append({"id": c["id"], "label": c["id"].split("/")[-1][:20], "group": g, "note": f"TODO what this part does. {c['files']} files, {c['lines']:,} lines. Includes: {', '.join(x.split('/')[-1] for x in c['sample_files'][:3])}"})
    sections = [
        {"type": "cards", "title": "What it does", "lede": "TODO one sentence", "items": [{"title": "TODO feature", "text": "TODO one or two short sentences"} for _ in range(4)]},
        {"type": "pipeline", "title": "How it works", "steps": [{"label": "TODO step", "note": "TODO", "in": [], "out": []} for _ in range(4)]},
    ]
    if len(nodes) >= 3:
        sections.append({"type": "graph", "title": "What uses what", "lede": "Arrows go from the part that asks to the part that answers. Drag the boxes.", "groups": groups, "nodes": nodes,
                         "edges": [{"from": e["from"], "to": e["to"]} for e in f["edges"]]})
    if f["languages"]:
        sections.append({"type": "bars", "title": "Lines of code by language", "unit": "", "items": [{"label": l["name"], "value": l["lines"]} for l in f["languages"] if l["name"] in CODE_LANGS][:7]})
    if comps:
        sections.append({"type": "donut", "title": "Where the code lives", "centerLabel": "lines", "items": [{"label": c["id"].split("/")[-1], "value": c["lines"]} for c in comps[:7]]})
    if f["git"].get("commits_per_month") and len(f["git"]["commits_per_month"]) > 2:
        sections.append({"type": "line", "title": "Commits per month", "series": [{"name": "commits", "points": [{"x": m["month"], "y": m["commits"]} for m in f["git"]["commits_per_month"]]}]})
    sections.append({"type": "tree", "title": "The folders", "root": {"name": name, "children": [{"name": d["dir"] + "/", "note": f"{d['files']} files", "children": [{"name": x} for x in d["children"][:6]]} for d in f["top_dirs"][:8]]}})
    sections.append({"type": "code", "title": "Run it", "filename": "terminal", "code": "TODO the real commands from the README or package.json scripts"})
    return {"meta": {"name": name, "tagline": desc, "theme": "wall", "ticker": [x for x in [*top_lang, *deps, "TODO"] if x],
                     "links": ([{"label": "Source", "url": f["git"]["remote"].replace(".git", "")}] if f["git"].get("remote", "").startswith("http") else [])},
            "hero": {"stickers": [*top_lang, *deps][:5], "stats": stats[:4], "cta": [{"label": "See how it works", "url": "#how-it-works"}], "mascot": {"shape": "blob"}},
            "sections": sections}


if __name__ == "__main__":
    main()
