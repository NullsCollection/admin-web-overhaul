/* ==========================================================================
   Theme + settings. Load in <head> (not deferred) so the right theme paints first.
   Mirrors src/@core/context/settingsContext (themeName, mode, navCollapsed).
   Everything hangs off window.DS (classic scripts: file:// can't load modules).
   ========================================================================== */
(function () {
  var DS = (window.DS = window.DS || {});
  var KEY = "rb-proto-settings";
  var defaults = { theme: "gold", mode: "light", collapsed: false };
  var listeners = [];

  function read() {
    try {
      return Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch (e) {
      return Object.assign({}, defaults);
    }
  }
  function write(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      /* private mode: settings just won't persist */
    }
  }

  var settings = read();
  var root = document.documentElement;

  /* URL overrides for review links / screenshots: ?theme=blue&mode=dark&state=empty
     (applied for this visit only, not saved) */
  var params = new URLSearchParams(location.search);
  DS.params = params;
  if (/^(gold|blue)$/.test(params.get("theme"))) settings.theme = params.get("theme");
  if (/^(light|dark)$/.test(params.get("mode"))) settings.mode = params.get("mode");
  if (params.get("collapsed") === "1") settings.collapsed = true;

  function apply() {
    root.setAttribute("data-theme", settings.theme);
    root.setAttribute("data-mode", settings.mode);
  }
  apply();

  DS.settings = {
    get: function (key) {
      return settings[key];
    },
    set: function (key, value) {
      settings[key] = value;
      write(settings);
      apply();
      listeners.forEach(function (fn) {
        fn(key, value);
      });
    },
    on: function (fn) {
      listeners.push(fn);
    },
  };
})();
