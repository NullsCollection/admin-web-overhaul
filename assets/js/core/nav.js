/* ==========================================================================
   Sidebar menu config. Mirrors src/configs/navigationConfig.ts (labels from
   public/locales/en/navigation.json, in sentence case).

   PROPOSALS vs the real nav (see CLAUDE.md → Open questions):
   - grouped into sections (Overview / Providers / Lotto / Admin)
   - "Lotto tickets" pulled out of the Lotto group to cut one nesting level
   - icons standardized on Tabler

   `id` must match <body data-page="…">. `href` is relative to ui/pages/.
   Items without href are pages not designed yet (they show a toast).
   ========================================================================== */
(function (DS) {
  DS.nav = [
    {
      section: "Overview",
      items: [
        { id: "dashboard", label: "Dashboard", icon: "tabler:layout-dashboard", href: "index.html" },
        { id: "pending-round", label: "Pending round", icon: "tabler:clock-pause", badge: 12, href: "pending-round.html" },
        { id: "provider-activity", label: "Provider activity", icon: "tabler:activity", badge: 4, href: "provider-activity.html" },
      ],
    },
    {
      section: "Providers",
      items: [
        { id: "providers", label: "Provider management", icon: "tabler:building-store", href: "providers.html" },
        { id: "provider-groups", label: "Provider groups", icon: "tabler:stack-2", href: "provider-groups.html" },
        { id: "provider-sizes", label: "Provider sizes", icon: "tabler:dimensions", href: "provider-sizes.html" },
      ],
    },
    {
      section: "Lotto",
      items: [
        {
          id: "lotto",
          label: "Lotto setup",
          icon: "tabler:clover",
          children: [
            { id: "lotto-configs", label: "Config management", href: "lotto-configs.html" },
            { id: "lotto-groups", label: "Group management", href: "lotto-groups.html" },
            { id: "lotto-games", label: "Game management", href: "lotto-games.html" },
            { id: "lotto-sort", label: "Game sort management", href: "lotto-sort.html" },
            { id: "lotto-blacklist", label: "Game blacklist", href: "lotto-blacklist.html" },
            { id: "lotto-round-schedules", label: "Round schedules", href: "round-schedules.html" },
            { id: "lotto-rounds", label: "Round management", href: "rounds.html" },
            { id: "lotto-yeekees", label: "Yeekee rounds", href: "yeekee-rounds.html" },
            { id: "lotto-yeekee-config", label: "Yeekee bonus config", href: "yeekee-configs.html" },
          ],
        },
        {
          id: "limits",
          label: "Limits & credit",
          icon: "tabler:adjustments-horizontal",
          children: [
            { id: "lotto-limit-templates", label: "Limit number sets", href: "limit-templates.html" },
            { id: "lotto-group-limit-templates", label: "Set lottery number limits", href: "group-limit-templates.html" },
            { id: "lotto-credit-types", label: "Credit transaction types", href: "credit-types.html" },
            { id: "lotto-credit-transfer-types", label: "Credit transfer types", href: "transfer-types.html" },
            { id: "lotto-credit-transactions", label: "Credit transactions", href: "credit-transactions.html" },
          ],
        },
        {
          id: "tickets",
          label: "Lotto tickets",
          icon: "tabler:ticket",
          children: [
            { id: "ticket-list", label: "Ticket list", href: "tickets.html" },
            { id: "ticket-summary", label: "Ticket summary", href: "ticket-summary.html" },
            { id: "ticket-summary-bet-type", label: "Summary by bet type", href: "ticket-summary-bet-type.html" },
          ],
        },
      ],
    },
    {
      section: "Admin",
      items: [
        { id: "users", label: "User management", icon: "tabler:users", href: "users.html" },
        { id: "user-groups", label: "User groups", icon: "tabler:users-group", href: "user-groups.html" },
        { id: "currencies", label: "Currencies", icon: "tabler:coin", href: "currencies.html" },
        { id: "languages", label: "Languages", icon: "tabler:language", href: "languages.html" },
        { id: "sync-sites", label: "Sync sites", icon: "tabler:refresh", href: "sync-sites.html" },
        { id: "billings", label: "Billing", icon: "tabler:credit-card", href: "billings.html" },
      ],
    },
  ];
})(window.DS);
