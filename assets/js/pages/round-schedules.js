/* ==========================================================================
   Round schedules list (Phase 8a) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/round-schedule/RoundScheduleTable.tsx
     columns: ID, Round name, Game, CRON expression, Enabled (green check / red x), Created at,
       Updated at, Actions (Edit, Delete) · search · delete: ConfirmModal → toast / error toast
   Changes: game shown under the round name (one column instead of two); the schedule in words ("Day 1 and 16 of every month at 15:00") with the cron and
   the next run under it (from DS.cron); Enabled as a chip (Disabled is neutral, not red).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var L = DS.lotto;
  var M = DS.mock;
  var C = DS.cron;
  var rows = M.roundSchedules().slice();

  var gameName = function (r) {
    var g = M.games.filter(function (x) {
      return x.id === r.lottoGameId;
    })[0];
    return g ? L.name(g.translations) : "";
  };
  var nextRun = function (r) {
    return C.next(r.cronExpression, fmt.now, 1, r.excludeDatetimes).runs[0];
  };

  var list = DS.list.create({
    root: document.getElementById("schedules-card"),
    noun: ["schedule", "schedules"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.name + " " + gameName(r) + " " + r.id;
    },
    filters: {},
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      // Game under the name: the two are often almost the same, and it keeps the table in 1440px
      { key: "name", label: "Round name / game", className: "is-strong", render: function (r) {
        var n = gameName(r);
        return '<div class="sched-cell"><a href="round-schedule-form.html?id=' + r.id + '">' + esc(r.name) + "</a>" +
          '<span class="sched-cell__sub">' + (n ? esc(n) : "Game not found") + "</span></div>";
      } },
      { key: "cronExpression", label: "Schedule", sortable: false, render: function (r) {
        var next = r.isEnable === "yes" ? nextRun(r) : null;
        return '<div class="sched-cell"><span>' + esc(C.describe(r.cronExpression)) + "</span>" +
          '<span class="sched-cell__sub"><span class="code">' + esc(r.cronExpression) + "</span>" +
          (next ? "Next " + fmt.dateTime(next) : r.isEnable === "yes" ? "" : "Paused") + "</span></div>";
      } },
      { key: "isEnable", label: "Status", render: function (r) {
        return r.isEnable === "yes"
          ? '<span class="chip chip--success"><span class="chip__dot"></span>Enabled</span>'
          : '<span class="chip"><span class="chip__dot"></span>Disabled</span>';
      } },
      { key: "createdAt", label: "Created", render: function (r) {
        return fmt.dateTime(r.createdAt);
      } },
      { key: "updatedAt", label: "Updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.name;
    },
    actions: function (r) {
      return [
        { label: "Edit", icon: "tabler:pencil", href: "round-schedule-form.html?id=" + r.id },
        { label: "Delete", icon: "tabler:trash", action: "delete", danger: true },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    empty: {
      icon: "tabler:calendar-repeat",
      title: "No round schedules yet",
      text: "A schedule creates a game's rounds for you, on the days and times you set.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="round-schedule-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New schedule</a>',
    },
    noResults: { icon: "tabler:search", title: "No schedules match", text: "Try a different name or game." },
  });

  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash",
      tone: "error",
      title: "Delete this schedule?",
      html: "<strong>" + esc(row.name) + "</strong> will be removed and stop creating rounds. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete schedule", variant: "contained", tone: "error", onClick: function (btn, close) {
          DS.ui.busy(btn, true, "Deleting…");
          setTimeout(function () {
            close();
            rows = rows.filter(function (x) {
              return x.id !== row.id;
            });
            DS.ui.toast(row.name + " deleted", "tabler:circle-check");
            list.refresh();
          }, 700);
        } },
      ],
    });
  }

  /* ---------- Prototype states ---------- */
  var states = ["data", "loading", "empty", "no-results", "error", "confirm-delete"];
  function setState(s) {
    DS.dialog.close();
    list.setMode(s === "confirm-delete" ? "data" : s);
    if (s === "confirm-delete") setTimeout(function () {
      confirmDelete(rows[0]);
    }, 400);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
