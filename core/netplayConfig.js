/**
 * Online play server URL resolution (first match wins):
 * 1) Save.data.netplayServerUrl from Settings (lets guests use the host's IP / wss URL)
 * 2) window.NETPLAY_SERVER (set before scripts load in Index.html)
 * 3) DEFAULT_SERVER below
 *
 * Production deploy: https://valination.netlify.app/ — same rules as any static HTTPS host.
 * Browsers block mixed content: an https:// game page cannot open ws:// — only wss:// to a TLS server.
 */
(function () {
  var DEFAULT_SERVER = "ws://localhost:8080";

  window.NetplayConfig = {
    getServerUrl: function () {
      if (typeof Save !== "undefined" && Save.data && typeof Save.data.netplayServerUrl === "string") {
        var fromSave = Save.data.netplayServerUrl.trim();
        if (fromSave) return fromSave.slice(0, 512);
      }
      if (
        typeof window.NETPLAY_SERVER === "string" &&
        window.NETPLAY_SERVER.trim()
      ) {
        return window.NETPLAY_SERVER.trim();
      }
      return DEFAULT_SERVER;
    },

    /**
     * When the game page is https://, ws:// URLs are blocked (mixed content). Returns a user-facing message or null.
     */
    getHttpsWsBlockMessage: function (url) {
      if (typeof location === "undefined" || location.protocol !== "https:") return null;
      var u = String(url || "").trim().toLowerCase();
      if (u.indexOf("wss://") === 0) return null;
      if (u.indexOf("ws://") === 0) {
        var host = typeof location !== "undefined" && location.hostname ? String(location.hostname) : "";
        var netlify =
          host.indexOf("netlify.app") >= 0
            ? " Netlify serves this site over HTTPS only; run your netplay Node (or other) server elsewhere with TLS and use its wss:// URL in Settings or NETPLAY_SERVER."
            : "";
        return (
          "This page is HTTPS (typical for static hosting). The browser will not open ws:// here. " +
          "Use Settings to set a wss:// URL to your WebSocket server (TLS required), or host the game over plain HTTP for local ws:// testing only." +
          netlify
        );
      }
      return null;
    }
  };
})();
