/* ==========================================================================
   Mock data: lotto rounds. Pending rounds = status "close_bet", result not confirmed,
   closed in the last 7 days (usePendingRoundPage filter). Phase 8 will extend this file.
   ========================================================================== */
(function (DS) {
  var M = (DS.mock = DS.mock || {});
  var now = DS.fmt.now;
  var H = 3600000;

  // [game, hours since close, round length in hours, lotto game id (mock/lotto.js)]
  var PENDING = [
    ["Hanoi VIP", 2.3, 24, 311], ["Dow Jones", 4.1, 24, 318], ["Nikkei morning", 6.8, 24, 313],
    ["Yeekee", 0.2, 0.25, 320], ["Lao development", 17.5, 72, 305], ["Hanoi normal", 21.2, 24, 309],
    ["Thai government", 28.6, 360, 301], ["Hanoi VIP", 26.3, 24, 311], ["Dow Jones", 52.1, 24, 318],
    ["Nikkei morning", 75.4, 24, 313], ["Lao development", 89.9, 72, 305], ["Hanoi normal", 140.2, 24, 309],
  ];

  M.pendingRounds = PENDING.map(function (p, i) {
    var closeAt = now - p[1] * H - (i * 7 % 13) * 60000;
    return {
      id: 7790 - i * 3,
      gameName: p[0],
      lottoGameId: p[3],
      yeekee: p[3] === 320, // linked to a real yeekee round at the end of this file
      status: "close_bet",
      openAt: closeAt - p[2] * H,
      closeAt: closeAt,
    };
  }).sort(function (a, b) {
    return a.closeAt - b.closeAt; // oldest first
  });

  /* ---------- Round schedules (Phase 8a; src/types/lotto/roundScheduleTypes) ----------
     Built on first use: needs M.games from mock/lotto.js (load that first). */
  // [name, gameId, cron, closeInHours, closeInMinutes, upFrontRound, enabled, excludes]
  var SCHEDULES = [
    ["Thai government draw", 301, "0 15 1,16 * *", "14", "30", 2, true, []],
    ["Thai government VIP draw", 302, "0 15 1,16 * *", "14", "0", 2, true, []],
    ["GSB monthly", 303, "0 15 16 * *", "14", "30", 1, true, []],
    ["BAAC monthly", 304, "0 15 16 * *", "14", "30", 1, false, []],
    ["Lao development", 305, "30 20 * * 1,3,5", "20", "0", 3, true, []],
    ["Lao star nightly", 306, "45 21 * * *", "21", "15", 3, true, [[0, false, ""]]],
    ["Hanoi normal daily", 309, "30 18 * * *", "18", "0", 5, true, []],
    ["Hanoi special daily", 310, "15 17 * * *", "16", "45", 5, true, []],
    ["Hanoi VIP daily", 311, "30 19 * * *", "19", "0", 5, true, [[6, true, "19:30"]]],
    ["Nikkei morning", 313, "30 9 * * 1-5", "9", "0", 5, true, []],
    ["Nikkei afternoon", 314, "0 13 * * 1-5", "12", "30", 5, true, []],
    ["Hang Seng morning", 315, "0 11 * * 1-5", "10", "30", 5, true, []],
    ["Dow Jones overnight", 318, "30 4 * * 2-6", "4", "0", 5, true, []],
    ["Thai stock evening", 319, "0,30 16 * * 1-5", "15", "45", 5, false, []],
    ["Malaysia 3 days a week", 322, "0 19 * * 0,3,6", "18", "30", 3, true, []],
  ];
  var schedules = null;
  M.roundSchedules = function () {
    if (schedules) return schedules;
    schedules = SCHEDULES.map(function (r, i) {
      var created = now - (300 - i * 13) * 864e5 - i * 47 * 6e4;
      return {
        id: 601 + i,
        name: r[0],
        lottoGameId: r[1],
        cronExpression: r[2],
        closeInHours: r[3],
        closeInMinutes: r[4],
        upFrontRound: r[5],
        isEnable: r[6] ? "yes" : "no",
        excludeDatetimes: r[7].map(function (x) {
          return { dayOfWeek: x[0], useTime: x[1], time: x[2] };
        }),
        createdAt: created,
        updatedAt: created + (i % 3 ? (15 + i * 5) * 864e5 : 0),
      };
    });
    return schedules;
  };
  /* ---------- Rounds (Phase 8b; src/types/lotto/roundTypes: Round) ----------
     Built on first use (needs M.games). Per game: past resulted rounds, sometimes a cancelled one,
     a pending-result one, the open one, and an upcoming one (some disabled). */
  var rounds = null;
  // [gameId, round length h, close hour]
  var CADENCE = [
    [301, 360, 15], [302, 360, 15], [305, 48, 20], [306, 24, 21], [309, 24, 18], [310, 24, 17], [311, 24, 19],
    [313, 24, 9], [315, 24, 11], [318, 24, 4], [320, 0.25, 0], [322, 72, 19], [323, 360, 15],
  ];
  M.rounds = function () {
    if (rounds) return rounds;
    rounds = [];
    var id = 8401;
    var day = new Date(now);
    day.setHours(0, 0, 0, 0);
    CADENCE.forEach(function (c, gi) {
      var len = c[1] * H;
      var close = new Date(day.getTime() + c[2] * H).getTime();
      if (c[1] < 1) close = now + 7 * 60000; // Yeekee: every 15 minutes
      else if (close < now) close += Math.ceil((now - close) / len) * len; // next close after now
      var kinds = ["upcoming", "open", "pending", "resulted", "resulted"];
      if (gi % 4 === 1) kinds.splice(3, 0, "cancelled");
      if (gi % 3 === 2) kinds[0] = "upcoming-disabled";
      if (gi % 5 === 3) kinds.splice(2, 1); // no pending round for this game
      var t = close + len; // upcoming round closes one length after the open one
      kinds.forEach(function (k) {
        var closeAt = t;
        var openAt = closeAt - len;
        t -= len;
        if (k === "open") closeAt = close;
        var status = k === "pending" ? "close_bet" : k === "resulted" ? "resulted" : k === "cancelled" ? "cancelled" : "open";
        rounds.push({
          id: id++,
          lottoGameId: c[0],
          openAt: k === "open" ? close - len : openAt,
          closeAt: closeAt,
          status: status,
          isEnable: k === "upcoming-disabled" ? "no" : "yes",
          isResultConfirmed: status === "resulted",
          createdAt: openAt - 2 * 864e5,
          updatedAt: Math.min(closeAt + H, now),
          syncSiteIds: gi % 2 ? [1, 2] : [1],
        });
      });
    });
    // Pending rounds are rounds too: the round pages (edit, result, current bet, limit numbers) open them by id
    M.pendingRounds.forEach(function (p, i) {
      if (p.yeekee) return;
      rounds.push({
        id: p.id, lottoGameId: p.lottoGameId, openAt: p.openAt, closeAt: p.closeAt, status: "close_bet", isEnable: "yes",
        isResultConfirmed: false, createdAt: p.openAt - 2 * 864e5, updatedAt: p.closeAt + 60000, syncSiteIds: i % 2 ? [1, 2] : [1],
      });
    });
    rounds.sort(function (a, b) {
      return b.closeAt - a.closeAt;
    });
    return rounds;
  };
  /* Results per round (Round.results). Needs DS.rounds + M.configById. Resulted rounds have a
     paid ("success") result, sometimes after a canceled one; some pending-result rounds already
     have a result waiting for confirmation. */
  var results = {};
  var digits = function (seed, len) {
    var x = seed;
    var out = "";
    while (out.length < len) {
      x = (x * 7919 + 17) % 1000003;
      out += String(x % 10);
    }
    return out;
  };
  M.numbersFor = function (round, seed) {
    var g = M.games.filter(function (x) {
      return x.id === round.lottoGameId;
    })[0];
    var c = M.configById(g.lottoConfigurationId);
    var nums = {};
    DS.rounds.resultFields(c).forEach(function (f, i) {
      nums[f.key] = digits(seed + i * 31, f.len);
    });
    if (nums.SixDigit && nums.FiveDigit) nums.FiveDigit = nums.SixDigit.slice(-5);
    if (nums.SixDigit && nums.FourDigit) nums.FourDigit = nums.SixDigit.slice(-4);
    if (nums.ThreeTop && nums.TwoTop && Number(c.rewardTopThree) > 0) nums.TwoTop = nums.ThreeTop.slice(-2);
    return nums;
  };
  M.roundResults = function (round) {
    if (results[round.id]) return results[round.id];
    var list = [];
    var rid = round.id * 10;
    if (round.status === "resulted") {
      if (round.id % 3 === 0) list.push({ id: rid + 1, status: "canceled", numbers: M.numbersFor(round, round.id + 5), createdAt: round.closeAt + 20 * 60000, updatedAt: round.closeAt + 40 * 60000 });
      list.push({ id: rid + 2, status: "success", numbers: M.numbersFor(round, round.id), createdAt: round.closeAt + 45 * 60000, updatedAt: round.closeAt + 60 * 60000 });
    }
    if (round.status === "close_bet" && round.id % 2 === 0) {
      list.push({ id: rid + 1, status: "pending", numbers: M.numbersFor(round, round.id), createdAt: round.closeAt + 30 * 60000, updatedAt: round.closeAt + 30 * 60000 });
    }
    results[round.id] = list;
    return list;
  };

  /* ---------- Current bet (Phase 10, pulled into 8; src/api/lotto/limitTemplateApi CurrentBet) ----------
     fetchCurrentBet(roundId): per provider, the "max bet" figure per bet type.
     fetchCurrentBetDetails(roundId, providerId): limitSet = [{ betType, number, limitHit }] */
  M.CURRENT_BET_KEYS = [
    ["maxBetThreeTop", "Max 3 top"], ["maxBetThreeUnder", "Max 3 under"], ["maxBetThreeTod", "Max 3 tod"],
    ["maxBetThreeFront", "Max 3 front"], ["maxBetTwoTop", "Max 2 top"], ["maxBetTwoUnder", "Max 2 under"],
    ["maxBetRunTop", "Max run top"], ["maxBetRunBottom", "Max run bottom"],
  ];
  var HIT_TYPES = ["bet_three_top", "bet_three_under", "bet_three_tod", "bet_two_top", "bet_two_under", "bet_run_top"];
  M.currentBet = function (roundId) {
    return M.providers.slice(0, 9).map(function (p, i) {
      var row = { providerId: p.id, providerName: p.name, providerPrefixCode: p.prefixCode, roundId: roundId };
      M.CURRENT_BET_KEYS.forEach(function (k, j) {
        var base = j < 4 ? 5000 : j < 6 ? 20000 : 50000;
        var v = ((roundId + i * 37 + j * 11) * 7919) % 1000;
        row[k[0]] = i === 8 ? 0 : Math.round((base * v) / 1000 / 10) * 10; // last provider: no bets yet
      });
      return row;
    });
  };
  M.currentBetDetails = function (roundId, providerId) {
    var n = (providerId + roundId) % 7;
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = HIT_TYPES[(i + providerId) % HIT_TYPES.length];
      var len = t.indexOf("three") > -1 ? 3 : t.indexOf("two") > -1 ? 2 : 1;
      out.push({ id: providerId * 100 + i, betType: t, number: String((providerId * 97 + i * 131) % Math.pow(10, len)).padStart(len, "0"),
        limitHit: String([5000, 20000, 50000][len === 3 ? 0 : len === 2 ? 1 : 2]) });
    }
    return out;
  };

  /* ---------- Yeekee rounds (Phase 8e; /lotto/yeekee/rounds, Round + yeekeeRoundBonus) ----------
     Yeekee + Yeekee VIP every 15 / 30 minutes, the encrypted draw every hour, for today and the
     2 days before (the list filters one close date). Rounds exist up to 2 ahead of now.
     Yeekee: members "shoot" 5-digit numbers; summaryResult = sum of every number, resultRow16 =
     the 16th number, yeekee result = sum − row 16 (YeekeeResult.tsx). Top three / bottom two come
     from the API; the mock takes them from the last 5 digits of the yeekee result so it adds up.
     Bonus rows (yeekeeConfig.bonusRow1..5) win playerUsernameBonus1..5 when that row exists. */
  var YK_GAMES = [[320, 15], [321, 30], [325, 60]]; // [gameId, minutes per round]
  /* Yeekee bonus configs (Phase 8f; src/types/lotto/yeekeeConfigTypes). One per provider; providerId -1 =
     "All" (the app's create form offers it; the list shows it as "All providers"). putNumberExtendTime is
     in seconds ("extend shoot time (Sec)"). Rows 1–2 required, 3–5 optional (null). */
  // [providerId, extend sec, reward, row1..row5]
  var YK_CONFIGS = [
    [-1, 60, 100, 1, 16, null, null, null],
    [101, 60, 100, 1, 10, 25, 50, 99],
    [102, 45, 50, 1, 16, null, null, null],
    [103, 90, 200, 1, 16, 32, null, null],
    [105, 60, 100, 5, 16, 50, 100, null],
    [107, 30, 20, 1, 16, null, null, null],
    [110, 60, 150, 1, 9, 16, 99, null],
    [114, 120, 500, 1, 16, 25, 50, 75],
  ];
  M.yeekeeConfigs = YK_CONFIGS.map(function (c, i) {
    var created = now - (210 - i * 19) * 864e5 - i * 53 * 6e4;
    return {
      id: 41 + i,
      providerId: c[0],
      putNumberExtendTime: c[1],
      bonusReward: c[2],
      bonusRow1: c[3], bonusRow2: c[4], bonusRow3: c[5], bonusRow4: c[6], bonusRow5: c[7],
      createdAt: created,
      updatedAt: created + (i % 3 ? (12 + i * 4) * 864e5 : 0),
    };
  });
  M.yeekeeConfig = function (id) {
    var c = M.yeekeeConfigs.filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return c ? JSON.parse(JSON.stringify(c)) : null;
  };
  var YK_CONFIG = M.yeekeeConfigs[1]; // the rounds below use Golden Dragon's config
  var MEMBERS = ["somchai88", "nong_ploy", "lucky7_th", "kittisak.w", "bee_bkk", "jaidee99", "tum_tam", "ped_ped", "arunee_s",
    "boss_lao", "minnie.k", "pond2026", "tiger_hn", "mai_mai", "sakda_r", "fon_noi", "ohm_ohm", "nut_cm", "jib_jib", "golf_k"];
  var hex = function (seed, len) {
    var x = seed;
    var out = "";
    while (out.length < len) {
      x = (x * 48271 + 11) % 2147483647;
      out += (x % 16).toString(16);
    }
    return out;
  };
  var ykShots = {};
  M.yeekeeShots = function (round) {
    if (ykShots[round.id]) return ykShots[round.id];
    var list = [];
    var n = round.status === "open" && round.openAt > now ? 0 : 30 + ((round.id * 37) % 90);
    var span = (Math.min(round.closeAt, now) - round.openAt) || 1;
    for (var i = 0; i < n; i++) {
      var s = (round.id * 131 + i * 7919) % 1000003;
      list.push({
        id: round.id * 1000 + i,
        yeekeeRoundId: round.id,
        playerUsername: MEMBERS[Math.floor(((s + 1) * 2654435761 % 4294967296) / 4096) % MEMBERS.length],
        inputNumber: digits(s + 3, 5),
        savedAt: round.openAt + Math.round((span * (i + 1)) / (n + 1)) + (s % 900),
      });
    }
    ykShots[round.id] = list;
    return list;
  };
  var ykRounds = null;
  M.yeekeeRounds = function () {
    if (ykRounds) return ykRounds;
    ykRounds = [];
    var day0 = new Date(now);
    day0.setHours(0, 0, 0, 0);
    var id = 9601;
    [2, 1, 0].forEach(function (back) {
      var start = day0.getTime() - back * 864e5;
      YK_GAMES.forEach(function (gm) {
        var len = gm[1] * 60000;
        for (var k = 1; k * len <= 864e5; k++) {
          var closeAt = start + k * len;
          if (closeAt > now + 2 * len) break;
          var waiting = closeAt <= now && closeAt > now - 15 * 60000; // just closed, being worked out
          var status = closeAt > now ? "open" : waiting ? "close_bet" : "resulted";
          var r = {
            id: id++,
            lottoGameId: gm[0],
            roundNumber: String(k),
            openAt: closeAt - len,
            closeAt: closeAt,
            status: status,
            isEnable: gm[0] === 321 && closeAt > now + len ? "no" : "yes",
            isResultConfirmed: status === "resulted",
            topThreeResult: "",
            bottomTwoResult: "",
          };
          if (gm[0] === 325) {
            r.signature = hex(r.id * 7, 64);
            r.sixResult = "";
            r.encryptResult = "";
            if (r.isResultConfirmed) {
              r.sixResult = digits(r.id * 3, 6);
              r.encryptResult = hex(r.id * 13, 96);
              r.topThreeResult = r.sixResult.slice(-3);
              r.bottomTwoResult = r.sixResult.slice(0, 2);
            }
          } else {
            r.yeekeeConfig = YK_CONFIG;
          }
          ykRounds.push(r);
        }
      });
    });
    // Results for yeekee rounds: add up the shot numbers
    ykRounds.forEach(function (r) {
      if (!r.yeekeeConfig || !r.isResultConfirmed) return;
      var shots = M.yeekeeShots(r);
      var sum = shots.reduce(function (a, s) {
        return a + Number(s.inputNumber);
      }, 0);
      var row16 = shots[15];
      var five = String(sum - Number(row16.inputNumber)).padStart(5, "0").slice(-5);
      r.topThreeResult = five.slice(-3);
      r.bottomTwoResult = five.slice(0, 2);
      r.yeekeeRoundBonus = { id: r.id * 2, yeekeeRoundId: r.id, summaryResult: String(sum), resultRow16: row16.inputNumber,
        resultRow16Username: row16.playerUsername };
      [1, 2, 3, 4, 5].forEach(function (b) {
        var shot = shots[YK_CONFIG["bonusRow" + b] - 1];
        r.yeekeeRoundBonus["playerUsernameBonus" + b] = shot ? shot.playerUsername : "";
      });
    });
    ykRounds.sort(function (a, b) {
      return b.closeAt - a.closeAt || a.lottoGameId - b.lottoGameId;
    });
    return ykRounds;
  };

  // Any round by id: normal rounds first, then yeekee rounds (they share round ids in the app)
  M.round = function (id) {
    var r = M.rounds().concat(M.yeekeeRounds()).filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return r ? JSON.parse(JSON.stringify(r)) : null;
  };

  // useGetSyncSitesForDropdown(): sites a new round is synced to (all picked by default)
  // SyncSiteResponse has no name, only callbackUrl (11d): `name` here is the URL's host, which is what
  // the round pages show. status: active | inactive.
  M.syncSites = [
    { id: 1, name: "sync-main.rb7.example", callbackUrl: "https://sync-main.rb7.example/api/sync", status: "active" },
    { id: 2, name: "sync-la.rb7.example", callbackUrl: "https://sync-la.rb7.example/api/sync", status: "active" },
    { id: 3, name: "sync-vn.rb7.example", callbackUrl: "https://sync-vn.rb7.example/api/sync", status: "inactive" },
  ].map(function (x, i) {
    return Object.assign(x, { createdAt: now - (200 - i * 40) * 864e5, updatedAt: now - (30 - i * 9) * 864e5 });
  });
  // useGetErrorSyncSiteReceivers: sync calls this site received and failed to apply
  // [model, action, error]
  var ERR = [
    ["lotto_round_games", "create", "Lotto game 330 not found on this site"],
    ["lotto_round_results", "confirm_result", "Round 8412 is not waiting for a result here"],
    ["lotto_games", "update", "Validation failed: translations.th.name is required"],
    ["lotto_round_games", "cancel_round", "Round 8399 was already cancelled"],
    ["lotto_groups", "update", "Lotto group 17 not found on this site"],
    ["lotto_round_results", "create_result", "Result numbers do not match the game config (six digits expected)"],
  ];
  M.syncErrors = ERR.map(function (e, i) {
    var ref = 8400 + i * 7;
    var at = now - (i * 5 + 1) * 3600000 - i * 7 * 60000;
    return { id: 300 + i, model: e[0], referenceId: ref, masterReferenceId: ref + 100000, masterReferenceAction: e[1],
      incomingRequestPayload: { model: e[0], action: e[1], master_reference_id: ref + 100000, data: { id: ref, updated_at: new Date(at).toISOString() } },
      errorMessage: e[2], createdAt: at, updatedAt: at };
  });

  M.roundSchedule = function (id) {
    var s = M.roundSchedules().filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return s ? JSON.parse(JSON.stringify(s)) : null;
  };
  // The pending page's yeekee row = the Yeekee round that just closed (so its links open a real round)
  (function () {
    var yk = M.yeekeeRounds().filter(function (r) {
      return r.lottoGameId === 320 && r.status === "close_bet";
    })[0];
    M.pendingRounds.forEach(function (p) {
      if (!p.yeekee || !yk) return;
      p.id = yk.id;
      p.openAt = yk.openAt;
      p.closeAt = yk.closeAt;
    });
    M.pendingRounds.sort(function (a, b) {
      return a.closeAt - b.closeAt;
    });
  })();
})(window.DS);
