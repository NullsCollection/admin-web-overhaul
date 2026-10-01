/* ==========================================================================
   Provider sizes list (Phase 11b) on the LIST TEMPLATE.
   Source: views/pages/provider-size/hooks/useProviderSizeTable.tsx (+ useDeleteProviderSize)
     columns: ID, Name, Template Name (a relative link "lotto/limit-templates/<id>/view/", which breaks
       from /provider-sizes), Actions (Edit, Delete); no search
     delete: ConfirmModal "Delete {name}?" → "Success", or a generic "Error" toast (API message dropped)
   Changes: description under the name; the limit set links to its view page, plus a preview icon;
   Edit + Delete as icons; a size still used by providers → "can't delete" dialog with the reason.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var rows = M.providerSizeList.slice();

  var setOf = function (r) {
    return M.limitTemplate(r.limitTemplateId);
  };

  var list = DS.list.create({
    root: document.getElementById("sizes-card"),
    noun: ["size", "sizes"],
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
        return esc(r.name) + (r.description ? '<span class="cell-sub">' + esc(r.description) + "</span>" : "");
      } },
      { key: "limitTemplateId", label: "Limit set", sortValue: function (r) {
        return setOf(r) ? setOf(r).name : "";
      }, render: function (r) {
        var t = setOf(r);
        return t ? '<a href="limit-template.html?id=' + t.id + '">' + esc(t.name) + "</a>" +
          '<button type="button" class="icon-btn icon-btn--sm" style="margin-left:4px;vertical-align:middle" data-preview="' + t.id +
          '" aria-label="Preview ' + esc(t.name) + '" title="Preview"><iconify-icon icon="tabler:eye"></iconify-icon></button>' : '<span class="t-faint">–</span>';
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
        { label: "Edit", icon: "tabler:pencil", href: "provider-size-form.html?id=" + r.id, kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    empty: {
      icon: "tabler:dimensions", title: "No provider sizes yet", text: "A size gives providers a limit set to start from.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="provider-size-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New provider size</a>',
    },
    noResults: { icon: "tabler:search", title: "No sizes match", text: "" },
  });

  document.getElementById("sizes-card").addEventListener("click", function (e) {
    var b = e.target.closest("[data-preview]");
    if (b) DS.lotto.previewLimitSet(M.limitTemplate(b.getAttribute("data-preview")));
  });

  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash", tone: "error", title: "Delete this provider size?",
      html: "<strong>" + esc(row.name) + "</strong> will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete size", variant: "contained", tone: "error", onClick: function (b, close) {
          DS.ui.busy(b, true, "Deleting…");
          setTimeout(function () {
            close();
            var n = M.providersInSize(row.id);
            if (n) {
              // Mock 422; show the API's message (the app drops it for a generic "Error")
              return DS.dialog.open({
                icon: "tabler:alert-triangle", tone: "error", title: "Can't delete " + row.name,
                html: n + (n === 1 ? " provider uses" : " providers use") + " this size. Move them to another size first.",
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

  var states = ["data", "loading", "empty", "error", "preview", "cant-delete"];
  function setState(s) {
    DS.dialog.close();
    list.setMode(s === "preview" || s === "cant-delete" ? "data" : s);
    if (s === "preview") setTimeout(function () {
      DS.lotto.previewLimitSet(setOf(rows[1]));
    }, 400);
    if (s === "cant-delete") setTimeout(function () {
      confirmDelete(rows[0]);
    }, 400);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
