/* ==========================================================================
   Small shared behaviors, wired by data attributes so pages stay declarative.

   [data-menu="id"]       button toggles the .menu with that id (Esc / outside click close)
   .multiselect           Autocomplete-multiple look-alike (DS.ui.multiselect)
   .field__control--select > select → themed dropdown menu (MUI Select), search at 8+ options
   [data-view-toggle]     chart ↔ table switch inside a card
   DS.ui.toast(text)      MUI Snackbar / react-hot-toast look-alike
   ========================================================================== */
(function (DS) {
  var ui = (DS.ui = {});
  var openMenu = null;

  function closeMenu() {
    if (!openMenu) return;
    openMenu.menu.hidden = true;
    openMenu.btn.setAttribute("aria-expanded", "false");
    openMenu = null;
  }
  ui.closeMenu = closeMenu;

  function toggleMenu(btn) {
    var menu = document.getElementById(btn.getAttribute("data-menu"));
    if (!menu) return;
    if (ui.closeSelect) ui.closeSelect();
    var wasOpen = openMenu && openMenu.menu === menu;
    closeMenu();
    if (wasOpen) return;
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    openMenu = { btn: btn, menu: menu };
    var first = menu.querySelector("input, [role^='menuitem'], .menu__item");
    if (first) first.focus({ preventScroll: true });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-menu]");
    if (btn) {
      e.preventDefault();
      toggleMenu(btn);
      return;
    }
    if (openMenu && !openMenu.menu.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (!openMenu) return;
    if (e.key === "Escape") {
      var btn = openMenu.btn;
      closeMenu();
      btn.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      var items = Array.prototype.slice.call(openMenu.menu.querySelectorAll(".menu__item"));
      var i = items.indexOf(document.activeElement);
      var next = e.key === "ArrowDown" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
      if (items[next]) {
        e.preventDefault();
        items[next].focus();
      }
    }
  });

  /* ---------- Multi-select ---------- */
  /* el: the .field wrapper. opts: { options:[{value,label}], selected:[values], placeholder, onChange,
     wrap: true → show every tag (forms); default shows 1 tag + "+N" (filter bars), emptyText } */
  ui.multiselect = function (el, opts) {
    var selected = new Set(opts.selected || []);
    var btn = el.querySelector(".multiselect");
    var valueEl = el.querySelector(".multiselect__value");
    var menu = el.querySelector(".menu");
    var list = menu.querySelector("[data-options]");
    var search = menu.querySelector("input");

    function renderValue() {
      var chosen = opts.options.filter(function (o) {
        return selected.has(o.value);
      });
      if (!chosen.length) {
        valueEl.innerHTML = '<span class="multiselect__placeholder">' + DS.fmt.esc(opts.placeholder) + "</span>";
        return;
      }
      var tag = function (c) {
        return (
          '<span class="chip chip--input">' + DS.fmt.esc(c.label) +
          '<span class="chip__remove" role="button" tabindex="-1" aria-label="Remove ' + DS.fmt.esc(c.label) +
          '" data-remove="' + DS.fmt.esc(c.value) + '"><iconify-icon icon="tabler:x"></iconify-icon></span></span>'
        );
      };
      valueEl.innerHTML = opts.wrap
        ? chosen.map(tag).join("")
        : tag(chosen[0]) + (chosen.length > 1 ? '<span class="multiselect__more">+' + (chosen.length - 1) + "</span>" : "");
    }

    function renderList() {
      var q = (search && search.value.trim().toLowerCase()) || "";
      list.innerHTML = opts.options
        .filter(function (o) {
          return !q || o.label.toLowerCase().indexOf(q) > -1;
        })
        .map(function (o) {
          var on = selected.has(o.value);
          return (
            '<button type="button" class="menu__item" role="menuitemcheckbox" aria-checked="' +
            on +
            '" data-value="' +
            DS.fmt.esc(o.value) +
            '"><span class="check' +
            (on ? " is-checked" : "") +
            '"><iconify-icon icon="tabler:check"></iconify-icon></span>' +
            DS.fmt.esc(o.label) +
            "</button>"
          );
        })
        .join("") || '<div class="menu__item t-muted">' + DS.fmt.esc(opts.emptyText || "No matches") + "</div>";
    }

    function change() {
      renderValue();
      renderList();
      if (opts.onChange) opts.onChange(Array.from(selected));
    }

    list.addEventListener("click", function (e) {
      var item = e.target.closest("[data-value]");
      if (!item) return;
      e.stopPropagation();
      var v = item.getAttribute("data-value");
      if (selected.has(v)) selected.delete(v);
      else selected.add(v);
      change();
      var again = list.querySelector('[data-value="' + CSS.escape(v) + '"]');
      if (again) again.focus();
    });
    btn.addEventListener("click", function (e) {
      var rm = e.target.closest("[data-remove]");
      if (!rm) return;
      e.stopPropagation();
      selected.delete(rm.getAttribute("data-remove"));
      change();
    });
    if (search) {
      search.addEventListener("input", renderList);
      search.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    renderValue();
    renderList();
    return {
      get: function () {
        return Array.from(selected);
      },
      set: function (values) {
        selected = new Set(values || []);
        renderValue();
        renderList();
      },
    };
  };

  /* ---------- Select dropdown (every .field__control--select > select) ----------
     Port: MUI <Select> / <CustomTextField select> → themed <Menu>. The native <select> stays the
     source of truth (value, options, change events), so pages and the form engine don't change;
     only its popup is replaced by one shared floating listbox (never clipped by cards or dialogs).
     Opens on click, Enter, Space, ↑ / ↓. In the menu: ↑ ↓ Home End move, Enter picks,
     Esc / Tab close, typing jumps to a match. 8+ options → a search box on top.
     Options with value "" are placeholders ("Select a …") and aren't listed. */
  var SEARCH_AT = 8;
  var sel = null; // the <select> whose menu is open
  var pop = document.createElement("div");
  pop.className = "menu select-menu";
  pop.hidden = true;
  pop.innerHTML =
    '<div class="select-menu__search" hidden><div class="field__control field__control--sm"><iconify-icon icon="tabler:search"></iconify-icon>' +
    '<input type="search" placeholder="Search…" aria-label="Search options" autocomplete="off"></div></div>' +
    '<div class="select-menu__list" role="listbox" id="select-menu-list"></div>';
  var popSearch = pop.querySelector("input");
  var popSearchWrap = pop.querySelector(".select-menu__search");
  var popList = pop.querySelector("[role=listbox]");
  var mount = function () {
    if (!pop.parentNode) document.body.appendChild(pop);
  };
  var enhanced = function (s) {
    return s && s.tagName === "SELECT" && !s.multiple && !!s.closest(".field__control--select");
  };
  var items = function () {
    return Array.prototype.slice.call(popList.querySelectorAll(".menu__item[data-value]:not([hidden])"));
  };

  function paintOptions() {
    var q = popSearch.value.trim().toLowerCase();
    var html = "";
    var any = false;
    var lastGroup = null;
    Array.prototype.forEach.call(sel.options, function (o, i) {
      if (o.value === "") return;
      var hide = q && o.text.toLowerCase().indexOf(q) < 0;
      if (!hide) any = true;
      // <optgroup> → a heading above its first shown option (MUI ListSubheader)
      var g = o.parentNode.tagName === "OPTGROUP" ? o.parentNode.label : null;
      if (g && g !== lastGroup && !hide) {
        html += '<div class="select-menu__group" role="presentation">' + DS.fmt.esc(g) + "</div>";
        lastGroup = g;
      }
      var on = o.selected;
      html +=
        '<button type="button" class="menu__item select-menu__item' + (on ? " is-selected" : "") + '" role="option" tabindex="-1" id="select-menu-opt-' + i +
        '" aria-selected="' + on + '" data-value="' + DS.fmt.esc(o.value) + '"' + (o.disabled ? " disabled" : "") + (hide ? " hidden" : "") + ">" +
        '<span class="select-menu__label">' + DS.fmt.esc(o.text) + "</span>" +
        (on ? '<iconify-icon icon="tabler:check" class="select-menu__check"></iconify-icon>' : "") + "</button>";
    });
    popList.innerHTML = html + (any ? "" : '<div class="select-menu__empty">No matches</div>');
  }

  function place() {
    var r = sel.closest(".field__control").getBoundingClientRect();
    pop.style.minWidth = Math.max(r.width, 200) + "px";
    pop.style.maxWidth = Math.max(r.width, 320) + "px";
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8)) + "px";
    var below = window.innerHeight - r.bottom - 8;
    var h = pop.offsetHeight;
    pop.style.top = (below < h && r.top > below ? Math.max(8, r.top - h - 4) : r.bottom + 4) + "px";
  }

  function openSelect(s) {
    if (s.disabled) return;
    closeMenu();
    closeSelect();
    mount();
    sel = s;
    var many = Array.prototype.filter.call(s.options, function (o) {
      return o.value !== "";
    }).length >= SEARCH_AT;
    popSearch.value = "";
    popSearchWrap.hidden = !many;
    paintOptions();
    pop.hidden = false;
    s.closest(".field__control").classList.add("is-open");
    s.setAttribute("aria-expanded", "true");
    s.setAttribute("aria-controls", "select-menu-list");
    place();
    var cur = popList.querySelector(".is-selected") || items()[0];
    if (cur) cur.scrollIntoView({ block: "nearest" });
    if (many) popSearch.focus({ preventScroll: true });
    else if (cur) cur.focus({ preventScroll: true });
  }

  function closeSelect(refocus) {
    if (!sel) return;
    var s = sel;
    sel = null;
    pop.hidden = true;
    s.closest(".field__control").classList.remove("is-open");
    s.setAttribute("aria-expanded", "false");
    if (refocus) s.focus({ preventScroll: true });
  }
  ui.closeSelect = closeSelect;

  function pick(value) {
    var s = sel;
    closeSelect(true);
    if (s.value === value) return;
    s.value = value;
    s.dispatchEvent(new Event("input", { bubbles: true }));
    s.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Open ours instead of the native popup
  document.addEventListener("mousedown", function (e) {
    var s = e.target.closest && e.target.closest("select");
    if (!enhanced(s)) return;
    e.preventDefault();
    if (sel === s) return closeSelect(true);
    s.focus({ preventScroll: true });
    openSelect(s);
  });
  document.addEventListener("keydown", function (e) {
    var s = e.target;
    if (!enhanced(s) || sel === s) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openSelect(s);
    }
  });

  // Keys inside the open menu (window + capture, so it runs before the dialog's Esc handler)
  var typed = "";
  var typedAt = 0;
  window.addEventListener("keydown", function (e) {
    if (!sel || !pop.contains(document.activeElement)) return;
    var list = items().filter(function (b) {
      return !b.disabled;
    });
    var i = list.indexOf(document.activeElement);
    var go = function (n) {
      if (!list.length) return;
      e.preventDefault();
      list[Math.max(0, Math.min(list.length - 1, n))].focus();
    };
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      return closeSelect(true);
    }
    if (e.key === "Tab") return closeSelect(true);
    if (e.key === "ArrowDown") return go(i + 1);
    if (e.key === "ArrowUp") {
      if (i <= 0 && !popSearchWrap.hidden) {
        e.preventDefault();
        return popSearch.focus();
      }
      return go(i - 1);
    }
    if (e.key === "Home" && i > -1) return go(0);
    if (e.key === "End" && i > -1) return go(list.length - 1);
    if (e.key === "Enter" && document.activeElement === popSearch) {
      e.preventDefault();
      if (list[0]) pick(list[0].getAttribute("data-value"));
      return;
    }
    // Type-ahead when focus is on the list
    if (e.key.length === 1 && document.activeElement !== popSearch && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var now = Date.now();
      typed = now - typedAt > 700 ? e.key.toLowerCase() : typed + e.key.toLowerCase();
      typedAt = now;
      var hit = list.filter(function (b) {
        return b.textContent.trim().toLowerCase().indexOf(typed) === 0;
      })[0];
      if (hit) hit.focus();
    }
  }, true);
  popSearch.addEventListener("input", function () {
    paintOptions();
    place();
  });
  pop.addEventListener("mousedown", function (e) {
    if (e.target !== popSearch) e.preventDefault(); // don't steal focus from the list / search
  });
  pop.addEventListener("click", function (e) {
    var b = e.target.closest(".menu__item[data-value]");
    if (b && !b.disabled) pick(b.getAttribute("data-value"));
  });
  document.addEventListener("mousedown", function (e) {
    if (sel && !pop.contains(e.target) && e.target !== sel) closeSelect();
  });
  window.addEventListener("resize", function () {
    closeSelect();
  });
  document.addEventListener("scroll", function (e) {
    if (sel && !pop.contains(e.target)) closeSelect();
  }, true);

  /* ---------- Chart ↔ table toggle ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-view-toggle] .segmented__btn");
    if (!b) return;
    var group = b.closest("[data-view-toggle]");
    var card = b.closest(".card");
    var view = b.getAttribute("data-view");
    group.querySelectorAll(".segmented__btn").forEach(function (x) {
      x.setAttribute("aria-pressed", String(x === b));
    });
    card.querySelectorAll("[data-view-panel]").forEach(function (p) {
      p.hidden = p.getAttribute("data-view-panel") !== view;
    });
    card.dispatchEvent(new CustomEvent("viewchange", { detail: view }));
  });

  /* ---------- Brand logo (theme-aware; CSS in layout/shell.css → .brand-logo) ---------- */
  ui.logoHTML = function (base) {
    var p = base + "../../public/images/logos/";
    return (
      '<img class="rb7-on-light" src="' + p + 'RB7-dark.svg" alt="RB7">' +
      '<img class="rb7-on-dark" src="' + p + 'RB7-light.svg" alt="RB7">' +
      '<img class="lp-on-light" src="' + p + 'lottoplus-light.svg" alt="Lotto Plus">' +
      '<img class="lp-on-dark" src="' + p + 'lottoplus-dark.svg" alt="Lotto Plus">'
    );
  };

  /* ---------- Show / hide password ([data-toggle-password] inside .field__control) ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-toggle-password]");
    if (!b) return;
    var input = b.closest(".field__control").querySelector("input");
    var show = input.type === "password";
    input.type = show ? "text" : "password";
    b.setAttribute("aria-pressed", String(show));
    var noun = b.getAttribute("data-toggle-password") || "password"; // data-toggle-password="key" → "Show key"
    b.setAttribute("aria-label", (show ? "Hide " : "Show ") + noun);
    b.innerHTML = '<iconify-icon icon="' + (show ? "tabler:eye-off" : "tabler:eye") + '"></iconify-icon>';
  });

  /* ---------- Mode toggle ([data-action="mode"]) ---------- */
  ui.paintModeButtons = function () {
    var dark = DS.settings.get("mode") === "dark";
    document.querySelectorAll('[data-action="mode"]').forEach(function (b) {
      b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      b.innerHTML = '<iconify-icon icon="' + (dark ? "tabler:sun" : "tabler:moon") + '"></iconify-icon>';
    });
  };
  DS.settings.on(ui.paintModeButtons);
  document.addEventListener("click", function (e) {
    if (!e.target.closest('[data-action="mode"]')) return;
    DS.settings.set("mode", DS.settings.get("mode") === "dark" ? "light" : "dark");
  });

  /* ---------- Language menu (markup + behavior) ---------- */
  ui.langMenuHTML = function () {
    return (
      '<div class="topbar__popover">' +
      '<button type="button" class="btn btn--text lang-btn" data-menu="lang-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Language">' +
      '<iconify-icon icon="tabler:language"></iconify-icon><span data-lang-label>EN</span></button>' +
      '<div class="menu" id="lang-menu" role="menu" hidden>' +
      '<button type="button" class="menu__item" role="menuitemradio" aria-checked="false" data-lang="TH">ไทย<span class="menu__trail">TH</span></button>' +
      '<button type="button" class="menu__item" role="menuitemradio" aria-checked="true" data-lang="EN">English<span class="menu__trail">EN</span></button>' +
      "</div></div>"
    );
  };
  document.addEventListener("click", function (e) {
    var lang = e.target.closest("[data-lang]");
    if (!lang) return;
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-checked", String(b === lang));
    });
    var label = document.querySelector("[data-lang-label]");
    if (label) label.textContent = lang.getAttribute("data-lang");
    closeMenu();
    ui.toast("Prototype copy is English only. The app switches i18n here.", "tabler:language");
  });

  /* ---------- Field error (.field--error + helper text + aria) ---------- */
  ui.fieldError = function (input, msg) {
    var field = input.closest(".field");
    var helper = field.querySelector(".field__helper[data-error]");
    field.classList.toggle("field--error", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg && !helper) {
      helper = document.createElement("div");
      helper.className = "field__helper";
      helper.setAttribute("data-error", "");
      helper.id = input.id + "-error";
      input.setAttribute("aria-describedby", helper.id);
      field.appendChild(helper);
    }
    if (helper) {
      helper.textContent = msg || "";
      helper.hidden = !msg;
    }
    return !msg;
  };

  /* ---------- Busy button (keeps its fill, shows a spinner) ---------- */
  ui.busy = function (btn, on, label) {
    if (on && !btn.classList.contains("is-busy")) {
      btn.setAttribute("data-idle", btn.innerHTML);
      btn.innerHTML = '<iconify-icon icon="tabler:loader-2"></iconify-icon>' + DS.fmt.esc(label || "Working…");
    } else if (!on && btn.hasAttribute("data-idle")) {
      btn.innerHTML = btn.getAttribute("data-idle");
      btn.removeAttribute("data-idle");
    }
    btn.classList.toggle("is-busy", on);
    btn.disabled = on;
  };

  /* ---------- Links to pages that aren't designed yet ([data-todo]) ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-todo]");
    if (!t) return;
    e.preventDefault();
    closeMenu();
    ui.toast("This page is not designed yet.", "tabler:hourglass");
  });

  /* ---------- Copy to clipboard ([data-copy="text"]) ---------- */
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]");
    if (!c) return;
    var text = c.getAttribute("data-copy");
    var done = function () {
      ui.toast(c.getAttribute("data-copy-label") || "Copied", "tabler:copy-check");
    };
    try {
      navigator.clipboard.writeText(text).then(done, done);
    } catch (err) {
      done();
    }
  });

  /* ---------- Tabs (.tabs [role=tab][aria-controls]) → MUI Tabs + TabPanel ---------- */
  ui.selectTab = function (tab) {
    var list = tab.closest(".tabs");
    list.querySelectorAll('[role="tab"]').forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    list.dispatchEvent(new CustomEvent("tabchange", { detail: tab.getAttribute("aria-controls"), bubbles: true }));
  };
  document.addEventListener("click", function (e) {
    var t = e.target.closest('.tabs [role="tab"]');
    if (t) ui.selectTab(t);
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target.closest && e.target.closest('.tabs [role="tab"]');
    if (!t || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    var tabs = Array.prototype.slice.call(t.closest(".tabs").querySelectorAll('[role="tab"]'));
    var n = tabs[(tabs.indexOf(t) + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    ui.selectTab(n);
    n.focus();
  });

  /* ---------- Toast ---------- */
  var toastEl, toastTimer;
  ui.toast = function (text, icon) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML =
      '<iconify-icon icon="' + (icon || "tabler:info-circle") + '"></iconify-icon><span>' + DS.fmt.esc(text) + "</span>";
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 2600);
  };
})(window.DS);
