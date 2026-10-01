/* ==========================================================================
   Pending rounds (Phase 6): a to-do queue on the list template.
   Oldest closed round first; "Waiting" = time since betting closed (derived from close_at).
   The status column is dropped here: every row is "Pending result" by definition.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var DAY = 864e5;
  var rounds = DS.mock.pendingRounds.slice();
  var canUpdateRound = true; // && !isSlaveSiteDeployment in the app

  var list = DS.list.create({
    root: document.getElementById("rounds-card"),
    noun: ["round", "rounds"],
    rows: function () {
      return rounds;
    },
    search: function (r) {
      return r.gameName + " " + r.id;
    },
    filters: {},
    summary: function (all) {
      var age = all.map(function (r) {
        return fmt.now - r.closeAt;
      });
      var late = age.filter(function (a) {
        return a > DAY;
      }).length;
      var games = {};
      all.forEach(function (r) {
        games[r.gameName] = 1;
      });
      return [
        { label: "Waiting for a result", value: fmt.int(all.length), icon: "tabler:clock-pause", tone: "solid", meta: "Closed in the last 7 days" },
        { label: "Over a day late", value: fmt.int(late), icon: "tabler:alert-triangle", tone: "warning", meta: "Players are waiting" },
        { label: "Longest wait", value: age.length ? fmt.duration(Math.max.apply(null, age)) : "–", icon: "tabler:hourglass", tone: "error", meta: "Oldest first in the list" },
        { label: "Games", value: fmt.int(Object.keys(games).length), icon: "tabler:clover", tone: "info", meta: "With a round waiting" },
      ];
    },
    columns: [
      { key: "id", label: "ID", render: function (r) {
        return '<span class="t-medium t-num">' + r.id + "</span>";
      } },
      { key: "gameName", label: "Game", className: "is-strong", render: function (r) {
        return esc(r.gameName);
      } },
      { key: "openAt", label: "Opened", render: function (r) {
        return '<span class="t-num">' + fmt.dateTime(r.openAt) + "</span>";
      } },
      { key: "closeAt", label: "Closed", render: function (r) {
        return '<span class="t-num">' + fmt.dateTime(r.closeAt) + "</span>";
      } },
      { key: "waiting", label: "Waiting", sortValue: function (r) {
        return fmt.now - r.closeAt;
      }, render: function (r) {
        var late = fmt.now - r.closeAt > DAY;
        return (
          '<span class="waiting' + (late ? " is-late" : "") + '" title="' + (late ? "Waiting more than a day" : "Time since betting closed") + '">' +
          '<iconify-icon icon="' + (late ? "tabler:alert-triangle" : "tabler:clock") + '"></iconify-icon>' + fmt.duration(fmt.now - r.closeAt) + "</span>"
        );
      } },
    ],
    rowName: function (r) {
      return "round " + r.id;
    },
    // Edit is a core action → always a visible icon, first. Manage result fills the 2nd slot
    // (it's the job of this page); Current bet + Limit numbers go in ⋮.
    // ?from=pending: those pages go back here. Yeekee rounds have their own result page and no edit form.
    actions: function (r) {
      var q = "?id=" + r.id + "&from=pending";
      var items = [];
      if (canUpdateRound && !r.yeekee && ["cancelled", "settled", "resulted"].indexOf(r.status) === -1) {
        items.push({ label: "Edit round", icon: "tabler:pencil", href: "round-form.html" + q, kind: "edit" });
      }
      return items.concat([
        { label: "Manage result", icon: "tabler:clipboard-check", href: (r.yeekee ? "yeekee-round.html" : "round-result.html") + q },
        { label: "Current bet", icon: "tabler:list-numbers", href: "current-bet.html" + q },
        { label: "Limit numbers", icon: "tabler:hash", href: "round-limit-numbers.html" + q },
      ]);
    },
    onAction: function () {},
    empty: {
      icon: "tabler:circle-check",
      title: "All caught up",
      text: "No closed rounds from the last 7 days are waiting for a result.",
    },
    noResults: {
      icon: "tabler:search",
      title: "No rounds match",
      text: "Try a different game name or round ID.",
    },
  });

  var states = ["data", "loading", "empty", "no-results", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = {
    states: states,
    state: initial,
    setState: function (s) {
      list.setMode(s);
    },
  };
  list.setMode(initial);
})(window.DS);
