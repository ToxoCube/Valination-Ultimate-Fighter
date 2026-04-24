const Save = (() => {
    const defaults = {
     coins:0,
     xp:0,
     level:1,
     upgrades:{},
     xpToLevel:100
    };

    function sanitizeMerged(d){
     const out = { ...defaults, ...d };
     if(!out.upgrades || typeof out.upgrades !== "object") out.upgrades = {};
     out.coins = Math.max(0, Math.floor(Number(out.coins)) || 0);
     out.xp = Math.max(0, Math.floor(Number(out.xp)) || 0);
     out.level = Math.max(1, Math.floor(Number(out.level)) || 1);
     // xpToLevel must stay >= 1 or Progression.reward() can infinite-loop on win
     out.xpToLevel = Math.max(1, Math.floor(Number(out.xpToLevel)) || defaults.xpToLevel);
     return out;
    }

    function readSaveData(){
     try{
      const raw = localStorage.getItem("save");
      if(raw == null || raw === "") return { ...defaults };
      const o = JSON.parse(raw);
      if(!o || typeof o !== "object") return { ...defaults };
      if(!o.upgrades || typeof o.upgrades !== "object") o.upgrades = {};
      return sanitizeMerged(o);
     } catch(e){
      console.warn("Save data unreadable; using defaults.", e);
      return { ...defaults };
     }
    }

    return {
     data: readSaveData(),

     save(){
      try{
       localStorage.setItem("save", JSON.stringify(this.data));
      } catch(e){
       console.warn("Save write failed.", e);
      }
     }
    };
   })();
