/* ==========================================================================
   Yeekee rounds (Phase 8e) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/yeekee/useYeekeeTable.tsx
     columns: ID, Round ("<game>#<roundNumber>"), Status (isEnable: Open / Disabled), Top three,
       Bottom two ("Waiting for result" when empty), Close at, Actions
     filters: game (yeekee + encrypted games), close date (one day, default today, 3 months back,
       empty date ignored), provider (only when the user has providers)
     row menu: Check result, Limit numbers, Current bet
   Changes: status = the round status chip from Round management (Enabled / Pending result /
   Resulted / Disabled), because "Open" stayed on every past round (proposal); an empty result shows
   a dash, not "Waiting for result" twice per row (the status chip says it); close time only (the
   date is the filter), with "in 5m" on the round taking numbers now; View result + Current bet as
   icons, Limit numbers in ⋮ (row actions rule).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var L = DS.lotto;
  var M = DS.mock;
  var R = DS.rounds;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var rows = M.yeekeeRounds();

  var game = function (r) {
    return M.games.filter(function (g) {
      return g.id === r.lottoGameId;
    })[0];
  };
  var roundName = function (r) {
    var g = game(r);
    return (g ? L.name(g.translations) : "") + " #" + r.roundNumber;
  };
  var ymd = function (d) {
    d = new Date(d);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  var hm = function (d) {
    d = new Date(d);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };

  /* ---------- Filters ---------- */
  // Game: only yeekee + encrypted games (useGetGameFilter specificFilter)
  $("f-game").innerHTML = '<option value="all">All games</option>' + M.games.filter(function (g) {
    return R.isYeekee(g) || R.isEncrypted(g);
  }).map(function (g) {
    return '<option value="' + g.id + '">' + esc(L.name(g.translations)) + "</option>";
  }).join("");

  // Close date: today by default, 3 months back at most, never empty (the app ignores a cleared date)
  var today = ymd(fmt.now);
  var min = new Date(fmt.now);
  min.setMonth(min.getMonth() - 3);
  var dateEl = $("f-date");
  dateEl.value = today;
  dateEl.min = ymd(min);
  dateEl.max = today;
  dateEl.addEventListener("change", function () {
    if (!dateEl.value) dateEl.value = today;
  });

  // Provider: the user's providers (useGetUserProviders), "All providers" first
  $("f-provider").innerHTML = '<option value="all">All providers</option>' + M.providers.map(function (p) {
    return '<option value="' + p.id + '">' + esc(p.name) + (p.prefixCode ? " (" + esc(p.prefixCode) + ")" : "") + "</option>";
  }).join("");

  var list = DS.list.create({
    root: $("yeekee-card"),
    noun: ["round", "rounds"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return roundName(r);
    },
    filters: {
      lottoGameId: function (r, v) {
        return String(r.lottoGameId) === v;
      },
      closeAt: function (r, v) {
        return ymd(r.closeAt) === v;
      },
      // Mock rounds aren't per provider, so this filter keeps every row (see CLAUDE.md open question)
      providerId: function () {
        return true;
      },
    },
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "round", label: "Round", className: "is-strong", sortValue: function (r) {
        return r.closeAt;
      }, render: function (r) {
        var g = game(r);
        return esc(g ? L.name(g.translations) : "") + ' <span class="t-muted t-num">#' + esc(r.roundNumber) + "</span>";
      } },
      { key: "status", label: "Status", sortValue: function (r) {
        return R.status(r).label;
      }, render: R.statusChip },
      { key: "topThreeResult", label: "Top three", sortable: false, render: function (r) {
        return r.topThreeResult ? '<span class="code">' + esc(r.topThreeResult) + "</span>" : '<span class="t-faint">–</span>';
      } },
      { key: "bottomTwoResult", label: "Bottom two", sortable: false, render: function (r) {
        return r.bottomTwoResult ? '<span class="code">' + esc(r.bottomTwoResult) + "</span>" : '<span class="t-faint">–</span>';
      } },
      { key: "closeAt", label: "Closes", render: function (r) {
        return '<span class="t-num">' + hm(r.closeAt) + "</span>" + (R.isOpenNow(r) ? '<span class="cell-sub">in ' + fmt.duration(r.closeAt - fmt.now) + "</span>" : "");
      } },
    ],
    rowName: function (r) {
      return roundName(r);
    },
    // Check result → View result (core, first); Current bet visible; Limit numbers in ⋮
    actions: function (r) {
      return [
        { label: "View result", icon: "tabler:eye", href: "yeekee-round.html?id=" + r.id, kind: "view" },
        { label: "Current bet", icon: "tabler:list-numbers", href: "current-bet.html?id=" + r.id },
        { label: "Limit numbers", icon: "tabler:hash", href: "round-limit-numbers.html?id=" + r.id },
      ];
    },
    onAction: function () {},
    pageSize: 25,
    empty: {
      icon: "tabler:calendar-event",
      title: "No yeekee rounds",
      text: "Yeekee rounds are created by the system through the day.",
    },
    noResults: { icon: "tabler:calendar-search", title: "No rounds on this date", text: "Try another game or date, or clear the filters." },
  });

  /* ---------- Prototype states ---------- */
  var states = ["data", "loading", "empty", "no-results", "error", "yesterday"];
  function setState(s) {
    if (s === "yesterday") {
      list.setMode("data");
      var d = new Date(fmt.now);
      d.setDate(d.getDate() - 1);
      dateEl.value = ymd(d);
      dateEl.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    list.setMode(s);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
