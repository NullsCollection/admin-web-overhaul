/* ==========================================================================
   Game management list (Phase 7c) on the LIST TEMPLATE (core/list.js).
   Source: src/views/pages/lotto/game/GameTable.tsx
     columns: ID, Group, Name, Status, Created at, Updated at, Actions
     default order: group asc · search: text
     row menu (RowOptions, permission-gated): Limit numbers (Limit groups for group_custom),
       Custom price, Provider cost (group_custom), Edit, Delete
     detail panel (DetailGameTable): provider select → bet type / price table (config or the
       provider's custom price)
   Changes: the detail panel becomes "View payout rates" (dialog; the list engine has no
   expandable rows and a dialog keeps the table readable on mobile). Proposals: code under
   the name, status filter.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var L = DS.lotto;
  var M = DS.mock;
  var games = M.games.slice().sort(function (a, b) {
    return a.lottoGroupId - b.lottoGroupId || a.sort - b.sort;
  });
  var name = function (r) {
    return L.name(r.translations);
  };
  var groupName = function (r) {
    var g = M.groupById(r.lottoGroupId);
    return g ? L.name(g.translations) : "";
  };

  document.getElementById("f-group").innerHTML =
    '<option value="all">All groups</option>' +
    M.groups.map(function (g) {
      return '<option value="' + g.id + '">' + esc(L.name(g.translations)) + "</option>";
    }).join("");

  var list = DS.list.create({
    root: document.getElementById("games-card"),
    noun: ["game", "games"],
    rows: function () {
      return games;
    },
    search: function (r) {
      return r.translations.map(function (t) {
        return t.name;
      }).join(" ") + " " + r.code + " " + r.id;
    },
    summary: function (all) {
      var on = all.filter(function (r) {
        return r.isEnable === "yes";
      }).length;
      var groups = {};
      all.forEach(function (r) {
        groups[r.lottoGroupId] = 1;
      });
      return [
        { label: "Games", value: fmt.int(all.length), icon: "tabler:clover", tone: "solid", meta: "Across every group" },
        { label: "Enabled", value: fmt.int(on), icon: "tabler:circle-check", tone: "success", meta: "Shown to players", filter: { key: "isEnable", value: "enabled" } },
        { label: "Disabled", value: fmt.int(all.length - on), icon: "tabler:circle-off", tone: "error", meta: "Hidden from players", filter: { key: "isEnable", value: "disabled" } },
        { label: "Groups", value: fmt.int(Object.keys(groups).length), icon: "tabler:folders", tone: "info", meta: "Used by these games" },
      ];
    },
    filters: {
      lottoGroupId: function (r, v) {
        return String(r.lottoGroupId) === v;
      },
      isEnable: function (r, v) {
        return v === "enabled" ? r.isEnable === "yes" : r.isEnable !== "yes";
      },
    },
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "name", label: "Game", className: "is-strong", sortable: false, render: function (r) {
        return '<a href="lotto-game-form.html?id=' + r.id + '">' + esc(name(r)) + '</a><span class="cell-sub">' + esc(r.code) + "</span>";
      } },
      { key: "lottoGroupId", label: "Group", sortValue: groupName, render: function (r) {
        return esc(groupName(r));
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
    rowName: name,
    // View / Edit / Delete always visible; the game's sub-pages go in ⋮
    actions: function (r) {
      var custom = r.type === "group_custom";
      var a = [
        { label: "View payout rates", icon: "tabler:eye", action: "rates", kind: "view" },
        { label: "Edit", icon: "tabler:pencil", href: "lotto-game-form.html?id=" + r.id },
        { label: "Delete", icon: "tabler:trash", action: "delete", danger: true },
        custom
          ? { label: "Limit groups", icon: "tabler:list-numbers", href: "lotto-game-limit-groups.html?id=" + r.id }
          : { label: "Limit numbers", icon: "tabler:numbers", href: "lotto-game-limit-numbers.html?id=" + r.id },
        { label: "Custom price", icon: "tabler:adjustments-dollar", href: "lotto-game-custom-price.html?id=" + r.id },
      ];
      if (custom) a.push({ label: "Provider cost", icon: "tabler:cash", href: "lotto-game-provider-cost.html?id=" + r.id });
      return a;
    },
    onAction: function (action, row) {
      if (action === "delete") confirmDelete(row);
      if (action === "rates") showRates(row);
    },
    empty: {
      icon: "tabler:device-gamepad-2",
      title: "No games yet",
      text: "Add a game to a group and pick the config it pays by.",
      actionHTML: '<a class="btn btn--contained btn--sm" href="lotto-game-form.html"><iconify-icon icon="tabler:plus"></iconify-icon>New game</a>',
    },
    noResults: {
      icon: "tabler:search",
      title: "No games match",
      text: "Try a different name or code, or clear the filters.",
    },
  });

  /* ---------- Payout rates (DetailGameTable) ---------- */
  // useGetProviderFilter: providers the user can see; -1 = no provider picked → the config itself
  var providers = M.providers.slice(0, 8);
  function ratesHTML(game, providerId) {
    var config = M.configById(game.lottoConfigurationId);
    var custom = providerId > 0 ? M.customPrice(game, providerId) : null;
    var src = custom || config;
    var p = providers.filter(function (x) {
      return x.id === providerId;
    })[0];
    var cur = p ? p.currency.code : "THB";
    var rows = L.payoutsFor(src).filter(function (r) {
      return Number(src[r.key]) > 0; // same as the app: rates at 0 are hidden
    });
    var note = providerId < 0
      ? "Rates from the config <strong>" + esc(config.name) + "</strong>."
      : custom
        ? '<span class="chip chip--primary">Custom price</span> This provider has its own rates.'
        : "This provider uses the config's rates.";
    return (
      '<p class="t-body2 t-muted" style="margin:0 0 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + note + "</p>" +
      '<div class="table-wrap"><table class="table table--compact table--inset"><thead><tr><th scope="col">Bet type</th>' +
      '<th scope="col" class="is-num">Pays (' + cur + ")</th></tr></thead><tbody>" +
      rows.map(function (r) {
        var changed = custom && custom[r.key] !== config[r.key];
        return "<tr><td>" + esc(r.label) + '</td><td class="is-num t-medium">' + fmt.rate(src[r.key]) +
          (changed ? '<span class="cell-sub">was ' + fmt.rate(config[r.key]) + "</span>" : "") + "</td></tr>";
      }).join("") +
      "</tbody></table></div>"
    );
  }
  function showRates(game) {
    DS.dialog.open({
      icon: "tabler:receipt",
      tone: "primary",
      title: "Payout rates: " + name(game),
      html: esc(L.gameTypeLabel(game.type)) + " in " + esc(groupName(game)) + ".",
      body:
        '<div class="field" style="margin-bottom:16px"><label class="field__label" for="rates-provider">Provider</label>' +
        '<div class="field__control field__control--select"><select id="rates-provider">' +
        '<option value="-1">No provider (config rates)</option>' +
        providers.map(function (p) {
          return '<option value="' + p.id + '">' + esc(p.name) + " (" + p.currency.code + ")</option>";
        }).join("") +
        '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div></div>' +
        '<div id="rates-body">' + ratesHTML(game, -1) + "</div>",
      actions: [{ label: "Close", variant: "outlined", autofocus: true }],
    });
    document.getElementById("rates-provider").addEventListener("change", function () {
      document.getElementById("rates-body").innerHTML = ratesHTML(game, Number(this.value));
    });
  }

  /* ---------- Delete: confirm → toast, or API error → dialog (app: errorHandler toast) ---------- */
  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash",
      tone: "error",
      title: "Delete this game?",
      html: "<strong>" + esc(name(row)) + "</strong> (" + esc(row.code) + ") will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        {
          label: "Delete game",
          variant: "contained",
          tone: "error",
          onClick: function (btn, close) {
            DS.ui.busy(btn, true, "Deleting…");
            setTimeout(function () {
              close();
              if (row.isEnable === "yes") return cannotDelete(row);
              games = games.filter(function (g) {
                return g.id !== row.id;
              });
              DS.ui.toast(name(row) + " deleted", "tabler:circle-check");
              list.refresh();
            }, 700);
          },
        },
      ],
    });
  }
  // Mock message: a placeholder for whatever the API returns
  function cannotDelete(row) {
    DS.dialog.open({
      icon: "tabler:alert-triangle",
      tone: "warning",
      title: "Can't delete this game",
      html: "<strong>" + esc(name(row)) + "</strong> has rounds with bets. Disable it instead so players can't bet on it.",
      actions: [{ label: "Got it", variant: "contained", autofocus: true }],
    });
  }

  /* ---------- Prototype states ---------- */
  var enabled = games[0];
  var disabled = games.filter(function (g) {
    return g.isEnable !== "yes";
  })[0];
  var states = ["data", "loading", "empty", "no-results", "error", "rates", "confirm-delete", "cannot-delete"];
  function setState(s) {
    DS.dialog.close();
    list.setMode(s === "rates" || s === "confirm-delete" || s === "cannot-delete" ? "data" : s);
    if (s === "rates") setTimeout(function () {
      showRates(enabled);
      var sel = document.getElementById("rates-provider");
      sel.value = "102";
      sel.dispatchEvent(new Event("change"));
    }, 400);
    if (s === "confirm-delete") setTimeout(function () {
      confirmDelete(disabled);
    }, 400);
    if (s === "cannot-delete") setTimeout(function () {
      cannotDelete(enabled);
    }, 400);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
