/* WORLD DOMINION V.I — CORE SYSTEM BUILD 0.9
   Satu sumber data untuk seluruh domain.
*/
(function () {
  "use strict";

  const STORAGE_KEY = "worldDominionPlayer";
  const MAX_LEVEL = 50;

  const DEFAULT_PLAYER = {
    username: "Pemain Baru",
    profileImage: "",
    level: 1,
    exp: 0,
    energy: 100,
    maxEnergy: 100,
    gold: 100,
    localMoney: 1000,
    foreignMoney: 0,
    wallet: {},
    inventoryCapacity: 500,
    inventory: {
      "Gandum": 0, "Batu": 0, "Kayu": 0, "Besi": 0,
      "Minyak": 0, "Batu bara": 0, "Tembaga": 0, "Kapas": 0,
      "Senjata": 0, "Perisai": 0, "Armor": 0,
      "Makanan": 10, "Minuman energi": 5, "Tiket perjalanan": 0
    },
    stats: { strength: 1, education: 1, economy: 1 },
    upgrades: { strength: null, education: null, economy: null },
    workCount: 0,
    energyUsed: 0,
    workGoldEarned: 0,
    world: {
      startAssigned: false,
      currentProvinceId: null,
      currentProvinceName: null,
      currentCityName: null,
      currentCountryName: null,
      currentCountryIso2: "",
      citizenshipProvinceId: null,
      citizenshipCountryName: null,
      citizenshipProvinceName: null,
      lastCitizenshipAt: 0,
      workPermits: [],
      rebellions: {},
      pendingFlight: null
    },
    chatMessages: { Global: [], Region: [], Negara: [], Partai: [] },
    activities: { marketPurchases: 0, warAttacks: 0, warDamage: 0, lawsRatified: 0 },
    achievementsClaimed: [],
    convoys: [null, null, null],
    missions: { work5Claimed: false, work10Claimed: false },
    buffs: {
      convoy: 0,
      industry: 0,
      ideology: 0,
      company: 0
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return clone(DEFAULT_PLAYER);
      const parsed = JSON.parse(saved);
      return {
        ...clone(DEFAULT_PLAYER),
        ...parsed,
        inventory: { ...DEFAULT_PLAYER.inventory, ...(parsed.inventory || {}) },
        stats: { ...DEFAULT_PLAYER.stats, ...(parsed.stats || {}) },
        upgrades: { ...DEFAULT_PLAYER.upgrades, ...(parsed.upgrades || {}) },
        missions: { ...DEFAULT_PLAYER.missions, ...(parsed.missions || {}) },
        activities: { ...DEFAULT_PLAYER.activities, ...(parsed.activities || {}) },
        world: {
          ...clone(DEFAULT_PLAYER.world),
          ...(parsed.world || {}),
          workPermits: Array.isArray(parsed.world?.workPermits) ? parsed.world.workPermits : [],
          rebellions: { ...(parsed.world?.rebellions || {}) }
        },
        chatMessages: {
          ...clone(DEFAULT_PLAYER.chatMessages),
          ...(parsed.chatMessages || {})
        },
        workGoldEarned: Number(parsed.workGoldEarned) || 0,
        achievementsClaimed: Array.isArray(parsed.achievementsClaimed) ? parsed.achievementsClaimed : [],
        convoys: Array.isArray(parsed.convoys) ? parsed.convoys.slice(0, 3) : [null, null, null],
        energyUsed: Number(parsed.energyUsed) || 0,
        buffs: { ...DEFAULT_PLAYER.buffs, ...(parsed.buffs || {}) }
      };
    } catch (error) {
      console.error("Gagal memuat data pemain:", error);
      return clone(DEFAULT_PLAYER);
    }
  }

  let player = load();
  const listeners = new Set();
  if (!player.convoyEffects) player.convoyEffects = {};
  // Rekonstruksi efek konvoi dari bangunan yang sudah tersimpan.
  player.convoys.filter(Boolean).forEach(entry => {
    const data = { hospital: { energyRestore: 10 }, workshop: { production: 8, wages: 5 }, command: { strength: 8, damage: 8 }, education: { upgradeTime: 10 } }[entry.type] || {};
    Object.entries(data).forEach(([key, value]) => { player.convoyEffects[key] = (player.convoyEffects[key] || 0) + value; });
    if (data.production) player.buffs.convoy = (player.buffs.convoy || 0) + data.production;
  });

  // Muat ulang data pemain dari localStorage (dipakai saat berganti akun/login/daftar).
  function reloadFromStorage() {
    player = load();
    if (!player.convoyEffects) player.convoyEffects = {};
    applyConvoyBuffs();
    emit();
    return player;
  }

  function emit() {
    listeners.forEach(fn => {
      try { fn(player); } catch (error) { console.error(error); }
    });
  }

  function save() {
    try {
      const serialized = JSON.stringify(player);
      localStorage.setItem(STORAGE_KEY, serialized);
      const activeAccount = localStorage.getItem("worldDominionActiveAccount");
      if (activeAccount) {
        try {
          const accounts = JSON.parse(localStorage.getItem("worldDominionAccounts") || "{}");
          if (accounts[activeAccount]) {
            accounts[activeAccount].playerData = clone(player);
            localStorage.setItem("worldDominionAccounts", JSON.stringify(accounts));
          }
        } catch (error) { console.error("Gagal menyimpan data akun lokal:", error); }
      }
      emit();
      return true;
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      return false;
    }
  }

  function expNeeded(level) {
    return level * 100;
  }

  function addExp(amount) {
    if (!Number.isFinite(amount) || amount <= 0 || player.level >= MAX_LEVEL) return;
    player.exp += amount;
    while (player.level < MAX_LEVEL && player.exp >= expNeeded(player.level)) {
      player.exp -= expNeeded(player.level);
      player.level += 1;
      player.maxEnergy += 5;
      if (player.level % 10 === 0) player.inventoryCapacity += 500;
    }
    if (player.level >= MAX_LEVEL) player.exp = 0;
    save();
  }

  function inventoryUsed() {
    return Object.values(player.inventory).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  }

  function addItem(name, amount) {
    amount = Number(amount);
    if (!(name in player.inventory) || !Number.isInteger(amount) || amount <= 0) return false;
    if (inventoryUsed() + amount > player.inventoryCapacity) return false;
    player.inventory[name] += amount;
    save();
    return true;
  }

  function removeItem(name, amount = 1) {
    amount = Number(amount);
    if (!(name in player.inventory) || !Number.isInteger(amount) || amount <= 0) return false;
    if (player.inventory[name] < amount) return false;
    player.inventory[name] -= amount;
    save();
    return true;
  }

  function useEnergy(amount) {
    amount = Number(amount);
    if (!Number.isFinite(amount) || amount <= 0 || player.energy < amount) return false;
    player.energy -= amount;
    player.energyUsed += amount;
    save();
    return true;
  }

  function restoreEnergy(amount) {
    amount = Number(amount);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    amount = amount * getEnergyRestoreMultiplier();
    const restored = Math.min(amount, player.maxEnergy - player.energy);
    if (restored <= 0) return 0;
    player.energy += restored;
    save();
    return restored;
  }

  // Buff dijumlahkan secara bertingkat/multiplikatif, bukan dijumlahkan persentasenya.
  function getProductionMultiplier() {
    // Nilai sumber buff dinyatakan dalam persen (misalnya 1 = +1%).
    const economyBuff = Math.max(0, player.stats.economy) * 1;
    const sources = {
      convoy: Math.max(0, Number(player.buffs.convoy) || 0),
      industry: Math.max(0, Number(player.buffs.industry) || 0),
      economy: economyBuff,
      ideology: Math.max(0, Number(player.buffs.ideology) || 0),
      company: Math.max(0, Number(player.buffs.company) || 0)
    };
    const multiplier = Object.values(sources).reduce((total, percent) => total * (1 + percent / 100), 1);
    return { multiplier, sources, percent: (multiplier - 1) * 100 };
  }

  // Satu klik menjalankan sebanyak mungkin siklus 10 energi.
  function work() {
    const cycles = Math.floor(player.energy / 10);
    if (cycles < 1) return { ok: false, reason: "Energi minimal 10 diperlukan untuk bekerja." };

    const spent = cycles * 10;
    const baseProduction = cycles * 2;
    // Upah dasar 0,1 Gold per siklus (10 energi), mengikuti buff upah perusahaan.
    const wage = Math.round(cycles * 0.1 * getWageMultiplier() * 1000) / 1000;
    const buff = getProductionMultiplier();
    const production = Math.floor(baseProduction * buff.multiplier);

    if (inventoryUsed() + production > player.inventoryCapacity) {
      return { ok: false, reason: "Kapasitas inventaris tidak cukup untuk menampung hasil produksi." };
    }

    player.energy -= spent;
    player.energyUsed += spent;
    player.inventory["Besi"] += production;
    player.gold = Math.round((player.gold + wage) * 1000) / 1000;
    player.workGoldEarned = Math.round(((player.workGoldEarned || 0) + wage) * 1000) / 1000;
    player.workCount += cycles;

    // Aturan Build 0.3 tetap dipertahankan: setiap siklus kerja memberi 5 EXP.
    addExp(cycles * 5);
    save();

    return {
      ok: true, cycles, spent, baseProduction, production,
      bonus: production - baseProduction,
      exp: cycles * 5,
      wage,
      multiplier: buff.multiplier
    };
  }

  // Aturan biaya upgrade: 100 Gold x level statistik saat ini.
  // Durasi: 60 detik x level statistik saat ini.
  function getUpgradeQuote(statKey) {
    if (!(statKey in player.stats)) return null;
    const currentLevel = player.stats[statKey];
    return {
      statKey,
      currentLevel,
      nextLevel: currentLevel + 1,
      cost: currentLevel * 100,
      durationMs: Math.max(1000, Math.round(currentLevel * 60 * 1000 * getUpgradeTimeMultiplier()))
    };
  }

  function startUpgrade(statKey) {
    if (!(statKey in player.stats)) return { ok: false, reason: "Statistik tidak ditemukan." };
    const active = player.upgrades[statKey];
    if (active && active.finishAt > Date.now()) return { ok: false, reason: "Upgrade statistik ini masih berlangsung." };
    if (active && active.finishAt <= Date.now()) finishUpgrade(statKey);
    const quote = getUpgradeQuote(statKey);
    if (player.gold < quote.cost) return { ok: false, reason: "Gold tidak mencukupi." };

    player.gold -= quote.cost;
    player.upgrades[statKey] = { startedAt: Date.now(), finishAt: Date.now() + quote.durationMs };
    save();
    return { ok: true, quote };
  }

  function finishUpgrade(statKey) {
    const active = player.upgrades[statKey];
    if (!active || active.finishAt > Date.now()) return false;
    player.stats[statKey] += 1;
    player.upgrades[statKey] = null;
    save();
    return true;
  }

  function claimMission(key) {
    const missions = {
      work5Claimed: { required: 5, reward: 50 },
      work10Claimed: { required: 10, reward: 100 }
    };
    const mission = missions[key];
    if (!mission || player.missions[key] || player.workCount < mission.required) return false;
    player.missions[key] = true;
    addExp(mission.reward);
    save();
    return mission.reward;
  }

  function setUsername(name) {
    const clean = String(name || "").trim().slice(0, 24);
    if (!clean) return false;
    player.username = clean;
    save();
    return true;
  }

  function setProfileImage(dataUrl) {
    player.profileImage = String(dataUrl || "");
    save();
  }

  function setBuff(source, percent) {
    if (!(source in player.buffs)) return false;
    percent = Number(percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 500) return false;
    player.buffs[source] = percent;
    save();
    return true;
  }

  const CONVOY_BUILDINGS = {
    hospital: { name: "Rumah sakit", icon: "🏥", buff: "Pemulihan energi +10%", effects: { energyRestore: 10 }, requirements: { Gandum: 120, Kapas: 100, Kayu: 90, Batu: 35, Besi: 15, "Batu bara": 5, Tembaga: 5, Minyak: 10 } },
    workshop: { name: "Bengkel bergerak", icon: "🔧", buff: "Produksi +8% dan upah +5%", effects: { production: 8, wages: 5 }, requirements: { "Batu bara": 150, Tembaga: 100, Besi: 120, Batu: 45, Kayu: 25, Minyak: 35, Kapas: 5, Gandum: 5 } },
    command: { name: "Pusat komando", icon: "🎖️", buff: "Kekuatan dan damage serangan +8%", effects: { strength: 8, damage: 8 }, requirements: { Besi: 130, Tembaga: 100, Batu: 90, "Batu bara": 60, Minyak: 55, Kayu: 25, Kapas: 10, Gandum: 5 } },
    education: { name: "Pusat pendidikan", icon: "🏫", buff: "Waktu upgrade stat -10%", effects: { upgradeTime: 10 }, requirements: { Kayu: 120, Batu: 90, Gandum: 100, Kapas: 35, Besi: 25, Tembaga: 15, "Batu bara": 10, Minyak: 10 } }
  };

  const ACHIEVEMENTS = [
    { id: "market10", title: "Pedagang Pemula", description: "Beli 10 barang di Pasar Global.", activity: "marketPurchases", target: 10, reward: 50 },
    { id: "market100", title: "Saudagar", description: "Beli 100 barang di Pasar Global.", activity: "marketPurchases", target: 100, reward: 200 },
    { id: "attack10", title: "Pejuang", description: "Lakukan 10 serangan dalam perang.", activity: "warAttacks", target: 10, reward: 75 },
    { id: "attack50", title: "Veteran Perang", description: "Lakukan 50 serangan dalam perang.", activity: "warAttacks", target: 50, reward: 250 },
    { id: "energy1000", title: "Pekerja Keras", description: "Gunakan total 1.000 energi untuk aktivitas.", activity: "energyUsed", target: 1000, reward: 100 },
    { id: "damage1000", title: "Daya Serang", description: "Capai total 1.000 damage dalam perang.", activity: "warDamage", target: 1000, reward: 150 },
    { id: "law1", title: "Pembuat Kebijakan", description: "Sahkan 1 UU melalui parlemen/pemerintah.", activity: "lawsRatified", target: 1, reward: 100 },
    { id: "law5", title: "Legislator", description: "Sahkan 5 UU melalui parlemen/pemerintah.", activity: "lawsRatified", target: 5, reward: 300 }
  ];

  function recordActivity(type, amount = 1) {
    amount = Number(amount);
    const allowed = ["marketPurchases", "warAttacks", "warDamage", "lawsRatified"];
    if (!allowed.includes(type) || !Number.isFinite(amount) || amount <= 0) return false;
    player.activities[type] = (Number(player.activities[type]) || 0) + amount;
    save();
    return true;
  }

  function getAchievementProgress(achievement) {
    const value = achievement.activity === "energyUsed" ? player.energyUsed : player.activities[achievement.activity];
    return Math.max(0, Number(value) || 0);
  }

  function claimAchievement(id) {
    const item = ACHIEVEMENTS.find(entry => entry.id === id);
    if (!item || player.achievementsClaimed.includes(id) || getAchievementProgress(item) < item.target) return false;
    player.achievementsClaimed.push(id);
    player.gold += item.reward;
    save();
    return item.reward;
  }

  function purchaseEnergyDrink(quantity = 1) {
    quantity = Number(quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, reason: "Jumlah pembelian tidak valid." };
    const cost = quantity * 0.1;
    if (player.gold + 1e-9 < cost) return { ok: false, reason: "Gold tidak mencukupi." };
    if (inventoryUsed() + quantity > player.inventoryCapacity) return { ok: false, reason: "Kapasitas penyimpanan tidak cukup." };
    player.gold = Math.round((player.gold - cost) * 1000) / 1000;
    player.inventory["Minuman energi"] += quantity;
    save();
    return { ok: true, quantity, cost };
  }

  function getConvoySlotUnlockLevel(slotIndex) { return [10, 30, 70][slotIndex] || 999; }
  function getConvoyBuilding(type) { return CONVOY_BUILDINGS[type] || null; }
  function buildConvoy(slotIndex, type) {
    const index = Number(slotIndex);
    const building = CONVOY_BUILDINGS[type];
    if (!Number.isInteger(index) || index < 0 || index > 2 || !building) return { ok: false, reason: "Slot atau jenis bangunan tidak valid." };
    const requiredLevel = getConvoySlotUnlockLevel(index);
    if (player.level < requiredLevel) return { ok: false, reason: `Slot ini terbuka pada Level ${requiredLevel}.` };
    if (player.convoys[index]) return { ok: false, reason: "Slot ini sudah digunakan." };
    for (const [item, amount] of Object.entries(building.requirements)) {
      if ((player.inventory[item] || 0) < amount) return { ok: false, reason: `Bahan ${item} kurang. Butuh ${amount}.` };
    }
    Object.entries(building.requirements).forEach(([item, amount]) => { player.inventory[item] -= amount; });
    player.convoys[index] = { type, builtAt: Date.now() };
    applyConvoyBuffs();
    save();
    return { ok: true, building };
  }
  function applyConvoyBuffs() {
    const built = player.convoys.filter(Boolean);
    const production = built.reduce((sum, entry) => sum + (CONVOY_BUILDINGS[entry.type]?.effects.production || 0), 0);
    player.buffs.convoy = production;
    player.convoyEffects = built.reduce((all, entry) => {
      const effects = CONVOY_BUILDINGS[entry.type]?.effects || {};
      Object.entries(effects).forEach(([key, value]) => { all[key] = (all[key] || 0) + value; });
      return all;
    }, {});
  }
  function getUpgradeTimeMultiplier() {
    const effects = player.convoyEffects || {};
    return Math.max(0.5, 1 - (Number(effects.upgradeTime) || 0) / 100);
  }
  function getEnergyRestoreMultiplier() {
    return 1 + (Number(player.convoyEffects?.energyRestore) || 0) / 100;
  }
  function getCombatBuffs() {
    return { strength: Number(player.convoyEffects?.strength) || 0, damage: Number(player.convoyEffects?.damage) || 0 };
  }
  function getWageMultiplier() {
    return 1 + (Number(player.convoyEffects?.wages) || 0) / 100;
  }

  const CITIZENSHIP_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;
  const FLIGHT_TIERS = {
    T1: { name: "Ekonomi", fare: 250, durationMs: 8 * 60 * 60 * 1000, benefit: "Tarif paling hemat" },
    T2: { name: "Bisnis", fare: 500, durationMs: 4 * 60 * 60 * 1000, benefit: "Waktu perjalanan 50% lebih cepat" },
    T3: { name: "Eksekutif", fare: 1000, durationMs: 2 * 60 * 60 * 1000, benefit: "Perjalanan tercepat" }
  };

  // Tarif dan durasi mengikuti jarak (km): rute pendek murah dan cepat, antar-benua mahal dan lama.
  function quoteFlight(tier, distanceKm = 0) {
    const ticket = FLIGHT_TIERS[tier]; if (!ticket) return null;
    const km = Math.max(0, Number(distanceKm) || 0);
    const durationFactor = Math.min(3, 0.15 + km / 5000);
    const fareFactor = 0.3 + km / 4500;
    return { tier, distanceKm: Math.round(km), fare: Math.max(10, Math.round(ticket.fare * fareFactor)), durationMs: Math.max(60000, Math.round(ticket.durationMs * durationFactor)) };
  }

  // ---- Negara buatan pemain (prototipe lokal; versi multiplayer memerlukan server) ----
  const FOUND_COST_GOLD = 100;
  function getCountries() { if (!player.countries) player.countries = {}; return player.countries; }
  function ownerOfRegion(regionId) { return Object.values(getCountries()).find(c => c.regionIds.indexOf(regionId) !== -1) || null; }
  const cleanColor = v => /^#[0-9a-fA-F]{6}$/.test(v || "") ? v : "#c8102e";
  function cleanFlag(f = {}) { return { pattern: ["h2", "h3", "v3", "cross", "disc", "diag"].indexOf(f.pattern) !== -1 ? f.pattern : "h2", c1: cleanColor(f.c1), c2: cleanColor(f.c2 || "#ffffff") }; }
  function foundCountry(regionId, opts = {}) {
    const world = ensureWorldData(), name = String(opts.name || "").trim().replace(/\s+/g, " ");
    if (name.length < 3 || name.length > 30) return { ok: false, reason: "Nama negara harus 3–30 karakter." };
    if (ownerOfRegion(regionId)) return { ok: false, reason: "Wilayah ini sudah menjadi bagian dari sebuah negara." };
    if (world.citizenshipProvinceId !== regionId) return { ok: false, reason: "Kamu harus menjadi penduduk asli wilayah ini untuk mendirikan negara." };
    if (player.gold < FOUND_COST_GOLD) return { ok: false, reason: `Gold tidak mencukupi (butuh ${FOUND_COST_GOLD}).` };
    if (Object.values(getCountries()).some(c => c.name.toLowerCase() === name.toLowerCase())) return { ok: false, reason: "Nama negara sudah dipakai." };
    const id = "negara-" + Date.now().toString(36);
    getCountries()[id] = { id, name, color: cleanColor(opts.color), flag: cleanFlag(opts.flag), regionIds: [regionId], founder: player.username, foundedAt: Date.now() };
    player.gold -= FOUND_COST_GOLD; save();
    return { ok: true, country: getCountries()[id] };
  }
  function updateCountry(id, opts = {}) {
    const c = getCountries()[id]; if (!c) return { ok: false, reason: "Negara tidak ditemukan." };
    if (c.founder !== player.username) return { ok: false, reason: "Hanya pendiri yang boleh mengubah tampilan negara." };
    if (opts.color) c.color = cleanColor(opts.color); if (opts.flag) c.flag = cleanFlag(opts.flag);
    save(); return { ok: true, country: c };
  }

  // Penempatan awal acak: pemain lahir (dan menjadi penduduk asli) di satu wilayah.
  function assignStartLocation(region) {
    const world = ensureWorldData();
    if (!region || !region.id) return { ok: false, reason: "Wilayah awal tidak valid." };
    world.startAssigned = true;
    world.currentProvinceId = region.id; world.currentProvinceName = region.name;
    world.currentCityName = region.city || region.name;
    world.currentCountryName = region.country || ""; world.currentCountryIso2 = region.iso2 || "";
    world.citizenshipProvinceId = region.id; world.citizenshipProvinceName = region.name;
    world.citizenshipCountryName = region.country || "";
    world.pendingFlight = null;
    save();
    return { ok: true, region };
  }

  // ---- Mata uang & dompet ----
  // Kurs dasar per 1 USD (dipakai juga oleh tarif tiket). 1 Gold = 10 USD.
  const GOLD_USD = 10;
  const CURRENCIES = {
    USD: { name: "Dolar AS", symbol: "$", perUsd: 1, decimals: 2 },
    IDR: { name: "Rupiah", symbol: "Rp", perUsd: 15800, decimals: 0 },
    EUR: { name: "Euro", symbol: "€", perUsd: 0.92, decimals: 2 },
    JPY: { name: "Yen", symbol: "¥", perUsd: 150, decimals: 0 },
    CNY: { name: "Yuan", symbol: "CN¥", perUsd: 7.2, decimals: 2 },
    DNR: { name: "Dinar", symbol: "DN", perUsd: 0.31, decimals: 2 },
    RUB: { name: "Rubel", symbol: "₽", perUsd: 92, decimals: 0 }
  };
  const COUNTRY_CURRENCY = { ID: "IDR", US: "USD", JP: "JPY", CN: "CNY", RU: "RUB", KW: "DNR", JO: "DNR", IQ: "DNR", BH: "DNR", RS: "DNR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR" };
  function getLocalCurrency() { const w = ensureWorldData(); return COUNTRY_CURRENCY[w.currentCountryIso2] || (w.currentCountryIso2 ? "USD" : "IDR"); }
  function getWallet() {
    if (!player.wallet || typeof player.wallet !== "object") player.wallet = {};
    Object.keys(CURRENCIES).forEach(c => { if (typeof player.wallet[c] !== "number") player.wallet[c] = 0; });
    if (!player.walletMigrated) { // uang lokal lama dianggap bernilai USD
      player.walletMigrated = true; player.wallet[getLocalCurrency()] += Math.round((Number(player.localMoney) || 0) * CURRENCIES[getLocalCurrency()].perUsd * 100) / 100;
    }
    return player.wallet;
  }
  const getLocalMoney = () => getWallet()[getLocalCurrency()];
  const usdToLocal = usd => Math.round(usd * CURRENCIES[getLocalCurrency()].perUsd * 100) / 100;
  function addCurrency(code, delta) {
    const w = getWallet(); if (!(code in w)) return false;
    const next = Math.round((w[code] + delta) * 100) / 100; if (next < -0.005) return false;
    w[code] = Math.max(0, next); save(); return true;
  }
  const addLocalMoney = delta => addCurrency(getLocalCurrency(), delta);
  function addGold(delta) {
    const next = Math.round((player.gold + delta) * 1000) / 1000; if (next < -0.0005) return false;
    player.gold = Math.max(0, next); save(); return true;
  }

  function ensureWorldData() {
    if (!player.world || typeof player.world !== "object") player.world = clone(DEFAULT_PLAYER.world);
    player.world = { ...clone(DEFAULT_PLAYER.world), ...player.world };
    if (!Array.isArray(player.world.workPermits)) player.world.workPermits = [];
    if (!player.world.rebellions || typeof player.world.rebellions !== "object") player.world.rebellions = {};
    return player.world;
  }

  function getWorldState() { return ensureWorldData(); }

  function claimCitizenship(provinceId, provinceName = provinceId, cityName = provinceName, extra = {}) {
    const world = ensureWorldData();
    if (!provinceId) return { ok: false, reason: "Pilih wilayah terlebih dahulu." };
    if (world.citizenshipProvinceId === provinceId) return { ok: false, reason: "Kamu sudah menjadi penduduk wilayah ini." };
    const now = Date.now();
    const remaining = CITIZENSHIP_COOLDOWN_MS - (now - (Number(world.lastCitizenshipAt) || 0));
    if (world.lastCitizenshipAt && remaining > 0) {
      return { ok: false, reason: "Perpindahan kewarganegaraan dibatasi 5 hari.", remainingMs: remaining };
    }
    world.citizenshipProvinceId = provinceId;
    world.citizenshipProvinceName = String(provinceName || provinceId);
    world.currentProvinceId = provinceId;
    world.currentProvinceName = String(provinceName || provinceId);
    world.currentCityName = String(cityName || provinceName || provinceId);
    world.currentCountryName = String(extra.countryName || ""); world.currentCountryIso2 = String(extra.countryIso2 || "");
    world.citizenshipCountryName = String(extra.countryName || "");
    world.lastCitizenshipAt = now;
    save();
    return { ok: true, provinceId, cooldownMs: CITIZENSHIP_COOLDOWN_MS };
  }

  function applyWorkPermit(provinceId) {
    const world = ensureWorldData();
    if (!provinceId) return { ok: false, reason: "Pilih wilayah terlebih dahulu." };
    if (world.workPermits.some(item => item.provinceId === provinceId && item.status !== "ditolak")) {
      return { ok: false, reason: "Permohonan izin kerja untuk wilayah ini sudah tercatat." };
    }
    world.workPermits.push({ provinceId, status: "menunggu", submittedAt: Date.now() });
    save();
    return { ok: true };
  }

  function startRebellion(provinceId, supporters) {
    const world = ensureWorldData();
    supporters = Math.floor(Number(supporters));
    if (!provinceId) return { ok: false, reason: "Pilih wilayah terlebih dahulu." };
    if (!Number.isInteger(supporters) || supporters < 5) return { ok: false, reason: "Pemberontakan membutuhkan minimal 5 orang." };
    if (player.gold < 50) return { ok: false, reason: "Gold tidak mencukupi. Dibutuhkan 50 Gold." };
    const existing = world.rebellions[provinceId];
    if (existing && existing.status === "berlangsung") return { ok: false, reason: "Pemberontakan di wilayah ini sedang berlangsung." };
    player.gold = Math.round((player.gold - 50) * 1000) / 1000;
    world.rebellions[provinceId] = { status: "berlangsung", supporters, startedAt: Date.now(), cost: 50 };
    save();
    return { ok: true, supporters, cost: 50 };
  }

  function bookFlight(provinceId, tier, provinceName = provinceId, cityName = provinceName, extra = {}) {
    completeFlight();
    const world = ensureWorldData();
    const ticket = FLIGHT_TIERS[tier];
    if (!provinceId || !ticket) return { ok: false, reason: "Tujuan atau kelas tiket tidak valid." };
    if (world.pendingFlight && world.pendingFlight.arrivalAt > Date.now()) return { ok: false, reason: "Kamu masih dalam perjalanan." };
    if (world.currentProvinceId === provinceId) return { ok: false, reason: "Kamu sudah berada di wilayah tujuan." };
    const quote = quoteFlight(tier, extra.distanceKm);
    const fareLocal = usdToLocal(quote.fare);
    if (getLocalMoney() < fareLocal) return { ok: false, reason: "Uang lokal tidak mencukupi untuk tiket ini." };
    const now = Date.now();
    const flight = {
      fromProvinceId: world.currentProvinceId || null,
      toCountryName: String(extra.countryName || ""), toCountryIso2: String(extra.countryIso2 || ""), distanceKm: quote.distanceKm,
      toProvinceId: provinceId,
      toProvinceName: String(provinceName || provinceId),
      toCityName: String(cityName || provinceName || provinceId),
      tier,
      fare: quote.fare,
      departAt: now,
      arrivalAt: now + quote.durationMs
    };
    addLocalMoney(-fareLocal);
    world.pendingFlight = flight;
    save();
    return { ok: true, flight, ticket, quote };
  }

  function completeFlight() {
    const world = ensureWorldData();
    const flight = world.pendingFlight;
    if (!flight || flight.arrivalAt > Date.now()) return false;
    world.currentProvinceId = flight.toProvinceId;
    world.currentProvinceName = flight.toProvinceName || flight.toProvinceId;
    world.currentCityName = flight.toCityName || flight.toProvinceName || flight.toProvinceId;
    world.currentCountryName = flight.toCountryName || ""; world.currentCountryIso2 = flight.toCountryIso2 || "";
    world.pendingFlight = null;
    save();
    return true;
  }

  function getChatMessages(channel) {
    const allowed = ["Global", "Region", "Negara", "Partai"];
    if (!allowed.includes(channel)) return [];
    if (!player.chatMessages || typeof player.chatMessages !== "object") player.chatMessages = clone(DEFAULT_PLAYER.chatMessages);
    if (!Array.isArray(player.chatMessages[channel])) player.chatMessages[channel] = [];
    return player.chatMessages[channel].slice();
  }

  function postChatMessage(channel, message) {
    const allowed = ["Global", "Region", "Negara", "Partai"];
    const clean = String(message || "").trim().slice(0, 300);
    if (!allowed.includes(channel) || !clean) return false;
    if (!player.chatMessages || typeof player.chatMessages !== "object") player.chatMessages = clone(DEFAULT_PLAYER.chatMessages);
    if (!Array.isArray(player.chatMessages[channel])) player.chatMessages[channel] = [];
    player.chatMessages[channel].push({ sender: player.username, text: clean, at: Date.now() });
    if (player.chatMessages[channel].length > 100) player.chatMessages[channel].splice(0, player.chatMessages[channel].length - 100);
    save();
    return true;
  }

  function navigate(file) {
    // Domain lokal harus berada dalam folder proyek yang sama.
    window.location.href = file;
  }

  // ============================================================================
  // SEMENTARA — hapus saat login diaktifkan lagi (TESTING ONLY, jangan deploy ke live).
  // Bypass login: kalau tidak ada sesi login, otomatis masuk sebagai akun tamu
  // "Tester" supaya semua halaman bisa dibuka tanpa daftar/masuk.
  // CARA MENGEMBALIKAN LOGIN: ubah TESTING_NO_LOGIN di bawah ini menjadi false
  // (atau hapus blok ini). Kode login asli tidak dihapus dan langsung aktif lagi.
  // ============================================================================
  window.TESTING_NO_LOGIN = true;
  if (window.TESTING_NO_LOGIN && typeof sessionStorage !== "undefined" && sessionStorage.getItem("wdLoggedIn") !== "yes") {
    if (!player.username || player.username === "Pemain Baru") { player.username = "Tester"; save(); }
    sessionStorage.setItem("wdLoggedIn", "yes");
  }

  window.Game = {
    getPlayer: () => player,
    getStorageKey: () => STORAGE_KEY,
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    reloadFromStorage, save, expNeeded, addExp, inventoryUsed, addItem, removeItem,
    useEnergy, restoreEnergy, getProductionMultiplier, work,
    getUpgradeQuote, startUpgrade, finishUpgrade, claimMission,
    setUsername, setProfileImage, setBuff, navigate,
    recordActivity, getAchievementProgress, claimAchievement, ACHIEVEMENTS,
    purchaseEnergyDrink, CONVOY_BUILDINGS, getConvoyBuilding, getConvoySlotUnlockLevel,
    buildConvoy, getUpgradeTimeMultiplier, getEnergyRestoreMultiplier, getCombatBuffs, getWageMultiplier,
    getWorldState, claimCitizenship, applyWorkPermit, startRebellion, GOLD_USD, CURRENCIES, getLocalCurrency, getWallet, getLocalMoney, usdToLocal, addCurrency, addLocalMoney, addGold, FLIGHT_TIERS, FOUND_COST_GOLD, getCountries, ownerOfRegion, foundCountry, updateCountry, quoteFlight, assignStartLocation, bookFlight, completeFlight,
    getChatMessages, postChatMessage,
    MAX_LEVEL
  };
})();