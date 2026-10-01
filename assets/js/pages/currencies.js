/* ==========================================================================
   Currencies (Phase 11d) on the LIST TEMPLATE.
   Source: views/pages/currency/CurrencyTable.tsx
     columns: ID, Code, Name, Bet Set Price (the 4 numbers joined), Minimum Running Bet, Created at,
       Updated at, Actions (Edit, Delete → confirm → toast "Delete currency successfully"); search
   Changes: the 4 bet set amounts as small chips in the currency's format; code as a code tag; Created
   at dropped; a currency providers still use → can't-delete dialog (mock).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var rows = M.currencyList.slice();
  var amt = function (n) {
    return n % 1 ? fmt.money(n, "XXX").replace(/^XXX /, "") : fmt.int(n);
  };

  var list = DS.list.create({
    root: document.getElementById("list-card"),
    noun: ["currency", "currencies"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.code + " " + r.name;
    },
    filters: {},
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "code", label: "Code", render: function (r) {
        return '<span class="code">' + esc(r.code) + "</span>";
      } },
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name);
      } },
      { key: "betSetPrice", label: "Bet set amounts", sortable: false, render: function (r) {
        return '<span class="chip-row chip-row--nowrap">' + r.betSetPrice.map(function (n) {
          return '<span class="chip chip--outlined t-num">' + amt(n) + "</span>";
        }).join("") + "</span>";
      } },
      { key: "minRunningBet", label: "Min run bet", num: true, render: function (r) {
        return amt(r.minRunningBet);
      } },
      { key: "updatedAt", label: "Last updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.code;
    },
    actions: function (r) {
      return [
        { label: "Edit", icon: "tabler:pencil", href: "currency-form.html?id=" + r.id, kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true },
      ];
    },
    onAction: function (a, row) {
      if (a !== "delete") return;
      DS.dialog.open({
        icon: "tabler:trash", tone: "error", title: "Delete " + row.code + "?",
        html: "<strong>" + esc(row.name) + "</strong> will be removed. This can't be undone.",
        actions: [
          { label: "Cancel", variant: "outlined", autofocus: true },
          { label: "Delete currency", variant: "contained", tone: "error", onClick: function (b, close) {
            DS.ui.busy(b, true, "Deleting…");
            setTimeout(function () {
              close();
              var n = M.providersInCurrency(row.code);
              if (n) {
                return DS.dialog.open({
                  icon: "tabler:alert-triangle", tone: "error", title: "Can't delete " + row.code,
                  html: n + (n === 1 ? " provider uses" : " providers use") + " this currency.", // mock 422
                  actions: [{ label: "OK", variant: "contained", autofocus: true }],
                });
              }
              rows.splice(rows.indexOf(row), 1);
              DS.ui.toast(row.code + " deleted", "tabler:circle-check");
              list.refresh();
            }, 700);
          } },
        ],
      });
    },
    empty: { icon: "tabler:coin", title: "No currencies yet", text: "Providers pick a currency on their form.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="currency-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New currency</a>' },
    noResults: { icon: "tabler:search", title: "No currencies match", text: "Try another code or name." },
  });

  var states = ["data", "loading", "empty", "no-results", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: list.setMode };
  list.setMode(initial);
})(window.DS);
