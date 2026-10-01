/* ==========================================================================
   Group management list (Phase 7b) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/group/LottoGroupTable.tsx
     columns: Order (sort), ID, Code, Group name (trans() in the UI language), Created at,
              Updated at, Actions (Edit, Delete)
     search: text · default order: sort asc · delete: ConfirmModal → toast / errorHandler toast
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var L = DS.lotto;
  var groups = DS.mock.groups.slice().sort(function (a, b) {
    return a.sort - b.sort;
  });
  var name = function (r) {
    return L.name(r.translations);
  };

  var list = DS.list.create({
    root: document.getElementById("groups-card"),
    noun: ["group", "groups"],
    rows: function () {
      return groups;
    },
    search: function (r) {
      return r.translations.map(function (t) {
        return t.name;
      }).join(" ") + " " + r.code + " " + r.id;
    },
    filters: {},
    columns: [
      { key: "sort", label: "Order", num: true, render: function (r) {
        return '<span class="t-medium">' + r.sort + "</span>";
      } },
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "code", label: "Code", render: function (r) {
        return '<span class="code">' + esc(r.code) + "</span>";
      } },
      { key: "name", label: "Group name", className: "is-strong", sortValue: name, render: function (r) {
        return '<a href="lotto-group-form.html?id=' + r.id + '">' + esc(name(r)) + "</a>";
      } },
      { key: "createdAt", label: "Created", render: function (r) {
        return fmt.dateTime(r.createdAt);
      } },
      { key: "updatedAt", label: "Updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: name,
    actions: function (r) {
      return [
        { label: "Edit", icon: "tabler:pencil", href: "lotto-group-form.html?id=" + r.id },
        { label: "Delete", icon: "tabler:trash", action: "delete", danger: true },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    empty: {
      icon: "tabler:folders",
      title: "No groups yet",
      text: "Groups sort games into families like Thai government or Hanoi. Create one before you add games.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="lotto-group-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New group</a>',
    },
    noResults: {
      icon: "tabler:search",
      title: "No groups match",
      text: "Try a different name or code.",
    },
  });

  /* ---------- Delete: confirm → toast, or API error → dialog (app: errorHandler toast) ---------- */
  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash",
      tone: "error",
      title: "Delete this group?",
      html: "<strong>" + esc(name(row)) + "</strong> (" + esc(row.code) + ") will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        {
          label: "Delete group",
          variant: "contained",
          tone: "error",
          onClick: function (btn, close) {
            DS.ui.busy(btn, true, "Deleting…");
            setTimeout(function () {
              close();
              if (row.gamesUsing) return cannotDelete(row);
              groups = groups.filter(function (g) {
                return g.id !== row.id;
              });
              DS.ui.toast(name(row) + " deleted", "tabler:circle-check");
              list.refresh();
            }, 700);
          },
        },
      ],
    });
  }

  // Mock message: a placeholder for whatever the API returns
  function cannotDelete(row) {
    DS.dialog.open({
      icon: "tabler:alert-triangle",
      tone: "warning",
      title: "Can't delete this group",
      html: "<strong>" + esc(name(row)) + "</strong> still has " + row.gamesUsing + (row.gamesUsing === 1 ? " game" : " games") +
        ". Move those games to another group first.",
      actions: [{ label: "Got it", variant: "contained", autofocus: true }],
    });
  }

  /* ---------- Prototype states ---------- */
  var inUse = groups[0];
  var unused = groups.filter(function (g) {
    return !g.gamesUsing;
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
