/* ==========================================================================
   Game → Limit groups (Phase 7d). ?id=<group_custom game id>
   Source: src/views/pages/lotto/game/GameGroupLimitAssign.tsx
     owner providers only (and only the user's own, if linked) → first one picked
     current assignment for (game, provider): "Current assignment: X" + Unassign (confirm),
       or "No game assignment — using provider fallback (active local → global)"
     templates for that provider: name, Active/Inactive, Assign / Assigned button · search
     no owner providers → message · non group_custom games → back to the game list
   Changes: the assignment sits in its own banner with the fallback spelled out; status as chips;
   the assigned row is marked in the table too; copy in plain words.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var game = M.game(DS.params.get("id") || 323) || M.game(323);
  if (game.type !== "group_custom") {
    location.replace("lotto-game-limit-numbers.html?id=" + game.id);
    return;
  }
  L.gameHeader($("game-header"), game, "limits", "Limit groups");

  var owners = M.providers.filter(function (p) {
    return p.isOwner;
  });
  var providerId = owners.length ? owners[0].id : null;
  var noOwners = false;
  var list = null;

  var provider = function () {
    return owners.filter(function (p) {
      return p.id === providerId;
    })[0];
  };

  function bannerHTML() {
    var a = M.groupLimitAssignment(game.id, providerId);
    return a
      ? '<div class="assign-banner is-set"><iconify-icon icon="tabler:link"></iconify-icon><div class="assign-banner__text">' +
        '<div class="t-subtitle2">Assigned: ' + esc(a.name) + "</div>" +
        '<div class="t-body2 t-muted">This template applies to ' + esc(provider().name) + " on this game, even while it's inactive.</div></div>" +
        '<button type="button" class="btn btn--outlined btn--sm" id="unassign"><iconify-icon icon="tabler:unlink"></iconify-icon>Unassign</button></div>'
      : '<div class="assign-banner"><iconify-icon icon="tabler:arrow-fork"></iconify-icon><div class="assign-banner__text">' +
        '<div class="t-subtitle2">No template assigned</div>' +
        '<div class="t-body2 t-muted">' + esc(provider().name) + "'s active local template applies, then the global one.</div></div></div>";
  }

  function render() {
    var root = $("groups-root");
    if (noOwners) {
      root.innerHTML =
        '<div class="alert alert--warning" role="alert"><iconify-icon icon="tabler:alert-triangle"></iconify-icon><div class="alert__body">' +
        '<div class="alert__title">No owner providers</div><div class="alert__text">Mark a provider as Owner first, or ask an admin.</div></div></div>';
      return;
    }
    root.innerHTML =
      '<section class="card list-card" id="glt-card" aria-labelledby="glt-title">' +
      '<header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title" id="glt-title">Set lottery number limits</h2>' +
      '<p class="card__subheader">Pick an owner provider, then assign one of its local templates to this game.</p></div></header>' +
      '<div class="card__content stack" style="gap:16px;padding-bottom:0">' +
      '<div class="field" style="max-width:400px"><label class="field__label" for="glt-provider">Provider</label>' +
      '<div class="field__control field__control--select"><select id="glt-provider">' +
      owners.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === providerId ? " selected" : "") + ">" + esc(p.name) + "</option>";
      }).join("") +
      '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div><div class="field__helper">Owner providers only.</div></div>' +
      '<div id="glt-banner">' + bannerHTML() + "</div></div>" +
      '<div class="list-toolbar"><div class="list-toolbar__search"><div class="field__control"><iconify-icon icon="tabler:search"></iconify-icon>' +
      '<input type="search" data-list-search placeholder="Search templates" aria-label="Search templates">' +
      '<button type="button" class="icon-btn icon-btn--sm" data-list-search-clear aria-label="Clear search" hidden><iconify-icon icon="tabler:x"></iconify-icon></button>' +
      "</div></div></div>" +
      '<div class="list-body" aria-live="polite"></div><div data-list-pager></div></section>';

    list = DS.list.create({
      root: $("glt-card"),
      noun: ["template", "templates"],
      rows: function () {
        return M.groupLimitTemplates.filter(function (t) {
          return t.providerId === providerId;
        });
      },
      search: function (r) {
        return r.name;
      },
      filters: {},
      rowName: function (r) {
        return r.name;
      },
      columns: [
        { key: "name", label: "Template name", className: "is-strong", render: function (r) {
          return esc(r.name);
        } },
        { key: "isActive", label: "Status", render: function (r) {
          return r.isActive
            ? '<span class="chip chip--success"><span class="chip__dot"></span>Active</span>'
            : '<span class="chip"><span class="chip__dot"></span>Inactive</span>';
        } },
        { key: "assign", label: "Game assignment", num: true, sortable: false, render: function (r) {
          var a = M.groupLimitAssignment(game.id, providerId);
          return a && a.id === r.id
            ? '<span class="chip chip--primary"><iconify-icon icon="tabler:check"></iconify-icon>Assigned</span>'
            : '<button type="button" class="btn btn--outlined btn--sm" data-assign="' + r.id + '">Assign</button>';
        } },
      ],
      empty: {
        icon: "tabler:list-numbers",
        title: "This provider has no templates",
        text: "Create a Set lottery number limit template for it first.",
        actionHTML: '<a class="btn btn--outlined btn--sm" href="#" data-todo>Create template</a>',
      },
      noResults: { icon: "tabler:search", title: "No templates match", text: "Try a different name." },
    });
    wire();
    list.refresh();
  }

  function repaint() {
    $("glt-banner").innerHTML = bannerHTML();
    var u = $("unassign");
    if (u) u.addEventListener("click", confirmUnassign);
    list.refresh();
  }

  function wire() {
    $("glt-provider").addEventListener("change", function () {
      providerId = Number(this.value);
      render();
    });
    var u = $("unassign");
    if (u) u.addEventListener("click", confirmUnassign);
    $("glt-card").addEventListener("click", function (e) {
      var b = e.target.closest("[data-assign]");
      if (!b) return;
      var t = M.groupLimitTemplates.filter(function (x) {
        return String(x.id) === b.getAttribute("data-assign");
      })[0];
      DS.ui.busy(b, true, "Assigning…");
      setTimeout(function () {
        M.setGroupLimitAssignment(game.id, providerId, t.id);
        DS.ui.toast(t.name + " assigned to this game", "tabler:circle-check");
        repaint();
      }, 600);
    });
  }

  function confirmUnassign() {
    var a = M.groupLimitAssignment(game.id, providerId);
    DS.dialog.open({
      icon: "tabler:unlink", tone: "warning",
      title: "Unassign this template?",
      html: "<strong>" + esc(a.name) + "</strong> stops applying to this game. " + esc(provider().name) +
        "'s active local template applies instead, then the global one.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Unassign", variant: "contained", tone: "error", onClick: function (b, close) {
          DS.ui.busy(b, true, "Unassigning…");
          setTimeout(function () {
            close();
            M.setGroupLimitAssignment(game.id, providerId, null);
            DS.ui.toast("Template unassigned from this game", "tabler:unlink");
            repaint();
          }, 600);
        } },
      ],
    });
  }

  /* ---------- Prototype states ---------- */
  var states = ["assigned", "not-assigned", "loading", "error", "unassign", "no-owners"];
  function setState(s) {
    DS.dialog.close();
    noOwners = s === "no-owners";
    // mock: game 323 + Golden Dragon (101) has an assignment, Royal Tiger (107) has none
    providerId = s === "not-assigned" ? 107 : 101;
    render();
    if (!list) return;
    if (s === "loading" || s === "error") list.setMode(s);
    if (s === "unassign") setTimeout(confirmUnassign, 400);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "assigned";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
