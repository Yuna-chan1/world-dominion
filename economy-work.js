/* WORLD DOMINION V.I — ECONOMY: PERUSAHAAN & PEKERJAAN BUILD 0.9 */
(function () {
  "use strict";
  const E = window.EcoEngine, G = () => window.Game, P = () => window.Game.getPlayer();
  const { CONFIG, ITEMS, RAW, PRODUCTS, TICK, hash32, rnd, r2, r3, eco, uid, save, region, npcName } = E;
  const BRAND = ["VNT", "Garuda", "Nusantara", "Atlas", "Bima", "Orion", "Titan", "Mega", "Surya", "Borneo", "Kencana", "Vega", "Delta", "Prima", "Zenith", "Aurora"];
  const WORD = { "Gandum": "Agro", "Batu": "Quarry", "Kayu": "Timber", "Besi": "Iron", "Minyak": "Oil", "Batu bara": "Coal", "Tembaga": "Copper", "Kapas": "Cotton", "Makanan": "Food", "Senjata": "Weapon", "Tiket perjalanan": "Ticket" };
  const SUFFIX = ["Grup", "Corp", "Industri", "Co", "Works"];
  const regionName = id => { const r = region(id); return r ? r.name : (id === E.here().id ? E.here().name : id); };

  // ---------- perusahaan NPC (template deterministik) ----------
  function pickRaw(r, hh) {
    const dep = r && r.resources ? Object.keys(r.resources) : [];
    return dep.length && rnd(hh, 4) < 0.7 ? dep[Math.floor(rnd(hh, 5) * dep.length)] : RAW[Math.floor(rnd(hh, 6) * RAW.length)];
  }
  function genRegion(regionId) {
    const r = region(regionId), count = 3 + Math.floor(rnd(hash32("co|" + regionId), 1) * 5), out = [];
    for (let i = 0; i < count; i++) {
      const hh = hash32("co|" + regionId + "|" + i), kind = rnd(hh, 1) < 0.62 ? "resource" : "factory", item = kind === "resource" ? pickRaw(r, hh) : PRODUCTS[Math.floor(rnd(hh, 2) * PRODUCTS.length)];
      const level = 1 + Math.floor(rnd(hh, 3) * 8), share = rnd(hh, 11) > 0.7;
      out.push({ id: `npc:${regionId}:${i}`, npc: true, name: `${BRAND[Math.floor(rnd(hh, 12) * BRAND.length)]} ${WORD[item]} ${SUFFIX[Math.floor(rnd(hh, 13) * SUFFIX.length)]}`, owner: npcName("own" + hh), ownerLevel: 10 + Math.floor(rnd(hh, 14) * 40),
        regionId, kind, item, level, mode: share ? "share" : "wage", wageGold: r3(0.06 + rnd(hh, 9) * 0.12), sharePct: 10 + Math.floor(rnd(hh, 10) * 9) * 5, recruiting: rnd(hh, 7) < 0.88,
        workersBase: Math.floor(rnd(hh, 8) * (level + 1)), funds: rnd(hh, 15) < 0.12 ? 0.05 : r3(8 + rnd(hh, 16) * 140), whOut: Math.floor(rnd(hh, 17) * 2000), whIn: kind === "factory" ? (rnd(hh, 18) < 0.28 ? 0 : Math.floor(300 + rnd(hh, 19) * 6000)) : 0, createdAt: 0 });
    }
    return out;
  }
  const regionCos = {};
  function templates(regionId) { return regionCos[regionId] || (regionCos[regionId] = genRegion(regionId)); }
  function allCompanies(regionIds) {
    const mine = eco().companies.filter(c => !regionIds || regionIds.indexOf(c.regionId) !== -1);
    const npcs = (regionIds || []).flatMap(id => templates(id)).map(applyOverlay);
    return mine.concat(npcs);
  }
  function applyOverlay(t) { const o = eco().cs[t.id]; return o ? Object.assign({}, t, o) : Object.assign({}, t); }
  function getCompany(id) {
    const m = eco().companies.find(c => c.id === id); if (m) return m;
    const mt = /^npc:(.+):(\d+)$/.exec(id || ""); if (!mt) return null; const t = templates(mt[1])[Number(mt[2])]; return t ? applyOverlay(t) : null;
  }
  function patch(c, fields) { // simpan perubahan: milikku langsung, NPC lewat overlay
    if (!c.npc) { Object.assign(eco().companies.find(x => x.id === c.id), fields); } else { eco().cs[c.id] = Object.assign(eco().cs[c.id] || {}, fields); }
  }
  const isMine = c => !c.npc;
  const isMe = c => eco().job && eco().job.companyId === c.id;
  function workerList(c) {
    if (!c.npc) return (c.workers || []).slice();
    const base = []; for (let i = 0; i < c.workersBase; i++) base.push({ name: npcName("w" + c.id + i), turns: 20 + Math.floor(rnd(hash32(c.id), 30 + i) * 400), units: 0, paid: 0, npc: true });
    base.forEach(w => { w.units = w.turns * 2; w.paid = r3(w.turns * c.wageGold); });
    return base;
  }
  function view(c) {
    const ws = workerList(c), count = ws.length + (c.npc && isMe(c) ? 1 : 0);
    const dep = region(c.regionId), deposit = c.kind === "resource" && dep && dep.resources ? (dep.resources[c.item] || 0) : 0;
    const tags = { full: count >= c.level, cantPay: c.mode === "wage" && c.funds < c.wageGold * 10, share: c.mode === "share", noMaterials: c.kind === "factory" && c.whIn < CONFIG.inputRatio * 2, closed: !c.recruiting };
    return Object.assign({}, c, { regionName: regionName(c.regionId), workers: ws, workersCount: count, vacancies: Math.max(0, c.level - count), tags, deposit, landBonus: deposit > 0 ? 1 + Math.min(0.5, deposit / 1000) : 1,
      productId: c.item, typeLabel: c.kind === "resource" ? "Pabrik bahan baku" : "Pabrik produksi", employed: isMe(c), mine: !c.npc });
  }

  // ---------- daftar lowongan ----------
  function jobList({ scope = "home", q = "", item = "", hideFull = false, hideCantPay = false, onlyShare = false, hideNoMat = false, kind = "" } = {}) {
    const ids = scope === "home" ? [E.home().id] : (E.unlockedRegions().length ? E.unlockedRegions().map(r => r.id) : [E.home().id]);
    const query = String(q || "").trim().toLowerCase();
    return allCompanies(ids).map(view).filter(c => c.recruiting || c.employed).filter(c => (!query || c.name.toLowerCase().includes(query) || String(c.owner).toLowerCase().includes(query))
      && (!item || c.item === item) && (!kind || c.kind === kind) && !(hideFull && c.tags.full && !c.employed) && !(hideCantPay && c.tags.cantPay) && !(onlyShare && !c.tags.share) && !(hideNoMat && c.tags.noMaterials));
  }

  // ---------- pekerjaan ----------
  const job = () => eco().job;
  function needsPermit(c) { const r = region(c.regionId), hm = region(E.home().id); return !!(r && hm && r.country !== hm.country); }
  function takeJob(id) {
    const c = getCompany(id); if (!c) return { ok: false, reason: "Perusahaan tidak ditemukan." }; const v = view(c);
    if (job() && job().companyId === id) return { ok: true, already: true };
    if (job()) { const cur = getCompany(job().companyId); return { ok: false, reason: `Kamu masih bekerja di ${cur ? cur.name : "perusahaan lain"}. Mundur dulu.` }; }
    if (!v.mine && !v.recruiting) return { ok: false, reason: "Perusahaan ini tidak membuka lowongan." };
    if (v.vacancies <= 0 && !v.mine) return { ok: false, reason: "Lowongan sudah penuh." };
    if (needsPermit(c)) { const pm = (G().getWorldState().workPermits || []).find(p => p.provinceId === c.regionId && p.status !== "ditolak"); if (!pm) return { ok: false, reason: "Wilayah ini berada di negara lain: ajukan izin kerja di Peta Dunia dulu." }; }
    eco().job = { companyId: id, since: Date.now(), turns: 0, earnedGold: 0, earnedItems: 0 }; save(); return { ok: true };
  }
  function quitJob() { if (!job()) return { ok: false, reason: "Kamu tidak sedang bekerja." }; eco().job = null; save(); return { ok: true }; }
  function unitsPerCycle(v) { return 2 * G().getProductionMultiplier().multiplier * (1 + 0.05 * (v.level - 1)) * (v.kind === "resource" ? v.landBonus : 1); }
  function workNow() {
    const j = job(); if (!j) return { ok: false, reason: "Kamu belum punya pekerjaan." };
    const c = getCompany(j.companyId); if (!c) { eco().job = null; return { ok: false, reason: "Perusahaan sudah tidak ada." }; }
    const v = view(c), g = G(), p = P(), here = E.here();
    if (here.id !== c.regionId) return { ok: false, needTravel: true, reason: `Kamu harus berada di ${v.regionName} untuk bekerja.` };
    const cycles = Math.floor(p.energy / 10); if (cycles < 1) return { ok: false, reason: "Energi minimal 10 diperlukan untuk bekerja." };
    let units = Math.max(1, Math.floor(cycles * unitsPerCycle(v)));
    if (c.kind === "factory") { units = Math.min(units, Math.floor(c.whIn / CONFIG.inputRatio)); if (units < 1) return { ok: false, reason: `Perusahaan tidak punya bahan (butuh ${CONFIG.inputRatio} ${ITEMS[c.item].input} per unit).` }; }
    const own = isMine(c); let gold = 0, shareUnits = 0;
    if (!own && c.mode === "wage") { gold = r3(cycles * c.wageGold * g.getWageMultiplier()); if (c.funds < gold) return { ok: false, reason: "Perusahaan tidak sanggup memberi upah saat ini." }; }
    if (!own && c.mode === "share") { shareUnits = Math.floor(units * c.sharePct / 100); if (g.inventoryUsed() + shareUnits > p.inventoryCapacity) return { ok: false, reason: "Kapasitas inventaris tidak cukup untuk bagian hasilmu." }; }
    g.useEnergy(cycles * 10); g.addExp(cycles * 5); p.workCount += cycles;
    if (gold) { g.addGold(gold); p.workGoldEarned = r3((p.workGoldEarned || 0) + gold); }
    if (shareUnits) g.addItem(c.item, shareUnits);
    const f = { whOut: c.whOut + units - shareUnits, funds: r3(c.funds - gold) }; if (c.kind === "factory") f.whIn = c.whIn - units * CONFIG.inputRatio;
    patch(c, f); j.turns += cycles; j.earnedGold = r3(j.earnedGold + gold); j.earnedItems += shareUnits;
    save(); return { ok: true, cycles, units, gold, shareUnits, item: c.item, exp: cycles * 5 };
  }

  // ---------- perusahaan milikku ----------
  const FOUND_COST = { resource: 20, factory: 50 };
  const maxCompanies = () => 1 + Math.floor(P().level / 5);
  const upgradeCost = c => 15 * (c.level + 1);
  function foundCompany({ name, kind, item }) {
    name = String(name || "").trim().replace(/\s+/g, " "); if (name.length < 3 || name.length > 30) return { ok: false, reason: "Nama perusahaan 3–30 karakter." };
    if (!ITEMS[item] || (kind === "resource" && ITEMS[item].group !== "raw") || (kind === "factory" && ITEMS[item].group !== "product")) return { ok: false, reason: "Jenis produksi tidak valid." };
    if (eco().companies.length >= maxCompanies()) return { ok: false, reason: `Batas perusahaan untuk level ${P().level} adalah ${maxCompanies()}.` };
    if (eco().companies.some(c => c.name.toLowerCase() === name.toLowerCase())) return { ok: false, reason: "Nama perusahaan sudah dipakai." };
    const cost = FOUND_COST[kind], h = E.here(); if (P().gold < cost) return { ok: false, reason: `Gold tidak cukup (butuh ${cost}).` };
    G().addGold(-cost);
    const c = { id: uid("co"), npc: false, name, owner: P().username, ownerLevel: P().level, regionId: h.id, kind, item, level: 1, mode: "wage", wageGold: 0.1, sharePct: 40, recruiting: true, workers: [], funds: 0, whOut: 0, whIn: 0, createdAt: Date.now() };
    eco().companies.push(c); save(); return { ok: true, company: c };
  }
  const mineOf = id => eco().companies.find(c => c.id === id);
  function upgradeCompany(id) { const c = mineOf(id); if (!c) return { ok: false, reason: "Bukan perusahaanmu." }; if (c.level >= CONFIG.maxCompanyLevel) return { ok: false, reason: "Level maksimum." }; const cost = upgradeCost(c); if (!G().addGold(-cost)) return { ok: false, reason: `Gold tidak cukup (butuh ${cost}).` }; c.level++; save(); return { ok: true, level: c.level, cost }; }
  function depositTo(id, what, amount) {
    const c = mineOf(id); if (!c) return { ok: false, reason: "Bukan perusahaanmu." }; amount = what === "funds" ? r3(Number(amount)) : Math.floor(Number(amount)); if (!(amount > 0)) return { ok: false, reason: "Jumlah tidak valid." };
    if (what === "funds") { if (!G().addGold(-amount)) return { ok: false, reason: "Gold tidak cukup." }; c.funds = r3(c.funds + amount); }
    else if (what === "input") { if (c.kind !== "factory") return { ok: false, reason: "Perusahaan bahan baku tidak butuh masukan." }; const it = ITEMS[c.item].input; if (!G().removeItem(it, amount)) return { ok: false, reason: `Stok ${it} di inventaris tidak cukup.` }; c.whIn += amount; }
    else return { ok: false, reason: "Tujuan tidak valid." };
    save(); return { ok: true };
  }
  function withdrawFrom(id, what, amount) {
    const c = mineOf(id); if (!c) return { ok: false, reason: "Bukan perusahaanmu." }; amount = what === "funds" ? r3(Number(amount)) : Math.floor(Number(amount)); if (!(amount > 0)) return { ok: false, reason: "Jumlah tidak valid." };
    if (what === "funds") { if (c.funds < amount) return { ok: false, reason: "Dana perusahaan kurang." }; c.funds = r3(c.funds - amount); G().addGold(amount); }
    else if (what === "output") { if (c.whOut < amount) return { ok: false, reason: "Stok gudang kurang." }; if (!G().addItem(c.item, amount)) return { ok: false, reason: "Kapasitas inventaris tidak cukup." }; c.whOut -= amount; }
    else if (what === "input") { const it = ITEMS[c.item].input; if (c.whIn < amount) return { ok: false, reason: "Bahan kurang." }; if (!G().addItem(it, amount)) return { ok: false, reason: "Kapasitas inventaris tidak cukup." }; c.whIn -= amount; }
    save(); return { ok: true };
  }
  function setTerms(id, { mode, wageGold, sharePct, recruiting }) {
    const c = mineOf(id); if (!c) return { ok: false, reason: "Bukan perusahaanmu." };
    if (mode) c.mode = mode === "share" ? "share" : "wage"; if (wageGold != null) { const w = r3(Number(wageGold)); if (!(w >= 0.01 && w <= 5)) return { ok: false, reason: "Upah 0,01–5 Gold per giliran." }; c.wageGold = w; }
    if (sharePct != null) { const s = Math.floor(Number(sharePct)); if (!(s >= 10 && s <= 90)) return { ok: false, reason: "Bagi hasil minimal 10% dan maksimal 90%." }; c.sharePct = s; }
    if (recruiting != null) c.recruiting = !!recruiting; save(); return { ok: true };
  }
  function fireWorker(id, idx) { const c = mineOf(id); if (!c || !c.workers[idx]) return { ok: false, reason: "Pekerja tidak ditemukan." }; c.workers.splice(idx, 1); save(); return { ok: true }; }
  function setWorkerWage(id, idx, wage) { const c = mineOf(id); if (!c || !c.workers[idx]) return { ok: false, reason: "Pekerja tidak ditemukan." }; c.workers[idx].wage = r3(Number(wage)); save(); return { ok: true }; }

  // Simulasi pekerja NPC pada perusahaanku (malas, per 10 menit).
  function simulateCompanies(t = Date.now()) {
    const e = eco(), ticks = Math.min(144, Math.floor((t - e.lastSim) / TICK)); if (ticks < 1) return 0; e.lastSim += ticks * TICK; let events = 0;
    e.companies.forEach(c => {
      const hc = hash32(c.id), lv = 1 + 0.05 * (c.level - 1), dep = region(c.regionId), land = c.kind === "resource" && dep && dep.resources && dep.resources[c.item] ? 1 + Math.min(0.5, dep.resources[c.item] / 1000) : 1;
      for (let k = 0; k < ticks; k++) {
        const ti = Math.floor(e.lastSim / TICK) - (ticks - 1 - k), attractive = (c.mode === "wage" && c.wageGold >= 0.08) || (c.mode === "share" && c.sharePct >= 25);
        if (c.recruiting && attractive && c.workers.length < c.level && rnd(hc, ti) < 0.25) c.workers.push({ name: npcName(c.id + ti), turns: 0, units: 0, paid: 0, acc: 0, npc: true, lastAt: 0 });
        c.workers.forEach((w, wi) => {
          w.acc = (w.acc || 0) + 1 / 6; if (w.acc < 1) return; w.acc -= 1;
          let units = Math.max(1, Math.floor(2 * lv * land)); if (c.kind === "factory") { units = Math.min(units, Math.floor(c.whIn / CONFIG.inputRatio)); if (units < 1) return; }
          let pay = 0, share = 0; const wage = w.wage != null ? w.wage : c.wageGold;
          if (c.mode === "wage") { if (c.funds < wage) return; pay = wage; } else share = Math.floor(units * c.sharePct / 100);
          c.funds = r3(c.funds - pay); if (c.kind === "factory") c.whIn -= units * CONFIG.inputRatio; c.whOut += units - share;
          w.turns++; w.units += units; w.paid = r3(w.paid + pay); w.lastAt = e.lastSim; events++;
        });
      }
    });
    if (events || ticks) save(); return events;
  }
  const permits = () => (G().getWorldState().workPermits || []).slice().reverse();

  Object.assign(E, { WORD, regionName, allCompanies, getCompany, view, jobList, job, takeJob, quitJob, workNow, unitsPerCycle, FOUND_COST, maxCompanies, upgradeCost, foundCompany, upgradeCompany, depositTo, withdrawFrom, setTerms, fireWorker, setWorkerWage, simulateCompanies, permits, workerList, needsPermit });
})();
