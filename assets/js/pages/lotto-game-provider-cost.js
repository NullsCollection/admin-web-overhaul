/* ==========================================================================
   Game → Provider cost (Phase 7d). ?id=<group_custom game id>
   Source: src/views/pages/lotto/game/ProviderCost/ProviderCostForm.tsx
     non-owner providers only → useGetProviderCost(game, provider): { configCostPrice, providerOverride }
     hint "Default from configuration: THB 96", or a warning when the config has no cost price
     cost price input (required when saving) · Save = upsert · Restore Price (override exists,
     canDelete) = confirm → delete · no non-owner providers → warning · !canEdit → input off
   Changes: the retail price and the config default sit next to the input so the admin sees what
   they're overriding; a status chip; the same save bar as the other forms.
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

  var game = M.game(DS.params.get("id") || 323) || M.game(323);
  L.gameHeader($("game-header"), game, "cost", "Provider cost");
  var config = M.configById(game.lottoConfigurationId);
  var opts = { noProviders: false, canEdit: true };
  var providerId = null;
  var loadedValue = "";

  var providers = function () {
    return opts.noProviders ? [] : M.providers.filter(function (p) {
      return !p.isOwner;
    });
  };
  var provider = function () {
    return M.providers.filter(function (p) {
      return p.id === providerId;
    })[0];
  };

  function render() {
    var root = $("cost-root");
    if (game.type !== "group_custom") {
      root.innerHTML =
        '<section class="card"><div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:cash-off"></iconify-icon></span>' +
        '<div class="empty__title">Provider cost is for Set lottery games</div><div class="empty__text">Only Set lottery games bill providers a cost price per set.</div></div></section>';
      return;
    }
    var list = providers();
    if (!list.length) {
      root.innerHTML =
        '<div class="alert alert--warning" role="alert"><iconify-icon icon="tabler:alert-triangle"></iconify-icon><div class="alert__body">' +
        '<div class="alert__text">No non-owner providers are available for this account.</div></div></div>';
      return;
    }
    if (!providerId) providerId = list[0].id; // the app picks the first allowed provider
    var data = M.providerCost(game, providerId);
    var cur = provider().currency.code;
    var has = !!data.providerOverride;
    loadedValue = has ? String(data.providerOverride.costPrice) : "";
    var missing = data.configCostPrice == null;

    root.innerHTML =
      '<form id="cost-form" class="form-page" novalidate>' +
      '<section class="card"><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">Provider cost</h2>' +
      '<p class="card__subheader">What a non-owner provider is billed for one set. Without an override it\'s the config\'s cost price.</p></div></header>' +
      '<div class="card__content stack" style="gap:20px">' +
      '<div class="price-toolbar"><div class="field"><label class="field__label" for="cost-provider">Provider</label>' +
      '<div class="field__control field__control--select"><select id="cost-provider">' +
      list.map(function (x) {
        return '<option value="' + x.id + '"' + (x.id === providerId ? " selected" : "") + ">" + esc(x.name) + " (" + x.currency.code + ")</option>";
      }).join("") +
      '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div><div class="field__helper">Non-owner providers only.</div></div>' +
      '<div class="price-toolbar__status">' + (has ? '<span class="chip chip--primary">Override</span>'
        : missing ? '<span class="chip chip--warning">No cost price</span>' : '<span class="chip">Uses config default</span>') + "</div></div>" +
      (missing
        ? '<div class="alert alert--warning" role="alert"><iconify-icon icon="tabler:alert-triangle"></iconify-icon><div class="alert__body">' +
          '<div class="alert__title">The config has no cost price</div><div class="alert__text">Billing may fail unless you set an override here or a cost price on ' +
          '<a class="t-medium" href="lotto-config-form.html?id=' + config.id + '">' + esc(config.name) + "</a>.</div></div></div>"
        : "") +
      '<dl class="cost-facts"><div><dt>Retail price</dt><dd>' + cur + " " + fmt.rate(config.retailPrice) + "</dd></div>" +
      "<div><dt>Config cost price</dt><dd>" + (missing ? '<span class="t-muted">Not set</span>' : cur + " " + fmt.rate(data.configCostPrice)) + "</dd></div></dl>" +
      '<div class="field cost-field"><label class="field__label" for="cost-price">Cost price for ' + esc(provider().name) + '<span class="req" aria-hidden="true">*</span></label>' +
      '<div class="field__control field__control--number"><span class="field__prefix">' + cur + "</span>" +
      '<input id="cost-price" name="costPrice" inputmode="decimal" autocomplete="off" value="' + loadedValue + '" placeholder="' +
      (missing ? "0.00" : fmt.rate(data.configCostPrice)) + '"' + (opts.canEdit ? "" : " readonly") + ' aria-describedby="cost-help"></div>' +
      (opts.canEdit ? "" : '<div class="field__helper" id="cost-help">You can view this but not change it.</div>') + "</div>" +
      "</div></section>" +
      '<div class="form-bar"><div class="form-bar__status" id="cost-status" aria-live="polite"></div><div class="form-bar__actions">' +
      (has && opts.canEdit ? '<button type="button" class="btn btn--text" id="cost-restore"><iconify-icon icon="tabler:restore"></iconify-icon>Restore config default</button>' : "") +
      '<a class="btn btn--outlined" href="lotto-games.html">' + (opts.canEdit ? "Cancel" : "Back") + "</a>" +
      (opts.canEdit ? '<button type="submit" class="btn btn--contained" id="cost-save">Save</button>' : "") + "</div></div></form>";
    paint();
    wire();
  }

  var value = function () {
    return $("cost-price").value.trim();
  };
  function paint() {
    var st = $("cost-status");
    var dirty = value() !== loadedValue;
    st.classList.toggle("is-dirty", dirty);
    var missing = M.providerCost(game, providerId).configCostPrice == null;
    st.textContent = dirty ? "Unsaved changes" : loadedValue ? "Override saved" : missing ? "No cost price for this provider yet" : "Using the config default";
  }
  function validate() {
    var v = value();
    var msg = v === "" ? "Enter a cost price, or restore the config default." : !NUM_RE.test(v) ? "Enter a number." : "";
    DS.ui.fieldError($("cost-price"), msg);
    return !msg;
  }

  function wire() {
    $("cost-provider").addEventListener("change", function () {
      providerId = Number(this.value);
      render();
    });
    var form = $("cost-form");
    form.addEventListener("input", function () {
      DS.ui.fieldError($("cost-price"), "");
      paint();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!opts.canEdit || !validate()) return;
      var b = $("cost-save");
      DS.ui.busy(b, true, "Saving…");
      setTimeout(function () {
        M.saveProviderCost(game, providerId, Number(value()));
        DS.ui.toast("Cost price saved for " + provider().name, "tabler:circle-check");
        render();
      }, 700);
    });
    var r = $("cost-restore");
    if (r) r.addEventListener("click", confirmRestore);
  }

  function confirmRestore() {
    var data = M.providerCost(game, providerId);
    DS.dialog.open({
      icon: "tabler:restore", tone: "warning",
      title: "Remove this cost override?",
      html: "<strong>" + esc(provider().name) + "</strong> will be billed the config's cost price" +
        (data.configCostPrice != null ? " (" + provider().currency.code + " " + fmt.rate(data.configCostPrice) + ")" : ", which isn't set yet") + ".",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Restore config default", variant: "contained", onClick: function (b, close) {
          DS.ui.busy(b, true, "Restoring…");
          setTimeout(function () {
            close();
            M.saveProviderCost(game, providerId, null);
            DS.ui.toast("Provider cost override restored.", "tabler:restore");
            render();
          }, 600);
        } },
      ],
    });
  }

  /* ---------- Prototype states ---------- */
  var states = ["default", "override", "dirty", "errors", "saving", "restore", "config-missing", "read-only", "no-providers", "not-set-lottery"];
  function setState(s) {
    DS.dialog.close();
    if (s === "config-missing" && game.id !== 324) return (location.href = "lotto-game-provider-cost.html?id=324&state=config-missing");
    if (s === "not-set-lottery" && game.type === "group_custom") return (location.href = "lotto-game-provider-cost.html?id=301&state=not-set-lottery");
    opts = { noProviders: s === "no-providers", canEdit: s !== "read-only" };
    var list = providers();
    var withOverride = list.filter(function (p) {
      return M.providerCost(game, p.id).providerOverride;
    })[0];
    providerId = (s === "override" || s === "restore" || s === "read-only") && withOverride ? withOverride.id : list.length ? list[0].id : null;
    render();
    if (s === "dirty" || s === "saving") {
      $("cost-price").value = "88";
      paint();
      if (s === "saving") DS.ui.busy($("cost-save"), true, "Saving…");
    }
    if (s === "errors") {
      $("cost-price").value = "9O";
      paint();
      validate();
    }
    if (s === "restore") setTimeout(confirmRestore, 300);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
