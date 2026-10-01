/* ==========================================================================
   Set lottery number limit template new / edit (Phase 9b) on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/lotto/group-limit-template/GroupLimitTemplateForm.tsx
     yup: name req; three values req, ≥ 1 ("Value must be at least 1")
     fields: Template name *; Provider (create only: "Global" = empty for admin / operator admin,
       then owner providers only; hints ownerProvidersHint / ownerProviderRequired); on edit a
       read-only Type field instead; "Limit values": max duplicate number per player (default 1),
       max bet lines per player, duplicates count (20), max provider duplicate number per round (100)
     edit header: Active / Inactive chip + Activate (contained success) / Deactivate (outlined),
       which save right away; systemDefaultHint for system_default
     submit: create { name, providerId, details[] } / update { name, details[] } → toast + list
   Changes: Details + Limit values cards (3 values on one line); scope + provider shown read-only on
   edit (a locked select) instead of a "Type" text field; status chip + Turn on / Turn off in the page header with the
   same confirm as the list (names the template that gets turned off); system default note as an
   info alert; "duplicates count" moved to the helper text.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var G = DS.lotto.groupLimit;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var id = DS.params.get("id");
  var record = id ? M.groupLimitTemplates.filter(function (t) {
    return String(t.id) === String(id);
  })[0] : null;
  var isEdit = !!record;

  var owners = M.providers.filter(function (p) {
    return p.isOwner;
  });
  var providerOptions = [{ value: "global", label: isEdit ? "Global, for every provider" : "None: the global template" }].concat(owners.map(function (p) {
    return { value: String(p.id), label: (isEdit ? "Local: " : "") + p.name + " (" + p.prefixCode + ")" };
  }));
  var atLeastOne = function (v) {
    return /^\d+$/.test(String(v)) && Number(v) >= 1 ? "" : "Enter a whole number, 1 or more.";
  };

  /* ---------- Sections ---------- */
  var sections = [
    {
      title: "Details",
      description: isEdit ? "The scope can't change after the template is created." : "Global applies to every provider without its own. Local templates are only for owner providers.",
      fields: [
        // system_default is locked: the app's delete guard checks this exact name (proposal; the app lets you rename it)
        { name: "name", label: "Template name", type: "text", required: true, placeholder: "e.g. Lucky Star standard",
          disabled: isEdit && G.isSystemDefault(record), helper: isEdit && G.isSystemDefault(record) ? "The system default keeps its name." : "",
          messages: { required: "Enter a template name." } },
        { name: "providerId", label: isEdit ? "Scope" : "Provider", type: "select", required: true, options: providerOptions, disabled: isEdit,
          helper: isEdit ? "" : "Only providers marked as Owner are listed.", messages: { required: "Pick a provider, or none for global." } },
      ],
    },
    {
      title: "Limit values",
      description: "All three are required, 1 or more.",
      columns: 3,
      fields: [
        { name: "maxDuplicateNumberPerPlayer", label: "Max duplicate number per player", type: "number", required: true,
          messages: { required: "Enter a value." }, validate: atLeastOne },
        { name: "maxBetNumberPerPlayer", label: "Max bet lines per player", type: "number", required: true,
          helper: "Duplicates count toward this.", messages: { required: "Enter a value." }, validate: atLeastOne },
        { name: "maxProviderDuplicateNumberPerRound", label: "Max provider duplicate number per round", type: "number", required: true,
          messages: { required: "Enter a value." }, validate: atLeastOne },
      ],
    },
  ];

  function toForm(t) {
    return {
      name: t.name,
      providerId: t.providerId ? String(t.providerId) : "global",
      maxDuplicateNumberPerPlayer: String(t.maxDuplicateNumberPerPlayer),
      maxBetNumberPerPlayer: String(t.maxBetNumberPerPlayer),
      maxProviderDuplicateNumberPerRound: String(t.maxProviderDuplicateNumberPerRound),
    };
  }
  var DEFAULTS = { name: "", providerId: "global", maxDuplicateNumberPerPlayer: "1", maxBetNumberPerPlayer: "20", maxProviderDuplicateNumberPerRound: "100" };

  /* ---------- Header: status + Turn on / off (saves right away, like the app) ---------- */
  function paintHeader() {
    if (!isEdit) return;
    $("form-status").innerHTML = record.isActive
      ? '<span class="chip chip--success"><span class="chip__dot"></span>Active</span>'
      : '<span class="chip"><span class="chip__dot"></span>Off</span>';
    $("form-actions").innerHTML = record.isActive
      ? '<button type="button" class="btn btn--outlined" id="toggle"><iconify-icon icon="tabler:toggle-left"></iconify-icon>Turn off</button>'
      : '<button type="button" class="btn btn--outlined" id="toggle"><iconify-icon icon="tabler:toggle-right"></iconify-icon>Turn on</button>';
    $("toggle").addEventListener("click", function () {
      G.toggle(record, !record.isActive, paintHeader);
    });
  }
  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    $("form-title").textContent = "Edit limit template";
    $("form-sub").textContent = record.name + ", ID " + record.id + " · Turning it on or off saves right away.";
    $("form-submit").textContent = "Save changes";
    if (G.isSystemDefault(record)) {
      $("form-note").innerHTML = '<div class="alert alert--info form-width" role="note" style="margin-bottom:24px"><iconify-icon icon="tabler:info-circle"></iconify-icon>' +
        '<div class="alert__body"><div class="alert__title">System default</div><div class="alert__text">Seeded and active by default. It sets the limits for providers ' +
        "that aren't owners. It can't be deleted.</div></div></div>";
    }
    paintHeader();
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Lotto", "Limits & credit", "Set lottery number limits", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  /* ---------- Form ---------- */
  var form = DS.form.create({
    root: $("glt-form"),
    sections: sections,
    values: isEdit ? toForm(record) : DEFAULTS,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "group-limit-templates.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        var details = [
          { key: "max_duplicate_number_per_player", value: Number(values.maxDuplicateNumberPerPlayer) },
          { key: "max_bet_number_per_player", value: Number(values.maxBetNumberPerPlayer) },
          { key: "max_provider_duplicate_number_per_round", value: Number(values.maxProviderDuplicateNumberPerRound) },
        ];
        console.log("[prototype] payload", isEdit ? { name: values.name, details: details }
          : { name: values.name, providerId: values.providerId === "global" ? null : Number(values.providerId), details: details });
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Template created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "group-limit-templates.html";
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
  var states = isEdit ? ["default", "loading", "dirty", "errors", "saving", "turn-off"] : ["default", "filled", "errors", "saving"];
  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : DEFAULTS);
    if (s === "filled") form.set({ name: "Lucky Star weekend", providerId: "103", maxDuplicateNumberPerPlayer: "3", maxBetNumberPerPlayer: "30", maxProviderDuplicateNumberPerRound: "150" });
    if (s === "dirty") typed("maxBetNumberPerPlayer", "60");
    if (s === "errors") {
      if (!(isEdit && G.isSystemDefault(record))) typed("name", "");
      typed("maxDuplicateNumberPerPlayer", "0");
      typed("maxProviderDuplicateNumberPerRound", "");
      $("glt-form").requestSubmit();
    }
    if (s === "saving") {
      typed("maxBetNumberPerPlayer", "45");
      form.setBusy(true);
    }
    if (s === "turn-off") setTimeout(function () {
      $("toggle").click();
    }, 300);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
