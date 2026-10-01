/* ==========================================================================
   Game new / edit (Phase 7c) on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/lotto/game/GameForm.tsx
     Step 1 (Game details): code req · per language: name + description (Lexical), th + en req
     Step 2 (Game settings): group req (autocomplete) · order in group ("Before {game}") ·
       config req (autocomplete) · type req (7 types) · set price (group / group_six req;
       group_custom = the config's retail price, read-only) · digit length (group_custom,
       read-only, from the config) · Highlight / Enabled / Blacklist switches ·
       background image (FlagSelect) req
     422 ERROR_CODE_HAVE_BEEN_TAKEN → error on code · success: toast + router.push("/lotto/games")
   Changes: no stepper (one page of cards, every error visible in the summary); languages as
   tabs with an error dot; a read-only preview of the chosen config's payout rates; "At the end"
   order option (same as groups); background picker with search and a check badge.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var id = DS.params.get("id");
  var record = id ? M.game(id) : null;
  var isEdit = !!record;
  // error:ERROR_CODE_HAVE_BEEN_TAKEN is "Code have been taken." Copy fix:
  var codeTakenMsg = "This code is already taken.";

  /* ---------- Options that depend on other values ---------- */
  function orderOptions(v) {
    if (!v.lottoGroupId) return [];
    var inGroup = M.games
      .filter(function (g) {
        return String(g.lottoGroupId) === String(v.lottoGroupId);
      })
      .sort(function (a, b) {
        return a.sort - b.sort;
      });
    var last = inGroup.length ? inGroup[inGroup.length - 1] : null;
    var opts = inGroup.map(function (g) {
      var own = isEdit && g.id === record.id;
      return { value: String(g.sort), label: own ? "Current position" : "Before " + L.name(g.translations) };
    });
    if (!(isEdit && last && last.id === record.id)) opts.push({ value: String(last ? last.sort + 1 : 1), label: "At the end" });
    return opts;
  }
  var isType = function (list) {
    return function (v) {
      return list.indexOf(v.type) > -1;
    };
  };

  function previewHTML(v) {
    var c = M.configById(v.lottoConfigurationId);
    if (!c) return '<p class="t-body2 t-muted" style="margin:0">Pick a config to see what this game pays.</p>';
    var rows = L.payoutsFor(c);
    return (
      '<div class="rate-preview"><div class="rate-preview__head"><span class="t-subtitle2">' + esc(c.name) + "</span>" +
      '<span class="t-body2 t-muted">' + esc(L.typeLabel(c.type)) + " config, " + rows.length + " payout rates</span>" +
      '<a class="btn btn--text btn--sm" href="lotto-config-form.html?id=' + c.id + '">Open config<iconify-icon icon="tabler:arrow-up-right"></iconify-icon></a></div>' +
      '<dl class="rate-preview__grid">' +
      rows.map(function (r) {
        return "<div><dt>" + esc(r.label) + "</dt><dd>" + fmt.rate(c[r.key]) + "</dd></div>";
      }).join("") +
      "</dl></div>"
    );
  }

  /* ---------- Sections ---------- */
  var order = { th: 1, en: 2 };
  var languages = M.languages.slice().sort(function (a, b) {
    return (order[a.value] || 3) - (order[b.value] || 3);
  });

  var sections = [
    {
      title: "Basic info",
      description: "The code, the type, and where the game sits in its group.",
      fields: [
        { name: "code", label: "Code", type: "text", required: true, placeholder: "e.g. HN_VIP",
          messages: { required: "Enter a game code." } },
        { name: "type", label: "Type", type: "select", required: true, placeholder: "Select a type",
          options: L.gameTypes, messages: { required: "Pick a type." } },
        { name: "lottoGroupId", label: "Group", type: "select", required: true, placeholder: "Select a group",
          options: M.groups.map(function (g) {
            return { value: String(g.id), label: L.name(g.translations) };
          }),
          messages: { required: "Pick a group." } },
        { name: "sort", label: "Order in group", type: "select", required: true, placeholder: "Select a position",
          options: orderOptions, messages: { required: "Pick where this game goes in its group." },
          showIf: function (v) {
            return !!v.lottoGroupId;
          } },
      ],
    },
    {
      title: "Payout",
      description: "The config sets what each bet type pays.",
      fields: [
        { name: "lottoConfigurationId", label: "Config", type: "select", required: true, placeholder: "Select a config",
          options: M.configs.map(function (c) {
            return { value: String(c.id), label: c.name + " (" + L.typeLabel(c.type) + ")" };
          }),
          messages: { required: "Pick a config." } },
        { name: "costPrice", label: "Set price", type: "number", required: true, placeholder: "0.00",
          helper: "The price of one set.",
          messages: { required: "Enter the set price." },
          showIf: isType(L.SET_TYPES),
          readonlyIf: isType(["group_custom"]) },
        { name: "digitLength", label: "Digit length", type: "text", showIf: isType(["group_custom"]),
          readonlyIf: function () {
            return true;
          } },
        { name: "preview", label: "Payout rates", type: "html", render: previewHTML },
      ],
    },
    {
      title: "Name and description",
      description: "Thai and English need both. The other languages are optional.",
      tabs: languages.map(function (l) {
        var req = L.REQUIRED_LANGUAGES.indexOf(l.value) > -1;
        return {
          id: l.value,
          label: l.label,
          fields: [
            { name: "name_" + l.value, label: "Name", type: "text", required: req, span: 2,
              messages: { required: "Enter the " + l.label + " name." } },
            { name: "desc_" + l.value, label: "Description", type: "richtext", required: req,
              placeholder: "What players should know about this game",
              messages: { required: "Add the " + l.label + " description." } },
          ],
        };
      }),
    },
    {
      title: "Display",
      description: "How the game looks in the player's game list.",
      fields: [
        { name: "flag", label: "Background image", type: "imagepick", required: true, searchable: true,
          options: L.flags, messages: { required: "Pick a background image." } },
        { name: "isEnable", label: "Enabled", type: "switch" },
        { name: "isHilight", label: "Highlight", type: "switch" },
        { name: "isBlacklist", label: "Blacklist", type: "switch" },
      ],
    },
  ];

  // The group_custom price and digit length come from the config (GameForm handleChange)
  function derived(values) {
    var c = M.configById(values.lottoConfigurationId);
    var out = {};
    if (c && c.retailPrice != null) out.costPrice = String(c.retailPrice);
    out.digitLength = c && c.groupCustomDigitLength ? c.groupCustomDigitLength + " digits" : "";
    return out;
  }

  function toForm(g) {
    var v = {
      code: g.code,
      type: g.type,
      lottoGroupId: String(g.lottoGroupId),
      sort: String(g.sort),
      lottoConfigurationId: String(g.lottoConfigurationId),
      costPrice: g.costPrice ? String(g.costPrice) : "",
      flag: g.flag,
      isEnable: g.isEnable === "yes",
      isHilight: g.isHilight === "yes",
      isBlacklist: !!g.isBlacklist,
    };
    g.translations.forEach(function (t) {
      v["name_" + t.languageCode] = t.name;
      v["desc_" + t.languageCode] = t.description;
    });
    if (g.type === "group_custom") Object.assign(v, derived(v));
    else v.digitLength = derived(v).digitLength;
    return v;
  }
  function toApi(v) {
    return {
      code: v.code, type: v.type, order: 0,
      lottoGroupId: Number(v.lottoGroupId), sort: v.sort ? Number(v.sort) : undefined,
      lottoConfigurationId: Number(v.lottoConfigurationId),
      costPrice: v.costPrice ? Number(v.costPrice) : undefined,
      flag: v.flag, isEnable: v.isEnable ? "yes" : "no", isHilight: v.isHilight ? "yes" : "no", isBlacklist: v.isBlacklist,
      translations: languages
        .map(function (l) {
          return { languageCode: l.value, name: v["name_" + l.value] || "", description: v["desc_" + l.value] || "" };
        })
        .filter(function (t) {
          return L.REQUIRED_LANGUAGES.indexOf(t.languageCode) > -1 || t.name.trim() || t.description;
        }),
    };
  }

  /* ---------- Header ---------- */
  if (isEdit) {
    var nm = L.name(record.translations);
    document.title = "Edit " + nm + " | Admin prototype";
    $("form-title").textContent = "Edit game";
    $("form-sub").textContent = nm + " (" + record.code + "), ID " + record.id;
    $("form-submit").textContent = "Save changes";
    $("game-tabs").innerHTML = L.gameTabsHTML(record, "details"); // tabs to the game's other pages (7d)
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Lotto", "Lotto setup", "Game management", isEdit ? "Edit game" : "New game"];
    crumbs.innerHTML = parts
      .map(function (c, i) {
        var end = i === parts.length - 1;
        return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
          (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
      })
      .join("");
  }

  /* ---------- Form ---------- */
  var defaults = { type: "default", isEnable: false, isHilight: false, isBlacklist: false };
  var codes = M.games.map(function (g) {
    return g.code.toUpperCase();
  });
  var form = DS.form.create({
    root: $("game-form"),
    sections: sections,
    values: isEdit ? toForm(record) : defaults,
    requireChanges: isEdit,
    onChange: function (name, values, api) {
      if (name === "lottoGroupId") api.setValue("sort", "");
      if (name === "lottoConfigurationId" || name === "type") {
        var d = derived(values);
        if (d.costPrice != null && (name === "lottoConfigurationId" || values.type === "group_custom")) api.setValue("costPrice", d.costPrice);
        api.setValue("digitLength", d.digitLength);
      }
    },
    onCancel: function () {
      location.href = "lotto-games.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        var code = values.code.toUpperCase();
        if (codes.indexOf(code) > -1 && (!isEdit || code !== record.code.toUpperCase())) {
          return api.fail({ code: codeTakenMsg }); // 422 ERROR_CODE_HAVE_BEEN_TAKEN
        }
        console.log("[prototype] payload", toApi(values));
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Game created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "lotto-games.html";
        }, 1200);
      }, 900);
    },
  });

  /* ---------- Prototype states ---------- */
  function filled(extra) {
    var v = toForm(M.game(309)); // Hanoi normal as a template
    v.code = "HN_EXTRA";
    v.name_th = "หวยฮานอยเอ็กซ์ตร้า";
    v.name_en = "Hanoi extra";
    v.desc_th = "<p>ออกผลทุกวัน เวลา 17:30 น.</p>";
    v.desc_en = "<p>Draws every day at <strong>17:30</strong>.</p>";
    v.sort = "4";
    return Object.assign(v, extra || {});
  }
  function typed(name, value) {
    var e = document.querySelector('[name="' + name + '"]');
    e.value = value;
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
  }

  var states = isEdit
    ? ["default", "loading", "dirty", "errors", "saving", "server-error"]
    : ["default", "filled", "set-lottery", "errors", "saving", "server-error"];

  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : defaults);
    var f = $("game-form");

    if (s === "filled") form.set(filled());
    if (s === "set-lottery") {
      var v = filled({ code: "HN_SET4", type: "group_custom", lottoConfigurationId: "212", name_en: "Hanoi set 4", name_th: "หวยฮานอยชุด 4 ตัว", flag: "hanoi_vip" });
      form.set(Object.assign(v, derived(v)));
    }
    if (s === "dirty") typed("code", record.code + "_2");
    if (s === "errors") {
      if (isEdit) {
        typed("code", "");
        form.setValue("desc_en", "");
      }
      f.requestSubmit();
    }
    if (s === "saving" || s === "server-error") {
      if (!isEdit) form.set(filled(s === "server-error" ? { code: "HN_VIP" } : {}));
      else typed("code", s === "server-error" ? "TGOV" : record.code + "_2");
      if (s === "saving") form.setBusy(true);
      else form.setErrors({ code: codeTakenMsg });
    }
  }

  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
