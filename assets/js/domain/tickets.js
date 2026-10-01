/* ==========================================================================
   Ticket domain helpers: labels + status chips shared by every ticket page
   (ticket details now, ticket list / summaries in Phase 10).
   Port: src/views/pages/bet-ticket/TicketStatus.tsx (+ resolveTicketState),
         components/ticket-commands/utils.ts, common:betType.*
   ========================================================================== */
(function (DS) {
  var T = (DS.tickets = {});

  /* Ticket / line status → chip. PROPOSED colors (the app uses error red for every
     cancellation and for "lose"; a lost bet or a cancelled ticket isn't an error). */
  var STATUS = {
    waiting: { label: "Waiting", tone: "warning" },
    approved: { label: "Waiting for result", tone: "warning" },
    settled: { label: "Resulted", tone: "info" },
    win: { label: "Won", tone: "success" },
    lose: { label: "Lost", tone: "" },
    rejected: { label: "Rejected", tone: "error" },
    bet_failed: { label: "Bet failed", tone: "error" },
    cancelled: { label: "Cancelled", tone: "" },
    round_cancelled: { label: "Round cancelled", tone: "" },
    user_cancelled: { label: "Cancelled by user", tone: "" },
  };
  T.status = STATUS;

  T.statusChip = function (state) {
    var s = STATUS[state] || { label: state, tone: "" };
    return '<span class="chip' + (s.tone ? " chip--" + s.tone : "") + '"><span class="chip__dot"></span>' + s.label + "</span>";
  };

  /* Same priority as resolveTicketState(): cancellation reason beats status */
  T.resolveState = function (status, cancellationReason) {
    if (["bet_failed", "round_cancelled", "user_cancelled"].indexOf(cancellationReason) > -1) return cancellationReason;
    if (status === "cancelled") return "cancelled";
    return status || "waiting";
  };

  /* common:betType.* in sentence case, without the repeated "Bet" prefix */
  T.betType = {
    bet_two_top: "2 top", bet_two_under: "2 bottom", bet_two_tod: "2 tod",
    bet_three_top: "3 top", bet_three_under: "3 bottom", bet_three_tod: "3 tod",
    bet_three_front: "3 front", bet_three_back: "3 back", bet_three_first_top: "3 first top",
    bet_run_top: "Run top", bet_run_under: "Run bottom", bet_run_bottom: "Run bottom",
    bet_four: "4 digits", bet_five: "5 digits", bet_six: "6 digits", bet_group_custom: "Group lottery",
  };

  /* getCommandTypeDisplay(): who sent it + label + whether it's a reversal */
  T.command = {
    bet: { label: "Place bet", actor: "Player", icon: "tabler:user", danger: false },
    cancel_bet: { label: "Cancel bet", actor: "Player", icon: "tabler:user", danger: true },
    settle: { label: "Settle", actor: "Provider", icon: "tabler:building-store", danger: false },
    cancelled: { label: "Cancel round", actor: "Provider", icon: "tabler:building-store", danger: true },
    "cancel-settle": { label: "Cancel settle", actor: "Provider", icon: "tabler:building-store", danger: true },
  };

  /* getQueueStatusDisplay() */
  T.queue = {
    done: { label: "Done", tone: "success" },
    processing: { label: "Processing", tone: "warning" },
    waiting: { label: "Waiting", tone: "warning" },
    failed: { label: "Failed", tone: "error" },
  };
  T.queueChip = function (q) {
    var s = T.queue[q] || { label: q || "N/A", tone: "" };
    return '<span class="chip' + (s.tone ? " chip--" + s.tone : "") + '"><span class="chip__dot"></span>' + s.label + "</span>";
  };
})(window.DS);
