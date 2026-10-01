/* ==========================================================================
   View limit number set (Phase 9a). ?id=<set id>
   Source: views/pages/lotto/limit-template/v2/component/ReadForm.tsx (Stepper in "read" mode →
     CompleteForm): "Name: …", "Provider: <name> — <currency>", a BetTypeCard per bet type (max
     limit or a "Not Set" chip + Min / Max / Payout (%) table, 5 rows a page), "Set interesting
     limit number" + a SpecialLimitCard per number (max, bet type chips, table)
   Changes: a real page header (name + scope chip, provider + currency, last updated) with Edit and
   Delete; the same cards as the preview dialog (DS.lotto.limitSetHTML), tables not paged (cards
   are short); "Not Set" warning chip → "No max" / "No ranges" text.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var BACK = '<a class="back-link" href="limit-templates.html"><iconify-icon icon="tabler:arrow-left"></iconify-icon>Limit number sets</a>';

  function crumbs(page) {
    var el = document.querySelector(".topbar__crumbs");
    if (!el) return;
    var parts = ["Lotto", "Limits & credit", "Limit number sets", page];
    el.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  function render(t) {
    var p = t.providerId && M.providers.filter(function (x) {
      return x.id === t.providerId;
    })[0];
    var sub = (p ? "Local set for " + esc(p.name) + " (" + esc(p.prefixCode) + "), " + esc(p.currency.code) : "Global set, for every provider") +
      " · Updated " + fmt.dateTime(t.updatedAt);
    $("lt-root").innerHTML = BACK +
      '<div class="page-header"><div><div class="page-header__title-row"><h1 class="page-header__title">' + esc(t.name) + "</h1>" +
      (t.providerId ? '<span class="chip chip--primary">Local</span>' : '<span class="chip">Global</span>') + "</div>" +
      '<p class="page-header__sub">' + sub + "</p></div>" +
      '<div class="page-header__actions"><button type="button" class="btn btn--outlined btn--danger-outline" id="lt-delete"><iconify-icon icon="tabler:trash"></iconify-icon>Delete</button>' +
      '<a class="btn btn--contained" href="limit-template-form.html?id=' + t.id + '"><iconify-icon icon="tabler:pencil"></iconify-icon>Edit set</a></div></div>' +
      '<section class="card"><div class="card__content">' + L.limitSetHTML(t) + "</div></section>";
    document.title = t.name + " | Admin prototype";
    crumbs(t.name);
    $("lt-delete").addEventListener("click", function () {
      DS.dialog.open({
        icon: "tabler:trash", tone: "error", title: "Delete this limit set?",
        html: "<strong>" + esc(t.name) + "</strong> will be removed. Games and rounds that use it stop using it. This can't be undone.",
        actions: [
          { label: "Cancel", variant: "outlined", autofocus: true },
          { label: "Delete set", variant: "contained", tone: "error", onClick: function (btn, close) {
            DS.ui.busy(btn, true, "Deleting…");
            setTimeout(function () {
              close();
              DS.ui.toast(t.name + " deleted", "tabler:circle-check");
              setTimeout(function () {
                location.href = "limit-templates.html";
              }, 1000);
            }, 700);
          } },
        ],
      });
    });
  }

  function skeleton() {
    var line = function (w, h) {
      return '<span class="skeleton skeleton--text" style="--w:' + w + (h ? ";height:" + h : "") + '"></span>';
    };
    var cards = new Array(7).join('<div class="limit-card" style="padding:12px"><div class="stack" style="gap:10px">' + line("50%", "14px") + line("100%") + line("100%") + line("80%") + "</div></div>");
    $("lt-root").innerHTML = BACK +
      '<div class="page-header"><div><span class="skeleton skeleton--text skeleton--on-canvas" style="--w:240px;height:28px"></span>' +
      '<p class="page-header__sub"><span class="skeleton skeleton--text skeleton--on-canvas" style="--w:320px;margin-top:6px"></span></p></div></div>' +
      '<section class="card"><div class="card__content"><div class="limit-grid">' + cards + "</div></div></section>";
    crumbs("Limit number set");
  }

  function notFound(id) {
    $("lt-root").innerHTML = BACK + '<div class="page-header"><div><h1 class="page-header__title">Limit number set</h1></div></div>' +
      '<div class="card"><div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:numbers"></iconify-icon></span>' +
      '<div class="empty__title">We couldn\'t find limit set ' + esc(id) + '</div><div class="empty__text">It may have been deleted. Find it in the list.</div>' +
      '<a class="btn btn--outlined btn--sm" href="limit-templates.html">Go to limit number sets</a></div></div>';
    crumbs("Limit number set");
  }

  /* ---------- Prototype states ---------- */
  var id = DS.params.get("id");
  var STATES = {
    data: function () {
      return (id && M.limitTemplate(id)) || M.limitTemplate(401);
    },
    "local-set": function () {
      return M.limitTemplate(404);
    },
    "no-special": function () {
      return M.limitTemplate(403);
    },
  };
  var states = Object.keys(STATES).concat(["loading", "not-found"]);
  function setState(s) {
    DS.dialog.close();
    if (s === "loading") return skeleton();
    if (s === "not-found") return notFound(id || "999");
    render(STATES[s]());
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : id && !M.limitTemplate(id) ? "not-found" : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
