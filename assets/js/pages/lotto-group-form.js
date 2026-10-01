/* ==========================================================================
   Group new / edit (Phase 7b) on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/lotto/group/LottoGroupForm.tsx
     yup: code req · sort req · translations[th], translations[en] req (REQUIRED_LANGUAGES)
     sort: select of every group as "Before {name}" (value = that group's sort)
     translations: one name per language from useGetLanguages; empty optional ones aren't sent
     success: toast + router.push("/lotto/groups")
   Changes vs the app: Details / Group name cards; "At the end" position (proposal: the app
   can't put a new group last); on edit the group's own entry reads "Current position".
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var id = DS.params.get("id");
  var record = id ? M.group(id) : null;
  var isEdit = !!record;
  var groups = M.groups.slice().sort(function (a, b) {
    return a.sort - b.sort;
  });
  var last = groups.length ? groups[groups.length - 1].sort : 0;

  /* ---------- Position options ---------- */
  var positions = groups
    .map(function (g) {
      var own = isEdit && g.id === record.id;
      return { value: String(g.sort), label: own ? "Current position" : "Before " + L.name(g.translations) };
    })
    .concat([{ value: String(last + 1), label: "At the end" }]);
  // Editing the last group: "At the end" is the same place as "Current position"
  if (isEdit && record.sort === last) positions.pop();

  /* ---------- Sections ---------- */
  var sections = [
    {
      title: "Details",
      description: "The order sets where this group sits among the others.",
      fields: [
        { name: "code", label: "Code", type: "text", required: true, placeholder: "e.g. TH_GOV",
          messages: { required: "Enter a code." } },
        { name: "sort", label: "Order", type: "select", required: true, placeholder: "Select a position",
          options: positions, messages: { required: "Pick where this group goes." } },
      ],
    },
    {
      title: "Group name",
      description: "Thai and English are required. The other languages are optional.",
      fields: L.nameFields(M.languages, "name"),
    },
  ];

  function toForm(g) {
    var v = L.fromTranslations(g.translations);
    v.code = g.code;
    v.sort = String(g.sort);
    return v;
  }

  /* ---------- Header ---------- */
  if (isEdit) {
    document.title = "Edit " + L.name(record.translations) + " | Admin prototype";
    $("form-title").textContent = "Edit group";
    $("form-sub").textContent = L.name(record.translations) + " (" + record.code + "), ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Lotto", "Lotto setup", "Group management", isEdit ? "Edit group" : "New group"];
    crumbs.innerHTML = parts
      .map(function (c, i) {
        var end = i === parts.length - 1;
        return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
          (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
      })
      .join("");
  }

  /* ---------- Form ---------- */
  var codes = groups.map(function (g) {
    return g.code.toUpperCase();
  });
  var form = DS.form.create({
    root: $("group-form"),
    sections: sections,
    values: isEdit ? toForm(record) : {},
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "lotto-groups.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        var code = values.code.toUpperCase();
        if (codes.indexOf(code) > -1 && (!isEdit || code !== record.code.toUpperCase())) {
          // Mock 422. The real message comes from the API (errorHandler).
          return api.fail({ code: "This code is already used by another group." });
        }
        console.log("[prototype] payload", { code: values.code, sort: Number(values.sort), translations: L.toTranslations(values) });
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Group created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "lotto-groups.html";
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
  var filled = { code: "LAO_VIP", sort: String(last + 1), name_th: "หวยลาว VIP", name_en: "Lao VIP" };

  var states = isEdit
    ? ["default", "loading", "dirty", "errors", "saving", "server-error"]
    : ["default", "filled", "errors", "saving", "server-error"];

  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : {});
    var f = $("group-form");

    if (s === "filled") form.set(filled);
    if (s === "dirty") typed("name_vi", "Xổ số " + L.name(record.translations));
    if (s === "errors") {
      if (isEdit) {
        typed("code", "");
        typed("name_en", "");
      }
      f.requestSubmit();
    }
    if (s === "saving" || s === "server-error") {
      if (!isEdit) form.set(Object.assign({}, filled, s === "server-error" ? { code: "LAO" } : {}));
      else typed("code", s === "server-error" ? "HANOI" : record.code + "_2");
      if (s === "saving") form.setBusy(true);
      else form.setErrors({ code: "This code is already used by another group." });
    }
  }

  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
