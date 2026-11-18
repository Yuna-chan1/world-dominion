/* WORLD DOMINION V.I — WORLD PAGES (Build 0.9 fix)
   countries.html / regions.html / cities.html / statistics.html
   Membaca WD_WORLD_DATA lewat WorldLib; kalau data belum ada, tampilkan
   pemberitahuan "peta belum dibangun" dan jangan crash.
*/
(function () {
  "use strict";

  function showNoMap() {
    WD.$$(".no-map-slot").forEach(el => { el.innerHTML = WD.noMapNotice(); });
  }

  // ---------- countries.html ----------
  function renderCountries(list) {
    const el = document.getElementById("countries-list"); if (!el) return;
    const foundedEl = document.getElementById("founded-list");
    // Negara yang didirikan pemain (dari core.js, bukan dari data peta)
    let founded = [];
    try { founded = Object.values(Game.getCountries() || {}); } catch (e) { founded = []; }
    const stat = document.getElementById("stat-countries");
    if (foundedEl) {
      foundedEl.innerHTML = founded.length
        ? founded.map(c => '<div class="wd-row"><div><b>' + WD.esc(c.name) + '</b><small>Pendirian oleh ' + WD.esc(c.founder || "?") + ' \u00B7 ' + (c.regionIds || []).length + ' wilayah \u00B7 ' + WD.fmtDate(c.foundedAt) + '</small></div><span class="wd-tag">Milik pemain</span></div>').join("")
        : '<p class="muted">Belum ada negara yang didirikan pemain. Dirikan negaramu dari Peta Dunia: jadilah penduduk suatu wilayah, lalu dirikan negara dengan 100 Gold.</p>';
    }
    if (!list) {
      el.innerHTML = '<p class="muted">Daftar negara dari peta belum tersedia karena data provinsi belum dibangun.</p>';
      if (stat) stat.textContent = founded.length + " didirikan";
      return;
    }
    const groups = new Map();
    list.forEach(r => {
      if (!groups.has(r.country)) groups.set(r.country, { iso: r.iso, iso2: r.iso2, count: 0, unlocked: false });
      const g = groups.get(r.country); g.count += 1;
      if (window.WorldLib && window.WorldLib.isUnlocked(r)) g.unlocked = true;
    });
    const rows = Array.from(groups.entries()).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
    if (stat) stat.textContent = rows.length + " negara \u00B7 " + founded.length + " didirikan";
    el.innerHTML = rows.map(([name, g]) => {
      const flag = g.unlocked && window.WorldLib ? window.WorldLib.flag(g.iso2) : "\uD83D\uDD12";
      return '<a class="wd-row wd-link" href="regions.html?country=' + encodeURIComponent(name) + '"><div><b>' + flag + ' ' + WD.esc(name) + '</b><small>' + g.count + ' provinsi \u00B7 ' + WD.esc(g.iso || "") + '</small></div><span class="wd-tag' + (g.unlocked ? "" : " locked") + '">' + (g.unlocked ? "Terbuka" : "Terkunci") + '</span></a>';
    }).join("");
    if (window.WDNews) window.WDNews.syncFoundings();
  }

  // ---------- regions.html ----------
  function renderRegions(list) {
    const el = document.getElementById("regions-list"); if (!el) return;
    const params = new URLSearchParams(location.search);
    const countryFilter = (params.get("country") || "").trim();
    const filterNote = document.getElementById("country-filter");
    if (countryFilter && filterNote) {
      filterNote.innerHTML = 'Menampilkan wilayah dari negara: <b>' + WD.esc(countryFilter) + '</b> \u00B7 <a href="regions.html">Tampilkan semua</a>';
    }
    const stat = document.getElementById("stat-regions");
    if (!list) {
      el.innerHTML = '<p class="muted">Daftar wilayah belum tersedia karena data provinsi belum dibangun.</p>';
      if (stat) stat.textContent = "0";
      return;
    }
    const draw = () => {
      const q = window.WorldLib ? window.WorldLib.norm(document.getElementById("region-search").value) : document.getElementById("region-search").value.toLowerCase();
      const rows = list.filter(r => {
        if (countryFilter && r.country !== countryFilter) return false;
        if (!q) return true;
        const hay = window.WorldLib ? window.WorldLib.norm(r.name + " " + r.country + " " + (r.cont || "")) : (r.name + " " + r.country).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      if (stat) stat.textContent = rows.length + " / " + list.length;
      el.innerHTML = rows.length ? rows.map(r => {
        const open = window.WorldLib && window.WorldLib.isUnlocked(r);
        return '<a class="wd-row wd-link" href="world.html"><div><b>' + WD.esc(r.name) + '</b><small>' + WD.esc(r.country) + (r.cont ? " \u00B7 " + WD.esc(r.cont) : "") + (r.type ? " \u00B7 " + WD.esc(r.type) : "") + '</small></div><span class="wd-tag' + (open ? "" : " locked") + '">' + (open ? "Terbuka" : "Terkunci") + '</span></a>';
      }).join("") : '<p class="muted">Tidak ada wilayah yang cocok dengan pencarian.</p>';
    };
    document.getElementById("region-search").addEventListener("input", draw);
    draw();
  }

  // ---------- cities.html ----------
  function renderCities(list) {
    const el = document.getElementById("cities-list"); if (!el) return;
    const stat = document.getElementById("stat-cities");
    if (!list) {
      el.innerHTML = '<p class="muted">Daftar kota belum tersedia karena data provinsi belum dibangun.</p>';
      if (stat) stat.textContent = "0";
      return;
    }
    const draw = () => {
      const q = window.WorldLib ? window.WorldLib.norm(document.getElementById("city-search").value) : document.getElementById("city-search").value.toLowerCase();
      const rows = list.filter(r => {
        if (!q) return true;
        const d = window.WorldLib ? window.WorldLib.decorate(r) : r;
        const hay = window.WorldLib ? window.WorldLib.norm((d.city || d.name) + " " + d.name + " " + d.country) : ((d.city || d.name) + " " + d.name).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      if (stat) stat.textContent = rows.length + " / " + list.length;
      el.innerHTML = rows.length ? rows.map(r => {
        const d = window.WorldLib ? window.WorldLib.decorate(r) : Object.assign({ city: r.name, cityScore: "0.0", infrastructure: { hospital: 0, education: 0, military: 0, industry: 0, electricity: 0 } }, r);
        const inf = d.infrastructure || {};
        return '<div class="wd-row"><div><b>' + WD.esc(d.city || d.name) + '</b><small>Ibu kota ' + WD.esc(d.name) + ' \u00B7 ' + WD.esc(d.country) + '<br>Skor infrastruktur: ' + WD.esc(d.cityScore) + ' / 10 \u00B7 Rumah sakit ' + (inf.hospital || 0) + ' \u00B7 Pendidikan ' + (inf.education || 0) + ' \u00B7 Militer ' + (inf.military || 0) + ' \u00B7 Industri ' + (inf.industry || 0) + ' \u00B7 Listrik ' + (inf.electricity || 0) + '</small></div><span class="wd-tag">Kota</span></div>';
      }).join("") : '<p class="muted">Tidak ada kota yang cocok dengan pencarian.</p>';
    };
    document.getElementById("city-search").addEventListener("input", draw);
    draw();
  }

  // ---------- statistics.html ----------
  function renderStatistics(list) {
    const worldEl = document.getElementById("world-stats"); if (!worldEl) return;
    const p = Game.getPlayer();
    const a = p.activities || {};
    const counts = {
      parties: (WD.load("wdParties", []) || []).length,
      orgs: (WD.load("wdOrgs", []) || []).length,
      laws: (WD.load("wdLaws", []) || []).length,
      lawsPassed: (WD.load("wdLaws", []) || []).filter(l => l.passed).length,
      wars: (WD.load("wdWars", []) || []).length,
      articles: (WD.load("wdArticles", []) || []).length,
      messages: (WD.load("wdMessages", []) || []).length
    };
    let founded = [];
    try { founded = Object.values(Game.getCountries() || {}); } catch (e) { founded = []; }
    const totalCountries = list ? new Set(list.map(r => r.country)).size : null;
    const unlocked = list && window.WorldLib ? list.filter(r => window.WorldLib.isUnlocked(r)).length : null;
    const row = (k, v) => '<div><span>' + k + '</span><b>' + v + '</b></div>';
    worldEl.innerHTML =
      row("Total provinsi di peta", list ? WD.fmt(list.length) : "Belum dibangun") +
      row("Total negara di peta", totalCountries == null ? "Belum dibangun" : WD.fmt(totalCountries)) +
      row("Provinsi terbuka (Indonesia)", unlocked == null ? "Belum dibangun" : WD.fmt(unlocked)) +
      row("Negara didirikan pemain", WD.fmt(founded.length)) +
      row("Partai politik", WD.fmt(counts.parties)) +
      row("Organisasi", WD.fmt(counts.orgs)) +
      row("UU diusulkan / disahkan", WD.fmt(counts.laws) + " / " + WD.fmt(counts.lawsPassed)) +
      row("Perang tercatat", WD.fmt(counts.wars)) +
      row("Artikel koran pribadi", WD.fmt(counts.articles)) +
      row("Pesan pribadi tersimpan", WD.fmt(counts.messages));
    const playerEl = document.getElementById("player-stats");
    if (playerEl) {
      let localMoney = "?";
      try { localMoney = WD.fmt(Math.round(Game.getLocalMoney())) + " " + Game.getLocalCurrency(); } catch (e) { /* abaikan */ }
      playerEl.innerHTML =
        row("Pemain", WD.esc(p.username)) +
        row("Level / EXP", p.level + " / " + WD.fmt(p.exp)) +
        row("Energi", Math.floor(p.energy) + " / " + p.maxEnergy) +
        row("Gold", WD.fmt(p.gold)) +
        row("Uang lokal", localMoney) +
        row("Kekuatan / Pendidikan / Ekonomi", (p.stats.strength || 0) + " / " + (p.stats.education || 0) + " / " + (p.stats.economy || 0)) +
        row("Siklus kerja", WD.fmt(p.workCount || 0)) +
        row("Total energi digunakan", WD.fmt(p.energyUsed || 0)) +
        row("Pembelian di Pasar Global", WD.fmt(a.marketPurchases || 0)) +
        row("Serangan perang", WD.fmt(a.warAttacks || 0)) +
        row("Total damage perang", WD.fmt(a.warDamage || 0)) +
        row("UU disahkan", WD.fmt(a.lawsRatified || 0));
    }
    const stat = document.getElementById("stat-founded"); if (stat) stat.textContent = founded.length + " negara";
    if (window.WDNews) window.WDNews.syncFoundings();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const data = await WD.worldData();
    const list = data && Array.isArray(data.provinces) ? data.provinces : null;
    if (document.getElementById("countries-list")) renderCountries(list);
    if (document.getElementById("regions-list")) renderRegions(list);
    if (document.getElementById("cities-list")) renderCities(list);
    if (document.getElementById("world-stats")) renderStatistics(list);
    if (!list) showNoMap();
  });
})();
