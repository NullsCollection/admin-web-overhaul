/* ==========================================================================
   Game → Custom price (Phase 7d). ?id=<game id>
   Source: src/views/pages/lotto/game/CustomPrice/CustomPriceForm.tsx
     provider select (group_custom: owner providers only) → useGetCustomPrice(game, provider)
     rates = providerConfiguration ?? gameConfiguration, per type (FormDefault / FormStock /
     FormGroupCustom: + retail price, tiers by digit length); other types: "Not support set
     on this type yet"
     Save = upsert · Restore price (only when a custom price exists) = confirm → delete
     locked non-owner (reseller) user: info alert, fields off · group_custom with no owners: warning
   Changes: a table with the config rate next to each input (the app shows inputs only, so you
   can't see what you're overriding); a per-row "use config rate" button; a status chip for
   custom vs config; a save bar like every other form; switching provider with unsaved edits asks first.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var NUM_RE = /^\d+(\.\d+)?$/;

  var game = M.game(DS.params.get("id") || 301) || M.game(301);
  L.gameHeader($("game-header"), game, "price", "Custom price");
  var config = M.configById(game.lottoConfigurationId);
  var custom = game.type === "group_custom";
  var supported = ["default", "stock", "group_custom"].indexOf(game.type) > -1;

  var opts = { reseller: false, noOwners: false };
  var providerId = null;
  var loaded = {}; // values when the provider was picked (for "Unsaved changes")

  function providers() {
    if (opts.reseller) return M.providers.filter(function (p) {
      return p.id === 102;
    });
    if (custom) return opts.noOwners ? [] : M.providers.filter(function (p) {
      return p.isOwner;
    });
    return M.providers;
  }
  var provider = function () {
    return M.providers.filter(function (p) {
      return p.id === providerId;
    })[0];
  };
  function rows() {
    var list = L.payoutsFor(config).map(function (p) {
      return { key: p.key, label: p.label };
    });
    return custom ? [{ key: "retailPrice", label: "Retail price" }].concat(list) : list;
  }
  var current = function () {
    return providerId ? M.customPrice(game, providerId) : null;
  };

  /* ---------- render ---------- */
  function render() {
    var root = $("price-root");
    if (!supported) {
      root.innerHTML =
        '<section class="card"><div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:adjustments-off"></iconify-icon></span>' +
        '<div class="empty__title">Custom price isn\'t available for this game</div><div class="empty__text">Only General, Stock and Set lottery games can have a custom price. ' +
        esc(L.gameTypeLabel(game.type)) + " games always pay the config's rates.</div>" +
        '<a class="btn btn--outlined btn--sm" href="lotto-config-form.html?id=' + config.id + '">Open config</a></div></section>';
      return;
    }
    var list = providers();
    if (custom && !list.length) {
      root.innerHTML =
        '<div class="alert alert--warning" role="alert"><iconify-icon icon="tabler:alert-triangle"></iconify-icon><div class="alert__body">' +
        '<div class="alert__title">No owner providers</div><div class="alert__text">Set lottery custom prices are set per owner provider. ' +
        'Mark a provider as Owner first, or ask an admin.</div></div></div>';
      return;
    }
    var cur = current();
    var src = cur || config;
    var p = provider();
    var currency = p ? p.currency.code : "THB";
    var off = !providerId || opts.reseller;

    root.innerHTML =
      (opts.reseller
        ? '<div class="alert alert--info" role="status" style="margin-bottom:16px"><iconify-icon icon="tabler:info-circle"></iconify-icon><div class="alert__body">' +
          '<div class="alert__text">Prices follow the system default because this account is a reseller provider.</div></div></div>'
        : "") +
      '<form id="price-form" class="form-page" novalidate>' +
      '<section class="card"><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">Custom price</h2>' +
      '<p class="card__subheader">What this game pays for one provider. Rates you leave as they are follow the config, <a class="t-medium" href="lotto-config-form.html?id=' +
      config.id + '">' + esc(config.name) + "</a>.</p></div></header>" +
      '<div class="card__content stack" style="gap:16px">' +
      '<div class="price-toolbar"><div class="field"><label class="field__label" for="price-provider">Provider</label>' +
      '<div class="field__control field__control--select"><select id="price-provider"' + (opts.reseller ? " disabled" : "") + ">" +
      '<option value="">Select a provider</option>' +
      list.map(function (x) {
        return '<option value="' + x.id + '"' + (x.id === providerId ? " selected" : "") + ">" + esc(x.name) + " (" + x.currency.code + ")</option>";
      }).join("") +
      '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div>' +
      (custom ? '<div class="field__helper">Owner providers only.</div>' : "") + "</div>" +
      '<div class="price-toolbar__status">' +
      (!providerId
        ? '<span class="t-body2 t-muted">Pick a provider to set its prices.</span>'
        : cur
          ? '<span class="chip chip--primary">Custom price</span>'
          : '<span class="chip">Uses config rates</span>') +
      "</div></div>" +
      '<div class="table-wrap"><table class="table table--inset price-table"><thead><tr>' +
      '<th scope="col">' + (custom ? "Price / bet type" : "Bet type") + '</th><th scope="col" class="is-num">Config rate</th>' +
      '<th scope="col" class="is-num">This provider</th><th scope="col" class="is-select"><span class="sr-only">Reset</span></th></tr></thead><tbody>' +
      rows().map(function (r) {
        var v = src[r.key];
        return (
          '<tr data-key="' + r.key + '"><td class="t-medium">' + esc(r.label) + '</td><td class="is-num t-muted">' + fmt.rate(config[r.key]) + "</td>" +
          '<td class="is-num"><div class="field price-field"><div class="field__control field__control--number field__control--sm">' +
          '<span class="field__prefix">' + currency + "</span>" +
          '<input name="' + r.key + '" inputmode="decimal" autocomplete="off" value="' + (v == null ? "" : v) + '" aria-label="' + esc(r.label) + '"' +
          (off ? " disabled" : "") + "></div></div></td>" +
          '<td class="is-select"><button type="button" class="icon-btn icon-btn--sm" data-reset="' + r.key + '" title="Use the config rate" aria-label="Use the config rate for ' +
          esc(r.label) + '" hidden><iconify-icon icon="tabler:arrow-back-up"></iconify-icon></button></td></tr>'
        );
      }).join("") +
      "</tbody></table></div></div></section>" +
      '<div class="form-bar"><div class="form-bar__status" id="price-status" aria-live="polite"></div><div class="form-bar__actions">' +
      (cur && !opts.reseller ? '<button type="button" class="btn btn--text" id="price-restore"><iconify-icon icon="tabler:restore"></iconify-icon>Restore config rates</button>' : "") +
      '<a class="btn btn--outlined" href="lotto-games.html">Cancel</a>' +
      '<button type="submit" class="btn btn--contained" id="price-save"' + (off ? " disabled" : "") + ">Save</button></div></div></form>";

    loaded = values();
    paint();
    wire();
  }

  function values() {
    var v = {};
    document.querySelectorAll("#price-form input[name]").forEach(function (i) {
      v[i.name] = i.value.trim();
    });
    return v;
  }
  var isDirty = function () {
    return JSON.stringify(values()) !== JSON.stringify(loaded);
  };

  function paint() {
    var st = $("price-status");
    if (!st) return;
    document.querySelectorAll("#price-form tr[data-key]").forEach(function (tr) {
      var k = tr.getAttribute("data-key");
      var input = tr.querySelector("input");
      var differs = input.value.trim() !== "" && Number(input.value) !== Number(config[k]);
      tr.querySelector("[data-reset]").hidden = !differs || input.disabled;
      tr.classList.toggle("is-custom", differs);
    });
    var dirty = isDirty();
    st.classList.toggle("is-dirty", dirty);
    var n = document.querySelectorAll("#price-form tr.is-custom").length;
    st.textContent = dirty ? "Unsaved changes" : !providerId ? "No provider picked" : n ? n + (n === 1 ? " rate differs" : " rates differ") + " from the config" : "Same as the config";
  }

  function validate() {
    var bad = 0;
    document.querySelectorAll("#price-form input[name]").forEach(function (i) {
      var msg = i.value.trim() === "" ? "Enter a rate." : NUM_RE.test(i.value.trim()) ? "" : "Enter a number.";
      DS.ui.fieldError(i, msg);
      if (msg) bad++;
    });
    return !bad;
  }

  function wire() {
    var form = $("price-form");
    if (!form) return;
    $("price-provider").addEventListener("change", function () {
      var sel = this;
      var next = sel.value ? Number(sel.value) : null;
      if (!isDirty()) {
        providerId = next;
        return render();
      }
      sel.value = providerId || "";
      DS.dialog.open({
        icon: "tabler:alert-triangle", tone: "warning",
        title: "Discard unsaved changes?",
        html: "Your edits for <strong>" + esc(provider().name) + "</strong> haven't been saved.",
        actions: [
          { label: "Keep editing", variant: "outlined", autofocus: true },
          { label: "Discard changes", variant: "contained", tone: "error", onClick: function (b, close) {
            close();
            providerId = next;
            render();
          } },
        ],
      });
    });
    form.addEventListener("input", function (e) {
      if (e.target.name) DS.ui.fieldError(e.target, "");
      paint();
    });
    form.addEventListener("click", function (e) {
      var r = e.target.closest("[data-reset]");
      if (!r) return;
      var k = r.getAttribute("data-reset");
      var input = form.querySelector('input[name="' + k + '"]');
      input.value = config[k];
      DS.ui.fieldError(input, "");
      paint();
      input.focus();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      var b = $("price-save");
      DS.ui.busy(b, true, "Saving…");
      setTimeout(function () {
        DS.ui.busy(b, false);
        var v = Object.assign({}, config);
        var vals = values();
        Object.keys(vals).forEach(function (k) {
          v[k] = Number(vals[k]);
        });
        M.saveCustomPrice(game, providerId, v);
        DS.ui.toast("Custom price saved for " + provider().name, "tabler:circle-check");
        render();
      }, 800);
    });
    var restore = $("price-restore");
    if (restore) restore.addEventListener("click", confirmRestore);
  }

  function confirmRestore() {
    DS.dialog.open({
      icon: "tabler:restore", tone: "warning",
      title: "Go back to the config's rates?",
      html: "<strong>" + esc(provider().name) + "</strong> will pay the rates from <strong>" + esc(config.name) +
        "</strong> again. Its custom price is removed.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Restore config rates", variant: "contained", onClick: function (b, close) {
          DS.ui.busy(b, true, "Restoring…");
          setTimeout(function () {
            close();
            M.saveCustomPrice(game, providerId, null);
            DS.ui.toast("Custom price removed. " + provider().name + " uses the config's rates.", "tabler:restore");
            render();
          }, 600);
        } },
      ],
    });
  }

  /* ---------- Prototype states ---------- */
  var states = ["no-provider", "config-rates", "custom", "dirty", "errors", "saving", "restore", "reseller", "loading"];
  if (custom) states.splice(states.indexOf("reseller"), 0, "no-owners");
  function setState(s) {
    DS.dialog.close();
    opts = { reseller: s === "reseller", noOwners: s === "no-owners" };
    var list = providers();
    var withCustom = list.filter(function (p) {
      return M.customPrice(game, p.id);
    })[0];
    var without = list.filter(function (p) {
      return !M.customPrice(game, p.id);
    })[0];
    providerId = s === "no-provider" || s === "no-owners" ? null
      : s === "reseller" ? 102
      : ["custom", "restore"].indexOf(s) > -1 && withCustom ? withCustom.id
      : (without || list[0] || {}).id || null;
    if (s === "loading") {
      $("price-root").innerHTML = '<section class="card"><div class="card__content stack" style="gap:12px">' +
        new Array(7).join('<span class="skeleton skeleton--block" style="--h:40px"></span>') + "</div></section>";
      return;
    }
    render();
    var first = document.querySelector("#price-form input[name]");
    if (s === "dirty" || s === "saving") {
      first.value = Math.round(Number(first.value) * 0.95);
      paint();
      if (s === "saving") DS.ui.busy($("price-save"), true, "Saving…");
    }
    if (s === "errors") {
      first.value = "";
      document.querySelectorAll("#price-form input[name]")[1].value = "12o";
      paint();
      validate();
    }
    if (s === "restore") setTimeout(confirmRestore, 300);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "no-provider";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
