/* ==========================================================================
   Mock data: users, user groups, players (Phase 11). Needs mock/providers.js first.
   Shapes: src/types/userTypes (User: id, name, email, groups, providers), userGroupTypes,
   playerTypes (Player: username, displayName, balance, session { ipAddress, userAgent }).
   Deterministic. 11a uses provider users + players; 11c adds the global users list.
   ========================================================================== */
(function (DS) {
  var M = (DS.mock = DS.mock || {});
  var DAY = 864e5;
  var NOW = DS.fmt.now;

  // The real groups (names + descriptions from the live app, shared by the user 2026-10-01). Names are kept as
  // stored (camelCase, mixed case); descriptions can be empty, repeat the name, or be long. Two long ones were cut
  // off in the screenshot, so their endings are guessed.
  M.userGroups = [
    { id: 1, name: "admin", description: "Administrator" },
    { id: 2, name: "dev", description: "developer access" },
    { id: 3, name: "operator", description: "Operator Permissions" },
    { id: 4, name: "supervisor", description: "Supervisor" },
    { id: 5, name: "BillingAdmin", description: "ability to edit and delete billing" },
    { id: 6, name: "MultipleProviders", description: "this permission is for multiple providers" },
    { id: 7, name: "operatorNoBilling", description: "operator no billing menu" },
    { id: 8, name: "ticketAssist", description: "ticketAssist" },
    { id: 9, name: "operatorSuperAdmin", description: "This operator will function similarly to the admin, for the providers it's given" },
    { id: 10, name: "read-only", description: "" },
  ];

  /* ---------- Users of a provider (useGetUsers({ filter: { providerId } })) ---------- */
  var ROLES = [["Admin", 3], ["Finance", 5], ["Support", 8], ["Viewer", 10]];
  var providerUsers = {};
  M.providerUsers = function (providerId) {
    var pid = Number(providerId);
    if (providerUsers[pid]) return providerUsers[pid];
    var p = M.providers.filter(function (x) {
      return x.id === pid;
    })[0];
    var slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    var n = 2 + (pid % 3);
    providerUsers[pid] = ROLES.slice(0, n).map(function (r, i) {
      var created = p.createdAt + (i * 11 + 2) * DAY;
      return {
        id: 5000 + (pid - 101) * 4 + i,
        name: r[0] + " " + p.prefixCode,
        email: r[0].toLowerCase() + "@" + slug + ".com",
        groups: [r[1]],
        providers: [pid],
        createdAt: created,
        updatedAt: Math.min(NOW, created + (i % 2 ? 40 * DAY : 0)),
      };
    });
    return providerUsers[pid];
  };
  M.providerUser = function (providerId, userId) {
    var u = M.providerUsers(providerId).filter(function (x) {
      return String(x.id) === String(userId);
    })[0];
    return u ? JSON.parse(JSON.stringify(u)) : null;
  };

  /* ---------- Permissions (11c; Permission { id, name, slug }) ----------
     Slugs are the real ACL actions used in src (page .acl, nav, usePermission(base) → base.create /
     read / update / delete). Grouped into areas for the user group grid; the API returns a flat list. */
  // [section, area label, slug base, verbs (r c u d), extras [[slug, label]]]
  var AREAS = [
    ["Overview", "Dashboard", "dashboard", "r", []],
    ["Overview", "Provider activity", "activity.dashboard", "r", []],
    ["Providers", "Providers", "provider", "rcud", []],
    ["Providers", "Provider users", "provider.user", "rcud", []],
    ["Providers", "Players", "provider.player", "r", []],
    ["Providers", "Provider groups", "providerGroups", "rcud", [["providerGroups.generate_api_key", "API key"]]],
    ["Providers", "Provider sizes", "providerSize", "rcud", []],
    ["Lotto setup", "Configs", "lotto.configuration", "rcud", []],
    ["Lotto setup", "Lotto groups", "lotto.group", "rcud", []],
    ["Lotto setup", "Games", "lotto.game", "rcud", [["lotto.game.custom_price.view", "Custom price"], ["lotto.game.provider_sort.view", "Game sort"]]],
    ["Lotto setup", "Provider cost", "lotto.provider_game_cost", "", [["lotto.provider_game_cost.view", "View"]]],
    ["Lotto setup", "Game blacklist", "lotto.blackListGame", "r", []],
    ["Lotto setup", "Round schedules", "lotto.round.schedule", "rcu", []],
    ["Lotto setup", "Rounds", "lotto.round", "rcu", [["lotto.round.limit_numbers", "Limit numbers"]]],
    ["Lotto setup", "Yeekee rounds", "lotto.yeekee", "r", []],
    ["Lotto setup", "Yeekee bonus config", "lotto.yeekeeConfig", "rcud", []],
    ["Limits & credit", "Limit number sets", "lotto.limit_number", "rcud", []],
    ["Limits & credit", "Credit transaction types", "lotto.credit_transaction_type", "rcu", []],
    ["Limits & credit", "Credit transfer types", "lotto.credit_transaction_transfer_type", "rcu", []],
    ["Limits & credit", "Credit transactions", "lotto.credit_transaction", "r", []],
    ["Tickets", "Tickets", "lotto.bet_ticket", "r", [["lotto.bet_ticket.details.read", "Details"]]],
    ["Tickets", "Ticket summary", "lotto.bet_ticket_summary", "r", [["lotto.bet_ticket_summary.by_bet_type.read", "By bet type"]]],
    ["Admin", "Billing", "lotto.billing", "rud", []], // update / delete inferred from BillingAdmin's description
    ["Admin", "Users", "user", "rcud", []],
    ["Admin", "User groups", "group", "rcud", []],
    ["Admin", "Currencies", "currency", "rcu", []],
    ["Admin", "Languages", "language", "rcu", []],
    ["Admin", "Sync sites", "sync.sites", "r", []],
    ["Admin", "Settings", "settings", "r", []],
  ];
  var VERB = { r: "read", c: "create", u: "update", d: "delete" };
  // verbs are listed in r c u d order in AREAS; "rud" = read, update, delete
  // A few slugs differ from base.verb in the app (currency.edit, providerSize.view)
  var ODD = { "currency.update": "currency.edit", "providerSize.read": "providerSize.view" };
  var title = function (slug) {
    return slug.split(/[._]/).map(function (w, i) {
      w = w.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
      return i ? w : w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");
  };
  M.permissions = [];
  M.permissionAreas = AREAS.map(function (a) {
    var cells = {};
    a[3].split("").forEach(function (v) {
      var slug = a[2] + "." + VERB[v];
      slug = ODD[slug] || slug;
      var p = { id: M.permissions.length + 1, slug: slug, name: title(slug) };
      M.permissions.push(p);
      cells[VERB[v]] = p.id;
    });
    var extras = a[4].map(function (x) {
      var p = { id: M.permissions.length + 1, slug: x[0], name: title(x[0]) };
      M.permissions.push(p);
      return { label: x[1], id: p.id };
    });
    return { section: a[0], label: a[1], base: a[2], cells: cells, extras: extras };
  });
  var bySlug = function (test) {
    return M.permissions.filter(function (p) {
      return test(p.slug);
    }).map(function (p) {
      return p.id;
    });
  };

  /* ---------- User groups as records (UserGroup { name, description, permissions }) ---------- */
  var isRead = function (s) {
    return /\.(read|view)$/.test(s);
  };
  var GROUP_PERMS = {
    1: bySlug(function () {
      return true;
    }),
    2: bySlug(function () {
      return true;
    }),
    3: bySlug(function (s) {
      return !/^(user|group)\./.test(s) && !/\.delete$/.test(s);
    }),
    4: bySlug(function (s) {
      return isRead(s) || /^lotto\.round\.update$|^lotto\.round\.limit_numbers$/.test(s);
    }),
    5: bySlug(function (s) {
      return /^(dashboard|lotto\.billing|lotto\.credit_transaction\.)/.test(s);
    }),
    6: bySlug(function (s) {
      return isRead(s) && /^(dashboard|provider|lotto\.bet_ticket)/.test(s);
    }),
    7: bySlug(function (s) {
      return !/^(user|group|lotto\.billing)\./.test(s) && !/\.delete$/.test(s);
    }),
    8: bySlug(function (s) {
      return /^(lotto\.bet_ticket|provider\.player|provider\.read)/.test(s);
    }),
    9: bySlug(function (s) {
      return !/^(user|group)\.(create|delete)$/.test(s);
    }),
    10: bySlug(isRead),
  };
  M.userGroups.forEach(function (g, i) {
    g.permissions = GROUP_PERMS[g.id];
    g.createdAt = NOW - (500 - i * 30) * DAY;
    g.updatedAt = g.createdAt + (i % 2 ? 60 * DAY : 0);
  });
  M.userGroup = function (id) {
    var g = M.userGroups.filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return g ? JSON.parse(JSON.stringify(g)) : null;
  };

  /* ---------- All users (11c; useGetUsers with an optional provider filter) ----------
     Admin users have no providers (the app treats providers.length === 0 as "sees everything"). */
  var ADMINS = [["Super Admin", "superadmin@rb7.example", [1]], ["Nok Operations", "nok@rb7.example", [3]], ["Ploy Finance", "ploy@rb7.example", [5]],
    ["Tum Support", "tum@rb7.example", [8]], ["Bee Support", "bee@rb7.example", [8]], ["Dev Team", "dev@rb7.example", [2]], ["Auditor", "audit@rb7.example", [10]]];
  var allUsers = null;
  M.users = function () {
    if (allUsers) return allUsers;
    allUsers = ADMINS.map(function (a, i) {
      var created = NOW - (700 - i * 40) * DAY;
      return { id: 1 + i, name: a[0], email: a[1], groups: a[2], providers: [], createdAt: created, updatedAt: created + i * 20 * DAY };
    });
    M.providers.slice(0, 10).forEach(function (p) {
      allUsers = allUsers.concat(M.providerUsers(p.id));
    });
    // one person who works for two providers
    allUsers[8] = Object.assign({}, allUsers[8], { providers: [101, 102], groups: allUsers[8].groups.concat([6]) });
    return allUsers;
  };
  M.user = function (id) {
    var u = M.users().filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return u ? JSON.parse(JSON.stringify(u)) : null;
  };

  /* ---------- Players of a provider (useGetPlayers(providerId)) ---------- */
  var NAMES = ["somchai", "ploy", "lucky7", "kittisak", "bee", "jaidee", "tum", "arunee", "boss", "pond", "fon", "nut", "golf", "mai", "ohm"];
  var AGENTS = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  ];
  var players = {};
  M.providerPlayers = function (providerId) {
    var pid = Number(providerId);
    if (players[pid]) return players[pid];
    var p = M.providers.filter(function (x) {
      return x.id === pid;
    })[0];
    var n = p.hasPlayers ? 18 + (pid % 5) * 7 : 0;
    var out = [];
    for (var i = 0; i < n; i++) {
      var base = NAMES[(i * 7 + pid) % NAMES.length];
      var created = NOW - (300 - i * 6) * DAY - (i * 97 % 600) * 6e4;
      out.push({
        id: 70000 + (pid - 101) * 100 + i,
        username: p.prefixCode.toLowerCase() + "_" + base + (i + 10),
        displayName: base.charAt(0).toUpperCase() + base.slice(1) + " " + (i + 10),
        balance: i % 9 === 4 ? 0 : Math.round((((i * 7919 + pid) % 5000) * 13.7 + 50) * 100) / 100,
        session: i % 11 === 6 ? null : { ipAddress: "171.97." + ((i * 13 + pid) % 255) + "." + ((i * 29) % 255), userAgent: AGENTS[i % 3] },
        createdAt: created,
        updatedAt: Math.min(NOW, created + (i % 4) * 9 * DAY),
      });
    }
    players[pid] = out;
    return out;
  };
  M.providerPlayer = function (providerId, playerId) {
    return M.providerPlayers(providerId).filter(function (x) {
      return String(x.id) === String(playerId);
    })[0] || null;
  };
})(window.DS);
