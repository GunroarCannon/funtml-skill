# The funtml look: why it is built this way

Distilled from three hand-made projects: a mobile algorithm game with bouncy visualised graphs (ink + yellow on paper), a graffiti-wall strategy game (sticker cards, comic slams), and a notebook-style yearbook. What they share:

1. **Flat colour, hard outlines, hard shadows.** Every card, button, chip and box has a 2-3px dark outline and an offset shadow with no blur (`5px 5px 0`). It reads as printed stickers, not glass.
2. **Two or three loud colours on a calm base.** A dark or paper base, one accent (yellow by default), and a small set of friendly extras (pink, cyan, violet, lime, orange) that cycle through groups and charts.
3. **Everything has springs.** Things never just appear: they drop in with overshoot (`cubic-bezier(.2, 1.6, .4, 1)`), squash when pressed (`scale(.94, .9)`), wobble when hovered (`rotate -3deg, 3deg, -2deg, 1deg`), and settle. Charts grow past their value and come back. Diagrams are made of boxes on springs, so dragging one tugs the others.
4. **Slightly crooked on purpose.** Cards tilt +/- 1 degree, chips alternate -3 and +2.5. It feels hand-placed. Never tilt more than 3 degrees on text blocks.
5. **Tape, stamps, ticker.** A strip of yellow tape on a card, a diagonal ticker, a mascot with eyes that follow you. Small touches of personality, used once each.
6. **Clean beats noisy.** Lines are crisp, not scribbly; the juice comes from motion, not texture. Dotted arrows march, little dots flow along them.
7. **No emoji, no graffiti fonts.** Rounded sans (Fredoka) for reading, a heavy display face per theme (Fredoka 700 / Caveat Brush / JetBrains Mono 800), mono for code. SVG icons drawn in one stroke style.

## The four themes

| Theme | base | extras | fonts | shadow |
|---|---|---|---|---|
| wall | `#17131c` dark | paper cards `#fff8ec`, yellow/pink/cyan/violet/lime | Fredoka | black |
| notebook | desk `#2d2440` around ruled paper `#fdf9ee` | pastels | Caveat Brush + Patrick Hand | soft ink |
| ink | `#f6f4ec` grid paper | yellow `#ffd60a` + coral/teal/periwinkle | JetBrains Mono 800 + Fredoka | solid ink |
| blueprint | `#0b2a5b` with grid | yellow, pink, mint, white lines | JetBrains Mono + Fredoka | navy |

All colours are CSS variables at the top of `src/style.css` (`--bg`, `--card`, `--c1`..`--c6`, `--accent`, `--outline`, `--shadow-c`). A fifth theme = one more `[data-theme="x"] { ... }` block plus adding `"x"` to `THEMES` in `engine.js`.

## Motion rules (if you ever add something)

- Entrances: `transition`/`animation` with `cubic-bezier(.2,1.5,.4,1)`, 0.6-0.9s, stagger `index * 70-90ms`.
- Hover: individual transform properties (`scale`, `rotate`, `translate`) with `cubic-bezier(.3,2.2,.5,1)`, 0.15-0.25s. Use *different* properties for entrance and hover so one never restarts the other.
- Press: `transform: translate(3px,3px) scale(.94,.9)` and shadow shrinks to 1px.
- Physics: critically-damped is boring, so use springs with damping ratio ~0.45 (`K=70`, `C=7.2`). Idle drift of 3px keeps things alive.
- Respect `prefers-reduced-motion`: no physics loop, no looping animations, final states shown.
- Start the animation loop only while the element is on screen (IntersectionObserver). The engine already does this.

## Writing tone (the words matter as much as the motion)

- Say what it is in the first sentence, as if telling a friend. "A card game where..." not "A next-generation platform for...".
- Verbs over adjectives. "Reads your repo and counts lines" beats "powerful analysis".
- Titles are short and a little playful ("What you get", "What goes into what", "Poke around"). Menu pills truncate at 16 characters, so keep titles near that.
- Notes explain the *why*: not "auth.js: authentication" but "auth.js: checks the password and hands out a login token".
- One idea per card. If you need three sentences, it is two cards.
- Honest numbers, with units. If a chart is a sample, say "sample" in the title.

## Layout facts the engine handles for you

- Desktop 1120px column, phone 1 column with 14px gutters; menu pills scroll sideways.
- Graph: measured text widths, collision pushing, vertical layout when boxes would not fit across, extra rows when one rank is too wide.
- Charts redraw when the container width changes.
- Colour contrast: text on coloured fills is always near-black; text on cards uses `--card-text`.

## Extending safely

- New block type: add `renderXxx(sec)` in `engine.js` returning a DOM node (use `h()`, `reveal()` or `wrapChart()`), register it in the `RENDER` map, add the name to `TYPES` in `build_site.py`, document it in `schema.md`. Use `h()` and text nodes, never `innerHTML` with project text.
- New icon: add a 24x24 stroke path string to `ICONS` (stroke width 2.2, round caps, no fills) and its name to `schema.md`.
- After any change rebuild `examples/demo.html` and look at it in all four themes and at 390px width.
