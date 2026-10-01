/* ==========================================================================
   Config new / edit (Phase 7a) on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/lotto/config/ConfigForm.tsx
     yup: name req · type req · every pay rate of the chosen type req + number
          group_custom: digit length req, retail price req, cost price optional + < retail
     type switch swaps the pay-rate set (config-form/*.tsx); only that set is sent
     success: toast + router.push("/lotto/configs")
   Changes vs the app: pay rates in their own card, pairs (straight | flipped) side by side,
   Set lottery pricing in its own card, labels without the repeated "Reward".
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var id = DS.params.get("id");
  var record = id ? DS.mock.config(id) : null;
  var isEdit = !!record;
  var FIELD = function (type, key) {
    return type + "__" + key; // one form field per type + pay rate (labels differ by type)
  };

  var isType = function (t) {
    return function (v) {
      return v.type === t;
    };
  };

  /* ---------- Sections ---------- */
  var sections = [
    {
      title: "Details",
      description: "The type decides which payout rates this config has.",
      fields: [
        { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Thai government standard",
          messages: { required: "Enter a config name." } },
        { name: "type", label: "Type", type: "select", required: true, placeholder: "Select a type",
          options: L.types, messages: { required: "Pick a type." } },
      ],
    },
    {
      title: "Pricing",
      description: "Set lottery only. The digit length decides which payout rates apply.",
      showIf: isType("group_custom"),
      fields: [
        { name: "groupCustomDigitLength", label: "Digit length", type: "select", required: true, placeholder: "Select a length",
          options: [4, 5, 6].map(function (n) {
            return { value: String(n), label: n + " digits" };
          }),
          messages: { required: "Pick a digit length." } },
        { name: "retailPrice", label: "Retail price", type: "number", required: true, placeholder: "0.00",
          messages: { required: "Enter the retail price." } },
        { name: "costPrice", label: "Cost price", type: "number", placeholder: "0.00",
          helper: "Optional. Must be lower than the retail price.",
          validate: function (v, values) {
            var retail = Number(values.retailPrice);
            if (values.retailPrice !== "" && !isNaN(retail) && Number(v) >= retail) return "Cost price must be lower than retail price.";
            return "";
          } },
      ],
    },
  ].concat(
    L.types.map(function (t) {
      return {
        title: "Payout rates",
        description: t.value === "group_custom"
          ? "What each winning bet pays. Pick a digit length to see every rate."
          : "What each winning bet pays, for every bet type in a " + t.label.toLowerCase() + ".",
        showIf: isType(t.value),
        fields: L.payouts[t.value].map(function (p) {
          return {
            name: FIELD(t.value, p.key),
            label: p.label,
            type: "number",
            required: true,
            placeholder: "0.00",
            messages: { required: "Enter a payout rate." },
            showIf: p.n
              ? function (v) {
                  return p.n.indexOf(Number(v.groupCustomDigitLength)) > -1;
                }
              : null,
          };
        }),
      };
    })
  );

  /* API record → form values, and back */
  function toForm(c) {
    var v = {
      name: c.name,
      type: c.type,
      groupCustomDigitLength: c.groupCustomDigitLength ? String(c.groupCustomDigitLength) : "",
      retailPrice: c.retailPrice == null ? "" : String(c.retailPrice),
      costPrice: c.costPrice == null ? "" : String(c.costPrice),
    };
    L.payouts[c.type].forEach(function (p) {
      if (c[p.key] != null) v[FIELD(c.type, p.key)] = String(c[p.key]);
    });
    return v;
  }
  function toApi(values) {
    var out = { name: values.name, type: values.type };
    Object.keys(values).forEach(function (k) {
      var parts = k.split("__");
      if (parts.length === 2) out[parts[1]] = Number(values[k]);
      else if (k !== "name" && k !== "type") out[k] = values[k] === "" ? null : Number(values[k]);
    });
    return out;
  }

  /* ---------- Header ---------- */
  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    $("form-title").textContent = "Edit config";
    $("form-sub").textContent = record.name + ", " + L.typeLabel(record.type).toLowerCase() + ", ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Lotto", "Lotto setup", "Config management", isEdit ? "Edit config" : "New config"];
    crumbs.innerHTML = parts
      .map(function (c, i) {
        var last = i === parts.length - 1;
        return (last ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
          (last ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
      })
      .join("");
  }

  /* ---------- Form ---------- */
  var defaults = { type: "default" }; // the app starts every new config as General lottery
  var taken = DS.mock.configs.map(function (c) {
    return c.name.toLowerCase();
  });
  var form = DS.form.create({
    root: $("config-form"),
    sections: sections,
    values: isEdit ? toForm(record) : defaults,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "lotto-configs.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        var name = values.name.toLowerCase();
        if (taken.indexOf(name) > -1 && (!isEdit || name !== record.name.toLowerCase())) {
          // Mock 422. The real message comes from the API (errorHandler).
          return api.fail({ name: "A config with this name already exists." });
        }
        console.log("[prototype] payload", toApi(values));
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Config created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "lotto-configs.html";
        }, 1200);
      }, 900);
    },
  });

  /* ---------- Prototype states ---------- */
  function sample(type, n) {
    var c = DS.mock.configs.filter(function (x) {
      return x.type === type && (!n || x.groupCustomDigitLength === n);
    })[0];
    var v = toForm(c);
    v.name = "";
    return v;
  }
  function typed(name, value) {
    var e = document.querySelector('[name="' + name + '"]');
    e.value = value;
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
  }

  var TYPE_STATES = { stock: ["stock"], "set-four": ["group"], "set-six": ["group_six"], "set-lottery-5": ["group_custom", 5] };
  var states = isEdit
    ? ["default", "loading", "dirty", "errors", "saving", "server-error"]
    : ["default", "stock", "set-four", "set-six", "set-lottery-5", "errors", "cost-error", "saving", "server-error"];

  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : defaults);
    var f = $("config-form");

    if (TYPE_STATES[s]) form.set(sample(TYPE_STATES[s][0], TYPE_STATES[s][1]));
    if (s === "dirty") typed(FIELD(record.type, L.payouts[record.type][0].key), String(record[L.payouts[record.type][0].key] + 50));
    if (s === "errors") {
      if (isEdit) {
        typed("name", "");
        typed(FIELD(record.type, L.payouts[record.type][1].key), "ninety");
      }
      f.requestSubmit();
    }
    if (s === "cost-error") {
      var v = sample("group_custom", 4);
      v.name = "Lao set 4 (150)";
      v.retailPrice = "150";
      v.costPrice = "180";
      form.set(v);
      f.requestSubmit();
    }
    if (s === "saving" || s === "server-error") {
      if (!isEdit) {
        var d = sample("default");
        d.name = s === "server-error" ? "Hanoi standard" : "Hanoi VIP";
        form.set(d);
      } else {
        typed("name", s === "server-error" ? "Hanoi standard" : record.name + " 2");
      }
      if (s === "saving") form.setBusy(true);
      else form.setErrors({ name: "A config with this name already exists." });
    }
  }

  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
