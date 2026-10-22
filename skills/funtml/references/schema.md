# project.json reference

One file. Pure JSON: double quotes, no comments, no trailing commas.
`**bold**` and `` `code` `` work inside any text. Nothing else is interpreted (HTML is shown as plain text).

```json
{
  "meta":     { ... },
  "hero":     { ... },
  "sections": [ { "type": "...", "title": "..." }, ... ]
}
```

## meta

| field | type | notes |
|---|---|---|
| `name` | string, **required** | project name, shown in the menu and as the big title |
| `tagline` | string | one sentence, used as hero subtitle and page description |
| `theme` | `wall` `notebook` `ink` `blueprint` | default `wall` |
| `accent` | `"#rrggbb"` | overrides the accent colour (buttons, highlights) |
| `ticker` | string[] | 4-8 short phrases for the scrolling strip. Omit for no strip |
| `links` | `[{label, url}]` | buttons in the footer |
| `footer` | string | a line of text in the footer |
| `themeSwitcher` | boolean | `false` hides the paint button |

## hero

| field | type | notes |
|---|---|---|
| `title` | string | defaults to `meta.name` |
| `subtitle` | string | defaults to `meta.tagline`. 1-2 sentences |
| `stickers` | string[] | 3-5 short chips (technologies, "offline", "open source") |
| `cta` | `[{label, url}]` | up to 2 buttons. `url` can be `#section-id` (id = the section title in lowercase with dashes, e.g. `#how-it-works`) |
| `stats` | `[{label, value, prefix?, suffix?}]` | 3-4 counters. `value` is a number |
| `mascot` | object or `false` | `{shape: blob/square/ghost/cat, color: "#hex", say: ["line", ...]}` |
| `image` | string | path/URL shown instead of the mascot (falls back to the mascot if it fails to load) |

## sections (common fields)

`type` (required), `title` (needed for the menu), `lede` (one sentence under the title), `id` (optional anchor), `nav` (optional short menu label).

The builder fixes some wrong names: `features`→`cards`, `flow`→`pipeline`, `architecture`→`layers`, `diagram`→`graph`, `chart`→`bars`, `pie`→`donut`, etc. Use the real names anyway.

---

### cards
Feature cards. Best with 3, 4 or 6 items.
```json
{"type":"cards","title":"What it does","lede":"One sentence.",
 "items":[{"title":"Fast builds","text":"One or two short sentences.","icon":"bolt","tag":"new","link":"https://..."}]}
```
`icon` optional (a sensible one is guessed from the words). `tag` and `link` optional.

### steps
Numbered how-to. Same item shape as cards without icons: `{"title","text"}`.

### pipeline
Left-to-right chain with arrows that flow. On phones it turns vertical.
```json
{"type":"pipeline","title":"How it works",
 "steps":[{"label":"Read","note":"Parses the file.","icon":"file","out":["tokens"]},
          {"label":"Check","note":"Validates.","in":["tokens"],"out":["report"]}]}
```
3-7 steps. `in` / `out` are small chips naming what goes in and comes out (the "what goes into what" view).

### layers
Stacked tiers; chips open a note below.
```json
{"type":"layers","title":"Architecture",
 "layers":[{"name":"Screens","note":"What the user sees","items":[{"label":"Home","note":"The first page.","icon":"home"},"Settings"]},
           {"name":"Logic","items":["Router","Store"]}]}
```
Items can be a plain string or `{label, note?, icon?}`. 2-5 layers, 2-7 items each. Listed top to bottom.

### graph
The bouncy, draggable diagram. Boxes spring back, tug neighbours, arrows march, dots flow, click to inspect.
```json
{"type":"graph","title":"What uses what","lede":"Drag the boxes.",
 "groups":{"ui":{"name":"Screens"},"data":{"name":"Data","color":"#ff5d73"}},
 "nodes":[{"id":"home","label":"Home","group":"ui","icon":"home","note":"Landing screen. Reads the feed."},
          {"id":"feed","label":"Feed","group":"data","note":"Fetches and caches posts."}],
 "edges":[{"from":"home","to":"feed","label":"asks"}, ["feed","home"]]}
```
- `id` unique string. `label` 1-3 words. `note` one sentence. `group` any string (defines colour). `icon` optional.
- `edges`: `{from, to, label?}` or the short form `["from","to","label?"]`. Direction = "feeds into" / "uses".
- `groups[id].name` is the legend text; `.color` optional (hex or `var(--c1)` ... `var(--c6)`).
- `layout`: omit for automatic. `"layers"` (left-to-right flow), `"layers-down"` (top-to-bottom), `"force"` (free cluster).
- `flow`: `false` turns off the little dots travelling along arrows. `hint` / `panelTitle`: change the helper text.
- 6-20 nodes is the sweet spot. Phones switch to vertical automatically.

### stats
```json
{"type":"stats","title":"By the numbers","items":[{"label":"files","value":212},{"label":"uptime","value":99.9,"suffix":"%"},{"label":"cost","value":5,"prefix":"$"}]}
```
`value` must be a number (counts up with an overshoot). 3-4 items.

### bars
```json
{"type":"bars","title":"Lines by language","unit":" lines","items":[{"label":"Python","value":1200,"note":"optional tooltip"}]}
```
Also `[["label",value], ...]`. `"horizontal": false` for vertical columns (use with 3-6 items and short labels). Bars grow past their value and settle.

### line
```json
{"type":"line","title":"Commits per month","unit":"commits","area":true,
 "series":[{"name":"commits","points":[["2025-01",12],["2025-02",30]]},{"name":"issues","points":[["2025-01",3],["2025-02",5]]}]}
```
x = text or number labels (shared across series), y = number. `area` fills under the line, `smooth: false` for straight segments. Hover shows a guide and tooltip; legend chips hide series.

### donut
```json
{"type":"donut","title":"Where the code lives","centerLabel":"lines","unit":"","items":[{"label":"src","value":1700},{"label":"server","value":595}]}
```
3-7 slices. Centre shows the total; hovering a slice shows its share.

### timeline
`{"items":[{"when":"v1","title":"Launch","text":"..."}]}` (alternates left and right).

### tree
```json
{"type":"tree","title":"Folders","root":{"name":"my-app/","children":[{"name":"src/","note":"the code","children":[{"name":"main.js"}]},{"name":"README.md"}]}}
```
Clickable folders; levels 3+ start closed.

### text
`{"type":"text","title":"The idea","body":["paragraph","paragraph"],"bullets":["a","b"],"quote":"Big pull quote."}` (`body` can also be one string; blank lines split paragraphs).

### code
`{"type":"code","title":"Run it","filename":"terminal","code":"npm install\nnpm run dev"}` with a copy button.

### faq
`{"items":[{"q":"Question?","a":"Answer."}]}`

### table
`{"columns":["A","B"],"rows":[["x","y"],["z","w"]]}` cells accept `**bold**`.

### gallery
`{"items":[{"src":"shots/home.png","caption":"Home"}]}` polaroids; a broken path shows a gradient instead of failing. Paths are relative to where `index.html` is saved.

---

## Icon names

`bolt box gear globe db lock user users chat code rocket star heart flag book cloud cpu chart puzzle wrench eye clock link folder file play image shield key mail phone target layers terminal sparkle network smile game check arrow down coin home bell search music camera paint bug server trophy`

An unknown name shows a star. Emoji are removed by the builder.

## What the builder checks

Prints `ERROR` (section dropped / cannot draw) or `WARN` (drawn, but weak) for: invalid JSON, unknown block type, missing items, non-numeric chart values, graph edges pointing at ids that do not exist, graph nodes with long labels, fewer than 4 sections, no diagram, no chart/stats, long card text, emoji.
