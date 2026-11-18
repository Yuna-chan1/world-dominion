/* WORLD DOMINION V.I — PEKERJAAN BUILD 0.9 */
(() => {
  "use strict";
  const U = EcoUI, E = EcoEngine, G = Game, $ = U.$;
  const F = { scope: "home", q: "", item: "", kind: "", hideFull: false, hideCantPay: false, onlyShare: false, hideNoMat: false };
  let selId = null;
  const main = $("#eco-main");
  main.innerHTML = `<div class="eco-head"><div><h1>💼 Pekerjaan</h1><p id="jb-sub"></p></div></div>
  <div class="eco-split"><aside><div class="eco-panel"><div class="eco-pad" style="position:relative"><input id="jb-q" class="eco-search" placeholder="Cari nama perusahaan atau pemilik..."><div class="eco-row" style="margin-top:10px"><button class="eco-btn small" id="jb-item" style="flex:1">📦 Jenis barang: Semua ▾</button></div><div id="jb-pop" class="eco-popover" style="display:none;left:14px;top:96px"></div>
    <div class="chip-row" id="jb-tags"></div></div><div class="eco-tabs" id="jb-tabs"><button data-k="" class="active">Semua</button><button data-k="resource">Bahan baku</button><button data-k="factory">Pabrik</button></div><div class="eco-list" id="jb-list"></div></div>
    <div class="eco-card" style="margin-top:14px"><h3>💼 Pekerjaanmu</h3><div id="jb-mine"></div></div></aside>
  <section id="jb-detail"></section></div>`;

  const tagDefs = () => [["scope", `📍 ${E.home().name}`, F.scope === "home", () => { F.scope = F.scope === "home" ? "all" : "home"; }, "Lokasi tempat tinggalmu (wilayah kewarganegaraan), bukan tempat kamu sedang berada"],
    ["full", "🙈 Sembunyikan penuh", F.hideFull, () => { F.hideFull = !F.hideFull; }], ["pay", "💸 Sembunyikan tak sanggup bayar", F.hideCantPay, () => { F.hideCantPay = !F.hideCantPay; }],
    ["share", "🤝 Bagi hasil", F.onlyShare, () => { F.onlyShare = !F.onlyShare; }], ["mat", "📦 Sembunyikan tanpa bahan", F.hideNoMat, () => { F.hideNoMat = !F.hideNoMat; }]];
  function renderTags() {
    $("#jb-tags").innerHTML = tagDefs().map((t, i) => `<span class="chip ${t[2] ? "on" : ""}" data-i="${i}" title="${U.esc(t[4] || "")}">${U.esc(t[1])}</span>`).join("");
    U.$$("#jb-tags .chip").forEach(c => c.onclick = () => { tagDefs()[c.dataset.i][3](); renderTags(); renderList(); });
    $("#jb-sub").innerHTML = F.scope === "home" ? `Lowongan di wilayah tempat tinggalmu: <b>${U.esc(E.home().name)}</b>. Kamu sedang berada di <b>${U.esc(E.here().name)}</b>.` : "Lowongan di seluruh wilayah yang terbuka.";
  }
  function renderPop() {
    const pop = $("#jb-pop"); pop.innerHTML = `<button data-i="" class="${F.item ? "" : "on"}">✨ Semua</button>` + Object.keys(E.ITEMS).map(n => `<button data-i="${U.esc(n)}" class="${F.item === n ? "on" : ""}">${E.ITEMS[n].icon} ${n}</button>`).join("");
    U.$$("button", pop).forEach(b => b.onclick = () => { F.item = b.dataset.i; pop.style.display = "none"; $("#jb-item").textContent = `📦 Jenis barang: ${F.item || "Semua"} ▾`; renderList(); });
  }
  const list = () => E.jobList(F);
  function renderList() {
    const jobs = list(); if (!selId && jobs[0]) selId = jobs[0].id;
    $("#jb-list").innerHTML = jobs.map(c => `<div class="eco-item ${c.id === selId ? "active" : ""}" data-id="${U.esc(c.id)}"><div class="eco-ico">${E.ITEMS[c.item].icon}</div><div class="t"><b>${U.esc(c.name)}</b><small>${c.kind === "resource" ? "Bahan baku" : "Pabrik"} · ${U.esc(c.regionName)}</small><small>${U.esc(c.owner)} · Lv ${c.level} · ${c.workersCount}/${c.level} pekerja</small></div><div class="r">${c.mode === "wage" ? U.fmt(c.wageGold, 3) + " 🪙" : c.sharePct + "%"}<small>${c.tags.full ? '<span class="down">Penuh</span>' : c.tags.cantPay ? '<span class="down">Tak mampu</span>' : c.tags.noMaterials ? '<span class="down">Tanpa bahan</span>' : c.employed ? '<span class="up">Kerjamu</span>' : c.mode === "share" ? "bagi hasil" : "/ giliran"}</small></div></div>`).join("") || '<div class="eco-empty">Tidak ada lowongan yang cocok.</div>';
    U.$$("#jb-list .eco-item").forEach(el => el.onclick = () => { selId = el.dataset.id; renderList(); renderDetail(); });
  }
  const tagBadges = c => [c.tags.full && '<span class="badge red">Penuh</span>', c.tags.cantPay && '<span class="badge red">Tak sanggup bayar upah</span>', c.tags.share && '<span class="badge">Bagi hasil</span>', c.tags.noMaterials && '<span class="badge red">Tanpa bahan</span>', !c.recruiting && '<span class="badge dark">Tidak merekrut</span>'].filter(Boolean).join(" ");
  function renderMine() {
    const j = E.job(), c = j && E.getCompany(j.companyId), box = $("#jb-mine");
    if (!c) { box.innerHTML = '<div class="eco-empty">Kamu belum bekerja. Pilih lowongan lalu tekan “Bekerja sekarang”.</div>'; return; }
    const v = E.view(c); box.innerHTML = `<b>${U.esc(c.name)}</b><div class="muted" style="font-size:12px;margin:4px 0">${E.ITEMS[c.item].icon} ${c.kind === "resource" ? "Memproduksi" : "Membuat"} ${c.item} · ${U.esc(v.regionName)}</div><div class="muted" style="font-size:12px">Pemberi kerja: <b class="gold">${U.esc(c.owner)}</b></div><div class="muted" style="font-size:12px;margin:6px 0 10px">${j.turns} giliran · ${U.fmt(j.earnedGold, 3)} 🪙${j.earnedItems ? " · " + j.earnedItems + " " + c.item : ""}</div><button class="eco-btn danger full" id="jb-quit-side">Mengundurkan diri</button>`;
    $("#jb-quit-side").onclick = quit;
  }
  function renderDetail() {
    const box = $("#jb-detail"), c0 = selId && E.getCompany(selId); if (!c0) { box.innerHTML = '<div class="eco-empty">Pilih lowongan di sebelah kiri.</div>'; return; }
    const c = E.view(c0), j = E.job(), mineHere = j && j.companyId === c.id, here = E.here().id === c.regionId, p = G.getPlayer(), per = E.unitsPerCycle(c), cyc = Math.floor(p.energy / 10);
    const pay = c.mine ? "Pemilik (tanpa upah)" : c.mode === "wage" ? `${U.fmt(c.wageGold * G.getWageMultiplier(), 3)} 🪙 per giliran` : `${c.sharePct}% dari hasil produksi`;
    box.innerHTML = `<div class="eco-stats"><div class="eco-stat"><span>Tenaga kerja</span><b>${c.workersCount}<small> / ${c.level}</small></b><small>${c.vacancies} lowongan</small></div><div class="eco-stat"><span>Di gudang</span><b>${U.fmt(c.whOut)}</b><small>${c.item}</small></div><div class="eco-stat"><span>Pembayaran</span><b class="gold" style="font-size:16px">${c.mode === "wage" ? "Upah uang" : "Bagi hasil"}</b><small>${pay}</small></div><div class="eco-stat"><span>Hasilmu / sesi</span><b class="gold">${Math.floor(cyc * per)}</b><small>${cyc} giliran · ${c.item}</small></div></div>
    <div class="eco-card"><div class="eco-hero" style="margin:0 0 12px"><div class="eco-ico">${E.ITEMS[c.item].icon}</div><div><h2>${U.esc(c.name)}</h2><div class="chip-row" style="margin:6px 0 0"><span class="badge">${c.typeLabel}</span><span class="badge dark">${c.kind === "resource" ? "Memproduksi" : "Membuat"} ${c.item}</span><span class="badge dark">📍 ${U.esc(c.regionName)}</span> ${tagBadges(c)}</div></div></div>
      <div class="eco-sec">Deskripsi perusahaan</div><p class="eco-note" style="font-size:13px;color:#c9d4e6">${U.esc(c.name)} milik <b>${U.esc(c.owner)}</b> (Lv ${c.ownerLevel}) adalah ${c.typeLabel.toLowerCase()} level ${c.level} di ${U.esc(c.regionName)}. ${c.kind === "resource" ? `Perusahaan menarik ${c.item} langsung dari tanah wilayahnya${c.deposit ? ` (cadangan terdeteksi: hasil lahan +${Math.round((c.landBonus - 1) * 100)}%)` : " (tanpa cadangan: hasil standar)"}.` : `Pabrik mengolah ${E.ITEMS[c.item].input} menjadi ${c.item} (${E.CONFIG.inputRatio} bahan = 1 unit). Stok bahan: ${U.fmt(c.whIn)}.`} Sistem pembayaran: <b>${c.mode === "wage" ? "upah uang" : "bagi hasil produksi"}</b>. Dana perusahaan ${U.fmt(c.funds, 2)} 🪙.</p>
      <div class="eco-row" style="margin-top:12px"><button class="eco-btn primary" id="jb-work" style="flex:2">⚒ Bekerja sekarang</button><button class="eco-btn danger" id="jb-quit" ${mineHere ? "" : "disabled"}>Mengundurkan diri</button>${!here ? `<a class="eco-btn" href="world.html" style="flex:2;text-align:center;text-decoration:none">✈ Terbang ke ${U.esc(c.regionName)}</a>` : ""}</div>
      <div class="eco-note" style="margin-top:8px">${mineHere ? "Kamu bekerja di sini." : j ? "Kamu bekerja di perusahaan lain; mundur dulu untuk pindah." : "Menekan “Bekerja sekarang” akan mengambil pekerjaan ini lalu langsung bekerja."} ${!here ? "Kamu harus berada di wilayah perusahaan untuk bekerja." : ""}</div></div>
    <div class="eco-card"><h3>📁 Berkas pekerja</h3><div class="eco-two"><div><div class="eco-sec">Stat ekonomi</div><div class="eco-stat" style="border:0;padding:0 0 10px"><b class="gold">${p.stats.economy}</b><small>produksi ×${G.getProductionMultiplier().multiplier.toFixed(2)} · upah ×${G.getWageMultiplier().toFixed(2)}</small></div>
      <div class="eco-sec">Energi</div><div class="eco-bar energy"><i style="width:${p.energy / p.maxEnergy * 100}%"></i></div><div class="muted" style="font-size:12px;margin:5px 0 12px">${Math.floor(p.energy)} / ${p.maxEnergy}</div><div class="eco-sec">Pemberi kerja</div><div style="font-size:13px">${j ? U.esc((E.getCompany(j.companyId) || {}).owner || "-") + " · " + U.esc((E.getCompany(j.companyId) || {}).name || "") : '<span class="muted">Belum bekerja</span>'}</div></div>
      <div><div class="eco-sec">Izin kerja <small>riwayat & berlangsung</small></div>${permitsHtml()}</div></div></div>`;
    $("#jb-work").onclick = () => work(c.id); $("#jb-quit").onclick = quit;
  }
  function permitsHtml() {
    const ps = E.permits(); if (!ps.length) return '<div class="eco-empty">Belum ada pengajuan izin kerja. Izin hanya dibutuhkan untuk bekerja di negara lain (ajukan lewat Peta Dunia → Perjalanan).</div>';
    return `<table class="eco-table"><tr><th>Wilayah</th><th>Status</th><th>Diajukan</th></tr>${ps.slice(0, 6).map(p => `<tr><td>${U.esc(E.regionName(p.provinceId))}</td><td><span class="badge ${p.status === "ditolak" ? "red" : p.status === "menunggu" ? "" : "green"}">${U.esc(p.status)}</span></td><td>${U.ago(p.submittedAt)} lalu</td></tr>`).join("")}</table>`;
  }
  function work(id) {
    if (!E.job() || E.job().companyId !== id) { const r = E.takeJob(id); if (!r.ok) return U.toast(r.reason); }
    const r = E.workNow(); if (!r.ok) { U.toast(r.reason); renderAll(); return; }
    U.toast(`Bekerja ${r.cycles} giliran: +${r.units} ${r.item} untuk perusahaan${r.gold ? `, upah ${U.fmt(r.gold, 3)} 🪙` : ""}${r.shareUnits ? `, bagianmu ${r.shareUnits} ${r.item}` : ""}, +${r.exp} EXP`); U.refreshWallet(); renderAll();
  }
  function quit() { const r = E.quitJob(); U.toast(r.ok ? "Kamu mengundurkan diri." : r.reason); renderAll(); }
  function renderAll() { renderTags(); renderList(); renderMine(); renderDetail(); }
  $("#jb-q").oninput = e => { F.q = e.target.value; renderList(); };
  U.$$("#jb-tabs button").forEach(b => b.onclick = () => { F.kind = b.dataset.k; U.$$("#jb-tabs button").forEach(x => x.classList.toggle("active", x === b)); renderList(); });
  $("#jb-item").onclick = e => { e.stopPropagation(); const p = $("#jb-pop"); p.style.display = p.style.display === "none" ? "grid" : "none"; };
  document.addEventListener("click", e => { if (!e.target.closest("#jb-pop")) $("#jb-pop").style.display = "none"; });
  if (EcoUI.boot(document.body.dataset.page, () => { renderList(); renderMine(); renderDetail(); renderTags(); }, 6000)) { renderPop(); renderAll(); }
})();
