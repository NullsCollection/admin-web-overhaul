/* ==========================================================================
   Round domain helpers: status chip + row actions, shared by the rounds list (8b) and
   pending rounds (Phase 6). Port: useRoundTable.tsx (status chip + RowOptions).
   ========================================================================== */
(function (DS) {
  var R = (DS.rounds = {});

  /* Status → chip. Same labels and colors as the app (user, 2026-09-30):
     Resulted = success, Pending result = warning, Cancelled = error, Disabled = error, Enabled = info */
  R.status = function (r) {
    if (r.status === "resulted") return { key: "resulted", label: "Resulted", tone: "success" };
    if (r.status === "close_bet") return { key: "close_bet", label: "Pending result", tone: "warning" };
    if (r.status === "cancelled") return { key: "cancelled", label: "Cancelled", tone: "error" };
    if (r.isEnable !== "yes") return { key: "disabled", label: "Disabled", tone: "error" };
    return { key: "enabled", label: "Enabled", tone: "info" };
  };
  // Taking bets right now (enabled, opened, not closed yet): drives the "closes in" hint
  R.isOpenNow = function (r) {
    return R.status(r).key === "enabled" && r.openAt <= DS.fmt.now && r.closeAt > DS.fmt.now;
  };
  R.statusChip = function (r) {
    var s = R.status(r);
    return '<span class="chip chip--' + s.tone + '"><span class="chip__dot"></span>' + s.label + "</span>";
  };
  R.STATUS_FILTER = [
    { value: "enabled", label: "Enabled" },
    { value: "close_bet", label: "Pending result" },
    { value: "resulted", label: "Resulted" },
    { value: "cancelled", label: "Cancelled" },
    { value: "disabled", label: "Disabled" },
  ];

  /* ---------- Round results (8c) ----------
     Which result inputs a round needs, from its game config. Same gates as
     views/pages/lotto/round/Result/ResultInput/* + digitInputVisibility.ts:
       group_custom → only the input matching the digit length (4 / 5 / 6)
       Five / Four copy the last digits of Six when the config pays Six (locked)
       Two top copies the last 2 digits of Three top when the config pays Three top (locked)
       Three front (1, 2) and Three bottom (1, 2) both show when rewardBottomThreeFront > 0 */
  R.resultFields = function (c) {
    var gc = c.type === "group_custom";
    var n = Number(c.groupCustomDigitLength);
    var pos = function (k) {
      return Number(c[k]) > 0;
    };
    var f = [
      { key: "SixDigit", label: "Six digits", len: 6, show: gc ? n === 6 : pos("rewardSix") },
      { key: "FiveDigit", label: "Five digits", len: 5, show: gc ? n === 5 : pos("rewardTopFive"),
        from: !gc && pos("rewardSix") ? "SixDigit" : null },
      { key: "FourDigit", label: "Four digits", len: 4, show: gc ? n === 4 : pos("rewardTopFour"),
        from: !gc && pos("rewardSix") ? "SixDigit" : null },
      { key: "ThreeTop", label: "Three top", len: 3, show: !gc && (pos("rewardTopThree") || pos("rewardTopThreeFlip") || pos("rewardRunTop")) },
      { key: "TwoTop", label: "Two top", len: 2, show: !gc && pos("rewardTopTwo"), from: pos("rewardTopThree") ? "ThreeTop" : null },
      { key: "TwoBottom", label: "Two bottom", len: 2, show: !gc && (pos("rewardBottomTwo") || pos("rewardBottomTwoFlip") || pos("rewardRunBottom")) },
      { key: "FrontThreeOne", label: "Three front (1)", len: 3, show: !gc && pos("rewardBottomThreeFront") },
      { key: "FrontThreeTwo", label: "Three front (2)", len: 3, show: !gc && pos("rewardBottomThreeFront") },
      { key: "BottomThreeOne", label: "Three bottom (1)", len: 3, show: !gc && pos("rewardBottomThreeFront") },
      { key: "BottomThreeTwo", label: "Three bottom (2)", len: 3, show: !gc && pos("rewardBottomThreeFront") },
    ];
    return f.filter(function (x) {
      return x.show;
    });
  };
  R.RESULT_LABELS = {
    SixDigit: "Six digits", FiveDigit: "Five digits", FourDigit: "Four digits", ThreeTop: "Three top", TwoTop: "Two top",
    TwoBottom: "Two bottom", FrontThreeOne: "Three front (1)", FrontThreeTwo: "Three front (2)",
    BottomThreeOne: "Three bottom (1)", BottomThreeTwo: "Three bottom (2)",
  };

  /* Result status (lotto-round-result-status labels) → chip */
  var RESULT_STATUS = {
    pending: { label: "Pending", tone: "warning" },
    processing: { label: "Processing", tone: "info" },
    ready_to_create_cmd: { label: "Ready to create command", tone: "info" },
    success: { label: "Success", tone: "success" },
    cancelling: { label: "Cancelling", tone: "warning" },
    canceled: { label: "Canceled", tone: "error" },
  };
  R.resultChip = function (status) {
    var s = RESULT_STATUS[status] || { label: status, tone: "" };
    return '<span class="chip' + (s.tone ? " chip--" + s.tone : "") + '"><span class="chip__dot"></span>' + s.label + "</span>";
  };
  // A result in one of these blocks entering another one (ResultList isLockAddResultProcess)
  R.ACTIVE_RESULT = ["pending", "processing", "success", "ready_to_create_cmd"];
  R.CANCEL_PAID_HOURS = 24;

  /* ---------- Yeekee rounds (8e) ----------
     Game types the yeekee pages handle ([id]/index.tsx: yeekee, yeekee_vip + the old "yekee"
     spellings → YeekeeResult; encrypt_game → YeekeeMalta). */
  R.YEEKEE_TYPES = ["yeekee", "yeekee_vip", "yekee", "yekee_vip"];
  R.isYeekee = function (game) {
    return !!game && R.YEEKEE_TYPES.indexOf(game.type) > -1;
  };
  R.isEncrypted = function (game) {
    return !!game && game.type === "encrypt_game";
  };
  // The list a round's sub-pages go back to (current bet, limit numbers)
  // ?from=pending → opened from the Pending round queue, so go back there
  R.parentList = function (game) {
    if (DS.params && DS.params.get("from") === "pending") {
      return { href: "pending-round.html", label: "Pending round", crumbs: ["Overview", "Pending round"] };
    }
    return R.isYeekee(game) || R.isEncrypted(game)
      ? { href: "yeekee-rounds.html", label: "Yeekee rounds", crumbs: ["Lotto", "Lotto setup", "Yeekee rounds"] }
      : { href: "rounds.html", label: "Round management", crumbs: ["Lotto", "Lotto setup", "Round management"] };
  };
  R.backLinkHTML = function (game) {
    var p = R.parentList(game);
    return '<a class="back-link" href="' + p.href + '"><iconify-icon icon="tabler:arrow-left"></iconify-icon>' + DS.fmt.esc(p.label) + "</a>";
  };
  // Top bar crumbs for round sub-pages: Lotto › Lotto setup › <parent list> › <page>
  R.setCrumbs = function (game, page) {
    var crumbs = document.querySelector(".topbar__crumbs");
    if (!crumbs) return;
    var parts = R.parentList(game).crumbs.concat([page]);
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + DS.fmt.esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  };
  // Point the page's back link at the right list
  R.setBackLink = function (game) {
    var a = document.querySelector(".back-link");
    if (!a) return;
    var p = R.parentList(game);
    a.href = p.href;
    a.innerHTML = '<iconify-icon icon="tabler:arrow-left"></iconify-icon>' + p.label;
  };

  /* ---------- Yeekee bonus config (8f) ---------- */
  // Bonus rows in use (1–2 required, 3–5 optional), in field order
  R.bonusRows = function (c) {
    return [1, 2, 3, 4, 5].map(function (n) {
      return c["bonusRow" + n];
    }).filter(function (v) {
      return v != null && v !== "";
    }).map(Number);
  };
  // Provider of a config: providerId -1 = "All providers" (paid in THB, the app's fallback)
  R.configProvider = function (providerId) {
    if (Number(providerId) === -1) return { name: "All providers", code: "", currency: "THB", all: true };
    var p = DS.mock.providers.filter(function (x) {
      return x.id === Number(providerId);
    })[0];
    return p ? { name: p.name, code: p.prefixCode, currency: (p.currency && p.currency.code) || "THB" } : { name: "N/A", code: "", currency: "THB" };
  };

  // Edit only while the round isn't finished (same rule as the app)
  R.editable = function (r) {
    return ["cancelled", "settled", "resulted"].indexOf(r.status) === -1;
  };

  /* Row actions, most important first. Edit + Manage result show as icons; Current bet and
     Limit numbers go in ⋮ (group_custom games have no per-number limits). */
  R.actions = function (r, opts) {
    opts = opts || {};
    var a = [];
    if (opts.canUpdate !== false && R.editable(r)) {
      a.push({ label: "Edit round", icon: "tabler:pencil", href: "round-form.html?id=" + r.id, kind: "edit" });
    }
    a.push({ label: "Manage result", icon: "tabler:clipboard-check", href: "round-result.html?id=" + r.id });
    a.push({ label: "Current bet", icon: "tabler:list-numbers", href: "current-bet.html?id=" + r.id });
    if (!opts.groupCustom) a.push({ label: "Limit numbers", icon: "tabler:hash", href: "round-limit-numbers.html?id=" + r.id });
    return a;
  };
})(window.DS);
