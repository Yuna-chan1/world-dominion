/* WORLD DOMINION V.I — DASHBOARD BUILD 0.8 */
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  let selectedItem = null;
  let selectedUpgrade = null;
  let toastTimer = null;

  const ITEM_DATA = [
    { name: "Gandum", icon: "🌾", group: "🌾 SUMBER DAYA", usable: false },
    { name: "Batu", icon: "🪨", group: "🌾 SUMBER DAYA", usable: false },
    { name: "Kayu", icon: "🪵", group: "🌾 SUMBER DAYA", usable: false },
    { name: "Besi", icon: "⛓️", group: "🌾 SUMBER DAYA", usable: false },
    { name: "Minyak", icon: "🛢️", group: "🌾 SUMBER DAYA", usable: false },
    { name: "Batu bara", icon: "⚫", group: "🌾 SUMBER DAYA", usable: false },
    { name: "Tembaga", icon: "🟠", group: "🌾 SUMBER DAYA", usable: false },
    { name: "Kapas", icon: "🧶", group: "🌾 SUMBER DAYA", usable: false },
    { name: "Senjata", icon: "⚔️", group: "⚔ PERLENGKAPAN PERANG", usable: true },
    { name: "Perisai", icon: "🛡️", group: "⚔ PERLENGKAPAN PERANG", usable: true },
    { name: "Armor", icon: "🪖", group: "⚔ PERLENGKAPAN PERANG", usable: true },
    { name: "Makanan", icon: "🍞", group: "📦 KEBUTUHAN PEMAIN", usable: true },
    { name: "Minuman energi", icon: "🥤", group: "📦 KEBUTUHAN PEMAIN", usable: true },
    { name: "Tiket perjalanan", icon: "🎫", group: "📦 KEBUTUHAN PEMAIN", usable: true }
  ];

  const STAT_DATA = {
    strength: { label: "⚔ Kekuatan", description: "Meningkatkan kemampuan statistik kekuatan pemain." },
    education: { label: "📚 Pendidikan", description: "Meningkatkan kemampuan pendidikan pemain." },
    economy: { label: "🏭 Ekonomi", description: "Setiap level ekonomi memberikan +1% buff produksi dasar." }
  };

  const BUFF_LABELS = {
    convoy: "Konvoi",
    industry: "Industri kota",
    economy: "Stat ekonomi",
    ideology: "Ideologi",
    company: "Perusahaan"
  };

  function formatNumber(number) {
    return Number(number || 0).toLocaleString("id-ID");
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function openModal(id) { $(id).classList.remove("hidden"); }
  function closeModals() { $$(".modal").forEach(modal => modal.classList.add("hidden")); }

  function renderProfile(player) {
    $("#player-name").textContent = player.username;
    $("#account-name").textContent = player.username;
    $("#account-level").textContent = `Level ${player.level}`;
    $("#level-value").textContent = player.level;
    if (player.profileImage) $("#profile-avatar").src = player.profileImage;
    const world = player.world || {};
    const hasLocation = !!world.currentProvinceId;
    const citizen = !!world.citizenshipProvinceId;
    const regionName = world.currentProvinceName || "Belum ditentukan";
    const cityName = world.currentCityName || "Belum ditentukan";
    const countryName = world.currentCountryName || "";
    const flag = hasLocation && window.WorldLib ? WorldLib.flag(world.currentCountryIso2) : "🏳️";
    $("#player-area-label").textContent = `📍 Daerah: ${regionName}`;
    $("#player-country-label").textContent = hasLocation ? `🌍 Negara: ${countryName || "Tidak diketahui"}${citizen && world.citizenshipCountryName === countryName ? "" : " · non-warga"}` : "🌍 Negara: Belum bernegara";
    $("#player-flag").textContent = flag;
    $("#player-country-caption").textContent = citizen && world.citizenshipCountryName === countryName ? `Penduduk ${countryName}` : hasLocation ? `Berada di ${countryName || "luar negeri"} · belum menjadi warga` : "Belum memiliki negara";
    $("#dashboard-city-title").textContent = cityName;
    $("#dashboard-city-country").textContent = hasLocation ? `Provinsi: ${regionName}${countryName ? " · " + countryName : ""}` : "Negara: Belum ditentukan";
    renderMiniMap(world);

    const required = Game.expNeeded(player.level);
    const percent = player.level >= Game.MAX_LEVEL ? 100 : Math.min(100, player.exp / required * 100);
    $("#exp-display").innerHTML = `
      <div class="exp-heading"><b>⭐ Pengalaman (EXP)</b><span>${formatNumber(player.exp)} / ${formatNumber(required)}</span></div>
      <div class="exp-bar"><div class="exp-fill" style="width:${percent}%"></div></div>
      <small>${player.level >= Game.MAX_LEVEL ? "Level maksimum tercapai" : `Menuju Level ${player.level + 1}`}</small>`;
  }

  // Peta mini: bentuk provinsi pemain (emas) di antara provinsi sekitarnya, dari data peta dunia.
  window.addEventListener("wd-world-data", () => { try { renderMiniMap(Game.getWorldState()); } catch (e) {} });
  function renderMiniMap(world) {
    const box = $("#mini-map"), data = window.WorldLib && WorldLib.worldData();
    if (!box) return;
    const r = data && data.provinces.find(p => p.id === world.currentProvinceId);
    if (!r) { box.innerHTML = "PETA WILAYAH<br>Buka Peta Dunia untuk menentukan lokasi awal"; return; }
    const [x0, y0, x1, y1] = r.bbox, pad = Math.max(x1 - x0, y1 - y0, 4) * 0.9, vx = x0 - pad, vy = y0 - pad, vw = x1 - x0 + pad * 2, vh = y1 - y0 + pad * 2;
    const near = data.provinces.filter(p => p.id !== r.id && p.bbox[0] < vx + vw && p.bbox[2] > vx && p.bbox[1] < vy + vh && p.bbox[3] > vy).slice(0, 60);
    const sw = (Math.max(vw, vh) / 260).toFixed(3);
    box.style.padding = "0";
    box.innerHTML = `<svg viewBox="${vx} ${vy} ${vw} ${vh}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Peta ${r.name}">${near.map(p => `<path d="${p.d}" fill="#2c4a63" stroke="#8ca9c4" stroke-width="${sw}"/>`).join("")}<path d="${r.d}" fill="#e0b24f" stroke="#fff2c9" stroke-width="${sw * 1.6}"/></svg>`;
  }

  function renderEnergy(player) {
    const percent = Math.round(player.energy / player.maxEnergy * 100);
    $("#energy-value").textContent = `${player.energy} / ${player.maxEnergy}`;
    $("#energy-percent").textContent = `${percent}%`;
    $("#energy-fill").style.width = `${percent}%`;
    $("#energy-drinks").textContent = player.inventory["Minuman energi"];
    $("#food-count").textContent = player.inventory["Makanan"];
    $("#work-energy-label").textContent = `${player.energy} / ${player.maxEnergy}`;
    $("#work-stamina-percent").textContent = `${percent}%`;
    $("#work-stamina-fill").style.width = `${percent}%`;
    $("#work-stamina-text").textContent = player.energy >= 10
      ? `${player.energy} / ${player.maxEnergy} · KLIK UNTUK BEKERJA`
      : `${player.energy} / ${player.maxEnergy} · MINIMAL 10 ENERGI`;
    $("#work-stamina-button").disabled = player.energy < 10;
    $("#work-stamina-button").classList.toggle("disabled", player.energy < 10);

    const previewCycles = Math.floor(player.energy / 10);
    const base = previewCycles * 2;
    const production = Math.floor(base * Game.getProductionMultiplier().multiplier);
    $("#production-preview").textContent = `${formatNumber(production)} Besi`;
    const wagePreview = Math.round(previewCycles * 0.1 * Game.getWageMultiplier() * 1000) / 1000;
    $("#salary-preview").textContent = `${wagePreview.toLocaleString("id-ID", { maximumFractionDigits: 3 })} Gold`;
    $("#salary-total").textContent = `${formatNumber(player.workGoldEarned || 0)} Gold`;
  }

  function renderWallet(player) {
    $("#gold-value").textContent = formatNumber(player.gold);
    $("#local-money").textContent = `${formatNumber(Math.round(Game.getLocalMoney()))} ${Game.getLocalCurrency()}`;
    $("#foreign-money").textContent = formatNumber(player.foreignMoney);
  }

  function renderStats(player) {
    const container = $("#stats-list");
    container.innerHTML = "";
    Object.entries(STAT_DATA).forEach(([key, data]) => {
      const level = player.stats[key];
      const upgrade = player.upgrades[key];
      const active = upgrade && upgrade.finishAt > Date.now();
      const completed = upgrade && upgrade.finishAt <= Date.now();
      const row = document.createElement("div");
      row.className = "stat-upgrade-row";
      const info = document.createElement("div");
      info.className = "stat-info";
      const name = document.createElement("b");
      name.textContent = data.label;
      const value = document.createElement("span");
      value.textContent = `Level ${level}`;
      info.append(name, value);
      const button = document.createElement("button");
      button.className = "upgrade-button";
      button.type = "button";
      button.textContent = active ? `⏳ ${remainingTime(upgrade.finishAt)}` : completed ? "Klaim level" : "＋ Upgrade";
      button.disabled = !!active;
      button.addEventListener("click", () => {
        if (completed) {
          Game.finishUpgrade(key);
          showToast(`${data.label} berhasil ditingkatkan ke Level ${Game.getPlayer().stats[key]}.`);
          render();
        } else {
          selectedUpgrade = key;
          showUpgradeModal(key);
        }
      });
      row.append(info, button);
      const desc = document.createElement("p");
      desc.className = "muted tiny stat-description";
      desc.textContent = active ? `Sedang ditingkatkan · selesai ${new Date(upgrade.finishAt).toLocaleTimeString("id-ID")}` : data.description;
      container.append(row, desc);
    });
    const activeCount = Object.values(player.upgrades || {}).filter(item => item && item.finishAt > Date.now()).length;
    const status = document.createElement("p");
    status.className = "muted tiny top-gap";
    status.textContent = activeCount ? `${activeCount} upgrade sedang berjalan. Setiap statistik diproses mandiri.` : "Tidak ada upgrade yang sedang berjalan. Kamu bisa memulai beberapa statistik sekaligus.";
    container.appendChild(status);
  }

  function remainingTime(timestamp) {
    const seconds = Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
  }

  function showUpgradeModal(key) {
    const quote = Game.getUpgradeQuote(key);
    const data = STAT_DATA[key];
    $("#upgrade-modal-title").textContent = `Upgrade ${data.label}`;
    $("#upgrade-modal-description").textContent = `${data.description} Level ${quote.currentLevel} akan menjadi Level ${quote.nextLevel}.`;
    $("#upgrade-modal-cost").textContent = `${formatNumber(quote.cost)} Gold`;
    $("#upgrade-modal-time").textContent = formatDuration(quote.durationMs);
    $("#confirm-upgrade-button").disabled = Game.getPlayer().gold < quote.cost;
    $("#confirm-upgrade-button").textContent = Game.getPlayer().gold < quote.cost ? "Gold tidak mencukupi" : "Konfirmasi upgrade";
    openModal("#upgrade-modal");
  }

  function formatDuration(ms) {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds} detik`;
    return `${Math.floor(seconds / 60)} menit`;
  }

  function renderInventory(player) {
    $("#inventory-capacity").textContent = `Kapasitas: ${formatNumber(Game.inventoryUsed())} / ${formatNumber(player.inventoryCapacity)}`;
    const container = $("#inventory-groups");
    container.innerHTML = "";
    const groups = [...new Set(ITEM_DATA.map(item => item.group))];
    groups.forEach(groupName => {
      const title = document.createElement("p");
      title.className = "inventory-category";
      title.textContent = groupName;
      const grid = document.createElement("div");
      grid.className = "inventory-grid";
      ITEM_DATA.filter(item => item.group === groupName).forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "item";
        button.innerHTML = `<span class="item-icon">${item.icon}</span><span class="item-name"></span><b class="item-count">${formatNumber(player.inventory[item.name])}</b>`;
        button.querySelector(".item-name").textContent = item.name;
        button.addEventListener("click", () => {
          selectedItem = item;
          showItemModal(item, player);
        });
        grid.appendChild(button);
      });
      container.append(title, grid);
    });
  }

  function showItemModal(item, player) {
    const count = player.inventory[item.name];
    $("#item-modal-icon").textContent = item.icon;
    $("#item-modal-title").textContent = item.name;
    $("#item-modal-count").textContent = formatNumber(count);
    const descriptions = {
      "Makanan": "Gunakan 1 makanan untuk memulihkan hingga 10 energi.",
      "Minuman energi": "Gunakan 1 minuman energi untuk memulihkan hingga 1 energi.",
      "Senjata": "Senjata digunakan sebagai barang habis pakai dalam aksi yang mendukungnya.",
      "Perisai": "Perisai digunakan sebagai barang habis pakai dalam aksi yang mendukungnya.",
      "Armor": "Armor digunakan sebagai barang habis pakai dalam aksi yang mendukungnya.",
      "Tiket perjalanan": "Gunakan 1 tiket untuk menandai tiket perjalanan terpakai."
    };
    $("#item-modal-description").textContent = item.usable
      ? (descriptions[item.name] || "Barang ini dapat digunakan.")
      : "Barang sumber daya tidak dapat digunakan langsung dari inventaris.";
    const button = $("#use-item-button");
    button.disabled = !item.usable || count <= 0 ||
      ((item.name === "Makanan" || item.name === "Minuman energi") && player.energy >= player.maxEnergy);
    button.textContent = !item.usable ? "Tidak dapat digunakan" : count <= 0 ? "Stok tidak tersedia" : "Gunakan 1 barang";
    if ((item.name === "Makanan" || item.name === "Minuman energi") && player.energy >= player.maxEnergy) {
      button.textContent = "Energi sudah penuh";
    }
    openModal("#item-modal");
  }

  function useSelectedItem() {
    if (!selectedItem) return;
    const name = selectedItem.name;
    const player = Game.getPlayer();
    if (!selectedItem.usable || player.inventory[name] < 1) return showToast("Barang tidak tersedia.");

    if (name === "Makanan" || name === "Minuman energi") {
      const restore = name === "Makanan" ? 10 : 1;
      if (player.energy >= player.maxEnergy) return showToast("Energi sudah penuh.");
      Game.removeItem(name, 1);
      const gained = Game.restoreEnergy(restore);
      closeModals();
      showToast(`${name} digunakan. Energi pulih ${gained}.`);
      return;
    }

    Game.removeItem(name, 1);
    closeModals();
    const message = name === "Tiket perjalanan"
      ? "1 tiket perjalanan telah digunakan."
      : `1 ${name.toLowerCase()} telah digunakan.`;
    showToast(message);
  }

  function renderBuffs() {
    const result = Game.getProductionMultiplier();
    $("#buff-total").textContent = `+${result.percent.toFixed(2)}%`;
    const box = $("#buff-breakdown");
    box.innerHTML = "";
    Object.entries(result.sources).forEach(([key, percent]) => {
      const row = document.createElement("div");
      const label = document.createElement("span");
      label.textContent = BUFF_LABELS[key];
      const value = document.createElement("b");
      value.textContent = `+${percent.toFixed(2)}%`;
      row.append(label, value);
      box.appendChild(row);
    });
  }

  function renderMissions(player) {
    const missions = [
      { key: "work5Claimed", title: "Pekerja Pemula", description: "Selesaikan 5 siklus pekerjaan.", required: 5, reward: 50 },
      { key: "work10Claimed", title: "Karier Berkembang", description: "Selesaikan 10 siklus pekerjaan.", required: 10, reward: 100 }
    ];
    const container = $("#missions-list");
    container.innerHTML = "";
    missions.forEach(mission => {
      const done = player.workCount >= mission.required;
      const claimed = player.missions[mission.key];
      const card = document.createElement("div");
      card.className = `mission mission-progress ${done ? "mission-complete" : ""}`;
      const heading = document.createElement("div");
      heading.className = "mission-heading";
      const title = document.createElement("b");
      title.textContent = mission.title;
      const status = document.createElement("span");
      status.className = "mission-status";
      status.textContent = claimed ? "DIKLAIM" : done ? "SELESAI" : "BERLANGSUNG";
      heading.append(title, status);
      const description = document.createElement("p");
      description.className = "muted";
      description.textContent = mission.description;
      const progressText = document.createElement("div");
      progressText.className = "mission-progress-text";
      progressText.textContent = `${Math.min(player.workCount, mission.required)} / ${mission.required}`;
      const bar = document.createElement("div");
      bar.className = "mission-bar";
      const fill = document.createElement("div");
      fill.style.width = `${Math.min(100, player.workCount / mission.required * 100)}%`;
      bar.appendChild(fill);
      const reward = document.createElement("span");
      reward.className = "muted tiny";
      reward.textContent = `Hadiah: ${mission.reward} EXP`;
      const claim = document.createElement("button");
      claim.className = "claim-button";
      claim.type = "button";
      claim.textContent = claimed ? "Sudah diklaim" : done ? "Klaim hadiah" : "Belum selesai";
      claim.disabled = !done || claimed;
      claim.addEventListener("click", () => {
        const result = Game.claimMission(mission.key);
        if (result) showToast(`Misi diklaim! +${result} EXP.`);
        render();
      });
      card.append(heading, description, progressText, bar, reward, claim);
      container.appendChild(card);
    });
  }

  function render() {
    const player = Game.getPlayer();
    renderProfile(player);
    renderEnergy(player);
    renderWallet(player);
    renderStats(player);
    renderInventory(player);
    renderBuffs();
    renderMissions(player);
  }

  function runWork() {
    const result = Game.work();
    if (!result.ok) return showToast(result.reason);
    showToast(`Pekerjaan selesai: -${result.spent} energi, +${result.production} Besi, +${result.exp} EXP, +${result.wage.toLocaleString("id-ID", { maximumFractionDigits: 3 })} Gold.`);
    render();
  }

  function setupLogin() {
    const accountsKey = "worldDominionAccounts";
    const activeAccountKey = "worldDominionActiveAccount";
    const playerStorageKey = Game.getStorageKey();
    const loginForm = $("#login-form");
    const registerForm = $("#register-form");
    const message = $("#auth-message");

    function readAccounts() {
      try { return JSON.parse(localStorage.getItem(accountsKey) || "{}"); }
      catch (_) { return {}; }
    }
    function accountId(username) { return username.trim().toLowerCase(); }
    function setMode(mode) {
      const isLogin = mode === "login";
      loginForm.classList.toggle("hidden", !isLogin);
      registerForm.classList.toggle("hidden", isLogin);
      $("#show-login").classList.toggle("active", isLogin);
      $("#show-register").classList.toggle("active", !isLogin);
      $("#show-login").setAttribute("aria-selected", String(isLogin));
      $("#show-register").setAttribute("aria-selected", String(!isLogin));
      message.textContent = "";
    }
    function enterWorld(account) {
      const id = accountId(account.username);
      localStorage.setItem(activeAccountKey, id);
      if (account.playerData) { localStorage.setItem(playerStorageKey, JSON.stringify(account.playerData)); Game.reloadFromStorage(); }
      Game.setUsername(account.username);
      sessionStorage.setItem("wdLoggedIn", "yes");
      $("#login-screen").classList.add("hidden");
      $("#dashboard").classList.remove("hidden");
      render();
    }

    $("#show-login").addEventListener("click", () => setMode("login"));
    $("#show-register").addEventListener("click", () => setMode("register"));

    loginForm.addEventListener("submit", event => {
      event.preventDefault();
      const username = $("#login-username").value.trim();
      const password = $("#login-password").value;
      const accounts = readAccounts();
      const account = accounts[accountId(username)];
      if (!account || account.password !== password) {
        message.textContent = "Username atau password tidak sesuai.";
        return;
      }
      enterWorld(account);
    });

    registerForm.addEventListener("submit", event => {
      event.preventDefault();
      const username = $("#register-username").value.trim();
      const email = $("#register-email").value.trim().toLowerCase();
      const password = $("#register-password").value;
      const confirm = $("#register-confirm").value;
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
        message.textContent = "Username 3–24 karakter: huruf, angka, atau garis bawah.";
        return;
      }
      if (password.length < 6) {
        message.textContent = "Password minimal 6 karakter.";
        return;
      }
      if (password !== confirm) {
        message.textContent = "Konfirmasi password tidak sama.";
        return;
      }
      const accounts = readAccounts();
      const id = accountId(username);
      if (accounts[id]) {
        message.textContent = "Username sudah digunakan. Pilih username lain.";
        return;
      }
      if (Object.values(accounts).some(item => item.email === email)) {
        message.textContent = "Email sudah terdaftar.";
        return;
      }
      const playerData = JSON.parse(JSON.stringify(Game.getPlayer()));
      playerData.username = username;
      // Pemain baru lahir di provinsi acak jika data peta dunia tersedia (jika tidak, ditentukan saat membuka Peta Dunia).
      const startList = window.WorldLib && WorldLib.worldData() && WorldLib.worldData().provinces;
      const start = startList && WorldLib.pickStartRegion(startList);
      playerData.world = Object.assign({}, playerData.world, start ? { startAssigned: true, currentProvinceId: start.id, currentProvinceName: start.name, currentCityName: start.name, currentCountryName: start.country, currentCountryIso2: start.iso2 || "", citizenshipProvinceId: start.id, citizenshipProvinceName: start.name, citizenshipCountryName: start.country, pendingFlight: null } : { startAssigned: false, currentProvinceId: null, currentProvinceName: null, currentCityName: null, currentCountryName: null, currentCountryIso2: "", citizenshipProvinceId: null, citizenshipProvinceName: null, citizenshipCountryName: null, pendingFlight: null });
      accounts[id] = { username, email, password, playerData, createdAt: Date.now() };
      localStorage.setItem(accountsKey, JSON.stringify(accounts));
      enterWorld(accounts[id]);
    });
    setMode("login");
  }

  function setupAvatar() {
    $("#avatar-input").addEventListener("change", event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return showToast("Pilih file gambar.");
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          const scale = Math.max(size / image.width, size / image.height);
          const width = image.width * scale;
          const height = image.height * scale;
          ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
          Game.setProfileImage(canvas.toDataURL("image/jpeg", 0.82));
          $("#profile-avatar").src = Game.getPlayer().profileImage;
          showToast("Foto profil berhasil diperbarui.");
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setupChat() {
    const input = $("#chat-message");
    const box = $("#chat-box");
    const tabs = $$("[data-chat-channel]");
    let activeChannel = "Global";
    const systemMessages = {
      Global: "Selamat datang di ruang Global. Pesan tersimpan di perangkat ini.",
      Region: "Kanal Region siap. Bergabunglah dengan wilayah untuk komunikasi regional pada versi multiplayer mendatang.",
      Negara: "Kanal Negara siap. Diskusi negara akan tersedia penuh setelah server multiplayer aktif.",
      Partai: "Kanal Partai siap. Ruang komunikasi partai masih berupa simulasi lokal."
    };
    function renderChannel() {
      tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.chatChannel === activeChannel));
      box.innerHTML = "";
      const messages = Game.getChatMessages(activeChannel);
      if (!messages.length) {
        const item = document.createElement("div"); item.className = "message";
        const sender = document.createElement("b"); sender.textContent = "System";
        const content = document.createElement("p"); content.textContent = systemMessages[activeChannel];
        item.append(sender, content); box.appendChild(item);
      } else {
        messages.forEach(message => {
          const item = document.createElement("div"); item.className = "message";
          const sender = document.createElement("b"); sender.textContent = message.sender;
          const content = document.createElement("p"); content.textContent = message.text;
          const time = document.createElement("small"); time.className = "muted tiny";
          time.textContent = new Date(message.at).toLocaleString("id-ID");
          item.append(sender, content, time); box.appendChild(item);
        });
      }
      input.placeholder = `Tulis pesan ke ${activeChannel}...`;
      box.scrollTop = box.scrollHeight;
    }
    tabs.forEach(tab => tab.addEventListener("click", () => {
      activeChannel = tab.dataset.chatChannel;
      renderChannel();
    }));
    function send() {
      const message = input.value.trim();
      if (!message) return;
      if (!Game.postChatMessage(activeChannel, message)) return;
      input.value = "";
      renderChannel();
    }
    $("#send-chat").addEventListener("click", send);
    input.addEventListener("keydown", event => { if (event.key === "Enter") send(); });
    renderChannel();
  }

  function setupEvents() {
    $("#work-stamina-button").addEventListener("click", runWork);
    $("#use-item-button").addEventListener("click", useSelectedItem);
    $("#confirm-upgrade-button").addEventListener("click", () => {
      if (!selectedUpgrade) return;
      const result = Game.startUpgrade(selectedUpgrade);
      if (!result.ok) {
        showToast(result.reason);
        closeModals();
        return;
      }
      closeModals();
      showToast(`Upgrade dimulai. Selesai dalam ${formatDuration(result.quote.durationMs)}.`);
      render();
    });
    $$("[data-close-modal]").forEach(button => button.addEventListener("click", closeModals));
    $$(".modal").forEach(modal => modal.addEventListener("click", event => {
      if (event.target === modal) closeModals();
    }));
  }

  function checkUpgradeTimers() {
    const player = Game.getPlayer();
    let changed = false;
    Object.keys(player.upgrades).forEach(key => {
      const upgrade = player.upgrades[key];
      if (upgrade && upgrade.finishAt <= Date.now()) {
        changed = Game.finishUpgrade(key) || changed;
      }
    });
    if (changed) showToast("Upgrade statistik selesai. Level statistik meningkat.");
    render();
  }

  function init() {
    setupLogin();
    setupAvatar();
    setupChat();
    setupEvents();
    Game.subscribe(render);
    setInterval(checkUpgradeTimers, 1000);
    if (sessionStorage.getItem("wdLoggedIn") === "yes") {
      $("#login-screen").classList.add("hidden");
      $("#dashboard").classList.remove("hidden");
    }
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();