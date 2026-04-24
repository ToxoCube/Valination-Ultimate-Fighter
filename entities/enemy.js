const Enemy = {
    x:1400,y:700,w:80,h:120,
    vx:0,vy:0,
    hp:100,
    energy:100,
    shield:0,
    stun:0,
    cooldown:0,
    facing:-1,
    maxHp:100,
    maxEnergy:100,
    maxShield:0,
    specialCost:30,
    specialDamage:14,
    specialCooldown:50,
    color:"#ff3b3b",
    characterId:"balanced",
    characterName:"Valin",
    imagePath:"",
    spriteScale:1,
    sprite:null,
    netInput:{},
    attacking:false,
    specialGifPath:"",
    specialGifDurationMs:1000,
    specialHitW:0,
    _specialGifHideAt:0,
    _specialGifLayout:null,
    _specialGifTriedFallback:false,
    _specialFxSeq:0,
    _netAppliedSpecialFxSeq:0,
    _attackFlashSeq:0,
    _netAppliedAttackFlashSeq:0,
    _attackFlashUntil:0,

    getSpecialGifEl(){
     let el = document.getElementById("enemySpecialGifOverlay");
     if(!el){
      el = document.createElement("img");
      el.id = "enemySpecialGifOverlay";
      el.alt = "";
      el.draggable = false;
      el.style.position = "absolute";
      el.style.pointerEvents = "none";
      el.style.display = "none";
      el.style.zIndex = "5";
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
     const el = document.getElementById("enemySpecialGifOverlay");
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
     if(loadout.maxEnergy !== undefined) this.maxEnergy = loadout.maxEnergy;
     if(loadout.maxShield !== undefined) this.maxShield = loadout.maxShield;
     if(loadout.specialCost) this.specialCost = loadout.specialCost;
     if(loadout.specialDamage) this.specialDamage = loadout.specialDamage;
     if(loadout.specialCooldown) this.specialCooldown = loadout.specialCooldown;
     if(typeof this.maxEnergy === "number") this.energy = this.maxEnergy;
    },

    spawn(){
     this.hp = (this.maxHp || 100) + ((Game.mode === "online") ? 0 : Game.round * 10);
     this.x = 1400;
     this.vx = 0;
     this.vy = 0;
     this.shield = this.maxShield || 0;
     this.cooldown = 0;
     this.facing = -1;
     this.attacking = false;
     this.netInput = {};
     if(typeof this.maxEnergy === "number"){
      this.energy = this.maxEnergy;
     }
    },

    updateFromInput(input){
     const k = input || {};
     if(this.stun>0){
      this.stun--;
      this.syncSpecialGifOverlay();
      return;
     }

     this.vx = 0;
     if(k.a) this.vx = -6;
     if(k.d) this.vx = 6;
     if(k.w && this.y>=700) this.vy = -18;

     this.x += this.vx;
     this.y += this.vy;
     if(this.x < 0) this.x = 0;
     if(this.x + this.w > 1920) this.x = 1920 - this.w;

     this.vy += 1;
     if(this.y > 700){
      this.y = 700;
      this.vy = 0;
     }

     if(this.vx > 0) this.facing = 1;
     else if(this.vx < 0) this.facing = -1;

     if(k.j && !this.attacking && this.cooldown <= 0 && Combat.canLightAttackHit(this, Player)){
      this.attacking = true;
      setTimeout(() => {
       this.attacking = false;
      }, 200);
      this.attack();
      this.cooldown = 18;
     }

     if(k.k && this.cooldown <= 0){
      const cost = Math.max(5, this.specialCost || 30);
      if(typeof this.energy === "number" && this.energy >= cost){
       this.energy -= cost;
       const dmg = typeof this.specialDamage === "number" ? this.specialDamage : 14;
       const cd = typeof this.specialCooldown === "number" ? this.specialCooldown : 50;
       UI.announce("SPECIAL!");
       this.playSpecialGif();
       Combat.attack(this, Player, dmg, {
        hitMarker: true,
        useGifSpecialHitbox: true
       });
       this.cooldown = cd;
      }
     }

     if(this.cooldown > 0) this.cooldown--;
     this.syncSpecialGifOverlay();
    },
   
    update(){
     if(Game.mode === "online"){
      if(Netplay.isHost){
       this.updateFromInput(Netplay.guestInput);
      }
      return;
     }
   
     if(this.stun>0){
      this.stun--;
      return;
     }
   
     // Simple but fair PvB AI: approach to ideal range, then attack on cooldown
     const dx = (Player.x + Player.w/2) - (this.x + this.w/2);
     const dist = Math.abs(dx);
     this.facing = dx >= 0 ? 1 : -1;
 
     const idealMin = 110;
     const idealMax = 180;
     const speed = 2.4;
 
     if(dist > idealMax){
      this.x += Math.sign(dx) * speed;
     } else if(dist < idealMin){
      this.x -= Math.sign(dx) * speed;
     }

     // Arena bounds (1920x1080)
     if(this.x < 0) this.x = 0;
     if(this.x + this.w > 1920) this.x = 1920 - this.w;

     if(this.cooldown > 0) this.cooldown--;
   
     const wantsAttack = Combat.canLightAttackHit(this, Player) && this.cooldown <= 0 && Math.random() < 0.06;
     if(wantsAttack){
      this.attack();
     }
    },
   
    attack(){
     this.cooldown = 24;
     this._attackFlashSeq = (this._attackFlashSeq | 0) + 1;
     this._attackFlashUntil = Date.now() + 220;
     Combat.attack(this, Player, 8, { hitMarker: true, lightAttack: true });
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

     ctx.fillStyle=this.color || "red";
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