/* ==========================================================================
   Provider size new / edit (Phase 11b) on the FORM TEMPLATE. ?id=<size id> = edit
   Source: views/pages/provider-size/hooks/useProviderSizeForm.ts
     fields: Name (req), Description, Template Name (AutoComplete of limit sets, req)
     success: toast "Success" → list; Cancel → /provider-sizes
   Changes: "Template Name" → "Limit set", with a line under it that says what's in the chosen set
   and a Preview button (the set preview from 9a).
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var id = DS.params.get("id");
  var record = id ? M.providerSizeList.filter(function (z) {
    return String(z.id) === String(id);
  })[0] : null;
  var isEdit = !!record;

  var sets = M.limitTemplates.map(function (t) {
    var p = t.providerId && M.providers.filter(function (x) {
      return x.id === t.providerId;
    })[0];
    return { value: String(t.id), label: t.name + (p ? " (local, " + p.name + ")" : " (global)") };
  });

  var sections = [
    {
      title: "Details",
      fields: [
        { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Medium", messages: { required: "Enter a name." } },
        { name: "description", label: "Description", type: "text", placeholder: "e.g. 5,000 to 50,000 players" },
        { name: "limitTemplateId", label: "Limit set", type: "select", required: true, placeholder: "Pick a limit set", options: sets,
          helper: "Providers of this size use this set.", messages: { required: "Pick a limit set." } },
        { name: "preview", type: "html", render: function (v) {
          var t = v.limitTemplateId && M.limitTemplate(v.limitTemplateId);
          if (!t) return "";
          return '<div class="swatch-preview"><iconify-icon icon="tabler:numbers" class="t-muted"></iconify-icon><span class="t-body2">' + esc(t.name) + ": " +
            t.rules.length + " bet types, " + (t.special.length ? t.special.length + (t.special.length === 1 ? " special number" : " special numbers") : "no special numbers") +
            '</span><button type="button" class="btn btn--text btn--sm" data-preview="' + t.id + '" style="margin-left:auto"><iconify-icon icon="tabler:eye"></iconify-icon>Preview</button></div>';
        } },
      ],
    },
  ];

  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    $("form-title").textContent = "Edit provider size";
    $("form-sub").textContent = record.name + ", ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Providers", "Provider sizes", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }
  $("size-form").addEventListener("click", function (e) {
    var b = e.target.closest("[data-preview]");
    if (b) DS.lotto.previewLimitSet(M.limitTemplate(b.getAttribute("data-preview")));
  });

  var toForm = function (z) {
    return { name: z.name, description: z.description, limitTemplateId: String(z.limitTemplateId) };
  };
  var form = DS.form.create({
    root: $("size-form"),
    sections: sections,
    values: isEdit ? toForm(record) : { name: "", description: "", limitTemplateId: "" },
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "provider-sizes.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        console.log("[prototype] payload", { name: values.name, description: values.description, limitTemplateId: Number(values.limitTemplateId) });
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Provider size created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "provider-sizes.html";
        }, 1200);
      }, 800);
    },
  });

  function typed(name, value) {
    var e = document.querySelector('[name="' + name + '"]');
    e.value = value;
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
  }
  var states = isEdit ? ["default", "loading", "dirty", "errors", "saving"] : ["default", "filled", "errors", "saving"];
  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : { name: "", description: "", limitTemplateId: "" });
    var filled = { name: "Starter", description: "New providers, first 3 months", limitTemplateId: "402" };
    if (s === "filled") form.set(filled);
    if (s === "dirty") typed("limitTemplateId", "403");
    if (s === "errors") {
      typed("name", "");
      if (!isEdit) typed("limitTemplateId", "");
      $("size-form").requestSubmit();
    }
    if (s === "saving") {
      if (!isEdit) form.set(filled);
      else typed("limitTemplateId", "403");
      form.setBusy(true);
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
