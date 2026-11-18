/* WORLD DOMINION V.I — WD COMMON HELPERS (Build 0.9 fix)
   Dipakai semua halaman baru: login gate, toast, store JSON lokal,
   escaping, format angka/tanggal, info pemain, data peta, berita.
   TIDAK menyentuh core.js atau model save pemain.
*/
window.WD = (function () {
  "use strict";

  // Login gate — pola yang sama seperti world.js
  if (sessionStorage.getItem("wdLoggedIn") !== "yes") { location.replace("index.html"); }

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Number(n || 0).toLocaleString("id-ID");
  const fmtDate = t => new Date(Number(t) || Date.now()).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const uid = p => (p || "id") + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);

  function toast(msg) {
    const el = $("#domain-toast"); if (!el) return;
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  // Store JSON lokal terpisah (bukan objek pemain) — old save tetap bisa dimuat.
  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { toast("Gagal menyimpan data lokal."); return false; }
  }

  function player() { return Game.getPlayer(); }

  function fillPlayerHeader() {
    const p = player();
    const n = $("#domain-player-name"); if (n) n.textContent = p.username;
    const l = $("#domain-player-level"); if (l) l.textContent = "Level " + p.level;
  }

  // Data peta (boleh null kalau data/world-provinces.js belum ada — jangan crash).
  async function worldData() {
    try {
      if (window.WorldLib) { const d = await window.WorldLib.ready; if (d) return d; return window.WorldLib.worldData(); }
    } catch (e) { /* abaikan: peta belum tersedia */ }
    return null;
  }

  function noMapNotice() {
    return '<div class="notice-panel"><b>Peta dunia belum dibangun.</b> Data provinsi belum tersedia di perangkat ini. '
      + 'Buka <a href="world.html">Peta Dunia</a> lalu klik <b>Bangun peta provinsi</b> untuk mengunduh dan membangun peta (±789 provinsi). '
      + 'Sampai peta dibangun, halaman ini hanya menampilkan data yang sudah ada.</div>';
  }

  // Negara yang didirikan pemain ini (founder === username), atau null.
  function myCountry() {
    try {
      const cs = Game.getCountries() || {};
      return Object.values(cs).find(c => c.founder === player().username) || null;
    } catch (e) { return null; }
  }

  // Pintasan aman ke API berita (news.js); diam kalau news.js belum dimuat.
  function newsAdd(title, body, tag) {
    if (window.WDNews && typeof window.WDNews.add === "function") window.WDNews.add(title, body, tag);
  }

  document.addEventListener("DOMContentLoaded", fillPlayerHeader);

  return { $, $$, esc, fmt, fmtDate, uid, toast, load, save, player, fillPlayerHeader, worldData, noMapNotice, myCountry, newsAdd };
})();
