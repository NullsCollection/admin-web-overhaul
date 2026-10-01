/* ==========================================================================
   Mock data: providers. Shared by pages/providers.js (list) and
   pages/provider-form.js (new/edit). Shapes follow src/types/providerTypes.
   Deterministic: same data on every load.
   ========================================================================== */
(function (DS) {
  var M = (DS.mock = DS.mock || {});

  M.currencies = [
    { id: 1, code: "THB", name: "Thai Baht" },
    { id: 2, code: "USD", name: "US Dollar" },
    { id: 3, code: "LAK", name: "Lao Kip" },
    { id: 4, code: "VND", name: "Vietnamese Dong" },
  ];
  M.languages = [
    { value: "th", label: "Thai" },
    { value: "en", label: "English" },
    { value: "lo", label: "Lao" },
    { value: "vi", label: "Vietnamese" },
    { value: "zh", label: "Chinese" },
    { value: "km", label: "Khmer" },
  ];
  M.providerSizes = [
    { value: "1", label: "Small" },
    { value: "2", label: "Medium" },
    { value: "3", label: "Large" },
    { value: "4", label: "Enterprise" },
  ];
  M.providerGroups = [
    { value: "1", label: "Thailand" },
    { value: "2", label: "Laos" },
    { value: "3", label: "Vietnam" },
    { value: "4", label: "VIP partners" },
  ];

  var NAMES = [
    ["Golden Dragon", "GD01"], ["Siam 88", "S88"], ["Lucky Star", "LS07"], ["Mekong Play", "MKP"],
    ["Chao Phraya Bet", "CPB"], ["North Star", "NS02"], ["Royal Tiger", "RT9"], ["Bangkok Lotto", "BKL"],
    ["Emerald Bay", "EMB"], ["Lanna Gaming", "LNG"], ["Andaman Win", "ADW"], ["Isan Fortune", "ISF"],
    ["Phoenix Asia", "PHX"], ["Jade Palace", "JDP"], ["Silver Moon", "SVM"], ["Red Lantern", "RDL"],
    ["Blue Ocean", "BLO"], ["Diamond Club", "DMC"], ["Saigon Star", "SGS"], ["Vientiane Play", "VTP"],
    ["Krungthep Win", "KTW"], ["Ayutthaya Gold", "AYG"], ["Pattaya Bay", "PTB"], ["Hanoi Lucky", "HNL"],
    ["Mountain King", "MTK"], ["Coral Reef", "CRF"], ["Elephant Gate", "ELG"], ["Orchid Garden", "ORG"],
    ["Sunrise Bet", "SRB"], ["Twin Rivers", "TWR"], ["White Lotus", "WHL"], ["Sapphire", "SPH"],
    ["Mango Tree", "MGT"], ["Rain Forest", "RNF"], ["Temple Run", "TPR"], ["Night Market", "NTM"],
    ["Silk Road", "SKR"],
  ];

  var t0 = new Date(2025, 0, 6).getTime();
  var today = new Date(2026, 8, 24).getTime();

  M.providers = NAMES.map(function (n, i) {
    var created = t0 + i * 9.3 * 864e5 + (i % 5) * 3.7e6;
    var updated = created + ((i * 7919) % 180) * 864e5 + (i % 7) * 5.1e6;
    return {
      id: 101 + i,
      name: n[0],
      prefixCode: n[1],
      currency: M.currencies[i % 7 === 3 ? 1 : i % 11 === 5 ? 2 : i % 13 === 8 ? 3 : 0],
      isEnable: i % 6 === 4 ? "no" : "yes",
      createdAt: created,
      updatedAt: Math.min(updated, today),
      hasPlayers: i % 3 !== 2, // server refuses to delete providers with players (422)
      isOwner: [101, 103, 107].indexOf(101 + i) > -1, // owners run Set lottery pricing (7d)
    };
  });

  function hex(seed, len) {
    var s = "";
    var x = seed;
    while (s.length < len) {
      x = (x * 16807) % 2147483647;
      s += x.toString(16);
    }
    return s.slice(0, len);
  }

  /* Full record for the edit page (useGetProvider(id)) */
  M.providerDetail = function (id) {
    var p = M.providers.filter(function (x) {
      return x.id === Number(id);
    })[0];
    if (!p) return null;
    var slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    var api = "https://api." + slug + ".com";
    var i = p.id - 101;
    return {
      id: p.id,
      name: p.name,
      prefixCode: p.prefixCode,
      currencyId: String(p.currency.id),
      languages: p.currency.code === "LAK" ? ["lo", "th", "en"] : p.currency.code === "VND" ? ["vi", "en"] : ["th", "en"],
      providerSizeTemplateId: String((i % 4) + 1),
      providerGroupId: p.currency.code === "LAK" ? "2" : p.currency.code === "VND" ? "3" : "1",
      remoteUrl: api,
      gameUrl: "https://play." + slug + ".com",
      contactUrl: "https://" + slug + ".com/contact",
      getBalanceUrl: api + "/wallet/balance",
      betUrl: api + "/wallet/bet",
      settleUrl: api + "/wallet/settle",
      rollbackSettleUrl: api + "/wallet/rollback-settle",
      cancelBetUrl: api + "/wallet/cancel-bet",
      isEnable: p.isEnable === "yes",
      isOwner: p.isOwner,
      keys: (function () {
        // keys are never older than the provider itself
        var rotated = Math.max(p.createdAt + 2 * 864e5, p.updatedAt - 20 * 864e5);
        return [
          { id: 900 + i * 3, signature: hex(p.id * 31, 64), status: "active", createdAt: rotated, updatedAt: rotated },
          { id: 899 + i * 3, signature: hex(p.id * 17, 64), status: "revoked", createdAt: p.createdAt, updatedAt: rotated },
        ];
      })(),
      users: [
        { id: 5000 + i * 3, name: "Admin " + p.prefixCode, email: "admin@" + slug + ".com" },
        { id: 5001 + i * 3, name: "Finance " + p.prefixCode, email: "finance@" + slug + ".com" },
        { id: 5002 + i * 3, name: "Support " + p.prefixCode, email: "support@" + slug + ".com" },
      ],
    };
  };

  M.hex = hex;

  /* Provider activity (useGetProviderActivities): this month's totals + last activity.
     status: ACTIVE | AT RISK (3–4 months) | WARNING (5–6) | CRITICAL (7–8) | SEVERE (9–12) */
  var DAY = 864e5;
  var INACTIVE = { 4: ["AT RISK", 104], 10: ["WARNING", 163], 16: ["CRITICAL", 221], 22: ["SEVERE", 297] };
  M.providerActivity = M.providers
    .map(function (p, i) {
      var inactive = INACTIVE[i];
      var lastAt = inactive ? today - inactive[1] * DAY - (i % 5) * 3.6e6 : today - ((i * 37) % 71) * 3.6e5 - (i % 4) * DAY;
      var tickets = inactive ? 0 : 180 + ((i * 7919) % 5200);
      return {
        id: p.id,
        providerName: p.name,
        prefixCode: p.prefixCode,
        status: inactive ? inactive[0] : "ACTIVE",
        lastActiveAt: lastAt,
        totalTicket: tickets,
        ticketCancelled: inactive ? 0 : Math.round(tickets * (0.004 + (i % 9) / 400)),
        profitAmount: inactive ? 0 : Math.round(tickets * (38 + (i % 13) * 6.5) * (i % 11 === 7 ? -0.35 : 1)),
      };
    })
    .sort(function (a, b) {
      return a.lastActiveAt - b.lastActiveAt; // default sort: least active first
    });

  /* ---------- Provider groups + sizes as records (11b). The { value, label } lists above stay for the
     provider form's selects; these carry the fields the group / size pages need. ---------- */
  var DAY = 864e5;
  // [name, protected, has api key]
  var GROUPS = [["Default", true, true], ["Thailand", false, true], ["Laos", false, true], ["Vietnam", false, false], ["VIP partners", false, true]];
  M.providerGroupList = GROUPS.map(function (g, i) {
    var created = t0 - (40 - i * 6) * DAY;
    return {
      id: i ? i : 9, // "Default" keeps its own id; the others match the provider form's group values 1–4
      name: g[0], isProtected: g[1], externalApiKey: g[2] ? hex(4111 * (i + 3), 48) : null,
      createdAt: created, updatedAt: created + (i % 2 ? (30 + i * 11) * DAY : 0),
    };
  });
  // provider count per group (from the provider form's group values)
  M.providersInGroup = function (groupId) {
    return M.providers.filter(function (p) {
      return M.providerDetail(p.id).providerGroupId === String(groupId);
    }).length;
  };
  // [name, description, limit template id]
  var SIZES = [["Small", "Up to 5,000 players", 402], ["Medium", "5,000 to 50,000 players", 401], ["Large", "50,000+ players", 403], ["Enterprise", "Custom contracts", 403]];
  M.providerSizeList = SIZES.map(function (z, i) {
    var created = t0 - (60 - i * 5) * DAY;
    return { id: i + 1, name: z[0], description: z[1], limitTemplateId: z[2], createdAt: created, updatedAt: created + (i % 2 ? 45 * DAY : 0) };
  });
  M.providersInSize = function (sizeId) {
    return M.providers.filter(function (p) {
      return M.providerDetail(p.id).providerSizeTemplateId === String(sizeId);
    }).length;
  };

  /* ---------- Currencies + languages as records (11d). M.currencies / M.languages above stay for selects. ----------
     Currency: { code (3 uppercase), name, betSetPrice: 4 amounts, minRunningBet } (src/types/currencyTypes) */
  var CUR = { THB: [[10, 20, 50, 100], 1], USD: [[1, 2, 5, 10], 0.1], LAK: [[5000, 10000, 20000, 50000], 1000], VND: [[10000, 20000, 50000, 100000], 1000] };
  M.currencyList = M.currencies.map(function (c, i) {
    var created = t0 - (90 - i * 9) * DAY;
    return { id: c.id, code: c.code, name: c.name, betSetPrice: CUR[c.code][0], minRunningBet: CUR[c.code][1],
      createdAt: created, updatedAt: created + (i % 2 ? 70 * DAY : 0) };
  });
  M.providersInCurrency = function (code) {
    return M.providers.filter(function (p) {
      return p.currency.code === code;
    }).length;
  };
  M.languageList = M.languages.map(function (l, i) {
    var created = t0 - (120 - i * 7) * DAY;
    return { id: i + 1, code: l.value, name: l.label, createdAt: created, updatedAt: created + (i % 3 ? 30 * DAY : 0) };
  });
})(window.DS);
