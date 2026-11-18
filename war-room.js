/* WORLD DOMINION V.I — RUANG PERANG (war-room.html)
   Halaman baru (fase 1): membaca state perang yang sudah ada (wdWars,
   wdDefense) dan menampilkannya dengan layout layar pertempuran —
   skor dua sisi, bar besar damage, bar perisai, Top 5, info, statistik,
   chat ruang perang, log damage.
   Fase 2: politics.js mengisi war.damageLog + war.enemyDamage; halaman ini
   juga punya tombol SERANG sendiri (aturan & angka identik dengan
   attack() di politics.js — lihat roomAttack()).
*/
(function () {
  "use strict";
  var SHIELD_CAP = 1000;
  var CHAT_KEY = "wdWarChat";
  var me = function () { return Game.getPlayer().username; };

  // Bar perisai — rumus sama seperti helper di politics.js (diimplementasi
  // ulang di sini karena helper itu privat dan halaman ini tidak memuat
  // politics.js). max 0 -> bar kosong + angka "—".
  function shieldBarHTML(label, cur, max, fillClass) {
    cur = Math.max(0, cur || 0); max = Math.max(0, max || 0);
    var pct = max > 0 ? Math.round(Math.min(100, Math.max(0, (cur / max) * 100)) * 10) / 10 : 0;
    var num = max > 0 ? WD.fmt(cur) + " / " + WD.fmt(max) : "—";
    return '<div class="shield-bars"><div><div class="shield-bar-head"><span>' + label + '</span><b class="' + fillClass + '">' + num + '</b></div>' +
      '<div class="shield-bar" role="progressbar" aria-valuenow="' + cur + '" aria-valuemax="' + max + '"><div class="shield-bar-fill ' + fillClass + '" style="width:' + pct + '%"></div></div></div></div>';
  }
  // Maks perisai musuh — sama seperti politics.js: field tersimpan, kalau
  // tidak ada -> 500 untuk SIM-RIVAL, 0 untuk negara pemain.
  function shieldMaxOf(w) {
    if (typeof w.enemyShieldsMax === "number") return w.enemyShieldsMax;
    return w.simulated ? 500 : 0;
  }

  // ---------- serangan dari dalam ruang perang ----------
  // Aturan & angka SAMA PERSIS dengan attack() di politics.js (duplikasi
  // kecil: politics.js tidak dimuat di halaman ini dan attack()-nya privat
  // di IIFE, jadi tidak bisa dipanggil langsung). Jangan ubah angka di
  // sini tanpa mengubah yang di politics.js juga — keduanya harus identik.
  function breakShields(shields, damage) {
    shields = shields || 0;
    if (shields <= 0) return { broken: 0, remaining: 0, overflow: damage };
    var units = Math.ceil(damage / 15);
    var perUnit = 1 + Math.floor(Math.random() * 3);
    if (shields >= units) {
      var broken = Math.min(shields, units * perUnit);
      return { broken: broken, remaining: shields - broken, overflow: 0 };
    }
    return { broken: shields, remaining: 0, overflow: Math.max(0, damage - shields * 15) };
  }
  function senjataOverflowText(dmg) {
    var owned = (Game.getPlayer().inventory || {})["Senjata"] || 0;
    var lost = Math.min(owned, Math.floor(dmg));
    if (lost > 0) Game.removeItem("Senjata", lost);
    return lost > 0
      ? WD.fmt(lost) + " senjatamu hancur (perisai habis)."
      : "tidak ada senjata yang bisa dihancurkan.";
  }
  function counterAttack(counterDmg) {
    var country = WD.myCountry();
    if (!country) return { text: senjataOverflowText(counterDmg), broken: 0 };
    var all = WD.load("wdDefense", {});
    var d = all[country.id] || { soldiers: 0, level: 1, shields: 0, shieldCooldownUntil: 0 };
    var res = breakShields(d.shields || 0, counterDmg);
    d.shields = res.remaining;
    all[country.id] = d; WD.save("wdDefense", all);
    var msg = res.broken > 0
      ? WD.fmt(res.broken) + " perisaimu hancur (sisa: " + WD.fmt(res.remaining) + ")."
      : "tidak ada perisai untuk dihancurkan.";
    if (res.overflow > 0) msg += " Sisa damage " + WD.fmt(res.overflow) + ": " + senjataOverflowText(res.overflow);
    return { text: msg, broken: res.broken };
  }

  // Tombol SERANG: serangan yang sama persis dengan attack() di politics.js
  // (10 energi, damage 5 + strength×2 + 0–5, ×1.025 kalau pakai Armor ≥1,
  // perisai pecah ikut breakShields, balasan musuh 5–10 damage, damageLog +
  // enemyDamage ikut tercatat). Skor/bar/log ter-update langsung tanpa reload.
  function roomAttack() {
    if (!war || war.status !== "active") return;
    var wars = WD.load("wdWars", []);
    var w = wars.find(function (x) { return x.id === war.id; });
    if (!w || w.status !== "active") return;
    if (!Game.useEnergy(10)) { WD.toast("Energi tidak mencukupi (butuh 10 energi untuk menyerang)."); return; }
    var p = Game.getPlayer();
    if (w.simulated) { if (typeof w.enemyShields !== "number") w.enemyShields = 500; if (typeof w.enemyShieldsMax !== "number") w.enemyShieldsMax = 500; }
    if (!Array.isArray(w.damageLog)) w.damageLog = [];
    if (typeof w.enemyDamage !== "number") w.enemyDamage = 0;
    var hasArmor = ((p.inventory || {})["Armor"] || 0) >= 1;
    var damage = 5 + (p.stats.strength || 1) * 2 + Math.floor(Math.random() * 6);
    if (hasArmor) damage = damage * 1.025;
    Game.recordActivity("warAttacks", 1);
    Game.recordActivity("warDamage", damage);
    var res = breakShields(w.enemyShields || 0, damage);
    w.enemyShields = res.remaining;
    w.enemyStrength -= res.overflow;
    w.myDamage = (w.myDamage || 0) + damage;
    w.damageLog.push({ time: Date.now(), by: me(), side: "atk", damage: Math.round(damage * 100) / 100, shieldsBroken: res.broken });
    var dmgShown = WD.fmt(Math.round(damage * 100) / 100);
    var text = "Seranganmu menimbulkan " + dmgShown + " damage" + (hasArmor ? " (termasuk bonus Armor +2,5%)" : "") + ".";
    if (res.broken > 0) text += " Perisai musuh hancur: " + WD.fmt(res.broken) + " (sisa: " + WD.fmt(res.remaining) + ").";
    if (w.enemyStrength <= 0) {
      w.status = "won"; w.wonAt = Date.now(); w.enemyStrength = 0;
      text += " Kekuatan " + w.enemyName + " habis — kamu MEMENANGKAN perang ini!";
      WD.newsAdd("Perang dimenangkan melawan " + w.enemyName, me() + " memenangkan perang melawan " + w.enemyName + " dengan total damage " + WD.fmt(w.myDamage) + "." + (w.simulated ? " (simulasi latihan)" : ""), "Perang");
    } else {
      text += " Kekuatan " + w.enemyName + " tersisa: " + WD.fmt(Math.max(0, w.enemyStrength)) + ".";
      var counterDmg = 5 + Math.floor(Math.random() * 6);
      w.enemyDamage = (w.enemyDamage || 0) + counterDmg;
      var ca = counterAttack(counterDmg);
      w.damageLog.push({ time: Date.now(), by: w.enemyName, side: "def", damage: counterDmg, shieldsBroken: ca.broken });
      text += " Serangan balasan musuh: " + counterDmg + " damage — " + ca.text;
    }
    WD.save("wdWars", wars);
    war = w;
    var rEl = document.getElementById("wr-attack-result");
    if (rEl) rEl.textContent = text;
    WD.toast("Serangan selesai — " + dmgShown + " damage.");
    render();
  }

  // Tombol SERANG nonaktif kalau perang tidak aktif atau energi < 10.
  function updateAttackBtn() {
    var btn = document.getElementById("wr-attack-btn"); if (!btn || !war) return;
    var energy = 0;
    try { energy = Math.floor(Game.getPlayer().energy || 0); } catch (e) { energy = 0; }
    btn.disabled = war.status !== "active" || energy < 10;
    btn.textContent = war.status !== "active" ? "⚔️ SERANG" : (energy < 10 ? "⚔️ SERANG (energi " + energy + "/10)" : "⚔️ SERANG");
  }

  function fmtPct(p) { return (Math.round(p * 10) / 10).toLocaleString("id-ID") + "%"; }
  function fmtHMS(ms) {
    ms = Math.max(0, ms || 0);
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(h) + ":" + p(m) + ":" + p(sec);
  }
  function statusText(w) {
    if (w.status === "won") return "Dimenangkan";
    if (w.status === "peace") return "Damai";
    if (w.status === "active") return "Aktif";
    return w.status || "—";
  }
  function elapsedMs(w) {
    var end = w.status === "active" ? Date.now() : (w.endedAt || w.wonAt || Date.now());
    return Math.max(0, end - (w.declaredAt || Date.now()));
  }

  // Dua sisi pertempuran, dibangun generik dari data perang (bukan hardcode
  // "pemain = penyerang"): penyerang = yang menyatakan perang (pemain ini),
  // bertahan = musuh. Kalau suatu saat perang menyimpan attackerId, cukup
  // ubah fungsi ini — render tidak perlu disentuh.
  function buildSides(w) {
    var ownShields = 0;
    var myC = WD.myCountry();
    if (myC) { var allDef = WD.load("wdDefense", {}); var d = allDef[myC.id]; if (d) ownShields = d.shields || 0; }
    return {
      atk: { key: "atk", label: "Penyerang", name: me(), damage: w.myDamage || 0, shields: ownShields, shieldMax: SHIELD_CAP, rows: [{ name: me(), damage: w.myDamage || 0 }] },
      def: { key: "def", label: "Bertahan", name: w.enemyName, damage: w.enemyDamage || 0, shields: w.enemyShields || 0, shieldMax: shieldMaxOf(w), rows: [{ name: w.enemyName, damage: w.enemyDamage || 0 }] }
    };
  }

  // Log damage: agregasi per pemain dari war.damageLog (fase 2 yang mengisi).
  // Kalau field belum ada -> daftar kosong (pesan "belum ada damage tercatat").
  function logAgg(w) {
    var log = Array.isArray(w.damageLog) ? w.damageLog : [];
    var byName = {};
    log.forEach(function (e) {
      var k = e.by || "?";
      if (!byName[k]) byName[k] = { name: k, side: e.side || "?", total: 0, hits: 0, shieldsBroken: 0 };
      byName[k].total += Number(e.damage) || 0;
      byName[k].hits += 1;
      byName[k].shieldsBroken += Number(e.shieldsBroken) || 0;
    });
    return Object.values(byName).sort(function (a, b) { return b.total - a.total; });
  }

  function topTable(rows, sideClass) {
    if (!rows.length) return '<p class="muted">Belum ada pemain di sisi ini.</p>';
    var sorted = rows.slice().sort(function (a, b) { return (b.damage || 0) - (a.damage || 0); }).slice(0, 5);
    var html = '<table class="wr-table"><thead><tr><th>#</th><th>Pemain</th><th>Damage</th></tr></thead><tbody>';
    sorted.forEach(function (r, i) {
      html += '<tr><td>' + (i + 1) + '</td><td>' + WD.esc(r.name) + '</td><td><b class="' + sideClass + '">' + WD.fmt(r.damage || 0) + '</b></td></tr>';
    });
    return html + '</tbody></table>';
  }

  // ---------- chat ruang perang ----------
  function loadChat(id) { var all = WD.load(CHAT_KEY, {}); return all[id] || []; }
  function saveChat(id, msgs) { var all = WD.load(CHAT_KEY, {}); all[id] = msgs; WD.save(CHAT_KEY, all); }

  var war = null;

  function renderChat() {
    var box = document.getElementById("wr-chat-box"); if (!box || !war) return;
    var msgs = loadChat(war.id).slice(-50);
    box.innerHTML = msgs.length ? msgs.map(function (m) {
      return '<div class="wd-chat-msg"><b>' + WD.esc(m.name || "?") + '</b> ' + WD.esc(m.text || "") + '<small>' + WD.fmtDate(m.time || Date.now()) + '</small></div>';
    }).join("") : '<p class="muted">Belum ada pesan di ruang perang ini. Jadilah yang pertama mengirim pesan.</p>';
    box.scrollTop = box.scrollHeight;
  }

  function render() {
    if (!war) return;
    var s = buildSides(war);
    var atkDmg = s.atk.damage, defDmg = s.def.damage;
    var total = atkDmg + defDmg;
    var pctAtk = total > 0 ? (atkDmg / total) * 100 : 50;
    var pctDef = 100 - pctAtk;

    document.getElementById("wr-title").textContent = "⚔️ PERTEMPURAN " + String(war.enemyName || "?").toUpperCase();
    document.getElementById("wr-status").textContent = statusText(war);
    document.getElementById("wr-atk-name").textContent = s.atk.name;
    document.getElementById("wr-def-name").textContent = s.def.name;
    document.getElementById("wr-atk-score").textContent = WD.fmt(atkDmg);
    document.getElementById("wr-def-score").textContent = WD.fmt(defDmg);
    document.getElementById("wr-battle-fill-atk").style.width = pctAtk + "%";
    document.getElementById("wr-battle-fill-def").style.width = pctDef + "%";
    document.getElementById("wr-pct-atk").textContent = fmtPct(pctAtk);
    document.getElementById("wr-pct-def").textContent = fmtPct(pctDef);
    document.getElementById("wr-shields").innerHTML =
      shieldBarHTML("🛡️ Perisai Bertahan", s.def.shields, s.def.shieldMax, "enemy");

    document.getElementById("wr-top-atk").innerHTML = topTable(s.atk.rows, "atk");
    document.getElementById("wr-top-def").innerHTML = topTable(s.def.rows, "def");

    var endLine = war.status === "active" ? "" : "<br>Berakhir: " + WD.fmtDate(war.endedAt || war.wonAt || Date.now());
    document.getElementById("wr-info").innerHTML =
      '<div class="resource-list">' +
      '<div><span>Waktu berlangsung</span><b id="wr-elapsed">' + fmtHMS(elapsedMs(war)) + '</b></div>' +
      '<div><span>Dinyatakan</span><b>' + WD.fmtDate(war.declaredAt) + '</b></div>' +
      '<div><span>Musuh</span><b>' + WD.esc(war.enemyName) + (war.simulated ? " (NPC)" : "") + '</b></div>' +
      '<div><span>Kekuatan musuh tersisa</span><b>' + WD.fmt(Math.max(0, war.enemyStrength || 0)) + '</b></div>' +
      '<div><span>Status</span><b>' + statusText(war) + endLine + '</b></div>' +
      '</div>';
    var peaceBtn = document.getElementById("wr-peace-btn");
    peaceBtn.disabled = war.status !== "active";
    peaceBtn.textContent = war.status === "peace" ? "🕊️ Damai sudah ditawarkan" : (war.status === "won" ? "🏆 Perang sudah dimenangkan" : "🕊️ TAWARKAN DAMAI");
    updateAttackBtn();

    var totalPlayers = s.atk.rows.length + s.def.rows.length;
    document.getElementById("wr-stat-players").textContent = WD.fmt(totalPlayers);
    document.getElementById("wr-stat-dmg").textContent = WD.fmt(atkDmg);
    document.getElementById("wr-stat-dmg-def").textContent = WD.fmt(defDmg);
    document.getElementById("wr-stat-ratio").textContent = defDmg > 0 ? (Math.round((atkDmg / defDmg) * 10) / 10).toLocaleString("id-ID") + "x" : "—";
    document.getElementById("wr-stat-time").textContent = fmtHMS(elapsedMs(war));

    var agg = logAgg(war);
    document.getElementById("wr-log").innerHTML = agg.length ? agg.map(function (a) {
      return '<div class="wr-log-row"><div><b>' + WD.esc(a.name) + '</b><small>' + (a.side === "atk" ? "Penyerang" : a.side === "def" ? "Bertahan" : WD.esc(a.side)) + ' \u00B7 ' + a.hits + ' serangan \u00B7 ' + WD.fmt(a.shieldsBroken) + ' perisai dihancurkan</small></div><b class="dmg' + (a.side === "def" ? " def" : "") + '">' + WD.fmt(a.total) + '</b></div>';
    }).join("") : '<p class="muted">Belum ada damage tercatat.</p>';

    renderChat();
  }

  function offerPeace() {
    if (!war || war.status !== "active") return;
    var wars = WD.load("wdWars", []);
    var w = wars.find(function (x) { return x.id === war.id; });
    if (!w) return;
    w.status = "peace"; w.endedAt = Date.now();
    WD.save("wdWars", wars);
    war = w;
    WD.newsAdd("Perdamaian dengan " + w.enemyName, me() + " menawarkan damai dan perang melawan " + w.enemyName + " berakhir.", "Perang");
    WD.toast("Damai ditawarkan — perang melawan " + w.enemyName + " berakhir.");
    render();
  }

  function sendChat() {
    if (!war) return;
    var input = document.getElementById("wr-chat-input");
    var text = input.value.trim();
    if (!text) return;
    var msgs = loadChat(war.id);
    msgs.push({ name: me(), text: text.slice(0, 300), time: Date.now() });
    saveChat(war.id, msgs);
    input.value = "";
    renderChat();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var id = new URLSearchParams(location.search).get("id");
    var wars = WD.load("wdWars", []);
    war = wars.find(function (w) { return w.id === id; }) || null;
    if (!war) {
      document.getElementById("wr-notfound").hidden = false;
      return;
    }
    document.getElementById("wr-content").hidden = false;
    document.title = "PERTEMPURAN " + String(war.enemyName || "?").toUpperCase() + " — World Dominion V.I";
    document.getElementById("wr-peace-btn").addEventListener("click", offerPeace);
    document.getElementById("wr-attack-btn").addEventListener("click", roomAttack);
    document.getElementById("wr-chat-send").addEventListener("click", sendChat);
    document.getElementById("wr-chat-input").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); sendChat(); }
    });
    render();
    // Waktu berlangsung jalan tiap detik (hanya teks jam — tidak render ulang
    // seluruh halaman supaya fokus input chat tidak hilang).
    setInterval(function () {
      if (!war) return;
      var el = document.getElementById("wr-elapsed"); if (el) el.textContent = fmtHMS(elapsedMs(war));
      var st = document.getElementById("wr-stat-time"); if (st) st.textContent = fmtHMS(elapsedMs(war));
      updateAttackBtn();
    }, 1000);
    // Chat ikut diperbarui berkala (pesan dari tab lain di perangkat ini).
    setInterval(renderChat, 5000);
  });
})();
