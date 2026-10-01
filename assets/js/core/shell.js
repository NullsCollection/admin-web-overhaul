/* ==========================================================================
   App shell renderer: fills #app-sidebar, #app-topbar, #app-footer from DS.nav.
   Port: src/@core/layouts/components/vertical/{navigation,appBar} +
         src/layouts/components/vertical/AppBarContent.tsx (mode, language, user)

   <body data-page="dashboard" data-base="../">
     data-page → which nav item is active
     data-base → path from this HTML file to ui/ ("../" for pages/, "" for ui/)
   ========================================================================== */
(function (DS) {
  var esc = DS.fmt.esc;
  var body = document.body;
  var page = body.getAttribute("data-page");
  // A round page opened from the Pending round queue (?from=pending) keeps that nav item lit
  if (DS.params && DS.params.get("from") === "pending") page = "pending-round";
  var base = body.getAttribute("data-base") || "";
  var app = document.querySelector(".app");

  /* ---------- Active trail ---------- */
  function findTrail(items, id, trail) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var next = trail.concat(it);
      if (it.id === id) return next;
      if (it.children) {
        var hit = findTrail(it.children, id, next);
        if (hit) return hit;
      }
    }
    return null;
  }
  var trail = [];
  var section = "";
  DS.nav.forEach(function (s) {
    var t = findTrail(s.items, page, []);
    if (t) {
      trail = t;
      section = s.section;
    }
  });
  var trailIds = trail.map(function (i) {
    return i.id;
  });

  /* ---------- Sidebar ---------- */
  function itemHTML(it) {
    var icon = it.icon ? '<iconify-icon class="nav-item__icon" icon="' + it.icon + '"></iconify-icon>' : "";
    var badge = it.badge ? '<span class="badge">' + it.badge + "</span>" : "";
    var label = '<span class="nav-item__label">' + esc(it.label) + "</span>";

    if (it.children) {
      var open = trailIds.indexOf(it.id) > -1;
      var cid = "nav-" + it.id;
      return (
        '<li><button type="button" class="nav-item' + (open ? " is-trail" : "") + '" aria-expanded="' + open +
        '" aria-controls="' + cid + '" title="' + esc(it.label) + '">' + icon + label + badge +
        '<iconify-icon class="nav-item__chevron" icon="tabler:chevron-right"></iconify-icon></button>' +
        '<ul class="nav-list nav-children" id="' + cid + '"' + (open ? "" : " hidden") + ">" +
        it.children.map(itemHTML).join("") + "</ul></li>"
      );
    }

    var active = it.id === page;
    var href = it.href ? base + "pages/" + it.href : "#";
    return (
      '<li><a class="nav-item' + (active ? " is-active" : "") + '" href="' + href + '"' +
      (active ? ' aria-current="page"' : "") + (it.href ? "" : " data-todo") +
      ' title="' + esc(it.label) + '">' + icon + label + badge + "</a></li>"
    );
  }

  var sidebar = document.getElementById("app-sidebar");
  if (sidebar) {
    sidebar.innerHTML =
      '<div class="sidebar__brand">' +
      '<a class="sidebar__logo brand-logo" href="' + base + 'index.html" aria-label="Home">' +
      DS.ui.logoHTML(base) + "</a>" +
      '<button type="button" class="icon-btn icon-btn--sm sidebar__collapse" data-action="collapse" aria-label="Collapse menu">' +
      '<iconify-icon icon="tabler:layout-sidebar-left-collapse"></iconify-icon></button></div>' +
      '<nav class="sidebar__nav" aria-label="Main">' +
      DS.nav
        .map(function (s) {
          return (
            '<div class="nav-section"><div class="nav-section__title">' + esc(s.section) + "</div>" +
            '<ul class="nav-list">' + s.items.map(itemHTML).join("") + "</ul></div>"
          );
        })
        .join("") +
      "</nav>";

    sidebar.addEventListener("click", function (e) {
      var group = e.target.closest("button.nav-item[aria-controls]");
      if (group) {
        var list = document.getElementById(group.getAttribute("aria-controls"));
        var open = group.getAttribute("aria-expanded") !== "true";
        group.setAttribute("aria-expanded", String(open));
        list.hidden = !open;
        return;
      }
    });
  }

  /* ---------- Top bar ---------- */
  var crumbs = body.getAttribute("data-crumbs")
    ? body.getAttribute("data-crumbs").split("|")
    : [section].concat(
        trail.map(function (t) {
          return t.label;
        })
      );
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var topbar = document.getElementById("app-topbar");
  if (topbar) {
    topbar.innerHTML =
      '<button type="button" class="icon-btn topbar__menu" data-action="nav-open" aria-label="Open menu">' +
      '<iconify-icon icon="tabler:menu-2"></iconify-icon></button>' +
      '<nav class="topbar__crumbs" aria-label="Breadcrumb">' +
      crumbs
        .filter(Boolean)
        .map(function (c, i, all) {
          var last = i === all.length - 1;
          return (last ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
            (last ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
        })
        .join("") +
      "</nav>" +
      '<div class="topbar__end">' +
      '<button type="button" class="search-trigger" data-action="palette" aria-haspopup="dialog" aria-label="Search pages">' +
      '<iconify-icon icon="tabler:search"></iconify-icon><span class="search-trigger__text">Search pages…</span>' +
      '<span class="kbd" aria-hidden="true">' + (isMac ? "⌘" : "Ctrl") + " K</span></button>" +
      '<button type="button" class="icon-btn" data-action="mode"></button>' +
      DS.ui.langMenuHTML() +
      '<span class="topbar__sep" aria-hidden="true"></span>' +
      '<div class="topbar__popover">' +
      '<button type="button" class="user-btn" data-menu="user-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Account">' +
      '<span class="avatar avatar--sm avatar--inverse">SA</span>' +
      '<span class="user-btn__text"><span class="user-btn__name">superadmin</span><span class="user-btn__role">Super admin</span></span>' +
      '<iconify-icon icon="tabler:chevron-down"></iconify-icon></button>' +
      '<div class="menu" id="user-menu" role="menu" hidden>' +
      '<div class="menu__header"><span class="avatar avatar--inverse">SA</span><div><div class="t-subtitle2">superadmin</div><div class="t-caption t-muted">Super admin</div></div></div>' +
      '<div class="menu__divider"></div>' +
      '<a class="menu__item" role="menuitem" href="' + base + 'pages/change-password.html"><iconify-icon icon="tabler:key"></iconify-icon>Change password</a>' +
      '<div class="menu__divider"></div>' +
      '<a class="menu__item" role="menuitem" href="' + base + 'pages/login.html"><iconify-icon icon="tabler:logout"></iconify-icon>Log out</a>' +
      "</div></div></div>";
  }

  var footer = document.getElementById("app-footer");
  if (footer) {
    footer.innerHTML = "<span>© 2026 Super Admin</span><span>Design prototype, not live data</span>";
  }

  DS.ui.paintModeButtons();

  /* ---------- Collapse (desktop) + drawer (mobile) ---------- */
  var scrim = document.createElement("div");
  scrim.className = "app__scrim";
  scrim.hidden = true;
  if (app) app.appendChild(scrim);

  function paintCollapsed() {
    if (!app) return;
    var c = !!DS.settings.get("collapsed");
    app.classList.toggle("is-collapsed", c);
    var b = document.querySelector('[data-action="collapse"]');
    if (b) b.setAttribute("aria-label", c ? "Expand menu" : "Collapse menu");
  }
  paintCollapsed();

  function setNav(open) {
    if (!app) return;
    app.classList.toggle("is-nav-open", open);
    scrim.hidden = !open;
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-action]");
    if (!a) {
      if (e.target === scrim) setNav(false);
      return;
    }
    var action = a.getAttribute("data-action");
    if (action === "collapse") {
      DS.settings.set("collapsed", !DS.settings.get("collapsed"));
      paintCollapsed();
    }
    if (action === "nav-open") setNav(true);
    if (action === "palette") openPalette(a);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && app && app.classList.contains("is-nav-open")) setNav(false);
  });

  /* ---------- Command palette (⌘K / Ctrl K, or "/" outside a field) ----------
     Port: a MUI <Dialog> with an <Autocomplete open disablePortal> listing the nav config.
     Jumps to any page by name; also runs a few account actions. */
  var entries = [];
  DS.nav.forEach(function (s) {
    s.items.forEach(function (it) {
      (it.children || [it]).forEach(function (leaf) {
        if (!leaf.href) return;
        entries.push({
          group: s.section,
          label: leaf.label,
          hint: it.children ? it.label : "",
          icon: leaf.icon || it.icon || "tabler:file",
          href: base + "pages/" + leaf.href,
          current: leaf.id === page,
        });
      });
    });
  });
  entries.push(
    { group: "Account", label: "Toggle dark mode", icon: "tabler:contrast-2", run: function () {
      DS.settings.set("mode", DS.settings.get("mode") === "dark" ? "light" : "dark");
    } },
    { group: "Account", label: "Change password", icon: "tabler:key", href: base + "pages/change-password.html" },
    { group: "Account", label: "Log out", icon: "tabler:logout", href: base + "pages/login.html" }
  );

  var pal = null;
  var palOpener = null;
  var palIndex = 0;
  var palShown = [];

  function buildPalette() {
    pal = document.createElement("div");
    pal.className = "cmdk-backdrop";
    pal.hidden = true;
    pal.innerHTML =
      '<div class="cmdk" role="dialog" aria-modal="true" aria-label="Search pages">' +
      '<div class="cmdk__search"><iconify-icon icon="tabler:search" aria-hidden="true"></iconify-icon>' +
      '<input type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" ' +
      'autocomplete="off" spellcheck="false" placeholder="Search pages and actions" aria-label="Search pages and actions">' +
      '<span class="kbd" aria-hidden="true">Esc</span></div>' +
      '<div class="cmdk__list" id="cmdk-list" role="listbox" aria-label="Results"></div>' +
      '<div class="cmdk__foot" aria-hidden="true"><span><span class="kbd">↑</span><span class="kbd">↓</span>Move</span>' +
      '<span><span class="kbd">↵</span>Open</span><span><span class="kbd">Esc</span>Close</span></div></div>';
    document.body.appendChild(pal);

    var input = pal.querySelector("input");
    input.addEventListener("input", function () {
      palIndex = 0;
      paintPalette(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!palShown.length) return;
        palIndex = (palIndex + (e.key === "ArrowDown" ? 1 : -1) + palShown.length) % palShown.length;
        paintActive();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (palShown[palIndex]) runEntry(palShown[palIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closePalette();
      } else if (e.key === "Tab") {
        e.preventDefault(); // focus stays in the search box (the list is driven by arrows)
      }
    });
    pal.addEventListener("mousedown", function (e) {
      if (e.target === pal) closePalette();
    });
    pal.addEventListener("mousemove", function (e) {
      var o = e.target.closest(".cmdk__item");
      if (!o) return;
      var i = Number(o.getAttribute("data-index"));
      if (i !== palIndex) {
        palIndex = i;
        paintActive(true);
      }
    });
    pal.addEventListener("click", function (e) {
      var o = e.target.closest(".cmdk__item");
      if (o) runEntry(palShown[Number(o.getAttribute("data-index"))]);
    });
  }

  function paintPalette(q) {
    q = (q || "").trim().toLowerCase();
    palShown = entries.filter(function (en) {
      return !q || (en.label + " " + en.hint + " " + en.group).toLowerCase().indexOf(q) > -1;
    });
    var list = pal.querySelector(".cmdk__list");
    if (!palShown.length) {
      list.innerHTML = '<div class="cmdk__empty">No pages match “' + esc(q) + "”</div>";
      pal.querySelector("input").removeAttribute("aria-activedescendant");
      return;
    }
    var html = "";
    var group = null;
    palShown.forEach(function (en, i) {
      if (en.group !== group) {
        if (group !== null) html += "</div>";
        group = en.group;
        html += '<div class="cmdk__group" role="group" aria-label="' + esc(group) + '"><div class="cmdk__group-title" aria-hidden="true">' + esc(group) + "</div>";
      }
      html +=
        '<div class="cmdk__item" role="option" id="cmdk-' + i + '" data-index="' + i + '" aria-selected="false">' +
        '<iconify-icon icon="' + en.icon + '" aria-hidden="true"></iconify-icon>' +
        '<span class="cmdk__label">' + esc(en.label) + "</span>" +
        (en.hint ? '<span class="cmdk__hint">' + esc(en.hint) + "</span>" : "") +
        (en.current ? '<span class="cmdk__hint">Current page</span>' : "") +
        '<iconify-icon class="cmdk__enter" icon="tabler:corner-down-left" aria-hidden="true"></iconify-icon></div>';
    });
    list.innerHTML = html + "</div>";
    paintActive();
  }

  function paintActive(fromPointer) {
    pal.querySelectorAll(".cmdk__item").forEach(function (o) {
      o.setAttribute("aria-selected", String(Number(o.getAttribute("data-index")) === palIndex));
    });
    var active = document.getElementById("cmdk-" + palIndex);
    pal.querySelector("input").setAttribute("aria-activedescendant", active ? active.id : "");
    if (active && !fromPointer) active.scrollIntoView({ block: "nearest" });
  }

  function runEntry(en) {
    closePalette();
    if (en.run) en.run();
    else if (en.href) location.href = en.href;
  }

  function openPalette(opener) {
    if (!pal) buildPalette();
    palOpener = opener || document.activeElement;
    pal.hidden = false;
    palIndex = 0;
    var input = pal.querySelector("input");
    input.value = "";
    paintPalette("");
    input.focus();
  }
  function closePalette() {
    if (!pal || pal.hidden) return;
    pal.hidden = true;
    if (palOpener && document.contains(palOpener)) palOpener.focus();
  }

  if (topbar) {
    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (pal && !pal.hidden) closePalette();
        else openPalette();
      } else if (e.key === "/" && !typing && !document.querySelector(".dialog-backdrop")) {
        e.preventDefault();
        openPalette();
      }
    });
  }
})(window.DS);
