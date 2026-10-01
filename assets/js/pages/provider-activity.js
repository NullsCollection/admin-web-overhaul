/* ==========================================================================
   Provider activity (Phase 6) on the list template.
   Severity signal replaces StatusBadge + tinted rows; "Last active" merges the
   relative time and the exact last-activity time into one column.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var rows = DS.mock.providerActivity.slice();

  var LEVEL = { "AT RISK": [1, "At risk"], WARNING: [2, "Warning"], CRITICAL: [3, "Critical"], SEVERE: [4, "Severe"] };

  function statusHTML(s) {
    if (s === "ACTIVE") return '<span class="chip chip--success"><span class="chip__dot"></span>Active</span>';
    var l = LEVEL[s] || [1, s];
    return (
      '<span class="severity severity--' + l[0] + '"><span class="severity__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      l[1] + '<span class="sr-only"> (level ' + l[0] + " of 4)</span></span>"
    );
  }

  var list = DS.list.create({
    root: $("activity-card"),
    noun: ["provider", "providers"],
    rows: function () {
      return rows;
    },
    search: function () {
      return "";
    },
    filters: {
      start: function () {
        return true; // server aggregates the chosen range; mock rows are already this month's totals
      },
      end: function () {
        return true;
      },
      status: function (r, v) {
        return v === "ACTIVE" ? r.status === "ACTIVE" : r.status !== "ACTIVE";
      },
    },
    columns: [
      { key: "providerName", label: "Provider", render: function (r) {
        return '<a class="t-medium" href="provider-form.html?id=' + r.id + '">' + esc(r.providerName) + '</a><span class="cell-sub">' + esc(r.prefixCode) + "</span>";
      } },
      { key: "status", label: "Status", sortValue: function (r) {
        return r.status === "ACTIVE" ? 0 : LEVEL[r.status][0];
      }, render: function (r) {
        return statusHTML(r.status);
      } },
      { key: "lastActiveAt", label: "Last active", render: function (r) {
        var inactive = r.status !== "ACTIVE";
        return '<span class="' + (inactive ? "t-primary t-medium" : "") + '">' + fmt.ago(r.lastActiveAt) + '</span><span class="cell-sub t-num">' + fmt.dateTime(r.lastActiveAt) + "</span>";
      } },
      { key: "totalTicket", label: "Tickets", num: true, render: function (r) {
        return r.totalTicket ? fmt.int(r.totalTicket) : '<span class="t-faint">0</span>';
      } },
      { key: "ticketCancelled", label: "Cancelled", num: true, render: function (r) {
        return r.ticketCancelled ? fmt.int(r.ticketCancelled) : '<span class="t-faint">0</span>';
      } },
      { key: "profitAmount", label: "Profit", num: true, render: function (r) {
        if (!r.profitAmount) return '<span class="t-faint">' + fmt.money(0) + "</span>";
        return r.profitAmount < 0 ? '<span class="is-negative">' + fmt.money(r.profitAmount) + "</span>" : fmt.money(r.profitAmount);
      } },
    ],
    rowName: function (r) {
      return r.providerName;
    },
    // no row actions in ActivityTable (provider name links to the provider instead)
    empty: {
      icon: "tabler:activity",
      title: "No activity in this date range",
      text: "Pick a wider date range to see provider activity.",
    },
    noResults: {
      icon: "tabler:filter-off",
      title: "No providers match",
      text: "No providers have this status in the selected range.",
    },
  });

  /* Inactive count (data.totalInactive) + shortcut to the Inactive filter */
  $("inactive-count").textContent = rows.filter(function (r) {
    return r.status !== "ACTIVE";
  }).length;
  $("inactive-shortcut").addEventListener("click", function () {
    var sel = $("f-status");
    sel.value = "INACTIVE";
    sel.dispatchEvent(new Event("change"));
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
