/* WORLD DOMINION V.I — WORLD MAP DOMAIN BUILD 0.8 (WORLD ATLAS)
   Geometri dan nama wilayah: Natural Earth admin-1 (data/world-provinces.js, dibangun oleh tools/build-map.html).
   Penduduk, sumber daya, pajak, konflik, embargo, dan jalur dagang adalah DATA SIMULASI game.
*/
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const L = window.WorldLib;
  const toast = message => {
    const el = $("#world-toast"); if (!el) return;
    el.textContent = message; el.classList.add("show");
    clearTimeout(window.__wdWorldToastTimer);
    window.__wdWorldToastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  };
  if (sessionStorage.getItem("wdLoggedIn") !== "yes") { location.replace("index.html"); return; }
  const playerAtStart = Game.getPlayer();
  $("#domain-player-name").textContent = playerAtStart.username;
  $("#domain-player-level").textContent = `Level ${playerAtStart.level}`;

  const RESOURCE_INFO = { "Gandum": "🌾", "Batu": "🪨", "Kayu": "🪵", "Besi": "⛓️", "Minyak": "🛢️", "Batu bara": "⚫", "Tembaga": "🟠", "Kapas": "🧶" };
  const RESOURCE_COLOR = { "Gandum": "#d9c25a", "Batu": "#9aa4ad", "Kayu": "#4f9d5b", "Besi": "#8b93c9", "Minyak": "#c76a2b", "Batu bara": "#85788a", "Tembaga": "#e0a96d", "Kapas": "#e8e4f0" };
  const ZOOM_MAX = 24;
  const fmt = v => Number(v || 0).toLocaleString("id-ID");
  const duration = ms => {
    const t = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    return d ? `${d} hari ${h} jam` : h ? `${h} jam ${m} menit` : m ? `${m} menit ${s} detik` : `${s} detik`;
  };
  const ns = "http://www.w3.org/2000/svg";
  const gisXY = (lon, lat) => [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500];

  // ---------- Data wilayah ----------
  let regions = [], regionById = {}, byCountry = new Map(), dataMode = "provinsi";
  const pathById = new Map();
  const playerWorld = () => Game.getWorldState();
  let selectedId = null, activeTab = "summary", mapMode = "political", zoom = 1, mapPan = { x: 0, y: 0 }, selectedTier = "T1";
  let dirCont = null, dirCountry = null, justDragged = false;

  function registerRegions(list) {
    regions = list.map(L.decorate); regionById = Object.fromEntries(regions.map(r => [r.id, r]));
    byCountry = new Map(); regions.forEach(r => { if (!byCountry.has(r.country)) byCountry.set(r.country, []); byCountry.get(r.country).push(r); });
  }
  const getSelected = () => regionById[selectedId] || regions[0];
  const currentRegion = () => regionById[playerWorld().currentProvinceId] || null;
  const countryOf = r => ({ countryName: r.country, countryIso2: r.iso2 });

  // ---------- Peta (dunia berputar tanpa batas) ----------
  const byId = id => document.getElementById(id);
  const viewportSize = () => { const r = $("#map-viewport").getBoundingClientRect(); return { w: r.width, h: r.height }; };
  const baseScale = () => { const { w, h } = viewportSize(); return Math.max(w / 1000, h / 500); };
  let shiftK = 0;
  // Salinan dunia kiri/kanan memakai <use>; salinan "asli" (yang bisa diklik) digeser ke tempat pointer berada.
  function setShift(k) { if (k === shiftK) return; shiftK = k; byId("world-shift").setAttribute("transform", `translate(${k},0)`); byId("use-left").setAttribute("x", k - 1000); byId("use-right").setAttribute("x", k + 1000); }

  function updateZoom() {
    const canvas = $("#map-canvas"), { w, h } = viewportSize(), scale = baseScale() * zoom, period = 1000 * scale;
    mapPan.x = w / 2 - ((((w / 2 - mapPan.x) % period) + period) % period); // pusat layar selalu di salinan utama
    const mh = 500 * scale; mapPan.y = mh <= h ? (h - mh) / 2 : Math.min(0, Math.max(h - mh, mapPan.y));
    setShift(0);
    // Salinan dunia kiri/kanan hanya digambar bila terlihat (hemat render di perangkat kecil).
    const left = -mapPan.x / scale, right = left + w / scale;
    byId("use-left").style.display = left < 0 ? "" : "none"; byId("use-right").style.display = right > 1000 ? "" : "none";
    canvas.style.width = "1000px"; canvas.style.height = "500px"; canvas.style.transformOrigin = "0 0";
    canvas.style.transform = `translate(${mapPan.x}px,${mapPan.y}px) scale(${scale})`;
    canvas.style.setProperty("--inv", String(1 / scale));
    $("#zoom-range").value = String(Math.min(+$("#zoom-range").max, zoom));
    if (mapMode === "resources") scheduleResourceLOD();
  }
  function focusRegion(r, minZoom = 2.2) {
    if (!r) return;
    const [x0, y0, x1, y1] = r.bbox || [...gisXY(r.lon, r.lat), ...gisXY(r.lon, r.lat)];
    const { w, h } = viewportSize(), base = baseScale();
    const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
    zoom = Math.max(minZoom, Math.min(ZOOM_MAX, Math.min(w * 0.45 / (bw * base), h * 0.45 / (bh * base))));
    const scale = base * zoom, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    mapPan = { x: w / 2 - cx * scale, y: h / 2 - cy * scale }; updateZoom();
  }

  // ---------- Pewarnaan, sumber daya, bendera ----------
  function paintRegions() {
    const owners = {}; Object.values(Game.getCountries()).forEach(c => c.regionIds.forEach(id => { owners[id] = c; }));
    regions.forEach(r => {
      const p = pathById.get(r.id); if (!p) return; let f = "";
      const open = L.isUnlocked(r);
      if (mapMode === "political") { if (owners[r.id]) f = owners[r.id].color; }
      else if (open && mapMode === "war" && r.conflict) f = "#c9565f";
      else if (open && mapMode === "embargo" && r.embargo) f = "#a47bb8";
      else if (open && mapMode === "trade") f = `hsl(182 42% ${Math.round(78 - r.trade * 2.4)}%)`;
      else if (open && mapMode === "resources") { const top = Object.entries(r.resources).sort((a, b) => b[1] - a[1])[0]; if (top) f = RESOURCE_COLOR[top[0]]; }
      p.style.fill = f;
    });
  }
  let resIcons = [], lodQueued = false;
  function buildResourceIcons() {
    const layer = byId("resource-layer"); layer.innerHTML = ""; resIcons = [];
    const frag = document.createDocumentFragment();
    regions.forEach(r => {
      const [x0, y0, x1, y1] = r.bbox, bw = x1 - x0, bh = y1 - y0; if (bw < 0.25 || bh < 0.2) return;
      const icons = Object.entries(r.resources).sort((a, b) => b[1] - a[1]).map(([n]) => RESOURCE_INFO[n]);
      const t = document.createElementNS(ns, "text"); const [x, y] = gisXY(r.lon, r.lat);
      t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("class", "resource-icon"); t.style.display = "none";
      frag.appendChild(t); resIcons.push({ t, bw, bh, icons, n: 0 });
    });
    layer.appendChild(frag);
  }
  function scheduleResourceLOD() { if (lodQueued) return; lodQueued = true; requestAnimationFrame(() => { lodQueued = false; updateResourceLOD(); }); }
  function updateResourceLOD() {
    const scale = baseScale() * zoom;
    resIcons.forEach(o => {
      const sw = o.bw * scale, sh = o.bh * scale, n = (sw < 30 || sh < 22) ? 0 : sw >= 110 ? 3 : sw >= 60 ? 2 : 1;
      if (n === o.n) return; o.n = n; o.t.style.display = n ? "" : "none"; if (n) o.t.textContent = o.icons.slice(0, n).join("");
    });
  }
  // Bendera di tengah wilayah negara buatan pemain (ukuran tetap di layar, dikompensasi lewat --inv).
  function renderFlags() {
    const layer = byId("flag-layer"); layer.innerHTML = "";
    Object.values(Game.getCountries()).forEach(c => {
      const rs = c.regionIds.map(id => regionById[id]).filter(Boolean); if (!rs.length) return;
      let sx = 0, sy = 0, sw = 0; rs.forEach(r => { const [x, y] = gisXY(r.lon, r.lat), wgt = Math.max(0.01, r.area); sx += x * wgt; sy += y * wgt; sw += wgt; });
      const g = document.createElementNS(ns, "g"); g.setAttribute("transform", `translate(${sx / sw} ${sy / sw})`);
      g.innerHTML = `<g class="scale-inv"><g transform="translate(-15 -20)">${L.flagInner(c.flag)}<rect width="30" height="20" fill="none" stroke="#000a" stroke-width=".9"/></g><text class="flag-name" y="14" text-anchor="middle">${c.name.replace(/[<>&]/g, "")}</text></g>`;
      layer.appendChild(g);
    });
  }
  function renderPin(cur) {
    const layer = byId("pin-layer"); layer.innerHTML = ""; if (!cur) return;
    const [x, y] = gisXY(cur.lon, cur.lat), g = document.createElementNS(ns, "g");
    g.setAttribute("transform", `translate(${x} ${y})`); g.innerHTML = `<g class="scale-inv"><text class="pin-text" text-anchor="middle" y="${Game.ownerOfRegion(cur.id) ? -24 : 0}">📍</text></g>`; layer.appendChild(g);
  }

  function drawRegions() {
    const layer = byId("province-layer"); layer.innerHTML = ""; pathById.clear();
    const frag = document.createDocumentFragment();
    regions.forEach(r => {
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", r.d); p.setAttribute("class", "province-gis-shape" + (L.isUnlocked(r) ? " open" : "")); p.dataset.province = r.id;
      pathById.set(r.id, p); frag.appendChild(p);
    });
    layer.appendChild(frag); paintRegions();
  }

  // Cari wilayah di bawah pointer, di salinan dunia mana pun.
  function hitRegionAt(cx, cy) {
    const rect = $("#map-viewport").getBoundingClientRect(), scale = baseScale() * zoom;
    setShift(Math.floor((cx - rect.left - mapPan.x) / scale / 1000) * 1000);
    const el = document.elementFromPoint(cx, cy), id = el && el.dataset && el.dataset.province;
    return id ? regionById[id] : null;
  }
  let hoverId = null, hoverQueued = false, lastPointer = null;
  function setupTooltip() {
    const tip = $("#map-tooltip");
    $("#map-viewport").addEventListener("pointerleave", () => { tip.classList.remove("show"); pathById.get(hoverId)?.classList.remove("hover"); hoverId = null; });
    window.__wdHover = e => {
      lastPointer = e; if (hoverQueued) return; hoverQueued = true;
      requestAnimationFrame(() => {
        hoverQueued = false; const r = hitRegionAt(lastPointer.clientX, lastPointer.clientY), id = r ? r.id : null;
        if (id !== hoverId) { pathById.get(hoverId)?.classList.remove("hover"); hoverId = id; if (r && L.isUnlocked(r)) pathById.get(id)?.classList.add("hover"); }
        if (!r) { tip.classList.remove("show"); return; }
        const owner = Game.ownerOfRegion(r.id);
        tip.innerHTML = `<b>${L.isUnlocked(r) ? "" : "🔒 "}${r.name}</b><small>${owner ? owner.name + " · " : ""}${r.country}</small>`;
        tip.style.left = `${lastPointer.clientX + 14}px`; tip.style.top = `${lastPointer.clientY + 14}px`; tip.classList.add("show");
      });
    };
  }
  function handleMapClick(e) {
    const r = hitRegionAt(e.clientX, e.clientY); if (!r) return;
    if (!L.isUnlocked(r)) return toast(`🔒 ${r.name}, ${r.country} masih terkunci. Saat ini hanya wilayah Indonesia yang dibuka.`);
    selectRegion(r.id, false);
  }

  // Pembaca TopoJSON mini (tanpa d3/topojson): world-atlas -> path SVG equirectangular 1000x500.
  let countryShapes = null;
  async function loadCountryShapes() {
    if (countryShapes) return countryShapes;
    const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json", { cache: "force-cache" });
    if (!res.ok) throw new Error(`world-atlas HTTP ${res.status}`);
    const topo = await res.json(), [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
    const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return gisXY(x * sx + tx, y * sy + ty); }); });
    const ring = idx => { let pts = []; idx.forEach(i => { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; pts = pts.concat(pts.length ? a.slice(1) : a); }); return pts; };
    const area = pts => { let t = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) t += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return Math.abs(t / 2); };
    countryShapes = topo.objects.countries.geometries.map(g => {
      const polys = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
      let d = "", minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, best = null, total = 0;
      polys.forEach(poly => poly.forEach((idx, ri) => {
        const pts = ring(idx); if (pts.length < 3) return;
        d += "M" + pts.map(q => q[0].toFixed(2) + " " + q[1].toFixed(2)).join("L") + "Z";
        pts.forEach(q => { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); });
        if (ri === 0) { const ar = area(pts); total += ar; if (!best || ar > best.ar) best = { ar, pts }; }
      }));
      const c = best ? best.pts.reduce((a, q) => [a[0] + q[0] / best.pts.length, a[1] + q[1] / best.pts.length], [0, 0]) : [500, 250];
      return { id: g.id, name: (g.properties && g.properties.name) || `Negara ${g.id}`, d, bbox: [minX, minY, maxX, maxY], cx: c[0], cy: c[1], area: total };
    }).filter(c => c.d);
    return countryShapes;
  }
  // Lapisan dasar: seluruh negara berwarna abu-abu (menutup lubang provinsi yang tidak dipilih) + garis batas negara putih di atas provinsi.
  async function drawBaseLayer() {
    try {
      const shapes = await loadCountryShapes(), base = byId("base-layer"), border = byId("country-border-layer");
      shapes.forEach(c => {
        const a = document.createElementNS(ns, "path"); a.setAttribute("d", c.d); a.setAttribute("class", "base-country"); base.appendChild(a);
        const b = document.createElementNS(ns, "path"); b.setAttribute("d", c.d); b.setAttribute("class", "country-border"); border.appendChild(b);
      });
    } catch (err) { console.warn("Lapisan dasar negara gagal:", err); }
  }
  async function buildCountryRegions() {
    return (await loadCountryShapes()).map(c => {
      const lon = c.cx / 1000 * 360 - 180, lat = 90 - c.cy / 500 * 180, idn = String(c.id) === "360";
      return { id: `negara-${c.id || c.name}`, name: c.name, iso: idn ? "IDN" : String(c.id || ""), iso2: idn ? "ID" : "", country: c.name, cont: "Dunia", type: "Negara", lon, lat, area: c.area, bbox: c.bbox, d: c.d };
    });
  }

  // Tombol "Bangun peta": unduh Natural Earth admin-1, pilih ±789 provinsi, simpan di browser (IndexedDB), muat ulang.
  const NE_URLS = ["https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson", "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_10m_admin_1_states_provinces.geojson"];
  function showSetupBanner(reason) {
    const box = document.createElement("div"); box.id = "map-setup"; box.className = "map-setup";
    box.innerHTML = `<b>🗺️ Peta provinsi dunia belum dibangun</b><p>${reason || "Saat ini yang tampil hanya peta negara."} Klik tombol di bawah untuk membuat peta ±789 provinsi otomatis. Cukup sekali (unduhan ±40 MB, hasilnya disimpan di browser).</p><button type="button" id="build-map-btn" class="action-button">Bangun peta provinsi</button><div id="build-map-log" class="small-note"></div><small><a href="tools/build-map.html">Cara manual</a></small>`;
    document.body.appendChild(box);
    $("#build-map-btn").addEventListener("click", async () => {
      const log = t => { $("#build-map-log").textContent = t; }, btn = $("#build-map-btn"); btn.disabled = true;
      try {
        let json = null, lastErr = "";
        for (const u of NE_URLS) { try { log("Mengunduh data provinsi dunia… (±40 MB, tunggu sebentar)"); const r = await fetch(u); if (!r.ok) throw new Error("HTTP " + r.status); json = await r.json(); break; } catch (e) { lastErr = e.message; } }
        if (!json) throw new Error("Unduhan gagal (" + lastErr + "). Periksa koneksi atau pakai cara manual.");
        log("Memproses & menyederhanakan…"); await new Promise(r => setTimeout(r, 30));
        const data = ProvinceBuilder.build(json, { target: L.MAP_TARGET });
        try { await L.saveData(data); log(`Selesai: ${data.count} provinsi tersimpan. Memuat ulang…`); setTimeout(() => location.reload(), 600); }
        catch (e) {
          const blob = new Blob([ProvinceBuilder.toScript(data)], { type: "text/javascript" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "world-provinces.js"; a.click();
          log("Browser tidak mengizinkan penyimpanan. File world-provinces.js diunduh: simpan ke folder data/ lalu muat ulang halaman.");
        }
      } catch (e) { log("Gagal: " + e.message); btn.disabled = false; }
    });
  }

  // ---------- Pilih wilayah ----------
  function selectRegion(id, focus) {
    const r = regionById[id]; if (!r) return;
    if (!L.isUnlocked(r)) { if (focus) focusRegion(r, 2.2); toast(`🔒 ${r.name}, ${r.country} masih terkunci. Saat ini hanya wilayah Indonesia yang dibuka.`); closeSearchResults(); return; }
    pathById.get(selectedId)?.classList.remove("selected"); selectedId = id; pathById.get(id)?.classList.add("selected");
    pathById.get(id)?.parentNode.appendChild(pathById.get(id));
    dirCont = r.cont; dirCountry = r.country;
    document.body.classList.add("region-panel-open");
    renderDirectory(); renderQuickStats(r); renderDetailContent(); closeSearchResults();
    if (focus) focusRegion(r, 2.2);
  }

  function renderDirectory() {
    const holder = $("#province-groups"); holder.innerHTML = "";
    const mk = (cls, text, onClick, selected) => { const b = document.createElement("button"); b.type = "button"; b.className = `${cls} ${selected ? "selected" : ""}`; b.textContent = text; b.addEventListener("click", onClick); return b; };
    const section = (title, items) => { const s = document.createElement("section"); s.className = "province-group dir-wide"; const h = document.createElement("h3"); h.textContent = title; const l = document.createElement("div"); l.className = "province-list"; items.forEach(i => l.appendChild(i)); s.append(h, l); holder.appendChild(s); };
    const conts = [...new Set(regions.map(r => r.cont))].sort();
    section("BENUA", conts.map(c => mk("province-chip", `${c} (${regions.filter(r => r.cont === c).length})`, () => { dirCont = c; dirCountry = null; renderDirectory(); }, c === dirCont)));
    if (dirCont) {
      const countries = [...byCountry.entries()].filter(([, list]) => list[0].cont === dirCont).sort((a, b) => a[0].localeCompare(b[0]));
      section(`NEGARA · ${dirCont.toUpperCase()}`, countries.map(([name, list]) => mk("province-chip", `${L.isUnlocked(list[0]) ? list[0].flag : "🔒"} ${name} (${list.length})`, () => { dirCountry = name; renderDirectory(); }, name === dirCountry)));
    }
    if (dirCountry && byCountry.has(dirCountry)) {
      section(`WILAYAH · ${dirCountry.toUpperCase()}`, byCountry.get(dirCountry).map(r => mk("province-chip", (L.isUnlocked(r) ? "" : "🔒 ") + r.name, () => { selectRegion(r.id, true); }, r.id === selectedId)));
    }
  }

  // ---------- Panel detail ----------
  // Statistik hidup: hanya pemain yang membuat wilayah berpenghuni (prototipe lokal = hanya kamu).
  function liveStats(r) { const w = playerWorld(); return { population: w.currentProvinceId === r.id ? 1 : 0, natives: w.citizenshipProvinceId === r.id ? 1 : 0, companies: 0 }; }
  function renderQuickStats(r) {
    const st = liveStats(r);
    $("#selected-province-name").textContent = r.name;
    $("#selected-province-meta").textContent = `${r.country} · ${r.type} · ${r.cont}`;
    document.querySelector(".region-flag").textContent = r.flag;
    $("#region-quick-stats").innerHTML = `
      <div class="quick-stat"><span>👥 Penghuni</span><b>${fmt(st.population)}</b></div>
      <div class="quick-stat"><span>🏠 Penduduk asli</span><b>${fmt(st.natives)}</b></div>
      <div class="quick-stat"><span>🏭 Perusahaan</span><b>${fmt(st.companies)}</b></div>
      <div class="quick-stat"><span>📦 Jenis sumber daya</span><b>${Object.keys(r.resources).length} komoditas</b></div>`;
  }

  function renderSummary(r) {
    const st = liveStats(r), reb = playerWorld().rebellions[r.id], isReb = reb && reb.status === "berlangsung", sup = isReb ? Number(reb.supporters) || 0 : 0;
    const res = Object.entries(r.resources).map(([n, a]) => `<div class="resource-entry"><span>${RESOURCE_INFO[n]} ${n}</span><b>${fmt(a)}</b></div>`).join("");
    return `<div class="detail-section-title"><h3>📊 Ringkasan wilayah</h3><small>DARI NOL</small></div>
      <div class="capacity-line"><span>Penduduk</span><b>${fmt(st.population)} jiwa</b></div><div class="capacity-bar"><i style="width:${Math.min(100, st.population)}%"></i></div>
      <p class="detail-copy">${st.population ? "Kamu satu-satunya penghuni wilayah ini." : "Wilayah ini kosong. Penduduk, perusahaan, dan infrastruktur hanya muncul ketika pemain tinggal dan membangun di sini."}</p>
      <div class="recent-online"><strong>${st.population}</strong><span><b>Pemain aktif sekarang</b><br>Pemain yang sedang berada di wilayah ini</span></div>
      <div class="detail-section-title top-gap"><h3>⛏ Sumber daya alam</h3><small>Kandungan tanah</small></div><div class="resource-grid">${res}</div>
      <div class="revolt-box"><h3>⚑ Pemberontakan wilayah</h3>
        <p>${isReb ? `Pemberontakan berlangsung sejak ${new Date(reb.startedAt).toLocaleString("id-ID")} dengan ${fmt(reb.supporters)} pendukung.` : "Mulai pemberontakan membutuhkan biaya 50 Gold dan sedikitnya 5 orang pendukung."}</p>
        <div class="capacity-line"><span>Syarat pendukung</span><b id="revolt-count-label">${fmt(sup)} / 5 orang</b></div><div class="requirement-bar"><i id="revolt-fill" style="width:${Math.min(100, sup / 5 * 100)}%"></i></div>
        <div class="revolt-controls"><label>Jumlah pendukung<input id="revolt-supporters" type="number" min="5" max="1000" step="1" value="${isReb ? sup : 5}" ${isReb ? "disabled" : ""}></label>
        <button id="start-rebellion" type="button" class="action-button danger" ${isReb || Game.getPlayer().gold < 50 ? "disabled" : ""}>Mulai · 50 Gold</button></div>
        <p class="small-note">Perhitungan pendukung masih simulasi lokal dan belum merekrut pemain sungguhan.</p></div>`;
  }
  function renderCity(r) {
    const st = liveStats(r), i = r.infrastructure, rows = [["🏥 Rumah sakit", i.hospital], ["📚 Pendidikan", i.education], ["🛡️ Militer", i.military], ["🏭 Industri", i.industry], ["⚡ Listrik", i.electricity]];
    return `<div class="detail-section-title"><h3>🏙️ Pusat wilayah</h3><small>DARI NOL</small></div>
      <div class="info-grid"><div class="info-tile"><span>Nama pusat</span><b>${r.city}</b></div><div class="info-tile"><span>Negara</span><b>${r.flag} ${r.country}</b></div><div class="info-tile"><span>Skor infrastruktur</span><b class="city-score">${r.cityScore} / 10</b></div><div class="info-tile"><span>Perusahaan</span><b>${fmt(st.companies)}</b></div></div>
      <p class="detail-copy">Belum ada kota di ${r.name}. Pusat wilayah terbentuk setelah pemain membangun infrastruktur dan perusahaan di sini.</p>
      ${rows.map(([l, v]) => `<div class="city-infra-row"><div class="city-infra-head"><span>${l}</span><b>${v} / 10</b></div><div class="city-infra-bar"><i style="width:${v * 10}%"></i></div></div>`).join("")}`;
  }
  function renderPolitics(r) {
    const p = r.politics, owner = Game.ownerOfRegion(r.id), pct = v => v == null ? "—" : v + "%";
    return `<div class="detail-section-title"><h3>⚖ Pemerintahan dan kebijakan</h3><small>${owner ? "BERNEGARA" : "TANPA NEGARA"}</small></div>
      <div class="info-grid"><div class="info-tile"><span>Bentuk pemerintahan</span><b>${owner ? "Republik" : p.form}</b></div><div class="info-tile"><span>Pemerintah</span><b>${owner ? owner.name : p.government}</b></div></div>
      <p class="detail-copy">${owner ? "Pajak ditetapkan oleh pemerintah negara." : "Belum ada pemerintahan di wilayah ini. Semua pajak dimulai dari 5% dan nantinya diatur oleh parlemen atau menteri."}</p>
      <div class="location-line"><span>💰 Pajak penghasilan</span><b>${pct(p.incomeTax)}</b></div><div class="location-line"><span>🏭 Pajak produksi</span><b>${pct(p.productionTax)}</b></div>
      <div class="location-line"><span>📥 Pajak impor</span><b>${pct(p.importTax)}</b></div><div class="location-line"><span>📤 Pajak ekspor</span><b>${pct(p.exportTax)}</b></div>
      <div class="location-line"><span>🏛 Status perbatasan</span><b>${r.border}</b></div>`;
  }
  function renderBorder(r) {
    const cls = r.border === "Terbuka" ? "open" : r.border === "Bersyarat" ? "conditional" : "closed";
    return `<div class="detail-section-title"><h3>🛂 Status perbatasan</h3><small>${r.name.toUpperCase()}</small></div>
      <p><span class="status-pill ${cls}">${r.border.toUpperCase()}</span></p><p class="detail-copy">Tanpa pemerintahan, perbatasan terbuka bagi semua. Setelah negara berdiri, pemerintah dapat mengatur perbatasannya.</p>
      <div class="info-grid"><div class="info-tile"><span>Embargo</span><b>${r.embargo ? "Aktif" : "Tidak ada"}</b></div><div class="info-tile"><span>Jalur perdagangan</span><b>${r.trade} jalur</b></div></div>`;
  }
  const COOLDOWN = 5 * 24 * 3600 * 1000;
  const cooldownText = () => { const w = playerWorld(), left = COOLDOWN - (Date.now() - (Number(w.lastCitizenshipAt) || 0)); return w.lastCitizenshipAt && left > 0 ? duration(left) : "Siap digunakan"; };
  function renderCitizenship(r) {
    const w = playerWorld(), cur = regionById[w.citizenshipProvinceId], already = w.citizenshipProvinceId === r.id, cooling = w.lastCitizenshipAt && Date.now() - w.lastCitizenshipAt < COOLDOWN;
    return `<div class="detail-section-title"><h3>🪪 Kewarganegaraan</h3><small>PINDAH PENDUDUK</small></div>
      <div class="info-tile"><span>Kewarganegaraan saat ini</span><b>${cur ? `${cur.flag} ${cur.name}, ${cur.country}` : "Belum ditetapkan"}</b></div>
      <p class="detail-copy">Tekan tombol untuk menjadi penduduk asli ${r.name}. Perpindahan langsung mengubah lokasi pemain dan menetapkan kewarganegaraan baru.</p>
      <div class="location-line"><span>⏱ Batas perpindahan berikutnya</span><b id="citizenship-cooldown">${cooldownText()}</b></div>
      <button type="button" id="claim-citizenship" class="action-button" ${already || cooling ? "disabled" : ""}>${already ? "Sudah menjadi penduduk asli" : cooling ? "Tunggu masa 5 hari" : "Jadilah penduduk asli di sini"}</button>
      <p class="small-note">Dibatasi satu kali setiap 5 hari untuk seluruh dunia.</p>`;
  }
  function travelBlock(r) {
    const w = playerWorld(), cur = currentRegion();
    if (!cur) return { dist: 0, blocked: false };
    const dist = L.haversine(cur.lat, cur.lon, r.lat, r.lon);
    const foreign = cur.country !== r.country && w.citizenshipCountryName !== r.country;
    return { dist, blocked: foreign && r.border === "Tertutup" };
  }
  function renderTravel(r) {
    const w = playerWorld(), pending = w.pendingFlight, active = pending && pending.arrivalAt > Date.now(), cur = currentRegion(), permit = w.workPermits.find(i => i.provinceId === r.id && i.status !== "ditolak");
    const { dist, blocked } = travelBlock(r), q = Game.quoteFlight(selectedTier, dist), eta = new Date(Date.now() + q.durationMs), poor = Game.getLocalMoney() < Game.usdToLocal(q.fare);
    const same = cur && cur.id === r.id;
    const reason = same ? "Kamu sudah berada di wilayah ini." : active ? "Penerbangan sedang berlangsung. Tunggu sampai tiba." : blocked ? `Perbatasan ${r.country} tertutup untuk pendatang asing.` : poor ? `Uang lokal belum cukup (butuh ${fmt(Game.usdToLocal(q.fare))} ${Game.getLocalCurrency()}).` : "";
    const pendHtml = pending ? `<div class="flight-summary"><b>✈ Penerbangan aktif · ${pending.tier}</b><br>Tujuan: ${pending.toProvinceName}${pending.toCountryName ? ", " + pending.toCountryName : ""}<br>Tiba: ${new Date(pending.arrivalAt).toLocaleString("id-ID")}<br><span id="flight-countdown">Sisa ${duration(pending.arrivalAt - Date.now())}</span></div>` : "";
    return `<div class="detail-section-title"><h3>✈ Pindah wilayah</h3><small>${cur ? cur.name : "?"} → ${r.name} · ${fmt(Math.round(dist))} km</small></div>
      <div class="travel-tier-grid">${Object.entries(Game.FLIGHT_TIERS).map(([k, t]) => { const tq = Game.quoteFlight(k, dist); return `<button type="button" class="travel-tier ${k === selectedTier ? "selected" : ""}" data-flight-tier="${k}"><b>${k} · ${t.name}</b><small>${duration(tq.durationMs)}<br>${fmt(Game.usdToLocal(tq.fare))} ${Game.getLocalCurrency()}<br>${t.benefit}</small></button>`; }).join("")}</div>
      <div class="flight-summary">Kelas <b>${selectedTier}</b> · Biaya <b>${fmt(Game.usdToLocal(q.fare))} ${Game.getLocalCurrency()}</b><br>Durasi <b>${duration(q.durationMs)}</b> · Tiba sekitar <b>${eta.toLocaleString("id-ID")}</b></div>
      <button type="button" id="book-flight" class="action-button go-button" ${reason ? "disabled" : ""}>✈ Berangkat sekarang ke ${r.name}</button>
      ${reason ? `<p class="small-note go-reason">⚠ ${reason}</p>` : ""}${pendHtml}
      <div class="detail-section-title top-gap"><h3>🛠 Izin kerja (opsional)</h3><small>${permit ? "DIAJUKAN" : "BELUM"}</small></div>
      <p class="detail-copy">Permohonan izin kerja dicatat di profil lokal; persetujuan otomatis belum diterapkan.</p>
      <button type="button" id="apply-work-permit" class="action-button subtle" ${permit ? "disabled" : ""}>${permit ? "Izin kerja diajukan" : "Ajukan izin kerja"}</button>
      <p class="small-note">Tarif dan durasi mengikuti jarak garis lurus (angka balancing simulasi).</p>`;
  }

  function bindDetailActions(r) {
    const input = $("#revolt-supporters");
    if (input) {
      const update = () => { const c = Math.max(0, Math.floor(Number(input.value) || 0)); $("#revolt-count-label").textContent = `${c} / 5 orang`; $("#revolt-fill").style.width = `${Math.min(100, c / 5 * 100)}%`; $("#start-rebellion").disabled = c < 5 || Game.getPlayer().gold < 50 || playerWorld().rebellions[r.id]?.status === "berlangsung"; };
      input.addEventListener("input", update); update();
    }
    $("#start-rebellion")?.addEventListener("click", () => { const res = Game.startRebellion(r.id, $("#revolt-supporters").value); if (!res.ok) return toast(res.reason); toast(`Pemberontakan dimulai dengan ${res.supporters} pendukung. -50 Gold.`); renderPlayerLocation(); });
    $("#claim-citizenship")?.addEventListener("click", () => { const res = Game.claimCitizenship(r.id, r.name, r.city, countryOf(r)); if (!res.ok) return toast(res.reason); toast(`Kewarganegaraan berpindah ke ${r.name}, ${r.country}. Cooldown 5 hari dimulai.`); renderPlayerLocation(); });
    $("#apply-work-permit")?.addEventListener("click", () => { const res = Game.applyWorkPermit(r.id); if (!res.ok) return toast(res.reason); toast(`Permohonan izin kerja di ${r.name} dicatat.`); renderDetailContent(); });
    $$("[data-flight-tier]").forEach(b => b.addEventListener("click", () => { selectedTier = b.dataset.flightTier; renderDetailContent(); }));
    $("#book-flight")?.addEventListener("click", () => {
      const { dist, blocked } = travelBlock(r); if (blocked) return toast(`Perbatasan ${r.country} tertutup untuk pendatang asing.`);
      const res = Game.bookFlight(r.id, selectedTier, r.name, r.city, { distanceKm: dist, ...countryOf(r) });
      if (!res.ok) return toast(res.reason);
      toast(`Tiket ${selectedTier} dibeli (-${fmt(Game.usdToLocal(res.quote.fare))} ${Game.getLocalCurrency()}). Tiba ${new Date(res.flight.arrivalAt).toLocaleString("id-ID")}.`); renderPlayerLocation();
    });
  }
  function renderDetailContent() {
    const r = getSelected(); if (!r) return;
    $("#detail-content").innerHTML = ({ summary: renderSummary, city: renderCity, politics: renderPolitics, border: renderBorder, citizenship: renderCitizenship, travel: renderTravel })[activeTab](r);
    bindDetailActions(r);
    $$("[data-detail-tab]").forEach(b => b.classList.toggle("active", b.dataset.detailTab === activeTab));
  }

  // ---------- Lokasi pemain ----------
  let lastHomeId = null, lastHereId = null;
  function renderPlayerLocation() {
    const player = Game.getPlayer(), w = playerWorld(), cur = regionById[w.currentProvinceId], cit = regionById[w.citizenshipProvinceId];
    $("#player-current-location").textContent = cur ? `${cur.flag} ${w.currentCityName || cur.city} · ${cur.country}` : "Belum ditentukan";
    $("#player-citizenship").textContent = cit ? `${cit.flag} ${cit.name}, ${cit.country}` : "Belum ditetapkan";
    $("#player-gold").textContent = fmt(player.gold); $("#player-local-money").textContent = `${fmt(Math.round(Game.getLocalMoney()))} ${Game.getLocalCurrency()}`;
    pathById.get(lastHomeId)?.classList.remove("citizen-home"); pathById.get(lastHereId)?.classList.remove("player-here");
    if (cit) pathById.get(cit.id)?.classList.add("citizen-home"); if (cur) pathById.get(cur.id)?.classList.add("player-here");
    lastHomeId = cit?.id; lastHereId = cur?.id;
    renderPin(cur);
    renderDetailContent();
  }

  // ---------- Pencarian ----------
  function closeSearchResults() { $("#search-results").classList.add("hidden"); }
  function runSearch() {
    const q = L.norm($("#province-search").value.trim()), holder = $("#search-results"); holder.innerHTML = "";
    if (!q) return closeSearchResults();
    const scored = [];
    regions.forEach(r => { const n = L.norm(r.name), c = L.norm(r.country), k = L.norm(r.cont); const s = n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : c.startsWith(q) ? 3 : c.includes(q) ? 4 : k.includes(q) ? 5 : 9; if (s < 9) scored.push([s, r]); });
    scored.sort((a, b) => a[0] - b[0] || b[1].area - a[1].area);
    scored.slice(0, 10).forEach(([, r]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "search-result";
      const t = document.createElement("b"); t.textContent = `${r.flag} ${r.name}`; const m = document.createElement("small"); m.textContent = `${r.country} · ${r.cont}`;
      b.append(t, m); b.addEventListener("click", () => { selectRegion(r.id, true); $("#province-search").value = r.name; $("#search-hint").textContent = `Wilayah dipilih: ${r.name}, ${r.country}.`; }); holder.appendChild(b);
    });
    if (!scored.length) { const b = document.createElement("button"); b.type = "button"; b.className = "search-result"; b.innerHTML = "<b>Tidak ditemukan</b><small>Coba nama provinsi, negara, atau benua lain.</small>"; holder.appendChild(b); }
    holder.classList.remove("hidden");
  }

  // ---------- Mode peta ----------
  const modeDescriptions = {
    political: "Abu-abu: wilayah dunia. Negara buatan pemain berwarna dan berbendera.", war: "Wilayah merah sedang dalam konflik (simulasi, hanya Indonesia).", resources: "Ikon sumber daya muncul saat zoom; warna = komoditas utama (Indonesia).",
    embargo: "Wilayah ungu terkena embargo ekonomi (simulasi).", trade: "Makin gelap-hijau makin banyak jalur perdagangan (simulasi)."
  };
  const modeLegend = { political: "Politik", war: "Perang", resources: "Sumber daya", embargo: "Embargo", trade: "Perdagangan" };
  function renderMapMode() {
    $("#map-viewport").dataset.mode = mapMode; $("#mode-description").textContent = modeDescriptions[mapMode];
    $("#mode-legend").textContent = `Mode: ${modeLegend[mapMode]}`;
    $$("[data-map-mode]").forEach(b => b.classList.toggle("active", b.dataset.mapMode === mapMode)); paintRegions();
    if (mapMode === "resources") { if (!resIcons.length) buildResourceIcons(); updateResourceLOD(); } else { byId("resource-layer").innerHTML = ""; resIcons = []; }
  }

  function setupEvents() {
    $("#province-search").addEventListener("input", runSearch);
    $("#close-region-panel").addEventListener("click", () => document.body.classList.remove("region-panel-open"));
    $("#clear-search").addEventListener("click", () => { $("#province-search").value = ""; $("#search-hint").textContent = "Coba: Sumatera Barat, Texas, Bavaria, Hokkaido, atau nama negara."; closeSearchResults(); });
    document.addEventListener("click", e => { if (!e.target.closest(".world-search-row")) closeSearchResults(); });
    $("#toggle-directory").addEventListener("click", () => document.body.classList.toggle("dir-open"));
    $("#zoom-range").max = String(ZOOM_MAX); $("#zoom-range").step = "0.1";
    $("#zoom-in").addEventListener("click", () => { zoom = Math.min(ZOOM_MAX, zoom * 1.4); updateZoom(); });
    $("#zoom-out").addEventListener("click", () => { zoom = Math.max(1, zoom / 1.4); updateZoom(); });
    $("#zoom-range").addEventListener("input", e => { zoom = Number(e.target.value); updateZoom(); });
    $("#zoom-reset").addEventListener("click", () => { zoom = 1; mapPan = { x: viewportSize().w / 2 - 500 * baseScale(), y: 0 }; updateZoom(); });
    $("#focus-indonesia").addEventListener("click", () => { const cur = currentRegion(); if (cur) { focusRegion(cur, 3); toast(`Fokus ke ${cur.name}.`); } });
    $$("[data-detail-tab]").forEach(b => b.addEventListener("click", () => { activeTab = b.dataset.detailTab; renderDetailContent(); }));
    $$("[data-map-mode]").forEach(b => b.addEventListener("click", () => { mapMode = b.dataset.mapMode; renderMapMode(); }));
    const vp = $("#map-viewport"); vp.style.touchAction = "none"; const pointers = new Map(); let drag = null, pinch = null;
    vp.addEventListener("pointerdown", e => {
      if (e.target.closest("button,input,select,label,summary,a")) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, px: mapPan.x, py: mapPan.y, moved: false };
      if (pointers.size === 2) { const a = [...pointers.values()]; pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), zoom }; drag = null; }
    });
    vp.addEventListener("pointermove", e => {
      if (!pointers.has(e.pointerId)) { window.__wdHover && e.pointerType === "mouse" && window.__wdHover(e); return; }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1 && drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; $("#map-tooltip").classList.remove("show"); } if (drag.moved) { mapPan.x = drag.px + dx; mapPan.y = drag.py + dy; updateZoom(); } }
      if (pointers.size === 2 && pinch) { const a = [...pointers.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); zoom = Math.max(1, Math.min(ZOOM_MAX, pinch.zoom * d / Math.max(1, pinch.d))); updateZoom(); }
    });
    const end = e => {
      if (!pointers.has(e.pointerId)) return;
      const wasClick = e.type === "pointerup" && pointers.size === 1 && drag && !drag.moved;
      pointers.delete(e.pointerId);
      if (!pointers.size) { drag = null; pinch = null; } else if (pointers.size === 1) { const a = [...pointers.values()][0]; drag = { x: a.x, y: a.y, px: mapPan.x, py: mapPan.y, moved: true }; pinch = null; }
      if (wasClick) handleMapClick(e);
    };
    vp.addEventListener("pointerup", end); vp.addEventListener("pointercancel", end);
    vp.addEventListener("wheel", e => { e.preventDefault(); const r = vp.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, next = Math.max(1, Math.min(ZOOM_MAX, zoom * (e.deltaY < 0 ? 1.18 : 0.85))), k = next / zoom; mapPan.x = x - (x - mapPan.x) * k; mapPan.y = y - (y - mapPan.y) * k; zoom = next; updateZoom(); }, { passive: false });
    window.addEventListener("resize", updateZoom);
  }

  function tick() {
    if (Game.completeFlight()) { const cur = currentRegion(); toast(`Penerbangan selesai. Kamu tiba di ${cur ? cur.name + ", " + cur.country : "tujuan"}.`); renderPlayerLocation(); }
    const w = playerWorld();
    if (w.pendingFlight && $("#flight-countdown")) $("#flight-countdown").textContent = `Sisa ${duration(w.pendingFlight.arrivalAt - Date.now())}`;
    if (activeTab === "citizenship" && $("#citizenship-cooldown")) $("#citizenship-cooldown").textContent = cooldownText();
  }

  async function init() {
    const status = $("#gis-map-status");
    setupEvents(); setupTooltip(); updateZoom();
    const data = await L.ready;
    try {
      if (data) { registerRegions(data.provinces); dataMode = "provinsi"; drawBaseLayer(); }
      else { registerRegions(await buildCountryRegions()); dataMode = "negara"; }
    } catch (err) {
      console.warn(err); status.innerHTML = "<i></i> PETA GAGAL DIMUAT"; status.classList.add("gis-fallback");
      toast(`Peta negara gagal dimuat (${err.message}). Klik "Bangun peta provinsi" untuk membuat peta tanpa lapisan CDN.`); showSetupBanner(`Peta negara tidak bisa dimuat (${err.message}).`); return;
    }
    if (dataMode === "negara") { status.innerHTML = `<i></i> MODE NEGARA`; status.classList.add("gis-fallback"); showSetupBanner(L.isCacheStale() ? "Peta lama (terlalu berat) dihapus dan perlu dibangun ulang dalam versi ringan." : ""); }
    $("#world-stat-total").textContent = `${fmt(regions.length)} ${dataMode === "provinsi" ? "Provinsi" : "Negara"} · ${byCountry.size} negara`; $("#dir-count").textContent = `${fmt(regions.length)} wilayah`;
    // Penempatan awal acak di wilayah yang terbuka (Indonesia). Juga memindahkan pemain lama yang berada di wilayah terkunci.
    const w = playerWorld(), curR = regionById[w.currentProvinceId];
    if (!w.startAssigned || !curR || !L.isUnlocked(curR)) {
      const r = L.pickStartRegion(regions);
      if (r) { Game.assignStartLocation({ id: r.id, name: r.name, city: r.city, country: r.country, iso2: r.iso2 }); toast(`🎲 Kamu lahir di ${r.name}, ${r.country}. Itu kampung halamanmu sekarang.`); }
    }
    drawRegions(); renderMapMode(); renderFlags(); renderPlayerLocation();
    const start = currentRegion() || regions[0]; selectedId = start.id; dirCont = start.cont; dirCountry = start.country;
    pathById.get(selectedId)?.classList.add("selected"); renderDirectory(); renderQuickStats(start); renderDetailContent();
    document.body.classList.remove("region-panel-open");
    setTimeout(() => focusRegion(start, 3), 50);
    setInterval(tick, 1000);
  }
  init();
})();
