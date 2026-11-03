// Stjärnbläck (Peter 2026-10-31): before he starts a sheet he can practise 5 or 10 tasks on the practice page. 5 give +1 and
// 10 give +2 stardust for every task with a bläckdroppe (class "droppe" on the task) and at least one right answer. The ink is kept in this browser
// under matteblad:stjarnblack:<sheet> and shown as a stamp in the name row, which prints with the sheet, so the correction
// sees it. Ink can only be loaded before anything is written on the sheet. Only sheets with <meta name="stjarnblack"> use it.
(() => {
  const meta = document.querySelector('meta[name="stjarnblack"]');
  const tabell = document.querySelector('meta[name="stjarnblack-tabell"]');
  if (!meta) return;
  const dir = location.pathname.split("/").slice(-2, -1)[0];
  const INK = "matteblad:stjarnblack:" + dir;
  const get = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const ink = Number(get(INK)) || 0;

  // the same key as ifyllbar.js: has he written or drawn anything on the sheet yet?
  const started = () => {
    try {
      const s = JSON.parse(get("matteblad:" + location.pathname)) || {};
      return (s.fields || []).some(v => v) || (s.strokes || []).some(a => a.length) || s.opt >= 0;
    } catch { return false; }
  };

  if (ink) {
    const stamp = document.createElement("span");
    stamp.className = "blackstampel";
    stamp.innerHTML = `<b>${ink >= 10 ? "✦✦" : "✦"}</b> Stjärnbläck: ${ink} övningar`;
    document.querySelector(".meta")?.append(stamp);
    return;
  }
  if (started()) return;

  // on screen only: an offer to load ink first, which goes away once he starts writing
  const box = document.createElement("div");
  box.className = "black-erbjud";
  box.innerHTML = `
    <b>Ladda stjärnbläck innan du börjar?</b>
    <span>Öva 5 tal så ger varje uppgift med bläckdroppe +1 stjärnstoft om du har minst ett rätt på den. Öva 10 så ger den +2.</span>
    <a href="../../uppstallning/index.html?blad=${encodeURIComponent(dir)}&typ=${encodeURIComponent(meta.content)}${tabell ? `&tabell=${encodeURIComponent(tabell.content)}` : ""}">Öva först</a>
    <button type="button">Hoppa över</button>`;
  box.querySelector("button").onclick = () => box.remove();
  document.body.prepend(box);
  document.addEventListener("input", () => box.remove(), { once: true });
})();
