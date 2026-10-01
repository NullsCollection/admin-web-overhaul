/* ==========================================================================
   Set lottery number limits list (Phase 9b) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/group-limit-template/useGroupLimitTemplateTable.tsx
     columns: Template name, Type (Global / Local), Provider ("Global" when none), Active (a
       clickable chip: active global = purple, active local = green, inactive = grey), Updated at
     row menu (only if the user can change it): Edit, Activate / Deactivate, Delete (only when
       inactive and not system_default)
     confirms: confirmActivate / confirmDeactivate / confirmDelete; 422 → errorHandler toast
   Changes: the clickable chip → an On / Off switch (it looked like a label); the purple / green
   hex chips → the switch + a Scope chip (tokens only); the confirm names the template that gets
   turned off, and says plainly when betting would fail; how scopes work is said once above the
   table; Edit + Delete as icons, Delete greyed out with the reason instead of disappearing;
   system_default gets a "System" tag; a scope filter (proposal).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var G = DS.lotto.groupLimit;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var rows = M.groupLimitTemplates; // shared array: the switch flips peers too

  var provider = function (id) {
    return M.providers.filter(function (p) {
      return p.id === Number(id);
    })[0];
  };

  var list = DS.list.create({
    root: $("glt-card"),
    noun: ["template", "templates"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.name;
    },
    filters: {
      scope: function (r, v) {
        return r.type === v;
      },
    },
    columns: [
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name) + (G.isSystemDefault(r) ? ' <span class="chip chip--outlined">System</span>' : "");
      } },
      { key: "type", label: "Scope", render: function (r) {
        return r.providerId ? '<span class="chip chip--primary">Local</span>' : '<span class="chip">Global</span>';
      } },
      { key: "providerId", label: "Provider", sortValue: function (r) {
        return r.providerId ? provider(r.providerId).name : "";
      }, render: function (r) {
        var p = r.providerId && provider(r.providerId);
        return p ? esc(p.name) + ' <span class="code">' + esc(p.prefixCode) + "</span>" : '<span class="t-muted">All providers</span>';
      } },
      { key: "isActive", label: "Status", sortable: false, render: function (r) {
        return '<label class="switch"><input type="checkbox" role="switch" data-toggle="' + r.id + '"' + (r.isActive ? " checked" : "") +
          ' aria-label="' + esc(r.name) + ' active"><span class="switch__track"><span class="switch__thumb"></span></span>' +
          '<span class="switch__label">' + (r.isActive ? "Active" : "Off") + "</span></label>";
      } },
      { key: "updatedAt", label: "Last updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.name;
    },
    actions: function (r) {
      return [
        { label: "Edit", icon: "tabler:pencil", href: "group-limit-template-form.html?id=" + r.id, kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true, disabled: G.deleteBlock(r) },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    empty: {
      icon: "tabler:list-numbers",
      title: "No templates yet",
      text: "A template caps how often players and providers can repeat Set lottery numbers.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="group-limit-template-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New limit template</a>',
    },
    noResults: { icon: "tabler:search", title: "No templates match", text: "Try another name or scope." },
  });

  /* ---------- Status switch: confirm first (activate / deactivate), then save ---------- */
  $("glt-card").addEventListener("change", function (e) {
    var t = e.target.closest("[data-toggle]");
    if (!t) return;
    var row = rows.filter(function (r) {
      return String(r.id) === t.getAttribute("data-toggle");
    })[0];
    var on = t.checked;
    t.checked = !on; // stays as it was until confirmed
    G.toggle(row, on, function () {
      list.refresh();
    });
  });

  /* ---------- Delete: confirm → toast, or assigned to a game → can't delete ---------- */
  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash",
      tone: "error",
      title: "Delete this template?",
      html: "<strong>" + esc(row.name) + "</strong> will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete template", variant: "contained", tone: "error", onClick: function (btn, close) {
          DS.ui.busy(btn, true, "Deleting…");
          setTimeout(function () {
            close();
            var games = M.groupLimitGames(row.id);
            if (games.length) return cannotDelete(row, games);
            rows.splice(rows.indexOf(row), 1);
            DS.ui.toast(row.name + " deleted", "tabler:circle-check");
            list.refresh();
          }, 700);
        } },
      ],
    });
  }
  // 422 cannotDeleteAssigned (app: toast). Mock names the games; the real API may only send the message.
  function cannotDelete(row, games) {
    DS.dialog.open({
      icon: "tabler:link",
      tone: "error",
      title: "Can't delete " + row.name,
      html: "It's assigned to a game. Unassign it from the game's Limit groups page first.",
      body: '<ul class="dialog__list">' + games.map(function (g) {
        return '<li><a href="lotto-game-limit-groups.html?id=' + g.game.id + '">' + esc(DS.lotto.name(g.game.translations)) + "</a> · " +
          esc(provider(g.providerId).name) + "</li>";
      }).join("") + "</ul>",
      actions: [{ label: "OK", variant: "contained", autofocus: true }],
    });
  }

  /* ---------- Prototype states ---------- */
  var states = ["data", "loading", "empty", "no-results", "error", "turn-on", "turn-off-global", "cant-delete"];
  function setState(s) {
    DS.dialog.close();
    list.setMode(s === "turn-on" || s === "turn-off-global" || s === "cant-delete" ? "data" : s);
    var byId = function (id) {
      return rows.filter(function (r) {
        return r.id === id;
      })[0];
    };
    if (s === "turn-on") setTimeout(function () {
      G.toggle(byId(503), true, list.refresh);
    }, 450);
    if (s === "turn-off-global") setTimeout(function () {
      G.toggle(byId(501), false, list.refresh);
    }, 450);
    if (s === "cant-delete") setTimeout(function () {
      cannotDelete(byId(505), M.groupLimitGames(505));
    }, 450);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
