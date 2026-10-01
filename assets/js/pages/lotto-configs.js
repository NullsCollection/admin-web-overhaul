/* ==========================================================================
   Config management list (Phase 7a) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/config/ConfigTable.tsx
     columns: ID, Name, Created at, Updated at, Actions (Edit, Delete)
     search: text · delete: ConfirmModal → toast / errorHandler toast
   Proposals: Type column (LottoConfig.type is on every row) + type filter (needs
   filter[type] on the API).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var L = DS.lotto;
  var configs = DS.mock.configs.slice();

  document.getElementById("f-type").innerHTML =
    '<option value="all">All types</option>' +
    L.types.map(function (t) {
      return '<option value="' + t.value + '">' + esc(t.label) + "</option>";
    }).join("");

  var list = DS.list.create({
    root: document.getElementById("configs-card"),
    noun: ["config", "configs"],
    rows: function () {
      return configs;
    },
    search: function (r) {
      return r.name + " " + r.id;
    },
    filters: {
      type: function (r, v) {
        return r.type === v;
      },
    },
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return '<a href="lotto-config-form.html?id=' + r.id + '">' + esc(r.name) + "</a>";
      } },
      { key: "type", label: "Type", sortValue: function (r) {
        return L.typeLabel(r.type);
      }, render: function (r) {
        return esc(L.typeLabel(r.type)) +
          (r.type === "group_custom" ? '<span class="cell-sub">' + r.groupCustomDigitLength + " digits</span>" : "");
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
        { label: "Edit", icon: "tabler:pencil", href: "lotto-config-form.html?id=" + r.id },
        { label: "Delete", icon: "tabler:trash", action: "delete", danger: true },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    empty: {
      icon: "tabler:settings",
      title: "No configs yet",
      text: "A config is a set of pay rates. Create one, then pick it when you set up a game.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="lotto-config-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New config</a>',
    },
    noResults: {
      icon: "tabler:search",
      title: "No configs match",
      text: "Try a different name, or clear the filters.",
    },
  });

  /* ---------- Delete: confirm → toast, or API error → dialog with the server message ---------- */
  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash",
      tone: "error",
      title: "Delete this config?",
      html: "<strong>" + esc(row.name) + "</strong> and its pay rates will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        {
          label: "Delete config",
          variant: "contained",
          tone: "error",
          onClick: function (btn, close) {
            DS.ui.busy(btn, true, "Deleting…");
            setTimeout(function () {
              close();
              if (row.gamesUsing) return cannotDelete(row);
              configs = configs.filter(function (c) {
                return c.id !== row.id;
              });
              DS.ui.toast(row.name + " deleted", "tabler:circle-check");
              list.refresh();
            }, 700);
          },
        },
      ],
    });
  }

  // The app shows errorHandler(error) in a toast. A dialog keeps the reason on screen.
  // The mock message is a placeholder for whatever the API returns.
  function cannotDelete(row) {
    DS.dialog.open({
      icon: "tabler:alert-triangle",
      tone: "warning",
      title: "Can't delete this config",
      html: "<strong>" + esc(row.name) + "</strong> is used by " + row.gamesUsing + (row.gamesUsing === 1 ? " game" : " games") +
        ". Move those games to another config first.",
      actions: [{ label: "Got it", variant: "contained", autofocus: true }],
    });
  }

  /* ---------- Prototype states ---------- */
  var inUse = configs[0];
  var unused = configs.filter(function (c) {
    return !c.gamesUsing;
  })[0];
  var states = ["data", "loading", "empty", "no-results", "error", "confirm-delete", "cannot-delete"];
  function setState(s) {
    DS.dialog.close();
    if (s === "confirm-delete" || s === "cannot-delete") {
      list.setMode("data");
      setTimeout(function () {
        if (s === "confirm-delete") confirmDelete(unused);
        else cannotDelete(inUse);
      }, 400);
      return;
    }
    list.setMode(s);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
