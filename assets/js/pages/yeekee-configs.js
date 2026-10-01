/* ==========================================================================
   Yeekee bonus config list (Phase 8f) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/yeekee-config/hooks/useYeekeeConfigTable.tsx
     columns: Provider (only when the user has providers), extend shoot time (Sec), Bonus reward
       ("THB 100"), Bonus row 1 … Bonus row 5, Actions (Edit, Delete by permission)
     filter: provider (defaults to the user's first provider)
     delete: ConfirmModal "Delete {provider}?" → toast "Success"
   Changes: the 5 bonus row columns (3–5 mostly empty) become one "Bonus rows" column; the reward
   uses the money format of the provider's currency; "All" (providerId -1) reads "All providers";
   extend time shows its unit ("60 sec"); Edit + Delete as icons (row actions rule).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var R = DS.rounds;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var rows = M.yeekeeConfigs.slice();

  var prov = function (r) {
    return R.configProvider(r.providerId);
  };
  var name = function (r) {
    var p = prov(r);
    return p.name + (p.code ? " (" + p.code + ")" : "");
  };

  // Provider filter: "All providers" = no filter
  $("f-provider").innerHTML = '<option value="all">All providers</option>' + M.providers.map(function (p) {
    return '<option value="' + p.id + '">' + esc(p.name) + (p.prefixCode ? " (" + esc(p.prefixCode) + ")" : "") + "</option>";
  }).join("");

  var list = DS.list.create({
    root: $("configs-card"),
    noun: ["config", "configs"],
    rows: function () {
      return rows;
    },
    search: name,
    filters: {
      providerId: function (r, v) {
        return String(r.providerId) === v;
      },
    },
    columns: [
      { key: "provider", label: "Provider", className: "is-strong", sortable: false, render: function (r) {
        var p = prov(r);
        return esc(p.name) + (p.code ? ' <span class="code">' + esc(p.code) + "</span>" : "");
      } },
      { key: "putNumberExtendTime", label: "Extra shoot time", num: true, render: function (r) {
        return fmt.int(r.putNumberExtendTime) + " sec";
      } },
      { key: "bonusReward", label: "Bonus reward", num: true, render: function (r) {
        return fmt.money(r.bonusReward, prov(r).currency);
      } },
      { key: "rows", label: "Bonus rows", sortable: false, render: function (r) {
        return '<span class="chip-row chip-row--nowrap">' + R.bonusRows(r).map(function (n) {
          return '<span class="code">' + n + "</span>";
        }).join("") + "</span>";
      } },
    ],
    rowName: name,
    actions: function (r) {
      return [
        { label: "Edit", icon: "tabler:pencil", href: "yeekee-config-form.html?id=" + r.id, kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true },
      ];
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
    },
    empty: {
      icon: "tabler:gift",
      title: "No bonus configs yet",
      text: "A bonus config sets which shot-number rows win a bonus, and how much.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="yeekee-config-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New bonus config</a>',
    },
    noResults: { icon: "tabler:search", title: "No config for this provider", text: "Pick another provider, or clear the filter." },
  });

  /* ---------- Delete: confirm → toast (app: ConfirmModal "Delete {name}?" → "Success") ---------- */
  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash",
      tone: "error",
      title: "Delete this bonus config?",
      html: "The bonus config for <strong>" + esc(name(row)) + "</strong> will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete config", variant: "contained", tone: "error", onClick: function (btn, close) {
          DS.ui.busy(btn, true, "Deleting…");
          setTimeout(function () {
            close();
            rows = rows.filter(function (x) {
              return x.id !== row.id;
            });
            DS.ui.toast("Bonus config for " + prov(row).name + " deleted", "tabler:circle-check");
            list.refresh();
          }, 700);
        } },
      ],
    });
  }

  /* ---------- Prototype states ---------- */
  var states = ["data", "loading", "empty", "no-results", "error", "delete"];
  function setState(s) {
    DS.dialog.close();
    if (s === "delete") {
      list.setMode("data");
      return setTimeout(function () {
        confirmDelete(rows[1]);
      }, 450);
    }
    list.setMode(s);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
