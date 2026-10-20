// Browser side of the lock (see verktyg/las.mjs for the format and the reasoning).
//
// Elements like <div class="las" data-enc="v1...."> hold locked content. When the password has been typed,
// the private key is opened and every locked element is replaced with its decrypted HTML. The opened key is
// kept on this device as a non-extractable CryptoKey in IndexedDB, so the password is asked once per device.
// Add data-las="path/to/las.json" on the script tag. After unlocking, a "las:unlocked" event is dispatched.
(() => {
  const SCRIPT = document.currentScript;
  const CONFIG_URL = SCRIPT?.dataset.las || "las/las.json";
  const DB_NAME = "matteblad-las";
  const STORE = "keys";
  const KEY_NAME = "private";

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const fromB64 = text => Uint8Array.from(atob(text), char => char.charCodeAt(0));
  const rsa = { name: "RSA-OAEP", hash: "SHA-256" };

  let config = null; // las.json
  let stored = null; // { id, key } for the private key on this device
  let memoryOnly = null; // used if IndexedDB is not available

  // Key storage

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function readStored() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const request = db.transaction(STORE).objectStore(STORE).get(KEY_NAME);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return memoryOnly;
    }
  }

  async function writeStored(value) {
    memoryOnly = value;
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        value ? tx.objectStore(STORE).put(value, KEY_NAME) : tx.objectStore(STORE).delete(KEY_NAME);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  async function loadConfig() {
    if (!config) config = await (await fetch(CONFIG_URL, { cache: "no-cache" })).json();
    return config;
  }

  // Crypto

  async function unlock(password) {
    if (!window.crypto?.subtle) throw Object.assign(new Error("Låset kräver en säker anslutning (https)"), { code: "insecure" });
    const lock = await loadConfig();
    const base = await crypto.subtle.importKey("raw", encoder.encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
    const aes = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: fromB64(lock.kdf.salt), iterations: lock.kdf.iterations },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    let pkcs8;
    try {
      pkcs8 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(lock.wrapped.iv) }, aes, fromB64(lock.wrapped.data));
    } catch {
      throw Object.assign(new Error("Fel lösenord"), { code: "wrong-password" });
    }
    const key = await crypto.subtle.importKey("pkcs8", pkcs8, rsa, false, ["decrypt"]); // not extractable
    stored = { id: lock.id, key };
    await writeStored(stored);
  }

  async function decrypt(blob) {
    const [version, id, wrappedKey, iv, data] = blob.split(".");
    if (version !== "v1") throw new Error("Okänt format");
    if (!stored || stored.id !== id) throw Object.assign(new Error("Fel nyckel"), { code: "key-mismatch" });
    const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, stored.key, fromB64(wrappedKey));
    const aes = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    return decoder.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, aes, fromB64(data)));
  }

  async function forget() {
    stored = null;
    await writeStored(null);
  }

  // Page

  async function showAll() {
    const locked = [...document.querySelectorAll(".las[data-enc]:not(.unlocked)")];
    if (!locked.length) return;
    let failed = false;
    for (const el of locked) {
      try {
        el.innerHTML = await decrypt(el.dataset.enc);
        el.classList.add("unlocked");
      } catch (error) {
        failed = true;
        if (error.code === "key-mismatch") await forget();
      }
    }
    updatePill();
    if (!failed || document.querySelector(".las.unlocked")) document.dispatchEvent(new CustomEvent("las:unlocked"));
  }

  const STYLE = `
    .las-pill { position: fixed; top: 10px; right: 10px; z-index: 50; display: flex; align-items: center; gap: 6px;
                font: 600 14px "Segoe UI", Arial, sans-serif; padding: 6px 14px; border-radius: 999px; cursor: pointer;
                background: #fff; color: #555; border: 2px solid #c9d3df; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
    .las-pill.open { color: #2e7d32; border-color: #9ccc9c; }
    .las-locked { background: #fff; border-radius: 16px; padding: 28px 24px; text-align: center; color: #444;
                  box-shadow: 0 2px 8px rgba(0,0,0,.08); border: 2px dashed #c9d3df; }
    .las-locked svg { color: #8a6a00; }
    .las-locked p { margin: 6px 0; }
    .las-locked button, .las-dialog button.las-go { font: inherit; font-weight: 700; margin-top: 10px; padding: 10px 22px;
                  border-radius: 999px; border: 2px solid #3f9a3a; background: #3f9a3a; color: #fff; cursor: pointer; }
    .las.prizeslot { display: flex; }
    .las-slot { flex: 1; min-height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center;
                gap: 4px; font: 700 14px "Segoe UI", Arial, sans-serif; color: #8a6a00; background: #fffdf3; cursor: pointer;
                border: 3px dashed #d4a72c; border-radius: 14px; }
    .las-dialog { border: 0; border-radius: 16px; padding: 24px 28px; max-width: 380px; width: calc(100% - 32px);
                  font: 16px "Segoe UI", Arial, sans-serif; box-shadow: 0 10px 40px rgba(0,0,0,.3); }
    .las-dialog::backdrop { background: rgba(0,0,0,.45); }
    .las-dialog h2 { margin: 0 0 6px; color: #2a75bb; font-size: 22px; }
    .las-dialog p { margin: 0 0 12px; color: #555; }
    .las-dialog input { width: 100%; box-sizing: border-box; font: inherit; padding: 10px 12px; border-radius: 10px; border: 2px solid #c9d3df; }
    .las-dialog input:focus { outline: none; border-color: #2a75bb; }
    .las-dialog .las-error { color: #b3261e; min-height: 1.4em; margin: 8px 0 0; font-weight: 600; }
    .las-dialog .las-row { display: flex; justify-content: flex-end; gap: 10px; }
    .las-dialog button.las-cancel { font: inherit; font-weight: 600; margin-top: 10px; padding: 10px 18px; border-radius: 999px;
                  border: 2px solid #bbb; background: #fff; color: #666; cursor: pointer; }
    .las-dialog button:disabled { opacity: .6; cursor: wait; }`;

  let dialog;
  let pill;

  function buildDialog() {
    dialog = document.createElement("dialog");
    dialog.className = "las-dialog";
    dialog.innerHTML = `
      <form method="dialog">
        <h2>Skriv lösenordet</h2>
        <p>Det behövs bara en gång på den här datorn.</p>
        <input type="text" name="username" value="matteblad" autocomplete="username" hidden>
        <input type="password" name="password" autocomplete="current-password" aria-label="Lösenord" required>
        <p class="las-error" role="alert"></p>
        <div class="las-row">
          <button type="button" class="las-cancel">Avbryt</button>
          <button type="submit" class="las-go">Lås upp</button>
        </div>
      </form>`;
    document.body.append(dialog);
    const form = dialog.querySelector("form");
    const input = form.elements.password;
    const error = dialog.querySelector(".las-error");
    const go = dialog.querySelector(".las-go");
    dialog.querySelector(".las-cancel").addEventListener("click", () => dialog.close());
    form.addEventListener("submit", async event => {
      event.preventDefault();
      error.textContent = "";
      go.disabled = true;
      go.textContent = "Låser upp...";
      try {
        await unlock(input.value);
        input.value = "";
        dialog.close();
        await showAll();
      } catch (problem) {
        error.textContent = problem.code === "wrong-password" ? "Fel lösenord. Försök igen."
          : problem.code === "insecure" ? problem.message : "Det gick inte att låsa upp.";
        input.select();
      } finally {
        go.disabled = false;
        go.textContent = "Lås upp";
      }
    });
  }

  function ask() {
    if (!dialog) buildDialog();
    dialog.querySelector(".las-error").textContent = "";
    if (!dialog.open) dialog.showModal();
    dialog.querySelector("input[name=password]").focus();
  }

  const LOCK_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

  function updatePill() {
    if (!pill) return;
    const open = Boolean(stored);
    pill.className = "las-pill" + (open ? " open" : "");
    pill.innerHTML = `${LOCK_ICON}${open ? "Upplåst · Lås" : "Låst"}`;
  }

  async function start() {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.append(style);

    document.addEventListener("click", event => {
      if (event.target.closest("[data-las-open]")) ask();
    });

    if (!document.querySelector(".las")) return;
    pill = document.createElement("button");
    pill.type = "button";
    pill.addEventListener("click", async () => {
      if (stored) { await forget(); location.reload(); } else ask();
    });
    document.body.append(pill);
    updatePill();

    try {
      const lock = await loadConfig();
      stored = await readStored();
      if (stored && stored.id !== lock.id) await forget();
    } catch {
      stored = null;
    }
    updatePill();
    await showAll();
  }

  window.Las = { unlock, decrypt, forget, ask, isUnlocked: () => Boolean(stored) };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
