/* ==========================================================================
   Currency new / edit (Phase 11d) on the FORM TEMPLATE. ?id=<currency id> = edit
   Source: views/pages/currency/CurrencyForm.tsx
     yup: code req, exactly 3, /^[A-Z]+$/ (the input only LOOKS uppercase via CSS, so "usd" fails with
       "Code must be 3 uppercase letters"); name req; betSetPrice: 4 positive numbers ("Bet number 1 *"…);
       minRunningBet positive; success → /currencies
   Changes: the code turns uppercase as you type (fixes the trap above); the 4 amounts on one line with
   one shared label; plain-word errors.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var id = DS.params.get("id");
  var record = id ? M.currencyList.filter(function (c) {
    return String(c.id) === String(id);
  })[0] : null;
  var isEdit = !!record;
  var positive = function (v) {
    return v === "" || Number(v) > 0 ? "" : "Enter an amount above 0.";
  };

  var sections = [
    {
      title: "Details",
      fields: [
        { name: "code", label: "Code", type: "text", required: true, maxLength: 3, placeholder: "e.g. USD",
          helper: "3 letters, like THB or USD.", messages: { required: "Enter the code." },
          validate: function (v) {
            return /^[A-Z]{3}$/.test(v) ? "" : "Use exactly 3 letters.";
          } },
        { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. US Dollar", messages: { required: "Enter the name." } },
      ],
    },
    {
      title: "Bet set amounts",
      description: "The 4 quick amounts, smallest first. All 4 are required.",
      columns: 4,
      fields: [1, 2, 3, 4].map(function (n) {
        return { name: "bet" + n, label: "Amount " + n, type: "number", required: true, messages: { required: "Enter amount " + n + "." }, validate: positive };
      }),
    },
    {
      title: "Running bets",
      fields: [
        { name: "minRunningBet", label: "Smallest run bet", type: "number", required: true, messages: { required: "Enter the smallest run bet." }, validate: positive },
      ],
    },
  ];

  if (isEdit) {
    document.title = "Edit " + record.code + " | Admin prototype";
    $("form-title").textContent = "Edit currency";
    $("form-sub").textContent = record.name + " (" + record.code + "), ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Admin", "Currencies", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }
  // The fix: the value itself becomes uppercase (the app only styled it)
  $("page-form").addEventListener("input", function (e) {
    if (e.target.name !== "code") return;
    var pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    e.target.setSelectionRange(pos, pos);
  }, true);

  var toForm = function (c) {
    return { code: c.code, name: c.name, bet1: String(c.betSetPrice[0]), bet2: String(c.betSetPrice[1]), bet3: String(c.betSetPrice[2]),
      bet4: String(c.betSetPrice[3]), minRunningBet: String(c.minRunningBet) };
  };
  var EMPTY = { code: "", name: "", bet1: "", bet2: "", bet3: "", bet4: "", minRunningBet: "" };
  var form = DS.form.create({
    root: $("page-form"),
    sections: sections,
    values: isEdit ? toForm(record) : EMPTY,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "currencies.html";
    },
    onSubmit: function (v, api) {
      setTimeout(function () {
        if (M.currencyList.some(function (c) {
          return c.code === v.code && (!isEdit || c.id !== record.id);
        })) {
          return api.fail({ code: "This code is already used." }); // mock 422
        }
        console.log("[prototype] payload", { code: v.code, name: v.name, betSetPrice: [v.bet1, v.bet2, v.bet3, v.bet4].map(Number), minRunningBet: Number(v.minRunningBet) });
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Currency created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "currencies.html";
        }, 1200);
      }, 800);
    },
  });

  function typed(name, value) {
    var e = document.querySelector('[name="' + name + '"]');
    e.value = value;
    e.dispatchEvent(new Event("input", { bubbles: true }));
  }
  var states = isEdit ? ["default", "loading", "dirty", "errors", "saving"] : ["default", "filled", "errors", "saving", "server-error"];
  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : EMPTY);
    var filled = { code: "KHR", name: "Cambodian Riel", bet1: "2000", bet2: "4000", bet3: "10000", bet4: "20000", minRunningBet: "400" };
    if (s === "filled") form.set(filled);
    if (s === "dirty") typed("minRunningBet", "2");
    if (s === "errors") {
      form.set(Object.assign({}, EMPTY, { code: "US", bet1: "10", bet2: "0" }));
      $("page-form").requestSubmit();
    }
    if (s === "saving") {
      if (!isEdit) form.set(filled);
      else typed("minRunningBet", "2");
      form.setBusy(true);
    }
    if (s === "server-error") {
      form.set(Object.assign({}, filled, { code: "THB" }));
      form.setErrors({ code: "This code is already used." });
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
