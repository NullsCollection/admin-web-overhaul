/* ==========================================================================
   Mock data: billing (Phase 11e). Needs mock/providers.js. Shapes: src/types/billingTypes
   (BillingMonthlyReport: provider, reportStartAt, reportEndAt, profit, profitPercent, currentProfit,
   percentShare, percentShareAmount, percentShareStatus waiting | ready | paid | cancel, paidAt,
   queue { status processing | done | failed }; BillingMonthlyReportHistory: action, user, paidAt).
   ========================================================================== */
(function (DS) {
  var M = (DS.mock = DS.mock || {});
  var DAY = 864e5;
  var NOW = DS.fmt.now;
  var STATUSES = ["paid", "paid", "ready", "waiting", "paid", "cancel", "ready", "waiting"];

  // [year, month (0-based)] cycles: the current one is still open, the older ones are history
  var CYCLES = [[2026, 8], [2026, 7], [2026, 6]];
  M.billings = [];
  CYCLES.forEach(function (c, ci) {
    var start = new Date(c[0], c[1], 1).getTime();
    var end = new Date(c[0], c[1] + 1, 0, 23, 59).getTime();
    M.providers.slice(0, 10).forEach(function (p, i) {
      var seed = Math.abs(Math.sin((i + 1) * 12.9898 + (ci + 1) * 78.233) * 43758.5453);
      var wagers = 400000 + Math.floor((seed % 1) * 900) * 2300;
      var roi = Math.round((((seed * 7) % 1) * 22 - 4) * 100) / 100; // −4 … 18%: some months lose money
      var profit = Math.round(wagers * roi) / 100;
      var share = [10, 12.5, 15, 20][i % 4];
      var status = ci === 0 ? (i % 5 === 3 ? "waiting" : i % 5 === 1 ? "ready" : "waiting") : STATUSES[(i + ci) % STATUSES.length];
      var queue = ci === 0 && i === 6 ? "processing" : ci === 0 && i === 8 ? "failed" : "done";
      M.billings.push({
        id: 7000 + ci * 100 + i,
        cycle: ci, // 0 = current list, > 0 = history
        provider: p,
        reportStartAt: start,
        reportEndAt: end,
        totalBetAmount: wagers,
        profit: profit,
        profitPercent: Math.round(roi * 100) / 100,
        currentProfit: Math.round(profit * (1 - share / 100) * 100) / 100,
        percentShare: share,
        percentShareAmount: Math.max(0, Math.round(profit * share) / 100),
        percentShareStatus: queue === "done" ? status : "waiting",
        paidAt: status === "paid" ? end + (5 + i) * DAY : null,
        queue: { status: queue },
        failedMessage: queue === "failed" ? "Report service timed out after 3 retries" : null,
        isOwner: p.isOwner,
      });
    });
  });
  M.billing = function (id) {
    return M.billings.filter(function (b) {
      return String(b.id) === String(id);
    })[0] || null;
  };
  // Payment history of one bill (useHistoryDialog)
  M.billingHistory = function (b) {
    var out = [{ action: "created", user: { name: "System" }, at: b.reportEndAt + 2 * 3600000, percentShareAmount: null }];
    if (b.percentShareStatus === "paid" || b.percentShareStatus === "cancel") {
      out.push({ action: "paid", user: { name: "Ploy Finance" }, at: b.reportEndAt + 4 * DAY, percentShareAmount: b.percentShareAmount });
    }
    if (b.percentShareStatus === "cancel") {
      out.push({ action: "cancel_paid", user: { name: "Nok Operations" }, at: b.reportEndAt + 6 * DAY, percentShareAmount: b.percentShareAmount });
    }
    return out.reverse();
  };
  // Billing detail dashboard (DashboardBillingMonthly) for one bill
  M.billingDashboard = function (b) {
    var w = b.totalBetAmount;
    var win = w - b.profit - w * 0.012;
    var total = Math.round(w / 270);
    var games = ["Thai government", "Lao development", "Hanoi normal", "Hanoi VIP", "Nikkei morning", "Dow Jones", "Yeekee"];
    return {
      isOwner: b.isOwner,
      betPerformance: { betTotalAmount: w, winTotalAmount: win, totalBonus: w * 0.012, cancelAmount: w * 0.009, profitTotalAmount: b.profit, roi: b.profitPercent },
      betTicketCountOverview: { total: total, settled: Math.round(total * 0.95), cancelled: Math.round(total * 0.03), rejected: Math.round(total * 0.004) },
      betGamePerformance: games.map(function (g, i) {
        var gw = w * [0.28, 0.18, 0.16, 0.12, 0.1, 0.09, 0.07][i];
        var gp = gw * ((b.profitPercent + (i % 3) * 4 - 4) / 100);
        return { gameNameEn: g, lossAmount: gw, winAmount: gw - gp, profitAmount: gp };
      }),
      lottoGroup: b.isOwner ? [] : [
        { text: "Thai government set: 1,240 tickets × " + DS.fmt.money(96, b.provider.currency.code), value: 119040 },
        { text: "Lao set 4 digits: 380 tickets × " + DS.fmt.money(90, b.provider.currency.code), value: 34200 },
      ],
      recent: [0, 1, 2, 3, 4, 5].map(function (i) {
        return { id: 482190 - i * 17, member: ["somchai88", "nong_ploy", "lucky7_th", "bee_bkk", "jaidee99", "tum_tam"][i], game: games[i],
          at: b.reportEndAt - i * 3.7 * 3600000, amount: [500, 1200, 80, 2500, 300, 640][i], status: ["won", "lost", "lost", "resulted", "lost", "won"][i] };
      }),
    };
  };
})(window.DS);
