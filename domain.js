/* Shared interactions for Home domains. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const toast = message => {
    const el = $("#domain-toast"); if (!el) return;
    el.textContent = message; el.classList.add("show");
    clearTimeout(window.__wdToastTimer); window.__wdToastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  };
  if (sessionStorage.getItem("wdLoggedIn") !== "yes") { location.replace("index.html"); return; }
  const player = Game.getPlayer();
  if ($("#domain-player-name")) $("#domain-player-name").textContent = player.username;
  if ($("#domain-player-level")) $("#domain-player-level").textContent = `Level ${player.level}`;

  const itemData = [
    ["Gandum","🌾","Bahan Mentah"],["Batu","🪨","Bahan Mentah"],["Kayu","🪵","Bahan Mentah"],["Besi","⛓️","Bahan Mentah"],["Minyak","🛢️","Bahan Mentah"],["Batu bara","⚫","Bahan Mentah"],["Tembaga","🟠","Bahan Mentah"],["Kapas","🧶","Bahan Mentah"],
    ["Senjata","⚔️","Perlengkapan"],["Perisai","🛡️","Perlengkapan"],["Armor","🪖","Perlengkapan"],
    ["Makanan","🍞","Kebutuhan"],["Minuman energi","🥤","Kebutuhan"],["Tiket perjalanan","🎫","Kebutuhan"]
  ];
  function renderInventory() {
    const p = Game.getPlayer();
    if (!$("#raw-items")) return;
    $("#capacity-value").textContent = `${Game.inventoryUsed().toLocaleString("id-ID")} / ${p.inventoryCapacity.toLocaleString("id-ID")}`;
    const targets = { "Bahan Mentah": "#raw-items", "Perlengkapan": "#war-items", "Kebutuhan": "#need-items" };
    Object.values(targets).forEach(sel => $(sel).innerHTML = "");
    itemData.forEach(([name, icon, group]) => {
      const tile = document.createElement("div"); tile.className = "domain-item";
      tile.innerHTML = `<span class="domain-item-icon">${icon}</span><b></b><small>Jumlah</small><strong></strong>`;
      tile.querySelector("b").textContent = name;
      tile.querySelector("strong").textContent = (p.inventory[name] || 0).toLocaleString("id-ID");
      $(targets[group]).appendChild(tile);
    });
  }
  function setupShop() {
    if (!$("#buy-drinks")) return;
    const quantity = $("#drink-quantity");
    const update = () => {
      let count = Math.max(1, Math.min(500, Math.floor(Number(quantity.value) || 1)));
      $("#drink-total").textContent = `${(count * 0.1).toLocaleString("id-ID", {minimumFractionDigits:1, maximumFractionDigits:1})} Gold`;
    };
    quantity.addEventListener("input", update); update();
    $("#buy-drinks").addEventListener("click", () => {
      const result = Game.purchaseEnergyDrink(Math.max(1, Math.floor(Number(quantity.value) || 1)));
      if (!result.ok) return toast(result.reason);
      toast(`Berhasil membeli ${result.quantity} minuman energi seharga ${result.cost.toLocaleString("id-ID")} Gold.`);
      renderInventory(); update();
    });
  }

  const activityLabels = [
    ["marketPurchases","Barang dibeli di Pasar Global"], ["warAttacks","Jumlah serangan perang"],
    ["warDamage","Total damage perang"], ["energyUsed","Total energi digunakan"], ["lawsRatified","UU yang disahkan"]
  ];
  function renderAchievements() {
    if (!$("#achievement-list")) return;
    const p = Game.getPlayer();
    const claimed = p.achievementsClaimed || [];
    $("#claimed-count").textContent = `${claimed.length} / ${Game.ACHIEVEMENTS.length}`;
    const summary = $("#activity-summary"); summary.innerHTML = "";
    activityLabels.forEach(([key,label]) => {
      const value = key === "energyUsed" ? p.energyUsed : p.activities[key];
      const tile = document.createElement("div"); tile.className = "activity-tile";
      const title = document.createElement("span"); title.textContent = label;
      const amount = document.createElement("b"); amount.textContent = (Number(value)||0).toLocaleString("id-ID");
      tile.append(title,amount); summary.appendChild(tile);
    });
    const list = $("#achievement-list"); list.innerHTML = "";
    Game.ACHIEVEMENTS.forEach(item => {
      const progress = Game.getAchievementProgress(item); const done = progress >= item.target; const isClaimed = claimed.includes(item.id);
      const card = document.createElement("article"); card.className = `card achievement-card ${done ? "achievement-done" : ""}`;
      const heading = document.createElement("div"); heading.className = "achievement-heading";
      const title = document.createElement("h3"); title.textContent = item.title;
      const state = document.createElement("span"); state.textContent = isClaimed ? "DIKLAIM" : done ? "SELESAI" : "BERLANGSUNG";
      heading.append(title,state);
      const desc = document.createElement("p"); desc.className="muted"; desc.textContent=item.description;
      const count = document.createElement("div"); count.className="achievement-count"; count.textContent=`${Math.min(progress,item.target).toLocaleString("id-ID")} / ${item.target.toLocaleString("id-ID")}`;
      const bar = document.createElement("div"); bar.className="mission-bar"; const fill=document.createElement("div"); fill.style.width=`${Math.min(100,progress/item.target*100)}%`; bar.appendChild(fill);
      const reward = document.createElement("p"); reward.className="muted tiny"; reward.textContent=`Hadiah: ${item.reward} Gold`;
      const button=document.createElement("button"); button.className="claim-button"; button.type="button"; button.textContent=isClaimed?"Sudah diklaim":done?"Klaim penghargaan":"Belum tercapai"; button.disabled=!done||isClaimed;
      button.addEventListener("click",()=>{const result=Game.claimAchievement(item.id); if(result) toast(`Penghargaan diklaim: +${result} Gold.`); renderAchievements();});
      card.append(heading,desc,count,bar,reward,button); list.appendChild(card);
    });
  }

  let selectedSlot = null, selectedType = null;
  function renderConvoy() {
    if (!$("#convoy-slots")) return;
    const p=Game.getPlayer(), slots=$("#convoy-slots"); slots.innerHTML="";
    const built=(p.convoys||[]).filter(Boolean).length; $("#convoy-count").textContent=`${built} / 3`;
    for(let i=0;i<4;i++){
      const card=document.createElement("article"); card.className="card convoy-slot";
      const heading=document.createElement("div"); heading.className="slot-heading";
      const label=document.createElement("span"); label.textContent=`SLOT ${i+1}`; heading.appendChild(label);
      if(i<3){
        const building=p.convoys[i];
        if(building){
          const info=Game.getConvoyBuilding(building.type); card.classList.add("slot-built");
          const icon=document.createElement("div"); icon.className="slot-icon"; icon.textContent=info.icon;
          const name=document.createElement("h3"); name.textContent=info.name;
          const buff=document.createElement("p"); buff.className="muted"; buff.textContent=info.buff;
          card.append(heading,icon,name,buff);
        }else{
          const required=Game.getConvoySlotUnlockLevel(i); const locked=p.level<required;
          const add=document.createElement("button"); add.className="slot-add"; add.type="button"; add.innerHTML="<span>＋</span><b>Buat Bangunan</b>";
          add.addEventListener("click",()=>openBuild(i));
          const status=document.createElement("p"); status.className="muted"; status.textContent=locked?`Terbuka pada Level ${required}`:"Slot tersedia · pilih bangunan";
          card.append(heading,add,status);
          if(locked) card.classList.add("slot-locked");
        }
      }else{
        card.classList.add("slot-future"); const add=document.createElement("div"); add.className="slot-add slot-add-disabled"; add.innerHTML="<span>＋</span><b>Slot Ekspansi</b>";
        const status=document.createElement("p"); status.className="muted"; status.textContent="Belum tersedia · di luar 3 slot reguler"; card.append(heading,add,status);
      }
      slots.appendChild(card);
    }
    const info=$("#building-info"); info.innerHTML="";
    Object.entries(Game.CONVOY_BUILDINGS).forEach(([type,b])=>{
      const box=document.createElement("div"); box.className="building-info";
      const title=document.createElement("h3"); title.textContent=`${b.icon} ${b.name}`;
      const buff=document.createElement("p"); buff.textContent=b.buff;
      const cost=document.createElement("small"); cost.textContent="Kebutuhan bahan: "+Object.entries(b.requirements).map(([n,v])=>`${n} ${v}`).join(" · ");
      box.append(title,buff,cost); info.appendChild(box);
    });
  }
  function openBuild(slot) {
    selectedSlot=slot; selectedType=null;
    $("#build-title").textContent=`Bangun Konvoi · Slot ${slot+1}`;
    const required=Game.getConvoySlotUnlockLevel(slot), p=Game.getPlayer();
    if(p.level<required){
      $("#build-description").textContent=`Slot ini belum terbuka. Kamu membutuhkan Level ${required}, sedangkan levelmu saat ini ${p.level}.`;
      $("#build-requirements").innerHTML=""; $("#confirm-build").disabled=true; $("#confirm-build").textContent="Slot terkunci";
      $("#build-modal").classList.remove("hidden"); return;
    }
    $("#build-description").textContent="Mau membuat bangunan konvoi yang mana? Pilih jenis bangunan untuk melihat persyaratan bahan.";
    const req=$("#build-requirements"); req.innerHTML="";
    Object.entries(Game.CONVOY_BUILDINGS).forEach(([type,b])=>{
      const button=document.createElement("button"); button.type="button"; button.className="building-choice";
      const title=document.createElement("b"); title.textContent=`${b.icon} ${b.name}`;
      const effect=document.createElement("span"); effect.textContent=b.buff;
      const materials=document.createElement("small"); materials.textContent=Object.entries(b.requirements).map(([n,v])=>`${n}: ${v}`).join(" · ");
      button.append(title,effect,materials); button.addEventListener("click",()=>{
        selectedType=type; req.querySelectorAll(".building-choice").forEach(el=>el.classList.remove("selected")); button.classList.add("selected");
        $("#confirm-build").disabled=false; $("#confirm-build").textContent=`Bangun ${b.name}`;
      }); req.appendChild(button);
    });
    $("#confirm-build").disabled=true; $("#confirm-build").textContent="Pilih bangunan"; $("#build-modal").classList.remove("hidden");
  }
  function setupConvoy() {
    if(!$("#convoy-slots")) return;
    $("#close-build").addEventListener("click",()=>$("#build-modal").classList.add("hidden"));
    $("#build-modal").addEventListener("click",e=>{if(e.target.id==="build-modal") $("#build-modal").classList.add("hidden");});
    $("#confirm-build").addEventListener("click",()=>{
      if(selectedSlot===null||!selectedType)return;
      const result=Game.buildConvoy(selectedSlot,selectedType);
      if(!result.ok)return toast(result.reason);
      $("#build-modal").classList.add("hidden"); toast(`${result.building.name} berhasil dibangun. Buff telah aktif.`); renderConvoy();
    });
  }
  renderInventory(); setupShop(); renderAchievements(); setupConvoy(); renderConvoy();
  Game.subscribe(()=>{renderInventory();renderAchievements();renderConvoy();});
})();
