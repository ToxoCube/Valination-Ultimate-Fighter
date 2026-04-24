/** In-game online chat + roster (Fight + Results). Depends on Netplay. */
const OnlineChat = {
  _bound: false,
  _panelOpen: false,

  /** Only block game keys while the drawer is open and the message field is focused. */
  isTyping() {
    if (!this._panelOpen) return false;
    const el = document.getElementById("onlineChatInput");
    return !!(el && document.activeElement === el);
  },

  _escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  bindOnce() {
    if (this._bound) return;
    this._bound = true;
    const toggle = document.getElementById("onlineChatToggle");
    const body = document.getElementById("onlineChatBody");
    const sendBtn = document.getElementById("onlineChatSend");
    const input = document.getElementById("onlineChatInput");
    const forfeitBtn = document.getElementById("onlineForfeitBtn");
    if (!toggle || !body) return;

    if (forfeitBtn) {
      forfeitBtn.addEventListener("click", () => {
        if (typeof Netplay !== "undefined" && Netplay.attemptForfeit) Netplay.attemptForfeit();
      });
    }

    toggle.addEventListener("click", () => {
      this._panelOpen = !this._panelOpen;
      body.style.display = this._panelOpen ? "flex" : "none";
      toggle.setAttribute("aria-expanded", this._panelOpen ? "true" : "false");
      if (this._panelOpen && input) {
        setTimeout(() => input.focus(), 0);
      } else if (!this._panelOpen && input && document.activeElement === input) {
        input.blur();
      }
      this.refresh();
    });

    const submit = () => {
      if (!input) return;
      const t = input.value;
      input.value = "";
      if (typeof Netplay !== "undefined" && Netplay.sendChat) Netplay.sendChat(t);
      if (input) input.focus();
    };

    if (sendBtn) sendBtn.addEventListener("click", submit);
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !this._panelOpen) return;
      const bodyEl = document.getElementById("onlineChatBody");
      if (bodyEl) bodyEl.style.display = "none";
      this._panelOpen = false;
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (input && document.activeElement === input) input.blur();
    });

    const game = document.getElementById("game");
    if (game) {
      game.addEventListener("mousedown", () => {
        const inp = document.getElementById("onlineChatInput");
        if (inp && document.activeElement === inp) inp.blur();
      });
    }
  },

  setOnlineActive(active) {
    this.bindOnce();
    const panel = document.getElementById("onlineChatPanel");
    if (!panel) return;
    if (active) {
      panel.style.display = "block";
      this.refresh();
    } else {
      panel.style.display = "none";
      this._panelOpen = false;
      const body = document.getElementById("onlineChatBody");
      if (body) body.style.display = "none";
      const toggleEl = document.getElementById("onlineChatToggle");
      if (toggleEl) toggleEl.setAttribute("aria-expanded", "false");
      const inp = document.getElementById("onlineChatInput");
      if (inp && document.activeElement === inp) inp.blur();
    }
  },

  refresh() {
    const roster = document.getElementById("onlineChatRoster");
    const list = document.getElementById("onlineChatMessages");
    const forfeitBtn = document.getElementById("onlineForfeitBtn");
    if (!roster || !list) return;

    if (forfeitBtn) {
      const scene = typeof Scene !== "undefined" && Scene.getCurrentName ? Scene.getCurrentName() : "";
      const canForfeit =
        typeof Netplay !== "undefined" &&
        Netplay.enabled &&
        Netplay.connected &&
        Netplay.matchLive &&
        typeof Game !== "undefined" &&
        !Game.ended &&
        scene === "Fight";
      forfeitBtn.disabled = !canForfeit;
    }

    const local =
      typeof Netplay !== "undefined" && Netplay.localName
        ? String(Netplay.localName).trim().slice(0, 24) || "You"
        : "You";
    const wsOk =
      typeof Netplay !== "undefined" &&
      Netplay.connected &&
      Netplay.socket &&
      Netplay.socket.readyState === 1;

    let peerDisplay = "Opponent";
    if (typeof Netplay !== "undefined") {
      if (Netplay.peerPresent && Netplay.peerName) {
        peerDisplay = String(Netplay.peerName).trim().slice(0, 24) || "Opponent";
      } else if (Netplay.lastPeerName) {
        peerDisplay = String(Netplay.lastPeerName).trim().slice(0, 24);
      } else if (!Netplay.peerPresent) {
        peerDisplay = "Waiting for opponent…";
      }
    }
    const peerConn = !!(typeof Netplay !== "undefined" && Netplay.peerPresent && wsOk);

    roster.innerHTML = `
      <div class="onlineChatRosterBlock">
        <div class="onlineChatRosterRow">
          <span class="onlineChatRosterName">${this._escapeHtml(local)}</span>
          <span class="onlineChatRosterYou">(you)</span>
        </div>
        <div class="onlineChatRosterStatus">${wsOk ? '<span class="onlineChatConn ok">Connected</span>' : '<span class="onlineChatConn bad">Disconnected</span>'}</div>
      </div>
      <div class="onlineChatRosterBlock">
        <div class="onlineChatRosterRow">
          <span class="onlineChatRosterName">${this._escapeHtml(peerDisplay)}</span>
          <span class="onlineChatRosterYou">(opponent)</span>
        </div>
        <div class="onlineChatRosterStatus">${peerConn ? '<span class="onlineChatConn ok">Connected</span>' : '<span class="onlineChatConn bad">Disconnected</span>'}</div>
      </div>
    `;

    const log = typeof Netplay !== "undefined" && Netplay.chatLog ? Netplay.chatLog : [];
    list.innerHTML = log.map((e) => this._formatEntry(e)).join("");
    list.scrollTop = list.scrollHeight;
  },

  _formatEntry(e) {
    if (!e || e.kind === "sys") {
      return `<div class="onlineChatLine sys">${this._escapeHtml(e.text || "")}</div>`;
    }
    const who = e.self ? `${this._escapeHtml(e.from || "You")} (you)` : this._escapeHtml(e.from || "Player");
    return `<div class="onlineChatLine msg"><span class="onlineChatFrom">${who}:</span> <span class="onlineChatText">${this._escapeHtml(e.text || "")}</span></div>`;
  }
};
