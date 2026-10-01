/* ==========================================================================
   Providers list (Phase 3): the first page on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/provider/ProviderTable.tsx
     columns: ID, Provider name, Prefix code, Currency, Status, Created at, Updated at, Actions
     filters: search text, currency (all | id), status (all | enabled | disabled)
     row menu (RowOptions): Users, Players, Edit*, Delete*   (*permission-gated)
     delete: ConfirmModal → 422 = ErrorDialog with the server message
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;

  /* ---------- Mock data: assets/js/mock/providers.js ---------- */
  var CURRENCIES = DS.mock.currencies;
  var providers = DS.mock.providers.slice();

  /* ---------- Filters (options come from useGetCurrenciesForProvider) ---------- */
  document.getElementById("f-currency").innerHTML =
    '<option value="all">All currencies</option>' +
    CURRENCIES.map(function (c) {
      return '<option value="' + c.id + '">' + c.code + " - " + esc(c.name) + "</option>";
    }).join("");

  var label = function (r) {
    return r.name + " (" + r.prefixCode + ")";
  };

  /* ---------- List ---------- */
  var list = DS.list.create({
    root: document.getElementById("providers-card"),
    noun: ["provider", "providers"],
    rows: function () {
      return providers;
    },
    search: function (r) {
      return r.name + " " + r.prefixCode + " " + r.id;
    },
    filters: {
      currencyId: function (r, v) {
        return String(r.currency.id) === v;
      },
      isEnable: function (r, v) {
        return v === "enabled" ? r.isEnable === "yes" : r.isEnable !== "yes";
      },
    },
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "name", label: "Provider name", className: "is-strong", render: function (r) {
        return esc(r.name);
      } },
      { key: "prefixCode", label: "Prefix code", render: function (r) {
        return '<span class="code">' + esc(r.prefixCode) + "</span>";
      } },
      { key: "currency", label: "Currency", sortValue: function (r) {
        return r.currency.code;
      }, render: function (r) {
        return '<span class="t-primary t-medium">' + r.currency.code + '</span><span class="cell-sub">' + esc(r.currency.name) + "</span>";
      } },
      { key: "isEnable", label: "Status", render: function (r) {
        return r.isEnable === "yes"
          ? '<span class="chip chip--success"><span class="chip__dot"></span>Enabled</span>'
          : '<span class="chip"><span class="chip__dot"></span>Disabled</span>';
      } },
      { key: "createdAt", label: "Created", render: function (r) {
        return fmt.dateTime(r.createdAt);
      } },
      { key: "updatedAt", label: "Updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: label,
    // Most important first: Edit + Delete show as icons, Users + Players go in the ⋮ menu
    actions: function (r) {
      return [
        { label: "Edit", icon: "tabler:pencil", href: "provider-form.html?id=" + r.id },
        { label: "Delete", icon: "tabler:trash", action: "delete", danger: true },
        { label: "Users", icon: "tabler:users", href: "provider-users.html?id=" + r.id },
        { label: "Players", icon: "tabler:user-circle", href: "provider-players.html?id=" + r.id },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    empty: {
      icon: "tabler:building-store",
      title: "No providers yet",
      text: "Add a provider to connect a partner site and start taking bets.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="provider-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New provider</a>',
    },
    noResults: {
      icon: "tabler:search",
      title: "No providers match",
      text: "Try a different name or code, or clear the filters.",
    },
  });

  /* ---------- Delete: confirm → success toast, or 422 → explain why ---------- */
  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash",
      tone: "error",
      title: "Delete this provider?",
      html: "<strong>" + esc(label(row)) + "</strong> and its settings will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true }, // safe choice gets focus
        {
          label: "Delete provider",
          variant: "contained",
          tone: "error",
          onClick: function (btn, close) {
            DS.ui.busy(btn, true, "Deleting…");
            setTimeout(function () {
              close();
              if (row.hasPlayers) return cannotDelete(row);
              providers = providers.filter(function (p) {
                return p.id !== row.id;
              });
              DS.ui.toast(label(row) + " deleted", "tabler:circle-check");
              list.refresh();
            }, 700);
          },
        },
      ],
    });
  }

  function cannotDelete(row) {
    // 422 → ErrorDialog with extractAxiosErrorMessage(); fallback text from the app
    DS.dialog.open({
      icon: "tabler:alert-triangle",
      tone: "warning",
      title: "Can't delete this provider",
      html:
        "<strong>" + esc(label(row)) + "</strong> still has players. Disable it instead, or contact an admin to delete it.",
      actions: [{ label: "Got it", variant: "contained", autofocus: true }],
    });
  }

  /* ---------- Prototype states ---------- */
  var sample = providers[0];
  var states = ["data", "loading", "empty", "no-results", "error", "confirm-delete", "cannot-delete"];
  var setState = function (s) {
    DS.dialog.close();
    if (s === "confirm-delete" || s === "cannot-delete") {
      list.setMode("data");
      setTimeout(function () {
        (s === "confirm-delete" ? confirmDelete : cannotDelete)(sample);
      }, 400);
      return;
    }
    list.setMode(s);
  };
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
