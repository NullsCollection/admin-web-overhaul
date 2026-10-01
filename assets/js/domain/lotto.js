/* ==========================================================================
   Lotto setup domain helpers: game types + which pay rates each type uses.
   Shared by config management (Phase 7a) and, later, games + custom price.
   Port: ConfigForm.tsx schema switch + config-form/*.tsx, lotto-game:*Lottery labels,
         lotto-config:reward* labels (sentence case, without the repeated "Reward").
   ========================================================================== */
(function (DS) {
  var L = (DS.lotto = {});

  /* Config / game type → label (lotto-game:generalLottery …). group_custom's app label is
     "Set Lottery"; the digit length decides which tiers apply. */
  L.types = [
    { value: "default", label: "General lottery" },
    { value: "stock", label: "Stock lottery" },
    { value: "group", label: "Set four lottery" },
    { value: "group_six", label: "Set six lottery" },
    { value: "group_custom", label: "Set lottery" },
  ];
  L.typeLabel = function (v) {
    var t = L.types.filter(function (x) {
      return x.value === v;
    })[0];
    return t ? t.label : v;
  };

  /* Pay-rate fields per type, in pairs (straight | flipped) so the 2-column grid reads
     across. `n` (group_custom only) = digit lengths where the tier can win. */
  L.payouts = {
    default: [
      { key: "rewardTopThree", label: "Top three" },
      { key: "rewardTopThreeFlip", label: "Top three (flipped)" },
      { key: "rewardBottomThree", label: "Bottom three" },
      { key: "rewardBottomThreeFront", label: "Front bottom three" },
      { key: "rewardTopTwo", label: "Top two" },
      { key: "rewardBottomTwo", label: "Bottom two" },
      { key: "rewardRunTop", label: "Top run" },
      { key: "rewardRunBottom", label: "Bottom run" },
    ],
    stock: [
      { key: "rewardTopThree", label: "Top three" },
      { key: "rewardTopThreeFlip", label: "Top three (flipped)" },
      { key: "rewardTopTwo", label: "Top two" },
      { key: "rewardBottomTwo", label: "Bottom two" },
      { key: "rewardRunTop", label: "Top run" },
      { key: "rewardRunBottom", label: "Bottom run" },
    ],
    group: [
      { key: "rewardFour", label: "Four" },
      { key: "rewardFourFlip", label: "Four (flipped)" },
      { key: "rewardTopThree", label: "Three" },
      { key: "rewardTopThreeFlip", label: "Three (flipped)" },
      { key: "rewardTopTwo", label: "Back two" },
      { key: "rewardTopTwoFront", label: "Front two" },
      { key: "rewardTopThreeFront", label: "Front three" },
    ],
    group_six: [
      { key: "rewardSix", label: "Six" },
      { key: "rewardTopFive", label: "Last five digits" },
      { key: "rewardTopFour", label: "Last four digits" },
    ],
    // SetGroupCustomConfigForm: full tier for N only, shared suffix/prefix tiers for all N.
    // Tiers that come and go with N sit at the end, so the pairs above never shift.
    group_custom: [
      { key: "rewardFour", label: "Four", n: [4] },
      { key: "rewardFourFlip", label: "Four (flipped)", n: [4] },
      { key: "rewardFive", label: "Five", n: [5] },
      { key: "rewardFiveFlip", label: "Five (flipped)", n: [5] },
      { key: "rewardSix", label: "Six", n: [6] },
      { key: "rewardSixFlip", label: "Six (flipped)", n: [6] },
      { key: "rewardTopThree", label: "Three" },
      { key: "rewardTopThreeFlip", label: "Three (flipped)" },
      { key: "rewardTopTwo", label: "Back two" },
      { key: "rewardTopTwoFront", label: "Front two" },
      { key: "rewardTopThreeFront", label: "Front three" },
      { key: "rewardTopFour", label: "Last four digits", n: [5, 6] },
      { key: "rewardTopFive", label: "Last five digits", n: [6] },
    ],
  };

  /* The pay rates that apply to one config (for summaries and tables) */
  L.payoutsFor = function (c) {
    return (L.payouts[c.type] || []).filter(function (p) {
      return !p.n || p.n.indexOf(Number(c.groupCustomDigitLength)) > -1;
    });
  };

  /* Game types = config types + two game-only ones (GameForm's type select). The app labels
     "default" as "Government Lottery" on games and "General Lottery" on configs; one label here. */
  L.gameTypes = L.types.concat([
    { value: "yeekee", label: "Yeekee lottery" },
    { value: "encrypt_game", label: "Encrypt game" },
  ]);
  L.gameTypeLabel = function (v) {
    var t = L.gameTypes.filter(function (x) {
      return x.value === v;
    })[0];
    return t ? t.label : v;
  };
  L.SET_TYPES = ["group", "group_six", "group_custom"]; // isTypeGroup: these have a set price

  /* Background images (src/components/FlagSelect imageList). Files are the real ones in
     public/images/flags; `bg_lotto_goverment.jpg` is misspelled on disk, keep it. */
  var FLAGS = [
    ["baac", "bg_lotto_baac"], ["corporate", "bg_lotto_corporate"], ["crypto", "bg_lotto_crypto"],
    ["government", "bg_lotto_goverment"], ["government_bank", "bg_lotto_government_bank"],
    ["government_bank_set", "bg_lotto_government_bank_set"], ["government_set", "bg_lotto_government_set"],
    ["hanoi", "bg_lotto_hanoi"], ["hanoi_special", "bg_lotto_hanoi_special"], ["hanoi_vip", "bg_lotto_hanoi_vip"],
    ["laostar", "bg_lotto_laostar"], ["laos_group_set", "bg_lotto_laos_group_set"], ["malaysia", "bg_lotto_malaysia"],
    ["aomsin", "bg_lotto_aomsin"], ["nikei_morning", "bg_lotto_nikei_morning"],
    ["china_afternoon", "bg_lotto_stock_china_afternoon"], ["china_morning", "bg_lotto_stock_china_morning"],
    ["downjones", "bg_lotto_stock_downjones"], ["egypt", "bg_lotto_stock_egypt"], ["england", "bg_lotto_stock_england"],
    ["german", "bg_lotto_stock_german"], ["hangseng", "bg_lotto_stock_hangseng"],
    ["hangseng_afternoon", "bg_lotto_stock_hangseng_afternoon"], ["hangseng_morning", "bg_lotto_stock_hangseng_morning"],
    ["india", "bg_lotto_stock_india"], ["japan", "bg_lotto_stock_japan"], ["korea", "bg_lotto_stock_korea"],
    ["lao", "bg_lotto_stock_lao"], ["lao_star", "bg_lotto_stock_lao_star"], ["malaysia_stock", "bg_lotto_stock_malaysia"],
    ["nikei_afternoon", "bg_lotto_stock_nikei_afternoon"], ["russia", "bg_lotto_stock_russia"],
    ["singapore", "bg_lotto_stock_singapore"], ["taiwan", "bg_lotto_stock_taiwan"], ["usa", "bg_lotto_stock_usa"],
    ["thaistock_afternoon", "bg_lotto_thaistock_afternoon"], ["thaistock_evening", "bg_lotto_thaistock_evening"],
    ["thaistock_morning", "bg_lotto_thaistock_morning"], ["thaistock_pm", "bg_lotto_thaistock_pm"],
    ["vietnam", "bg_lotto_vietnam"], ["yeekee", "bg_lotto_yeekee"], ["yeekeeVIP", "bg_lotto_yeekeeVIP"],
    ["yeekee_malta", "bg_lotto_yeekee_malta"], ["gsb", "bg_lotto_government_savings_bank"],
    ["thai_government_set", "bg_lotto_thai_government_set"],
  ];
  var FLAG_DIR = "../../../public/images/flags/"; // from ui/pages/
  // formatFlagName(): "hanoi_special" → "Hanoi special" (sentence case here). The values have
  // typos and acronyms, so the labels are fixed word by word (display only; values unchanged).
  var WORDS = { vip: "VIP", nikei: "Nikkei", downjones: "Dow Jones", laostar: "Lao star", laos: "Lao", gsb: "GSB",
    baac: "BAAC", german: "Germany", thaistock: "Thai stock", pm: "PM", yeekeevip: "Yeekee VIP",
    hangseng: "Hang Seng", usa: "USA", malta: "Malta" };
  // Stock backgrounds whose names clash with the lottery ones
  var NAMES = { lao: "Lao stock", lao_star: "Lao star stock" };
  var flagName = function (v) {
    if (NAMES[v]) return NAMES[v];
    var s = v.split("_").map(function (w) {
      return WORDS[w.toLowerCase()] || w;
    }).join(" ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  L.flags = FLAGS.map(function (f) {
    return { value: f[0], label: flagName(f[0]), img: FLAG_DIR + f[1] + ".jpg" };
  });
  L.flag = function (v) {
    return L.flags.filter(function (f) {
      return f.value === v;
    })[0];
  };

  /* ---------- Translated names (FormLanguageProvider + REQUIRED_LANGUAGES) ----------
     One field per language: Thai + English required, the rest optional. Thai first, English
     second, then the others (same order as LottoGroupForm / GameForm). Reused by groups + games. */
  L.REQUIRED_LANGUAGES = ["th", "en"];
  L.nameFields = function (languages, noun) {
    var order = { th: 1, en: 2 };
    return languages
      .slice()
      .sort(function (a, b) {
        return (order[a.value] || 3) - (order[b.value] || 3);
      })
      .map(function (l) {
        var req = L.REQUIRED_LANGUAGES.indexOf(l.value) > -1;
        return {
          name: "name_" + l.value,
          label: l.label,
          type: "text",
          required: req,
          messages: { required: "Enter the " + l.label + " " + noun + "." },
        };
      });
  };
  // [{ languageCode, name }] ↔ { name_th, name_en, … }. Empty optional languages aren't sent.
  L.fromTranslations = function (translations) {
    var v = {};
    (translations || []).forEach(function (t) {
      v["name_" + t.languageCode] = t.name;
    });
    return v;
  };
  L.toTranslations = function (values) {
    return Object.keys(values)
      .filter(function (k) {
        return k.indexOf("name_") === 0;
      })
      .map(function (k) {
        return { languageCode: k.slice(5), name: values[k] };
      })
      .filter(function (t) {
        return L.REQUIRED_LANGUAGES.indexOf(t.languageCode) > -1 || t.name.trim();
      });
  };
  // trans(i18n, translations, "name", "languageCode"): UI language, then English, then the first one
  L.name = function (translations, lang) {
    var pick = function (c) {
      return (translations || []).filter(function (t) {
        return t.languageCode === c && t.name;
      })[0];
    };
    var t = pick(lang || "en") || pick("en") || (translations || [])[0];
    return t ? t.name : "";
  };

  /* ---------- Game sub-page header (7d) ----------
     Back link, game name + status, one line of facts, and tabs that are links between the
     game's pages. PROPOSAL: the app has separate routes linked only by breadcrumbs.
     `active`: "details" | "limits" | "price" | "cost". Port: a shared <GamePageHeader/> with
     MUI <Tabs component={Link}> in src/views/pages/lotto/game/. */
  L.gameTabs = function (g) {
    var custom = g.type === "group_custom";
    return [
      { id: "details", label: "Details", icon: "tabler:file-description", href: "lotto-game-form.html?id=" + g.id },
      custom
        ? { id: "limits", label: "Limit groups", icon: "tabler:list-numbers", href: "lotto-game-limit-groups.html?id=" + g.id }
        : { id: "limits", label: "Limit numbers", icon: "tabler:numbers", href: "lotto-game-limit-numbers.html?id=" + g.id },
      { id: "price", label: "Custom price", icon: "tabler:adjustments-dollar", href: "lotto-game-custom-price.html?id=" + g.id },
    ].concat(custom ? [{ id: "cost", label: "Provider cost", icon: "tabler:cash", href: "lotto-game-provider-cost.html?id=" + g.id }] : []);
  };
  L.gameTabsHTML = function (g, active) {
    return (
      '<nav class="tabs page-tabs" aria-label="Game pages">' +
      L.gameTabs(g).map(function (t) {
        return '<a class="tabs__tab" href="' + t.href + '"' + (t.id === active ? ' aria-current="page"' : "") +
          '><iconify-icon icon="' + t.icon + '"></iconify-icon>' + t.label + "</a>";
      }).join("") + "</nav>"
    );
  };
  L.gameHeader = function (root, g, active, pageLabel) {
    var esc = DS.fmt.esc;
    var group = DS.mock.groupById(g.lottoGroupId);
    root.innerHTML =
      '<a class="back-link" href="lotto-games.html"><iconify-icon icon="tabler:arrow-left"></iconify-icon>Game management</a>' +
      '<div class="page-header"><div><div class="page-header__title-row"><h1 class="page-header__title">' + esc(L.name(g.translations)) + "</h1>" +
      (g.isEnable === "yes"
        ? '<span class="chip chip--success"><span class="chip__dot"></span>Enabled</span>'
        : '<span class="chip"><span class="chip__dot"></span>Disabled</span>') +
      '</div><p class="page-header__sub">' + esc(L.gameTypeLabel(g.type)) + " in " + esc(group ? L.name(group.translations) : "") +
      ", code " + esc(g.code) + ", ID " + g.id + "</p></div></div>" +
      L.gameTabsHTML(g, active);
    document.title = pageLabel + ": " + L.name(g.translations) + " | Admin prototype";
    var crumbs = document.querySelector(".topbar__crumbs");
    if (crumbs) {
      var parts = ["Lotto", "Lotto setup", "Game management", pageLabel];
      crumbs.innerHTML = parts.map(function (c, i) {
        var end = i === parts.length - 1;
        return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
          (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
      }).join("");
    }
  };

  /* ---------- Limit number set preview (src/components/Modal/PreviewModal) ----------
     Shared by game limit numbers (7d) and round limit numbers (8d). Needs dialog.js + mock.
     Like the app (user, 2026-09-30): one card per bet type with its max limit and a Min / Max /
     Payout % table (any number of rows), then the special numbers ("Set interesting limit
     number") as one card per number with its bet types. Cards sit in a grid, so a long table
     only makes its own card taller. Large dialog (MUI maxWidth="lg"), body scrolls. */
  // Cards for a limit number set: bet types, then special numbers (one card per number, like the
  // app's SpecialLimitCard). Used by the preview dialog and the view page (9a).
  L.limitSetHTML = function (t) {
    var esc = DS.fmt.esc;
    var fmt = DS.fmt;
    var maxHTML = function (v) {
      return v == null || v === "" ? '<span class="chip chip--warning">No max</span>' : '<span class="limit-card__max">Max ' + fmt.int(v) + "</span>";
    };
    var table = function (ranges) {
      if (!ranges.length) return '<p class="t-body2 t-muted limit-card__none">No ranges. Only the max limit applies.</p>';
      return '<table class="table table--compact limit-card__table"><thead><tr><th scope="col" class="is-num">Min</th>' +
        '<th scope="col" class="is-num">Max</th><th scope="col" class="is-num">Payout</th></tr></thead><tbody>' +
        ranges.map(function (r) {
          return '<tr><td class="is-num">' + fmt.int(r.min) + '</td><td class="is-num">' + fmt.int(r.max) + '</td><td class="is-num t-medium">' +
            r.percent + "%</td></tr>";
        }).join("") + "</tbody></table>";
    };
    return '<h3 class="limit-section">Limits by bet type</h3><div class="limit-grid">' +
      t.rules.map(function (r) {
        return '<section class="limit-card"><header class="limit-card__head"><span class="limit-card__title">' + esc(r.betType) + "</span>" +
          maxHTML(r.limit) + "</header>" + table(r.ranges) + "</section>";
      }).join("") + "</div>" +
      '<h3 class="limit-section">Special numbers</h3>' +
      (t.special.length
        ? '<div class="limit-grid limit-grid--wide">' + t.special.map(function (x) {
            return '<section class="limit-card"><header class="limit-card__head"><span class="limit-card__title">Number <span class="code">' + esc(x.number) + "</span></span>" +
              maxHTML(x.limit) + "</header>" +
              '<div class="limit-card__meta"><span class="t-body2 t-muted">Bet types</span>' + x.betTypes.map(function (b) {
                return '<span class="chip chip--outlined">' + esc(b) + "</span>";
              }).join("") + "</div>" + table(x.ranges) + "</section>";
          }).join("") + "</div>"
        : '<p class="t-body2 t-muted" style="margin:0">No special numbers in this set.</p>');
  };
  L.limitSetScope = function (t) {
    var p = DS.mock.providers.filter(function (x) {
      return x.id === t.providerId;
    })[0];
    return t.providerId ? "Local set for <strong>" + DS.fmt.esc(p ? p.name : "") + "</strong>" : "Global set, for every provider";
  };
  L.previewLimitSet = function (t) {
    DS.dialog.open({
      icon: "tabler:numbers",
      tone: "primary",
      size: "xl",
      title: t.name,
      html: L.limitSetScope(t) + ".",
      body: L.limitSetHTML(t),
      actions: [{ label: "Close", variant: "outlined", autofocus: true }],
    });
  };

  /* ---------- Set lottery number limits (group limit templates, 9b) ----------
     One active template per scope: global, or one per owner provider. Activating turns the other
     active one in that scope off (confirmActivate); owners fall back local → global; with none
     active in scope, betting fails (confirmDeactivate). Shared by the list and the form. */
  var G = (L.groupLimit = {});
  G.providerName = function (t) {
    var p = DS.mock.providers.filter(function (x) {
      return x.id === t.providerId;
    })[0];
    return p ? p.name : "";
  };
  G.scopeLabel = function (t) {
    return t.providerId ? G.providerName(t) + "'s local templates" : "the global templates";
  };
  G.activePeer = function (t) {
    return DS.mock.groupLimitTemplates.filter(function (x) {
      return x.id !== t.id && x.isActive && (x.providerId || null) === (t.providerId || null);
    })[0];
  };
  G.activeGlobal = function () {
    return DS.mock.groupLimitTemplates.filter(function (x) {
      return !x.providerId && x.isActive;
    })[0];
  };
  G.isSystemDefault = function (t) {
    return t.name === "system_default" && !t.providerId;
  };
  // Why Delete is off, or "" (cannotDeleteActive / cannotDeleteSystemDefault)
  G.deleteBlock = function (t) {
    if (G.isSystemDefault(t)) return "The system default can't be deleted";
    if (t.isActive) return "Turn it off before deleting";
    return "";
  };
  // Confirm, then flip isActive in the mock (and the peer); done(on) after "saving"
  G.toggle = function (t, on, done) {
    var esc = DS.fmt.esc;
    var peer = G.activePeer(t);
    var global = G.activeGlobal();
    var html;
    if (on) {
      html = peer
        ? "<strong>" + esc(peer.name) + "</strong> is the active one of " + esc(G.scopeLabel(t)) + ". It will be turned off."
        : "It becomes the active one of " + esc(G.scopeLabel(t)) + ".";
    } else if (t.providerId) {
      html = global
        ? G.providerName(t) + "'s Set lottery bets then use the active global template, <strong>" + esc(global.name) + "</strong>."
        : "No global template is active either, so " + esc(G.providerName(t)) + "'s Set lottery bets will fail until one is turned on.";
    } else {
      html = "No global template will be active. Set lottery bets that fall back to the global template will fail until one is turned on.";
    }
    var risky = !on && (!t.providerId || !global);
    DS.dialog.open({
      icon: on ? "tabler:toggle-right" : "tabler:toggle-left",
      tone: risky ? "error" : "primary",
      title: (on ? "Turn on " : "Turn off ") + t.name + "?",
      html: html,
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: on ? "Turn on" : "Turn off", variant: "contained", tone: risky ? "error" : undefined, onClick: function (btn, close) {
          DS.ui.busy(btn, true, on ? "Turning on…" : "Turning off…");
          setTimeout(function () {
            close();
            DS.mock.groupLimitTemplates.forEach(function (x) {
              if (x.id === t.id) x.isActive = on;
              else if (on && peer && x.id === peer.id) x.isActive = false;
            });
            t.isActive = on;
            DS.ui.toast(t.name + (on ? " is now active" : " is now off") + (on && peer ? ". " + peer.name + " was turned off." : ""), "tabler:circle-check");
            done(on);
          }, 700);
        } },
      ],
    });
  };

  L.typeChip = function (v) {
    return '<span class="chip chip--outlined">' + DS.fmt.esc(L.typeLabel(v)) + "</span>";
  };
})(window.DS);
