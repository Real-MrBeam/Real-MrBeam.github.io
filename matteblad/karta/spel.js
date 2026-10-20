// Djuren i Glimmerdal (kartan i karta/, hette först Stjärnkartan): spelkoden. Data kommer från data/karta.json och data/berattelse.json, världen byggs av varld.js.
(async () => {
'use strict';
// The game reads two data files: geometry (karta.json) and names, texts and rules (berattelse.json).
const [karta, berattelse, PORTRAITS, PETDATA] = await Promise.all(['data/karta.json', 'data/berattelse.json', 'data/portratt.json', 'data/djur.json'].map(u =>
  fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); })));
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

// Clothes he can put on from the bag (Peter 2026-10-20). A hat replaces the five top rows (the cap), the same in every
// direction. Boots change the colour of the shoes. Own pixel drawings.
const HATS = {
  fiskehatt: { rows: ["................", "....oooooooo....", "...oxxxxxxxxo...", "..oxxxxxxxrxxo..", "..oXXXXXXXXXXo.."], pal: { x: '#c9b27d', X: '#8b7a4a', r: '#e43b44' } },
  strahatt: { rows: ["................", ".....oooooo.....", "....oaaaaaao....", "...oaRRRRRRao...", ".ooaaaaaaaaaaoo."], pal: { a: '#f4d27a', R: '#a22633' } },
  trollkarlshatt: { rows: ["......oo........", ".....oTTo.......", "....oTTYTo......", "...oTTTTTTo.....", "..oQQQQQQQQQQo.."], pal: { T: '#3b5dc9', Q: '#29366f', Y: '#fee761' } },
  blomsterkrans: { rows: ["................", ".....oooooo.....", "....ohhhhhho....", "...orhyhrhyho...", "...ohhhhhhhho..."], pal: { r: '#e43b44', y: '#fee761' } },
  mjolnarmossa: { rows: ["................", "....ooooooo.....", "...ommmmmmmo....", "...ommmmmmmmo...", "...oMMMMMMMMo..."], pal: { m: '#f4f4f4', M: '#c0cbdc' } },
};
const BOOTS = { stovel: { k: '#6b3a20' } };
let BOY = null;
function buildBoy(pa = {}){
  const hat = HATS[pa.huvud], pal = { ...BOYPAL, ...(hat ? hat.pal : {}), ...(BOOTS[pa.fotter] || {}) };
  const top = rows => hat ? [...hat.rows, ...rows.slice(5)] : rows;
  BOY = {
    down: [FRONT.concat(LEGS_A), FRONT.concat(LEGS_B), FRONT.concat(LEGS_A), FRONT.concat(LEGS_C)].map(r => sprite(top(r), pal)),
    up:   [BACK.concat(LEGS_A), BACK.concat(LEGS_B), BACK.concat(LEGS_A), BACK.concat(LEGS_C)].map(r => sprite(top(r), pal)),
    right:[SIDE.concat(SIDE_A), SIDE.concat(SIDE_B)].map(r => sprite(top(r), pal)),
  };
  BOY.left = BOY.right.map(mirror);
}
buildBoy();

// The animals: two frames each, drawn facing right and mirrored for walking left (data/djur.json, made by verktyg/gor-djur.mjs).
// Names and texts are in berattelse.json (djur). Up to three animals follow the boy, the rest are in the animal book.
const PETS = Object.fromEntries(Object.entries(PETDATA).map(([id, d]) => {
  const frames = d.bilder.map(rows => sprite(rows, d.farger));
  return [id, { namn: berattelse.djur[id].namn, lyft: d.lyft, right: frames, left: frames.map(mirror) }];
}));

const STAR = sprite([
  "......o......", ".....oyo.....", ".....oyo.....", "....oyyyo....", "ooooywyyyoooo", "oyyyywyyyyyyo",
  ".oyyyyyyyyyo.", "..oyyyyyyyo..", "...oyyyyyo...", "...oyyoyyo...", "..oyyo.oyyo..", "..oyo...oyo..", "..oo.....oo.."],
  { o:'#3f2631', y:'#feae34', w:'#fee761' });
// Stardust: a four-pointed sparkle. It is what the matteblad give, and what building and some choices on the map cost.
const DUST = sprite([
  ".....o.....", "....owo....", "....owo....", "...owCwo...", ".oowwCwwoo.", "owwCCbCCwwo", ".oowwCwwoo.", "...owCwo...", "....owo....", "....owo....", ".....o....."],
  { o:'#3f2631', w:'#ffffff', C:'#2ce8f5', b:'#0099db' });
// Icons for the boxes under the map: a rune stone, a parchment scroll, a bag and a book
const RUNE = sprite([
  "...oooooo...", "..osssssso..", ".ossCsssSso.", ".osCsCssSso.", ".ossCsssSso.", "ossCCsssSsso", "osssCsssSsso",
  "ossCsCssSsso", "osssssSSSsso", ".oSSSSSSSSo.", "..oooooooo.."], { o:'#3f2631', s:'#8b9bb4', S:'#5a6988', C:'#2ce8f5' });
const SCROLL = sprite([
  ".oooooooooo.", "oPPppppppPPo", "oPpkkkkkkpPo", ".oppppppppo.", ".opkkkkkkpo.", ".oppppppppo.", ".opkkkkkppo.",
  ".oppppppppo.", "oPppppppppPo", "oPPrrppppPPo", ".oooooooooo."], { o:'#3f2631', p:'#ead4aa', P:'#c9a46c', k:'#8b6a4a', r:'#e43b44' });
const BAG = sprite([
  "....oooo....", "...o....o...", "..o......o..", ".oooooooooo.", "oBbbbbbbbbBo", "oBbbbyybbbBo", "oBbbbyybbbBo",
  "oBbbbbbbbbBo", "oBbbbbbbbbBo", "oBBBBBBBBBBo", ".oooooooooo."], { o:'#3f2631', b:'#b86f50', B:'#733e39', y:'#feae34' });
const BOOK = sprite([
  ".ooooooooooo", "ogggggggggwo", "ogGGGGGGGgwo", "ogGyyyyyGgwo", "ogGGGGGGGgwo", "ogggggggggwo", "ogggyyyyggwo",
  "ogggggggggwo", "ogggggggggwo", "oddddddddddo", ".ooooooooooo"], { o:'#3f2631', g:'#3e8948', G:'#63c74d', y:'#fee761', w:'#ead4aa', d:'#265c42' });
// The golden chest at the school and the golden ticket that is in it
const CHESTPAL = { o:'#3f2631', y:'#feae34', Y:'#fee761', b:'#b86f50', B:'#733e39', w:'#ffffff' };
const CHEST = sprite([
  "................", "................", "..oooooooooooo..", ".oYYYYYYYYYYYYo.", ".oyyyyyyyyyyyyo.", ".oyyyyyyyyyyyyo.",
  ".oooooooooooooo.", ".obbbbbooobbbbo.", ".obbbbboYobbbbo.", ".obbbbbooobbbbo.", ".obbbbbbbbbbbbo.", ".oBBBBBBBBBBBBo.",
  ".oooooooooooooo.", "................", "................", "................"], CHESTPAL);
const CHEST_OPEN = sprite([
  "..oooooooooooo..", ".oYYYYYYYYYYYYo.", ".oyyyyyyyyyyyyo.", ".oooooooooooooo.", ".oYwYYwYYYwYYYo.", ".oYYYwYYwYYYwYo.",
  ".oooooooooooooo.", ".obbbbbooobbbbo.", ".obbbbboYobbbbo.", ".obbbbbooobbbbo.", ".obbbbbbbbbbbbo.", ".oBBBBBBBBBBBBo.",
  ".oooooooooooooo.", "................", "................", "................"], CHESTPAL);
const TICKET = sprite([
  "oooooooooooooo", "oYYYYYYYYYYYYo", "oYyyyyyyyyyyYo", "oYyyyyYYyyyyYo", ".oyyyYYYYyyyo.", ".oyyyyYYyyyyo.", "oYyyyYyyYyyyYo",
  "oYyyyyyyyyyyYo", "oYYYYYYYYYYYYo", "oooooooooooooo"], CHESTPAL);
const FISH = sprite([
  "............", "..oooo....o.", ".obbbbo..obo", "obwbbbbooBbo", "obkbbbbbbBo.", "obbbbbbbbBo.", "obbbbbbooBbo",
  ".oBBBBo..oBo", "..oooo....o."], { o:'#3f2631', b:'#8b9bb4', B:'#5a6988', w:'#ffffff', k:'#262b44' });
// The float on the line, and the splash when it is pulled under
const FLOAT = sprite(["...oo...", "...oo...", "..orro..", ".orrrro.", ".orrrro.", ".owwwwo.", ".owwwwo.", "..owwo..", "...oo..."], { o:'#3f2631', r:'#e43b44', w:'#ffffff' });
const SPLASH = sprite(["..w....w....", "w..w..w..w.w", ".w.wwwww.w..", "..wwbbbbww..", ".wwbbbbbbww."], { w:'#ffffff', b:'#c0eaff' });
// A picture for each kind of catch: the plain fish with other colours and markings, and own shapes for the pike, the grayling,
// the frog and the crayfish (own drawings)
const FISH_ROWS = ["............", "..oooo....o.", ".obbbbo..obo", "obwbbbbooBbo", "obkbbbbbbBo.", "obbbbbbbbBo.", "obbbbbbooBbo", ".oBBBBo..oBo", "..oooo....o."];
const markFish = (pal, mark) => sprite(FISH_ROWS.map((r, y) => [...r].map((c, x) => c === 'b' && mark(x, y) || c).join('')), { o:'#3f2631', w:'#ffffff', k:'#262b44', ...pal });
const CATCH = {
  abborre: markFish({ b:'#a8b84a', B:'#e07a2c', s:'#3e4a1c' }, (x, y) => (x === 4 || x === 7) && y > 1 && y < 7 ? 's' : ''),
  oring: markFish({ b:'#b08a5a', B:'#7a5a36', d:'#e43b44', e:'#262b44' }, (x, y) => ({ '4,4': 'd', '6,2': 'e', '7,5': 'd', '5,6': 'e', '8,4': 'e' })[x + ',' + y] || ''),
  regnbage: markFish({ b:'#c0cbdc', B:'#8b9bb4', p:'#f6757a' }, (x, y) => y === 4 && x > 1 && x < 9 ? 'p' : ''),
  gadda: sprite(["..oooooooooo..o.", ".owkggdgggdggoBo", "ooygggggggggggBo", ".oGGGGGGGGGGGoBo", "..oooooooooo..o."], { o:'#3f2631', k:'#262b44', g:'#6e8f3a', G:'#46602a', d:'#d8e08a', y:'#c9b27d', B:'#46602a' }),
  harr: sprite(["...oooo.....", "..oPPPPo....", "..oooo....o.", ".obbbbo..obo", "obwbbbbooBbo", "obkbbbbbbBo.", "obbbbbbbbBo.", "obbbbbbooBbo", ".oBBBBo..oBo", "..oooo....o."], { o:'#3f2631', w:'#ffffff', k:'#262b44', b:'#9a8fb5', B:'#68386c', P:'#b55088' }),
  groda: sprite(["..oo....oo..", ".owko..owko.", ".oggooooggo.", "oggggggggggo", "oggllllllggo", "oggllllllggo", ".oggggggggo.", "ogo.oggo.ogo", "oo..oooo..oo"], { o:'#3f2631', w:'#ffffff', k:'#262b44', g:'#63c74d', l:'#c6e07a' }),
  krafta: sprite([".oo......oo.", "orro....orro", "orrro..orrro", ".oorroorroo.", "..orkrrkro..", "..oRrrrrRo..", ".ooRrrrrRoo.", "..oRrrrrRo..", ".ooRrrrrRoo.", "...oRrrRo...", "..oRRRRRRo..", "..oooooooo.."], { o:'#3f2631', k:'#262b44', r:'#e43b44', R:'#a22633' }),
};
const catchIcon = id => iconURL(CATCH[id] || FISH, 8);
// A pixel arrow for the link back to the worksheets (the font has no clear arrow)
const ARROW = sprite(["...o.....", "..oyo....", ".oyyooooo", "oyyyyyyyo", ".oyyooooo", "..oyo....", "...o....."], { o:'#3f2631', y:'#fee761' });
document.querySelectorAll('img.back-arrow').forEach(im => { im.src = iconURL(ARROW, 2); });
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
// More tilesets can be added in karta.json (tilesets). A cell is a number (the main tileset), a text "o:14,10"
// (column and row in the tileset o) or a list of those that are drawn on top of each other.
const SETS = {};
for (const [id, t] of Object.entries(karta.tilesets || {})){ const img = new Image(); img.src = t.bild; SETS[id] = img; }
const refCache = new Map();
function parseRef(s){
  let r = refCache.get(s);
  if (!r){
    const m = /^(\w+):(\d+),(\d+)$/.exec(s);
    if (!m || !SETS[m[1]]) throw new Error('Okänd ruta ' + s);
    r = { img: SETS[m[1]], sx: +m[2] * TS, sy: +m[3] * TS };
    refCache.set(s, r);
  }
  return r;
}
const filled = Varld.filled;
function tile(ctx, i, x, y){
  if (Array.isArray(i)){ for (const j of i) tile(ctx, j, x, y); return; }
  if (typeof i === 'string'){ const r = parseRef(i); ctx.drawImage(r.img, r.sx, r.sy, TS, TS, x, y, TS, TS); return; }
  const [sx, sy] = tileXY(i); ctx.drawImage(tiles, sx, sy, TS, TS, x, y, TS, TS);
}
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
// The small decoration in the grass is placed once. The terrain image is redrawn when a forest plot is built, or in debug mode.
let decorDone = false;
function placeDecor(){
  if (decorDone) return; decorDone = true;
  const r = rng(42);
  // dekor i gräset
  const near = (x, y) => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => { const v = at(x+dx, y+dy); return v === 'p' || v === 's' || v === 'b' || v === 'w'; });
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++){
    if (M[y][x] !== 'g' || occ.has(key(x, y)) || near(x, y)) continue;
    const v = r();
    if (v < 0.03) put(28, x, y);
    else if (v < 0.045 && at(x, y-1) === 'g' && !occ.has(key(x, y-1)) && !near(x, y-1)){ put(4, x, y-1); put(16, x, y); }
    else if (v < 0.065) put(5, x, y);
    else if (v < 0.072) put(29, x, y);
  }
}
function buildTerrain(){
  placeDecor();
  const base = document.createElement('canvas'); base.width = MW*TS; base.height = MH*TS;
  const b = base.getContext('2d');
  const gr = rng(7);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++){
    const v = gr(); tile(b, v < 0.13 ? 1 : v < 0.17 ? 2 : 0, x*TS, y*TS);
  }
  // The road to a hidden stop is drawn as grass until the stop has been found
  const shownRoad = new Set(EDGES.filter(edgeShown).flatMap(e => e.tiles.map(([x, y]) => key(x, y))));
  const hiddenRoad = new Set(EDGES.filter(e => !edgeShown(e)).flatMap(e => e.tiles.map(([x, y]) => key(x, y))).filter(k => !shownRoad.has(k)));
  const isShownPath = (x, y) => isPath(x, y) && !hiddenRoad.has(key(x, y));
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (M[y][x] === 'p' && !hiddenRoad.has(key(x, y))) auto(b, DIRT, isShownPath, x, y);
  // A path (stig) is drawn by hand: a narrow, faint band of trodden earth with a few pebbles. It only joins the tiles before and
  // after it on its own path, so it does not reach out to a road that runs beside it.
  const links = new Map();
  for (const e of EDGES) if (e.stig && edgeShown(e)) e.tiles.forEach(([x, y], i) => {
    const l = links.get(key(x, y)) || new Set(); links.set(key(x, y), l);
    for (const n of [e.tiles[i - 1], e.tiles[i + 1]]) if (n) l.add(`${n[0] - x},${n[1] - y}`);
  });
  const pr = rng(5);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++){
    if (M[y][x] !== 's' || !links.has(key(x, y))) continue;
    const X = x*TS, Y = y*TS, l = links.get(key(x, y));
    b.fillStyle = 'rgba(191,121,88,.55)';
    b.fillRect(X + 5, Y + 5, 6, 6);
    if (l.has('0,-1')) b.fillRect(X + 5, Y, 6, 5);
    if (l.has('0,1')) b.fillRect(X + 5, Y + 11, 6, 5);
    if (l.has('-1,0')) b.fillRect(X, Y + 5, 5, 6);
    if (l.has('1,0')) b.fillRect(X + 11, Y + 5, 5, 6);
    b.fillStyle = 'rgba(115,62,57,.45)';
    for (let i = 0; i < 2; i++) b.fillRect(X + 5 + Math.floor(pr()*6), Y + 5 + Math.floor(pr()*6), 1, 1);
  }
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
  // A plot that is forest until something is built there (the hidden glade) gets the same kind of trees, with its own random numbers
  for (const p of PLOTS){
    if (!p.skog || builtShown(p)) continue;
    const pr = rng(500 + p.x * 31 + p.y);
    const inPlot = (x, y) => x >= p.x && x < p.x + 3 && y >= p.y && y < p.y + 3;
    const pk = () => pr() < .7 ? { i: 28 } : { i: 16, top: 4 };
    for (let y = p.y; y < p.y + 3; y++) for (let x = p.x; x < p.x + 3; x++){
      const up = inPlot(x, y - 1) || same(x, y - 1, 'F');
      stamps.push({ x: x*TS, y: y*TS - (up ? 3 : 0), ...(up ? pk() : { i: 28 }) });
      if (inPlot(x + 1, y) && inPlot(x, y + 1)) stamps.push({ x: x*TS + 8, y: y*TS + 5, ...pk() });
    }
  }
  // The fires are out in the terrain (by day). At night drawNight puts the burning ones on top.
  for (const ob of OBJ) stamps.push({ x: ob.x*TS, y: ob.y*TS, i: FIRE_OUT[ob.i] || ob.i, obj: true });
  stamps.sort((a, b) => a.y - b.y || (a.obj ? 1 : 0) - (b.obj ? 1 : 0));
  for (const st of stamps){ if (st.top !== undefined) tile(o, st.top, st.x, st.y - TS); tile(o, st.i, st.x, st.y); }
  o.fillStyle = '#262b44'; o.fillRect(CASTLE_X + 3*TS + 6, CASTLE_Y + 2*TS + 6, 20, 26);
  CASTLE.forEach((row, dy) => row.forEach((i, dx) => { if (filled(i)) tile(o, i, CASTLE_X + dx*TS, CASTLE_Y + dy*TS); }));
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
let REAL = null; // { stars, stoft, handelser } once the locked events have been opened
const START = () => ({
  stars: REAL ? REAL.stars : startData.stjarnor, coins: REAL ? REAL.stoft : startData.stjarnstoft, node: startData.plats,
  built: Object.fromEntries(startData.byggt.map(id => [id, true])),
  valda: {}, saker: [], steg: {}, handlat: {}, djur: [], fram: [], stopp: {}, hittat: [], spent: 0, kistor: [], agnAnvant: [], fiskbok: {}, namn: {}, bytt: {}, salt: {}, pa: {},
  sett: new Uint8Array(MW*MH),
  log: REAL ? REAL.handelser.slice() : startData.logg.map(r => ({ typ: 'runa', amne: r.amne, procent: Math.round(r.poang / r.max * 100), stjarnor: r.stjarnor, bonus: r.bonus })),
  testIdx: 0,
});
let S = START();
const SAMPLE_TESTS = berattelse.exempel.prov.map(t => ({ subj: t.amne, p: t.poang, max: t.max }));

const boy = { x: 0, y: 0, dir: 'down', route: null, step: 0, t: 0, target: null };
// The pets follow the path the boy has walked. trail holds the points he has passed, pet number k stands a few pixels
// further back along it. At the start the trail runs straight to the left of him, so the pets stand beside him.
const trail = [], petState = new Map();
function resetTrail(){ trail.length = 0; for (let i = 100; i >= 0; i--) trail.push({ x: boy.x - i, y: boy.y }); petState.clear(); }
function placeBoy(id){ const n = NODES[id]; boy.x = n.x*TS; boy.y = n.y*TS; resetTrail(); }
function petPos(k){
  let need = 13 + k * 11, cx = boy.x, cy = boy.y;
  for (let i = trail.length - 1; i > 0 && need > 0; i--){
    const a = trail[i - 1], d = Math.hypot(cx - a.x, cy - a.y);
    if (d >= need){ const t = need / d; return { x: cx + (a.x - cx) * t, y: cy + (a.y - cy) * t }; }
    need -= d; cx = a.x; cy = a.y;
  }
  return { x: cx, y: cy };
}
// Up to three animals follow him: the ones he has put forward in the animal book. In debug mode, if none is put forward,
// the first three follow so that it is possible to see them.
const MAX_FRAM = 3;
const activePets = () => DEBUG.mode && !S.fram.length ? Object.keys(PETS).slice(0, MAX_FRAM) : S.fram;


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
// A hidden stop (a secret fishing place) cannot be seen or walked to until an adventure has found it. In debug mode it shows.
const hiddenNode = id => !!NODES[id].hidden && !DEBUG.mode && !S.hittat.includes(id);
const edgeShown = e => !hiddenNode(e.a) && !hiddenNode(e.b);
function edgesOf(id){ return EDGES.filter(e => (e.a === id || e.b === id) && edgeShown(e)); }
// In the dark, only what can be reached from where he stands is shown: the dots of the neighbouring places and the gates
// on those roads (Peter 2026-10-18). Everything he has seen stays visible.
const nodeShown = id => !hiddenNode(id) && (DEBUG.mode > 0 || id === S.node || seenReal(NODES[id].x, NODES[id].y) || edgesOf(S.node).some(e => otherEnd(e, S.node) === id));
const gateShown = g => DEBUG.mode > 0 || seenReal(g.x, g.y) || edgesOf(S.node).some(e => e.gate === g);
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
  stopFishing();
  boy.route = pts; boy.step = 0; boy.target = id; cam.follow = true; cam.focus = null;
  hideHint();
  renderPanel({ type: 'walk', id });
}
function onArrive(){
  S.node = boy.target; boy.route = null; boy.dir = 'down'; saveSoon();
  if (pendingPlot && PLOTS.find(p => p.id === pendingPlot).node === S.node){ showPlot(PLOTS.find(p => p.id === pendingPlot)); pendingPlot = null; }
  else showNode();
}
let pendingPlot = null;

/* ---------- fog of war ---------- */
// Where the boy has been (and a bit around the road) the map is shown in colour, the rest is black. Only the dots he can
// land on (without names) and the gates show through the dark.
// S.sett holds one flag per tile. The colour layer is cut out with a mask whose edge is a pixel pattern.
// How far he sees: less while he walks on a road, more when he stands on a place (Peter 2026-10-18)
const FOG_WALK = 3, FOG_STOP = 5;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const FOG_COLOR = '#000000';
// Debug (button on the page): 0 = off. 1 and 2 = every plot built with the first or the second alternative, 3 = every plot empty.
// In all three there is no fog and every name is shown.
const DEBUG = { mode: 0 };
const seenReal = (x, y) => inb(x, y) && S.sett[y*MW + x] === 1;
const seenAt = (x, y) => DEBUG.mode > 0 || seenReal(x, y);
let maskDirty = true, MASK = null, MASKCTX = null, TMP = null, lastRevealKey = '';
function revealAround(wx, wy, r = FOG_STOP){
  const cx = Math.floor(wx / TS), cy = Math.floor(wy / TS), k = cx + ',' + cy + ',' + r;
  if (k === lastRevealKey) return;
  lastRevealKey = k;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++){
    if (!inb(x, y) || S.sett[y*MW + x]) continue;
    if (Math.hypot(x - cx, y - cy) <= r + .3){ S.sett[y*MW + x] = 1; maskDirty = true; }
  }
}
function buildMask(){
  const w = MW*TS, h = MH*TS;
  if (!MASK){
    MASK = document.createElement('canvas'); MASK.width = w; MASK.height = h; MASKCTX = MASK.getContext('2d');
    TMP = document.createElement('canvas'); TMP.width = w; TMP.height = h;
  }
  const im = MASKCTX.createImageData(w, h), D = im.data;
  const on = (x, y) => { D[(y*w + x)*4 + 3] = 255; };
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++){
    if (seenReal(tx, ty)){ for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) on(tx*TS + lx, ty*TS + ly); continue; }
    const L = seenReal(tx-1, ty), R = seenReal(tx+1, ty), U = seenReal(tx, ty-1), B = seenReal(tx, ty+1);
    const UL = seenReal(tx-1, ty-1), UR = seenReal(tx+1, ty-1), BL = seenReal(tx-1, ty+1), BR = seenReal(tx+1, ty+1);
    if (!(L || R || U || B || UL || UR || BL || BR)) continue;
    for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++){
      let d = 99;
      if (L) d = Math.min(d, lx + .5); if (R) d = Math.min(d, TS - .5 - lx);
      if (U) d = Math.min(d, ly + .5); if (B) d = Math.min(d, TS - .5 - ly);
      if (UL) d = Math.min(d, Math.hypot(lx + .5, ly + .5)); if (UR) d = Math.min(d, Math.hypot(TS - .5 - lx, ly + .5));
      if (BL) d = Math.min(d, Math.hypot(lx + .5, TS - .5 - ly)); if (BR) d = Math.min(d, Math.hypot(TS - .5 - lx, TS - .5 - ly));
      if (d < 8 && BAYER[(ly & 3)*4 + (lx & 3)] < (1 - d / 8) * 16) on(tx*TS + lx, ty*TS + ly);
    }
  }
  MASKCTX.putImageData(im, 0, 0);
  maskDirty = false;
}

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
  // the centre is yellow while something is left to do at the place, grey when all is done (Peter 2026-10-20)
  ellipse(cx, cy, 3.5, 2, !reachable ? '#5a6988' : n.id === 'slott' ? '#e43b44' : nodeActive(n.id) ? '#feae34' : '#8b9bb4');
  ctx.fillStyle = reachable ? '#ffffff' : '#c0cbdc'; ctx.fillRect(cx - 4, cy - 2, 2, 1);
}
const FLAG_PLOT = FLAGS.map(f => PLOTS.find(p => f.x >= p.x*TS && f.x < (p.x + 3)*TS && f.y >= p.y*TS && f.y < (p.y + 3)*TS));
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
  const built = builtShown(p);
  const a = plotAnim.get(p.id);
  if (built){
    let lift = 0;
    if (a){ const t = (now - a) / 1000; if (t < .35) return; if (t < .7) lift = Math.round(Math.sin((t - .35) / .35 * Math.PI) * 4); }
    plotTiles(p).forEach((row, dy) => row.forEach((i, dx) => { if (filled(i)) tile(ctx, i, ox + dx*TS, oy + dy*TS - lift); }));
  } else {
    if (p.skog) return;
    emptyTiles(p).forEach((row, dy) => row.forEach((i, dx) => { if (filled(i)) tile(ctx, i, ox + dx*TS, oy + dy*TS); }));
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
function drawPet(id, st, now, k){
  const P = PETS[id], f = (st.moved ? Math.floor(now / 140 + k) : Math.floor(now / 650 + k)) % 2;
  const bob = P.lyft ? Math.round(Math.sin(now / 210 + k * 2)) : 0;
  const x = Math.round(st.x), y = Math.round(st.y) - 6 - P.lyft + bob;
  ctx.fillStyle = 'rgba(63,38,49,.35)'; ctx.fillRect(x + 5, Math.round(st.y) + 9, 6, 2); ctx.fillRect(x + 4, Math.round(st.y) + 10, 8, 1);
  ctx.drawImage((st.left ? P.left : P.right)[f], x, y);
}
// The boy and the pets are drawn from the back to the front
function drawActors(now){
  const list = [{ y: boy.y, draw: () => drawBoy(now) }];
  activePets().forEach((id, k) => {
    const p = petPos(k), st = petState.get(id) || { x: p.x, y: p.y, left: false, moved: false };
    const dx = p.x - st.x;
    st.moved = Math.hypot(dx, p.y - st.y) > .05;
    if (dx < -.15) st.left = true; else if (dx > .15) st.left = false;
    st.x = p.x; st.y = p.y; petState.set(id, st);
    list.push({ y: p.y, draw: () => drawPet(id, st, now, k) });
  });
  list.sort((a, b) => a.y - b.y).forEach(a => a.draw());
}
function pill(x, y, parts, opts){
  opts = opts || {};
  const fs = Math.round(8 * dpr), gap = Math.round(4*dpr);
  ctx.font = `${fs}px "Press Start 2P", ui-monospace, monospace`;
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
  { const lp = trail[trail.length - 1]; if (Math.hypot(boy.x - lp.x, boy.y - lp.y) >= 1){ trail.push({ x: boy.x, y: boy.y }); if (trail.length > 700) trail.splice(0, 100); } }
  revealAround(boy.x + 8, boy.y + 8, boy.route ? FOG_WALK : FOG_STOP);
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
  ctx.fillStyle = FOG_COLOR; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scaleDev, 0, 0, scaleDev, -ox, -oy);
  ctx.imageSmoothingEnabled = false;
  if (DEBUG.mode){ ctx.drawImage(TERRAIN[terrainFrame], 0, 0); }
  else {
    if (maskDirty) buildMask();
    ctx.fillStyle = FOG_COLOR; ctx.fillRect(0, 0, MW*TS, MH*TS);
    const tc = TMP.getContext('2d');
    tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, TMP.width, TMP.height);
    tc.drawImage(TERRAIN[terrainFrame], 0, 0);
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(MASK, 0, 0);
    ctx.drawImage(TMP, 0, 0);
  }

  const reach = new Set([S.node]); { const q = [S.node]; while (q.length){ const n = q.shift(); for (const e of edgesOf(n)) if (edgeOpen(e)){ const m = otherEnd(e, n); if (!reach.has(m)){ reach.add(m); q.push(m); } } } }
  for (const p of PLOTS) if (seenAt(p.x + 1, p.y + 1)) drawPlot(p, now);
  FLAGS.forEach((f, i) => {
    // A flag that stands on a plot moves up onto the roof when something is built there, so it does not cover the door
    const p = FLAG_PLOT[i], at = p && builtShown(p) ? { x: p.x*TS + 24, y: p.y*TS + 2 } : f;
    if (seenAt(Math.floor(at.x / TS), Math.floor(at.y / TS))) drawFlag(at, now, i);
  });
  for (const id in NODES) if (nodeShown(id)) drawNode(NODES[id], now, reach.has(id));
  for (const g of GATES){
    if (!gateShown(g)) continue;
    const open = S.stars >= g.req;
    const a = gateAnim.get(g);
    let img = open ? GATE_OPEN : GATE_CLOSED, shake = 0;
    if (a){ const t = (now - a) / 1000; if (t < .6){ img = GATE_CLOSED; shake = (Math.floor(t * 30) % 2) ? 1 : -1; } else if (t > 2) gateAnim.delete(g); }
    ctx.drawImage(img, g.x*TS + shake, g.y*TS - 4);
  }
  if (pendingTickets().length || chestOpening){
    const t = chestOpening ? (now - chestOpening) / 1000 : 0, shake = chestOpening && t < .6 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
    const glow = Math.floor(now / 400) % 2;
    // Gold glitter that rises from the closed chest now and then, so that it is easy to see and tempting to tap
    if (!chestOpening && !reduceMotion && now - chestGlitter > 80){
      chestGlitter = now;
      const gx = CHEST_AT.x*TS + 2 + Math.random() * 12, gy = CHEST_AT.y*TS + 3 + Math.random() * 8;
      FX.push({ k: 'spark', x: gx, y: gy, vx: (Math.random() - .5) * 8, vy: -14 - Math.random() * 14, t: 0, life: .7 + Math.random() * .5, col: Math.random() < .6 ? '#fee761' : '#ffffff' });
    }
    if (!chestOpening && glow){ ctx.fillStyle = 'rgba(254,231,97,.35)'; ctx.fillRect(CHEST_AT.x*TS - 1, CHEST_AT.y*TS + 1, 18, 13); }
    ctx.drawImage(chestOpening && t >= .6 ? CHEST_OPEN : CHEST, CHEST_AT.x*TS + shake, CHEST_AT.y*TS);
  }
  drawActors(now);
  // partiklar
  for (let i = FX.length - 1; i >= 0; i--){
    const p = FX[i]; p.t += dt; if (p.t > p.life){ FX.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.k === 'spark'){ p.vy += 60 * dt; ctx.fillStyle = p.col; const s = p.t < p.life * .6 ? 2 : 1; ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s); }
    else { p.vx *= .92; p.vy *= .92; const r = Math.max(1, Math.round(p.r * (1 - p.t / p.life))); ctx.fillStyle = p.t < p.life*.5 ? '#ffffff' : '#c0cbdc'; ctx.fillRect(Math.round(p.x) - r, Math.round(p.y) - r, r*2, r*2); }
  }

  // natt: fades in and out when he sleeps in Hemmet
  nightLevel += ((S.natt ? 1 : 0) - nightLevel) * Math.min(1, dt * 1.6);
  if (Math.abs(nightLevel - (S.natt ? 1 : 0)) < .005) nightLevel = S.natt ? 1 : 0;
  if (nightLevel > 0) drawNight(now, nightLevel);
  // etiketter i skärmskala
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sx = wx => wx * scaleDev - ox, sy = wy => wy * scaleDev - oy;
  for (const g of GATES){
    if (S.stars >= g.req || !gateShown(g)) continue;
    pill(sx(g.x*TS + 8), sy(g.y*TS - 6), [LOCK, String(g.req), STAR], { color: '#fee761' });
  }
  // What things cost is not shown on the map (Peter 2026-10-18), only in the panel. The stars a gate needs are shown above.
  for (const id in NODES){
    const n = NODES[id], here = id === S.node && !boy.route;
    if (!seenAt(n.x, n.y) || hiddenNode(id)) continue;
    pill(sx(n.x*TS + 8), sy(n.y*TS + (n.labelAbove ? -1 : 31)), [n.name], { color: here ? '#fee761' : '#ffffff', edge: here ? '#feae34' : '#3a4466' });
  }
  requestAnimationFrame(frame);
}

/* ---------- natten ---------- */
// At night the map turns blue (multiply), windows glow yellow, the torches flicker and stars twinkle in the water.
// The lights are the tiles in LIGHT_TILES: where on the tile the light sits, and what kind of light it is.
let nightLevel = 0, STATIC_LIGHTS = null, WATER_STARS = null;
// The burning torch and campfire, and the same put out (own tiles in openrpg.png, verktyg/gor-egna-rutor.py)
const FIRE_OUT = { 'o:18,10': 'o:8,16', 'o:21,12': 'o:9,16' };
const LIGHT_TILES = { 84: [8, 8, 'win'], 88: [8, 8, 'win'], 'o:27,2': [8, 8, 'win'], 125: [8, 8, 'slit'], 51: [8, 10, 'small'], 55: [8, 10, 'small'], 'o:18,10': [8, 4, 'fire'], 'o:21,12': [8, 9, 'fire'], 'o:28,15': [8, 8, 'tent'] };
const lightIn = i => { for (const j of Array.isArray(i) ? i : [i]) if (LIGHT_TILES[j]) return LIGHT_TILES[j]; return null; };
function nightLights(){
  if (!STATIC_LIGHTS){
    STATIC_LIGHTS = [];
    const add = (i, px, py) => { const L = lightIn(i); if (L) STATIC_LIGHTS.push({ x: px + L[0], y: py + L[1], k: L[2], i, px, py }); };
    for (const o of OBJ) add(o.i, o.x*TS, o.y*TS);
    CASTLE.forEach((row, dy) => row.forEach((i, dx) => add(i, CASTLE_X + dx*TS, CASTLE_Y + dy*TS)));
  }
  const list = STATIC_LIGHTS.slice();
  for (const p of PLOTS) if (builtShown(p)) plotTiles(p).forEach((row, dy) => row.forEach((i, dx) => { const L = lightIn(i); if (L) list.push({ x: (p.x + dx)*TS + L[0], y: (p.y + dy)*TS + L[1], k: L[2] }); }));
  return list;
}
// A small sailing ship drifts on the lake by Vassen, only at night (Peter 2026-10-20). bild/skepp.png is CyanShip from Mini World
// Sprites (Shade, CC0, opengameart.org/content/miniworld-sprites): three frames of 32 x 32, the bow to the left.
const SHIP = new Image(); SHIP.src = 'bild/skepp.png';
const boatAt = now => ({ x: 23*TS - 12 + Math.round(Math.sin(now / 5200) * 22), y: 17*TS + 4 + (reduceMotion ? 0 : Math.round(Math.sin(now / 700))), right: Math.cos(now / 5200) > 0 });
function drawNight(now, lv){
  if (!WATER_STARS){
    const r = rng(11); WATER_STARS = [];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (M[y][x] === 'w' && r() < .3) WATER_STARS.push({ x: x*TS + 2 + Math.floor(r()*12), y: y*TS + 2 + Math.floor(r()*12), ph: r() * 6.3, sp: 500 + r() * 900 });
  }
  const seen = (x, y) => DEBUG.mode || seenAt(Math.floor(x / TS), Math.floor(y / TS));
  const lights = nightLights().filter(L => seen(L.x, L.y));
  const bt = boatAt(now), boatSeen = SHIP.complete && seen(bt.x + 16, bt.y + 16);
  if (boatSeen){
    const f = reduceMotion ? 0 : Math.floor(now / 350) % 3;
    ctx.save(); ctx.globalAlpha = lv;
    if (bt.right){ ctx.translate(bt.x + 32, bt.y); ctx.scale(-1, 1); ctx.drawImage(SHIP, f*32, 0, 32, 32, 0, 0, 32, 32); }   // sailing to the right: the bow turns
    else ctx.drawImage(SHIP, f*32, 0, 32, 32, bt.x, bt.y, 32, 32);
    ctx.restore();
    lights.push({ x: bt.x + 16, y: bt.y + 14, k: 'lamp' });
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = lv;
  ctx.fillStyle = '#3d4f99'; ctx.fillRect(0, 0, MW*TS, MH*TS);
  // the burning fires on top of the put-out ones, fading in with the night. They are drawn before the light, so the glow
  // lies over the flames and not under them.
  ctx.globalCompositeOperation = 'source-over';
  for (const L of lights) if (L.k === 'fire' && L.i) tile(ctx, L.i, L.px, L.py);

  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
  for (const L of lights){
    const fire = L.k === 'fire', flick = fire && !reduceMotion ? .85 + .15 * Math.sin(now / 90 + L.x) * Math.sin(now / 53 + L.y) : 1;
    // the ship on the lake glows a mysterious blue, everything else warm
    const rad = (fire ? 30 : L.k === 'lamp' ? 26 : L.k === 'win' || L.k === 'tent' ? 20 : L.k === 'plate' ? 13 : 12) * flick, c = fire ? '255,140,50' : L.k === 'lamp' ? '90,170,255' : L.k === 'plate' ? '255,235,180' : '255,200,100';
    const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, rad);
    g.addColorStop(0, `rgba(${c},${.5 * lv})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(L.x - rad, L.y - rad, rad * 2, rad * 2);
  }
  if (S.lyktaTand && S.saker.includes('lykta')){
    const bx = boy.x + 8, by = boy.y + 4, rad = 22 + (reduceMotion ? 0 : Math.sin(now / 300) * 1.5);
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
    g.addColorStop(0, `rgba(255,210,120,${.32 * lv})`); g.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = g; ctx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const L of lights){
    if (L.k === 'fire' || L.k === 'tent' || L.k === 'lamp' || L.k === 'plate') continue;
    const [w, h] = L.k === 'win' ? [6, 6] : [2, 4];
    ctx.fillStyle = `rgba(254,231,97,${.85 * lv})`; ctx.fillRect(Math.round(L.x - w / 2), Math.round(L.y - h / 2), w, h);
  }
  for (const st of WATER_STARS){
    if (!seen(st.x, st.y)) continue;
    const a = reduceMotion ? .6 : Math.sin(now / st.sp + st.ph);
    if (a < .35) continue;
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, a) * lv})`; ctx.fillRect(st.x, st.y, 1, 1);
    if (a > .9){ ctx.fillStyle = `rgba(255,255,255,${.5 * lv})`; ctx.fillRect(st.x - 1, st.y, 3, 1); ctx.fillRect(st.x, st.y - 1, 1, 3); }
  }
  ctx.restore();
}
// Sleeping in Hemmet turns day into night and night into day. The choice is saved.
function sleepBlock(){
  const here = S.node === 'hem' && !boy.route;
  return `<div class="plot"><div><b>${S.natt ? 'Det är natt i Glimmerdal' : 'Stugan'}</b><span>${S.natt ? 'Sov tills det blir morgon.' : 'Sov tills det blir natt.'}</span></div>${here ? '<button class="btn" type="button" data-sov="1">Sov</button>' : ''}</div>`;
}
function sleep(){
  S.natt = !S.natt; saveSoon(); musicSync(); nattLabel();
  toast(S.natt ? 'Du somnade i stugan och vaknade när månen var uppe.' : 'Du sov gott, och nu är det morgon igen.');
  showNode();
}

// Reading a rune or a scroll again: tap it in the list
const readEvent = el => { const e = el && S.log[+el.dataset.las]; if (e && e.text) openModal(eventSteps(e, true).slice(1), null); };
$('#log').addEventListener('click', ev => readEvent(ev.target.closest('li[data-las]')));
$('#log').addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' '){ const li = ev.target.closest('li[data-las]'); if (li){ ev.preventDefault(); readEvent(li); } } });

// Putting clothes on and off from the bag: one hat and one pair of boots at a time
// The flute plays one of a few short tunes, the next one each time. Notes rise from the boy while it plays.
let flojtNr = 0, flojtTill = 0;
function playFlute(){
  if (!window.Musik || performance.now() < flojtTill) return;
  const dur = Musik.flojt(flojtNr++);
  flojtTill = performance.now() + dur * 1000;
  for (let i = 0; i < 5; i++) setTimeout(() => FX.push({ k: 'spark', x: boy.x + 10 + Math.random() * 4, y: boy.y - 4, vx: (Math.random() - .3) * 10, vy: -22 - Math.random() * 10, t: 0, life: 1.1, col: i % 2 ? '#fee761' : '#ffffff' }), i * dur * 180);
}
function useItem(id){
  const it = SAKER[id]; if (!it) return;
  if (id === 'flojt') return playFlute();
  if (id === 'lykta'){ S.lyktaTand = !S.lyktaTand; toast(S.lyktaTand ? 'Du tände lyktan.' : 'Du släckte lyktan.'); renderPack(); saveSoon(); return; }
  if (it.typ !== 'klader') return;
  if (S.pa[it.plats] === id) delete S.pa[it.plats]; else S.pa[it.plats] = id;
  buildBoy(S.pa); renderPack(); saveSoon();
}
$('#pack').addEventListener('click', ev => { const li = ev.target.closest('li[data-use]'); if (li) useItem(li.dataset.use); });
$('#pack').addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' '){ const li = ev.target.closest('li[data-use]'); if (li){ ev.preventDefault(); useItem(li.dataset.use); } } });

/* ---------- musik ---------- */
// Two own chip songs (karta/musik.js). If the music is on it starts at the first tap (browsers allow no sound before that).
// The choice is remembered in the browser. At night only "Stjärnnatt" plays. The music pauses while the page is hidden.
const MUSIC_KEY = 'glimmerdal:musik';
const musicWanted = () => { try { return localStorage.getItem(MUSIC_KEY) !== 'av'; } catch (e) { return true; } };
const SPEAKER = ["....ww......", "...www...y..", "wwwgww.y..y.", "wwgggw..y..y", "wwgggw..y..y", "wwwgww.y..y.", "...www...y..", "....ww......"];
const SPEAKER_OFF = ["....ww......", "...www......", "wwwgww.r..r.", "wwgggw..rr..", "wwgggw..rr..", "wwwgww.r..r.", "...www......", "....ww......"];
const SPEAKER_PAL = { w: '#ffffff', g: '#c0cbdc', y: '#fee761', r: '#e43b44' };
let SPEAKER_URLS = null;
function musicButton(){
  if (!SPEAKER_URLS) SPEAKER_URLS = [iconURL(sprite(SPEAKER, SPEAKER_PAL), 3), iconURL(sprite(SPEAKER_OFF, SPEAKER_PAL), 3)];
  const b = $('#btnMusik'), on = !!(window.Musik && Musik.spelar);
  $('#icoMusik').src = SPEAKER_URLS[on ? 0 : 1]; b.title = on ? 'Stäng av musiken' : 'Sätt på musiken'; b.setAttribute('aria-pressed', String(on));
}
function musicSync(){ if (window.Musik) Musik.natt(!!S.natt); }
function firstGesture(ev){
  removeEventListener('pointerdown', firstGesture); removeEventListener('keydown', firstGesture);
  if ((ev.target.closest && ev.target.closest('#btnMusik')) || !window.Musik || !musicWanted()) return;
  musicSync(); Musik.start(); musicButton();
}
addEventListener('pointerdown', firstGesture); addEventListener('keydown', firstGesture);
$('#btnMusik').addEventListener('click', () => {
  if (!window.Musik) return;
  if (Musik.spelar){ Musik.stop(); try { localStorage.setItem(MUSIC_KEY, 'av'); } catch (e) { /* only this time */ } }
  else { musicSync(); Musik.start(); try { localStorage.setItem(MUSIC_KEY, 'pa'); } catch (e) { /* only this time */ } }
  musicButton();
});
document.addEventListener('visibilitychange', () => { if (window.Musik) Musik.paus(document.hidden); });

// Is there still something to do at a place? Used at night to keep the plate light.
function nodeActive(id){
  for (const p of PLOTS) if (p.node === id && !p.prebuilt){
    if (!S.built[p.id]) return true;
    const v = valOf(p);
    if (v && (!S.handlat[p.id] || (v.byte && !S.bytt[p.id]))) return true;
  }
  if (STOPP[id] && !S.stopp[id]) return true;
  const fp = FISKE.platser[id];
  if (fp && FISKE.djur.some(r => r.plats === id && !S.djur.includes(r.djur))) return true;
  if (fp && fp.lan && !S.saker.includes(fp.lan.ger)) return true;
  if (LOCKA.some(r => r.plats === id && !S.djur.includes(r.djur))) return true;
  if (berattelse.handel && id === berattelse.handel.plats && S.natt && (Object.keys(berattelse.handel.saljer || {}).some(x => !S.saker.includes(x)) || tradeOffers().length)) return true;
  if (id === 'hem' && letterWaiting()) return true;
  if (id === CHEST_AT.node && pendingTickets().length) return true;
  return false;
}

/* ---------- Stjärnväktarnas brev ---------- */
// A secret society, Stjärnväktarna, leaves a letter on the step of Hemmet at night, once he has opened his first rune or scroll.
// It can be read again with its own button. Their sign is a silver star with an eye (SIGIL, own drawing).
const SIGIL = sprite([".....o.....", "....owo....", "....owo....", "...owwwo...", "oowwwkwwwoo", ".owwekewwo.", "oowwwkwwwoo", "...owwwo...", "....owo....", "....owo....", ".....o....."],
  { o: '#3a4466', w: '#c0cbdc', e: '#ffffff', k: '#262b44' });
const V = berattelse.stjarnvaktarna;
const letterWaiting = () => V && !S.brev2 && S.natt && S.log.some(e => e.text);
function letterBlock(){
  const here = S.node === 'hem' && !boy.route;
  return `<div class="plot"><div><b>${esc(V.rubrik)}</b><span>${esc(V.text)}</span></div>${here ? `<button class="btn" type="button" data-brev="1">${esc(V.knapp)}</button>` : ''}</div>`;
}
function readLetter2(){
  if (!S.brev2){ S.brev2 = true; saveSoon(); renderLetters(); }
  // shown like the queen's letter: line by line in the dialog box under the map
  startDialog(V.stycken.map(t => ({ p: null, t })), () => [{ label: 'Tillbaka till kartan', alt: true, run: toNode }]);
}

/* ---------- tältet och nattfiskaren ---------- */
// The tent behind the campfire in Skogsgläntan is closed by day. At night the night fisherman buys fish from the fish book and
// finds from the pack, one of each kind (S.salt), so it is a collection to sell and no way to make endless stardust.
function tentBlock(){
  const H = berattelse.handel, here = S.node === H.plats && !boy.route;
  if (!S.natt) return `<div class="plot"><div><b>${esc(H.rubrikDag)}</b><span>${esc(H.stangt)}</span></div></div>`;
  return `<div class="plot"><div><b>${esc(H.rubrikNatt)}</b></div>${here ? `<button class="btn" type="button" data-handel="1">${esc(H.knapp)}</button>` : ''}</div>`;
}
function tradeOffers(){
  const H = berattelse.handel, out = [];
  for (const [id, n] of Object.entries(H.fisk)) if (S.fiskbok[id] > 0 && !S.salt['fisk:' + id]) out.push({ key: 'fisk:' + id, namn: FISKE.fiskar[id].namn, text: FISKE.fiskar[id].text, n, tack: H.tack && H.tack[id], sell: () => { S.fiskbok[id]--; renderFishBook(); } });
  return out;
}
function startTrade(seen){
  const H = berattelse.handel, offers = tradeOffers();
  const wares = Object.entries(H.saljer || {}).filter(([id]) => !S.saker.includes(id));
  // what he says depends on whether he has something to sell and whether there is fish to buy
  const hello = offers.length && wares.length ? H.hej : wares.length ? H.baraSaljer : offers.length ? H.baraKoper : H.inget;
  startDialog([{ p: H.person, t: hello }], () => [
    ...wares.map(([id, n]) => ({ label: `Köp ${esc(SAKER[id].namn.toLowerCase())} ${price(n)}<small>${esc(SAKER[id].text)}</small>`, poor: S.coins < n, run: () => buyFrom(id, n) })),
    ...offers.map(o => ({ label: `Sälj ${esc(o.namn.toLowerCase())} ${price(o.n)}<small>${esc(o.text)}</small>`, run: () => sellTo(o) })),
    { label: 'Tillbaka till kartan', alt: true, run: toNode },
  ], seen);
}
function buyFrom(id, n){
  if (S.saker.includes(id)) return;
  if (S.coins < n){ toast(berattelse.dialog.ingaStoft.replace('{n}', n - S.coins)); return; }
  spend(n); updateHud('coins'); S.saker.push(id); renderPack(); saveSoon();
  sparkle(boy.x + 8, boy.y + 2, 18);
  toast(`Du köpte ${SAKER[id].namn.toLowerCase()}!`);
  const K = berattelse.handel.kopt;
  startDialog([{ p: berattelse.handel.person, t: typeof K === 'string' ? K : K[id] }], () => [
    { label: 'Något mer', run: () => startTrade(true) },
    { label: 'Tillbaka till kartan', alt: true, run: toNode },
  ]);
}
function sellTo(o){
  if (S.salt[o.key]) return;
  o.sell(); S.salt[o.key] = true; earn(o.n); saveSoon();
  sparkle(boy.x + 8, boy.y + 2, 18, '#2ce8f5');
  toast(`Du sålde ${o.namn.toLowerCase()} för ${o.n} stjärnstoft.`);
  startDialog([{ p: berattelse.handel.person, t: o.tack || 'Tack. Den tar jag väl hand om.' }], () => [
    { label: 'Något mer', run: () => startTrade(true) },
    { label: 'Tillbaka till kartan', alt: true, run: toNode },
  ]);
}

/* ---------- panel ---------- */
const panel = $('#panel');
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
function iconURL(c, s){ const k = document.createElement('canvas'); k.width = c.width*s; k.height = c.height*s; const x = k.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, k.width, k.height); return k.toDataURL(); }
let FISH_BIG = '', STAR_URL = '', DUST_URL = '', LOCK_URL = '', RUNE_URL = '', SCROLL_URL = '', TICKET_URL = '', RUNE_BIG = '', SCROLL_BIG = '', TICKET_BIG = '';
function plotPreview(p){
  const c = document.createElement('canvas'); c.width = 48; c.height = 48; c.className = 'pix';
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) tile(x, 0, dx*16, dy*16);
  plotTiles(p).forEach((row, dy) => row.forEach((i, dx) => { if (filled(i)) tile(x, i, dx*16, dy*16); }));
  return c;
}
function renderPanel(view){
  current = view;
  clearInterval(typeTimer); clearInterval(blinkTimer);
  let h = '';
  if (view.type === 'walk'){
    h = `<span class="tag">På väg</span><h2>Till ${esc(NODES[view.id].name)}</h2><p>Pojken går längs stigen.</p>`;
  } else if (view.type === 'node'){
    const n = NODES[view.id];
    // No road buttons (Peter 2026-10-18): he walks by tapping the dots on the map, or with the arrow keys
    const plots = PLOTS.filter(p => p.node === n.id);
    const stop = STOPP[n.id];
    h = `<span class="tag">Du är här</span><h2>${esc(n.name)}</h2><p>${esc(n.text)}</p><div class="panel-body">`;
    for (const p of plots) h += plotBlock(p);
    if (stop) h += stopBlock(n.id);
    if (n.id === 'hem') h += sleepBlock();
    if (n.id === 'hem' && letterWaiting()) h += letterBlock();
    if (berattelse.handel && n.id === berattelse.handel.plats) h += tentBlock();
    if (FISKE.platser[n.id]) h += fishBlock(n.id);
    if (FISKE.platser[n.id] && FISKE.platser[n.id].lan) h += lanBlock(n.id);
    for (const r of LOCKA) if (r.plats === n.id) h += lureBlock(r);
    if (n.id === CHEST_AT.node && pendingTickets().length) h += `<div class="plot"><div><b>En guldkista står vid skolan</b></div><button class="btn" type="button" data-kista="1">Öppna kistan</button></div>`;
    if (n.id === 'slott') h += `<div><button class="btn" type="button" data-slott="1">${esc(berattelse.dialog.slottKnapp)}</button></div>`;
    h += `</div>`;
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
    h = `<span class="tag">Tomt i ${esc(n.name)}</span><h2>${esc(p.name)}</h2><p>${S.built[p.id] ? 'Det här har du byggt. Det står kvar på kartan för alltid.' : `Kostar ${p.cost} stjärnstoft. Stjärnstoft får du för rätta svar på matteblad.`}</p><div class="panel-body">${plotBlock(p)}<div class="roads"><button class="btn alt" type="button" data-back="1">Tillbaka</button></div></div>`;
  } else if (view.type === 'dialog'){
    const L = dlg.lines[dlg.i], who = L.p ? PERS[L.p] : null;
    h = `<div class="dlg">${who ? '<canvas class="portrait pix" width="32" height="32" aria-hidden="true"></canvas>' : ''}<div class="dlg-body"><div class="who">${who ? `<b>${esc(who.namn)}</b> <span>${esc(who.yrke)}</span>` : '<span class="tag">Berättare</span>'}</div><p class="say" aria-live="polite"></p><div class="dlg-btns" hidden></div></div></div>`;
  }
  panel.innerHTML = h;
  if (view.type === 'dialog') startTyping();
  panel.querySelectorAll('.plot[data-plot]:not([data-noicon])').forEach(el => { const p = PLOTS.find(q => q.id === el.dataset.plot); el.prepend(plotPreview(p)); });
}
function plotBlock(p){
  if (p.prebuilt) return `<div class="plot" data-plot="${p.id}"><div><b>${esc(p.name)}</b><span>Byggd.</span></div></div>`;
  const b = BYGG[p.bygg], v = valOf(p), here = S.node === p.node && !boy.route;
  if (v){
    const label = !S.handlat[p.id] ? `Ta emot gåva från ${esc(PERS[v.person].namn)}` : v.byte ? `Prata med ${esc(PERS[v.person].namn)}` : '';
    const shop = here && label ? `<button class="btn" type="button" data-shop="${p.id}">${label}</button>` : '';
    return `<div class="plot" data-plot="${p.id}"><div><b>${esc(v.namn)}</b><span>Byggd av ${esc(PERS[v.person].namn)}.</span></div>${shop}</div>`;
  }
  const names = b.val.map(x => esc(PERS[x.person].namn)).join(' och ');
  const label = b.aventyr && S.steg[p.id] ? 'Gå vidare' : (b.knapp || 'Prata med dem');
  const btn = here ? `<button class="btn" type="button" data-talk="${p.id}">${esc(label)}</button>` : `<button class="btn alt" type="button" data-goplot="${p.id}">Gå dit</button>`;
  // An adventure only says what is going on, no picture and no price (Peter 2026-10-18). A dispute shows both.
  if (b.aventyr) return `<div class="plot" data-plot="${p.id}" data-noicon><div><b>${esc(b.rubrik)}</b></div>${btn}</div>`;
  return `<div class="plot" data-plot="${p.id}"><div><b>${names} vill bygga här</b><span>${b.val.every(x => x.kostnad === b.val[0].kostnad) ? b.val[0].kostnad + ' stjärnstoft att bygga' : 'från ' + p.cost + ' stjärnstoft att bygga'}</span></div>${btn}</div>`;
}
let current = null;
const showNode = () => renderPanel({ type: 'node', id: S.node });
const showGate = g => renderPanel({ type: 'gate', gate: g });
const showPlot = p => renderPanel({ type: 'plot', plot: p });
panel.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.go || b.dataset.gate || b.dataset.goplot) showMap();
  if (b.dataset.go) walkTo(b.dataset.go);
  else if (b.dataset.gate){ const g = GATES[+b.dataset.gate]; showGate(g); focusGate(g); }
  else if (b.dataset.back){ stopFishing(); cam.focus = null; cam.follow = true; showNode(); }
  else if (b.dataset.goplot){ const p = PLOTS.find(q => q.id === b.dataset.goplot); goPlot(p); }
  else if (b.dataset.talk) startBuild(PLOTS.find(q => q.id === b.dataset.talk));
  else if (b.dataset.shop) startShop(PLOTS.find(q => q.id === b.dataset.shop));
  else if (b.dataset.slott) startCount();
  else if (b.dataset.kista) openChest();
  else if (b.dataset.fiska) startFishing(b.dataset.fiska);
  else if (b.dataset.sov) sleep();
  else if (b.dataset.brev) readLetter2();
  else if (b.dataset.handel) startTrade();
  else if (b.dataset.lan) talkFisher(b.dataset.lan);
  else if (b.dataset.locka) lure(b.dataset.locka);
  else if (b.dataset.redskap !== undefined){ fishing.redskap = b.dataset.redskap; renderFishing(); }
  else if (b.dataset.agn !== undefined){ fishing.agn = b.dataset.agn; renderFishing(); }
  else if (b.dataset.kasta) cast();
  else if (b.dataset.dra) pull();
  else if (b.dataset.igen){ fishing.phase = 'val'; renderFishing(); }
  else if (b.dataset.stopp) startStop(b.dataset.stopp);
  else if (b.dataset.dlgnext !== undefined){ dlg.i++; renderPanel({ type: 'dialog' }); }
  else if (b.dataset.dlgchoice !== undefined){ dlg.choices[+b.dataset.dlgchoice].run(); }
});
function goPlot(p){
  if (S.node === p.node && !boy.route){ showPlot(p); return; }
  const hops = findRoute(S.node, p.node, false);
  if (!hops){ walkTo(p.node); return; }
  pendingPlot = p.id; walkTo(p.node);
}
/* ---------- samtal, byggval och butiker ---------- */
const PERS = berattelse.personer, BYGG = berattelse.bygg, SAKER = berattelse.saker;
const valOf = p => { const id = S.valda[p.id]; return id ? BYGG[p.bygg].val.find(v => v.id === id) : null; };
// What is drawn on the map. In debug mode every plot is built with the first or the second alternative.
const shownVal = p => DEBUG.mode === 3 ? null : DEBUG.mode ? BYGG[p.bygg].val[DEBUG.mode - 1] : valOf(p);
const builtShown = p => !!p.prebuilt || (DEBUG.mode ? DEBUG.mode < 3 : !!S.built[p.id]);
const emptyTiles = p => (p.tom ? ITEMS[p.tom] : EMPTY_PLOT);
function plotTiles(p){ if (p.prebuilt) return ITEMS[p.item]; const v = shownVal(p); return v ? ITEMS[v.byggnad] : emptyTiles(p); }
let dlg = null, typeTimer = 0, blinkTimer = 0;

// Ready-made portraits and the real events arrive encrypted in the page (#lasData) and open with the password. Until then, and for anyone
// without a picture, the drawn pixel portraits from portratt.json are used. The ready-made ones do not blink.
const PORTRAIT_IMG = {};
function loadPortraitImages(){
  const el = document.getElementById('lasData');
  if (!el || !el.classList.contains('unlocked') || el.dataset.read) return;
  let locked = {};
  try { locked = JSON.parse(el.textContent); } catch (e) { return; }
  el.dataset.read = '1';
  if (locked.handelser) applyReal(locked.handelser);
  loadSave();
  for (const [id, url] of Object.entries(locked.portratt ?? {})){
    if (PORTRAIT_IMG[id]) continue;
    const im = new Image();
    im.onload = () => { PORTRAIT_IMG[id] = im; const cv = panel.querySelector('.portrait'); if (cv && dlg && dlg.lines[dlg.i].p === id){ clearInterval(blinkTimer); drawPortrait(cv, id, false); } };
    im.src = url;
  }
}
document.addEventListener('las:unlocked', loadPortraitImages);
function drawPortrait(cv, id, blink){
  const img = PORTRAIT_IMG[id];
  if (img){
    if (cv.width !== img.naturalWidth){ cv.width = img.naturalWidth; cv.height = img.naturalHeight; }
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0);
    return;
  }
  if (cv.width !== 32){ cv.width = 32; cv.height = 32; }
  const d = PORTRAITS[id], x = cv.getContext('2d');
  const rows = blink ? d.rader.map(r => [...r].map(c => d.ogon.includes(c) ? 's' : c).join('')) : d.rader;
  x.clearRect(0, 0, 32, 32); x.drawImage(sprite(rows, d.farger), 0, 0);
}
// A dialog is a list of lines, one per person (p = null is the narrator). When the last line has been read,
// end() gives the choices to show. seen = true shows the lines at once (used when the screen is redrawn).
function startDialog(lines, end, seen){
  dlg = { lines, end, i: 0, choices: [], seen: new Set(seen ? lines.map((_, k) => k) : []) };
  renderPanel({ type: 'dialog' });
}
function dialogButtons(){
  if (dlg.i < dlg.lines.length - 1) return '<button class="btn" type="button" data-dlgnext="1">Fortsätt</button>';
  dlg.choices = dlg.end();
  return dlg.choices.map((c, i) => `<button class="btn${c.alt ? ' alt' : ''}${c.poor ? ' locked' : ''}" type="button" data-dlgchoice="${i}"${c.disabled ? ' disabled' : ''}>${c.label}</button>`).join('');
}
function startTyping(){
  const L = dlg.lines[dlg.i];
  const say = panel.querySelector('.say'), btns = panel.querySelector('.dlg-btns'), cv = panel.querySelector('.portrait');
  const finish = () => { clearInterval(typeTimer); say.textContent = L.t; if (btns.hidden){ btns.innerHTML = dialogButtons(); btns.hidden = false; } };
  if (cv){
    drawPortrait(cv, L.p, false);
    if (!PORTRAIT_IMG[L.p]) blinkTimer = setInterval(() => { if (Math.random() < .4){ drawPortrait(cv, L.p, true); setTimeout(() => drawPortrait(cv, L.p, false), 140); } }, 1500);
  }
  const instant = reduceMotion || dlg.seen.has(dlg.i); dlg.seen.add(dlg.i);
  if (instant){ finish(); return; }
  let n = 0;
  typeTimer = setInterval(() => { n++; say.textContent = L.t.slice(0, n); if (n >= L.t.length) finish(); }, 24);
  say.onclick = finish;
}
const toNode = () => { dlg = null; showNode(); if (newsQueue.length) showNews(); };
// A short clue on a choice he cannot pay for yet: how much is missing and where more comes from
const missing = cost => S.coins < cost ? ` ${berattelse.dialog.saknarHint.replace('{n}', cost - S.coins)}` : '';
// A price in a button: the stardust icon and the number in bold
const price = n => `<span class="price"><img class="pix" src="${DUST_URL}" alt="">${n}<span class="sr"> stjärnstoft</span></span>`;
function startBuild(p){
  const b = BYGG[p.bygg];
  if (b.aventyr) return startAdventure(p);
  startDialog(b.val.map(v => ({ p: v.talar === null ? null : v.person, t: v.onskan })), () => [
    ...b.val.map(v => ({ label: `Låt ${esc(PERS[v.person].namn)} bygga ${price(v.kostnad)}<small>${esc(v.namn)}${missing(v.kostnad)}</small>`, poor: S.coins < v.kostnad, run: () => confirmBuild(p, v) })),
    { label: berattelse.dialog.tankLiteTill, alt: true, run: toNode },
  ]);
}
// An adventure is a few steps with two choices each. Some choices cost stardust (he throws it on the spot and a bridge, a ladder
// or a light appears), some are free (he just decides what to do). The last choice leads to one of the two buildings and the
// other one is never found. Where he has got to is kept in S.steg, so nothing is paid twice. 'bygg:<id>' means that the choice
// is made and only the building is left.
// An adventure is one of: { def: the aventyr data, key: where the progress is kept in S.steg, end(till, lines): what an ending does }
function plotAdventure(p){
  const b = BYGG[p.bygg];
  return { def: b.aventyr, key: p.id, end: (till, out) => { S.steg[p.id] = 'bygg:' + till.bygg; confirmBuild(p, b.val.find(v => v.id === till.bygg), out); } };
}
function startAdventure(p){
  const b = BYGG[p.bygg], at = S.steg[p.id] || b.aventyr.start;
  if (at.startsWith('bygg:')) confirmBuild(p, b.val.find(v => v.id === at.slice(5)), []);
  else runStep(plotAdventure(p), at, []);
}
function runStep(ad, id, pre){
  const st = ad.def.steg[id];
  startDialog([...pre, { p: st.p ?? null, t: st.t }], () => [
    ...st.val.map(o => ({ label: o.kostnad ? `${esc(o.label)} ${price(o.kostnad)}${missing(o.kostnad) ? `<small>${missing(o.kostnad)}</small>` : ''}` : esc(o.label), poor: S.coins < o.kostnad, run: () => takeStep(ad, o) })),
    { label: berattelse.dialog.tankLiteTill, alt: true, run: toNode },
  ]);
}
function takeStep(ad, o){
  if (S.coins < o.kostnad){ toast(berattelse.dialog.ingaStoft.replace('{n}', o.kostnad - S.coins)); return; }
  if (o.kostnad){
    spend(o.kostnad); updateHud('coins');
    sparkle(boy.x + 8, boy.y + 2, 18, '#2ce8f5'); sparkle(boy.x + 8, boy.y + 2, 12, '#ffffff');
  }
  const out = [{ p: o.p ?? null, t: o.text }];
  saveSoon();
  if (typeof o.till === 'string'){ S.steg[ad.key] = o.till; runStep(ad, o.till, out); }
  else ad.end(o.till, out);
}

/* ---------- stoppen med äventyr ---------- */
// The new stops are only adventures, no people and no building. Each can be played once: the ending he reaches is what he
// gets (an animal, a bait, stardust or a secret fishing place), the other endings are lost.
const STOPP = berattelse.stopp;
function stopBlock(id){
  const s = STOPP[id], done = S.stopp[id], going = S.steg['stopp:' + id], here = S.node === id && !boy.route;
  const btn = done || !here ? '' : `<button class="btn" type="button" data-stopp="${id}">${esc(going ? berattelse.dialog.stoppFortsatt : s.knapp)}</button>`;
  return `<div class="plot"><div><b>${esc(s.rubrik)}</b>${done ? `<span>${esc(berattelse.dialog.stoppKlar)} ${esc(rewardText(done))}</span>` : ''}</div>${btn}</div>`;
}
function startStop(id){
  if (S.stopp[id]) return;
  const s = STOPP[id], key = 'stopp:' + id;
  runStep({ def: s.aventyr, key, end: (till, out) => finishStop(id, till, out) }, S.steg[key] || s.aventyr.start, []);
}
const itemFound = id => `Du hittade ${SAKER[id].namn.toLowerCase()}.${SAKER[id].typ === 'klader' ? ' Du kan ta på den i väskan.' : ''}`;
function rewardText(till){
  const main = rewardMain(till);
  return till.extra ? `${main} ${itemFound(till.extra)}` : main;
}
function rewardMain(till){
  if (till.djur) return `${berattelse.djur[till.djur].art} skrevs in i djurboken.`;
  if (till.agn) return `Du fick ${SAKER[till.agn].namn.toLowerCase()}.`;
  if (till.stoft) return `Du fick ${till.stoft} stjärnstoft.`;
  if (till.fynd) return itemFound(till.fynd);
  return `En hemlig fiskeplats syns nu på kartan: ${NODES[till.fiskeplats].name}.`;
}
function finishStop(id, till, out){
  S.stopp[id] = till; delete S.steg['stopp:' + id]; saveSoon();
  if (till.djur) giveAnimal(till.djur, out[out.length - 1].t);
  if (till.agn && !S.saker.includes(till.agn)){ S.saker.push(till.agn); renderPack(); toast(rewardText(till)); }
  if (till.fynd && !S.saker.includes(till.fynd)){ S.saker.push(till.fynd); renderPack(); sparkle(boy.x + 8, boy.y + 2, 18); toast(rewardText(till)); }
  if (till.extra && !S.saker.includes(till.extra)){ S.saker.push(till.extra); renderPack(); }
  if (till.stoft){ S.coins += till.stoft; updateHud('coins'); sparkle(boy.x + 8, boy.y + 2, 24); toast(rewardText(till)); }
  if (till.fiskeplats){ S.hittat.push(till.fiskeplats); buildTerrain(); sparkle(NODES[till.fiskeplats].x*TS + 8, NODES[till.fiskeplats].y*TS + 8, 26); toast(rewardText(till)); }
  startDialog([...out, { p: null, t: rewardText(till) }], () => [{ label: 'Tillbaka till kartan', alt: true, run: toNode }]);
}
function confirmBuild(p, v, pre){
  const adventure = !!BYGG[p.bygg].aventyr, short = () => toast(berattelse.dialog.ingaStoft.replace('{n}', v.kostnad - S.coins));
  if (!adventure && S.coins < v.kostnad){ short(); return; }
  const text = v.bekrafta ? v.bekrafta.replace('{n}', v.kostnad) : `${PERS[v.person].namn} bygger ${v.namn.toLowerCase()} för ${v.kostnad} stjärnstoft.`;
  startDialog([...(pre || []), { p: null, t: `${text} ${berattelse.dialog.val}` }], () => [
    { label: `Ja, bygg ${price(v.kostnad)}`, poor: S.coins < v.kostnad, run: () => S.coins < v.kostnad ? short() : doBuild(p, v) },
    { label: adventure ? 'Vänta lite' : 'Nej, vänta', alt: true, run: adventure ? toNode : () => startBuild(p) },
  ]);
}
function doBuild(p, v){
  spend(v.kostnad); saveSoon(); S.built[p.id] = true; S.valda[p.id] = v.id; delete S.steg[p.id];
  if (p.skog) buildTerrain();
  plotAnim.set(p.id, performance.now());
  dust(p.x*TS + 24, p.y*TS + 30);
  setTimeout(() => sparkle(p.x*TS + 24, p.y*TS + 18, 18), 420);
  updateHud('coins'); toast(`Du byggde ${v.namn.toLowerCase()} för ${v.kostnad} stjärnstoft!`);
  const lines = v.forlorare ? [{ p: v.forlorarePerson ?? null, t: v.forlorare }] : [];
  startDialog([...lines, { p: v.person, t: v.tack }, { p: v.person, t: v.gavaHej }], () => [
    ...giftButtons(p, v),
    { label: berattelse.dialog.gavaSenare, alt: true, run: toNode },
  ]);
}
// Each person thanks him for the building with a gift (one of one, or one of two), once. Torvald and Hulda also trade for a fish.
function giftButtons(p, v){
  return v.gava.map(id => {
    const it = SAKER[id];
    return { label: v.gava.length === 1 ? `${esc(berattelse.dialog.gavaTa.replace('{namn}', it.namn.toLowerCase()))}<small>${esc(it.text)}</small>` : `${esc(it.namn)}<small>${esc(it.text)}</small>`, run: () => takeGift(p, id) };
  });
}
function startShop(p, seen){
  const v = valOf(p), had = S.handlat[p.id];
  startDialog([{ p: v.person, t: had ? berattelse.dialog.gavaTagen : v.gavaHej }], () => [
    ...(had ? [] : giftButtons(p, v)),
    ...(v.byte ? [{ label: `${esc(v.byte.knapp)}${S.bytt[p.id] ? '<small>Redan bytt.</small>' : ''}`, disabled: !!S.bytt[p.id], run: () => tradeFish(p, v) }] : []),
    { label: 'Tillbaka till kartan', alt: true, run: toNode },
  ], seen);
}
// Torvald and Hulda take one catch from his fish book and give a bait for it, once
function tradeFish(p, v){
  const T = v.byte, back = [{ label: 'Tillbaka', alt: true, run: () => startShop(p, true) }];
  if (S.bytt[p.id]) return startShop(p, true);
  if (!(S.fiskbok[T.vill] > 0)) return startDialog([{ p: v.person, t: T.saknas }], () => back);
  S.fiskbok[T.vill]--; S.bytt[p.id] = true;
  if (!S.saker.includes(T.ger)) S.saker.push(T.ger);
  renderFishBook(); renderPack(); saveSoon();
  toast(`${SAKER[T.ger].namn} lades i väskan.`);
  startDialog([{ p: v.person, t: T.tack }], () => back);
}
function takeGift(p, id){
  const v = valOf(p), it = SAKER[id];
  if (S.handlat[p.id] || !v.gava.includes(id)) return;
  S.handlat[p.id] = id; if (!S.saker.includes(id)) S.saker.push(id);
  if (v.extra && !S.saker.includes(v.extra)){ S.saker.push(v.extra); toast(`${PERS[v.person].namn} gav dig också ${SAKER[v.extra].namn.toLowerCase()}!`); }
  saveSoon(); renderPack();
  const after = () => v.byte ? startShop(p, true) : toNode();
  if (it.djur){ if (S.djur.includes(it.djur)) return after(); giveAnimal(it.djur, it.text, after); return; }
  toast(`Du fick ${it.namn.toLowerCase()}!`);
  after();
}

/* ---------- djurboken ---------- */
// An animal that has been found goes into the book. Up to three are put forward and follow him on the map.
// The name he has given an animal, or its own name until then (berattelse.json djur)
const djurNamn = id => (S.namn && S.namn[id]) || berattelse.djur[id].namn;
function giveAnimal(id, story, done){
  if (S.djur.includes(id)) return;
  S.djur.push(id);
  const D = berattelse.djur[id], fram = S.fram.length < MAX_FRAM;
  if (fram){ S.fram.push(id); petState.delete(id); }
  sparkle(boy.x + 8, boy.y + 2, 22);
  renderBook(); saveSoon();
  nameModal(id, story || D.hur, done, `${D.art} skrevs in i djurboken${fram ? ' och följer nu med dig' : ''}.`);
}
// The box where he names a new animal: its picture, the story of how he found it and a field for the name
function nameModal(id, story, done, reward){
  const D = berattelse.djur[id];
  openModal([{ icon: iconURL(PETS[id].right[0], 8), title: D.art, text: `${story}\n\n${D.text}`, reward, input: djurNamn(id), button: 'Klar',
    onInput: value => { S.namn[id] = value; if (value === D.namn) delete S.namn[id]; renderBook(); saveSoon(); } }], done);
}
const bookIcons = {};
const bookIcon = id => bookIcons[id] || (bookIcons[id] = iconURL(PETS[id].right[0], 3));
function renderBook(){
  const D = berattelse.dialog.djurbok;
  $('#bookCount').textContent = S.djur.length ? `Du har hittat ${S.djur.length} djur. ${S.fram.length} av ${MAX_FRAM} är framme.` : D.tom;
  $('#book').innerHTML = S.djur.map(id => {
    const d = berattelse.djur[id], out = S.fram.includes(id);
    const btn = `<button class="btn${out ? '' : ' alt'}" type="button" data-fram="${id}">${out ? esc(D.laggUndan) : esc(D.haFramme)}</button>`;
    return `<li class="${out ? 'fram' : ''}"><img class="pix" src="${bookIcon(id)}" alt=""><div><b>${esc(djurNamn(id))}</b> <span class="st">${esc(d.art)}</span><small>${esc(d.text)} ${esc(d.hur)}</small>${btn} <button class="btn alt" type="button" data-doep="${id}">Döp om</button></div></li>`;
  }).join('');
}
$('#book').addEventListener('click', ev => {
  const dop = ev.target.closest('button[data-doep]');
  if (dop){ nameModal(dop.dataset.doep, berattelse.djur[dop.dataset.doep].hur, null, ''); return; }
  const b = ev.target.closest('button[data-fram]'); if (!b) return;
  const id = b.dataset.fram, i = S.fram.indexOf(id);
  if (i >= 0) S.fram.splice(i, 1);
  else if (S.fram.length >= MAX_FRAM){ toast(berattelse.dialog.djurbok.max); return; }
  else { S.fram.push(id); petState.delete(id); sparkle(boy.x + 8, boy.y + 2, 12); }
  renderBook(); saveSoon();
});

/* ---------- drottningens brev och räkningen i slottet ---------- */
const INTRO_KEY = 'stjarnkartan:intro';
// The letter is shown once: remembered in the browser and in the saved game, so it is not shown again on a new device
let introOpen = false;
const introSeen = () => { if (S.intro) return true; try { return localStorage.getItem(INTRO_KEY) === '1'; } catch (e) { return false; } };
const markIntro = () => { S.intro = true; saveSoon(); try { if (!TEST) localStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* the saved game remembers it */ } };
function showIntro(){
  const D = berattelse.dialog;
  introOpen = true;
  startDialog(D.intro.map(l => ({ p: l.p, t: l.t })), () => [{ label: D.introKnapp, run: () => { introOpen = false; markIntro(); toNode(); } }]);
}
// At the castle the queen counts the animals in the book and says something that fits
function startCount(){
  const D = berattelse.dialog, n = S.djur.length;
  const row = [...D.slott].reverse().find(r => n >= r.antal);
  startDialog([{ p: 'drottningen', t: D.slottHej }, { p: 'drottningen', t: row.t.replace('{n}', n) }], () => [
    { label: 'Tillbaka till kartan', alt: true, run: toNode },
  ]);
}

function renderPack(){
  const own = S.saker.filter(id => SAKER[id] && SAKER[id].typ !== 'djur' && !S.agnAnvant.includes(id)); // used baits are gone
  $('#pack').innerHTML = own.length
    ? own.map(id => { const it = SAKER[id], on = it.typ === 'klader' && S.pa[it.plats] === id;
        // Things that can be used are tapped like the runes in the list: clothes go on and off, the lantern is lit, the flute plays
        const usable = it.typ === 'klader' || id === 'lykta' || id === 'flojt';
        const lit = id === 'lykta' && S.lyktaTand;
        const title = it.typ === 'klader' ? (on ? 'Ta av' : 'Ta på') : id === 'lykta' ? (lit ? 'Släck lyktan' : 'Tänd lyktan') : id === 'flojt' ? 'Spela' : '';
        const state = on ? 'på' : lit ? 'tänd' : '';
        return `<li${usable ? ` class="readable" data-use="${id}" role="button" tabindex="0" title="${title}"` : ''}><span><b>${esc(it.namn)}</b> ${esc(it.text)}</span>${state ? `<span class="st">${state}</span>` : ''}</li>`; }).join('')
    : '<li><span>Inget ännu. Bygg något och få en gåva!</span></li>';
}

/* ---------- HUD, toast, logg ---------- */
function updateHud(which){
  $('#starCount').textContent = S.stars; $('#coinCount').textContent = S.coins;
  if (which){ const el = which === 'stars' ? $('#chipStars') : $('#coinCount').parentElement; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}
let toastTimer = 0;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200); }
function hideHint(){ $('#hint').hidden = true; }
// One line per rune or scroll, the newest first
const placeName = id => (id && NODES[id] ? NODES[id].name : '');
function renderLog(fresh){
  $('#log').innerHTML = S.log.length ? S.log.slice().reverse().map((e, i) => {
    const where = placeName(e.plats);
    const left = e.typ === 'runa'
      ? `<img class="pix" src="${RUNE_URL}" alt=""><span><b>${esc(e.amne || 'Runa')}</b> ${[where ? 'vid ' + esc(where) : '', e.procent != null ? e.procent + ' %' : ''].filter(Boolean).join(', ')}</span>`
      : `<img class="pix" src="${SCROLL_URL}" alt=""><span><b>${esc(e.amne || 'Pergamentrulle')}</b> ${where ? 'vid ' + esc(where) + ', ' : ''}${e.ratt} av ${e.av} rätt</span>`;
    // the stars are the same pixel star as up in the corner, with a number, like the stardust on the scrolls
    const right = e.typ === 'runa' ? `<img class="pix" src="${STAR_URL}" alt="">${e.stjarnor + (e.bonus || 0)}<span class="sr"> stjärnor</span>` : `<img class="pix" src="${DUST_URL}" alt="">${e.stoft}`;
    const n = S.log.length - 1 - i;
    return `<li class="${fresh && i === 0 ? 'new' : ''}${e.text ? ' readable' : ''}"${e.text ? ` data-las="${n}" role="button" tabindex="0" title="Läs historien"` : ''}>${left}<span class="st">${right}</span></li>`;
  }).join('') : '<li><span>Inga runor eller rullar ännu.</span></li>';
}
const starsFor = pct => berattelse.regler.stjarnor.find(r => pct >= r.minProcent).antal;
// The real events: stars from the runes (with a bonus when a subject goes better than last time) and stardust from the scrolls
function applyReal(events){
  let stars = 0, stoft = 0;
  const handelser = events.map((e, i) => {
    if (e.typ === 'rulle'){ stoft += e.stoft; return e; }
    const prev = events.slice(0, i).reverse().find(x => x.typ === 'runa' && x.amne === e.amne && x.procent != null);
    const st = e.stjarnor ?? starsFor(e.procent);
    const bonus = e.procent != null && prev && e.procent > prev.procent ? 1 : 0;
    stars += st + bonus;
    return { ...e, stjarnor: st, bonus, biljett: e.guldbiljett === true || (e.procent != null && e.procent > 90) };
  });
  REAL = { stars, stoft, handelser };
  restart();
  const seen = seenEvents();
  newsQueue = handelser.filter(e => !seen.includes(e.id));
  // restart() closes any dialog, so the letter (first time) or the news is shown again from the start
  if (!introSeen()) showIntro(); else if (newsQueue.length) showNews();
}
/* ---------- sparning ---------- */
// His game is saved as spel.json in the private repo Real-MrBeam/stjarnkartan-data through GitHub's API. The key arrives
// encrypted in the page (#lasNyckel) and opens with the password, like the portraits. Without the key nothing is saved.
// Stars and stardust are never saved: they are counted from the runes and scrolls. Only what he has spent is saved.
const SAVE = { repo: '', file: '', key: '', sha: null, timer: 0, off: false, loaded: false };
const SAVED_FIELDS = ['node', 'built', 'valda', 'saker', 'steg', 'handlat', 'djur', 'fram', 'stopp', 'hittat', 'spent', 'kistor', 'agnAnvant', 'fiskbok', 'namn', 'bytt', 'intro', 'natt', 'salt', 'lasta', 'pa', 'lyktaTand', 'brev2'];
const b64 = text => { const bytes = new TextEncoder().encode(text); let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const unb64 = data => new TextDecoder().decode(Uint8Array.from(atob(data.replace(/\s/g, '')), c => c.charCodeAt(0)));
function spend(n){ S.coins -= n; S.spent += n; }
// Stardust he earns (selling to the night fisherman) is saved as negative spending, since the rest is counted from the scrolls
function earn(n){ spend(-n); updateHud('coins'); }
function gh(method, body){
  return fetch(`https://api.github.com/repos/${SAVE.repo}/contents/${SAVE.file}`, { method, cache: 'no-store', keepalive: method === 'PUT',
    headers: { Authorization: `Bearer ${SAVE.key}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: body && JSON.stringify(body) });
}
// Debug mode (?debug in the address): the debug buttons show, and nothing is loaded from or saved to his game, so Peter can
// try things out without touching the saved game. The browser's own memory (news, letter) is not touched either.
const TEST = new URLSearchParams(location.search).has('debug');
async function loadSave(){
  if (TEST){ SAVE.off = true; return; }
  const el = document.getElementById('lasNyckel');
  if (!el || !el.classList.contains('unlocked') || SAVE.key) return;
  SAVE.repo = el.dataset.repo; SAVE.file = el.dataset.fil; SAVE.key = el.textContent.trim();
  try {
    const res = await gh('GET');
    if (res.status === 404){ SAVE.loaded = true; return; }
    if (!res.ok) throw new Error('GitHub ' + res.status);
    const file = await res.json();
    SAVE.sha = file.sha;
    const data = JSON.parse(unb64(file.content)); data.intro = true;
    applySaved(data);
    SAVE.loaded = true;
  } catch (err){
    console.error(err); SAVE.off = true;
    toast('Det gick inte att hämta det sparade spelet. Inget sparas förrän sidan laddas om.');
  }
}
function applySaved(data){
  const shownHere = S.lasta || [];
  for (const k of SAVED_FIELDS) if (data[k] !== undefined) S[k] = data[k];
  if (!S.pa) S.pa = {};
  buildBoy(S.pa); musicSync(); renderLetters();
  S.lasta = [...new Set([...(S.lasta || []), ...shownHere])];   // stories shown before the saved game had loaded stay seen
  if (typeof data.sett === 'string') S.sett = Uint8Array.from(atob(data.sett), c => c.charCodeAt(0));
  S.coins = (REAL ? REAL.stoft : startData.stjarnstoft) - S.spent;
  boy.route = null; placeBoy(S.node); plotAnim.clear(); petState.clear();
  lastRevealKey = ''; maskDirty = true; buildTerrain();
  cam.follow = true; centerOn(boy.x + 8, boy.y + 8, true);
  updateHud(); renderLog(); renderPack(); renderBook(); renderTickets(); renderFishBook();
  if (S.intro && introOpen){ introOpen = false; markIntro(); toNode(); }
  else if (!dlg) showNode();
}
function snapshot(){
  const data = { version: 1, sparad: new Date().toISOString() };
  for (const k of SAVED_FIELDS) data[k] = S[k];
  let s = ''; for (const b of S.sett) s += String.fromCharCode(b);
  data.sett = btoa(s);
  return data;
}
// Saves a moment after a change. If the file was changed elsewhere (another device), the newest version is overwritten.
function saveSoon(){
  if (!SAVE.key || !SAVE.loaded || SAVE.off) return;
  clearTimeout(SAVE.timer);
  SAVE.timer = setTimeout(saveNow, 1500);
}
async function saveNow(retry){
  clearTimeout(SAVE.timer); SAVE.timer = 0;
  if (!SAVE.key || !SAVE.loaded || SAVE.off) return;
  try {
    const res = await gh('PUT', { message: 'Sparat spel', content: b64(JSON.stringify(snapshot())), ...(SAVE.sha ? { sha: SAVE.sha } : {}) });
    if ((res.status === 409 || res.status === 422) && !retry){
      const cur = await gh('GET'); if (cur.ok) SAVE.sha = (await cur.json()).sha;
      return saveNow(true);
    }
    if (!res.ok) throw new Error('GitHub ' + res.status);
    SAVE.sha = (await res.json()).content.sha;
  } catch (err){ console.error(err); toast('Spelet kunde inte sparas just nu. Det försöker igen vid nästa ändring.'); }
}
addEventListener('pagehide', () => { if (SAVE.timer) saveNow(); });
// The example buttons under Debug change the game, so they stop the saving until the page is loaded again
function stopSaving(){ if (SAVE.key && !SAVE.off){ SAVE.off = true; toast('Sparningen är av tills sidan laddas om, eftersom du provar med påhittade värden.'); } }

// News: a rune or scroll he has not seen on this device is told as a short story the first time
const NEWS_KEY = 'glimmerdal:handelser';
let newsQueue = [];
// Seen events are remembered in the browser and in the saved game (S.lasta), so they are not told again on every start
const seenEvents = () => { let local = []; try { local = JSON.parse(localStorage.getItem(NEWS_KEY) || '[]'); } catch (e) { /* only the saved game */ } return [...new Set([...local, ...(S.lasta || [])])]; };
function markSeen(ids){
  const all = [...new Set([...seenEvents(), ...ids])];
  S.lasta = all; saveSoon();
  try { if (!TEST) localStorage.setItem(NEWS_KEY, JSON.stringify(all)); } catch (e) { /* the saved game remembers it */ }
}
// The text of a rune or scroll: the title, the story and what it gave. Used for the news and when he taps a line in the list.
function eventSteps(e, last){
  const rune = e.typ === 'runa', where = placeName(e.plats);
  const title = rune ? (e.amne ? `Runa: ${e.amne}` : 'Du hittade en runa') : e.amne ? `Pergamentrulle: ${e.amne}` : 'Du hittade en pergamentrulle';
  const reward = rune
    ? `Runan gav ${e.stjarnor} ${e.stjarnor === 1 ? 'stjärna' : 'stjärnor'}${e.bonus ? ', och en extra för att du tolkade bättre än förra gången' : ''}.`
    : `Rullen gav ${e.stoft} stjärnstoft.`;
  return [
    { icon: rune ? RUNE_BIG : SCROLL_BIG, title, text: where ? `Den låg vid ${where}.` : '', button: rune ? 'Tolka runan' : 'Öppna rullen' },
    { icon: rune ? RUNE_BIG : SCROLL_BIG, title, text: e.text, reward, button: last ? 'Till kartan' : 'Nästa' },
  ];
}
function showNews(){
  const list = newsQueue; newsQueue = [];
  // marked as seen as soon as they are shown, so they never come back even if he closes the page halfway
  markSeen(list.map(e => e.id));
  const steps = list.flatMap((e, i) => eventSteps(e, i === list.length - 1));
  openModal(steps, () => { updateHud('stars'); renderTickets(); });
}
// A box over the map with a picture, a title, a text and one button, step by step
// If the field is left empty the name stays as it was
const berattelseNamn = s => s.input;
function openModal(steps, done){
  let i = 0;
  const show = () => {
    const s = steps[i];
    $('#modalIcon').src = s.icon; $('#modalTitle').textContent = s.title; $('#modalText').textContent = s.text;
    $('#modalReward').textContent = s.reward || ''; $('#modalReward').hidden = !s.reward;
    $('#modalBtn').textContent = s.button; $('#modal').hidden = false;
    const field = $('#modalName'); field.hidden = s.input === undefined; field.value = s.input ?? '';
    (s.input === undefined ? $('#modalBtn') : field).focus();
  };
  $('#modalName').onkeydown = e => { if (e.key === 'Enter') $('#modalBtn').click(); };
  $('#modalBtn').onclick = () => { const s = steps[i]; if (s.input !== undefined && s.onInput) s.onInput($('#modalName').value.trim().slice(0, 16) || berattelseNamn(s)); i++; if (i < steps.length) show(); else { $('#modal').hidden = true; done && done(); } };
  show();
}

/* ---------- fiske ---------- */
// At a fishing place he picks a tool (the rod he always has, or a tool he has bought) and a bait he has not used yet,
// casts, and pulls when the float dips. Too early or too late: the fish gets away but the bait stays. A catch uses up the
// bait (each kind of bait only once). A water animal bites at its own place with one of its tools and one of its baits,
// otherwise it is an ordinary fish for the fish book.
const FISKE = berattelse.fiske;
let fishing = null; // { plats, redskap, agn, phase: 'val' | 'vanta' | 'nu', timers }
const myTools = () => ['metspo', ...FISKE.redskap].filter(id => S.saker.includes(id));
const myBaits = () => S.saker.filter(id => SAKER[id] && SAKER[id].typ === 'agn' && !S.agnAnvant.includes(id));
function fishBlock(id){
  const T = FISKE.texter, here = S.node === id && !boy.route;
  if (!myTools().length) return `<div class="plot"><div><b>${esc(T.rubrik)}</b><span>${esc(T.ingetSpo)}</span></div></div>`;
  return `<div class="plot"><div><b>${esc(T.rubrik)}</b></div>${here ? `<button class="btn" type="button" data-fiska="${id}">${esc(T.knapp)}</button>` : ''}</div>`;
}
// A fisherman on a bridge lends a tool for a fish of a kind he has caught there
function lanBlock(id){
  const L = FISKE.platser[id].lan, here = S.node === id && !boy.route, got = S.saker.includes(L.ger);
  return `<div class="plot"><div><b>${esc(L.rubrik)}</b>${got ? `<span>${esc(L.klar)}</span>` : ''}</div>${here && !got ? `<button class="btn" type="button" data-lan="${id}">${esc(L.knapp)}</button>` : ''}</div>`;
}
function talkFisher(id){
  const L = FISKE.platser[id].lan;
  if (S.saker.includes(L.ger)) return;
  if (!(S.fiskbok[L.vill] > 0)) return openModal([{ icon: FISH_BIG, title: L.rubrik, text: L.saknas, button: 'Till kartan' }], () => showNode());
  S.fiskbok[L.vill]--; S.saker.push(L.ger);
  renderFishBook(); renderPack(); saveSoon();
  openModal([{ icon: FISH_BIG, title: L.rubrik, text: L.tack, reward: `${SAKER[L.ger].namn} lades i väskan.`, button: 'Till kartan' }], () => showNode());
}
function startFishing(id){
  fishing = { plats: id, redskap: myTools()[0], agn: '', phase: 'val', timers: [] };
  renderFishing();
}
function stopFishing(){ if (fishing) fishing.timers.forEach(clearTimeout); fishing = null; }
function renderFishing(){
  const T = FISKE.texter, fz = fishing, n = NODES[fz.plats];
  current = { type: 'fish' };
  clearInterval(typeTimer); clearInterval(blinkTimer);
  let h = `<span class="tag">Fiske</span><h2>${esc(n.name)}</h2>`;
  if (fz.phase === 'val'){
    const tool = (id, name) => `<button class="btn${fz.redskap === id ? '' : ' alt'}" type="button" data-redskap="${id}">${esc(name)}</button>`;
    const bait = (id, name) => `<button class="btn${fz.agn === id ? '' : ' alt'}" type="button" data-agn="${id}">${esc(name)}</button>`;
    h += `<p>${esc(T.valj)}</p><div class="panel-body">
      <div><p class="sub">Redskap</p><div class="roads">${myTools().map(id => tool(id, SAKER[id].namn)).join('')}</div></div>
      <div><p class="sub">Agn</p><div class="roads">${bait('', T.utanAgn)}${myBaits().map(id => bait(id, SAKER[id].namn)).join('')}</div></div>
      <div class="roads"><button class="btn" type="button" data-kasta="1">${esc(T.kasta)}</button><button class="btn alt" type="button" data-back="1">${esc(T.tillbaka)}</button></div></div>`;
  } else if (fz.phase === 'vanta' || fz.phase === 'nu'){
    h += `<p aria-live="polite">${esc(fz.phase === 'nu' ? T.nu : T.vanta)}</p><div class="panel-body">
      <div class="pond${fz.phase === 'nu' ? ' dip' : ''}">${fz.phase === 'nu' ? `<img class="splash pix" src="${iconURL(SPLASH, 3)}" alt="">` : `<img class="float pix" src="${iconURL(FLOAT, 3)}" alt="">`}</div>
      <div class="roads"><button class="btn" type="button" data-dra="1">${esc(T.dra)}</button></div></div>`;
  } else {
    h += `<p>${esc(fz.miss)}</p><div class="panel-body"><div class="roads"><button class="btn" type="button" data-igen="1">${esc(T.igen)}</button><button class="btn alt" type="button" data-back="1">${esc(T.tillbaka)}</button></div></div>`;
  }
  panel.innerHTML = h;
}
function cast(){
  const fz = fishing; fz.phase = 'vanta'; renderFishing();
  const wait = 1500 + Math.random() * 2500;
  fz.timers.push(setTimeout(() => { fz.phase = 'nu'; renderFishing(); }, wait));
  fz.timers.push(setTimeout(() => { if (fz.phase === 'nu') miss(FISKE.texter.sent); }, wait + 1100));
}
function miss(text){ const fz = fishing; fz.timers.forEach(clearTimeout); fz.timers = []; fz.phase = 'miss'; fz.miss = text; renderFishing(); }
// What the water says when a bait is offered at a wrong place or with a wrong tool (only for animals he has not found yet)
function missText(fz){
  const T = FISKE.texter, open = FISKE.djur.filter(r => !S.djur.includes(r.djur));
  const baitOk = open.filter(r => r.agn.includes(fz.agn));
  if (baitOk.some(r => r.plats === fz.plats && !r.redskap.includes(fz.redskap))) return T.agnFelRedskap;
  if (baitOk.length) return T.agnFelPlats;
  if (open.some(r => r.plats === fz.plats)) return T.platsFelAgn;
  return T.ingetNapp;
}
function pull(){
  const fz = fishing;
  if (fz.phase !== 'nu') return miss(FISKE.texter.tidigt);
  fz.timers.forEach(clearTimeout); fz.timers = [];
  const rule = FISKE.djur.find(r => r.plats === fz.plats && r.redskap.includes(fz.redskap) && r.agn.includes(fz.agn) && !S.djur.includes(r.djur));
  // A bait is only used up when a water animal bites. With the wrong place or tool nothing takes it, and he keeps it.
  if (fz.agn && !rule) return miss(missText(fz));
  if (fz.agn){ S.agnAnvant.push(fz.agn); renderPack(); }
  sparkle(boy.x + 8, boy.y + 2, 20, '#2ce8f5');
  let step;
  if (rule){
    stopFishing(); giveAnimal(rule.djur, rule.text, () => showNode());
    return saveSoon();
  } else {
    const finds = (FISKE.fynd || []).filter(id => !S.saker.includes(id) && !S.salt['fynd:' + id]);
    if (finds.length && Math.random() < .2){
      const id = finds[Math.floor(Math.random() * finds.length)]; S.saker.push(id); renderPack(); saveSoon(); stopFishing();
      return openModal([{ icon: FISH_BIG, title: SAKER[id].namn, text: `${FISKE.texter.fynd} ${SAKER[id].text}`, reward: SAKER[id].typ === 'klader' ? 'Lades i väskan. Du kan ta på den där.' : 'Lades i väskan.', button: 'Till kartan' }], () => showNode());
    }
    const list = FISKE.platser[fz.plats].fiskar, fresh = list.filter(id => S.fiskbok[id] === undefined);
    const pool = fresh.length && Math.random() < .6 ? fresh : list, id = pool[Math.floor(Math.random() * pool.length)];
    const isNew = S.fiskbok[id] === undefined; S.fiskbok[id] = (S.fiskbok[id] || 0) + 1; renderFishBook();
    const fish = FISKE.fiskar[id];
    step = { icon: catchIcon(id), title: fish.namn, text: fish.text, reward: isNew ? 'Ny i fiskboken.' : `Du har fått ${S.fiskbok[id]} sådana nu.`, button: 'Till kartan' };
  }
  saveSoon();
  stopFishing();
  openModal([step], () => showNode());
}
function renderFishBook(){
  const ids = Object.keys(FISKE.fiskar).filter(id => S.fiskbok[id] !== undefined);
  $('#fishbook').innerHTML = ids.length
    ? ids.map(id => `<li><span><b>${esc(FISKE.fiskar[id].namn)}</b> ${esc(FISKE.fiskar[id].text)}</span><span class="st">${S.fiskbok[id] ? S.fiskbok[id] + ' st' : 'inga kvar'}</span></li>`).join('')
    : '<li><span>Inga fiskar ännu.</span></li>';
}

/* ---------- locka fram djur ---------- */
// Some animals come out at a place if he offers them something (berattelse.locka). The offer is used up like a bait.
const LOCKA = berattelse.locka || [];
function lureBlock(r){
  if (S.djur.includes(r.djur)) return '';
  const here = S.node === r.plats && !boy.route, has = r.agn.some(id => myBaits().includes(id));
  return `<div class="plot"><div><b>${esc(r.rubrik)}</b>${has ? '' : `<span>${esc(r.saknas)}</span>`}</div>${here && has ? `<button class="btn" type="button" data-locka="${r.djur}">${esc(r.knapp)}</button>` : ''}</div>`;
}
function lure(djurId){
  const r = LOCKA.find(x => x.djur === djurId), bait = r && r.agn.find(id => myBaits().includes(id));
  if (!bait || S.djur.includes(djurId)) return;
  S.agnAnvant.push(bait); renderPack();
  giveAnimal(djurId, r.text, () => showNode());
}

/* ---------- guldbiljetter ---------- */
// A rune read to more than 90 % gives a golden ticket. It lies in a golden chest at the school until he opens it there.
// The tickets are swapped for something real; Peter says when one has been used (biljettAnvand in handelser.json).
const CHEST_AT = { x: 15, y: 23, node: 'skola' };
let chestOpening = 0, chestGlitter = 0;
const allTickets = () => S.log.filter(e => e.typ === 'runa' && e.biljett);
const pendingTickets = () => allTickets().filter(e => !S.kistor.includes(e.id));
function openChest(){
  const t = pendingTickets()[0]; if (!t || chestOpening) return;
  chestOpening = performance.now();
  setTimeout(() => sparkle(CHEST_AT.x*TS + 8, CHEST_AT.y*TS + 4, 34), 650);
  setTimeout(() => {
    S.kistor.push(t.id); chestOpening = 0; saveSoon(); renderTickets();
    openModal([{ icon: TICKET_BIG, title: 'En guldbiljett', text: `Kistan var full av guldglitter, och överst låg en guldbiljett från runan i ${t.amne}. Den kan växlas mot något riktigt hos mamma eller pappa.`, button: 'Ta biljetten' }],
      () => { if (current && current.type === 'node') showNode(); });
  }, 1100);
}
function renderTickets(){
  const mine = allTickets().filter(e => S.kistor.includes(e.id)), waiting = pendingTickets().length;
  $('#tickets').innerHTML = (waiting ? `<li><span><b>En guldkista väntar vid Skolan.</b></span></li>` : '')
    + mine.map(e => `<li><img class="pix" src="${TICKET_URL}" alt=""><span><b>Guldbiljett</b> runan i ${esc(e.amne)}</span><span class="st">${e.biljettAnvand ? 'Använd' : 'Oanvänd'}</span></li>`).join('')
    + (!waiting && !mine.length ? '<li><span>Inga guldbiljetter än. En runa som tolkas till över 90 % ger en.</span></li>' : '');
}

// Made-up runes and scrolls for trying things out (the buttons under Debug)
function addTest(){
  stopSaving();
  const t = SAMPLE_TESTS[S.testIdx % SAMPLE_TESTS.length]; S.testIdx++;
  const procent = Math.round(t.p / t.max * 100);
  const prev = [...S.log].reverse().find(r => r.typ === 'runa' && r.amne === t.subj && r.procent != null);
  const st = starsFor(procent);
  const bonus = prev && procent > prev.procent ? 1 : 0;
  const before = S.stars;
  S.log.push({ typ: 'runa', id: 'prov-' + S.testIdx, amne: t.subj, procent, stjarnor: st, bonus, biljett: procent > 90 });
  S.stars += st + bonus;
  updateHud('stars'); renderLog(true); renderTickets();
  const opened = GATES.filter(g => before < g.req && S.stars >= g.req);
  let msg = `Runa i ${t.subj}: ${procent} % tolkat ger ${st + bonus} ${st + bonus === 1 ? 'stjärna' : 'stjärnor'}${bonus ? ', med bonus för förbättring' : ''}.`;
  if (opened.length){
    const now = performance.now();
    opened.forEach((g, i) => { gateAnim.set(g, now + i * 300); setTimeout(() => sparkle(g.x*TS + 8, g.y*TS + 4, 26), 600 + i * 300); });
    focusGate(opened[0]); cam.focus.until = performance.now() + 2600;
    msg += ` En port öppnades!`;
    showMap();
    hideHint();
  }
  toast(msg);
  renderPanel(current && (current.type === 'gate' || current.type === 'dialog') ? current : (boy.route ? current : { type: 'node', id: S.node }));
}
function addSheet(){
  stopSaving();
  const mb = berattelse.exempel.mattebladRatt; const right = mb.min + Math.floor(Math.random() * (mb.max - mb.min + 1));
  S.coins += right; S.log.push({ typ: 'rulle', ratt: right, av: mb.max, stoft: right }); updateHud('coins'); renderLog(true);
  toast(`Pergamentrulle: ${right} rätt ger ${right} stjärnstoft.`);
  if (current && current.type !== 'walk') renderPanel(current);
}
$('#btnTest').addEventListener('click', addTest);
$('#btnSheet').addEventListener('click', addSheet);
// The debug buttons only show with ?debug in the address (Peter 2026-10-20), so the real map has no test buttons
$('#debugToggle').hidden = !new URLSearchParams(location.search).has('debug');
// Debug: give things. "Ge sak" lists every thing he has not got, a tap gives it. Animals are put straight in the book.
function debugGive(id){
  const it = SAKER[id]; if (!it) return;
  if (it.typ === 'djur'){ if (!S.djur.includes(it.djur)){ S.djur.push(it.djur); if (S.fram.length < MAX_FRAM) S.fram.push(it.djur); } }
  else if (!S.saker.includes(id)) S.saker.push(id);
  if (S.agnAnvant.includes(id)) S.agnAnvant = S.agnAnvant.filter(x => x !== id);
}
function showGive(){
  current = { type: 'give' };
  const left = Object.keys(SAKER).filter(id => SAKER[id].typ === 'djur' ? !S.djur.includes(SAKER[id].djur) : !S.saker.includes(id) || S.agnAnvant.includes(id));
  panel.innerHTML = `<span class="tag">Debug</span><h2>Ge sak</h2><div class="panel-body"><div class="roads">${left.map(id => `<button class="btn alt" type="button" data-ge="${id}">${esc(SAKER[id].namn)}</button>`).join('') || '<p>Du har allt.</p>'}<button class="btn" type="button" data-back="1">Tillbaka</button></div></div>`;
}
panel.addEventListener('click', ev => { const b = ev.target.closest('button[data-ge]'); if (!b) return; debugGive(b.dataset.ge); renderPack(); renderBook(); toast(`${SAKER[b.dataset.ge].namn} lades till.`); showGive(); });
$('#btnGe').addEventListener('click', showGive);
$('#btnGeAlla').addEventListener('click', () => { for (const id in SAKER) if (SAKER[id].typ !== 'djur') debugGive(id); renderPack(); toast('Alla saker lades i väskan.'); });
$('#btnGeDjur').addEventListener('click', () => { for (const id in SAKER) if (SAKER[id].typ === 'djur') debugGive(id); for (const id in berattelse.djur) if (!S.djur.includes(id)) S.djur.push(id); renderBook(); toast('Alla djur skrevs in i djurboken.'); });
// Debug: which song is playing
if (new URLSearchParams(location.search).has('debug')) setInterval(() => { $('#debugLat').textContent = window.Musik && Musik.spelar ? `Spelar: ${Musik.lat}` : 'Musiken är av'; }, 500);
// Debug: switch day and night at once, without sleeping in Hemmet
const nattLabel = () => { $('#btnNatt').textContent = S.natt ? 'Dag' : 'Natt'; };
$('#btnNatt').addEventListener('click', () => { S.natt = !S.natt; musicSync(); showNode(); nattLabel(); });
const DEBUG_LABEL = ['Debug: av', 'Debug: bygg A, ingen dimma', 'Debug: bygg B, ingen dimma', 'Debug: tomma tomter, ingen dimma'];
$('#btnDebug').addEventListener('click', () => {
  DEBUG.mode = (DEBUG.mode + 1) % DEBUG_LABEL.length;
  buildTerrain();
  $('#btnDebug').textContent = DEBUG_LABEL[DEBUG.mode];
  $('#debugBtns').hidden = DEBUG.mode === 0;
  if (current && current.type !== 'walk' && current.type !== 'dialog') renderPanel(current);
});
// The letters in the collection: the queen's, and Stjärnväktarnas once he has picked it up. Tapped like the runes.
const ENVELOPE = sprite(["oooooooooooo", "owwwwwwwwwwo", "oowwwwwwwwoo", "owowwwwwwowo", "owwowwwwowwo", "owwwoyyowwwo", "owwwwyywwwwo", "owwwwwwwwwwo", "oooooooooooo"], { o:'#3f2631', w:'#ead4aa', y:'#e43b44' });
function renderLetters(){
  const list = [{ id: 'drottningen', namn: 'Drottningens brev', text: 'Om djuren som gömmer sig i Glimmerdal.' }];
  if (S.brev2 && V) list.push({ id: 'stjarnvaktarna', namn: V.titel, text: 'Förseglat med en silverstjärna med ett öga.' });
  $('#letters').innerHTML = list.map(l => `<li class="readable" data-brev="${l.id}" role="button" tabindex="0" title="Läs brevet"><span><b>${esc(l.namn)}</b> ${esc(l.text)}</span></li>`).join('');
}
const openLetter = li => { if (!li) return; if (li.dataset.brev === 'drottningen') showIntro(); else readLetter2(); };
$('#letters').addEventListener('click', ev => openLetter(ev.target.closest('li[data-brev]')));
$('#letters').addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' '){ const li = ev.target.closest('li[data-brev]'); if (li){ ev.preventDefault(); openLetter(li); } } });
$('#btnReset').addEventListener('click', () => {
  stopSaving(); restart(); toast('Kartan är återställd.');
  try { localStorage.removeItem(INTRO_KEY); } catch (e) { /* nothing to clear */ }
  showIntro();
});
function restart(){
  S = START(); buildBoy(S.pa); boy.route = null; placeBoy(S.node); plotAnim.clear(); gateAnim.clear(); FX.length = 0; buildTerrain();
  lastRevealKey = ''; maskDirty = true; revealAround(boy.x + 8, boy.y + 8);
  cam.follow = true; cam.focus = null; centerOn(boy.x + 8, boy.y + 8, true);
  dlg = null; updateHud(); renderLog(); renderPack(); renderBook(); renderTickets(); renderFishBook(); renderLetters(); showNode();
}

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
  if (pendingTickets().length && tx === CHEST_AT.x && ty === CHEST_AT.y){ if (S.node === CHEST_AT.node && !boy.route) openChest(); else { walkTo(CHEST_AT.node); toast('Kistan står vid Skolan.'); } return; }
  for (const id in NODES){ const n = NODES[id]; if (nodeShown(id) && Math.abs(wx - (n.x*TS + 8)) < 13 && Math.abs(wy - (n.y*TS + 6)) < 14){ walkTo(id); return; } }
  for (const g of GATES){ if (gateShown(g) && tx === g.x && (ty === g.y || ty === g.y - 1)){ showGate(g); if (S.stars < g.req) toast(`Porten öppnas vid ${g.req} stjärnor. Du har ${S.stars}.`); return; } }
  for (const p of PLOTS){ if (seenAt(p.x + 1, p.y + 1) && tx >= p.x && tx <= p.x + 2 && ty >= p.y - 1 && ty <= p.y + 2){ goPlot(p); return; } }
}
addEventListener('keydown', e => { if (fishing && (fishing.phase === 'vanta' || fishing.phase === 'nu') && (e.key === ' ' || e.key === 'Enter')){ e.preventDefault(); pull(); } });
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
function start(data){
  if (data && data.S) S = data.S;
  placeBoy(S.node); lastRevealKey = ''; revealAround(boy.x + 8, boy.y + 8);
  STAR_URL = iconURL(STAR, 4); DUST_URL = iconURL(DUST, 4); LOCK_URL = iconURL(LOCK, 4); RUNE_URL = iconURL(RUNE, 4); SCROLL_URL = iconURL(SCROLL, 4);
  FISH_BIG = iconURL(FISH, 8); $('#icoFish').src = iconURL(FISH, 4); $('#icoLetter').src = iconURL(ENVELOPE, 3);
  TICKET_URL = iconURL(TICKET, 4); RUNE_BIG = iconURL(RUNE, 8); SCROLL_BIG = iconURL(SCROLL, 8); TICKET_BIG = iconURL(TICKET, 8); $('#icoTicket').src = TICKET_URL;
  $('#icoRunes').src = RUNE_URL; $('#icoBag').src = iconURL(BAG, 4); $('#icoBook').src = iconURL(BOOK, 4);
  $('#logoStar').src = STAR_URL; $('#icoStar').src = STAR_URL; $('#icoCoin').src = DUST_URL;
  document.querySelectorAll('img[data-ico]').forEach(im => { im.src = im.dataset.ico === 'star' ? STAR_URL : DUST_URL; });
  buildTerrain();
  resize(); centerOn(boy.x + 8, boy.y + 8, true);
  updateHud(); renderLog(); renderPack(); renderBook(); renderTickets(); renderFishBook(); showNode();
  musicButton(); musicSync(); renderLetters();
  loadPortraitImages();
  if (!introSeen()) showIntro();
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
Promise.all([tiles, ...Object.values(SETS)].map(im => im.decode().catch(() => {}))).then(() => start());
})().catch(err => {
  console.error(err);
  const h = document.getElementById('hint');
  if (h){ h.hidden = false; h.textContent = 'Kartan kunde inte laddas. Prova att ladda om sidan.'; }
});
