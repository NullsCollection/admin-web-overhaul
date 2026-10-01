/* ==========================================================================
   Billing (Phase 11e) on the LIST TEMPLATE. ?view=history = /billings/history (past cycles, read-only actions)
   Source: views/pages/billings/useBillingPage.tsx (+ useActionSection, DialogConfirmPaid, useHistoryDialog,
     DialogExport, TiggerBillingDialog / ContentTrigger, CostPriceErrorModal); useBillingHistoryPage.tsx
     columns: Provider, Start date, End date, Profit (chip green > 0 / blue 0 / red < 0), ROI (same chip
       colors), Current profit (chip), Share status (Waiting for revenue review = warning, Ready to pay = info,
       Paid = success, Cancelled = error), Status (queue Processing / Done / Failed), RowOptions:
       View slip (paid), Cancel payment (paid), Export CSV (done, not before Oct), Payment history (done),
       View contact, View detail, Confirm payment (done + waiting / ready / cancel), Delete (not paid)
     filters: provider (if not one provider), contact URL, month start / end (default this month), status
     checkbox selection + Export → CSV of the picked bills ("noSelected" toast when none)
     header: Manage bill (Trigger dialog: month, providers + Select all, report max trigger time) → may fail
       with CostPriceErrorModal (provider — game: config / override cost price not set); history link
   Changes: money in ink with a minus sign, red only when below 0 (no green / blue / red chips on 3
   columns); one Period column; share status chips (Cancelled neutral); report status shown only when it
   isn't Done (Processing / Failed + the reason); View + Delete as icons (Delete greyed out on paid bills
   with the reason), the rest in ⋮ by importance (Confirm payment first); payment dialog with a real file
   picker + preview; a selection bar for the CSV export.
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var M = DS.mock;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var history = DS.params.get("view") === "history";
  var rows = M.billings.filter(function (b) {
    return history ? b.cycle > 0 : b.cycle === 0;
  });
  var SHARE = {
    waiting: { label: "Waiting for review", tone: "warning" },
    ready: { label: "Ready to pay", tone: "info" },
    paid: { label: "Paid", tone: "success" },
    cancel: { label: "Cancelled", tone: "" },
  };
  var ym = function (d) {
    d = new Date(d);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  };
  var monthName = function (d) {
    return new Date(d).toLocaleString("en-GB", { month: "long", year: "numeric" });
  };
  var cur = function (b) {
    return b.provider.currency.code;
  };
  var money = function (n, c) {
    return n < 0 ? '<span class="t-error">' + fmt.money(n, c) + "</span>" : fmt.money(n, c);
  };
  var who = function (b) {
    return b.provider.name + ", " + monthName(b.reportStartAt);
  };

  /* ---------- Page mode ---------- */
  if (history) {
    $("page-title").textContent = "Billing history";
    $("back").hidden = false;
    $("page-actions").innerHTML = "";
    document.title = "Billing history | Admin prototype";
    var crumbs = document.querySelector(".topbar__crumbs");
    if (crumbs) crumbs.innerHTML = '<span>Admin</span><iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon><span>Billing</span>' +
      '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon><span aria-current="page">History</span>';
  }

  /* ---------- Filters ---------- */
  $("f-provider").innerHTML = '<option value="all">All providers</option>' + M.providers.slice(0, 10).map(function (p) {
    return '<option value="' + p.id + '">' + esc(p.name) + " (" + esc(p.prefixCode) + ")</option>";
  }).join("");
  $("f-contact").innerHTML = '<option value="all">All contact URLs</option>' + M.providers.slice(0, 10).map(function (p) {
    return '<option value="' + p.id + '">' + esc(M.providerDetail(p.id).contactUrl.replace(/^https?:\/\//, "")) + "</option>";
  }).join("");
  var months = rows.map(function (b) {
    return ym(b.reportStartAt);
  }).sort();
  $("f-from").value = history ? months[0] : months[months.length - 1];
  $("f-to").value = months[months.length - 1];

  var list = DS.list.create({
    root: $("bills-card"),
    noun: ["bill", "bills"],
    selectable: true,
    rows: function () {
      return rows;
    },
    search: function (r) {
      return r.provider.name;
    },
    filters: {
      provider: function (r, v) {
        return String(r.provider.id) === v;
      },
      contact: function (r, v) {
        return String(r.provider.id) === v;
      },
      from: function (r, v) {
        return ym(r.reportStartAt) >= v;
      },
      to: function (r, v) {
        return ym(r.reportStartAt) <= v;
      },
      status: function (r, v) {
        return r.percentShareStatus === v;
      },
    },
    onSelect: function (ids) {
      $("sel-bar").hidden = !ids.length;
      $("sel-count").textContent = ids.length + (ids.length === 1 ? " bill picked" : " bills picked");
    },
    columns: [
      { key: "provider", label: "Provider", className: "is-strong", sortValue: function (r) {
        return r.provider.name;
      }, render: function (r) {
        return DS.ui.ident(r.provider.name, r.provider.prefixCode, { square: true });
      } },
      // A whole month reads as the month; a part month (cut-off before the end) shows its days
      { key: "reportStartAt", label: "Month", render: function (r) {
        var s = new Date(r.reportStartAt);
        var e = new Date(r.reportEndAt);
        var whole = s.getDate() === 1 && new Date(e.getTime() + 864e5).getDate() === 1;
        return '<span>' + s.toLocaleString("en-GB", { month: "short", year: "numeric" }) + "</span>" +
          (whole ? "" : '<span class="cell-sub">' + fmt.dayMonth(s) + " – " + fmt.dayMonth(e) + "</span>");
      } },
      { key: "profit", label: "Profit", num: true, render: function (r) {
        return money(r.profit, cur(r));
      } },
      { key: "profitPercent", label: "ROI", num: true, render: function (r) {
        return r.profitPercent < 0 ? '<span class="t-error">' + fmt.pct(r.profitPercent) + "</span>" : fmt.pct(r.profitPercent);
      } },
      { key: "currentProfit", label: "Current profit", num: true, render: function (r) {
        return money(r.currentProfit, cur(r));
      } },
      { key: "percentShareStatus", label: "Share status", render: function (r) {
        var s = SHARE[r.percentShareStatus];
        var q = r.queue.status;
        // The report status only shows when it isn't done (the app had a Done chip on almost every row)
        var report = q === "processing" ? '<div class="t-caption t-muted">Report processing…</div>'
          : q === "failed" ? '<div class="t-caption t-error" title="' + esc(r.failedMessage) + '">Report failed</div>' : "";
        return '<span class="chip' + (s.tone ? " chip--" + s.tone : "") + '"><span class="chip__dot"></span>' + s.label + "</span>" + report;
      } },
    ],
    rowName: who,
    actions: function (r) {
      var done = r.queue.status === "done";
      var st = r.percentShareStatus;
      var a = [
        { label: "View detail", icon: "tabler:eye", href: "billing.html?id=" + r.id, kind: "view" },
        { label: "Delete", icon: "tabler:trash", action: "delete", kind: "delete", danger: true,
          disabled: st === "paid" ? "Paid bills can't be deleted. Cancel the payment first." : "" },
      ];
      if (done && ["waiting", "ready", "cancel"].indexOf(st) > -1) a.push({ label: "Confirm payment", icon: "tabler:cash", action: "pay" });
      if (st === "paid") a.push({ label: "Payment slip", icon: "tabler:receipt", action: "slip" });
      if (st === "paid") a.push({ label: "Cancel payment", icon: "tabler:receipt-refund", action: "unpay" });
      if (done) a.push({ label: "Payment history", icon: "tabler:history", action: "history" });
      if (done) a.push({ label: "Export CSV", icon: "tabler:file-spreadsheet", action: "csv" });
      a.push({ label: "Contact page", icon: "tabler:address-book", action: "contact" });
      return a;
    },
    onAction: function (action, row) {
      ({ delete: confirmDelete, pay: confirmPay, slip: showSlip, unpay: cancelPay, history: showHistory, csv: exportCsv, contact: showContact })[action](row);
    },
    empty: history
      ? { icon: "tabler:history", title: "No past bills", text: "Bills from earlier months show up here." }
      : { icon: "tabler:file-invoice", title: "No bills this month", text: "Run billing to create this month's bills." },
    noResults: { icon: "tabler:search", title: "No bills match", text: "Try other months, another provider or status." },
  });

  /* ---------- Row actions ---------- */
  function confirmDelete(row) {
    DS.dialog.open({
      icon: "tabler:trash", tone: "error", title: "Delete this bill?",
      html: "The bill for <strong>" + esc(who(row)) + "</strong> will be removed. This can't be undone.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Delete bill", variant: "contained", tone: "error", onClick: function (b, close) {
          DS.ui.busy(b, true, "Deleting…");
          setTimeout(function () {
            close();
            rows.splice(rows.indexOf(row), 1);
            DS.ui.toast("Bill deleted", "tabler:circle-check");
            list.refresh();
          }, 700);
        } },
      ],
    });
  }

  // DialogConfirmPaid: bill file (image → base64) + paid price > 0 + "Resolve past slip"
  function confirmPay(row) {
    DS.dialog.open({
      icon: "tabler:cash", tone: "primary", title: "Confirm payment",
      html: "Bill for <strong>" + esc(who(row)) + "</strong>. Share " + row.percentShare + "% = <strong>" + fmt.money(row.percentShareAmount, cur(row)) + "</strong>.",
      body: '<div class="stack" style="gap:16px">' +
        '<div class="field"><span class="field__label" id="slip-label">Payment slip<span class="req" aria-hidden="true">*</span></span>' +
        '<label class="file-drop" id="slip-drop"><input type="file" id="slip-file" accept="image/*,application/pdf" aria-labelledby="slip-label">' +
        '<iconify-icon icon="tabler:upload"></iconify-icon><span class="file-drop__text"><strong>Choose a file</strong> or drop it here<span class="t-body2 t-muted">Image or PDF</span></span></label>' +
        '<div class="file-pick" id="slip-picked" hidden></div></div>' +
        '<div class="field"><label class="field__label" for="slip-price">Paid amount<span class="req" aria-hidden="true">*</span></label>' +
        '<div class="field__control field__control--number"><input id="slip-price" inputmode="decimal" value="' + row.percentShareAmount.toFixed(2) + '"></div></div>' +
        '<label class="checkbox"><input type="checkbox" id="slip-past"><span class="check"><iconify-icon icon="tabler:check"></iconify-icon></span>Resolve a past slip</label></div>',
      actions: [
        { label: "Cancel", variant: "outlined" },
        { label: "Confirm payment", variant: "contained", onClick: function (b, close) {
          var file = $("slip-file").files[0] || $("slip-drop").dataset.mock;
          var price = Number($("slip-price").value);
          var bad = false;
          if (!file) {
            $("slip-drop").classList.add("is-invalid");
            bad = true;
          }
          DS.ui.fieldError($("slip-price"), price > 0 ? "" : "Enter an amount above 0.");
          if (bad || !(price > 0)) return;
          DS.ui.busy(b, true, "Confirming…");
          setTimeout(function () {
            close();
            row.percentShareStatus = "paid";
            row.paidAt = Date.now();
            DS.ui.toast("Payment confirmed for " + who(row), "tabler:circle-check");
            list.refresh();
          }, 800);
        } },
      ],
    });
    var drop = $("slip-drop");
    var show = function (name, size) {
      drop.classList.remove("is-invalid");
      $("slip-picked").hidden = false;
      $("slip-picked").innerHTML = '<iconify-icon icon="tabler:file-check"></iconify-icon><span class="t-body2"><strong>' + esc(name) + "</strong> · " + size +
        '</span><button type="button" class="icon-btn icon-btn--sm" id="slip-remove" aria-label="Remove file" title="Remove"><iconify-icon icon="tabler:x"></iconify-icon></button>';
      $("slip-remove").addEventListener("click", function () {
        $("slip-file").value = "";
        delete drop.dataset.mock;
        $("slip-picked").hidden = true;
      });
    };
    $("slip-file").addEventListener("change", function () {
      var f = this.files[0];
      if (f) show(f.name, Math.max(1, Math.round(f.size / 1024)) + " KB");
    });
    ["dragover", "dragenter"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.classList.add("is-over");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.classList.remove("is-over");
        if (ev === "drop" && e.dataTransfer.files[0]) {
          $("slip-file").files = e.dataTransfer.files;
          show(e.dataTransfer.files[0].name, Math.round(e.dataTransfer.files[0].size / 1024) + " KB");
        }
      });
    });
    DS.page.pickMock = function () {
      drop.dataset.mock = "slip-sep-2026.png";
      show("slip-sep-2026.png", "184 KB");
    };
  }

  function showSlip(row) {
    DS.dialog.open({
      icon: "tabler:receipt", tone: "primary", wide: true, title: "Payment slip",
      html: esc(who(row)) + ", paid " + fmt.dateTime(row.paidAt) + ", " + fmt.money(row.percentShareAmount, cur(row)) + ".",
      body: '<div class="slip-preview"><iconify-icon icon="tabler:photo"></iconify-icon><span class="t-body2 t-muted">slip-' + row.id + '.png</span></div>',
      actions: [{ label: "Close", variant: "outlined", autofocus: true }],
    });
  }
  function cancelPay(row) {
    DS.dialog.open({
      icon: "tabler:receipt-refund", tone: "error", title: "Cancel this payment?",
      html: "The bill for <strong>" + esc(who(row)) + "</strong> goes back to Cancelled, and can be paid again.",
      actions: [
        { label: "Keep it paid", variant: "outlined", autofocus: true },
        { label: "Cancel payment", variant: "contained", tone: "error", onClick: function (b, close) {
          DS.ui.busy(b, true, "Cancelling…");
          setTimeout(function () {
            close();
            row.percentShareStatus = "cancel";
            DS.ui.toast("Payment cancelled", "tabler:circle-check");
            list.refresh();
          }, 700);
        } },
      ],
    });
  }
  var ACTION = { created: "Bill created", paid: "Payment confirmed", cancel_paid: "Payment cancelled" };
  function showHistory(row) {
    var h = M.billingHistory(row);
    DS.dialog.open({
      icon: "tabler:history", tone: "primary", wide: true, title: "Payment history", html: esc(who(row)) + ".",
      body: '<div class="table-wrap"><table class="table table--compact table--inset"><thead><tr><th scope="col">What</th><th scope="col">By</th>' +
        '<th scope="col" class="is-num">Paid amount</th><th scope="col">When</th></tr></thead><tbody>' + h.map(function (x) {
          return '<tr><td class="is-strong">' + ACTION[x.action] + "</td><td>" + esc(x.user.name) + '</td><td class="is-num">' +
            (x.percentShareAmount != null ? fmt.money(x.percentShareAmount, cur(row)) : '<span class="t-faint">–</span>') + "</td><td>" + fmt.dateTime(x.at) + "</td></tr>";
        }).join("") + "</tbody></table></div>",
      actions: [{ label: "Close", variant: "outlined", autofocus: true }],
    });
  }
  function exportCsv(row) {
    DS.ui.toast("CSV for " + who(row) + " downloaded", "tabler:file-spreadsheet");
  }
  function showContact(row) {
    var url = M.providerDetail(row.provider.id).contactUrl;
    DS.dialog.open({
      icon: "tabler:address-book", tone: "primary", title: "Contact " + row.provider.name, html: "Their contact page:",
      body: '<pre class="code-block code-block--wrap">' + esc(url) + '<span class="code-block__copy"><button type="button" class="icon-btn icon-btn--sm" data-copy="' + esc(url) +
        '" data-copy-label="Contact URL copied" aria-label="Copy contact URL" title="Copy"><iconify-icon icon="tabler:copy"></iconify-icon></button></span></pre>',
      actions: [{ label: "Close", variant: "outlined" }, { label: "Open page", variant: "contained", autofocus: true, onClick: function (b, close) {
        close();
        DS.ui.toast("Opens " + url + " in a new tab", "tabler:external-link");
      } }],
    });
  }

  $("sel-export").addEventListener("click", function () {
    var n = list.selected().length;
    DS.ui.toast("CSV for " + n + (n === 1 ? " bill" : " bills") + " downloaded", "tabler:file-spreadsheet");
  });
  $("sel-clear").addEventListener("click", function () {
    list.clearSelection();
  });

  /* ---------- Run billing (TiggerBillingDialog → ContentTrigger) ---------- */
  function runBilling(failCost) {
    DS.dialog.open({
      icon: "tabler:player-play", tone: "primary", title: "Run billing",
      html: "Creates the bills for one month. Bets settled after the cut-off wait for the next run.",
      body: '<div class="stack" style="gap:16px"><div class="field"><label class="field__label" for="run-month">Month<span class="req" aria-hidden="true">*</span></label>' +
        '<div class="field__control"><input type="month" id="run-month" value="' + ym(fmt.now) + '"></div></div>' +
        '<div class="field"><label class="field__label" for="run-cut">Cut-off time<span class="req" aria-hidden="true">*</span></label>' +
        '<div class="field__control"><input type="datetime-local" id="run-cut" value="2026-09-30T23:59"></div><div class="field__helper">Report max trigger time</div></div>' +
        '<label class="checkbox"><input type="checkbox" id="run-all" checked><span class="check"><iconify-icon icon="tabler:check"></iconify-icon></span>All providers (' + M.providers.length + ")</label></div>",
      actions: [
        { label: "Cancel", variant: "outlined" },
        { label: "Run billing", variant: "contained", onClick: function (b, close) {
          DS.ui.busy(b, true, "Running…");
          setTimeout(function () {
            close();
            if (failCost) return costError();
            DS.ui.toast("Billing for " + monthName($("run-month") ? $("run-month").value + "-01" : fmt.now) + " started", "tabler:circle-check");
          }, 900);
        } },
      ],
    });
  }
  // CostPriceErrorModal: which provider / game has no billing cost price
  function costError() {
    DS.dialog.open({
      icon: "tabler:alert-triangle", tone: "error", wide: true, title: "Set the missing cost prices first",
      html: "Billing didn't run. These Set lottery games have no cost price. Set them, then run billing again.",
      body: '<ul class="dialog__list"><li><strong>Siam 88</strong> — Thai government set: no cost price on the config (<a href="lotto-config-form.html?id=212">Config</a>)</li>' +
        '<li><strong>Mekong Play</strong> — Lao set 6 digits: no provider cost (<a href="lotto-game-provider-cost.html?id=324">Provider cost</a>)</li></ul>',
      actions: [{ label: "OK", variant: "contained", autofocus: true }],
    });
  }
  if (!history) $("run-billing").addEventListener("click", function () {
    runBilling(false);
  });

  /* ---------- Prototype states ---------- */
  var states = history ? ["data", "loading", "empty", "error"] : ["data", "loading", "empty", "no-results", "error", "pay", "pay-picked", "history-dialog", "run", "cost-error"];
  function setState(s) {
    DS.dialog.close();
    list.setMode(["data", "loading", "empty", "no-results", "error"].indexOf(s) > -1 ? s : "data");
    var ready = rows.filter(function (r) {
      return r.percentShareStatus === "ready" && r.queue.status === "done";
    })[0] || rows[0];
    setTimeout(function () {
      if (s === "pay" || s === "pay-picked") {
        confirmPay(ready);
        if (s === "pay-picked") DS.page.pickMock();
      }
      if (s === "history-dialog") showHistory(M.billings.filter(function (b) {
        return b.percentShareStatus === "cancel";
      })[0]);
      if (s === "run") runBilling(false);
      if (s === "cost-error") costError();
    }, 450);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
