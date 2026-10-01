/* ==========================================================================
   Credit transactions list (Phase 9d) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/credit-transaction/CreditTransactionTable.tsx
     columns: ID, Player (displayName), Related player, type (raw "credit" / "debit" chip, credit =
       primary, debit = info), Amount, Total amount (bold, green ≥ 0 / red < 0 hex), Note (by UI
       language), Transaction date (date only), Actions (View icon); search
   Changes: ID links to the detail; Player + Related player in one cell ("with …" under the name,
   only when there is one) so 8 columns fit; credit / debit as sentence-case chips (Credit =
   success, Debit = neutral, no brand color); Total amount in ink with a minus sign, red only when
   below 0 (tokens, not hex); date + time (a transaction's time matters); a credit / debit filter
   (proposal).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var rows = M.creditTransactions();

  var typeChip = function (t) {
    return t === "credit"
      ? '<span class="chip chip--success"><span class="chip__dot"></span>Credit</span>'
      : '<span class="chip"><span class="chip__dot"></span>Debit</span>';
  };
  var signed = function (n, cur) {
    return n < 0 ? '<span class="t-error">−' + fmt.money(Math.abs(n), cur) + "</span>" : fmt.money(n, cur);
  };
  var cur = function (r) {
    return (r.provider && r.provider.currency && r.provider.currency.code) || "THB";
  };

  var list = DS.list.create({
    root: document.getElementById("tx-card"),
    noun: ["transaction", "transactions"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.id + " " + r.player.displayName + " " + r.player.username + " " + (r.relatedPlayer ? r.relatedPlayer.displayName : "");
    },
    filters: {
      type: function (r, v) {
        return r.type === v;
      },
    },
    columns: [
      { key: "id", label: "ID", render: function (r) {
        return '<a class="t-num" href="credit-transaction.html?id=' + r.id + '">' + esc(r.id) + "</a>";
      } },
      { key: "player", label: "Player", className: "is-strong", sortable: false, render: function (r) {
        return esc(r.player.displayName) + (r.relatedPlayer ? '<span class="cell-sub">with ' + esc(r.relatedPlayer.displayName) + "</span>" : "");
      } },
      { key: "type", label: "Type", render: function (r) {
        return typeChip(r.type);
      } },
      { key: "amount", label: "Amount", num: true, render: function (r) {
        return fmt.money(r.amount, cur(r));
      } },
      { key: "totalAmount", label: "Total", num: true, render: function (r) {
        return '<span class="t-medium">' + signed(r.totalAmount, cur(r)) + "</span>";
      } },
      { key: "note", label: "Note", sortable: false, render: function (r) {
        return '<span class="cell-clip" title="' + esc(r.creditTransactionNoteEn) + '">' + esc(r.creditTransactionNoteEn || "–") + "</span>";
      } },
      { key: "transactionDate", label: "Date", render: function (r) {
        return '<span class="t-num">' + fmt.dateTime(r.transactionDate) + "</span>";
      } },
    ],
    rowName: function (r) {
      return "transaction " + r.id;
    },
    actions: function (r) {
      return [{ label: "View", icon: "tabler:eye", href: "credit-transaction.html?id=" + r.id, kind: "view" }];
    },
    onAction: function () {},
    pageSize: 25,
    empty: { icon: "tabler:receipt", title: "No credit transactions yet", text: "Deposits, withdrawals, bonuses and transfers show up here." },
    noResults: { icon: "tabler:search", title: "No transactions match", text: "Try another player, ID or type." },
  });

  var states = ["data", "loading", "empty", "no-results", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: list.setMode };
  list.setMode(initial);
})(window.DS);
