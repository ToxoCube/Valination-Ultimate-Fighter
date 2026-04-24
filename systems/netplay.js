const Netplay = {
  /** Both players in the room; host starts wall-clock countdown. */
  LOBBY_COUNTDOWN_MS: 5000,

  enabled: false,
  connected: false,
  isHost: false,
  room: "",
  serverUrl: "",
  localName: "Player",
  localCharacterId: "balanced",
  socket: null,
  guestInput: {},
  remoteSnapshot: null,
  peerCharacterId: "balanced",
  /** Display name of the opponent (from peer_joined `name`). */
  peerName: "",
  /** Host: effective stats for the guest's fighter (from peer_joined). */
  peerStats: null,
  /** Sent to server on join/matchmake so the host can mirror our loadout. */
  localFighterStats: null,
  matchmake: false,
  peerPresent: false,
  /** True only after lobby countdown completes (synced from host via snapshots). */
  matchLive: false,
  /** Host: wall-clock when the match may start; guest: last value from host snapshots. */
  countdownEndMs: 0,
  _lastInputSentAt: 0,
  _lastSnapshotSentAt: 0,
  _announcedFight: false,
  _onRematchOffer: null,
  _onRematchGo: null,
  _onRematchDecline: null,
  /** True if peer sent rematch_offer before Results registered listeners (handled on Results enter). */
  pendingRematchOffer: false,
  /** Last opponent display name (kept after peer_left for roster / chat). */
  lastPeerName: "",
  /** { kind:"msg"|"sys", from?, text, ts, self? } */
  chatLog: [],
  _maxChatLog: 100,

  reset() {
    this.enabled = false;
    this.connected = false;
    this.isHost = false;
    this.room = "";
    this.serverUrl = "";
    this.localName = "Player";
    this.localCharacterId = "balanced";
    this.guestInput = {};
    this.remoteSnapshot = null;
    this.peerCharacterId = "balanced";
    this.peerName = "";
    this.peerStats = null;
    this.localFighterStats = null;
    this.matchmake = false;
    this.peerPresent = false;
    this.matchLive = false;
    this.countdownEndMs = 0;
    this._lastInputSentAt = 0;
    this._lastSnapshotSentAt = 0;
    this._announcedFight = false;
    this._onRematchOffer = null;
    this._onRematchGo = null;
    this._onRematchDecline = null;
    this.pendingRematchOffer = false;
    this.lastPeerName = "";
    this.chatLog = [];
    if (this.socket) {
      try { this.socket.close(); } catch (_) {}
      this.socket = null;
    }
  },

  start(config, onReady, onError) {
    this.reset();
    this.enabled = true;
    this.serverUrl = (config?.serverUrl || "").trim();
    if (
      !this.serverUrl &&
      typeof NetplayConfig !== "undefined" &&
      typeof NetplayConfig.getServerUrl === "function"
    ) {
      this.serverUrl = String(NetplayConfig.getServerUrl() || "").trim();
    }
    this.room = (config?.room || "default").trim();
    this.localName = config?.playerName || "Player";
    this.localCharacterId = config?.characterId || "balanced";
    this.isHost = !!config?.preferHost;
    this.matchmake = !!config?.matchmake;
    const f = config?.fighter;
    this.localFighterStats = f
      ? {
          maxHp: f.maxHp,
          maxEnergy: f.maxEnergy,
          maxShield: f.maxShield,
          specialCost: f.specialCost
        }
      : null;

    if (!this.serverUrl) {
      onError?.("No game server configured (set URL in Settings, window.NETPLAY_SERVER, or netplayConfig).");
      return;
    }

    if (
      typeof NetplayConfig !== "undefined" &&
      typeof NetplayConfig.getHttpsWsBlockMessage === "function"
    ) {
      const httpsMsg = NetplayConfig.getHttpsWsBlockMessage(this.serverUrl);
      if (httpsMsg) {
        onError?.(httpsMsg);
        return;
      }
    }

    let ws;
    try {
      ws = new WebSocket(this.serverUrl);
    } catch (e) {
      onError?.("Could not open WebSocket: " + e.message);
      return;
    }
    this.socket = ws;

    ws.onopen = () => {
      const fs = this.localFighterStats || {};
      const fighterPayload = {
        maxHp: fs.maxHp,
        maxEnergy: fs.maxEnergy,
        maxShield: fs.maxShield,
        specialCost: fs.specialCost
      };
      if (this.matchmake) {
        ws.send(JSON.stringify({
          t: "matchmake",
          name: this.localName,
          characterId: this.localCharacterId,
          ...fighterPayload
        }));
      } else {
        ws.send(JSON.stringify({
          t: "join",
          room: this.room,
          preferHost: this.isHost,
          name: this.localName,
          characterId: this.localCharacterId,
          ...fighterPayload
        }));
      }
    };

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (_) {
        return;
      }

      if (msg.t === "matchmaking") {
        UI.announce("MATCHMAKING…");
      } else if (msg.t === "joined") {
        this.connected = true;
        this.isHost = msg.role === "host";
        if (msg.room) this.room = String(msg.room);
        this.peerPresent = false;
        this.peerName = "";
        this.lastPeerName = "";
        this.peerStats = null;
        this.matchLive = false;
        this.countdownEndMs = 0;
        this._announcedFight = false;
        onReady?.({
          role: msg.role,
          waiting: !!msg.waiting
        });
      } else if (msg.t === "error") {
        onError?.(msg.message || "Server error");
      } else if (msg.t === "peer_joined") {
        if (msg.characterId) this.peerCharacterId = msg.characterId;
        this.peerName = String(msg.name != null ? msg.name : "Player").trim().slice(0, 24) || "Player";
        this.lastPeerName = this.peerName;
        this.peerStats = {
          maxHp: msg.maxHp,
          maxEnergy: msg.maxEnergy,
          maxShield: msg.maxShield,
          specialCost: msg.specialCost
        };
        this.peerPresent = true;
        if (this.isHost) {
          this.countdownEndMs = Date.now() + this.LOBBY_COUNTDOWN_MS;
          this.matchLive = false;
        }
        this._announcedFight = false;
        if (typeof Game !== "undefined" && typeof Game.applyOnlineEnemyFromPeer === "function") {
          Game.applyOnlineEnemyFromPeer();
        }
        this.appendChatEntry({
          kind: "sys",
          text: `${this.peerName} connected`,
          ts: Date.now()
        });
        UI.announce("Opponent connected");
      } else if (msg.t === "peer_left") {
        if (this.peerName) this.lastPeerName = this.peerName;
        this.peerPresent = false;
        this.peerName = "";
        this.peerStats = null;
        this.matchLive = false;
        this.countdownEndMs = 0;
        this._announcedFight = false;
        this.appendChatEntry({
          kind: "sys",
          text: (this.lastPeerName ? `${this.lastPeerName} disconnected` : "Opponent disconnected"),
          ts: Date.now()
        });
        UI.announce("Opponent disconnected");
      } else if (msg.t === "input" && this.isHost) {
        this.guestInput = msg.keys || {};
      } else if (msg.t === "snapshot" && !this.isHost) {
        this.remoteSnapshot = msg.state || null;
      } else if (msg.t === "rematch_offer") {
        this.pendingRematchOffer = true;
        if (typeof UI !== "undefined" && UI.announce) {
          UI.announce("OPPONENT WANTS A REMATCH");
        }
        if (typeof this._onRematchOffer === "function") {
          this._onRematchOffer();
        }
      } else if (msg.t === "rematch_go") {
        this.pendingRematchOffer = false;
        if (typeof this._onRematchGo === "function") this._onRematchGo();
      } else if (msg.t === "rematch_decline") {
        if (typeof this._onRematchDecline === "function") this._onRematchDecline();
      } else if (msg.t === "peer_forfeit") {
        const fromRole = msg.fromRole === "host" ? "host" : msg.fromRole === "guest" ? "guest" : "";
        if (this.isHost && fromRole === "guest") {
          const who = String(this.peerName || "Opponent").trim().slice(0, 24) || "Opponent";
          this.appendChatEntry({ kind: "sys", text: `${who} forfeited the match.`, ts: Date.now() });
          if (typeof Game !== "undefined" && !Game.ended && this.matchLive) {
            Enemy.hp = 0;
            Game.end(true);
          }
          if (typeof UI !== "undefined" && UI.announce) UI.announce("OPPONENT FORFEITED");
        } else if (!this.isHost && fromRole === "host") {
          this.appendChatEntry({
            kind: "sys",
            text: "Opponent forfeited — you win.",
            ts: Date.now()
          });
          if (typeof UI !== "undefined" && UI.announce) UI.announce("YOU WIN");
        }
        if (typeof OnlineChat !== "undefined" && typeof OnlineChat.refresh === "function") {
          OnlineChat.refresh();
        }
      } else if (msg.t === "chat") {
        const from = String(msg.from != null ? msg.from : "Player").trim().slice(0, 24) || "Player";
        const text = String(msg.text != null ? msg.text : "").trim().slice(0, 280);
        if (!text) return;
        this.appendChatEntry({ kind: "msg", from, text, ts: typeof msg.ts === "number" ? msg.ts : Date.now(), self: false });
      } else if (msg.t === "chat_error") {
        this.appendChatEntry({
          kind: "sys",
          text: String(msg.message || "Chat error"),
          ts: Date.now()
        });
      }
    };

    ws.onerror = () => {
      onError?.("WebSocket error. Check server URL.");
    };

    ws.onclose = () => {
      if (this.enabled) {
        this.appendChatEntry({ kind: "sys", text: "Disconnected from server", ts: Date.now() });
      }
      this.connected = false;
    };
  },

  sendInputFromKeys(keys) {
    if (!this.enabled || !this.connected || !this.matchLive || this.isHost || !this.socket) return;
    const now = Date.now();
    if (now - this._lastInputSentAt < 33) return;
    this._lastInputSentAt = now;
    this.socket.send(JSON.stringify({
      t: "input",
      keys: {
        a: !!keys["a"],
        d: !!keys["d"],
        w: !!keys["w"],
        j: !!keys["j"],
        k: !!keys["k"]
      }
    }));
  },

  sendSnapshotFromGame() {
    if (!this.enabled || !this.connected || !this.isHost || !this.socket) return;
    const now = Date.now();
    /** Always flush when the match has ended so the guest always receives ended:true (KO can fall on a throttled frame). */
    if (typeof Game === "undefined" || !Game.ended) {
      if (now - this._lastSnapshotSentAt < 33) return;
    }
    this._lastSnapshotSentAt = now;

    this.socket.send(JSON.stringify({
      t: "snapshot",
      state: {
        player: {
          x: Player.x, y: Player.y, vx: Player.vx, vy: Player.vy, facing: Player.facing,
          hp: Player.hp, energy: Number.isFinite(Number(Player.energy)) ? Player.energy : 0,
          shield: Player.shield, cooldown: Player.cooldown,
          characterId: Player.characterId, characterName: Player.characterName, color: Player.color,
          imagePath: Player.imagePath, spriteScale: Player.spriteScale,
          maxHp: Player.maxHp, maxEnergy: Player.maxEnergy, maxShield: Player.maxShield,
          specialCost: Player.specialCost,
          displayName: Player.name || "Player",
          specialFxSeq: Player._specialFxSeq || 0,
          specialFxDurationMs: Math.max(300, Number(Player.specialGifDurationMs) || 1000),
          attackFlashSeq: Player._attackFlashSeq || 0,
          attackFlashUntil: Number(Player._attackFlashUntil) || 0,
          specialGifPath: String(Player.specialGifPath || "").trim().slice(0, 240),
          specialGifDurationMs: Math.max(300, Number(Player.specialGifDurationMs) || 1000)
        },
        enemy: {
          x: Enemy.x, y: Enemy.y, vx: Enemy.vx, vy: Enemy.vy, facing: Enemy.facing,
          hp: Enemy.hp, energy: Number.isFinite(Number(Enemy.energy)) ? Enemy.energy : 0,
          shield: Enemy.shield, cooldown: Enemy.cooldown,
          characterId: Enemy.characterId, characterName: Enemy.characterName, color: Enemy.color,
          imagePath: Enemy.imagePath, spriteScale: Enemy.spriteScale,
          maxHp: Enemy.maxHp, maxEnergy: Enemy.maxEnergy, maxShield: Enemy.maxShield,
          specialCost: Enemy.specialCost,
          displayName: Enemy.name || "",
          specialFxSeq: Enemy._specialFxSeq || 0,
          specialFxDurationMs: Math.max(300, Number(Enemy.specialGifDurationMs) || 1000),
          attackFlashSeq: Enemy._attackFlashSeq || 0,
          attackFlashUntil: Number(Enemy._attackFlashUntil) || 0,
          specialGifPath: String(Enemy.specialGifPath || "").trim().slice(0, 240),
          specialGifDurationMs: Math.max(300, Number(Enemy.specialGifDurationMs) || 1000)
        },
        ended: Game.ended,
        round: Game.round,
        playerHitStreak: Game.playerHitStreak | 0,
        enemyHitStreak: Game.enemyHitStreak | 0,
        playerMaxCombo: Game.playerMaxCombo | 0,
        enemyMaxCombo: Game.enemyMaxCombo | 0,
        lastRewards: Game.lastRewards || null,
        online: {
          countdownEndMs: this.countdownEndMs,
          matchLive: this.matchLive,
          peerPresent: this.peerPresent
        }
      }
    }));
  },

  applySnapshotToGame() {
    const s = this.remoteSnapshot;
    if (!s) return;

    function mergeFighter(entity, part, opts) {
      if (!part) return;
      if (part.characterId && part.characterId !== entity.characterId) {
        const c = typeof Characters !== "undefined" ? Characters.getById(part.characterId) : null;
        if (c) entity.applyLoadout(c);
      }
      if (part.characterName != null) entity.characterName = part.characterName;
      if (part.color != null) entity.color = part.color;
      if (part.imagePath != null && part.imagePath !== entity.imagePath) {
        entity.imagePath = part.imagePath;
        entity.sprite = null;
      }
      if (typeof part.spriteScale === "number") entity.spriteScale = part.spriteScale;
      if (part.displayName !== undefined && part.displayName !== null) {
        entity.name = String(part.displayName).trim().slice(0, 24);
      }

      Object.assign(entity, {
        x: part.x,
        y: part.y,
        vx: part.vx,
        vy: part.vy,
        facing: part.facing,
        hp: part.hp,
        shield: part.shield,
        cooldown: part.cooldown
      });
      const finite = (v) => typeof v === "number" && Number.isFinite(v);
      if (opts.isPlayer) {
        if (finite(part.energy)) entity.energy = part.energy;
        if (finite(part.maxHp)) entity.maxHp = part.maxHp;
        if (finite(part.maxEnergy)) entity.maxEnergy = part.maxEnergy;
        if (finite(part.maxShield)) entity.maxShield = part.maxShield;
        if (finite(part.specialCost)) entity.specialCost = part.specialCost;
      } else {
        if (finite(part.energy)) entity.energy = part.energy;
        if (finite(part.maxHp)) entity.maxHp = part.maxHp;
        if (finite(part.maxEnergy)) entity.maxEnergy = part.maxEnergy;
        if (finite(part.maxShield)) entity.maxShield = part.maxShield;
        if (finite(part.specialCost)) entity.specialCost = part.specialCost;
      }
    }

    if (s.player) mergeFighter(Player, s.player, { isPlayer: true });
    if (s.enemy) mergeFighter(Enemy, s.enemy, { isPlayer: false });

    function applyRosterVisualFields(entity, characterId) {
      if (!entity || !characterId || typeof Characters === "undefined") return;
      const c = Characters.getById(characterId);
      if (!c) return;
      const fb = Characters.specialGifFallbackPath || "";
      entity.specialGifPath = c.specialGifPath || fb || "";
      entity.specialGifDurationMs = c.specialGifDurationMs || 1000;
      entity.specialHitW = typeof c.specialHitW === "number" ? c.specialHitW : 0;
    }
    if (s.player && s.player.characterId) applyRosterVisualFields(Player, s.player.characterId);
    if (s.enemy && s.enemy.characterId) applyRosterVisualFields(Enemy, s.enemy.characterId);

    /** Host-authoritative special GIF URL so guest P2 matches (e.g. Rex → breaker.gif). */
    function applyHostSpecialGifFromSnapshot(entity, part) {
      if (!entity || !part) return;
      if (typeof part.specialGifPath === "string") {
        const p = part.specialGifPath.trim().slice(0, 240);
        if (p) {
          if (p !== entity.specialGifPath && typeof entity.hideSpecialGif === "function") {
            entity.hideSpecialGif();
          }
          entity.specialGifPath = p;
        }
      }
      if (typeof part.specialGifDurationMs === "number" && part.specialGifDurationMs > 0) {
        entity.specialGifDurationMs = part.specialGifDurationMs;
      }
    }
    applyHostSpecialGifFromSnapshot(Player, s.player);
    applyHostSpecialGifFromSnapshot(Enemy, s.enemy);

    function applySpecialFxFromSnapshot(entity, part) {
      if (!part || typeof part.specialFxSeq !== "number") return;
      const prev = entity._netAppliedSpecialFxSeq | 0;
      if (part.specialFxSeq <= prev) return;
      const dur =
        typeof part.specialFxDurationMs === "number" && part.specialFxDurationMs > 0
          ? part.specialFxDurationMs
          : 1000;
      if (typeof entity.replaySpecialGifFromNetwork === "function") {
        entity.replaySpecialGifFromNetwork(dur);
      }
      entity._netAppliedSpecialFxSeq = part.specialFxSeq;
    }
    applySpecialFxFromSnapshot(Player, s.player);
    applySpecialFxFromSnapshot(Enemy, s.enemy);

    function applyAttackFlashFromSnapshot(entity, part) {
      if (!part) return;
      const now = Date.now();
      let t = entity._attackFlashUntil | 0;
      /** Host wall time while flash active — keeps P2 light flash visible on guest between snapshots. */
      if (typeof part.attackFlashUntil === "number" && part.attackFlashUntil > now) {
        t = Math.max(t, part.attackFlashUntil);
      }
      if (typeof part.attackFlashSeq === "number" && part.attackFlashSeq > (entity._netAppliedAttackFlashSeq | 0)) {
        entity._netAppliedAttackFlashSeq = part.attackFlashSeq;
        t = Math.max(t, now + 220);
      }
      entity._attackFlashUntil = t;
    }
    applyAttackFlashFromSnapshot(Player, s.player);
    applyAttackFlashFromSnapshot(Enemy, s.enemy);

    Game.ended = !!s.ended;
    if (typeof s.round === "number") Game.round = s.round;
    if (typeof s.playerHitStreak === "number") Game.playerHitStreak = s.playerHitStreak;
    if (typeof s.enemyHitStreak === "number") Game.enemyHitStreak = s.enemyHitStreak;
    if (typeof s.playerMaxCombo === "number") Game.playerMaxCombo = s.playerMaxCombo;
    if (typeof s.enemyMaxCombo === "number") Game.enemyMaxCombo = s.enemyMaxCombo;
    Game.lastRewards = s.lastRewards || null;
    if (typeof UI !== "undefined" && UI.updateComboFromGame) UI.updateComboFromGame();

    if (s.online && typeof s.online === "object") {
      if (typeof s.online.countdownEndMs === "number") {
        this.countdownEndMs = s.online.countdownEndMs;
      }
      if (typeof s.online.peerPresent === "boolean") {
        this.peerPresent = s.online.peerPresent;
      }
      if (typeof s.online.matchLive === "boolean") {
        const wasLive = this.matchLive;
        this.matchLive = s.online.matchLive;
        if (!wasLive && this.matchLive && typeof OnlineChat !== "undefined" && typeof OnlineChat.refresh === "function") {
          OnlineChat.refresh();
        }
      }
    }
  },

  setRematchListeners(o) {
    this._onRematchOffer = o && typeof o.onOffer === "function" ? o.onOffer : null;
    this._onRematchGo = o && typeof o.onGo === "function" ? o.onGo : null;
    this._onRematchDecline = o && typeof o.onDecline === "function" ? o.onDecline : null;
  },

  clearRematchListeners() {
    this._onRematchOffer = null;
    this._onRematchGo = null;
    this._onRematchDecline = null;
    this.pendingRematchOffer = false;
  },

  sendRematchOffer() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ t: "rematch_offer" }));
    }
  },

  sendRematchAccept() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ t: "rematch_accept" }));
    }
  },

  sendRematchDecline() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ t: "rematch_decline" }));
    }
  },

  appendChatEntry(entry) {
    if (!entry || typeof entry.text !== "string") return;
    this.chatLog.push(entry);
    if (this.chatLog.length > this._maxChatLog) this.chatLog.shift();
    if (typeof OnlineChat !== "undefined" && typeof OnlineChat.refresh === "function") {
      OnlineChat.refresh();
    }
  },

  sendChat(text) {
    const t = String(text != null ? text : "").trim().slice(0, 280);
    if (!t) return;
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.appendChatEntry({ kind: "sys", text: "Cannot send — not connected.", ts: Date.now() });
      return;
    }
    this.appendChatEntry({
      kind: "msg",
      from: String(this.localName || "Player").trim().slice(0, 24) || "Player",
      text: t,
      ts: Date.now(),
      self: true
    });
    this.socket.send(JSON.stringify({ t: "chat", text: t }));
  },

  /**
   * Online Fight only: notify peer and end the match as a loss for this client (host applies locally;
   * guest relies on host snapshots after notifying).
   */
  attemptForfeit() {
    if (!this.enabled || !this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    if (typeof Game === "undefined" || Game.mode !== "online") return;
    const scene = typeof Scene !== "undefined" && Scene.getCurrentName ? Scene.getCurrentName() : "";
    if (scene !== "Fight" || !this.matchLive || Game.ended) return;

    const ok = window.confirm(
      "Forfeit this online match? You will lose. Your opponent will win. This cannot be undone."
    );
    if (!ok) return;

    try {
      this.socket.send(JSON.stringify({ t: "forfeit" }));
    } catch (_) {
      return;
    }

    this.appendChatEntry({ kind: "sys", text: "You forfeited the match.", ts: Date.now() });
    if (typeof UI !== "undefined" && UI.announce) UI.announce("FORFEIT");

    if (this.isHost) {
      Player.hp = 0;
      Game.end(false);
    }

    if (typeof OnlineChat !== "undefined" && typeof OnlineChat.refresh === "function") {
      OnlineChat.refresh();
    }
  },

  /** Same WebSocket session: reset round state for a new fight without re-joining. */
  prepareRematch() {
    this.guestInput = {};
    this.remoteSnapshot = null;
    this.matchLive = false;
    this._announcedFight = false;
    this._lastInputSentAt = 0;
    this._lastSnapshotSentAt = 0;
    if (this.isHost && this.peerPresent) {
      this.countdownEndMs = Date.now() + this.LOBBY_COUNTDOWN_MS;
    } else {
      this.countdownEndMs = 0;
    }
    if (typeof Game !== "undefined") {
      Game.ended = false;
      Game._resultsTransitionQueued = false;
    }
  }
};

