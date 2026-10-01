/* ==========================================================================
   Yeekee round result (Phase 8e). ?id=<round id>   App: "Check result" (read-only page)
   Source: src/pages/lotto/yeekees/[id]/index.tsx picks the view by game type:
     YeekeeResult (yeekee, yeekee_vip): title "<game># <round> : <date>", Status (Open / Disabled)
       + Result status (Resulted / Waiting for result, red); 6+ tiles in different colors: Result
       (summaryResult), Row 16 result, Yeekee result (summary − row 16, worked out in the page),
       Row 16 user, Bottom two, Top three, "Row number N winner" ×5 (when there's a username);
       then YeekeeResultTable: "rank#username", Bet number, Bet time (paged)
     YeekeeMalta (encrypt_game): Status, Result status, Signature, Encrypt result, Result (six),
       Top three, Bottom two
   Changes: one status chip (same as the list); the winning numbers first (Top three / Bottom two);
   the 4 calculation tiles become one worked sum (sum − row 16 = yeekee result) so it can be
   checked by eye; bonus winners in the side column with their row; the shot numbers table gets a
   Row column and marks row 16 + the bonus rows; no colored tiles or hover lift (calm, no
   shadows); "Waiting for result" is warning, not red. Encrypted draw: signature + encrypted result
   as copyable code blocks.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var R = DS.rounds;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var round = null;
  var game = null;

  var card = function (title, sub, body, extra) {
    return '<section class="card"' + (extra || "") + '><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">' + title + "</h2>" +
      (sub ? '<p class="card__subheader">' + sub + "</p>" : "") + "</div></header>" + body + "</section>";
  };
  var copyBtn = function (text, what) {
    return '<button type="button" class="icon-btn icon-btn--sm" data-copy="' + esc(text) + '" data-copy-label="' + esc(what) + ' copied" aria-label="Copy ' +
      esc(what.toLowerCase()) + '" title="Copy"><iconify-icon icon="tabler:copy"></iconify-icon></button>';
  };
  var hm = function (d) {
    d = new Date(d);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };
  var resulted = function () {
    return !!round.isResultConfirmed;
  };
  var waitingText = function () {
    return R.isOpenNow(round)
      ? "Members can shoot numbers until " + hm(round.closeAt) + ". The result shows here once the round closes and is worked out."
      : "Waiting for result. It shows here once the numbers are worked out.";
  };

  /* ---------- Yeekee: rows that matter (row 16 + bonus rows) ---------- */
  function bonusRows() {
    var c = round.yeekeeConfig || {};
    var b = round.yeekeeRoundBonus || {};
    var out = [];
    [1, 2, 3, 4, 5].forEach(function (n) {
      var user = b["playerUsernameBonus" + n];
      if (user && c["bonusRow" + n]) out.push({ row: c["bonusRow" + n], user: user }); // same gate as the app
    });
    return out;
  }

  /* ---------- Main column ---------- */
  function readout(items) {
    return '<dl class="result-readout">' + items.map(function (x) {
      return "<div><dt>" + x[0] + "</dt><dd>" + (resulted() && x[1] ? esc(x[1]) : '<span class="t-faint">–</span>') + "</dd></div>";
    }).join("") + "</dl>";
  }

  // Two columns ≥ 900px: winning numbers left, how they're worked out right (stacks on phones)
  function yeekeeResultCard() {
    var b = round.yeekeeRoundBonus;
    var left = '<div class="result-split__main"><h3 class="t-subtitle2 calc__title">Winning numbers</h3>' +
      readout([["Top three", round.topThreeResult], ["Bottom two", round.bottomTwoResult]]) + "</div>";
    var right;
    if (resulted() && b) {
      var sum = Number(b.summaryResult);
      var row16 = Number(b.resultRow16);
      var shots = M.yeekeeShots(round).length;
      right =
        '<h3 class="t-subtitle2 calc__title">How the result is worked out</h3>' +
        '<dl class="calc">' +
        '<div class="calc__row"><dt><span class="calc__op" aria-hidden="true"></span>Sum of all shot numbers<small>' + fmt.int(shots) + " numbers</small></dt><dd>" + fmt.int(sum) + "</dd></div>" +
        '<div class="calc__row"><dt><span class="calc__op" aria-hidden="true">−</span>Row 16 number<small>by ' + esc(b.resultRow16Username) + "</small></dt><dd>" + fmt.int(row16) + "</dd></div>" +
        '<div class="calc__row calc__row--total"><dt><span class="calc__op" aria-hidden="true">=</span>Yeekee result</dt><dd>' + fmt.int(sum - row16) + "</dd></div>" +
        "</dl>";
    } else {
      right = '<h3 class="t-subtitle2 calc__title">How the result is worked out</h3><p class="t-body2 t-muted">' + waitingText() + "</p>";
    }
    return card("Result", "The winning numbers for this round.",
      '<div class="card__content result-split">' + left + '<div class="result-split__side">' + right + "</div></div>");
  }

  function encryptedResultCard() {
    var body = readout([["Result", round.sixResult], ["Top three", round.topThreeResult], ["Bottom two", round.bottomTwoResult]]);
    if (!resulted()) body += '<p class="t-body2 t-muted calc__note">' + waitingText() + "</p>";
    return card("Result", "The winning numbers for this draw.", '<div class="card__content">' + body + "</div>");
  }

  function verificationCard() {
    var block = function (label, text, what) {
      return '<div class="stack" style="gap:8px"><div class="t-subtitle2">' + label + "</div>" +
        (text
          ? '<pre class="code-block code-block--wrap">' + esc(text) + '<span class="code-block__copy">' + copyBtn(text, what) + "</span></pre>"
          : '<p class="t-body2 t-muted">Shown once the result is in.</p>') + "</div>";
    };
    return card("Signature", "The signature and encrypted result for this draw.",
      '<div class="card__content stack" style="gap:20px">' + block("Signature", round.signature, "Signature") +
      block("Encrypted result", resulted() ? round.encryptResult : "", "Encrypted result") + "</div>");
  }

  function shotsCard() {
    var n = M.yeekeeShots(round).length;
    return '<section class="card list-card" id="shots-card" aria-labelledby="shots-title"><header class="card__header card__header--divided"><div class="card__heading">' +
      '<h2 class="card__title" id="shots-title">Shot numbers</h2><p class="card__subheader">' + (n ? fmt.int(n) + " numbers, in the order members sent them." + (resulted() ? " Row 16 and the bonus rows are marked." : "") : "Numbers members send show up here.") + "</p></div></header>" +
      '<div class="list-body" aria-live="polite"></div><div data-list-pager></div></section>';
  }

  /* ---------- Side column ---------- */
  function factsCard() {
    var grp = M.groupById(game.lottoGroupId);
    return card("Round", "", '<div class="card__content"><dl class="facts">' +
      "<div><dt>Game</dt><dd>" + esc(L.name(game.translations)) + "</dd></div>" +
      "<div><dt>Group</dt><dd>" + esc(grp ? L.name(grp.translations) : "") + "</dd></div>" +
      '<div><dt>Round</dt><dd class="t-num">#' + esc(round.roundNumber) + "</dd></div>" +
      '<div><dt>Round ID</dt><dd class="t-num">' + round.id + "</dd></div>" +
      "<div><dt>Opens</dt><dd>" + fmt.dateTime(round.openAt) + "</dd></div>" +
      "<div><dt>Closes</dt><dd>" + fmt.dateTime(round.closeAt) + "</dd></div>" +
      "</dl></div>");
  }

  function bonusCard() {
    var rows = bonusRows();
    var body = !resulted()
      ? '<p class="t-body2 t-muted">Shown once the result is in.</p>'
      : rows.length
        ? '<dl class="facts">' + rows.map(function (x) {
          return "<div><dt>Row " + x.row + "</dt><dd>" + esc(x.user) + "</dd></div>";
        }).join("") + "</dl>"
        : '<p class="t-body2 t-muted">No member reached a bonus row in this round.</p>';
    return card("Bonus winners", "Members who sent the number at a bonus row.",
      '<div class="card__content stack" style="gap:12px">' + body +
      '<a class="t-body2" href="yeekee-config-form.html?id=' + (round.yeekeeConfig || {}).id + '">Bonus rows are set in Yeekee bonus config</a></div>');
  }

  /* ---------- Page ---------- */
  function header(chipHTML, subHTML, title) {
    return R.backLinkHTML(game || { type: "yeekee" }) +
      '<div class="page-header"><div><div class="page-header__title-row"><h1 class="page-header__title">' + title + "</h1>" + chipHTML + "</div>" +
      '<p class="page-header__sub">' + subHTML + "</p></div></div>";
  }

  function render() {
    var yk = R.isYeekee(game);
    var title = esc(L.name(game.translations)) + ' <span class="t-muted">#' + esc(round.roundNumber) + "</span>";
    $("y-root").innerHTML =
      header(R.statusChip(round), "Round " + round.id + ", closes " + fmt.dateTime(round.closeAt), title) +
      '<div class="result-layout"><div class="stack" style="gap:24px">' +
      (yk ? yeekeeResultCard() + shotsCard() : encryptedResultCard() + verificationCard()) +
      '</div><aside class="stack" style="gap:24px">' + factsCard() + (yk ? bonusCard() : "") + "</aside></div>";
    document.title = L.name(game.translations) + " #" + round.roundNumber + " | Admin prototype";
    R.setCrumbs(game, "Round result");
    if (yk) mountShots();
  }

  // Shot numbers on the list engine (YeekeeResultTable: GenericTable, server paged, no sorting)
  function mountShots() {
    var shots = M.yeekeeShots(round).map(function (s, i) {
      return Object.assign({ row: i + 1 }, s);
    });
    var b = round.yeekeeRoundBonus || {};
    var bonusAt = {};
    if (resulted()) {
      bonusRows().forEach(function (x) {
        bonusAt[x.row] = true;
      });
    }
    var shotList = DS.list.create({
      root: $("shots-card"),
      noun: ["number", "numbers"],
      rows: function () {
        return shots;
      },
      search: function (r) {
        return r.playerUsername;
      },
      filters: {},
      rowName: function (r) {
        return "row " + r.row;
      },
      columns: [
        { key: "row", label: "Row", num: true, sortable: false, render: function (r) {
          return '<span class="t-muted">' + r.row + "</span>";
        } },
        { key: "playerUsername", label: "Member", className: "is-strong", sortable: false, render: function (r) {
          var tags = "";
          if (resulted() && b.resultRow16 && r.row === 16) tags += '<span class="chip chip--info">Row 16</span>';
          if (bonusAt[r.row]) tags += '<span class="chip chip--success"><iconify-icon icon="tabler:gift"></iconify-icon>Bonus</span>';
          return esc(r.playerUsername) + (tags ? '<span class="chip-row chip-row--inline">' + tags + "</span>" : "");
        } },
        { key: "inputNumber", label: "Bet number", sortable: false, render: function (r) {
          return '<span class="code">' + esc(r.inputNumber) + "</span>";
        } },
        { key: "savedAt", label: "Bet time", sortable: false, render: function (r) {
          return fmt.dateTimeSec(r.savedAt);
        } },
      ],
      pageSize: 25,
      empty: { icon: "tabler:target-arrow", title: "No numbers yet", text: "Numbers show up here as members shoot them." },
      noResults: { icon: "tabler:search", title: "No numbers match", text: "" },
    });
    shotList.setMode("data"); // the engine draws on the first setMode
  }

  /* ---------- Loading / not found / error ---------- */
  function skeleton() {
    var line = function (w) {
      return '<span class="skeleton skeleton--text" style="--w:' + w + '"></span>';
    };
    var sk = function (rows) {
      return '<section class="card"><div class="card__content stack" style="gap:16px">' + line("30%") + new Array(rows + 1).join(line("100%")) + "</div></section>";
    };
    $("y-root").innerHTML =
      R.backLinkHTML(game || { type: "yeekee" }) +
      '<div class="page-header"><div><div class="page-header__title-row"><span class="skeleton skeleton--text skeleton--on-canvas" style="--w:200px;height:28px"></span></div>' +
      '<p class="page-header__sub"><span class="skeleton skeleton--text skeleton--on-canvas" style="--w:260px;margin-top:6px"></span></p></div></div>' +
      '<div class="result-layout"><div class="stack" style="gap:24px">' + sk(3) + sk(8) + '</div><aside class="stack" style="gap:24px">' + sk(5) + "</aside></div>";
  }
  function problem(kind, id) {
    var body = kind === "not-found"
      ? '<div class="card"><div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:calendar-off"></iconify-icon></span>' +
        '<div class="empty__title">We couldn\'t find yeekee round ' + esc(id) + '</div><div class="empty__text">It may not exist, or the link has a typo. Find it in the yeekee rounds list.</div>' +
        '<a class="btn btn--outlined btn--sm" href="yeekee-rounds.html">Go to yeekee rounds</a></div></div>'
      : '<div class="alert alert--error" role="alert"><iconify-icon icon="tabler:alert-triangle"></iconify-icon><div class="alert__body">' +
        '<div class="alert__title">Couldn\'t load this round</div><div class="alert__text">The server didn\'t respond. Try again in a moment.</div></div>' +
        '<div class="alert__actions"><button type="button" class="btn btn--outlined btn--sm" id="y-retry"><iconify-icon icon="tabler:refresh"></iconify-icon>Try again</button></div></div>';
    $("y-root").innerHTML = R.backLinkHTML(game || { type: "yeekee" }) +
      '<div class="page-header"><div><h1 class="page-header__title">Yeekee round</h1></div></div>' + body;
    var retry = $("y-retry");
    if (retry) retry.addEventListener("click", function () {
      skeleton();
      setTimeout(function () {
        setState("data");
        DS.page.state = "data";
        if (DS.devbar) DS.devbar.render();
      }, 700);
    });
  }

  /* ---------- Prototype states ---------- */
  var all = M.yeekeeRounds();
  var pick = function (test) {
    return all.filter(test)[0];
  };
  var typeOf = function (r) {
    return (M.games.filter(function (g) {
      return g.id === r.lottoGameId;
    })[0] || {}).type;
  };
  var byId = DS.params.get("id") ? M.round(DS.params.get("id")) : null;
  var STATES = {
    data: function () {
      return byId || pick(function (r) {
        return r.isResultConfirmed && typeOf(r) === "yeekee" && M.yeekeeShots(r).length >= 99;
      }) || pick(function (r) {
        return r.isResultConfirmed && typeOf(r) === "yeekee";
      });
    },
    waiting: function () {
      return pick(function (r) {
        return r.status === "close_bet" && typeOf(r) === "yeekee";
      });
    },
    "taking-numbers": function () {
      return pick(function (r) {
        return R.isOpenNow(r) && typeOf(r) === "yeekee";
      });
    },
    "few-numbers": function () {
      return pick(function (r) {
        return r.isResultConfirmed && typeOf(r) === "yeekee" && M.yeekeeShots(r).length < 50;
      });
    },
    encrypted: function () {
      return pick(function (r) {
        return r.isResultConfirmed && typeOf(r) === "encrypt_game";
      });
    },
    "encrypted-waiting": function () {
      return pick(function (r) {
        return !r.isResultConfirmed && typeOf(r) === "encrypt_game";
      });
    },
  };
  var states = Object.keys(STATES).concat(["loading", "not-found", "error"]);
  function setState(s) {
    if (s === "loading") return skeleton();
    if (s === "not-found") return problem(s, DS.params.get("id") || "99999");
    if (s === "error") return problem(s);
    var r = STATES[s]();
    if (!r) return problem("not-found", DS.params.get("id"));
    round = JSON.parse(JSON.stringify(r));
    game = M.games.filter(function (g) {
      return g.id === round.lottoGameId;
    })[0];
    if (!R.isYeekee(game) && !R.isEncrypted(game)) {
      location.replace("round-result.html?id=" + round.id); // not a yeekee round: the normal result page
      return;
    }
    render();
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  if (DS.params.get("id") && !byId) initial = "not-found";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
