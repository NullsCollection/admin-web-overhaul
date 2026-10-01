/* ==========================================================================
   Credit transfer type new / edit (Phase 9c) on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/lotto/credit-transaction-transfer-type/CreditTransactionTransferTypeForm.tsx
     yup: nameTh, code, color required; nameEn optional (copied from nameTh when empty)
     fields: Code (disabled on edit, no * shown), Name (ONE field: a Thai / English SwitchLanguage
       toggle picks which name it edits), Color (free text)
     submit → toast "CreditTransactionTransferType created successfully" → list; Cancel: reset()
   Changes: both names as plain fields (Thai required, English optional with "the Thai name is used
   when empty" said out loud) instead of one field behind a language toggle; Color with a live
   preview of the label; color must be one the browser understands (proposal; the app takes any
   text); Cancel goes back like every form.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var id = DS.params.get("id");
  var record = id ? M.transferType(id) : null;
  var isEdit = !!record;
  var isColor = function (c) {
    return typeof CSS !== "undefined" && CSS.supports("color", String(c).trim());
  };

  var sections = [
    {
      title: "Details",
      fields: [
        { name: "code", label: "Code", type: "text", required: true, disabled: isEdit, placeholder: "e.g. AGENT_TOPUP",
          helper: isEdit ? "The code can't change." : "Used by the system. It can't change later.", messages: { required: "Enter a code." } },
        { name: "color", label: "Color", type: "text", required: true, placeholder: "e.g. #16A34A",
          helper: "A hex code like #16A34A, or a color name.", messages: { required: "Enter a color." },
          validate: function (v) {
            return isColor(v) ? "" : "That isn't a color. Use a hex code like #16A34A.";
          } },
        { name: "preview", type: "html", render: function (v) {
          var name = v.nameEn || v.nameTh || "Transfer type";
          var c = isColor(v.color) ? String(v.color).trim() : "";
          return '<div class="swatch-preview"><span class="t-body2 t-muted">Preview</span><span class="swatch-row">' +
            (c ? '<span class="swatch" style="--swatch:' + esc(c) + '" aria-hidden="true"></span>' : '<span class="swatch swatch--empty" aria-hidden="true"></span>') +
            '<span class="t-subtitle2">' + esc(name) + "</span></span></div>";
        } },
      ],
    },
    {
      title: "Name",
      description: "Thai is required. English is optional: when it's empty, the Thai name is used.",
      fields: [
        { name: "nameTh", label: "Thai", type: "text", required: true, placeholder: "เช่น เติมเครดิตจากเอเย่นต์", messages: { required: "Enter the Thai name." } },
        { name: "nameEn", label: "English", type: "text", placeholder: "e.g. Agent top-up" },
      ],
    },
  ];

  var toForm = function (t) {
    return { code: t.code, color: t.color, nameTh: t.nameTh, nameEn: t.nameEn };
  };
  var DEFAULTS = { code: "", color: "", nameTh: "", nameEn: "" };

  if (isEdit) {
    document.title = "Edit " + (record.nameEn || record.nameTh) + " | Admin prototype";
    $("form-title").textContent = "Edit transfer type";
    $("form-sub").textContent = (record.nameEn || record.nameTh) + " (" + record.code + "), ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Lotto", "Limits & credit", "Credit transfer types", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  var codes = M.transferTypes.map(function (t) {
    return t.code.toUpperCase();
  });
  var form = DS.form.create({
    root: $("tt-form"),
    sections: sections,
    values: isEdit ? toForm(record) : DEFAULTS,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "transfer-types.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        if (!isEdit && codes.indexOf(String(values.code).toUpperCase()) > -1) {
          return api.fail({ code: "This code is already used by another transfer type." }); // mock 422
        }
        console.log("[prototype] payload", { code: values.code, color: values.color.trim(), nameTh: values.nameTh, nameEn: values.nameEn || values.nameTh });
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Transfer type created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "transfer-types.html";
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
    var filled = { code: "CASHBACK_TRANSFER", color: "#0EA5E9", nameTh: "โอนเงินคืน", nameEn: "Cashback transfer" };
    if (s === "filled") form.set(filled);
    if (s === "dirty") typed("color", "#7C3AED");
    if (s === "errors") {
      typed("color", "bluish");
      typed("nameTh", "");
      $("tt-form").requestSubmit();
    }
    if (s === "saving") {
      if (!isEdit) form.set(filled);
      else typed("color", "#7C3AED");
      form.setBusy(true);
    }
    if (s === "server-error") {
      form.set(Object.assign({}, filled, { code: "PROMOTION" }));
      form.setErrors({ code: "This code is already used by another transfer type." });
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
