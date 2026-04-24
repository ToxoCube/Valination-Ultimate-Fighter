/**
 * Netplay WebSocket URL (order):
 * 1) window.NETPLAY_SERVER — optional override in Index.html before scripts
 * 2) Production: when opened on valination.netlify.app → Render wss (see HOSTED_* below)
 * 3) DEFAULT_SERVER — local dev (http:// or file tests with ws://)
 *
 * Production deploy: https://valination.netlify.app/
 * Netplay backend: edit HOSTED_NETPLAY_WSS if your Render service URL changes.
 */
(function () {
  var DEFAULT_SERVER = "ws://localhost:8080";

  /** Public WebSocket URL (TLS) for the hosted Netlify build. */
  var HOSTED_NETPLAY_WSS = "wss://valination-ultimate-fighter.onrender.com";

  /** True when the static game is served from your Netlify project (production or branch previews). */
  function isValinationNetlifyHost(hostname) {
    var h = String(hostname || "");
    if (h.slice(-11) !== "netlify.app") return false;
    return h === "valination.netlify.app" || h.indexOf("valination") >= 0;
  }

  window.NetplayConfig = {
    getServerUrl: function () {
      if (
        typeof window.NETPLAY_SERVER === "string" &&
        window.NETPLAY_SERVER.trim()
      ) {
        return window.NETPLAY_SERVER.trim();
      }
      if (typeof location !== "undefined" && location.hostname) {
        if (isValinationNetlifyHost(location.hostname)) {
          return HOSTED_NETPLAY_WSS;
        }
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
            ? " Netlify is HTTPS-only; use wss:// to your netplay host (see core/netplayConfig.js or window.NETPLAY_SERVER)."
            : "";
        return (
          "This page is HTTPS. The browser will not open ws:// here. " +
          "Set window.NETPLAY_SERVER to a wss:// URL in Index.html, or host over plain HTTP for local ws:// tests." +
          netlify
        );
      }
      return null;
    }
  };
})();
