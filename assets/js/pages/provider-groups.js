/* ==========================================================================
   Provider groups list (Phase 11b) on the LIST TEMPLATE.
   Source: views/pages/provider-groups/ProviderGroupsTable.tsx
     columns: ID, Provider group name, Api Key (first 18 chars + "..." + copy, or "Not Set"),
       Protected (Yes = green, No = red), Created at, Updated at, Actions
     row menu (not for protected groups: no actions at all): Edit, Generate / Regenerate API key
       (confirm → toast), Delete (confirm → toast "Provider group deleted successfully")
   Changes: a lock tag on protected groups instead of a red "No" on every other row; protected rows keep
   Edit + Delete greyed out with the reason (the app shows nothing and says nothing); the key as a short
   code tag + copy, "Not set" in grey; regenerate warns the old key stops working and shows the new key
   once, with copy; Created at dropped.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var rows = M.providerGroupList.slice();
  var LOCKED = "Protected groups can't be changed";

  var keyHTML = function (r) {
    if (!r.externalApiKey) return '<span class="t-faint">Not set</span>';
    return '<span class="code" title="' + esc(r.externalApiKey) + '">' + esc(r.externalApiKey.slice(0, 12)) + "…" + esc(r.externalApiKey.slice(-4)) + "</span>" +
      '<button type="button" class="icon-btn icon-btn--sm" style="margin-left:4px;vertical-align:middle" data-copy="' + esc(r.externalApiKey) +
      '" data-copy-label="API key copied" aria-label="Copy the API key of ' + esc(r.name) + '" title="Copy"><iconify-icon icon="tabler:copy"></iconify-icon></button>';
  };

  var list = DS.list.create({
    root: document.getElementById("groups-card"),
    noun: ["group", "groups"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.name;
    },
    filters: {},
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name) + (r.isProtected ? ' <span class="chip chip--outlined"><iconify-icon icon="tabler:lock"></iconify-icon>Protected</span>' : "");
      } },
      { key: "externalApiKey", label: "API key", sortable: false, render: keyHTML },
      { key: "updatedAt", label: "Last updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.name;
    },
    actions: function (r) {
      var a = [
        { label: "Edit", icon: "tabler:pencil", href: "provider-group-form.html?id=" + r.id, kind: "edit", disabled: r.isProtected ? LOCKED : "" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true, disabled: r.isProtected ? LOCKED : "" },
      ];
      if (!r.isProtected) a.push({ label: r.externalApiKey ? "Regenerate API key" : "Generate API key", icon: "tabler:key", action: "key" });
      return a;
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
      if (action === "key") confirmKey(row);
    },
    empty: {
      icon: "tabler:stack-2", title: "No provider groups yet", text: "Groups sort providers, like by country.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="provider-group-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New provider group</a>',
    },
    noResults: { icon: "tabler:search", title: "No groups match", text: "Try another name." },
  });

  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash", tone: "error", title: "Delete this provider group?",
      html: "<strong>" + esc(row.name) + "</strong> will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete group", variant: "contained", tone: "error", onClick: function (b, close) {
          DS.ui.busy(b, true, "Deleting…");
          setTimeout(function () {
            close();
            var n = M.providersInGroup(row.id);
            if (n) {
              // Mock 422: the real message comes from the API (errorHandler)
              return DS.dialog.open({
                icon: "tabler:alert-triangle", tone: "error", title: "Can't delete " + row.name,
                html: n + (n === 1 ? " provider is" : " providers are") + " still in this group. Move them to another group first.",
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

  function confirmKey(row) {
    var again = !!row.externalApiKey;
    DS.dialog.open({
      icon: "tabler:key", tone: again ? "warning" : "primary",
      title: (again ? "Regenerate" : "Generate") + " the API key for " + row.name + "?",
      html: again ? "The current key stops working right away. Anything that uses it needs the new key." : "The group gets a key it can use to call the API.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: again ? "Regenerate key" : "Generate key", variant: "contained", onClick: function (b, close) {
          DS.ui.busy(b, true, "Generating…");
          setTimeout(function () {
            close();
            row.externalApiKey = M.hex(Date.now() % 2147483647, 48);
            row.updatedAt = Date.now();
            list.refresh();
            DS.dialog.open({
              icon: "tabler:circle-check", tone: "primary", wide: true, title: "New API key for " + row.name,
              html: "Copy it now and send it to whoever uses it.",
              body: '<pre class="code-block code-block--wrap">' + esc(row.externalApiKey) + '<span class="code-block__copy"><button type="button" class="icon-btn icon-btn--sm" data-copy="' +
                esc(row.externalApiKey) + '" data-copy-label="API key copied" aria-label="Copy the new key" title="Copy"><iconify-icon icon="tabler:copy"></iconify-icon></button></span></pre>',
              actions: [{ label: "Done", variant: "contained", autofocus: true }],
            });
          }, 800);
        } },
      ],
    });
  }

  var states = ["data", "loading", "empty", "no-results", "error", "regenerate", "cant-delete"];
  function setState(s) {
    DS.dialog.close();
    list.setMode(s === "regenerate" || s === "cant-delete" ? "data" : s);
    if (s === "regenerate") setTimeout(function () {
      confirmKey(rows[1]);
    }, 400);
    if (s === "cant-delete") setTimeout(function () {
      confirmDelete(rows[1]);
    }, 400);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
