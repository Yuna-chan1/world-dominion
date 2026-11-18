/* WORLD DOMINION V.I — ECONOMY: ORDER (tawaran) + VALUTA ASING BUILD 0.9 */
(function () {
  "use strict";
  const E = window.EcoEngine, G = () => window.Game, P = () => window.Game.getPlayer();
  const { TICK, hash32, rnd, wave, r2, r3, eco, uid, save } = E;

  // ---------- Valuta asing: hanya Gold <-> mata uang ----------
  const codes = () => Object.keys(G().CURRENCIES);
  function fxMid(code, t = Date.now()) { // harga 1 Gold dalam mata uang `code`
    const base = E.GOLD_USD * G().CURRENCIES[code].perUsd;
    return base * (1 + wave("fx|" + code, t / TICK, 0.22)) * (1 + E.impactAt("fx", code, t));
  }
  const fxDec = code => G().CURRENCIES[code].perUsd > 100 ? 0 : 2, fxRound = (code, v) => fxDec(code) === 0 ? Math.round(v) : r2(v);
  function fxBook(code, t = Date.now()) {
    const mid = fxMid(code, t), h = hash32("fxbook" + code), slot = Math.floor(t / TICK), asks = [], bids = [];
    for (let i = 0; i < 10; i++) {
      asks.push({ price: mid * (1.004 + 0.0025 * i), qty: r2(1 + rnd(h, slot * 20 + i) * 40), who: E.npcName(code + "a" + i + slot) });
      bids.push({ price: mid * (0.996 - 0.0025 * i), qty: r2(1 + rnd(h, slot * 20 + i + 10) * 40), who: E.npcName(code + "b" + i + slot) });
    }
    let sa = recentFx(code, "buy", t), sb = recentFx(code, "sell", t);
    [[asks, sa], [bids, sb]].forEach(([side, skip]) => side.forEach(l => { const cut = Math.min(l.qty, skip); l.qty = r2(l.qty - cut); skip -= cut; }));
    return { mid, asks: asks.filter(l => l.qty > 0), bids: bids.filter(l => l.qty > 0) };
  }
  const recentFx = (code, side, t) => eco().flow.filter(f => f.scope === "fx" && f.item === code && f.side === side && t - f.t < 30 * 60000).reduce((s, f) => s + f.qty, 0);
  // Daftar tawaran yang dilihat pemain: tawaran pemain lain + tawaran milikmu, diurutkan seperti papan tawaran.
  function fxOffers(code, side, t = Date.now()) { // side "buy-gold" -> tawaran orang yang ingin MEMBELI emas (tertinggi dulu); "sell-gold" -> yang MENJUAL emas (terendah dulu)
    const b = fxBook(code, t), list = (side === "buy-gold" ? b.bids : b.asks).map(l => ({ price: l.price, qty: l.qty, who: l.who, mine: false }));
    eco().orders.filter(o => o.kind === "forex" && o.key === code && o.status === "open" && ((side === "buy-gold" && o.side === "buy") || (side === "sell-gold" && o.side === "sell")))
      .forEach(o => list.push({ price: o.price, qty: r2(o.qty - o.filled), who: "Kamu", mine: true, id: o.id }));
    list.sort((a, b2) => side === "buy-gold" ? b2.price - a.price : a.price - b2.price);
    return list;
  }
  function fxQuote(code, side, gold, t = Date.now()) { // side "buy" = beli emas (bayar mata uang)
    gold = r2(Number(gold) || 0); if (gold <= 0) return { ok: false, reason: "Jumlah emas harus lebih dari 0." };
    const b = fxBook(code, t), levels = side === "buy" ? b.asks : b.bids; let need = gold, total = 0;
    for (const l of levels) { if (need <= 0) break; const take = Math.min(need, l.qty); total += take * l.price; need -= take; }
    if (need > 0.004) return { ok: false, reason: "Penawaran di papan tidak cukup untuk jumlah ini." };
    return { ok: true, gold, total: fxRound(code, total), avg: total / gold, code };
  }
  function fxTrade(code, side, gold) {
    const q = fxQuote(code, side, gold); if (!q.ok) return q; const g = G(), t = Date.now();
    if (side === "buy") { if (g.getWallet()[code] + 1e-6 < q.total) return { ok: false, reason: `Saldo ${code} tidak cukup (butuh ${q.total.toLocaleString("id-ID")}).` }; g.addCurrency(code, -q.total); g.addGold(q.gold); }
    else { if (P().gold + 1e-6 < q.gold) return { ok: false, reason: "Gold tidak cukup." }; g.addGold(-q.gold); g.addCurrency(code, q.total); }
    E.pushFlow("fx", code, side, q.gold, t);
    E.logTrade({ t, scope: "fx", item: code, side, qty: q.gold, unitPrice: q.avg, total: q.total, unit: code, who: "Kamu" }); save();
    return q;
  }
  function fxSeries(code, n = 72, t = Date.now()) {
    const base = Math.floor(t / TICK) * TICK, out = [];
    for (let i = n - 1; i >= 0; i--) {
      const tt = base - i * TICK, mid = fxMid(code, tt) / (i === 0 ? 1 : (1 + E.impactAt("fx", code, tt)) ) , prev = fxMid(code, tt - TICK);
      out.push({ t: tt, mid, ask: mid * 1.004, bid: mid * 0.996, vol: Math.round((20 + rnd(hash32("fxv" + code), tt / TICK) * 180) * (1 + Math.abs(mid - prev) / mid * 15)) });
    }
    return out;
  }
  function fxFeed(code, limit = 14) {
    const mine = eco().trades.filter(x => x.scope === "fx" && x.item === code).slice(0, limit);
    const npc = E.feed("fx", code, "fx", limit).map(ev => ({ t: ev.t, who: ev.who, side: ev.side, qty: ev.qty, unitPrice: fxMid(code, ev.t) * (ev.side === "buy" ? 1.004 : 0.996), unit: code }));
    return mine.concat(npc).sort((a, b) => b.t - a.t).slice(0, limit);
  }
  const countryFx = () => []; // Valas negara: negara belum ada; diisi saat sistem pemerintahan selesai.

  // ---------- Tawaran (limit order) untuk pasar & valas ----------
  function reserveFor(o) { // jumlah yang dikunci saat memasang tawaran
    if (o.kind === "forex") return o.side === "buy" ? { cur: o.key, amt: fxRound(o.key, o.price * o.qty) } : { gold: o.qty };
    const tax = o.scope === "global" ? E.taxRate(E.here().id, "importTax") : 0;
    return o.side === "buy" ? { unit: o.scope === "global" ? "gold" : "local", amt: E.roundUnit(o.scope, o.price * o.qty * (1 + tax)) } : { item: o.key, qty: o.qty };
  }
  function postOrder({ kind, scope, key, side, price, qty }) {
    const g = G(), p = P(); price = Number(price); qty = kind === "forex" ? r2(Number(qty)) : Math.floor(Number(qty));
    if (!(price > 0) || !(qty > 0)) return { ok: false, reason: "Harga dan jumlah harus lebih dari 0." };
    if (eco().orders.filter(o => o.status === "open").length >= 20) return { ok: false, reason: "Maksimal 20 tawaran aktif." };
    const o = { id: uid("ord"), kind, scope: kind === "forex" ? "fx" : scope, key, side, price, qty, filled: 0, status: "open", createdAt: Date.now(), checkedAt: Date.now(), unit: kind === "forex" ? key : E.unitCode(scope), regionId: E.here().id };
    const r = reserveFor(o);
    if (r.gold != null) { if (p.gold < r.gold) return { ok: false, reason: "Gold tidak cukup." }; g.addGold(-r.gold); }
    else if (r.cur) { if (g.getWallet()[r.cur] < r.amt) return { ok: false, reason: `Saldo ${r.cur} tidak cukup.` }; g.addCurrency(r.cur, -r.amt); }
    else if (r.item) { if ((p.inventory[r.item] || 0) < r.qty) return { ok: false, reason: "Stok barang tidak cukup." }; g.removeItem(r.item, r.qty); }
    else { if (E.balance(o.scope) < r.amt) return { ok: false, reason: `Saldo ${o.unit} tidak cukup.` }; E.pay(o.scope, r.amt); }
    eco().orders.unshift(o); save(); return { ok: true, order: o };
  }
  function refund(o) { // kembalikan sisa kunci
    const g = G(), rem = o.qty - o.filled; if (rem <= 0) return; const part = Object.assign({}, o, { qty: rem }), r = reserveFor(part);
    if (r.gold != null) g.addGold(r.gold); else if (r.cur) g.addCurrency(r.cur, r.amt); else if (r.item) { const room = Math.max(0, P().inventoryCapacity - g.inventoryUsed()); g.addItem(r.item, Math.min(room, r.qty)); } else E.receive(o.scope, r.amt);
  }
  function cancelOrder(id) { const o = eco().orders.find(x => x.id === id && x.status === "open"); if (!o) return { ok: false, reason: "Tawaran tidak ditemukan." }; refund(o); o.status = "cancelled"; save(); return { ok: true }; }
  function fillOrder(o, amount, t) {
    const g = G(), tax = o.kind === "market" && o.scope !== "global" ? E.taxRate(o.regionId, "incomeTax") : (o.scope === "global" ? E.taxRate(o.regionId, o.side === "buy" ? "importTax" : "exportTax") : 0);
    if (o.kind === "forex") {
      if (o.side === "buy") g.addGold(amount); else g.addCurrency(o.key, fxRound(o.key, o.price * amount));
    } else if (o.side === "buy") {
      const room = Math.max(0, P().inventoryCapacity - g.inventoryUsed()), take = Math.min(room, amount); if (take > 0) g.addItem(o.key, take);
      if (o.scope === "global") E.addTreasury(o.regionId, "Gold", o.price * amount * tax);
      if (take < amount) { E.receive(o.scope, E.roundUnit(o.scope, o.price * (amount - take) * (1 + (o.scope === "global" ? tax : 0)))); }
      if (o.scope === "global") g.recordActivity("marketPurchases", take);
    } else {
      const gross = o.price * amount, net = gross * (1 - tax); E.receive(o.scope, E.roundUnit(o.scope, net)); E.addTreasury(o.regionId, o.unit, gross * tax);
    }
    o.filled = o.kind === "forex" ? r2(o.filled + amount) : o.filled + amount;
    E.logTrade({ t, scope: o.scope, item: o.key, side: o.side, qty: amount, unitPrice: o.price, total: o.kind === "forex" ? fxRound(o.key, o.price * amount) : E.roundUnit(o.scope, o.price * amount), unit: o.unit, who: "Kamu (tawaran)" });
    if (o.qty - o.filled <= (o.kind === "forex" ? 0.004 : 0)) o.status = "done";
  }
  // Pencocokan malas: tawaran terisi bertahap oleh likuiditas simulasi di sisi lawan.
  function settleOrders(t = Date.now()) {
    const e = eco(); let changed = 0;
    e.orders.filter(o => o.status === "open").forEach(o => {
      const el = (t - o.checkedAt) / 60000; if (el < 1) return; o.checkedAt = t;
      let depth = 0;
      if (o.kind === "forex") { const b = fxBook(o.key, t); (o.side === "sell" ? b.bids.filter(l => l.price >= o.price) : b.asks.filter(l => l.price <= o.price)).forEach(l => { depth += l.qty; }); }
      else { const b = E.itemBook(o.key, o.scope, t), sc = E.unitScale(o.scope); (o.side === "sell" ? b.bids.filter(l => l.price * sc >= o.price) : b.asks.filter(l => l.price * sc <= o.price)).forEach(l => { depth += l.qty; }); }
      let fill = depth * Math.min(1, el / 30) * 0.35; fill = o.kind === "forex" ? r2(Math.min(o.qty - o.filled, fill)) : Math.min(o.qty - o.filled, Math.floor(fill));
      if (fill > 0) { fillOrder(o, fill, t); changed++; }
    });
    e.orders = e.orders.filter(o => o.status === "open" || (t - o.createdAt) < 3 * 86400000);
    if (changed) save(); return changed;
  }
  const myOrders = (kind, key) => eco().orders.filter(o => o.kind === kind && (!key || o.key === key)).slice(0, 30);

  Object.assign(E, { codes, fxMid, fxBook, fxOffers, fxQuote, fxTrade, fxSeries, fxFeed, fxRound, fxDec, countryFx, postOrder, cancelOrder, settleOrders, myOrders });
})();
