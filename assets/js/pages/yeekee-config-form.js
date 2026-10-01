/* ==========================================================================
   Yeekee bonus config new / edit (Phase 8f) on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/lotto/yeekee-config/hooks/useYeekeeConfigForm.tsx (+ useNew… / useEdit…)
     fields: Provider (AutoComplete + "All" = -1, only on create), extend shoot time (Sec) req,
       Bonus reward (<currency>) req, Bonus row 1 req, Bonus row 2 req, Bonus row 3–5 optional;
       all type="number"
     new defaults: provider -1, reward 100, row 1 = 1, row 2 = 16, extend 60
     success: toast "Success" + router.push("/lotto/yeekee-config")
     app bugs: create with no provider toasts "provider id is required" but still sends (no return);
       create error toasts the raw key "common:error"; edit doesn't show which provider it is
   Changes: Details card (provider + extra shoot time) and Bonus card (reward + rows); provider is
   a required pick ("All providers" is still an option) and shows locked on edit; rows must be whole
   numbers ≥ 1 and not repeat (proposal); a live line says who wins what in the provider's currency.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var R = DS.rounds;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var id = DS.params.get("id");
  var record = id ? M.yeekeeConfig(id) : null;
  var isEdit = !!record;
  var ROWS = [1, 2, 3, 4, 5];

  var providerOptions = [{ value: "-1", label: "All providers" }].concat(M.providers.map(function (p) {
    return { value: String(p.id), label: p.name + (p.prefixCode ? " (" + p.prefixCode + ")" : "") };
  }));

  var whole = function (min, msg) {
    return function (v) {
      if (v === "" || v == null) return "";
      return /^\d+$/.test(String(v)) && Number(v) >= min ? "" : msg;
    };
  };
  // A row can't repeat an earlier one (proposal: the app accepts it and would pay the same row twice)
  var rowCheck = function (n) {
    var base = whole(1, "Enter 1 or more, no decimals.");
    return function (v, values) {
      var msg = base(v);
      if (msg || v === "" || v == null) return msg;
      for (var k = 1; k < n; k++) {
        if (String(values["bonusRow" + k]) === String(Number(v))) return "Same as row " + k + ".";
      }
      return "";
    };
  };

  // "Members who send the number at row 1, 16 or 25 win ฿100.00."
  function previewHTML(v) {
    var rows = R.bonusRows(v).filter(function (n, i, all) {
      return n >= 1 && Math.floor(n) === n && all.indexOf(n) === i;
    });
    var cur = R.configProvider(v.providerId || -1).currency;
    var reward = /^\d+(\.\d+)?$/.test(String(v.bonusReward)) ? fmt.money(Number(v.bonusReward), cur) : null;
    if (!rows.length || !reward) return '<p class="t-body2 t-muted">Fill in the reward and rows to see who wins.</p>';
    var list = rows.length === 1 ? String(rows[0]) : rows.slice(0, -1).join(", ") + " or " + rows[rows.length - 1];
    return '<div class="alert alert--info" role="status"><iconify-icon icon="tabler:gift"></iconify-icon><div class="alert__body"><div class="alert__text">' +
      "Members who send the number at row " + esc(list) + " win <strong>" + esc(reward) + "</strong>." + "</div></div></div>";
  }

  /* ---------- Sections ---------- */
  var sections = [
    {
      title: "Details",
      description: isEdit ? "The provider can't change. Delete this config and add a new one instead." : "The bonus is paid in the provider's currency.",
      columns: 3,
      fields: [
        { name: "providerId", label: "Provider", type: "select", required: true, placeholder: "Select a provider",
          options: providerOptions, disabled: isEdit, messages: { required: "Pick a provider." } },
        { name: "putNumberExtendTime", label: "Extra shoot time (seconds)", type: "number", required: true,
          messages: { required: "Enter the extra shoot time." }, validate: whole(0, "Enter whole seconds, 0 or more.") },
        { name: "bonusReward", label: "Bonus reward", type: "number", required: true,
          messages: { required: "Enter the bonus reward." },
          validate: function (v) {
            return Number(v) >= 0 ? "" : "Enter an amount of 0 or more.";
          } },
      ],
    },
    {
      title: "Bonus rows",
      description: "Members who send the number at these rows win the bonus. Rows 1 and 2 are required; leave the others empty if you don't need them.",
      columns: 5,
      fields: ROWS.map(function (n) {
        return { name: "bonusRow" + n, label: "Row " + n, type: "number", required: n <= 2,
          messages: { required: "Enter row " + n + "." }, validate: rowCheck(n) };
      }).concat([{ name: "preview", type: "html", render: previewHTML }]),
    },
  ];

  function toForm(c) {
    var v = { providerId: String(c.providerId), putNumberExtendTime: String(c.putNumberExtendTime), bonusReward: String(c.bonusReward) };
    ROWS.forEach(function (n) {
      v["bonusRow" + n] = c["bonusRow" + n] == null ? "" : String(c["bonusRow" + n]);
    });
    return v;
  }
  var DEFAULTS = { providerId: "", putNumberExtendTime: "60", bonusReward: "100", bonusRow1: "1", bonusRow2: "16" };

  /* ---------- Header ---------- */
  var p = isEdit ? R.configProvider(record.providerId) : null;
  if (isEdit) {
    document.title = "Edit bonus config: " + p.name + " | Admin prototype";
    $("form-title").textContent = "Edit bonus config";
    $("form-sub").textContent = p.name + (p.code ? " (" + p.code + ")" : "") + ", ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Lotto", "Lotto setup", "Yeekee bonus config", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  /* ---------- Form ---------- */
  var taken = M.yeekeeConfigs.map(function (c) {
    return String(c.providerId);
  });
  var form = DS.form.create({
    root: $("config-form"),
    sections: sections,
    values: isEdit ? toForm(record) : DEFAULTS,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "yeekee-configs.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        if (!isEdit && taken.indexOf(values.providerId) > -1) {
          // Mock 422. The real message comes from the API (getErrorMessage).
          return api.fail({ providerId: "This provider already has a bonus config. Edit that one instead." });
        }
        var payload = { providerId: Number(values.providerId), putNumberExtendTime: Number(values.putNumberExtendTime), bonusReward: Number(values.bonusReward) };
        ROWS.forEach(function (n) {
          payload["bonusRow" + n] = values["bonusRow" + n] === "" ? undefined : Number(values["bonusRow" + n]);
        });
        console.log("[prototype] payload", payload);
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Bonus config created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "yeekee-configs.html";
        }, 1200);
      }, 900);
    },
  });

  /* ---------- Prototype states ---------- */
  function typed(name, value) {
    var e = document.querySelector('[name="' + name + '"]');
    e.value = value;
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
  }
  var filled = Object.assign({}, DEFAULTS, { providerId: "104", bonusRow3: "25" });

  var states = isEdit
    ? ["default", "loading", "dirty", "errors", "saving"]
    : ["default", "filled", "errors", "saving", "server-error"];

  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : DEFAULTS);
    var f = $("config-form");

    if (s === "filled") form.set(filled);
    if (s === "dirty") typed("bonusReward", String(Number(record.bonusReward) * 2));
    if (s === "errors") {
      typed("bonusRow2", "");
      typed("bonusRow3", isEdit ? "1" : "1.5");
      if (!isEdit) typed("putNumberExtendTime", "");
      if (isEdit) typed("bonusRow4", "16");
      f.requestSubmit();
    }
    if (s === "saving") {
      if (!isEdit) form.set(filled);
      else typed("bonusRow5", "120");
      form.setBusy(true);
    }
    if (s === "server-error") {
      form.set(Object.assign({}, filled, { providerId: "102" }));
      form.setErrors({ providerId: "This provider already has a bonus config. Edit that one instead." });
    }
  }

  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
