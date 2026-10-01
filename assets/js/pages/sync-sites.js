/* ==========================================================================
   Sync sites (Phase 11d).
   Source: src/pages/sync/index.tsx + components/SyncSite/SyncSiteForm.tsx + SyncDataTable/ErrorReceiverEvent.tsx
     sites: ID, Callback URL, Status (a Switch that saves right away + an outlined chip saying the same),
       Created at, Updated at, Actions (Edit → dialog form: callback URL req + status; Delete → window.confirm)
     "Found N sync sites"; ErrorReceiverEvent table below: Model, Reference ID, Master reference ID,
       Action, Incoming request payload (View → dialog), Error message (View → dialog), Created, Updated
   Changes: the switch alone shows the status (no repeated chip); our confirm dialog instead of
   window.confirm; turning a site off asks first (it stops getting syncs; proposal); the add / edit
   dialog checks the URL; receive errors show the error text in the row (one line) and one View opens
   the error + the payload together; model + action in words.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var sites = M.syncSites;
  var errors = M.syncErrors.slice();
  var MODEL = { lotto_round_games: "Rounds", lotto_games: "Games", lotto_groups: "Lotto groups", lotto_round_results: "Round results" };
  var ACTION = { create: "Create", update: "Update", delete: "Delete", cancel_round: "Cancel round", create_result: "Create result",
    confirm_result: "Confirm result", cancel_result: "Cancel result", cancel_resulted: "Cancel resulted" };
  var URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i;

  /* ---------- Sites ---------- */
  var siteList = DS.list.create({
    root: $("sites-card"),
    noun: ["site", "sites"],
    rows: function () {
      return sites;
    },
    search: function (r) {
      return r.callbackUrl;
    },
    filters: {},
    columns: [
      { key: "id", label: "ID", num: true, render: function (r) {
        return '<span class="t-muted">' + r.id + "</span>";
      } },
      { key: "callbackUrl", label: "Callback URL", className: "is-strong", render: function (r) {
        return esc(r.callbackUrl);
      } },
      { key: "status", label: "Status", sortable: false, render: function (r) {
        var on = r.status === "active";
        return '<label class="switch"><input type="checkbox" role="switch" data-toggle="' + r.id + '"' + (on ? " checked" : "") +
          ' aria-label="' + esc(r.callbackUrl) + ' active"><span class="switch__track"><span class="switch__thumb"></span></span>' +
          '<span class="switch__label">' + (on ? "Active" : "Off") + "</span></label>";
      } },
      { key: "updatedAt", label: "Last updated", render: function (r) {
        return fmt.dateTime(r.updatedAt);
      } },
    ],
    rowName: function (r) {
      return r.callbackUrl;
    },
    actions: function () {
      return [
        { label: "Edit", icon: "tabler:pencil", action: "edit", kind: "edit" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true },
      ];
    },
    onAction: function (a, row) {
      if (a === "edit") openForm(row);
      if (a === "delete") confirmDelete(row);
    },
    empty: { icon: "tabler:refresh", title: "No sync sites yet", text: "Add a site to send it rounds, games and results." },
    noResults: { icon: "tabler:search", title: "No sites match", text: "" },
  });

  $("sites-card").addEventListener("change", function (e) {
    var t = e.target.closest("[data-toggle]");
    if (!t) return;
    var row = sites.filter(function (s) {
      return String(s.id) === t.getAttribute("data-toggle");
    })[0];
    var on = t.checked;
    t.checked = !on;
    var save = function () {
      row.status = on ? "active" : "inactive";
      row.updatedAt = Date.now();
      siteList.refresh();
      DS.ui.toast(row.name + (on ? " is active" : " is off"), "tabler:circle-check");
    };
    if (on) return save(); // the app saves right away
    DS.dialog.open({
      icon: "tabler:toggle-left", tone: "warning", title: "Turn off " + row.name + "?",
      html: "It stops getting rounds, games and results until you turn it back on.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Turn off", variant: "contained", onClick: function (b, close) {
          close();
          save();
        } },
      ],
    });
  });

  // SyncSiteForm (dialog): callback URL + status
  function openForm(row) {
    var isEdit = !!row;
    DS.dialog.open({
      icon: isEdit ? "tabler:pencil" : "tabler:plus", tone: "primary", title: isEdit ? "Edit sync site" : "New sync site",
      html: "The URL this site receives sync calls on.",
      body: '<div class="stack" style="gap:16px"><div class="field"><label class="field__label" for="ss-url">Callback URL<span class="req" aria-hidden="true">*</span></label>' +
        '<div class="field__control"><input id="ss-url" type="url" placeholder="https://sync.example.com/api/sync" value="' + esc(isEdit ? row.callbackUrl : "") + '"></div></div>' +
        '<label class="switch"><input type="checkbox" role="switch" id="ss-active"' + (!isEdit || row.status === "active" ? " checked" : "") +
        '><span class="switch__track"><span class="switch__thumb"></span></span><span class="switch__label">Active</span></label></div>',
      actions: [
        { label: "Cancel", variant: "outlined" },
        { label: isEdit ? "Save changes" : "Add site", variant: "contained", onClick: function (b, close) {
          var inp = $("ss-url");
          var v = inp.value.trim();
          var msg = !v ? "Enter the callback URL." : !URL_RE.test(v) ? "Enter a full URL that starts with http:// or https://" : "";
          DS.ui.fieldError(inp, msg);
          if (msg) return inp.focus();
          DS.ui.busy(b, true, "Saving…");
          setTimeout(function () {
            close();
            var host = v.replace(/^https?:\/\//, "").split("/")[0];
            if (isEdit) Object.assign(row, { callbackUrl: v, name: host, status: $("ss-active") && $("ss-active").checked ? "active" : "inactive", updatedAt: Date.now() });
            else sites.push({ id: sites.length + 1, callbackUrl: v, name: host, status: "active", createdAt: Date.now(), updatedAt: Date.now() });
            DS.ui.toast(isEdit ? "Sync site saved" : "Sync site added", "tabler:circle-check");
            siteList.refresh();
          }, 600);
        } },
      ],
    });
    setTimeout(function () {
      if ($("ss-url")) $("ss-url").focus();
    }, 50);
  }
  $("add-site").addEventListener("click", function () {
    openForm(null);
  });

  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash", tone: "error", title: "Delete this sync site?",
      html: "<strong>" + esc(row.callbackUrl) + "</strong> stops getting syncs. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete site", variant: "contained", tone: "error", onClick: function (b, close) {
          DS.ui.busy(b, true, "Deleting…");
          setTimeout(function () {
            close();
            sites.splice(sites.indexOf(row), 1);
            DS.ui.toast(row.name + " deleted", "tabler:circle-check");
            siteList.refresh();
          }, 600);
        } },
      ],
    });
  }

  /* ---------- Receive errors ---------- */
  var errList = DS.list.create({
    root: $("errors-card"),
    noun: ["error", "errors"],
    count: false,
    rows: function () {
      return errors;
    },
    search: function (r) {
      return r.referenceId + " " + r.masterReferenceId + " " + r.errorMessage;
    },
    filters: {},
    columns: [
      { key: "model", label: "What", render: function (r) {
        return '<span class="t-medium">' + esc(MODEL[r.model] || r.model) + '</span><span class="cell-sub">' + esc(ACTION[r.masterReferenceAction] || r.masterReferenceAction) + "</span>";
      } },
      { key: "referenceId", label: "Reference ID", num: true, render: function (r) {
        return '<span class="t-num">' + r.referenceId + "</span>";
      } },
      { key: "masterReferenceId", label: "Master ref ID", num: true, render: function (r) {
        return '<span class="t-num t-muted">' + r.masterReferenceId + "</span>";
      } },
      { key: "errorMessage", label: "Error", sortable: false, render: function (r) {
        return '<span class="cell-clip" title="' + esc(r.errorMessage) + '">' + esc(r.errorMessage) + "</span>";
      } },
      { key: "createdAt", label: "When", render: function (r) {
        return fmt.dateTime(r.createdAt) + '<span class="cell-sub">' + fmt.ago(r.createdAt) + "</span>";
      } },
    ],
    rowName: function (r) {
      return "error " + r.id;
    },
    actions: function () {
      return [{ label: "View", icon: "tabler:eye", action: "view", kind: "view" }];
    },
    onAction: function (a, r) {
      var json = JSON.stringify(r.incomingRequestPayload, null, 2);
      DS.dialog.open({
        icon: "tabler:alert-triangle", tone: "error", wide: true,
        title: (MODEL[r.model] || r.model) + " · " + (ACTION[r.masterReferenceAction] || r.masterReferenceAction) + " failed",
        html: "Reference " + r.referenceId + " (master " + r.masterReferenceId + "), " + fmt.dateTimeSec(r.createdAt) + ".",
        body: '<div class="alert alert--error" style="margin-bottom:16px"><iconify-icon icon="tabler:alert-triangle"></iconify-icon><div class="alert__body"><div class="alert__text">' +
          esc(r.errorMessage) + '</div></div></div><div class="t-subtitle2" style="margin-bottom:8px">Incoming request payload</div>' +
          '<pre class="code-block">' + esc(json) + '<span class="code-block__copy"><button type="button" class="icon-btn icon-btn--sm" data-copy="' + esc(json) +
          '" data-copy-label="Payload copied" aria-label="Copy payload" title="Copy"><iconify-icon icon="tabler:copy"></iconify-icon></button></span></pre>',
        actions: [{ label: "Close", variant: "outlined", autofocus: true }],
      });
    },
    empty: { icon: "tabler:circle-check", title: "No receive errors", text: "Every sync call this site got was applied." },
    noResults: { icon: "tabler:search", title: "No errors match", text: "Try another reference ID." },
  });

  var states = ["data", "loading", "empty", "error", "add", "error-detail"];
  function setState(s) {
    DS.dialog.close();
    var m = s === "add" || s === "error-detail" ? "data" : s;
    siteList.setMode(m);
    errList.setMode(m);
    if (s === "add") setTimeout(function () {
      openForm(null);
    }, 400);
    if (s === "error-detail") setTimeout(function () {
      errList && document.querySelector('#errors-card [data-row-action="view"]').click();
    }, 600);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
