/* ==========================================================================
   Limit number set new / edit (Phase 9a) on the FORM TEMPLATE (core/form.js) + 2 custom widgets.
   Source: views/pages/lotto/limit-template/v2 (useStepper + LimitTypeForm + LimitSpecialForm)
     Step 1 "Set limit type": "Copy Template From" (global sets: filter providerId isNull) + Apply →
       confirm "replace your current bet types"; Name *; Provider (Autocomplete, locked on update;
       required unless admin / operator admin; auto-picks the first provider); then an accordion
       card per bet type (10: three top / front / back / tod / under, two top / under / tod, run
       top / bottom) with "Limit Price" + ranges (min, max, payout %)
       new defaults: every bet type ranges [{ 1000, 5000, 50 }], limit 5001
       rules: each bet type needs a limit or a range ("{{type}} must have limit number or range");
         limit ≥ 0; range values > 0; a range's min > the previous range's max
     Step 2 "Set interesting limit number" (can skip): number 1–3 digits, no duplicates
       ("Duplicate number"); default types by digit count (1: run top / bottom; 2: two top / under /
       tod; 3: three top / under / front / tod); default range { 5000, 10000, 50 }; limit ≥ 0;
       delete with window.confirm
     Then the CompleteForm summary + Save → toast + back to the list
   Changes: one page instead of the stepper (same call as the game form, 7c): Details, Limits by bet
   type, Special numbers, with the usual error summary and save bar. "Copy from a global set" is a
   header button → dialog. Bet types are open cards in a grid (no accordions); each card says what's
   wrong in plain words. Special numbers: an Add row + a card per number; delete uses our dialog.
   Proposals: range min < max; a special number needs at least one bet type.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var id = DS.params.get("id");
  var record = id ? M.limitTemplate(id) : null;
  var isEdit = !!record;
  var BET = M.LIMIT_BET_TYPES;
  var BY_DIGITS = M.SPECIAL_TYPES;

  /* ---------- Value helpers (strings while editing, like inputs) ---------- */
  var str = function (v) {
    return v == null ? "" : String(v);
  };
  var rangeOf = function (r) {
    return { min: str(r.min), max: str(r.max), percent: str(r.percent) };
  };
  function fromSet(t) {
    return {
      name: t.name,
      providerId: t.providerId ? String(t.providerId) : "global",
      betTypes: BET.map(function (b) {
        var r = t.rules.filter(function (x) {
          return x.betType === b;
        })[0] || { limit: "", ranges: [] };
        return { betType: b, limit: str(r.limit), ranges: r.ranges.map(rangeOf) };
      }),
      special: t.special.map(function (s) {
        return { number: s.number, types: s.betTypes.slice(), limit: str(s.limit), ranges: s.ranges.map(rangeOf) };
      }),
    };
  }
  var DEFAULTS = {
    name: "",
    providerId: "global",
    betTypes: BET.map(function (b) {
      return { betType: b, limit: "5001", ranges: [{ min: "1000", max: "5000", percent: "50" }] };
    }),
    special: [],
  };
  var clone = function (v) {
    return JSON.parse(JSON.stringify(v));
  };

  /* ---------- Checks (one plain message per card; the first problem wins) ---------- */
  var num = function (v) {
    return /^\d+(\.\d+)?$/.test(String(v).trim()) ? Number(v) : NaN;
  };
  // → { msg, bad: ["limit" | "r<i>-min" | …] }
  function checkLimits(item, needOne) {
    var bad = [];
    if (item.limit !== "" && !(num(item.limit) >= 0)) return { msg: "Max limit must be a number, 0 or more.", bad: ["limit"] };
    if (needOne && item.limit === "" && !item.ranges.length) return { msg: "Add a max limit or at least one range.", bad: ["limit"] };
    for (var i = 0; i < item.ranges.length; i++) {
      var r = item.ranges[i];
      var n = i + 1;
      ["min", "max", "percent"].forEach(function (k) {
        if (!(num(r[k]) > 0)) bad.push("r" + i + "-" + k);
      });
      if (bad.length) return { msg: "Range " + n + ": fill in min, max and payout, all above 0.", bad: bad };
      if (num(r.min) >= num(r.max)) return { msg: "Range " + n + ": min must be less than max.", bad: ["r" + i + "-min", "r" + i + "-max"] };
      if (i > 0 && num(r.min) <= num(item.ranges[i - 1].max)) {
        return { msg: "Range " + n + ": min must be more than " + fmt.int(num(item.ranges[i - 1].max)) + " (the max of range " + i + ").", bad: ["r" + i + "-min"] };
      }
    }
    return { msg: "", bad: [] };
  }

  /* ---------- Shared card body: max limit + ranges table ---------- */
  function rangesHTML(item, prefix) {
    return '<div class="limit-edit__max"><label for="' + prefix + '-limit">Max limit</label>' +
      '<div class="field__control field__control--sm"><input id="' + prefix + '-limit" inputmode="decimal" data-k="limit" value="' + esc(item.limit) + '" placeholder="None"></div></div>' +
      (item.ranges.length
        ? '<table class="limit-edit__ranges"><thead><tr><th scope="col">Min</th><th scope="col">Max</th><th scope="col">Payout %</th><th scope="col"><span class="sr-only">Remove</span></th></tr></thead><tbody>' +
          item.ranges.map(function (r, i) {
            var cell = function (k, label) {
              return '<td><div class="field__control field__control--sm"><input inputmode="decimal" data-k="r' + i + "-" + k + '" value="' + esc(r[k]) +
                '" aria-label="Range ' + (i + 1) + " " + label + '"></div></td>';
            };
            return "<tr>" + cell("min", "min") + cell("max", "max") + cell("percent", "payout %") +
              '<td><button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-remove-range="' + i + '" aria-label="Remove range ' + (i + 1) + '" title="Remove range">' +
              '<iconify-icon icon="tabler:x"></iconify-icon></button></td></tr>';
          }).join("") + "</tbody></table>"
        : '<p class="t-body2 t-muted limit-edit__none">No ranges. Only the max limit applies.</p>') +
      '<button type="button" class="btn btn--text btn--sm limit-edit__add" data-add-range><iconify-icon icon="tabler:plus"></iconify-icon>Add range</button>' +
      '<p class="limit-edit__error" role="alert" hidden></p>';
  }
  function readInput(item, k, v) {
    if (k === "limit") item.limit = v;
    else {
      var m = /^r(\d+)-(\w+)$/.exec(k);
      item.ranges[Number(m[1])][m[2]] = v;
    }
  }
  function addRange(item) {
    var last = item.ranges[item.ranges.length - 1];
    var start = last && num(last.max) > 0 ? String(num(last.max) + 1) : "";
    item.ranges.push({ min: start, max: "", percent: "" });
  }
  function paintCheck(card, res) {
    card.querySelectorAll("[data-k]").forEach(function (inp) {
      var on = res.bad.indexOf(inp.getAttribute("data-k")) > -1;
      inp.closest(".field__control").classList.toggle("is-invalid", on);
      inp.setAttribute("aria-invalid", on ? "true" : "false");
    });
    var e = card.querySelector(".limit-edit__error");
    e.hidden = !res.msg;
    e.textContent = res.msg;
    card.classList.toggle("is-invalid", !!res.msg);
  }

  /* ---------- Widget 1: limits by bet type ---------- */
  var betWidget = null;
  function mountBetTypes(el, changed) {
    var items = clone(DEFAULTS.betTypes);
    var checking = false; // live checks start after the first Save
    function render() {
      el.innerHTML = '<div class="limit-grid limit-grid--edit">' + items.map(function (it, i) {
        return '<section class="limit-card limit-edit" data-i="' + i + '" aria-label="' + esc(it.betType) + '"><header class="limit-card__head"><span class="limit-card__title">' + esc(it.betType) +
          '</span><span class="limit-card__max">' + it.ranges.length + (it.ranges.length === 1 ? " range" : " ranges") + "</span></header>" +
          '<div class="limit-edit__body">' + rangesHTML(it, "bt" + i) + "</div></section>";
      }).join("") + "</div>";
      if (checking) check();
    }
    function check() {
      var n = 0;
      el.querySelectorAll(".limit-edit").forEach(function (card) {
        var res = checkLimits(items[Number(card.getAttribute("data-i"))], true);
        if (res.msg) n++;
        paintCheck(card, res);
      });
      return n;
    }
    el.addEventListener("input", function (e) {
      var k = e.target.getAttribute("data-k");
      if (!k) return;
      readInput(items[Number(e.target.closest(".limit-edit").getAttribute("data-i"))], k, e.target.value.trim());
      if (checking) check();
      changed();
    });
    el.addEventListener("click", function (e) {
      var card = e.target.closest(".limit-edit");
      if (!card) return;
      var it = items[Number(card.getAttribute("data-i"))];
      var rm = e.target.closest("[data-remove-range]");
      if (rm) {
        it.ranges.splice(Number(rm.getAttribute("data-remove-range")), 1);
        render();
        changed();
        el.querySelector('[data-i="' + card.getAttribute("data-i") + '"] [data-add-range]').focus(); // the row is gone; stay in the card
      }
      if (e.target.closest("[data-add-range]")) {
        addRange(it);
        render();
        changed();
        var rows = el.querySelectorAll('[data-i="' + card.getAttribute("data-i") + '"] tbody tr');
        rows[rows.length - 1].querySelector("input").focus();
      }
    });
    betWidget = {
      validate: function () {
        checking = true;
        var n = check();
        return n ? (n === 1 ? "1 bet type needs a fix (marked in red)." : n + " bet types need a fix (marked in red).") : "";
      },
    };
    render();
    return {
      get: function () {
        return items;
      },
      set: function (v) {
        items = clone(v || DEFAULTS.betTypes);
        render();
      },
      focus: function () {
        var bad = el.querySelector(".limit-edit.is-invalid [aria-invalid=true]") || el.querySelector("input");
        bad.focus();
      },
    };
  }

  /* ---------- Widget 2: special numbers ---------- */
  var specialWidget = null;
  function mountSpecial(el, changed) {
    var items = [];
    var checking = false;
    function render(focusNumber) {
      el.innerHTML =
        '<div class="special-add"><div class="field special-add__field"><label class="field__label" for="sp-new">Number</label>' +
        '<div class="field__control"><input id="sp-new" inputmode="numeric" maxlength="3" placeholder="1 to 3 digits" autocomplete="off"></div></div>' +
        '<button type="button" class="btn btn--outlined" id="sp-add"><iconify-icon icon="tabler:plus"></iconify-icon>Add number</button></div>' +
        (items.length
          ? '<div class="limit-grid limit-grid--wide limit-grid--edit-wide">' + items.map(function (s, i) {
              return '<section class="limit-card limit-edit" data-i="' + i + '" aria-label="Number ' + esc(s.number) + '"><header class="limit-card__head">' +
                '<span class="limit-card__title">Number <span class="code">' + esc(s.number) + "</span></span>" +
                '<button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-remove-number="' + i + '" aria-label="Remove number ' + esc(s.number) + '" title="Remove number">' +
                '<iconify-icon icon="tabler:trash"></iconify-icon></button></header><div class="limit-edit__body">' +
                '<fieldset class="limit-edit__types"><legend>Bet types</legend>' + BY_DIGITS[s.number.length].map(function (b) {
                  return '<label class="checkbox"><input type="checkbox" data-type="' + esc(b) + '"' + (s.types.indexOf(b) > -1 ? " checked" : "") + '><span class="check">' +
                    '<iconify-icon icon="tabler:check"></iconify-icon></span>' + esc(b) + "</label>";
                }).join("") + "</fieldset>" + rangesHTML(s, "sp" + i) + "</div></section>";
            }).join("") + "</div>"
          : '<p class="t-body2 t-muted special-empty">No special numbers. Add one to give it its own limits, like a popular number on a draw day.</p>');
      if (checking) check();
      if (focusNumber) $("sp-new").focus();
    }
    function check() {
      var n = 0;
      el.querySelectorAll(".limit-edit").forEach(function (card) {
        var s = items[Number(card.getAttribute("data-i"))];
        var res = s.types.length ? checkLimits(s, false) : { msg: "Pick at least one bet type.", bad: [] };
        if (res.msg) n++;
        paintCheck(card, res);
      });
      return n;
    }
    function add() {
      var inp = $("sp-new");
      var v = inp.value.trim();
      var msg = !/^\d{1,3}$/.test(v) ? "Enter 1 to 3 digits." : items.some(function (s) {
        return s.number === v;
      }) ? v + " is already in the list." : "";
      DS.ui.fieldError(inp, msg);
      if (msg) return inp.focus();
      items.push({ number: v, types: BY_DIGITS[v.length].slice(), limit: "", ranges: [{ min: "5000", max: "10000", percent: "50" }] });
      render(true);
      changed();
      DS.ui.toast("Number " + v + " added", "tabler:circle-check");
    }
    el.addEventListener("keydown", function (e) {
      if (e.target.id === "sp-new" && e.key === "Enter") {
        e.preventDefault();
        add();
      }
    });
    el.addEventListener("input", function (e) {
      if (e.target.id === "sp-new") {
        e.target.value = e.target.value.replace(/\D/g, "");
        return DS.ui.fieldError(e.target, "");
      }
      var k = e.target.getAttribute("data-k");
      if (!k) return;
      readInput(items[Number(e.target.closest(".limit-edit").getAttribute("data-i"))], k, e.target.value.trim());
      if (checking) check();
      changed();
    });
    el.addEventListener("change", function (e) {
      var t = e.target.getAttribute("data-type");
      if (!t) return;
      var s = items[Number(e.target.closest(".limit-edit").getAttribute("data-i"))];
      s.types = BY_DIGITS[s.number.length].filter(function (b) {
        return b === t ? e.target.checked : s.types.indexOf(b) > -1;
      });
      if (checking) check();
      changed();
    });
    el.addEventListener("click", function (e) {
      if (e.target.closest("#sp-add")) return add();
      var card = e.target.closest(".limit-edit");
      if (!card) return;
      var s = items[Number(card.getAttribute("data-i"))];
      var rmNum = e.target.closest("[data-remove-number]");
      if (rmNum) {
        return DS.dialog.open({
          icon: "tabler:trash", tone: "error", title: "Remove number " + s.number + "?",
          html: "Its limits are removed from this set when you save.",
          actions: [
            { label: "Keep it", variant: "outlined", autofocus: true },
            { label: "Remove", variant: "contained", tone: "error", onClick: function (b, close) {
              close();
              items.splice(items.indexOf(s), 1);
              render(true);
              changed();
            } },
          ],
        });
      }
      var rm = e.target.closest("[data-remove-range]");
      if (rm) {
        s.ranges.splice(Number(rm.getAttribute("data-remove-range")), 1);
        render();
        changed();
      }
      if (e.target.closest("[data-add-range]")) {
        addRange(s);
        render();
        changed();
        var rows = el.querySelectorAll('[data-i="' + card.getAttribute("data-i") + '"] tbody tr');
        rows[rows.length - 1].querySelector("input").focus();
      }
    });
    specialWidget = {
      validate: function () {
        checking = true;
        var n = check();
        return n ? (n === 1 ? "1 number needs a fix (marked in red)." : n + " numbers need a fix (marked in red).") : "";
      },
    };
    render();
    return {
      get: function () {
        return items;
      },
      set: function (v) {
        items = clone(v || []);
        render();
      },
      focus: function () {
        var bad = el.querySelector(".limit-edit.is-invalid [aria-invalid=true]") || el.querySelector(".limit-edit.is-invalid input") || $("sp-new");
        bad.focus();
      },
    };
  }

  /* ---------- Sections ---------- */
  var providerOptions = [{ value: "global", label: "None: a global set for every provider" }].concat(M.providers.map(function (p) {
    return { value: String(p.id), label: p.name + " (" + p.prefixCode + "), " + p.currency.code };
  }));
  var sections = [
    {
      title: "Details",
      description: isEdit ? "The provider can't change after the set is created." : "Pick a provider for a local set, or none for a global set every provider can use.",
      fields: [
        { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Standard limits", messages: { required: "Enter a name." } },
        { name: "providerId", label: "Provider", type: "select", required: true, options: providerOptions, disabled: isEdit,
          messages: { required: "Pick a provider, or none." } },
      ],
    },
    {
      title: "Limits by bet type",
      description: "For each bet type: the max limit, and the payout % for each range of bet amounts. Each one needs a max limit or at least one range. A range must start above the one before it.",
      fields: [
        { name: "betTypes", label: "Limits by bet type", type: "custom", span: 2, hideLabel: true, mount: mountBetTypes,
          validate: function () {
            return betWidget.validate();
          } },
      ],
    },
    {
      title: "Special numbers",
      description: "Optional. A number here gets its own limits for the bet types you pick, instead of the ones above.",
      fields: [
        { name: "special", label: "Special numbers", type: "custom", span: 2, hideLabel: true, mount: mountSpecial,
          validate: function () {
            return specialWidget.validate();
          } },
      ],
    },
  ];

  /* ---------- Header ---------- */
  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    $("form-title").textContent = "Edit limit set";
    $("form-sub").textContent = record.name + ", ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Lotto", "Limits & credit", "Limit number sets", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  /* ---------- Form ---------- */
  var form = DS.form.create({
    root: $("set-form"),
    sections: sections,
    values: isEdit ? fromSet(record) : clone(DEFAULTS),
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "limit-templates.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        var toNum = function (r) {
          return { min: Number(r.min), max: Number(r.max), percent: Number(r.percent) };
        };
        var payload = {
          name: values.name,
          providers: values.providerId === "global" ? [] : [Number(values.providerId)],
          betTypes: values.betTypes.map(function (b) {
            return { betType: b.betType, limit: b.limit === "" ? undefined : Number(b.limit), ranges: b.ranges.map(toNum) };
          }),
          special: values.special.map(function (s) {
            return { number: s.number, types: s.types, limit: s.limit === "" ? undefined : Number(s.limit), ranges: s.ranges.map(toNum) };
          }),
        };
        console.log("[prototype] payload", payload);
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Limit set created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "limit-templates.html";
        }, 1200);
      }, 900);
    },
  });

  /* ---------- Copy from a global set ("Copy Template From" + Apply + confirm) ---------- */
  function openCopy() {
    var globals = M.limitTemplates.filter(function (t) {
      return !t.providerId;
    });
    DS.dialog.open({
      icon: "tabler:copy", tone: "primary", title: "Copy from a global set",
      html: "This replaces the name, the bet type limits and the special numbers below. Nothing is saved until you save the form.",
      body: '<div class="field"><label class="field__label" for="copy-pick">Global set</label><div class="field__control field__control--select">' +
        '<select id="copy-pick">' + globals.map(function (t) {
          return '<option value="' + t.id + '">' + esc(t.name) + " (" + t.special.length + (t.special.length === 1 ? " special number" : " special numbers") + ")</option>";
        }).join("") + '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div></div>',
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Replace with this set", variant: "contained", onClick: function (b, close) {
          var t = M.limitTemplate($("copy-pick").value);
          var v = fromSet(t);
          var cur = form.get();
          v.name = t.name + " (copy)";
          v.providerId = cur.providerId; // keep the provider choice (locked on edit anyway)
          close();
          form.set(v);
          DS.ui.toast("Copied " + t.name + ". Check it, then save.", "tabler:copy-check");
        } },
      ],
    });
  }
  $("copy-from").addEventListener("click", openCopy);

  /* ---------- Prototype states ---------- */
  var states = isEdit
    ? ["default", "loading", "dirty", "errors", "saving"]
    : ["default", "copy", "special-added", "errors", "saving"];

  function typed(sel, value) {
    var e = document.querySelector(sel);
    e.value = value;
    e.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? fromSet(record) : clone(DEFAULTS));
    var f = $("set-form");

    if (s === "copy") setTimeout(openCopy, 300);
    if (s === "special-added") {
      typed("#sp-new", "168");
      $("sp-add").click();
    }
    if (s === "dirty") typed('[data-i="0"] [data-k="limit"]', "6000");
    if (s === "errors") {
      if (!isEdit) typed('[name="name"]', "");
      var v = form.get();
      v.betTypes[0].limit = "";
      v.betTypes[0].ranges = [];
      v.betTypes[1].ranges.push({ min: "4000", max: "9000", percent: "30" });
      v.betTypes[5].ranges[0].percent = "";
      v.special = [{ number: "99", types: [], limit: "", ranges: [{ min: "5000", max: "10000", percent: "50" }] }];
      form.set(v);
      f.requestSubmit();
    }
    if (s === "saving") {
      if (!isEdit) typed('[name="name"]', "Weekend limits");
      else typed('[data-i="0"] [data-k="limit"]', "6000");
      form.setBusy(true);
    }
  }

  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
