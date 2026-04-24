const Combat = {

    /** Same layout as fighter special GIF overlay (`_mountSpecialGifOverlay`). */
    gifSpecialHitbox(attacker){
     if(!attacker) return null;
     const w = typeof attacker.w === "number" ? attacker.w : 80;
     const h = typeof attacker.h === "number" ? attacker.h : 120;
     const scale = attacker.spriteScale || 1;
     const dw = w * scale;
     const dh = h * scale;
     const dx = attacker.x + (w - dw) / 2;
     const dy = attacker.y + (h - dh);
     const gap = 4;
     const gifW = dw;
     const gifH = dh;
     const facing = typeof attacker.facing === "number" ? attacker.facing : 1;
     if(facing >= 0){
      return { x: dx + dw + gap, y: dy, w: gifW, h: gifH };
     }
     return { x: dx - gap - gifW, y: dy, w: gifW, h: gifH };
    },

    /**
     * In front of scaled sprite, full sprite height — aligns light attacks with art.
     * Punch side follows the **opponent** when `target` is passed, so hits register in melee even if walk-facing flipped.
     */
    lightAttackHitbox(attacker, target){
     if(!attacker) return null;
     const w = typeof attacker.w === "number" ? attacker.w : 80;
     const h = typeof attacker.h === "number" ? attacker.h : 120;
     const scale = attacker.spriteScale || 1;
     const dw = w * scale;
     const dh = h * scale;
     const dx = attacker.x + (w - dw) / 2;
     const dy = attacker.y + (h - dh);
     let facing = typeof attacker.facing === "number" ? attacker.facing : 1;
     if(target && typeof target.x === "number" && typeof target.w === "number"){
      const acx = attacker.x + w / 2;
      const tcx = target.x + (typeof target.w === "number" ? target.w : 80) / 2;
      facing = tcx >= acx ? 1 : -1;
     }
     const gap = 2;
     const punchW = Math.max(96, Math.round(dw * 0.32));
     if(facing >= 0){
      return { x: dx + dw + gap, y: dy, w: punchW, h: dh };
     }
     return { x: dx - gap - punchW, y: dy, w: punchW, h: dh };
    },

    /** True if the light-attack punch rect overlaps the target (melee reach, not full-body overlap). */
    canLightAttackHit(attacker, target){
     if(!attacker || !target) return false;
     const box = this.lightAttackHitbox(attacker, target);
     if(!box || typeof box.x !== "number") return false;
     return this.hit(box, target);
    },

    attack(attacker, target, baseDamage, opts){
   
     const facing = typeof attacker.facing === "number"
      ? attacker.facing
      : ((target.x + target.w/2) - (attacker.x + attacker.w/2) >= 0 ? 1 : -1);

     let hitbox;
     const gifR = opts && opts.useGifSpecialHitbox ? this.gifSpecialHitbox(attacker) : null;
     const punchR = opts && opts.lightAttack ? this.lightAttackHitbox(attacker, target) : null;
     /** Light attacks: knockback matches punch direction (toward target), not walk-facing. */
     let knockFacing = facing;
     if(opts && opts.lightAttack && target && typeof target.x === "number"){
      const aw = typeof attacker.w === "number" ? attacker.w : 80;
      const tw = typeof target.w === "number" ? target.w : 80;
      const acx = attacker.x + aw / 2;
      const tcx = target.x + tw / 2;
      knockFacing = tcx >= acx ? 1 : -1;
     }
     if(gifR && typeof gifR.x === "number" && typeof gifR.w === "number" && typeof gifR.h === "number"){
      hitbox = {
       x: gifR.x,
       y: gifR.y,
       w: Math.max(1, gifR.w),
       h: Math.max(1, gifR.h)
      };
     } else if(punchR && typeof punchR.x === "number" && typeof punchR.w === "number" && typeof punchR.h === "number"){
      hitbox = {
       x: punchR.x,
       y: punchR.y,
       w: Math.max(1, punchR.w),
       h: Math.max(1, punchR.h)
      };
     } else {
      const hw = opts && typeof opts.hitW === "number" ? opts.hitW : 60;
      const hh = opts && typeof opts.hitH === "number" ? opts.hitH : 100;
      const hitOffsetX = facing >= 0 ? attacker.w : -hw;
      hitbox = {
       x: attacker.x + hitOffsetX,
       y: attacker.y,
       w: hw,
       h: hh
      };
     }
   
     if(!this.hit(hitbox, target)) return;
   
     let damage = baseDamage;
   
     // CRIT
     let crit = false;
     if(Math.random() < 0.2){
      damage *= 2;
      crit = true;
      UI.announce("CRIT!");
     }
   
     // SHIELD
     const shield = typeof target.shield === "number" ? target.shield : 0;
     if(shield > 0){
      let absorbed = Math.min(shield, damage);
      target.shield = shield - absorbed;
      damage -= absorbed;
     }
   
     target.hp -= damage;
   
     // KNOCKBACK
     if(typeof target.vx !== "number") target.vx = 0;
     target.vx += knockFacing >= 0 ? 6 : -6;
   
     // HITSTUN
     target.stun = 15;
   
     // EFFECTS (same impact point as sparks / damage numbers)
     const hitFxOffsetY = -60;
     const fxX = target.x + target.w/2;
     const fxY = target.y + hitFxOffsetY;
     Effects.damage(fxX, fxY, damage, crit);
     Effects.hitSpark(fxX, fxY);
     if(opts && (opts.hitMarker || opts.lightAttack)){
      Effects.showAttackHitMarker(fxX, fxY);
     }
     Effects.hitFlash();
   
     // COMBO — separate streaks per fighter; HUD shows local human's streak (P1 / online host = Player).
     if(attacker === Player){
      Game.playerHitStreak = (Game.playerHitStreak | 0) + 1;
      Game.enemyHitStreak = 0;
      Game.playerMaxCombo = Math.max(Game.playerMaxCombo | 0, Game.playerHitStreak);
     } else {
      Game.enemyHitStreak = (Game.enemyHitStreak | 0) + 1;
      Game.playerHitStreak = 0;
      Game.enemyMaxCombo = Math.max(Game.enemyMaxCombo | 0, Game.enemyHitStreak);
     }
     if(typeof UI !== "undefined" && UI.updateComboFromGame) UI.updateComboFromGame();
   
    },
   
    hit(a,b){
     return a.x < b.x+b.w &&
            a.x+a.w > b.x &&
            a.y < b.y+b.h &&
            a.y+a.h > b.y;
    },

    /** True when fighter logic boxes overlap (touching / in contact). */
    areFightersTouching(a, b){
     if(!a || !b) return false;
     return this.hit(a, b);
    }
   
   };