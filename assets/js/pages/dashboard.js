/* ==========================================================================
   Dashboard page: mock data + rendering for every state.
   Data shape mirrors src/types/dashboardTypes (useGetDashboard response):
     betPerformance, betTicketCountOverview, newPlayerCount,
     winLossStatics[{ ticketDate, profitAmount, winAmount, lossAmount }],
     betTypesPerformance[{ gameType, profitAmount, winAmount, lossAmount }]
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  /* ---------- Reference data for the filters ---------- */
  var PROVIDERS = [
    { value: "11", label: "Golden Dragon (GD01)" },
    { value: "12", label: "Siam 88 (S88)" },
    { value: "13", label: "Lucky Star (LS07)" },
    { value: "14", label: "Mekong Play (MKP)" },
    { value: "15", label: "Chao Phraya Bet (CPB)" },
    { value: "16", label: "North Star (NS02)" },
  ];
  var GAMES = [
    "All games",
    "Thai Government Lottery",
    "Lao Development",
    "Hanoi Regular",
    "Hanoi VIP",
    "Yeekee 5 minutes",
    "Nikkei Morning",
    "Dow Jones",
  ];
  var BET_TYPES = [
    { gameType: "3 Top", share: 0.24, payout: 0.74 },
    { gameType: "3 Tote", share: 0.1, payout: 0.66 },
    { gameType: "3 Bottom", share: 0.07, payout: 0.7 },
    { gameType: "2 Top", share: 0.22, payout: 0.71 },
    { gameType: "2 Bottom", share: 0.27, payout: 0.69 },
    { gameType: "Run Top", share: 0.06, payout: 1.08 },
    { gameType: "Run Bottom", share: 0.04, payout: 0.82 },
  ];
  var SERIES = [
    { key: "profitAmount", label: "Profit", color: "--viz-1" },
    { key: "winAmount", label: "Win", color: "--viz-2" },
    { key: "lossAmount", label: "Loss", color: "--viz-3" },
  ];

  /* ---------- Mock generator (deterministic per filter set) ---------- */
  function seeded(seed) {
    seed = seed % 2147483647 || 1;
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }
  var r2 = function (n) {
    return Math.round(n * 100) / 100;
  };

  function buildData(f) {
    var rnd = seeded(20260924 + f.providers.length * 7919 + f.gameIndex * 104729);
    var scale = (f.providers.length ? f.providers.length / PROVIDERS.length : 1) * (f.gameIndex ? 0.22 : 1);
    var day = new Date(f.start);
    day.setHours(0, 0, 0, 0);
    var last = new Date(f.end);
    var winLoss = [];
    var tot = { wagers: 0, win: 0, bonus: 0, profit: 0 };

    for (var i = 0; day <= last && i < 92; i++) {
      var wagers = (780000 + rnd() * 260000) * scale;
      var winRatio = i === 5 ? 1.03 : 0.64 + rnd() * 0.12; // one heavy-payout day
      var win = wagers * winRatio;
      var bonus = wagers * (0.014 + rnd() * 0.008);
      var profit = wagers - win - bonus;
      winLoss.push({
        ticketDate: day.toISOString(),
        profitAmount: r2(profit),
        winAmount: r2(win),
        lossAmount: r2(wagers * (0.52 + rnd() * 0.1)),
      });
      tot.wagers += wagers;
      tot.win += win;
      tot.bonus += bonus;
      tot.profit += profit;
      day = new Date(day.getTime() + 864e5);
    }

    var total = Math.round(tot.wagers / 259);
    var t = {
      total: total,
      settled: Math.round(total * 0.94),
      approved: Math.round(total * 0.164),
      waiting: Math.round(total * 0.0346),
      cancelled: Math.round(total * 0.0127),
      roundCancelled: Math.round(total * 0.003),
      betFailed: Math.round(total * 0.00077),
      userCancelled: Math.round(total * 0.0089),
    };

    return {
      betPerformance: {
        betTotalAmount: r2(tot.wagers),
        betSettledAmount: r2(tot.wagers * 0.953),
        betNotSettledAmount: r2(tot.wagers * 0.047),
        winTotalAmount: r2(tot.win),
        profitTotalAmount: r2(tot.profit),
        totalBonus: r2(tot.bonus),
        roi: tot.wagers ? (tot.profit / tot.wagers) * 100 : 0,
        cancelAmount: r2(t.cancelled * 157.2),
        roundCancelledAmount: r2(t.roundCancelled * 429.6),
        betFailedAmount: r2(t.betFailed * 241.6),
        userCancelledAmount: r2(t.userCancelled * 263.45),
      },
      betTicketCountOverview: t,
      newPlayerCount: Math.round(24.4 * winLoss.length * scale),
      winLossStatics: winLoss,
      betTypesPerformance: BET_TYPES.map(function (bt) {
        var w = tot.wagers * bt.share;
        var win = w * bt.payout * (0.96 + rnd() * 0.08);
        return {
          gameType: bt.gameType,
          profitAmount: r2(w - win - tot.bonus * bt.share),
          winAmount: r2(win),
          lossAmount: r2(w * 0.58),
        };
      }),
    };
  }

  function emptyData() {
    var zero = buildData(readFilters());
    Object.keys(zero.betPerformance).forEach(function (k) {
      zero.betPerformance[k] = 0;
    });
    Object.keys(zero.betTicketCountOverview).forEach(function (k) {
      zero.betTicketCountOverview[k] = 0;
    });
    zero.newPlayerCount = 0;
    zero.winLossStatics = [];
    zero.betTypesPerformance = [];
    return zero;
  }

  /* ---------- Filters ---------- */
  $("f-game").innerHTML = GAMES.map(function (g, i) {
    return '<option value="' + i + '">' + esc(g) + "</option>";
  }).join("");

  var providerSelect = DS.ui.multiselect($("f-providers"), {
    options: PROVIDERS,
    selected: [],
    placeholder: "All providers",
    emptyText: "No providers match",
  });

  function readFilters() {
    return {
      currency: $("f-currency").value,
      providers: providerSelect.get(),
      gameIndex: Number($("f-game").value),
      game: GAMES[Number($("f-game").value)],
      start: $("f-start").value,
      end: $("f-end").value,
    };
  }

  var setFieldError = DS.ui.fieldError;

  function validate(f) {
    var ok = true;
    var threeMonthsAgo = new Date(2026, 5, 24); // "today" in the prototype is 24 Sep 2026
    setFieldError($("f-start"), "");
    setFieldError($("f-end"), "");
    if (new Date(f.start) < threeMonthsAgo) {
      setFieldError($("f-start"), "Pick a date within the last 3 months.");
      ok = false;
    }
    if (new Date(f.end) <= new Date(f.start)) {
      setFieldError($("f-end"), "End must be after start.");
      ok = false;
    }
    return ok;
  }

  function summary(f) {
    var who = f.providers.length
      ? f.providers.length + (f.providers.length === 1 ? " provider" : " providers")
      : "all providers";
    return (
      fmt.dateTime(f.start) + " to " + fmt.dateTime(f.end) + ", in " + f.currency + ", for " + who +
      " and " + (f.gameIndex ? f.game : "all games")
    );
  }

  /* ---------- Renderers ---------- */
  function statHTML(s) {
    return (
      '<div class="stat"><div class="stat__label"><iconify-icon icon="' + s.icon + '"></iconify-icon>' + esc(s.label) +
      '</div><div class="stat__value">' + s.value + "</div>" +
      (s.meta ? '<div class="stat__meta">' + esc(s.meta) + "</div>" : "") +
      "</div>"
    );
  }

  function daysInRange() {
    var f = readFilters();
    var a = new Date(f.start);
    var b = new Date(f.end);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((b - a) / 864e5) + 1);
  }

  /* Daily profit as a tiny area + line (decorative, aria-hidden). Port: Recharts <AreaChart> with no axes. */
  function sparkHTML(values) {
    if (values.length < 2) return "";
    var W = 300;
    var H = 56;
    var min = Math.min.apply(null, values.concat(0));
    var max = Math.max.apply(null, values);
    var span = max - min || 1;
    var pts = values.map(function (v, i) {
      return [(i / (values.length - 1)) * W, H - 3 - ((v - min) / span) * (H - 6)];
    });
    var line = pts.map(function (p, i) {
      return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
    }).join("");
    return (
      '<svg class="hero__spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<path d="' + line + "L" + W + " " + H + "L0 " + H + 'Z"></path><path d="' + line + '"></path></svg>'
    );
  }

  function renderOverview(d) {
    var p = d.betPerformance;
    var days = daysInRange();
    var w = p.betTotalAmount;
    var share = function (n) {
      return w ? fmt.pct((n / w) * 100, 1) + " of wagers" : "";
    };
    var roiFill = Math.max(0, Math.min(100, p.roi));

    $("ov-hero").innerHTML =
      "<div>" +
      '<div class="hero__label"><iconify-icon icon="tabler:coins"></iconify-icon>Profit</div>' +
      '<div class="hero__value' + (p.profitTotalAmount < 0 ? " is-negative" : "") + '">' + fmt.moneyHTML(p.profitTotalAmount) + "</div>" +
      '<div class="hero__note">' +
      (p.profitTotalAmount < 0 ? "Net loss across " : "Across ") + days +
      (days === 1 ? " day" : " days") + "</div>" +
      "</div>" +
      sparkHTML(d.winLossStatics.map(function (r) {
        return r.profitAmount;
      })) +
      '<div class="hero__roi"><span class="hero__roi-label">ROI</span>' +
      '<span class="hero__roi-value">' + fmt.pct(p.roi) + "</span>" +
      '<div class="meter" role="meter" aria-label="ROI" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      roiFill.toFixed(1) + '"><div class="meter__fill" style="width:' + roiFill + '%"></div></div></div>';

    $("ov-stats").innerHTML = [
      { label: "Wagers", icon: "tabler:cash", value: fmt.moneyHTML(w), meta: fmt.int(d.betTicketCountOverview.total) + " tickets" },
      { label: "Wins", icon: "tabler:trophy", value: fmt.moneyHTML(p.winTotalAmount), meta: share(p.winTotalAmount) },
      { label: "Bonus", icon: "tabler:gift", value: fmt.moneyHTML(p.totalBonus), meta: share(p.totalBonus) },
      { label: "Settled bets", icon: "tabler:circle-check", value: fmt.moneyHTML(p.betSettledAmount), meta: share(p.betSettledAmount) },
      { label: "Unsettled bets", icon: "tabler:hourglass", value: fmt.moneyHTML(p.betNotSettledAmount), meta: share(p.betNotSettledAmount) },
      { label: "New players", icon: "tabler:user-plus", value: fmt.int(d.newPlayerCount) },
    ]
      .map(statHTML)
      .join("");
  }

  function legendHTML(line) {
    return (
      '<div class="legend chart-legend">' +
      SERIES.map(function (s) {
        return (
          '<span class="legend__item"><span class="legend__swatch' + (line ? " legend__swatch--line" : "") +
          '" style="--c: var(' + s.color + ')"></span>' + s.label + "</span>"
        );
      }).join("") +
      "</div>"
    );
  }

  function tableHTML(firstCol, rows, labelOf) {
    return (
      '<div class="table-wrap chart-table"><table class="table table--compact"><thead><tr><th scope="col">' + firstCol + "</th>" +
      SERIES.map(function (s) {
        return '<th scope="col" class="is-num">' + s.label + "</th>";
      }).join("") +
      "</tr></thead><tbody>" +
      rows
        .map(function (r) {
          return (
            '<tr><td class="is-strong">' + esc(labelOf(r)) + "</td>" +
            SERIES.map(function (s) {
              return '<td class="is-num' + (r[s.key] < 0 ? " is-negative" : "") + '">' + fmt.money(r[s.key]) + "</td>";
            }).join("") +
            "</tr>"
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  function emptyHTML(icon, title, text) {
    return (
      '<div class="empty panel-empty"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="' + icon +
      '"></iconify-icon></span><div class="empty__title">' + esc(title) + '</div><div class="empty__text">' + esc(text) +
      "</div></div>"
    );
  }

  var observers = [];
  function chartSeries(rows) {
    return SERIES.map(function (s, i) {
      return {
        key: s.key,
        label: s.label,
        color: s.color,
        area: i === 0,
        values: rows.map(function (r) {
          return r[s.key];
        }),
      };
    });
  }

  function resetToggle(cardId) {
    var card = $(cardId);
    card.querySelectorAll("[data-view-toggle] .segmented__btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === "chart"));
    });
    card.querySelector("[data-view-toggle]").hidden = false;
  }

  function renderWinLoss(d) {
    var rows = d.winLossStatics;
    var body = $("winloss-body");
    resetToggle("card-winloss");
    if (!rows.length) {
      $("card-winloss").querySelector("[data-view-toggle]").hidden = true;
      body.innerHTML = emptyHTML("tabler:chart-line", "No bets in this range", "Try a wider date range, or pick other providers or games.");
      return;
    }
    $("winloss-sub").textContent =
      "Daily totals, " + fmt.dayMonth(rows[0].ticketDate) + " to " + fmt.dayMonth(rows[rows.length - 1].ticketDate);
    body.innerHTML =
      '<div data-view-panel="chart">' + legendHTML(true) + '<div class="chart" id="winloss-chart"></div></div>' +
      '<div data-view-panel="table" hidden>' +
      tableHTML("Date", rows, function (r) {
        return fmt.dayMonth(r.ticketDate);
      }) +
      "</div>";
    observers.push(
      DS.charts.line($("winloss-chart"), {
        labels: rows.map(function (r) {
          return r.ticketDate;
        }),
        series: chartSeries(rows),
        xFormat: fmt.dayMonth,
        yFormat: fmt.moneyCompact,
        valueFormat: fmt.money,
        label: "Line chart of daily profit, win and loss. Use the table view for exact values.",
      })
    );
  }

  function renderBetType(d) {
    var rows = d.betTypesPerformance;
    var body = $("bettype-body");
    resetToggle("card-bettype");
    if (!rows.length) {
      $("card-bettype").querySelector("[data-view-toggle]").hidden = true;
      body.innerHTML = emptyHTML("tabler:chart-bar", "No bets in this range", "Bet types show up here once tickets are placed.");
      return;
    }
    body.innerHTML =
      '<div data-view-panel="chart">' + legendHTML(false) + '<div class="chart" id="bettype-chart"></div></div>' +
      '<div data-view-panel="table" hidden>' +
      tableHTML("Bet type", rows, function (r) {
        return r.gameType;
      }) +
      "</div>";
    observers.push(
      DS.charts.columns($("bettype-chart"), {
        labels: rows.map(function (r) {
          return r.gameType;
        }),
        series: chartSeries(rows),
        yFormat: fmt.moneyCompact,
        valueFormat: fmt.money,
        label: "Column chart of profit, win and loss per bet type. Use the table view for exact values.",
      })
    );
  }

  function renderTickets(d) {
    var t = d.betTicketCountOverview;
    var rows = [
      { label: "Resulted", n: t.settled },
      { label: "Paid", n: t.approved },
      { label: "Pending", n: t.waiting },
    ];
    $("tickets-body").innerHTML =
      '<div class="tickets__total"><span class="tickets__total-value">' + fmt.int(t.total) +
      '</span><span class="t-muted">tickets</span></div><div class="tickets__list">' +
      rows
        .map(function (r) {
          var pct = t.total ? (r.n / t.total) * 100 : 0;
          return (
            '<div class="tickets__row"><span class="tickets__label">' + r.label + "</span>" +
            '<span class="tickets__count">' + fmt.int(r.n) + "</span>" +
            '<span class="tickets__pct">' + fmt.pct(pct, 1) + "</span>" +
            '<div class="meter" role="meter" aria-label="' + r.label + ' share" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
            pct.toFixed(1) + '"><div class="meter__fill" style="width:' + pct + '%"></div></div></div>'
          );
        })
        .join("") +
      "</div>";
  }

  function renderCancellations(d) {
    var p = d.betPerformance;
    var t = d.betTicketCountOverview;
    var rows = [
      { label: "Cancelled", n: t.cancelled, amount: p.cancelAmount },
      { label: "Round cancelled", n: t.roundCancelled, amount: p.roundCancelledAmount },
      { label: "Bet failed", n: t.betFailed, amount: p.betFailedAmount },
      { label: "Cancelled by user", n: t.userCancelled, amount: p.userCancelledAmount },
    ];
    $("cancel-body").innerHTML =
      '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Reason</th>' +
      '<th scope="col" class="is-num">Tickets</th><th scope="col" class="is-num">Amount</th></tr></thead><tbody>' +
      rows
        .map(function (r) {
          return (
            '<tr><td class="is-strong">' + r.label + '</td><td class="is-num">' + fmt.int(r.n) +
            '</td><td class="is-num">' + fmt.money(r.amount) + "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>";
  }

  /* ---------- Skeletons ---------- */
  function sk(cls, w) {
    return '<span class="skeleton ' + cls + '"' + (w ? ' style="--w:' + w + '"' : "") + "></span>";
  }
  function renderLoading() {
    $("ov-hero").innerHTML =
      '<div class="stack" style="gap:12px">' + sk("skeleton--text", "30%") + sk("skeleton--value", "80%") + "</div>" +
      sk("skeleton--text", "100%");
    var cell = '<div class="stat" style="gap:10px">' + sk("skeleton--text", "45%") + sk("skeleton--value", "75%") + sk("skeleton--text", "35%") + "</div>";
    $("ov-stats").innerHTML = new Array(7).join(cell);
    var chart = '<div style="display:flex;gap:16px;margin-bottom:16px">' + sk("skeleton--text", "56px") + sk("skeleton--text", "56px") + sk("skeleton--text", "56px") + "</div>";
    $("winloss-body").innerHTML = chart + '<span class="skeleton skeleton--block" style="--h:300px"></span>';
    $("bettype-body").innerHTML = chart + '<span class="skeleton skeleton--block" style="--h:280px"></span>';
    $("tickets-body").innerHTML =
      '<div class="stack" style="gap:20px">' + sk("skeleton--value", "50%") +
      new Array(4).join('<div class="stack" style="gap:8px">' + sk("skeleton--text", "100%") + sk("skeleton--text", "100%") + "</div>") +
      "</div>";
    $("cancel-body").innerHTML =
      '<div class="stack" style="gap:18px;padding:12px 24px 24px">' + new Array(5).join(sk("skeleton--text", "100%")) + "</div>";
    ["card-winloss", "card-bettype"].forEach(function (id) {
      $(id).querySelector("[data-view-toggle]").hidden = true;
    });
  }

  /* ---------- State machine ---------- */
  var current = null;
  function clearCharts() {
    observers.forEach(function (o) {
      if (o) o.disconnect();
    });
    observers = [];
  }

  function setState(state) {
    clearCharts();
    $("dash-error").hidden = state !== "error";
    $("dash").hidden = state === "error";
    $("dash").setAttribute("aria-busy", String(state === "loading"));
    var btn = $("f-apply");
    btn.disabled = state === "loading";
    var f = readFilters();
    $("range-summary").textContent = summary(f);
    if (state === "loading") return renderLoading();
    if (state === "error") return;

    DS.fmt.currency = f.currency;
    current = state === "empty" ? emptyData() : buildData(f);
    renderOverview(current);
    renderWinLoss(current);
    renderTickets(current);
    renderBetType(current);
    renderCancellations(current);
  }

  function load(then) {
    setState("loading");
    DS.page.state = "loading";
    DS.devbar && DS.devbar.render();
    setTimeout(function () {
      DS.page.state = then || "data";
      setState(DS.page.state);
      DS.devbar && DS.devbar.render();
    }, 700);
  }

  $("filters").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate(readFilters())) return;
    load("data");
  });
  $("dash-retry").addEventListener("click", function () {
    load("data");
  });

  // Redraw a chart when it comes back from the table view (its width may have changed)
  var chartCards = { "card-winloss": renderWinLoss, "card-bettype": renderBetType };
  Object.keys(chartCards).forEach(function (id) {
    $(id).addEventListener("viewchange", function (e) {
      if (e.detail === "chart" && current) chartCards[id](current);
    });
  });

  var states = ["data", "loading", "empty", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
