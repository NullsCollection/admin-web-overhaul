/* ==========================================================================
   Round limit numbers (Phase 8d) on the LIST TEMPLATE (core/list.js). ?id=<round id>
   Source: src/views/pages/lotto/round/RoundLimitTemplateTabs.tsx
     "Configuring for: {game} #{round}" · tabs: Quick Assign / Create New (a link to limit templates)
     QuickAssignTemplate: every set: name, "Action by" provider, active toggle (useAttachLimitToRound,
       saves right away + toast), eye → PreviewModal · group_custom rounds → back to /lotto/rounds
   Changes: same layout as game limit numbers (7d): Scope column (Global / Local), On / Off switch in
   its own column, "Create limit set" button instead of a tab; an On / Off filter (proposal).
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var R = DS.rounds;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var round = M.round(DS.params.get("id")) || M.rounds().filter(function (r) {
    return R.status(r).key === "enabled";
  })[0];
  var game = M.games.filter(function (g) {
    return g.id === round.lottoGameId;
  })[0];
  if (game.type === "group_custom") {
    location.replace("rounds.html"); // same as the app: Set lottery rounds use limit groups
    return;
  }

  $("round-chip").innerHTML = R.statusChip(round);
  $("round-sub").textContent = L.name(game.translations) + ", round " + round.id + ", closes " + fmt.dateTime(round.closeAt);
  document.title = "Limit numbers: round " + round.id + " | Admin prototype";
  R.setCrumbs(game, "Limit numbers");
  R.setBackLink(game); // yeekee rounds go back to the yeekee list

  var providerName = function (id) {
    var p = M.providers.filter(function (x) {
      return x.id === id;
    })[0];
    return p ? p.name : "";
  };
  var rows = M.roundLimitTemplates(round.id);

  var list = DS.list.create({
    root: $("sets-card"),
    noun: ["set", "sets"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.name;
    },
    filters: {
      isActive: function (r, v) {
        return v === "on" ? r.isActive : !r.isActive;
      },
    },
    rowName: function (r) {
      return r.name;
    },
    columns: [
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name);
      } },
      { key: "scope", label: "Scope", sortValue: function (r) {
        return r.providerId ? 1 : 0;
      }, render: function (r) {
        return r.providerId ? '<span class="chip chip--primary">Local</span>' : '<span class="chip">Global</span>';
      } },
      { key: "providerId", label: "Provider", sortValue: function (r) {
        return providerName(r.providerId);
      }, render: function (r) {
        return r.providerId ? esc(providerName(r.providerId)) : '<span class="t-muted">All providers</span>';
      } },
      { key: "isActive", label: "This round", sortable: false, render: function (r) {
        return '<label class="switch"><input type="checkbox" role="switch" data-toggle="' + r.id + '"' + (r.isActive ? " checked" : "") +
          ' aria-label="' + esc(r.name) + ' on for this round"><span class="switch__track"><span class="switch__thumb"></span></span>' +
          '<span class="switch__label">' + (r.isActive ? "On" : "Off") + "</span></label>";
      } },
    ],
    actions: function () {
      return [{ label: "View set", icon: "tabler:eye", action: "view", kind: "view" }];
    },
    onAction: function (action, row) {
      L.previewLimitSet(M.limitTemplate(row.id));
    },
    empty: {
      icon: "tabler:numbers",
      title: "No limit number sets yet",
      text: "Create a limit number set, then turn it on here.",
      actionHTML: '<a class="btn btn--outlined btn--sm" href="limit-template-form.html">Create limit set</a>',
    },
    noResults: { icon: "tabler:search", title: "No sets match", text: "Try a different name, or show on and off sets." },
  });

  // The switch saves right away (useAttachLimitToRound), like the app
  $("sets-card").addEventListener("change", function (e) {
    var t = e.target.closest("[data-toggle]");
    if (!t) return;
    var row = rows.filter(function (r) {
      return String(r.id) === t.getAttribute("data-toggle");
    })[0];
    row.isActive = t.checked;
    t.closest(".switch").querySelector(".switch__label").textContent = t.checked ? "On" : "Off";
    DS.ui.toast(row.name + (t.checked ? " is on for round " : " is off for round ") + round.id, "tabler:circle-check");
  });

  /* ---------- Prototype states ---------- */
  var states = ["data", "loading", "empty", "error", "preview", "only-on"];
  function setState(s) {
    DS.dialog.close();
    if (s === "only-on") {
      list.setMode("data");
      var sel = $("f-active");
      sel.value = "on";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    list.setMode(s === "preview" ? "data" : s);
    if (s === "preview") setTimeout(function () {
      L.previewLimitSet(M.limitTemplate(rows[0].id));
    }, 400);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
