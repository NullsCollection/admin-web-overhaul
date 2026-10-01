/* ==========================================================================
   Credit transaction type new / edit (Phase 9c) on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/lotto/credit-transaction-type/CreditTransactionTypeForm.tsx
     yup: name, code required; Code (disabled on edit), Name; switches "Can Negative Value"
       (yes / no) and "Enabled" (enable / disable), both off by default
     submit: create / update → toast "CreditTransactionType created successfully" → list
     Cancel: reset() (stays on the page)
   Changes: one Details card; switch labels in plain words with a helper; Cancel goes back like every
   form (asks first when there are changes); toasts in plain words; mock 422 for a used code.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var id = DS.params.get("id");
  var record = id ? M.creditType(id) : null;
  var isEdit = !!record;

  var sections = [
    {
      title: "Details",
      fields: [
        { name: "code", label: "Code", type: "text", required: true, disabled: isEdit, placeholder: "e.g. DEPOSIT",
          helper: isEdit ? "The code can't change." : "Used by the system. It can't change later.", messages: { required: "Enter a code." } },
        { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Deposit", messages: { required: "Enter a name." } },
        { name: "canNegativeValue", label: "Allow negative amounts", type: "switch",
          helper: "A transaction of this type can have an amount below 0." },
        { name: "status", label: "Enabled", type: "switch" },
      ],
    },
  ];

  var toForm = function (t) {
    return { code: t.code, name: t.name, canNegativeValue: t.canNegativeValue === "yes", status: t.status === "enable" };
  };
  var DEFAULTS = { code: "", name: "", canNegativeValue: false, status: false };

  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    $("form-title").textContent = "Edit credit transaction type";
    $("form-sub").textContent = record.name + " (" + record.code + "), ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Lotto", "Limits & credit", "Credit transaction types", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  var codes = M.creditTypes.map(function (t) {
    return t.code.toUpperCase();
  });
  var form = DS.form.create({
    root: $("type-form"),
    sections: sections,
    values: isEdit ? toForm(record) : DEFAULTS,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "credit-types.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        if (!isEdit && codes.indexOf(String(values.code).toUpperCase()) > -1) {
          return api.fail({ code: "This code is already used by another type." }); // mock 422
        }
        console.log("[prototype] payload", { code: values.code, name: values.name,
          canNegativeValue: values.canNegativeValue ? "yes" : "no", status: values.status ? "enable" : "disable" });
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Credit transaction type created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "credit-types.html";
        }, 1200);
      }, 900);
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
    form.set(isEdit ? toForm(record) : DEFAULTS);
    var filled = { code: "LUCKY_SPIN", name: "Lucky spin reward", canNegativeValue: false, status: true };
    if (s === "filled") form.set(filled);
    if (s === "dirty") typed("name", record.name + " (manual)");
    if (s === "errors") {
      typed("name", "");
      $("type-form").requestSubmit();
    }
    if (s === "saving") {
      if (!isEdit) form.set(filled);
      else typed("name", record.name + " (manual)");
      form.setBusy(true);
    }
    if (s === "server-error") {
      form.set(Object.assign({}, filled, { code: "BONUS" }));
      form.setErrors({ code: "This code is already used by another type." });
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
