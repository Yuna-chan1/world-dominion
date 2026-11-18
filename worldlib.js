/* WORLD DOMINION V.I — WORLD LIB BUILD 0.8
   Fungsi bersama untuk Dashboard dan Peta Dunia: statistik simulasi wilayah, jarak, bendera, penempatan awal acak.
   Statistik (penduduk, sumber daya, pajak, konflik, embargo) adalah DATA SIMULASI deterministik dari id wilayah;
   hanya batas geografis dan nama wilayah yang berasal dari data dunia nyata (Natural Earth).
*/
window.WorldLib = (function () {
  "use strict";
  function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const toRad = d => d * Math.PI / 180;
  function haversine(lat1, lon1, lat2, lon2) {
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  const flag = iso2 => /^[A-Z]{2}$/.test(iso2 || "") ? String.fromCodePoint(...[...iso2].map(c => 127397 + c.charCodeAt(0))) : "🏳️";
  const norm = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const POOLS = {
    tropic: ["Kayu", "Kapas", "Gandum", "Minyak", "Tembaga", "Batu"],
    temperate: ["Gandum", "Besi", "Batu bara", "Batu", "Kapas", "Tembaga", "Minyak", "Kayu"],
    cold: ["Kayu", "Minyak", "Batu bara", "Besi", "Batu", "Gandum"]
  };

  function decorate(raw) {
    const r = Object.assign({}, raw);
    const rnd = rng(hash(r.id));
    const absLat = Math.abs(r.lat);
    const pool = (absLat < 23 ? POOLS.tropic : absLat < 50 ? POOLS.temperate : POOLS.cold).slice();
    const count = 2 + Math.floor(rnd() * 3);
    r.resources = {};
    for (let i = 0; i < count && pool.length; i++) r.resources[pool.splice(Math.floor(rnd() * pool.length), 1)[0]] = 35 + Math.floor(rnd() * 460);
    // Dunia dimulai dari NOL: tidak ada penduduk, perusahaan, infrastruktur, pemerintahan, perang, atau embargo.
    // Semuanya tumbuh dari tindakan pemain. Hanya sumber daya alam (kandungan tanah) yang sudah ada sejak awal.
    r.city = r.city || r.name;
    r.capacity = 0; r.cityScore = "0.0";
    r.infrastructure = { hospital: 0, education: 0, military: 0, industry: 0, electricity: 0 };
    r.politics = { government: "Belum ada pemerintahan", form: "Belum terbentuk", incomeTax: 5, productionTax: 5, importTax: 5, exportTax: 5 };
    r.border = "Terbuka"; r.conflict = false; r.embargo = false; r.trade = 0;
    r.flag = flag(r.iso2);
    return r;
  }

  // Pilih negara dengan bobot akar jumlah provinsi (agar negara kecil tetap punya peluang), lalu provinsi acak di dalamnya.
  // Saat ini hanya Indonesia yang dibuka; wilayah lain tampil "terkunci".
  const UNLOCKED_ISO = ["IDN"];
  const isUnlocked = r => !!r && UNLOCKED_ISO.indexOf(r.iso) !== -1;

  // Bendera buatan pemain: pola + dua warna (SVG murni, tanpa gambar eksternal).
  const FLAG_PATTERNS = { h2: "Dua pita horizontal", h3: "Tiga pita horizontal", v3: "Tiga pita vertikal", cross: "Salib Nordik", disc: "Lingkaran", diag: "Diagonal" };
  function flagInner(f) {
    const a = f.c1 || "#c8102e", b = f.c2 || "#ffffff";
    switch (f.pattern) {
      case "h3": return `<rect width="30" height="20" fill="${a}"/><rect y="6.67" width="30" height="6.67" fill="${b}"/>`;
      case "v3": return `<rect width="30" height="20" fill="${b}"/><rect width="10" height="20" fill="${a}"/><rect x="20" width="10" height="20" fill="${a}"/>`;
      case "cross": return `<rect width="30" height="20" fill="${a}"/><rect x="8" width="4.5" height="20" fill="${b}"/><rect y="7.75" width="30" height="4.5" fill="${b}"/>`;
      case "disc": return `<rect width="30" height="20" fill="${a}"/><circle cx="15" cy="10" r="5.5" fill="${b}"/>`;
      case "diag": return `<rect width="30" height="20" fill="${a}"/><path d="M0 20L30 0V20Z" fill="${b}"/>`;
      default: return `<rect width="30" height="10" fill="${a}"/><rect y="10" width="30" height="10" fill="${b}"/>`;
    }
  }
  const flagSvg = (f, width = 36) => `<svg class="flag-svg" viewBox="0 0 30 20" width="${width}" height="${Math.round(width * 2 / 3)}" xmlns="http://www.w3.org/2000/svg"><g>${flagInner(f || {})}</g><rect width="30" height="20" fill="none" stroke="#0008" stroke-width=".8"/></svg>`;

  function pickStartRegion(all) {
    const list = (all || []).filter(isUnlocked);
    if (!list.length) return null;
    const groups = new Map(); list.forEach(r => { if (!groups.has(r.country)) groups.set(r.country, []); groups.get(r.country).push(r); });
    const entries = [...groups.values()]; const weights = entries.map(g => Math.sqrt(g.length)); let roll = Math.random() * weights.reduce((s, w) => s + w, 0);
    for (let i = 0; i < entries.length; i++) { roll -= weights[i]; if (roll <= 0) return entries[i][Math.floor(Math.random() * entries[i].length)]; }
    return list[Math.floor(Math.random() * list.length)];
  }

  function worldData() { return window.WD_WORLD_DATA && Array.isArray(window.WD_WORLD_DATA.provinces) ? window.WD_WORLD_DATA : null; }

  // Cache data peta di IndexedDB (dipakai tombol "Bangun peta" di halaman peta; tidak perlu menyalin file).
  const idb = () => new Promise((res, rej) => { const q = indexedDB.open("wd-world", 1); q.onupgradeneeded = () => q.result.createObjectStore("kv"); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  async function saveData(data) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(data, "provinces"); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
  async function clearData() { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").delete("provinces"); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
  async function loadData() { const db = await idb(); return new Promise((res, rej) => { const q = db.transaction("kv").objectStore("kv").get("provinces"); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); }
  // Muat data: file data/world-provinces.js lebih dulu, lalu cache browser.
  const MAP_TARGET = 789; let cacheStale = false;
  const ready = (async () => {
    if (worldData()) return worldData();
    try { const d = await loadData(); if (d && d.target !== MAP_TARGET) { cacheStale = true; await clearData(); } else if (d && Array.isArray(d.provinces)) { window.WD_WORLD_DATA = d; window.dispatchEvent(new Event("wd-world-data")); return d; } } catch (e) { console.warn("Cache peta tidak tersedia:", e); }
    return null;
  })();

  return { MAP_TARGET, isCacheStale: () => cacheStale, saveData, clearData, loadData, ready, hash, rng, haversine, flag, norm, decorate, pickStartRegion, worldData, UNLOCKED_ISO, isUnlocked, FLAG_PATTERNS, flagInner, flagSvg };
})();
