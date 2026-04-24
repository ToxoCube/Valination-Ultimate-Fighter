const ShopData = {
  upgrades: [
    { id: "hp1", name: "Vitality", statLabel: "Max HP", bonusPerRank: 15, baseCost: 120, stepCost: 70 },
    { id: "en1", name: "Battery", statLabel: "Max Energy", bonusPerRank: 15, baseCost: 120, stepCost: 70 },
    { id: "sh1", name: "Guard", statLabel: "Max Shield", bonusPerRank: 10, baseCost: 140, stepCost: 80 },
    { id: "sp1", name: "Focus", statLabel: "Special Cost", bonusPerRank: -3, baseCost: 160, stepCost: 90 },
  ],

  getRanks() {
    const src = Save?.data?.upgrades || {};
    const out = {};
    for (const u of this.upgrades) out[u.id] = Math.max(0, Number(src[u.id]) || 0);
    return out;
  },

  setRank(id, rank) {
    Save.data.upgrades = Save.data.upgrades || {};
    Save.data.upgrades[id] = Math.max(0, Number(rank) || 0);
  },

  getCostForRank(upgrade, currentRank) {
    return upgrade.baseCost + upgrade.stepCost * currentRank;
  },

  getTotalBonuses(ranks) {
    const r = ranks || this.getRanks();
    return {
      hp: (r.hp1 || 0) * 15,
      energy: (r.en1 || 0) * 15,
      shield: (r.sh1 || 0) * 10,
      specialCostReduction: (r.sp1 || 0) * 3,
    };
  },
};

