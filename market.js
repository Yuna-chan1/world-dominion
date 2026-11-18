/* WORLD DOMINION V.I — PASAR (lokal & global) BUILD 0.9 */
(() => {
  "use strict";
  const U = EcoUI, E = EcoEngine, G = Game, $ = U.$;
  const scopeKind = document.body.dataset.scope === "global" ? "global" : "local";
  let sel = "Besi", grp = "all", q = "", side = "buy", mode = "market", chartAt = 0;
  const sid = () => scopeKind === "global" ? "global" : E.here().id, unit = () => E.unitCode(sid());
  const main = $("#eco-main");
  const head = () => scopeKind === "global"
    ? `<p>Seluruh dunia · semua transaksi memakai <b>Gold</b> · pajak impor/ekspor ${Math.round(E.taxRate(E.here().id, "importTax") * 100)}%</p>`
    : `<p>Pasar di <b>${U.esc(E.here().name)}</b> (tempat kamu berada) · mata uang <b>${G.getLocalCurrency()}</b> · pajak penghasilan ${Math.round(E.taxRate(E.here().id, "incomeTax") * 100)}%</p>`;
  main.innerHTML = `<div class="eco-head"><div><h1>${scopeKind === "global" ? "🌐 Pasar Global" : "🏪 Pasar Lokal"}</h1><div id="mk-sub"></div></div><div class="eco-note">Harga bergerak real-time; grafik memakai selang 10 menit.</div></div>
  <div class="eco-split"><aside class="eco-panel"><div class="eco-pad"><input id="mk-q" class="eco-search" placeholder="Cari barang..."></div>
    <div class="eco-tabs" id="mk-tabs"><button data-g="all" class="active">Semua</button><button data-g="raw">Bahan baku</button><button data-g="product">Produk</button></div><div class="eco-list" id="mk-list"></div></aside>
  <section><div id="mk-hero" class="eco-hero"></div><div class="eco-card"><h3>📈 Grafik harga & volume <small id="mk-chart-sub"></small></h3><div id="mk-chart"></div></div>
    <div class="eco-two"><div class="eco-card"><h3>🛒 Jual / Beli</h3><div id="mk-trade"></div></div><div class="eco-card eco-book"><h3>📒 Papan tawaran <small id="mk-book-sub"></small></h3><div id="mk-book"></div></div></div>
    <div class="eco-two"><div class="eco-card"><h3>🧾 Tawaranku <small>aktif & terisi</small></h3><div id="mk-orders"></div></div><div class="eco-card"><h3>🕒 Riwayat transaksi <small>real-time</small></h3><div id="mk-feed" class="eco-feed"></div></div></div></section></div>`;
  const items = () => Object.keys(E.ITEMS).filter(n => (grp === "all" || E.ITEMS[n].group === grp) && n.toLowerCase().includes(q.toLowerCase()));
  const px = n => E.midUsd(n, sid(), Date.now()) * E.unitScale(sid());

  function renderList() {
    const inv = G.getPlayer().inventory;
    $("#mk-list").innerHTML = items().map(n => { const s = E.series(n, sid(), 72), p = px(n); return `<div class="eco-item ${n === sel ? "active" : ""}" data-n="${U.esc(n)}"><div class="eco-ico">${E.ITEMS[n].icon}</div><div class="t"><b>${n}</b><small>Kamu punya ${U.fmt(inv[n] || 0)}</small></div><div class="r">${U.fmtUnit(p, unit())}<small>${U.chg(U.change(s))}</small></div></div>`; }).join("") || '<div class="eco-empty">Barang tidak ditemukan.</div>';
    U.$$("#mk-list .eco-item").forEach(el => el.onclick = () => { sel = el.dataset.n; buildTrade(); renderAll(true); });
  }
  function renderHero() {
    const s = E.series(sel, sid(), 72), p = px(sel);
    $("#mk-hero").innerHTML = `<div class="eco-ico">${E.ITEMS[sel].icon}</div><div><h2>${sel}</h2><div class="muted">${E.ITEMS[sel].group === "raw" ? "Bahan baku" : "Produk pabrik"} · stok kamu ${U.fmt(G.getPlayer().inventory[sel] || 0)}</div></div><div style="margin-left:auto;text-align:right"><div class="px">${U.fmtUnit(p, unit())} <small>${unit()}</small></div><div>${U.chg(U.change(s))} <span class="muted">24 jam</span></div></div>`;
    $("#mk-sub").innerHTML = head();
  }
  function renderChart(force) {
    if (!force && Date.now() - chartAt < 9000) return; chartAt = Date.now();
    const m = E.midUsd(sel, sid(), Date.now()) * E.unitScale(sid());
    U.chart($("#mk-chart"), E.series(sel, sid(), 72), { unit: unit(), live: { mid: m, ask: m * 1.012, bid: m * 0.988 } });
    $("#mk-chart-sub").textContent = `${sel} · 12 jam terakhir · ${unit()}`;
  }
  function renderBook() {
    const b = E.itemBook(sel, sid()), sc = E.unitScale(sid()), u = unit();
    const mine = E.myOrders("market").filter(o => o.key === sel && o.scope === sid() && o.status === "open");
    const row = (cls, price, qty, own) => `<div class="rw ${cls} ${own ? "mine" : ""}"><span>${U.fmtUnit(price, u)}</span><span>${U.fmt(qty)}</span><span>${own ? "Kamu" : ""}</span></div>`;
    const asks = b.asks.map(l => ({ p: l.price * sc, q: l.qty })).concat(mine.filter(o => o.side === "sell").map(o => ({ p: o.price, q: o.qty - o.filled, own: 1 }))).sort((a, c) => c.p - a.p).slice(-6);
    const bids = b.bids.map(l => ({ p: l.price * sc, q: l.qty })).concat(mine.filter(o => o.side === "buy").map(o => ({ p: o.price, q: o.qty - o.filled, own: 1 }))).sort((a, c) => c.p - a.p).slice(0, 6);
    $("#mk-book-sub").textContent = `harga dalam ${u}`;
    $("#mk-book").innerHTML = `<div class="rows"><div class="rw hd"><span>Harga</span><span>Jumlah</span><span></span></div>${asks.map(l => row("ask", l.p, l.q, l.own)).join("")}<div class="rw" style="color:#f2d58a;font-weight:800;border-top:1px solid #223149;border-bottom:1px solid #223149"><span>${U.fmtUnit(px(sel), u)}</span><span>harga tengah</span><span></span></div>${bids.map(l => row("bid", l.p, l.q, l.own)).join("")}</div>`;
  }
  function buildTrade() {
    const defPrice = () => { const b = E.itemBook(sel, sid()), sc = E.unitScale(sid()); return side === "buy" ? b.bids[0].price * sc : b.asks[0].price * sc; };
    const dec = scopeKind === "global" ? 4 : (G.CURRENCIES[G.getLocalCurrency()].perUsd > 100 ? 0 : 2);
    $("#mk-trade").innerHTML = `<div class="eco-row" style="margin-bottom:10px"><div class="eco-seg" id="t-side"><button data-s="buy" class="${side === "buy" ? "active buy" : ""}">Beli</button><button data-s="sell" class="${side === "sell" ? "active sell" : ""}">Jual</button></div>
      <div class="eco-seg" id="t-mode"><button data-m="market" class="${mode === "market" ? "active" : ""}">Harga pasar</button><button data-m="limit" class="${mode === "limit" ? "active" : ""}">Pasang tawaran</button></div></div>
      <label class="eco-field">Jumlah (unit)<div class="eco-row"><input id="t-qty" class="eco-input" type="number" min="1" step="1" value="10"><button class="eco-btn small" id="t-max" style="flex:none;min-width:0">Maks</button></div></label>
      ${mode === "limit" ? `<label class="eco-field">Harga per unit (${unit()})<input id="t-price" class="eco-input" type="number" step="any" value="${defPrice().toFixed(dec)}"></label><div class="eco-note" style="margin-bottom:8px">Tawaranmu dikunci dulu, lalu terisi bertahap bila ada lawan transaksi di harga itu (di tahap ini lawan = simulasi).</div>` : ""}
      <div class="eco-sum" id="t-sum"></div><button class="eco-btn primary full" id="t-go"></button>`;
    U.$$("#t-side button").forEach(b => b.onclick = () => { side = b.dataset.s; buildTrade(); });
    U.$$("#t-mode button").forEach(b => b.onclick = () => { mode = b.dataset.m; buildTrade(); });
    $("#t-qty").oninput = sum; if ($("#t-price")) $("#t-price").oninput = sum;
    $("#t-max").onclick = () => { const p = G.getPlayer(); let m; if (side === "sell") m = p.inventory[sel] || 0; else { const unitPx = mode === "limit" ? Number($("#t-price").value) || px(sel) : px(sel) * 1.03; m = Math.min(Math.floor(E.balance(sid()) / (unitPx * (scopeKind === "global" ? 1.05 : 1))), p.inventoryCapacity - G.inventoryUsed()); } $("#t-qty").value = Math.max(1, m); sum(); };
    $("#t-go").onclick = go; sum();
  }
  function sum() {
    const qty = Math.floor(Number($("#t-qty").value) || 0), u = unit(), box = $("#t-sum"), btn = $("#t-go"); let html = "", ok = false;
    if (mode === "market") {
      const r = E.quote(sel, sid(), side, qty);
      if (!r.ok) html = `<div class="ln"><span class="down">${U.esc(r.reason)}</span></div>`;
      else { ok = true; html = `<div class="ln"><span>Harga rata-rata / unit</span><b>${U.fmtUnit(r.avg, u)} ${u}</b></div><div class="ln"><span>Subtotal</span><b>${U.fmtUnit(r.gross, u)} ${u}</b></div><div class="ln"><span>Pajak ${Math.round(r.tax * 100)}% ${side === "buy" ? (scopeKind === "global" ? "(impor)" : "(tidak ada)") : (scopeKind === "global" ? "(ekspor)" : "(penghasilan)")}</span><b>${U.fmtUnit(r.taxAmt, u)} ${u}</b></div><div class="ln big"><span>${side === "buy" ? "Harga yang harus dibayar" : "Total yang kamu terima"}</span><b>${U.fmtUnit(r.total, u)} ${u}</b></div>`; }
    } else {
      const price = Number($("#t-price").value) || 0, tax = scopeKind === "global" ? E.taxRate(E.here().id, side === "buy" ? "importTax" : "exportTax") : (side === "sell" ? E.taxRate(E.here().id, "incomeTax") : 0), gross = price * qty;
      ok = price > 0 && qty > 0; html = `<div class="ln"><span>Subtotal tawaran</span><b>${U.fmtUnit(gross, u)} ${u}</b></div><div class="ln"><span>Pajak saat terisi</span><b>${Math.round(tax * 100)}%</b></div><div class="ln big"><span>${side === "buy" ? "Dikunci sekarang" : "Perkiraan diterima"}</span><b>${U.fmtUnit(side === "buy" ? gross * (1 + (scopeKind === "global" ? tax : 0)) : gross * (1 - tax), u)} ${u}</b></div>`;
    }
    box.innerHTML = html + `<div class="ln"><span>Saldo ${u}</span><b>${U.fmtUnit(E.balance(sid()), u)}</b></div>`;
    btn.disabled = !ok; btn.textContent = mode === "market" ? (side === "buy" ? "Beli sekarang" : "Jual sekarang") : "Pasang tawaran " + (side === "buy" ? "beli" : "jual");
  }
  function go() {
    const qty = Math.floor(Number($("#t-qty").value) || 0);
    if (mode === "market") { const r = E.trade(sel, sid(), side, qty); if (!r.ok) return U.toast(r.reason); U.toast(`${side === "buy" ? "Membeli" : "Menjual"} ${qty} ${sel} · ${U.fmtUnit(r.total, r.unit)} ${r.unit}`); }
    else { const r = E.postOrder({ kind: "market", scope: sid(), key: sel, side, price: Number($("#t-price").value), qty }); if (!r.ok) return U.toast(r.reason); U.toast("Tawaran dipasang."); }
    U.refreshWallet(); renderAll(true); sum();
  }
  function renderOrders() {
    const os = E.myOrders("market").filter(o => o.key === sel && o.scope === sid());
    $("#mk-orders").innerHTML = os.length ? `<table class="eco-table"><tr><th>Sisi</th><th>Harga</th><th>Terisi</th><th></th></tr>${os.map(o => `<tr><td class="${o.side === "buy" ? "up" : "down"}">${o.side === "buy" ? "Beli" : "Jual"}</td><td>${U.fmtUnit(o.price, o.unit)}</td><td>${U.fmt(o.filled)}/${U.fmt(o.qty)}</td><td>${o.status === "open" ? `<button class="eco-btn danger small" data-c="${o.id}">Batal</button>` : `<span class="muted">${o.status === "done" ? "Selesai" : "Dibatalkan"}</span>`}</td></tr>`).join("")}</table>` : '<div class="eco-empty">Belum ada tawaran untuk barang ini.</div>';
    U.$$("#mk-orders [data-c]").forEach(b => b.onclick = () => { const r = E.cancelOrder(b.dataset.c); U.toast(r.ok ? "Tawaran dibatalkan, sisa dikembalikan." : r.reason); renderAll(true); });
  }
  function renderFeed() {
    $("#mk-feed").innerHTML = E.marketFeed(sel, sid(), 14).map(f => `<div class="fe ${f.who.startsWith("Kamu") ? "me" : ""}"><span class="muted">${U.hhmm(f.t)}</span><span><b class="${f.side}">${f.side === "buy" ? "Membeli" : "Menjual"}</b> ${U.fmt(f.qty)} ${sel} <span class="muted">· ${U.esc(f.who)}</span></span><span>${U.fmtUnit(f.unitPrice, f.unit)}</span></div>`).join("") || '<div class="eco-empty">Menunggu transaksi...</div>';
  }
  function renderAll(force) { renderList(); renderHero(); renderChart(force); renderBook(); renderOrders(); renderFeed(); if ($("#t-sum")) sum(); }
  $("#mk-q").oninput = e => { q = e.target.value; renderList(); };
  U.$$("#mk-tabs button").forEach(b => b.onclick = () => { grp = b.dataset.g; U.$$("#mk-tabs button").forEach(x => x.classList.toggle("active", x === b)); renderList(); });
  if (EcoUI.boot(document.body.dataset.page, () => renderAll(false), 4000)) { buildTrade(); }
})();
