const UI = {
    /** Canvas HUD typography (matches CSS --font-sans stack where possible). */
    HUD_FONT: '600 16px "Segoe UI",system-ui,-apple-system,sans-serif',
    HUD_FONT_NAME: '700 17px "Segoe UI",system-ui,-apple-system,sans-serif',
    HUD_FONT_PROGRESS: '600 15px "Segoe UI",system-ui,-apple-system,sans-serif',

    announce(text){
     const el=document.getElementById("announcer");
     if(!el) return;
     el.innerText=text;
     setTimeout(()=>{ if(el) el.innerText=""; },1000);
    },

    updateOnlineWaitingOverlay(){
     const wrap = document.getElementById("onlineWaitingOverlay");
     if(!wrap) return;
     if(typeof Scene !== "undefined" && Scene.getCurrentName && Scene.getCurrentName() !== "Fight"){
      wrap.style.display = "none";
      return;
     }
     if(typeof Game === "undefined" || Game.mode !== "online" || !Netplay || !Netplay.enabled){
      wrap.style.display = "none";
      return;
     }
     if(typeof Save !== "undefined" && Save.data && Save.data.showOnlineWaitingOverlay === false){
      wrap.style.display = "none";
      return;
     }
     if(!Netplay.connected){
      wrap.style.display = "flex";
      const t = document.getElementById("onlineWaitingTitle");
      const s = document.getElementById("onlineWaitingSub");
      const c = document.getElementById("onlineCountdownBig");
      if(t) t.innerText = "Connecting…";
      if(s) s.innerText = "Joining the online match.";
      if(c) c.innerText = "";
      return;
     }
     if(Netplay.matchLive){
      wrap.style.display = "none";
      return;
     }
     wrap.style.display = "flex";
     const title = document.getElementById("onlineWaitingTitle");
     const sub = document.getElementById("onlineWaitingSub");
     const big = document.getElementById("onlineCountdownBig");
     if(!title || !sub || !big) return;

     if(!Netplay.peerPresent){
      title.innerText = "Waiting for opponent";
      sub.innerText = "The match starts once both players are here, then a short countdown runs.";
      big.innerText = "";
      return;
     }

     const end = Netplay.countdownEndMs;
     if(!end){
      title.innerText = "Almost ready";
      sub.innerText = "Synchronizing with the host…";
      big.innerText = "";
      return;
     }

     const msLeft = end - Date.now();
     const sec = Math.max(0, Math.ceil(msLeft / 1000));
     title.innerText = "Everyone is in";
     sub.innerText = "Match begins after both players are in the lobby for a few seconds.";
     if(sec > 0){
      big.innerText = String(sec);
     } else {
      big.innerText = "";
     }
    },
   
    updateCombo(val){
     document.getElementById("combo").innerText =
      val>1 ? "Combo x"+val : "";
    },

    /** In-fight combo text: online guest controls Enemy — show their streak, not host Player's. */
    updateComboFromGame(){
     if(typeof Game === "undefined"){
      this.updateCombo(0);
      return;
     }
     let streak = Game.playerHitStreak | 0;
     if(
      Game.mode === "online" &&
      typeof Netplay !== "undefined" &&
      Netplay.enabled &&
      Netplay.connected &&
      !Netplay.isHost
     ){
      streak = Game.enemyHitStreak | 0;
     }
     this.updateCombo(streak);
    },
   
    updateBars(){
     document.getElementById("hp").style.width =
      (Player.hp/Math.max(1, Player.maxHp)*100)+"%";
   
     document.getElementById("energy").style.width =
      (Player.energy/Math.max(1, Player.maxEnergy)*100)+"%";
    },
   
    lowHP(){
     const game = document.getElementById("game");
     if(Player.hp < 30){
      if(game) game.classList.add("lowHpVignette");
     } else {
      if(game) game.classList.remove("lowHpVignette");
     }
    },

    drawInGameHUD(){
     const online = typeof Game !== "undefined" && Game.mode === "online";
     /** Same row stack (shield track + special) on both sides so online HUD stays aligned. */
     this.drawCornerHUD(Player, { side:"left", showEnergy:true, syncHudLayout: online, accent: Player.color || "#8a2be2" });
     this.drawCornerHUD(Enemy, { side:"right", showEnergy: online, syncHudLayout: online, accent: Enemy.color || "#ff3b3b" });
     this.drawProgressionHUD();
    },

    drawProgressionHUD(){
     const cx = 1920 / 2;
     const pillW = 400;
     const pillH = 40;
     const pillX = cx - pillW / 2;
     const pillY = 16;
     ctx.save();
     ctx.globalAlpha = 0.94;
     ctx.fillStyle = "rgba(8,10,20,0.72)";
     ctx.strokeStyle = "rgba(255,255,255,0.12)";
     ctx.lineWidth = 1;
     if(typeof ctx.roundRect === "function"){
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 12);
      ctx.fill();
      ctx.stroke();
     } else {
      ctx.fillRect(pillX, pillY, pillW, pillH);
     }
     ctx.restore();

     ctx.font = this.HUD_FONT_PROGRESS;
     ctx.textAlign = "center";
     ctx.textBaseline = "middle";
     ctx.fillStyle = "#f0f4ff";
     ctx.fillText(`Lv ${Progression.level}   XP ${Progression.xp}/${Progression.xpToLevel}   Coins ${Progression.coins}`, cx, pillY + pillH / 2);
    },

    drawCornerHUD(entity, opts){
     if(!entity) return;

     const readMeter = (v, fallback = 0) => {
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? Math.max(0, n) : fallback;
     };

     const side = opts?.side === "right" ? "right" : "left";
     const accent = opts?.accent || "#fff";
     const syncHudLayout = !!opts?.syncHudLayout;

     const charTitle = entity.characterName || "Fighter";
     const who = entity === Player
      ? (Player.name || "Player").trim() || "Player"
      : (entity.name || "").trim();
     const name = who ? `${charTitle}  ${who}` : charTitle;

     const hp = typeof entity.hp === "number" ? entity.hp : 0;
     const maxHp = entity === Player ? (Player.maxHp || 100) : (entity.maxHp || 100);
     const shield = typeof entity.shield === "number" ? entity.shield : 0;
     const maxShield = entity === Player ? (Player.maxShield || 0) : (entity.maxShield || 0);

     const showEnergy = !!opts?.showEnergy && (entity === Player || entity === Enemy);
     let energy = 0;
     let maxEnergy = 100;
     if(showEnergy){
      if(entity === Player){
       energy = readMeter(Player.energy, 0);
       maxEnergy = Math.max(1, readMeter(Player.maxEnergy, 100) || 100);
      } else {
       energy = readMeter(Enemy.energy, 0);
       maxEnergy = Math.max(1, readMeter(Enemy.maxEnergy, 100) || 100);
      }
     }

     const shieldRowReserved = maxShield > 0 || syncHudLayout;

     const pad = 18;
     const top = 18;
     const blockW = 560;
     const nameH = 22;
     const barH = 16;
     const gap = 6;

     const blockX = side === "left" ? pad : (1920 - pad - blockW);

     const plateH = nameH + gap + barH + (shieldRowReserved ? (gap + 10) : 0) + (showEnergy ? (gap + 10) : 0) + 16;
     // Backplate
     ctx.save();
     ctx.globalAlpha = 0.94;
     ctx.fillStyle = "rgba(10,12,24,0.78)";
     ctx.strokeStyle = "rgba(255,255,255,0.1)";
     ctx.lineWidth = 1;
     if(typeof ctx.roundRect === "function"){
      ctx.beginPath();
      ctx.roundRect(blockX, top, blockW, plateH, 14);
      ctx.fill();
      ctx.stroke();
     } else {
      ctx.fillRect(blockX, top, blockW, plateH);
     }
     ctx.restore();

     // Name row
     ctx.font = this.HUD_FONT_NAME;
     ctx.textBaseline = "top";
     ctx.textAlign = side === "left" ? "left" : "right";
     ctx.fillStyle = "#f2f5ff";
     ctx.fillText(name, side === "left" ? (blockX + 14) : (blockX + blockW - 14), top + 8);

     // Accent strip
     ctx.fillStyle = accent;
     ctx.globalAlpha = 0.9;
     ctx.fillRect(blockX, top, 8, nameH + 8);
     ctx.globalAlpha = 1;

     // HP bar (Street Fighter style)
     const hpPct = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
     const hpY = top + nameH + gap + 6;
     const hpX = blockX + 14;
     const hpW = blockW - 28;

     // background
     ctx.fillStyle = "rgba(255,255,255,0.14)";
     ctx.fillRect(hpX, hpY, hpW, barH);

     // fill direction: left player fills left->right, right player fills right->left
     const fillW = hpW * hpPct;
     ctx.fillStyle = hpPct < 0.3 ? "#ff3b3b" : "#00e676";
     if(side === "left"){
      ctx.fillRect(hpX, hpY, fillW, barH);
     } else {
      ctx.fillRect(hpX + (hpW - fillW), hpY, fillW, barH);
     }

     // Thin shield + energy markers under HP (optional)
     let markerY = hpY + barH + gap;
     const markerH = 8;

     if(maxShield > 0){
      const shPct = Math.max(0, Math.min(1, shield / Math.max(1, maxShield)));
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(hpX, markerY, hpW, markerH);
      const shW = hpW * shPct;
      ctx.fillStyle = "#49a6ff";
      if(side === "left") ctx.fillRect(hpX, markerY, shW, markerH);
      else ctx.fillRect(hpX + (hpW - shW), markerY, shW, markerH);
      markerY += markerH + gap;
     } else if(syncHudLayout){
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(hpX, markerY, hpW, markerH);
      markerY += markerH + gap;
     }

     if(showEnergy){
      const enPct = Math.max(0, Math.min(1, energy / Math.max(1, maxEnergy)));
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(hpX, markerY, hpW, markerH);
      const enW = hpW * enPct;
      ctx.fillStyle = "#ffd54f";
      if(side === "left") ctx.fillRect(hpX, markerY, enW, markerH);
      else ctx.fillRect(hpX + (hpW - enW), markerY, enW, markerH);
     }
    }
   
   };