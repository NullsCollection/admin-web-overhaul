/* ==========================================================================
   Current bet (Phase 10, pulled into Phase 8 by the user) on the LIST TEMPLATE. ?id=<round id>
   Source: src/views/pages/lotto/current-bet/useCurrentBetTable.tsx
     columns: Provider name (name + prefix code), Max 3 top, Max 3 under, Max 3 tod, Max 3 front,
       Max 2 top, Max 2 under, Max run top, Max run bottom (limit-template:maxBet*)
     detail panel (CurrentBetDetails): bet type, number, limit hit (paged)
   Changes: headers without the repeated "Max" (the card says it once, so the table fits); round header (status, game, close time) like the other round pages; numbers right
   aligned with 0 shown as a dash; the detail panel → "View limit hits" dialog (the list engine has
   no expandable rows, and a dialog reads better on phones); provider search (proposal).
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var R = DS.rounds;
  var T = DS.tickets;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var round = M.round(DS.params.get("id")) || M.rounds().filter(function (r) {
    return R.status(r).key === "enabled";
  })[0];
  var game = M.games.filter(function (g) {
    return g.id === round.lottoGameId;
  })[0];

  $("round-chip").innerHTML = R.statusChip(round);
  $("round-sub").textContent = L.name(game.translations) + ", round " + round.id + ", closes " + fmt.dateTime(round.closeAt);
  document.title = "Current bet: round " + round.id + " | Admin prototype";
  R.setCrumbs(game, "Current bet");
  R.setBackLink(game); // yeekee rounds go back to the yeekee list

  var rows = M.currentBet(round.id).map(function (r) {
    return Object.assign({ id: r.providerId }, r);
  });
  var name = function (r) {
    return r.providerName + (r.providerPrefixCode ? " (" + r.providerPrefixCode + ")" : "");
  };
  var amount = function (v) {
    return v ? fmt.int(v) : '<span class="t-faint">–</span>';
  };

  var list = DS.list.create({
    root: $("bets-card"),
    noun: ["provider", "providers"],
    rows: function () {
      return rows;
    },
    search: function (r) {
      return name(r);
    },
    filters: {},
    rowName: name,
    columns: [
      { key: "providerName", label: "Provider", className: "is-strong", render: function (r) {
        return esc(r.providerName) + (r.providerPrefixCode ? '<span class="cell-sub"><span class="code">' + esc(r.providerPrefixCode) + "</span></span>" : "");
      } },
    ].concat(M.CURRENT_BET_KEYS.map(function (k) {
      // "Max" is said once in the card subtitle, so the 8 headers fit in 1440px
      return { key: k[0], label: k[1].replace(/^Max /, "").replace(/^run/, "Run"), num: true, render: function (r) {
        return amount(r[k[0]]);
      } };
    })),
    actions: function () {
      return [{ label: "View limit hits", icon: "tabler:eye", action: "hits", kind: "view" }];
    },
    onAction: function (action, row) {
      showHits(row);
    },
    empty: { icon: "tabler:list-numbers", title: "No bets yet", text: "Bets on this round show up here by provider." },
    noResults: { icon: "tabler:search", title: "No providers match", text: "Try a different provider name or code." },
  });

  /* ---------- Limit hits (CurrentBetDetails) ---------- */
  function showHits(row) {
    var hits = M.currentBetDetails(round.id, row.providerId);
    DS.dialog.open({
      icon: "tabler:list-numbers",
      tone: "primary",
      wide: true,
      title: "Limit hits: " + name(row),
      html: "Numbers in round " + round.id + " that hit their limit for this provider.",
      body: hits.length
        ? '<div class="table-wrap"><table class="table table--compact table--inset"><thead><tr><th scope="col">Bet type</th>' +
          '<th scope="col">Number</th><th scope="col" class="is-num">Limit hit</th></tr></thead><tbody>' +
          hits.map(function (h) {
            return "<tr><td>" + esc(T.betType[h.betType] || h.betType) + '</td><td><span class="code">' + esc(h.number) + '</span></td><td class="is-num">' +
              fmt.int(Number(h.limitHit)) + "</td></tr>";
          }).join("") + "</tbody></table></div>"
        : '<div class="empty" style="padding:24px 0"><div class="empty__title">No limit hits</div><div class="empty__text">No number has hit its limit for this provider yet.</div></div>',
      actions: [{ label: "Close", variant: "outlined", autofocus: true }],
    });
  }

  /* ---------- Prototype states ---------- */
  var states = ["data", "loading", "empty", "error", "limit-hits", "no-limit-hits"];
  function setState(s) {
    DS.dialog.close();
    list.setMode(s === "limit-hits" || s === "no-limit-hits" ? "data" : s);
    if (s === "limit-hits") setTimeout(function () {
      showHits(rows.filter(function (r) {
        return M.currentBetDetails(round.id, r.providerId).length > 2;
      })[0] || rows[0]);
    }, 400);
    if (s === "no-limit-hits") setTimeout(function () {
      showHits(rows.filter(function (r) {
        return !M.currentBetDetails(round.id, r.providerId).length;
      })[0] || rows[0]);
    }, 400);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
