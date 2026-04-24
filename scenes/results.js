Scene.register("Results", {
  onEnter(params) {
    if (typeof Player !== "undefined" && Player.hideSpecialGif) Player.hideSpecialGif();
    if (typeof Enemy !== "undefined" && Enemy.hideSpecialGif) Enemy.hideSpecialGif();
    if (typeof Effects !== "undefined" && Effects.clearAttackHitMarkers) Effects.clearAttackHitMarkers();

    const overlay = document.getElementById("overlay");
    if (!overlay) return;
    overlay.style.display = "flex";

    if (typeof OnlineChat !== "undefined" && OnlineChat.setOnlineActive) {
      OnlineChat.setOnlineActive(Game.mode === "online");
    }

    const win = !!params?.win;
    const resultEl = document.getElementById("result");
    if (resultEl) {
      resultEl.innerText = win ? "VICTORY" : "DEFEAT";
      resultEl.className = "resultTitle " + (win ? "resultTitle--win" : "resultTitle--lose");
    }

    const round = typeof params?.round === "number" ? params.round : Game.round;
    const maxCombo =
      typeof params?.maxCombo === "number"
        ? params.maxCombo
        : Game.mode === "online" &&
            typeof Netplay !== "undefined" &&
            Netplay.enabled &&
            Netplay.connected &&
            !Netplay.isHost
          ? (Game.enemyMaxCombo | 0)
          : (Game.playerMaxCombo | 0);

    let rewards = null;
    if (win) {
      const onlineGuest =
        Game.mode === "online" &&
        typeof Netplay !== "undefined" &&
        Netplay.enabled &&
        Netplay.connected &&
        !Netplay.isHost;
      if (onlineGuest) {
        try {
          rewards = Progression.reward({ round });
        } catch (e) {
          console.warn("Results guest reward failed", e);
          rewards = null;
        }
      } else {
        rewards = Game.lastRewards || null;
      }
    }

    const rewardText =
      rewards && typeof rewards.coinsGained === "number" && typeof rewards.xpGained === "number"
        ? `   +${rewards.coinsGained} coins   +${rewards.xpGained} xp` +
          (rewards.leveledUp ? `   Level Up! (${rewards.level})` : ``)
        : "";
    const statsEl = document.getElementById("resultStats");
    if (statsEl) statsEl.innerText = `Round: ${round}   Your max combo: ${maxCombo}${rewardText}`;

    const btnRetry = document.getElementById("btnRetry");
    const btnBack = document.getElementById("btnBackToMenu");
    const rematchPanel = document.getElementById("rematchPanel");
    const rematchStatus = document.getElementById("rematchStatus");
    const rematchAcceptRow = document.getElementById("rematchAcceptRow");
    const btnRematchAccept = document.getElementById("btnRematchAccept");
    const btnRematchDecline = document.getElementById("btnRematchDecline");

    const onlineRematch =
      Game.mode === "online" &&
      typeof Netplay !== "undefined" &&
      Netplay.enabled &&
      Netplay.connected;

    function resetRematchOfferUi() {
      if (rematchAcceptRow) rematchAcceptRow.style.display = "none";
      if (btnRetry) {
        btnRetry.disabled = false;
        btnRetry.innerText = onlineRematch ? "Request rematch" : "Retry";
      }
      if (rematchStatus) rematchStatus.textContent = "";
    }

    function showIncomingRematchUi() {
      if (!rematchPanel || !onlineRematch) return;
      rematchPanel.style.display = "block";
      if (rematchAcceptRow) rematchAcceptRow.style.display = "flex";
      const waiting = btnRetry && btnRetry.disabled;
      if (rematchStatus) {
        rematchStatus.textContent = waiting
          ? "Opponent is ready — press Accept to start the rematch."
          : "Opponent requested a rematch.";
      }
      if (btnRetry) btnRetry.disabled = true;
    }

    function goRematchFight() {
      if (typeof Scene !== "undefined" && Scene.getCurrentName && Scene.getCurrentName() === "Fight") {
        return;
      }
      if (typeof Netplay !== "undefined" && Netplay.clearRematchListeners) Netplay.clearRematchListeners();
      const p = Game.rematchFightParams;
      if (!p || !p.online) return;
      const ch = Characters.getById(p.characterId || "balanced");
      Scene.set("Fight", {
        mode: "online",
        online: p.online,
        playerName:
          p.playerName ||
          (typeof Netplay !== "undefined" && Netplay.localName) ||
          "Player",
        character: ch,
        rematch: true
      });
    }

    if (onlineRematch && rematchPanel) {
      rematchPanel.style.display = "block";
      resetRematchOfferUi();
      if (btnRetry) btnRetry.innerText = "Request rematch";

      Netplay.setRematchListeners({
        onOffer: () => {
          if (typeof Netplay !== "undefined") Netplay.pendingRematchOffer = false;
          showIncomingRematchUi();
        },
        onGo: () => {
          goRematchFight();
        },
        onDecline: () => {
          resetRematchOfferUi();
          if (rematchStatus) rematchStatus.textContent = "Opponent declined rematch.";
        }
      });

      if (typeof Netplay !== "undefined" && Netplay.pendingRematchOffer) {
        Netplay.pendingRematchOffer = false;
        showIncomingRematchUi();
      }

      if (btnRematchAccept) {
        btnRematchAccept.onclick = () => {
          Netplay.sendRematchAccept();
        };
      }
      if (btnRematchDecline) {
        btnRematchDecline.onclick = () => {
          Netplay.sendRematchDecline();
          resetRematchOfferUi();
          if (rematchStatus) rematchStatus.textContent = "You declined.";
        };
      }
    } else {
      if (rematchPanel) rematchPanel.style.display = "none";
      if (typeof Netplay !== "undefined" && Netplay.clearRematchListeners) Netplay.clearRematchListeners();
      if (btnRetry) btnRetry.innerText = "Retry";
    }

    if (btnRetry) {
      btnRetry.onclick = () => {
        if (onlineRematch) {
          Netplay.sendRematchOffer();
          btnRetry.disabled = true;
          btnRetry.innerText = "Waiting…";
          if (rematchStatus) {
            rematchStatus.textContent = "Waiting for opponent to accept rematch…";
          }
          if (rematchPanel) rematchPanel.style.display = "block";
        } else {
          Scene.set("Fight", {
            mode: Game.mode || "pvb",
            online: Game.onlineConfig || null,
            playerName: Player.name || "Player",
            character: Characters.getById(Player.characterId || "balanced")
          });
        }
      };
    }

    if (btnBack) {
      btnBack.onclick = () => {
        if (typeof Netplay !== "undefined" && Netplay.clearRematchListeners) Netplay.clearRematchListeners();
        if (typeof Netplay !== "undefined" && Netplay.enabled) Netplay.reset();
        overlay.style.display = "none";
        Scene.set("MainMenu");
      };
    }
  },

  onExit() {
    if (typeof Netplay !== "undefined" && Netplay.clearRematchListeners) {
      Netplay.clearRematchListeners();
    }
  }
});
