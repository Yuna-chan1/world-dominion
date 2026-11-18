/* WORLD DOMINION V.I — KONTRAK BUILD 0.9 (barter antar pemain; lawan saat ini = pemain simulasi) */
(() => {
  "use strict";
  const U = EcoUI, E = EcoEngine, G = Game, $ = U.$;
  let tab = "in", query = "", pick = { give: "gold:Emas", receive: "gold:Emas" };
  const main = $("#eco-main");
  main.innerHTML = `${E.CONFIG.DEV_MODE ? '<div class="eco-warn">🧪 <b>Mode uji aktif</b>: syarat level 20 dan umur akun 3 hari dilonggarkan supaya kamu bisa mencoba kontrak. Matikan lewat <code>EcoEngine.CONFIG.DEV_MODE = false</code> di economy.js.</div>' : ""}
  <div class="ct-layout"><div class="ct-side"><div class="eco-pad" style="border-bottom:1px solid #223149;display:flex;justify-content:space-between;align-items:center"><b style="font-size:20px;letter-spacing:2px;color:#fff">◆ KONTRAK</b><button class="eco-btn small" id="ct-new">✎ Kontrak baru</button></div>
  <div class="ct-nav" id="ct-nav"></div><div class="ct-rules"><h4>ATURAN</h4><ul id="ct-rules"></ul></div></div><div class="ct-body" id="ct-body"></div></div>`;
  const R = E.CONFIG;
  $("#ct-rules").innerHTML = [["🛡", `Kedua pihak: level ${R.contractMinLevel}+ dan akun berumur ${R.contractMinAgeDays} hari`], ["⏳", "Tawaran berlaku 24 jam"], ["📅", `${R.contractDailyLimit} tawaran per hari`], ["🎫", "Satu tiket kurir per pihak — tingkatnya mengikuti jarak"], ["🏛", "Negara tiap pihak memungut biaya notaris; pengirim membayar keduanya"], ["📚", `Maksimal ${R.contractMaxLines} baris per pihak`]].map(([i, t]) => `<li><span>${i}</span><span>${t}</span></li>`).join("");
  const TABS = [["draft", "✎", "Draf"], ["in", "📥", "Masuk"], ["out", "📤", "Terkirim"], ["hist", "🕘", "Riwayat"]];
  function renderNav() {
    const n = { in: E.contractsByTab("in").length, out: E.contractsByTab("out").length };
    $("#ct-nav").innerHTML = TABS.map(([k, i, t]) => `<button data-t="${k}" class="${tab === k ? "active" : ""}"><span>${i}</span> ${t}${n[k] ? `<span class="n">${n[k]}</span>` : ""}</button>`).join("");
    U.$$("#ct-nav button").forEach(b => b.onclick = () => { tab = b.dataset.t; renderAll(); });
  }
  const linesHtml = lines => lines.map(l => `<span class="badge dark" style="margin:2px">${E.lineIcon(l)} ${U.fmt(l.qty, l.type === "item" ? 0 : l.type === "gold" ? 3 : 2)} ${E.lineLabel(l)}</span>`).join(" ");
  function stats() {
    const s = E.contractStats();
    return `<div class="eco-stats"><div class="eco-stat"><span>📥 Menunggumu</span><b>${s.waiting}</b><small>${s.waiting} milikmu masih terbuka</small></div><div class="eco-stat"><span>🤝 Kesepakatan selesai</span><b class="up">${s.done}</b><small>diterima, dua arah</small></div><div class="eco-stat"><span>🏛 Notaris dibayar</span><b>${U.fmt(s.notary, 2)}</b><small>emas, dari tawaran yang kamu kirim</small></div><div class="eco-stat"><span>📅 Terkirim hari ini</span><b>${s.sent}<small>/${s.limit}</small></b><div class="eco-bar" style="margin-top:6px"><i style="width:${s.sent / s.limit * 100}%"></i></div></div></div>`;
  }
  const empty = (msg, btn = true) => `<div class="eco-empty" style="padding:40px"><div style="font-size:32px;margin-bottom:8px">🤝</div>${msg}${btn ? '<br><br><button class="eco-btn primary" data-go="draft">✎ Kontrak baru</button>' : ""}</div>`;
  const statusBadge = s => ({ accepted: '<span class="badge green">Diterima</span>', declined: '<span class="badge red">Ditolak</span>', cancelled: '<span class="badge dark">Dibatalkan</span>', expired: '<span class="badge dark">Kedaluwarsa</span>', pending: '<span class="badge">Menunggu</span>' }[s]);
  function card(c, actions) {
    return `<div class="ct-card"><div class="hd"><div><b style="font-size:14px">${c.dir === "in" ? "Dari" : "Untuk"} ${U.esc(c.withName)}</b> <span class="muted" style="font-size:11px">· ${U.fmt(c.km)} km · tiket kurir ×${c.tier}</span></div><div>${statusBadge(c.status)} ${c.status === "pending" ? `<span class="muted" style="font-size:11px">sisa ${U.left(c.expiresAt - Date.now())}</span>` : `<span class="muted" style="font-size:11px">${U.ago(c.resolvedAt || c.createdAt)} lalu</span>`}</div></div>
      <div class="ct-sides" style="margin-bottom:10px"><div><h4>KAMU MEMBERI</h4>${linesHtml(c.give)}</div><div><h4>KAMU MENERIMA</h4>${linesHtml(c.receive)}</div></div>${c.note ? `<div class="eco-note" style="margin-bottom:8px">📝 ${U.esc(c.note)}</div>` : ""}${c.reason ? `<div class="eco-note down" style="margin-bottom:8px">${U.esc(c.reason)}</div>` : ""}<div class="eco-row" style="justify-content:flex-end">${actions || ""}</div></div>`;
  }
  const optGroups = () => `<optgroup label="Emas & mata uang"><option value="gold:Emas">🪙 Emas</option>${E.codes().map(c => `<option value="cur:${c}">💱 ${c} — ${G.CURRENCIES[c].name}</option>`).join("")}</optgroup><optgroup label="Barang">${Object.keys(E.ITEMS).map(n => `<option value="item:${n}">${E.ITEMS[n].icon} ${n}</option>`).join("")}</optgroup>`;
  const sideBox = (side, title, ownHint) => {
    const d = E.eco().draft, v = pick[side], [t, k] = v.split(":"), have = ownHint ? E.have({ type: t, key: k }) : null;
    return `<div><h4>${title}</h4><div id="ln-${side}">${d[side].length ? d[side].map((l, i) => `<div class="ct-line"><span>${E.lineIcon(l)} ${U.fmt(l.qty, l.type === "item" ? 0 : l.type === "gold" ? 3 : 2)} ${E.lineLabel(l)}</span><button data-rm="${side}:${i}" aria-label="Hapus">✕</button></div>`).join("") : '<div class="eco-note" style="margin-bottom:8px;font-style:italic">Belum ada yang ditambahkan</div>'}</div>
      <select class="eco-select" data-sel="${side}" style="margin-bottom:8px">${optGroups().replace(`value="${v}"`, `value="${v}" selected`)}</select><div class="eco-row"><input class="eco-input" data-qty="${side}" type="number" min="0" step="any" placeholder="Jumlah"><button class="eco-btn small" data-add="${side}" style="flex:none;min-width:0">＋ Tambah</button></div>${ownHint ? `<div class="eco-note" style="margin-top:6px">Kamu punya ${U.fmt(have, t === "item" ? 0 : 2)} ${k === "Emas" ? "emas" : k}</div>` : ""}</div>`;
  };
  function renderDraft() {
    const d = E.eco().draft, to = d.to ? E.playerById(d.to) : null, qd = E.quoteDraft(d), res = query || document.activeElement && document.activeElement.id === "ct-q" ? E.searchPlayers(query) : [];
    $("#ct-body").innerHTML = `<div class="ct-card" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="eco-ico">👤</div><div style="flex:1;min-width:160px"><b>Untuk</b><div class="muted" style="font-size:12px">${to ? `${U.esc(to.name)} · Lv ${to.level} · ${U.esc(to.regionName)}` : "Untuk siapa tawaran ini — jarak menentukan tiket kurir."}</div></div><div style="position:relative;flex:1;min-width:200px"><input id="ct-q" class="eco-search" placeholder="Cari pemain..." value="${U.esc(query)}" autocomplete="off"><div id="ct-res" class="eco-panel" style="position:absolute;left:0;right:0;top:44px;z-index:20;display:${res.length ? "block" : "none"}">${res.map(p => `<div class="eco-item" data-p="${p.id}"><div class="t"><b>${U.esc(p.name)}</b><small>Lv ${p.level} · ${U.esc(p.regionName)}${E.eligible(p) ? "" : " · belum memenuhi syarat"}</small></div></div>`).join("")}</div></div></div>
    <div class="ct-sides">${sideBox("give", "KAMU MEMBERI", true)}${sideBox("receive", "KAMU MENERIMA", false)}</div>
    <label class="eco-field" style="margin-top:14px">CATATAN (OPSIONAL)<textarea id="ct-note" class="eco-input" rows="3" placeholder="mis. batu bara untuk pabrikku">${U.esc(d.note)}</textarea></label>
    <div class="eco-sum">${to ? `<div class="ln"><span>Jarak</span><b>${U.fmt(qd.km)} km</b></div><div class="ln"><span>Tiket kurir per pihak</span><b>${qd.tier} 🎫 (kamu punya ${U.fmt(G.getPlayer().inventory[E.TICKET] || 0)})</b></div>` : ""}<div class="ln"><span>Biaya notaris (pengirim bayar keduanya)</span><b>${U.fmt(qd.feeTotal, 3)} 🪙</b></div><div class="ln"><span>Nilai yang kamu beri / terima</span><b>$${U.fmt(qd.giveUsd, 2)} / $${U.fmt(qd.recvUsd, 2)}</b></div>${qd.errors.length ? `<div class="ln"><span class="down">⚠ ${U.esc(qd.errors[0])}</span></div>` : ""}</div>
    <div class="eco-row" style="justify-content:flex-end"><button class="eco-btn" id="ct-drop" style="flex:none">Buang</button><button class="eco-btn primary" id="ct-send" style="flex:none" ${qd.ok ? "" : "disabled"}>📜 Kirim tawaran</button></div>`;
    $("#ct-q").oninput = e => { query = e.target.value; renderDraft(); const i = $("#ct-q"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
    $("#ct-q").onfocus = () => { if (!query) { $("#ct-res").innerHTML = E.searchPlayers("").map(p => `<div class="eco-item" data-p="${p.id}"><div class="t"><b>${U.esc(p.name)}</b><small>Lv ${p.level} · ${U.esc(p.regionName)}</small></div></div>`).join(""); $("#ct-res").style.display = "block"; bindPick(); } };
    bindPick();
    $("#ct-note").onchange = e => E.setNote(e.target.value); $("#ct-drop").onclick = () => { E.resetDraft(); query = ""; renderAll(); };
    U.$$("[data-sel]").forEach(s => s.onchange = () => { pick[s.dataset.sel] = s.value; renderDraft(); });
    U.$$("[data-add]").forEach(b => b.onclick = () => { const side = b.dataset.add, [t, k] = pick[side].split(":"), qty = Number($(`[data-qty="${side}"]`).value); const r = E.addLine(side, { type: t, key: k === "Emas" ? "Emas" : k, qty }); if (!r.ok) U.toast(r.reason); renderDraft(); });
    U.$$("[data-rm]").forEach(b => b.onclick = () => { const [s, i] = b.dataset.rm.split(":"); E.removeLine(s, Number(i)); renderDraft(); });
    $("#ct-send").onclick = () => { E.setNote($("#ct-note").value); const r = E.sendDraft(); if (!r.ok) return U.toast(r.reason); U.toast("Tawaran terkirim. Jawaban biasanya datang dalam beberapa menit."); U.refreshWallet(); query = ""; tab = "out"; renderAll(); };
  }
  function bindPick() { U.$$("[data-p]").forEach(el => el.onclick = () => { E.setRecipient(el.dataset.p); query = ""; renderDraft(); }); }
  function renderList() {
    const cs = E.contractsByTab(tab); let html = stats();
    if (!cs.length) html += tab === "in" ? `<div class="eco-sec">MASUK · 0</div>` + empty("Tidak ada tawaran yang menunggumu.") : tab === "out" ? empty("Kamu belum mengirim tawaran yang masih terbuka.") : empty("Belum ada riwayat kontrak.", false);
    else html += `<div class="eco-sec">${{ in: "MASUK", out: "TERKIRIM", hist: "RIWAYAT" }[tab]} · ${cs.length}</div>` + cs.map(c => card(c, tab === "in" ? `<button class="eco-btn danger" data-dec="${c.id}">Tolak</button><button class="eco-btn primary" data-acc="${c.id}">Terima</button>` : tab === "out" ? `<button class="eco-btn danger" data-cx="${c.id}">Batalkan</button>` : "")).join("");
    $("#ct-body").innerHTML = html;
    U.$$("[data-go]").forEach(b => b.onclick = () => { tab = "draft"; renderAll(); });
    const act = (r, m) => { U.toast(r.ok ? m : r.reason); U.refreshWallet(); renderAll(); };
    U.$$("[data-acc]").forEach(b => b.onclick = () => act(E.respondContract(b.dataset.acc, true), "Kesepakatan diterima. Barang masuk ke inventarismu."));
    U.$$("[data-dec]").forEach(b => b.onclick = () => act(E.respondContract(b.dataset.dec, false), "Tawaran ditolak."));
    U.$$("[data-cx]").forEach(b => b.onclick = () => act(E.cancelContract(b.dataset.cx), "Tawaran dibatalkan, barang dan biaya dikembalikan."));
  }
  function renderAll() { renderNav(); tab === "draft" ? renderDraft() : renderList(); }
  $("#ct-new").onclick = () => { tab = "draft"; renderAll(); };
  if (EcoUI.boot(document.body.dataset.page, () => { renderNav(); if (tab !== "draft") renderList(); }, 6000)) renderAll();
})();
