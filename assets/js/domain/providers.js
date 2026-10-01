/* ==========================================================================
   Provider pages (Phase 11a, user picked option A): one header with link tabs shared by
   provider edit (Details, API keys), Users and Players. Same pattern as the game pages (7d).
   Port: a <ProviderPageHeader/> + MUI Tabs with Link (like <GamePageHeader/>).
   ========================================================================== */
(function (DS) {
  var P = (DS.providerPages = {});
  var esc = DS.fmt.esc;

  P.byId = function (id) {
    return DS.mock.providers.filter(function (p) {
      return p.id === Number(id);
    })[0];
  };
  P.tabs = function (p, counts) {
    counts = counts || {};
    var badge = function (n) {
      return n == null ? "" : ' <span class="badge badge--neutral">' + n + "</span>";
    };
    return [
      { id: "details", label: "Details", icon: "tabler:file-description", href: "provider-form.html?id=" + p.id },
      { id: "keys", label: "API keys" + badge(counts.keys), icon: "tabler:key", href: "provider-form.html?id=" + p.id + "#keys" },
      { id: "users", label: "Users" + badge(counts.users), icon: "tabler:users", href: "provider-users.html?id=" + p.id },
      { id: "players", label: "Players" + badge(counts.players), icon: "tabler:user-circle", href: "provider-players.html?id=" + p.id },
    ];
  };
  P.tabsHTML = function (p, active, counts) {
    return '<nav class="tabs page-tabs" aria-label="Provider pages">' + P.tabs(p, counts).map(function (t) {
      return '<a class="tabs__tab" data-tab="' + t.id + '" href="' + t.href + '"' + (t.id === active ? ' aria-current="page"' : "") +
        '><iconify-icon icon="' + t.icon + '"></iconify-icon>' + t.label + "</a>";
    }).join("") + "</nav>";
  };
  P.statusChip = function (p) {
    var on = p.isEnable === "yes" || p.isEnable === true;
    return on ? '<span class="chip chip--success"><span class="chip__dot"></span>Enabled</span>' : '<span class="chip"><span class="chip__dot"></span>Disabled</span>';
  };
  P.subline = function (p) {
    return esc(p.prefixCode) + " · " + esc(p.currency.code) + " · ID " + p.id + (p.isOwner ? " · Owner" : "");
  };
  P.crumbs = function (parts) {
    var crumbs = document.querySelector(".topbar__crumbs");
    if (!crumbs) return;
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  };
  // Back link + name + status + "GD01 · THB · ID 101" + link tabs (+ optional header action HTML)
  P.header = function (root, p, active, pageLabel, actionHTML, counts) {
    root.innerHTML =
      '<a class="back-link" href="providers.html"><iconify-icon icon="tabler:arrow-left"></iconify-icon>Provider management</a>' +
      '<div class="page-header"><div><div class="page-header__title-row"><h1 class="page-header__title">' + esc(p.name) + "</h1>" + P.statusChip(p) +
      '</div><p class="page-header__sub">' + P.subline(p) + "</p></div>" + (actionHTML || "") + "</div>" +
      P.tabsHTML(p, active, counts);
    document.title = pageLabel + ": " + p.name + " | Admin prototype";
    P.crumbs(["Providers", "Provider management", p.name, pageLabel]);
  };
})(window.DS);
