// Stjärnkartan: spelkoden. Data kommer från data/karta.json och data/berattelse.json, världen byggs av varld.js.
(async () => {
'use strict';
// The game reads two data files: geometry (karta.json) and names, texts and rules (berattelse.json).
const [karta, berattelse] = await Promise.all(['data/karta.json', 'data/berattelse.json'].map(u =>
  fetch(u).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); })));
const TS = karta.ruta, MW = karta.bredd, MH = karta.hojd;
const $ = s => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- liten deterministisk slump ---------- */
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- sprites ritade som text ---------- */
function sprite(rows, pal){
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++){
    const ch = rows[y][i];
    if (ch !== '.' && pal[ch]){ x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1); }
  }
  return c;
}
function mirror(src){ const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }

const BOYPAL = { o:'#3f2631', c:'#e43b44', C:'#a22633', w:'#f6757a', s:'#fcbc8f', S:'#eaa56c', h:'#733e39', e:'#262b44', b:'#0099db', B:'#124e89', g:'#63c74d', G:'#3e8948', d:'#265c42', p:'#3a4466', k:'#262b44', y:'#feae34' , ...(karta.figur && karta.figur.palett) };
const head = ["................", ".....oooooo.....", "....occcccco....", "...occwccccco..."];
const FRONT = [...head,
  "...oCCCCCCCCo...", "...ohssssssho...", "...osesssseso...", "...osssSSssso...", "....osssssso....",
  "...obgbbbbgbo...", "..osbgbbbbgbso..", "..osBbbbbbbBso..", "...oppppppppo..."];
const BACK = [...head,
  "...oCccccccCo...", "...ohhhhhhhho...", "...ohhhhhhhho...", "....ohssssho....", "...odggggggdo...",
  "..osdgGGGGgdso..", "..osdggggggdso..", "..osdgggyggdso..", "...oddddddddo..."];
const LEGS_A = ["...opppoopppo...", "...okkkookkko...", "....ooo..ooo...."];
const LEGS_B = ["...opppoopppo...", "...okkkoopppo...", "....ooo.okkko..."];
const LEGS_C = ["...opppoopppo...", "...opppookkko...", "...okkko.ooo...."];
const SIDE = ["................", ".....ooooo......", "....occwcco.....", "...occccccco....",
  "...oCCCCCCCCCo..", "...ohhhssssoo...", "...ohhsssesso...", "...ohsssssssso..", "....oosssSso....",
  "..oddgbbbbo.....", "..odggbbsbo.....", "..odggbBsBo.....", "...oddppppo....."];
const SIDE_A = ["....oppppo......", "....okkkkko.....", ".....oooooo....."];
const SIDE_B = ["...oppoppo......", "..okkko.okkko...", "...ooo...ooo...."];

const BOY = {
  down: [FRONT.concat(LEGS_A), FRONT.concat(LEGS_B), FRONT.concat(LEGS_A), FRONT.concat(LEGS_C)].map(r => sprite(r, BOYPAL)),
  up:   [BACK.concat(LEGS_A), BACK.concat(LEGS_B), BACK.concat(LEGS_A), BACK.concat(LEGS_C)].map(r => sprite(r, BOYPAL)),
  right:[SIDE.concat(SIDE_A), SIDE.concat(SIDE_B)].map(r => sprite(r, BOYPAL)),
};
BOY.left = BOY.right.map(mirror);

const STAR = sprite([
  "......o......", ".....oyo.....", ".....oyo.....", "....oyyyo....", "ooooywyyyoooo", "oyyyywyyyyyyo",
  ".oyyyyyyyyyo.", "..oyyyyyyyo..", "...oyyyyyo...", "...oyyoyyo...", "..oyyo.oyyo..", "..oyo...oyo..", "..oo.....oo.."],
  { o:'#3f2631', y:'#feae34', w:'#fee761' });
const LOCK = sprite(["..sss..", ".s...s.", ".s...s.", "ooooooo", "oyyyyyo", "oyyoyyo", "oyyyyyo", "ooooooo"], { o:'#3f2631', y:'#feae34', s:'#c0cbdc' });
const GATEPAL = { o:'#3f2631', S:'#c0cbdc', s:'#8b9bb4', w:'#b86f50', W:'#733e39', y:'#feae34', Y:'#fee761' };
const GATE_TOP = ["................", "oooooooooooooooo", "oSSSSSSSSSSSSSSo", "osssssssssssssso", "oooooooooooooooo"];
const GATE_CLOSED = sprite([...GATE_TOP,
  ".oSsowWwwWwoSso.", ".oSsowWwwWwoSso.", ".oSsowwyywwoSso.", ".oSsowyYYywoSso.", ".oSsowwyywwoSso.",
  ".oSsowWwwWwoSso.", ".oSsowWwwWwoSso.", ".oSsowWwwWwoSso.", ".oSsowWwwWwoSso.", ".ossowwwwwwosso.", ".oooooooooooooo."], GATEPAL);
const GATE_OPEN = sprite([...GATE_TOP,
  ".oSso......oSso.", ".oSso......oSso.", ".oSso......oSso.", ".oSso......oSso.", ".oSso......oSso.",
  ".oSso......oSso.", ".oSso......oSso.", ".oSso......oSso.", ".oSso......oSso.", ".osso......osso.", ".oooo......oooo."], GATEPAL);

/* ---------- världen: byggs av varld.js ur data/karta.json och data/berattelse.json ---------- */
const { M, inb, at, key, occ, OBJ, put, NODES, EDGES, GATES, PLOTS, ITEMS, EMPTY_PLOT, CASTLE, CASTLE_X, CASTLE_Y, FLAGS, waterD } = Varld.byggVarld(karta, berattelse);

/* ---------- tileset ---------- */
const tiles = new Image();
tiles.src = karta.bild;
const tileXY = i => [(i % 12) * TS, Math.floor(i / 12) * TS];
function tile(ctx, i, x, y){ const [sx, sy] = tileXY(i); ctx.drawImage(tiles, sx, sy, TS, TS, x, y, TS, TS); }
function quad(ctx, i, qx, qy, x, y){ const [sx, sy] = tileXY(i); ctx.drawImage(tiles, sx + qx*8, sy + qy*8, 8, 8, x + qx*8, y + qy*8, 8, 8); }
function auto(ctx, set, same, x, y){
  const up = same(x, y - 1), dn = same(x, y + 1), lf = same(x - 1, y), rt = same(x + 1, y);
  for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++){
    const v = qy ? dn : up, h = qx ? rt : lf;
    const col = h ? 1 : (qx ? 2 : 0), row = v ? 1 : (qy ? 2 : 0);
    quad(ctx, set[row*3 + col], qx, qy, x*TS, y*TS);
  }
}
const DIRT = [12,13,14,24,25,26,36,37,38];
const FOREST = { F: [6,7,8,18,19,20,30,31,32], A: [9,10,11,21,22,23,33,34,35] };
const isWater = (x, y) => { const v = at(x, y); return v === null || v === 'w' || v === 'b'; };
const isPath = (x, y) => { const v = at(x, y); return v === 'p' || v === 'b'; };

let WFIELD = null;
function hex(c){ return [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)]; }
const WC = { lip: hex('#3e8948'), foam: hex('#2ce8f5'), mid: hex('#0099db'), deep: hex('#0e86c8'), glint: hex('#ffffff') };
function waterLayer(frame){
  const w = MW*TS, h = MH*TS;
  if (!WFIELD){ WFIELD = new Float32Array(w*h); for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) WFIELD[Y*w + X] = waterD(X + .5, Y + .5); }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), im = x.createImageData(w, h), D = im.data;
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++){
    const d = WFIELD[Y*w + X]; if (d < -1.2) continue;
    if (M[Y >> 4][X >> 4] === 'p') continue;
    let col;
    if (d < 0) col = WC.lip;
    else if (d < 1.3) col = WC.foam;
    else {
      col = d > 9 ? WC.deep : WC.mid;
      const band = Math.floor(Y / 6);
      if (d > 3 && Y % 6 === 2 && ((X + frame*2 + band*7) % 15) < 3) col = WC.foam;
      if (d > 4 && ((X*7 + Y*13 + frame*29) % 211) === 0) col = WC.glint;
    }
    const o = (Y*w + X) * 4; D[o] = col[0]; D[o+1] = col[1]; D[o+2] = col[2]; D[o+3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}
function drawBridgeTile(ctx, x, y){
  const ox = x*TS, oy = y*TS;
  const left = at(x-1, y) !== 'b', right = at(x+1, y) !== 'b';
  ctx.fillStyle = '#3f2631'; ctx.fillRect(ox, oy + 13, TS, 2);
  ctx.fillStyle = '#b86f50'; ctx.fillRect(ox, oy + 2, TS, 11);
  ctx.fillStyle = '#c28569'; ctx.fillRect(ox, oy + 3, TS, 2);
  ctx.fillStyle = '#733e39';
  for (let i = 3; i < TS; i += 4) ctx.fillRect(ox + i, oy + 2, 1, 11);
  ctx.fillStyle = '#3f2631'; ctx.fillRect(ox, oy + 1, TS, 1); ctx.fillRect(ox, oy + 12, TS, 1);
  for (const [cond, px] of [[left, 0], [right, TS - 3]]){
    if (!cond) continue;
    ctx.fillStyle = '#3f2631'; ctx.fillRect(ox + px, oy - 1, 3, 16);
    ctx.fillStyle = '#b86f50'; ctx.fillRect(ox + px + 1, oy, 1, 14);
  }
}

let TERRAIN = [];
function buildTerrain(){
  const r = rng(42);
  // dekor i gräset
  const near = (x, y) => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => { const v = at(x+dx, y+dy); return v === 'p' || v === 'b' || v === 'w'; });
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++){
    if (M[y][x] !== 'g' || occ.has(key(x, y)) || near(x, y)) continue;
    const v = r();
    if (v < 0.03) put(28, x, y);
    else if (v < 0.045 && at(x, y-1) === 'g' && !occ.has(key(x, y-1)) && !near(x, y-1)){ put(4, x, y-1); put(16, x, y); }
    else if (v < 0.065) put(5, x, y);
    else if (v < 0.072) put(29, x, y);
  }
  const base = document.createElement('canvas'); base.width = MW*TS; base.height = MH*TS;
  const b = base.getContext('2d');
  const gr = rng(7);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++){
    const v = gr(); tile(b, v < 0.13 ? 1 : v < 0.17 ? 2 : 0, x*TS, y*TS);
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (M[y][x] === 'p') auto(b, DIRT, isPath, x, y);
  const over = document.createElement('canvas'); over.width = base.width; over.height = base.height;
  const o = over.getContext('2d');
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (M[y][x] === 'b') drawBridgeTile(o, x, y);
  const tr = rng(99), stamps = [];
  const pick = t => tr() < .7 ? { i: t === 'F' ? 28 : 27 } : { i: t === 'F' ? 16 : 15, top: t === 'F' ? 4 : 3 };
  const same = (x, y, t) => { const v = at(x, y); return v === null || v === t; };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++){
    const t = M[y][x]; if (t !== 'F' && t !== 'A') continue;
    stamps.push({ x: x*TS, y: y*TS - (same(x, y-1, t) ? 3 : 0), ...(same(x, y-1, t) ? pick(t) : { i: t === 'F' ? 28 : 27 }) });
    if (same(x+1, y, t) && same(x, y+1, t) && same(x+1, y+1, t)) stamps.push({ x: x*TS + 8, y: y*TS + 5, ...pick(t) });
  }
  for (const ob of OBJ) stamps.push({ x: ob.x*TS, y: ob.y*TS, i: ob.i, obj: true });
  stamps.sort((a, b) => a.y - b.y || (a.obj ? 1 : 0) - (b.obj ? 1 : 0));
  for (const st of stamps){ if (st.top !== undefined) tile(o, st.top, st.x, st.y - TS); tile(o, st.i, st.x, st.y); }
  o.fillStyle = '#262b44'; o.fillRect(CASTLE_X + 3*TS + 6, CASTLE_Y + 2*TS + 6, 20, 26);
  CASTLE.forEach((row, dy) => row.forEach((i, dx) => { if (i >= 0) tile(o, i, CASTLE_X + dx*TS, CASTLE_Y + dy*TS); }));
  const frames = [];
  for (let f = 0; f < 3; f++){
    const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(base, 0, 0); ctx.drawImage(waterLayer(f), 0, 0); ctx.drawImage(over, 0, 0);
    frames.push(c);
  }
  TERRAIN = frames;
}

/* ---------- tillstånd ---------- */
const startData = berattelse.exempel.start;
const START = () => ({
  stars: startData.stjarnor, coins: startData.mynt, node: startData.plats,
  built: Object.fromEntries(startData.byggt.map(id => [id, true])),
  log: startData.logg.map(r => ({ subj: r.amne, p: r.poang, max: r.max, st: r.stjarnor, bonus: r.bonus })),
  testIdx: 0,
});
let S = START();
const SAMPLE_TESTS = berattelse.exempel.prov.map(t => ({ subj: t.amne, p: t.poang, max: t.max }));

const boy = { x: 0, y: 0, dir: 'down', route: null, step: 0, t: 0, target: null };
function placeBoy(id){ const n = NODES[id]; boy.x = n.x*TS; boy.y = n.y*TS; }

/* ---------- canvas ---------- */
const stage = $('#stage'), cv = $('#map'), ctx = cv.getContext('2d');
let dpr = 1, scaleCss = 2, scaleDev = 2, viewW = 0, viewH = 0;
const cam = { x: 0, y: 0, follow: true, focus: null };
function resize(){
  const r = stage.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  scaleCss = Math.max(2, Math.min(4, Math.floor(r.width / (18*TS))));
  scaleDev = Math.max(1, Math.round(scaleCss * dpr));
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  viewW = cv.width / scaleDev; viewH = cv.height / scaleDev;
  ctx.imageSmoothingEnabled = false;
}
new ResizeObserver(resize).observe(stage);

function clampCam(x, y){
  const mw = MW*TS, mh = MH*TS;
  x = viewW >= mw ? (mw - viewW) / 2 : Math.max(0, Math.min(mw - viewW, x));
  y = viewH >= mh ? (mh - viewH) / 2 : Math.max(0, Math.min(mh - viewH, y));
  return [x, y];
}
function centerOn(wx, wy, snap){
  const [x, y] = clampCam(wx - viewW/2, wy - viewH/2);
  if (snap){ cam.x = x; cam.y = y; }
  return [x, y];
}

/* ---------- logik ---------- */
const edgeOpen = e => !e.gate || S.stars >= e.gate.req;
const otherEnd = (e, id) => e.a === id ? e.b : e.a;
function edgesOf(id){ return EDGES.filter(e => e.a === id || e.b === id); }
function findRoute(from, to, ignoreLocks){
  const prev = { [from]: null }, q = [from];
  while (q.length){
    const n = q.shift(); if (n === to) break;
    for (const e of edgesOf(n)){
      if (!ignoreLocks && !edgeOpen(e)) continue;
      const m = otherEnd(e, n); if (m in prev) continue;
      prev[m] = { n, e }; q.push(m);
    }
  }
  if (!(to in prev)) return null;
  const hops = []; let c = to;
  while (prev[c]){ hops.unshift({ e: prev[c].e, from: prev[c].n, to: c }); c = prev[c].n; }
  return hops;
}
function walkTo(id){
  if (boy.route || id === S.node) { if (id === S.node) showNode(); return; }
  const hops = findRoute(S.node, id, false);
  if (!hops){
    const any = findRoute(S.node, id, true);
    const g = any && any.map(h => h.e).find(e => !edgeOpen(e));
    if (g){ showGate(g.gate); focusGate(g.gate); toast(`Porten mot ${NODES[g.b === S.node ? g.a : g.b].name} kräver ${g.gate.req} stjärnor.`); }
    return;
  }
  const pts = [];
  for (const h of hops){
    const t = h.e.a === h.from ? h.e.tiles : [...h.e.tiles].reverse();
    for (let i = (pts.length ? 1 : 1); i < t.length; i++) pts.push(t[i]);
  }
  boy.route = pts; boy.step = 0; boy.target = id; cam.follow = true; cam.focus = null;
  hideHint();
  renderPanel({ type: 'walk', id });
}
function onArrive(){
  S.node = boy.target; boy.route = null; boy.dir = 'down';
  if (pendingPlot && PLOTS.find(p => p.id === pendingPlot).node === S.node){ showPlot(PLOTS.find(p => p.id === pendingPlot)); pendingPlot = null; }
  else showNode();
}
let pendingPlot = null;

/* ---------- effekter ---------- */
const FX = [];
function sparkle(wx, wy, n, col){
  for (let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, s = 18 + Math.random() * 30; FX.push({ k: 'spark', x: wx, y: wy, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 20, t: 0, life: .7 + Math.random()*.5, col: col || (Math.random() < .5 ? '#fee761' : '#ffffff') }); }
}
function dust(wx, wy){
  for (let i = 0; i < 14; i++){ const a = Math.random() * Math.PI * 2, s = 10 + Math.random() * 22; FX.push({ k: 'dust', x: wx + Math.cos(a)*10, y: wy + Math.sin(a)*8, vx: Math.cos(a)*s, vy: Math.sin(a)*s*.6 - 6, t: 0, life: .55 + Math.random()*.35, r: 2 + Math.random()*3 }); }
}
const gateAnim = new Map(), plotAnim = new Map();
function showMap(){ const r = stage.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); }
function focusGate(g){ cam.follow = false; cam.focus = { x: g.x*TS + 8, y: g.y*TS + 8, until: performance.now() + 2200 }; }

/* ---------- ritning ---------- */
function ellipse(cx, cy, rx, ry, col){
  ctx.fillStyle = col;
  const kx = Math.ceil(rx), ky = Math.ceil(ry);
  for (let py = -ky; py < ky; py++) for (let px = -kx; px < kx; px++){
    const dx = (px + .5) / rx, dy = (py + .5) / ry;
    if (dx*dx + dy*dy <= 1) ctx.fillRect(cx + px, cy + py, 1, 1);
  }
}
function drawNode(n, now, reachable){
  const cx = n.x*TS + 8, cy = n.y*TS + 10;
  ellipse(cx, cy + 1, 7, 4.5, 'rgba(63,38,49,.35)');
  ellipse(cx, cy, 7, 4.5, '#3f2631');
  ellipse(cx, cy, 6, 3.5, reachable ? '#ead4aa' : '#8b9bb4');
  ellipse(cx, cy, 3.5, 2, reachable ? (n.id === 'slott' ? '#e43b44' : '#feae34') : '#5a6988');
  ctx.fillStyle = reachable ? '#ffffff' : '#c0cbdc'; ctx.fillRect(cx - 4, cy - 2, 2, 1);
}
function drawFlag(f, now, i){
  const x = f.x, y = f.y;
  ctx.fillStyle = '#3f2631'; ctx.fillRect(x, y - 10, 1, 11);
  const w = Math.floor(now / 260 + i) % 2;
  ctx.fillStyle = '#3f2631'; ctx.fillRect(x + 1, y - 11, 7, 6);
  ctx.fillStyle = i === 2 ? '#0099db' : '#e43b44'; ctx.fillRect(x + 1, y - 10, 6, 4);
  ctx.fillStyle = i === 2 ? '#2ce8f5' : '#f6757a'; ctx.fillRect(x + 1, y - 10, 6, 1);
  if (w){ ctx.fillStyle = '#3f2631'; ctx.fillRect(x + 4, y - 11, 1, 1); ctx.fillRect(x + 7, y - 7, 1, 2); }
  else { ctx.fillStyle = '#3f2631'; ctx.fillRect(x + 6, y - 6, 2, 1); }
}
function drawPlot(p, now){
  const ox = p.x*TS, oy = p.y*TS;
  const built = S.built[p.id];
  const a = plotAnim.get(p.id);
  if (built){
    let lift = 0;
    if (a){ const t = (now - a) / 1000; if (t < .35) return; if (t < .7) lift = Math.round(Math.sin((t - .35) / .35 * Math.PI) * 4); }
    ITEMS[p.item].forEach((row, dy) => row.forEach((i, dx) => { if (i >= 0) tile(ctx, i, ox + dx*TS, oy + dy*TS - lift); }));
  } else {
    EMPTY_PLOT.forEach((row, dy) => row.forEach((i, dx) => tile(ctx, i, ox + dx*TS, oy + dy*TS)));
  }
}
function drawBoy(now){
  let frames = BOY[boy.dir];
  let f = 0, bob = 0;
  if (boy.route){ f = Math.floor(now / 130) % frames.length; }
  else { bob = (Math.floor(now / 480) % 2) ? 1 : 0; }
  const x = Math.round(boy.x), y = Math.round(boy.y) - 6 + bob;
  ctx.fillStyle = 'rgba(63,38,49,.35)'; ctx.fillRect(x + 4, Math.round(boy.y) + 9, 8, 2); ctx.fillRect(x + 3, Math.round(boy.y) + 10, 10, 1);
  ctx.drawImage(frames[f], x, y);
}
function pill(x, y, parts, opts){
  opts = opts || {};
  const fs = Math.round(11.5 * dpr), gap = Math.round(4*dpr);
  ctx.font = `600 ${fs}px "Pixelify Sans", system-ui, sans-serif`;
  const items = parts.map(p => {
    if (typeof p === 'string') return { t: p, w: Math.ceil(ctx.measureText(p).width) };
    const s = Math.max(1, Math.round(dpr * 13 / p.height));
    return { c: p, s, w: p.width * s, h: p.height * s };
  });
  const padX = Math.round(6*dpr), h = Math.round(19*dpr);
  const w = padX*2 + items.reduce((a, it) => a + it.w, 0) + gap * (items.length - 1);
  const left = Math.round(x - w/2), top = Math.round(y - h);
  ctx.fillStyle = '#3f2631'; ctx.fillRect(left - Math.round(dpr), top - Math.round(dpr), w + 2*Math.round(dpr), h + 2*Math.round(dpr));
  ctx.fillStyle = opts.bg || '#262b44'; ctx.fillRect(left, top, w, h);
  ctx.fillStyle = opts.edge || '#3a4466'; ctx.fillRect(left, top + h - Math.round(2*dpr), w, Math.round(2*dpr));
  let cx = left + padX;
  ctx.textBaseline = 'middle';
  for (const it of items){
    if (it.c) ctx.drawImage(it.c, cx, Math.round(top + (h - it.h) / 2 - dpr), it.w, it.h);
    else { ctx.fillStyle = opts.color || '#ffffff'; ctx.fillText(it.t, cx, top + h/2); }
    cx += it.w + gap;
  }
}
let COIN = null;
let terrainFrame = 0, lastWater = 0, lastT = performance.now();

function frame(now){
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (!TERRAIN.length || !viewW){ requestAnimationFrame(frame); return; }
  // gång
  if (boy.route){
    const speed = 72 * dt;
    let left = speed;
    while (left > 0 && boy.route){
      const [tx, ty] = boy.route[boy.step];
      const gx = tx*TS, gy = ty*TS, dx = gx - boy.x, dy = gy - boy.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > Math.abs(dy)) boy.dir = dx > 0 ? 'right' : 'left'; else if (d > 0) boy.dir = dy > 0 ? 'down' : 'up';
      if (d <= left){ boy.x = gx; boy.y = gy; left -= d; boy.step++; if (boy.step >= boy.route.length){ onArrive(); } }
      else { boy.x += dx / d * left; boy.y += dy / d * left; left = 0; }
    }
  }
  // kamera
  let tx, ty;
  if (cam.focus && now < cam.focus.until){ [tx, ty] = centerOn(cam.focus.x, cam.focus.y); }
  else if (cam.focus){ cam.focus = null; cam.follow = true; [tx, ty] = centerOn(boy.x + 8, boy.y + 8); }
  else if (cam.follow){ [tx, ty] = centerOn(boy.x + 8, boy.y + 8); }
  else { [tx, ty] = clampCam(cam.x, cam.y); }
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 7);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  if (Math.abs(tx - cam.x) < .05) cam.x = tx; if (Math.abs(ty - cam.y) < .05) cam.y = ty;

  if (now - lastWater > 380){ terrainFrame = (terrainFrame + 1) % 3; lastWater = now; }
  const ox = Math.round(cam.x * scaleDev), oy = Math.round(cam.y * scaleDev);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#181425'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scaleDev, 0, 0, scaleDev, -ox, -oy);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(TERRAIN[terrainFrame], 0, 0);

  const reach = new Set([S.node]); { const q = [S.node]; while (q.length){ const n = q.shift(); for (const e of edgesOf(n)) if (edgeOpen(e)){ const m = otherEnd(e, n); if (!reach.has(m)){ reach.add(m); q.push(m); } } } }
  for (const p of PLOTS) drawPlot(p, now);
  FLAGS.forEach((f, i) => drawFlag(f, now, i));
  for (const id in NODES) drawNode(NODES[id], now, reach.has(id));
  for (const g of GATES){
    const open = S.stars >= g.req;
    const a = gateAnim.get(g);
    let img = open ? GATE_OPEN : GATE_CLOSED, shake = 0;
    if (a){ const t = (now - a) / 1000; if (t < .6){ img = GATE_CLOSED; shake = (Math.floor(t * 30) % 2) ? 1 : -1; } else if (t > 2) gateAnim.delete(g); }
    ctx.drawImage(img, g.x*TS + shake, g.y*TS - 4);
  }
  drawBoy(now);
  // partiklar
  for (let i = FX.length - 1; i >= 0; i--){
    const p = FX[i]; p.t += dt; if (p.t > p.life){ FX.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.k === 'spark'){ p.vy += 60 * dt; ctx.fillStyle = p.col; const s = p.t < p.life * .6 ? 2 : 1; ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s); }
    else { p.vx *= .92; p.vy *= .92; const r = Math.max(1, Math.round(p.r * (1 - p.t / p.life))); ctx.fillStyle = p.t < p.life*.5 ? '#ffffff' : '#c0cbdc'; ctx.fillRect(Math.round(p.x) - r, Math.round(p.y) - r, r*2, r*2); }
  }

  // etiketter i skärmskala
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sx = wx => wx * scaleDev - ox, sy = wy => wy * scaleDev - oy;
  for (const g of GATES){
    if (S.stars >= g.req) continue;
    pill(sx(g.x*TS + 8), sy(g.y*TS - 6), [LOCK, String(g.req), STAR], { color: '#fee761' });
  }
  for (const p of PLOTS){
    if (S.built[p.id]) continue;
    pill(sx(p.x*TS + 24), sy(p.y*TS - 1), [COIN, String(p.cost)], { color: '#ffffff', bg: '#3f2631', edge: '#733e39' });
  }
  for (const id in NODES){
    const n = NODES[id], here = id === S.node && !boy.route;
    pill(sx(n.x*TS + 8), sy(n.y*TS + (n.labelAbove ? -1 : 31)), [n.name], { color: here ? '#fee761' : '#ffffff', edge: here ? '#feae34' : '#3a4466' });
  }
  requestAnimationFrame(frame);
}

/* ---------- panel ---------- */
const panel = $('#panel');
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
function iconURL(c, s){ const k = document.createElement('canvas'); k.width = c.width*s; k.height = c.height*s; const x = k.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, k.width, k.height); return k.toDataURL(); }
let STAR_URL = '', COIN_URL = '', LOCK_URL = '';
function plotPreview(p){
  const c = document.createElement('canvas'); c.width = 48; c.height = 48; c.className = 'pix';
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) tile(x, 0, dx*16, dy*16);
  ITEMS[p.item].forEach((row, dy) => row.forEach((i, dx) => { if (i >= 0) tile(x, i, dx*16, dy*16); }));
  return c;
}
function renderPanel(view){
  current = view;
  let h = '';
  if (view.type === 'walk'){
    h = `<span class="tag">På väg</span><h2>Till ${esc(NODES[view.id].name)}</h2><p>Pojken går längs stigen.</p>`;
  } else if (view.type === 'node'){
    const n = NODES[view.id];
    const roads = edgesOf(n.id).map(e => {
      const o = NODES[otherEnd(e, n.id)];
      if (edgeOpen(e)) return `<button class="btn" type="button" data-go="${o.id}">${esc(o.name)}</button>`;
      const left = e.gate.req - S.stars;
      return `<button class="btn locked" type="button" data-gate="${GATES.indexOf(e.gate)}"><img class="pix" src="${LOCK_URL}" alt="">${esc(o.name)} <small>${e.gate.req} stjärnor, ${left} kvar</small></button>`;
    }).join('');
    const plots = PLOTS.filter(p => p.node === n.id);
    h = `<span class="tag">Du är här</span><h2>${esc(n.name)}</h2><p>${esc(n.text)}</p><div class="panel-body">`;
    for (const p of plots) h += plotBlock(p);
    h += `<div><p class="sub">Vägar härifrån</p><div class="roads">${roads}</div></div></div>`;
  } else if (view.type === 'gate'){
    const g = view.gate, e = g.edge, open = S.stars >= g.req;
    const names = `${NODES[e.a].name} och ${NODES[e.b].name}`;
    const pct = Math.min(100, Math.round(S.stars / g.req * 100));
    const left = g.req - S.stars;
    h = `<span class="tag">${open ? 'Öppen port' : 'Stängd port'}</span><h2>Stjärnporten</h2><p>Porten mellan ${esc(names)} öppnas vid ${g.req} stjärnor.</p>
      <div class="panel-body"><div class="meter"><div class="bar"><i style="width:calc(${pct}% - 4px)"></i></div><span>${Math.min(S.stars, g.req)} av ${g.req} stjärnor${open ? '. Porten är öppen.' : `. ${left === 1 ? 'En stjärna' : left + ' stjärnor'} kvar.`}</span></div>
      <div class="roads"><button class="btn alt" type="button" data-back="1">Tillbaka till ${esc(NODES[S.node].name)}</button></div></div>`;
  } else if (view.type === 'plot'){
    const p = view.plot, n = NODES[p.node];
    h = `<span class="tag">Tomt i ${esc(n.name)}</span><h2>${esc(p.name)}</h2><p>${S.built[p.id] ? 'Det här har du byggt. Det står kvar på kartan för alltid.' : `Kostar ${p.cost} mynt. Mynt får du för rätta svar på matteblad.`}</p><div class="panel-body">${plotBlock(p)}<div class="roads"><button class="btn alt" type="button" data-back="1">Tillbaka</button></div></div>`;
  }
  panel.innerHTML = h;
  panel.querySelectorAll('.plot').forEach(el => { const p = PLOTS.find(q => q.id === el.dataset.plot); el.prepend(plotPreview(p)); });
}
function plotBlock(p){
  if (S.built[p.id]) return `<div class="plot" data-plot="${p.id}"><div><b>${esc(p.name)}</b><span>Byggd.</span></div></div>`;
  const can = S.coins >= p.cost;
  const btn = S.node === p.node && !boy.route
    ? `<button class="btn${can ? '' : ' locked'}" type="button" data-build="${p.id}"><img class="pix" src="${COIN_URL}" alt="">Bygg för ${p.cost}</button>`
    : `<button class="btn alt" type="button" data-goplot="${p.id}">Gå dit</button>`;
  return `<div class="plot" data-plot="${p.id}"><div><b>${esc(p.name)}</b><span>${can ? `${p.cost} mynt` : `${p.cost} mynt, ${p.cost - S.coins} till behövs`}</span></div>${btn}</div>`;
}
let current = null;
const showNode = () => renderPanel({ type: 'node', id: S.node });
const showGate = g => renderPanel({ type: 'gate', gate: g });
const showPlot = p => renderPanel({ type: 'plot', plot: p });
panel.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.go || b.dataset.gate || b.dataset.goplot || b.dataset.build) showMap();
  if (b.dataset.go) walkTo(b.dataset.go);
  else if (b.dataset.gate){ const g = GATES[+b.dataset.gate]; showGate(g); focusGate(g); }
  else if (b.dataset.back){ cam.focus = null; cam.follow = true; showNode(); }
  else if (b.dataset.goplot){ const p = PLOTS.find(q => q.id === b.dataset.goplot); goPlot(p); }
  else if (b.dataset.build) build(PLOTS.find(q => q.id === b.dataset.build));
});
function goPlot(p){
  if (S.node === p.node && !boy.route){ showPlot(p); return; }
  const hops = findRoute(S.node, p.node, false);
  if (!hops){ walkTo(p.node); return; }
  pendingPlot = p.id; walkTo(p.node);
}
function build(p){
  if (S.built[p.id]) return;
  if (S.coins < p.cost){ toast(`Du behöver ${p.cost - S.coins} mynt till. Gör ett matteblad!`); return; }
  S.coins -= p.cost; S.built[p.id] = true;
  plotAnim.set(p.id, performance.now());
  dust(p.x*TS + 24, p.y*TS + 30);
  setTimeout(() => sparkle(p.x*TS + 24, p.y*TS + 18, 18), 420);
  updateHud('coins'); toast(`Du byggde ${p.name.toLowerCase()} för ${p.cost} mynt!`);
  renderPanel(current && current.type === 'plot' ? current : { type: 'node', id: S.node });
}

/* ---------- HUD, toast, logg ---------- */
function updateHud(which){
  $('#starCount').textContent = S.stars; $('#coinCount').textContent = S.coins;
  if (which){ const el = which === 'stars' ? $('#chipStars') : $('#coinCount').parentElement; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}
let toastTimer = 0;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200); }
function hideHint(){ $('#hint').hidden = true; }
function renderLog(fresh){
  const ol = $('#log');
  ol.innerHTML = S.log.slice().reverse().slice(0, 5).map((r, i) => {
    const pct = Math.round(r.p / r.max * 100);
    return `<li class="${fresh && i === 0 ? 'new' : ''}"><span><b>${esc(r.subj)}</b> ${r.p} av ${r.max} p, ${pct} %</span><span class="st">${'★'.repeat(r.st)}${r.bonus ? ' +1 bonus' : ''}</span></li>`;
  }).join('');
}
const starsFor = (p, max) => { const pct = p / max * 100; return berattelse.regler.stjarnor.find(r => pct >= r.minProcent).antal; };
function addTest(){
  const t = SAMPLE_TESTS[S.testIdx % SAMPLE_TESTS.length]; S.testIdx++;
  const prev = [...S.log].reverse().find(r => r.subj === t.subj);
  const st = starsFor(t.p, t.max);
  const bonus = prev && t.p / t.max > prev.p / prev.max ? 1 : 0;
  const before = S.stars;
  S.log.push({ subj: t.subj, p: t.p, max: t.max, st, bonus });
  S.stars += st + bonus;
  updateHud('stars'); renderLog(true);
  const pct = Math.round(t.p / t.max * 100);
  const opened = GATES.filter(g => before < g.req && S.stars >= g.req);
  let msg = `${t.subj}: ${t.p} av ${t.max} p (${pct} %) ger ${st + bonus} ${st + bonus === 1 ? 'stjärna' : 'stjärnor'}${bonus ? ', med bonus för förbättring' : ''}.`;
  if (opened.length){
    const now = performance.now();
    opened.forEach((g, i) => { gateAnim.set(g, now + i * 300); setTimeout(() => sparkle(g.x*TS + 8, g.y*TS + 4, 26), 600 + i * 300); });
    focusGate(opened[0]); cam.focus.until = performance.now() + 2600;
    msg += ` En port öppnades!`;
    showMap();
    hideHint();
  }
  toast(msg);
  renderPanel(current && current.type === 'gate' ? current : (boy.route ? current : { type: 'node', id: S.node }));
}
function addSheet(){
  const mb = berattelse.exempel.mattebladRatt; const right = mb.min + Math.floor(Math.random() * (mb.max - mb.min + 1));
  S.coins += right; updateHud('coins');
  toast(`Matteblad rättat: ${right} rätt ger ${right} mynt.`);
  if (current && current.type !== 'walk') renderPanel(current);
}
$('#btnTest').addEventListener('click', addTest);
$('#btnSheet').addEventListener('click', addSheet);
$('#btnReset').addEventListener('click', () => {
  S = START(); boy.route = null; placeBoy(S.node); plotAnim.clear(); gateAnim.clear(); FX.length = 0;
  cam.follow = true; cam.focus = null; centerOn(boy.x + 8, boy.y + 8, true);
  updateHud(); renderLog(); showNode(); toast('Kartan är återställd.');
});

/* ---------- pekare ---------- */
let down = null;
cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, drag: false, id: e.pointerId }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => {
  if (!down) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y;
  if (!down.drag && Math.hypot(dx, dy) > 7){ down.drag = true; cam.follow = false; cam.focus = null; hideHint(); }
  if (down.drag){ const [x, y] = clampCam(down.cx - dx / scaleCss, down.cy - dy / scaleCss); cam.x = x; cam.y = y; }
});
cv.addEventListener('pointerup', e => {
  if (!down) return; const d = down; down = null;
  if (d.drag) return;
  const r = cv.getBoundingClientRect();
  const wx = (e.clientX - r.left) / scaleCss + cam.x, wy = (e.clientY - r.top) / scaleCss + cam.y;
  tapAt(wx, wy);
});
cv.addEventListener('pointercancel', () => { down = null; });
function tapAt(wx, wy){
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  for (const id in NODES){ const n = NODES[id]; if (Math.abs(wx - (n.x*TS + 8)) < 13 && Math.abs(wy - (n.y*TS + 6)) < 14){ walkTo(id); return; } }
  for (const g of GATES){ if (tx === g.x && (ty === g.y || ty === g.y - 1)){ showGate(g); if (S.stars < g.req) toast(`Porten öppnas vid ${g.req} stjärnor. Du har ${S.stars}.`); return; } }
  for (const p of PLOTS){ if (tx >= p.x && tx <= p.x + 2 && ty >= p.y - 1 && ty <= p.y + 2){ goPlot(p); return; } }
}
cv.addEventListener('keydown', e => {
  const dirs = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] };
  const d = dirs[e.key]; if (!d || boy.route) return;
  e.preventDefault();
  for (const ed of edgesOf(S.node)){
    const t = ed.a === S.node ? ed.tiles : [...ed.tiles].reverse();
    const [x0, y0] = t[0], [x1, y1] = t[1];
    if (Math.sign(x1 - x0) === d[0] && Math.sign(y1 - y0) === d[1]){
      const o = otherEnd(ed, S.node);
      if (edgeOpen(ed)) walkTo(o); else { showGate(ed.gate); focusGate(ed.gate); toast(`Porten öppnas vid ${ed.gate.req} stjärnor.`); }
      return;
    }
  }
});

/* ---------- start ---------- */
function trimTile(i){
  const t = document.createElement('canvas'); t.width = TS; t.height = TS; const tx = t.getContext('2d'); tile(tx, i, 0, 0);
  const d = tx.getImageData(0, 0, TS, TS).data; let x0 = TS, y0 = TS, x1 = -1, y1 = -1;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (d[(y*TS + x)*4 + 3] > 0){ x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const c = document.createElement('canvas'); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1; c.getContext('2d').drawImage(t, x0, y0, c.width, c.height, 0, 0, c.width, c.height); return c;
}
function start(data){
  if (data && data.S) S = data.S;
  placeBoy(S.node);
  COIN = trimTile(93);
  STAR_URL = iconURL(STAR, 4); COIN_URL = iconURL(COIN, 4); LOCK_URL = iconURL(LOCK, 4);
  $('#logoStar').src = STAR_URL; $('#icoStar').src = STAR_URL; $('#icoCoin').src = COIN_URL;
  document.querySelectorAll('img[data-ico]').forEach(im => { im.src = im.dataset.ico === 'star' ? STAR_URL : COIN_URL; });
  buildTerrain();
  resize(); centerOn(boy.x + 8, boy.y + 8, true);
  updateHud(); renderLog(); showNode();
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
tiles.decode().catch(() => {}).then(() => start());
})().catch(err => {
  console.error(err);
  const h = document.getElementById('hint');
  if (h){ h.hidden = false; h.textContent = 'Kartan kunde inte laddas. Prova att ladda om sidan.'; }
});
