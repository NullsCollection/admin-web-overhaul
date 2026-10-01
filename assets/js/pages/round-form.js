/* ==========================================================================
   Round new / edit (Phase 8b) on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/lotto/round/RoundForm.tsx
     game (grouped by lotto group; locked on edit) · open at (locked on edit) · close at ·
     enabled switch · sync sites: new = multi-select, all picked by default; edit = the sites it
     was synced to (read-only) · times sent as Bangkok time (convertToBangkokTimezone)
     close before open → the app silently turns Enabled off
     edit only while not cancelled / settled / resulted; slave sites → 401
   Changes: close-before-open is an error on the field instead of flipping the switch; the
   Bangkok time is said out loud; status chip + "can't edit" notice for finished rounds.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var R = DS.rounds;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var pad = function (n) {
    return String(n).padStart(2, "0");
  };
  // ms ↔ <input type="datetime-local"> value
  var toLocal = function (t) {
    var d = new Date(t);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  var fromLocal = function (v) {
    return v ? new Date(v).getTime() : NaN;
  };

  var id = DS.params.get("id");
  var record = id ? M.round(id) : null;
  var isEdit = !!record;
  var locked = isEdit && !R.editable(record);
  var canSyncSites = true; // useAbilitySyncSite()

  // Games grouped by lotto group (getGameOptionsV2)
  var gameOptions = [];
  M.groups.forEach(function (grp) {
    M.games.filter(function (g) {
      return g.lottoGroupId === grp.id;
    }).forEach(function (g) {
      gameOptions.push({ value: String(g.id), label: L.name(g.translations), group: L.name(grp.translations) });
    });
  });

  var sections = [
    {
      title: "Round",
      description: "Times are Bangkok time (GMT+7).",
      fields: [
        { name: "lottoGameId", label: "Game", type: "select", required: true, placeholder: "Select a game", span: 2,
          options: gameOptions, disabled: isEdit, messages: { required: "Pick a game." },
          helper: isEdit ? "A round's game can't be changed." : "" },
        { name: "openAt", label: "Opens at", type: "datetime", required: true, disabled: isEdit,
          messages: { required: "Pick when the round opens." } },
        { name: "closeAt", label: "Closes at", type: "datetime", required: true,
          messages: { required: "Pick when the round closes." },
          validate: function (v, values) {
            return fromLocal(v) <= fromLocal(values.openAt) ? "Closing time must be after the opening time." : "";
          } },
        { name: "isEnable", label: "Enabled", type: "switch" },
      ],
    },
  ];
  if (canSyncSites) {
    sections.push(
      isEdit
        ? {
            title: "Sync sites",
            description: "The sites this round was synced to. Set when the round was created.",
            fields: [{ name: "sites", label: "Synced to", type: "html", render: function () {
              return '<div class="chip-row">' + record.syncSiteIds.map(function (sid) {
                var s = M.syncSites.filter(function (x) {
                  return x.id === sid;
                })[0];
                return '<span class="chip chip--outlined"><iconify-icon icon="tabler:lock"></iconify-icon>' + esc(s.name) + "</span>";
              }).join("") + "</div>";
            } }],
          }
        : {
            title: "Sync sites",
            description: "Also create this round on these sites.",
            fields: [{ name: "siteIds", label: "Sites", type: "multiselect", placeholder: "Select sites", span: 2,
              options: M.syncSites.map(function (s) {
                return { value: String(s.id), label: s.name };
              }) }],
          }
    );
  }

  /* ---------- Header ---------- */
  if (isEdit) {
    var g = M.games.filter(function (x) {
      return x.id === record.lottoGameId;
    })[0];
    document.title = "Edit round " + record.id + " | Admin prototype";
    $("form-title").textContent = "Edit round";
    $("form-chip").innerHTML = R.statusChip(record);
    $("form-sub").textContent = L.name(g.translations) + ", round " + record.id;
    $("form-submit").textContent = "Save changes";
    if (locked) {
      $("form-notice").innerHTML =
        '<div class="alert alert--info" role="status" style="margin-bottom:16px;max-width:960px"><iconify-icon icon="tabler:lock"></iconify-icon><div class="alert__body">' +
        '<div class="alert__text">This round is ' + R.status(record).label.toLowerCase() + ", so it can't be edited.</div></div></div>";
    }
  }
  var parentGame = isEdit ? M.games.filter(function (g) {
    return g.id === record.lottoGameId;
  })[0] : null;
  var parent = R.parentList(parentGame); // ?from=pending → back to Pending round
  var back = document.querySelector(".back-link");
  if (back) back.outerHTML = R.backLinkHTML(parentGame);
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = parent.crumbs.concat([isEdit ? "Edit round" : "New round"]);
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  /* ---------- Form ---------- */
  var start = new Date(fmt.now);
  start.setMinutes(0, 0, 0);
  var defaults = {
    openAt: toLocal(start.getTime() + 3600000),
    closeAt: toLocal(start.getTime() + 25 * 3600000),
    isEnable: true,
    siteIds: M.syncSites.map(function (s) {
      return String(s.id);
    }),
  };
  var toForm = function (r) {
    return { lottoGameId: String(r.lottoGameId), openAt: toLocal(r.openAt), closeAt: toLocal(r.closeAt), isEnable: r.isEnable === "yes" };
  };
  var form = DS.form.create({
    root: $("round-form"),
    sections: sections,
    values: isEdit ? toForm(record) : defaults,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = parent.href;
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        console.log("[prototype] payload", values);
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Round created", "tabler:circle-check");
        setTimeout(function () {
          location.href = parent.href;
        }, 1200);
      }, 900);
    },
  });
  if (locked) {
    // Everything off (the notice says why); Cancel stays on as the way back
    form.setBusy(true);
    DS.ui.busy($("form-submit"), false);
    $("form-submit").disabled = true;
    document.querySelector("#round-form [data-form-cancel]").disabled = false;
    document.querySelector("#round-form [data-form-status]").textContent = "Read only";
  }

  /* ---------- Prototype states ---------- */
  var states = isEdit ? ["default", "loading", "dirty", "errors", "saving"] : ["default", "filled", "errors", "close-before-open", "saving"];
  function setState(s) {
    if (locked) return;
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : defaults);
    var f = $("round-form");
    if (s === "filled" || s === "saving" || s === "close-before-open") form.set(Object.assign({}, defaults, { lottoGameId: "309" }));
    if (s === "close-before-open") {
      form.setValue("closeAt", toLocal(start.getTime() - 3600000));
      f.requestSubmit();
    }
    if (s === "dirty") form.setValue("closeAt", toLocal(record.closeAt + 1800000));
    if (s === "errors") {
      if (isEdit) form.setValue("closeAt", "");
      f.requestSubmit();
    }
    if (s === "saving") {
      if (isEdit) form.setValue("closeAt", toLocal(record.closeAt + 1800000));
      form.setBusy(true);
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: locked ? ["read-only"] : states, state: locked ? "read-only" : initial, setState: setState };
  setState(initial);
})(window.DS);
