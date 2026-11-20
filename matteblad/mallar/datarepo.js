// What the pages save in the private repo Real-MrBeam/stjarnkartan-data, with the same locked key as the map (#lasNyckel, put in
// the page by the build and opened with the password), so it only works on an unlocked page. Without the key (a locked page, or a
// file opened from the disk) nothing is read or written, and the browser's memory is used as before. Two files, and the values
// in both only grow:
//
// Stjärnbläck (Peter 2026-11-18): stjarnblack.json, one entry per sheet folder: { "antal": 5 | 10, "paborjat": true }. When the
// practice is done, the ink is saved for the sheet. The sheet, the practice page and the start page read it, so the stamp shows
// on every computer, and the grading reads the same file. antal keeps the highest, and paborjat (he has started writing on the
// sheet, so no more ink can be loaded) stays true once it is.
//
//   Blackrepo.all()               every sheet's entry, or null without the key or the network
//   Blackrepo.read(dir)           one sheet's entry ({} if it has none), or null
//   Blackrepo.write(dir, patch)   patch { antal } and/or { paborjat: true }, merged into what is there; true when saved
//
// The training page (Peter 2026-11-20): traning.json, which sorts he has mastered (5 of 5 right at the first try, without help):
// { "ganger": { "klarad": "2026-11-20" } }. A sort that is klarad stays klarad, with the first date, so the gold frame shows on
// every device.
//
//   Traningrepo.all()             every sort's entry, or null without the key or the network
//   Traningrepo.klarad(sorts)     sorts { id: "2026-11-20" }, merged into what is there (the earliest date stays); true when saved
(() => {
  const b64 = text => { const bytes = new TextEncoder().encode(text); let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
  const unb64 = data => new TextDecoder().decode(Uint8Array.from(atob(data.replace(/\s/g, "")), c => c.charCodeAt(0)));

  // the key is there once the lock has opened the page (las.js opens every locked element before it says las:unlocked)
  function key() {
    const el = document.getElementById("lasNyckel");
    if (!el || !el.classList.contains("unlocked") || !el.dataset.repo) return null;
    const token = el.textContent.trim();
    return token ? { repo: el.dataset.repo, token } : null;
  }
  function gh(k, file, method, body) {
    return fetch(`https://api.github.com/repos/${k.repo}/contents/${file}`, {
      method, cache: "no-store",
      headers: { Authorization: `Bearer ${k.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: body && JSON.stringify(body),
    });
  }
  async function load(k, file) {
    const res = await gh(k, file, "GET");
    if (res.status === 404) return { data: {}, sha: null };
    if (!res.ok) throw new Error("GitHub " + res.status);
    const json = await res.json();
    return { data: JSON.parse(unb64(json.content)) || {}, sha: json.sha };
  }
  // a slow network must not hold up the page: after a few seconds it goes on without the repo
  const soon = (promise, ms = 6000) => Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);

  async function all(file) {
    const k = key();
    if (!k) return null;
    try { return (await soon(load(k, file)))?.data ?? null; } catch { return null; }
  }
  // Reads the file, lets change() merge into it and saves. change returns false when nothing changes, and then nothing is written.
  async function update(file, message, change) {
    const k = key();
    if (!k) return false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, sha } = await load(k, file);
        if (!change(data)) return true;
        const res = await gh(k, file, "PUT", { message, content: b64(JSON.stringify(data, null, 2) + "\n"), ...(sha ? { sha } : {}) });
        if (res.ok) return true;
        if (res.status !== 409 && res.status !== 422) return false;   // someone saved in between: read again and merge
      } catch { return false; }
    }
    return false;
  }

  const BLACK = "stjarnblack.json";
  window.Blackrepo = {
    all: () => all(BLACK),
    async read(dir) {
      const data = await all(BLACK);
      return data ? data[dir] || {} : null;
    },
    write(dir, patch) {
      if (!/^[0-9a-z-]+$/.test(dir)) return Promise.resolve(false);
      return update(BLACK, `Stjärnbläck: ${dir}`, data => {
        const old = data[dir] || {}, next = { ...old };
        if (patch.antal) next.antal = Math.max(old.antal || 0, patch.antal);
        if (patch.paborjat) next.paborjat = true;
        if (JSON.stringify(next) === JSON.stringify(old)) return false;
        data[dir] = next;
        return true;
      });
    }
  };

  const TRANING = "traning.json";
  window.Traningrepo = {
    all: () => all(TRANING),
    klarad(sorts) {
      const ok = Object.entries(sorts || {}).filter(([id, datum]) => /^[a-z]+$/.test(id) && /^\d{4}-\d{2}-\d{2}$/.test(datum));
      if (!ok.length) return Promise.resolve(false);
      return update(TRANING, `Träning klarad: ${ok.map(([id]) => id).join(", ")}`, data => {
        let changed = false;
        for (const [id, datum] of ok) {
          const old = data[id] || {};
          if (old.klarad && old.klarad <= datum) continue;
          data[id] = { ...old, klarad: datum };
          changed = true;
        }
        return changed;
      });
    }
  };
})();
