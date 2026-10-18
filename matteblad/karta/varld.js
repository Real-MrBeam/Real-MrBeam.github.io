// Builds the world of the star map from data/karta.json (geometry) and data/berattelse.json (names, texts, costs).
// Works both in the browser (global Varld) and in Node (require), so the same code can be tested.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Varld = factory();
})(typeof self !== "undefined" ? self : globalThis, function () {
  // A cell in a building or object is a tile number (the main tileset), a text "o:14,10" (column and row in the tileset
  // called o), or a list of those drawn on top of each other (a window on a wall). -1 means empty.
  const filled = i => typeof i === "string" || Array.isArray(i) || i >= 0;

  function byggVarld(karta, berattelse) {
    const TS = karta.ruta, MW = karta.bredd, MH = karta.hojd;
    const M = Array.from({ length: MH }, () => new Array(MW).fill(karta.grundmark));
    const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
    const at = (x, y) => (inb(x, y) ? M[y][x] : null);
    const key = (x, y) => x + "," + y;
    function fillR(x0, y0, x1, y1, v) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) M[y][x] = v; }
    function ell(cx, cy, rx, ry, v) {
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) M[y][x] = v;
      }
    }

    // Ground: forests, clearings, in the order given by the data
    for (const form of karta.mark) {
      if (form.rektangel) fillR(...form.rektangel, form.typ);
      else if (form.ellips) ell(...form.ellips, form.typ);
      else throw new Error("Okänd form i karta.json mark");
    }

    // Water: a lake, a river along x and a channel along y
    const { sjo, alv, kanal } = karta.vatten;
    const LAKE = { cx: sjo.cx * TS, cy: sjo.cy * TS, rx: sjo.rx * TS, ry: sjo.ry * TS };
    function waterD(X, Y) {
      const ex = (X - LAKE.cx) / LAKE.rx, ey = (Y - LAKE.cy) / LAKE.ry;
      const wob = Math.sin(Math.atan2(ey, ex) * 5 + 1) * 0.05 + Math.sin(Math.atan2(ey, ex) * 3) * 0.03;
      let d = (1 + wob - Math.hypot(ex, ey)) * LAKE.ry;
      const rc = alv.x * TS + Math.sin(Y / 41) * 4 + Math.sin(Y / 17 + 1) * 1.5;
      d = Math.max(d, alv.bredd + Math.sin(Y / 29 + 2) * 2 - Math.abs(X - rc));
      if (X > kanal.x0 * TS && X < kanal.x1 * TS) {
        const sc = kanal.y * TS + Math.sin(X / 11) * 1.5;
        d = Math.max(d, kanal.bredd - Math.abs(Y - sc));
      }
      return d;
    }
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (waterD(x * TS + 8, y * TS + 8) > 0) M[y][x] = "w";

    // Places: geometry from karta.json, name and text from berattelse.json
    const NODES = {};
    for (const p of karta.platser) {
      const story = berattelse.platser[p.id];
      if (!story) throw new Error(`Platsen ${p.id} saknas i berattelse.json`);
      NODES[p.id] = { x: p.x, y: p.y, name: story.namn, text: story.text, ...(p.etikettOver ? { labelAbove: true } : {}), ...(p.dold ? { hidden: true } : {}), id: p.id };
    }

    // Roads between places, with an optional star gate. Bridges where a road crosses water.
    const EDGES = karta.vagar.map(v => {
      const e = { a: v.a, b: v.b, pts: v.punkter };
      if (v.port) {
        const rule = berattelse.portar[`${v.a}|${v.b}`];
        if (!rule) throw new Error(`Porten ${v.a}|${v.b} saknas i berattelse.json`);
        e.gate = { x: v.port.x, y: v.port.y, req: rule.stjarnor };
      }
      return e;
    });
    for (const e of EDGES) {
      const tiles = [];
      for (let i = 0; i < e.pts.length - 1; i++) {
        let [x, y] = e.pts[i];
        const [x2, y2] = e.pts[i + 1];
        const dx = Math.sign(x2 - x), dy = Math.sign(y2 - y);
        if (i === 0) tiles.push([x, y]);
        while (x !== x2 || y !== y2) { x += dx; y += dy; tiles.push([x, y]); }
      }
      e.tiles = tiles;
      // A tile can belong to two roads (a stop on a bridge), so a bridge stays a bridge
      for (const [x, y] of tiles) M[y][x] = M[y][x] === "w" || M[y][x] === "b" ? "b" : "p";
      if (e.gate) e.gate.edge = e;
    }
    const GATES = EDGES.filter(e => e.gate).map(e => e.gate);

    // Building plots
    const PLOTS = karta.tomter.map(t => {
      const story = berattelse.tomter[t.id];
      if (!story) throw new Error(`Tomten ${t.id} saknas i berattelse.json`);
      // A plot that is already built (the cottage) has a fixed building. Every other plot is a build with two
      // alternatives in berattelse.bygg, and the player chooses one.
      if (story.byggd) return { id: t.id, node: t.plats, x: t.x, y: t.y, name: story.namn, cost: story.kostnad, item: t.byggnad, prebuilt: true };
      const bygg = berattelse.bygg[story.bygg];
      if (!bygg) throw new Error(`Tomten ${t.id} pekar på bygget ${story.bygg} som saknas i berattelse.json`);
      return { id: t.id, node: t.plats, x: t.x, y: t.y, name: story.namn, cost: Math.min(...bygg.val.map(v => v.kostnad)), bygg: story.bygg, ...(t.tom ? { tom: t.tom } : {}), ...(t.skog ? { skog: true } : {}) };
    });
    for (const p of PLOTS) fillR(p.x, p.y, p.x + 2, p.y + 2, "g");
    const ITEMS = karta.byggnader;
    const EMPTY_PLOT = karta.tomTomt;

    // Fixed objects on the map, and the tiles that are taken
    const OBJ = [];
    const occ = new Set();
    function put(i, x, y) { OBJ.push({ i, x, y }); occ.add(key(x, y)); }
    function block(rows, x, y) {
      rows.forEach((r, dy) => r.forEach((i, dx) => { if (filled(i)) put(i, x + dx, y + dy); else occ.add(key(x + dx, y + dy)); }));
    }
    for (const f of [...karta.fasta, ...(karta.dekor || [])]) {
      if (f.block) block(f.block, f.x, f.y);
      else if (f.put) put(...f.put);
      else throw new Error("Okänt objekt i karta.json fasta");
    }
    for (const [x0, y0, x1, y1] of karta.reserverat) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) occ.add(key(x, y));
    for (const p of PLOTS) for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) occ.add(key(p.x + dx, p.y + dy));
    for (const k in NODES) occ.add(key(NODES[k].x, NODES[k].y));

    const CASTLE = karta.slott.rutor, CASTLE_X = karta.slott.px, CASTLE_Y = karta.slott.py;
    const FLAGS = karta.flaggor.map(f => ({ x: f.x, y: f.y }));

    return { M, inb, at, key, occ, OBJ, put, NODES, EDGES, GATES, PLOTS, ITEMS, EMPTY_PLOT, CASTLE, CASTLE_X, CASTLE_Y, FLAGS, waterD, LAKE };
  }

  return { byggVarld, filled };
});
