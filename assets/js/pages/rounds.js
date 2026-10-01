/* ==========================================================================
   Round management list (Phase 8b) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/round/useRoundTable.tsx
     columns: ID, Game name, Status (Resulted / Pending result / Cancelled / Disabled / Enabled),
       Opened at, Closed at, Actions · filters: search, game (grouped by lotto group)
     row menu: Edit round (canUpdate, not on slave sites, not when cancelled / settled / resulted),
       Manage result, Current bet, Limit numbers (not for group_custom)
     New Round hidden on slave sites (isSlaveSite)
   Changes: status filter (proposal); "in 4 hours" under the close time of a round taking bets
   now; Edit + Manage result as icons, the rest in ⋮ (same as pending rounds). Status labels and
   colors stay the app's (user).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var L = DS.lotto;
  var M = DS.mock;
  var R = DS.rounds;
  var rows = M.rounds();

  var game = function (r) {
    return M.games.filter(function (g) {
      return g.id === r.lottoGameId;
    })[0];
  };
  var gameName = function (r) {
    var g = game(r);
    return g ? L.name(g.translations) : "";
  };

  // Game filter grouped by lotto group (useGetGameFilter → GroupFilterType)
  var gamesWithRounds = M.games.filter(function (g) {
    return rows.some(function (r) {
      return r.lottoGameId === g.id;
    });
  });
  var html = '<option value="all">All games</option>';
  M.groups.forEach(function (grp) {
    var gs = gamesWithRounds.filter(function (g) {
      return g.lottoGroupId === grp.id;
    });
    if (!gs.length) return;
    html += '<optgroup label="' + esc(L.name(grp.translations)) + '">' + gs.map(function (g) {
      return '<option value="' + g.id + '">' + esc(L.name(g.translations)) + "</option>";
    }).join("") + "</optgroup>";
  });
  document.getElementById("f-game").innerHTML = html;
  document.getElementById("f-status").innerHTML = '<option value="all">All statuses</option>' + R.STATUS_FILTER.map(function (s) {
    return '<option value="' + s.value + '">' + s.label + "</option>";
  }).join("");

  var list = DS.list.create({
    root: document.getElementById("rounds-card"),
    noun: ["round", "rounds"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.id + " " + gameName(r);
    },
    filters: {
      lottoGameId: function (r, v) {
        return String(r.lottoGameId) === v;
      },
      status: function (r, v) {
        return R.status(r).key === v;
      },
    },
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "game", label: "Game", className: "is-strong", sortValue: gameName, render: function (r) {
        return esc(gameName(r));
      } },
      { key: "status", label: "Status", sortValue: function (r) {
        return R.status(r).label;
      }, render: R.statusChip },
      { key: "openAt", label: "Opens", render: function (r) {
        return fmt.dateTime(r.openAt);
      } },
      { key: "closeAt", label: "Closes", render: function (r) {
        return fmt.dateTime(r.closeAt) + (R.isOpenNow(r) ? '<span class="cell-sub">in ' + fmt.duration(r.closeAt - fmt.now) + "</span>" : "");
      } },
    ],
    rowName: function (r) {
      return "round " + r.id;
    },
    actions: function (r) {
      var g = game(r);
      return R.actions(r, { groupCustom: g && g.type === "group_custom" });
    },
    onAction: function () {},
    empty: {
      icon: "tabler:calendar-event",
      title: "No rounds yet",
      text: "Rounds come from round schedules, or you can add one by hand.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="round-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New round</a>',
    },
    noResults: { icon: "tabler:search", title: "No rounds match", text: "Try another game or status, or clear the filters." },
  });

  /* ---------- Prototype states ---------- */
  var states = ["data", "loading", "empty", "no-results", "error", "pending-only"];
  function setState(s) {
    if (s === "pending-only") {
      list.setMode("data");
      var sel = document.getElementById("f-status");
      sel.value = "close_bet";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    list.setMode(s);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
