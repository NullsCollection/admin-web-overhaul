/* ==========================================================================
   Round result (Phase 8c). ?id=<round id>
   Source: src/views/pages/lotto/round/Result/*
     ResultForm: inputs per game config (DS.rounds.resultFields); derived inputs copy the last
       digits (Six → Five / Four, Three top → Two top); "Result" → confirm → result (Pending)
       locked while a result is pending / processing / success / ready, or the round is cancelled;
       disabled while the round is still open ("This round is not open for betting")
     ResultDetail per result: Pending → Confirm result (payout) / Cancel result;
       Success (and Processing behind a feature flag) → Cancel result (paid results) within 24h of
       the payout (result.updatedAt, Bangkok time)
     CancelRoundForm: Cancel round (refund all), only when the round is close_bet
     _ResultLottoInfo: game names, type, open / close, status; _PriceConfigInfo: reward rates
     Sync sites (read-only) when the user can sync
   Changes: a 3-step strip (Enter result → Confirm payout → Paid); "Result number" (entry, always
   shown, says why it's locked) + "Result action" (every result with its own Confirm / Cancel, as in
   the app, user 2026-09-30); derived inputs say where they come from; the
   send dialog shows the numbers; plain copy for "still taking bets"; round facts, rates, sites
   and "Cancel round" in a side column; the 24h cancel window shows its end time.
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
  var H = 3600000;

  var round = null;
  var game = null;
  var config = null;
  var results = [];

  function load(r, list) {
    round = r;
    game = M.games.filter(function (g) {
      return g.id === r.lottoGameId;
    })[0];
    config = M.configById(game.lottoConfigurationId);
    results = list.slice().sort(function (a, b) {
      return b.id - a.id;
    });
  }
  var current = function () {
    return results.filter(function (x) {
      return R.ACTIVE_RESULT.indexOf(x.status) > -1;
    })[0];
  };
  var stillOpen = function () {
    return round.status === "open" && round.closeAt > fmt.now;
  };
  var entryLocked = function () {
    return !!current() || round.status === "cancelled";
  };

  /* ---------- pieces ---------- */
  function readout(nums) {
    return '<dl class="result-readout">' + Object.keys(R.RESULT_LABELS).filter(function (k) {
      return nums[k];
    }).map(function (k) {
      return "<div><dt>" + R.RESULT_LABELS[k] + "</dt><dd>" + esc(nums[k]) + "</dd></div>";
    }).join("") + "</dl>";
  }

  function stepsHTML() {
    if (round.status === "cancelled") {
      return '<div class="alert alert--info" role="status"><iconify-icon icon="tabler:receipt-refund"></iconify-icon><div class="alert__body">' +
        '<div class="alert__text">This round was cancelled and every bet refunded. Results can\'t be entered.</div></div></div>';
    }
    var c = current();
    var at = !c ? 0 : c.status === "pending" ? 1 : c.status === "success" ? 3 : 2;
    var steps = [["Enter result", "Type the winning numbers"], ["Confirm payout", "Check, then pay winners"], ["Paid", "Done"]];
    return '<ol class="steps" aria-label="Result progress">' + steps.map(function (s, i) {
      var state = i < at ? "done" : i === at ? "current" : "todo";
      if (at === 3) state = "done";
      if (stillOpen()) state = "todo";
      return '<li class="steps__item is-' + state + '"' + (state === "current" ? ' aria-current="step"' : "") + '><span class="steps__dot">' +
        (state === "done" ? '<iconify-icon icon="tabler:check"></iconify-icon>' : i + 1) + '</span><span><span class="steps__label">' + s[0] +
        '</span><span class="steps__hint">' + s[1] + "</span></span></li>";
    }).join("") + "</ol>";
  }

  function entryHTML() {
    var fields = R.resultFields(config);
    var off = stillOpen() || entryLocked();
    // Why entry is off (ResultForm alerts: "Result is being processed / already result", "not open")
    var why = round.status === "cancelled" ? ["tabler:receipt-refund", "This round was cancelled, so no result can be entered."]
      : current() ? ["tabler:lock", "A result is in play (see Result action). Cancel it to enter a different one."]
      : stillOpen() ? ["tabler:clock", "This round is still taking bets until " + fmt.dateTime(round.closeAt) + ". Enter the result after it closes."]
      : null;
    return (
      (why
        ? '<div class="alert alert--info" role="status" style="margin-bottom:16px"><iconify-icon icon="' + why[0] + '"></iconify-icon><div class="alert__body">' +
          '<div class="alert__text">' + why[1] + "</div></div></div>"
        : "") +
      '<form id="result-form" novalidate><div class="result-grid">' +
      fields.map(function (f) {
        var from = f.from ? R.RESULT_LABELS[f.from] : null;
        return (
          '<div class="field" data-rf="' + f.key + '"><label class="field__label" for="rf-' + f.key + '">' + f.label +
          (from ? "" : '<span class="req" aria-hidden="true">*</span>') + "</label>" +
          '<div class="field__control result-input' + (from ? " is-derived" : "") + '"><input id="rf-' + f.key + '" name="' + f.key + '" inputmode="numeric" autocomplete="off" maxlength="' +
          f.len + '" placeholder="' + new Array(f.len + 1).join("0") + '"' + (from ? " readonly tabindex=\"-1\"" : "") + (off ? " disabled" : "") +
          ' aria-describedby="rf-' + f.key + '-help"></div>' +
          '<div class="field__helper" id="rf-' + f.key + '-help">' + (from ? "The last " + f.len + " digits of " + from + "." : f.len + " digits") + "</div></div>"
        );
      }).join("") +
      '</div><div class="result-actions"><button type="submit" class="btn btn--contained" id="result-send"' + (off ? " disabled" : "") +
      '><iconify-icon icon="tabler:send"></iconify-icon>Send result</button>' +
      '<span class="t-body2 t-muted">Nothing is paid yet: you confirm the payout in the next step.</span></div></form>'
    );
  }

  function itemHTML(c) {
    var paidUntil = c.updatedAt + R.CANCEL_PAID_HOURS * H;
    var canCancelPaid = c.status === "success" && fmt.now <= paidUntil;
    var foot = "";
    if (c.status === "pending") {
      foot = '<button type="button" class="btn btn--contained" data-act="confirm" data-id="' + c.id + '"><iconify-icon icon="tabler:check"></iconify-icon>Confirm result</button>' +
        '<button type="button" class="btn btn--outlined btn--danger-outline" data-act="cancel" data-id="' + c.id + '"><iconify-icon icon="tabler:x"></iconify-icon>Cancel result</button>';
    } else if (c.status === "processing") {
      foot = '<span class="t-body2 t-muted">Paying winners. This page updates when it\'s done.</span>' +
        '<button type="button" class="btn btn--outlined btn--danger-outline" data-act="cancel-paid" data-id="' + c.id + '">Cancel processing result</button>';
    } else if (canCancelPaid) {
      foot = '<button type="button" class="btn btn--outlined btn--danger-outline" data-act="cancel-paid" data-id="' + c.id + '">Cancel result (paid)</button>' +
        '<span class="t-body2 t-muted">You can cancel it until ' + fmt.dateTime(paidUntil) + ".</span>";
    } else if (c.status === "success") {
      foot = '<span class="t-body2 t-muted">Paid more than 24 hours ago, so it can\'t be cancelled here.</span>';
    } else {
      foot = '<span class="t-body2 t-muted">No actions.</span>';
    }
    return (
      '<li class="result-item is-' + c.status + '"><div class="result-item__head"><span class="t-subtitle2">ID ' + c.id + "</span>" + R.resultChip(c.status) +
      '<span class="result-item__time">Result time <strong>' + fmt.dateTime(c.createdAt) + "</strong>" +
      (c.status === "success" ? ", paid " + fmt.dateTime(c.updatedAt) : "") + "</span></div>" +
      readout(c.numbers) + '<div class="result-item__actions">' + foot + "</div></li>"
    );
  }

  // Result action (ResultListControl): every result, newest first, each with its own actions
  function actionListHTML() {
    if (!results.length) return '<p class="t-body2 t-muted" style="margin:0">No results yet. Send one above and it shows up here to confirm.</p>';
    return '<ul class="result-list">' + results.map(itemHTML).join("") + "</ul>";
  }

  function sideHTML() {
    var grp = M.groupById(game.lottoGroupId);
    var canCancelRound = round.status === "close_bet" && !entryLocked();
    var why = round.status === "cancelled" ? "This round is already cancelled."
      : round.status !== "close_bet" ? "Only rounds waiting for a result can be cancelled."
      : entryLocked() ? "Cancel the current result first." : "";
    var th = game.translations.filter(function (t) {
      return t.languageCode === "th";
    })[0];
    return (
      '<section class="card"><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">Round</h2></div></header>' +
      '<div class="card__content"><dl class="facts">' +
      "<div><dt>Game</dt><dd>" + esc(L.name(game.translations)) + (th ? '<span class="t-muted"> · ' + esc(th.name) + "</span>" : "") + "</dd></div>" +
      "<div><dt>Group</dt><dd>" + esc(grp ? L.name(grp.translations) : "") + "</dd></div>" +
      "<div><dt>Type</dt><dd>" + esc(L.gameTypeLabel(game.type)) + "</dd></div>" +
      "<div><dt>Opens</dt><dd>" + fmt.dateTime(round.openAt) + "</dd></div>" +
      "<div><dt>Closes</dt><dd>" + fmt.dateTime(round.closeAt) + "</dd></div>" +
      "<div><dt>Status</dt><dd>" + R.statusChip(round) + "</dd></div></dl></div></section>" +

      '<section class="card"><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">Payout rates</h2>' +
      '<p class="card__subheader">' + esc(config.name) + "</p></div></header><div class=\"card__content\"><dl class=\"facts facts--rates\">" +
      L.payoutsFor(config).map(function (p) {
        return "<div><dt>" + esc(p.label) + "</dt><dd>" + fmt.rate(config[p.key]) + "</dd></div>";
      }).join("") + "</dl></div></section>" +

      '<section class="card"><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">Sync sites</h2>' +
      '<p class="card__subheader">Results are also sent to these sites.</p></div></header><div class="card__content"><div class="chip-row">' +
      (round.syncSiteIds || []).map(function (sid) {
        var s = M.syncSites.filter(function (x) {
          return x.id === sid;
        })[0];
        return '<span class="chip chip--outlined"><iconify-icon icon="tabler:lock"></iconify-icon>' + esc(s.name) + "</span>";
      }).join("") + "</div></div></section>" +

      '<section class="card card--danger"><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">Cancel round</h2>' +
      '<p class="card__subheader">Refunds every bet in this round. This can\'t be undone.</p></div></header><div class="card__content stack" style="gap:8px">' +
      '<button type="button" class="btn btn--outlined btn--danger-outline" data-act="cancel-round"' + (canCancelRound ? "" : " disabled") + ">Cancel round (refund all)</button>" +
      (why ? '<span class="t-body2 t-muted">' + why + "</span>" : "") + "</div></section>"
    );
  }

  function render() {
    $("result-root").innerHTML =
      R.backLinkHTML(game) +
      '<div class="page-header"><div><div class="page-header__title-row"><h1 class="page-header__title">Round result</h1>' + R.statusChip(round) + "</div>" +
      '<p class="page-header__sub">' + esc(L.name(game.translations)) + ", round " + round.id + ", closes " + fmt.dateTime(round.closeAt) + "</p></div></div>" +
      stepsHTML() +
      '<div class="result-layout"><div class="stack" style="gap:24px">' +
      '<section class="card"><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">Result number</h2>' +
      '<p class="card__subheader">Only the numbers this game pays on are asked for.</p></div></header>' +
      '<div class="card__content">' + entryHTML() + "</div></section>" +
      '<section class="card" id="result-action"><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">Result action</h2>' +
      '<p class="card__subheader">Every result sent for this round. Confirm one to pay winners, or cancel it.</p></div></header>' +
      '<div class="card__content">' + actionListHTML() + "</div></section>" +
      "</div><aside class=\"stack result-side\" style=\"gap:24px\">" + sideHTML() + "</aside></div>";
    document.title = "Round " + round.id + " result | Admin prototype";
    var crumbs = document.querySelector(".topbar__crumbs");
    if (crumbs) {
      var parts = R.parentList(game).crumbs.concat(["Round result"]);
      crumbs.innerHTML = parts.map(function (x, i) {
        var end = i === parts.length - 1;
        return (end ? '<span aria-current="page">' : "<span>") + esc(x) + "</span>" +
          (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
      }).join("");
    }
  }

  /* ---------- entry form behavior ---------- */
  var root = $("result-root");
  root.addEventListener("input", function (e) {
    var inp = e.target.closest(".result-input input");
    if (!inp) return;
    inp.value = inp.value.replace(/\D/g, ""); // digits only
    DS.ui.fieldError(inp, "");
    // Fill the derived inputs (last digits)
    R.resultFields(config).forEach(function (f) {
      if (f.from !== inp.name) return;
      $("rf-" + f.key).value = inp.value.length >= f.len ? inp.value.slice(-f.len) : "";
    });
  });
  root.addEventListener("submit", function (e) {
    if (e.target.id !== "result-form") return;
    e.preventDefault();
    var fields = R.resultFields(config);
    var nums = {};
    var first = null;
    fields.forEach(function (f) {
      var inp = $("rf-" + f.key);
      var v = inp.value;
      var msg = f.from ? "" : !v ? "Enter the result." : v.length !== f.len ? "Enter all " + f.len + " digits." : "";
      if (f.from && v.length !== f.len) msg = "Fill in " + R.RESULT_LABELS[f.from] + " first.";
      DS.ui.fieldError(inp, msg);
      if (msg && !first) first = f.from ? $("rf-" + f.from) : inp;
      nums[f.key] = v;
    });
    if (first) return first.focus();
    DS.dialog.open({
      icon: "tabler:send", tone: "primary",
      title: "Send this result?",
      html: "Check the numbers for round " + round.id + ". Nothing is paid until you confirm the payout.",
      body: readout(nums),
      actions: [
        { label: "Check again", variant: "outlined", autofocus: true },
        { label: "Send result", variant: "contained", onClick: function (b, close) {
          DS.ui.busy(b, true, "Sending…");
          setTimeout(function () {
            close();
            results.unshift({ id: (results[0] ? results[0].id : round.id * 10) + 1, status: "pending", numbers: nums, createdAt: fmt.now, updatedAt: fmt.now });
            DS.ui.toast("Result sent. Confirm the payout next.", "tabler:circle-check");
            render();
          }, 700);
        } },
      ],
    });
  });

  /* ---------- result + round actions ---------- */
  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var act = b.getAttribute("data-act");
    var c = results.filter(function (x) {
      return String(x.id) === b.getAttribute("data-id");
    })[0];
    if (act === "confirm") {
      DS.dialog.open({
        icon: "tabler:cash", tone: "primary", title: "Pay out this result?",
        html: "Winning tickets in round " + round.id + " are paid using these numbers.", body: readout(c.numbers),
        actions: [
          { label: "Cancel", variant: "outlined", autofocus: true },
          { label: "Confirm result", variant: "contained", onClick: function (btn, close) {
            DS.ui.busy(btn, true, "Confirming…");
            setTimeout(function () {
              close();
              c.status = "processing";
              DS.ui.toast("Payout started", "tabler:cash");
              render();
              setTimeout(function () {
                c.status = "success";
                c.updatedAt = fmt.now;
                round.status = "resulted";
                render();
              }, 2500);
            }, 700);
          } },
        ],
      });
    }
    if (act === "cancel" || act === "cancel-paid") {
      var paid = act === "cancel-paid";
      DS.dialog.open({
        icon: "tabler:x", tone: "error",
        title: paid ? (c.status === "processing" ? "Cancel the processing result?" : "Cancel the paid result?") : "Cancel this result?",
        html: paid ? "Result " + c.id + " is cancelled after it was paid. You can enter a new result afterwards." : "Result " + c.id + " is thrown away and nothing is paid. You can enter a new result.",
        actions: [
          { label: "Keep it", variant: "outlined", autofocus: true },
          { label: "Cancel result", variant: "contained", tone: "error", onClick: function (btn, close) {
            DS.ui.busy(btn, true, "Cancelling…");
            setTimeout(function () {
              close();
              c.status = "canceled";
              if (round.status === "resulted") round.status = "close_bet";
              DS.ui.toast("Result " + c.id + " cancelled", "tabler:circle-check");
              render();
            }, 700);
          } },
        ],
      });
    }
    if (act === "cancel-round") {
      DS.dialog.open({
        icon: "tabler:receipt-refund", tone: "error",
        title: "Cancel round " + round.id + " and refund everyone?",
        html: "Every bet in this round is refunded and no result can be entered. This can't be undone.",
        actions: [
          { label: "Keep the round", variant: "outlined", autofocus: true },
          { label: "Cancel round (refund all)", variant: "contained", tone: "error", onClick: function (btn, close) {
            DS.ui.busy(btn, true, "Cancelling…");
            setTimeout(function () {
              close();
              round.status = "cancelled";
              DS.ui.toast("Round " + round.id + " cancelled and refunded", "tabler:circle-check");
              render();
            }, 800);
          } },
        ],
      });
    }
  });

  /* ---------- Prototype states ---------- */
  var all = M.rounds();
  var pick = function (test) {
    return all.filter(test)[0];
  };
  var gameType = function (r) {
    return (M.games.filter(function (g) {
      return g.id === r.lottoGameId;
    })[0] || {}).type;
  };
  var byId = DS.params.get("id") ? M.round(DS.params.get("id")) : null;
  var STATES = {
    enter: function () {
      var r = pick(function (x) {
        return x.status === "close_bet" && x.id % 2 && gameType(x) === "default";
      });
      return [r, []];
    },
    pending: function () {
      var r = pick(function (x) {
        return x.status === "close_bet" && !(x.id % 2) && gameType(x) === "default";
      });
      return [r, M.roundResults(r)];
    },
    processing: function () {
      var s = STATES.pending();
      s[1] = s[1].map(function (x) {
        return Object.assign({}, x, { status: "processing" });
      });
      return s;
    },
    paid: function () {
      var r = Object.assign({}, pick(function (x) {
        return x.status === "resulted" && gameType(x) === "default";
      }));
      var list = M.roundResults(r).map(function (x) {
        return x.status === "success" ? Object.assign({}, x, { updatedAt: fmt.now - 3 * H }) : x;
      });
      return [r, list];
    },
    // A cancelled result, then the paid one (both listed in Result action)
    "several-results": function () {
      var r = pick(function (x) {
        return x.status === "resulted" && x.id % 3 === 0 && gameType(x) === "default";
      });
      var list = M.roundResults(r).map(function (x) {
        return x.status === "success" ? Object.assign({}, x, { updatedAt: fmt.now - 2 * H }) : x;
      });
      return [r, list];
    },
    "paid-expired": function () {
      var r = pick(function (x) {
        return x.status === "resulted" && x.closeAt < fmt.now - 3 * 864e5 && gameType(x) === "default";
      });
      return [r, M.roundResults(r)];
    },
    "still-open": function () {
      return [pick(function (x) {
        return R.isOpenNow(x) && gameType(x) === "default";
      }), []];
    },
    cancelled: function () {
      return [pick(function (x) {
        return x.status === "cancelled";
      }), []];
    },
    "set-lottery": function () {
      return [pick(function (x) {
        return x.status === "close_bet" && gameType(x) === "group_custom";
      }) || Object.assign({}, STATES.enter()[0], { lottoGameId: 323 }), []];
    },
    "six-digits": function () {
      var r = Object.assign({}, STATES.enter()[0], { lottoGameId: 308 }); // Lao set 6 (group_six)
      return [r, []];
    },
    errors: function () {
      return STATES.enter();
    },
  };
  var states = Object.keys(STATES);
  function setState(s) {
    DS.dialog.close();
    var pair = STATES[s]();
    load(JSON.parse(JSON.stringify(pair[0])), JSON.parse(JSON.stringify(pair[1])));
    render();
    if (s === "errors") {
      var inputs = document.querySelectorAll(".result-input input:not([readonly])");
      if (inputs[0]) inputs[0].value = "12";
      $("result-form").requestSubmit();
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : null;
  DS.page = { states: states, state: initial || "enter", setState: setState };
  if (byId && !initial) {
    load(byId, M.roundResults(byId));
    render();
  } else setState(initial || "enter");
})(window.DS);
