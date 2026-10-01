/* ==========================================================================
   Game blacklist (Phase 7e).
   Source: src/views/pages/lotto/black-list-games/usePageBlackListGames.tsx + components/TransferList
     provider filter → useGetBlacklist(provider): { games, blacklists } (name th/en)
     TransferList: "All Games" ↔ "Blacklist", checkbox per game + select all, > / < buttons
     each move saves right away (attach = current blacklist + picked; detach = current − picked)
   Changes: search in each list; games grouped under their lotto group; counts in the headers;
     labelled move buttons ("Add to blacklist" / "Remove") instead of arrows; a toast names what
     moved; no-provider and empty-list states; lists stack on phones.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var providers = M.providers.slice(0, 10);
  var lists = { 102: [318, 325], 104: [304, 312, 319, 325] }; // provider → blacklisted game ids (mock)
  var providerId = null;
  var picked = { left: {}, right: {} };
  var q = { left: "", right: "" };

  var groupName = function (id) {
    var g = M.groupById(id);
    return g ? L.name(g.translations) : "";
  };
  var black = function () {
    return lists[providerId] || (lists[providerId] = []);
  };
  function items(side) {
    var b = black();
    return M.games.filter(function (g) {
      var on = b.indexOf(g.id) > -1;
      return side === "right" ? on : !on;
    });
  }

  function listHTML(side) {
    var all = items(side);
    var term = q[side].toLowerCase();
    var shown = all.filter(function (g) {
      return !term || (L.name(g.translations) + " " + g.code).toLowerCase().indexOf(term) > -1;
    });
    var nPicked = Object.keys(picked[side]).length;
    var allOn = shown.length && shown.every(function (g) {
      return picked[side][g.id];
    });
    var title = side === "left" ? "All games" : "Blacklist";
    var body = "";
    var lastGroup = null;
    shown
      .slice()
      .sort(function (a, b) {
        return a.lottoGroupId - b.lottoGroupId || a.sort - b.sort;
      })
      .forEach(function (g) {
        if (g.lottoGroupId !== lastGroup) {
          lastGroup = g.lottoGroupId;
          body += '<li class="transfer__group">' + esc(groupName(g.lottoGroupId)) + "</li>";
        }
        body +=
          '<li><label class="checkbox transfer__item"><input type="checkbox" data-pick="' + side + ":" + g.id + '"' + (picked[side][g.id] ? " checked" : "") +
          '><span class="check"><iconify-icon icon="tabler:check"></iconify-icon></span><span class="transfer__name">' + esc(L.name(g.translations)) +
          '</span><span class="code">' + esc(g.code) + "</span></label></li>";
      });
    var empty = !all.length
      ? side === "right" ? "No games are blacklisted for this provider." : "Every game is blacklisted for this provider."
      : "No games match “" + esc(q[side]) + "”.";
    return (
      '<section class="transfer__list" aria-label="' + title + '">' +
      '<header class="transfer__head"><label class="checkbox"><input type="checkbox" data-pick-all="' + side + '"' + (allOn ? " checked" : "") +
      (shown.length ? "" : " disabled") + ' aria-label="Select all in ' + title + '"><span class="check"><iconify-icon icon="tabler:check"></iconify-icon></span></label>' +
      '<span class="transfer__title">' + title + '</span><span class="transfer__count">' + (nPicked ? nPicked + " of " : "") + all.length + "</span></header>" +
      '<div class="transfer__search"><div class="field__control field__control--sm"><iconify-icon icon="tabler:search"></iconify-icon>' +
      '<input type="search" data-search="' + side + '" value="' + esc(q[side]) + '" placeholder="Search games" aria-label="Search ' + title + '"></div></div>' +
      (shown.length ? '<ul class="transfer__items">' + body + "</ul>" : '<p class="transfer__empty">' + empty + "</p>") +
      "</section>"
    );
  }

  function render(focusSel) {
    var root = $("bl-root");
    var nl = Object.keys(picked.left).length;
    var nr = Object.keys(picked.right).length;
    root.innerHTML =
      '<section class="card"><div class="card__content stack" style="gap:20px">' +
      '<div class="field" style="max-width:360px"><label class="field__label" for="bl-provider">Provider</label>' +
      '<div class="field__control field__control--select"><select id="bl-provider"><option value="">Select a provider</option>' +
      providers.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === providerId ? " selected" : "") + ">" + esc(p.name) + "</option>";
      }).join("") +
      '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div></div>' +
      (providerId
        ? '<div class="transfer">' + listHTML("left") +
          '<div class="transfer__moves">' +
          '<button type="button" class="btn btn--contained btn--sm" id="bl-add"' + (nl ? "" : " disabled") + ">Add to blacklist" +
          '<iconify-icon icon="tabler:arrow-right" class="transfer__arrow"></iconify-icon></button>' +
          '<button type="button" class="btn btn--outlined btn--sm" id="bl-remove"' + (nr ? "" : " disabled") + '><iconify-icon icon="tabler:arrow-left" class="transfer__arrow"></iconify-icon>Remove</button>' +
          "</div>" + listHTML("right") + "</div>"
        : '<div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:ban"></iconify-icon></span>' +
          '<div class="empty__title">Pick a provider</div><div class="empty__text">Each provider has its own blacklist.</div></div>') +
      "</div></section>";
    if (focusSel) {
      var f = root.querySelector(focusSel);
      if (f) {
        f.focus();
        if (f.setSelectionRange) f.setSelectionRange(f.value.length, f.value.length);
      }
    }
  }

  var root = $("bl-root");
  root.addEventListener("change", function (e) {
    if (e.target.id === "bl-provider") {
      providerId = e.target.value ? Number(e.target.value) : null;
      picked = { left: {}, right: {} };
      q = { left: "", right: "" };
      return render();
    }
    var p = e.target.getAttribute("data-pick");
    if (p) {
      var side = p.split(":")[0];
      var id = p.split(":")[1];
      if (e.target.checked) picked[side][id] = true;
      else delete picked[side][id];
      return render('[data-pick="' + p + '"]');
    }
    var a = e.target.getAttribute("data-pick-all");
    if (a) {
      var term = q[a].toLowerCase();
      items(a).forEach(function (g) {
        if (term && (L.name(g.translations) + " " + g.code).toLowerCase().indexOf(term) < 0) return;
        if (e.target.checked) picked[a][g.id] = true;
        else delete picked[a][g.id];
      });
      render('[data-pick-all="' + a + '"]');
    }
  });
  root.addEventListener("input", function (e) {
    var s = e.target.getAttribute("data-search");
    if (!s) return;
    q[s] = e.target.value;
    render('[data-search="' + s + '"]');
  });
  root.addEventListener("click", function (e) {
    var add = e.target.closest("#bl-add");
    var rem = e.target.closest("#bl-remove");
    if (!add && !rem) return;
    var side = add ? "left" : "right";
    var ids = Object.keys(picked[side]).map(Number);
    var b = add || rem;
    DS.ui.busy(b, true, "Saving…");
    setTimeout(function () {
      if (add) lists[providerId] = black().concat(ids);
      else lists[providerId] = black().filter(function (id) {
        return ids.indexOf(id) < 0;
      });
      picked[side] = {};
      var p = providers.filter(function (x) {
        return x.id === providerId;
      })[0];
      var n = ids.length + (ids.length === 1 ? " game" : " games");
      DS.ui.toast(add ? n + " blacklisted for " + p.name : n + " removed from " + p.name + "'s blacklist", "tabler:circle-check");
      render();
    }, 600);
  });

  /* ---------- Prototype states ---------- */
  var states = ["no-provider", "data", "picked", "search", "empty-blacklist", "loading"];
  function setState(s) {
    DS.dialog.close();
    picked = { left: {}, right: {} };
    q = { left: "", right: "" };
    if (s === "loading") {
      $("bl-root").innerHTML = '<section class="card"><div class="card__content stack" style="gap:10px">' +
        new Array(7).join('<span class="skeleton skeleton--block" style="--h:40px"></span>') + "</div></section>";
      return;
    }
    providerId = s === "no-provider" ? null : s === "empty-blacklist" ? 103 : 104;
    if (s === "picked") {
      picked.left = { 301: true, 309: true };
      picked.right = { 319: true };
    }
    if (s === "search") q.left = "hanoi";
    render();
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
