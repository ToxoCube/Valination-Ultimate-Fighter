(function () {
  let lobbyWs = null;

  function serverUrl() {
    if (typeof NetplayConfig === "undefined" || !NetplayConfig.getServerUrl) {
      return "";
    }
    return String(NetplayConfig.getServerUrl() || "").trim();
  }

  function closeLobbyWs() {
    if (lobbyWs) {
      try {
        if (lobbyWs.readyState === WebSocket.OPEN) {
          lobbyWs.send(JSON.stringify({ t: "lobby_unsubscribe" }));
        }
      } catch (_) {}
      lobbyWs.onopen = null;
      lobbyWs.onclose = null;
      lobbyWs.onerror = null;
      lobbyWs.onmessage = null;
      try {
        lobbyWs.close();
      } catch (_) {}
      lobbyWs = null;
    }
  }

  function setStatus(el, text, kind) {
    el.textContent = text;
    el.className = "onlineLobbyStatus" + (kind ? " " + kind : "");
  }

  Scene.register("OnlineLobby", {
    onEnter() {
      const root = document.getElementById("menuRoot");
      const main = document.getElementById("menuMain");
      const mode = document.getElementById("menuMode");
      const character = document.getElementById("menuCharacter");
      const shop = document.getElementById("menuShop");
      const controls = document.getElementById("menuControls");
      const stats = document.getElementById("menuStats");
      const online = document.getElementById("menuOnline");

      root.style.display = "flex";
      main.style.display = "none";
      mode.style.display = "none";
      character.style.display = "none";
      if (shop) shop.style.display = "none";
      if (controls) controls.style.display = "none";
      if (stats) stats.style.display = "none";
      if (online) online.style.display = "flex";

      const statusEl = document.getElementById("onlineLobbyStatus");
      const roomListEl = document.getElementById("onlineRoomList");

      function goOnline(onlinePayload) {
        closeLobbyWs();
        Scene.set("CharacterSelect", {
          mode: "online",
          online: onlinePayload
        });
      }

      function renderRooms(rooms) {
        roomListEl.innerHTML = "";
        if (!rooms || !rooms.length) {
          const p = document.createElement("div");
          p.className = "onlineRoomEmpty";
          p.textContent =
            "No open rooms yet. Create a room and start the match to appear here, or use Quick match.";
          roomListEl.appendChild(p);
          return;
        }
        rooms.forEach((r) => {
          const row = document.createElement("div");
          row.className = "onlineRoomRow";
          const info = document.createElement("div");
          info.className = "onlineRoomInfo";
          const title = document.createElement("div");
          title.className = "onlineRoomId";
          title.textContent = r.id;
          const sub = document.createElement("div");
          sub.className = "onlineRoomMeta";
          const hostName = r.hostName || "Host";
          sub.textContent = hostName + " — waiting for opponent";
          info.appendChild(title);
          info.appendChild(sub);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = "Join";
          btn.onclick = () => {
            goOnline({
              room: r.id,
              matchmake: false,
              preferHost: false
            });
          };
          row.appendChild(info);
          row.appendChild(btn);
          roomListEl.appendChild(row);
        });
      }

      function connect() {
        const url = serverUrl();
        if (!url) {
          setStatus(
            statusEl,
            "Game server is not configured.",
            "bad"
          );
          renderRooms([]);
          return;
        }
        closeLobbyWs();
        const httpsBlock =
          typeof NetplayConfig !== "undefined" &&
          typeof NetplayConfig.getHttpsWsBlockMessage === "function"
            ? NetplayConfig.getHttpsWsBlockMessage(url)
            : null;
        if (httpsBlock) {
          setStatus(statusEl, httpsBlock, "bad");
          renderRooms([]);
          return;
        }
        setStatus(statusEl, "Connecting…");
        try {
          lobbyWs = new WebSocket(url);
        } catch (_) {
          setStatus(statusEl, "Could not start connection.", "bad");
          renderRooms([]);
          return;
        }
        lobbyWs.onopen = () => {
          setStatus(statusEl, "Connected — list updates live.", "ok");
          lobbyWs.send(JSON.stringify({ t: "lobby_subscribe" }));
        };
        lobbyWs.onclose = () => {
          setStatus(statusEl, "Disconnected.", "warn");
          renderRooms([]);
        };
        lobbyWs.onerror = () => {
          setStatus(
            statusEl,
            "Could not reach the game server.",
            "bad"
          );
        };
        lobbyWs.onmessage = (ev) => {
          let msg;
          try {
            msg = JSON.parse(String(ev.data));
          } catch (_) {
            return;
          }
          if (msg.t === "room_list") {
            renderRooms(msg.rooms || []);
          }
          if (msg.t === "error") {
            setStatus(statusEl, msg.message || "Server error", "bad");
          }
        };
      }

      document.getElementById("btnOnlineRefresh").onclick = () => {
        if (lobbyWs && lobbyWs.readyState === WebSocket.OPEN) {
          lobbyWs.send(JSON.stringify({ t: "lobby_list" }));
        } else {
          connect();
        }
      };

      document.getElementById("btnOnlineMatchmake").onclick = () => {
        goOnline({
          room: "",
          matchmake: true,
          preferHost: false
        });
      };

      document.getElementById("btnOnlineCreateRoom").onclick = () => {
        const room = "priv_" + Math.random().toString(16).slice(2, 14);
        goOnline({
          room,
          matchmake: false,
          preferHost: true
        });
      };

      document.getElementById("btnOnlineLobbyBack").onclick = () => {
        closeLobbyWs();
        Scene.set("ModeSelect");
      };

      renderRooms([]);
      connect();
    },
    onExit() {
      closeLobbyWs();
    }
  });
})();
