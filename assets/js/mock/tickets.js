/* ==========================================================================
   Mock data: bet tickets. Shapes follow useGetBetTicket(id) + useGetBetTicketDetails(id)
   (details[], total_bet_amount, total_win_amount, ticket_commands[], bet_request_details[]).
   ========================================================================== */
(function (DS) {
  var M = (DS.mock = DS.mock || {});
  var d = function (day, h, m, s) {
    return new Date(2026, 8, day, h, m, s || 0).getTime();
  };

  function curl(path, body) {
    return (
      "curl -X POST 'https://api.goldendragon.com/wallet/" + path + "' \\\n" +
      "  -H 'Content-Type: application/json' \\\n" +
      "  -H 'X-Signature: 322f57d6c22e8a41b0c9dd7704' \\\n" +
      "  -d '" + JSON.stringify(body, null, 2) + "'"
    );
  }

  var base = {
    id: 482193,
    player: { id: 10293, username: "somchai88" },
    provider: "Golden Dragon (GD01)",
    game: "Thai Government Lottery",
    roundGameId: 7781,
    createdAt: d(16, 14, 22, 8),
    status: "settled", // ticket-level status (lines carry win / lose)
    cancellationReason: null,
    details: [
      { id: 1, type: "bet_three_top", bet_number: "583", bet_amount: 100, reward_amount: 900, reward_result: 90000, status: "win" },
      { id: 2, type: "bet_three_tod", bet_number: "583", bet_amount: 50, reward_amount: 150, reward_result: 7500, status: "win" },
      { id: 3, type: "bet_two_top", bet_number: "83", bet_amount: 200, reward_amount: 90, reward_result: 0, status: "lose" },
      { id: 4, type: "bet_two_under", bet_number: "41", bet_amount: 100, reward_amount: 90, reward_result: 0, status: "lose" },
      { id: 5, type: "bet_run_top", bet_number: "8", bet_amount: 50, reward_amount: 3.2, reward_result: 160, status: "win" },
      { id: 6, type: "bet_run_under", bet_number: "1", bet_amount: 50, reward_amount: 4.2, reward_result: 0, status: "lose" },
    ],
    total_bet_amount: 550,
    total_win_amount: 97660,
    commands: [
      { id: 30412, type: "settle", queue_status: "done", created_at: d(16, 16, 5, 12), queue_updated_at: d(16, 16, 5, 14), retry: 0,
        request: curl("settle", { ticketId: 482193, playerId: 10293, roundId: 7781, amount: 97660.0, currency: "THB" }) },
      { id: 30118, type: "bet", queue_status: "done", created_at: d(16, 14, 22, 8), queue_updated_at: d(16, 14, 22, 9), retry: 0,
        request: curl("bet", { ticketId: 482193, playerId: 10293, roundId: 7781, amount: 550.0, currency: "THB" }) },
    ],
    betRequests: [
      { requestId: "req_8f2a91c4", indexId: 1, eventType: "bet", responseStatus: 200, lastRequestTime: d(16, 14, 22, 9),
        payload: JSON.stringify({ ticketId: 482193, amount: 550.0, lines: 6 }, null, 2) },
      { requestId: "req_c07d3e18", indexId: 2, eventType: "settle", responseStatus: 200, lastRequestTime: d(16, 16, 5, 14),
        payload: JSON.stringify({ ticketId: 482193, amount: 97660.0, result: "win" }, null, 2) },
    ],
  };

  M.ticket = function (variant) {
    var t = JSON.parse(JSON.stringify(base));
    if (variant === "cancel-pending") {
      // Player asked to cancel; the cancel_bet command hasn't finished (retry 0 → show the 30-min warning)
      t.status = "approved";
      t.total_win_amount = 0;
      t.details.forEach(function (x) {
        x.status = "approved";
        x.reward_result = 0;
      });
      t.commands = [
        { id: 30455, type: "cancel_bet", queue_status: "processing", created_at: d(16, 15, 2, 40), queue_updated_at: d(16, 15, 2, 41), retry: 0,
          request: curl("cancel-bet", { ticketId: 482193, playerId: 10293, reason: "user_cancelled" }) },
        base.commands[1],
      ];
      t.betRequests = [base.betRequests[0]];
    }
    return t;
  };

  /* ---------- Ticket list (useGetBetTickets) ---------- */
  M.games = [
    "Thai Government Lottery", "Lao Development", "Hanoi Regular", "Hanoi VIP",
    "Yeekee 5 minutes", "Nikkei Morning", "Dow Jones",
  ];
  var PLAYERS = [
    "somchai88", "nattaya_k", "pimchanok", "tanawat99", "kittipong", "ploy.s", "arthit_77", "wanida",
    "chaiwat", "sirin88", "boonmee", "lek_lucky", "noknoi", "prasert", "jirapat", "malee.t",
  ];

  M.ticketList = (function () {
    var providers = (M.providers || []).slice(0, 8);
    var seed = 11;
    var rnd = function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    var now = new Date(2026, 8, 24, 13, 40).getTime();
    var list = [];
    for (var i = 0; i < 180; i++) {
      var id = 482300 - i;
      var r = rnd();
      var status = r < 0.45 ? "settled" : r < 0.7 ? "approved" : r < 0.8 ? "waiting" : r < 0.93 ? "cancelled" : "rejected";
      var reason = null;
      if (status === "cancelled") {
        var c = rnd();
        reason = c < 0.4 ? "user_cancelled" : c < 0.7 ? "round_cancelled" : c < 0.85 ? "bet_failed" : null;
      }
      var pi = Math.floor(rnd() * PLAYERS.length);
      list.push({
        id: id,
        player: { id: 10200 + pi * 7, username: PLAYERS[pi] },
        provider: providers.length ? providers[Math.floor(rnd() * providers.length)] : null,
        game: M.games[Math.floor(rnd() * M.games.length)],
        createdAt: now - i * 5.1 * 60000 - Math.floor(rnd() * 120000), // ~15h back → reaches yesterday
        betAmount: Math.round((20 + rnd() * rnd() * 4980) / 10) * 10,
        status: status,
        cancellationReason: reason,
      });
    }
    // the ticket used by ticket-detail.html
    var t = list.filter(function (x) {
      return x.id === 482193;
    })[0];
    if (t) {
      t.player = { id: 10293, username: "somchai88" };
      t.provider = providers[0] || t.provider;
      t.game = "Thai Government Lottery";
      t.betAmount = 550;
      t.status = "settled";
      t.cancellationReason = null;
    }
    return list;
  })();

  M.retryResult = {
    status: 200,
    data: { success: true, balance: 152340.5, transactionId: "tx_9a8f2c71e04b", processedAt: "2026-09-24T13:41:07+07:00" },
  };
})(window.DS);
