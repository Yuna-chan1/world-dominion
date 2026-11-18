/* WORLD DOMINION V.I — POLITICS & WAR (Build 0.9 fix)
   parties / parliament / elections / organizations / defense / war / war-history
   Store lokal terpisah: wdParties, wdLaws, wdCandidates, wdOrgs, wdDefense, wdWars.
   Semua aksi nyata dicatat ke Game.recordActivity() sesuai API core.js.
*/
(function () {
  "use strict";
  const me = () => Game.getPlayer().username;

  // ---------- parties.html ----------
  function initParties() {
    const listEl = document.getElementById("parties-list"); if (!listEl) return;
    const KEY = "wdParties";
    const load = () => WD.load(KEY, []);
    const save = v => WD.save(KEY, v);
    const myParty = () => load().find(p => (p.members || []).includes(me())) || null;

    function render() {
      const parties = load();
      const stat = document.getElementById("stat-parties"); if (stat) stat.textContent = parties.length + " partai";
      const mine = myParty();
      const mineEl = document.getElementById("my-party");
      if (mineEl) mineEl.innerHTML = mine
        ? '<div class="wd-row"><div><b>' + WD.esc(mine.name) + '</b><small>Pendiri: ' + WD.esc(mine.founder) + ' \u00B7 Anggota: ' + (mine.members || []).length + '</small></div><button class="subtle-button" type="button" data-leave-party="' + mine.id + '">Keluar partai</button></div>'
        : '<p class="muted">Kamu belum bergabung dengan partai apa pun. Kamu hanya bisa menjadi anggota satu partai dalam satu waktu.</p>';
      listEl.innerHTML = parties.length ? parties.map(p => {
        const inThis = (p.members || []).includes(me());
        return '<div class="wd-row"><div><b>' + WD.esc(p.name) + '</b><small>Pendiri: ' + WD.esc(p.founder) + ' \u00B7 Anggota (' + (p.members || []).length + '): ' + WD.esc((p.members || []).join(", ")) + '<br>Didirikan ' + WD.fmtDate(p.createdAt) + '</small></div>' +
          (inThis ? '<span class="wd-tag">Anggota</span>' : '<button class="subtle-button" type="button" data-join-party="' + p.id + '">Gabung</button>') + '</div>';
      }).join("") : '<p class="muted">Belum ada partai. Dirikan partai pertama di atas.</p>';
      WD.$$("[data-join-party]", listEl).forEach(b => b.addEventListener("click", () => {
        if (myParty()) { WD.toast("Kamu sudah bergabung dengan partai " + myParty().name + ". Keluar dulu sebelum gabung partai lain."); return; }
        const items = load(); const p = items.find(x => x.id === b.getAttribute("data-join-party")); if (!p) return;
        p.members = p.members || []; p.members.push(me()); save(items); WD.toast("Kamu bergabung dengan partai " + p.name + "."); render();
      }));
      WD.$$("[data-leave-party]").forEach(b => b.addEventListener("click", () => {
        const items = load(); const p = items.find(x => x.id === b.getAttribute("data-leave-party")); if (!p) return;
        p.members = (p.members || []).filter(m => m !== me()); save(items); WD.toast("Kamu keluar dari partai " + p.name + "."); render();
      }));
      renderPartyChat();
    }

    function renderPartyChat() {
      const box = document.getElementById("party-chat"); if (!box) return;
      let msgs = [];
      try { msgs = Game.getChatMessages("Partai") || []; } catch (e) { msgs = []; }
      box.innerHTML = msgs.length ? msgs.slice(-30).map(m =>
        '<div class="wd-chat-msg"><b>' + WD.esc(m.user || m.username || "?") + '</b> ' + WD.esc(m.text || m.message || "") + '<small>' + WD.fmtDate(m.at || m.time || Date.now()) + '</small></div>'
      ).join("") : '<p class="muted">Belum ada pesan di kanal Partai.</p>';
    }

    document.getElementById("party-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const name = document.getElementById("party-name").value.trim();
      if (name.length < 3) { WD.toast("Nama partai minimal 3 karakter."); return; }
      const items = load();
      if (items.some(p => p.name.toLowerCase() === name.toLowerCase())) { WD.toast("Nama partai sudah dipakai."); return; }
      items.push({ id: WD.uid("party"), name: name.slice(0, 40), founder: me(), members: [me()], createdAt: Date.now() });
      save(items); ev.target.reset(); render();
      WD.toast("Partai " + name + " didirikan.");
      WD.newsAdd("Partai baru didirikan: " + name, me() + " mendirikan partai politik " + name + ".", "Politik");
    });
    const sendBtn = document.getElementById("party-chat-send");
    if (sendBtn) sendBtn.addEventListener("click", () => {
      const input = document.getElementById("party-chat-input");
      const text = input.value.trim(); if (!text) return;
      if (Game.postChatMessage("Partai", text)) { input.value = ""; renderPartyChat(); }
    });
    render();
  }

  // ---------- parliament.html ----------
  function initParliament() {
    const listEl = document.getElementById("laws-list"); if (!listEl) return;
    const KEY = "wdLaws";
    const TYPES = ["Pajak Penghasilan", "Pajak Produksi", "Pajak Impor", "Pajak Ekspor", "Status Perbatasan", "Pajak Perang"];
    const load = () => WD.load(KEY, []);
    const save = v => WD.save(KEY, v);

    function counts(law) {
      const vs = Object.values(law.votes || {});
      return { ya: vs.filter(v => v === "ya").length, tidak: vs.filter(v => v === "tidak").length };
    }
    function checkPass(law) {
      if (law.passed) return;
      const c = counts(law);
      if (c.ya > c.tidak && (c.ya + c.tidak) >= 1) {
        law.passed = true;
        if (!law.counted) { law.counted = true; Game.recordActivity("lawsRatified", 1); }
        WD.newsAdd("UU disahkan: " + law.type, "Parlemen mengesahkan " + law.type + " (" + law.value + ") dengan " + c.ya + " suara Ya lawan " + c.tidak + " Tidak.", "Parlemen");
      }
    }
    function render() {
      const laws = load();
      const passed = laws.filter(l => l.passed);
      const stat = document.getElementById("stat-laws"); if (stat) stat.textContent = passed.length + " disahkan";
      const passedEl = document.getElementById("passed-laws");
      if (passedEl) passedEl.innerHTML = passed.length
        ? passed.map(l => '<div class="wd-row"><div><b>' + WD.esc(l.type) + '</b><small>' + WD.esc(l.value) + ' \u00B7 Diusulkan ' + WD.esc(l.proposer) + ' \u00B7 Disahkan ' + WD.fmtDate(l.passedAt || l.createdAt) + '</small></div><span class="wd-tag">Disahkan</span></div>').join("")
        : '<p class="muted">Belum ada UU yang disahkan.</p>';
      const open = laws.filter(l => !l.passed);
      listEl.innerHTML = open.length ? open.map(l => {
        const c = counts(l); const myVote = (l.votes || {})[me()];
        return '<div class="wd-row"><div><b>' + WD.esc(l.type) + '</b><small>' + WD.esc(l.value) + ' \u00B7 Diusulkan ' + WD.esc(l.proposer) + ' \u00B7 ' + WD.fmtDate(l.createdAt) + '<br>Suara: Ya ' + c.ya + ' \u00B7 Tidak ' + c.tidak + (myVote ? ' \u00B7 Suaramu: ' + (myVote === "ya" ? "Ya" : "Tidak") : "") + '</small></div><div class="wd-actions"><button class="subtle-button" type="button" data-vote-ya="' + l.id + '">Ya</button><button class="subtle-button" type="button" data-vote-tidak="' + l.id + '">Tidak</button></div></div>';
      }).join("") : '<p class="muted">Belum ada usulan UU yang sedang dibahas.</p>';
      WD.$$("[data-vote-ya]", listEl).forEach(b => b.addEventListener("click", () => castVote(b.getAttribute("data-vote-ya"), "ya")));
      WD.$$("[data-vote-tidak]", listEl).forEach(b => b.addEventListener("click", () => castVote(b.getAttribute("data-vote-tidak"), "tidak")));
    }
    function castVote(id, choice) {
      const items = load(); const law = items.find(l => l.id === id); if (!law) return;
      law.votes = law.votes || {}; law.votes[me()] = choice;
      checkPass(law); if (law.passed) law.passedAt = Date.now();
      save(items); render();
      WD.toast(law.passed ? "UU " + law.type + " disahkan!" : "Suaramu tercatat: " + (choice === "ya" ? "Ya" : "Tidak") + ".");
    }
    document.getElementById("law-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const type = document.getElementById("law-type").value;
      const value = document.getElementById("law-value").value.trim();
      if (!TYPES.includes(type)) { WD.toast("Pilih jenis UU yang valid."); return; }
      if (!value) { WD.toast("Isi nilai atau pilihan UU (mis. 10%)."); return; }
      const items = load();
      items.push({ id: WD.uid("law"), type, value: value.slice(0, 80), proposer: me(), createdAt: Date.now(), votes: {}, passed: false, counted: false });
      save(items); ev.target.reset(); render(); WD.toast("Usulan UU diajukan ke parlemen.");
    });
    render();
  }

  // ---------- elections.html ----------
  function initElections() {
    const listEl = document.getElementById("candidates-list"); if (!listEl) return;
    const KEY = "wdCandidates";
    const load = () => WD.load(KEY, []);
    const save = v => WD.save(KEY, v);
    const eligible = () => {
      if (WD.myCountry()) return true;
      return (WD.load("wdParties", []) || []).some(p => p.founder === me());
    };
    function render() {
      const cands = load();
      const stat = document.getElementById("stat-candidates"); if (stat) stat.textContent = cands.length + " kandidat";
      const votedFor = cands.find(c => (c.votes || []).includes(me()));
      const eligEl = document.getElementById("election-eligibility");
      if (eligEl) eligEl.innerHTML = eligible()
        ? "Kamu memenuhi syarat mendaftar sebagai kandidat (pendiri negara atau pemimpin partai)."
        : "Kamu belum memenuhi syarat: hanya pendiri negara atau pemimpin partai yang bisa mendaftar sebagai kandidat.";
      document.getElementById("register-candidate-btn").disabled = !eligible() || cands.some(c => c.name === me());
      listEl.innerHTML = cands.length ? cands.map(c => {
        const tally = (c.votes || []).length;
        return '<div class="wd-row"><div><b>' + WD.esc(c.name) + '</b><small>' + (c.party ? "Partai: " + WD.esc(c.party) + " \u00B7 " : "") + (c.country ? "Negara: " + WD.esc(c.country) + " \u00B7 " : "") + 'Didaftarkan ' + WD.fmtDate(c.createdAt) + '</small></div><div class="wd-actions"><b>' + tally + ' suara</b>' + (votedFor && votedFor.id === c.id ? '<span class="wd-tag">Pilihanmu</span>' : '<button class="subtle-button" type="button" data-vote-cand="' + c.id + '"' + (votedFor ? " disabled" : "") + '>Pilih</button>') + '</div></div>';
      }).join("") : '<p class="muted">Belum ada kandidat. Daftarkan dirimu di atas jika memenuhi syarat.</p>';
      WD.$$("[data-vote-cand]", listEl).forEach(b => b.addEventListener("click", () => {
        const items = load();
        if (items.some(c => (c.votes || []).includes(me()))) { WD.toast("Kamu sudah memilih satu kandidat."); return; }
        const c = items.find(x => x.id === b.getAttribute("data-vote-cand")); if (!c) return;
        c.votes = c.votes || []; c.votes.push(me()); save(items); render();
        WD.toast("Kamu memilih " + c.name + ".");
      }));
    }
    document.getElementById("register-candidate-btn").addEventListener("click", () => {
      if (!eligible()) { WD.toast("Kamu belum memenuhi syarat menjadi kandidat."); return; }
      const items = load();
      if (items.some(c => c.name === me())) { WD.toast("Kamu sudah terdaftar sebagai kandidat."); return; }
      const party = (document.getElementById("cand-party").value || "").trim();
      const country = WD.myCountry();
      items.push({ id: WD.uid("cand"), name: me(), party: party.slice(0, 40), country: country ? country.name : "", createdAt: Date.now(), votes: [] });
      save(items); render(); WD.toast("Kamu terdaftar sebagai kandidat pemilu.");
      WD.newsAdd("Kandidat baru mendaftar pemilu: " + me(), me() + " mendaftar sebagai kandidat pemilu" + (country ? " dari negara " + country.name : "") + ".", "Pemilu");
    });
    render();
  }

  // ---------- organizations.html ----------
  function initOrgs() {
    const listEl = document.getElementById("orgs-list"); if (!listEl) return;
    const KEY = "wdOrgs";
    const TYPES = ["Serikat Dagang", "Serikat Pekerja", "Lembaga Pendidikan", "Lembaga Amal", "Klub Olahraga", "Lainnya"];
    const load = () => WD.load(KEY, []);
    const save = v => WD.save(KEY, v);
    function render() {
      const orgs = load();
      const stat = document.getElementById("stat-orgs"); if (stat) stat.textContent = orgs.length + " organisasi";
      const mine = orgs.filter(o => (o.members || []).includes(me()));
      const mineEl = document.getElementById("my-orgs");
      if (mineEl) mineEl.innerHTML = mine.length
        ? mine.map(o => '<div class="wd-row"><div><b>' + WD.esc(o.name) + '</b><small>' + WD.esc(o.type) + ' \u00B7 Anggota: ' + (o.members || []).length + '</small></div><button class="subtle-button" type="button" data-leave-org="' + o.id + '">Keluar</button></div>').join("")
        : '<p class="muted">Kamu belum bergabung dengan organisasi apa pun.</p>';
      listEl.innerHTML = orgs.length ? orgs.map(o => {
        const joined = (o.members || []).includes(me());
        return '<div class="wd-row"><div><b>' + WD.esc(o.name) + '</b><small>' + WD.esc(o.type) + ' \u00B7 Pendiri: ' + WD.esc(o.founder) + ' \u00B7 Anggota: ' + (o.members || []).length + '<br>' + WD.esc(o.description || "") + '</small></div>' +
          (joined ? '<span class="wd-tag">Anggota</span>' : '<button class="subtle-button" type="button" data-join-org="' + o.id + '">Gabung</button>') + '</div>';
      }).join("") : '<p class="muted">Belum ada organisasi. Dirikan organisasi pertama di atas.</p>';
      WD.$$("[data-join-org]", listEl).forEach(b => b.addEventListener("click", () => {
        const items = load(); const o = items.find(x => x.id === b.getAttribute("data-join-org")); if (!o) return;
        o.members = o.members || []; if (!o.members.includes(me())) o.members.push(me());
        save(items); render(); WD.toast("Kamu bergabung dengan " + o.name + ".");
      }));
      WD.$$("[data-leave-org]").forEach(b => b.addEventListener("click", () => {
        const items = load(); const o = items.find(x => x.id === b.getAttribute("data-leave-org")); if (!o) return;
        o.members = (o.members || []).filter(m => m !== me()); save(items); render(); WD.toast("Kamu keluar dari " + o.name + ".");
      }));
    }
    document.getElementById("org-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const name = document.getElementById("org-name").value.trim();
      const type = document.getElementById("org-type").value;
      const desc = document.getElementById("org-desc").value.trim();
      if (name.length < 3) { WD.toast("Nama organisasi minimal 3 karakter."); return; }
      if (!TYPES.includes(type)) { WD.toast("Pilih jenis organisasi yang valid."); return; }
      const items = load();
      if (items.some(o => o.name.toLowerCase() === name.toLowerCase())) { WD.toast("Nama organisasi sudah dipakai."); return; }
      items.push({ id: WD.uid("org"), name: name.slice(0, 40), type, description: desc.slice(0, 300), founder: me(), members: [me()], createdAt: Date.now() });
      save(items); ev.target.reset(); render(); WD.toast("Organisasi " + name + " didirikan.");
    });
    render();
  }

  // ---------- defense.html ----------
  // Sistem donasi perisai (kajian 18 Nov 2026): pool maks 1.000 per negara,
  // CD 1 jam kalau donasi membuat pool mencapai penuh. Rekrut tentara &
  // latih pasukan dihapus; soldiers/level dipertahankan di store hanya
  // untuk kompatibilitas (tampilan saja).
  const SHIELD_CAP = 1000;
  const SHIELD_CD_MS = 3600 * 1000;
  // Bar perisai visual (war.html + defense.html): satu helper untuk semua bar.
  // cur/max angka mentah; fillClass "own" (emas, perisai sendiri) atau
  // "enemy" (biru, perisai musuh). max 0 (musuh negara pemain, tidak ada
  // data perisai) -> bar kosong + angka "—".
  function shieldBarHTML(label, cur, max, fillClass) {
    cur = Math.max(0, cur || 0); max = Math.max(0, max || 0);
    const pct = max > 0 ? Math.round(Math.min(100, Math.max(0, (cur / max) * 100)) * 10) / 10 : 0;
    const num = max > 0 ? WD.fmt(cur) + " / " + WD.fmt(max) : "—";
    return '<div class="shield-bars"><div><div class="shield-bar-head"><span>' + label + '</span><b class="' + fillClass + '">' + num + '</b></div>' +
      '<div class="shield-bar" role="progressbar" aria-valuenow="' + cur + '" aria-valuemax="' + max + '"><div class="shield-bar-fill ' + fillClass + '" style="width:' + pct + '%"></div></div></div></div>';
  }
  // Maks perisai musuh per perang: disimpan di objek perang (wdWars) saat
  // declareWar; perang SIM-RIVAL lama yang belum punya field-nya -> 500.
  function shieldMaxOf(w) {
    if (typeof w.enemyShieldsMax === "number") return w.enemyShieldsMax;
    return w.simulated ? 500 : 0;
  }
  function initDefense() {
    const infoEl = document.getElementById("defense-info"); if (!infoEl) return;
    const KEY = "wdDefense";
    const load = () => WD.load(KEY, {});
    const save = v => WD.save(KEY, v);
    const country = WD.myCountry();
    const donateBtn = document.getElementById("donate-btn");
    const donateAllBtn = document.getElementById("donate-all-btn");
    const amountInput = document.getElementById("donate-amount");
    const cdEl = document.getElementById("donate-cd");
    const resultEl = document.getElementById("defense-result");
    function defOf() {
      const all = load();
      if (!all[country.id]) { all[country.id] = { soldiers: 0, level: 1, shields: 0, shieldCooldownUntil: 0 }; save(all); }
      const d = all[country.id];
      if (typeof d.shields !== "number") d.shields = 0;
      if (typeof d.shieldCooldownUntil !== "number") d.shieldCooldownUntil = 0;
      return d;
    }
    function regionNames(ids) {
      const data = window.WorldLib ? window.WorldLib.worldData() : null;
      if (!data || !Array.isArray(data.provinces)) return (ids || []).join(", ");
      const byId = Object.fromEntries(data.provinces.map(r => [r.id, r.name]));
      return (ids || []).map(id => byId[id] || id).join(", ");
    }
    function cdLeftMs() {
      if (!country) return 0;
      return Math.max(0, (defOf().shieldCooldownUntil || 0) - Date.now());
    }
    function cdText() {
      const ms = cdLeftMs();
      if (ms <= 0) return "";
      const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
      return "Cooldown donasi: " + m + " menit " + s + " detik lagi.";
    }
    function render() {
      const stat = document.getElementById("stat-shields");
      if (!country) {
        infoEl.innerHTML = '<p class="muted">Kamu belum mendirikan negara, jadi belum ada pertahanan untuk dikelola. Cara mendirikan negara: jadilah penduduk suatu wilayah (kewarganegaraan) di Peta Dunia, lalu dirikan negara dengan 100 Gold.</p>' +
          shieldBarHTML('🛡️ Pool Perisai Negara', 0, SHIELD_CAP, 'own');
        donateBtn.disabled = true; donateAllBtn.disabled = true; amountInput.disabled = true;
        if (stat) stat.textContent = "0 / 1.000";
        if (cdEl) cdEl.textContent = "";
        return;
      }
      const d = defOf();
      const owned = (Game.getPlayer().inventory || {})["Perisai"] || 0;
      infoEl.innerHTML =
        '<div class="resource-list">' +
        '<div><span>Negara</span><b>' + WD.esc(country.name) + '</b></div>' +
        '<div><span>Pendirian</span><b>' + WD.esc(country.founder || "?") + '</b></div>' +
        '<div><span>Wilayah</span><b>' + WD.esc(regionNames(country.regionIds)) + '</b></div>' +
        '<div><span>Perisai Negara</span><b>' + WD.fmt(d.shields) + ' / ' + WD.fmt(SHIELD_CAP) + '</b></div>' +
        '<div><span>Perisai Kamu</span><b>' + WD.fmt(owned) + '</b></div>' +
        '<div><span>Status donasi</span><b>' + (cdLeftMs() > 0 ? "Cooldown" : "Terbuka") + '</b></div>' +
        '<div><span>Tentara (lama)</span><b>' + WD.fmt(d.soldiers) + '</b></div>' +
        '<div><span>Level pertahanan (lama)</span><b>' + d.level + '</b></div>' +
        '<div><span>Gold / Energi</span><b>' + WD.fmt(Game.getPlayer().gold) + ' Gold \u00B7 ' + Math.floor(Game.getPlayer().energy) + ' energi</b></div>' +
        '</div>' +
        shieldBarHTML('🛡️ Pool Perisai Negara', d.shields, SHIELD_CAP, 'own');
      if (stat) stat.textContent = WD.fmt(d.shields) + " / " + WD.fmt(SHIELD_CAP);
      const onCd = cdLeftMs() > 0;
      if (cdEl) cdEl.textContent = onCd ? "\u23F3 " + cdText() + " Donasi dibuka lagi setelah cooldown selesai." : "";
      donateBtn.disabled = onCd; donateAllBtn.disabled = onCd; amountInput.disabled = onCd;
    }
    function donate(requested) {
      if (!country) return;
      if (cdLeftMs() > 0) { WD.toast(cdText()); resultEl.textContent = cdText() + " Donasi dibuka lagi setelah cooldown selesai."; return; }
      const owned = (Game.getPlayer().inventory || {})["Perisai"] || 0;
      if (owned <= 0) { WD.toast("Kamu tidak punya Perisai di inventaris."); resultEl.textContent = "Kamu tidak punya Perisai di inventaris."; return; }
      const all = load(); const d = defOf();
      const space = SHIELD_CAP - (d.shields || 0);
      if (space <= 0) { WD.toast("Pool perisai negara sudah penuh (1.000)."); resultEl.textContent = "Pool perisai negara sudah penuh (1.000)."; return; }
      const amount = Math.floor(Number(requested));
      if (!Number.isFinite(amount) || amount <= 0) { WD.toast("Masukkan jumlah perisai yang valid."); return; }
      const actual = Math.min(amount, owned, space);
      if (actual <= 0) { WD.toast("Tidak ada perisai yang bisa disumbangkan."); return; }
      if (!Game.removeItem("Perisai", actual)) { WD.toast("Gagal mengambil Perisai dari inventaris."); return; }
      d.shields = (d.shields || 0) + actual;
      let msg = "Kamu menyumbangkan " + WD.fmt(actual) + " Perisai. Perisai Negara: " + WD.fmt(d.shields) + " / " + WD.fmt(SHIELD_CAP) + ".";
      if (actual < amount) msg += " (Hanya " + WD.fmt(actual) + " yang masuk \u2014 dibatasi stok kamu / sisa kapasitas pool.)";
      if (d.shields >= SHIELD_CAP) { d.shieldCooldownUntil = Date.now() + SHIELD_CD_MS; msg += " Pool penuh \u2014 cooldown donasi 1 jam dimulai."; }
      all[country.id] = d; save(all);
      resultEl.textContent = msg;
      render();
    }
    donateBtn.addEventListener("click", () => donate(amountInput.value));
    donateAllBtn.addEventListener("click", () => donate((Game.getPlayer().inventory || {})["Perisai"] || 0));
    render();
    setInterval(render, 5000);
  }

  // ---------- war.html ----------
  function initWar() {
    const listEl = document.getElementById("wars-list"); if (!listEl) return;
    const KEY = "wdWars";
    const load = () => WD.load(KEY, []);
    const save = v => WD.save(KEY, v);
    const resultEl = document.getElementById("war-result");

    // Teks durasi berlangsung sejak perang dinyatakan (data nyata dari
    // declaredAt — game ini tidak punya durasi/sisa waktu perang, jadi
    // tidak ada countdown palsu; perang aktif cukup diberi badge LANGSUNG).
    function elapsedText(ms) {
      ms = Math.max(0, ms || 0);
      const mins = Math.floor(ms / 60000);
      if (mins < 1) return "Baru saja";
      const h = Math.floor(mins / 60), m = mins % 60;
      return h > 0 ? h + "j " + m + " mnt" : m + " mnt";
    }

    function render() {
      const wars = load();
      const active = wars.filter(w => w.status === "active");
      const stat = document.getElementById("stat-wars"); if (stat) stat.textContent = active.length + " aktif";
      // Daftar musuh: negara pemain lain
      let countries = [];
      try { countries = Object.values(Game.getCountries() || {}).filter(c => c.founder !== me()); } catch (e) { countries = []; }
      const enemiesEl = document.getElementById("enemies-list");
      if (enemiesEl) {
        const atWarWith = new Set(active.filter(w => !w.simulated).map(w => w.enemyId));
        enemiesEl.innerHTML = countries.length ? countries.map(c =>
          '<div class="wd-row"><div><b>' + WD.esc(c.name) + '</b><small>Pendirian oleh ' + WD.esc(c.founder || "?") + ' \u00B7 ' + (c.regionIds || []).length + ' wilayah</small></div>' +
          (atWarWith.has(c.id) ? '<span class="wd-tag">Sedang berperang</span>' : '<button class="subtle-button" type="button" data-declare-war="' + c.id + '">Nyatakan perang</button>') + '</div>'
        ).join("") : '<p class="muted">Belum ada negara lain yang didirikan pemain. Perang membutuhkan negara lawan yang didirikan pemain lain \u2014 atau gunakan musuh simulasi di bawah.</p>';
        WD.$$("[data-declare-war]", enemiesEl).forEach(b => b.addEventListener("click", () => declareWar(b.getAttribute("data-declare-war"), false)));
      }
      const simBtn = document.getElementById("sim-rival-btn");
      if (simBtn) {
        simBtn.disabled = active.some(w => w.simulated);
        simBtn.onclick = () => declareWar("SIM-RIVAL", true);
      }
      // Statistik atas (semua dari data nyata): front = perang aktif;
      // petempur = pemain + musuh di tiap perang aktif; serangan mendarat
      // = total serangan pemain sepanjang masa (aktivitas warAttacks);
      // total kerusakan = damage kedua sisi di semua perang yang tercatat.
      const acts = (Game.getPlayer().activities || {});
      const totalAttacks = Number(acts.warAttacks) || 0;
      const totalDamage = wars.reduce((n, x) => n + (Number(x.myDamage) || 0) + (Number(x.enemyDamage) || 0), 0);
      const statsHTML = '<div class="activity-grid" style="margin-bottom:12px">' +
        '<div class="activity-tile"><span>⚔️ Garis Depan Terbuka</span><b>' + WD.fmt(active.length) + '</b></div>' +
        '<div class="activity-tile"><span>👥 Petempur yang Terlibat</span><b>' + WD.fmt(active.length * 2) + '</b></div>' +
        '<div class="activity-tile"><span>🎯 Serangan yang Mendarat</span><b>' + WD.fmt(totalAttacks) + '</b></div>' +
        '<div class="activity-tile"><span>💥 Total Kerusakan</span><b>' + WD.fmt(Math.round(totalDamage * 100) / 100) + '</b></div>' +
        '</div>';
      listEl.innerHTML = statsHTML + (active.length ? active.map(w => {
        // Pool perisai sendiri (wdDefense) — render() dipanggil ulang setiap
        // serangan, jadi kedua bar ikut berubah setelah serang/balasan.
        let ownShields = 0;
        const myC = WD.myCountry();
        if (myC) { const allDef = WD.load("wdDefense", {}); const d0 = allDef[myC.id]; if (d0) ownShields = d0.shields || 0; }
        const myDmg = w.myDamage || 0, enDmg = w.enemyDamage || 0;
        const total = myDmg + enDmg;
        const pctAtk = total > 0 ? Math.round((myDmg / total) * 1000) / 10 : 50;
        const pctDef = Math.round((100 - pctAtk) * 10) / 10;
        const atkHits = Array.isArray(w.damageLog) ? w.damageLog.filter(e => e.side === "atk").length : 0;
        // Aturan lokasi (18 Nov 2026): tampilkan front + petunjuk kalau pemain
        // sedang tidak di front — biar jelas kenapa Serang ditolak.
        const loc = warLocationCheck(w);
        const locLine = w.simulated
          ? '<p class="muted" style="margin-top:8px">📍 Lokasi: Latihan (simulasi) — bisa diserang dari mana saja.</p>'
          : '<p class="muted" style="margin-top:8px">📍 Lokasi: ' + WD.esc(loc.atkName) + ' vs ' + WD.esc(loc.defName) + '</p>' +
            (loc.ok ? '' : '<p class="muted" style="margin-top:4px">Kamu sedang di ' + WD.esc(loc.curName) + ' — terbang ke ' + WD.esc(loc.atkName) + ' atau ' + WD.esc(loc.defName) + ' untuk menyerang.</p>');
        return '<div class="card" style="margin-bottom:12px"><div class="domain-section-title"><h2 style="margin:0">⚔️ PERANG MEMPEREBUTKAN ' + WD.esc(String(w.enemyName || "?").toUpperCase()) + '</h2><span style="background:#b91c1c;color:#fff;border-radius:20px;padding:3px 10px;font-size:10px;font-weight:bold;white-space:nowrap">● LANGSUNG</span></div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px"><div><b style="color:var(--gold)">' + WD.esc(me()) + '</b><br><b style="font-size:17px;color:var(--gold)">' + WD.fmt(Math.round(myDmg * 100) / 100) + '</b></div>' +
          '<div style="display:flex;height:12px;background:#26364e;border-radius:10px;overflow:hidden;flex:1"><div style="width:' + pctAtk + '%;background:var(--gold)"></div><div style="width:' + pctDef + '%;background:var(--blue)"></div></div>' +
          '<div style="text-align:right"><b style="color:var(--blue)">' + WD.esc(w.enemyName) + '</b><br><b style="font-size:17px;color:var(--blue)">' + WD.fmt(Math.round(enDmg * 100) / 100) + '</b></div></div>' +
          '<p class="muted" style="margin-top:10px">👥 2 petempur \u00B7 ⚔️ ' + atkHits + ' serangan \u00B7 🕐 Berlangsung ' + elapsedText(Date.now() - (w.declaredAt || Date.now())) + (w.simulated ? ' \u00B7 Musuh simulasi (NPC)' : '') + '</p>' +
          locLine +
          shieldBarHTML('🛡️ Perisai Musuh', w.enemyShields || 0, shieldMaxOf(w), 'enemy') +
          shieldBarHTML('🛡️ Perisai Negaraku', ownShields, SHIELD_CAP, 'own') +
          '<div class="wd-actions top-gap"><button class="subtle-button" type="button" data-attack="' + w.id + '">Serang (10 energi)</button><a class="subtle-button" href="war-room.html?id=' + w.id + '" title="Masuk Ruang Perang" style="text-decoration:none;display:inline-block;padding:10px 15px">RUANG PERANG &gt;</a></div></div>';
      }).join("") : '<p class="muted">Belum ada perang aktif.</p>');
      WD.$$("[data-attack]", listEl).forEach(b => b.addEventListener("click", () => attack(b.getAttribute("data-attack"))));
    }

    function declareWar(enemyId, simulated) {
      const wars = load();
      if (wars.some(w => w.status === "active" && w.enemyId === enemyId)) { WD.toast("Perang melawan target ini sudah aktif."); return; }
      let enemyName = "Kerajaan Simulasi (NPC)";
      let strength = 50;
      if (!simulated) {
        let c = null;
        try { c = (Game.getCountries() || {})[enemyId] || null; } catch (e) { c = null; }
        if (!c) { WD.toast("Negara lawan tidak ditemukan."); return; }
        enemyName = c.name; strength = 30;
      }
      wars.push({ id: WD.uid("war"), enemyId, enemyName, enemyStrength: strength, enemyShields: simulated ? 500 : 0, enemyShieldsMax: simulated ? 500 : 0, myDamage: 0, enemyDamage: 0, damageLog: [], status: "active", declaredAt: Date.now(), wonAt: null, simulated });
      save(wars); render();
      WD.toast("Perang dinyatakan melawan " + enemyName + ".");
      WD.newsAdd("Perang dinyatakan: " + enemyName, me() + " menyatakan perang melawan " + enemyName + (simulated ? " (simulasi latihan)." : "."), "Perang");
    }

    // Aturan hancur perisai (kajian 18 Nov 2026): units = ceil(damage/15);
    // 1-3 perisai hancur per unit (acak sekali per pukulan); tiap perisai
    // menyerap sampai 15 damage. Selagi ada perisai, semua damage diserap;
    // kalau perisai habis di tengah pukulan, sisanya jadi overflow.
    function breakShields(shields, damage) {
      shields = shields || 0;
      if (shields <= 0) return { broken: 0, remaining: 0, overflow: damage };
      const units = Math.ceil(damage / 15);
      const perUnit = 1 + Math.floor(Math.random() * 3);
      if (shields >= units) {
        const broken = Math.min(shields, units * perUnit);
        return { broken, remaining: shields - broken, overflow: 0 };
      }
      return { broken: shields, remaining: 0, overflow: Math.max(0, damage - shields * 15) };
    }
    function senjataOverflowText(dmg) {
      const owned = (Game.getPlayer().inventory || {})["Senjata"] || 0;
      const lost = Math.min(owned, Math.floor(dmg));
      if (lost > 0) Game.removeItem("Senjata", lost);
      return lost > 0
        ? WD.fmt(lost) + " senjatamu hancur (perisai habis)."
        : "tidak ada senjata yang bisa dihancurkan.";
    }
    // Balasan musuh menghantam pool perisai negara sendiri dulu;
    // kalau perisai habis, sisa damage menghancurkan Senjata 1:1.
    // Kembali { text, broken } supaya attack() bisa mencatat perisai
    // yang hancur akibat balasan ke damageLog (fase 2).
    function counterAttack(counterDmg) {
      const country = WD.myCountry();
      if (!country) return { text: senjataOverflowText(counterDmg), broken: 0 };
      const all = WD.load("wdDefense", {});
      const d = all[country.id] || { soldiers: 0, level: 1, shields: 0, shieldCooldownUntil: 0 };
      const res = breakShields(d.shields || 0, counterDmg);
      d.shields = res.remaining;
      all[country.id] = d; WD.save("wdDefense", all);
      let msg = res.broken > 0
        ? WD.fmt(res.broken) + " perisaimu hancur (sisa: " + WD.fmt(res.remaining) + ")."
        : "tidak ada perisai untuk dihancurkan.";
      if (res.overflow > 0) msg += " Sisa damage " + WD.fmt(res.overflow) + ": " + senjataOverflowText(res.overflow);
      return { text: msg, broken: res.broken };
    }

    // ---------- aturan lokasi perang ----------
    // ATURAN LOKASI (18 Nov 2026, permintaan Nanda): untuk menyerang, pemain
    // WAJIB sedang berada di negara penyerang ATAU negara yang bertahan.
    // Perbandingan memakai ID WILAYAH (regionIds negara), BUKAN nama — nama
    // negara buatan pemain belum tentu sama dengan nama negara di peta
    // (misal negara "Negara Bar" berdiri di wilayah "Jawa Barat", Indonesia).
    // Perang simulasi (SIM-RIVAL, latihan) DIKECUALIKAN: boleh diserang dari
    // mana saja. Kalau data lokasi/front tidak bisa ditentukan (save lama /
    // pemain belum punya lokasi), serangan dibiarkan jalan (fail open) supaya
    // permainan normal tidak terblokir.
    // JAGA KONSISTEN: helper ini diduplikasi identik di war-room.js — kalau
    // diubah di sini, ubah juga di sana.
    function warFrontRegions(w) {
      const regions = [];
      try {
        const myC = WD.myCountry();
        if (myC && Array.isArray(myC.regionIds)) myC.regionIds.forEach(r => regions.push(r));
        if (!w.simulated && w.enemyId) {
          const e = (Game.getCountries() || {})[w.enemyId];
          if (e && Array.isArray(e.regionIds)) e.regionIds.forEach(r => regions.push(r));
        }
      } catch (e) { /* abaikan — fail open di warLocationCheck */ }
      return regions;
    }
    function warFrontNames(w) {
      let atkName = "Negaramu", defName = w.enemyName || "?";
      try {
        const myC = WD.myCountry();
        if (myC && myC.name) atkName = myC.name;
        if (!w.simulated && w.enemyId) {
          const e = (Game.getCountries() || {})[w.enemyId];
          if (e && e.name) defName = e.name;
        }
      } catch (e) { /* pakai fallback di atas */ }
      return { atkName, defName };
    }
    function warLocationCheck(w) {
      const names = warFrontNames(w);
      if (w.simulated) return { ok: true, simulated: true, atkName: names.atkName, defName: names.defName, curName: "?" };
      const regions = warFrontRegions(w);
      if (!regions.length) return { ok: true, unknown: true, atkName: names.atkName, defName: names.defName, curName: "?" };
      let cur = null;
      try { cur = Game.getWorldState() || null; } catch (e) { cur = null; }
      if (!cur) { try { cur = (Game.getPlayer() || {}).world || null; } catch (e) { cur = null; } }
      const curProv = cur ? cur.currentProvinceId : null;
      const curName = (cur && (cur.currentProvinceName || cur.currentCountryName)) || "?";
      if (!curProv) return { ok: true, unknown: true, atkName: names.atkName, defName: names.defName, curName };
      if (regions.indexOf(curProv) !== -1) return { ok: true, atkName: names.atkName, defName: names.defName, curName };
      return { ok: false, atkName: names.atkName, defName: names.defName, curName };
    }
    function warLocationMessage(chk) {
      return "Kamu harus berada di " + chk.atkName + " atau " + chk.defName + " untuk ikut perang ini. Terbang dulu ke salah satu tempat itu.";
    }

    function attack(warId) {
      const wars = load(); const w = wars.find(x => x.id === warId && x.status === "active"); if (!w) return;
      const loc = warLocationCheck(w);
      if (!loc.ok) { const msg = warLocationMessage(loc); WD.toast(msg); if (resultEl) resultEl.textContent = msg; return; }
      if (!Game.useEnergy(10)) { WD.toast("Energi tidak mencukupi (butuh 10 energi untuk menyerang)."); return; }
      const p = Game.getPlayer();
      if (w.simulated) { if (typeof w.enemyShields !== "number") w.enemyShields = 500; if (typeof w.enemyShieldsMax !== "number") w.enemyShieldsMax = 500; }
      // Fase 2: backfill untuk perang lama yang dibuat sebelum field ini ada.
      if (!Array.isArray(w.damageLog)) w.damageLog = [];
      if (typeof w.enemyDamage !== "number") w.enemyDamage = 0;
      const hasArmor = ((p.inventory || {})["Armor"] || 0) >= 1;
      let damage = 5 + (p.stats.strength || 1) * 2 + Math.floor(Math.random() * 6);
      if (hasArmor) damage = damage * 1.025;
      Game.recordActivity("warAttacks", 1);
      Game.recordActivity("warDamage", damage);
      const res = breakShields(w.enemyShields || 0, damage);
      w.enemyShields = res.remaining;
      w.enemyStrength -= res.overflow;
      w.myDamage = (w.myDamage || 0) + damage;
      w.damageLog.push({ time: Date.now(), by: me(), side: "atk", damage: Math.round(damage * 100) / 100, shieldsBroken: res.broken });
      const dmgShown = WD.fmt(Math.round(damage * 100) / 100);
      let text = "Seranganmu menimbulkan " + dmgShown + " damage" + (hasArmor ? " (termasuk bonus Armor +2,5%)" : "") + ".";
      if (res.broken > 0) text += " Perisai musuh hancur: " + WD.fmt(res.broken) + " (sisa: " + WD.fmt(res.remaining) + ").";
      if (w.enemyStrength <= 0) {
        w.status = "won"; w.wonAt = Date.now(); w.enemyStrength = 0;
        text += " Kekuatan " + w.enemyName + " habis \u2014 kamu MEMENANGKAN perang ini!";
        WD.newsAdd("Perang dimenangkan melawan " + w.enemyName, me() + " memenangkan perang melawan " + w.enemyName + " dengan total damage " + WD.fmt(w.myDamage) + "." + (w.simulated ? " (simulasi latihan)" : ""), "Perang");
      } else {
        text += " Kekuatan " + w.enemyName + " tersisa: " + WD.fmt(Math.max(0, w.enemyStrength)) + ".";
        const counterDmg = 5 + Math.floor(Math.random() * 6);
        w.enemyDamage = (w.enemyDamage || 0) + counterDmg;
        const ca = counterAttack(counterDmg);
        w.damageLog.push({ time: Date.now(), by: w.enemyName, side: "def", damage: counterDmg, shieldsBroken: ca.broken });
        text += " Serangan balasan musuh: " + counterDmg + " damage \u2014 " + ca.text;
      }
      resultEl.textContent = text;
      save(wars); render();
    }

    render();
  }

  // ---------- war-history.html ----------
  function initWarHistory() {
    const el = document.getElementById("war-history-list"); if (!el) return;
    const wars = WD.load("wdWars", []);
    const stat = document.getElementById("stat-war-total"); if (stat) stat.textContent = wars.length + " perang";
    const rows = wars.slice().sort((a, b) => (b.declaredAt || 0) - (a.declaredAt || 0));
    el.innerHTML = rows.length ? rows.map(w =>
      '<div class="wd-row"><div><b>' + WD.esc(w.enemyName) + '</b><small>' + (w.simulated ? 'Musuh simulasi (NPC) \u00B7 ' : '') + 'Dinyatakan ' + WD.fmtDate(w.declaredAt) + (w.wonAt ? ' \u00B7 Dimenangkan ' + WD.fmtDate(w.wonAt) : '') + '<br>Damage yang diberikan: ' + WD.fmt(w.myDamage || 0) + '</small></div><span class="wd-tag">' + (w.status === "won" ? "Menang" : w.status === "peace" ? "Damai" : "Aktif") + '</span></div>'
    ).join("") : '<p class="muted">Belum ada perang yang tercatat. Nyatakan perang dari halaman Perang Dunia.</p>';
  }

  document.addEventListener("DOMContentLoaded", () => {
    initParties(); initParliament(); initElections(); initOrgs(); initDefense(); initWar(); initWarHistory();
  });
})();
