const { WebSocketServer } = require("ws");
const { randomBytes } = require("crypto");

const port = Number(process.env.PORT || 8080);
const wss = new WebSocketServer({ port });

/** roomId -> { host: ws|null, guest: ws|null } */
const rooms = new Map();

/** Sockets that only want lobby updates (separate from in-game sockets) */
const lobbyClients = new Set();

/** FIFO queue of sockets waiting for auto matchmaking */
const matchQueue = [];

const MAX_ROOM_ID_LEN = 64;
const MAX_QUEUE = 2000;

function normalizeRoomId(id) {
  const s = String(id || "default").trim().slice(0, MAX_ROOM_ID_LEN);
  if (!s) return "default";
  return s.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function newAutoRoomId() {
  return "m_" + randomBytes(12).toString("hex");
}

function ensureRoom(id) {
  const key = normalizeRoomId(id);
  if (!rooms.has(key)) {
    rooms.set(key, { host: null, guest: null });
  }
  return rooms.get(key);
}

function send(ws, obj) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(obj));
}

function otherPeer(room, ws) {
  if (room.host === ws) return room.guest;
  if (room.guest === ws) return room.host;
  return null;
}

function removeFromQueue(ws) {
  const i = matchQueue.indexOf(ws);
  if (i >= 0) matchQueue.splice(i, 1);
}

function buildRoomList() {
  const out = [];
  for (const [id, room] of rooms.entries()) {
    const hasHost = !!room.host;
    const hasGuest = !!room.guest;
    const n = (hasHost ? 1 : 0) + (hasGuest ? 1 : 0);
    if (n !== 1) continue;
    const hostName = hasHost
      ? (room.host._meta?.name || "Host")
      : (room.guest._meta?.name || "Player");
    out.push({
      id,
      players: n,
      openSlots: 1,
      hostName
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function broadcastRoomList() {
  const list = buildRoomList();
  for (const c of lobbyClients) {
    send(c, { t: "room_list", rooms: list });
  }
}

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Stats the host needs to simulate the peer's fighter correctly. */
function metaFromClientMsg(msg) {
  return {
    name: String(msg.name || "Player").slice(0, 24),
    characterId: String(msg.characterId || "balanced").slice(0, 32),
    maxHp: clampInt(msg.maxHp, 20, 5000, 100),
    maxEnergy: clampInt(msg.maxEnergy, 20, 5000, 100),
    maxShield: clampInt(msg.maxShield, 0, 5000, 0),
    specialCost: clampInt(msg.specialCost, 5, 200, 30)
  };
}

function peerJoinedPayload(meta) {
  const m = meta || {};
  return {
    t: "peer_joined",
    name: m.name || "Player",
    characterId: m.characterId || "balanced",
    maxHp: m.maxHp,
    maxEnergy: m.maxEnergy,
    maxShield: m.maxShield,
    specialCost: m.specialCost
  };
}

function tryMatchmake() {
  while (matchQueue.length >= 2) {
    const a = matchQueue.shift();
    const b = matchQueue.shift();
    if (!a || !b || a.readyState !== a.OPEN || b.readyState !== b.OPEN) continue;

    const roomId = newAutoRoomId();
    const room = ensureRoom(roomId);
    room.host = a;
    room.guest = b;
    a._roomId = roomId;
    b._roomId = roomId;
    a._role = "host";
    b._role = "guest";

    const metaA = a._meta || {};
    const metaB = b._meta || {};

    send(a, { t: "joined", role: "host", waiting: false, room: roomId });
    send(b, { t: "joined", role: "guest", waiting: false, room: roomId });
    send(a, peerJoinedPayload(metaB));
    send(b, peerJoinedPayload(metaA));
  }
  broadcastRoomList();
}

wss.on("connection", (ws) => {
  ws._roomId = "";
  ws._role = "";
  ws._inQueue = false;
  ws._lobbySubscriber = false;
  ws._meta = metaFromClientMsg({});

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch (_) {
      return;
    }

    if (msg.t === "ping") {
      send(ws, { t: "pong" });
      return;
    }

    if (msg.t === "lobby_subscribe") {
      lobbyClients.add(ws);
      ws._lobbySubscriber = true;
      send(ws, { t: "room_list", rooms: buildRoomList() });
      return;
    }

    if (msg.t === "lobby_unsubscribe") {
      lobbyClients.delete(ws);
      ws._lobbySubscriber = false;
      return;
    }

    if (msg.t === "lobby_list") {
      send(ws, { t: "room_list", rooms: buildRoomList() });
      return;
    }

    if (msg.t === "matchmake") {
      if (ws._roomId) return;
      if (ws._inQueue) return;
      if (matchQueue.length >= MAX_QUEUE) {
        send(ws, { t: "error", message: "Matchmaking queue full" });
        return;
      }
      ws._meta = metaFromClientMsg(msg);
      ws._inQueue = true;
      matchQueue.push(ws);
      send(ws, { t: "matchmaking", position: matchQueue.length });
      tryMatchmake();
      return;
    }

    if (msg.t === "join") {
      if (ws._roomId) return;
      const roomId = normalizeRoomId(msg.room);
      const room = ensureRoom(roomId);
      ws._roomId = roomId;
      ws._meta = metaFromClientMsg(msg);

      if (msg.preferHost && !room.host) {
        room.host = ws;
        ws._role = "host";
      } else if (!room.host) {
        room.host = ws;
        ws._role = "host";
      } else if (!room.guest) {
        room.guest = ws;
        ws._role = "guest";
      } else {
        send(ws, { t: "error", message: "Room full" });
        ws._roomId = "";
        return;
      }

      const waiting = !(room.host && room.guest);
      send(ws, { t: "joined", role: ws._role, waiting, room: roomId });
      const peer = otherPeer(room, ws);
      if (peer) {
        send(peer, peerJoinedPayload(ws._meta));
        const peerMeta = peer._meta || {};
        send(ws, peerJoinedPayload(peerMeta));
      }
      broadcastRoomList();
      return;
    }

    const room = rooms.get(ws._roomId);
    if (!room) return;

    if (msg.t === "rematch_offer") {
      const peer = otherPeer(room, ws);
      if (peer) send(peer, { t: "rematch_offer" });
      return;
    }
    if (msg.t === "rematch_accept") {
      if (!room.host || !room.guest) return;
      const now = Date.now();
      const last = room._lastRematchGoAt || 0;
      if (now - last < 500) return;
      room._lastRematchGoAt = now;
      send(room.host, { t: "rematch_go" });
      send(room.guest, { t: "rematch_go" });
      return;
    }
    if (msg.t === "rematch_decline") {
      const peer = otherPeer(room, ws);
      if (peer) send(peer, { t: "rematch_decline" });
      return;
    }

    if (msg.t === "forfeit") {
      const peer = otherPeer(room, ws);
      if (!peer) return;
      const fromRole = ws._role === "host" ? "host" : "guest";
      send(peer, { t: "peer_forfeit", fromRole });
      return;
    }

    if (msg.t === "chat") {
      const peer = otherPeer(room, ws);
      if (!peer) return;
      const text = String(msg.text != null ? msg.text : "").trim().slice(0, 280);
      if (!text) return;
      ws._chatTimes = (ws._chatTimes || []).filter((t) => Date.now() - t < 10000);
      if (ws._chatTimes.length >= 14) {
        send(ws, { t: "chat_error", message: "Slow down — too many messages." });
        return;
      }
      ws._chatTimes.push(Date.now());
      const meta = ws._meta || {};
      send(peer, {
        t: "chat",
        from: String(meta.name || "Player").slice(0, 24),
        role: ws._role || "",
        text,
        ts: Date.now()
      });
      return;
    }

    if (msg.t === "input" && ws._role === "guest" && room.host) {
      send(room.host, { t: "input", keys: msg.keys || {} });
      return;
    }

    if (msg.t === "snapshot" && ws._role === "host" && room.guest) {
      send(room.guest, { t: "snapshot", state: msg.state || null });
    }
  });

  ws.on("close", () => {
    if (ws._lobbySubscriber) {
      lobbyClients.delete(ws);
      ws._lobbySubscriber = false;
    }

    removeFromQueue(ws);
    if (ws._inQueue) ws._inQueue = false;

    const room = rooms.get(ws._roomId);
    if (!room) return;

    const peer = otherPeer(room, ws);
    if (room.host === ws) room.host = null;
    if (room.guest === ws) room.guest = null;
    if (peer) send(peer, { t: "peer_left" });

    if (!room.host && !room.guest) rooms.delete(ws._roomId);
    broadcastRoomList();
  });
});

console.log(`Netplay server listening on ws://localhost:${port}`);
console.log(`Lobby: clients subscribe for live open-room list; games use join/matchmake on a separate socket.`);
