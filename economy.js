/* WORLD DOMINION V.I — ECONOMY ENGINE BUILD 0.9 (fondasi)
   Pasar lokal/global, valuta asing, perusahaan, pekerjaan, kontrak.
   PROTOTIPE LOKAL: lawan transaksi adalah simulasi deterministik (NPC) yang bergantung pada waktu, supaya hasilnya sama untuk
   semua pemain. Seluruh logika memakai fungsi murni + satu objek state (player.economy), sehingga nanti mudah dipindah ke server
   (server menjadi sumber waktu & penyimpan order/kontrak; NPC diganti pemain sungguhan).
*/
(function () {
  "use strict";
  const TICK = 10 * 60 * 1000, HOUR = 3600 * 1000, DAY = 24 * HOUR;
  const CONFIG = {
    DEV_MODE: true,               // true: syarat level/umur akun kontrak dilonggarkan untuk uji coba
    contractMinLevel: 20, contractMinAgeDays: 3, contractDailyLimit: 20, contractExpiryMs: DAY, contractMaxLines: 6,
    defaultTax: 5,                // pajak awal 5% (diatur parlemen/menteri nanti)
    notaryRate: 0.02, notaryMin: 0.1,
    inputRatio: 10,               // 10 bahan baku -> 1 unit produk
    maxCompanyLevel: 30
  };
  const ITEMS = {
    "Gandum": { icon: "🌾", group: "raw", usd: 0.25 }, "Batu": { icon: "🪨", group: "raw", usd: 0.30 }, "Kayu": { icon: "🪵", group: "raw", usd: 0.35 },
    "Besi": { icon: "⛓️", group: "raw", usd: 0.60 }, "Minyak": { icon: "🛢️", group: "raw", usd: 0.90 }, "Batu bara": { icon: "⚫", group: "raw", usd: 0.50 },
    "Tembaga": { icon: "🟠", group: "raw", usd: 0.80 }, "Kapas": { icon: "🧶", group: "raw", usd: 0.40 },
    "Makanan": { icon: "🍞", group: "product", usd: 3.0, input: "Gandum" }, "Senjata": { icon: "⚔️", group: "product", usd: 8.0, input: "Besi" },
    "Perisai": { icon: "🛡️", group: "product", usd: 0.5, input: "Besi" }, "Armor": { icon: "🪖", group: "product", usd: 6.0, input: "Besi" },
    "Tiket perjalanan": { icon: "🎫", group: "product", usd: 11.0, input: "Minyak" }
  };
  const RAW = Object.keys(ITEMS).filter(k => ITEMS[k].group === "raw"), PRODUCTS = Object.keys(ITEMS).filter(k => ITEMS[k].group === "product");
  const GOLD_USD = 10;

  // ---------- util deterministik ----------
  function hash32(str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rnd(h, i) { let x = (h ^ Math.imul(i | 0, 0x9E3779B1)) >>> 0; x = Math.imul(x ^ (x >>> 15), 0x85EBCA6B) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
  function vnoise(h, x) { const i = Math.floor(x), f = x - i, a = rnd(h, i), b = rnd(h, i + 1), u = f * f * (3 - 2 * f); return (a + (b - a) * u) * 2 - 1; }
  function wave(key, tk, amp = 1) { const h = hash32(key), p1 = (h % 628) / 100, p2 = ((h >>> 8) % 628) / 100; return amp * (0.09 * Math.sin(tk / 41 + p1) + 0.05 * Math.sin(tk / 13 + p2) + 0.04 * vnoise(h, tk * 0.5)); }
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  const FIRST = ["Arka", "Bima", "Citra", "Dewi", "Eko", "Farid", "Gita", "Hana", "Indra", "Joko", "Kirana", "Lukas", "Maya", "Nadia", "Oka", "Putra", "Rina", "Sari", "Tara", "Umar", "Vero", "Wira", "Yuda", "Zahra", "Ethan", "Lena", "Marco", "Nico", "Olga", "Sven", "Kenji", "Mei", "Ivan", "Anya", "Omar", "Layla"];
  const LAST = ["Prakoso", "Santoso", "Wijaya", "Hartono", "Lim", "Nakamura", "Petrov", "Mueller", "Rossi", "Dubois", "Haddad", "Okafor", "Silva", "Kowalski", "Tanaka", "Ivanov", "Costa", "Novak", "Aziz", "Chen"];
  const npcName = seed => FIRST[Math.floor(rnd(hash32(seed), 1) * FIRST.length)] + "_" + LAST[Math.floor(rnd(hash32(seed), 2) * LAST.length)].slice(0, 5);

  const G = () => window.Game, P = () => window.Game.getPlayer();
  function eco() {
    const p = P();
    if (!p.economy) p.economy = {};
    const e = p.economy;
    e.orders ||= []; e.trades ||= []; e.impact ||= {}; e.flow ||= []; e.treasury ||= {}; e.companies ||= []; e.cs ||= {}; e.contracts ||= [];
    e.draft ||= { to: null, give: [], receive: [], note: "" }; e.cstats ||= { done: 0, notary: 0, sentDay: "", sentCount: 0 };
    e.job = e.job || null; e.seq ||= 1; e.since ||= Date.now(); e.lastSim ||= Date.now(); e.lastContractGen ||= Date.now(); e.lastOrderCheck ||= Date.now();
    return e;
  }
  const uid = pfx => pfx + "-" + (eco().seq++).toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const save = () => G().save();

  // ---------- wilayah (opsional: dari data peta) ----------
  let regionCache = null;
  function regionMap() {
    if (regionCache) return regionCache;
    const d = window.WorldLib && window.WorldLib.worldData(); if (!d) return null;
    regionCache = {}; d.provinces.forEach(r => { regionCache[r.id] = r; }); return regionCache;
  }
  function region(id) { const m = regionMap(); if (!m || !m[id]) return null; if (!m[id].resources) m[id] = window.WorldLib.decorate(m[id]); return m[id]; }
  function unlockedRegions() { const m = regionMap(); return m ? Object.values(m).filter(r => window.WorldLib.isUnlocked(r)) : []; }
  const here = () => { const w = G().getWorldState(); return { id: w.currentProvinceId || "wilayah", name: w.currentProvinceName || "Wilayah", country: w.currentCountryName || "" }; };
  const home = () => { const w = G().getWorldState(); return { id: w.citizenshipProvinceId || w.currentProvinceId || "wilayah", name: w.citizenshipProvinceName || w.currentProvinceName || "Wilayah" }; };
  const taxRate = (regionId, key) => { const r = region(regionId); const v = r && r.politics ? r.politics[key] : null; return (v == null ? CONFIG.defaultTax : v) / 100; };

  // ---------- harga & buku order ----------
  function impactAt(scope, item, t) { const e = eco(), k = scope + "|" + item, im = e.impact[k]; if (!im) return 0; return im.v * Math.pow(0.5, Math.max(0, t - im.t) / HOUR); }
  function depositFactor(scope, item) { if (scope === "global") return 1; const r = region(scope); return r && r.resources && r.resources[item] ? 0.85 : 1; }
  function midUsd(item, scope, t, withImpact = true) {
    const tk = t / TICK, loc = scope === "global" ? 1 : (0.93 + 0.18 * rnd(hash32(scope + item), 7)) * depositFactor(scope, item);
    return ITEMS[item].usd * (1 + wave(scope + "|" + item, tk)) * loc * (withImpact ? 1 + impactAt(scope, item, t) : 1);
  }
  function recentFlow(scope, item, side, t) { return eco().flow.filter(f => f.scope === scope && f.item === item && f.side === side && t - f.t < 30 * 60 * 1000).reduce((s, f) => s + f.qty, 0); }
  function itemBook(item, scope, t = Date.now()) {
    const mid = midUsd(item, scope, t), mult = scope === "global" ? 3 : 1, asks = [], bids = [], h = hash32(scope + item);
    for (let i = 0; i < 8; i++) {
      const q = Math.round((40 + rnd(h, Math.floor(t / TICK) * 16 + i) * 260) * mult), q2 = Math.round((40 + rnd(h, Math.floor(t / TICK) * 16 + i + 8) * 260) * mult);
      asks.push({ price: mid * (1.01 + 0.005 * i), qty: q }); bids.push({ price: mid * (0.99 - 0.005 * i), qty: q2 });
    }
    let skipA = recentFlow(scope, item, "buy", t), skipB = recentFlow(scope, item, "sell", t);
    [[asks, skipA], [bids, skipB]].forEach(([side, skip]) => side.forEach(l => { const cut = Math.min(l.qty, skip); l.qty -= cut; skip -= cut; }));
    return { mid, asks: asks.filter(l => l.qty > 0), bids: bids.filter(l => l.qty > 0) };
  }
  // Satuan harga: lokal = mata uang lokal, global = Gold.
  const unitScale = scope => scope === "global" ? 1 / GOLD_USD : G().CURRENCIES[G().getLocalCurrency()].perUsd;
  const unitCode = scope => scope === "global" ? "Gold" : G().getLocalCurrency();
  const priceDecimals = scope => scope === "global" ? 3 : (G().CURRENCIES[G().getLocalCurrency()].perUsd > 100 ? 0 : 2);
  const roundUnit = (scope, v) => scope === "global" ? r3(v) : r2(v);

  function quote(item, scope, side, qty, t = Date.now()) {
    qty = Math.floor(Number(qty) || 0); if (qty <= 0) return { ok: false, reason: "Jumlah harus lebih dari 0." };
    const b = itemBook(item, scope, t), levels = side === "buy" ? b.asks : b.bids; let need = qty, usd = 0, last = 0;
    for (const l of levels) { if (need <= 0) break; const take = Math.min(need, l.qty); usd += take * l.price; need -= take; last = l.price; }
    if (need > 0) return { ok: false, reason: "Likuiditas pasar tidak cukup untuk jumlah ini.", liquidity: qty - need };
    const sc = unitScale(scope), gross = usd * sc, reg = here().id;
    const taxKey = scope === "global" ? (side === "buy" ? "importTax" : "exportTax") : "incomeTax", tax = taxRate(reg, taxKey);
    const taxAmt = side === "buy" ? (scope === "global" ? gross * tax : 0) : gross * tax;
    const total = side === "buy" ? gross + taxAmt : gross - taxAmt;
    return { ok: true, qty, avg: gross / qty, gross: roundUnit(scope, gross), tax, taxAmt: roundUnit(scope, taxAmt), total: roundUnit(scope, total), unit: unitCode(scope), last: last * sc, taxKey };
  }
  function pushFlow(scope, item, side, qty, t) {
    const e = eco(); e.flow.push({ scope, item, side, qty, t }); e.flow = e.flow.filter(f => t - f.t < 30 * 60 * 1000);
    const k = scope + "|" + item, cur = impactAt(scope, item, t), dv = (side === "buy" ? 1 : -1) * qty * (scope === "global" ? 0.00012 : 0.0004);
    e.impact[k] = { v: Math.max(-0.25, Math.min(0.25, cur + dv)), t };
  }
  function logTrade(entry) { const e = eco(); e.trades.unshift(entry); e.trades.length = Math.min(e.trades.length, 150); }
  function addTreasury(regionId, code, amt) { const e = eco(); e.treasury[regionId] ||= {}; e.treasury[regionId][code] = r3((e.treasury[regionId][code] || 0) + amt); }
  function pay(scope, amount) { const g = G(); return scope === "global" ? g.addGold(-amount) : g.addLocalMoney(-amount); }
  function receive(scope, amount) { const g = G(); return scope === "global" ? g.addGold(amount) : g.addLocalMoney(amount); }
  const balance = scope => scope === "global" ? P().gold : G().getLocalMoney();

  function trade(item, scope, side, qty) {
    const t = Date.now(), q = quote(item, scope, side, qty, t); if (!q.ok) return q;
    const g = G(), p = P();
    if (side === "buy") {
      if (balance(scope) + 1e-9 < q.total) return { ok: false, reason: `Saldo ${q.unit} tidak cukup (butuh ${q.total}).` };
      if (g.inventoryUsed() + q.qty > p.inventoryCapacity) return { ok: false, reason: "Kapasitas inventaris tidak cukup." };
      pay(scope, q.total); g.addItem(item, q.qty); if (q.taxAmt) addTreasury(here().id, q.unit, q.taxAmt);
      if (scope === "global") g.recordActivity("marketPurchases", q.qty);
    } else {
      if ((p.inventory[item] || 0) < q.qty) return { ok: false, reason: `Stok ${item} di inventaris tidak cukup.` };
      g.removeItem(item, q.qty); receive(scope, q.total); addTreasury(here().id, q.unit, q.taxAmt);
    }
    pushFlow(scope, item, side, q.qty, t);
    logTrade({ t, scope, item, side, qty: q.qty, unitPrice: q.avg, total: q.total, unit: q.unit, who: "Kamu" });
    save(); return Object.assign({ ok: true }, q);
  }

  // ---------- grafik ----------
  function series(item, scope, n = 72, t = Date.now()) {
    const out = [], base = Math.floor(t / TICK) * TICK, sc = unitScale(scope);
    for (let i = n - 1; i >= 0; i--) {
      const tt = base - i * TICK, tk = tt / TICK, mid = midUsd(item, scope, tt, false) * (i === 0 ? 1 + impactAt(scope, item, t) : 1), prev = midUsd(item, scope, tt - TICK, false);
      const vol = Math.round((30 + rnd(hash32(scope + item + "v"), tk) * 220) * (1 + Math.abs(mid - prev) / mid * 10) * (scope === "global" ? 3 : 1));
      out.push({ t: tt, mid: mid * sc, ask: mid * 1.012 * sc, bid: mid * 0.988 * sc, vol });
    }
    return out;
  }
  // ---------- riwayat transaksi (feed real-time) ----------
  const feedCache = {};
  function feed(kind, key, scopeLabel, limit = 14, t = Date.now()) {
    const slot = 30000, nowSlot = Math.floor(t / slot), items = [], h = hash32(kind + "|" + key + "|" + scopeLabel);
    for (let s = nowSlot; s > nowSlot - 60 && items.length < limit; s--) {
      const ck = h + ":" + s; let ev = feedCache[ck];
      if (ev === undefined) {
        if (rnd(h, s * 3) < 0.4) {
          const side = rnd(h, s * 3 + 1) < 0.5 ? "buy" : "sell", qty = kind === "fx" ? r2(0.2 + rnd(h, s * 3 + 2) * 12) : 1 + Math.floor(rnd(h, s * 3 + 2) * 45);
          ev = { t: s * slot + Math.floor(rnd(h, s) * slot), who: npcName(ck), side, qty, jitter: rnd(h, s * 5) };
        } else ev = null;
        feedCache[ck] = ev;
      }
      if (ev && ev.t <= t) items.push(ev);
    }
    return items;
  }
  function marketFeed(item, scope, limit = 14) {
    const t = Date.now(), mine = eco().trades.filter(x => x.scope === scope && x.item === item).slice(0, limit);
    const npc = feed("mk", item, scope, limit, t).map(ev => { const mid = midUsd(item, scope, ev.t) * unitScale(scope); return { t: ev.t, who: ev.who, side: ev.side, qty: ev.qty, unitPrice: mid * (ev.side === "buy" ? 1.012 : 0.988), unit: unitCode(scope) }; });
    return mine.concat(npc).sort((a, b) => b.t - a.t).slice(0, limit);
  }

  window.EcoEngine = { CONFIG, ITEMS, RAW, PRODUCTS, TICK, HOUR, DAY, GOLD_USD, hash32, rnd, wave, vnoise, r2, r3, npcName, eco, uid, save, region, regionMap, unlockedRegions, here, home, taxRate, midUsd, itemBook, quote, trade, series, marketFeed, feed, unitScale, unitCode, priceDecimals, roundUnit, balance, pay, receive, addTreasury, pushFlow, logTrade, impactAt };
})();
