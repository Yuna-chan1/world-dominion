/* WORLD DOMINION V.I — ECONOMY: KONTRAK (barter antar pemain) BUILD 0.9
   Lawan kontrak saat ini adalah pemain simulasi (NPC). Aturan mengikuti rancangan: level 20+ & akun 3 hari (dilonggarkan jika DEV_MODE),
   tawaran 24 jam, 20 tawaran/hari, satu tiket kurir per pihak (tingkat mengikuti jarak), biaya notaris tiap negara (pengirim membayar keduanya), maks 6 baris/pihak.
*/
(function () {
  "use strict";
  const E = window.EcoEngine, G = () => window.Game, P = () => window.Game.getPlayer();
  const { CONFIG, ITEMS, TICK, HOUR, DAY, hash32, rnd, r2, r3, eco, uid, save, region, npcName } = E;
  const TICKET = "Tiket perjalanan";

  // ---------- pemain simulasi ----------
  let roster = null;
  function players() {
    if (roster) return roster;
    const regs = E.unlockedRegions(), hm = E.home().id; roster = [];
    for (let i = 0; i < 36; i++) {
      const h = hash32("npcplayer" + i), r = regs.length ? regs[Math.floor(rnd(h, 1) * regs.length)] : null;
      roster.push({ id: "npc-" + i, name: npcName("pl" + i) + (i % 7 === 0 ? "★" : ""), level: 12 + Math.floor(rnd(h, 2) * 39), ageDays: 1 + Math.floor(rnd(h, 3) * 400), regionId: r ? r.id : hm, regionName: r ? r.name : E.home().name });
    }
    return roster;
  }
  const playerById = id => players().find(p => p.id === id);
  const ageDays = () => (Date.now() - eco().since) / DAY;
  function eligible(pl) { if (CONFIG.DEV_MODE) return true; return pl.level >= CONFIG.contractMinLevel && pl.ageDays >= CONFIG.contractMinAgeDays; }
  function meEligible() { return CONFIG.DEV_MODE || (P().level >= CONFIG.contractMinLevel && ageDays() >= CONFIG.contractMinAgeDays); }
  const searchPlayers = q => { q = String(q || "").toLowerCase(); return players().filter(p => !q || p.name.toLowerCase().includes(q) || p.regionName.toLowerCase().includes(q)).slice(0, 8); };

  // ---------- baris barang ----------
  const lineLabel = l => l.type === "gold" ? "Emas" : l.key;
  const lineIcon = l => l.type === "gold" ? "🪙" : l.type === "cur" ? "💱" : ITEMS[l.key].icon;
  const decOf = l => l.type === "item" ? 0 : l.type === "gold" ? 3 : 2;
  const clean = l => Object.assign({}, l, { qty: decOf(l) === 0 ? Math.floor(l.qty) : Math.round(l.qty * Math.pow(10, decOf(l))) / Math.pow(10, decOf(l)) });
  function lineUsd(l) { return l.type === "gold" ? l.qty * E.GOLD_USD : l.type === "cur" ? l.qty / G().CURRENCIES[l.key].perUsd : l.qty * ITEMS[l.key].usd; }
  const sumUsd = lines => lines.reduce((s, l) => s + lineUsd(l), 0);
  function have(l) { const p = P(); return l.type === "gold" ? p.gold : l.type === "cur" ? G().getWallet()[l.key] : (p.inventory[l.key] || 0); }
  function take(l) { return l.type === "gold" ? G().addGold(-l.qty) : l.type === "cur" ? G().addCurrency(l.key, -l.qty) : G().removeItem(l.key, l.qty); }
  function give(l) { return l.type === "gold" ? G().addGold(l.qty) : l.type === "cur" ? G().addCurrency(l.key, l.qty) : G().addItem(l.key, l.qty); }
  function addLine(side, line) {
    const d = eco().draft; line = clean(line); if (!(line.qty > 0)) return { ok: false, reason: "Jumlah harus lebih dari 0." };
    const arr = d[side]; const ex = arr.find(x => x.type === line.type && x.key === line.key);
    if (!ex && arr.length >= CONFIG.contractMaxLines) return { ok: false, reason: `Maksimal ${CONFIG.contractMaxLines} baris per pihak.` };
    if (ex) ex.qty = clean({ type: ex.type, qty: ex.qty + line.qty }).qty; else arr.push(line); save(); return { ok: true };
  }
  const removeLine = (side, idx) => { eco().draft[side].splice(idx, 1); save(); };
  const setNote = n => { eco().draft.note = String(n || "").slice(0, 200); save(); };
  const setRecipient = id => { eco().draft.to = id; save(); };
  const resetDraft = () => { eco().draft = { to: null, give: [], receive: [], note: "" }; save(); };

  // ---------- jarak, tiket, notaris ----------
  function distanceKm(a, b) {
    if (a === b) return 0; const ra = region(a), rb = region(b);
    if (ra && rb && window.WorldLib) return window.WorldLib.haversine(ra.lat, ra.lon, rb.lat, rb.lon);
    return 200 + rnd(hash32(a + "|" + b), 1) * 2800;
  }
  const courierTier = km => km < 1500 ? 1 : km < 6000 ? 2 : 3;
  const notaryEach = usd => Math.max(CONFIG.notaryMin, r3(usd / E.GOLD_USD * CONFIG.notaryRate));

  function quoteDraft(d = eco().draft) {
    const errs = [], to = d.to ? playerById(d.to) : null, gu = sumUsd(d.give), ru = sumUsd(d.receive);
    if (!to) errs.push("Pilih penerima tawaran."); else if (!eligible(to)) errs.push("Penerima belum memenuhi syarat (level 20+ dan akun berumur 3 hari).");
    if (!meEligible()) errs.push("Kamu belum memenuhi syarat (level 20+ dan akun berumur 3 hari).");
    if (!d.give.length || !d.receive.length) errs.push("Isi minimal satu barang di sisi memberi dan menerima.");
    const km = to ? distanceKm(E.here().id, to.regionId) : 0, tier = courierTier(km), fee = notaryEach(Math.max(gu, ru)), p = P(), w = G().getWallet();
    d.give.forEach(l => { if (have(l) < l.qty - 1e-9) errs.push(`${lineLabel(l)} tidak cukup (punya ${have(l)}).`); });
    // kebutuhan Gold/tiket gabungan
    const needGold = d.give.filter(l => l.type === "gold").reduce((s, l) => s + l.qty, 0) + fee * 2;
    if (p.gold + 1e-9 < needGold) errs.push(`Gold tidak cukup untuk notaris (${r3(fee * 2)}).`);
    const ticketsHave = (p.inventory[TICKET] || 0) - d.give.filter(l => l.type === "item" && l.key === TICKET).reduce((s, l) => s + l.qty, 0);
    if (ticketsHave < tier) errs.push(`Butuh ${tier} ${TICKET} sebagai tiket kurir.`);
    const sent = eco().cstats.sentDay === new Date().toDateString() ? eco().cstats.sentCount : 0;
    if (sent >= CONFIG.contractDailyLimit) errs.push("Batas 20 tawaran per hari tercapai.");
    return { ok: !errs.length, errors: errs, to, giveUsd: gu, recvUsd: ru, km, tier, fee, feeTotal: r3(fee * 2), sentToday: sent };
  }
  function sendDraft() {
    const d = eco().draft, q = quoteDraft(d); if (!q.ok) return { ok: false, reason: q.errors[0], errors: q.errors };
    d.give.forEach(l => take(l)); G().addGold(-q.feeTotal); G().removeItem(TICKET, q.tier);
    const t = Date.now(), e = eco(); if (e.cstats.sentDay !== new Date().toDateString()) { e.cstats.sentDay = new Date().toDateString(); e.cstats.sentCount = 0; } e.cstats.sentCount++;
    const c = { id: uid("ct"), dir: "out", status: "pending", with: q.to.id, withName: q.to.name, give: d.give.map(l => Object.assign({}, l)), receive: d.receive.map(l => Object.assign({}, l)), note: d.note, createdAt: t, expiresAt: t + CONFIG.contractExpiryMs,
      respondAt: t + (60 + Math.floor(rnd(hash32("resp" + e.seq), 3) * 420)) * 1000, tier: q.tier, fee: q.feeTotal, km: Math.round(q.km) };
    e.contracts.unshift(c); resetDraft(); save(); return { ok: true, contract: c };
  }
  function refundContract(c) { c.give.forEach(l => give(l)); G().addGold(c.fee || 0); G().addItem(TICKET, c.tier || 0); }
  function finish(c, status) { c.status = status; c.resolvedAt = Date.now(); }
  function cancel(id) { const c = eco().contracts.find(x => x.id === id && x.status === "pending" && x.dir === "out"); if (!c) return { ok: false, reason: "Tawaran tidak ditemukan." }; refundContract(c); finish(c, "cancelled"); save(); return { ok: true }; }

  // ---------- tawaran masuk (simulasi) ----------
  function genIncoming(t = Date.now()) {
    const e = eco(), start = Math.floor(e.lastContractGen / HOUR), end = Math.floor(t / HOUR); let made = 0; e.lastContractGen = t;
    for (let s = Math.max(start + 1, end - 8); s <= end; s++) {
      const h = hash32("incoming" + s + P().username); if (rnd(h, 1) > 0.4 || e.contracts.filter(c => c.dir === "in" && c.status === "pending").length >= 5) continue;
      const pl = players()[Math.floor(rnd(h, 2) * 36)], names = Object.keys(ITEMS), a = names[Math.floor(rnd(h, 3) * names.length)];
      const aQty = Math.max(1, Math.round((10 + rnd(h, 4) * 120) / Math.max(0.3, ITEMS[a].usd) * 0.25)), usd = aQty * ITEMS[a].usd;
      const mine = Object.entries(P().inventory).filter(([k, v]) => v > 0 && k !== TICKET).sort((x, y) => y[1] - x[1]);
      const wantKey = mine.length ? mine[Math.floor(rnd(h, 5) * Math.min(3, mine.length))][0] : names[Math.floor(rnd(h, 6) * names.length)];
      const wantQty = Math.max(1, Math.round(usd * (0.9 + rnd(h, 7) * 0.3) / ITEMS[wantKey].usd));
      const km = distanceKm(pl.regionId, E.here().id), tier = courierTier(km), fee = notaryEach(usd);
      e.contracts.unshift({ id: uid("ct"), dir: "in", status: "pending", with: pl.id, withName: pl.name, receive: [{ type: "item", key: a, qty: aQty }], give: [{ type: "item", key: wantKey, qty: wantQty }], note: rnd(h, 8) < 0.5 ? "Butuh barang ini untuk pabrikku." : "", createdAt: s * HOUR, expiresAt: s * HOUR + CONFIG.contractExpiryMs, tier, fee: r3(fee * 2), km: Math.round(km) }); made++;
    }
    return made;
  }
  function respond(id, accept) {
    const c = eco().contracts.find(x => x.id === id && x.dir === "in" && x.status === "pending"); if (!c) return { ok: false, reason: "Tawaran tidak ditemukan atau sudah selesai." };
    if (!accept) { finish(c, "declined"); save(); return { ok: true, declined: true }; }
    if (!meEligible()) return { ok: false, reason: "Kamu belum memenuhi syarat kontrak (level 20+ dan akun 3 hari)." };
    for (const l of c.give) if (have(l) < l.qty) return { ok: false, reason: `${lineLabel(l)} kamu tidak cukup.` };
    const p = P(); const ticketsFree = (p.inventory[TICKET] || 0) - c.give.filter(l => l.key === TICKET).reduce((s, l) => s + l.qty, 0);
    if (ticketsFree < c.tier) return { ok: false, reason: `Butuh ${c.tier} ${TICKET} sebagai tiket kurir.` };
    const itemsIn = c.receive.filter(l => l.type === "item").reduce((s, l) => s + l.qty, 0), itemsOut = c.give.filter(l => l.type === "item").reduce((s, l) => s + l.qty, 0);
    if (G().inventoryUsed() - itemsOut - c.tier + itemsIn > p.inventoryCapacity) return { ok: false, reason: "Kapasitas inventaris tidak cukup untuk menerima barang." };
    c.give.forEach(l => take(l)); G().removeItem(TICKET, c.tier); c.receive.forEach(l => give(l));
    eco().cstats.done++; finish(c, "accepted"); save(); return { ok: true };
  }
  // Waktu berjalan: kedaluwarsa + jawaban NPC atas tawaran keluar.
  function tickContracts(t = Date.now()) {
    const e = eco(); let n = genIncoming(t);
    e.contracts.filter(c => c.status === "pending").forEach(c => {
      if (c.dir === "out" && t >= c.respondAt && t < c.expiresAt) {
        const ok = sumUsd(c.give) >= 0.95 * sumUsd(c.receive) && rnd(hash32(c.id), 5) < 0.88;
        const itemsIn = c.receive.filter(l => l.type === "item").reduce((s, l) => s + l.qty, 0), itemsFree = P().inventoryCapacity - G().inventoryUsed();
        if (ok && itemsIn <= itemsFree) { c.receive.forEach(l => give(l)); e.cstats.done++; e.cstats.notary = r3(e.cstats.notary + c.fee); finish(c, "accepted"); }
        else { refundContract(c); finish(c, ok ? "declined" : "declined"); c.reason = ok ? "Inventarismu penuh." : "Ditolak penerima."; }
        n++;
      } else if (t >= c.expiresAt) { if (c.dir === "out") refundContract(c); finish(c, "expired"); n++; }
    });
    e.contracts = e.contracts.slice(0, 120); if (n) save(); return n;
  }
  const byTab = tab => { const cs = eco().contracts; return tab === "in" ? cs.filter(c => c.dir === "in" && c.status === "pending") : tab === "out" ? cs.filter(c => c.dir === "out" && c.status === "pending") : cs.filter(c => c.status !== "pending"); };
  const stats = () => { const e = eco(), c = e.cstats; return { waiting: byTab("in").length, done: c.done, notary: c.notary, sent: e.cstats.sentDay === new Date().toDateString() ? c.sentCount : 0, limit: CONFIG.contractDailyLimit }; };

  Object.assign(E, { players, playerById, eligible, meEligible, searchPlayers, lineLabel, lineIcon, lineUsd, sumUsd, have, addLine, removeLine, setNote, setRecipient, resetDraft, distanceKm, courierTier, quoteDraft, sendDraft, cancelContract: cancel, respondContract: respond, tickContracts, contractsByTab: byTab, contractStats: stats, TICKET });
})();
