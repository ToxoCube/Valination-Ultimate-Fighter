const Effects = {

    _nums: [],
    _sparks: [],
    attackHitGifPath:"assets/attack.gif",
    attackHitMarkerSize:72,
    attackHitMarkerDurationMs:320,
    _attackHitHideTimer:null,

    getAttackHitMarkerEl(){
     let el = document.getElementById("attackHitMarkerOverlay");
     if(!el){
      el = document.createElement("img");
      el.id = "attackHitMarkerOverlay";
      el.alt = "";
      el.draggable = false;
      el.style.position = "absolute";
      el.style.pointerEvents = "none";
      el.style.display = "none";
      el.style.zIndex = "25";
      el.style.objectFit = "contain";
      const game = document.getElementById("game");
      if(game) game.appendChild(el);
     }
     return el;
    },

    preloadAttackHitGif(){
     const pre = new Image();
     pre.src = this.attackHitGifPath;
    },

    showAttackHitMarker(x, y){
     const el = this.getAttackHitMarkerEl();
     const size = this.attackHitMarkerSize || 72;
     const ms = Math.max(120, Number(this.attackHitMarkerDurationMs) || 320);
     if(this._attackHitHideTimer){
      clearTimeout(this._attackHitHideTimer);
      this._attackHitHideTimer = null;
     }
     el.style.display = "block";
     el.style.left = (x - size / 2) + "px";
     el.style.top = (y - size / 2) + "px";
     el.style.width = size + "px";
     el.style.height = size + "px";
     el.style.transform = "none";
     el.onerror = () => {
      el.onerror = null;
      el.style.display = "none";
     };
     el.src = this.attackHitGifPath + (this.attackHitGifPath.includes("?") ? "&" : "?") + "t=" + Date.now();
     this._attackHitHideTimer = setTimeout(() => {
      this._attackHitHideTimer = null;
      el.onerror = null;
      el.style.display = "none";
      el.removeAttribute("src");
     }, ms);
    },

    clearAttackHitMarkers(){
     if(this._attackHitHideTimer){
      clearTimeout(this._attackHitHideTimer);
      this._attackHitHideTimer = null;
     }
     const el = document.getElementById("attackHitMarkerOverlay");
     if(el){
      el.onerror = null;
      el.style.display = "none";
      el.removeAttribute("src");
     }
    },

    damage(x,y,val,isCrit){
     // Street Fighter-ish: outlined number, quick pop, slight drift
     const n = {
      x, y,
      vx: (Math.random() * 2 - 1) * 0.6,
      vy: -1.8 - Math.random() * 0.8,
      life: 38,
      maxLife: 38,
      val: Math.round(val),
      crit: !!isCrit
     };
     this._nums.push(n);
    },

    hitSpark(x,y){
     const s = { x, y, life: 10, maxLife: 10 };
     this._sparks.push(s);
    },

    update(){
     for(let i=this._nums.length-1;i>=0;i--){
      const n=this._nums[i];
      n.x += n.vx;
      n.y += n.vy;
      n.vy += 0.06;
      n.life--;
      if(n.life<=0) this._nums.splice(i,1);
     }
     for(let i=this._sparks.length-1;i>=0;i--){
      const s=this._sparks[i];
      s.life--;
      if(s.life<=0) this._sparks.splice(i,1);
     }
    },

    draw(){
     // Sparks (small star burst)
     for(const s of this._sparks){
      const t = s.life / s.maxLife;
      const r = 18 * (1 - t) + 6;
      ctx.save();
      ctx.globalAlpha = 0.9 * t;
      ctx.translate(s.x, s.y);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let k=0;k<8;k++){
       const a = (Math.PI*2) * (k/8);
       const x1 = Math.cos(a) * (r*0.35);
       const y1 = Math.sin(a) * (r*0.35);
       const x2 = Math.cos(a) * r;
       const y2 = Math.sin(a) * r;
       ctx.moveTo(x1,y1);
       ctx.lineTo(x2,y2);
      }
      ctx.stroke();
      ctx.restore();
     }

     // Damage numbers
     ctx.textAlign = "center";
     ctx.textBaseline = "middle";
     for(const n of this._nums){
      const t = n.life / n.maxLife;
      const pop = t > 0.85 ? 1.25 : 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 1.2);
      ctx.translate(n.x, n.y);
      ctx.scale(pop, pop);
      ctx.font = n.crit ? "bold 28px Arial" : "bold 22px Arial";
      const fill = n.crit ? "#ffd54f" : "#ffffff";
      ctx.lineWidth = n.crit ? 6 : 5;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.fillStyle = fill;
      const text = String(n.val);
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
     }
    },
   
    hitFlash(){
     document.body.style.filter="brightness(1.5)";
     setTimeout(()=>document.body.style.filter="none",100);
    }
   
   };