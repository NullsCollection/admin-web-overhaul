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
        wagerAmount: r2(wagers), // new: daily wagers (busiest days, KPI mini bars)
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
      // New API field: the same figures for the period of equal length just before (for the deltas)
      previous: {
        profitTotalAmount: r2(tot.profit * (0.84 + rnd() * 0.12)),
        betTotalAmount: r2(tot.wagers * (0.9 + rnd() * 0.08)),
        winTotalAmount: r2(tot.win * (0.95 + rnd() * 0.1)),
        newPlayerCount: Math.round(24.4 * winLoss.length * scale * (1.02 + rnd() * 0.1)),
      },
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
    zero.previous = { profitTotalAmount: 0, betTotalAmount: 0, winTotalAmount: 0, newPlayerCount: 0 };
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
  function daysInRange() {
    var f = readFilters();
    var a = new Date(f.start);
    var b = new Date(f.end);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((b - a) / 864e5) + 1);
  }

  // Change vs. the previous period. invert: a rise is bad news (more paid out in wins)
  function deltaHTML(cur, prev, invert) {
    if (!prev) return "";
    var pct = ((cur - prev) / Math.abs(prev)) * 100;
    var up = pct >= 0;
    var good = invert ? !up : up;
    return (
      '<span class="delta delta--' + (good ? "up" : "down") + '" title="vs. the previous ' + daysInRange() + ' days">' +
      '<iconify-icon icon="tabler:' + (up ? "arrow-up-right" : "arrow-down-right") + '" aria-hidden="true"></iconify-icon>' +
      '<span class="sr-only">' + (up ? "Up " : "Down ") + "</span>" + fmt.pct(Math.abs(pct), 1) + "</span>"
    );
  }

  function minibarsHTML(values) {
    if (values.length < 2) return "";
    var tail = values.slice(-14);
    var max = Math.max.apply(null, tail.map(Math.abs).concat(1));
    return (
      '<div class="kpi__spark" aria-hidden="true"><div class="minibars">' +
      tail.map(function (v, i) {
        var cls = v < 0 ? "is-neg" : i === tail.length - 1 ? "is-on" : "";
        return '<i class="' + cls + '" style="height:' + Math.max(8, (Math.abs(v) / max) * 100).toFixed(0) + '%"></i>';
      }).join("") +
      "</div></div>"
    );
  }

  function kpiHTML(k) {
    return (
      '<article class="kpi"><div class="kpi__head"><span class="kpi__label">' + esc(k.label) + "</span>" +
      '<span class="kpi__icon kpi__icon--' + k.tone + '"><iconify-icon icon="' + k.icon + '"></iconify-icon></span></div>' +
      '<div class="kpi__figure"><span class="kpi__value' + (k.negative ? " is-negative" : "") + '">' + k.value + "</span></div>" +
      '<div class="kpi__meta">' + (k.delta || "") + "<span>" + k.meta + "</span></div>" + (k.spark || "") + "</article>"
    );
  }

  function renderOverview(d) {
    var p = d.betPerformance;
    var prev = d.previous;
    var w = p.betTotalAmount;
    var rows = d.winLossStatics;
    var col = function (key) {
      return rows.map(function (r) {
        return r[key];
      });
    };
    $("kpis").innerHTML = [
      {
        label: "Profit", icon: "tabler:coins", tone: "solid", value: fmt.moneyHTML(p.profitTotalAmount), negative: p.profitTotalAmount < 0,
        delta: deltaHTML(p.profitTotalAmount, prev.profitTotalAmount),
        meta: "vs. <strong>" + fmt.money(prev.profitTotalAmount) + "</strong> last period", spark: minibarsHTML(col("profitAmount")),
      },
      {
        label: "Wagers", icon: "tabler:cash", tone: "info", value: fmt.moneyHTML(w), delta: deltaHTML(w, prev.betTotalAmount),
        meta: "<strong>" + fmt.int(d.betTicketCountOverview.total) + "</strong> tickets", spark: minibarsHTML(col("wagerAmount")),
      },
      {
        label: "Wins paid", icon: "tabler:trophy", tone: "warning", value: fmt.moneyHTML(p.winTotalAmount),
        delta: deltaHTML(p.winTotalAmount, prev.winTotalAmount, true),
        meta: w ? "<strong>" + fmt.pct((p.winTotalAmount / w) * 100, 1) + "</strong> of wagers" : "No wagers", spark: minibarsHTML(col("winAmount")),
      },
      {
        label: "New players", icon: "tabler:user-plus", tone: "success", value: fmt.int(d.newPlayerCount),
        delta: deltaHTML(d.newPlayerCount, prev.newPlayerCount),
        meta: "vs. <strong>" + fmt.int(prev.newPlayerCount) + "</strong> last period", spark: minibarsHTML(col("wagerAmount").map(function (v, i) {
          return v * (0.6 + ((i * 37) % 10) / 20); // mock daily sign-ups shape
        })),
      },
    ].map(kpiHTML).join("");

    // Return on wagers: gauge + the bet amounts that used to be separate stat tiles
    var share = function (n) {
      return w ? fmt.pct((n / w) * 100, 1) : "–";
    };
    $("roi-body").innerHTML =
      DS.charts.gauge({ value: Math.max(0, p.roi), max: 40, display: fmt.pct(p.roi), caption: "ROI · scale to 40%", label: "Return on wagers" }) +
      '<dl class="facts dash-facts">' +
      [
        ["tabler:circle-check", "Settled bets", p.betSettledAmount],
        ["tabler:hourglass", "Unsettled bets", p.betNotSettledAmount],
        ["tabler:gift", "Bonus paid", p.totalBonus],
      ].map(function (r) {
        return (
          '<div><dt><iconify-icon icon="' + r[0] + '" aria-hidden="true"></iconify-icon>' + r[1] + "</dt><dd>" + fmt.money(r[2]) +
          '<span class="dash-facts__share">' + share(r[2]) + "</span></dd></div>"
        );
      }).join("") +
      "</dl>";
  }

  function legendStatsHTML(rows) {
    return (
      '<div class="legend-stats">' +
      SERIES.map(function (s) {
        var sum = rows.reduce(function (t, r) {
          return t + r[s.key];
        }, 0);
        return (
          '<div class="legend-stats__item"><span class="legend__item"><span class="legend__swatch legend__swatch--line" style="--c: var(' +
          s.color + ')"></span>' + s.label + '</span><span class="legend-stats__value' + (sum < 0 ? " t-error" : "") + '">' +
          fmt.moneyHTML(sum) + "</span></div>"
        );
      }).join("") +
      "</div>"
    );
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
      '<div data-view-panel="chart">' + legendStatsHTML(rows) + '<div class="chart" id="winloss-chart"></div></div>' +
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

  var WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  function renderDays(d) {
    var rows = d.winLossStatics;
    if (!rows.length) {
      $("days-body").innerHTML = emptyHTML("tabler:calendar-stats", "No bets yet", "Days fill in as tickets are placed.");
      return;
    }
    var sums = [0, 0, 0, 0, 0, 0, 0];
    rows.forEach(function (r) {
      sums[(new Date(r.ticketDate).getDay() + 6) % 7] += r.wagerAmount;
    });
    var top = sums.indexOf(Math.max.apply(null, sums));
    $("days-body").innerHTML =
      DS.charts.bars({
        labels: WEEKDAYS, values: sums, format: fmt.money, short: fmt.moneyCompact,
        label: "Wagers by weekday. Busiest: " + WEEKDAYS[top] + ", " + fmt.money(sums[top]),
      }) +
      '<p class="dash-note"><iconify-icon icon="tabler:bulb" aria-hidden="true"></iconify-icon>' + WEEKDAYS[top] +
      " takes the most bets. Plan result checks and limits around it.</p>";
  }

  function renderTickets(d) {
    var t = d.betTicketCountOverview;
    var rows = [
      { label: "Resulted", hint: "Have a result", n: t.settled, icon: "tabler:circle-check", tone: "primary" },
      { label: "Paid", hint: "Winnings paid out", n: t.approved, icon: "tabler:cash", tone: "info" },
      { label: "Pending", hint: "Waiting for a result", n: t.waiting, icon: "tabler:hourglass", tone: "warning" },
    ];
    $("tickets-body").innerHTML =
      '<div class="tickets__total"><span class="tickets__total-value">' + fmt.int(t.total) +
      '</span><span class="t-muted">tickets in this range</span></div><div class="tickets__split">' +
      rows
        .map(function (r) {
          var pct = t.total ? (r.n / t.total) * 100 : 0;
          return (
            '<div class="tickets__col tickets__col--' + r.tone + '"><div class="tickets__head"><iconify-icon icon="' + r.icon +
            '" aria-hidden="true"></iconify-icon><span class="tickets__count">' + fmt.int(r.n) + "</span></div>" +
            '<div class="tickets__label">' + r.label + ' <span class="tickets__pct">' + fmt.pct(pct, 1) + "</span></div>" +
            '<div class="tickets__hint">' + r.hint + "</div>" +
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
      { label: "Cancelled", icon: "tabler:ban", n: t.cancelled, amount: p.cancelAmount },
      { label: "Round cancelled", icon: "tabler:calendar-x", n: t.roundCancelled, amount: p.roundCancelledAmount },
      { label: "Bet failed", icon: "tabler:alert-triangle", n: t.betFailed, amount: p.betFailedAmount },
      { label: "Cancelled by user", icon: "tabler:user-x", n: t.userCancelled, amount: p.userCancelledAmount },
    ];
    var total = rows.reduce(function (s, r) {
      return s + r.amount;
    }, 0);
    $("cancel-body").innerHTML =
      '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Reason</th>' +
      '<th scope="col" class="is-num">Tickets</th><th scope="col" class="is-num">Amount</th><th scope="col">Share</th></tr></thead><tbody>' +
      rows
        .map(function (r) {
          var pct = total ? (r.amount / total) * 100 : 0;
          return (
            '<tr><td><span class="ident"><span class="avatar avatar--square avatar--sm avatar--error"><iconify-icon icon="' + r.icon +
            '"></iconify-icon></span><span class="ident__name">' + r.label + '</span></span></td><td class="is-num">' + fmt.int(r.n) +
            '</td><td class="is-num is-strong">' + fmt.money(r.amount) + '</td><td class="dash-share"><div class="meter" aria-hidden="true">' +
            '<div class="meter__fill" style="width:' + pct + '%"></div></div><span>' + fmt.pct(pct, 0) + "</span></td></tr>"
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
    $("kpis").innerHTML = new Array(5).join(
      '<article class="kpi kpi--loading">' + sk("skeleton--text", "40%") + sk("skeleton--value", "70%") + sk("skeleton--text", "55%") +
      '<span class="skeleton skeleton--block" style="--h:36px;margin-top:16px"></span></article>'
    );
    var chart = '<div style="display:flex;gap:24px;margin-bottom:20px">' + sk("skeleton--value", "120px") + sk("skeleton--value", "120px") + sk("skeleton--value", "120px") + "</div>";
    $("winloss-body").innerHTML = chart + '<span class="skeleton skeleton--block" style="--h:300px"></span>';
    $("bettype-body").innerHTML = chart + '<span class="skeleton skeleton--block" style="--h:280px"></span>';
    $("roi-body").innerHTML = '<span class="skeleton skeleton--block" style="--h:140px;max-width:260px;margin:0 auto 24px"></span>' +
      '<div class="stack" style="gap:14px">' + new Array(4).join(sk("skeleton--text", "100%")) + "</div>";
    $("days-body").innerHTML = '<span class="skeleton skeleton--block" style="--h:200px"></span>';
    $("tickets-body").innerHTML =
      '<div class="stack" style="gap:20px">' + sk("skeleton--value", "40%") +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">' +
      new Array(4).join('<div class="stack" style="gap:8px">' + sk("skeleton--value", "60%") + sk("skeleton--text", "80%") + sk("skeleton--text", "100%") + "</div>") +
      "</div></div>";
    $("cancel-body").innerHTML =
      '<div class="stack" style="gap:20px;padding:20px 24px 24px">' + new Array(5).join(sk("skeleton--text", "100%")) + "</div>";
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
    renderDays(current);
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

  /* ---------- Header: greeting, quick ranges, filters toggle, export ---------- */
  var hour = new Date().getHours();
  $("greeting").textContent = (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening") + ", superadmin";

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function localISO(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function paintQuick() {
    var days = daysInRange();
    var endsToday = /^2026-09-24T23:59/.test($("f-end").value) && /T00:00$/.test($("f-start").value);
    $("quick-range").querySelectorAll("[data-days]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(endsToday && Number(b.getAttribute("data-days")) === days));
    });
  }
  $("quick-range").addEventListener("click", function (e) {
    var b = e.target.closest("[data-days]");
    if (!b) return;
    var end = new Date(2026, 8, 24, 23, 59); // "today" in the prototype
    var start = new Date(2026, 8, 24 - Number(b.getAttribute("data-days")) + 1, 0, 0);
    $("f-end").value = localISO(end);
    $("f-start").value = localISO(start);
    paintQuick();
    if (validate(readFilters())) load("data");
  });
  ["f-start", "f-end"].forEach(function (id) {
    $(id).addEventListener("change", paintQuick);
  });

  function paintFilterCount() {
    var f = readFilters();
    var n = (f.currency !== "THB" ? 1 : 0) + (f.providers.length ? 1 : 0) + (f.gameIndex ? 1 : 0);
    $("filter-count").textContent = n;
    $("filter-count").hidden = !n;
  }
  $("filters").addEventListener("change", paintFilterCount);
  $("filters").addEventListener("click", function () {
    setTimeout(paintFilterCount, 0); // multiselect picks
  });
  $("toggle-filters").addEventListener("click", function () {
    var open = this.getAttribute("aria-expanded") !== "true";
    this.setAttribute("aria-expanded", String(open));
    $("filters").hidden = !open;
  });
  $("dash-export").addEventListener("click", function () {
    DS.ui.toast("Export downloads a CSV of this range in the app.", "tabler:download");
  });

  var states = ["data", "loading", "empty", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
