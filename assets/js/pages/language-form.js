/* ==========================================================================
   Language new / edit (Phase 11d) on the FORM TEMPLATE. ?code=<code> = edit
   Source: views/pages/language/LanguageForm.tsx
     yup: code req, ≤ 10 ("codeMax"); name req; Cancel: router.back()
   Changes: code locked on edit (it's the page's key: /languages/<code>/edit, and names per language are
   stored by it); helper with examples.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var code = DS.params.get("code");
  var record = code ? M.languageList.filter(function (l) {
    return l.code === code;
  })[0] : null;
  var isEdit = !!record;
  $("form-sub").textContent = "Names per language (games, lotto groups) are stored under this code.";

  var sections = [
    {
      title: "Details",
      fields: [
        { name: "code", label: "Code", type: "text", required: true, maxLength: 10, disabled: isEdit, placeholder: "e.g. ms",
          helper: isEdit ? "The code can't change." : "Short code, like th, en or lo. Up to 10 characters.", messages: { required: "Enter the code." } },
        { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Malay", messages: { required: "Enter the name." } },
      ],
    },
  ];
  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    $("form-title").textContent = "Edit language";
    $("form-sub").textContent = record.name + " (" + record.code + ")";
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Admin", "Languages", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }
  var form = DS.form.create({
    root: $("page-form"),
    sections: sections,
    values: isEdit ? { code: record.code, name: record.name } : { code: "", name: "" },
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "languages.html";
    },
    onSubmit: function (v, api) {
      setTimeout(function () {
        if (!isEdit && M.languageList.some(function (l) {
          return l.code === v.code.toLowerCase();
        })) {
          return api.fail({ code: "This code is already used." }); // mock 422
        }
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Language created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "languages.html";
        }, 1200);
      }, 700);
    },
  });
  var states = isEdit ? ["default", "loading", "errors", "saving"] : ["default", "errors", "saving", "server-error"];
  function setState(s) {
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? { code: record.code, name: record.name } : { code: "", name: "" });
    if (s === "errors") {
      form.set({ code: isEdit ? record.code : "", name: "" });
      $("page-form").requestSubmit();
    }
    if (s === "saving") {
      form.set({ code: isEdit ? record.code : "ms", name: "Malay" });
      form.setBusy(true);
    }
    if (s === "server-error") {
      form.set({ code: "th", name: "Thai (new)" });
      form.setErrors({ code: "This code is already used." });
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
