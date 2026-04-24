const Game = {
    /** Current hit streak for host-side fighter (Player). */
    playerHitStreak:0,
    /** Current hit streak for guest-side fighter (Enemy). */
    enemyHitStreak:0,
    /** Highest streak this match — Player's hits. */
    playerMaxCombo:0,
    /** Highest streak this match — Enemy's hits. */
    enemyMaxCombo:0,
    round:1,
    ended:false,
    mode:"pvb",
    onlineConfig:null,
    /** Saved after online fights for rematch / results (characterId + online cfg + name). */
    rematchFightParams:null,
    arenaBg:null,
    arenaPath:"assets/arena1.png",

    loadArenaBackground(){
     if(this.arenaBg && this.arenaBg.complete && this.arenaBg.naturalWidth > 0) return;
     const paths = [
      "assets/arena1.png",
      "assets/Arena1.png",
      "./assets/arena1.png",
      "arena1.png"
     ];
     const tryPath = (i) => {
      if(i >= paths.length) return;
      const img = new Image();
      img.onload = () => {
       this.arenaBg = img;
       if(typeof img.decode === "function"){
        img.decode().catch(()=>{});
       }
      };
      img.onerror = () => tryPath(i + 1);
      img.src = paths[i];
     };
     tryPath(0);
    },
   
    init(){
     this.ended = false;
     this._resultsTransitionQueued = false;
     this.lastRewards = null;
     this.playerHitStreak = 0;
     this.enemyHitStreak = 0;
     this.playerMaxCombo = 0;
     this.enemyMaxCombo = 0;
     if(typeof UI !== "undefined" && UI.updateComboFromGame) UI.updateComboFromGame();
     document.getElementById("overlay").style.display="none";
     const gameEl = document.getElementById("game");
     if(gameEl) gameEl.classList.remove("lowHpVignette");
     this.loadArenaBackground();
     Player.init();
     Player._specialFxSeq = 0;
     Player._netAppliedSpecialFxSeq = 0;
     Player._attackFlashSeq = 0;
     Player._netAppliedAttackFlashSeq = 0;
     Player._attackFlashUntil = 0;
     Effects.clearAttackHitMarkers();
     Effects.preloadAttackHitGif();
     if(typeof Enemy !== "undefined" && Enemy.hideSpecialGif) Enemy.hideSpecialGif();
     Enemy._specialFxSeq = 0;
     Enemy._netAppliedSpecialFxSeq = 0;
     Enemy._attackFlashSeq = 0;
     Enemy._netAppliedAttackFlashSeq = 0;
     Enemy._attackFlashUntil = 0;
     Enemy.spawn();
     if(this.mode === "online"){
      UI.announce("");
     } else {
      UI.announce("FIGHT!");
     }
    },
   
    update(){
     if(this.ended){
      if(this.mode === "online" && typeof Netplay !== "undefined" && Netplay.enabled && Netplay.connected && Netplay.isHost){
       Netplay.sendSnapshotFromGame();
      }
      return;
     }

     if(this.mode === "online"){
      if(Netplay.enabled && Netplay.connected){
       if(Netplay.isHost){
        const wasMatchLive = Netplay.matchLive;
        if(Netplay.peerPresent && Netplay.countdownEndMs > 0){
         Netplay.matchLive = Date.now() >= Netplay.countdownEndMs;
        } else {
         Netplay.matchLive = false;
        }
        if(!wasMatchLive && Netplay.matchLive && typeof OnlineChat !== "undefined" && OnlineChat.refresh){
         OnlineChat.refresh();
        }
        if(Netplay.matchLive && !Netplay._announcedFight){
         Netplay._announcedFight = true;
         UI.announce("FIGHT!");
        }
        if(!Netplay.matchLive){
         Netplay.guestInput = {};
        }
        if(Netplay.matchLive){
         Player.update();
         Enemy.update();
         Effects.update();
         if(Player.hp <= 0) this.end(false);
         if(Enemy.hp <= 0) this.end(true);
        }
        Netplay.sendSnapshotFromGame();
       } else {
        Netplay.sendInputFromKeys(keys);
        Netplay.applySnapshotToGame();
        if(Netplay.matchLive && !Netplay._announcedFight){
         Netplay._announcedFight = true;
         UI.announce("FIGHT!");
        }
        if(Netplay.matchLive){
         Effects.update();
        }
        Player.syncSpecialGifOverlay();
        Enemy.syncSpecialGifOverlay();
        UI.updateBars();
        UI.lowHP();
       }
      }
      if(Netplay.enabled && typeof UI.updateOnlineWaitingOverlay === "function"){
       UI.updateOnlineWaitingOverlay();
      }
      return;
     }

     Player.update();
     Enemy.update();
     Effects.update();
   
     if(Player.hp <= 0){
      this.end(false);
     }
   
     if(Enemy.hp <= 0){
      this.end(true);
     }
    },
   
    draw(){
     if(this.arenaBg && this.arenaBg.complete && this.arenaBg.naturalWidth > 0){
      ctx.drawImage(this.arenaBg, 0, 0, 1920, 1080);
     } else {
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, 1920, 1080);
     }
     Enemy.draw();
     Player.draw();
     Effects.draw();
     UI.drawInGameHUD();
    },
   
    end(win){
     if(this.ended) return;
     this.ended = true;
     if(this.mode === "online" && typeof Netplay !== "undefined" && Netplay.isHost){
      Netplay._lastSnapshotSentAt = 0;
     }
   
     try{
      if(win){
       this.lastRewards = Progression.reward({ round: this.round });
       this.round++;
      } else {
       this.lastRewards = null;
       this.round = 1;
      }
     } catch(e){
      console.warn("Game.end reward/save failed", e);
      this.lastRewards = null;
      if(win) this.round++;
      else this.round = 1;
     }
    },

    /** Host only: apply the guest's character and stats to Enemy when they join. */
    applyOnlineEnemyFromPeer(){
     if(this.mode !== "online" || typeof Netplay === "undefined" || !Netplay.isHost) return;
     if(typeof Enemy === "undefined" || typeof Characters === "undefined") return;
     const id = Netplay.peerCharacterId || "balanced";
     const c = Characters.getById(id);
     if(!c) return;
     Enemy.applyLoadout(c);
     const ps = Netplay.peerStats;
     if(ps){
      if(typeof ps.maxHp === "number") Enemy.maxHp = ps.maxHp;
      if(typeof ps.maxEnergy === "number") Enemy.maxEnergy = ps.maxEnergy;
      if(typeof ps.maxShield === "number") Enemy.maxShield = ps.maxShield;
      if(typeof ps.specialCost === "number") Enemy.specialCost = ps.specialCost;
     }
     Enemy.name = (Netplay.peerName || "Player").trim().slice(0, 24) || "Player";
     if(typeof Enemy.spawn === "function") Enemy.spawn();
    }
   };