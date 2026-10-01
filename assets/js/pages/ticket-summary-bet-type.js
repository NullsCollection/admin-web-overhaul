/* ==========================================================================
   Summary by bet type (Phase 10b).
   Source: src/views/pages/bet-ticket/summary-by-bet-type/{index,SummaryByType,SummaryByTypeAndNumber}.tsx
     FilterTextField + Apply: Ticket ID, Provider (one), Username, Lotto game, Close at (round: latest
       rounds of the game, "DD/MM/YYYY HH:mm — <provider>", depends on the game), Status; Apply only
       when game + round are set (validateApply); no date filter (commented out in the app)
     until then: info alert "Please select game and round to view data" over two empty sections
     SummaryByType: a card per bet type (bet amount, maximum reward paid, bet count), click = select
       (2px primary border, hover lift + shadow); auto-selects bet_two_under, else the first type
     SummaryByTypeAndNumber (for the selected type): search number, sort by number / bet amount /
       total reward / bet count, 50 per page; total reward red when > bet amount, else green;
       bet_three_tod: rows grouped by the smallest flip, expandable to every flip with its numbers
     Refresh button refetches both
   Changes: filters in the open, applied as they change; the round picker unlocks once a game is
   picked; an empty state that says what to do instead of an alert over empty tables; bet type
   cards as a radio group (keyboard, no lift / shadow); reward in ink, red only when it's more than
   was bet ("pays more than bet"); TOD flips in a dialog (the list engine has no expanding rows,
   same call as current bet).
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var L = DS.lotto;
  var M = DS.mock;
  var T = DS.tickets;
  var $ = function (id) {
    return document.getElementById(id);
  };

  /* ---------- Bet types per game type (common:betType labels) ---------- */
  var TYPES = {
    default: ["bet_three_top", "bet_three_tod", "bet_three_front", "bet_three_under", "bet_two_top", "bet_two_under", "bet_run_top", "bet_run_bottom"],
    stock: ["bet_three_top", "bet_three_tod", "bet_two_top", "bet_two_under", "bet_run_top", "bet_run_bottom"],
    yeekee: ["bet_three_top", "bet_three_tod", "bet_two_top", "bet_two_under", "bet_run_top", "bet_run_bottom"],
  };
  var games = M.games.filter(function (g) {
    return TYPES[g.type];
  });
  var label = function (t) {
    var s = T.betType[t] || t;
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  /* ---------- Filters ---------- */
  $("f-game").innerHTML = '<option value="">Pick a game</option>' + M.groups.map(function (grp) {
    var gs = games.filter(function (g) {
      return g.lottoGroupId === grp.id;
    });
    return gs.length ? '<optgroup label="' + esc(L.name(grp.translations)) + '">' + gs.map(function (g) {
      return '<option value="' + g.id + '">' + esc(L.name(g.translations)) + "</option>";
    }).join("") + "</optgroup>" : "";
  }).join("");
  $("f-provider").innerHTML = '<option value="all">All providers</option>' + M.providers.slice(0, 8).map(function (p) {
    return '<option value="' + p.id + '">' + esc(p.name) + " (" + esc(p.prefixCode) + ")</option>";
  }).join("");

  // useGetLatestRounds(gameId, providerId): rounds of the game that already closed, newest first
  function roundsFor(gameId) {
    return M.rounds().filter(function (r) {
      return String(r.lottoGameId) === String(gameId) && r.closeAt <= fmt.now;
    }).slice(0, 8);
  }
  function fillRounds() {
    var gid = $("f-game").value;
    var sel = $("f-round");
    if (!gid) {
      sel.innerHTML = '<option value="">Pick a game first</option>';
      sel.disabled = true;
      return;
    }
    var rs = roundsFor(gid);
    sel.disabled = !rs.length;
    sel.innerHTML = rs.length
      ? '<option value="">Pick a round</option>' + rs.map(function (r) {
          return '<option value="' + r.id + '">' + fmt.dateTime(r.closeAt) + "</option>"; // round ID is in the subtitle
        }).join("")
      : '<option value="">No closed rounds yet</option>';
  }
  function read() {
    return {
      game: $("f-game").value, round: $("f-round").value, provider: $("f-provider").value,
      ticket: $("f-ticket").value.trim(), user: $("f-user").value.trim(), status: $("f-status").value,
    };
  }

  /* ---------- Pretend server ---------- */
  function rnd(seed) {
    var x = seed % 2147483647 || 1;
    return function () {
      x = (x * 48271) % 2147483647;
      return x / 2147483647;
    };
  }
  var cache = {};
  function numbersFor(f, type) {
    var key = f.round + type + f.provider + f.ticket + f.user + f.status;
    if (cache[key]) return cache[key];
    var r = rnd(Number(f.round) * 31 + type.split("").reduce(function (a, c) {
      return a * 31 + c.charCodeAt(0);
    }, 7) % 100003 + (f.provider === "all" ? 0 : Number(f.provider)) + f.status.length * 13);
    var digits = type.indexOf("three") > -1 ? 3 : type.indexOf("two") > -1 ? 2 : 1;
    var space = Math.pow(10, digits);
    var n = digits === 1 ? 10 : Math.round((digits === 3 ? 140 : 70) * (f.provider === "all" ? 1 : 0.4) * (f.status === "all" ? 1 : 0.5) * (f.ticket || f.user ? 0.05 : 1)) + 1;
    var rate = { bet_three_top: 900, bet_three_tod: 150, bet_three_front: 450, bet_three_under: 450, bet_two_top: 90, bet_two_under: 90, bet_run_top: 3.2, bet_run_bottom: 4.2 }[type];
    var seen = {};
    var out = [];
    for (var i = 0; i < n * 3 && out.length < Math.min(n, space); i++) {
      var num = String(Math.floor(r() * space)).padStart(digits, "0");
      if (seen[num]) continue;
      seen[num] = 1;
      var count = 1 + Math.floor(r() * r() * 40);
      var amount = Math.round(count * (20 + r() * 180)) ;
      var won = r() < (digits === 1 ? 0.25 : digits === 2 ? 0.03 : 0.012);
      out.push({ bet_number: num, bet_amount: amount, bet_count: count, total_reward_amount: won ? Math.round(amount * rate) : 0 });
      // 3 tod: players often bet a number and its flips, so some flips show up together
      if (type === "bet_three_tod" && r() < 0.45) {
        var f2 = flips(num)[Math.floor(r() * flips(num).length)];
        if (!seen[f2]) {
          seen[f2] = 1;
          out.push({ bet_number: f2, bet_amount: Math.round(amount * (0.3 + r())), bet_count: Math.max(1, Math.round(count / 2)), total_reward_amount: 0 });
        }
      }
    }
    cache[key] = out;
    return out;
  }
  function byType(f) {
    var g = games.filter(function (x) {
      return String(x.id) === f.game;
    })[0];
    return TYPES[g.type].map(function (t) {
      var nums = numbersFor(f, t);
      var sum = function (k) {
        return nums.reduce(function (a, x) {
          return a + x[k];
        }, 0);
      };
      return { type: t, bet_amount: sum("bet_amount"), bet_count: sum("bet_count"), reward_paid: sum("total_reward_amount"),
        max_reward_amount: nums.reduce(function (a, x) {
          return Math.max(a, x.total_reward_amount);
        }, 0) };
    });
  }

  /* ---------- 3 tod: group flips under the smallest one (getCanonicalForm) ---------- */
  function flips(num) {
    if (num.length !== 3) return [num];
    var d = num.split("");
    var set = {};
    [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].forEach(function (o) {
      set[d[o[0]] + d[o[1]] + d[o[2]]] = 1;
    });
    return Object.keys(set).sort();
  }
  function groupTod(items) {
    var groups = {};
    items.forEach(function (x) {
      var c = flips(x.bet_number)[0];
      (groups[c] = groups[c] || []).push(x);
    });
    return Object.keys(groups).map(function (c) {
      var g = groups[c];
      return { bet_number: c, flips: flips(c), items: g,
        bet_amount: g.reduce(function (a, x) {
          return a + x.bet_amount;
        }, 0),
        bet_count: g.reduce(function (a, x) {
          return a + x.bet_count;
        }, 0),
        total_reward_amount: g.reduce(function (a, x) {
          return a + x.total_reward_amount;
        }, 0) };
    });
  }
  var byNumber = function (a, b) {
    return a.bet_number.length - b.bet_number.length || Number(a.bet_number) - Number(b.bet_number);
  };

  /* ---------- Bet type cards (radio group) ---------- */
  var state = { f: null, types: [], selected: null, rows: [] };
  function cardsHTML() {
    return state.types.map(function (t) {
      var on = t.type === state.selected;
      return '<button type="button" class="type-card' + (on ? " is-selected" : "") + '" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) +
        '" data-type="' + t.type + '"><span class="type-card__title">' + esc(label(t.type)) + (on ? '<iconify-icon icon="tabler:circle-check-filled"></iconify-icon>' : "") + "</span>" +
        '<span class="type-card__value">' + fmt.moneyHTML(t.bet_amount) + '</span><span class="type-card__label">bet</span>' +
        '<dl class="type-card__facts"><div><dt>Max reward paid</dt><dd>' + fmt.money(t.max_reward_amount) + "</dd></div>" +
        "<div><dt>Bets</dt><dd>" + fmt.int(t.bet_count) + "</dd></div></dl></button>";
    }).join("");
  }
  function select(type, focus) {
    state.selected = type;
    $("type-cards").innerHTML = cardsHTML();
    if (focus) $("type-cards").querySelector('[data-type="' + type + '"]').focus();
    var items = numbersFor(state.f, type).slice().sort(byNumber);
    state.rows = type === "bet_three_tod" ? groupTod(items).sort(byNumber) : items;
    $("numbers-title").textContent = label(type) + " numbers";
    $("numbers-sub").textContent = type === "bet_three_tod"
      ? "Flips of the same number are added up under the smallest one. Open a row to see each flip."
      : "Every number bet on in this round, with what it paid.";
    list.setMode("data");
  }
  $("type-cards").addEventListener("click", function (e) {
    var b = e.target.closest("[data-type]");
    if (b) select(b.getAttribute("data-type"), true);
  });
  $("type-cards").addEventListener("keydown", function (e) {
    var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    var i = state.types.map(function (t) {
      return t.type;
    }).indexOf(state.selected);
    var next = state.types[(i + keys[e.key] + state.types.length) % state.types.length];
    select(next.type, true);
  });

  /* ---------- Numbers table ---------- */
  var reward = function (r) {
    var more = r.total_reward_amount > r.bet_amount;
    return (more ? '<span class="t-error t-medium">' : "<span>") + fmt.money(r.total_reward_amount) + "</span>" +
      (more ? '<span class="cell-sub">pays more than bet</span>' : "");
  };
  var list = DS.list.create({
    root: $("numbers-card"),
    noun: ["number", "numbers"],
    pageSize: 50,
    rows: function () {
      return state.rows;
    },
    search: function (r) {
      return r.flips ? r.flips.join(" ") : r.bet_number;
    },
    filters: {},
    columns: [
      { key: "bet_number", label: "Number", sortValue: function (r) {
        return Number(r.bet_number) + r.bet_number.length * 1e4;
      }, render: function (r) {
        return '<span class="bet-number">' + esc(r.bet_number) + "</span>" +
          (r.flips && r.flips.length > 1 ? '<span class="cell-sub">+ ' + (r.flips.length - 1) + (r.flips.length === 2 ? " flip" : " flips") + "</span>" : "");
      } },
      { key: "bet_amount", label: "Bet amount", num: true, render: function (r) {
        return fmt.money(r.bet_amount);
      } },
      { key: "total_reward_amount", label: "Total reward", num: true, render: reward },
      { key: "bet_count", label: "Bets", num: true, render: function (r) {
        return fmt.int(r.bet_count);
      } },
    ],
    rowName: function (r) {
      return "number " + r.bet_number;
    },
    showActions: function () {
      return state.selected === "bet_three_tod";
    },
    actions: function (r) {
      return r.flips && r.flips.length > 1 ? [{ label: "View flips", icon: "tabler:arrows-shuffle", action: "flips", kind: "view" }] : [];
    },
    onAction: function (a, r) {
      showFlips(r);
    },
    empty: { icon: "tabler:list-numbers", title: "No bets of this type", text: "Nobody bet on this type in this round." },
    noResults: { icon: "tabler:search", title: "Nobody bet on that number", text: "Try another number." },
  });
  function showFlips(r) {
    DS.dialog.open({
      icon: "tabler:arrows-shuffle", tone: "primary", wide: true,
      title: "Flips of " + r.bet_number,
      html: "Each order of the digits, with what was bet on it. The table row adds them up.",
      body: '<div class="table-wrap"><table class="table table--compact table--inset"><thead><tr><th scope="col">Number</th><th scope="col" class="is-num">Bet amount</th>' +
        '<th scope="col" class="is-num">Total reward</th><th scope="col" class="is-num">Bets</th></tr></thead><tbody>' +
        r.flips.map(function (n) {
          var x = r.items.filter(function (i) {
            return i.bet_number === n;
          })[0] || { bet_number: n, bet_amount: 0, total_reward_amount: 0, bet_count: 0 };
          return '<tr><td><span class="bet-number">' + n + '</span></td><td class="is-num">' + (x.bet_amount ? fmt.money(x.bet_amount) : '<span class="t-faint">–</span>') +
            '</td><td class="is-num">' + (x.total_reward_amount ? reward(x) : '<span class="t-faint">–</span>') + '</td><td class="is-num">' + (x.bet_count || '<span class="t-faint">–</span>') + "</td></tr>";
        }).join("") + "</tbody></table></div>",
      actions: [{ label: "Close", variant: "outlined", autofocus: true }],
    });
  }

  /* ---------- Fetch cycle ---------- */
  var mode = "data";
  var timer = 0;
  function skeleton() {
    $("type-cards").innerHTML = new Array(7).join('<div class="type-card type-card--loading"><span class="skeleton skeleton--text" style="--w:50%"></span>' +
      '<span class="skeleton skeleton--value" style="--w:80%"></span><span class="skeleton skeleton--text" style="--w:100%"></span></div>');
    list.setMode("loading");
  }
  function changed() {
    var f = read();
    var ready = f.game && f.round;
    $("f-clear").hidden = !f.game && f.provider === "all" && !f.ticket && !f.user && f.status === "all";
    $("sbt-pick").hidden = !!ready;
    $("sbt-body").hidden = !ready;
    $("sbt-refresh").hidden = !ready;
    $("sbt-error").hidden = true;
    if (!ready) {
      $("sbt-sub").textContent = "Pick a game and a round to see what was bet on it.";
      return;
    }
    var g = games.filter(function (x) {
      return String(x.id) === f.game;
    })[0];
    var rd = M.round(f.round);
    $("sbt-sub").textContent = L.name(g.translations) + ", round " + f.round + ", closed " + fmt.dateTime(rd.closeAt);
    skeleton();
    clearTimeout(timer);
    if (mode === "loading") return;
    timer = setTimeout(function () {
      if (mode === "error") {
        $("sbt-body").hidden = true;
        $("sbt-error").hidden = false;
        return;
      }
      state.f = f;
      state.types = byType(f);
      var keep = state.types.some(function (t) {
        return t.type === state.selected;
      });
      // Same default as the app: two bottom, else the first type
      select(keep ? state.selected : state.types.some(function (t) {
        return t.type === "bet_two_under";
      }) ? "bet_two_under" : state.types[0].type);
    }, 500);
  }
  $("f-game").addEventListener("change", function () {
    state.selected = null;
    fillRounds();
    changed();
  });
  ["f-round", "f-provider", "f-status"].forEach(function (id) {
    $(id).addEventListener("change", changed);
  });
  var debounce = 0;
  ["f-ticket", "f-user"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(changed, 350);
    });
  });
  $("f-clear").addEventListener("click", function () {
    ["f-game", "f-ticket", "f-user"].forEach(function (id) {
      $(id).value = "";
    });
    $("f-provider").value = "all";
    $("f-status").value = "all";
    fillRounds();
    changed();
  });
  $("sbt-refresh").addEventListener("click", function () {
    cache = {};
    changed();
  });
  $("sbt-retry").addEventListener("click", function () {
    mode = "data";
    DS.page.state = "data";
    if (DS.devbar) DS.devbar.render();
    changed();
  });

  /* ---------- Prototype states ---------- */
  var states = ["pick", "data", "tod", "loading", "error", "flips"];
  function pickRound(gid) {
    $("f-game").value = String(gid);
    fillRounds();
    $("f-round").value = $("f-round").options[1] ? $("f-round").options[1].value : "";
  }
  function setState(s) {
    DS.dialog.close();
    mode = s === "loading" || s === "error" ? s : "data";
    if (s === "pick") {
      $("f-game").value = "";
      fillRounds();
      return changed();
    }
    pickRound(309); // Hanoi normal
    if (s === "tod" || s === "flips") state.selected = "bet_three_tod";
    changed();
    if (s === "flips") setTimeout(function () {
      var r = state.rows.filter(function (x) {
        return x.flips && x.flips.length > 2 && x.items.length > 1;
      })[0] || state.rows[0];
      showFlips(r);
    }, 700);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
