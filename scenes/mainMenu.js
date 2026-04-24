Scene.register("MainMenu", {
  onEnter() {
    if (typeof OnlineChat !== "undefined" && OnlineChat.setOnlineActive) {
      OnlineChat.setOnlineActive(false);
    }
    if(typeof Netplay !== "undefined" && Netplay.enabled) Netplay.reset();
    const root = document.getElementById("menuRoot");
    const main = document.getElementById("menuMain");
    const mode = document.getElementById("menuMode");
    const character = document.getElementById("menuCharacter");
    const shop = document.getElementById("menuShop");
    const controls = document.getElementById("menuControls");
    const statsMenu = document.getElementById("menuStats");
    const onlineMenu = document.getElementById("menuOnline");
    const settingsMenu = document.getElementById("menuSettings");

    root.style.display = "flex";
    main.style.display = "flex";
    mode.style.display = "none";
    character.style.display = "none";
    if (shop) shop.style.display = "none";
    if (controls) controls.style.display = "none";
    if (statsMenu) statsMenu.style.display = "none";
    if (onlineMenu) onlineMenu.style.display = "none";
    if (settingsMenu) settingsMenu.style.display = "none";

    document.getElementById("overlay").style.display = "none";
    const bars = document.getElementById("bars");
    if (bars) bars.style.display = "block";

    const btnPlay = document.getElementById("btnPlay");
    btnPlay.onclick = () => Scene.set("ModeSelect");

    const stats = document.getElementById("mainStats");
    if(stats){
      stats.innerText = `Level ${Progression.level}   XP ${Progression.xp}/${Progression.xpToLevel}   Coins ${Progression.coins}`;
    }

    const btnShop = document.getElementById("btnShop");
    if(btnShop) btnShop.onclick = () => Scene.set("Shop");

    const btnStats = document.getElementById("btnStats");
    if(btnStats) btnStats.onclick = () => Scene.set("Stats");

    const btnControls = document.getElementById("btnControls");
    if(btnControls) btnControls.onclick = () => Scene.set("Controls");

    const btnSettings = document.getElementById("btnSettings");
    if(btnSettings) btnSettings.onclick = () => Scene.set("Settings");
  },
});

