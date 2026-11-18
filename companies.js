/* WORLD DOMINION V.I — PERUSAHAAN BUILD 0.9 (tata letak mengikuti referensi: daftar kiri, panel detail kanan) */
(() => {
  "use strict";
  const U = EcoUI, E = EcoEngine, G = Game, $ = U.$;
  let selId = null, kind = "", q = "", wageTab = null, founding = false;
  const main = $("#eco-main");
  main.innerHTML = `<div class="eco-head"><div><h1>🏭 Perusahaan</h1><p>Kelola perusahaanmu: isi bahan, ambil hasil produksi, atur pekerja, atau dirikan perusahaan baru.</p></div><button class="eco-btn primary" id="co-new">＋ Perusahaan baru</button></div>
  <div class="eco-split"><aside><div class="eco-panel"><div class="eco-pad"><input id="co-q" class="eco-search" placeholder="Cari nama, produk, atau wilayah..."></div><div class="eco-tabs" id="co-tabs"><button data-k="" class="active">Semua</button><button data-k="resource">Bahan baku</button><button data-k="factory">Pabrik</button></div><div class="eco-list" id="co-list"></div></div>
  <div class="eco-card" style="margin-top:14px"><h3>💼 Pekerjaanmu</h3><div id="co-job"></div></div></aside><section id="co-detail"></section></div>`;
  const mine = () => E.eco().companies.map(c => E.view(c)).filter(c => (!kind || c.kind === kind) && (!q || (c.name + c.item + c.regionName).toLowerCase().includes(q.toLowerCase())));
  function renderList() {
    const cs = mine(); if (!selId && cs[0] && !founding) selId = cs[0].id;
    $("#co-list").innerHTML = cs.map(c => `<div class="eco-item ${c.id === selId && !founding ? "active" : ""}" data-id="${c.id}"><div class="eco-ico">${E.ITEMS[c.item].icon}</div><div class="t"><b>${U.esc(c.name)}</b><small>${c.kind === "resource" ? "⛏ Bahan baku" : "🏭 Pabrik"} · 📍 ${U.esc(c.regionName)}</small><small>Lv ${c.level} · 📦 ${U.fmt(c.whOut)} · 👥 ${c.workersCount}/${c.level}</small></div></div>`).join("") || `<div class="eco-empty" style="margin:14px">Belum ada perusahaan. Tekan “Perusahaan baru”.</div>`;
    U.$$("#co-list .eco-item").forEach(el => el.onclick = () => { selId = el.dataset.id; founding = false; wageTab = null; renderAll(); });
  }
  function renderJob() {
    const j = E.job(), c = j && E.getCompany(j.companyId), box = $("#co-job"); if (!c) { box.innerHTML = '<div class="eco-note">Belum bekerja. Cari lowongan di menu Pekerjaan, atau bekerja di perusahaanmu sendiri.</div>'; return; }
    box.innerHTML = `<b>${U.esc(c.name)}</b><div class="muted" style="font-size:12px;margin:4px 0 10px">${E.ITEMS[c.item].icon} ${U.esc(E.regionName(c.regionId))} · pemberi kerja ${U.esc(c.owner)}</div><button class="eco-btn danger full" id="co-quit">Mengundurkan diri</button>`;
    $("#co-quit").onclick = () => { U.toast(E.quitJob().ok ? "Kamu mengundurkan diri." : "Gagal."); renderAll(); };
  }
  function renderFound() {
    const regionItems = k => k === "resource" ? E.RAW : E.PRODUCTS, ctl = E.here();
    $("#co-detail").innerHTML = `<div class="eco-card"><h3>＋ Dirikan perusahaan baru <small>di ${U.esc(ctl.name)}</small></h3>
      <p class="eco-note" style="margin-bottom:12px">Ada 2 jenis: <b>pabrik bahan baku</b> (Gandum, Batu, Kayu, Besi, Minyak, Batu bara, Tembaga, Kapas — menarik dari tanah wilayah) dan <b>pabrik produksi</b> (Makanan ← Gandum, Senjata ← Besi, Tiket ← Minyak; ${E.CONFIG.inputRatio} bahan = 1 unit). Batas perusahaan di level ${G.getPlayer().level}: ${E.maxCompanies()} (kamu punya ${E.eco().companies.length}).</p>
      <label class="eco-field">Nama perusahaan<input id="f-name" class="eco-input" maxlength="30" placeholder="mis. Minang Iron Grup"></label>
      <div class="eco-row"><label class="eco-field">Jenis<select id="f-kind" class="eco-select"><option value="resource">Pabrik bahan baku — ${E.FOUND_COST.resource} Gold</option><option value="factory">Pabrik produksi — ${E.FOUND_COST.factory} Gold</option></select></label><label class="eco-field">Memproduksi<select id="f-item" class="eco-select"></select></label></div>
      <div class="eco-row"><button class="eco-btn primary" id="f-go" style="flex:2">Dirikan perusahaan</button><button class="eco-btn" id="f-cancel">Batal</button></div></div>`;
    const fill = () => { $("#f-item").innerHTML = regionItems($("#f-kind").value).map(n => `<option>${n}</option>`).join(""); }; fill(); $("#f-kind").onchange = fill;
    $("#f-cancel").onclick = () => { founding = false; renderAll(); };
    $("#f-go").onclick = () => { const r = E.foundCompany({ name: $("#f-name").value, kind: $("#f-kind").value, item: $("#f-item").value }); if (!r.ok) return U.toast(r.reason); U.toast(`Perusahaan ${r.company.name} berdiri!`); selId = r.company.id; founding = false; U.refreshWallet(); renderAll(); };
  }
  function renderDetail() {
    if (founding) return renderFound();
    const all = E.eco().companies.map(c => E.view(c)), c = all.find(x => x.id === selId), box = $("#co-detail");
    const total = { n: all.length, mines: all.filter(x => x.kind === "resource").length, fac: all.filter(x => x.kind === "factory").length, w: all.reduce((s, x) => s + x.workersCount, 0), cap: all.reduce((s, x) => s + x.level, 0), wh: all.reduce((s, x) => s + x.whOut, 0), rec: all.filter(x => x.recruiting).length };
    const top = `<div class="eco-stats"><div class="eco-stat"><span>Perusahaan</span><b>${total.n}</b><small>${total.mines} bahan baku · ${total.fac} pabrik</small></div><div class="eco-stat"><span>Tenaga kerja</span><b>${total.w} <small>/ ${total.cap}</small></b><small>kursi terisi</small></div><div class="eco-stat"><span>Di gudang</span><b>${U.fmt(total.wh)}</b><small>unit menunggu</small></div><div class="eco-stat"><span>Merekrut</span><b class="gold">${total.rec}</b><small>di papan lowongan</small></div></div>`;
    if (!c) { box.innerHTML = top + '<div class="eco-empty">Belum ada perusahaan terpilih. Dirikan yang pertama dengan tombol “Perusahaan baru”.</div>'; return; }
    const here = E.here().id === c.regionId, ws = c.workers, j = E.job(), isJob = j && j.companyId === c.id, inItem = c.kind === "factory" ? E.ITEMS[c.item].input : null, p = G.getPlayer();
    wageTab = wageTab || c.mode;
    const cost = E.upgradeCost(c), xp = Math.min(100, c.level / E.CONFIG.maxCompanyLevel * 100);
    box.innerHTML = top + (!here ? `<div class="eco-warn">Perusahaan ini berada di <b>${U.esc(c.regionName)}</b>; kamu sedang di ${U.esc(E.here().name)}. <a class="gold" href="world.html">✈ Terbang ke ${U.esc(c.regionName)}</a></div>` : "") + `
    <div class="eco-card"><div class="eco-hero" style="margin:0"><div class="eco-ico">${E.ITEMS[c.item].icon}</div><div><h2>${U.esc(c.name)}</h2><div class="chip-row" style="margin:6px 0 0"><span class="badge">${c.typeLabel}</span><span class="badge dark">${c.kind === "resource" ? "Memproduksi" : "Membuat"} ${c.item}</span><span class="badge dark">📍 ${U.esc(c.regionName)}</span></div></div>
      <div style="margin-left:auto;min-width:230px"><div style="display:flex;justify-content:space-between;font-size:11px"><b class="gold">LEVEL ${c.level}</b><span class="muted">kapasitas ${c.level} pekerja</span></div><div class="eco-bar" style="margin:6px 0"><i style="width:${xp}%"></i></div><button class="eco-btn full small" id="co-up" ${c.level >= E.CONFIG.maxCompanyLevel ? "disabled" : ""}>Naik ke Lv ${c.level + 1} · ${cost} Gold</button></div></div></div>
    <div class="eco-stats"><div class="eco-stat"><span>Tenaga kerja</span><b>${c.workersCount} <small>/ ${c.level}</small></b><small>tenaga kerja</small></div><div class="eco-stat"><span>Di gudang</span><b class="gold">${U.fmt(c.whOut)}</b><small>${c.item}</small></div><div class="eco-stat"><span>Hasil lahan</span><b>${c.kind === "resource" && c.deposit ? "+" + Math.round((c.landBonus - 1) * 100) + "%" : "—"}</b><small>${c.kind === "resource" ? (c.deposit ? "ada cadangan" : "tanpa cadangan · hasil standar") : "tidak berlaku"}</small></div><div class="eco-stat"><span>Merekrut</span><b class="gold">${c.recruiting ? "Buka" : "Tutup"}</b><small>${c.mode === "wage" ? "upah uang" : c.sharePct + "% hasil untuk pekerja"}</small></div></div>
    <div class="eco-card"><h3>🔧 Lini produksi <button class="eco-btn small" id="co-work" ${isJob ? "" : ""}>${isJob ? "⚒ Bekerja di sini" : "⚒ Bekerja di sini"}</button></h3><div class="eco-two" style="align-items:stretch">
      <div class="eco-panel eco-pad"><div class="eco-sec">${c.kind === "resource" ? "Masukan — tanahnya sendiri" : "Masukan — " + inItem}</div>${c.kind === "resource" ? `<div class="eco-hero" style="margin:0"><div class="eco-ico">📍</div><div><h2 style="font-size:17px">${U.esc(c.regionName)}</h2><div class="muted">${c.deposit ? "Cadangan " + U.fmt(c.deposit) + " · hasil lahan +" + Math.round((c.landBonus - 1) * 100) + "%" : "Tanpa cadangan · hasil standar"}</div></div></div><p class="eco-note" style="margin-top:10px">Penggalian tidak butuh bahan — tiap giliran menarik ${c.item} langsung dari wilayahnya.</p>` :
        `<div class="eco-hero" style="margin:0"><div class="eco-ico">${E.ITEMS[inItem].icon}</div><div><div class="px">${U.fmt(c.whIn)}</div><div class="muted">${inItem} di gudang · cukup untuk ${U.fmt(Math.floor(c.whIn / E.CONFIG.inputRatio))} unit</div></div></div>
        <div class="eco-row" style="margin-top:10px"><input id="in-amt" class="eco-input" type="number" min="1" placeholder="Jumlah (punya ${U.fmt(p.inventory[inItem] || 0)})"><button class="eco-btn small" id="in-dep" style="flex:none;min-width:0">Setor</button><button class="eco-btn small" id="in-wd" style="flex:none;min-width:0">Ambil</button></div>`}</div>
      <div class="eco-panel eco-pad"><div class="eco-sec">Gudang — ${c.item}</div><div class="eco-hero" style="margin:0"><div class="eco-ico">${E.ITEMS[c.item].icon}</div><div><div class="px">${U.fmt(c.whOut)}</div><div class="muted">unit tersimpan di sini</div></div></div><div class="eco-row" style="margin-top:10px"><input id="out-amt" class="eco-input" type="number" min="1" placeholder="Tarik ke inventaris"><button class="eco-btn small" id="out-max" style="flex:none;min-width:0">Maks</button><button class="eco-btn small" id="out-wd" style="flex:none;min-width:0">Tarik</button></div></div></div></div>
    <div class="eco-card"><h3>👥 Tenaga kerja <small>${c.workersCount}/${c.level}</small></h3>
      <div class="eco-row" style="margin-bottom:12px"><div class="eco-seg" id="w-tabs"><button data-w="wage" class="${wageTab === "wage" ? "active" : ""}">Upah uang</button><button data-w="share" class="${wageTab === "share" ? "active" : ""}">Bagi hasil produksi</button></div><div style="display:flex;gap:10px;align-items:center;justify-content:flex-end"><span class="muted" style="font-size:12px">Perekrutan dibuka</span><button class="eco-toggle ${c.recruiting ? "on" : ""}" id="w-rec" aria-label="Perekrutan"></button></div></div>
      <div class="eco-note" style="margin-bottom:10px">Ketentuan ini adalah tawaran untuk pekerja baru. Untuk mengubah bayaran pekerja yang sudah ada, gunakan Upah di barisnya.</div>
      <div class="eco-row">${wageTab === "wage" ? `<label class="eco-field">Upah per giliran (Gold)<input id="w-wage" class="eco-input" type="number" step="0.01" value="${c.wageGold}"></label>` : `<label class="eco-field">Bagian pekerja (% dari produksi) — minimal 10%<input id="w-share" class="eco-input" type="number" min="10" max="90" value="${c.sharePct}"></label>`}<button class="eco-btn primary" id="w-save" style="flex:none">Simpan</button></div>
      <div class="eco-row" style="margin:12px 0"><label class="eco-field" style="margin:0">Dana perusahaan: <b class="gold">${U.fmt(c.funds, 3)} Gold</b> (untuk upah)<input id="fd-amt" class="eco-input" type="number" step="0.1" placeholder="Jumlah Gold"></label><button class="eco-btn small" id="fd-dep" style="flex:none;min-width:0">Setor</button><button class="eco-btn small" id="fd-wd" style="flex:none;min-width:0">Tarik</button></div>
      <div class="eco-sec" style="margin-top:14px">Tenaga kerja · 7 hari terakhir</div>${ws.length ? `<table class="eco-table"><tr><th>Pekerja</th><th>Giliran</th><th>Unit</th><th>Bayaran</th><th>Terakhir</th><th></th></tr>${ws.map((w, i) => `<tr><td>${U.esc(w.name)}</td><td>${w.turns}</td><td>${U.fmt(w.units)}</td><td>${U.fmt(w.paid, 3)} 🪙</td><td class="muted">${w.lastAt ? U.ago(w.lastAt) : "—"}</td><td><button class="eco-btn danger small" data-fire="${i}">Berhentikan</button></td></tr>`).join("")}</table>` : '<div class="eco-empty">Belum ada pekerja. Buka perekrutan dengan upah/bagi hasil yang menarik (upah ≥ 0,08 🪙 atau bagi hasil ≥ 25%).</div>'}</div>`;
    bind(c);
  }
  function bind(c) {
    const act = (r, msg) => { U.toast(r.ok ? msg : r.reason); if (r.ok) { U.refreshWallet(); renderAll(); } };
    $("#co-up").onclick = () => { const r = E.upgradeCompany(c.id); act(r, `Naik ke level ${r.level}`); };
    $("#co-work").onclick = () => { if (!E.job() || E.job().companyId !== c.id) { const t = E.takeJob(c.id); if (!t.ok) return U.toast(t.reason); } const r = E.workNow(); if (!r.ok) { U.toast(r.reason); renderAll(); return; } U.toast(`Bekerja ${r.cycles} giliran: +${r.units} ${r.item}, +${r.exp} EXP`); U.refreshWallet(); renderAll(); };
    if ($("#in-dep")) { $("#in-dep").onclick = () => act(E.depositTo(c.id, "input", $("#in-amt").value), "Bahan disetor."); $("#in-wd").onclick = () => act(E.withdrawFrom(c.id, "input", $("#in-amt").value), "Bahan diambil."); }
    $("#out-wd").onclick = () => act(E.withdrawFrom(c.id, "output", $("#out-amt").value), "Hasil produksi ditarik ke inventaris."); $("#out-max").onclick = () => { $("#out-amt").value = Math.min(c.whOut, G.getPlayer().inventoryCapacity - G.inventoryUsed()); };
    U.$$("#w-tabs button").forEach(b => b.onclick = () => { wageTab = b.dataset.w; renderDetail(); });
    $("#w-rec").onclick = () => act(E.setTerms(c.id, { recruiting: !c.recruiting }), c.recruiting ? "Perekrutan ditutup." : "Perekrutan dibuka.");
    $("#w-save").onclick = () => act(E.setTerms(c.id, wageTab === "wage" ? { mode: "wage", wageGold: $("#w-wage").value } : { mode: "share", sharePct: $("#w-share").value }), "Ketentuan disimpan.");
    $("#fd-dep").onclick = () => act(E.depositTo(c.id, "funds", $("#fd-amt").value), "Dana disetor."); $("#fd-wd").onclick = () => act(E.withdrawFrom(c.id, "funds", $("#fd-amt").value), "Dana ditarik.");
    U.$$("[data-fire]").forEach(b => b.onclick = () => act(E.fireWorker(c.id, Number(b.dataset.fire)), "Pekerja diberhentikan."));
  }
  function renderAll() { renderList(); renderJob(); renderDetail(); }
  $("#co-q").oninput = e => { q = e.target.value; renderList(); };
  U.$$("#co-tabs button").forEach(b => b.onclick = () => { kind = b.dataset.k; U.$$("#co-tabs button").forEach(x => x.classList.toggle("active", x === b)); renderList(); });
  $("#co-new").onclick = () => { founding = true; renderAll(); };
  let busy = false;
  if (EcoUI.boot(document.body.dataset.page, () => { if (!busy && !document.activeElement.matches("input,select")) { renderList(); renderJob(); if (!founding) renderDetail(); } }, 7000)) renderAll();
})();
