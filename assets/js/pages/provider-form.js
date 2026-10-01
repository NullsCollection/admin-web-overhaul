/* ==========================================================================
   Provider new / edit (Phase 4): the first page on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/provider/ProviderForm.tsx
     yup: name req · prefixCode req, A-Z0-9 only, ≤ 5 (only checked if changed on edit)
          remote/game URL req + valid · currency req · languages ≥ 1 · size template req
          provider group req · 5 wallet URLs req + valid · contact URL optional + valid
     switches: isEnable · isOwner (only if canSetOwner; kept as-is on edit)
     success: toast + router.push("/providers")   422: field errors from the server
   Edit extras: ProviderKeyTable (useGetProvider(id).keys). Since 11a (option A) the provider pages share one header
   with link tabs (Details · API keys · Users · Players); ProviderUsersTable's reset password moved to the Users page.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var id = DS.params.get("id");
  var record = id ? M.providerDetail(id) : null;
  var isEdit = !!record;
  var canSetOwner = true; // useIsAdmin() || useIsOperatorAdmin() in the app

  var PREFIX_RE = /^[A-Za-z0-9]+$/;
  var usedCodes = M.providers.map(function (p) {
    return p.prefixCode.toUpperCase();
  });

  /* ---------- Sections (GenericForm-style config) ---------- */
  var sections = [
    {
      title: "Basic info",
      description: "Name, code, and how this provider is grouped.",
      fields: [
        { name: "name", label: "Provider name", type: "text", required: true, placeholder: "e.g. Golden Dragon",
          messages: { required: "Enter a provider name." } },
        { name: "prefixCode", label: "Prefix code", type: "text", required: true, maxLength: 5, placeholder: "e.g. GD01",
          helper: "Up to 5 letters or numbers.",
          messages: { required: "Enter a prefix code." },
          validate: function (v) {
            if (isEdit && v === record.prefixCode) return ""; // unchanged codes are always allowed
            if (!PREFIX_RE.test(v)) return "Use letters and numbers only.";
            if (v.length > 5) return "Use 5 characters or fewer.";
            return "";
          } },
        { name: "currencyId", label: "Currency", type: "select", required: true, placeholder: "Select a currency",
          options: M.currencies.map(function (c) {
            return { value: String(c.id), label: c.code + " - " + c.name };
          }),
          messages: { required: "Pick a currency." } },
        { name: "languages", label: "Languages", type: "multiselect", required: true, placeholder: "Select languages",
          options: M.languages, messages: { required: "Pick at least one language." } },
        { name: "providerSizeTemplateId", label: "Provider size", type: "select", required: true, placeholder: "Select a provider size",
          options: M.providerSizes, messages: { required: "Pick a provider size." } },
        { name: "providerGroupId", label: "Provider group", type: "select", required: true, placeholder: "Select a provider group",
          options: M.providerGroups, messages: { required: "Pick a provider group." } },
      ],
    },
    {
      title: "Site URLs",
      description: "The provider's API and game addresses.",
      fields: [
        { name: "remoteUrl", label: "Remote URL", type: "url", required: true, placeholder: "https://api.example.com" },
        { name: "gameUrl", label: "Game URL", type: "url", required: true, placeholder: "https://play.example.com" },
        { name: "contactUrl", label: "Contact URL", type: "url", placeholder: "https://example.com/contact", helper: "Optional." },
      ],
    },
    {
      title: "Seamless wallet callbacks",
      description: "We call these URLs to check a player's balance and move money for each bet.",
      fields: [
        { name: "getBalanceUrl", label: "Get balance URL", type: "url", required: true, placeholder: "https://api.example.com/wallet/balance" },
        { name: "betUrl", label: "Bet URL", type: "url", required: true, placeholder: "https://api.example.com/wallet/bet" },
        { name: "settleUrl", label: "Settle URL", type: "url", required: true, placeholder: "https://api.example.com/wallet/settle" },
        { name: "rollbackSettleUrl", label: "Rollback settle URL", type: "url", required: true, placeholder: "https://api.example.com/wallet/rollback-settle" },
        { name: "cancelBetUrl", label: "Cancel bet URL", type: "url", required: true, placeholder: "https://api.example.com/wallet/cancel-bet" },
      ],
    },
    {
      title: "Status",
      fields: [{ name: "isEnable", label: "Enabled", type: "switch" }].concat(
        canSetOwner
          ? [{
              name: "isOwner", label: "Owner provider", type: "switch", disabled: isEdit,
              helper: isEdit ? "Set when the provider is created. It can't be changed later." : "Can't be changed after the provider is created.",
            }]
          : []
      ),
    },
  ];

  /* ---------- Header ---------- */
  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    var P = DS.providerPages;
    var prov = P.byId(record.id);
    $("form-title").textContent = record.name;
    $("form-sub").innerHTML = P.subline(prov);
    $("form-status-chip").innerHTML = record.isEnable
      ? '<span class="chip chip--success"><span class="chip__dot"></span>Enabled</span>'
      : '<span class="chip"><span class="chip__dot"></span>Disabled</span>';
    $("form-submit").textContent = "Save changes";
    $("provider-tabs").hidden = false;
    document.body.setAttribute("data-crumbs", "Providers|Provider management|" + record.name + "|Details");
  } else {
    document.body.setAttribute("data-crumbs", "Providers|Provider management|New provider");
  }
  // shell.js already ran; repaint the crumbs for this page
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = document.body.getAttribute("data-crumbs").split("|");
    crumbs.innerHTML = parts
      .map(function (c, i) {
        var last = i === parts.length - 1;
        return (last ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
          (last ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
      })
      .join("");
  }

  /* ---------- Form ---------- */
  var defaults = { isEnable: true, isOwner: false, languages: [] };
  var form = DS.form.create({
    root: $("provider-form"),
    sections: sections,
    values: isEdit ? record : defaults,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "providers.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        var code = values.prefixCode.toUpperCase();
        var changed = !isEdit || code !== record.prefixCode.toUpperCase();
        if (changed && usedCodes.indexOf(code) > -1) {
          // 422 from the API → hasServerError() puts it on the field
          return api.fail({ prefixCode: "This prefix code is already used by another provider." });
        }
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Provider created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "providers.html";
        }, 1200);
      }, 900);
    },
  });

  /* ---------- API keys (edit) ---------- */
  var keys = isEdit ? record.keys.slice() : [];
  var keyList;

  // Page tabs: Details / API keys are panels of this page (hash), Users / Players are other pages
  function paintCounts() {
    var tab = location.hash === "#keys" ? "keys" : "details";
    $("provider-tabs").innerHTML = DS.providerPages.tabsHTML(DS.providerPages.byId(record.id), tab, {
      keys: keys.length, users: M.providerUsers(record.id).length, players: M.providerPlayers(record.id).length,
    });
  }
  function showPanel() {
    var keysOn = location.hash === "#keys";
    $("panel-details").hidden = keysOn;
    $("panel-keys").hidden = !keysOn;
    document.body.setAttribute("data-crumbs", "Providers|Provider management|" + record.name + "|" + (keysOn ? "API keys" : "Details"));
    DS.providerPages.crumbs(document.body.getAttribute("data-crumbs").split("|"));
    paintCounts();
  }

  if (isEdit) {
    keyList = DS.list.create({
      root: $("keys-card"),
      noun: ["key", "keys"],
      pageSize: 5,
      rows: function () {
        return keys;
      },
      search: function () {
        return "";
      },
      filters: {},
      rowName: function (r) {
        return "key " + r.id;
      },
      columns: [
        { key: "id", label: "ID", num: true, render: function (r) {
          return '<span class="t-muted">' + r.id + "</span>";
        } },
        { key: "signature", label: "Key", sortable: false, render: function (r) {
          var short = r.signature.slice(0, 12) + "…" + r.signature.slice(-6);
          return (
            '<span class="code" title="' + r.signature + '">' + short + "</span>" +
            '<button type="button" class="icon-btn icon-btn--sm" style="margin-left:4px;vertical-align:middle" data-copy="' + r.signature +
            '" data-copy-label="Key copied" aria-label="Copy key ' + r.id + '" title="Copy"><iconify-icon icon="tabler:copy"></iconify-icon></button>'
          );
        } },
        { key: "status", label: "Status", render: function (r) {
          return r.status === "active"
            ? '<span class="chip chip--success"><span class="chip__dot"></span>Active</span>'
            : '<span class="chip"><span class="chip__dot"></span>Revoked</span>';
        } },
        { key: "createdAt", label: "Created", render: function (r) {
          return fmt.dateTime(r.createdAt);
        } },
        { key: "updatedAt", label: "Updated", render: function (r) {
          return fmt.dateTime(r.updatedAt);
        } },
      ],
      actions: function (r) {
        return r.status === "active"
          ? [{ label: "Revoke", icon: "tabler:ban", action: "revoke", danger: true }]
          : [{ label: "Enable", icon: "tabler:rotate-clockwise", action: "enable" }];
      },
      onAction: function (action, row) {
        if (action === "enable") {
          row.status = "active";
          row.updatedAt = Date.now();
          DS.ui.toast("Key " + row.id + " enabled", "tabler:circle-check");
          keyList.refresh();
          return;
        }
        DS.dialog.open({
          icon: "tabler:ban",
          tone: "error",
          title: "Revoke this key?",
          html: "Requests signed with key <strong>" + row.id + "</strong> will stop working right away. You can enable it again later.",
          actions: [
            { label: "Cancel", variant: "outlined", autofocus: true },
            { label: "Revoke key", variant: "contained", tone: "error", onClick: function (b, close) {
              DS.ui.busy(b, true, "Revoking…");
              setTimeout(function () {
                close();
                row.status = "revoked";
                row.updatedAt = Date.now();
                DS.ui.toast("Key " + row.id + " revoked", "tabler:ban");
                keyList.refresh();
              }, 600);
            } },
          ],
        });
      },
      empty: { icon: "tabler:key", title: "No keys yet", text: "Generate a key so this provider can sign its requests." },
      noResults: { icon: "tabler:search", title: "No keys match", text: "" },
    });

    $("generate-key").addEventListener("click", function () {
      var b = this;
      DS.ui.busy(b, true, "Generating…");
      setTimeout(function () {
        DS.ui.busy(b, false);
        var now = Date.now();
        keys.unshift({ id: keys.length ? keys[0].id + 1 : 900, signature: M.hex(now % 2147483647, 64), status: "active", createdAt: now, updatedAt: now });
        paintCounts();
        DS.ui.toast("Provider key generated", "tabler:key");
        keyList.refresh();
      }, 700);
    });

    keyList.refresh();
    // Deep link: provider-form.html?id=101#keys
    window.addEventListener("hashchange", showPanel);
    showPanel();
  }

  /* ---------- Prototype states ---------- */
  // New form filled with valid values (for the saving / server-error states)
  function fillValid() {
    var d = M.providerDetail(103);
    d.name = "Hua Hin Lotto";
    d.prefixCode = "HHL";
    d.isOwner = false;
    form.set(d);
  }

  var states = isEdit
    ? ["default", "loading", "dirty", "errors", "saving", "server-error", "keys"]
    : ["default", "errors", "saving", "server-error"];

  function setState(s) {
    DS.dialog.close();
    if (isEdit) {
      history.replaceState(null, "", location.pathname + location.search + (s === "keys" ? "#keys" : ""));
      showPanel();
    }
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? record : defaults);
    var f = $("provider-form");

    if (s === "dirty") {
      document.querySelector('[name="name"]').value = record.name + " Asia";
      document.querySelector('[name="name"]').dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (s === "errors") {
      if (isEdit) {
        document.querySelector('[name="name"]').value = "";
        document.querySelector('[name="betUrl"]').value = "api.goldendragon.com/bet";
        document.querySelector('[name="prefixCode"]').value = "GD-01";
      }
      f.requestSubmit();
    }
    if (s === "saving" || s === "server-error") {
      if (!isEdit) fillValid();
      else {
        document.querySelector('[name="name"]').value = record.name + " Asia";
      }
      if (s === "server-error") document.querySelector('[name="prefixCode"]').value = "S88";
      document.querySelector('[name="name"]').dispatchEvent(new Event("input", { bubbles: true }));
      if (s === "saving") {
        form.setBusy(true);
      } else {
        form.setErrors({ prefixCode: "This prefix code is already used by another provider." });
      }
    }
  }

  // A deep link to #keys opens on the API keys panel
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : isEdit && location.hash === "#keys" ? "keys" : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
