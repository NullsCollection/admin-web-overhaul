/* ==========================================================================
   Limit number sets list (Phase 9a) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/limit-template/useLimitTemplateTable.tsx
     columns: Limit number set name, Type, Provider ("admin-default" when none), Actions
     row menu: View; Edit + Delete only for users with no providers, or the set's own provider
     filters: search, provider; then a disabled "Active Template" field (the picked provider's
       providerSizeTemplate.limitTemplate, "No default") + a View icon button
     delete: ConfirmModal → toast "deleteSuccess" / the API message
   Changes: Type → Scope chip (Global / Local, same as game limit numbers in 7d; the raw `type`
   values aren't known); "admin-default" → "All providers"; a Last updated column (createdAt /
   updatedAt are on the API type); the active set becomes a banner under the filters with its
   name and a View button, only when a provider is picked; View / Edit / Delete as icons.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var L = DS.lotto;
  var M = DS.mock;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var rows = M.limitTemplates.slice();

  var provider = function (id) {
    return M.providers.filter(function (p) {
      return p.id === Number(id);
    })[0];
  };
  var scopeHTML = function (t) {
    return t.providerId ? '<span class="chip chip--primary">Local</span>' : '<span class="chip">Global</span>';
  };

  $("f-provider").innerHTML = '<option value="all">All providers</option>' + M.providers.map(function (p) {
    return '<option value="' + p.id + '">' + esc(p.name) + (p.prefixCode ? " (" + esc(p.prefixCode) + ")" : "") + "</option>";
  }).join("");

  /* ---------- Active set for the picked provider (the app's "Active Template" field + View) ---------- */
  function paintActive() {
    var el = $("active-set");
    var pid = $("f-provider").value;
    if (pid === "all") {
      el.hidden = true;
      return;
    }
    var p = provider(pid);
    var t = M.limitTemplate(M.activeLimitTemplateId(pid));
    el.hidden = false;
    el.innerHTML = t
      ? '<div class="assign-banner is-set"><iconify-icon icon="tabler:circle-check"></iconify-icon><div class="assign-banner__text">' +
        '<div class="t-subtitle2">Active for ' + esc(p.name) + ": " + esc(t.name) + "</div>" +
        '<div class="t-body2 t-muted">Set by the provider\'s size. ' + (t.providerId ? "A local set." : "A global set.") + "</div></div>" +
        '<a class="btn btn--outlined btn--sm" href="limit-template.html?id=' + t.id + '"><iconify-icon icon="tabler:eye"></iconify-icon>View set</a></div>'
      : '<div class="assign-banner"><iconify-icon icon="tabler:circle-dashed"></iconify-icon><div class="assign-banner__text">' +
        '<div class="t-subtitle2">No active set for ' + esc(p.name) + "</div>" +
        '<div class="t-body2 t-muted">The provider\'s size has no limit set yet.</div></div></div>';
  }
  $("f-provider").addEventListener("change", paintActive);

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
      providerId: function (r, v) {
        return String(r.providerId) === v;
      },
    },
    columns: [
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return '<a href="limit-template.html?id=' + r.id + '">' + esc(r.name) + "</a>";
      } },
      { key: "scope", label: "Scope", sortValue: function (r) {
        return r.providerId ? 1 : 0;
      }, render: scopeHTML },
      { key: "providerId", label: "Provider", sortValue: function (r) {
        return r.providerId ? provider(r.providerId).name : "";
      }, render: function (r) {
        var p = r.providerId && provider(r.providerId);
        return p ? esc(p.name) + ' <span class="code">' + esc(p.prefixCode) + "</span>" : '<span class="t-muted">All providers</span>';
      } },
      { key: "updatedAt", label: "Last updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.name;
    },
    // View always; Edit + Delete when the user has no providers or owns the set (superadmin here)
    actions: function (r) {
      return [
        { label: "View", icon: "tabler:eye", href: "limit-template.html?id=" + r.id, kind: "view" },
        { label: "Edit", icon: "tabler:pencil", href: "limit-template-form.html?id=" + r.id, kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    onClear: paintActive,
    empty: {
      icon: "tabler:numbers",
      title: "No limit sets yet",
      text: "A limit set caps how much can be bet on a number, and lowers the payout as bets grow.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="limit-template-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New limit set</a>',
    },
    noResults: { icon: "tabler:search", title: "No sets match", text: "This provider has no local sets. Global sets are listed under All providers." },
  });

  /* ---------- Delete ---------- */
  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash",
      tone: "error",
      title: "Delete this limit set?",
      html: "<strong>" + esc(row.name) + "</strong> will be removed. Games and rounds that use it stop using it. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete set", variant: "contained", tone: "error", onClick: function (btn, close) {
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
  var states = ["data", "loading", "empty", "no-results", "error", "provider", "no-active-set", "delete"];
  function pick(v) {
    var sel = $("f-provider");
    sel.value = v;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function setState(s) {
    DS.dialog.close();
    if (s === "provider") return list.setMode("data"), pick("102");
    if (s === "no-active-set") return list.setMode("data"), pick("105");
    if (s === "delete") {
      list.setMode("data");
      return setTimeout(function () {
        confirmDelete(rows[3]);
      }, 450);
    }
    list.setMode(s);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
