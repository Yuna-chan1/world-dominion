/* WORLD DOMINION V.I — VALUTA ASING BUILD 0.9 (hanya Gold <-> mata uang; 1 Gold = 10 USD kurs dasar) */
(() => {
  "use strict";
  const U = EcoUI, E = EcoEngine, G = Game, $ = U.$;
  let code = G.getLocalCurrency(), tab = "buy", mode = "instant", chartAt = 0;
  const main = $("#eco-main"), C = () => G.CURRENCIES;
  main.innerHTML = `<div class="eco-head"><div><h1>💱 Valuta Asing</h1><p>Tukar <b>Gold ↔ mata uang</b> (tidak ada tukar mata uang langsung). Kurs dasar: <b>1 Gold = 10 USD</b>.</p></div><div class="eco-note">Kurs bergerak real-time; grafik per 10 menit.</div></div>
  <div class="eco-split"><aside><div class="eco-panel"><div class="eco-sec" style="padding:12px 14px 0">Kurs 1 Gold</div><div class="eco-list" id="fx-list" style="min-height:0;max-height:none"></div></div>
  <div class="eco-card" style="margin-top:14px"><h3>👛 Dompetmu</h3><div id="fx-wallet"></div></div></aside>
  <section><div id="fx-hero" class="eco-hero"></div><div class="eco-card"><h3>📈 Grafik kurs <small id="fx-chart-sub"></small></h3><div id="fx-chart"></div></div>
  <div class="eco-two"><div class="eco-card"><h3>🔁 Tukar emas</h3><div class="eco-tabs" id="fx-tabs" style="margin:-4px -14px 12px"><button data-t="buy">Beli emas</button><button data-t="sell">Jual emas</button></div><div id="fx-offers"></div><div id="fx-trade"></div></div>
  <div><div class="eco-card"><h3>🏛 Valas negara <small>belum aktif</small></h3><div id="fx-country"></div></div><div class="eco-card"><h3>🧾 Tawaranku</h3><div id="fx-orders"></div></div></div></div>
  <div class="eco-card"><h3>🕒 Aktivitas jual-beli pemain <small>real-time · GOLD/<span id="fx-feed-code"></span></small></h3><div id="fx-feed" class="eco-feed"></div></div></section></div>`;
  const dec = c => E.fxDec(c), fm = (v, c) => U.fmt(v, dec(c) === 0 ? 0 : 2);

  function renderList() {
    $("#fx-list").innerHTML = E.codes().map(c => { const s = E.fxSeries(c, 72); return `<div class="eco-item ${c === code ? "active" : ""}" data-c="${c}"><div class="eco-ico" style="font-size:14px;font-weight:800">${C()[c].symbol}</div><div class="t"><b>${c}</b><small>${C()[c].name}</small></div><div style="flex:none">${U.spark(s)}</div><div class="r">${fm(E.fxMid(c), c)}<small>${U.chg(U.change(s))}</small></div></div>`; }).join("");
    U.$$("#fx-list .eco-item").forEach(el => el.onclick = () => { code = el.dataset.c; build(); renderAll(true); });
    const w = G.getWallet(); $("#fx-wallet").innerHTML = `<div class="ln" style="display:flex;justify-content:space-between;padding:5px 0"><span>🪙 Gold</span><b class="gold">${U.fmt(G.getPlayer().gold, 3)}</b></div>` + E.codes().map(c => `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;${c === code ? "color:#f2d58a" : "color:#a9b8cf"}"><span>${C()[c].name} (${c})</span><b>${fm(w[c], c)}</b></div>`).join("");
  }
  function renderHero() { const s = E.fxSeries(code, 72); $("#fx-hero").innerHTML = `<div class="eco-ico" style="font-size:18px;font-weight:800">${C()[code].symbol}</div><div><h2>GOLD / ${code}</h2><div class="muted">${C()[code].name} · 1 Gold = ${fm(E.GOLD_USD * C()[code].perUsd, code)} ${code} (kurs dasar)</div></div><div style="margin-left:auto;text-align:right"><div class="px">${fm(E.fxMid(code), code)} <small>${code}</small></div><div>${U.chg(U.change(s))} <span class="muted">24 jam</span></div></div>`; }
  function renderChart(force) {
    if (!force && Date.now() - chartAt < 9000) return; chartAt = Date.now(); const m = E.fxMid(code);
    U.chart($("#fx-chart"), E.fxSeries(code, 72), { unit: code, live: { mid: m, ask: m * 1.004, bid: m * 0.996 } }); $("#fx-chart-sub").textContent = `harga 1 Gold dalam ${code}`;
  }
  function renderOffers() {
    const side = tab === "buy" ? "buy-gold" : "sell-gold", list = E.fxOffers(code, side).slice(0, 6);
    $("#fx-offers").innerHTML = `<div class="eco-sec">${tab === "buy" ? "Tawaran BELI emas tertinggi" : "Tawaran JUAL emas terendah"} <small>dari pemain lain</small></div><div class="eco-book"><div class="rows"><div class="rw hd"><span>Harga / Gold (${code})</span><span>Jumlah (Gold)</span><span>Pemain</span></div>${list.map(l => `<div class="rw ${tab === "buy" ? "bid" : "ask"} ${l.mine ? "mine" : ""}"><span>${fm(l.price, code)}</span><span>${U.fmt(l.qty, 2)}</span><span>${U.esc(l.who)}</span></div>`).join("")}</div></div>`;
  }
  function build() {
    U.$$("#fx-tabs button").forEach(b => { b.classList.toggle("active", b.dataset.t === tab); b.onclick = () => { tab = b.dataset.t; build(); renderOffers(); }; });
    const top = E.fxOffers(code, tab === "buy" ? "buy-gold" : "sell-gold")[0], defPrice = top ? top.price * (tab === "buy" ? 1.002 : 0.998) : E.fxMid(code);
    $("#fx-trade").innerHTML = `<div class="eco-seg" id="x-mode" style="margin:12px 0"><button data-m="instant" class="${mode === "instant" ? "active" : ""}">Langsung</button><button data-m="offer" class="${mode === "offer" ? "active" : ""}">Pasang tawaran</button></div>
      <label class="eco-field">Jumlah Gold<div class="eco-row"><input id="x-qty" class="eco-input" type="number" min="0.01" step="0.01" value="1"><button class="eco-btn small" id="x-max" style="flex:none;min-width:0">Maks</button></div></label>
      ${mode === "offer" ? `<label class="eco-field">Harga per Gold (${code})<input id="x-price" class="eco-input" type="number" step="any" value="${dec(code) === 0 ? Math.round(defPrice) : defPrice.toFixed(2)}"></label><div class="eco-note">${tab === "buy" ? "Harga awal = sedikit di atas tawaran beli tertinggi agar kamu di urutan teratas." : "Harga awal = sedikit di bawah tawaran jual terendah agar kamu di urutan teratas."}</div>` : ""}
      <div class="eco-sum" id="x-sum"></div><button id="x-go" class="eco-btn primary full"></button>`;
    U.$$("#x-mode button").forEach(b => b.onclick = () => { mode = b.dataset.m; build(); });
    $("#x-qty").oninput = sum; if ($("#x-price")) $("#x-price").oninput = sum;
    $("#x-max").onclick = () => { const w = G.getWallet(); const m = tab === "sell" ? G.getPlayer().gold : w[code] / (mode === "offer" ? Number($("#x-price").value) || E.fxMid(code) : E.fxMid(code) * 1.03); $("#x-qty").value = Math.max(0.01, Math.floor(m * 100) / 100); sum(); };
    $("#x-go").onclick = go; sum();
  }
  function sum() {
    const g = Math.round((Number($("#x-qty").value) || 0) * 100) / 100, box = $("#x-sum"), btn = $("#x-go"); let ok = false, html = "";
    if (mode === "instant") {
      const q = E.fxQuote(code, tab, g); if (!q.ok) html = `<div class="ln"><span class="down">${U.esc(q.reason)}</span></div>`;
      else { ok = true; html = `<div class="ln"><span>Kurs rata-rata</span><b>${fm(q.avg, code)} ${code}/Gold</b></div><div class="ln big"><span>${tab === "buy" ? "Kamu bayar" : "Kamu terima"}</span><b>${fm(q.total, code)} ${code}</b></div><div class="ln"><span>${tab === "buy" ? "Kamu dapat" : "Kamu serahkan"}</span><b>${U.fmt(g, 2)} Gold</b></div>`; }
    } else { const pr = Number($("#x-price").value) || 0; ok = pr > 0 && g > 0; html = `<div class="ln big"><span>${tab === "buy" ? "Dikunci (bayar)" : "Dikunci (Gold)"}</span><b>${tab === "buy" ? fm(pr * g, code) + " " + code : U.fmt(g, 2) + " Gold"}</b></div><div class="ln"><span>${tab === "buy" ? "Akan didapat" : "Akan diterima"}</span><b>${tab === "buy" ? U.fmt(g, 2) + " Gold" : fm(pr * g, code) + " " + code}</b></div>`; }
    box.innerHTML = html; btn.disabled = !ok; btn.textContent = mode === "instant" ? (tab === "buy" ? "Beli emas sekarang" : "Jual emas sekarang") : "Pasang tawaran " + (tab === "buy" ? "beli emas" : "jual emas");
  }
  function go() {
    const g = Math.round((Number($("#x-qty").value) || 0) * 100) / 100;
    if (mode === "instant") { const r = E.fxTrade(code, tab, g); if (!r.ok) return U.toast(r.reason); U.toast(`${tab === "buy" ? "Membeli" : "Menjual"} ${g} Gold · ${fm(r.total, code)} ${code}`); }
    else { const r = E.postOrder({ kind: "forex", key: code, side: tab, price: Number($("#x-price").value), qty: g }); if (!r.ok) return U.toast(r.reason); U.toast("Tawaran dipasang."); }
    U.refreshWallet(); renderAll(true); sum();
  }
  function renderOrders() {
    $("#fx-country").innerHTML = E.countryFx().length ? "" : '<div class="eco-empty">Belum ada negara. Negara akan menjual/membeli valas lewat pemerintahnya setelah terbentuk.</div>';
    const os = E.myOrders("forex", code);
    $("#fx-orders").innerHTML = os.length ? `<table class="eco-table"><tr><th>Sisi</th><th>Harga</th><th>Terisi (Gold)</th><th></th></tr>${os.map(o => `<tr><td class="${o.side === "buy" ? "up" : "down"}">${o.side === "buy" ? "Beli" : "Jual"}</td><td>${fm(o.price, code)}</td><td>${U.fmt(o.filled, 2)}/${U.fmt(o.qty, 2)}</td><td>${o.status === "open" ? `<button class="eco-btn danger small" data-c="${o.id}">Batal</button>` : `<span class="muted">${o.status === "done" ? "Selesai" : "Batal"}</span>`}</td></tr>`).join("")}</table>` : '<div class="eco-empty">Belum ada tawaran untuk mata uang ini.</div>';
    U.$$("#fx-orders [data-c]").forEach(b => b.onclick = () => { const r = E.cancelOrder(b.dataset.c); U.toast(r.ok ? "Tawaran dibatalkan, sisa dikembalikan." : r.reason); renderAll(true); });
  }
  function renderFeed() { $("#fx-feed-code").textContent = code; $("#fx-feed").innerHTML = E.fxFeed(code, 14).map(f => `<div class="fe ${f.who.startsWith("Kamu") ? "me" : ""}"><span class="muted">${U.hhmm(f.t)}</span><span><b class="${f.side}">${f.side === "buy" ? "Membeli emas" : "Menjual emas"}</b> ${U.fmt(f.qty, 2)} Gold <span class="muted">· ${U.esc(f.who)}</span></span><span>${fm(f.unitPrice, code)} ${code}</span></div>`).join("") || '<div class="eco-empty">Menunggu aktivitas...</div>'; }
  function renderAll(force) { renderList(); renderHero(); renderChart(force); renderOffers(); renderOrders(); renderFeed(); if ($("#x-sum")) sum(); }
  if (EcoUI.boot(document.body.dataset.page, () => renderAll(false), 4000)) build();
})();
