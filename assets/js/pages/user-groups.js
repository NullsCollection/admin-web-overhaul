/* ==========================================================================
   User groups (Phase 11c) on the LIST TEMPLATE.
   Source: views/pages/user-group/UserGroupTable.tsx
     columns: ID, Group name, Description, Created at, Updated at, Actions (Edit, Delete → confirm →
       toast "Delete group successfully"); search
   Changes: permissions count ("64 of 82") and users count in the group (proposal: needs a count from
   the API; the mock counts users); descriptions on one line with the full text on hover (real ones can
   be empty or long); Created at dropped; deleting a group
   that still has users → can't-delete dialog (mock).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var rows = M.userGroups.slice();
  var total = M.permissions.length;
  var usersIn = function (g) {
    return M.users().filter(function (u) {
      return u.groups.indexOf(g.id) > -1;
    }).length;
  };

  var list = DS.list.create({
    root: document.getElementById("groups-card"),
    noun: ["group", "groups"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.name + " " + (r.description || "");
    },
    filters: {},
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name);
      } },
      // Real descriptions can be empty, repeat the name, or run long: one line, full text on hover
      { key: "description", label: "Description", sortable: false, render: function (r) {
        return r.description ? '<span class="cell-clip" title="' + esc(r.description) + '">' + esc(r.description) + "</span>" : '<span class="t-faint">–</span>';
      } },
      { key: "permissions", label: "Permissions", num: true, sortValue: function (r) {
        return r.permissions.length;
      }, render: function (r) {
        var n = r.permissions.length;
        return (n === total ? "All " + total : fmt.int(n) + ' <span class="t-muted">of ' + total + "</span>");
      } },
      { key: "users", label: "Users", num: true, sortValue: usersIn, render: function (r) {
        return fmt.int(usersIn(r));
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
        { label: "Edit", icon: "tabler:pencil", href: "user-group-form.html?id=" + r.id, kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    empty: {
      icon: "tabler:users-group", title: "No user groups yet", text: "A group bundles permissions you give to users.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="user-group-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New user group</a>',
    },
    noResults: { icon: "tabler:search", title: "No groups match", text: "Try another name." },
  });

  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash", tone: "error", title: "Delete this user group?",
      html: "<strong>" + esc(row.name) + "</strong> will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete group", variant: "contained", tone: "error", onClick: function (b, close) {
          DS.ui.busy(b, true, "Deleting…");
          setTimeout(function () {
            close();
            var n = usersIn(row);
            if (n) {
              // Mock 422; the real message comes from the API (errorHandler)
              return DS.dialog.open({
                icon: "tabler:alert-triangle", tone: "error", title: "Can't delete " + row.name,
                html: n + (n === 1 ? " user is" : " users are") + " still in this group. Move them to another group first.",
                actions: [{ label: "OK", variant: "contained", autofocus: true }],
              });
            }
            rows.splice(rows.indexOf(row), 1);
            DS.ui.toast(row.name + " deleted", "tabler:circle-check");
            list.refresh();
          }, 700);
        } },
      ],
    });
  }

  var states = ["data", "loading", "empty", "no-results", "error", "cant-delete"];
  function setState(s) {
    DS.dialog.close();
    list.setMode(s === "cant-delete" ? "data" : s);
    if (s === "cant-delete") setTimeout(function () {
      confirmDelete(rows[2]);
    }, 400);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
