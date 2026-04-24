Scene.register("Settings", {
  onEnter() {
    const root = document.getElementById("menuRoot");
    const main = document.getElementById("menuMain");
    const mode = document.getElementById("menuMode");
    const character = document.getElementById("menuCharacter");
    const shop = document.getElementById("menuShop");
    const controls = document.getElementById("menuControls");
    const stats = document.getElementById("menuStats");
    const onlineMenu = document.getElementById("menuOnline");
    const settings = document.getElementById("menuSettings");

    root.style.display = "flex";
    main.style.display = "none";
    mode.style.display = "none";
    character.style.display = "none";
    if (shop) shop.style.display = "none";
    if (controls) controls.style.display = "none";
    if (stats) stats.style.display = "none";
    if (onlineMenu) onlineMenu.style.display = "none";
    if (settings) settings.style.display = "flex";

    const persistServerUrl = () => {
      const urlIn = document.getElementById("settingNetplayServerUrl");
      if (!urlIn || typeof Save === "undefined" || !Save.data) return;
      Save.data.netplayServerUrl = String(urlIn.value || "").trim().slice(0, 512);
      Save.save();
    };

    const urlIn = document.getElementById("settingNetplayServerUrl");
    if (urlIn && typeof Save !== "undefined" && Save.data) {
      urlIn.value = Save.data.netplayServerUrl || "";
      urlIn.addEventListener("change", persistServerUrl);
      urlIn.addEventListener("blur", persistServerUrl);
    }
    const btnClearUrl = document.getElementById("btnClearNetplayServerUrl");
    if (btnClearUrl && urlIn) {
      btnClearUrl.onclick = () => {
        urlIn.value = "";
        persistServerUrl();
      };
    }

    const cb = document.getElementById("settingShowOnlineWaitingOverlay");
    if (cb && typeof Save !== "undefined" && Save.data) {
      cb.checked = Save.data.showOnlineWaitingOverlay !== false;
      cb.onchange = () => {
        Save.data.showOnlineWaitingOverlay = !!cb.checked;
        Save.save();
        if (typeof UI !== "undefined" && UI.updateOnlineWaitingOverlay) {
          UI.updateOnlineWaitingOverlay();
        }
      };
    }

    const btnBack = document.getElementById("btnSettingsBack");
    if (btnBack) btnBack.onclick = () => Scene.set("MainMenu");
  },
});
