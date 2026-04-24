Scene.register("CharacterSelect", {
  onEnter(params) {
    const root = document.getElementById("menuRoot");
    const main = document.getElementById("menuMain");
    const mode = document.getElementById("menuMode");
    const character = document.getElementById("menuCharacter");
    const shop = document.getElementById("menuShop");
    const controls = document.getElementById("menuControls");
    const stats = document.getElementById("menuStats");
    const onlineMenu = document.getElementById("menuOnline");

    root.style.display = "flex";
    main.style.display = "none";
    mode.style.display = "none";
    character.style.display = "flex";
    if (shop) shop.style.display = "none";
    if (controls) controls.style.display = "none";
    if (stats) stats.style.display = "none";
    if (onlineMenu) onlineMenu.style.display = "none";

    const roster = Characters.roster;

    let selectedId = roster[0].id;
    const listEl = document.getElementById("characterList");
    const previewEl = document.getElementById("characterPreview");

    function applyUpgradePreview(c){
      const bonuses = ShopData.getTotalBonuses();
      const maxHp = c.maxHp + bonuses.hp;
      const maxEnergy = c.maxEnergy + bonuses.energy;
      const maxShield = c.maxShield + bonuses.shield;
      const specialCost = Math.max(5, c.specialCost - bonuses.specialCostReduction);
      return { ...c, maxHp, maxEnergy, maxShield, specialCost };
    }

    function renderPreview(c){
      const p = applyUpgradePreview(c);
      previewEl.innerHTML =
        `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
           <div style="width:14px;height:14px;border-radius:5px;border:1px solid rgba(255,255,255,0.25);background:${p.color};"></div>
           <div style="font-weight:700;color:#fff;">${p.name}</div>
         </div>
         <div>HP: ${p.maxHp} &nbsp; Energy: ${p.maxEnergy} &nbsp; Shield: ${p.maxShield}</div>
         <div>Special: ${p.specialName} (Cost ${p.specialCost}, Dmg ${p.specialDamage}, CD ${p.specialCooldown})</div>`;
    }

    function renderRoster(){
      listEl.innerHTML = "";
      roster.forEach(c => {
        const card = document.createElement("div");
        card.className = "charCard" + (c.id === selectedId ? " selected" : "");
        card.innerHTML =
          `<div class="charNameRow">
             <div class="charName">${c.name}</div>
             <div class="charSwatch" style="background:${c.color}"></div>
           </div>
           <div class="charStats">HP ${c.maxHp} • EN ${c.maxEnergy} • SH ${c.maxShield}<br/>Special: ${c.specialName}</div>`;
        card.onclick = () => {
          selectedId = c.id;
          renderRoster();
          renderPreview(c);
        };
        listEl.appendChild(card);
      });
      renderPreview(roster.find(r => r.id === selectedId) || roster[0]);
    }

    renderRoster();

    const roomHint = document.getElementById("onlineRoomHint");
    if (roomHint) {
      const oc = params && params.online;
      if (
        params &&
        params.mode === "online" &&
        oc &&
        !oc.matchmake &&
        oc.preferHost &&
        oc.room
      ) {
        roomHint.style.display = "block";
        roomHint.textContent =
          "Your room: " +
          oc.room +
          " — it appears in Open rooms once the match starts.";
      } else {
        roomHint.style.display = "none";
        roomHint.textContent = "";
      }
    }

    document.getElementById("btnStartMatch").onclick = () => {
      const playerName = (document.getElementById("playerName").value || "Player").trim().slice(0, 16);
      const selected = roster.find(r => r.id === selectedId) || roster[0];
      Scene.set("Fight", {
        mode: params?.mode || "pvb",
        online: params?.online || null,
        playerName,
        character: selected
      });
    };

    document.getElementById("btnCharBack").onclick = () => {
      if (params && params.mode === "online") Scene.set("OnlineLobby");
      else Scene.set("ModeSelect");
    };
  },
});

