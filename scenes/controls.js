Scene.register("Controls", {
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
    if (stats) stats.style.display = "none";
    if (controls) controls.style.display = "flex";
    if (onlineMenu) onlineMenu.style.display = "none";

    const btnBack = document.getElementById("btnControlsBack");
    if (btnBack) btnBack.onclick = () => Scene.set("MainMenu");
  },
});

