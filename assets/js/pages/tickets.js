/* ==========================================================================
   Ticket list: list template (core/list.js) with a wide filter bar.
   Source: src/views/pages/bet-ticket/table/BetTicketTable.tsx
   ========================================================================== */
(function (DS) {
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var T = DS.tickets;
  var M = DS.mock;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var tickets = M.ticketList.slice();

  var providerOpts = M.providers.slice(0, 8).map(function (p) {
    return { value: String(p.id), label: p.name + " (" + p.prefixCode + ")" };
  });
  var gameOpts = M.games.map(function (g) {
    return { value: g, label: g };
  });

  var list = DS.list.create({
    root: $("tickets-card"),
    noun: ["ticket", "tickets"],
    rows: function () {
      return tickets;
    },
    // Search box = the Ticket ID / User ID / Username filter fields
    search: function (r, scope) {
      if (scope === "userId") return r.player.id;
      if (scope === "username") return r.player.username;
      return r.id;
    },
    filters: {
      start: function (r, v) {
        return r.createdAt >= new Date(v).getTime();
      },
      end: function (r, v) {
        return r.createdAt <= new Date(v).getTime() + 59999;
      },
      status: function (r, v) {
        return r.status === v;
      },
      providers: function (r, v) {
        return r.provider && v.indexOf(String(r.provider.id)) > -1;
      },
      games: function (r, v) {
        return v.indexOf(r.game) > -1;
      },
    },
    summary: function (all) {
      var by = function (st) {
        return all.filter(function (r) {
          return r.status === st;
        });
      };
      var amount = all.reduce(function (t, r) {
        return t + r.betAmount;
      }, 0);
      return [
        { label: "All tickets", value: fmt.int(all.length), icon: "tabler:ticket", tone: "solid", meta: fmt.money(amount) + " bet, any date" },
        { label: "Waiting for result", value: fmt.int(by("approved").length), icon: "tabler:hourglass", tone: "warning",
          meta: "Placed, not resulted yet", filter: { key: "status", value: "approved" } },
        { label: "Resulted", value: fmt.int(by("settled").length), icon: "tabler:circle-check", tone: "info", meta: "Have a result", filter: { key: "status", value: "settled" } },
        { label: "Rejected", value: fmt.int(by("rejected").length), icon: "tabler:circle-x", tone: "error", meta: "Refused by the provider", filter: { key: "status", value: "rejected" } },
      ];
    },
    columns: [
      { key: "id", label: "ID", render: function (r) {
        return '<a class="t-medium t-num" href="ticket-detail.html?id=' + r.id + '">' + r.id + "</a>";
      } },
      { key: "player", label: "Member", sortable: false, render: function (r) {
        return DS.ui.ident(r.player.username, "#" + r.player.id);
      } },
      { key: "provider", label: "Provider", sortValue: function (r) {
        return r.provider ? r.provider.name : "";
      }, render: function (r) {
        return r.provider ? esc(r.provider.name) + '<span class="cell-sub">' + esc(r.provider.prefixCode) + "</span>" : "–";
      } },
      { key: "game", label: "Game", sortable: false, render: function (r) {
        return esc(r.game);
      } },
      { key: "createdAt", label: "Date/time", render: function (r) {
        return '<span class="t-num">' + fmt.dateTime(r.createdAt) + "</span>";
      } },
      { key: "betAmount", label: "Bet amount", num: true, render: function (r) {
        return fmt.money(r.betAmount);
      } },
      { key: "status", label: "Status", sortValue: function (r) {
        return T.resolveState(r.status, r.cancellationReason);
      }, render: function (r) {
        return T.statusChip(T.resolveState(r.status, r.cancellationReason));
      } },
    ],
    rowName: function (r) {
      return "ticket " + r.id;
    },
    actions: function (r) {
      return [{ label: "View ticket", icon: "tabler:eye", href: "ticket-detail.html?id=" + r.id }];
    },
    onAction: function () {},
    onClear: function () {
      providers.set([]);
      games.set([]);
    },
    empty: {
      icon: "tabler:ticket",
      title: "No tickets in this date range",
      text: "Tickets placed between these dates show up here. Try a wider range.",
    },
    noResults: {
      icon: "tabler:search",
      title: "No tickets match",
      text: "Check the ID or username, or clear the filters.",
    },
  });

  /* Multi-selects feed the list through setFilter() */
  var providers = DS.ui.multiselect($("f-providers"), {
    options: providerOpts,
    selected: [],
    placeholder: "All providers",
    emptyText: "No providers match",
    onChange: function (v) {
      list.setFilter("providers", v);
    },
  });
  var games = DS.ui.multiselect($("f-games"), {
    options: gameOpts,
    selected: [],
    placeholder: "All games",
    emptyText: "No games match",
    onChange: function (v) {
      list.setFilter("games", v);
    },
  });

  /* Placeholder follows "search by" */
  var scope = document.querySelector("[data-list-search-scope]");
  var input = document.querySelector("[data-list-search]");
  scope.addEventListener("change", function () {
    input.placeholder = "Search " + scope.options[scope.selectedIndex].text.toLowerCase().replace("id", "ID");
  });

  /* Prototype states */
  var states = ["data", "loading", "empty", "no-results", "error"];
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = {
    states: states,
    state: initial,
    setState: function (s) {
      list.setMode(s);
    },
  };
  list.setMode(initial);
})(window.DS);
