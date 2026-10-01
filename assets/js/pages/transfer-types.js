/* ==========================================================================
   Credit transfer types list (Phase 9c) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/credit-transaction-transfer-type/CreditTransactionTransferTypeTable.tsx
     columns: ID, Code, Name (nameTh or nameEn by UI language), Color (raw text), Created at,
       Updated at, Actions (Edit icon); search; no delete
   Changes: both names shown (the UI language's name first, the other one under it), so admins see
   when English is missing; Color shows a swatch next to its value (the value is user data, not a
   design token); Created at dropped; code as a code tag.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var rows = DS.mock.transferTypes;

  // A swatch only when the text is a color the browser understands
  var swatch = function (c) {
    var ok = typeof CSS !== "undefined" && CSS.supports("color", c);
    return (ok ? '<span class="swatch" style="--swatch:' + esc(c) + '" aria-hidden="true"></span>' : "") +
      '<span class="code">' + esc(c) + "</span>";
  };

  var list = DS.list.create({
    root: document.getElementById("types-card"),
    noun: ["transfer type", "transfer types"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.code + " " + r.nameTh + " " + r.nameEn;
    },
    filters: {},
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "code", label: "Code", render: function (r) {
        return '<span class="code">' + esc(r.code) + "</span>";
      } },
      { key: "nameEn", label: "Name", className: "is-strong", sortValue: function (r) {
        return r.nameEn || r.nameTh;
      }, render: function (r) {
        // English UI here; the app shows nameTh in Thai
        return (r.nameEn ? esc(r.nameEn) : '<span class="t-muted">No English name</span>') + '<span class="cell-sub">' + esc(r.nameTh) + "</span>";
      } },
      { key: "color", label: "Color", sortable: false, render: function (r) {
        return '<span class="swatch-row">' + swatch(r.color) + "</span>";
      } },
      { key: "updatedAt", label: "Last updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.nameEn || r.nameTh;
    },
    actions: function (r) {
      return [{ label: "Edit", icon: "tabler:pencil", href: "transfer-type-form.html?id=" + r.id, kind: "edit" }];
    },
    onAction: function () {},
    empty: {
      icon: "tabler:transfer",
      title: "No transfer types yet",
      text: "Transfer types say where moved credit came from, like an agent top-up.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="transfer-type-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New transfer type</a>',
    },
    noResults: { icon: "tabler:search", title: "No transfer types match", text: "Try a different name or code." },
  });

  var states = ["data", "loading", "empty", "no-results", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: list.setMode };
  list.setMode(initial);
})(window.DS);
