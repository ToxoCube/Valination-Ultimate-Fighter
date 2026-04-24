Scene.register("Shop", {
  onEnter() {
    const root = document.getElementById("menuRoot");
    const main = document.getElementById("menuMain");
    const mode = document.getElementById("menuMode");
    const character = document.getElementById("menuCharacter");
    const shop = document.getElementById("menuShop");
    const controls = document.getElementById("menuControls");
    const stats = document.getElementById("menuStats");
    const onlineMenu = document.getElementById("menuOnline");
    const settingsMenu = document.getElementById("menuSettings");

    root.style.display = "flex";
    main.style.display = "none";
    mode.style.display = "none";
    character.style.display = "none";
    shop.style.display = "flex";
    if (controls) controls.style.display = "none";
    if (stats) stats.style.display = "none";
    if (onlineMenu) onlineMenu.style.display = "none";
    if (settingsMenu) settingsMenu.style.display = "none";

    const upgrades = ShopData.upgrades;

    function getUpgradesState(){
      Save.data.upgrades = Save.data.upgrades || {};
      return Save.data.upgrades;
    }

    function balanceText(){
      return `Coins: ${Progression.coins}   Level: ${Progression.level}   XP: ${Progression.xp}/${Progression.xpToLevel}`;
    }

    function render(){
      document.getElementById("shopBalance").innerText = balanceText();
      const list = document.getElementById("shopList");
      list.innerHTML = "";

      const state = getUpgradesState();
      upgrades.forEach(u => {
        const rank = Math.max(0, Number(state[u.id]) || 0);
        const cost = ShopData.getCostForRank(u, rank);
        const delta = u.bonusPerRank > 0 ? `+${u.bonusPerRank}` : `${u.bonusPerRank}`;

        const row = document.createElement("div");
        row.className = "shopItem";
        row.innerHTML = `
          <div class="shopItemLeft">
            <div class="shopItemName">${u.name} Lv.${rank}</div>
            <div class="shopItemDesc">${delta} ${u.statLabel} per purchase</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="shopItemCost">${cost} coins</div>
            <button type="button">Buy</button>
          </div>
        `;

        const btn = row.querySelector("button");
        btn.onclick = () => {
          if(Progression.coins < cost){
            UI.announce("NOT ENOUGH COINS");
            return;
          }
          Progression.coins -= cost;
          ShopData.setRank(u.id, rank + 1);
          Save.save();
          Progression.save();
          UI.announce("PURCHASED!");
          render();
        };

        list.appendChild(row);
      });
    }

    render();

    document.getElementById("btnShopBack").onclick = () => Scene.set("MainMenu");
  },
});

