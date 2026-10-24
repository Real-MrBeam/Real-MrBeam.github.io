// Djuren i Glimmerdal (kartan i karta/, hette först Stjärnkartan): spelkoden. Data kommer från data/karta.json och data/berattelse.json, världen byggs av varld.js.
(async () => {
'use strict';
// The game reads two data files: geometry (karta.json) and names, texts and rules (berattelse.json).
const [karta, berattelse, PORTRAITS, PETDATA, BANOR] = await Promise.all(['data/karta.json', 'data/berattelse.json', 'data/portratt.json', 'data/djur.json', 'data/banor.json'].map(u =>
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
  seglarmossa: { rows: ["................", ".....oooooo.....", "....onnnnnno....", "...ovvvvvvvvo...", "...oNNNNNNNNNo.."], pal: { n: '#2a4a8a', N: '#1b2f5a', v: '#ffffff' } },
  nattmossa: { rows: ["...........uu...", "......ooooJJo...", ".....ojjjjjjjo..", "....oJJJJJJJJo..", "...oUUUUUUUUUo.."], pal: { J: '#3b5dc9', j: '#c0cbdc', u: '#ffffff', U: '#f4f4f4' } },
  mjolnarmossa: { rows: ["................", "....ooooooo.....", "...ommmmmmmo....", "...ommmmmmmmo...", "...oMMMMMMMMo..."], pal: { m: '#f4f4f4', M: '#c0cbdc' } },
};
const BOOTS = { stovel: { k: '#6b3a20' } };
// A cape on the back: seen behind the arms from the front, over the whole back from behind, flowing out behind from the side
const CAPES = { rodcape: { V: '#e43b44', W: '#a22633' } };
function addCape(rows, view){
  const set = (r, x, c) => r.slice(0, x) + c + r.slice(x + 1);
  return rows.map((r, y) => {
    if (view === 'up' && y >= 8 && y <= 12) return r.replace(/[dgGy]/g, (c, x) => (x === 4 || x === 11) ? 'W' : 'V');
    if (view === 'down' && y === 9){ r = set(r, 5, 'V'); return set(r, 10, 'V'); }          // the ties over the shoulders
    if (view === 'down' && y >= 12 && y <= 14){ r = set(r, 2, 'V'); r = set(r, 13, 'V'); r = set(r, 1, 'o'); return set(r, 14, 'o'); }   // the hem below the arms
    if (view === 'side' && y >= 9 && y <= 14){ r = set(r, 2, r[2] === '.' ? 'V' : r[2]); r = set(r, 1, 'V'); return set(r, 0, 'o'); }
    return r;
  });
}
let BOY = null;
function buildBoy(pa = {}){
  const hat = HATS[pa.huvud], cape = CAPES[pa.rygg], pal = { ...BOYPAL, ...(hat ? hat.pal : {}), ...(BOOTS[pa.fotter] || {}), ...(cape || {}) };
  const top = (rows, view) => { const r = hat ? [...hat.rows, ...rows.slice(5)] : rows; return cape ? addCape(r, view) : r; };
  BOY = {
    down: [FRONT.concat(LEGS_A), FRONT.concat(LEGS_B), FRONT.concat(LEGS_A), FRONT.concat(LEGS_C)].map(r => sprite(top(r, 'down'), pal)),
    up:   [BACK.concat(LEGS_A), BACK.concat(LEGS_B), BACK.concat(LEGS_A), BACK.concat(LEGS_C)].map(r => sprite(top(r, 'up'), pal)),
    right:[SIDE.concat(SIDE_A), SIDE.concat(SIDE_B)].map(r => sprite(top(r, 'side'), pal)),
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
const BUBBLES = sprite(["...oo.......", "..o..o...o..", "...oo...o.o.", ".........o..", "....o.......", "...o.o......", "....o......."], { o:'#ffffff' });
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
  mansik: markFish({ b:'#e6ecf5', B:'#9fb0c8', m:'#ffffff' }, (x, y) => y === 3 && x > 2 && x < 8 ? 'm' : ''),
  lysal: sprite(["................", ".ooooooooooo..o.", "owkgggGggggGooGo", "oggggggggggggggo", ".oooooooooooooo."], { o:'#3f2631', w:'#ffffff', k:'#262b44', g:'#7ad97a', G:'#c6f0a0' }),
  groda: sprite(["..oo....oo..", ".owko..owko.", ".oggooooggo.", "oggggggggggo", "oggllllllggo", "oggllllllggo", ".oggggggggo.", "ogo.oggo.ogo", "oo..oooo..oo"], { o:'#3f2631', w:'#ffffff', k:'#262b44', g:'#63c74d', l:'#c6e07a' }),
  // the nine new kinds (2026-10-21)
  ruda: markFish({ b:'#d9a441', B:'#a0702c', s:'#b8862f' }, (x, y) => (x + y) % 3 === 0 && y > 2 && y < 7 ? 's' : ''),
  stjarnruda: markFish({ b:'#f0d878', B:'#c09a40', y:'#ffffff' }, (x, y) => ({ '5,3': 'y', '4,4': 'y', '5,4': 'y', '6,4': 'y', '5,5': 'y' })[x + ',' + y] || ''),
  sutare: markFish({ b:'#5d7a32', B:'#3e5222', k:'#e43b44', g:'#c9b27d' }, (x, y) => y === 6 && x > 1 && x < 7 ? 'g' : ''),
  mort: markFish({ b:'#c0cbdc', B:'#d04848', k:'#e43b44', s:'#8b9bb4' }, (x, y) => y === 2 ? 's' : ''),
  sik: markFish({ b:'#dfe6ef', B:'#7f93ad', s:'#9fb4cc' }, (x, y) => y <= 3 ? 's' : ''),
  braxen: sprite(["....ooo.....", "...obbbo....", "..obbbbboo.o", ".owbbbbbbobo", "obkbbbbbbBo.", "obbbbbbbbBo.", "obbbbbbbbobo", ".oBBBBBBo.Bo", "..oBBBBo...o", "...oooo....."], { o:'#3f2631', w:'#ffffff', k:'#262b44', b:'#a89a6a', B:'#6a6040' }),
  lake: sprite(["................", ".ooooooooooo..o.", "owkbbBbbbBbbooBo", "obbbbbbBbbbBbbbo", ".ooooooooooooooo", "..oo............"], { o:'#3f2631', w:'#ffffff', k:'#262b44', b:'#8a7a4a', B:'#5a4a2a' }),
  gos: sprite(["....o.o.o.......", "..oooooooooo..o.", ".owkgsggsggsgoBo", "ooggggggggggggBo", ".oGGGGGGGGGGGoBo", "..oooooooooo..o."], { o:'#3f2631', w:'#fee761', k:'#262b44', g:'#9aa58a', s:'#4a5a3a', G:'#6a755a', B:'#4a5a3a' }),
  simpa: sprite(["..ooo.......", ".obbbooo.o..", "owkbbsbbooBo", "obbbbbbbbbBo", "obsbbbsbooBo", ".oFFoooo..o.", "..oo........"], { o:'#3f2631', w:'#ffffff', k:'#262b44', b:'#8b7a5a', s:'#4a3a2a', B:'#5a4a3a', F:'#a08a5a' }),
  roding: markFish({ b:'#6e7a52', B:'#e4703a', s:'#e8dcb0', r:'#e4703a' }, (x, y) => y >= 5 && y <= 6 ? 'r' : (x + y) % 3 === 0 && y <= 4 ? 's' : ''),   // red belly, pale spots (2026-10-24)
  grottfisk: markFish({ b:'#efe0dc', B:'#c9a3a8', w:'#efe0dc', k:'#d8b4b8', r:'#f6757a' }, (x, y) => x === 4 && y > 2 && y < 7 ? 'r' : ''),   // no eyes (2026-10-24)
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
// Sand: the beach behind the mountain (karta.json strand, rectangles, Peter 2026-10-24)
const SAND = new Set((karta.strand || []).flatMap(([x0, y0, x1, y1]) => { const l = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) l.push(key(x, y)); return l; }));
const isPath = (x, y) => { const v = at(x, y); return v === 'p' || v === 'b'; };

let WFIELD = null;
function hex(c){ return [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)]; }
const WC = { wetSand: hex('#c9a46c'), lip: hex('#3e8948'), foam: hex('#2ce8f5'), mid: hex('#0099db'), deep: hex('#0e86c8'), glint: hex('#ffffff') };
function waterLayer(frame){
  const w = MW*TS, h = MH*TS;
  if (!WFIELD){ WFIELD = new Float32Array(w*h); for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) WFIELD[Y*w + X] = waterD(X + .5, Y + .5); }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), im = x.createImageData(w, h), D = im.data;
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++){
    const d = WFIELD[Y*w + X]; if (d < -1.2) continue;
    if (M[Y >> 4][X >> 4] === 'p') continue;
    let col;
    if (d < 0) col = SAND.has(key(X >> 4, Y >> 4)) ? WC.wetSand : WC.lip;   // wet sand on a beach, a dark green lip elsewhere
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
  // Sand: light grains, and a ragged edge where it meets the grass so it is not a straight line
  const sr = rng(13);
  for (const k of SAND){
    const [x, y] = k.split(',').map(Number), X = x*TS, Y = y*TS;
    b.fillStyle = '#e8cf9a'; b.fillRect(X, Y, TS, TS);
    for (let i = 0; i < 7; i++){ b.fillStyle = sr() < .5 ? '#d4b47c' : '#f6e6bf'; b.fillRect(X + Math.floor(sr() * TS), Y + Math.floor(sr() * TS), 1, 1); }
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]){
      if (SAND.has(key(x + dx, y + dy)) || isWater(x + dx, y + dy)) continue;
      b.fillStyle = '#84c669';
      for (let i = 0; i < TS; i++){
        const deep = Math.floor(sr() * 3);
        if (dy) b.fillRect(X + i, dy < 0 ? Y : Y + TS - deep, 1, deep); else b.fillRect(dx < 0 ? X : X + TS - deep, Y + i, deep, 1);
      }
    }
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
  valda: {}, saker: [], steg: {}, handlat: {}, djur: [], fram: [], stopp: {}, hittat: [], spent: 0, kistor: [], agnAnvant: [], agnLager: {}, fiskbok: {}, rekord: {}, namn: {}, bytt: {}, salt: {}, pa: {}, rykten: [],
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
  // in a level the camera keeps him in the middle, also at the edge (outside is only dark rock), so the arrows never cover him
  if (LEVEL) return [Math.max(TS - viewW/2, Math.min(LEVEL.w*TS - TS - viewW/2, x)), Math.max(TS - viewH/2, Math.min(LEVEL.h*TS - TS - viewH/2, y))];
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
    else if (!edgesOf(S.node).length && levelAt(S.node)) toast(levelAt(S.node)[1].texter.bara);
    else if (!edgesOf(id).length && levelAt(id)) toast(levelAt(id)[1].texter.dit);
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
// partiklar: sparks, dust, and drops of water that fall from the roof of a cave and splash
function drawFX(dt){
  for (let i = FX.length - 1; i >= 0; i--){
    const p = FX[i]; p.t += dt;
    if (p.t > p.life){
      FX.splice(i, 1);
      if (p.k === 'drop') for (let j = 0; j < 4; j++) FX.push({ k: 'spark', x: p.x, y: p.y, vx: (Math.random() - .5) * 30, vy: -12 - Math.random() * 14, t: 0, life: .3, col: '#c0eaff' });
      continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.k === 'spark'){ p.vy += 60 * dt; ctx.fillStyle = p.col; const s = p.t < p.life * .6 ? 2 : 1; ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s); }
    else if (p.k === 'drop'){ ctx.fillStyle = '#c0eaff'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2); }
    else { p.vx *= .92; p.vy *= .92; const r = Math.max(1, Math.round(p.r * (1 - p.t / p.life))); ctx.fillStyle = p.t < p.life*.5 ? '#ffffff' : '#c0cbdc'; ctx.fillRect(Math.round(p.x) - r, Math.round(p.y) - r, r*2, r*2); }
  }
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
  if (boy.route || boy.walking){ f = Math.floor(now / 130) % frames.length; }
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
  if (LEVEL){ levelFrame(now, dt); requestAnimationFrame(frame); return; }
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
  if (SCENE && !S.natt) SCENE = null;
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
  drawGuard(now);
  drawActors(now);
  drawScene(now);
  drawFX(dt);

  drawMist(now);
  // natt: fades in and out when he sleeps in Hemmet
  nightLevel += ((S.natt ? 1 : 0) - nightLevel) * Math.min(1, dt * 1.6);
  if (Math.abs(nightLevel - (S.natt ? 1 : 0)) < .005) nightLevel = S.natt ? 1 : 0;
  if (nightLevel > 0) drawNight(now, nightLevel);
  drawZzz(now);
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

/* ---------- dimman ---------- */
// A thin veil of mist drifts over Dimmossen (Peter 2026-10-23): a few soft white bands that move slowly back and forth. It is
// only drawn once the place has been seen, so it never lies on top of the black of the unexplored map.
function drawMist(now){
  const n = NODES.dimmossen; if (!n || (!DEBUG.mode && !seenAt(n.x, n.y))) return;
  const t = reduceMotion ? 0 : now / 1000, mx = (n.x + .5) * TS, my = (n.y + .3) * TS;
  const blob = (cx, cy, rx, ry, a) => {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(232,238,246,${a})`); g.addColorStop(1, 'rgba(232,238,246,0)');
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
  };
  // a soft haze over the whole bog (Peter 2026-10-23: denser, about four tiles to each side of Dimmossen), and bands that drift in it
  blob(mx + 8, my - 4, 80, 30, .35);
  for (let i = 0; i < 14; i++){
    const cx = mx + (i % 7 - 3) * 18 + 8 + Math.sin(t * .13 + i * 1.7) * 12, cy = my + (Math.floor(i / 7) * 2 - 1) * 9 + Math.sin(t * .21 + i) * 3;
    blob(cx, cy, 28 + (i % 3) * 8, 7 + (i % 2) * 3, .45);
  }
}

/* ---------- banor: små kartor där han går fritt ---------- */
// A level (bana, data/banor.json) is its own small map that he enters from a place on the big map (Peter 2026-10-24: the cave
// under the mountains between Sjöviken and Södra bron). In a level he walks freely, one tile at a time: with the arrow keys,
// the arrows on the map, or by tapping where he wants to go. It is dark there. Only what his light reaches shows, and what he
// has seen stays dimly visible. He can always go in, but without a lit light he only gets as far as the daylight reaches
// (utanLjus steps from an opening) or where he has already been with a light (Peter 2026-10-24). The letters in rutor: # rock, . floor, ~ water, E the way in
// and X the way out (he leaves when he steps on them), and the letters in bild (decoration, the ones in hinder are in the
// way), ljus (something that shines by itself), saker (a thing he picks up) and aventyr (an adventure next to that letter).
// Along the water he can fish (fiske, a place in berattelse.json fiske.platser). He is still at his place on the big map
// (S.node) while he is in a level, so a reload puts him back outside.
const LIGHTS = { lykta: '255,210,120', flaskat: '90,170,255', eldflugor: '150,230,90' };
const litLight = () => Object.keys(LIGHTS).find(id => S.tant && S.tant[id] && S.saker.includes(id)) || null;
const levelAt = id => Object.entries(BANOR).find(([, d]) => d.ingang === id || d.utgang === id) || null;
const levelStops = lid => Object.keys(BANOR[lid].aventyr || {}).map(ch => `bana:${lid}:${ch}`);
// something is left in a level while a thing lies there, an adventure is not played or a fish there is not in the book
const levelLeft = lid => { const d = BANOR[lid]; return Object.values(d.saker || {}).some(id => !S.saker.includes(id)) || levelStops(lid).some(k => !S.stopp[k]) || (!!d.fiske && newFishAt(d.fiske)); };
let LEVEL = null;   // { id, def, w, h, door, seen, held, path, move, spot, img, lamps, glints, pos }
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const lvCell = (x, y) => LEVEL && y >= 0 && y < LEVEL.h && x >= 0 && x < LEVEL.w ? LEVEL.def.rutor[y][x] : '#';
const lvFree = (x, y) => { const c = lvCell(x, y); return c !== '#' && c !== '~' && !(LEVEL.def.hinder || '').includes(c); };
const lvTile = () => [Math.round(boy.x / TS), Math.round(boy.y / TS)];
// without a lit light: only near an opening (L.near) or where he has seen with his light
const lvCanGo = (x, y) => !!litLight() || !!LEVEL.near[y * LEVEL.w + x] || !!LEVEL.seen[y * LEVEL.w + x];
const levelBusy = () => !$('#modal').hidden || !current || current.type !== 'bana';
// A guard stands at the way in by day and lets nobody in; at night he sleeps and he can sneak past. When he has seen
// Gråskuggan row away (the adventure `borta` has begun) the guard is gone (berattelse.json vakt, Peter 2026-10-24).
const VAKT = berattelse.vakt;
const guardGone = () => !VAKT || !!S.stopp[VAKT.borta] || !!S.steg['stopp:' + VAKT.borta];
const guardHere = id => !!VAKT && VAKT.plats === id && !guardGone();
function talkGuard(line){
  startDialog([{ p: VAKT.person, t: line || VAKT.hej }], () => [
    ...VAKT.fragor.map(f => ({ label: esc(f.label), run: () => talkGuard(f.svar) })),
    { label: 'Tillbaka', alt: true, run: toNode },
  ]);
}
function levelEntryBlock(id){
  const [lid, d] = levelAt(id), T = d.texter, side = d.ingang === id ? 'in' : 'ut', here = S.node === id && !boy.route;
  if (guardHere(id) && !S.natt) return `<div class="plot"><div><b>${esc(VAKT.rubrik)}</b></div>${here ? `<button class="btn" type="button" data-vakt="1">${esc(VAKT.knapp)}</button>` : ''}</div>`;
  if (guardHere(id)) return `<div class="plot"><div><b>${esc(VAKT.rubrikNatt)}</b><span>${esc(VAKT.textNatt)}</span></div>${here ? `<button class="btn" type="button" data-bana="${lid}:${side}">${esc(VAKT.smyg)}</button>` : ''}</div>`;
  return `<div class="plot"><div><b>${esc(side === 'in' ? T.rubrik : T.rubrikTillbaka)}</b></div>${here ? `<button class="btn" type="button" data-bana="${lid}:${side}">${esc(side === 'in' ? T.gaIn : T.gaTillbaka)}</button>` : ''}</div>`;
}
function enterLevel(lid, side){
  const d = BANOR[lid], door = side === 'ut' ? 'X' : 'E';
  stopFishing(); hideHint();
  const w = d.rutor[0].length, h = d.rutor.length, pos = {};
  d.rutor.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '#' && ch !== '.' && ch !== '~' && !pos[ch]) pos[ch] = [x, y]; }));
  LEVEL = { id: lid, def: d, w, h, door, pos, seen: new Uint8Array(w * h), seenDirty: true, held: null, path: null, move: null, spot: null, drip: 0, darkToast: 0 };
  // how far the daylight reaches: utanLjus steps from each opening
  LEVEL.near = new Uint8Array(w * h);
  for (const ch of ['E', 'X']){
    const dist = new Map([[pos[ch].join(','), 0]]), q = [pos[ch]];
    while (q.length){
      const [x, y] = q.shift(), n = dist.get(x + ',' + y);
      LEVEL.near[y * w + x] = 1;
      if (n >= (d.utanLjus || 0)) continue;
      for (const [dx, dy] of Object.values(DIRS)){ const k = (x + dx) + ',' + (y + dy); if (!dist.has(k) && lvFree(x + dx, y + dy)){ dist.set(k, n + 1); q.push([x + dx, y + dy]); } }
    }
  }
  // he starts one step inside the opening, facing into the cave, and the animals come in after him
  const [ox, oy] = pos[door];
  const [sx, sy] = Object.values(DIRS).map(([dx, dy]) => [ox + dx, oy + dy]).find(([x, y]) => lvFree(x, y) && lvCell(x, y) !== 'E' && lvCell(x, y) !== 'X');
  boy.route = null; boy.walking = false; boy.x = sx * TS; boy.y = sy * TS;
  boy.dir = sy < oy ? 'up' : sy > oy ? 'down' : sx < ox ? 'left' : 'right';
  trail.length = 0; trail.push({ x: ox * TS, y: oy * TS }, { x: boy.x, y: boy.y }); petState.clear();
  LEVEL.img = levelPicture();
  LEVEL.lamps = []; LEVEL.glints = [];
  const r = rng(31);
  d.rutor.forEach((row, y) => [...row].forEach((ch, x) => {
    const l = d.ljus && d.ljus[ch];
    if (l) LEVEL.lamps.push({ x: x * TS + 8, y: y * TS + 8, r: l[0] * TS, a: l[1], c: l[2], k: l[3] });
    if (ch === '~' && r() < .5) LEVEL.glints.push({ x: x * TS + 2 + Math.floor(r() * 12), y: y * TS + 4 + Math.floor(r() * 10), ph: r() * 6.3, sp: 400 + r() * 700 });
  }));
  markLevelSeen();
  cam.follow = true; cam.focus = null; centerOn(boy.x + 8, boy.y + 8, true);
  $('#dpad').hidden = false; musicSync(); toast(litLight() ? d.in : d.texter.inMorkt);
  showNode();
}
function leaveLevel(door){
  const d = LEVEL.def, node = door === 'X' ? d.utgang : d.ingang;
  LEVEL = null; $('#dpad').hidden = true; boy.walking = false;
  const found = NODES[node].hidden && !S.hittat.includes(node);
  if (found){ S.hittat.push(node); buildTerrain(); renderRumors(); }
  S.node = node; saveSoon();
  placeBoy(node); boy.dir = 'down';
  lastRevealKey = ''; revealAround(boy.x + 8, boy.y + 8);
  cam.follow = true; cam.focus = null; centerOn(boy.x + 8, boy.y + 8, true);
  musicSync(); showNode();
  if (found){ sparkle(boy.x + 8, boy.y + 2, 26); toast(d.texter.hittade); } else toast(d.ut);
}
// The picture of the level is drawn once: rock, floor, water and decoration. Rock far from the floor is plain dark, rock along
// the floor shows its face where the floor lies below it, and the water gets a dark lip where it meets the shore.
function levelPicture(){
  const L = LEVEL, B = L.def.bild, c = document.createElement('canvas'); c.width = L.w * TS; c.height = L.h * TS;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const wall = (cx, cy) => lvCell(cx, cy) === '#', water = (cx, cy) => lvCell(cx, cy) === '~';
  const near = (cx, cy) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!wall(cx + dx, cy + dy)) return true; return false; };
  for (let cy = 0; cy < L.h; cy++) for (let cx = 0; cx < L.w; cx++){
    const ch = lvCell(cx, cy), px = cx * TS, py = cy * TS;
    if (ch === '#'){
      if (near(cx, cy)) tile(x, wall(cx, cy + 1) ? B.vagg : B.vaggFram, px, py);
      else { x.fillStyle = '#140e12'; x.fillRect(px, py, TS, TS); }
      continue;
    }
    if (ch === '~'){
      const col = !water(cx - 1, cy) ? 0 : !water(cx + 1, cy) ? 2 : 1, row = !water(cx, cy - 1) ? 0 : !water(cx, cy + 1) ? 2 : 1;
      tile(x, B.vatten[row * 3 + col], px, py);
      x.fillStyle = 'rgba(20,12,16,.55)';
      if (!water(cx, cy - 1)) x.fillRect(px, py, TS, 3);
      if (!water(cx - 1, cy)) x.fillRect(px, py, 2, TS);
      if (!water(cx + 1, cy)) x.fillRect(px + TS - 2, py, 2, TS);
      if (!water(cx, cy + 1)) x.fillRect(px, py + TS - 1, TS, 1);
      continue;
    }
    tile(x, B.golv, px, py);
    if (wall(cx, cy - 1)) tile(x, B.golvSkugga, px, py);
    if (B[ch]) tile(x, B[ch], px, py);
  }
  return c;
}
function markLevelSeen(){
  if (!litLight()) return;
  const L = LEVEL, [x0, y0] = lvTile(), r = 3;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= L.w || y >= L.h || dx * dx + dy * dy > (r + .5) ** 2 || L.seen[y * L.w + x]) continue;
    L.seen[y * L.w + x] = 1; L.seenDirty = true;
  }
}
// What is around him decides what the panel shows: an adventure next to its letter, fishing by the water, the openings
function levelSpot(){
  const [x, y] = lvTile(), near = (ch, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (lvCell(x + dx, y + dy) === ch) return true; return false; };
  let sp = Object.keys(LEVEL.def.aventyr || {}).filter(ch => near(ch, 1)).join('');
  if (LEVEL.def.fiske && Object.values(DIRS).some(([dx, dy]) => lvCell(x + dx, y + dy) === '~')) sp += '~';
  if (near('E', 2)) sp += 'E';
  if (near('X', 2)) sp += 'X';
  return sp + (litLight() ? '' : '!');
}
// Walking: one tile at a time. A held arrow goes on as long as it is held, a tap gives a path to walk.
function nextLevelStep(){
  const L = LEVEL;
  if (levelBusy()){ L.path = null; return false; }
  const [tx, ty] = lvTile();
  let n = null;
  if (L.held){ const [dx, dy] = DIRS[L.held]; boy.dir = L.held; n = { x: tx + dx, y: ty + dy }; if (!lvFree(n.x, n.y)) return false; }
  else if (L.path && L.path.length) n = L.path.shift();
  if (!n) return false;
  boy.dir = n.x > tx ? 'right' : n.x < tx ? 'left' : n.y > ty ? 'down' : 'up';
  if (!lvCanGo(n.x, n.y)){
    L.held = null; L.path = null;
    if (performance.now() - L.darkToast > 2500){ L.darkToast = performance.now(); toast(L.def.texter.morkt); }
    return false;
  }
  L.move = n; cam.follow = true;
  return true;
}
function stepLevel(dt){
  let left = 70 * dt;
  while (left > 0 && LEVEL){
    const L = LEVEL;
    if (!L.move && !nextLevelStep()) break;
    const gx = L.move.x * TS, gy = L.move.y * TS, dx = gx - boy.x, dy = gy - boy.y, d = Math.hypot(dx, dy);
    if (d <= left){ boy.x = gx; boy.y = gy; left -= d; L.move = null; arriveTile(); }
    else { boy.x += dx / d * left; boy.y += dy / d * left; left = 0; }
  }
}
function arriveTile(){
  const L = LEVEL, [x, y] = lvTile(), ch = lvCell(x, y);
  if (ch === 'E' || ch === 'X') return leaveLevel(ch);
  markLevelSeen();
  const id = (L.def.saker || {})[ch];
  if (id && !S.saker.includes(id)){
    L.held = null; L.path = null;
    S.saker.push(id); renderPack(); saveSoon(); sparkle(boy.x + 8, boy.y + 2, 18);
    itemModal(id);
  }
}
// To a tile: the shortest way there, or to the nearest tile next to it (tapping the water walks him to the shore)
function levelWalkTo(gx, gy){
  const L = LEVEL;
  if (levelBusy()) return;
  const start = L.move ? [L.move.x, L.move.y] : lvTile(), sk = start.join(',');
  const prev = new Map([[sk, null]]), q = [start];
  while (q.length){
    const [x, y] = q.shift();
    for (const [dx, dy] of Object.values(DIRS)){
      const n = [x + dx, y + dy], k = n.join(',');
      if (prev.has(k) || !lvFree(n[0], n[1])) continue;
      prev.set(k, [x, y]);
      if (lvCell(n[0], n[1]) !== 'E' && lvCell(n[0], n[1]) !== 'X') q.push(n);   // an opening is an end, not a way through
    }
  }
  let goal = prev.has(`${gx},${gy}`) ? [gx, gy] : null, best = Infinity;
  if (!goal) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]){
    const c = [gx + dx, gy + dy];
    if (prev.has(c.join(',')) && lvCell(c[0], c[1]) !== 'E' && lvCell(c[0], c[1]) !== 'X'){ const dd = Math.hypot(c[0] - start[0], c[1] - start[1]); if (dd < best){ best = dd; goal = c; } }
  }
  if (!goal) return;
  const path = [];
  for (let c = goal; c && c.join(',') !== sk; c = prev.get(c.join(','))) path.unshift({ x: c[0], y: c[1] });
  L.path = path; L.held = null; cam.follow = true;
}
function levelFrame(now, dt){
  stepLevel(dt);
  if (!LEVEL) return;   // he walked out
  const L = LEVEL;
  boy.walking = !!L.move;
  { const lp = trail[trail.length - 1]; if (Math.hypot(boy.x - lp.x, boy.y - lp.y) >= 1){ trail.push({ x: boy.x, y: boy.y }); if (trail.length > 700) trail.splice(0, 100); } }
  const sp = levelSpot();
  if (sp !== L.spot){ L.spot = sp; if (current && current.type === 'bana') showNode(); }
  // the camera follows him as on the big map
  const [tx, ty] = cam.follow ? centerOn(boy.x + 8, boy.y + 8) : clampCam(cam.x, cam.y);
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 7);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  if (Math.abs(tx - cam.x) < .05) cam.x = tx; if (Math.abs(ty - cam.y) < .05) cam.y = ty;
  const ox = Math.round(cam.x * scaleDev), oy = Math.round(cam.y * scaleDev);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#08060e'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scaleDev, 0, 0, scaleDev, -ox, -oy);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(L.img, 0, 0);
  for (const g of L.glints){ const a = reduceMotion ? .7 : Math.sin(now / g.sp + g.ph); if (a > .6){ ctx.fillStyle = `rgba(200,235,255,${a})`; ctx.fillRect(g.x, g.y, a > .93 ? 2 : 1, 1); } }
  // a thing lies where its letter is until he picks it up: the picture of its kind, bobbing, with a glint now and then
  for (const [ch, id] of Object.entries(L.def.saker || {})){
    if (S.saker.includes(id) || !L.pos[ch]) continue;
    const ico = KAT[katOf(id)].ico, [ix, iy] = L.pos[ch], bob = reduceMotion ? 0 : Math.round(Math.sin(now / 300));
    ctx.drawImage(ico, ix * TS + (TS - ico.width) / 2, iy * TS + (TS - ico.height) / 2 - 1 + bob);
    if (!reduceMotion && Math.random() < dt * 1.5 && Math.hypot(ix * TS - boy.x, iy * TS - boy.y) < 6 * TS) FX.push({ k: 'spark', x: ix * TS + 4 + Math.random() * 8, y: iy * TS + 4, vx: 0, vy: -10, t: 0, life: .5, col: '#ffffff' });
  }
  // the animal of an adventure (syns) swims in the water next to its letter until the adventure is played
  for (const [ch, a] of Object.entries(L.def.aventyr || {})){
    if (!a.syns || !PETS[a.syns] || S.stopp[`bana:${L.id}:${ch}`] || !L.pos[ch]) continue;
    const [ax, ay] = L.pos[ch], wet = Object.values(DIRS).map(([dx, dy]) => [ax + dx, ay + dy]).find(([x, y]) => lvCell(x, y) === '~');
    if (!wet) continue;
    const t = reduceMotion ? 0 : now / 1400, P = PETS[a.syns], f = Math.floor(now / 300) % 2;
    ctx.save(); ctx.globalAlpha = .75;
    ctx.drawImage((Math.cos(t) > 0 ? P.right : P.left)[f], wet[0] * TS + Math.round(Math.sin(t) * 5), wet[1] * TS - 3);
    ctx.restore();
  }
  drawActors(now);
  drawLevelDark(now);
  // drops fall from the roof now and then, close to him
  if (!reduceMotion && now > L.drip){
    L.drip = now + 700 + Math.random() * 1400;
    const x = boy.x + 8 + (Math.random() - .5) * 5 * TS, y = boy.y + 8 + (Math.random() - .5) * 4 * TS;
    if (lvCell(Math.floor(x / TS), Math.floor(y / TS)) !== '#') FX.push({ k: 'drop', x, y: y - 26, vx: 0, vy: 80, t: 0, life: .32 });
  }
  drawFX(dt);
}
// The dark: black where he has not been, a little lighter where he has seen, and holes for his light and for what shines
// by itself (crystals, a torch, the daylight at the openings). The colours of the lights are added on top.
function drawLevelDark(now){
  const L = LEVEL, W = L.w * TS, H = L.h * TS;
  if (!L.dark){ for (const k of ['dark', 'memory']){ L[k] = document.createElement('canvas'); L[k].width = W; L[k].height = H; } }
  if (L.seenDirty){
    L.seenDirty = false;
    const m = L.memory.getContext('2d'); m.clearRect(0, 0, W, H);
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++){ m.fillStyle = DEBUG.mode || L.seen[y * L.w + x] ? 'rgba(8,6,14,.8)' : '#08060e'; m.fillRect(x * TS, y * TS, TS, TS); }
  }
  const d = L.dark.getContext('2d');
  d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H); d.drawImage(L.memory, 0, 0);
  d.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => { const g = d.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.5, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
  const lit = litLight(), bx = boy.x + 8, by = boy.y + 6, flick = reduceMotion ? 1 : 1 + .03 * Math.sin(now / 170) * Math.sin(now / 97);
  const lampA = l => reduceMotion ? 1 : l.k === 'eld' ? .88 + .12 * Math.sin(now / 90 + l.x) * Math.sin(now / 53 + l.y) : l.k === 'kristall' ? .8 + .2 * Math.sin(now / 900 + l.x * .1) : 1;
  hole(bx, by, (lit ? 3.6 : 1.2) * TS * flick, 1);
  for (const l of L.lamps) hole(l.x, l.y, l.r * (l.k === 'kristall' ? .55 : 1) * lampA(l), l.a);
  ctx.drawImage(L.dark, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, c, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  if (lit) glow(bx, by, 3.2 * TS * flick, LIGHTS[lit], .16);
  for (const l of L.lamps) glow(l.x, l.y, l.r * (l.k === 'kristall' ? 1.3 : 1) * lampA(l), l.c, (l.k === 'kristall' ? .5 : .22) * l.a);   // the crystals glow faintly blue
  ctx.restore();
}
// The arrows on the map (shown only in a level) and the arrow keys or WASD
const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const dpad = $('#dpad');
dpad.addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b || !LEVEL) return;
  e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('on');
  LEVEL.held = b.dataset.dir; LEVEL.path = null;
});
for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(t, e => {
  const b = e.target.closest('button'); if (!b) return;
  b.classList.remove('on'); if (LEVEL && LEVEL.held === b.dataset.dir) LEVEL.held = null;
});
// with the keyboard on a button (no pointer): one step
dpad.addEventListener('click', e => { const b = e.target.closest('button'); if (b && LEVEL && e.detail === 0){ const [x, y] = lvTile(), [dx, dy] = DIRS[b.dataset.dir]; levelWalkTo(x + dx, y + dy); } });
addEventListener('keydown', e => {
  if (!LEVEL || !KEYDIR[e.key] || (e.target.closest && e.target.closest('input, textarea, select')) || !$('#modal').hidden) return;
  e.preventDefault(); LEVEL.held = KEYDIR[e.key]; LEVEL.path = null;
});
addEventListener('keyup', e => { if (LEVEL && LEVEL.held === KEYDIR[e.key]) LEVEL.held = null; });
addEventListener('blur', () => { if (LEVEL) LEVEL.held = null; });

/* ---------- Gråskuggans roddbåt ---------- */
// On the beach behind the mountain a rowboat lies at night, with a grey figure beside it, until the night adventure there is
// played. In the adventure he sees Gråskuggan row out to the glowing ship and climb aboard (Peter 2026-10-24): the first choice
// starts the scene (scen: "roddbat"), the boat rows from the beach to where the ship is and is gone when it gets there.
const ROWBOAT = sprite(["oooooooooooooooo", "obbbbbbbbbbbbbbo", ".obbbbbbbbbbbbo.", "..oBBBBBBBBBBo..", "...oooooooooo..."], { o:'#3f2631', b:'#b86f50', B:'#733e39' });
const GREY = sprite(["..ooo..", ".oGGGo.", ".oGkGo.", ".oGGGo.", "oGGGGGo", "oGgGgGo", "oGGGGGo", "oGgGgGo", ".ooooo."], { o:'#3f2631', G:'#8b9bb4', g:'#5a6988', k:'#181425' });
const ROW_FROM = NODES.bakom ? { x: NODES.bakom.x*TS - 10, y: (NODES.bakom.y - 1)*TS - 1 } : null;
let SCENE = null;
function playScene(id){
  if (id !== 'roddbat' || !ROW_FROM) return;
  const t0 = performance.now(), dur = 9000, bt = boatAt(t0 + dur);
  SCENE = { t0, dur };
  // the ship must be seen, and the camera looks between the beach and the ship while the boat rows
  lastRevealKey = ''; revealAround(bt.x + 16, bt.y + 16, 3); lastRevealKey = '';
  cam.follow = false; cam.focus = { x: (ROW_FROM.x + bt.x + 24) / 2, y: (ROW_FROM.y + bt.y + 20) / 2, until: t0 + dur + 600 };
}
function drawRowboat(x, y, f, rowing){
  x = Math.round(x); y = Math.round(y);
  if (rowing){
    ctx.drawImage(GREY, x + 5, y - 6);
    ctx.fillStyle = '#733e39';   // the oars, forward and back
    for (let i = 0; i < 5; i++){ const s = f ? i : -i; ctx.fillRect(x + 8 + s, y + 1 + i, 1, 1); ctx.fillRect(x + 7 - s, y + 1 + i, 1, 1); }
    ctx.drawImage(ROWBOAT, x, y);
    ctx.fillStyle = 'rgba(255,255,255,.7)';   // ripples behind it
    ctx.fillRect(x + 17 + f * 2, y + 4, 2, 1); ctx.fillRect(x + 22 - f, y + 3, 1, 1);
  } else {
    ctx.drawImage(ROWBOAT, x, y);
    ctx.drawImage(GREY, x + 15, y - 5);   // standing beside it on the sand
  }
}
const GUARDPAL = { o:'#3f2631', H:'#8b9bb4', h:'#c0cbdc', s:'#fcbc8f', k:'#262b44', B:'#8b5a3c', T:'#a22633', t:'#e43b44', y:'#feae34', p:'#3a4466', w:'#c0cbdc', b:'#b86f50' };
const GUARD = { dag: sprite(["....oooo..owo.", "...oHHHHoowwwo", "..oHhhHHHoobo.", "..oHHHHHHoobo.", "..oHHHHHHoobo.", "..ossssssoobo.", "..oskssksoobo.", "..oBBBBBBoobo.", "..ooBBBBooobo.", ".oTtTTTTTTobo.", ".oTtTTTTTTsbo.", ".oBBByBBBBobo.", ".oTtTTTTTTobo.", "..oppooppoobo.", "..oppooppoobo.", "...oo..oo.obo."], GUARDPAL), natt: sprite([".........o....", "........owo...", "....ooooowo...", "...oHHHHoobo..", "..oHhhHHHobo..", "..oHHHHHHobo..", "..oHHHHHHobo..", "..ossssssoobo.", "..okksskkoobo.", "..oBBBBBBoobo.", "..ooBBBBooobo.", ".oTtTTTTTToobo", ".oBBByBBBBoobo", ".oppppppppppbo", ".oppppppppppbo", "..ooooooooooo."], GUARDPAL) };
const ZZZ = sprite(["wwww", "..w.", ".w..", "wwww"], { w:'#ffffff' });
function drawGuard(now){
  if (!VAKT || guardGone()) return;
  const n = NODES[VAKT.plats]; if (!n || !seenAt(n.x, n.y)) return;
  const x = n.x*TS + 13, y = (n.y - 1)*TS + 1;
  ctx.drawImage(S.natt ? GUARD.natt : GUARD.dag, x, y);
}
// his Z's are drawn on top of the night, so they show in the dark
function drawZzz(now){
  if (!VAKT || guardGone() || !S.natt || reduceMotion) return;
  const n = NODES[VAKT.plats]; if (!n || !seenAt(n.x, n.y)) return;
  const x = n.x*TS + 13, y = (n.y - 1)*TS + 1;
  for (let i = 0; i < 3; i++){
    const t = (now / 1600 + i / 3) % 1;
    ctx.save(); ctx.globalAlpha = Math.sin(t * Math.PI) * .9; ctx.drawImage(ZZZ, Math.round(x + 7 + t * 8), Math.round(y - 1 - t * 12)); ctx.restore();
  }
}
function drawScene(now){
  if (!S.natt || !ROW_FROM) return;
  const f = reduceMotion ? 0 : Math.floor(now / 320) % 2;
  if (SCENE){
    const p = Math.min(1, (now - SCENE.t0) / SCENE.dur), bt = boatAt(now);
    if (p >= 1){ SCENE = null; return; }
    ctx.save(); ctx.globalAlpha = p > .85 ? (1 - p) / .15 : 1;
    drawRowboat(ROW_FROM.x + (bt.x + 18 - ROW_FROM.x) * p, ROW_FROM.y + (bt.y + 20 - ROW_FROM.y) * p, f, true);
    ctx.restore();
    return;
  }
  // the boat lies on the beach until he has seen it row away (the adventure has begun) or played it
  if (!S.stopp['natt:bakom'] && !S.steg['stopp:natt:bakom'] && seenAt(NODES.bakom.x, NODES.bakom.y)) drawRowboat(ROW_FROM.x, ROW_FROM.y, 0, false);
}

/* ---------- natten ---------- */
// At night the map turns blue (multiply), windows glow yellow, the torches flicker and stars twinkle in the water.
// The lights are the tiles in LIGHT_TILES: where on the tile the light sits, and what kind of light it is.
let nightLevel = 0, STATIC_LIGHTS = null, WATER_STARS = null;
// The burning torch and campfire, and the same put out (own tiles in openrpg.png, verktyg/gor-egna-rutor.py)
const FIRE_OUT = { 'o:18,10': 'o:8,16', 'o:21,12': 'o:9,16' };
// The burning ones flicker between three pictures (own drawings in row 16, Peter 2026-10-23), each fire in its own time
const FIRE_FRAMES = { 'o:18,10': ['o:18,10', 'o:19,16', 'o:20,16'], 'o:21,12': ['o:21,12', 'o:21,16', 'o:22,16'] };
const fireFrame = (i, now, px) => { const f = FIRE_FRAMES[i]; return !f || reduceMotion ? i : f[Math.floor(now / 160 + px * .013) % f.length]; };
const LIGHT_TILES = { 84: [8, 8, 'win'], 88: [8, 8, 'win'], 'o:27,2': [8, 8, 'win'], 125: [8, 8, 'slit'], 51: [8, 10, 'small'], 55: [8, 10, 'small'], 'o:18,10': [8, 4, 'fire'], 'o:21,12': [8, 9, 'fire'], 'o:28,15': [8, 8, 'tent'], 'o:15,16': [6, 10, 'small'], 'o:1,17': [8, 7, 'fyr'] };   // the last one is the lamp of Siri's lighthouse
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
  for (const L of lights) if (L.k === 'fire' && L.i) tile(ctx, fireFrame(L.i, now, L.px), L.px, L.py);

  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
  // Siri's lighthouse sweeps two beams slowly round over Sjöviken (2026-10-24)
  for (const L of lights) if (L.k === 'fyr'){
    const a0 = reduceMotion ? .6 : now / 1600, len = 150, w = .14;
    for (const side of [0, Math.PI]){
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, len);
      g.addColorStop(0, `rgba(255,240,190,${.34 * lv})`); g.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.arc(L.x, L.y, len, a0 + side - w, a0 + side + w); ctx.closePath(); ctx.fill();
    }
  }
  for (const L of lights){
    const fire = L.k === 'fire', flick = fire && !reduceMotion ? .85 + .15 * Math.sin(now / 90 + L.x) * Math.sin(now / 53 + L.y) : 1;
    // the ship on the lake glows a mysterious blue, everything else warm
    const rad = (fire ? 30 : L.k === 'lamp' ? 26 : L.k === 'fyr' ? 24 : L.k === 'win' || L.k === 'tent' ? 20 : L.k === 'plate' ? 13 : 12) * flick, c = fire ? '255,140,50' : L.k === 'lamp' ? '90,170,255' : L.k === 'fyr' ? '255,240,190' : L.k === 'plate' ? '255,235,180' : '255,200,100';
    const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, rad);
    g.addColorStop(0, `rgba(${c},${.5 * lv})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(L.x - rad, L.y - rad, rad * 2, rad * 2);
  }
  for (const [id, col] of [['lykta', '255,210,120'], ['flaskat', '90,170,255'], ['eldflugor', '150,230,90']]){
    if (!S.tant || !S.tant[id] || !S.saker.includes(id)) continue;
    const bx = boy.x + 8, by = boy.y + 4, rad = 22 + (reduceMotion ? 0 : Math.sin(now / 300 + (id === 'flaskat' ? 2 : 0)) * 1.5);
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
    g.addColorStop(0, `rgba(${col},${.32 * lv})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const L of lights){
    if (L.k === 'fire' || L.k === 'tent' || L.k === 'lamp' || L.k === 'plate' || L.k === 'fyr') continue;
    const [w, h] = L.k === 'win' ? [6, 6] : [2, 4];
    ctx.fillStyle = `rgba(254,231,97,${.85 * lv})`; ctx.fillRect(Math.round(L.x - w / 2), Math.round(L.y - h / 2), w, h);
  }
  // fireflies over Ängen: small green lights that blink on and off
  if (NODES.angen){
    const ax = NODES.angen.x*TS, ay = NODES.angen.y*TS, r = rng(17);
    for (let i = 0; i < 22; i++){
      const fx = ax - 40 + r()*96 + Math.sin(now / (900 + i*37) + i) * 6, fy = ay - 30 + r()*70 + Math.cos(now / (1100 + i*29) + i) * 4;
      const a = reduceMotion ? .6 : Math.sin(now / (380 + i*23) + i*2);
      if (a < .3 || !seen(fx, fy)) continue;
      ctx.fillStyle = `rgba(190,255,120,${Math.min(1, a) * lv})`; ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
      if (a > .85){ ctx.fillStyle = `rgba(190,255,120,${.35 * lv})`; ctx.fillRect(Math.round(fx) - 1, Math.round(fy), 3, 1); ctx.fillRect(Math.round(fx), Math.round(fy) - 1, 1, 3); }
    }
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
  if (id === 'lykta' || id === 'flaskat' || id === 'eldflugor'){
    S.tant = S.tant || {}; S.tant[id] = !S.tant[id];
    toast(id === 'lykta' ? (S.tant[id] ? 'Du tände lyktan.' : 'Du släckte lyktan.') : id === 'eldflugor' ? (S.tant[id] ? 'Du öppnar locket lite, och eldflugorna börjar blinka.' : 'Du skruvar på locket, och eldflugorna somnar.') : (S.tant[id] ? 'Irrblosset vaknar och lyser blått.' : 'Irrblosset somnar i burken.'));
    renderPack(); saveSoon(); if (LEVEL) markLevelSeen(); return;
  }
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
function musicSync(){ if (window.Musik) Musik.natt(!!S.natt || !!LEVEL); }   // the calm night song in a cave too
function firstGesture(ev){
  for (const t of ['pointerdown', 'touchend', 'click', 'keydown']) removeEventListener(t, firstGesture);
  if ((ev.target.closest && ev.target.closest('#btnMusik')) || !window.Musik || !musicWanted()) return;
  musicSync(); Musik.start(); musicButton();
}
// on phones Safari only counts touchend and click as a tap that may start sound
for (const t of ['touchend', 'click', 'keydown']) addEventListener(t, firstGesture);
$('#btnMusik').addEventListener('click', () => {
  if (!window.Musik) return;
  if (Musik.spelar){ Musik.stop(); try { localStorage.setItem(MUSIC_KEY, 'av'); } catch (e) { /* only this time */ } }
  else { musicSync(); Musik.start(); try { localStorage.setItem(MUSIC_KEY, 'pa'); } catch (e) { /* only this time */ } }
  musicButton();
});
document.addEventListener('visibilitychange', () => { if (window.Musik) Musik.paus(document.hidden); });

// What a place offers, in the order it is shown in the panel. Each part says when it is there (on), what it shows (block) and
// whether it makes the centre of the plate yellow (active): something left to do, someone to talk to or a shop where he can
// buy something (Peter 2026-10-23). Everything new at a place goes in here, so the panel and the plate can never disagree.
const isDay = () => !S.natt;
const plotsAt = id => PLOTS.filter(p => p.node === id);
const plotLeft = p => { if (p.prebuilt) return false; if (!S.built[p.id]) return true; const v = valOf(p); return !!(v && (!S.handlat[p.id] || (v.byte && !S.bytt[p.id]))); };
const newFishAt = id => { const fp = FISKE.platser[id]; return myTools().some(t => (FISKE.fangar[t] || []).some(f => fp.fiskar.includes(f) && S.fiskbok[f] === undefined)); };
const PLACE_PARTS = [
  { on: id => isDay() && plotsAt(id).length > 0, block: id => plotsAt(id).map(plotBlock).join(''), active: id => plotsAt(id).some(plotLeft) },
  { on: id => isDay() && !!STOPP[id], block: id => stopBlock(id), active: id => !S.stopp[id] },
  { on: id => !isDay() && !!NATTSTOPP[id], block: id => stopBlock('natt:' + id), active: id => !S.stopp['natt:' + id] },
  // the way into a level: yellow while something is left there and he has a light he can take in
  { on: id => !!levelAt(id), block: id => levelEntryBlock(id), active: id => (guardHere(id) && !S.natt) || (Object.keys(LIGHTS).some(x => S.saker.includes(x)) && levelLeft(levelAt(id)[0])) },
  { on: id => !!viraHere() && id === VIRA.plats, block: () => viraBlock(), active: () => true },                       // a shop
  { on: id => !!neighbour() && id === GRANNE.plats, block: () => neighbourBlock(), active: () => !S.saker.includes(GRANNE.ger) },
  { on: id => id === 'hem', block: () => sleepBlock(), active: () => true },   // he can always sleep at home (Peter 2026-10-23)
  { on: id => id === 'hem' && letterWaiting(), block: () => letterBlock(), active: () => true },
  { on: id => !!FS && id === FS.plats && !S.brevFiske, block: () => fishLetterBlock(), active: () => true },
  { on: id => !!berattelse.handel && id === berattelse.handel.plats, block: () => tentBlock(), active: () => !!S.natt },   // a shop at night
  // fishing: at night a fishing place is light as long as he has something to fish with; by day while a water animal or a kind
  // he has not caught is left there
  { on: id => !!FISKE.platser[id], block: id => fishBlock(id), active: id => S.natt ? myTools().length > 0 : FISKE.djur.some(r => r.plats === id && !S.djur.includes(r.djur)) || newFishAt(id) },
  { on: id => isDay() && !!(FISKE.platser[id] && FISKE.platser[id].lan), block: id => lanBlock(id), active: id => !S.saker.includes(FISKE.platser[id].lan.ger) },   // a shop
  { on: id => isDay() && LOCKA.some(r => r.plats === id), block: id => LOCKA.filter(r => r.plats === id).map(lureBlock).join(''), active: id => LOCKA.some(r => r.plats === id && !S.djur.includes(r.djur)) },
  { on: id => isDay() && id === CHEST_AT.node && pendingTickets().length > 0, block: () => `<div class="plot"><div><b>En guldkista står vid skolan</b></div><button class="btn" type="button" data-kista="1">Öppna kistan</button></div>`, active: () => true },
  { on: id => isDay() && id === 'slott', block: () => `<div><button class="btn" type="button" data-slott="1">${esc(berattelse.dialog.slottKnapp)}</button></div>`, active: () => false },
];
// Is there still something to do at a place? Colours the centre of the plate (yellow, or grey when all is done).
const nodeActive = id => PLACE_PARTS.some(part => part.on(id) && part.active(id));

/* ---------- Stjärnväktarnas brev ---------- */
// A secret society, Stjärnväktarna, leaves a letter on the step of Hemmet at night, once he has opened his first rune or scroll.
// It can be read again with its own button. Their sign is a silver star with an eye (SIGIL, own drawing).
const SIGIL = sprite([".....o.....", "....owo....", "....owo....", "...owwwo...", "oowwwkwwwoo", ".owwekewwo.", "oowwwkwwwoo", "...owwwo...", "....owo....", "....owo....", ".....o....."],
  { o: '#3a4466', w: '#c0cbdc', e: '#ffffff', k: '#262b44' });
const V = berattelse.stjarnvaktarna;
// The letter is spoken by the sign itself: the silver star with an eye is its portrait, like the queen's in her letter
const OTHER_WHO = { stjarnvaktarna: { namn: 'Stjärnväktarna', yrke: 'Hemligt sällskap' }, fiskesallskapet: { namn: 'Fiskesällskapet', yrke: 'Sällskapet vid älven' } };
// The fishing society's emblem: a fish over the waves (own drawing)
const FISH_EMBLEM = sprite(["............", "....oooo..o.", "...obbbbooBo", "..obwkbbbbBo", "..obbbbbbbBo", "...obbbbooBo", "....oooo..o.", "............", "ww..ww..ww..", ".ww..ww..ww.", "..ww..ww..ww"],
  { o:'#3a4466', b:'#c0cbdc', B:'#8b9bb4', w:'#2ce8f5', k:'#262b44' });
function emblemPortrait(id, spr){
  if (PORTRAIT_IMG[id]) return;
  const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#181425'; x.fillRect(0, 0, 32, 32); x.drawImage(spr, 0, 0, spr.width, spr.height, 4, 5, spr.width * 2, spr.height * 2);
  PORTRAIT_IMG[id] = c;
}
function sigilPortrait(){
  if (PORTRAIT_IMG.stjarnvaktarna) return;
  const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#181425'; x.fillRect(0, 0, 32, 32); x.drawImage(SIGIL, 0, 0, 11, 11, 5, 5, 22, 22);
  PORTRAIT_IMG.stjarnvaktarna = c;
}
const letterWaiting = () => V && !S.brev2 && S.natt && S.log.some(e => e.text);
function letterBlock(){
  const here = S.node === 'hem' && !boy.route;
  return `<div class="plot"><div><b>${esc(V.rubrik)}</b><span>${esc(V.text)}</span></div>${here ? `<button class="btn" type="button" data-brev="1">${esc(V.knapp)}</button>` : ''}</div>`;
}
function readLetter2(){
  if (!S.brev2){ S.brev2 = true; saveSoon(); renderLetters(); }
  // shown like the queen's letter: line by line in the dialog box under the map
  sigilPortrait();
  startDialog(V.stycken.map(t => ({ p: 'stjarnvaktarna', t })), () => [{ label: 'Tillbaka till kartan', alt: true, run: toNode }]);
}

/* ---------- tältet och nattfiskaren ---------- */
// The tent behind the campfire in Skogsgläntan is closed by day. At night the night fisherman buys fish from the fish book and
// finds from the pack, one of each kind (S.salt), so it is a collection to sell and no way to make endless stardust.
const FS = berattelse.fiskesallskapet;
function fishLetterBlock(){
  const here = S.node === FS.plats && !boy.route;
  return `<div class="plot"><div><b>${esc(FS.rubrik)}</b></div>${here ? `<button class="btn" type="button" data-fbrev="1">${esc(FS.knapp)}</button>` : ''}</div>`;
}
function readFishLetter(){
  if (!S.brevFiske){ S.brevFiske = true; saveSoon(); renderLetters(); renderFishBook(); }
  emblemPortrait('fiskesallskapet', FISH_EMBLEM);
  startDialog(FS.stycken.map(t => ({ p: 'fiskesallskapet', t })), () => [{ label: 'Tillbaka till kartan', alt: true, run: toNode }]);
}
function tentBlock(){
  const H = berattelse.handel, here = S.node === H.plats && !boy.route;
  if (!S.natt) return `<div class="plot"><div><b>${esc(H.rubrikDag)}</b><span>${esc(H.stangt)}</span></div></div>`;
  return `<div class="plot"><div><b>${esc(H.rubrikNatt)}</b></div>${here ? `<button class="btn" type="button" data-handel="1">${esc(H.knapp)}</button>` : ''}</div>`;
}
function startTrade(seen){
  const H = berattelse.handel;
  const wares = Object.entries(H.saljer || {}).filter(([id]) => !S.saker.includes(id)), packs = Object.entries(H.agn || {});
  // he only sells, he buys nothing (Peter 2026-10-20; no stardust is ever given in the game, 2026-10-24). When he first greets he says one of several things (prat), one of them
  // about the strange fish since the ship came (Peter 2026-10-22)
  const talk = [H.hej, ...(H.prat || [])], V = H.visar, hidden = V && !S.hittat.includes(V.plats);
  const hello = !wares.length && !packs.length ? H.inget : seen ? H.hej : talk[Math.floor(Math.random() * talk.length)];
  // while his own place (Udden) is hidden he tells about it: three kinds of fish, or his lost hat. The first time it goes to the
  // rumours, after that he only reminds (Peter 2026-10-22)
  const told = hidden && V.rykten.every(k => S.rykten.includes(k));
  // something he tells once, the first time he talks after a thing is bought (efterKop): where the reed for the flute is from
  const after = !seen && (hidden ? told : true) ? (H.efterKop || []).find(e => S.saker.includes(e.sak) && !S.rykten.includes(e.rykte)) : null;
  const lines = seen ? [{ p: H.person, t: hello }] : hidden && !told ? V.stalle.map(t => ({ p: H.person, t })) : after ? [{ p: H.person, t: after.t }] : hidden ? [{ p: H.person, t: V.paminn }] : [{ p: H.person, t: hello }];
  startDialog(lines, () => (hearMany([...(hidden ? V.rykten : (H.rykten || [])), ...(after ? [after.rykte] : [])]), [
    ...(hidden ? [{ label: esc(V.knappFisk), run: showFishBook }] : []),
    ...(hidden && S.saker.includes(V.hatt) ? [{ label: esc(V.knappHatt), run: () => showPlace(V.hattTack) }] : []),
    ...(wares.length || packs.length ? [{ rubrik: 'Köp' }] : []),
    ...wares.map(([id, n]) => buyChoice(id, n, 0, () => buyFrom(id, n))),
    ...packs.map(([id, o]) => buyChoice(id, o.pris, o.antal, () => buyPack(id, o, H.person, H.kopt[id], () => startTrade(true)))),
    { label: 'Tillbaka till kartan', alt: true, run: toNode },
  ]), seen);
}
function buyFrom(id, n){
  if (S.saker.includes(id)) return;
  if (S.coins < n){ toast(berattelse.dialog.ingaStoft.replace('{n}', n - S.coins)); return; }
  spend(n); updateHud('coins'); S.saker.push(id); renderPack(); saveSoon();
  sparkle(boy.x + 8, boy.y + 2, 18);
  toast(`Du köpte ${nameIn(id)}!`);
  const K = berattelse.handel.kopt;
  startDialog([{ p: berattelse.handel.person, t: typeof K === 'string' ? K : K[id] }], () => [
    { label: 'Något mer', run: () => startTrade(true) },
    { label: 'Tillbaka till kartan', alt: true, run: toNode },
  ]);
}
// The kinds he has caught that are fish (a frog or a crayfish is no fish, fiske.fiskar ingenFisk)
const fishKinds = () => Object.keys(S.fiskbok).filter(id => FISKE.fiskar[id] && !FISKE.fiskar[id].ingenFisk);
function showFishBook(){
  const H = berattelse.handel, V = H.visar, n = fishKinds().length;
  if (n >= V.antal) return showPlace(V.nog);
  startDialog([{ p: H.person, t: V.farre[n] }], () => [{ label: 'Något mer', run: () => startTrade(true) }, { label: 'Tillbaka till kartan', alt: true, run: toNode }]);
}
// The night fisherman shows his own place: the path from the tent to Udden comes out on the map. He keeps no hat.
function showPlace(text){
  const H = berattelse.handel, id = H.visar.plats;
  if (!S.hittat.includes(id)){ S.hittat.push(id); buildTerrain(); sparkle(NODES[id].x*TS + 8, NODES[id].y*TS + 8, 26); saveSoon(); renderRumors(); }
  toast(`En ny plats syns på kartan: ${NODES[id].name}.`);
  startDialog([{ p: H.person, t: text }], () => [{ label: 'Något mer', run: () => startTrade(true) }, { label: 'Tillbaka till kartan', alt: true, run: toNode }]);
}
// A pack of bait can be bought again and again (handel agn, vira agn)
const addBait = (id, n) => { S.agnLager[id] = (S.agnLager[id] || 0) + n; renderPack(); saveSoon(); };
function buyPack(id, o, who, line, back){
  if (S.coins < o.pris){ toast(berattelse.dialog.ingaStoft.replace('{n}', o.pris - S.coins)); return; }
  spend(o.pris); updateHud('coins'); addBait(id, o.antal);
  sparkle(boy.x + 8, boy.y + 2, 18);
  toast(`${SAKER[id].namn}, ${o.antal} st, lades i väskan.`);
  startDialog([{ p: who, t: line }], () => [{ label: 'Något mer', run: back }, { label: 'Tillbaka till kartan', alt: true, run: toNode }]);
}
// After her adventure Vira sits by her fire in Höstskogen every night and rolls moon bait (berattelse vira): for stardust, or
// for the dried moonwort she once gave him
const VIRA = berattelse.vira;
const viraHere = () => VIRA && S.natt && S.stopp[VIRA.efter];
function viraBlock(){
  const here = S.node === VIRA.plats && !boy.route;
  return `<div class="plot"><div><b>${esc(VIRA.rubrik)}</b></div>${here ? `<button class="btn" type="button" data-vira="1">${esc(VIRA.knapp)}</button>` : ''}</div>`;
}
function startVira(seen){
  const back = () => startVira(true);
  startDialog([{ p: VIRA.person, t: VIRA.hej }], () => [
    { rubrik: 'Köp' },
    ...Object.entries(VIRA.agn).map(([id, o]) => buyChoice(id, o.pris, o.antal, () => buyPack(id, o, VIRA.person, VIRA.tack, back))),
    ...Object.entries(VIRA.agn).flatMap(([id, o]) => [
      ...(o.byt && S.saker.includes(o.byt) ? [{ rubrik: 'Byt' }, swapChoice(id, o.byt, o.antal, () => {
        S.saker = S.saker.filter(x => x !== o.byt); addBait(id, o.antal);
        startDialog([{ p: VIRA.person, t: VIRA.tackByt }], () => [{ label: 'Något mer', run: back }, { label: 'Tillbaka till kartan', alt: true, run: toNode }]);
        itemModal(id, null, `${o.antal} st lades i väskan.`);
      })] : []),
    ]),
    { label: 'Tillbaka till kartan', alt: true, run: toNode },
  ], seen);
}
// The neighbour in Hemmet (Bosse or Mira, whoever built there) cannot sleep since the night the stars fell, when the ground
// shook and the pond came up on Ängen. At night he or she stands by the pond and gives him a nightcap (berattelse granne,
// Peter 2026-10-22). Later the neighbour only looks at the pond, where something glows now and then (the star crucian).
const GRANNE = berattelse.granne;
const neighbour = () => { if (!GRANNE || !S.natt || !S.built[GRANNE.tomt]) return null; const p = PLOTS.find(q => q.id === GRANNE.tomt), v = p && valOf(p); return v && GRANNE.val[v.id] ? { ...GRANNE.val[v.id], person: v.person, namn: PERS[v.person].namn } : null; };
function neighbourBlock(){
  const n = neighbour(), here = S.node === GRANNE.plats && !boy.route;
  return `<div class="plot"><div><b>${esc(GRANNE.rubrik.replace('{namn}', n.namn))}</b></div>${here ? `<button class="btn" type="button" data-granne="1">${esc(GRANNE.knapp.replace('{namn}', n.namn))}</button>` : ''}</div>`;
}
function talkNeighbour(){
  const n = neighbour(); if (!n) return;
  if (S.saker.includes(GRANNE.ger)) return startDialog([{ p: n.person, t: n.igen }], () => [{ label: 'Tillbaka till kartan', alt: true, run: toNode }]);
  startDialog([{ p: n.person, t: n.hej }, { p: n.person, t: n.ger }], () => {
    if (!S.saker.includes(GRANNE.ger)){ S.saker.push(GRANNE.ger); renderPack(); saveSoon(); itemModal(GRANNE.ger); }
    return [{ label: 'Tillbaka till kartan', alt: true, run: toNode }];
  });
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
    // a place can have its own text for the night (berattelse.json platser natt)
    const ptext = S.natt && berattelse.platser[n.id] && berattelse.platser[n.id].natt || n.text;
    if (!boy.route) setTimeout(() => hearRumor(`plats:${n.id}:${S.natt ? 'natt' : 'dag'}`), 600);
    h = `<span class="tag">Du är här</span><h2>${esc(n.name)}</h2><p>${esc(ptext)}</p><div class="panel-body">`;
    // Everything the place offers comes from PLACE_PARTS (the same list that colours the plate). At night everything is closed
    // except what is open at night (Peter 2026-10-20).
    const before = h.length;
    for (const part of PLACE_PARTS) if (part.on(n.id)) h += part.block(n.id);
    if (S.natt && h.length === before) h += `<p class="sub" style="text-transform:none;letter-spacing:0">Det är natt. Här sover alla.</p>`;
    h += `</div>`;
  } else if (view.type === 'bana'){
    // In a level: what is around him (levelSpot), a way back out, and how to walk
    const L = LEVEL, d = L.def, T = d.texter, sp = L.spot || levelSpot();
    const advs = Object.keys(d.aventyr || {}).filter(ch => sp.includes(ch)), done = ch => S.stopp[`bana:${L.id}:${ch}`];
    const text = sp.includes('!') ? T.ljusAv : advs.length ? T[advs[0] + (done(advs[0]) ? 'Klar' : '')] : sp.includes('~') ? T.vatten : sp.includes('E') ? T.E : sp.includes('X') ? T.X : d.text;
    h = `<span class="tag">Du är här</span><h2>${esc(d.namn)}</h2><p>${esc(text)}</p><div class="panel-body">`;
    for (const ch of advs) h += stopBlock(`bana:${L.id}:${ch}`);
    if (sp.includes('~')) h += fishBlock(d.fiske);
    h += `<div class="roads"><button class="btn alt" type="button" data-banaut="1">${esc(T.tillbaka)}</button></div><p class="sub" style="text-transform:none;letter-spacing:0">${esc(T.styr)}</p></div>`;
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
    const L = dlg.lines[dlg.i], who = L.p ? (PERS[L.p] || OTHER_WHO[L.p]) : null;
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
const showNode = () => renderPanel(LEVEL ? { type: 'bana' } : { type: 'node', id: S.node });
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
  else if (b.dataset.vakt) talkGuard();
  else if (b.dataset.bana){ const [lid, side] = b.dataset.bana.split(':'); enterLevel(lid, side); }
  else if (b.dataset.banaut && LEVEL) levelWalkTo(...LEVEL.pos[LEVEL.door]);
  else if (b.dataset.brev) readLetter2();
  else if (b.dataset.fbrev) readFishLetter();
  else if (b.dataset.handel) startTrade();
  else if (b.dataset.vira) startVira();
  else if (b.dataset.granne) talkNeighbour();
  else if (b.dataset.lan) talkFisher(b.dataset.lan);
  else if (b.dataset.locka) lure(b.dataset.locka);
  else if (b.dataset.redskap !== undefined){ fishing.redskap = b.dataset.redskap; renderFishing(); }
  else if (b.dataset.agn !== undefined){ const id = b.dataset.agn; fishing.agn = fishing.agn === id && SAKER[id].typ === 'lock' ? '' : id; renderFishing(); }
  else if (b.dataset.kasta) cast();
  else if (b.dataset.dra) pull();
  else if (b.dataset.veva) veva();
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
  // the news (runes and scrolls he has not read) wait for the saved game, which knows what he has read (S.lasta). Before, they
  // were told before it had loaded, so a new device, or looking mode that remembers nothing, showed them again (Peter 2026-10-23)
  loadSave().finally(tellNews);
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
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;   // an image, or a canvas (the sign)
    if (cv.width !== w){ cv.width = w; cv.height = h; }
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
  hearMany(dlg.lines.flatMap(l => (berattelse.personRykten || {})[l.p] || []));   // what this person tells goes to the rumours
  // a choice can also be a small heading over the buttons that follow (rubrik), like "Köp" in a shop
  return dlg.choices.map((c, i) => c.rubrik ? `<p class="sub dlg-rubrik">${esc(c.rubrik)}</p>` : `<button class="btn${c.alt ? ' alt' : ''}${c.poor ? ' locked' : ''}${c.cls ? ' ' + c.cls : ''}" type="button" data-dlgchoice="${i}"${c.disabled ? ' disabled' : ''}>${c.label}</button>`).join('');
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
    ...st.val.map(o => {
      // a choice can need one of some things (kraver): without them it is greyed out and says what is missing
      const lacks = o.kraver && !o.kraver.some(x => S.saker.includes(x));
      const need = lacks ? `<small>${esc(berattelse.dialog.kraverLjus && o.kraver.includes('lykta') ? berattelse.dialog.kraverLjus : 'Du har inget som passar än.')}</small>` : '';
      const label = o.kostnad ? `${esc(o.label)} ${price(o.kostnad)}${missing(o.kostnad) ? `<small>${missing(o.kostnad)}</small>` : ''}` : `${esc(o.label)}${need}`;
      return { label, poor: S.coins < o.kostnad || lacks, run: () => lacks ? toast(berattelse.dialog.kraverLjus) : takeStep(ad, o) };
    }),
    // a step can have a third choice that only shows when he carries a certain find (fyndVal)
    ...(st.fyndVal && S.saker.includes(st.fyndVal.fynd) ? [{ label: `${esc(st.fyndVal.label)}<small>${esc(SAKER[st.fyndVal.fynd].namn)}</small>`, run: () => takeStep(ad, { kostnad: 0, ...st.fyndVal }) }] : []),
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
  if (o.scen) playScene(o.scen);   // something happens on the map (Gråskuggan's rowboat)
  // a choice can give a thing on the way (ge) and go on with the adventure
  const gotOnWay = o.ge && !S.saker.includes(o.ge);
  if (gotOnWay){ S.saker.push(o.ge); renderPack(); }
  // or take the find that opened the choice (fyndVal with tar)
  if (o.tar && S.saker.includes(o.fynd)){ S.saker.splice(S.saker.indexOf(o.fynd), 1); renderPack(); }
  saveSoon();
  if (typeof o.till === 'string'){ S.steg[ad.key] = o.till; runStep(ad, o.till, out); }
  else ad.end(o.till, out);
  if (gotOnWay) itemModal(o.ge);
}

/* ---------- stoppen med äventyr ---------- */
// The new stops are only adventures, no people and no building. Each can be played once: the ending he reaches is what he
// gets (an animal, a bait, stardust or a secret fishing place), the other endings are lost.
const STOPP = berattelse.stopp, NATTSTOPP = berattelse.nattstopp || {};
// A place can have a second adventure that only happens at night (berattelse.json nattstopp), saved as 'natt:<place>'
// and a level has adventures next to its letters, saved as 'bana:<level>:<letter>'
const stopDef = key => key.startsWith('natt:') ? NATTSTOPP[key.slice(5)] : key.startsWith('bana:') ? BANOR[key.split(':')[1]].aventyr[key.split(':')[2]] : STOPP[key];
function stopBlock(id){
  const s = stopDef(id), done = S.stopp[id], going = S.steg['stopp:' + id], here = (id.startsWith('bana:') ? !!LEVEL : S.node === id.replace('natt:', '')) && !boy.route;
  const btn = done || !here ? '' : `<button class="btn" type="button" data-stopp="${id}">${esc(going ? berattelse.dialog.stoppFortsatt : s.knapp)}</button>`;
  return `<div class="plot"><div><b>${esc(s.rubrik)}</b>${done ? `<span>${esc(berattelse.dialog.stoppKlar)} ${esc(rewardText(done))}</span>` : ''}</div>${btn}</div>`;
}
function startStop(id){
  if (S.stopp[id]) return;
  const s = stopDef(id), key = 'stopp:' + id;
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
  if (till.fynd) return itemFound(till.fynd);
  return `En hemlig fiskeplats syns nu på kartan: ${NODES[till.fiskeplats].name}.`;
}
function finishStop(id, till, out){
  S.stopp[id] = till; renderRumors(); delete S.steg['stopp:' + id]; saveSoon();
  const things = [till.agn, till.fynd, till.extra].filter(x => x && !S.saker.includes(x));
  for (const x of things) S.saker.push(x);
  if (things.length){ renderPack(); sparkle(boy.x + 8, boy.y + 2, 18); }
  if (till.djur) giveAnimal(till.djur, out[out.length - 1].t, () => itemModal(things));
  if (till.fiskeplats){ S.hittat.push(till.fiskeplats); buildTerrain(); sparkle(NODES[till.fiskeplats].x*TS + 8, NODES[till.fiskeplats].y*TS + 8, 26); toast(rewardText(till)); }
  startDialog([...out, { p: null, t: rewardText(till) }], () => [{ label: LEVEL ? 'Tillbaka' : 'Tillbaka till kartan', alt: true, run: toNode }]);
  if (!till.djur) itemModal(things);
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
  // Hulda sells her potion or swaps it for a find; Torvald still wants a crayfish
  if (T.pris) return sellOrSwap({ who: v.person, hej: T.hej, tack: T.tack, ger: T.ger, pris: T.pris, fynd: T.fynd, back: () => startShop(p, true), done: () => { S.bytt[p.id] = true; } });
  if (!(S.fiskbok[T.vill] > 0)) return startDialog([{ p: v.person, t: T.saknas }], () => back);
  S.fiskbok[T.vill]--; S.bytt[p.id] = true;
  if (!S.saker.includes(T.ger)) S.saker.push(T.ger);
  renderFishBook(); renderPack(); saveSoon();
  startDialog([{ p: v.person, t: T.tack }], () => back);
  itemModal(T.ger);
}
function takeGift(p, id){
  const v = valOf(p), it = SAKER[id];
  if (S.handlat[p.id] || !v.gava.includes(id)) return;
  S.handlat[p.id] = id; if (!S.saker.includes(id)) S.saker.push(id);
  const extra = v.extra && !S.saker.includes(v.extra) ? v.extra : null;
  if (extra) S.saker.push(extra);
  saveSoon(); renderPack();
  const after = () => v.byte ? startShop(p, true) : toNode();
  if (it.djur){ if (S.djur.includes(it.djur)) return itemModal(extra, after); giveAnimal(it.djur, it.text, () => itemModal(extra, after)); return; }
  itemModal([id, extra], after);
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
  renderRumors();
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

// Categories of things in the bag, each with its own small pixel icon (Peter 2026-10-20). Special things have a secret or a task.
// The things that call forth an animal (typ lock) are Lockbeten, the baits for a rod are Agn (Peter 2026-10-22).
const SPECIAL = ['lykta', 'flaskat', 'eldflugor', 'flojt'];
const KAT = {
  sarskilt: { namn: 'Särskilt', ico: sprite(["........", ".yy.....", "y..y....", "y..yyyyy", ".yy..y.y", "........", "........", "........"], { y:'#fee761' }) },
  redskap: { namn: 'Redskap', ico: sprite(["....ss..", "....ss..", "....ss..", "....ss..", "s...ss..", "ss..ss..", ".ssss...", "..ss...."], { s:'#c0cbdc' }) },
  agn: { namn: 'Agn', ico: sprite(["........", "pp......", "ppp...pp", ".ppp.ppp", "..ppppp.", "...ppp..", "........", "........"], { p:'#f6757a' }) },
  lockbete: { namn: 'Lockbeten', ico: sprite(["........", "..oooo..", ".owwwwo.", ".oyyyyo.", ".oyYyyo.", ".oyyyyo.", "..oooo..", "........"], { o:'#8b5a3c', w:'#ead4aa', y:'#feae34', Y:'#fee761' }) },
  klader: { namn: 'Kläder', ico: sprite(["........", "...yy...", "..yyyy..", "..yyyy..", "..RRRR..", "yyyyyyyy", ".yyyyyy.", "........"], { y:'#f4d27a', R:'#e43b44' }) },
  fynd: { namn: 'Fynd', ico: sprite(["........", ".cccccc.", "cwCccCcc", "cCccccCc", ".cCccCc.", "..cCCc..", "...cc...", "........"], { c:'#2ce8f5', C:'#0e5cae', w:'#ffffff' }) },
};
const KAT_ORDER = ['sarskilt', 'redskap', 'agn', 'lockbete', 'klader', 'fynd'];
const katOf = id => SPECIAL.includes(id) ? 'sarskilt' : SAKER[id].typ === 'lock' ? 'lockbete' : SAKER[id].typ === 'verktyg' ? 'redskap' : SAKER[id].typ;
let KAT_URL = null;
const katIcon = k => { if (!KAT_URL) KAT_URL = Object.fromEntries(Object.entries(KAT).map(([key, v]) => [key, iconURL(v.ico, 3)])); return KAT_URL[k]; };
// Rumours: the hints that used to be in the texts of things. A thing's rumour (saker rykte) is heard when he gets it, a place's
// (platser rykte, rykteNatt) when he comes there. S.rykten keeps them in the order he heard them.
const RUMOR_ICO = sprite([".oooooo.", "owwwwwwo", "owkwkwko", "owwwwwwo", ".oooooo.", "..oo....", ".o......", "........"], { o:'#c0cbdc', w:'#ffffff', k:'#3a4466' });
function rumorText(key){
  const [kind, id, when] = key.split(':');
  if (kind === 'sak') return SAKER[id] && SAKER[id].rykte;
  if (kind === 'rykte') return berattelse.rykten && berattelse.rykten[id];   // something a person tells (berattelse rykten)
  const p = berattelse.platser[id]; return p && (when === 'natt' ? p.rykteNatt : p.rykte);
}
// Several rumours at once give one message, not one that hides the other
function hearMany(keys){
  const fresh = [...new Set(keys)].filter(k => rumorText(k) && !S.rykten.includes(k));
  fresh.forEach(k => hearRumor(k, true));
  if (fresh.length) toast(fresh.length === 1 ? `Nytt rykte: ${rumorText(fresh[0])}` : `${['', '', 'Två', 'Tre', 'Fyra'][fresh.length] || fresh.length} nya rykten finns i listan Rykten.`);
}
function hearRumor(key, quiet){
  if (!rumorText(key) || S.rykten.includes(key)) return;
  S.rykten.push(key); saveSoon(); if (!quiet) toast(`Nytt rykte: ${rumorText(key)}`); renderRumors();
}
// The list of rumours is a list of things left to do (Peter 2026-10-22). Each rumour shows the place it points to, and a moon
// when it is about the night (berattelse ryktesInfo). A rumour is solved by itself when what it tells about is done (klar:
// an animal found, a fish caught, a thing got, a place found, a night adventure played). He cannot tick them off himself any
// more, they solve themselves (Peter 2026-10-22). The ones left are on top, the done ones are folded away at the bottom.
const MOON = sprite(["...yyy..", "..yy....", ".yy.....", ".yy.....", ".yy.....", "..yy....", "...yyy.."], { y:'#fee761' });
let MOON_URL = '', showDoneRumors = false;
function condOk(c){
  return c.split('|').some(x => {
    const i = x.indexOf(':'), k = x.slice(0, i), v = x.slice(i + 1);
    return k === 'djur' ? S.djur.includes(v) : k === 'fisk' ? S.fiskbok[v] !== undefined : k === 'sak' ? S.saker.includes(v) : k === 'hittat' ? S.hittat.includes(v) : k === 'stopp' ? !!S.stopp[v] : false;
  });
}
const rumorInfo = k => (berattelse.ryktesInfo || {})[k] || {};
const rumorSolved = k => { const c = rumorInfo(k).klar; return !!(c && c.length && c.every(condOk)); };
function rumorItem(k){
  const info = rumorInfo(k), done = rumorSolved(k);
  if (!MOON_URL) MOON_URL = iconURL(MOON, 2);
  const tag = info.pekar && NODES[info.pekar] ? `<span class="rtag">${info.natt ? `<img class="pix" src="${MOON_URL}" alt="På natten" title="På natten">` : ''}${esc(NODES[info.pekar].name)}</span>` : '';
  return `<li class="rumor${done ? ' klar' : ''}"><span>${esc(rumorText(k))}</span>${tag}</li>`;
}
function renderRumors(){
  const keys = S.rykten.filter(rumorText).reverse(), D = berattelse.dialog.rykten;
  if (!keys.length){ $('#rykten').innerHTML = `<li><span>${esc(D.tom)}</span></li>`; return; }
  const open = keys.filter(k => !rumorSolved(k)), done = keys.filter(rumorSolved);
  $('#rykten').innerHTML = (open.length ? open.map(rumorItem).join('') : `<li><span>${esc(D.allaKlara)}</span></li>`)
    + (done.length ? `<li class="kat-rubrik"><button type="button" class="klara-knapp" data-visaklara="1" aria-expanded="${showDoneRumors}">${showDoneRumors ? 'Dölj' : 'Visa'} klara (${done.length})</button></li>${showDoneRumors ? done.map(rumorItem).join('') : ''}` : '');
}
$('#rykten').addEventListener('click', ev => { if (ev.target.closest('[data-visaklara]')){ showDoneRumors = !showDoneRumors; renderRumors(); } });
function renderPack(){
  if (S.rykten) for (const id of S.saker) if (SAKER[id] && SAKER[id].rykte && !S.rykten.includes('sak:' + id)) hearRumor('sak:' + id);
  // used things that call forth an animal are gone; mask is there as soon as he has a rod, a pack while some is left
  const packs = myBaits().filter(id => !S.saker.includes(id) && (SAKER[id].antal || myTools().some(isRod)));
  const own = [...S.saker.filter(id => SAKER[id] && SAKER[id].typ !== 'djur' && !S.agnAnvant.includes(id)), ...packs]
    .sort((a, b) => KAT_ORDER.indexOf(katOf(a)) - KAT_ORDER.indexOf(katOf(b)) || (SAKER[b].alltid ? 1 : 0) - (SAKER[a].alltid ? 1 : 0));
  renderRumors();
  $('#pack').innerHTML = own.length
    ? own.map((id, i) => { const it = SAKER[id], on = it.typ === 'klader' && S.pa[it.plats] === id;
        // Things that can be used are tapped like the runes in the list: clothes go on and off, the lantern is lit, the flute plays
        const light = id === 'lykta' || id === 'flaskat' || id === 'eldflugor';
        const usable = it.typ === 'klader' || light || id === 'flojt';
        const lit = light && S.tant && S.tant[id];
        const title = it.typ === 'klader' ? (on ? 'Ta av' : 'Ta på') : light ? (lit ? 'Släck' : 'Tänd') : id === 'flojt' ? 'Spela' : '';
        const state = on ? 'på' : lit ? 'tänd' : it.antal ? `${S.agnLager[id]} st` : '';
        const k = katOf(id);
        // a small heading with a thin line where a new category starts (Peter 2026-10-22)
        const head = i === 0 || katOf(own[i - 1]) !== k ? `<li class="kat-rubrik"><span>${KAT[k].namn}</span></li>` : '';
        return head + `<li${usable ? ` class="readable" data-use="${id}" role="button" tabindex="0" title="${title}"` : ''}><img class="pix" src="${katIcon(k)}" alt="${KAT[k].namn}" title="${KAT[k].namn}"><span><b>${esc(it.namn)}</b> ${esc(it.text)}</span>${state ? `<span class="st">${state}</span>` : ''}</li>`; }).join('')
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
  initIcons();
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
}
// What he has not read yet, once the saved game has loaded. restart() closed any dialog, so the letter (first time) or the news
// is shown from the start.
function tellNews(){
  if (!REAL) return;
  const seen = seenEvents();
  newsQueue = REAL.handelser.filter(e => !seen.includes(e.id));
  if (!introSeen()) showIntro(); else if (newsQueue.length) showNews();
}
/* ---------- sparning ---------- */
// His game is saved as spel.json in the private repo Real-MrBeam/stjarnkartan-data through GitHub's API. The key arrives
// encrypted in the page (#lasNyckel) and opens with the password, like the portraits. Without the key nothing is saved.
// Stars and stardust are never saved: they are counted from the runes and scrolls. Only what he has spent is saved.
const SAVE = { repo: '', file: '', key: '', sha: null, timer: 0, off: false, loaded: false };
const SAVED_FIELDS = ['node', 'built', 'valda', 'saker', 'steg', 'handlat', 'djur', 'fram', 'stopp', 'hittat', 'spent', 'kistor', 'agnAnvant', 'fiskbok', 'namn', 'bytt', 'intro', 'natt', 'salt', 'lasta', 'pa', 'tant', 'brev2', 'rykten', 'brevFiske', 'rekord', 'agnLager'];
const b64 = text => { const bytes = new TextEncoder().encode(text); let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const unb64 = data => new TextDecoder().decode(Uint8Array.from(atob(data.replace(/\s/g, '')), c => c.charCodeAt(0)));
function spend(n){ S.coins -= n; S.spent += n; }
function gh(method, body){
  if (VIEW && method !== 'GET') return Promise.reject(new Error('Tittläge: inget sparas'));   // looking at his game never writes
  return fetch(`https://api.github.com/repos/${SAVE.repo}/contents/${SAVE.file}`, { method, cache: 'no-store', keepalive: method === 'PUT',
    headers: { Authorization: `Bearer ${SAVE.key}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: body && JSON.stringify(body) });
}
// Debug mode (?debug in the address): the debug buttons show, and nothing is loaded from or saved to his game, so Peter can
// try things out without touching the saved game. The browser's own memory (news, letter) is not touched either.
// Looking mode (?titta, with or without debug, Peter 2026-10-23): his real saved game is loaded so Peter sees exactly what he
// sees, but nothing is ever saved: not to GitHub (gh refuses anything but reading) and not to the browser's memory.
const VIEW = new URLSearchParams(location.search).has('titta');
const TEST = new URLSearchParams(location.search).has('debug') || VIEW;
if (VIEW){
  const sign = document.createElement('div'); sign.className = 'tittar'; sign.setAttribute('role', 'status');
  sign.textContent = 'Tittar på hans spel. Inget sparas.';
  document.querySelector('header.top').after(sign);
}
async function loadSave(){
  if (TEST && !VIEW){ SAVE.off = true; return; }
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
  if (!S.rykten) S.rykten = [];
  if (data.lyktaTand){ S.tant = { ...(S.tant || {}), lykta: true }; }   // the lantern was saved on its own before
  // Udden was open for everyone before the night fisherman began to show it (2026-10-22): whoever has been there keeps it
  const V = berattelse.handel && berattelse.handel.visar, onlyThere = (f, at) => Object.entries(FISKE.platser).every(([pid, p]) => pid === at || ![...p.fiskar, ...(p.fiskarNatt || [])].includes(f));
  if (V && !S.hittat.includes(V.plats) && (S.node === V.plats || S.rykten.includes(`plats:${V.plats}:natt`) || Object.keys(S.fiskbok).some(f => onlyThere(f, V.plats)))) S.hittat.push(V.plats);
  const MOVED = { 'plats:host:natt': 'rykte:graskuggan', 'plats:talt:natt': 'rykte:skugga', 'plats:udden:natt': 'rykte:skeppet' };
  S.rykten = [...new Set(S.rykten.map(k => MOVED[k] || k))];
  buildBoy(S.pa); musicSync(); renderLetters(); renderRumors();
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
  if (VIEW || !SAVE.key || !SAVE.loaded || SAVE.off) return;
  clearTimeout(SAVE.timer);
  SAVE.timer = setTimeout(saveNow, 1500);
}
async function saveNow(retry){
  clearTimeout(SAVE.timer); SAVE.timer = 0;
  if (VIEW || !SAVE.key || !SAVE.loaded || SAVE.off) return;
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
  // a rune or scroll stays new until he has read its story to the end (Peter 2026-10-21): closing the page halfway shows it again
  const steps = list.flatMap((e, i) => eventSteps(e, i === list.length - 1));
  openModal(steps, () => { markSeen(list.map(e => e.id)); updateHud('stars'); renderTickets(); });
}
// Something he gets (a gift, a find, a thing from an adventure, a swap) is shown in a box like the runes (Peter 2026-10-23):
// a big picture (its category's), the name, the text and that it went into the bag. Things he buys are not shown like this: he chose them himself, and the seller answers.
const itemPicture = id => iconURL(KAT[katOf(id)].ico, 8);   // the picture of its category, as for finds when fishing
function itemModal(ids, done, reward){
  const list = [].concat(ids).filter(Boolean);
  if (!list.length) return done && done();
  openModal(list.map((id, i) => ({ icon: itemPicture(id), title: SAKER[id].namn, text: SAKER[id].text,
    reward: reward || (SAKER[id].typ === 'klader' ? 'Lades i väskan. Du kan ta på den där.' : 'Lades i väskan.'), button: i === list.length - 1 ? 'Fortsätt' : 'Nästa' })), done);
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
// At a fishing place he picks a tool and, for a rod, a bait, casts and pulls when it bites. Too early or too late: the fish
// gets away but the bait stays. Mask is always there; other baits come in packs (S.agnLager) or once, like the spoon, and
// change which kinds bite (saker gillar, nej) and how big they are (stor). A thing that calls forth a water animal (typ lock,
// Lockbeten in the bag) is only offered at the animal's own place, with one of its tools, once he has heard a rumour that points
// there (fiske.djur rykten, Peter 2026-10-22). Each tool has its own words (fiske.satt): only a rod has a hook and a float.
const FISKE = berattelse.fiske;
let fishing = null; // { plats, redskap, agn, phase: 'val' | 'vanta' | 'nu' | 'kamp' | 'miss', timers, loop, kamp }
const myTools = () => ['metspo', ...FISKE.redskap].filter(id => S.saker.includes(id));
const isRod = tool => FISKE.verktyg[tool] === 'spo';
const SATT = fz => FISKE.satt[FISKE.verktyg[fz.redskap]];
const hasBait = id => { const it = SAKER[id]; return it.alltid || (it.antal ? (S.agnLager[id] || 0) > 0 : S.saker.includes(id)); };
const myBaits = () => Object.keys(SAKER).filter(id => SAKER[id].typ === 'agn' && hasBait(id));
const myLocks = () => S.saker.filter(id => SAKER[id] && SAKER[id].typ === 'lock' && !S.agnAnvant.includes(id));
const heard = keys => (keys || []).some(k => S.rykten.includes(k));
const nameIn = id => SAKER[id].egennamn ? SAKER[id].namn : SAKER[id].namn.toLowerCase();
// the things he can put out here with this tool: for an animal of this place that he has not found and has heard about
const locksHere = fz => FISKE.djur.filter(r => r.plats === fz.plats && !S.djur.includes(r.djur) && r.redskap.includes(fz.redskap) && heard(r.rykten))
  .flatMap(r => r.agn.filter(id => myLocks().includes(id)));
const animalRule = fz => FISKE.djur.find(r => r.plats === fz.plats && r.redskap.includes(fz.redskap) && r.agn.includes(fz.agn) && !S.djur.includes(r.djur) && heard(r.rykten));
// a rod always has a bait on the hook (mask if nothing else), the other tools never; a choice that no longer fits is reset
function fixBait(fz){
  const it = SAKER[fz.agn];
  const ok = it ? (it.typ === 'lock' ? locksHere(fz).includes(fz.agn) : isRod(fz.redskap) && hasBait(fz.agn)) : !isRod(fz.redskap);
  if (!ok) fz.agn = isRod(fz.redskap) ? 'mask' : '';
}
function fishBlock(id){
  const T = FISKE.texter, here = (LEVEL ? LEVEL.def.fiske === id : S.node === id) && !boy.route;
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
  sellOrSwap({ who: null, hej: L.hej, tack: L.tack, ger: L.ger, pris: L.pris, fynd: L.fynd, back: toNode, done: () => {} });
}
// A thing in a shop (Peter 2026-10-23): the price first (or the find he gives for it), then the name and how many as the title,
// and a short text under it. The headings "Köp" and "Byt" stand over the buttons. Shop texts are kept short (the test checks).
const wareLabel = (id, left, antal, under) => `${left}<span class="vara"><b>${esc(SAKER[id].namn)}${antal ? `, ${antal} st` : ''}</b><small>${esc(under ?? SAKER[id].text)}</small></span>`;
const buyChoice = (id, pris, antal, run) => ({ label: wareLabel(id, price(pris), antal), poor: S.coins < pris, cls: 'vara-btn', run });
const swapChoice = (id, fynd, antal, run) => ({ label: wareLabel(id, `<span class="price"><img class="pix" src="${katIcon('fynd')}" alt="Byt"></span>`, antal, `Du ger ${SAKER[fynd].namn.toLowerCase()}`), cls: 'vara-btn', run });
// Someone sells a thing for stardust, or swaps it for the one find he or she wants (the fishermen on the bridges, Hulda). Peter 2026-10-21.
function sellOrSwap(o){
  const finds = o.fynd && S.saker.includes(o.fynd) ? [o.fynd] : [];
  const give = how => {
    if (S.saker.includes(o.ger)) return o.back();
    if (how === 'pris'){ if (S.coins < o.pris){ toast(berattelse.dialog.ingaStoft.replace('{n}', o.pris - S.coins)); return; } spend(o.pris); updateHud('coins'); }
    else S.saker = S.saker.filter(x => x !== how);
    S.saker.push(o.ger); o.done(); renderPack(); saveSoon();
    if (how === 'pris') toast(`${SAKER[o.ger].namn} lades i väskan.`);
    startDialog([{ p: o.who, t: o.tack }], () => [{ label: 'Tillbaka', alt: true, run: o.back }]);
    if (how !== 'pris') itemModal(o.ger);
  };
  startDialog([{ p: o.who, t: o.hej }], () => [
    { rubrik: 'Köp' }, buyChoice(o.ger, o.pris, 0, () => give('pris')),
    ...(finds.length ? [{ rubrik: 'Byt' }, ...finds.map(id => swapChoice(o.ger, id, 0, () => give(id)))] : []),
    { label: 'Tillbaka', alt: true, run: o.back },
  ]);
}
function startFishing(id){
  fishing = { plats: id, redskap: myTools()[0], agn: '', phase: 'val', timers: [] };
  fixBait(fishing); renderFishing();
}
function stopFishing(){ if (fishing){ fishing.timers.forEach(clearTimeout); clearInterval(fishing.loop); } fishing = null; }
function renderFishing(){
  const T = FISKE.texter, fz = fishing, n = NODES[fz.plats] || { name: LEVEL ? LEVEL.def.namn : '' };
  current = { type: 'fish' };
  clearInterval(typeTimer); clearInterval(blinkTimer);
  let h = `<span class="tag">Fiske</span><h2>${esc(n.name)}</h2>`;
  if (fz.phase === 'val'){
    fixBait(fz);
    const tool = (id, name) => `<button class="btn${fz.redskap === id ? '' : ' alt'}" type="button" data-redskap="${id}">${esc(name)}</button>`;
    const pick = id => `<button class="btn${fz.agn === id ? '' : ' alt'}" type="button" data-agn="${id}">${esc(SAKER[id].namn)}${SAKER[id].antal ? ` (${S.agnLager[id]})` : ''}</button>`;
    // the baits only for a rod (Peter 2026-10-22), the special things only where they can be used
    const baits = isRod(fz.redskap) ? myBaits() : [], locks = locksHere(fz);
    h += `<p>${esc(T.valj)}</p><div class="panel-body">
      <div><p class="sub">Redskap</p><div class="roads">${myTools().map(id => tool(id, SAKER[id].namn)).join('')}</div></div>
      ${baits.length ? `<div><p class="sub">${esc(T.agn)}</p><div class="roads">${baits.map(pick).join('')}</div></div>` : ''}
      ${locks.length ? `<div><p class="sub">${esc(T.lockbete)}</p><div class="roads">${locks.map(pick).join('')}</div></div>` : ''}
      <div class="roads"><button class="btn" type="button" data-kasta="1">${esc(SATT(fz).kasta)}</button><button class="btn alt" type="button" data-back="1">${esc(T.tillbaka)}</button></div></div>`;
  } else if (fz.phase === 'vanta' || fz.phase === 'nu'){
    const s = SATT(fz), still = isRod(fz.redskap) ? `<img class="float pix" src="${iconURL(FLOAT, 3)}" alt="">` : `<img class="float pix" src="${iconURL(BUBBLES, 3)}" alt="">`;
    h += `<p aria-live="polite">${esc(fz.phase === 'nu' ? s.nu : s.vanta)}</p><div class="panel-body">
      <div class="pond${fz.phase === 'nu' ? ' dip' : ''}">${fz.phase === 'nu' ? `<img class="splash pix" src="${iconURL(SPLASH, 3)}" alt="">` : still}</div>
      <div class="roads"><button class="btn" type="button" data-dra="1">${esc(s.dra)}</button></div></div>`;
  } else if (fz.phase === 'kamp'){
    // the fish is a shadow under the water until it is landed; the line runs from the shore (left) to its mouth
    h += `<p aria-live="polite" class="kamp-text">${esc(T.kamp)}</p><div class="panel-body">
      <div class="pond kamp"><span class="lina"></span><img class="fisk pix" src="${fishIcon(fz.kamp.id)}" alt=""></div>
      <div class="meter kamp-mat"><div class="bar"><i></i></div><span>${esc(T.linan)}</span></div>
      <div class="roads"><button class="btn veva" type="button" data-veva="1">${esc(T.veva)}</button></div></div>`;
  } else {
    h += `<p>${esc(fz.miss)}</p><div class="panel-body"><div class="roads"><button class="btn" type="button" data-igen="1">${esc(T.igen)}</button><button class="btn alt" type="button" data-back="1">${esc(T.tillbaka)}</button></div></div>`;
  }
  panel.innerHTML = h;
  if (fz.phase === 'kamp') drawFight();
}
// The ordinary fish this tool can take at this place (fiske.fangar). fiske.max of each go in the book.
const MAXFISK = FISKE.max || 99;
// at night some places have fish that only swim in the dark (fiske.platser fiskarNatt)
const placeFish = plats => { const p = FISKE.platser[plats]; return S.natt && p.fiskarNatt ? [...p.fiskar, ...p.fiskarNatt] : p.fiskar; };
const catchList = fz => { const can = FISKE.fangar && FISKE.fangar[fz.redskap]; return placeFish(fz.plats).filter(id => !can || can.includes(id)); };
// what bites with this bait: the list of a place repeats a fish as many times as it is common there, and the bait makes a kind
// some times more common (gillar) or keeps it away (nej). A thing for an animal takes no ordinary fish.
const bites = fz => {
  const b = SAKER[fz.agn];
  if (b && b.typ === 'lock') return [];
  return catchList(fz).map(id => ({ id, w: !b ? 1 : (b.nej || []).includes(id) ? 0 : (b.gillar || {})[id] || 1 })).filter(e => e.w > 0);
};
const pickW = l => { let x = Math.random() * l.reduce((a, e) => a + e.w, 0); for (const e of l){ x -= e.w; if (x < 0) return e.id; } return l[l.length - 1].id; };
function cast(){
  const fz = fishing, s = SATT(fz), T = FISKE.texter;
  // a place is never fished out: with three of a kind there is still a heavier one to catch (rekord)
  fz.phase = 'vanta'; renderFishing();
  // each place has its own wait (fiske.platser vanta: shortest and longest, ms): quick in the rapids, slow in the reeds
  const [lo, hi] = FISKE.platser[fz.plats].vanta || [1500, 4000];
  const wait = lo + Math.random() * (hi - lo);
  // nothing here takes this bait, or this tool takes nothing here: it never bites, and he is told why
  if (!animalRule(fz) && !bites(fz).length){
    fz.timers.push(setTimeout(() => miss(catchList(fz).length && fz.agn ? T.ingetPaAgn.replace('{agn}', nameIn(fz.agn)) : T.ingetHar), wait));
    return;
  }
  fz.timers.push(setTimeout(() => { fz.phase = 'nu'; renderFishing(); }, wait));
  fz.timers.push(setTimeout(() => { if (fz.phase === 'nu') miss(s.sent); }, wait + 1100));
}
function miss(text){ const fz = fishing; fz.timers.forEach(clearTimeout); fz.timers = []; clearInterval(fz.loop); fz.loop = 0; fz.kamp = null; fz.phase = 'miss'; fz.miss = text; renderFishing(); }
// the line snaps: the fish is gone, and a lure (tappas) goes with it
function snap(){
  const fz = fishing, b = SAKER[fz.agn];
  if (!b || !b.tappas) return miss(FISKE.texter.brast);
  const name = nameIn(fz.agn);
  S.saker = S.saker.filter(x => x !== fz.agn); fz.agn = 'mask'; renderPack(); saveSoon();
  miss(FISKE.texter.brastDrag.replace('{agn}', name));
}
function pull(){
  const fz = fishing, s = SATT(fz);
  if (fz.phase !== 'nu') return miss(s.tidigt);
  fz.timers.forEach(clearTimeout); fz.timers = [];
  // the thing for an animal is used up when the animal comes
  const rule = animalRule(fz);
  if (rule){
    S.agnAnvant.push(fz.agn); renderPack();
    sparkle(boy.x + 8, boy.y + 2, 20, '#2ce8f5');
    stopFishing(); giveAnimal(rule.djur, rule.text, () => showNode());
    return saveSoon();
  }
  const finds = (FISKE.fynd || []).filter(id => !S.saker.includes(id) && !S.salt['fynd:' + id] && (!FISKE.fyndPlatser || !FISKE.fyndPlatser[id] || FISKE.fyndPlatser[id].includes(fz.plats)));
  if (finds.length && Math.random() < .2){
    const id = finds[Math.floor(Math.random() * finds.length)]; S.saker.push(id); renderPack(); saveSoon(); stopFishing();
    sparkle(boy.x + 8, boy.y + 2, 20, '#2ce8f5');
    // the picture of what it is: the find gem, or the hat for clothes
    return openModal([{ icon: itemPicture(id), title: SAKER[id].namn, text: `${s.fynd} ${SAKER[id].text}`, reward: SAKER[id].typ === 'klader' ? 'Lades i väskan. Du kan ta på den där.' : 'Lades i väskan.', button: 'Till kartan' }], () => showNode());
  }
  // a kind he has not caught is a little more likely
  const list = bites(fz), fresh = list.filter(e => S.fiskbok[e.id] === undefined);
  const id = pickW(fresh.length && Math.random() < .35 ? fresh : list), b = SAKER[fz.agn];
  const kg = weigh(id, b && b.stor);
  if (isRod(fz.redskap) && FISKE.fiskar[id].kamp) return startFight(id, kg);
  land(id, kg);
}
// Every fish gets a weight within its kind (fiske.fiskar vikt, kg). Most are small, a big one is rare; with a bait for big fish
// (saker stor) a big one is more common.
const weigh = (id, big) => { const [lo, hi] = FISKE.fiskar[id].vikt; return Math.round((lo + (hi - lo) * Math.random() ** (big ? 1.2 : 2)) * 100) / 100; };
const kgText = kg => kg.toFixed(2).replace('.', ',');
// The fish is up: into the fish book (three of a kind), and the heaviest of each kind is his record (S.rekord). A fourth
// of a kind goes back into the water, but if it is heavier its weight is still written in.
function land(id, kg){
  const fz = fishing, fish = FISKE.fiskar[id], T = FISKE.texter;
  // a bait from a pack is used up when the fish is landed, not when it gets away
  if (SAKER[fz.agn] && SAKER[fz.agn].antal){ S.agnLager[fz.agn]--; renderPack(); }
  sparkle(boy.x + 8, boy.y + 2, 20, '#2ce8f5');
  const rec = S.rekord[id], best = rec === undefined || kg > rec;
  if (best) S.rekord[id] = kg;
  let step;
  if ((S.fiskbok[id] || 0) >= MAXFISK){
    step = { icon: catchIcon(id), title: fish.namn, text: best ? T.tillbakaRekord : T.tillbaka3, reward: best ? `${kgText(kg)} kg. Nytt rekord!` : `${kgText(kg)} kg. Ditt rekord är ${kgText(rec)} kg.`, button: 'Till kartan' };
  } else {
    const isNew = S.fiskbok[id] === undefined; S.fiskbok[id] = (S.fiskbok[id] || 0) + 1;
    step = { icon: catchIcon(id), title: fish.namn, text: fish.text, reward: `${kgText(kg)} kg. ${isNew ? 'Ny i fiskboken.' : `${best ? 'Nytt rekord! ' : ''}Du har fått ${S.fiskbok[id]} sådana nu.`}`, button: 'Till kartan' };
  }
  renderFishBook(); saveSoon(); stopFishing();
  openModal([step], () => showNode());
}

/* ---------- kampen ---------- */
// A fish on a rod fights (fiske.kamp). Each turn of the reel (Veva) brings it a bit closer and tightens the line, and the line
// slackens by itself. After a rest the fish may pull (or jump, for the trout): first it gets ready for a short while (Akta!),
// then the line tightens by itself and a turn tightens it much more, so he has to wait. Turning faster than five times a
// second jerks the line too (and says so). A full line snaps. A fish he stops reeling for a long while slips off the hook.
// The turns needed are a base for the way it fights plus a number per kg, so a big fish takes long (Peter 2026-10-22): a small
// roach is up in a second or two, a pike of 6 kg takes about 17 seconds. The numbers were tried out in a simulation with a
// child's reaction time: waiting when it gets ready lands every fish, wild tapping only the smallest.
const LINA = { tryck: .16, slapp: .45, drar: .2, hopp: .4, fort: 200, ryck: .1, akta: 450 };
function startFight(id, kg){
  const fz = fishing, f = FISKE.fiskar[id], K = FISKE.kamp[f.kamp], [lo, hi] = f.vikt, q = (kg - lo) / (hi - lo);
  const t = performance.now();
  fz.kamp = { id, kg, q, K, need: Math.round(K.tryck + kg * K.perKg), dist: 1, line: .15, start: t, state: 'vilar', until: t + 700 + Math.random() * 600, last: t, tapped: t, prev: 0, fast: 0 };
  fz.phase = 'kamp'; renderFishing();
  fz.loop = setInterval(fightTick, 50);
}
function fightTick(){
  const fz = fishing, k = fz && fz.kamp; if (!k) return;
  const t = performance.now(), dt = Math.min(.1, (t - k.last) / 1000); k.last = t;
  if (t > k.until){
    if (k.state === 'vilar' && Math.random() < k.K.drar){ k.state = 'akta'; k.until = t + LINA.akta; }
    else if (k.state === 'akta'){ k.state = k.K.hopp ? 'hoppar' : 'drar'; k.until = t + (k.K.hopp ? 500 + Math.random() * 300 : 700 + Math.random() * 600); }
    else { k.state = 'vilar'; k.until = t + 900 + Math.random() * 900; }
  }
  if (k.state === 'drar'){ k.line += k.K.kraft * dt; k.dist = Math.min(1.3, k.dist + .05 * dt); }
  k.line = Math.max(0, k.line - LINA.slapp * dt);
  if (k.line >= 1) return snap();
  if (t - k.tapped > 6000) return miss(FISKE.texter.loss);
  drawFight();
}
function veva(){
  const fz = fishing, k = fz && fz.kamp; if (!k) return;
  const t = performance.now(), fast = t - k.prev < LINA.fort;
  k.tapped = k.prev = t; if (fast) k.fast = t;
  k.line += LINA.tryck + (k.state === 'drar' ? LINA.drar : k.state === 'hoppar' ? LINA.hopp : 0) + (fast ? LINA.ryck : 0);
  k.dist -= (k.state === 'vilar' || k.state === 'akta' ? 1 : .5) / k.need;
  if (k.line >= 1) return snap();
  if (k.dist <= 0){ clearInterval(fz.loop); fz.loop = 0; fz.kamp = null; return land(k.id, k.kg); }
  drawFight();
}
function drawFight(){
  const k = fishing && fishing.kamp, pond = panel.querySelector('.pond.kamp'); if (!k || !pond) return;
  const T = FISKE.texter, fish = pond.querySelector('.fisk'), x = 6 + Math.min(1.3, k.dist) / 1.3 * (pond.clientWidth - fish.offsetWidth - 12);
  if (!fish.style.width && fish.naturalWidth) fish.style.width = Math.round(fish.naturalWidth * (.8 + .6 * k.q)) + 'px';
  const y = (pond.clientHeight - fish.offsetHeight) / 2;
  fish.style.left = x + 'px'; fish.style.top = y + 'px';
  Object.assign(pond.querySelector('.lina').style, { width: x + 'px', top: Math.round(y + fish.offsetHeight * .45) + 'px' });
  pond.className = 'pond kamp ' + k.state;
  const bar = panel.querySelector('.kamp-mat .bar');
  bar.querySelector('i').style.width = `calc(${Math.min(1, k.line) * 100}% - 4px)`;
  bar.className = 'bar' + (k.line > .8 ? ' rod' : k.line > .55 ? ' gul' : ' gron');
  const now = performance.now(), first = now - k.start < 1800 ? (k.q > .6 ? T.kampStor : T.kamp) : '';
  const text = k.state === 'akta' ? T.akta : k.state === 'drar' ? T.drar : k.state === 'hoppar' ? T.hoppar : now - k.fast < 900 ? T.forFort : first || T.vevaNu, p = panel.querySelector('.kamp-text');
  if (p.textContent !== text) p.textContent = text;
}
// Each fish in the book has its own picture (CATCH), at its own size so the long pike is not squeezed
const FISH_ICON = {};
const fishIcon = id => FISH_ICON[id] || (FISH_ICON[id] = iconURL(CATCH[id] || FISH, 3));
function renderFishBook(){
  renderRumors();
  const ids = Object.keys(FISKE.fiskar).filter(id => S.fiskbok[id] !== undefined);
  const all = Object.keys(FISKE.fiskar), done = all.filter(id => (S.fiskbok[id] || 0) >= MAXFISK).length;
  // the society's line wraps on its own: the name and what they want, and under it how far he has come (Peter 2026-10-24)
  const head = S.brevFiske ? `<li class="fs-head"><span><b>Fiskesällskapet</b> vill ha tre av varje sort.</span><span class="st">${done} av ${all.length} sorter klara</span></li>` : '';
  $('#fishbook').innerHTML = head + (ids.length
    ? ids.map(id => `<li><span class="fishico"><img class="pix" src="${fishIcon(id)}" alt=""></span><span><b>${esc(FISKE.fiskar[id].namn)}</b> ${esc(FISKE.fiskar[id].text)}${S.rekord[id] !== undefined ? ` <span class="rek">Rekord ${kgText(S.rekord[id])} kg</span>` : ''}</span><span class="st">${S.fiskbok[id] || 0} / ${MAXFISK}</span></li>`).join('')
    : '<li><span>Inga fiskar ännu.</span></li>');
}

/* ---------- locka fram djur ---------- */
// Some animals come out at a place if he offers them something (berattelse.locka). The offer is used up like a bait.
const LOCKA = berattelse.locka || [];
function lureBlock(r){
  if (S.djur.includes(r.djur)) return '';
  const here = S.node === r.plats && !boy.route, has = r.agn.some(id => myLocks().includes(id)) && heard(r.rykten);
  return `<div class="plot"><div><b>${esc(r.rubrik)}</b>${has ? '' : `<span>${esc(r.saknas)}</span>`}</div>${here && has ? `<button class="btn" type="button" data-locka="${r.djur}">${esc(r.knapp)}</button>` : ''}</div>`;
}
function lure(djurId){
  const r = LOCKA.find(x => x.djur === djurId), bait = r && heard(r.rykten) && r.agn.find(id => myLocks().includes(id));
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
  else if (it.antal) S.agnLager[id] = (S.agnLager[id] || 0) + it.antal;
  else if (!it.alltid && !S.saker.includes(id)) S.saker.push(id);
  if (S.agnAnvant.includes(id)) S.agnAnvant = S.agnAnvant.filter(x => x !== id);
}
// The list is grouped by category (as in the bag, then the animals) and can be searched by name
let giveSearch = '';
function giveList(){
  const q = giveSearch.trim().toLowerCase();
  const left = Object.keys(SAKER).filter(id => (SAKER[id].typ === 'djur' ? !S.djur.includes(SAKER[id].djur) : SAKER[id].alltid ? false : SAKER[id].antal || !S.saker.includes(id) || S.agnAnvant.includes(id)) && (!q || SAKER[id].namn.toLowerCase().includes(q)));
  const groups = [...KAT_ORDER, 'djur'].map(k => [k, left.filter(id => (SAKER[id].typ === 'djur' ? 'djur' : katOf(id)) === k)]).filter(([, ids]) => ids.length);
  $('#giveList').innerHTML = groups.map(([k, ids]) => `<p class="sub">${k === 'djur' ? 'Djur' : KAT[k].namn}</p><div class="roads">${ids.map(id => `<button class="btn alt" type="button" data-ge="${id}">${esc(SAKER[id].namn)}</button>`).join('')}</div>`).join('') || '<p>Inget att ge.</p>';
}
function showGive(){
  current = { type: 'give' };
  panel.innerHTML = `<span class="tag">Debug</span><h2>Ge sak</h2><div class="panel-body"><input id="giveSearch" type="search" placeholder="Sök sak" autocomplete="off" style="font:inherit;font-size:10px;padding:6px 8px;background:var(--night);color:var(--text);border:2px solid var(--slate)" value="${esc(giveSearch)}"><div id="giveList"></div><div class="roads"><button class="btn" type="button" data-back="1">Tillbaka</button></div></div>`;
  $('#giveSearch').addEventListener('input', e => { giveSearch = e.target.value; giveList(); });
  giveList();
}
panel.addEventListener('click', ev => { const b = ev.target.closest('button[data-ge]'); if (!b) return; debugGive(b.dataset.ge); renderPack(); renderBook(); toast(`${SAKER[b.dataset.ge].namn} lades till.`); giveList(); });
$('#btnGeRykten').addEventListener('click', () => {
  const keys = [...Object.keys(SAKER).filter(id => SAKER[id].rykte).map(id => 'sak:' + id),
    ...Object.entries(berattelse.platser).flatMap(([id, p]) => [p.rykte && `plats:${id}:dag`, p.rykteNatt && `plats:${id}:natt`].filter(Boolean)),
    ...Object.keys(berattelse.rykten || {}).map(id => 'rykte:' + id)];
  for (const k of keys) if (!S.rykten.includes(k)) S.rykten.push(k);
  renderRumors(); toast('Alla rykten lades i listan.');
});
$('#btnGeFisk').addEventListener('click', () => { for (const id in FISKE.fiskar){ S.fiskbok[id] = Math.min(MAXFISK, (S.fiskbok[id] || 0) + 1); S.rekord[id] = Math.max(S.rekord[id] || 0, weigh(id)); } renderFishBook(); toast('En av varje fisk lades i fiskboken.'); });
$('#btnGe').addEventListener('click', showGive);
$('#btnGeAlla').addEventListener('click', () => { for (const id in SAKER) if (SAKER[id].typ !== 'djur') debugGive(id); renderPack(); toast('Alla saker lades i väskan.'); });
$('#btnGeDjur').addEventListener('click', () => { for (const id in SAKER) if (SAKER[id].typ === 'djur') debugGive(id); for (const id in berattelse.djur) if (!S.djur.includes(id)) S.djur.push(id); renderBook(); toast('Alla djur skrevs in i djurboken.'); });
$('#btnNasta').addEventListener('click', () => { if (window.Musik){ if (!Musik.spelar){ musicSync(); Musik.start(); musicButton(); } else Musik.nasta(); } });
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
  if (S.brevFiske && FS) list.push({ id: 'fiskesallskapet', namn: FS.titel, text: 'Fäst på tältduken bakom lägerelden.' });
  $('#letters').innerHTML = list.map(l => `<li class="readable" data-brev="${l.id}" role="button" tabindex="0" title="Läs brevet"><span><b>${esc(l.namn)}</b> ${esc(l.text)}</span></li>`).join('');
}
const openLetter = li => { if (!li) return; const id = li.dataset.brev; if (id === 'drottningen') showIntro(); else if (id === 'fiskesallskapet') readFishLetter(); else readLetter2(); };
$('#letters').addEventListener('click', ev => openLetter(ev.target.closest('li[data-brev]')));
$('#letters').addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' '){ const li = ev.target.closest('li[data-brev]'); if (li){ ev.preventDefault(); openLetter(li); } } });
$('#btnReset').addEventListener('click', () => {
  stopSaving(); restart(); toast('Kartan är återställd.');
  try { localStorage.removeItem(INTRO_KEY); } catch (e) { /* nothing to clear */ }
  showIntro();
});
function restart(){
  LEVEL = null; $('#dpad').hidden = true; boy.walking = false;
  S = START(); buildBoy(S.pa); boy.route = null; placeBoy(S.node); plotAnim.clear(); gateAnim.clear(); FX.length = 0; buildTerrain();
  lastRevealKey = ''; maskDirty = true; revealAround(boy.x + 8, boy.y + 8);
  cam.follow = true; cam.focus = null; centerOn(boy.x + 8, boy.y + 8, true);
  dlg = null; updateHud(); renderLog(); renderPack(); renderBook(); renderTickets(); renderFishBook(); renderLetters(); renderRumors(); showNode();
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
  if (LEVEL) return levelWalkTo(Math.floor(wx / TS), Math.floor(wy / TS));
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  if (pendingTickets().length && tx === CHEST_AT.x && ty === CHEST_AT.y){ if (S.node === CHEST_AT.node && !boy.route) openChest(); else { walkTo(CHEST_AT.node); toast('Kistan står vid Skolan.'); } return; }
  for (const id in NODES){ const n = NODES[id]; if (nodeShown(id) && Math.abs(wx - (n.x*TS + 8)) < 13 && Math.abs(wy - (n.y*TS + 6)) < 14){ walkTo(id); return; } }
  for (const g of GATES){ if (gateShown(g) && tx === g.x && (ty === g.y || ty === g.y - 1)){ showGate(g); if (S.stars < g.req) toast(`Porten öppnas vid ${g.req} stjärnor. Du har ${S.stars}.`); return; } }
  for (const p of PLOTS){ if (seenAt(p.x + 1, p.y + 1) && tx >= p.x && tx <= p.x + 2 && ty >= p.y - 1 && ty <= p.y + 2){ goPlot(p); return; } }
}
addEventListener('keydown', e => { if (fishing && (fishing.phase === 'vanta' || fishing.phase === 'nu') && (e.key === ' ' || e.key === 'Enter')){ e.preventDefault(); pull(); } });
cv.addEventListener('keydown', e => {
  const dirs = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] };
  const d = dirs[e.key]; if (!d || boy.route || LEVEL) return;
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
// The pictures of the icons. Made once, as soon as something needs them: on a device that remembers the password the runes and
// scrolls open before the map has started, and their story must not show an empty picture (Peter 2026-10-22).
function initIcons(){
  if (STAR_URL) return;
  STAR_URL = iconURL(STAR, 4); DUST_URL = iconURL(DUST, 4); LOCK_URL = iconURL(LOCK, 4); RUNE_URL = iconURL(RUNE, 4); SCROLL_URL = iconURL(SCROLL, 4);
  FISH_BIG = iconURL(FISH, 8); $('#icoFish').src = iconURL(FISH, 4); $('#icoLetter').src = iconURL(ENVELOPE, 3); $('#icoRykten').src = iconURL(RUMOR_ICO, 3);
  TICKET_URL = iconURL(TICKET, 4); RUNE_BIG = iconURL(RUNE, 8); SCROLL_BIG = iconURL(SCROLL, 8); TICKET_BIG = iconURL(TICKET, 8); $('#icoTicket').src = TICKET_URL;
  const pil = iconURL(sprite(["...o...", "..oyo..", ".oyyyo.", "oyyyyyo", "ooooooo"], { o:'#3f2631', y:'#fee761' }), 3);
  document.querySelectorAll('img[data-pil]').forEach(im => { im.src = pil; });
  $('#icoRunes').src = RUNE_URL; $('#icoBag').src = iconURL(BAG, 4); $('#icoBook').src = iconURL(BOOK, 4);
  $('#logoStar').src = STAR_URL; $('#icoStar').src = STAR_URL; $('#icoCoin').src = DUST_URL;
  document.querySelectorAll('img[data-ico]').forEach(im => { im.src = im.dataset.ico === 'star' ? STAR_URL : DUST_URL; });
}
function start(data){
  if (data && data.S) S = data.S;
  placeBoy(S.node); lastRevealKey = ''; revealAround(boy.x + 8, boy.y + 8);
  initIcons();
  buildTerrain();
  resize(); centerOn(boy.x + 8, boy.y + 8, true);
  updateHud(); renderLog(); renderPack(); renderBook(); renderTickets(); renderFishBook(); showNode();
  musicButton(); musicSync(); renderLetters(); renderRumors();
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
