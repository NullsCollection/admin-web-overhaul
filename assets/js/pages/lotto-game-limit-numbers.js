/* ==========================================================================
   Game → Limit numbers (Phase 7d). ?id=<game id, not group_custom>
   Source: src/views/pages/lotto/game/GameLimitTemplateTabs.tsx
     Quick Assign (QuickAssignTemplate): sets on this game: name, type (local/global),
       "Action by" provider, active toggle, eye → PreviewModal · provider filter
     Browse Template Library (BrowseLimitTemplate): sets not on the game, checkbox select,
       provider filter, "Add Selected Template" → back to Quick Assign
     Create New: a message + link to /lotto/limit-templates
     group_custom games redirect to the game list (they use Limit groups)
   Changes: 2 tabs ("Used by this game" with a count, "Add from library"); "Create New" becomes a
   button in the card header; the active toggle is a switch in its own column; Global / Local as
   a Scope column; a selection bar for the bulk add; the preview is a dialog with one table.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var game = M.game(DS.params.get("id") || 301) || M.game(301);
  if (game.type === "group_custom") {
    location.replace("lotto-game-limit-groups.html?id=" + game.id); // the app sends these to the game list
    return;
  }
  L.gameHeader($("game-header"), game, "limits", "Limit numbers");

  var providerName = function (id) {
    var p = M.providers.filter(function (x) {
      return x.id === id;
    })[0];
    return p ? p.name : "";
  };
  var scopeHTML = function (t) {
    return t.providerId ? '<span class="chip chip--primary">Local</span>' : '<span class="chip">Global</span>';
  };
  var byProvider = function (t, v) {
    return !t.providerId || String(t.providerId) === v; // a provider sees its own sets + the global ones
  };

  // Provider filter options (useGetProviderFilter)
  document.querySelectorAll("[data-provider-filter]").forEach(function (sel) {
    sel.innerHTML = '<option value="all">All providers</option>' + M.providers.slice(0, 10).map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.name) + "</option>";
    }).join("");
  });

  /* ---------- Used by this game (QuickAssignTemplate) ---------- */
  var assignedRows = function () {
    return M.gameLimitTemplates(game.id).map(function (a) {
      var t = M.limitTemplate(a.templateId);
      return { id: a.id, templateId: t.id, name: t.name, providerId: t.providerId, isActive: a.isActive, link: a };
    });
  };
  function paintCount() {
    $("assigned-count").textContent = M.gameLimitTemplates(game.id).length;
  }

  var assigned = DS.list.create({
    root: $("assigned-card"),
    noun: ["set", "sets"],
    rows: assignedRows,
    search: function (r) {
      return r.name;
    },
    filters: { providerId: function (r, v) {
      return byProvider(r, v);
    } },
    rowName: function (r) {
      return r.name;
    },
    columns: [
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name);
      } },
      { key: "scope", label: "Scope", sortValue: function (r) {
        return r.providerId ? 1 : 0;
      }, render: scopeHTML },
      { key: "providerId", label: "Provider", sortValue: function (r) {
        return providerName(r.providerId);
      }, render: function (r) {
        return r.providerId ? esc(providerName(r.providerId)) : '<span class="t-muted">All providers</span>';
      } },
      { key: "isActive", label: "Active", sortable: false, render: function (r) {
        return '<label class="switch"><input type="checkbox" role="switch" data-toggle="' + r.id + '"' + (r.isActive ? " checked" : "") +
          ' aria-label="' + esc(r.name) + ' active"><span class="switch__track"><span class="switch__thumb"></span></span>' +
          '<span class="switch__label">' + (r.isActive ? "On" : "Off") + "</span></label>";
      } },
    ],
    actions: function () {
      return [{ label: "View set", icon: "tabler:eye", action: "view", kind: "view" }];
    },
    onAction: function (action, row) {
      preview(M.limitTemplate(row.templateId));
    },
    empty: {
      icon: "tabler:numbers",
      title: "This game has no limit number sets",
      text: "Add sets from the library so bets on this game are limited.",
      actionHTML: '<button type="button" class="btn btn--contained btn--sm" data-go-library><iconify-icon icon="tabler:books"></iconify-icon>Add from library</button>',
    },
    noResults: { icon: "tabler:search", title: "No sets match", text: "Try a different name or provider." },
  });

  $("assigned-card").addEventListener("change", function (e) {
    var t = e.target.closest("[data-toggle]");
    if (!t) return;
    var link = M.gameLimitTemplates(game.id).filter(function (a) {
      return String(a.id) === t.getAttribute("data-toggle");
    })[0];
    link.isActive = t.checked;
    t.closest(".switch").querySelector(".switch__label").textContent = t.checked ? "On" : "Off";
    DS.ui.toast(M.limitTemplate(link.templateId).name + (t.checked ? " is on for this game" : " is off for this game"), "tabler:circle-check");
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-go-library]")) DS.ui.selectTab($("tab-library"));
  });

  /* ---------- Add from library (BrowseLimitTemplate) ---------- */
  var library = DS.list.create({
    root: $("library-card"),
    noun: ["set", "sets"],
    selectable: true,
    rows: function () {
      var used = M.gameLimitTemplates(game.id).map(function (a) {
        return a.templateId;
      });
      return M.limitTemplates.filter(function (t) {
        return used.indexOf(t.id) < 0;
      });
    },
    search: function (r) {
      return r.name;
    },
    filters: { providerId: function (r, v) {
      return byProvider(r, v);
    } },
    rowName: function (r) {
      return r.name;
    },
    columns: [
      { key: "name", label: "Name", className: "is-strong", render: function (r) {
        return esc(r.name);
      } },
      { key: "scope", label: "Scope", sortValue: function (r) {
        return r.providerId ? 1 : 0;
      }, render: scopeHTML },
      { key: "providerId", label: "Provider", render: function (r) {
        return r.providerId ? esc(providerName(r.providerId)) : '<span class="t-muted">All providers</span>';
      } },
    ],
    actions: function () {
      return [{ label: "View set", icon: "tabler:eye", action: "view", kind: "view" }];
    },
    onAction: function (action, row) {
      preview(row);
    },
    onSelect: function (ids) {
      $("library-bar").hidden = !ids.length;
      $("library-picked").textContent = ids.length + (ids.length === 1 ? " set selected" : " sets selected");
    },
    empty: {
      icon: "tabler:books",
      title: "Every set is already on this game",
      text: "Create a new limit number set to add more.",
      actionHTML: '<a class="btn btn--outlined btn--sm" href="limit-template-form.html">Create limit set</a>',
    },
    noResults: { icon: "tabler:search", title: "No sets match", text: "Try a different name or provider." },
  });

  $("library-clear").addEventListener("click", function () {
    library.clearSelection();
  });
  $("library-add").addEventListener("click", function () {
    var ids = library.selected();
    var b = this;
    DS.ui.busy(b, true, "Adding…");
    setTimeout(function () {
      DS.ui.busy(b, false);
      M.addGameLimitTemplates(game.id, ids);
      library.clearSelection();
      paintCount();
      DS.ui.toast(ids.length + (ids.length === 1 ? " set added. Turn it on to use it." : " sets added. Turn them on to use them."), "tabler:circle-check");
      DS.ui.selectTab($("tab-assigned"));
      assigned.refresh();
      library.refresh();
    }, 700);
  });

  // Preview (PreviewModal) → shared: DS.lotto.previewLimitSet()
  var preview = function (t) {
    L.previewLimitSet(t);
  };

  /* ---------- Prototype states ---------- */
  paintCount();
  var states = ["data", "loading", "empty", "error", "preview", "library", "library-selected"];
  function setState(s) {
    DS.dialog.close();
    DS.ui.selectTab($(s.indexOf("library") === 0 ? "tab-library" : "tab-assigned"));
    assigned.setMode(["loading", "empty", "error"].indexOf(s) > -1 ? s : "data");
    library.setMode("data");
    library.clearSelection();
    if (s === "preview") setTimeout(function () {
      preview(M.limitTemplate(401));
    }, 400);
    if (s === "library-selected") setTimeout(function () {
      var boxes = document.querySelectorAll("#library-card [data-select-row]");
      [0, 2].forEach(function (i) {
        if (boxes[i]) {
          boxes[i].checked = true;
          boxes[i].dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    }, 900);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
