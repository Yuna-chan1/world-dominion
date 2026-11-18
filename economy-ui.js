/* WORLD DOMINION V.I — ECONOMY UI HELPERS BUILD 0.9 */
window.EcoUI = (function () {
  "use strict";
  const E = window.EcoEngine, G = window.Game;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 0) => Number(n || 0).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtUnit = (n, unit) => unit === "Gold" ? fmt(n, n < 1 ? 4 : n < 100 ? 3 : 2) : (Math.abs(n) >= 1000 ? fmt(n, 0) : fmt(n, 2));
  const hhmm = t => new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const ago = t => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s} dtk` : s < 3600 ? `${Math.floor(s / 60)} mnt` : s < 86400 ? `${Math.floor(s / 3600)} jam` : `${Math.floor(s / 86400)} hari`; };
  const left = ms => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}j ${m}m` : `${m}m ${s % 60}d`; };
  function toast(msg) { let el = $("#eco-toast"); if (!el) { el = document.createElement("div"); el.id = "eco-toast"; el.className = "eco-toast"; document.body.appendChild(el); } el.textContent = msg; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 3200); }

  const NAV = [["⌂ Home", "Home", [["index.html", "Dashboard"], ["inventory.html", "Inventaris"], ["achievements.html", "Pencapaian"], ["convoy.html", "Konvoi"]]],
    ["🌍 Dunia", "Dunia", [["world.html", "Peta Dunia"], ["countries.html", "Negara"], ["regions.html", "Wilayah"], ["cities.html", "Kota"], ["statistics.html", "Statistik Dunia"]]],
    ["📈 Ekonomi", "Ekonomi", [["market.html", "Pasar Lokal"], ["global-market.html", "Pasar Global"], ["forex.html", "Valuta Asing"], ["jobs.html", "Pekerjaan"], ["companies.html", "Perusahaan"], ["contracts.html", "Kontrak"]]],
    ["📰 Pers", "Pers", [["news.html", "Berita Dunia"], ["my-newspaper.html", "Koran Pribadi"], ["messages.html", "Pesan Pribadi"]]],
    ["⚖ Politik", "Politik", [["parties.html", "Partai Politik"], ["parliament.html", "Parlemen"], ["elections.html", "Pemilu"], ["organizations.html", "Organisasi"]]],
    ["⚔ Perang", "Perang", [["defense.html", "Pertahanan Negara"], ["war.html", "Perang Dunia"], ["war-history.html", "Riwayat Perang"]]],
    ["☰ Lainnya", "Lainnya", [["help.html", "Panduan dan Bantuan"], ["rules.html", "Peraturan"], ["premium.html", "Premium"]]]];
  function header(current) {
    const nav = NAV.map(([label, , links]) => `<div class="nav-menu"><details><summary>${label} ▾</summary><div class="nav-dropdown">${links.map(([h, t]) => `<a href="${h}"${h === current ? ' aria-current="page" class="nav-current"' : ""}>${t}</a>`).join("")}</div></details></div>`).join("");
    return `<header class="topbar domain-topbar eco-topbar"><div class="brand"><h2>WORLD DOMINION V.I</h2><span>Global Civilization Network</span></div><nav class="main-nav" aria-label="Navigasi utama">${nav}</nav>
      <div class="eco-wallet" title="Saldo"><span>🪙 <b id="w-gold">0</b></span><span id="w-cur-wrap">💵 <b id="w-cur">0</b></span><span>⚡ <b id="w-en">0</b></span></div>
      <div class="account-box"><div class="account-meta"><b id="eco-name">Pemain</b><span id="eco-level">Level 1</span></div></div></header>`;
  }
  function refreshWallet() {
    const p = G.getPlayer(); $("#w-gold").textContent = fmt(p.gold, 2); $("#w-cur").textContent = `${fmt(Math.round(G.getLocalMoney()))} ${G.getLocalCurrency()}`;
    $("#w-en").textContent = `${Math.floor(p.energy)}/${p.maxEnergy}`; $("#eco-name").textContent = p.username; $("#eco-level").textContent = `Level ${p.level}`;
  }
  function boot(current, onTick, ms = 5000) {
    if (sessionStorage.getItem("wdLoggedIn") !== "yes") { location.replace("index.html"); return false; }
    document.body.insertAdjacentHTML("afterbegin", header(current)); document.body.classList.add("eco-body");
    const run = () => { try { E.settleOrders(); E.simulateCompanies(); E.tickContracts(); } catch (e) { console.warn(e); } refreshWallet(); if (onTick) onTick(); };
    const start = () => { run(); setInterval(run, ms); setInterval(refreshWallet, 1000); };
    (window.WorldLib ? window.WorldLib.ready : Promise.resolve()).then(start, start); return true;
  }

  // ---------- grafik SVG: harga tengah, jual (ask), beli (bid), volume ----------
  function chart(el, pts, { unit = "", live = null } = {}) {
    if (!pts.length) { el.innerHTML = ""; return; }
    const data = pts.slice(); if (live) data.push({ t: Date.now(), mid: live.mid, ask: live.ask, bid: live.bid, vol: 0, live: true });
    const W = 760, H = 270, L = 8, R = 62, T = 10, PH = 180, VT = 205, VH = 46, n = data.length;
    const lo = Math.min(...data.map(d => d.bid)), hi = Math.max(...data.map(d => d.ask)), pad = (hi - lo) * 0.12 || hi * 0.02, y0 = lo - pad, y1 = hi + pad, vmax = Math.max(1, ...data.map(d => d.vol));
    const X = i => L + i * (W - L - R) / (n - 1), Y = v => T + (1 - (v - y0) / (y1 - y0)) * PH, line = k => data.map((d, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(d[k]).toFixed(1)}`).join("");
    const grid = [0, 1, 2, 3].map(i => { const v = y0 + (y1 - y0) * i / 3, y = Y(v); return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="c-grid"/><text x="${W - R + 6}" y="${y + 4}" class="c-axis">${fmtUnit(v, unit)}</text>`; }).join("");
    const bars = data.map((d, i) => `<rect x="${X(i) - 3}" y="${VT + VH - d.vol / vmax * VH}" width="6" height="${d.vol / vmax * VH}" class="c-vol"/>`).join("");
    const labels = data.map((d, i) => i % 12 === 0 ? `<text x="${X(i)}" y="${H - 4}" class="c-axis" text-anchor="middle">${hhmm(d.t)}</text>` : "").join("");
    el.innerHTML = `<div class="c-legend"><span><i class="c-dot mid"></i>Harga</span><span><i class="c-dot ask"></i>Jual (ask)</span><span><i class="c-dot bid"></i>Beli (bid)</span><span><i class="c-dot vol"></i>Volume</span><b class="c-read"></b></div>
      <svg viewBox="0 0 ${W} ${H}" class="c-svg" role="img" aria-label="Grafik harga dan volume">${grid}${bars}<path d="${line("ask")}" class="c-ask"/><path d="${line("bid")}" class="c-bid"/><path d="${line("mid")}" class="c-mid"/><circle cx="${X(n - 1)}" cy="${Y(data[n - 1].mid)}" r="3.5" class="c-now"/>${labels}<line class="c-cursor" x1="0" x2="0" y1="${T}" y2="${VT + VH}" style="display:none"/><rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent" class="c-hit"/></svg>`;
    const svg = $(".c-svg", el), cur = $(".c-cursor", el), read = $(".c-read", el);
    const show = d => { read.textContent = `${hhmm(d.t)} · ${fmtUnit(d.mid, unit)} ${unit} · jual ${fmtUnit(d.ask, unit)} · beli ${fmtUnit(d.bid, unit)}${d.vol ? " · vol " + fmt(d.vol) : ""}`; };
    show(data[n - 1]);
    svg.addEventListener("pointermove", ev => { const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W, i = Math.max(0, Math.min(n - 1, Math.round((x - L) / ((W - L - R) / (n - 1))))); cur.setAttribute("x1", X(i)); cur.setAttribute("x2", X(i)); cur.style.display = ""; show(data[i]); });
    svg.addEventListener("pointerleave", () => { cur.style.display = "none"; show(data[n - 1]); });
  }
  function spark(pts, key = "mid") { if (pts.length < 2) return ""; const v = pts.map(p => p[key]), lo = Math.min(...v), hi = Math.max(...v), W = 64, H = 22; return `<svg viewBox="0 0 ${W} ${H}" class="spark">${`<path d="${v.map((x, i) => `${i ? "L" : "M"}${(i * W / (v.length - 1)).toFixed(1)} ${(H - 2 - (x - lo) / ((hi - lo) || 1) * (H - 4)).toFixed(1)}`).join("")}"/>`}</svg>`; }
  const change = pts => { if (pts.length < 2) return 0; const a = pts[Math.max(0, pts.length - 72)].mid, b = pts[pts.length - 1].mid; return (b - a) / a * 100; };
  const chg = v => `<span class="${v >= 0 ? "up" : "down"}">${v >= 0 ? "▲" : "▼"} ${fmt(Math.abs(v), 2)}%</span>`;

  return { $, $$, esc, fmt, fmtUnit, hhmm, ago, left, toast, boot, chart, spark, change, chg, refreshWallet };
})();
