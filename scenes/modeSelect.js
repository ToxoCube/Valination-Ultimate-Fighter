Scene.register("ModeSelect", {
  onEnter() {
    const root = document.getElementById("menuRoot");
    const main = document.getElementById("menuMain");
    const mode = document.getElementById("menuMode");
    const character = document.getElementById("menuCharacter");
    const shop = document.getElementById("menuShop");
    const controls = document.getElementById("menuControls");
    const stats = document.getElementById("menuStats");
    const online = document.getElementById("menuOnline");
    const settingsMenu = document.getElementById("menuSettings");

    root.style.display = "flex";
    main.style.display = "none";
    mode.style.display = "flex";
    character.style.display = "none";
    if (shop) shop.style.display = "none";
    if (controls) controls.style.display = "none";
    if (stats) stats.style.display = "none";
    if (online) online.style.display = "none";
    if (settingsMenu) settingsMenu.style.display = "none";

    document.getElementById("btnModePvB").onclick = () => Scene.set("CharacterSelect", { mode: "pvb" });
    document.getElementById("btnModeOnline").onclick = () => Scene.set("OnlineLobby");
    document.getElementById("btnModeBack").onclick = () => Scene.set("MainMenu");
  },
});

