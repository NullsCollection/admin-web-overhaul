/* ==========================================================================
   User management (Phase 11c) on the LIST TEMPLATE.
   Source: views/pages/user/UserTable.tsx
     columns: ID, Full name, Email, Provider (comma list cut at 25 chars + tooltip), Created at,
       Updated at, Actions (Edit, Delete → confirm "Delete user?" → toast "Delete user successfully")
     filters: search, provider (Autocomplete)
   Changes: providers as chips (first one + "+N"); users with no provider read "Admin · all
   providers" (the app treats no providers as an admin who sees everything); user groups shown; a
   group filter and an "Admins" provider option (proposals); Created at dropped.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var rows = M.users().slice();
  var prov = function (id) {
    return M.providers.filter(function (p) {
      return p.id === id;
    })[0];
  };
  var group = function (id) {
    return M.userGroups.filter(function (g) {
      return g.id === id;
    })[0];
  };

  $("f-provider").innerHTML = '<option value="all">All providers</option><option value="none">Admins (no provider)</option>' +
    M.providers.slice(0, 10).map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.name) + " (" + esc(p.prefixCode) + ")</option>";
    }).join("");
  $("f-group").innerHTML = '<option value="all">All user groups</option>' + M.userGroups.map(function (g) {
    return '<option value="' + g.id + '">' + esc(g.name) + "</option>";
  }).join("");

  var list = DS.list.create({
    root: $("users-card"),
    noun: ["user", "users"],
    pageSize: 25,
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.name + " " + r.email;
    },
    filters: {
      provider: function (r, v) {
        return v === "none" ? !r.providers.length : r.providers.indexOf(Number(v)) > -1;
      },
      group: function (r, v) {
        return r.groups.indexOf(Number(v)) > -1;
      },
    },
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name) + '<span class="cell-sub">' + esc(r.email) + "</span>";
      } },
      { key: "providers", label: "Providers", sortable: false, render: function (r) {
        if (!r.providers.length) return '<span class="chip chip--outlined"><iconify-icon icon="tabler:shield"></iconify-icon>Admin · all providers</span>';
        var first = prov(r.providers[0]);
        var rest = r.providers.slice(1).map(function (id) {
          return prov(id).name;
        });
        return esc(first.name) + (rest.length ? ' <span class="chip" title="' + esc(rest.join(", ")) + '">+' + rest.length + "</span>" : "");
      } },
      { key: "groups", label: "User groups", sortable: false, render: function (r) {
        return '<span class="chip-row chip-row--nowrap">' + r.groups.map(function (g) {
          return '<span class="chip chip--outlined">' + esc(group(g).name) + "</span>";
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
        { label: "Edit", icon: "tabler:pencil", href: "user-form.html?user=" + r.id, kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    empty: {
      icon: "tabler:users", title: "No users yet", text: "Add the people who sign in to this admin.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="user-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New user</a>',
    },
    noResults: { icon: "tabler:search", title: "No users match", text: "Try another name, provider or group." },
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

  var states = ["data", "loading", "empty", "no-results", "error", "admins"];
  function setState(s) {
    DS.dialog.close();
    if (s === "admins") {
      list.setMode("data");
      $("f-provider").value = "none";
      return $("f-provider").dispatchEvent(new Event("change", { bubbles: true }));
    }
    list.setMode(s);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
