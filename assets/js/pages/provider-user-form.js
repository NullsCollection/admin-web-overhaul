/* ==========================================================================
   Provider user new / edit (Phase 11a) on the FORM TEMPLATE. ?id=<provider>[&user=<user id>]
   Source: views/pages/user/UserForm.tsx (shared by /users and /providers/[id]/users)
     yup: name req; email req + valid; create: password req ≥ 8, confirm req + must match; edit: both
       optional (empty password = unchanged); groups (Autocomplete multiple, 30 loaded, search);
       providers (Autocomplete multiple of the user's providers)
     success: toast "User created successfully" / "User updated successfully" → router.push("/users")
     Cancel: reset()
     app bugs: under a provider, the `providerId` prop is never used: the provider isn't pre-picked
       (a new user isn't tied to it unless picked again) and save goes to /users, not back here;
       the new page's title and breadcrumb say "New provider"
   Also serves user-form.html (/users/new, /users/[id]/edit): no provider pre-picked, providers optional
   (none = admin), back to User management.
   Changes: Account card (name, email) + Password card (helper says what empty means on edit) +
   Access card (user groups, providers); this provider is pre-picked; save and Cancel go back to the
   provider's Users page; Cancel asks first when there are changes.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var P = DS.providerPages;
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  // Also serves user-form.html (body data-scope="global"): /users/new and /users/[id]/edit (11c)
  var isGlobal = document.body.getAttribute("data-scope") === "global";
  var p = isGlobal ? null : P.byId(DS.params.get("id")) || P.byId(101);
  var userId = DS.params.get("user");
  var record = userId ? (isGlobal ? M.user(userId) : M.providerUser(p.id, userId)) : null;
  var isEdit = !!record;
  var back = isGlobal ? "users.html" : "provider-users.html?id=" + p.id;
  $("back").href = back;
  $("back").innerHTML = '<iconify-icon icon="tabler:arrow-left"></iconify-icon>' + (isGlobal ? "User management" : esc(p.name) + " users");

  var minLen = function (v) {
    return !v || String(v).length >= 8 ? "" : "Use at least 8 characters.";
  };
  var sections = [
    {
      title: "Account",
      fields: [
        { name: "name", label: "Full name", type: "text", required: true, placeholder: "e.g. Somchai Jaidee", messages: { required: "Enter the full name." } },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "name@example.com", messages: { required: "Enter the email." } },
      ],
    },
    {
      title: "Password",
      description: isEdit ? "Leave both empty to keep the current password." : "At least 8 characters.",
      fields: [
        { name: "password", label: isEdit ? "New password" : "Password", type: "password", required: !isEdit, validate: minLen,
          messages: { required: "Enter a password." } },
        { name: "confirmPassword", label: "Confirm password", type: "password", required: !isEdit,
          messages: { required: "Enter the password again." },
          validate: function (v, values) {
            if (!values.password && !v) return "";
            return v === values.password ? "" : "The passwords don't match.";
          } },
      ],
    },
    {
      title: "Access",
      fields: [
        { name: "groups", label: "User groups", type: "multiselect", placeholder: "Pick groups",
          options: M.userGroups.map(function (g) {
            return { value: String(g.id), label: g.name };
          }) },
        // Global users: no provider = an admin who sees every provider (the app's providers.length === 0 check)
        { name: "providerIds", label: "Providers", type: "multiselect", placeholder: isGlobal ? "None: admin, sees every provider" : "Pick providers",
          required: !isGlobal,
          helper: isGlobal ? "Leave empty for an admin who sees every provider." : isEdit ? "" : p.name + " is picked for you.",
          messages: { required: "Pick at least one provider." },
          options: M.providers.map(function (x) {
            return { value: String(x.id), label: x.name + " (" + x.prefixCode + ")" };
          }) },
      ],
    },
  ];

  var toForm = function (u) {
    return { name: u.name, email: u.email, password: "", confirmPassword: "", groups: u.groups.map(String), providerIds: u.providers.map(String) };
  };
  // The fix: a new user from this page starts tied to this provider
  var DEFAULTS = { name: "", email: "", password: "", confirmPassword: "", groups: [], providerIds: isGlobal ? [] : [String(p.id)] };

  $("form-title").textContent = isEdit ? "Edit user" : "New user";
  $("form-sub").textContent = isEdit ? record.name + " (" + record.email + "), ID " + record.id
    : isGlobal ? "Pick providers for a provider user, or none for an admin." : "For " + p.name + " (" + p.prefixCode + ").";
  if (isEdit) $("form-submit").textContent = "Save changes";
  document.title = (isEdit ? "Edit user" : "New user") + (isGlobal ? "" : ": " + p.name) + " | Admin prototype";
  P.crumbs(isGlobal ? ["Admin", "User management", isEdit ? "Edit" : "New"] : ["Providers", "Provider management", p.name, "Users", isEdit ? "Edit" : "New"]);

  var taken = (isGlobal ? M.users() : M.providerUsers(p.id)).map(function (u) {
    return u.email.toLowerCase();
  }).concat(["admin@rb7.example"]);
  var form = DS.form.create({
    root: $("user-form"),
    sections: sections,
    values: isEdit ? toForm(record) : DEFAULTS,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = back;
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        var email = String(values.email).toLowerCase();
        if (taken.indexOf(email) > -1 && (!isEdit || email !== record.email.toLowerCase())) {
          return api.fail({ email: "This email is already used by another user." }); // mock 422
        }
        var payload = { name: values.name, email: values.email, groups: values.groups.map(Number), providerIds: values.providerIds.map(Number) };
        if (values.password) payload.password = values.password;
        console.log("[prototype] payload", payload);
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "User created", "tabler:circle-check");
        setTimeout(function () {
          location.href = back;
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
    var filled = isGlobal
      ? Object.assign({}, DEFAULTS, { name: "Fon Operations", email: "fon@rb7.example", password: "Lotto2026!", confirmPassword: "Lotto2026!", groups: ["2"] })
      : Object.assign({}, DEFAULTS, { name: "Nok " + p.prefixCode, email: "nok@" + p.name.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com",
        password: "Lotto2026!", confirmPassword: "Lotto2026!", groups: ["4"] });
    if (s === "filled") form.set(filled);
    if (s === "dirty") typed("name", record.name + " (lead)");
    if (s === "errors") {
      typed("email", "nok@");
      typed("password", "short");
      typed("confirmPassword", "shorter");
      if (!isEdit) typed("name", "");
      $("user-form").requestSubmit();
    }
    if (s === "saving") {
      if (!isEdit) form.set(filled);
      else typed("name", record.name + " (lead)");
      form.setBusy(true);
    }
    if (s === "server-error") {
      form.set(Object.assign({}, filled, { email: (isGlobal ? M.users() : M.providerUsers(p.id))[0].email }));
      form.setErrors({ email: "This email is already used by another user." });
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
