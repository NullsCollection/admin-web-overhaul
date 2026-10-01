/* ==========================================================================
   Ticket details (Phase 5): the DETAIL TEMPLATE.
   header (id + status) → summary card (facts + totals) → tabs (lines / commands / requests)
   Source: src/pages/lotto/bet-tickets/[id]/details.tsx and src/views/pages/bet-ticket/*
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var T = DS.tickets;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var canViewTicketCurl = true; // permission-gated in the app
  var current = null;
  var ticketId = Number(DS.params.get("id")) || 482193;

  /* useGetBetTicket(id): take the list row for this id so list and detail always agree.
     Lines, commands and requests come from the sample ticket, scaled and time-shifted. */
  function load(variant) {
    var t = DS.mock.ticket(variant);
    var row = (DS.mock.ticketList || []).filter(function (x) {
      return x.id === ticketId;
    })[0];
    if (!row) return t;
    var shift = row.createdAt - t.createdAt;
    var k = row.betAmount / t.total_bet_amount;
    var r10 = function (n) {
      return Math.round(n / 10) * 10;
    };
    t.id = row.id;
    t.player = row.player;
    if (row.provider) t.provider = row.provider.name + " (" + row.provider.prefixCode + ")";
    t.game = row.game;
    t.createdAt = row.createdAt;
    t.commands.forEach(function (c) {
      c.created_at += shift;
      if (c.queue_updated_at) c.queue_updated_at += shift;
    });
    t.betRequests.forEach(function (b) {
      b.lastRequestTime += shift;
    });
    if (variant === "cancel-pending") return t;
    t.status = row.status;
    t.cancellationReason = row.cancellationReason;
    if (k !== 1) {
      t.details.forEach(function (l) {
        l.bet_amount = Math.max(10, r10(l.bet_amount * k));
        l.reward_result = l.reward_result ? r10(l.reward_result * k) : 0;
      });
    }
    if (row.status !== "settled") {
      // not resulted yet (or cancelled): no winnings, no settle command
      var lineState = row.status === "cancelled" || row.status === "rejected" ? T.resolveState(row.status, row.cancellationReason) : "approved";
      t.details.forEach(function (l) {
        l.status = lineState;
        l.reward_result = 0;
      });
      t.commands = t.commands.filter(function (c) {
        return c.type === "bet";
      });
      t.betRequests = t.betRequests.slice(0, 1);
    }
    t.total_bet_amount = t.details.reduce(function (a, l) {
      return a + l.bet_amount;
    }, 0);
    t.total_win_amount = t.details.reduce(function (a, l) {
      return a + l.reward_result;
    }, 0);
    return t;
  }

  function copyBtn(text, label, what) {
    return (
      '<button type="button" class="icon-btn icon-btn--sm" data-copy="' + esc(text) + '" data-copy-label="' + esc(label) +
      '" aria-label="Copy ' + esc(what) + '" title="Copy"><iconify-icon icon="tabler:copy"></iconify-icon></button>'
    );
  }

  function codeBlock(id, text, what) {
    return (
      '<pre class="code-block" id="' + id + '" hidden>' + esc(text) +
      '<span class="code-block__copy">' + copyBtn(text, what + " copied", what) + "</span></pre>"
    );
  }

  /* ---------- Summary: who (player + provider) → aligned facts → totals ----------
     UserInfo fields; status lives in the page header only (no duplicate). */
  function factRow(label, valueHTML) {
    return '<div class="kv-row"><dt>' + label + "</dt><dd>" + valueHTML + "</dd></div>";
  }

  function totalsHTML(t) {
    var won = t.total_win_amount > 0;
    var winners = t.details.filter(function (x) {
      return x.status === "win";
    }).length;
    return (
      '<div class="summary__totals">' +
      '<div class="stat"><div class="stat__label"><iconify-icon icon="tabler:cash"></iconify-icon>Total bet</div><div class="stat__value">' +
      fmt.moneyHTML(t.total_bet_amount) + '</div><div class="stat__meta">' + t.details.length + " numbers</div></div>" +
      '<div class="stat"><div class="stat__label"><iconify-icon icon="tabler:trophy"></iconify-icon>Total win</div><div class="stat__value">' +
      fmt.moneyHTML(t.total_win_amount) + '</div><div class="stat__meta">' +
      (won ? winners + (winners === 1 ? " winning number" : " winning numbers") : "No winnings yet") + "</div></div></div>"
    );
  }

  function renderSummary(t) {
    var initials = t.player.username.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();
    $("t-summary").innerHTML =
      '<div class="summary__main">' +
      '<div class="summary__who">' +
      '<div class="summary__person"><span class="avatar">' + esc(initials) + "</span><div>" +
      '<div class="summary__name">' + esc(t.player.username) + '</div><div class="summary__sub">Player ID ' + t.player.id + "</div></div></div>" +
      '<div class="summary__aside"><span class="summary__sub">Provider</span><strong>' + esc(t.provider) + "</strong></div>" +
      "</div>" +
      '<dl class="kv-rows">' +
      factRow("Game", esc(t.game)) +
      factRow("Round ID", '<a class="t-num" href="#" data-todo>' + t.roundGameId + "</a>") +
      factRow("Ticket time", '<span class="t-num">' + fmt.dateTimeSec(t.createdAt) + "</span>") +
      factRow("Ticket ID", '<span class="t-num">' + t.id + "</span>" + copyBtn(String(t.id), "Ticket ID copied", "ticket ID")) +
      "</dl></div>" +
      totalsHTML(t);
  }

  /* ---------- Bet numbers table ---------- */
  function renderLines(t) {
    $("c-lines").textContent = t.details.length;
    $("t-lines").innerHTML =
      '<table class="table"><thead><tr><th scope="col" class="is-num">#</th><th scope="col">Bet type</th><th scope="col">Number</th>' +
      '<th scope="col" class="is-num">Bet amount</th><th scope="col" class="is-num">Reward amount</th><th scope="col" class="is-num">Reward result</th>' +
      '<th scope="col">Status</th></tr></thead><tbody>' +
      t.details
        .map(function (l) {
          return (
            '<tr><td class="is-num t-muted">' + l.id + '</td><td class="is-strong">' + esc(T.betType[l.type] || l.type) + "</td>" +
            '<td><span class="bet-number">' + esc(l.bet_number) + "</span></td>" +
            '<td class="is-num">' + fmt.money(l.bet_amount) + '</td><td class="is-num">' + fmt.int(l.reward_amount) +
            (l.reward_amount % 1 ? "." + String(l.reward_amount).split(".")[1] : "") + "</td>" +
            '<td class="is-num' + (l.reward_result > 0 ? " is-strong" : "") + '">' + fmt.money(l.reward_result) + "</td>" +
            "<td>" + T.statusChip(l.status) + "</td></tr>"
          );
        })
        .join("") +
      '</tbody><tfoot><tr><td colspan="3">Total</td><td class="is-num">' + fmt.money(t.total_bet_amount) +
      '</td><td></td><td class="is-num">' + fmt.money(t.total_win_amount) + "</td><td></td></tr></tfoot></table>";
  }

  /* ---------- Commands timeline (TicketCommandsTable) ---------- */
  function renderCommands(t) {
    $("c-commands").textContent = t.commands.length;
    if (!t.commands.length) {
      $("t-commands").innerHTML =
        '<div class="empty"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:timeline-event"></iconify-icon></span>' +
        '<div class="empty__title">No commands yet</div><div class="empty__text">Commands show up here once the provider or player acts on this ticket.</div></div>';
      return;
    }
    $("t-commands").innerHTML =
      '<ol class="timeline">' +
      t.commands
        .map(function (c, i) {
          var info = T.command[c.type] || { label: c.type, actor: "Unknown", icon: "tabler:question-mark" };
          var codeId = "cmd-code-" + c.id;
          var actions = "";
          if (canViewTicketCurl) {
            actions +=
              '<button type="button" class="icon-btn icon-btn--sm" data-toggle-code="' + codeId + '" aria-expanded="false" aria-controls="' + codeId +
              '" aria-label="View seamless request" title="View seamless request"><iconify-icon icon="tabler:code"></iconify-icon></button>';
          }
          // Only the latest command can be retried, and never a "Place bet"
          if (i === 0 && c.type !== "bet") {
            actions +=
              '<button type="button" class="icon-btn icon-btn--sm" data-retry="' + c.id +
              '" aria-label="Retry last seamless request" title="Retry last seamless request"><iconify-icon icon="tabler:refresh"></iconify-icon></button>';
          }
          return (
            '<li class="timeline__item"><span class="timeline__dot' + (info.danger ? " timeline__dot--error" : "") + '"><iconify-icon icon="' + info.icon + '"></iconify-icon></span>' +
            '<div class="timeline__body"><div class="timeline__head"><div class="timeline__title' + (info.danger ? " is-danger" : "") + '">' +
            esc(info.label) + '<span class="timeline__actor">by ' + info.actor + "</span>" + T.queueChip(c.queue_status) + "</div>" +
            '<div class="row-actions">' + actions + "</div></div>" +
            '<div class="timeline__meta"><span>Created ' + fmt.dateTimeSec(c.created_at) + "</span>" +
            (c.queue_updated_at ? "<span>Queue updated " + fmt.dateTimeSec(c.queue_updated_at) + "</span>" : "") +
            (c.retry > 0
              ? '<span class="is-warning" title="This command has been retried"><iconify-icon icon="tabler:alert-triangle"></iconify-icon>Retried ' + c.retry + (c.retry === 1 ? " time" : " times") + "</span>"
              : "<span>No retries</span>") +
            "</div>" +
            (c.type === "cancel_bet" && c.retry === 0
              ? '<div class="alert alert--warning"><iconify-icon icon="tabler:clock"></iconify-icon><div class="alert__body"><div class="alert__text">' +
                "This cancel request is still being processed. It can take up to 30 minutes. If it takes longer, contact an admin.</div></div></div>"
              : "") +
            (canViewTicketCurl ? codeBlock(codeId, c.request, "Request") : "") +
            "</div></li>"
          );
        })
        .join("") +
      "</ol>";
  }

  /* ---------- Bet requests (TicketBetRequest) ---------- */
  function renderRequests(t) {
    var has = t.betRequests && t.betRequests.length;
    $("tab-requests").hidden = !has;
    $("c-requests").textContent = has ? t.betRequests.length : 0;
    if (!has) return;
    $("t-requests").innerHTML =
      '<table class="table"><thead><tr><th scope="col">Request ID</th><th scope="col" class="is-num">Index ID</th><th scope="col">Event type</th>' +
      '<th scope="col">Response</th><th scope="col">Last request</th><th scope="col" class="is-num">Actions</th></tr></thead><tbody>' +
      t.betRequests
        .map(function (r) {
          var codeId = "req-code-" + r.requestId;
          var ok = r.responseStatus >= 200 && r.responseStatus < 300;
          return (
            '<tr><td><span class="code">' + esc(r.requestId) + '</span></td><td class="is-num">' + r.indexId + "</td>" +
            '<td class="is-strong">' + esc(r.eventType) + "</td>" +
            '<td><span class="chip ' + (ok ? "chip--success" : "chip--error") + '"><span class="chip__dot"></span>' + r.responseStatus + "</span></td>" +
            '<td class="t-num">' + fmt.dateTimeSec(r.lastRequestTime) + "</td>" +
            '<td class="is-actions"><div class="row-actions"><button type="button" class="icon-btn icon-btn--sm" data-toggle-code="' + codeId +
            '" aria-expanded="false" aria-controls="' + codeId + '" aria-label="View request ' + esc(r.requestId) +
            '" title="View request"><iconify-icon icon="tabler:code"></iconify-icon></button></div></td></tr>' +
            // the whole expand row toggles (no empty gap rows when closed)
            '<tr class="table__expand" id="' + codeId + '" hidden><td colspan="6" style="padding-top:0">' +
            '<pre class="code-block">' + esc(r.payload) + '<span class="code-block__copy">' + copyBtn(r.payload, "Payload copied", "payload") +
            "</span></pre></td></tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  }

  /* ---------- Interactions ---------- */
  document.addEventListener("click", function (e) {
    var tog = e.target.closest("[data-toggle-code]");
    if (tog) {
      var block = $(tog.getAttribute("data-toggle-code"));
      var open = block.hidden;
      block.hidden = !open;
      tog.setAttribute("aria-expanded", String(open));
      return;
    }
    var retry = e.target.closest("[data-retry]");
    if (retry) confirmRetry();
  });

  function confirmRetry() {
    var cmd = current.commands[0];
    var info = T.command[cmd.type] || { label: cmd.type };
    DS.dialog.open({
      icon: "tabler:refresh",
      tone: "warning",
      title: "Retry the last seamless request?",
      html: "The <strong>" + esc(info.label) + "</strong> request will be sent to the provider again.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        {
          label: "Retry request",
          variant: "contained",
          onClick: function (b, close) {
            DS.ui.busy(b, true, "Retrying…");
            setTimeout(function () {
              close();
              showRetryResult();
            }, 800);
          },
        },
      ],
    });
  }

  function showRetryResult() {
    // ResultModal: shows the provider's JSON response (or the error)
    var json = JSON.stringify(DS.mock.retryResult, null, 2);
    DS.dialog.open({
      icon: "tabler:circle-check",
      tone: "success",
      title: "Retry result",
      html: "The provider answered with status <strong>200</strong>.",
      wide: true,
      body: '<pre class="code-block">' + esc(json) + '<span class="code-block__copy">' + copyBtn(json, "Result copied", "result") + "</span></pre>",
      actions: [{ label: "Close", variant: "contained", autofocus: true }],
    });
  }

  /* ---------- States ---------- */
  function show(t) {
    current = t;
    var state = T.resolveState(t.status, t.cancellationReason);
    $("t-problem").hidden = true;
    $("t-content").hidden = false;
    ["c-lines", "c-commands", "c-requests"].forEach(function (id) {
      $(id).hidden = false;
    });
    $("t-title").textContent = "Ticket " + t.id;
    document.title = "Ticket " + t.id + " | Admin prototype";
    $("t-status").innerHTML = T.statusChip(state);
    $("t-sub").textContent = t.player.username + " on " + t.game + ", " + fmt.dateTimeSec(t.createdAt);
    renderSummary(t);
    renderLines(t);
    renderCommands(t);
    renderRequests(t);
  }

  function skeleton() {
    $("t-problem").hidden = true;
    $("t-content").hidden = false;
    ["c-lines", "c-commands", "c-requests"].forEach(function (id) {
      $(id).hidden = true; // counts appear once data arrives
    });
    $("t-status").innerHTML = '<span class="skeleton skeleton--text" style="--w:72px;height:22px;border-radius:999px"></span>';
    $("t-sub").innerHTML = '<span class="skeleton skeleton--text" style="--w:280px;margin-top:6px"></span>';
    var rows = "";
    for (var i = 0; i < 4; i++) {
      rows += '<div class="kv-row"><span class="skeleton skeleton--text" style="--w:70px"></span><span class="skeleton skeleton--text" style="--w:60%;height:16px"></span></div>';
    }
    $("t-summary").innerHTML =
      '<div class="summary__main"><div class="summary__who"><div class="summary__person"><span class="skeleton" style="width:40px;height:40px;border-radius:50%"></span>' +
      '<div class="stack" style="gap:8px"><span class="skeleton skeleton--text" style="--w:120px;height:16px"></span><span class="skeleton skeleton--text" style="--w:90px"></span></div></div></div>' +
      '<div class="kv-rows">' + rows + "</div></div>" +
      '<div class="summary__totals">' +
      '<div class="stat" style="gap:10px"><span class="skeleton skeleton--text" style="--w:40%"></span><span class="skeleton skeleton--value"></span></div>' +
      '<div class="stat" style="gap:10px"><span class="skeleton skeleton--text" style="--w:40%"></span><span class="skeleton skeleton--value"></span></div></div>';
    $("t-lines").innerHTML =
      '<div class="stack" style="gap:18px;padding:20px 24px">' + new Array(7).join('<span class="skeleton skeleton--text" style="--w:100%"></span>') + "</div>";
  }

  function problem(kind) {
    $("t-content").hidden = true;
    $("t-problem").hidden = false;
    $("t-status").innerHTML = "";
    if (kind === "not-found") {
      $("t-sub").textContent = "";
      $("t-problem").innerHTML =
        '<div class="card"><div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="tabler:ticket-off"></iconify-icon></span>' +
        '<div class="empty__title">We couldn\'t find ticket ' + ticketId + "</div>" + '<div class="empty__text">It may have been removed, or the link has a typo. Search for it in the ticket list.</div>' +
        '<a class="btn btn--outlined btn--sm" href="tickets.html">Go to tickets</a></div></div>';
    } else {
      $("t-problem").innerHTML =
        '<div class="alert alert--error" role="alert"><iconify-icon icon="tabler:alert-triangle"></iconify-icon><div class="alert__body">' +
        '<div class="alert__title">Couldn\'t load this ticket</div><div class="alert__text">The server didn\'t respond. Try again in a moment.</div></div>' +
        '<div class="alert__actions"><button type="button" class="btn btn--outlined btn--sm" id="t-retry-load"><iconify-icon icon="tabler:refresh"></iconify-icon>Try again</button></div></div>';
      $("t-retry-load").addEventListener("click", function () {
        skeleton();
        setTimeout(function () {
          show(load());
          DS.page.state = "data";
          if (DS.devbar) DS.devbar.render();
        }, 700);
      });
    }
  }

  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    crumbs.insertAdjacentHTML(
      "beforeend",
      '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon><span aria-current="page">Ticket ' + ticketId + "</span>"
    );
    var prev = crumbs.querySelectorAll('[aria-current="page"]')[0];
    if (prev && prev.textContent !== "Ticket " + ticketId) prev.removeAttribute("aria-current");
  }
  $("t-title").textContent = "Ticket " + ticketId;

  var states = ["data", "loading", "cancel-pending", "not-found", "error", "retry-result"];
  function setState(s) {
    DS.dialog.close();
    DS.ui.selectTab($("tab-lines"));
    if (s === "loading") return skeleton();
    if (s === "not-found" || s === "error") return problem(s);
    show(load(s === "cancel-pending" ? "cancel-pending" : ""));
    if (s === "cancel-pending") DS.ui.selectTab($("tab-commands"));
    if (s === "retry-result") {
      DS.ui.selectTab($("tab-commands"));
      setTimeout(showRetryResult, 300);
    }
  }

  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
