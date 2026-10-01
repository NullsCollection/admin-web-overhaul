/* ==========================================================================
   Mock data: lotto setup. Shapes follow src/types/lotto/configTypes (LottoConfig).
   Shared by pages/lotto-configs.js (list) and pages/lotto-config-form.js (new/edit).
   Deterministic: same data on every load.
   ========================================================================== */
(function (DS) {
  var M = (DS.mock = DS.mock || {});
  var DAY = 864e5;
  var NOW = DS.fmt.now;

  // Typical pay rates per 1 unit staked, per type
  var RATES = {
    default: { rewardTopThree: 900, rewardTopThreeFlip: 150, rewardBottomThree: 450, rewardBottomThreeFront: 450,
      rewardTopTwo: 90, rewardBottomTwo: 90, rewardRunTop: 3.2, rewardRunBottom: 4.2 },
    stock: { rewardTopThree: 850, rewardTopThreeFlip: 140, rewardTopTwo: 92, rewardBottomTwo: 92, rewardRunTop: 3, rewardRunBottom: 4 },
    group: { rewardFour: 6000, rewardFourFlip: 250, rewardTopThree: 800, rewardTopThreeFlip: 130,
      rewardTopThreeFront: 400, rewardTopTwoFront: 80, rewardTopTwo: 80 },
    group_six: { rewardSix: 150000, rewardTopFive: 15000, rewardTopFour: 1500 },
  };
  var CUSTOM = {
    4: { rewardFour: 5000, rewardFourFlip: 200 },
    5: { rewardFive: 30000, rewardFiveFlip: 1000, rewardTopFour: 1500 },
    6: { rewardSix: 120000, rewardSixFlip: 4000, rewardTopFive: 12000, rewardTopFour: 1200 },
  };
  var CUSTOM_SHARED = { rewardTopThree: 400, rewardTopThreeFlip: 60, rewardTopTwo: 40, rewardTopTwoFront: 40, rewardTopThreeFront: 200 };

  // [name, type, digitLength?, retail?, cost?, bump, gamesUsing]
  var ROWS = [
    ["Thai government standard", "default", 0, 0, null, 0, 3],
    ["Thai government VIP", "default", 0, 0, null, 50, 1],
    ["Lao development", "default", 0, 0, null, -30, 2],
    ["Hanoi standard", "default", 0, 0, null, -50, 4],
    ["Hanoi special", "default", 0, 0, null, -20, 1],
    ["Malaysia 3D", "default", 0, 0, null, -40, 0],
    ["Nikkei stock", "stock", 0, 0, null, 0, 2],
    ["Hang Seng stock", "stock", 0, 0, null, 0, 2],
    ["Dow Jones stock", "stock", 0, 0, null, 10, 1],
    ["Lao set 4", "group", 0, 0, null, 0, 1],
    ["Lao set 6", "group_six", 0, 0, null, 0, 1],
    ["Lao set 4 (120)", "group_custom", 4, 120, 96, 0, 1],
    ["Hanoi set 5 (80)", "group_custom", 5, 80, 64, 0, 0],
    ["Lao set 6 (240)", "group_custom", 6, 240, null, 0, 0],
  ];

  M.configs = ROWS.map(function (r, i) {
    var c = { id: 201 + i, name: r[0], type: r[1] };
    var base = r[1] === "group_custom" ? Object.assign({}, CUSTOM_SHARED, CUSTOM[r[2]]) : RATES[r[1]];
    Object.keys(base).forEach(function (k) {
      c[k] = base[k] >= 100 ? base[k] + r[5] : base[k];
    });
    if (r[1] === "group_custom") {
      c.groupCustomDigitLength = r[2];
      c.retailPrice = r[3];
      c.costPrice = r[4];
    }
    c.gamesUsing = r[6]; // not on the API type; only drives the mock "can't delete" (422) path
    c.createdAt = NOW - (420 - i * 23) * DAY - i * 37 * 6e4;
    c.updatedAt = c.createdAt + (i % 3 === 0 ? 0 : (40 + i * 11) * DAY);
    return c;
  });

  /* ---------- Groups (src/types/lotto/groupTypes: LottoGroup) ---------- */
  // Same list as mock/providers.js (useGetLanguages)
  M.languages = M.languages || [
    { value: "th", label: "Thai" },
    { value: "en", label: "English" },
    { value: "lo", label: "Lao" },
    { value: "vi", label: "Vietnamese" },
    { value: "zh", label: "Chinese" },
    { value: "km", label: "Khmer" },
  ];

  // [code, th, en, lo?, gamesUsing]
  var GROUPS = [
    ["TH_GOV", "หวยรัฐบาลไทย", "Thai government", "ຫວຍລັດຖະບານໄທ", 2],
    ["LAO", "หวยลาว", "Lao lottery", "ຫວຍລາວ", 4],
    ["HANOI", "หวยฮานอย", "Hanoi lottery", "", 5],
    ["STOCK", "หวยหุ้น", "Stock lottery", "", 8],
    ["YEEKEE", "หวยยี่กี", "Yeekee", "", 3],
    ["MALAY", "หวยมาเลย์", "Malaysia lottery", "", 1],
    ["SET", "หวยชุด", "Set lottery", "ຫວຍຊຸດ", 2],
    ["SPECIAL", "หวยพิเศษ", "Special draws", "", 0],
  ];
  M.groups = GROUPS.map(function (g, i) {
    var tr = [
      { languageCode: "th", name: g[1] },
      { languageCode: "en", name: g[2] },
    ];
    if (g[3]) tr.push({ languageCode: "lo", name: g[3] });
    var created = NOW - (600 - i * 41) * DAY - i * 53 * 6e4;
    return {
      id: 11 + i,
      code: g[0],
      translations: tr,
      sort: i + 1,
      gamesUsing: g[4], // not on the API type; drives the mock "can't delete" path
      createdAt: created,
      updatedAt: created + (i % 2 ? (30 + i * 9) * DAY : 0),
    };
  });
  M.group = function (id) {
    var g = M.groups.filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return g ? JSON.parse(JSON.stringify(g)) : null;
  };

  /* ---------- Games (src/types/lotto/gameTypes: LottoGame) ---------- */
  // [code, th, en, type, groupId, configId, flag, enabled, highlight, blacklist, setPrice?]
  var GAMES = [
    ["TGOV", "หวยรัฐบาลไทย", "Thai government", "default", 11, 201, "government", 1, 1, 0],
    ["TGOV_VIP", "หวยรัฐบาล VIP", "Thai government VIP", "default", 11, 202, "government_set", 1, 0, 0],
    ["GSB", "หวยออมสิน", "Government Savings Bank", "default", 11, 201, "gsb", 1, 0, 0],
    ["BAAC", "หวย ธ.ก.ส.", "BAAC lottery", "default", 11, 201, "baac", 0, 0, 0],
    ["LAO_DEV", "หวยลาวพัฒนา", "Lao development", "default", 12, 203, "lao", 1, 1, 0],
    ["LAO_STAR", "หวยลาวสตาร์", "Lao star", "default", 12, 203, "laostar", 1, 0, 0],
    ["LAO_SET4", "หวยลาวชุด 4 ตัว", "Lao set 4", "group", 12, 210, "laos_group_set", 1, 0, 0, 120],
    ["LAO_SET6", "หวยลาวชุด 6 ตัว", "Lao set 6", "group_six", 12, 211, "laos_group_set", 1, 0, 0, 240],
    ["HN", "หวยฮานอยปกติ", "Hanoi normal", "default", 13, 204, "hanoi", 1, 1, 0],
    ["HN_SP", "หวยฮานอยพิเศษ", "Hanoi special", "default", 13, 205, "hanoi_special", 1, 0, 0],
    ["HN_VIP", "หวยฮานอย VIP", "Hanoi VIP", "default", 13, 204, "hanoi_vip", 1, 0, 0],
    ["HN_SET5", "หวยฮานอยชุด 5 ตัว", "Hanoi set 5", "group_custom", 13, 213, "vietnam", 0, 0, 0],
    ["NK_AM", "นิเคอิเช้า", "Nikkei morning", "stock", 14, 207, "nikei_morning", 1, 0, 0],
    ["NK_PM", "นิเคอิบ่าย", "Nikkei afternoon", "stock", 14, 207, "nikei_afternoon", 1, 0, 0],
    ["HS_AM", "ฮั่งเส็งเช้า", "Hang Seng morning", "stock", 14, 208, "hangseng_morning", 1, 0, 0],
    ["HS_PM", "ฮั่งเส็งบ่าย", "Hang Seng afternoon", "stock", 14, 208, "hangseng_afternoon", 1, 0, 0],
    ["CN_AM", "หุ้นจีนเช้า", "China stock morning", "stock", 14, 208, "china_morning", 1, 0, 0],
    ["DJ", "หุ้นดาวโจนส์", "Dow Jones", "stock", 14, 209, "downjones", 1, 0, 1],
    ["TH_STK", "หุ้นไทยเย็น", "Thai stock evening", "stock", 14, 207, "thaistock_evening", 0, 0, 0],
    ["YK", "ยี่กี", "Yeekee", "yeekee", 15, 201, "yeekee", 1, 1, 0],
    ["YK_VIP", "ยี่กี VIP", "Yeekee VIP", "yeekee", 15, 202, "yeekeeVIP", 1, 0, 0],
    ["MY", "หวยมาเลย์", "Malaysia", "default", 16, 206, "malaysia", 1, 0, 0],
    ["TH_SET", "หวยรัฐบาลชุด", "Thai government set", "group_custom", 17, 212, "thai_government_set", 1, 0, 0],
    ["LAO_SET6C", "หวยลาวชุด 6 หลัก", "Lao set 6 digits", "group_custom", 17, 214, "laos_group_set", 1, 0, 0],
    ["ENC", "เกมเข้ารหัส", "Encrypted draw", "encrypt_game", 18, 201, "crypto", 0, 0, 0],
  ];
  var perGroup = {};
  M.games = GAMES.map(function (g, i) {
    perGroup[g[4]] = (perGroup[g[4]] || 0) + 1;
    var created = NOW - (520 - i * 17) * DAY - i * 29 * 6e4;
    return {
      id: 301 + i,
      code: g[0],
      type: g[3],
      lottoGroupId: g[4],
      lottoConfigurationId: g[5],
      flag: g[6],
      isEnable: g[7] ? "yes" : "no",
      isHilight: g[8] ? "yes" : "no",
      isBlacklist: !!g[9],
      costPrice: g[10] || 0, // group_custom keeps 0: the config's retail price is the source of truth
      sort: perGroup[g[4]],
      translations: [
        { languageCode: "th", name: g[1], description: "<p>ออกผลตามงวดของ" + g[1] + "</p>" },
        { languageCode: "en", name: g[2], description: "<p>Results follow the official <strong>" + g[2] + "</strong> draw.</p>" },
      ],
      createdAt: created,
      updatedAt: created + (i % 3 ? (20 + i * 7) * DAY : 0),
    };
  });
  M.game = function (id) {
    var g = M.games.filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return g ? JSON.parse(JSON.stringify(g)) : null;
  };
  M.groupById = function (id) {
    return M.groups.filter(function (g) {
      return g.id === Number(id);
    })[0];
  };
  M.configById = function (id) {
    return M.configs.filter(function (c) {
      return c.id === Number(id);
    })[0];
  };
  /* useGetCustomPrice(gameId, providerId).providerConfiguration: a couple of providers pay a
     little less on the headline rates. null = the provider uses the config as-is. */
  M.customPrice = function (game, providerId) {
    var key = game.id + ":" + providerId;
    if (key in customEdits) return customEdits[key] ? Object.assign({}, customEdits[key]) : null;
    var c = Object.assign({}, M.configById(game.lottoConfigurationId));
    if (game.type === "group_custom") {
      if (Number(providerId) !== 103) return null; // owner provider with its own set price
      c.retailPrice = Math.round(c.retailPrice * 1.1);
      c.rewardTopThree = Math.round(c.rewardTopThree * 0.9);
      return c;
    }
    if ([102, 104].indexOf(Number(providerId)) < 0) return null;
    ["rewardTopThree", "rewardTopTwo", "rewardBottomTwo", "rewardFour", "rewardSix"].forEach(function (k) {
      if (c[k] >= 50) c[k] = Math.round(c[k] * 0.95);
    });
    return c;
  };

  var customEdits = {}; // saved / restored in this page session
  M.saveCustomPrice = function (game, providerId, values) {
    customEdits[game.id + ":" + providerId] = values; // null = restored to the config
  };

  /* ---------- Provider cost (group_custom billing, non-owner providers) ---------- */
  var costOverrides = { "323:102": 90, "323:105": 92, "324:104": 180 };
  M.providerCost = function (game, providerId) {
    var c = M.configById(game.lottoConfigurationId);
    var o = costOverrides[game.id + ":" + providerId];
    return { configCostPrice: c && c.costPrice != null ? c.costPrice : null, providerOverride: o != null ? { costPrice: o } : null };
  };
  M.saveProviderCost = function (game, providerId, cost) {
    if (cost == null) delete costOverrides[game.id + ":" + providerId];
    else costOverrides[game.id + ":" + providerId] = cost;
  };

  /* ---------- Limit number sets (limit templates) + which ones a game uses ---------- */
  // Bet types in a limit number set (limit-template basePrices) and payout steps by amount bet
  var BET = ["Three top", "Three front", "Three back", "Three flip", "Three under", "Two top", "Two under", "Two flip", "Run top", "Run under"];
  var STEPS = [[100], [100, 50], [100, 70, 50], [100, 80, 60, 30]]; // 1 to 4 ranges: some tables are long
  function rules(scale, seed) {
    return BET.map(function (b, i) {
      var limit = Math.round((i < 5 ? 5000 : i < 8 ? 20000 : 50000) * scale);
      var steps = STEPS[(i + seed) % STEPS.length];
      var size = Math.round(limit / steps.length);
      return { betType: b, limit: limit, ranges: steps.map(function (pct, k) {
        return { min: k * size + 1, max: k === steps.length - 1 ? limit : (k + 1) * size, percent: pct };
      }) };
    });
  }
  // "Set interesting limit number": a list of numbers with their own limit and steps, for some bet types
  // [numbers, bet types, limit, steps]
  var SPECIAL = {
    std: [[["123", "321"], ["Three top", "Three flip"], 500, [100, 50]], [["99", "00"], ["Two top", "Two under"], 2000, [100, 60, 20]]],
    tight: [[["000"], ["Three top"], 200, [100]]],
    siam: [[["168", "888"], ["Three top"], 300, [100, 50]], [["88"], ["Two top", "Run top"], 1000, [100]]],
    lucky: [[["777"], ["Three top", "Three front", "Three back"], 100, [100, 70, 40, 10]]],
    vip: [[["999"], ["Three top"], 400, [100, 50]]],
    holiday: [[["555", "5"], ["Three top", "Run top", "Run under"], 250, [100, 50]], [["55"], ["Two under"], 1500, [100]]],
  };
  // [name, providerId|null (null = global), scale, special key]
  var LT = [
    ["Standard limits", null, 1, "std"],
    ["Tight limits", null, 0.5, "tight"],
    ["High roller", null, 2, null],
    ["Siam 88 house rules", 102, 0.8, "siam"],
    ["Mekong Play weekends", 104, 1.2, null],
    ["Lucky Star special draw", 103, 0.6, "lucky"],
    ["North Star default", 106, 1, null],
    ["Royal Tiger VIP", 107, 1.5, "vip"],
    ["Holiday draw", null, 0.7, "holiday"],
  ];
  // Special numbers are one entry per number (useStepper SpecialLimit: { number, types, limit, ranges }).
  // Bet types a number can use depend on its digits (LimitSpecialForm getCheckboxesForNumber).
  var BY_DIGITS = { 1: ["Run top", "Run under"], 2: ["Two top", "Two under", "Two flip"], 3: ["Three top", "Three under", "Three front", "Three flip"] };
  M.SPECIAL_TYPES = BY_DIGITS;
  M.LIMIT_BET_TYPES = BET;
  M.limitTemplates = LT.map(function (t, i) {
    var special = [];
    (SPECIAL[t[3]] || []).forEach(function (s) {
      var size = Math.round(s[2] / s[3].length);
      s[0].forEach(function (num) {
        special.push({ number: num, betTypes: s[1].filter(function (b) {
          return BY_DIGITS[num.length].indexOf(b) > -1;
        }), limit: s[2], ranges: s[3].map(function (pct, k) {
          return { min: k * size + 1, max: k === s[3].length - 1 ? s[2] : (k + 1) * size, percent: pct };
        }) });
      });
    });
    var created = NOW - (300 - i * 21) * DAY - i * 41 * 6e4;
    return { id: 401 + i, name: t[0], providerId: t[1], rules: rules(t[2], i), special: special,
      createdAt: created, updatedAt: created + (i % 3 ? (9 + i * 6) * DAY : 0) };
  });
  // The provider's active set (provider size template → limitTemplate; the list's "Active Template")
  M.activeLimitTemplateId = function (providerId) {
    var own = M.limitTemplates.filter(function (t) {
      return t.providerId === Number(providerId);
    })[0];
    if (own) return own.id;
    return Number(providerId) % 4 === 0 ? 403 : Number(providerId) % 7 === 0 ? null : 401; // null = "No default"
  };
  M.limitTemplate = function (id) {
    return M.limitTemplates.filter(function (t) {
      return t.id === Number(id);
    })[0];
  };
  // useGetGameLimitTemplate(gameId): the sets a game uses, per scope
  var assigned = {};
  M.gameLimitTemplates = function (gameId) {
    if (!assigned[gameId]) {
      assigned[gameId] = gameId % 4 === 3 ? [] : [
        { id: gameId * 10 + 1, templateId: 401, isActive: true },
        { id: gameId * 10 + 2, templateId: 402, isActive: false },
        { id: gameId * 10 + 3, templateId: 404, isActive: true },
      ];
    }
    return assigned[gameId];
  };
  // useGetLimitRound(roundId): every limit set with its on/off state for that round
  var roundSets = {};
  M.roundLimitTemplates = function (roundId) {
    if (!roundSets[roundId]) {
      roundSets[roundId] = M.limitTemplates.map(function (t, i) {
        return { id: t.id, name: t.name, providerId: t.providerId, isActive: roundId % 5 === 0 ? false : i === 0 || i === 3 };
      });
    }
    return roundSets[roundId];
  };

  M.addGameLimitTemplates = function (gameId, templateIds) {
    var list = M.gameLimitTemplates(gameId);
    templateIds.forEach(function (tid, i) {
      list.push({ id: Date.now() + i, templateId: Number(tid), isActive: false });
    });
  };

  /* ---------- Set lottery number limits (group limit templates) + game assignment ---------- */
  // [name, providerId (owners only; null = global), active, dup per player, lines per player, provider dup per round]
  var GLT = [
    ["system_default", null, true, 5, 50, 200], // seeded; the app checks this exact name (can't delete)
    ["Lucky Star standard", 103, true, 3, 30, 120],
    ["Lucky Star big draw", 103, false, 5, 60, 300],
    ["Golden Dragon standard", 101, true, 4, 40, 150],
    ["Golden Dragon strict", 101, false, 2, 20, 80],
    ["Royal Tiger standard", 107, true, 4, 40, 160],
  ];
  M.groupLimitTemplates = GLT.map(function (t, i) {
    var created = NOW - (240 - i * 27) * DAY - i * 37 * 6e4;
    return { id: 501 + i, name: t[0], providerId: t[1], type: t[1] ? "local" : "global", isActive: t[2],
      maxDuplicateNumberPerPlayer: t[3], maxBetNumberPerPlayer: t[4], maxProviderDuplicateNumberPerRound: t[5],
      createdAt: created, updatedAt: created + (i % 2 ? (14 + i * 9) * DAY : 0) };
  });
  M.groupLimitTemplate = function (id) {
    var t = M.groupLimitTemplates.filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return t ? JSON.parse(JSON.stringify(t)) : null;
  };
  // Games a template is assigned to (blocks delete: "cannotDeleteAssigned")
  M.groupLimitGames = function (templateId) {
    return Object.keys(groupAssign).filter(function (k) {
      return groupAssign[k] === Number(templateId);
    }).map(function (k) {
      var parts = k.split(":");
      return { game: M.game(parts[0]), providerId: Number(parts[1]) };
    });
  };
  var groupAssign = { "323:101": 505, "324:103": 502 };
  M.groupLimitAssignment = function (gameId, providerId) {
    var id = groupAssign[gameId + ":" + providerId];
    return id ? M.groupLimitTemplates.filter(function (t) {
      return t.id === id;
    })[0] : null;
  };
  M.setGroupLimitAssignment = function (gameId, providerId, templateId) {
    if (templateId) groupAssign[gameId + ":" + providerId] = templateId;
    else delete groupAssign[gameId + ":" + providerId];
  };

  M.config = function (id) {
    var c = M.configs.filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return c ? Object.assign({}, c) : null;
  };
})(window.DS);
