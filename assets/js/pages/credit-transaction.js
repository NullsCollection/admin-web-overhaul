/* ==========================================================================
   Credit transaction details (Phase 9d). ?id=<transaction id>
   Source: views/pages/lotto/credit-transaction/CreditTransactionForm.tsx — GenericForm in viewMode:
     read-only fields Player, Related player, Amount (raw), Total amount (formatted), type chip,
     Note (by UI language), Transaction date (date only); "-" for empty, and also for 0 (falsy check)
     route acl: lotto.credit_transaction_type.update (not credit_transaction.read)
   Changes: the detail template (summary v2, like ticket details) instead of disabled inputs:
   player identity + provider, facts as label / value rows, Amount + Total in the totals column.
   Adds what the API already returns but the page hid: transaction type, transfer type (with its
   color), provider. 0 shows as 0. Date with time. Both notes (English, Thai under it).
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var row = function (label, html) {
    return '<div class="kv-row"><dt>' + label + "</dt><dd>" + html + "</dd></div>";
  };
  var none = '<span class="t-faint">–</span>';
  var copyBtn = function (text, what) {
    return '<button type="button" class="icon-btn icon-btn--sm" data-copy="' + esc(text) + '" data-copy-label="' + esc(what) + ' copied" aria-label="Copy ' +
      esc(what.toLowerCase()) + '" title="Copy"><iconify-icon icon="tabler:copy"></iconify-icon></button>';
  };

  function render(t) {
    var cur = (t.provider && t.provider.currency && t.provider.currency.code) || "THB";
    var tt = t.creditTransactionType;
    var tr = t.creditTransactionTransferType;
    var initials = t.player.username.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();
    $("t-problem").hidden = true;
    $("t-summary").hidden = false;
    $("t-title").textContent = "Transaction " + t.id;
    $("t-type").innerHTML = t.type === "credit"
      ? '<span class="chip chip--success"><span class="chip__dot"></span>Credit</span>'
      : '<span class="chip"><span class="chip__dot"></span>Debit</span>';
    $("t-sub").textContent = fmt.dateTimeSec(t.transactionDate) + " · " + t.provider.name;
    document.title = "Transaction " + t.id + " | Admin prototype";
    var crumbs = document.querySelector(".topbar__crumbs");
    if (crumbs) {
      var parts = ["Lotto", "Limits & credit", "Credit transactions", "Transaction " + t.id];
      crumbs.innerHTML = parts.map(function (c, i) {
        var end = i === parts.length - 1;
        return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
          (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
      }).join("");
    }

    $("t-summary").innerHTML =
      '<div class="summary__main"><div class="summary__who">' +
      '<div class="summary__person"><span class="avatar">' + esc(initials) + "</span><div>" +
      '<div class="summary__name">' + esc(t.player.displayName) + '</div><div class="summary__sub">' + esc(t.player.username) + " · Player ID " + t.player.id + "</div></div></div>" +
      '<div class="summary__aside"><span class="summary__sub">Provider</span><strong>' + esc(t.provider.name) + "</strong></div></div>" +
      '<dl class="kv-rows">' +
      row("Related player", t.relatedPlayer ? esc(t.relatedPlayer.displayName) + ' <span class="t-muted">' + esc(t.relatedPlayer.username) + "</span>" : none) +
      row("Transaction type", tt ? esc(tt.name) + ' <span class="code">' + esc(tt.code) + "</span>" : none) +
      row("Transfer type", tr ? '<span class="swatch-row"><span class="swatch" style="--swatch:' + esc(tr.color) + '" aria-hidden="true"></span>' + esc(tr.nameEn || tr.nameTh) + "</span>" : none) +
      row("Note", t.creditTransactionNoteEn || t.creditTransactionNote
        ? '<span class="stack" style="gap:2px"><span>' + esc(t.creditTransactionNoteEn || t.creditTransactionNote) + "</span>" +
          (t.creditTransactionNoteEn && t.creditTransactionNote ? '<span class="t-body2 t-muted">' + esc(t.creditTransactionNote) + "</span>" : "") + "</span>"
        : none) +
      row("Date", '<span class="t-num">' + fmt.dateTimeSec(t.transactionDate) + "</span>") +
      row("Transaction ID", '<span class="t-num">' + esc(t.id) + "</span>" + copyBtn(t.id, "Transaction ID")) +
      "</dl></div>" +
      '<div class="summary__totals">' +
      '<div class="stat"><div class="stat__label"><iconify-icon icon="tabler:cash"></iconify-icon>Amount</div><div class="stat__value">' + fmt.moneyHTML(t.amount, cur) + "</div></div>" +
      '<div class="stat"><div class="stat__label"><iconify-icon icon="tabler:sum"></iconify-icon>Total</div><div class="stat__value">' +
      (t.totalAmount < 0 ? '<span class="t-error">' + fmt.moneyHTML(t.totalAmount, cur) + "</span>" : fmt.moneyHTML(t.totalAmount, cur)) + "</div></div></div>";
  }

  function skeleton() {
    $("t-problem").hidden = true;
    $("t-summary").hidden = false;
    $("t-title").innerHTML = '<span class="skeleton skeleton--text skeleton--on-canvas" style="--w:240px;height:28px"></span>';
    $("t-type").innerHTML = "";
    $("t-sub").innerHTML = '<span class="skeleton skeleton--text skeleton--on-canvas" style="--w:260px;margin-top:6px"></span>';
    var rows = "";
    for (var i = 0; i < 6; i++) rows += '<div class="kv-row"><span class="skeleton skeleton--text" style="--w:70px"></span><span class="skeleton skeleton--text" style="--w:60%;height:16px"></span></div>';
    $("t-summary").innerHTML =
      '<div class="summary__main"><div class="summary__who"><div class="summary__person"><span class="skeleton" style="width:40px;height:40px;border-radius:50%"></span>' +
      '<div class="stack" style="gap:8px"><span class="skeleton skeleton--text" style="--w:120px;height:16px"></span><span class="skeleton skeleton--text" style="--w:90px"></span></div></div></div>' +
      '<div class="kv-rows">' + rows + "</div></div>" +
      '<div class="summary__totals"><div class="stat" style="gap:10px"><span class="skeleton skeleton--text" style="--w:40%"></span><span class="skeleton skeleton--value"></span></div>' +
      '<div class="stat" style="gap:10px"><span class="skeleton skeleton--text" style="--w:40%"></span><span class="skeleton skeleton--value"></span></div></div>';
  }

  function problem(kind, id) {
    $("t-summary").hidden = true;
    $("t-problem").hidden = false;
    $("t-type").innerHTML = "";
    $("t-sub").textContent = "";
    $("t-title").textContent = "Credit transaction";
    $("t-problem").innerHTML = kind === "not-found"
      ? '<div class="card"><div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:receipt-off"></iconify-icon></span>' +
        '<div class="empty__title">We couldn\'t find transaction ' + esc(id) + '</div><div class="empty__text">Check the ID, or search for it in the list.</div>' +
        '<a class="btn btn--outlined btn--sm" href="credit-transactions.html">Go to credit transactions</a></div></div>'
      : '<div class="alert alert--error" role="alert"><iconify-icon icon="tabler:alert-triangle"></iconify-icon><div class="alert__body">' +
        '<div class="alert__title">Couldn\'t load this transaction</div><div class="alert__text">The server didn\'t respond. Try again in a moment.</div></div>' +
        '<div class="alert__actions"><button type="button" class="btn btn--outlined btn--sm" id="t-retry"><iconify-icon icon="tabler:refresh"></iconify-icon>Try again</button></div></div>';
    var retry = $("t-retry");
    if (retry) retry.addEventListener("click", function () {
      skeleton();
      setTimeout(function () {
        setState("data");
        DS.page.state = "data";
        if (DS.devbar) DS.devbar.render();
      }, 700);
    });
  }

  /* ---------- Prototype states ---------- */
  var all = M.creditTransactions();
  var id = DS.params.get("id");
  var STATES = {
    data: function () {
      return (id && M.creditTransaction(id)) || all.filter(function (t) {
        return t.type === "credit" && !t.relatedPlayer;
      })[0];
    },
    debit: function () {
      return all.filter(function (t) {
        return t.type === "debit";
      })[0];
    },
    transfer: function () {
      return all.filter(function (t) {
        return t.relatedPlayer;
      })[0];
    },
  };
  var states = Object.keys(STATES).concat(["loading", "not-found", "error"]);
  function setState(s) {
    if (s === "loading") return skeleton();
    if (s === "not-found") return problem(s, id || "00000000");
    if (s === "error") return problem(s);
    render(STATES[s]());
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : id && !M.creditTransaction(id) ? "not-found" : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
