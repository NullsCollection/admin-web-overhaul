/* ==========================================================================
   Languages (Phase 11d) on the LIST TEMPLATE.
   Source: views/pages/language/LanguageTable.tsx
     columns: Code, Name, Created at, Updated at, Actions (Edit → /languages/<code>/edit, Delete → confirm)
   Changes: code as a code tag; Thai + English marked "Required" (every names-per-language form needs
   them, 7b) and their Delete greyed out with the reason (proposal); Created at dropped.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var rows = M.languageList.slice();
  var REQUIRED = ["th", "en"];

  var list = DS.list.create({
    root: document.getElementById("list-card"),
    noun: ["language", "languages"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.code + " " + r.name;
    },
    filters: {},
    columns: [
      { key: "code", label: "Code", render: function (r) {
        return '<span class="code">' + esc(r.code) + "</span>";
      } },
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name) + (REQUIRED.indexOf(r.code) > -1 ? ' <span class="chip chip--outlined">Required</span>' : "");
      } },
      { key: "updatedAt", label: "Last updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.name;
    },
    actions: function (r) {
      var req = REQUIRED.indexOf(r.code) > -1;
      return [
        { label: "Edit", icon: "tabler:pencil", href: "language-form.html?code=" + r.code, kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true,
          disabled: req ? "Names need Thai and English, so this one stays" : "" },
      ];
    },
    onAction: function (a, row) {
      if (a !== "delete") return;
      DS.dialog.open({
        icon: "tabler:trash", tone: "error", title: "Delete " + row.name + "?",
        html: "Names already saved in " + esc(row.name) + " stop showing. This can't be undone.",
        actions: [
          { label: "Cancel", variant: "outlined", autofocus: true },
          { label: "Delete language", variant: "contained", tone: "error", onClick: function (b, close) {
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
    },
    empty: { icon: "tabler:language", title: "No languages yet", text: "Add the languages names are written in.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="language-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New language</a>' },
    noResults: { icon: "tabler:search", title: "No languages match", text: "Try another code or name." },
  });

  var states = ["data", "loading", "empty", "no-results", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: list.setMode };
  list.setMode(initial);
})(window.DS);
