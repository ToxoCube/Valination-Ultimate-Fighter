Scene.register("Fight", {
  onEnter(params) {
    const menuRoot = document.getElementById("menuRoot");
    if (menuRoot) menuRoot.style.display = "none";
    document.getElementById("overlay").style.display = "none";
    const bars = document.getElementById("bars");
    if (bars) bars.style.display = "none";

    Game.mode = params?.mode || "pvb";
    Game.onlineConfig = params?.online || null;

    // Basic v1 cosmetics; gameplay systems can read these later.
    Player.name = params?.playerName || "Player";
    const selectedCharacter = params?.character || Characters.getById(Player.characterId || "balanced");
    Player.applyLoadout(selectedCharacter);
    if (!(Game.mode === "online" && params?.rematch)) {
      Enemy.name = "";
    }
    const playerId = Player.characterId || params?.character?.id;
    if (Game.mode === "online" && !params?.rematch) {
      Enemy.applyLoadout(Characters.getById("balanced"));
    } else if (Game.mode !== "online") {
      const botChar = Characters.pickRandomExcludingId(playerId);
      Enemy.applyLoadout(botChar);
    }

    // Apply shop upgrades (persistent)
    const bonuses = ShopData.getTotalBonuses();
    Player.maxHp = selectedCharacter.maxHp + bonuses.hp;
    Player.maxEnergy = selectedCharacter.maxEnergy + bonuses.energy;
    Player.maxShield = selectedCharacter.maxShield + bonuses.shield;
    Player.specialCost = Math.max(5, selectedCharacter.specialCost - bonuses.specialCostReduction);

    if (Game.mode === "online") {
      const cfg = params?.online || {};
      const reuseSocket =
        !!params?.rematch &&
        typeof Netplay !== "undefined" &&
        Netplay.enabled &&
        Netplay.connected &&
        Netplay.socket &&
        Netplay.socket.readyState === WebSocket.OPEN;
      if (reuseSocket) {
        Netplay.prepareRematch();
        if (Netplay.peerName) {
          Enemy.name = String(Netplay.peerName).trim().slice(0, 24) || "Player";
        }
      } else {
        Netplay.start(
          {
            serverUrl: cfg.serverUrl,
            room: cfg.room,
            preferHost: !!cfg.preferHost,
            matchmake: !!cfg.matchmake,
            playerName: Player.name,
            characterId: Player.characterId,
            fighter: {
              maxHp: Player.maxHp,
              maxEnergy: Player.maxEnergy,
              maxShield: Player.maxShield,
              specialCost: Player.specialCost
            }
          },
          () => {
            /* Waiting / role messaging is handled by the online lobby overlay. */
          },
          (err) => {
            UI.announce("ONLINE ERROR");
            console.warn(err);
          }
        );
      }
    }

    if (Game.mode === "online") {
      const rematchName =
        params?.playerName != null && String(params.playerName).trim() !== ""
          ? String(params.playerName).trim().slice(0, 24)
          : (typeof Netplay !== "undefined" && Netplay.localName
              ? String(Netplay.localName).trim().slice(0, 24)
              : "Player");
      Game.rematchFightParams = {
        online: params?.online || Game.onlineConfig,
        playerName: rematchName,
        characterId: selectedCharacter.id
      };
    }

    Game.init();

    if (typeof OnlineChat !== "undefined" && OnlineChat.setOnlineActive) {
      OnlineChat.setOnlineActive(Game.mode === "online");
    }
  },

  update() {
    Game.update();
    if (Game.ended && Scene.getCurrentName() === "Fight" && !Game._resultsTransitionQueued) {
      Game._resultsTransitionQueued = true;
      /** PvB / online host: you are Player, you win when Enemy (opponent) is KO'd. Online guest: you are Enemy; host is Player — you win when Player (host) is KO'd. */
      const localWin =
        Game.mode === "online" && typeof Netplay !== "undefined" && Netplay.enabled && Netplay.connected && !Netplay.isHost
          ? Player.hp <= 0
          : Enemy.hp <= 0;
      const localMaxCombo =
        Game.mode === "online" && typeof Netplay !== "undefined" && Netplay.enabled && Netplay.connected && !Netplay.isHost
          ? (Game.enemyMaxCombo | 0)
          : (Game.playerMaxCombo | 0);
      const payload = {
        win: localWin,
        round: Game.round,
        maxCombo: localMaxCombo
      };
      queueMicrotask(() => {
        try {
          if (Game.ended && Scene.getCurrentName() === "Fight") {
            Scene.set("Results", payload);
          }
        } finally {
          Game._resultsTransitionQueued = false;
        }
      });
    }
  },

  draw() {
    Game.draw();
  },
});

