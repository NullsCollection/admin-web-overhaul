/* ==========================================================================
   List engine: the reusable LIST PAGE TEMPLATE (Phase 3+).
   Port: GenericFilters + GenericTable (DataGrid Pro, server-side) + RowOptions.

   Markup it expects inside `root` (see pages/providers.html):
     [data-list-search]        search <input>        (+ [data-list-search-clear] button)
     [data-list-search-scope]  optional <select>: what the search box searches (passed to search())
     [data-list-filter="key"]  <select> or <input> (e.g. datetime-local), one per filter.
                               Its starting value is its DEFAULT: "all"/"" = no filter; a preset
                               default (e.g. today's dates) is re-applied by Clear filters and
                               doesn't count as an "active" filter.
     Filters without an element (multi-selects): call list.setFilter(key, arrayOrValue).
     [data-list-clear]         "Clear filters" button (shown only when something is set)
     [data-list-count]         text like "37 providers" (usually in the page header)
     .list-body                table / skeleton / empty / error goes here
     [data-list-pager]         pagination goes here

   DS.list.create({
     root, noun: ["provider", "providers"],
     columns: [{ key, label, sortable?: true, num?: bool, render(row) → html, sortValue?(row) }],
     rows: function () → array,           // the pretend server dataset
     search: function (row, scope) → string,  // text searched by the search box
     filters: { key: function (row, value) → bool },
     rowName: function (row) → string,    // for aria labels + dialogs
     actions: function (row) → [{ label, icon, href? | action?, danger?, disabled?: "reason" }],  // most important first
                                           // disabled: shown greyed out with the reason as its tooltip
                                           // leave out entirely → no actions column
     count: false,                        // don't write the [data-list-count] text (second list on a page)
     showActions: function () → bool,     // optional: hide the actions column for now (checked each render)
       RULE (user): View / Edit / Delete are CORE actions: always visible icons, always first
             (in that order), never inside ⋮. Other actions fill the visible slots up to 2 icons;
             anything left goes in ⋮. So ≤ 2 actions → all icons, no ⋮.
             Core is detected from `kind: "view" | "edit" | "delete"` or a label that starts
             with View / Show / Edit / Delete.
     onAction: function (action, row),
     onClear: function (),                // reset your own filter widgets (multi-selects)
     empty: { icon, title, text, actionHTML },    // no rows at all
     noResults: { icon, title, text },            // filters/search hide everything
     pageSize: 10,
     summary: function (rows) → [{ label, value, icon, tone?, meta?, filter?: { key, value } }],
                                          // KPI cards above the list card (counts from the whole dataset);
                                          // a card with `filter` is a toggle that applies that filter
     selectable: false,                   // checkbox column (DataGrid checkboxSelection)
     onSelect: function (ids),            // selection changed; ids survive paging + filtering
   }) → { refresh(), setMode(mode), setFilter(key, value), selected(), clearSelection() }
   modes: data | loading | empty | no-results | error
   ========================================================================== */
(function (DS) {
  var esc = DS.fmt.esc;
  var LATENCY = 350; // pretend server round trip

  function create(o) {
    var root = o.root;
    var body = root.querySelector(".list-body");
    var pager = root.querySelector("[data-list-pager]");
    var searchInput = root.querySelector("[data-list-search]");
    var searchClear = root.querySelector("[data-list-search-clear]");
    var clearBtn = root.querySelector("[data-list-clear]");
    // count: false → this list doesn't write a count (a second list on the page); a [data-list-count]
    // inside root wins over the page header one
    var countEl = o.count === false ? null : root.querySelector("[data-list-count]") || document.querySelector("[data-list-count]");
    var progress = document.createElement("div");
    progress.className = "list-progress";
    progress.hidden = true;
    body.parentNode.insertBefore(progress, body);

    /* ---------- Summary strip (KPI cards above the card) ---------- */
    var summaryEl = null;
    if (o.summary) {
      summaryEl = document.createElement("section");
      summaryEl.className = "kpi-row list-summary";
      summaryEl.setAttribute("aria-label", "Summary");
      root.parentNode.insertBefore(summaryEl, root);
      summaryEl.addEventListener("click", function (e) {
        var b = e.target.closest("[data-summary-filter]");
        if (!b) return;
        var key = b.getAttribute("data-summary-filter");
        var val = b.getAttribute("data-summary-value");
        var next = st.filters[key] === val ? defaults[key] || "all" : val;
        var el = root.querySelector('[data-list-filter="' + key + '"]');
        if (el) {
          el.value = next;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          setFilter(key, next);
        }
      });
    }
    function paintSummary() {
      if (!summaryEl) return;
      summaryEl.hidden = st.mode === "error";
      if (st.mode === "loading") {
        var n = summaryEl.children.length || 4;
        summaryEl.innerHTML = new Array(n + 1).join(
          '<div class="kpi kpi--loading"><span class="skeleton skeleton--text" style="--w:45%"></span>' +
          '<span class="skeleton skeleton--value" style="--w:35%"></span><span class="skeleton skeleton--text" style="--w:60%"></span></div>'
        );
        return;
      }
      var items = o.summary(st.mode === "empty" ? [] : o.rows());
      summaryEl.innerHTML = items.map(function (it) {
        var tag = it.filter ? "button" : "div";
        var on = it.filter && st.filters[it.filter.key] === it.filter.value;
        var attrs = it.filter
          ? ' type="button" data-summary-filter="' + esc(it.filter.key) + '" data-summary-value="' + esc(it.filter.value) +
            '" aria-pressed="' + !!on + '" title="' + (on ? "Show all" : "Show only these") + '"'
          : "";
        return (
          "<" + tag + ' class="kpi kpi--summary' + (it.filter ? " kpi--action" : "") + (on ? " is-on" : "") + '"' + attrs + ">" +
          '<span class="kpi__head"><span class="kpi__label">' + esc(it.label) + "</span>" +
          '<span class="kpi__icon kpi__icon--' + (it.tone || "primary") + '"><iconify-icon icon="' + it.icon + '"></iconify-icon></span></span>' +
          '<span class="kpi__figure"><span class="kpi__value">' + it.value + "</span></span>" +
          (it.meta ? '<span class="kpi__meta"><span>' + it.meta + "</span></span>" : "") +
          "</" + tag + ">"
        );
      }).join("");
    }

    var st = { q: "", scope: null, filters: {}, sort: null, page: 0, pageSize: o.pageSize || 10, mode: "data", firstLoad: true };
    var defaults = {}; // filter key → default value (not counted as "active")
    var scopeSel = root.querySelector("[data-list-search-scope]");

    function isEmpty(v) {
      return v == null || v === "" || v === "all" || (Array.isArray(v) && !v.length);
    }
    function isActive(k) {
      var v = st.filters[k];
      return !isEmpty(v) && v !== defaults[k];
    }
    function applies(k) {
      return !isEmpty(st.filters[k]); // defaults (like today's dates) still filter
    }
    var timer = 0;

    /* ---------- query the pretend server ---------- */
    function query() {
      var all = o.rows();
      var q = st.q.trim().toLowerCase();
      var list = all.filter(function (r) {
        if (q && String(o.search(r, st.scope)).toLowerCase().indexOf(q) === -1) return false;
        for (var k in st.filters) {
          if (applies(k) && !o.filters[k](r, st.filters[k])) return false;
        }
        return true;
      });
      if (st.sort) {
        var col = o.columns.filter(function (c) {
          return c.key === st.sort.key;
        })[0];
        var val = col.sortValue || function (r) {
          return r[col.key];
        };
        list = list.slice().sort(function (a, b) {
          var x = val(a);
          var y = val(b);
          var d = typeof x === "number" ? x - y : String(x).localeCompare(String(y));
          return st.sort.dir === "asc" ? d : -d;
        });
      }
      return { all: all.length, total: list.length, rows: list.slice(st.page * st.pageSize, (st.page + 1) * st.pageSize) };
    }

    /* ---------- renderers ---------- */
    function thHTML(c) {
      var cls = c.num ? ' class="is-num"' : "";
      if (c.sortable === false) return "<th scope=\"col\"" + cls + ">" + esc(c.label) + "</th>";
      var sort = st.sort && st.sort.key === c.key ? st.sort.dir : null;
      var aria = sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none";
      return (
        '<th scope="col"' + cls + ' aria-sort="' + aria + '"><button type="button" class="th-sort" data-sort="' + c.key + '">' +
        esc(c.label) + '<iconify-icon icon="' + (sort === "desc" ? "tabler:arrow-down" : "tabler:arrow-up") + '"></iconify-icon></button></th>'
      );
    }

    var VISIBLE = 2; // icon buttons before the ⋮ menu kicks in

    var CORE_ORDER = { view: 0, edit: 1, delete: 2 };
    function coreKind(a) {
      if (a.kind && a.kind in CORE_ORDER) return a.kind;
      var m = /^(view|show|edit|delete)\b/i.exec(a.label);
      return m ? (m[1].toLowerCase() === "show" ? "view" : m[1].toLowerCase()) : null;
    }

    function splitActions(r) {
      var all = o.actions ? o.actions(r) : [];
      var core = all
        .filter(coreKind)
        .sort(function (a, b) {
          return CORE_ORDER[coreKind(a)] - CORE_ORDER[coreKind(b)];
        });
      var other = all.filter(function (a) {
        return !coreKind(a);
      });
      if (core.length + other.length <= VISIBLE) return { shown: core.concat(other), rest: [] };
      var fill = Math.max(0, VISIBLE - core.length);
      return { shown: core.concat(other.slice(0, fill)), rest: other.slice(fill) };
    }

    // Icon button → MUI <Tooltip title={label}><IconButton aria-label=…/></Tooltip>
    function iconAction(a, r, name) {
      var cls = "icon-btn icon-btn--sm" + (a.danger ? " icon-btn--danger" : "");
      var aria = ' aria-label="' + esc(a.label) + " " + name + '" title="' + esc(a.label) + '"';
      var icon = '<iconify-icon icon="' + a.icon + '"></iconify-icon>';
      // Disabled with a reason: stays in place (columns line up), the tooltip says why
      if (a.disabled) {
        return '<span class="row-actions__off" title="' + esc(a.disabled) + '"><button type="button" class="' + cls + '" disabled aria-label="' +
          esc(a.label) + " " + name + ": " + esc(a.disabled) + '">' + icon + "</button></span>";
      }
      return a.href
        ? '<a class="' + cls + '" href="' + a.href + '"' + aria + (a.href === "#" ? " data-todo" : "") + ">" + icon + "</a>"
        : '<button type="button" class="' + cls + '"' + aria + ' data-row-action="' + a.action + '" data-row-id="' + esc(r.id) + '">' + icon + "</button>";
    }

    function actionsHTML(r) {
      var name = esc(o.rowName(r));
      var a = splitActions(r);
      return (
        '<td class="is-actions"><div class="row-actions">' +
        a.shown.map(function (x) {
          return iconAction(x, r, name);
        }).join("") +
        (a.rest.length
          ? '<button type="button" class="icon-btn icon-btn--sm" data-row-menu="' + esc(r.id) +
            '" aria-haspopup="menu" aria-expanded="false" aria-label="More actions for ' + name +
            '" title="More"><iconify-icon icon="tabler:dots-vertical"></iconify-icon></button>'
          : "") +
        "</div></td>"
      );
    }

    function findRow(id) {
      return o.rows().filter(function (r) {
        return String(r.id) === String(id);
      })[0];
    }

    // showActions(): optional, checked on every render (e.g. only one bet type has row actions)
    var hasActions = function () {
      return typeof o.actions === "function" && (!o.showActions || o.showActions());
    };

    /* ---------- selection ---------- */
    var picked = {}; // row id → true
    var pageIds = [];
    var selectedIds = function () {
      return Object.keys(picked);
    };
    function checkHTML(attrs, label) {
      return '<label class="checkbox"><input type="checkbox" ' + attrs + ' aria-label="' + esc(label) +
        '"><span class="check"><iconify-icon icon="tabler:check"></iconify-icon></span></label>';
    }
    function paintSelection() {
      if (!o.selectable) return;
      body.querySelectorAll("[data-select-row]").forEach(function (c) {
        c.checked = !!picked[c.getAttribute("data-select-row")];
        c.closest("tr").classList.toggle("is-selected", c.checked);
      });
      var all = body.querySelector("[data-select-page]");
      if (all) {
        var n = pageIds.filter(function (id) {
          return picked[id];
        }).length;
        all.checked = n > 0 && n === pageIds.length;
        all.indeterminate = n > 0 && n < pageIds.length;
      }
      if (o.onSelect) o.onSelect(selectedIds());
    }

    function tableHTML(rows) {
      pageIds = rows.map(function (r) {
        return String(r.id);
      });
      return (
        '<div class="table-wrap"><table class="table"><thead><tr>' +
        (o.selectable ? '<th scope="col" class="is-select">' + checkHTML("data-select-page", "Select all on this page") + "</th>" : "") +
        o.columns.map(thHTML).join("") +
        (hasActions() ? '<th scope="col" class="is-num is-actions">Actions</th>' : "") +
        "</tr></thead><tbody>" +
        rows
          .map(function (r) {
            return (
              "<tr>" +
              (o.selectable ? '<td class="is-select">' + checkHTML('data-select-row="' + esc(r.id) + '"', "Select " + o.rowName(r)) + "</td>" : "") +
              o.columns
                .map(function (c) {
                  return "<td" + (c.num ? ' class="is-num"' : c.className ? ' class="' + c.className + '"' : "") + ">" + c.render(r) + "</td>";
                })
                .join("") +
              (hasActions() ? actionsHTML(r) : "") +
              "</tr>"
            );
          })
          .join("") +
        "</tbody></table></div>"
      );
    }

    function skeletonHTML() {
      var row =
        "<tr>" +
        (o.selectable ? '<td class="is-select"><span class="skeleton skeleton--text" style="--w:18px"></span></td>' : "") +
        o.columns
          .map(function (c, i) {
            return '<td><span class="skeleton skeleton--text" style="--w:' + (i === 1 ? 70 : 50) + '%"></span></td>';
          })
          .join("") +
        (hasActions() ? '<td class="is-actions"><span class="skeleton skeleton--text" style="--w:48px"></span></td>' : "") + "</tr>";
      return (
        '<div class="table-wrap"><table class="table" aria-busy="true"><thead><tr>' +
        (o.selectable ? '<th class="is-select"></th>' : "") +
        o.columns.map(function (c) {
          return "<th" + (c.num ? ' class="is-num"' : "") + ">" + esc(c.label) + "</th>";
        }).join("") +
        (hasActions() ? '<th class="is-num is-actions">Actions</th>' : "") + "</tr></thead><tbody>" +
        new Array(Math.min(st.pageSize, 10) + 1).join(row) +
        "</tbody></table></div>"
      );
    }

    function stateHTML(s) {
      return (
        '<div class="empty list-state"><span class="avatar avatar--lg avatar--square"><iconify-icon icon="' + s.icon +
        '"></iconify-icon></span><div class="empty__title">' + esc(s.title) + '</div><div class="empty__text">' + esc(s.text) +
        "</div>" + (s.actionHTML || "") + "</div>"
      );
    }

    function errorHTML() {
      return (
        '<div class="list-state list-state--error"><div class="alert alert--error" role="alert"><iconify-icon icon="tabler:alert-triangle"></iconify-icon>' +
        '<div class="alert__body"><div class="alert__title">Couldn\'t load ' + esc(o.noun[1]) + '</div>' +
        '<div class="alert__text">The server didn\'t respond. Your search and filters are kept.</div></div>' +
        '<div class="alert__actions"><button type="button" class="btn btn--outlined btn--sm" data-list-retry>' +
        '<iconify-icon icon="tabler:refresh"></iconify-icon>Try again</button></div></div></div>'
      );
    }

    // Page numbers: first, last, current ±1, with "…" for the gaps (MUI <Pagination> look)
    function pageList(cur, last) {
      var out = [];
      for (var i = 0; i <= last; i++) {
        if (i === 0 || i === last || Math.abs(i - cur) <= 1) out.push(i);
        else if (out[out.length - 1] !== "…") out.push("…");
      }
      return out;
    }

    function pagerHTML(res) {
      var from = res.total ? st.page * st.pageSize + 1 : 0;
      var to = Math.min(res.total, (st.page + 1) * st.pageSize);
      var last = Math.max(0, Math.ceil(res.total / st.pageSize) - 1);
      var id = "pg-size-" + Math.random().toString(36).slice(2, 7);
      return (
        '<div class="pagination">' +
        '<span class="pagination__range" aria-live="polite">Showing <strong>' + from + "–" + to + "</strong> of <strong>" +
        DS.fmt.int(res.total) + "</strong> " + esc(res.total === 1 ? o.noun[0] : o.noun[1]) + "</span>" +
        '<div class="pagination__end"><div class="pagination__size"><label for="' + id + '">Rows per page</label>' +
        '<div class="field__control field__control--sm field__control--select"><select id="' + id + '" data-page-size>' +
        [5, 10, 25, 50, 100]
          .map(function (n) {
            return "<option" + (n === st.pageSize ? " selected" : "") + ">" + n + "</option>";
          })
          .join("") +
        '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div></div>' +
        '<nav class="pagination__pages" aria-label="Pages">' +
        '<button type="button" class="page-btn" data-page-step="-1" aria-label="Previous page"' + (st.page === 0 ? " disabled" : "") +
        '><iconify-icon icon="tabler:chevron-left"></iconify-icon></button>' +
        pageList(st.page, last)
          .map(function (p) {
            if (p === "…") return '<span class="pagination__gap" aria-hidden="true">…</span>';
            return '<button type="button" class="page-btn" data-page-go="' + p + '"' + (p === st.page ? ' aria-current="page"' : "") +
              ' aria-label="Page ' + (p + 1) + '">' + (p + 1) + "</button>";
          })
          .join("") +
        '<button type="button" class="page-btn" data-page-step="1" aria-label="Next page"' + (st.page >= last ? " disabled" : "") +
        '><iconify-icon icon="tabler:chevron-right"></iconify-icon></button></nav></div></div>'
      );
    }

    function hasCriteria() {
      if (st.q.trim()) return true;
      for (var k in st.filters) if (isActive(k)) return true;
      return false;
    }

    function paintChrome(res) {
      if (clearBtn) clearBtn.hidden = !hasCriteria();
      if (searchClear) searchClear.hidden = !st.q;
      if (countEl && res) {
        var n = res.total;
        var word = res.all === 1 ? o.noun[0] : o.noun[1];
        // default filters (e.g. today's dates) still narrow the list, so count what's shown
        var shownWord = n === 1 ? o.noun[0] : o.noun[1];
        countEl.textContent = hasCriteria()
          ? DS.fmt.int(n) + " of " + DS.fmt.int(res.all) + " " + word
          : DS.fmt.int(n) + " " + shownWord;
      }
    }

    /* ---------- fetch cycle ---------- */
    function render() {
      closeRowMenu();
      paintSummary();
      if (st.mode === "loading") {
        body.innerHTML = skeletonHTML();
        pager.innerHTML = "";
        return;
      }
      if (st.mode === "error") {
        body.innerHTML = errorHTML();
        pager.innerHTML = "";
        if (countEl) countEl.textContent = "Not available right now";
        return;
      }
      if (st.mode === "empty") {
        body.innerHTML = stateHTML(o.empty);
        pager.innerHTML = "";
        if (countEl) countEl.textContent = "0 " + o.noun[1];
        return;
      }
      var res = query();
      paintChrome(res);
      if (st.mode === "no-results" || (!res.total && hasCriteria())) {
        body.innerHTML = stateHTML({
          icon: o.noResults.icon,
          title: o.noResults.title,
          text: o.noResults.text,
          actionHTML: '<button type="button" class="btn btn--outlined btn--sm" data-list-clear-all>Clear filters</button>',
        });
        pager.innerHTML = "";
        return;
      }
      if (!res.total) {
        body.innerHTML = stateHTML(o.empty);
        pager.innerHTML = "";
        return;
      }
      body.innerHTML = tableHTML(res.rows);
      pager.innerHTML = pagerHTML(res);
      paintSelection();
    }

    function refresh(opts) {
      clearTimeout(timer);
      if (st.firstLoad) {
        st.firstLoad = false;
        body.innerHTML = skeletonHTML();
        if (summaryEl && !summaryEl.children.length) {
          var m = st.mode;
          st.mode = "loading";
          paintSummary();
          st.mode = m;
        }
      } else {
        body.classList.add("is-fetching");
      }
      progress.hidden = false;
      timer = setTimeout(function () {
        progress.hidden = true;
        body.classList.remove("is-fetching");
        render();
        if (opts && opts.focusSort) {
          var b = body.querySelector('[data-sort="' + opts.focusSort + '"]');
          if (b) b.focus();
        }
      }, LATENCY);
    }

    /* ---------- toolbar wiring ---------- */
    var debounce = 0;
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        st.q = searchInput.value;
        if (searchClear) searchClear.hidden = !st.q;
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          st.page = 0;
          st.mode = "data";
          refresh();
        }, 300);
      });
    }
    if (searchClear) {
      searchClear.addEventListener("click", function () {
        searchInput.value = "";
        st.q = "";
        st.page = 0;
        searchInput.focus();
        refresh();
      });
    }
    var filterEls = root.querySelectorAll("[data-list-filter]");
    filterEls.forEach(function (el) {
      var key = el.getAttribute("data-list-filter");
      defaults[key] = el.value;
      st.filters[key] = el.value;
      el.addEventListener("change", function () {
        st.filters[key] = el.value;
        st.page = 0; // same rule as the app: filter change → first page
        st.mode = "data";
        refresh();
      });
    });
    if (scopeSel) {
      st.scope = scopeSel.value;
      scopeSel.addEventListener("change", function () {
        st.scope = scopeSel.value;
        if (searchInput) searchInput.focus();
        if (st.q) {
          st.page = 0;
          refresh();
        }
      });
    }

    function setFilter(key, value) {
      if (!(key in defaults)) defaults[key] = "all";
      st.filters[key] = value;
      st.page = 0;
      st.mode = "data";
      refresh();
    }

    function clearAll() {
      st.q = "";
      if (searchInput) searchInput.value = "";
      filterEls.forEach(function (el) {
        var key = el.getAttribute("data-list-filter");
        el.value = defaults[key];
        st.filters[key] = defaults[key];
      });
      for (var k in st.filters) {
        if (!root.querySelector('[data-list-filter="' + k + '"]')) st.filters[k] = defaults[k];
      }
      if (o.onClear) o.onClear();
      st.page = 0;
      st.mode = "data";
      refresh();
    }
    if (clearBtn) clearBtn.addEventListener("click", clearAll);

    root.addEventListener("click", function (e) {
      var s = e.target.closest("[data-sort]");
      if (s) {
        var key = s.getAttribute("data-sort");
        // DataGrid cycle: none → asc → desc → none
        if (!st.sort || st.sort.key !== key) st.sort = { key: key, dir: "asc" };
        else if (st.sort.dir === "asc") st.sort.dir = "desc";
        else st.sort = null;
        refresh({ focusSort: key });
        return;
      }
      var step = e.target.closest("[data-page-step]");
      if (step) {
        st.page += Number(step.getAttribute("data-page-step"));
        refresh();
        return;
      }
      var go = e.target.closest("[data-page-go]");
      if (go) {
        st.page = Number(go.getAttribute("data-page-go"));
        refresh();
        return;
      }
      if (e.target.closest("[data-list-clear-all]")) return clearAll();
      if (e.target.closest("[data-list-retry]")) {
        st.mode = "data";
        refresh();
        return;
      }
      var act = e.target.closest("[data-row-action][data-row-id]");
      if (act) {
        o.onAction(act.getAttribute("data-row-action"), findRow(act.getAttribute("data-row-id")));
        return;
      }
      var m = e.target.closest("[data-row-menu]");
      if (m) {
        e.stopPropagation();
        toggleRowMenu(m);
      }
    });
    root.addEventListener("change", function (e) {
      if (e.target.matches("[data-select-row]")) {
        var rid = e.target.getAttribute("data-select-row");
        if (e.target.checked) picked[rid] = true;
        else delete picked[rid];
        paintSelection();
        return;
      }
      if (e.target.matches("[data-select-page]")) {
        var on = e.target.checked;
        pageIds.forEach(function (id) {
          if (on) picked[id] = true;
          else delete picked[id];
        });
        paintSelection();
        return;
      }
      if (e.target.matches("[data-page-size]")) {
        st.pageSize = Number(e.target.value);
        st.page = 0;
        refresh();
      }
    });

    /* ---------- row menu: one floating menu (like MUI's portal), never clipped by the table ---------- */
    var menu = document.createElement("div");
    menu.className = "menu row-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    menu.style.position = "fixed";
    document.body.appendChild(menu);
    var menuBtn = null;
    var menuRow = null;

    function closeRowMenu(refocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", "false");
        if (refocus) menuBtn.focus();
      }
      menuBtn = null;
    }

    function toggleRowMenu(btn) {
      if (menuBtn === btn) return closeRowMenu();
      closeRowMenu();
      menuRow = findRow(btn.getAttribute("data-row-menu"));
      menu.innerHTML = splitActions(menuRow)
        .rest.map(function (it) {
          if (it === "divider") return '<div class="menu__divider" role="separator"></div>';
          var cls = "menu__item" + (it.danger ? " menu__item--danger" : "");
          var inner = '<iconify-icon icon="' + it.icon + '"></iconify-icon>' + esc(it.label);
          return it.href
            ? '<a class="' + cls + '" role="menuitem" href="' + it.href + '"' + (it.href === "#" ? " data-todo" : "") + ">" + inner + "</a>"
            : '<button type="button" class="' + cls + '" role="menuitem" data-row-action="' + it.action + '">' + inner + "</button>";
        })
        .join("");
      menu.hidden = false;
      var r = btn.getBoundingClientRect();
      var mh = menu.offsetHeight;
      var mw = menu.offsetWidth;
      var top = r.bottom + 4 + mh > window.innerHeight ? r.top - mh - 4 : r.bottom + 4;
      menu.style.top = Math.max(8, top) + "px";
      menu.style.left = Math.max(8, r.right - mw) + "px";
      menuBtn = btn;
      btn.setAttribute("aria-expanded", "true");
      var first = menu.querySelector(".menu__item");
      if (first) first.focus();
    }

    menu.addEventListener("click", function (e) {
      var a = e.target.closest("[data-row-action]");
      if (!a) return;
      var row = menuRow;
      closeRowMenu();
      o.onAction(a.getAttribute("data-row-action"), row);
    });
    menu.addEventListener("keydown", function (e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll(".menu__item"));
      var i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var n = e.key === "ArrowDown" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
        items[n].focus();
      }
      if (e.key === "Escape") closeRowMenu(true);
    });
    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target)) closeRowMenu();
    });
    window.addEventListener("scroll", function () {
      closeRowMenu();
    }, true);
    window.addEventListener("resize", function () {
      closeRowMenu();
    });

    /* ---------- public ---------- */
    return {
      refresh: refresh,
      setFilter: setFilter,
      selected: selectedIds,
      clearSelection: function () {
        picked = {};
        paintSelection();
      },
      setMode: function (mode) {
        st.mode = mode;
        clearTimeout(timer);
        progress.hidden = true;
        body.classList.remove("is-fetching");
        if (mode === "no-results" && searchInput && !st.q) {
          searchInput.value = st.q = "zzz";
        }
        if (mode !== "data") return render();
        st.firstLoad = true;
        refresh();
      },
    };
  }

  DS.list = { create: create };
})(window.DS);
