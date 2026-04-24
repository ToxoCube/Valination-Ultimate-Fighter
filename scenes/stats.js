Scene.register("Stats", {
  onEnter() {
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
    character.style.display = "none";
    if (shop) shop.style.display = "none";
    if (controls) controls.style.display = "none";
    if (stats) stats.style.display = "flex";
    if (onlineMenu) onlineMenu.style.display = "none";

    const ranks = ShopData.getRanks();
    const bonuses = ShopData.getTotalBonuses(ranks);
    const overview = document.getElementById("statsOverview");
    if (overview) {
      overview.innerText = `Level ${Progression.level}   XP ${Progression.xp}/${Progression.xpToLevel}   Coins ${Progression.coins}`;
    }

    const list = document.getElementById("statsList");
    if (list) {
      list.innerHTML = `
        <div class="controlsRow"><span>Bonus Max HP</span><strong>+${bonuses.hp}</strong></div>
        <div class="controlsRow"><span>Bonus Max Energy</span><strong>+${bonuses.energy}</strong></div>
        <div class="controlsRow"><span>Bonus Max Shield</span><strong>+${bonuses.shield}</strong></div>
        <div class="controlsRow"><span>Special Cost Reduction</span><strong>-${bonuses.specialCostReduction}</strong></div>
      `;
    }

    const btnBack = document.getElementById("btnStatsBack");
    if (btnBack) btnBack.onclick = () => Scene.set("MainMenu");
  },
});

