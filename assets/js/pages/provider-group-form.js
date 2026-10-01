/* ==========================================================================
   Provider group new / edit (Phase 11b) on the FORM TEMPLATE. ?id=<group id> = edit
   Source: views/pages/provider-groups/ProviderGroupsForm.tsx
     yup: name req, ≤ 100 ("Maximum 100 characters"); isProtected switch (default off)
     success: toast → list; Cancel: router.back()
   Changes: the Protected switch says what it does (the list then hides Edit / Delete for the group,
   so turning it on can't be undone from here); asks before saving a group as protected (proposal);
   a protected group's edit page opens read-only with a note.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var id = DS.params.get("id");
  var record = id ? M.providerGroupList.filter(function (g) {
    return String(g.id) === String(id);
  })[0] : null;
  var isEdit = !!record;
  var locked = isEdit && record.isProtected;

  var sections = [
    {
      title: "Details",
      fields: [
        { name: "name", label: "Group name", type: "text", required: true, maxLength: 100, placeholder: "e.g. Cambodia",
          disabled: locked, messages: { required: "Enter a group name." },
          validate: function (v) {
            return String(v).length > 100 ? "Use 100 characters or fewer." : "";
          } },
        { name: "isProtected", label: "Protected", type: "switch", disabled: locked,
          helper: "Protected groups can't be edited or deleted from the list afterwards." },
      ],
    },
  ];

  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    $("form-title").textContent = locked ? record.name : "Edit provider group";
    $("form-sub").textContent = locked ? "Protected group, ID " + record.id : record.name + ", ID " + record.id;
    $("form-submit").textContent = "Save changes";
    if (locked) {
      $("group-form").insertAdjacentHTML("afterbegin", '<div class="alert alert--info" role="note"><iconify-icon icon="tabler:lock"></iconify-icon><div class="alert__body">' +
        '<div class="alert__title">This group is protected</div><div class="alert__text">It can\'t be changed or deleted here.</div></div></div>');
    }
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Providers", "Provider groups", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  var save = function (values, api) {
    setTimeout(function () {
      if (M.providerGroupList.some(function (g) {
        return g.name.toLowerCase() === String(values.name).toLowerCase() && (!isEdit || g.id !== record.id);
      })) {
        return api.fail({ name: "This name is already used by another group." }); // mock 422
      }
      console.log("[prototype] payload", { name: values.name, isProtected: !!values.isProtected });
      api.done();
      DS.ui.toast(isEdit ? "Changes saved" : "Provider group created", "tabler:circle-check");
      setTimeout(function () {
        location.href = "provider-groups.html";
      }, 1200);
    }, 800);
  };
  var form = DS.form.create({
    root: $("group-form"),
    sections: sections,
    values: isEdit ? { name: record.name, isProtected: record.isProtected } : { name: "", isProtected: false },
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "provider-groups.html";
    },
    onSubmit: function (values, api) {
      if (!values.isProtected || (isEdit && record.isProtected)) return save(values, api);
      // Turning protection on can't be undone from the list: ask first (proposal)
      api.done();
      DS.dialog.open({
        icon: "tabler:lock", tone: "warning", title: "Save " + values.name + " as protected?",
        html: "After this, the group can't be edited or deleted from the list.",
        actions: [
          { label: "Go back", variant: "outlined", autofocus: true },
          { label: "Save as protected", variant: "contained", onClick: function (b, close) {
            close();
            form.setBusy(true);
            save(values, { done: function () {
              form.setBusy(false);
            }, fail: function (e) {
              form.setBusy(false);
              form.setErrors(e);
            } });
          } },
        ],
      });
    },
  });
  if (locked) $("form-submit").disabled = true;

  function typed(name, value) {
    var e = document.querySelector('[name="' + name + '"]');
    e.value = value;
    e.dispatchEvent(new Event("input", { bubbles: true }));
  }
  var states = isEdit ? ["default", "loading", "dirty", "errors", "saving"] : ["default", "errors", "saving", "server-error", "protect"];
  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? { name: record.name, isProtected: record.isProtected } : { name: "", isProtected: false });
    if (locked) return;
    if (s === "dirty") typed("name", record.name + " (main)");
    if (s === "errors") {
      typed("name", "");
      $("group-form").requestSubmit();
    }
    if (s === "saving") {
      typed("name", isEdit ? record.name + " (main)" : "Cambodia");
      form.setBusy(true);
    }
    if (s === "server-error") {
      typed("name", "Laos");
      form.setErrors({ name: "This name is already used by another group." });
    }
    if (s === "protect") {
      form.set({ name: "Cambodia", isProtected: true });
      $("group-form").requestSubmit();
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
