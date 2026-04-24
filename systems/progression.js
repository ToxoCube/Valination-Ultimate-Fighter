const Progression = {
    coins:0,
    xp:0,
    level:1,
    xpToLevel: 100,

    requiredXpForLevel(level){
     const lv = Math.max(1, Number(level) || 1);
     return 100 + (lv - 1) * 25;
    },
   
    load(){
     const d = Save?.data || {};
     if(!d.upgrades) d.upgrades = {};
     this.coins = Math.max(0, Number(d.coins) || 0);
     this.xp = Math.max(0, Number(d.xp) || 0);
     this.level = Math.max(1, Math.floor(Number(d.level)) || 1);
     this.xpToLevel = Math.max(1, this.requiredXpForLevel(this.level));
    },

    save(){
     if(!Save?.data) return;
     Save.data.coins = this.coins;
     Save.data.xp = this.xp;
     Save.data.level = this.level;
      Save.data.xpToLevel = this.xpToLevel;
     Save.save();
    },

    reward({ round }){
     // v1 rewards: scale slightly by round
     const r = Math.max(1, Number(round) || 1);
     const coinsGained = 50 + (r - 1) * 10;
     const xpGained = 20 + (r - 1) * 5;

     this.coins += coinsGained;
     this.xp += xpGained;
     this.xpToLevel = Math.max(1, Number(this.xpToLevel) || this.requiredXpForLevel(this.level));
   
     let leveledUp = false;
     let guard = 0;
     while(this.xp >= this.xpToLevel && guard++ < 500){
      this.level++;
      this.xp -= this.xpToLevel;
      this.xpToLevel = Math.max(1, this.requiredXpForLevel(this.level));
      leveledUp = true;
     }
   
     if(leveledUp) UI.announce("LEVEL UP!");
     this.save();
   
     return { coinsGained, xpGained, leveledUp, level: this.level, xp: this.xp, xpToLevel: this.xpToLevel };
    }
   };