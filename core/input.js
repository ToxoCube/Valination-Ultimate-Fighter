const keys = {};

function applyGameplayKeys(e, down) {
  if (typeof OnlineChat !== "undefined" && OnlineChat.isTyping && OnlineChat.isTyping()) return;
  const ch = typeof e.key === "string" && e.key.length === 1 ? e.key.toLowerCase() : "";
  if (ch === "a" || ch === "d" || ch === "w" || ch === "j" || ch === "k") {
    keys[ch] = down;
  }
  // Physical keys (layout-independent — e.g. AZERTY still uses KeyJ for the J key cap)
  switch (e.code) {
    case "KeyA":
      keys["a"] = down;
      break;
    case "KeyD":
      keys["d"] = down;
      break;
    case "KeyW":
      keys["w"] = down;
      break;
    case "KeyJ":
      keys["j"] = down;
      break;
    case "KeyK":
      keys["k"] = down;
      break;
    default:
      break;
  }
}

document.addEventListener("keydown", (e) => {
  applyGameplayKeys(e, true);
});
document.addEventListener("keyup", (e) => {
  applyGameplayKeys(e, false);
});