/* ==========================================================================
   Ticket summary (Phase 10a).
   Source: src/views/pages/bet-ticket/summary/index.tsx
     FilterTextField (pick a field, type a value, Apply): Start date, End date (default today),
       Ticket ID, User ID / Username, Providers (multi), Lotto games (multi), Status; Clear → today
     warning alert: "New player data will be generated based only on the selected start date, end
       date, and provider name."
     then dashboard/BetPerformance: Overview (profit, wagers, settled, not settled, wins, bonus, ROI,
       new players as 8 colored-icon cards) + Cancellations (4 amount cards); full-page Spinner while loading
   Changes: the same filter bar as the ticket list (in the open, applied as they change, "search
   by" picker); the summary uses the dashboard's approved pieces (profit hero with ROI, stat grid,
   Tickets card, one Cancellations table); the new-players warning sits on the New players stat
   (it only matters there); skeletons in place instead of a spinner, filters stay usable.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var $ = function (id) {
    return document.getElementById(id);
  };

  /* ---------- Filters ---------- */
  var DEFAULT = { start: "2026-09-24T00:00", end: "2026-09-24T23:59" };
  var providers = DS.ui.multiselect($("f-providers"), {
    options: M.providers.slice(0, 8).map(function (p) {
      return { value: String(p.id), label: p.name + " (" + p.prefixCode + ")" };
    }),
    selected: [],
    placeholder: "All providers",
    emptyText: "No providers match",
    onChange: changed,
  });
  var games = DS.ui.multiselect($("f-games"), {
    options: M.games.map(function (g) {
      return { value: g, label: g };
    }),
    selected: [],
    placeholder: "All games",
    emptyText: "No games match",
    onChange: changed,
  });
  function read() {
    return {
      scope: $("f-scope").value,
      q: $("f-search").value.trim(),
      start: $("f-start").value,
      end: $("f-end").value,
      providers: providers.get(),
      games: games.get(),
      status: $("f-status").value,
    };
  }
  function isDefault(f) {
    return !f.q && f.start === DEFAULT.start && f.end === DEFAULT.end && !f.providers.length && !f.games.length && f.status === "all";
  }
  $("f-scope").addEventListener("change", function () {
    $("f-search").placeholder = $("f-scope").value === "id" ? "Search ticket ID" : "Search user ID or username";
    if ($("f-search").value) changed();
  });
  var debounce = 0;
  $("f-search").addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(changed, 350);
  });
  ["f-start", "f-end", "f-status"].forEach(function (id) {
    $(id).addEventListener("change", changed);
  });
  $("f-clear").addEventListener("click", function () {
    $("f-search").value = "";
    $("f-start").value = DEFAULT.start;
    $("f-end").value = DEFAULT.end;
    $("f-status").value = "all";
    providers.set([]);
    games.set([]);
    changed();
  });

  /* ---------- Pretend server: same shape as useGetBetTicketSummary ---------- */
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0) / 4294967296;
  }
  function build(f) {
    var days = Math.max(1 / 24, (new Date(f.end) - new Date(f.start) + 60000) / 864e5);
    var scale = days * (f.providers.length ? f.providers.length / 8 : 1) * (f.games.length ? f.games.length / M.games.length : 1) *
      (f.status !== "all" ? 0.3 : 1) * (f.q ? 0.0005 : 1);
    var r = hash(JSON.stringify(f));
    var wagers = Math.round(812000 * scale * (0.9 + r * 0.2) * 100) / 100;
    var win = wagers * (0.66 + r * 0.08);
    var bonus = wagers * 0.017;
    var total = Math.round(wagers / 259);
    var t = {
      total: total, settled: Math.round(total * 0.94), approved: Math.round(total * 0.164), waiting: Math.round(total * 0.0346),
      cancelled: Math.round(total * 0.0127), roundCancelled: Math.round(total * 0.003), betFailed: Math.round(total * 0.00077),
      userCancelled: Math.round(total * 0.0089),
    };
    return {
      betPerformance: {
        betTotalAmount: wagers, betSettledAmount: wagers * 0.953, betNotSettledAmount: wagers * 0.047, winTotalAmount: win,
        profitTotalAmount: wagers - win - bonus, totalBonus: bonus, roi: wagers ? ((wagers - win - bonus) / wagers) * 100 : 0,
        cancelAmount: t.cancelled * 157.2, roundCancelledAmount: t.roundCancelled * 429.6, betFailedAmount: t.betFailed * 241.6,
        userCancelledAmount: t.userCancelled * 263.45,
      },
      betTicketCountOverview: t,
      newPlayerCount: f.q ? 0 : Math.round(24.4 * days * (f.providers.length ? f.providers.length / 8 : 1)),
    };
  }
  function zero(d) {
    Object.keys(d.betPerformance).forEach(function (k) {
      d.betPerformance[k] = 0;
    });
    Object.keys(d.betTicketCountOverview).forEach(function (k) {
      d.betTicketCountOverview[k] = 0;
    });
    d.newPlayerCount = 0;
    return d;
  }

  /* ---------- Renderers (the dashboard's pieces) ---------- */
  function statHTML(s) {
    return '<div class="stat"><div class="stat__label"><iconify-icon icon="' + s.icon + '"></iconify-icon>' + esc(s.label) +
      '</div><div class="stat__value">' + s.value + "</div>" + (s.meta ? '<div class="stat__meta">' + esc(s.meta) + "</div>" : "") + "</div>";
  }
  function summaryLine(f) {
    var who = f.providers.length ? f.providers.length + (f.providers.length === 1 ? " provider" : " providers") : "all providers";
    var what = f.games.length ? f.games.length + (f.games.length === 1 ? " game" : " games") : "all games";
    var extra = (f.status !== "all" ? ", " + $("f-status").selectedOptions[0].textContent.toLowerCase() + " tickets" : "") +
      (f.q ? ", matching “" + f.q + "”" : "");
    return fmt.dateTime(f.start) + " to " + fmt.dateTime(f.end) + ", for " + who + " and " + what + extra;
  }
  function render(d) {
    var p = d.betPerformance;
    var t = d.betTicketCountOverview;
    var w = p.betTotalAmount;
    var share = function (n) {
      return w ? fmt.pct((n / w) * 100, 1) + " of wagers" : "";
    };
    var roiFill = Math.max(0, Math.min(100, p.roi));
    $("ov-hero").innerHTML =
      '<div><div class="hero__label"><iconify-icon icon="tabler:coins"></iconify-icon>Profit</div>' +
      '<div class="hero__value">' + fmt.moneyHTML(p.profitTotalAmount) + "</div>" +
      '<div class="hero__note">' + (p.profitTotalAmount < 0 ? "Net loss" : "In this range") + "</div></div>" +
      '<div class="hero__roi"><span class="hero__roi-label">ROI</span><span class="hero__roi-value">' + fmt.pct(p.roi) + "</span>" +
      '<div class="meter" role="meter" aria-label="ROI" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + roiFill.toFixed(1) +
      '"><div class="meter__fill" style="width:' + roiFill + '%"></div></div></div>';
    $("ov-stats").innerHTML = [
      { label: "Wagers", icon: "tabler:cash", value: fmt.moneyHTML(w), meta: fmt.int(t.total) + " tickets" },
      { label: "Wins", icon: "tabler:trophy", value: fmt.moneyHTML(p.winTotalAmount), meta: share(p.winTotalAmount) },
      { label: "Bonus", icon: "tabler:gift", value: fmt.moneyHTML(p.totalBonus), meta: share(p.totalBonus) },
      { label: "Settled bets", icon: "tabler:circle-check", value: fmt.moneyHTML(p.betSettledAmount), meta: share(p.betSettledAmount) },
      { label: "Unsettled bets", icon: "tabler:hourglass", value: fmt.moneyHTML(p.betNotSettledAmount), meta: share(p.betNotSettledAmount) },
      // newPlayerDataWarning, said where it applies
      { label: "New players", icon: "tabler:user-plus", value: fmt.int(d.newPlayerCount), meta: "Counts dates + providers only" },
    ].map(statHTML).join("");

    var rows = [{ label: "Resulted", n: t.settled }, { label: "Paid", n: t.approved }, { label: "Pending", n: t.waiting }];
    $("tickets-body").innerHTML = t.total
      ? '<div class="tickets__total"><span class="tickets__total-value">' + fmt.int(t.total) + '</span><span class="t-muted">tickets</span></div><div class="tickets__list">' +
        rows.map(function (r) {
          var pct = (r.n / t.total) * 100;
          return '<div class="tickets__row"><span class="tickets__label">' + r.label + '</span><span class="tickets__count">' + fmt.int(r.n) + "</span>" +
            '<span class="tickets__pct">' + fmt.pct(pct, 1) + '</span><div class="meter" role="meter" aria-label="' + r.label +
            ' share" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct.toFixed(1) + '"><div class="meter__fill" style="width:' + pct + '%"></div></div></div>';
        }).join("") + "</div>"
      : '<div class="panel-empty"><iconify-icon icon="tabler:ticket-off"></iconify-icon><div class="t-subtitle2">No tickets in this range</div>' +
        '<div class="t-body2 t-muted">Widen the dates or clear the filters.</div></div>';

    var c = [
      { label: "Cancelled", n: t.cancelled, amount: p.cancelAmount },
      { label: "Round cancelled", n: t.roundCancelled, amount: p.roundCancelledAmount },
      { label: "Bet failed", n: t.betFailed, amount: p.betFailedAmount },
      { label: "Cancelled by user", n: t.userCancelled, amount: p.userCancelledAmount },
    ];
    $("cancel-body").innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Reason</th>' +
      '<th scope="col" class="is-num">Tickets</th><th scope="col" class="is-num">Amount</th></tr></thead><tbody>' +
      c.map(function (r) {
        return '<tr><td class="is-strong">' + r.label + '</td><td class="is-num">' + fmt.int(r.n) + '</td><td class="is-num">' + fmt.money(r.amount) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function sk(cls, w) {
    return '<span class="skeleton ' + cls + '"' + (w ? ' style="--w:' + w + '"' : "") + "></span>";
  }
  function renderLoading() {
    $("ov-hero").innerHTML = '<div class="stack" style="gap:12px">' + sk("skeleton--text", "30%") + sk("skeleton--value", "80%") + "</div>" + sk("skeleton--text", "100%");
    $("ov-stats").innerHTML = new Array(7).join('<div class="stat" style="gap:10px">' + sk("skeleton--text", "45%") + sk("skeleton--value", "75%") + sk("skeleton--text", "35%") + "</div>");
    $("tickets-body").innerHTML = '<div class="stack" style="gap:20px">' + sk("skeleton--value", "50%") +
      new Array(4).join('<div class="stack" style="gap:8px">' + sk("skeleton--text", "100%") + sk("skeleton--text", "100%") + "</div>") + "</div>";
    $("cancel-body").innerHTML = '<div class="stack" style="gap:18px;padding:12px 24px 24px">' + new Array(5).join(sk("skeleton--text", "100%")) + "</div>";
  }

  /* ---------- Fetch cycle ---------- */
  var mode = "data";
  var timer = 0;
  function changed() {
    var f = read();
    $("f-clear").hidden = isDefault(f);
    $("range-summary").textContent = summaryLine(f);
    $("sum-error").hidden = true;
    $("sum").hidden = false;
    renderLoading();
    clearTimeout(timer);
    if (mode === "loading") return;
    timer = setTimeout(function () {
      if (mode === "error") {
        $("sum-error").hidden = false;
        $("sum").hidden = true;
        return;
      }
      var d = build(f);
      render(mode === "empty" ? zero(d) : d);
    }, 500);
  }
  $("sum-retry").addEventListener("click", function () {
    mode = "data";
    DS.page.state = "data";
    if (DS.devbar) DS.devbar.render();
    changed();
  });

  /* ---------- Prototype states ---------- */
  var states = ["data", "loading", "empty", "error", "filtered"];
  function setState(s) {
    mode = s === "filtered" ? "data" : s;
    if (s === "filtered") {
      providers.set(["101", "103"]);
      $("f-status").value = "settled";
      $("f-start").value = "2026-09-18T00:00";
    }
    changed();
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
