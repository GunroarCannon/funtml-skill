---
name: funtml
description: Make a good-looking, bouncy, sticker-style single-file HTML page that explains a project (what it is, how it works, what goes into what) with draggable spring diagrams and animated charts. Works even for small models because the design is pre-built and you only fill in a JSON form. Use when asked for a project site, landing page, "page about this repo", explainer, architecture diagram, dependency graph, "bouncy graph", fun README page, project showcase, or an html overview with graphs and charts.
---

# funtml: a project page you fill in like a form

You do **not** design anything. The look (sticker cards, hard shadows, springy motion, mascot, four themes) is already built into `src/`. Your job:

1. collect **true facts** about the project,
2. write them into **one JSON file**,
3. run **one command**,
4. **look at the screenshot** and fix what is off.

`SKILL_DIR` below means the folder that contains this SKILL.md.

## Fast path (do these in order)

```bash
# 1. facts + a starter file (works on any folder; stdlib python, no installs)
python SKILL_DIR/scripts/scan_project.py <project_dir> --out facts.json --draft project.json

# 2. open project.json, replace EVERY "TODO" with real words (rules below)

# 3. build (prints ERROR and WARN lines: fix them all)
python SKILL_DIR/scripts/build_site.py project.json index.html

# 4. look at it (needs Chrome or Edge; otherwise open index.html by hand)
python SKILL_DIR/scripts/shot.py index.html look.png            # desktop
python SKILL_DIR/scripts/shot.py index.html phone.png --width 390 --height 7000
```

Read `look.png` as an image. Run the checklist at the bottom. Repeat 2-4 until it is clean.

No project folder (an idea, a company, a game concept)? Skip step 1, copy `SKILL_DIR/examples/starter.project.json`, and write the facts the user gave you. Never invent numbers they did not give you.

## Hard rules (the things that make or break it)

1. **Real numbers only.** Counts, percentages, dates come from `facts.json`, the README, or the user. If you do not know a number, use a block without numbers (cards, steps, graph). A chart with made-up data must say "sample" in its title.
2. **No emoji, ever.** Use the `icon` field (names listed in `references/schema.md`). The builder strips emoji and warns.
3. **Short labels, longer notes.** Graph node `label`: 1-3 words. Put the explanation in `note`. Card `title`: max 4 words. Card `text`: 1-2 sentences, under 200 characters.
4. **Plain words.** Write for a smart 14-year-old. No "leverage", "seamless", "robust", "cutting-edge". Say what the thing does.
5. **Every section has a `title`.** Titles become the top menu. Section `lede` is one sentence.
6. **6 to 9 sections.** Fewer feels empty, more feels long.
7. **Always include**: one `cards` (what it does), one diagram (`graph` first choice, or `pipeline`, or `layers`), one numbers block (`stats`, `bars`, `line` or `donut`), and one `code` (how to run it) if the project can be run.
8. **Do not edit `src/` to "improve" the look.** If something looks wrong, change the JSON (shorter text, fewer nodes, other theme). Only touch `src/` for a real bug.

## Which block answers which question

| The page needs to say... | Block | Notes |
|---|---|---|
| what is this / why care | `cards` | 3-6 items, each with an `icon` from the list |
| how do I use it | `steps` + `code` | steps are one sentence each |
| **how does it work / what goes into what** | `graph` | nodes = parts, edges = "feeds into". 6-20 nodes |
| the order things happen in | `pipeline` | 3-7 stations with `in` / `out` chips |
| the tiers (UI on top of logic on top of data) | `layers` | each layer lists its parts |
| where do files live | `tree` | 2-3 levels, `note` on important ones |
| how big is it / the split | `bars`, `donut` | values must be numbers |
| change over time | `line` | x = day/month/version, y = number |
| headline numbers | `stats` | 3-4 big counters |
| history / plan | `timeline` | `when`, `title`, `text` |
| plain explanation | `text` | paragraphs, optional `bullets`, `quote` |
| common questions | `faq` | `q`, `a` |
| compare things | `table` | `columns`, `rows` |
| screenshots | `gallery` | `src` = relative path or URL, `caption` |

Full field list and a copy-paste example of every block: `references/schema.md`.

## Writing the "what goes into what" graph (most valuable section)

- One **node per real part** (a module, service, file group, screen, data store). Take them from `facts.json -> components`. Merge tiny ones.
- One **edge per real relationship**, `from` = the part that **uses / feeds**, `to` = the part that **receives / is used**. The scanner already gives you true edges; keep them, add ones you know are true.
- Edge `label` is optional: one verb ("reads", "sends", "draft"). Skip it when the arrow is obvious.
- `group` = what kind of thing (UI, logic, data, tools). Max 5 groups, each a `groups` entry with a `name`. Colours are automatic.
- `note` on every node: what it does in one sentence, plus a fact (file count, main file).
- Leave `layout` out. It picks a left-to-right / top-to-bottom flow for chains and a free "force" layout for tangled graphs. Set `"layout": "force"` only if you want the wobbly cluster look.
- Give nodes an `icon` sparingly (3-5 key ones).

## Themes (`meta.theme`)

| Theme | Vibe | Use for |
|---|---|---|
| `wall` (default) | dark graffiti wall, loud sticker cards | games, communities, crypto, anything playful |
| `notebook` | ruled school paper, handwriting font | learning, journals, yearbooks, personal projects |
| `ink` | black ink on grid paper, yellow accent, mono titles | dev tools, clean products, libraries |
| `blueprint` | white lines on deep blue | systems, infra, hardware, protocols |

`meta.accent` can set a hex colour (e.g. `"#ff5d73"`) to match a brand. The reader can also click the paint button in the menu to cycle looks (turn off with `"themeSwitcher": false`).

## Hero extras

- `hero.mascot`: `{ "shape": "blob" | "square" | "ghost" | "cat", "color": "#hex", "say": ["Hi!", "..."] }`, or `false` for none. Its eyes follow the pointer, clicking squashes it and shows a speech bubble.
- `hero.image`: a relative path to a logo or screenshot to show instead of the mascot.
- `meta.ticker`: 4-8 short phrases for the scrolling yellow strip (technologies, taglines).
- `meta.links`: buttons in the footer (`label`, `url`).

## Before you say "done": checklist

Open `look.png` (desktop) and `phone.png` and answer **yes** to every line:

- [ ] Build printed `OK` and no ERROR lines; every WARN is either fixed or consciously fine.
- [ ] shot.py says `JS errors: none`.
- [ ] Hero shows the project name, one clear sentence, and 3-4 stats with real numbers.
- [ ] No text is cut off, overlapping, or tiny. No empty grey boxes.
- [ ] The graph has visible arrows and readable labels; boxes do not sit on top of each other.
- [ ] Charts have values you can trace to `facts.json` or the user.
- [ ] No placeholder text ("TODO", "lorem", "sample" unless intentional).
- [ ] Phone view: one column, nothing sticks out to the right.

Then tell the user the path of `index.html` and what each section shows, in 3-5 lines. If asked to host it: it is a single file with no dependencies besides optional Google Fonts.

## Common mistakes (and the fix)

| Symptom | Fix |
|---|---|
| `ERROR ... is not valid JSON` | trailing comma, `//` comment, or single quotes. JSON needs double quotes and no comments |
| Graph looks like a hairball | fewer nodes (merge to ~12), drop weak edges, add `"layout": "layers"` |
| Boxes too wide | shorten `label` to 1-3 words |
| Cards uneven / text walls | shorten `text`; keep to 3, 4 or 6 cards |
| Bars all the same length | values are real but similar: use `stats` instead, or `donut` |
| Page feels empty | add `text` with a pull `quote`, `faq`, or a `timeline` from git history |
| Chart shows `0` | value was a string like "n/a"; the builder flags it. Use a number or remove the item |
| Looks flat | you used one block type for everything. Mix cards, a diagram, a chart, a code block |

## Files in this skill

- `scripts/scan_project.py`: facts + starter JSON from any folder.
- `scripts/build_site.py`: validates, repairs, writes the single html.
- `scripts/shot.py`: screenshot + JS error check.
- `src/`: the page itself (`shell.html`, `style.css`, `engine.js`). Pre-built; do not redesign.
- `references/schema.md`: every block, every field, an example each.
- `references/style-guide.md`: why it looks the way it does, writing tone, how to extend safely.
- `examples/demo.project.json` (+ `demo.html`): a page that uses all 16 blocks. `starter.project.json`: minimal skeleton.
