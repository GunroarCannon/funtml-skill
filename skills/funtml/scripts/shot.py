#!/usr/bin/env python3
"""Screenshot a built page with headless Edge or Chrome, and print any JavaScript errors.

    python shot.py index.html out.png [--width 1280] [--height 5200] [--wait 6]
    python shot.py index.html out.png --width 390 --height 7000     # phone check

Look at the png (open it / read it as an image). If the layout is off, fix project.json and rebuild.
The page animates in as it scrolls into view, so this script reveals everything before the shot.
Standard library only.
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]
NAMES = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "msedge", "microsoft-edge"]


def find_browser():
    for c in CANDIDATES:
        if os.path.exists(c):
            return c
    for n in NAMES:
        p = shutil.which(n)
        if p:
            return p
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html")
    ap.add_argument("out", nargs="?", default="funtml-shot.png")
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=5200)
    ap.add_argument("--wait", type=int, default=6, help="seconds of animation time to allow")
    a = ap.parse_args()
    br = find_browser()
    if not br:
        sys.exit("No Chrome/Edge found. Open the html in a browser by hand and look at it.")
    src = Path(a.html).resolve()
    # copy next to a tiny wrapper that reveals everything and surfaces errors, so the shot shows the finished page
    tmp = Path(tempfile.mkdtemp(prefix="funtml-shot-"))
    page = src.read_text(encoding="utf-8")
    probe = """<script>
window.__errs=[];addEventListener('error',e=>window.__errs.push(e.message));
addEventListener('load',()=>{document.querySelectorAll('.rv,.sec').forEach(e=>e.classList.add('in'));
 document.querySelectorAll('.stat b').forEach(b=>{});
 setTimeout(()=>{const d=document.createElement('pre');d.id='__errs';d.style.cssText='position:fixed;left:0;bottom:0;z-index:9999;background:#fee;color:#900;margin:0;font:12px monospace;white-space:pre-wrap';d.textContent=window.__errs.length?('JS ERRORS: '+window.__errs.join(' | ')):'';document.body.append(d);},300);});
</script>"""
    wrapped = tmp / "page.html"
    wrapped.write_text(page.replace("</body>", probe + "</body>"), encoding="utf-8")
    out = Path(a.out).resolve()
    target, win_w = wrapped, a.width
    if a.width < 520:  # browsers refuse windows this narrow, so show the page in an iframe of the true width
        frame = tmp / "frame.html"
        frame.write_text(f'<!doctype html><body style="margin:0;background:#888"><iframe src="page.html" style="border:0;display:block;width:{a.width}px;height:{a.height}px"></iframe>', encoding="utf-8")
        target, win_w = frame, max(a.width, 520)
    cmd = [br, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={win_w},{a.height}",
           f"--virtual-time-budget={a.wait * 1000}", f"--screenshot={out}", "--enable-logging=stderr", "--v=0",
           "--user-data-dir=" + str(tmp / "profile"), target.as_uri()]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    errs = [ln for ln in (r.stderr or "").splitlines() if "CONSOLE" in ln and ("rror" in ln or "ncaught" in ln)]
    dom = subprocess.run(cmd[:1] + ["--headless=new", "--disable-gpu", f"--window-size={win_w},{a.height}", f"--virtual-time-budget={a.wait * 1000}", "--dump-dom",
                                    "--user-data-dir=" + str(tmp / "profile2"), wrapped.as_uri()], capture_output=True, text=True, timeout=120).stdout
    import re
    m = re.search(r'<pre id="__errs"[^>]*>(.*?)</pre>', dom, re.S)
    if m and m.group(1).strip():
        errs.append(m.group(1).strip()[:400])
    if out.exists():
        print(f"screenshot -> {out}")
    else:
        print("no screenshot produced", (r.stderr or "")[-400:])
    print("JS errors: none" if not errs else "JS errors:\n  " + "\n  ".join(errs))
    shutil.rmtree(tmp, ignore_errors=True)
    sys.exit(1 if errs or not out.exists() else 0)


if __name__ == "__main__":
    main()
