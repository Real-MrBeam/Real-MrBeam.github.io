// Makes a worksheet fillable on screen: answer lines become text fields,
// squared areas become drawing areas, and everything autosaves in the browser.
// Printing still gives the same A4 sheet, now with the answers on it.
(() => {
  const KEY = "matteblad:" + location.pathname;
  const SCALE = 3; // canvas resolution multiplier, keeps drawings sharp in the PDF
  const PEN = { color: "#1d4ed8", width: 2 };
  const ERASE_RADIUS = 9;

  const saved = load();
  const history = []; // undo stack: { type: "draw" | "erase", area, strokes }
  let tool = "pen";

  // Text fields
  const fields = [...document.querySelectorAll(".blank, .grow, .meta .line, .skrivrader")].map((el, i) => {
    const multiline = el.classList.contains("skrivrader");
    const input = document.createElement(multiline ? "textarea" : "input");
    if (!multiline) input.type = "text";
    input.style.cssText = el.style.cssText;
    input.className = el.className + " field";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.value = saved.fields?.[i] ?? "";
    input.addEventListener("input", save);
    el.replaceWith(input);
    return input;
  });

  // Drawing areas
  const areas = [...document.querySelectorAll(".rutor")].map((box, i) => {
    const canvas = document.createElement("canvas");
    box.appendChild(canvas);
    const area = { box, canvas, ctx: canvas.getContext("2d"), strokes: saved.strokes?.[i] ?? [] };
    resize(area);
    bindDrawing(area);
    return area;
  });

  // "Hur kändes bladet?" options
  const opts = [...document.querySelectorAll(".feedback .opt")];
  opts.forEach((opt, i) => {
    opt.classList.toggle("chosen", saved.opt === i);
    opt.addEventListener("click", () => {
      const chosen = !opt.classList.contains("chosen");
      opts.forEach(o => o.classList.remove("chosen"));
      opt.classList.toggle("chosen", chosen);
      save();
    });
  });

  buildToolbar();
  fit();
  window.addEventListener("resize", fit);

  // Scale the A4 pages down when the window is narrower than a page
  function fit() {
    const pageWidth = 210 * 96 / 25.4; // A4 width in CSS px
    const scale = Math.min(1, (document.documentElement.clientWidth - 24) / pageWidth);
    document.documentElement.style.setProperty("--fit", scale.toFixed(3));
  }

  function resize(area) {
    const w = area.box.clientWidth;
    const h = area.box.clientHeight;
    area.canvas.width = Math.round(w * SCALE);
    area.canvas.height = Math.round(h * SCALE);
    area.canvas.style.width = w + "px";
    area.canvas.style.height = h + "px";
    redraw(area);
  }

  function redraw(area) {
    const { ctx, canvas } = area;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = PEN.color;
    ctx.fillStyle = PEN.color;
    ctx.lineWidth = PEN.width;
    area.strokes.forEach(s => drawStroke(ctx, s));
  }

  function drawStroke(ctx, s) {
    if (s.length === 1) {
      ctx.beginPath();
      ctx.arc(s[0][0], s[0][1], PEN.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(s[0][0], s[0][1]);
    for (let k = 1; k < s.length; k++) ctx.lineTo(s[k][0], s[k][1]);
    ctx.stroke();
  }

  function bindDrawing(area) {
    const { canvas } = area;
    let current = null;

    const point = e => {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.clientWidth / r.width; // undo browser zoom differences
      const sy = canvas.clientHeight / r.height;
      return [Math.round((e.clientX - r.left) * sx * 10) / 10, Math.round((e.clientY - r.top) * sy * 10) / 10];
    };

    const erase = p => {
      const removed = area.strokes.filter(s =>
        s.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < ERASE_RADIUS));
      if (!removed.length) return;
      area.strokes = area.strokes.filter(s => !removed.includes(s));
      history.push({ type: "erase", area, strokes: removed });
      redraw(area);
    };

    canvas.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      const p = point(e);
      if (tool === "erase") { erase(p); current = "erase"; return; }
      current = [p];
      area.strokes.push(current);
      redraw(area);
    });

    canvas.addEventListener("pointermove", e => {
      if (!current) return;
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (current === "erase") { events.forEach(ev => erase(point(ev))); return; }
      events.forEach(ev => current.push(point(ev)));
      redraw(area);
    });

    const end = () => {
      if (!current) return;
      if (current !== "erase") history.push({ type: "draw", area, strokes: [current] });
      current = null;
      save();
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  function undo() {
    const step = history.pop();
    if (!step) return;
    const { area } = step;
    if (step.type === "draw") area.strokes = area.strokes.filter(s => !step.strokes.includes(s));
    else area.strokes.push(...step.strokes);
    redraw(area);
    save();
  }

  function clearAll() {
    if (!confirm("Vill du sudda ut allt du har skrivit och ritat på bladet?")) return;
    fields.forEach(f => (f.value = ""));
    areas.forEach(a => { a.strokes = []; redraw(a); });
    opts.forEach(o => o.classList.remove("chosen"));
    history.length = 0;
    save();
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }

  function save() {
    const data = {
      fields: fields.map(f => f.value),
      strokes: areas.map(a => a.strokes),
      opt: opts.findIndex(o => o.classList.contains("chosen")),
    };
    let ok = true;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { ok = false; }
    const status = document.querySelector(".fill-bar .status");
    if (status) status.textContent = ok ? "Sparat" : "Kunde inte spara";
  }

  function buildToolbar() {
    const bar = document.createElement("div");
    bar.className = "fill-bar";
    bar.innerHTML = `
      <div class="tools">
        <button type="button" data-tool="pen" class="on">Penna</button>
        <button type="button" data-tool="erase">Sudd</button>
        <button type="button" data-act="undo">Ångra</button>
        <button type="button" data-act="clear" class="quiet">Rensa allt</button>
      </div>
      <span class="hint">Skriv svaren på linjerna. Räkna och rita i rutorna. <span class="status">Allt sparas automatiskt</span></span>
      <button type="button" data-act="done" class="done">Klar! Spara som PDF</button>`;
    document.body.prepend(bar);

    const dialog = document.createElement("dialog");
    dialog.className = "fill-dialog";
    dialog.innerHTML = `
      <h2>Bra jobbat!</h2>
      <ol>
        <li>Tryck på <b>Fortsätt</b>. Ett utskriftsfönster öppnas.</li>
        <li>Välj <b>Spara som PDF</b> där det står Skrivare eller Mål.</li>
        <li>Tryck på <b>Spara</b> och välj var filen ska hamna.</li>
        <li>Skicka filen hem.</li>
      </ol>
      <div class="row">
        <button type="button" data-act="cancel" class="quiet">Tillbaka</button>
        <button type="button" data-act="print" class="done">Fortsätt</button>
      </div>`;
    document.body.append(dialog);

    bar.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.tool) {
        tool = b.dataset.tool;
        bar.querySelectorAll("[data-tool]").forEach(x => x.classList.toggle("on", x === b));
        document.body.classList.toggle("erasing", tool === "erase");
      }
      if (b.dataset.act === "undo") undo();
      if (b.dataset.act === "clear") clearAll();
      if (b.dataset.act === "done") dialog.showModal();
    });

    dialog.addEventListener("click", e => {
      const act = e.target.closest("button")?.dataset.act;
      if (act === "cancel") dialog.close();
      if (act === "print") { dialog.close(); setTimeout(() => window.print(), 50); }
    });
  }
})();
