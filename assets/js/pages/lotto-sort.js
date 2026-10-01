/* ==========================================================================
   Game sort management (Phase 7e).
   Source: src/pages/lotto/sort/index.tsx (+ views/pages/lotto/sort/*)
     provider select (required) → useFetchProviderSort(provider): groups → games, each with sort
       + isEnable · RichTreeViewPro with drag to reorder: groups among groups, games into a
       group (not into a game, not to the top level) · a switch per group / game (show / hide)
     GameStatusSummary: Total games / Enabled / Disabled (3 colored cards)
     unsaved warning alert + beforeunload · Save = upsert (sort = index) · Cancel = window.confirm
   Changes: summary as one quiet line; drag handles also move with ↑ / ↓ (keyboard); the unsaved
   state lives in the save bar (no toast per switch); leaving or switching provider with changes
   asks in a dialog; expand / collapse all; hidden rows are muted with a "Hidden" label.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var providerId = null;
  var tree = [];
  var saved = "";
  var canEdit = true;
  var providers = M.providers.slice(0, 10);

  /* useFetchProviderSort: a provider's own order. Mock: group order, a few games hidden per provider */
  function load(pid) {
    return M.groups
      .slice()
      .sort(function (a, b) {
        return a.sort - b.sort;
      })
      .map(function (g) {
        var games = M.games
          .filter(function (x) {
            return x.lottoGroupId === g.id;
          })
          .sort(function (a, b) {
            return a.sort - b.sort;
          });
        return {
          id: "group-" + g.id,
          name: L.name(g.translations),
          enabled: !(pid % 3 === 0 && g.code === "SPECIAL"),
          open: true,
          games: games.map(function (x) {
            return { id: "game-" + x.id, name: L.name(x.translations), code: x.code, enabled: x.isEnable === "yes" && (x.id + pid) % 7 !== 0 };
          }),
        };
      });
  }
  var snapshot = function () {
    return JSON.stringify(tree.map(function (g) {
      return [g.id, g.enabled, g.games.map(function (x) {
        return [x.id, x.enabled];
      })];
    }));
  };
  var isDirty = function () {
    return providerId && snapshot() !== saved;
  };

  /* ---------- render ---------- */
  function switchHTML(id, on, name) {
    return '<label class="switch sort-switch"><input type="checkbox" role="switch" data-visible="' + id + '"' + (on ? " checked" : "") +
      (canEdit ? "" : " disabled") + ' aria-label="Show ' + esc(name) + '"><span class="switch__track"><span class="switch__thumb"></span></span>' +
      '<span class="switch__label">' + (on ? "Shown" : "Hidden") + "</span></label>";
  }
  function handleHTML(id, name) {
    return canEdit
      ? '<button type="button" class="icon-btn icon-btn--sm sort-handle" data-handle="' + id + '" aria-label="Move ' + esc(name) +
        '. Drag, or press up and down arrows" title="Drag to reorder, or use ↑ ↓"><iconify-icon icon="tabler:grip-vertical"></iconify-icon></button>'
      : "";
  }

  function treeHTML() {
    return (
      '<ol class="sort-tree" data-list="root">' +
      tree.map(function (g) {
        var hidden = g.games.filter(function (x) {
          return !x.enabled;
        }).length;
        return (
          '<li class="sort-item sort-item--group' + (g.enabled ? "" : " is-hidden") + '" data-id="' + g.id + '">' +
          '<div class="sort-row">' + handleHTML(g.id, g.name) +
          '<button type="button" class="icon-btn icon-btn--sm" data-expand="' + g.id + '" aria-expanded="' + g.open + '" aria-label="' +
          (g.open ? "Collapse " : "Expand ") + esc(g.name) + '"><iconify-icon icon="tabler:chevron-' + (g.open ? "down" : "right") + '"></iconify-icon></button>' +
          '<span class="sort-row__label">' + esc(g.name) + "</span>" +
          '<span class="sort-row__meta">' + g.games.length + (g.games.length === 1 ? " game" : " games") + (hidden ? ", " + hidden + " hidden" : "") + "</span>" +
          switchHTML(g.id, g.enabled, g.name) + "</div>" +
          '<ol class="sort-tree sort-tree--games" data-list="' + g.id + '"' + (g.open ? "" : " hidden") + ">" +
          (g.games.length
            ? g.games.map(function (x) {
                return '<li class="sort-item' + (x.enabled ? "" : " is-hidden") + '" data-id="' + x.id + '"><div class="sort-row">' + handleHTML(x.id, x.name) +
                  '<span class="sort-row__label">' + esc(x.name) + '</span><span class="sort-row__meta code">' + esc(x.code) + "</span>" +
                  switchHTML(x.id, x.enabled, x.name) + "</div></li>";
              }).join("")
            : '<li class="sort-empty">No games. Drop one here.</li>') +
          "</ol></li>"
        );
      }).join("") +
      "</ol>"
    );
  }

  function summaryHTML() {
    var total = 0;
    var on = 0;
    tree.forEach(function (g) {
      g.games.forEach(function (x) {
        total++;
        if (x.enabled) on++;
      });
    });
    return '<div class="sort-summary"><span><strong>' + total + "</strong> games</span><span><strong>" + on + "</strong> shown</span><span><strong>" +
      (total - on) + "</strong> hidden</span></div>";
  }

  function render() {
    var root = $("sort-root");
    root.innerHTML =
      '<section class="card"><div class="card__content stack" style="gap:16px">' +
      '<div class="sort-toolbar"><div class="field"><label class="field__label" for="sort-provider">Provider</label>' +
      '<div class="field__control field__control--select"><select id="sort-provider"><option value="">Select a provider</option>' +
      providers.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === providerId ? " selected" : "") + ">" + esc(p.name) + "</option>";
      }).join("") +
      '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div></div>' +
      (providerId
        ? '<div class="sort-toolbar__end">' + summaryHTML() +
          '<button type="button" class="btn btn--text btn--sm" data-expand-all>Expand all</button>' +
          '<button type="button" class="btn btn--text btn--sm" data-collapse-all>Collapse all</button></div>'
        : "") +
      "</div>" +
      (providerId
        ? treeHTML()
        : '<div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:arrows-sort"></iconify-icon></span>' +
          '<div class="empty__title">Pick a provider</div><div class="empty__text">Each provider has its own order and its own shown / hidden games.</div></div>') +
      "</div></section>" +
      (canEdit
        ? '<div class="form-bar" style="margin-top:16px"><div class="form-bar__status" id="sort-status" aria-live="polite"></div><div class="form-bar__actions">' +
          '<button type="button" class="btn btn--outlined" id="sort-cancel">Cancel</button>' +
          '<button type="button" class="btn btn--contained" id="sort-save"' + (providerId ? "" : " disabled") + ">Save order</button></div></div>"
        : "");
    paint();
  }

  function paint() {
    var st = $("sort-status");
    if (!st) return;
    var dirty = isDirty();
    st.classList.toggle("is-dirty", !!dirty);
    st.textContent = !providerId ? "Pick a provider first" : dirty ? "Unsaved changes" : "Saved order";
    $("sort-save").disabled = !dirty;
  }

  /* ---------- tree edits ---------- */
  function findGame(id) {
    for (var i = 0; i < tree.length; i++) {
      for (var j = 0; j < tree[i].games.length; j++) if (tree[i].games[j].id === id) return { group: tree[i], index: j };
    }
    return null;
  }
  var groupIndex = function (id) {
    for (var i = 0; i < tree.length; i++) if (tree[i].id === id) return i;
    return -1;
  };
  function move(id, targetId, where) {
    // where: "before" | "after" | "into" (a game dropped on a group row → end of that group)
    if (id === targetId) return;
    if (id.indexOf("group-") === 0) {
      if (targetId.indexOf("group-") !== 0) return;
      var g = tree.splice(groupIndex(id), 1)[0];
      var t = groupIndex(targetId);
      tree.splice(where === "after" ? t + 1 : t, 0, g);
    } else {
      var from = findGame(id);
      var item = from.group.games.splice(from.index, 1)[0];
      if (targetId.indexOf("group-") === 0) {
        var grp = tree[groupIndex(targetId)];
        grp.games.push(item);
        grp.open = true;
      } else {
        var to = findGame(targetId);
        to.group.games.splice(where === "after" ? to.index + 1 : to.index, 0, item);
      }
    }
    render();
  }

  /* ---------- events ---------- */
  var root = $("sort-root");
  root.addEventListener("change", function (e) {
    if (e.target.id === "sort-provider") {
      var next = e.target.value ? Number(e.target.value) : null;
      if (!isDirty()) return pick(next);
      e.target.value = providerId || "";
      confirmDiscard(function () {
        pick(next);
      });
      return;
    }
    var v = e.target.getAttribute("data-visible");
    if (!v) return;
    var node = v.indexOf("group-") === 0 ? tree[groupIndex(v)] : findGame(v).group.games[findGame(v).index];
    node.enabled = e.target.checked;
    render();
    var again = root.querySelector('[data-visible="' + v + '"]');
    if (again) again.focus();
  });
  root.addEventListener("click", function (e) {
    var x = e.target.closest("[data-expand]");
    if (x) {
      var g = tree[groupIndex(x.getAttribute("data-expand"))];
      g.open = !g.open;
      render();
      root.querySelector('[data-expand="' + g.id + '"]').focus();
      return;
    }
    if (e.target.closest("[data-expand-all]") || e.target.closest("[data-collapse-all]")) {
      var open = !!e.target.closest("[data-expand-all]");
      tree.forEach(function (g) {
        g.open = open;
      });
      render();
      return;
    }
    if (e.target.closest("#sort-save")) return save(e.target.closest("#sort-save"));
    if (e.target.closest("#sort-cancel")) {
      if (!isDirty()) return (location.href = "lotto-games.html");
      confirmDiscard(function () {
        location.href = "lotto-games.html";
      });
    }
  });

  // Keyboard reorder: ↑ / ↓ on a handle moves the item one step inside its list
  root.addEventListener("keydown", function (e) {
    var h = e.target.closest("[data-handle]");
    if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    var id = h.getAttribute("data-handle");
    var up = e.key === "ArrowUp";
    var list = id.indexOf("group-") === 0 ? tree : findGame(id).group.games;
    var i = list.map(function (n) {
      return n.id;
    }).indexOf(id);
    var j = up ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;
    move(id, list[j].id, up ? "before" : "after");
    root.querySelector('[data-handle="' + id + '"]').focus();
    $("sort-live").textContent = "Moved to position " + (j + 1) + " of " + list.length; // screen readers only
  });

  // Drag: only from the handle; groups among groups, games before/after games or into a group
  var dragId = null;
  root.addEventListener("mousedown", function (e) {
    var h = e.target.closest("[data-handle]");
    if (h) h.closest(".sort-item").setAttribute("draggable", "true");
  });
  root.addEventListener("dragstart", function (e) {
    var li = e.target.closest(".sort-item[draggable]");
    if (!li) return;
    dragId = li.getAttribute("data-id");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragId);
    setTimeout(function () {
      li.classList.add("is-dragging");
    }, 0);
  });
  function clearMarks() {
    root.querySelectorAll(".drop-before, .drop-after, .drop-into").forEach(function (n) {
      n.classList.remove("drop-before", "drop-after", "drop-into");
    });
  }
  function target(e) {
    var row = e.target.closest(".sort-row");
    if (!row || !dragId) return null;
    var li = row.parentNode;
    var id = li.getAttribute("data-id");
    var isGroup = id.indexOf("group-") === 0;
    var draggingGroup = dragId.indexOf("group-") === 0;
    if (draggingGroup && !isGroup) return null; // a group can't go inside a group
    var r = row.getBoundingClientRect();
    var where = !draggingGroup && isGroup ? "into" : e.clientY < r.top + r.height / 2 ? "before" : "after";
    return { row: row, id: id, where: where };
  }
  root.addEventListener("dragover", function (e) {
    var t = target(e);
    clearMarks();
    if (!t || t.id === dragId) return;
    e.preventDefault();
    t.row.classList.add("drop-" + t.where);
  });
  root.addEventListener("drop", function (e) {
    var t = target(e);
    clearMarks();
    if (!t) return;
    e.preventDefault();
    var id = dragId;
    dragId = null;
    move(id, t.id, t.where);
  });
  root.addEventListener("dragend", function () {
    clearMarks();
    dragId = null;
    root.querySelectorAll(".sort-item[draggable]").forEach(function (n) {
      n.removeAttribute("draggable");
      n.classList.remove("is-dragging");
    });
  });

  window.addEventListener("beforeunload", function (e) {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  function pick(pid) {
    providerId = pid;
    tree = pid ? load(pid) : [];
    saved = snapshot();
    render();
  }
  function save(b) {
    DS.ui.busy(b, true, "Saving…");
    setTimeout(function () {
      DS.ui.busy(b, false);
      saved = snapshot();
      paint();
      DS.ui.toast("Order saved for " + providers.filter(function (p) {
        return p.id === providerId;
      })[0].name, "tabler:circle-check");
    }, 800);
  }
  function confirmDiscard(then) {
    DS.dialog.open({
      icon: "tabler:alert-triangle", tone: "warning",
      title: "Discard unsaved changes?",
      html: "Your new order and shown / hidden changes haven't been saved.",
      actions: [
        { label: "Keep editing", variant: "outlined", autofocus: true },
        { label: "Discard changes", variant: "contained", tone: "error", onClick: function (b, close) {
          close();
          then();
        } },
      ],
    });
  }

  /* ---------- Prototype states ---------- */
  var states = ["no-provider", "data", "dirty", "collapsed", "saving", "discard", "read-only", "loading"];
  function setState(s) {
    DS.dialog.close();
    canEdit = s !== "read-only";
    if (s === "loading") {
      providerId = 102;
      $("sort-root").innerHTML = '<section class="card"><div class="card__content stack" style="gap:10px">' +
        new Array(9).join('<span class="skeleton skeleton--block" style="--h:44px"></span>') + "</div></section>";
      return;
    }
    pick(s === "no-provider" ? null : 102);
    if (s === "collapsed") {
      tree.forEach(function (g) {
        g.open = false;
      });
      render();
    }
    if (s === "dirty" || s === "saving" || s === "discard") {
      move(tree[3].id, tree[0].id, "before");
      tree[0].games[1].enabled = false;
      render();
      if (s === "saving") DS.ui.busy($("sort-save"), true, "Saving…");
      if (s === "discard") setTimeout(function () {
        $("sort-cancel").click();
      }, 300);
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
