/* ==========================================================================
   Provider users (Phase 11a) on the LIST TEMPLATE. ?id=<provider id>
   Source: views/pages/provider/user/table/ProviderUserTable.tsx
     columns: ID, Name, Email, Created at, Updated at, Actions (Edit, Delete; gated by the "provider"
       permission, not "provider.user"); search; delete confirm "ผู้ใช้" + toast "ลบผู้ใช้งานเรียบร้อยแล้ว"
       (both hard-coded Thai); page header "New user" (provider.user.create)
   + views/pages/provider/ProviderUsersTable.tsx (the old Users tab in provider edit): Reset password
   Changes (option A): the provider header with link tabs; one users page with Edit, Delete and Reset
   password (in ⋮); user groups shown per user; delete / reset confirms in plain words.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var P = DS.providerPages;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var p = P.byId(DS.params.get("id")) || P.byId(101);
  var rows = M.providerUsers(p.id);

  P.header($("provider-header"), p, "users", "Users",
    '<a class="btn btn--contained" href="provider-user-form.html?id=' + p.id + '"><iconify-icon icon="tabler:plus"></iconify-icon>New user</a>',
    { keys: 2, users: rows.length, players: M.providerPlayers(p.id).length });

  var groupName = function (id) {
    var g = M.userGroups.filter(function (x) {
      return x.id === id;
    })[0];
    return g ? g.name : "";
  };

  var list = DS.list.create({
    root: $("users-card"),
    noun: ["user", "users"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.name + " " + r.email;
    },
    filters: {},
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name);
      } },
      { key: "email", label: "Email", render: function (r) {
        return esc(r.email);
      } },
      { key: "groups", label: "User groups", sortable: false, render: function (r) {
        return '<span class="chip-row chip-row--nowrap">' + r.groups.map(function (g) {
          return '<span class="chip chip--outlined">' + esc(groupName(g)) + "</span>";
        }).join("") + "</span>";
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
        { label: "Edit", icon: "tabler:pencil", href: "provider-user-form.html?id=" + p.id + "&user=" + r.id, kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true },
        { label: "Reset password", icon: "tabler:lock-open", action: "reset" },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
      if (action === "reset") confirmReset(row);
    },
    empty: {
      icon: "tabler:users",
      title: "No users yet",
      text: "Add the people at " + p.name + " who sign in to the admin.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="provider-user-form.html?id=' + p.id + '"><iconify-icon icon="tabler:plus"></iconify-icon>New user</a>',
    },
    noResults: { icon: "tabler:search", title: "No users match", text: "Try another name or email." },
  });

  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash", tone: "error", title: "Delete this user?",
      html: "<strong>" + esc(row.name) + "</strong> (" + esc(row.email) + ") can't sign in after this. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete user", variant: "contained", tone: "error", onClick: function (b, close) {
          DS.ui.busy(b, true, "Deleting…");
          setTimeout(function () {
            close();
            rows.splice(rows.indexOf(row), 1);
            DS.ui.toast(row.name + " deleted", "tabler:circle-check");
            list.refresh();
          }, 700);
        } },
      ],
    });
  }
  function confirmReset(row) {
    DS.dialog.open({
      icon: "tabler:lock-open", tone: "warning", title: "Reset this user's password?",
      html: "<strong>" + esc(row.name) + "</strong> (" + esc(row.email) + ") will need the new password to sign in.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Reset password", variant: "contained", onClick: function (b, close) {
          DS.ui.busy(b, true, "Resetting…");
          setTimeout(function () {
            close();
            DS.ui.toast("Password reset for " + row.name, "tabler:circle-check");
          }, 600);
        } },
      ],
    });
  }

  var states = ["data", "loading", "empty", "no-results", "error", "delete", "reset"];
  function setState(s) {
    DS.dialog.close();
    list.setMode(s === "delete" || s === "reset" ? "data" : s);
    if (s === "delete") setTimeout(function () {
      confirmDelete(rows[rows.length - 1]);
    }, 400);
    if (s === "reset") setTimeout(function () {
      confirmReset(rows[0]);
    }, 400);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
