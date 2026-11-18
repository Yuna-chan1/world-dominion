/* WORLD DOMINION V.I — PESAN PRIBADI (Build 0.9 fix)
   Store lokal: wdMessages. Pesan hanya tersimpan di perangkat ini
   (prototipe pemain tunggal) — bukan pesan ke pemain lain di server.
*/
(function () {
  "use strict";
  const KEY = "wdMessages";
  const me = () => Game.getPlayer().username;
  let openWith = null;

  const load = () => WD.load(KEY, []);
  const save = v => WD.save(KEY, v);

  function seed() {
    const items = load();
    if (items.length) return;
    save([{ id: WD.uid("msg"), from: "Sistem", to: me(), text: "Selamat datang di Pesan Pribadi. Tulis pesan ke pemain lain dengan nama karakternya di atas. Catatan: ini prototipe lokal — pesan hanya tersimpan di perangkat ini dan belum terkirim ke pemain lain.", at: Date.now() }]);
  }

  function correspondent(m) { return m.from === me() ? m.to : m.from; }

  function renderThreads() {
    const el = document.getElementById("threads-list"); if (!el) return;
    const items = load().slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    const stat = document.getElementById("stat-messages"); if (stat) stat.textContent = items.length + " pesan";
    const seen = new Map();
    items.forEach(m => { const c = correspondent(m); if (!seen.has(c)) seen.set(c, m); });
    el.innerHTML = seen.size ? Array.from(seen.entries()).map(([who, last]) =>
      '<div class="wd-row wd-click" data-thread="' + WD.esc(who) + '"><div><b>' + WD.esc(who) + '</b><small>' + WD.esc(last.from === me() ? "Kamu: " : last.from + ": ") + WD.esc((last.text || "").slice(0, 80)) + '<br>' + WD.fmtDate(last.at) + '</small></div><span class="wd-tag">Buka</span></div>'
    ).join("") : '<p class="muted">Belum ada percakapan.</p>';
    WD.$$("[data-thread]", el).forEach(row => row.addEventListener("click", () => openThread(row.getAttribute("data-thread"))));
  }

  function openThread(who) {
    openWith = who;
    const view = document.getElementById("thread-view"); if (!view) return;
    view.classList.remove("hidden");
    document.getElementById("thread-with").textContent = "Percakapan dengan " + who;
    const msgs = load().filter(m => correspondent(m) === who).sort((a, b) => (a.at || 0) - (b.at || 0));
    const box = document.getElementById("thread-messages");
    box.innerHTML = msgs.map(m =>
      '<div class="wd-chat-msg"><b>' + WD.esc(m.from) + '</b> ' + WD.esc(m.text) + '<small>' + WD.fmtDate(m.at) + '</small></div>'
    ).join("");
    box.scrollTop = box.scrollHeight;
    renderThreads();
  }

  function send(to, text) {
    to = (to || "").trim(); text = (text || "").trim();
    if (!to || !text) { WD.toast("Isi nama penerima dan isi pesan."); return false; }
    if (to === me()) { WD.toast("Kamu tidak bisa mengirim pesan ke dirimu sendiri."); return false; }
    const items = load();
    items.push({ id: WD.uid("msg"), from: me(), to, text: text.slice(0, 1000), at: Date.now() });
    save(items); return true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("threads-list")) return;
    seed(); renderThreads();
    document.getElementById("compose-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const to = document.getElementById("msg-to").value;
      const text = document.getElementById("msg-text").value;
      if (send(to, text)) { ev.target.reset(); WD.toast("Pesan tersimpan (lokal)."); openThread(to.trim()); }
    });
    document.getElementById("thread-reply-form").addEventListener("submit", ev => {
      ev.preventDefault();
      if (!openWith) { WD.toast("Buka dulu sebuah percakapan."); return; }
      const text = document.getElementById("thread-reply").value;
      if (send(openWith, text)) { ev.target.reset(); openThread(openWith); }
    });
  });
})();
