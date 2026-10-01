/* ==========================================================================
   Mock data: credit (Phase 9c / 9d). Shapes follow src/types/lotto/creditTransactionTypeTypes,
   creditTransactionTransferTypeTypes and creditTransactionsTypes. Deterministic.
   ========================================================================== */
(function (DS) {
  var M = (DS.mock = DS.mock || {});
  var DAY = 864e5;
  var NOW = DS.fmt.now;
  var stamp = function (i, age) {
    var created = NOW - (age - i * 17) * DAY - i * 53 * 6e4;
    return { createdAt: created, updatedAt: created + (i % 3 ? (11 + i * 7) * DAY : 0) };
  };

  /* ---------- Credit transaction types: { code, name, canNegativeValue yes|no, status enable|disable } ---------- */
  // [code, name, canNegative, enabled]
  var TYPES = [
    ["DEPOSIT", "Deposit", 0, 1], ["WITHDRAW", "Withdraw", 1, 1], ["BET", "Bet", 1, 1], ["WIN", "Win payout", 0, 1],
    ["REFUND", "Refund", 0, 1], ["BONUS", "Bonus", 0, 1], ["ADJUST", "Manual adjustment", 1, 1], ["CASHBACK", "Cashback", 0, 0],
    ["CANCEL_WIN", "Cancel win", 1, 1], ["PROMO_OLD", "Promotion (old)", 0, 0],
  ];
  M.creditTypes = TYPES.map(function (t, i) {
    return Object.assign({ id: 11 + i, code: t[0], name: t[1], canNegativeValue: t[2] ? "yes" : "no", status: t[3] ? "enable" : "disable" }, stamp(i, 400));
  });
  M.creditType = function (id) {
    var t = M.creditTypes.filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return t ? JSON.parse(JSON.stringify(t)) : null;
  };

  /* ---------- Transfer types: { code, nameTh, nameEn, color } ----------
     color is free text in the app (nothing in the admin reads it; the player site may). */
  // [code, th, en, color]
  var TRANSFERS = [
    ["PLAYER_TO_PLAYER", "โอนระหว่างสมาชิก", "Player to player", "#2563EB"],
    ["AGENT_TOPUP", "เติมเครดิตจากเอเย่นต์", "Agent top-up", "#16A34A"],
    ["AGENT_WITHDRAW", "ถอนเครดิตไปเอเย่นต์", "Agent withdrawal", "#DC2626"],
    ["PROMOTION", "โปรโมชั่น", "Promotion", "#D97706"],
    ["SYSTEM", "ระบบ", "", "#6B7280"],
    ["AFFILIATE", "ค่าแนะนำ", "Affiliate commission", "purple"],
  ];
  M.transferTypes = TRANSFERS.map(function (t, i) {
    return Object.assign({ id: 31 + i, code: t[0], nameTh: t[1], nameEn: t[2], color: t[3] }, stamp(i, 320));
  });
  /* ---------- Credit transactions (9d; creditTransactionsTypes: CreditTransaction) ----------
     Built on first use (needs M.providers). type credit | debit; amount is positive; the mock's
     totalAmount is the signed amount (credit +, debit −), which is how the app colors it (≥ 0 green).
     relatedPlayer only on player-to-player transfers. */
  var PLAYERS = ["somchai88", "nong_ploy", "lucky7_th", "kittisak.w", "bee_bkk", "jaidee99", "tum_tam", "arunee_s", "boss_lao", "pond2026"];
  var NOTES = {
    DEPOSIT: ["ฝากเงินผ่านธนาคาร", "Bank deposit"], WITHDRAW: ["ถอนเงิน", "Withdrawal"], BONUS: ["โบนัสสมาชิกใหม่", "New member bonus"],
    ADJUST: ["ปรับยอดโดยแอดมิน", "Adjusted by admin"], REFUND: ["คืนเงินโพยยกเลิก", "Refund for a cancelled ticket"],
    WIN: ["จ่ายรางวัล", "Prize payout"], CANCEL_WIN: ["ยกเลิกรางวัล", "Prize cancelled"],
  };
  // [type code, transfer code | null, credit?, related?]
  var KINDS = [
    ["DEPOSIT", "AGENT_TOPUP", 1, 0], ["WITHDRAW", "AGENT_WITHDRAW", 0, 0], ["BONUS", "PROMOTION", 1, 0], ["ADJUST", "SYSTEM", 0, 0],
    ["ADJUST", "PLAYER_TO_PLAYER", 1, 1], ["REFUND", "SYSTEM", 1, 0], ["WIN", "SYSTEM", 1, 0], ["CANCEL_WIN", "SYSTEM", 0, 0],
  ];
  var txs = null;
  M.creditTransactions = function () {
    if (txs) return txs;
    txs = [];
    var byCode = function (list, code) {
      return list.filter(function (x) {
        return x.code === code;
      })[0];
    };
    for (var i = 0; i < 48; i++) {
      var k = KINDS[(i * 5 + (i % 3)) % KINDS.length];
      var p = M.providers[(i * 7) % 12];
      var player = function (n) {
        var u = PLAYERS[n % PLAYERS.length];
        return { id: 50120 + n * 13, providerId: p.id, username: u, displayName: u.replace(/[._]/g, " ").replace(/\b\w/g, function (c) {
          return c.toUpperCase();
        }) };
      };
      var amount = [500, 1000, 2500, 300, 12000, 150, 4800, 750][(i * 3) % 8] * (1 + (i % 4));
      var note = NOTES[k[0]];
      txs.push({
        id: String(78812400 + i * 37),
        player: player(i),
        relatedPlayer: k[3] ? player(i + 3) : null,
        creditTransactionType: byCode(M.creditTypes, k[0]),
        creditTransactionTransferType: k[1] ? byCode(M.transferTypes, k[1]) : null,
        amount: amount,
        totalAmount: k[2] ? amount : -amount,
        type: k[2] ? "credit" : "debit",
        creditTransactionNote: note[0],
        creditTransactionNoteEn: note[1],
        note: "",
        transactionDate: NOW - i * 3.3 * 36e5 - (i * 7 % 50) * 6e4,
        provider: p,
      });
    }
    return txs;
  };
  M.creditTransaction = function (id) {
    return M.creditTransactions().filter(function (x) {
      return String(x.id) === String(id);
    })[0] || null;
  };

  M.transferType = function (id) {
    var t = M.transferTypes.filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return t ? JSON.parse(JSON.stringify(t)) : null;
  };
})(window.DS);
