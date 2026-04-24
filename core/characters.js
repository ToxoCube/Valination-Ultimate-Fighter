const Characters = {
  /** Used when a fighter has no specialGifPath yet (share Valin FX until you add per-character GIFs). */
  specialGifFallbackPath: "assets/valinspecial.gif",

  roster: [
    { id:"balanced", name:"Valin", color:"#8a2be2", imagePath:"assets/valin.png", spriteScale:3, specialGifPath:"assets/valinspecial.gif", specialGifDurationMs:1200, specialHitW:130, maxHp:110, maxEnergy:100, maxShield:20, specialCost:30, specialDamage:25, specialCooldown:60, specialName:"Arc Burst" },
    { id:"brawler", name:"Rex", color:"#ff9800", imagePath:"assets/rex.png", spriteScale:6, specialGifPath:"assets/breaker.gif", specialGifDurationMs:1250, specialHitW:140, maxHp:140, maxEnergy:80, maxShield:10, specialCost:35, specialDamage:32, specialCooldown:70, specialName:"Breaker" },
    { id:"striker", name:"Nyx", color:"#00bcd4", imagePath:"assets/nyx.png", spriteScale:3, specialGifDurationMs:850, specialHitW:100, maxHp:95, maxEnergy:120, maxShield:15, specialCost:25, specialDamage:20, specialCooldown:45, specialName:"Rapid Slash" },
    { id:"tank", name:"Aegis", color:"#4caf50", imagePath:"assets/aegis.png", spriteScale:3, specialGifDurationMs:1400, specialHitW:115, maxHp:160, maxEnergy:70, maxShield:40, specialCost:40, specialDamage:22, specialCooldown:80, specialName:"Shield Crush" },
  ],

  getById(id){
    return this.roster.find(c => c.id === id) || this.roster[0];
  },

  pickRandomExcludingId(excludeId){
    const pool = this.roster.filter(c => c.id !== excludeId);
    if(pool.length === 0) return this.roster[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }
};

