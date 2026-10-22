/* funtml engine: reads the JSON in #project and draws a bouncy, sticker-style page. No dependencies. */
(() => {
'use strict';
const P = JSON.parse(document.getElementById('project').textContent);
const M = P.meta || {};
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const THEMES = ['wall', 'notebook', 'ink', 'blueprint'];
const root = document.documentElement;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cv = n => `var(--c${(n % 6) + 1})`;
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const fmtNum = (v, d) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: d ?? 2 }) : String(v));

/* ---------- tiny DOM helper: h('div', {class:'x', style:{'--a':1}, onclick:fn}, child, ...) ; 'svg:rect' makes SVG ---------- */
function h(tag, props, ...kids) {
  const svg = tag.startsWith('svg:');
  const el = svg ? document.createElementNS(NS, tag.slice(4)) : document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'style' && typeof v === 'object') for (const s in v) el.style.setProperty(s, v[s]);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  add(el, kids);
  return el;
}
function add(el, kids) { for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; el.append(k.nodeType ? k : document.createTextNode(String(k))); } return el; }
/* **bold** and `code` only; everything else is plain text (never HTML) */
function fmt(s) {
  const f = document.createDocumentFragment();
  String(s ?? '').split(/(\*\*[^*]+\*\*|`[^`]+`)/g).forEach(p => {
    if (!p) return;
    if (p.startsWith('**')) f.append(h('b', null, p.slice(2, -2)));
    else if (p.startsWith('`')) f.append(h('code', null, p.slice(1, -1)));
    else f.append(p);
  });
  return f;
}

/* ---------- icons: 24x24 stroke icons, picked by name ---------- */
const ICONS = {
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  gear: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c3.5 3 3.5 16 0 19M12 2.5c-3.5 3-3.5 16 0 19"/>',
  db: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.8 2.9-6 6.5-6s6.5 2.2 6.5 6M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.4c2.2.7 3.5 2.5 3.5 5.6"/>',
  chat: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  rocket: '<path d="M12 2c3.5 2 5.5 6 5 11l-3 3h-4l-3-3c-.5-5 1.5-9 5-11z"/><circle cx="12" cy="9.5" r="1.8"/><path d="M7 14l-3 3 3 .5M17 14l3 3-3 .5M10 19l2 3 2-3"/>',
  star: '<path d="m12 2.5 2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4 6.1 20.7l1.3-6.6L2.5 9.5l6.6-.8z"/>',
  heart: '<path d="M12 20.5S3 15 3 8.8A4.8 4.8 0 0 1 12 6.5a4.8 4.8 0 0 1 9 2.3C21 15 12 20.5 12 20.5z"/>',
  flag: '<path d="M5 22V3M5 4h12l-2 4 2 4H5"/>',
  book: '<path d="M3 5c3-1.5 6-1.5 9 1 3-2.5 6-2.5 9-1v14c-3-1.5-6-1.5-9 1-3-2.5-6-2.5-9-1z"/><path d="M12 6v14"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.2 4.2 0 0 1-.5 8.5z"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  chart: '<path d="M4 20h16M7 16v-5M12 16V5M17 16V9"/>',
  puzzle: '<path d="M4 9h3a2.5 2.5 0 1 1 5 0h3v3a2.5 2.5 0 1 1 0 5v3H4z"/><path d="M15 12h5v8h-5"/>',
  wrench: '<path d="M14.5 3.5a5 5 0 0 0-4.6 6.9L3.5 16.8a2 2 0 0 0 2.8 2.8l6.4-6.4a5 5 0 0 0 6.9-4.6L16.5 11 13 10.5 12.5 7z"/>',
  eye: '<path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2.5h7.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
  file: '<path d="M6 2.5h8l5 5V21a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 21z"/><path d="M14 2.5V8h5"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  shield: '<path d="M12 2.5 4 5.5v6c0 5 3.5 8.6 8 10 4.5-1.4 8-5 8-10v-6z"/>',
  key: '<circle cx="8" cy="15" r="4.5"/><path d="m11.5 11.8 9-9M16 7l3 3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  target: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="m7 9 3 3-3 3M12.5 15H17"/>',
  sparkle: '<path d="M12 3c.8 5 2 6.2 7 7-5 .8-6.2 2-7 7-.8-5-2-6.2-7-7 5-.8 6.2-2 7-7z"/>',
  network: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="m8.4 6.5 7.2 1M7 8.3l4 7.3M17 10.3l-4 5.6"/>',
  smile: '<circle cx="12" cy="12" r="9.5"/><path d="M8 14c1 2 2.5 3 4 3s3-1 4-3M9 9.5v.5M15 9.5v.5"/>',
  game: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="16" cy="11.5" r=".8"/><circle cx="18" cy="13.5" r=".8"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  coin: '<circle cx="12" cy="12" r="9.5"/><path d="M14.5 8.5c-.5-1-1.5-1.5-2.7-1.5-1.5 0-2.8.8-2.8 2.2 0 3 5.7 1.5 5.7 4.6 0 1.4-1.4 2.2-2.9 2.2-1.3 0-2.4-.6-3-1.7M12 5.5V7M12 17v1.5"/>',
  home: '<path d="m3 11 9-8 9 8M5.5 9.5V21h13V9.5"/>',
  bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 6 6"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13.5" r="3.8"/>',
  paint: '<path d="M12 3C6.5 3 3 7 3 11.5 3 16 7 18 9 18c2 0 1.5 3 4 3 5 0 8-4.5 8-9.5C21 6.5 17 3 12 3z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/>',
  bug: '<rect x="8" y="7" width="8" height="12" rx="4"/><path d="M12 7V4M8 11H4M16 11h4M8 16H4.5M16 16h3.5M9 5l-1.5-2M15 5l1.5-2"/>',
  server: '<rect x="3" y="3.5" width="18" height="7" rx="2"/><rect x="3" y="13.5" width="18" height="7" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H3.5c0 3 1.5 4.5 3.5 4.5M17 6h3.5c0 3-1.5 4.5-3.5 4.5M12 14v4M8 21h8M9.5 18h5"/>',
};
const ICON_WORDS = [['data|database|storage|store|sql|cache', 'db'], ['api|server|backend|host', 'server'], ['web|site|browser|http|net', 'globe'], ['user|player|people|account|profile', 'user'], ['team|social|friends|community|multiplayer', 'users'], ['chat|message|dialog|talk|comment', 'chat'], ['code|script|compile|program|logic', 'code'], ['secure|auth|login|password|private', 'lock'], ['test|bug|debug|check', 'bug'], ['chart|stat|metric|analytics|score', 'chart'], ['game|play|level|fun', 'game'], ['ship|deploy|launch|release|start', 'rocket'], ['learn|lesson|doc|guide|read|book', 'book'], ['ai|model|brain|smart|ml|engine|cpu', 'cpu'], ['image|art|picture|graphic|design|draw', 'paint'], ['sound|audio|music', 'music'], ['pay|money|price|token|coin|wallet', 'coin'], ['config|setting|tool|build', 'gear'], ['file|folder|content|asset', 'folder'], ['cloud|sync|online', 'cloud'], ['fast|speed|power|energy|quick', 'bolt'], ['ui|screen|view|page|look', 'eye'], ['mobile|app|phone', 'phone'], ['time|history|schedule', 'clock'], ['mail|email|notify|alert', 'mail'], ['goal|target|aim|mission', 'target']];
function guessIcon(text, i) {
  const t = String(text || '').toLowerCase();
  for (const [re, ic] of ICON_WORDS) if (new RegExp('\\b(' + re + ')').test(t)) return ic;
  return ['star', 'sparkle', 'box', 'puzzle', 'bolt', 'layers'][i % 6];
}
function icon(name) {
  const s = h('svg:svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  s.innerHTML = ICONS[name] || ICONS.star;
  return s;
}

/* ---------- shared bits: tooltip, confetti, reveal, count-up, frame loop ---------- */
const tipEl = document.getElementById('tip');
function tip(text, x, y) {
  if (!text) { tipEl.hidden = true; return; }
  tipEl.textContent = text; tipEl.hidden = false;
  tipEl.style.left = clamp(x, 130, innerWidth - 130) + 'px'; tipEl.style.top = Math.max(y, 50) + 'px';
}
const fxc = document.getElementById('fx'), fxx = fxc.getContext('2d');
let parts = [], fxOn = false;
function sizeFx() { fxc.width = innerWidth; fxc.height = innerHeight; }
sizeFx(); addEventListener('resize', sizeFx);
function burst(x, y, n = 28) {
  if (REDUCED) return;
  const cs = [1, 2, 3, 4, 5, 6].map(i => getComputedStyle(root).getPropertyValue('--c' + i).trim() || '#fc0');
  for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), sp = rnd(3, 9); parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, s: rnd(5, 11), r: rnd(0, 6), vr: rnd(-.3, .3), c: cs[i % 6], life: rnd(55, 95), shape: i % 3 }); }
  if (!fxOn) { fxOn = true; requestAnimationFrame(fxLoop); }
}
function fxLoop() {
  fxx.clearRect(0, 0, fxc.width, fxc.height);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.vy += .38; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
    if (p.y > fxc.height - 4 && p.vy > 0) { p.y = fxc.height - 4; p.vy *= -.5; }
    fxx.save(); fxx.translate(p.x, p.y); fxx.rotate(p.r); fxx.globalAlpha = Math.min(1, p.life / 25);
    fxx.fillStyle = p.c; fxx.strokeStyle = '#141014'; fxx.lineWidth = 2;
    if (p.shape === 0) { fxx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); fxx.strokeRect(-p.s / 2, -p.s / 2, p.s, p.s); }
    else if (p.shape === 1) { fxx.beginPath(); fxx.arc(0, 0, p.s / 2, 0, 6.28); fxx.fill(); fxx.stroke(); }
    else { fxx.beginPath(); fxx.moveTo(0, -p.s / 1.6); fxx.lineTo(p.s / 1.7, p.s / 2); fxx.lineTo(-p.s / 1.7, p.s / 2); fxx.closePath(); fxx.fill(); fxx.stroke(); }
    fxx.restore();
  }
  if (parts.length) requestAnimationFrame(fxLoop); else { fxOn = false; fxx.clearRect(0, 0, fxc.width, fxc.height); }
}
const burstAt = e => burst(e.clientX, e.clientY);

const revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); e.target.__show?.(); revealIO.unobserve(e.target); } }), { threshold: .12 });
const reveal = (el, i = 0, tilt) => { el.classList.add('rv'); el.style.setProperty('--d', (i * .07).toFixed(2) + 's'); el.style.setProperty('--r', (tilt ?? (i % 2 ? 2 : -2)) + 'deg'); revealIO.observe(el); return el; };

function countUp(el, to, opts = {}) {
  const pre = opts.prefix || '', suf = opts.suffix || '';
  if (typeof to !== 'number' || REDUCED) { el.textContent = pre + fmtNum(to) + suf; return; }
  const dec = String(to).includes('.') ? Math.min(2, String(to).split('.')[1].length) : 0;
  const t0 = performance.now(), dur = 1300;
  const back = x => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2); /* easeOutBack: overshoots then settles */
  (function step(t) {
    const x = clamp((t - t0) / dur, 0, 1);
    el.textContent = pre + fmtNum(+(to * back(x)).toFixed(dec), dec) + suf;
    if (x < 1) requestAnimationFrame(step); else el.textContent = pre + fmtNum(to, dec) + suf;
  })(t0);
}
/* one shared requestAnimationFrame loop; physics widgets add themselves while on screen */
const loops = new Set(); let loopOn = false, lastT = 0;
function frame(ts) {
  const dt = Math.min(.033, (ts - lastT) / 1000 || .016); lastT = ts;
  loops.forEach(f => f(dt, ts / 1000));
  if (loops.size) requestAnimationFrame(frame); else loopOn = false;
}
function startLoop(f) { loops.add(f); if (!loopOn) { loopOn = true; lastT = performance.now(); requestAnimationFrame(frame); } }
function whenVisible(el, on, off) {
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? on() : off())), { rootMargin: '80px' }).observe(el);
}
function onResizeW(el, fn) {
  let w = el.clientWidth, t;
  new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (Math.abs(el.clientWidth - w) > 24) { w = el.clientWidth; fn(); } }, 150); }).observe(el);
}

/* ---------- section scaffolding ---------- */
function secWrap(sec, i, body) {
  const id = sec.id || slug(sec.title || sec.type + i);
  const s = h('section', { class: 'sec', id },
    h('div', { class: 'sec-head' }, h('div', { class: 'num' }, String(i + 1)), sec.title ? h('h2', null, sec.title) : null),
    sec.lede ? h('p', { class: 'lede' }, fmt(sec.lede)) : null, body);
  revealIO.observe(s);
  return s;
}
const wrapChart = (kids, cls = '') => { const d = h('div', { class: 'card rv ' + cls }, kids); revealIO.observe(d); return d; };

/* ---------- cards / stats / steps / pipeline / layers ---------- */
function renderCards(sec) {
  return h('div', { class: 'grid' }, (sec.items || []).map((it, i) => {
    const title = it.link ? h('a', { href: it.link, target: '_blank', rel: 'noopener' }, it.title) : it.title;
    const c = h('article', { class: 'card tape fcard', style: { '--tilt': ['-1.2deg', '.9deg', '-.5deg', '1.3deg'][i % 4] } },
      h('div', { class: 'ico', style: { '--ic': cv(i) } }, icon(it.icon || guessIcon(it.title + ' ' + it.text, i))),
      it.tag ? h('span', { class: 'chip tag' }, it.tag) : null, h('h3', null, title), h('p', null, fmt(it.text)));
    c.addEventListener('click', burstAt);
    return reveal(c, i);
  }));
}
function statCard(s, i) {
  const b = h('b', null, '0');
  const c = h('div', { class: 'card stat', style: { '--sc': cv(i + 1), '--tilt': [-2, 1.5, -1, 2][i % 4] + 'deg' } }, b, h('span', null, s.label));
  c.__show = () => countUp(b, s.value, s);
  c.addEventListener('click', burstAt);
  return reveal(c, i);
}
const renderStats = sec => h('div', { class: 'stats-strip' }, (sec.items || []).map(statCard));
function renderSteps(sec) {
  return h('div', { class: 'steps' }, (sec.items || []).map((it, i) => reveal(h('article', { class: 'card step fcard', style: { '--sc': cv(i), '--tilt': [-1, 1, -.6][i % 3] + 'deg' } },
    h('div', { class: 'n' }, String(i + 1)), h('h3', null, it.title), h('p', null, fmt(it.text))), i)));
}
function renderPipeline(sec) {
  const kids = [];
  (sec.steps || []).forEach((s, i, a) => {
    kids.push(reveal(h('div', { class: 'card pstage fcard', style: { '--tilt': (i % 2 ? .8 : -.8) + 'deg' } },
      h('div', { class: 'ico', style: { '--ic': cv(i) } }, icon(s.icon || guessIcon(s.label + ' ' + s.note, i))), h('h3', null, s.label), s.note ? h('p', null, fmt(s.note)) : null,
      (s.in || s.out) ? h('div', { class: 'pio' }, (s.in || []).map(x => h('span', { class: 'chip in' }, '> ' + x)), (s.out || []).map(x => h('span', { class: 'chip out' }, x + ' >'))) : null), i));
    if (i < a.length - 1) {
      const sv = h('svg:svg', { viewBox: '0 0 56 24' }, h('svg:path', { class: 'l', d: 'M2 12 C18 4 30 20 46 12' }), h('svg:path', { class: 'h', d: 'M44 5 L55 12 L44 19 Z' }));
      kids.push(h('div', { class: 'pconn' }, sv));
    }
  });
  return h('div', { class: 'pipe' }, kids);
}
function renderLayers(sec) {
  const note = h('div', { class: 'layer-note card notape', style: { display: 'none' } });
  const kids = [];
  const layers = sec.layers || [];
  layers.forEach((L, i) => {
    const items = (L.items || []).map(it => typeof it === 'string' ? { label: it } : it);
    const row = h('div', { class: 'layer', style: { '--lc': cv(i), '--tilt': (i % 2 ? .5 : -.5) + 'deg' } },
      h('div', { class: 'lname' }, h('h3', null, L.name), L.note ? h('p', null, L.note) : null),
      h('div', { class: 'litems' }, items.map(it => {
        const b = h('button', { class: 'litem', type: 'button' }, it.icon ? icon(it.icon) : null, it.label);
        b.addEventListener('click', e => {
          document.querySelectorAll('.litem.on').forEach(x => x.classList.remove('on')); b.classList.add('on');
          note.style.display = it.note ? '' : 'none'; note.replaceChildren(h('b', null, it.label + ': '), fmt(it.note || '')); burstAt(e);
        });
        return b;
      })));
    kids.push(reveal(row, i));
    if (i < layers.length - 1) kids.push(h('div', { style: { display: 'flex', justifyContent: 'center' } }, h('div', { class: 'layer-arrow' }, icon('down'))));
  });
  return h('div', { class: 'layers' }, kids, note);
}

/* ---------- bars / line / donut ---------- */
function renderBars(sec) {
  const items = (sec.items || []).map(x => Array.isArray(x) ? { label: x[0], value: x[1] } : x);
  const max = Math.max(...items.map(x => +x.value || 0), 1), unit = sec.unit || '';
  const vertical = sec.horizontal === false;
  const mk = (it, i) => {
    const nodes = {
      fill: h('div', { class: vertical ? 'vf' : 'bf', style: { '--w': ((+it.value || 0) / max * 100).toFixed(1), '--bc': cv(i), '--i': i } }),
      val: h('b', { class: vertical ? 'vv' : 'bv' }, '0' + unit),
    };
    return nodes;
  };
  const rows = items.map((it, i) => {
    const n = mk(it, i);
    const show = () => countUp(n.val, +it.value, { suffix: unit });
    const hover = e => tip(`${it.label}: ${fmtNum(it.value)}${unit}${it.note ? ' - ' + it.note : ''}`, e.clientX, e.clientY - 6);
    let el;
    if (vertical) el = h('div', { class: 'vcol', style: { '--i': i } }, n.val, n.fill);
    else el = h('div', { class: 'brow', style: { '--i': i } }, h('div', { class: 'bl' }, it.label), h('div', { class: 'bt' }, n.fill), n.val);
    el.addEventListener('pointermove', hover); el.addEventListener('pointerleave', () => tip());
    el.addEventListener('click', burstAt);
    el.__show = show; return el;
  });
  const box = h('div', { class: 'card' }, vertical
    ? [h('div', { class: 'vbars' }, rows), h('div', { class: 'vlabels' }, items.map(it => h('span', null, it.label)))]
    : h('div', { class: 'bars' }, rows));
  box.__show = () => rows.forEach(r => r.__show());
  box.classList.add('rv'); revealIO.observe(box);
  return box;
}

function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v || 1))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = .18;
    d += ` C${p1[0] + (p2[0] - p0[0]) * t} ${p1[1] + (p2[1] - p0[1]) * t} ${p2[0] - (p3[0] - p1[0]) * t} ${p2[1] - (p3[1] - p1[1]) * t} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
function renderLine(sec) {
  const series = (sec.series || []).map((s, i) => ({ name: s.name || 'Series ' + (i + 1), color: cv(i), on: true, pts: (s.points || []).map(p => Array.isArray(p) ? { x: p[0], y: p[1] } : p) }));
  const cats = [];
  series.forEach(s => s.pts.forEach(p => { if (!cats.includes(String(p.x))) cats.push(String(p.x)); }));
  if (cats.every(c => c !== '' && isFinite(+c))) cats.sort((a, b) => a - b);
  const host = h('div', { class: 'chartbox' });
  const legend = h('div', { class: 'legend', style: { padding: '4px 8px 10px' } });
  const box = h('div', { class: 'card rv' }, sec.unit ? h('div', { class: 'chip', style: { marginBottom: '6px' } }, sec.unit) : null, host, legend);
  revealIO.observe(box);
  const unit = sec.unit || '';
  function draw() {
    const W = Math.max(300, host.clientWidth || 600), H = W < 520 ? 250 : 340, L = 48, R = 18, T = 16, B = 34;
    const maxV = niceMax(Math.max(1, ...series.flatMap(s => s.on ? s.pts.map(p => +p.y || 0) : [0])) * 1.04);
    const xs = i => L + (cats.length > 1 ? i / (cats.length - 1) : .5) * (W - L - R), ys = v => T + (1 - v / maxV) * (H - T - B);
    const svg = h('svg:svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sec.title || 'line chart' });
    for (let k = 0; k <= 4; k++) { const v = maxV * k / 4, y = ys(v); svg.append(h('svg:line', { class: 'grid-l', x1: L, x2: W - R, y1: y, y2: y }), h('svg:text', { x: L - 8, y: y + 4, 'text-anchor': 'end' }, fmtNum(+v.toFixed(2)))); }
    svg.append(h('svg:line', { class: 'axis', x1: L, x2: W - R, y1: H - B, y2: H - B }));
    const every = Math.ceil(cats.length / Math.max(2, Math.floor((W - L - R) / 62)));
    cats.forEach((c, i) => { if (i % every === 0) svg.append(h('svg:text', { x: xs(i), y: H - 12, 'text-anchor': 'middle' }, c)); });
    series.forEach((s, si) => {
      if (!s.on) return;
      const pts = s.pts.map(p => [xs(cats.indexOf(String(p.x))), ys(+p.y || 0)]);
      const d = sec.smooth === false ? 'M' + pts.map(p => p.join(' ')).join(' L') : smoothPath(pts);
      const g = h('svg:g', { style: { '--i': si } });
      if (sec.area) g.append(h('svg:path', { class: 'larea', d: d + ` L${pts[pts.length - 1][0]} ${H - B} L${pts[0][0]} ${H - B} Z`, style: { fill: s.color } }));
      g.append(h('svg:path', { class: 'lback', d, pathLength: 1 }), h('svg:path', { class: 'lpath', d, pathLength: 1, style: { stroke: s.color } }));
      pts.forEach((p, k) => g.append(h('svg:circle', { class: 'lpt', cx: p[0], cy: p[1], r: 6.5, style: { fill: s.color, '--k': k } })));
      svg.append(g);
    });
    const cur = h('svg:line', { class: 'cursor-l', y1: T, y2: H - B }); svg.append(cur);
    svg.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
      const i = clamp(Math.round((x - L) / ((W - L - R) / Math.max(1, cats.length - 1))), 0, cats.length - 1);
      cur.setAttribute('x1', xs(i)); cur.setAttribute('x2', xs(i)); cur.style.opacity = 1;
      const vals = series.filter(s => s.on).map(s => { const p = s.pts.find(p => String(p.x) === cats[i]); return p ? `${s.name}: ${fmtNum(p.y)}${unit}` : null; }).filter(Boolean);
      tip(`${cats[i]}  |  ${vals.join('  |  ')}`, e.clientX, e.clientY - 8);
    });
    svg.addEventListener('pointerleave', () => { cur.style.opacity = 0; tip(); });
    svg.addEventListener('click', burstAt);
    host.replaceChildren(svg);
  }
  legend.append(...series.map(s => { const c = h('button', { class: 'chip dot', type: 'button', style: { '--cc': s.color, cursor: 'pointer' } }, h('i'), s.name); c.onclick = () => { s.on = !s.on; c.classList.toggle('off', !s.on); draw(); }; return c; }));
  if (series.length < 2) legend.style.display = 'none';
  box.__show = () => {};
  requestAnimationFrame(draw); onResizeW(host, draw);
  return box;
}

function renderDonut(sec) {
  const items = (sec.items || []).map(x => Array.isArray(x) ? { label: x[0], value: x[1] } : x);
  const total = items.reduce((a, b) => a + (+b.value || 0), 0) || 1, unit = sec.unit || '';
  const C = 120, Ro = 104, Ri = 60, gap = .03;
  const svg = h('svg:svg', { viewBox: '0 0 240 240', role: 'img', 'aria-label': sec.title || 'donut chart' });
  const ctrB = h('svg:text', { x: C, y: C + 2, 'text-anchor': 'middle', class: 'dcenter-b', style: { 'font-size': '30px', 'font-weight': 700 } }, fmtNum(total) + unit);
  const ctrS = h('svg:text', { x: C, y: C + 22, 'text-anchor': 'middle' }, sec.centerLabel || 'total');
  const legend = h('div', { class: 'dleg' });
  let a0 = -Math.PI / 2; const segs = [];
  items.forEach((it, i) => {
    const frac = (+it.value || 0) / total, a1 = a0 + frac * 2 * Math.PI, aa = a0 + gap, bb = Math.max(aa + .02, a1 - gap), large = bb - aa > Math.PI ? 1 : 0;
    const P = (r, a) => `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
    const d = `M${P(Ro, aa)} A${Ro} ${Ro} 0 ${large} 1 ${P(Ro, bb)} L${P(Ri, bb)} A${Ri} ${Ri} 0 ${large} 0 ${P(Ri, aa)} Z`;
    const mid = (a0 + a1) / 2;
    const seg = h('svg:path', { class: 'dseg', d, style: { fill: cv(i), '--i': i, '--ox': Math.cos(mid) * 9 + 'px', '--oy': Math.sin(mid) * 9 + 'px' } });
    const pct = Math.round(frac * 100);
    const row = h('div', { class: 'row', style: { '--bc': cv(i) } }, h('span', { class: 'sw' }), h('span', { class: 'nm' }, it.label), h('span', { class: 'pc' }, `${fmtNum(it.value)}${unit}  (${pct}%)`));
    const on = () => { segs.forEach(s => { s.seg.classList.remove('on'); s.row.classList.remove('on'); }); seg.classList.add('on'); row.classList.add('on'); ctrB.textContent = pct + '%'; ctrS.textContent = it.label; };
    const off = () => { seg.classList.remove('on'); row.classList.remove('on'); ctrB.textContent = fmtNum(total) + unit; ctrS.textContent = sec.centerLabel || 'total'; };
    [seg, row].forEach(e => { e.addEventListener('pointerenter', on); e.addEventListener('pointerleave', off); e.addEventListener('click', burstAt); });
    segs.push({ seg, row }); svg.append(seg); legend.append(row); a0 = a1;
  });
  svg.append(ctrB, ctrS);
  const box = h('div', { class: 'card donut rv' }, svg, legend); revealIO.observe(box);
  return box;
}

/* ---------- timeline / tree / text / code / faq / table / gallery ---------- */
function renderTimeline(sec) {
  return h('div', { class: 'tl' }, (sec.items || []).map((it, i) => reveal(h('div', { class: 'tli', style: { '--tc': cv(i) } },
    h('article', { class: 'card fcard' }, it.when ? h('span', { class: 'when' }, it.when) : null, h('h3', null, it.title), it.text ? h('p', null, fmt(it.text)) : null)), i, i % 2 ? 3 : -3)));
}
function renderTree(sec) {
  const build = (n, depth) => {
    const kids = n.children || [];
    const li = h('li', { class: 'tnode' + (kids.length && depth >= 2 ? ' closed' : '') });
    const row = h('div', { class: 'trow' }, h('span', { class: 'caret' }, kids.length ? '>' : ''), icon(kids.length ? 'folder' : 'file'), h('span', null, n.name), n.note ? h('span', { class: 'tnote' }, '  ' + n.note) : null);
    row.addEventListener('click', e => { if (kids.length) li.classList.toggle('closed'); burstAt(e); });
    li.append(row);
    if (kids.length) li.append(h('ul', null, kids.map(k => build(k, depth + 1))));
    return li;
  };
  const roots = sec.root ? [sec.root] : (sec.nodes || []);
  return wrapChart(h('div', { class: 'tree' }, h('ul', null, roots.map(r => build(r, 0)))), 'flush');
}
function renderText(sec) {
  const body = [].concat(sec.body || []);
  const box = h('div', { class: 'card prose tape' }, body.map(p => h('p', null, fmt(p))),
    sec.bullets ? h('ul', { class: 'bullets' }, sec.bullets.map(b => h('li', null, fmt(b)))) : null);
  const out = [reveal(box)];
  if (sec.quote) out.push(reveal(h('div', { class: 'pull' }, sec.quote), 1));
  return h('div', null, out);
}
function renderCode(sec) {
  const copy = h('button', { class: 'copy', type: 'button' }, 'copy');
  copy.onclick = e => { navigator.clipboard?.writeText(sec.code || ''); copy.textContent = 'copied!'; setTimeout(() => copy.textContent = 'copy', 1200); burstAt(e); };
  return wrapChart(h('div', { class: 'code' }, h('div', { class: 'bar' }, h('i'), h('i'), h('i'), h('span', null, sec.filename || sec.lang || 'code'), copy), h('pre', null, h('code', null, sec.code || ''))), 'flush');
}
function renderFaq(sec) {
  return h('div', { class: 'faq' }, (sec.items || []).map((it, i) => reveal(h('details', { class: 'card qa fcard' }, h('summary', null, it.q), h('div', { class: 'ans' }, h('p', null, fmt(it.a)))), i)));
}
function renderTable(sec) {
  const head = h('thead', null, h('tr', null, (sec.columns || []).map(c => h('th', null, c))));
  const body = h('tbody', null, (sec.rows || []).map(r => h('tr', null, r.map(c => h('td', null, fmt(c))))));
  return wrapChart(h('div', { class: 'tablewrap' }, h('table', null, head, body)), 'flush');
}
function renderGallery(sec) {
  return h('div', { class: 'gallery' }, (sec.items || []).map((it, i) => {
    const img = h('img', { src: it.src, alt: it.caption || '', loading: 'lazy' });
    img.onerror = () => { img.removeAttribute('src'); };
    return reveal(h('figure', { class: 'card polaroid tape', style: { '--tilt': [-2.5, 1.8, -1.2, 2.6][i % 4] + 'deg' } }, img, it.caption ? h('figcaption', null, it.caption) : null), i);
  }));
}

/* ---------- the bouncy graph: boxes spring back to their spot, neighbours get tugged, edges march ---------- */
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function separate(list, kx, ky, passes, fixed) {
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const dx = b[kx] - a[kx], dy = b[ky] - a[ky];
      const ox = (a.w + b.w) / 2 + 14 - Math.abs(dx), oy = (a.h + b.h) / 2 + 12 - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      const wa = a === fixed ? 0 : 1, wb = b === fixed ? 0 : 1, tw = wa + wb;
      if (!tw) continue;
      if (ox < oy) { const s = (dx || (i % 2 ? 1 : -1)) > 0 ? 1 : -1; a[kx] -= s * ox * wa / tw * .55; b[kx] += s * ox * wb / tw * .55; }
      else { const s = (dy || (j % 2 ? 1 : -1)) > 0 ? 1 : -1; a[ky] -= s * oy * wa / tw * .55; b[ky] += s * oy * wb / tw * .55; }
    }
  }
}
function analyze(nodes, edges) {
  const state = new Map(), back = new Set(), memo = new Map();
  const dfs = u => { state.set(u, 1); edges.forEach(e => { if (e.a !== u) return; const v = e.b; if (state.get(v) === 1) back.add(e); else if (!state.get(v)) dfs(v); }); state.set(u, 2); };
  nodes.forEach(u => { if (!state.get(u)) dfs(u); });
  const depth = u => { if (memo.has(u)) return memo.get(u); memo.set(u, 0); let d = 0; edges.forEach(e => { if (e.b === u && !back.has(e)) d = Math.max(d, depth(e.a) + 1); }); memo.set(u, d); return d; };
  const rank = new Map(nodes.map(u => [u, depth(u)]));
  return { back, rank, depth: Math.max(0, ...rank.values()) };
}
function layoutGraph(nodes, edges, W, H, mode, down) {
  let newH = 0;
  const rand = mulberry(nodes.length * 7919 + edges.length);
  const n = nodes.length;
  if (mode === 'layers') {
    const { rank } = analyze(nodes, edges);
    const R = Math.max(...rank.values()) + 1, cols = Array.from({ length: R }, () => []);
    nodes.forEach(u => cols[rank.get(u)].push(u));
    cols.forEach(c => c.forEach((u, k) => u.order = k));
    for (let sweep = 0; sweep < 4; sweep++) cols.forEach((c, ci) => {
      const key = u => { const nb = edges.filter(e => (e.b === u && rank.get(e.a) < ci) || (e.a === u && rank.get(e.b) > ci)).map(e => (e.a === u ? e.b : e.a)); return nb.length ? nb.reduce((s, v) => s + v.order, 0) / nb.length : u.order ?? 0; };
      c.sort((a, b) => key(a) - key(b)); c.forEach((u, k) => u.order = k);
    });
    const maxW = Math.max(...nodes.map(u => u.w)), my = 44;
    if (down) { /* a rank with more boxes than fit across wraps onto extra rows */
      const mx = maxW / 2 + 14, perRow = Math.max(1, Math.floor((W - 2 * mx) / (maxW + 14)) + 1), rows = [];
      cols.forEach(c => { for (let i = 0; i < c.length; i += perRow) rows.push(c.slice(i, i + perRow)); });
      H = clamp(rows.length * 92 + 2 * my, 380, 1600);
      rows.forEach((r, ri) => r.forEach((u, k) => { u.ax = r.length === 1 ? W / 2 + (ri % 2 ? 18 : -18) : mx + (k / (r.length - 1)) * (W - 2 * mx); u.ay = my + (rows.length > 1 ? ri / (rows.length - 1) : .5) * (H - 2 * my); }));
      newH = H;
    } else {
      const mx = maxW / 2 + 24;
      cols.forEach((c, ci) => c.forEach((u, k) => { u.ax = mx + (R > 1 ? ci / (R - 1) : .5) * (W - 2 * mx); u.ay = my + (k + 1) / (c.length + 1) * (H - 2 * my); }));
    }
  } else {
    const gs = [...new Set(nodes.map(x => x.group))];
    const gc = {}; gs.forEach((g, i) => { const a = i / gs.length * 6.283 - 1.2; gc[g] = gs.length === 1 ? { x: W / 2, y: H / 2 } : { x: W / 2 + Math.cos(a) * W * .27, y: H / 2 + Math.sin(a) * H * .26 }; });
    nodes.forEach(u => { u.ax = gc[u.group].x + rnd(-1, 1) * 60 + (rand() - .5) * 80; u.ay = gc[u.group].y + (rand() - .5) * 80; });
    const k = Math.sqrt(W * H / Math.max(n, 1)) * .42, iters = 300;
    for (let it = 0; it < iters; it++) {
      const temp = (1 - it / iters) * W / 9 + 1, dx = nodes.map(() => 0), dy = nodes.map(() => 0);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        let x = nodes[i].ax - nodes[j].ax, y = nodes[i].ay - nodes[j].ay, d = Math.hypot(x, y) || .01, f = k * k / d / d;
        dx[i] += x * f; dy[i] += y * f; dx[j] -= x * f; dy[j] -= y * f;
      }
      edges.forEach(e => {
        const i = e.a.i, j = e.b.i, x = e.a.ax - e.b.ax, y = e.a.ay - e.b.ay, d = Math.hypot(x, y) || .01, f = d / k;
        dx[i] -= x * f; dy[i] -= y * f; dx[j] += x * f; dy[j] += y * f;
      });
      nodes.forEach((u, i) => {
        dx[i] += (gc[u.group].x - u.ax) * .09 + (W / 2 - u.ax) * .03; dy[i] += (gc[u.group].y - u.ay) * .09 + (H / 2 - u.ay) * .03;
        const d = Math.hypot(dx[i], dy[i]) || 1, s = Math.min(d, temp) / d;
        u.ax += dx[i] * s; u.ay += dy[i] * s;
        u.ax = clamp(u.ax, u.w / 2 + 14, W - u.w / 2 - 14); u.ay = clamp(u.ay, u.h / 2 + 14, H - u.h / 2 - 14);
      });
    }
  }
  if (mode !== 'layers' && n > 1) { /* stretch the settled blob to fill the stage */
    const mx = Math.max(...nodes.map(u => u.w)) / 2 + 22, my = 40;
    const x0 = Math.min(...nodes.map(u => u.ax)), x1 = Math.max(...nodes.map(u => u.ax)), y0 = Math.min(...nodes.map(u => u.ay)), y1 = Math.max(...nodes.map(u => u.ay));
    nodes.forEach(u => { u.ax = mx + (u.ax - x0) / ((x1 - x0) || 1) * (W - 2 * mx); u.ay = my + (u.ay - y0) / ((y1 - y0) || 1) * (H - 2 * my); });
  }
  separate(nodes, 'ax', 'ay', 80);
  nodes.forEach(u => { u.ax = clamp(u.ax, u.w / 2 + 8, W - u.w / 2 - 8); u.ay = clamp(u.ay, u.h / 2 + 8, H - u.h / 2 - 8); });
  return newH;
}

function renderGraph(sec) {
  const defs = sec.groups || {};
  const raw = (sec.nodes || []).map(n => typeof n === 'string' ? { id: n, label: n } : n).filter(n => n && n.id != null);
  const gids = []; raw.forEach(n => { const g = n.group || 'main'; if (!gids.includes(g)) gids.push(g); });
  const gcolor = g => defs[g]?.color || cv(gids.indexOf(g)), gname = g => defs[g]?.name || g;
  const nodes = raw.map((n, i) => ({ ...n, id: String(n.id), label: n.label || String(n.id), group: n.group || 'main', i, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, w: 100, h: 42, nb: [] }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edges = (sec.edges || []).map(e => Array.isArray(e) ? { from: e[0], to: e[1], label: e[2] } : e)
    .map(e => ({ a: byId.get(String(e.from)), b: byId.get(String(e.to)), label: e.label })).filter(e => e.a && e.b && e.a !== e.b);
  edges.forEach(e => { e.a.nb.push(e.b); e.b.nb.push(e.a); });
  const ctx = document.createElement('canvas').getContext('2d');
  const measure = () => { ctx.font = `700 15px ${getComputedStyle(document.body).fontFamily}`; nodes.forEach(n => { n.w = Math.ceil(ctx.measureText(n.label).width) + 34 + (n.icon ? 24 : 0); n.h = 42; }); };

  const stage = h('div', { class: 'card gstage rv', style: { position: 'relative' } });
  const legend = h('div', { class: 'legend' }, gids.map(g => { const c = h('button', { class: 'chip dot', type: 'button', style: { '--cc': gcolor(g), cursor: 'pointer' } }, h('i'), gname(g)); c.onclick = () => { focusGroup = focusGroup === g ? null : g; sel = null; refresh(); }; return c; }));
  const panel = h('div', { class: 'card gpanel tape' });
  let svg, gE, gD, gN, W = 800, H = 520, sel = null, focusGroup = null, drag = null, t0 = 0;
  const mode0 = sec.layout === 'force' ? 'force' : (sec.layout || 'auto');

  function build() {
    measure();
    W = Math.max(300, stage.clientWidth || 800);
    const narrow = W < 640;
    let mode = mode0, down = sec.layout === 'layers-down' || narrow;
    if (mode === 'layers-down') mode = 'layers';
    if (mode === 'flow') mode = 'layers';
    if (mode === 'auto') { const an = analyze(nodes, edges); mode = edges.length && !an.back.size && an.depth >= 2 && nodes.length <= 26 ? 'layers' : 'force'; }
    H = narrow ? clamp(520 + nodes.length * 34, 600, 1200) : clamp(400 + nodes.length * 14, 460, 760);
    if (mode === 'layers') {
      const an = analyze(nodes, edges), R = an.depth + 1, maxW = Math.max(...nodes.map(n => n.w));
      if (!down && R > 1 && (W - maxW - 48) / (R - 1) - maxW < 64) down = true; /* too many wide boxes in a row: stack ranks top to bottom */
      const per = Math.max(...Array.from({ length: R }, (_, r) => nodes.filter(n => an.rank.get(n) === r).length));
      H = down ? clamp(R * 104 + 60, 420, 1300) : clamp(per * 70 + 110, 380, 700);
    }
    H = layoutGraph(nodes, edges, W, H, mode, down) || H;
    nodes.forEach(n => { if (!n.placed) { n.x = n.ax; n.y = n.ay; n.placed = true; } });
    svg = h('svg:svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'group', 'aria-label': sec.title || 'graph' });
    gE = h('svg:g'); gD = h('svg:g'); gN = h('svg:g');
    edges.forEach(e => {
      e.line = h('svg:path', { class: 'line' }); e.head = h('svg:path', { class: 'head' });
      e.lab = e.label ? h('svg:text', null, e.label) : null;
      e.g = h('svg:g', { class: 'ge' }, e.line, e.head, e.lab);
      e.dot = h('svg:circle', { class: 'gd', r: 4.5 }); e.ph = Math.random();
      gE.append(e.g); if (sec.flow !== false && !REDUCED) gD.append(e.dot);
    });
    nodes.forEach(n => {
      const ic = n.icon ? icon(n.icon) : null; if (ic) { ic.setAttribute('x', -n.w / 2 + 11); ic.setAttribute('y', -9); ic.setAttribute('width', 18); ic.setAttribute('height', 18); ic.setAttribute('class', 'gicon'); }
      n.el = h('svg:g', { class: 'gn', tabindex: 0, role: 'button', 'aria-label': n.label },
        h('svg:g', { class: 'gi' },
          h('svg:rect', { class: 's', x: -n.w / 2 + 4, y: -n.h / 2 + 5, width: n.w, height: n.h, rx: 13 }),
          h('svg:rect', { class: 'b', x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, rx: 13, style: { fill: gcolor(n.group) } }),
          ic, h('svg:text', { x: n.icon ? 11 : 0, y: 1 }, n.label)));
      n.el.__n = n;
      n.el.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(n); } });
      gN.append(n.el);
    });
    svg.append(gE, gD, gN);
    stage.replaceChildren(svg);
    wirePointer(); place(0); refresh();
  }

  function pick(n) { sel = sel === n ? null : n; focusGroup = null; refresh(); if (sel) burst(...center(n), 14); }
  function center(n) { const r = svg.getBoundingClientRect(); return [r.left + n.x * (r.width / W), r.top + n.y * (r.height / H)]; }
  function refresh() {
    const keep = n => focusGroup ? n.group === focusGroup : sel ? (n === sel || sel.nb.includes(n)) : true;
    nodes.forEach(n => { n.el.classList.toggle('dimmed', !keep(n)); n.el.classList.toggle('sel', n === sel); });
    edges.forEach(e => { const on = sel ? (e.a === sel || e.b === sel) : focusGroup ? (e.a.group === focusGroup && e.b.group === focusGroup) : true; e.g.classList.toggle('dimmed', !on); e.dot.classList.toggle('dimmed', !on); });
    [...legend.children].forEach((c, i) => c.classList.toggle('off', !!focusGroup && gids[i] !== focusGroup));
    const chips = (list, lab) => list.length ? h('div', { class: 'rel' }, h('b', null, lab), list.map(o => { const c = h('span', { class: 'chip link', tabindex: 0 }, o.label); c.onclick = () => pick(o); return c; })) : null;
    if (!sel) { panel.replaceChildren(h('h3', null, sec.panelTitle || 'Poke around'), h('p', null, sec.hint || 'Click any box to see what it is, what feeds into it and where it goes next. Drag boxes: they spring back and tug their neighbours.')); return; }
    const ins = edges.filter(e => e.b === sel).map(e => e.a), outs = edges.filter(e => e.a === sel).map(e => e.b);
    panel.replaceChildren(h('h3', null, sel.label, h('span', { class: 'chip dot', style: { '--cc': gcolor(sel.group) } }, h('i'), gname(sel.group))), sel.note ? h('p', null, fmt(sel.note)) : null, chips(ins, 'comes from'), chips(outs, 'goes into'));
  }

  function geom(e) {
    const a = e.a, b = e.b, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const cx = mx - dy / len * len * .13, cy = my + dx / len * len * .13;
    const hit = (n, tx, ty) => { const vx = tx - n.x, vy = ty - n.y, sx = vx ? (n.w / 2 + 3) / Math.abs(vx) : 1e9, sy = vy ? (n.h / 2 + 3) / Math.abs(vy) : 1e9, s = Math.min(sx, sy); return [n.x + vx * s, n.y + vy * s]; };
    const [x1, y1] = hit(a, cx, cy), [x2, y2] = hit(b, cx, cy);
    const tx = x2 - cx, ty = y2 - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl, hl = 11;
    e.line.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${(x2 - ux * hl * .8).toFixed(1)} ${(y2 - uy * hl * .8).toFixed(1)}`);
    e.head.setAttribute('d', `M${x2.toFixed(1)} ${y2.toFixed(1)} L${(x2 - ux * hl - uy * 6).toFixed(1)} ${(y2 - uy * hl + ux * 6).toFixed(1)} L${(x2 - ux * hl + uy * 6).toFixed(1)} ${(y2 - uy * hl - ux * 6).toFixed(1)}Z`);
    if (e.lab) { e.lab.setAttribute('x', (.25 * x1 + .5 * cx + .25 * x2).toFixed(1)); e.lab.setAttribute('y', (.25 * y1 + .5 * cy + .25 * y2 - 6).toFixed(1)); }
  }
  function place(time) {
    nodes.forEach(n => n.el.setAttribute('transform', `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`));
    edges.forEach(e => {
      geom(e);
      if (sec.flow !== false && !REDUCED) { const L = e.line.getTotalLength(); if (L) { const p = e.line.getPointAtLength(((time * .22 + e.ph) % 1) * L); e.dot.setAttribute('cx', p.x); e.dot.setAttribute('cy', p.y); } }
    });
  }
  const K = 70, C = 7.2;
  function step(dt, time) {
    for (let s = 0; s < 2; s++) {
      const h2 = dt / 2;
      nodes.forEach(n => {
        if (n === drag) return;
        let sx = 0, sy = 0; n.nb.forEach(o => { sx += o.x - o.ax; sy += o.y - o.ay; });
        const f = n.nb.length ? .35 / n.nb.length : 0;
        const bx = REDUCED ? 0 : Math.sin(time * .9 + n.i * 1.7) * 3, by = REDUCED ? 0 : Math.cos(time * .7 + n.i * 2.3) * 3;
        const tx = n.ax + sx * f + bx, ty = n.ay + sy * f + by;
        n.vx += ((tx - n.x) * K - n.vx * C) * h2; n.vy += ((ty - n.y) * K - n.vy * C) * h2;
      });
      nodes.forEach(n => { if (n === drag) return; n.x += n.vx * h2; n.y += n.vy * h2; });
      separate(nodes, 'x', 'y', 1, drag);
      nodes.forEach(n => { n.x = clamp(n.x, n.w / 2 + 4, W - n.w / 2 - 4); n.y = clamp(n.y, n.h / 2 + 4, H - n.h / 2 - 4); });
    }
    place(time);
  }
  function wirePointer() {
    let moved = 0, sx = 0, sy = 0, ox = 0, oy = 0, last = null;
    svg.addEventListener('pointerdown', e => {
      const g = e.target.closest('.gn'); if (!g || REDUCED) { if (g) pick(g.__n); return; }
      drag = g.__n; const r = svg.getBoundingClientRect(), k = W / r.width; sx = e.clientX; sy = e.clientY; moved = 0;
      ox = (e.clientX - r.left) * k - drag.x; oy = (e.clientY - r.top) * k - drag.y; g.classList.add('drag'); svg.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const r = svg.getBoundingClientRect(), k = W / r.width; moved = Math.max(moved, Math.hypot(e.clientX - sx, e.clientY - sy));
      const nx = (e.clientX - r.left) * k - ox, ny = (e.clientY - r.top) * k - oy, now = performance.now();
      if (last && now > last.t) { drag.vx = (nx - drag.x) / ((now - last.t) / 1000) * .3; drag.vy = (ny - drag.y) / ((now - last.t) / 1000) * .3; }
      drag.x = clamp(nx, drag.w / 2, W - drag.w / 2); drag.y = clamp(ny, drag.h / 2, H - drag.h / 2); last = { x: e.clientX, y: e.clientY, t: now };
    });
    const up = () => { if (!drag) return; drag.el.classList.remove('drag'); const n = drag; drag = null; if (moved < 5) pick(n); };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  }

  const wrap = h('div', null, gids.length > 1 ? legend : null, stage, panel);
  let running = false;
  const loop = (dt, t) => step(dt, t);
  requestAnimationFrame(() => {
    build();
    if (document.fonts?.ready) document.fonts.ready.then(() => { if (!drag) build(); });
  });
  whenVisible(stage, () => { if (!running && !REDUCED) { running = true; startLoop(loop); } }, () => { running = false; loops.delete(loop); });
  onResizeW(stage, () => { if (!drag) build(); });
  revealIO.observe(stage);
  return wrap;
}

/* ---------- mascot + hero ---------- */
const BODIES = {
  blob: 'M100 28C150 24 182 62 178 108C176 150 146 178 100 176C54 178 22 150 22 108C20 62 52 32 100 28Z',
  square: 'M62 36H138Q172 36 172 70V142Q172 176 138 176H62Q28 176 28 142V70Q28 36 62 36Z',
  ghost: 'M30 172V95C30 52 62 26 100 26C138 26 170 52 170 95V172L146 156L123 174L100 156L77 174L54 156Z',
  cat: 'M44 70L38 18L86 44Q100 40 114 44L162 18L156 70Q180 90 178 118C176 152 146 176 100 176C54 176 24 152 22 118Q20 90 44 70Z',
};
function mascot(cfg) {
  const shape = BODIES[cfg.shape] ? cfg.shape : 'blob', color = cfg.color || 'var(--c3)';
  const mouth = 'M80 128Q100 146 120 128', happy = 'M76 122Q100 160 124 122Z';
  const pupils = [h('svg:circle', { r: 7, fill: '#141014' }), h('svg:circle', { r: 7, fill: '#141014' })];
  const eye = (x, p) => h('svg:g', { class: 'm-eye', transform: `translate(${x} 96)` }, h('svg:circle', { r: 16, fill: '#fff', stroke: '#141014', 'stroke-width': 4 }), p);
  const mp = h('svg:path', { d: mouth, stroke: '#141014', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: { fill: 'none' } });
  const body = h('svg:g', { class: 'm-body' },
    h('svg:path', { d: BODIES[shape], transform: 'translate(7 8)', style: { fill: 'var(--shadow-c)' } }),
    h('svg:path', { d: BODIES[shape], style: { fill: color }, stroke: '#141014', 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    h('svg:ellipse', { cx: 60, cy: 120, rx: 11, ry: 7, fill: '#ff2e88', opacity: .35 }), h('svg:ellipse', { cx: 140, cy: 120, rx: 11, ry: 7, fill: '#ff2e88', opacity: .35 }),
    eye(74, pupils[0]), eye(126, pupils[1]), mp);
  const svg = h('svg:svg', { viewBox: '0 0 200 200', role: 'img', 'aria-label': cfg.name || 'mascot' }, body);
  const lines = cfg.say || ['Hi!', 'Poke me again.', 'Scroll down, there is more.'];
  const bubble = h('div', { class: 'bubble', hidden: true });
  const wrap = h('div', { class: 'mascot-wrap' }, h('div', { class: 'splash' }), h('div', { class: 'splash b' }), svg, bubble);
  let li = 0, bt;
  wrap.addEventListener('click', e => {
    wrap.classList.remove('pop'); void wrap.offsetWidth; wrap.classList.add('pop'); burstAt(e);
    mp.setAttribute('d', happy); mp.style.fill = '#141014'; setTimeout(() => { mp.setAttribute('d', mouth); mp.style.fill = 'none'; }, 900);
    bubble.hidden = false; bubble.textContent = lines[li++ % lines.length]; clearTimeout(bt); bt = setTimeout(() => bubble.hidden = true, 2200);
  });
  addEventListener('pointermove', e => {
    const r = svg.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .48, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1, m = Math.min(6, d / 30);
    pupils.forEach(p => p.setAttribute('transform', `translate(${(dx / d * m).toFixed(1)} ${(dy / d * m).toFixed(1)})`));
  }, { passive: true });
  return wrap;
}
function hero() {
  const H0 = P.hero || {}, title = H0.title || M.name || 'Project';
  const h1 = h('h1', null, title.split(' ').map((w, wi, arr) => h('span', { class: 'w' }, [...w].map((ch, i) => h('span', { class: 'l', style: { '--i': wi * 4 + i } }, ch)), wi < arr.length - 1 ? ' ' : '')));
  const ctas = (H0.cta || []).map((c, i) => h('a', { class: 'btn' + (i ? ' alt' : ''), href: c.url || '#', target: /^https?:/.test(c.url || '') ? '_blank' : null, rel: 'noopener', onclick: burstAt }, c.label));
  let art = null;
  if (H0.image) { const im = h('img', { class: 'hero-img', src: H0.image, alt: title }); im.onerror = () => im.replaceWith(mascot(H0.mascot || {})); art = im; }
  else if (H0.mascot !== false) art = mascot(H0.mascot || {});
  return h('header', { class: 'hero' },
    h('div', null, h1, h('p', { class: 'tagline' }, fmt(H0.subtitle || M.tagline || '')),
      (H0.stickers || []).length ? h('div', { class: 'stickers' }, H0.stickers.map((s, i) => h('span', { class: 'chip', style: { '--i': i } }, s))) : null, ctas.length ? h('div', { class: 'btns' }, ctas) : null),
    art);
}

/* ---------- assemble ---------- */
const RENDER = { cards: renderCards, stats: renderStats, steps: renderSteps, pipeline: renderPipeline, layers: renderLayers, graph: renderGraph, bars: renderBars, line: renderLine, donut: renderDonut, timeline: renderTimeline, tree: renderTree, text: renderText, code: renderCode, faq: renderFaq, table: renderTable, gallery: renderGallery };
function setTheme(t) {
  root.setAttribute('data-theme', t);
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim(); document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg);
  if (M.accent) { root.style.setProperty('--accent', M.accent); const c = M.accent.replace('#', ''), v = parseInt(c.length === 3 ? c.replace(/./g, '$&$&') : c, 16), lum = ((v >> 16) * .299 + ((v >> 8) & 255) * .587 + (v & 255) * .114); root.style.setProperty('--on-accent', lum > 150 ? '#141014' : '#ffffff'); }
}
function build() {
  const app = document.getElementById('app');
  let theme = THEMES.includes(M.theme) ? M.theme : 'wall';
  setTheme(theme);
  document.title = M.name ? M.name + (M.tagline ? ' - ' + M.tagline : '') : 'Project';
  const secs = (P.sections || []).filter(s => RENDER[s.type]);
  const nodes = secs.map((s, i) => { try { return secWrap(s, i, RENDER[s.type](s)); } catch (err) { console.error('section failed', s.type, err); return h('section', { class: 'sec' }, h('p', { class: 'lede' }, 'Section "' + (s.title || s.type) + '" could not be drawn: ' + err.message)); } });
  const pills = secs.filter(s => s.title).map((s, i) => h('a', { class: 'pill', href: '#' + (s.id || slug(s.title || s.type + i)), 'data-id': s.id || slug(s.title || s.type + i) }, s.nav || (s.title.length > 16 ? s.title.slice(0, 15) + '.' : s.title)));
  const themeBtn = M.themeSwitcher === false ? null : h('button', { class: 'themebtn', type: 'button', title: 'change look', 'aria-label': 'change look', onclick: e => { theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]; setTheme(theme); burstAt(e); } }, icon('paint'));
  const nav = h('nav', { class: 'nav' }, h('a', { class: 'logo', href: '#top' }, h('i'), M.name || 'Project'), h('div', { class: 'pills' }, pills), themeBtn);
  const tick = (M.ticker || []).length ? h('div', { class: 'ticker', 'aria-hidden': 'true' }, h('div', { class: 'track' }, [0, 1].flatMap(() => M.ticker.map(t => h('span', null, t))))) : null;
  const stats = (P.hero?.stats || []).length ? h('div', { class: 'stats-strip' }, P.hero.stats.map(statCard)) : null;
  const links = (M.links || []).map((l, i) => h('a', { class: 'btn' + (i ? ' alt' : ''), href: l.url, target: '_blank', rel: 'noopener' }, l.label));
  const foot = h('footer', { class: 'foot' }, links.length ? h('div', { class: 'btns' }, links) : null, h('p', null, M.footer || ''), h('p', null, 'Page made with funtml.'));
  app.append(h('div', { class: 'page', id: 'top' }, nav, hero(), stats, tick, ...nodes, foot));
  /* nav highlight while scrolling */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.id === e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('.sec').forEach(s => io.observe(s));
}
build();
})();
