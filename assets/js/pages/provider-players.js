/* ==========================================================================
   Provider players (Phase 11a) on the LIST TEMPLATE. ?id=<provider id>
   Source: views/pages/provider/player/ProviderPlayerTable.tsx
     columns: ID, Name (username), Display name, Balance (raw number), Created at, Updated at,
       Actions (View); search; all text grey (text.secondary)
   Changes: the provider header with link tabs; username + display name in one cell; balance as
   money in the provider's currency; "Joined" (created) + "Last updated"; username links to the player.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var P = DS.providerPages;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var p = P.byId(DS.params.get("id")) || P.byId(101);
  var rows = M.providerPlayers(p.id);
  var cur = p.currency.code;

  P.header($("provider-header"), p, "players", "Players", "", { keys: 2, users: M.providerUsers(p.id).length, players: rows.length });

  var list = DS.list.create({
    root: $("players-card"),
    noun: ["player", "players"],
    pageSize: 25,
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.username + " " + r.displayName;
    },
    filters: {},
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "username", label: "Player", render: function (r) {
        return DS.ui.ident('<a href="provider-player.html?id=' + p.id + "&player=" + r.id + '">' + esc(r.username) + "</a>", r.displayName, { html: true });
      } },
      { key: "balance", label: "Balance", num: true, render: function (r) {
        return fmt.money(r.balance, cur);
      } },
      { key: "createdAt", label: "Joined", render: function (r) {
        return fmt.dateTime(r.createdAt);
      } },
      { key: "updatedAt", label: "Last updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.username;
    },
    actions: function (r) {
      return [{ label: "View", icon: "tabler:eye", href: "provider-player.html?id=" + p.id + "&player=" + r.id, kind: "view" }];
    },
    onAction: function () {},
    empty: { icon: "tabler:user-circle", title: "No players yet", text: "Players show up here after they first play through " + p.name + "." },
    noResults: { icon: "tabler:search", title: "No players match", text: "Try another username." },
  });

  var states = ["data", "loading", "empty", "no-results", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : rows.length ? "data" : "empty";
  DS.page = { states: states, state: initial, setState: list.setMode };
  list.setMode(initial);
})(window.DS);
