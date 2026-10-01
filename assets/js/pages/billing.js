/* ==========================================================================
   Bill details (Phase 11e). ?id=<bill id>
   Source: views/pages/billings/details/BillingDetailDashboard.tsx
     h4 "Billing Dashboard" + an export icon button; filters: lotto game (Autocomplete, "All games"),
     start date, end date, Apply; full-page Spinner; BetPerformanceBilling ("Amount of revenue from
     the previous billing cycle {amount}" + Profit, Wagers, Cancelled amount, Wins, Bonus, ROI cards +
     Total / Resulted / Cancelled / Rejected tickets); LottoGroupBilling (non-owners: Details / Value
     lines + Total, Total ticket, Total price); dashboard WinLossStatics; PerformanceByBetType;
     RecentBillingBet (ID, Member, Game, Date time, Bet amount, Status)
   Changes: the page says which bill it is (provider, month, share status) and shows the bill's own
   facts on top (from the list row; proposal); filters apply as they change and stay inside the bill's
   month; the dashboard's approved pieces (profit hero, stats, Tickets card, charts with a table view);
   the export icon → a labelled "Export PDF" button; skeletons instead of the spinner.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var bill = M.billing(DS.params.get("id")) || M.billings.filter(function (b) {
    return b.cycle === 1 && b.percentShareStatus === "paid" && !b.isOwner;
  })[0];
  var cur = bill.provider.currency.code;
  var SHARE = { waiting: ["Waiting for review", "warning"], ready: ["Ready to pay", "info"], paid: ["Paid", "success"], cancel: ["Cancelled", ""] };
  var SERIES = [
    { key: "profitAmount", label: "Profit", color: "--viz-1" },
    { key: "winAmount", label: "Win", color: "--viz-2" },
    { key: "lossAmount", label: "Loss", color: "--viz-3" },
  ];
  var month = new Date(bill.reportStartAt).toLocaleString("en-GB", { month: "long", year: "numeric" });
  var iso = function (t) {
    var d = new Date(t);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  /* ---------- Header + the bill's facts ---------- */
  document.title = bill.provider.name + " " + month + " | Admin prototype";
  $("bill-title").textContent = bill.provider.name + ", " + month;
  var s = SHARE[bill.percentShareStatus];
  $("bill-chip").innerHTML = '<span class="chip' + (s[1] ? " chip--" + s[1] : "") + '" style="vertical-align:middle"><span class="chip__dot"></span>' + s[0] + "</span>";
  $("bill-sub").textContent = "Bill " + bill.id + " · " + fmt.dayMonth(bill.reportStartAt) + " – " + fmt.dayMonth(bill.reportEndAt) + " " + new Date(bill.reportEndAt).getFullYear();
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) crumbs.innerHTML = '<span>Admin</span><iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon><span>Billing</span>' +
    '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon><span aria-current="page">' + esc(bill.provider.name) + ", " + month + "</span>";
  var row = function (label, html) {
    return '<div class="kv-row"><dt>' + label + "</dt><dd>" + html + "</dd></div>";
  };
  var none = '<span class="t-faint">–</span>';
  var neg = function (n) {
    return n < 0 ? '<span class="t-error">' + fmt.money(n, cur) + "</span>" : fmt.money(n, cur);
  };
  $("bill-facts").innerHTML =
    row("Provider", '<a href="provider-form.html?id=' + bill.provider.id + '">' + esc(bill.provider.name) + '</a> <span class="code">' + esc(bill.provider.prefixCode) + "</span>") +
    row("Profit", neg(bill.profit) + ' <span class="t-muted">ROI ' + fmt.pct(bill.profitPercent) + "</span>") +
    row("Share", "<strong>" + fmt.money(bill.percentShareAmount, cur) + '</strong> <span class="t-muted">' + bill.percentShare + "% of profit</span>") +
    row("Current profit", neg(bill.currentProfit)) +
    row("Paid", bill.paidAt ? fmt.dateTime(bill.paidAt) : none) +
    row("Report", bill.queue.status === "done" ? "Done" : bill.queue.status === "failed" ? '<span class="t-error">Failed: ' + esc(bill.failedMessage) + "</span>" : "Processing…");

  /* ---------- Filters (inside the bill's month) ---------- */
  var base = M.billingDashboard(bill);
  $("f-game").innerHTML = '<option value="all">All games</option>' + base.betGamePerformance.map(function (g, i) {
    return '<option value="' + i + '">' + esc(g.gameNameEn) + "</option>";
  }).join("");
  var first = iso(bill.reportStartAt);
  var last = iso(bill.reportEndAt);
  ["f-start", "f-end"].forEach(function (id) {
    $(id).min = first;
    $(id).max = last;
  });
  function resetFilters() {
    $("f-game").value = "all";
    $("f-start").value = first;
    $("f-end").value = last;
  }
  resetFilters();

  // Deterministic numbers for the picked game + days
  function build() {
    var g = $("f-game").value;
    var from = new Date($("f-start").value + "T00:00").getTime();
    var to = new Date($("f-end").value + "T23:59").getTime();
    var days = [];
    for (var t = from; t <= to; t += 864e5) days.push(t);
    var all = (bill.reportEndAt - bill.reportStartAt) / 864e5 + 1;
    var part = days.length / all;
    var gameShare = g === "all" ? 1 : [0.28, 0.18, 0.16, 0.12, 0.1, 0.09, 0.07][g];
    var k = part * gameShare;
    var p = base.betPerformance;
    var games = g === "all" ? base.betGamePerformance : [base.betGamePerformance[g]];
    var c = base.betTicketCountOverview;
    return {
      perf: { w: p.betTotalAmount * k, win: p.winTotalAmount * k, bonus: p.totalBonus * k, cancel: p.cancelAmount * k, profit: p.profitTotalAmount * k, roi: p.roi + (g === "all" ? 0 : (g % 3) * 4 - 4) },
      tickets: { total: Math.round(c.total * k), settled: Math.round(c.settled * k), cancelled: Math.round(c.cancelled * k), rejected: Math.round(c.rejected * k) },
      daily: days.map(function (t, i) {
        var w = (p.betTotalAmount * k / days.length) * (0.75 + ((i * 37) % 11) / 20);
        var pr = w * ((p.roi + ((i * 53) % 13) - 6) / 100);
        return { ticketDate: t, lossAmount: w, winAmount: w - pr, profitAmount: pr };
      }),
      games: games.map(function (x) {
        return { gameNameEn: x.gameNameEn, lossAmount: x.lossAmount * part, winAmount: x.winAmount * part, profitAmount: x.profitAmount * part };
      }),
      group: base.lottoGroup,
      recent: base.recent.filter(function (r) {
        return g === "all" || r.game === base.betGamePerformance[g].gameNameEn;
      }),
    };
  }

  /* ---------- Renderers (the dashboard's pieces) ---------- */
  function statHTML(x) {
    return '<div class="stat"><div class="stat__label"><iconify-icon icon="' + x.icon + '"></iconify-icon>' + esc(x.label) +
      '</div><div class="stat__value">' + x.value + "</div>" + (x.meta ? '<div class="stat__meta">' + esc(x.meta) + "</div>" : "") + "</div>";
  }
  function legendHTML(line) {
    return '<div class="legend chart-legend">' + SERIES.map(function (x) {
      return '<span class="legend__item"><span class="legend__swatch' + (line ? " legend__swatch--line" : "") + '" style="--c: var(' + x.color + ')"></span>' + x.label + "</span>";
    }).join("") + "</div>";
  }
  function tableHTML(firstCol, rows, labelOf) {
    return '<div class="table-wrap chart-table"><table class="table table--compact"><thead><tr><th scope="col">' + firstCol + "</th>" +
      SERIES.map(function (x) {
        return '<th scope="col" class="is-num">' + x.label + "</th>";
      }).join("") + "</tr></thead><tbody>" + rows.map(function (r) {
        return '<tr><td class="is-strong">' + esc(labelOf(r)) + "</td>" + SERIES.map(function (x) {
          return '<td class="is-num' + (r[x.key] < 0 ? " is-negative" : "") + '">' + fmt.money(r[x.key], cur) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function series(rows) {
    return SERIES.map(function (x, i) {
      return { key: x.key, label: x.label, color: x.color, area: i === 0, values: rows.map(function (r) {
        return r[x.key];
      }) };
    });
  }
  function resetToggle(id) {
    $(id).querySelectorAll("[data-view-toggle] .segmented__btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === "chart"));
    });
  }
  var compact = function (n) {
    return fmt.moneyCompact(n, cur);
  };
  var money = function (n) {
    return fmt.money(n, cur);
  };

  function render(d) {
    var p = d.perf;
    var share = function (n) {
      return p.w ? fmt.pct((n / p.w) * 100, 1) + " of wagers" : "";
    };
    var roiFill = Math.max(0, Math.min(100, p.roi));
    $("ov-hero").innerHTML =
      '<div><div class="hero__label"><iconify-icon icon="tabler:coins"></iconify-icon>Profit</div>' +
      '<div class="hero__value">' + fmt.moneyHTML(p.profit, cur) + "</div>" +
      // "Amount of revenue from the previous billing cycle {amount}"
      '<div class="hero__note">Last bill: ' + fmt.money(bill.profit * 0.87, cur) + "</div></div>" +
      '<div class="hero__roi"><span class="hero__roi-label">ROI</span><span class="hero__roi-value">' + fmt.pct(p.roi) + "</span>" +
      '<div class="meter" role="meter" aria-label="ROI" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + roiFill.toFixed(1) +
      '"><div class="meter__fill" style="width:' + roiFill + '%"></div></div></div>';
    var stats = [
      { label: "Wagers", icon: "tabler:cash", value: fmt.moneyHTML(p.w, cur), meta: fmt.int(d.tickets.total) + " tickets" },
      { label: "Wins", icon: "tabler:trophy", value: fmt.moneyHTML(p.win, cur), meta: share(p.win) },
      { label: "Bonus", icon: "tabler:gift", value: fmt.moneyHTML(p.bonus, cur), meta: share(p.bonus) },
      { label: "Cancelled", icon: "tabler:ban", value: fmt.moneyHTML(p.cancel, cur), meta: share(p.cancel) },
    ];
    var groupTotal = d.group.reduce(function (a, x) {
      return a + x.value;
    }, 0);
    if (d.group.length) stats.push({ label: "Set lottery", icon: "tabler:stack-2", value: fmt.moneyHTML(groupTotal, cur), meta: "Billed on top" });
    $("ov-stats").innerHTML = stats.map(statHTML).join("");
    $("ov-stats").setAttribute("data-count", stats.length);

    var t = d.tickets;
    var rows = [{ label: "Resulted", n: t.settled }, { label: "Cancelled", n: t.cancelled }, { label: "Rejected", n: t.rejected }];
    $("tickets-body").innerHTML = t.total
      ? '<div class="tickets__total"><span class="tickets__total-value">' + fmt.int(t.total) + '</span><span class="t-muted">tickets</span></div><div class="tickets__list">' +
        rows.map(function (r) {
          var pct = (r.n / t.total) * 100;
          return '<div class="tickets__row"><span class="tickets__label">' + r.label + '</span><span class="tickets__count">' + fmt.int(r.n) + "</span>" +
            '<span class="tickets__pct">' + fmt.pct(pct, 1) + '</span><div class="meter" role="meter" aria-label="' + r.label +
            ' share" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct.toFixed(1) + '"><div class="meter__fill" style="width:' + pct + '%"></div></div></div>';
        }).join("") + "</div>"
      : '<div class="panel-empty"><iconify-icon icon="tabler:ticket-off"></iconify-icon><div class="t-subtitle2">No tickets</div><div class="t-body2 t-muted">Pick other days or all games.</div></div>';

    resetToggle("card-winloss");
    $("winloss-sub").textContent = "Daily totals, " + fmt.dayMonth(d.daily[0].ticketDate) + " to " + fmt.dayMonth(d.daily[d.daily.length - 1].ticketDate);
    $("winloss-body").innerHTML = '<div data-view-panel="chart">' + legendHTML(true) + '<div class="chart" id="winloss-chart"></div></div>' +
      '<div data-view-panel="table" hidden>' + tableHTML("Date", d.daily, function (r) {
        return fmt.dayMonth(r.ticketDate);
      }) + "</div>";
    DS.charts.line($("winloss-chart"), {
      labels: d.daily.map(function (r) {
        return r.ticketDate;
      }),
      series: series(d.daily), xFormat: fmt.dayMonth, yFormat: compact, valueFormat: money,
      label: "Line chart of daily profit, win and loss. Use the table view for exact values.",
    });

    resetToggle("card-games");
    $("games-body").innerHTML = '<div data-view-panel="chart">' + legendHTML(false) + '<div class="chart" id="games-chart"></div></div>' +
      '<div data-view-panel="table" hidden>' + tableHTML("Game", d.games, function (r) {
        return r.gameNameEn;
      }) + "</div>";
    DS.charts.columns($("games-chart"), {
      labels: d.games.map(function (r) {
        return r.gameNameEn;
      }),
      series: series(d.games), yFormat: compact, valueFormat: money,
      label: "Column chart of profit, win and loss per game. Use the table view for exact values.",
    });

    // LottoGroupBilling: non-owners only
    $("card-group").hidden = !d.group.length;
    $("card-games").className = "card " + (d.group.length ? "col-lg-8" : "col-12");
    if (d.group.length) {
      $("group-body").innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Details</th><th scope="col" class="is-num">Value</th></tr></thead><tbody>' +
        d.group.map(function (x) {
          return "<tr><td>" + esc(x.text) + '</td><td class="is-num">' + money(x.value) + "</td></tr>";
        }).join("") + '<tr><td class="is-strong">Total</td><td class="is-num is-strong">' + money(groupTotal) + "</td></tr></tbody></table></div>";
    }

    $("recent-body").innerHTML = d.recent.length
      ? '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Ticket</th><th scope="col">Member</th><th scope="col">Game</th>' +
        '<th scope="col">When</th><th scope="col" class="is-num">Bet</th><th scope="col">Status</th></tr></thead><tbody>' +
        d.recent.map(function (r) {
          return '<tr><td><a href="ticket-detail.html?id=' + r.id + '" class="t-num">' + r.id + "</a></td><td>" + esc(r.member) + "</td><td>" + esc(r.game) + "</td><td>" +
            fmt.dateTime(r.at) + '</td><td class="is-num">' + money(r.amount) + "</td><td>" + DS.tickets.statusChip(r.status === "won" ? "win" : r.status === "lost" ? "lose" : "settled") + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : '<div class="panel-empty"><iconify-icon icon="tabler:ticket-off"></iconify-icon><div class="t-subtitle2">No bets for this game</div></div>';
  }

  function sk(cls, w) {
    return '<span class="skeleton ' + cls + '"' + (w ? ' style="--w:' + w + '"' : "") + "></span>";
  }
  function renderLoading() {
    $("ov-hero").innerHTML = '<div class="stack" style="gap:12px">' + sk("skeleton--text", "30%") + sk("skeleton--value", "80%") + "</div>" + sk("skeleton--text", "100%");
    $("ov-stats").innerHTML = new Array(5).join('<div class="stat" style="gap:10px">' + sk("skeleton--text", "45%") + sk("skeleton--value", "75%") + sk("skeleton--text", "35%") + "</div>");
    ["winloss-body", "games-body"].forEach(function (id) {
      $(id).innerHTML = '<span class="skeleton" style="display:block;height:260px"></span>';
    });
    $("tickets-body").innerHTML = '<div class="stack" style="gap:20px">' + sk("skeleton--value", "50%") +
      new Array(4).join('<div class="stack" style="gap:8px">' + sk("skeleton--text", "100%") + sk("skeleton--text", "100%") + "</div>") + "</div>";
    $("recent-body").innerHTML = '<div class="stack" style="gap:18px;padding:12px 24px 24px">' + new Array(6).join(sk("skeleton--text", "100%")) + "</div>";
    $("group-body").innerHTML = $("recent-body").innerHTML;
  }

  /* ---------- Fetch cycle ---------- */
  var mode = "data";
  var timer = 0;
  function changed() {
    if ($("f-start").value > $("f-end").value) $("f-end").value = $("f-start").value;
    $("f-clear").hidden = $("f-game").value === "all" && $("f-start").value === first && $("f-end").value === last;
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
      render(build());
    }, 500);
  }
  ["f-game", "f-start", "f-end"].forEach(function (id) {
    $(id).addEventListener("change", changed);
  });
  $("f-clear").addEventListener("click", function () {
    resetFilters();
    changed();
  });
  $("sum-retry").addEventListener("click", function () {
    mode = "data";
    DS.page.state = "data";
    if (DS.devbar) DS.devbar.render();
    changed();
  });
  $("export").addEventListener("click", function () {
    var b = this;
    DS.ui.busy(b, true, "Exporting…");
    setTimeout(function () {
      DS.ui.busy(b, false);
      DS.ui.toast("Bill PDF downloaded", "tabler:file-download");
    }, 900);
  });

  /* ---------- Prototype states ---------- */
  var states = ["data", "loading", "error", "one-game", "owner"];
  function setState(s) {
    mode = s === "loading" || s === "error" ? s : "data";
    resetFilters();
    if (s === "one-game") {
      $("f-game").value = "2";
      $("f-start").value = iso(bill.reportStartAt + 9 * 864e5);
      $("f-end").value = iso(bill.reportStartAt + 15 * 864e5);
    }
    base.lottoGroup = s === "owner" ? [] : M.billingDashboard(bill).lottoGroup;
    changed();
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
