/* ==========================================================================
   Player details (Phase 11a). ?id=<provider>&player=<player id>
   Source: views/pages/provider/player/ProviderPlayerForm.tsx — bold label over value, one column:
     Username, Display name, Balance (raw; "-" when 0, falsy check), IP address, User agent,
     Created at, Updated at; breadcrumb link to itself is broken (".../players" + id, no "/")
   Changes: the detail template (summary v2): identity (display name, username, ID) + provider,
   facts as label / value rows, Balance in the totals column in the provider's currency (0 shows
   as 0); last session's IP + user agent together; "No session yet" when there isn't one.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var P = DS.providerPages;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var p = P.byId(DS.params.get("id")) || P.byId(101);
  var back = "provider-players.html?id=" + p.id;
  $("back").href = back;
  $("back").innerHTML = '<iconify-icon icon="tabler:arrow-left"></iconify-icon>' + esc(p.name) + " players";

  var row = function (label, html) {
    return '<div class="kv-row"><dt>' + label + "</dt><dd>" + html + "</dd></div>";
  };
  var none = '<span class="t-faint">–</span>';

  function render(pl) {
    $("pl-problem").hidden = true;
    $("pl-summary").hidden = false;
    $("pl-title").textContent = pl.displayName;
    $("pl-sub").textContent = pl.username + " · Player ID " + pl.id;
    document.title = pl.username + " | Admin prototype";
    P.crumbs(["Providers", "Provider management", p.name, "Players", pl.username]);
    var initials = pl.displayName.split(" ").map(function (w) {
      return w.charAt(0);
    }).join("").slice(0, 2).toUpperCase();
    var s = pl.session;
    $("pl-summary").innerHTML =
      '<div class="summary__main"><div class="summary__who">' +
      '<div class="summary__person"><span class="avatar">' + esc(initials) + "</span><div>" +
      '<div class="summary__name">' + esc(pl.displayName) + '</div><div class="summary__sub">' + esc(pl.username) + " · ID " + pl.id + "</div></div></div>" +
      '<div class="summary__aside"><span class="summary__sub">Provider</span><strong>' + esc(p.name) + "</strong></div></div>" +
      '<dl class="kv-rows">' +
      row("Joined", '<span class="t-num">' + fmt.dateTime(pl.createdAt) + "</span>") +
      row("Last updated", '<span class="t-num">' + fmt.dateTime(pl.updatedAt) + "</span>") +
      row("IP address", s ? '<span class="t-num">' + esc(s.ipAddress) + "</span>" : '<span class="t-muted">No session yet</span>') +
      row("User agent", s ? '<span class="t-body2" style="word-break:break-word">' + esc(s.userAgent) + "</span>" : none) +
      "</dl></div>" +
      '<div class="summary__totals"><div class="stat"><div class="stat__label"><iconify-icon icon="tabler:wallet"></iconify-icon>Balance</div>' +
      '<div class="stat__value">' + fmt.moneyHTML(pl.balance, p.currency.code) + '</div><div class="stat__meta">' + esc(p.currency.code) + "</div></div></div>";
  }

  function problem(kind) {
    $("pl-summary").hidden = true;
    $("pl-problem").hidden = false;
    $("pl-title").textContent = "Player";
    $("pl-sub").textContent = "";
    $("pl-problem").innerHTML = kind === "not-found"
      ? '<div class="card"><div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:user-off"></iconify-icon></span>' +
        '<div class="empty__title">We couldn\'t find this player</div><div class="empty__text">They may belong to another provider. Search for them in the list.</div>' +
        '<a class="btn btn--outlined btn--sm" href="' + back + '">Go to players</a></div></div>'
      : '<div class="alert alert--error" role="alert"><iconify-icon icon="tabler:alert-triangle"></iconify-icon><div class="alert__body">' +
        '<div class="alert__title">Couldn\'t load this player</div><div class="alert__text">The server didn\'t respond. Try again in a moment.</div></div></div>';
  }
  function skeleton() {
    $("pl-problem").hidden = true;
    $("pl-summary").hidden = false;
    $("pl-title").innerHTML = '<span class="skeleton skeleton--text skeleton--on-canvas" style="--w:200px;height:28px"></span>';
    $("pl-sub").innerHTML = '<span class="skeleton skeleton--text skeleton--on-canvas" style="--w:220px;margin-top:6px"></span>';
    $("pl-summary").innerHTML = '<div class="summary__main"><div class="kv-rows">' + new Array(5).join('<div class="kv-row"><span class="skeleton skeleton--text" style="--w:70px"></span>' +
      '<span class="skeleton skeleton--text" style="--w:60%;height:16px"></span></div>') + '</div></div><div class="summary__totals"><div class="stat" style="gap:10px">' +
      '<span class="skeleton skeleton--text" style="--w:40%"></span><span class="skeleton skeleton--value"></span></div></div>';
  }

  var all = M.providerPlayers(p.id);
  var STATES = {
    data: function () {
      return M.providerPlayer(p.id, DS.params.get("player")) || all[0];
    },
    "zero-balance": function () {
      return all.filter(function (x) {
        return x.balance === 0;
      })[0];
    },
    "no-session": function () {
      return all.filter(function (x) {
        return !x.session;
      })[0];
    },
  };
  var states = Object.keys(STATES).concat(["loading", "not-found", "error"]);
  function setState(s) {
    if (s === "loading") return skeleton();
    if (s === "not-found" || s === "error") return problem(s);
    var pl = STATES[s]();
    if (!pl) return problem("not-found");
    render(pl);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
