const Player = {
    x:300,y:700,w:80,h:120,
    vx:0,vy:0,
    facing:1,
    hp:100,
    energy:100,
    shield:20,
    attacking:false,
    stun:0,
    cooldown:0,
    name:"Player",
    color:"purple",
    maxHp:100,
    maxEnergy:100,
    maxShield:20,
    specialCost:30,
    specialDamage:25,
    specialCooldown:60,
    characterId:"balanced",
    characterName:"Valin",
    imagePath:"",
    spriteScale:1,
    sprite:null,
    specialGifPath:"",
    specialGifDurationMs:1000,
    specialHitW:0,
    _specialGifHideAt:0,
    _specialGifLayout:null,
    _specialGifTriedFallback:false,
    /** Increments each local special (host sends in snapshot for guest overlay). */
    _specialFxSeq:0,
    /** Guest: last specialFxSeq applied from host snapshots. */
    _netAppliedSpecialFxSeq:0,
    _attackFlashSeq:0,
    _netAppliedAttackFlashSeq:0,
    _attackFlashUntil:0,
   
    getSpecialGifEl(){
     let el = document.getElementById("playerSpecialGifOverlay");
     if(!el){
      el = document.createElement("img");
      el.id = "playerSpecialGifOverlay";
      el.alt = "";
      el.draggable = false;
      el.style.position = "absolute";
      el.style.pointerEvents = "none";
      el.style.display = "none";
      el.style.zIndex = "4";
      el.style.objectFit = "contain";
      const game = document.getElementById("game");
      if(game) game.appendChild(el);
     }
     return el;
    },

    hideSpecialGif(){
     this._specialGifHideAt = 0;
     this._specialGifLayout = null;
     this._specialGifTriedFallback = false;
     const el = document.getElementById("playerSpecialGifOverlay");
     if(el){
      el.onerror = null;
      el.onload = null;
      el.style.display = "none";
      el.removeAttribute("src");
     }
    },

    syncSpecialGifOverlay(){
     if(!this.specialGifPath || !this._specialGifHideAt) return;
     if(Date.now() >= this._specialGifHideAt){
      this.hideSpecialGif();
      return;
     }
     const el = this.getSpecialGifEl();
     if(el.style.display === "none") return;
     const L = this._specialGifLayout;
     if(!L) return;
     el.style.left = L.left + "px";
     el.style.top = L.top + "px";
     el.style.width = L.width + "px";
     el.style.height = L.height + "px";
     el.style.transform = L.transform;
     el.style.transformOrigin = L.transformOrigin;
    },

    _mountSpecialGifOverlay(){
     if(!this.specialGifPath) return;
     const el = this.getSpecialGifEl();
     const scale = this.spriteScale || 1;
     const dw = this.w * scale;
     const dh = this.h * scale;
     const dx = this.x + (this.w - dw) / 2;
     const dy = this.y + (this.h - dh);
     const gap = 4;
     const gifW = dw;
     const gifH = dh;
     let left;
     let transform;
     const transformOrigin = "center center";
     if(this.facing >= 0){
      left = dx + dw + gap;
      transform = "none";
     } else {
      left = dx - gap - gifW;
      transform = "scaleX(-1)";
     }
     this._specialGifLayout = {
      left,
      top: dy,
      width: gifW,
      height: gifH,
      transform,
      transformOrigin
     };

     el.style.display = "block";
     el.style.left = left + "px";
     el.style.top = dy + "px";
     el.style.width = gifW + "px";
     el.style.height = gifH + "px";
     el.style.transform = transform;
     el.style.transformOrigin = transformOrigin;

     const primary = this.specialGifPath;
     const fallback = typeof Characters !== "undefined" && Characters.specialGifFallbackPath
      ? Characters.specialGifFallbackPath
      : "";
     const bust = (url) => url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();

     this._specialGifTriedFallback = false;
     el.onerror = () => {
      if(fallback && primary !== fallback && !this._specialGifTriedFallback){
       this._specialGifTriedFallback = true;
       el.src = bust(fallback);
       return;
      }
      el.onerror = null;
      this.hideSpecialGif();
     };
     el.src = bust(primary);
    },

    playSpecialGif(){
     if(!this.specialGifPath) return;
     const ms = Math.max(300, Number(this.specialGifDurationMs) || 1000);
     this._specialGifHideAt = Date.now() + ms;
     this._specialFxSeq = (this._specialFxSeq | 0) + 1;
     this._mountSpecialGifOverlay();
    },

    /** Guest / replay: show special FX without bumping host sequence counter. */
    replaySpecialGifFromNetwork(durationMs){
     if(!this.specialGifPath) return false;
     const ms = Math.max(300, Number(durationMs) || Number(this.specialGifDurationMs) || 1000);
     this._specialGifHideAt = Date.now() + ms;
     this._mountSpecialGifOverlay();
     return true;
    },

    applyLoadout(loadout){
     if(!loadout) return;
     if(loadout.id) this.characterId = loadout.id;
     if(loadout.name) this.characterName = loadout.name;
     if(loadout.color) this.color = loadout.color;
     this.imagePath = loadout.imagePath || "";
     this.spriteScale = loadout.spriteScale || 1;
     const fb = typeof Characters !== "undefined" && Characters.specialGifFallbackPath
      ? Characters.specialGifFallbackPath
      : "";
     this.specialGifPath = loadout.specialGifPath || fb || "";
     this.specialGifDurationMs = loadout.specialGifDurationMs || 1000;
     this.specialHitW = loadout.specialHitW || 0;
     this.sprite = null;
     if(loadout.maxHp) this.maxHp = loadout.maxHp;
     if(loadout.maxEnergy) this.maxEnergy = loadout.maxEnergy;
     if(loadout.maxShield !== undefined) this.maxShield = loadout.maxShield;
     if(loadout.specialCost) this.specialCost = loadout.specialCost;
     if(loadout.specialDamage) this.specialDamage = loadout.specialDamage;
     if(loadout.specialCooldown) this.specialCooldown = loadout.specialCooldown;
    },

    init(){
     this.hp=this.maxHp;
     this.energy=this.maxEnergy;
     this.shield=this.maxShield;
     this.x=300;
     this.facing = 1;
     this.hideSpecialGif();
    },
   
    update(){
   
     if(this.stun>0){
      this.stun--;
      this.syncSpecialGifOverlay();
      return;
     }
   
     this.vx=0;
   
     if(keys["a"]) this.vx=-6;
     if(keys["d"]) this.vx=6;
   
     if(keys["w"] && this.y>=700) this.vy=-18;
   
     this.x+=this.vx;
     this.y+=this.vy;

     // Arena bounds (1920x1080)
     if(this.x < 0) this.x = 0;
     if(this.x + this.w > 1920) this.x = 1920 - this.w;
   
     this.vy+=1;
   
     if(this.y>700){
      this.y=700;
      this.vy=0;
     }

     // Face move direction immediately for responsive sprite flipping
     if(this.vx > 0) this.facing = 1;
     else if(this.vx < 0) this.facing = -1;
   
     // ATTACK (only when overlapping opponent — same logic box as combat)
     if(keys["j"] && !this.attacking && Combat.canLightAttackHit(this, Enemy)){
      this.attacking=true;
      setTimeout(()=>this.attacking=false,200);
      this._attackFlashSeq = (this._attackFlashSeq | 0) + 1;
      this._attackFlashUntil = Date.now() + 220;
      Combat.attack(this, Enemy, 10, { hitMarker: true, lightAttack: true });
     }
   
     // ABILITY
     if(keys["k"] && this.energy>=this.specialCost && this.cooldown<=0){
      this.energy-=this.specialCost;
      this.cooldown=this.specialCooldown;
   
      UI.announce("SPECIAL!");
      this.playSpecialGif();
   
      Combat.attack(this, Enemy, this.specialDamage, {
       hitMarker: true,
       useGifSpecialHitbox: true
      });
     }
   
     if(this.cooldown>0) this.cooldown--;
   
     this.syncSpecialGifOverlay();

     UI.updateBars();
     UI.lowHP();
    },
   
    draw(){
     if(this.imagePath){
      if(!this.sprite){
       this.sprite = new Image();
       this.sprite.src = this.imagePath;
      }
      if(this.sprite.complete && this.sprite.naturalWidth > 0){
       const scale = this.spriteScale || 1;
       const maxW = this.w * scale;
       const maxH = this.h * scale;
       const nw = this.sprite.naturalWidth;
       const nh = this.sprite.naturalHeight;
       const k = Math.min(maxW / nw, maxH / nh);
       const dw = nw * k;
       const dh = nh * k;
       const dx = this.x + (this.w - dw) / 2;
       const dy = this.y + (this.h - dh);
       ctx.save();
       if(this.facing < 0){
        // Mirror sprite when facing left
        ctx.translate(dx + dw, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(this.sprite, 0, 0, nw, nh, 0, dy, dw, dh);
       } else {
        ctx.drawImage(this.sprite, 0, 0, nw, nh, dx, dy, dw, dh);
       }
       ctx.restore();
       if(Date.now() < (this._attackFlashUntil | 0)){
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#fffef5";
        ctx.fillRect(dx, dy, dw, dh);
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 3;
        ctx.strokeRect(dx + 1.5, dy + 1.5, dw - 3, dh - 3);
        ctx.restore();
       }
       return;
      }
     }

     ctx.fillStyle=this.color || "purple";
     ctx.fillRect(this.x,this.y,this.w,this.h);
     if(Date.now() < (this._attackFlashUntil | 0)){
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#fffef5";
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.restore();
     }
    }
   };