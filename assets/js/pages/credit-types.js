/* ==========================================================================
   Credit transaction types list (Phase 9c) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/credit-transaction-type/CreditTransactionTypeTable.tsx
     columns: ID, Code, Name, Can Negative Value (green check / red x), Enabled (green check /
       red x), Created at, Updated at, Actions (Edit icon); search; no delete
   Changes: the green / red icons → "Allowed" text and a status chip (Disabled is neutral, not
   red, as on every list); Created at dropped (Last updated is enough on a 10-row lookup table);
   code as a code tag; a status filter (proposal).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var rows = DS.mock.creditTypes;

  var list = DS.list.create({
    root: document.getElementById("types-card"),
    noun: ["type", "types"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.code + " " + r.name;
    },
    filters: {
      status: function (r, v) {
        return r.status === v;
      },
    },
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
      { key: "canNegativeValue", label: "Negative amounts", render: function (r) {
        return r.canNegativeValue === "yes" ? "Allowed" : '<span class="t-faint">Not allowed</span>';
      } },
      { key: "status", label: "Status", render: function (r) {
        return r.status === "enable"
          ? '<span class="chip chip--success"><span class="chip__dot"></span>Enabled</span>'
          : '<span class="chip"><span class="chip__dot"></span>Disabled</span>';
      } },
      { key: "updatedAt", label: "Last updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.name;
    },
    actions: function (r) {
      return [{ label: "Edit", icon: "tabler:pencil", href: "credit-type-form.html?id=" + r.id, kind: "edit" }];
    },
    onAction: function () {},
    empty: {
      icon: "tabler:arrows-exchange",
      title: "No credit transaction types yet",
      text: "Types label each credit transaction, like Deposit or Bonus.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="credit-type-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New type</a>',
    },
    noResults: { icon: "tabler:search", title: "No types match", text: "Try a different name or code." },
  });

  var states = ["data", "loading", "empty", "no-results", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: list.setMode };
  list.setMode(initial);
})(window.DS);
