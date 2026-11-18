// Stjärnbläck in the data repo (Peter 2026-11-18). When the practice is done, the ink is saved for the sheet in the private repo
// Real-MrBeam/stjarnkartan-data, in the file stjarnblack.json with one entry per sheet folder: { "antal": 5 | 10, "paborjat": true }.
// It uses the same locked key as the map (#lasNyckel, put in the page by the build and opened with the password), so it only
// works on an unlocked page. The sheet, the practice page and the start page read it, so the stamp shows on every computer, and
// the grading reads the same file. The values only grow: antal keeps the highest, and paborjat (he has started writing on the
// sheet, so no more ink can be loaded) stays true once it is. Without the key (a locked page, or a file opened from the disk)
// nothing is read or written, and the browser's memory is used as before.
//
//   Blackrepo.all()               every sheet's entry, or null without the key or the network
//   Blackrepo.read(dir)           one sheet's entry ({} if it has none), or null
//   Blackrepo.write(dir, patch)   patch { antal } and/or { paborjat: true }, merged into what is there; true when saved
(() => {
  const FILE = "stjarnblack.json";
  const b64 = text => { const bytes = new TextEncoder().encode(text); let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
  const unb64 = data => new TextDecoder().decode(Uint8Array.from(atob(data.replace(/\s/g, "")), c => c.charCodeAt(0)));

  // the key is there once the lock has opened the page (las.js opens every locked element before it says las:unlocked)
  function key() {
    const el = document.getElementById("lasNyckel");
    if (!el || !el.classList.contains("unlocked") || !el.dataset.repo) return null;
    const token = el.textContent.trim();
    return token ? { repo: el.dataset.repo, token } : null;
  }
  function gh(k, method, body) {
    return fetch(`https://api.github.com/repos/${k.repo}/contents/${FILE}`, {
      method, cache: "no-store",
      headers: { Authorization: `Bearer ${k.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: body && JSON.stringify(body),
    });
  }
  async function load(k) {
    const res = await gh(k, "GET");
    if (res.status === 404) return { data: {}, sha: null };
    if (!res.ok) throw new Error("GitHub " + res.status);
    const file = await res.json();
    return { data: JSON.parse(unb64(file.content)) || {}, sha: file.sha };
  }
  // a slow network must not hold up the page: after a few seconds it goes on without the repo
  const soon = (promise, ms = 6000) => Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);

  async function all() {
    const k = key();
    if (!k) return null;
    try { return (await soon(load(k)))?.data ?? null; } catch { return null; }
  }
  async function read(dir) {
    const data = await all();
    return data ? data[dir] || {} : null;
  }
  async function write(dir, patch) {
    const k = key();
    if (!k || !/^[0-9a-z-]+$/.test(dir)) return false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, sha } = await load(k);
        const old = data[dir] || {}, next = { ...old };
        if (patch.antal) next.antal = Math.max(old.antal || 0, patch.antal);
        if (patch.paborjat) next.paborjat = true;
        if (JSON.stringify(next) === JSON.stringify(old)) return true;
        data[dir] = next;
        const res = await gh(k, "PUT", { message: `Stjärnbläck: ${dir}`, content: b64(JSON.stringify(data, null, 2) + "\n"), ...(sha ? { sha } : {}) });
        if (res.ok) return true;
        if (res.status !== 409 && res.status !== 422) return false;   // someone saved in between: read again and merge
      } catch { return false; }
    }
    return false;
  }
  window.Blackrepo = { all, read, write };
})();
