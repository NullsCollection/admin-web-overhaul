/* ==========================================================================
   Form engine: the reusable FORM PAGE TEMPLATE (Phase 4+).
   Port: src/components/GenericForm (items config) + react-hook-form + yup.

   Markup it expects inside `root` (a <form>, see pages/provider-form.html):
     [data-form-summary]   error summary alert (hidden until a submit fails)
     [data-form-body]      section cards are rendered here
     [data-form-status]    save-bar status text ("Unsaved changes")
     [data-form-cancel]    Cancel button       [data-form-submit]  Save button

   DS.form.create({
     root,
     sections: [{
       title, description, showIf?: (values) → bool,
       columns?: 3 | 4 | 5,    // short fields in one line ≥ 900px (5 → 3, 4 → 2 per line below that)
       fields: [ FIELD ],
       tabs?: [{ id, label, fields: [ FIELD ] }],   // e.g. one tab per language (after `fields`)
     }],
     values: {…},            // initial values (edit)
     requireChanges: true,   // edit: Save stays off until something changes
     onChange(name, values, api),  // api.setValue(name, value): derived fields (config → price)
     onSubmit(values, api),  // api.done() | api.fail({ field: "server message" })
     onCancel(),
   }) → { get, set, setValue, setBusy, setErrors, skeleton(on), isDirty }

   FIELD = {
     name, label,
     type: "text" | "email" | "password" | "number" | "url" | "datetime" | "select" | "multiselect" | "switch"
         | "richtext" | "imagepick" | "html" | "custom",
     required?, placeholder?, helper?, span?: 2, disabled?, maxLength?,
     options?: [{ value, label, img?, group? }] | (values) → [...],   // a function re-runs on every change
                                     // `group` → <optgroup> headings (select), in the order given
     validate?: (value, values) → "message" | "",
     messages?: { required: "…" },
     showIf?: (values) → bool,       // hidden fields skip validation and aren't submitted
     readonlyIf?: (values) → bool,   // shown, not editable, not validated (derived values)
     render?: (values) → html,       // type "html": display-only block, re-rendered on change
     searchable?: bool,              // type "imagepick": filter box above the grid
     mount?: (el, changed) → { get(), set(v), focus()? },  // type "custom": your own widget
     hideLabel?: bool,               // type "custom": label for screen readers only (the card title says it)
   }

   Rules: required → "*"; errors show under the field + a summary with links at the top;
   first bad field gets focus (its tab is selected first); Cancel with unsaved changes asks
   before discarding. Tabs with a bad field get an error dot.
   "number" = decimal text input (inputmode="decimal", tabular figures); non-numbers → "Enter a number."
   "richtext" = small toolbar + editable area (port: src/components/TextEditor/Lexical). Empty
     means no text, even if there are tags (same as hasDescriptionContent()).
   "imagepick" = radio grid of image cards (port: src/components/FlagSelect).
   ========================================================================== */
(function (DS) {
  var esc = DS.fmt.esc;
  var ui = DS.ui;
  var URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i;
  var NUM_RE = /^-?\d+(\.\d+)?$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var VALUELESS = { html: 1 };

  var optionsOf = function (f, values) {
    return typeof f.options === "function" ? f.options(values || {}) : f.options || [];
  };
  var textOf = function (html) {
    var d = document.createElement("div");
    d.innerHTML = html || "";
    return d.textContent.trim();
  };

  function selectOptionsHTML(f, values) {
    var html = '<option value="">' + esc(f.placeholder || "Select…") + "</option>";
    var group = null;
    optionsOf(f, values).forEach(function (o) {
      if (o.group !== group) {
        if (group != null) html += "</optgroup>";
        group = o.group;
        if (group != null) html += '<optgroup label="' + esc(group) + '">';
      }
      html += '<option value="' + esc(o.value) + '">' + esc(o.label) + "</option>";
    });
    return html + (group != null ? "</optgroup>" : "");
  }

  function imageCardsHTML(f, id) {
    return optionsOf(f).map(function (o, i) {
      return (
        '<label class="imagepick__item" data-label="' + esc(o.label.toLowerCase()) + '">' +
        '<input type="radio" name="' + f.name + '" value="' + esc(o.value) + '" id="' + id + "-" + i + '">' +
        '<span class="imagepick__img"><img src="' + esc(o.img) + '" alt="" loading="lazy">' +
        '<span class="imagepick__check"><iconify-icon icon="tabler:check"></iconify-icon></span></span>' +
        '<span class="imagepick__label">' + esc(o.label) + "</span></label>"
      );
    }).join("");
  }

  function fieldHTML(f, id, values) {
    var full = f.span === 2 || f.type === "switch" || f.type === "html" ? " form-grid__full" : "";
    var req = f.required ? '<span class="req" aria-hidden="true">*</span>' : "";
    var help = f.helper && f.type !== "switch" ? '<div class="field__helper" id="' + id + '-help">' + esc(f.helper) + "</div>" : "";
    var desc = f.helper ? ' aria-describedby="' + id + '-help"' : "";
    var dis = f.disabled ? " disabled" : "";
    var open = '<div class="field' + full + '" data-field="' + f.name + '" id="' + id + '-wrap">';

    if (f.type === "html") {
      return open + '<div id="' + id + '" data-html></div></div>';
    }
    if (f.type === "custom") {
      return (
        open + '<span class="field__label' + (f.hideLabel ? " sr-only" : "") + '" id="' + id + '-label">' + esc(f.label) + req + "</span>" +
        '<div class="field__custom" id="' + id + '" tabindex="-1" role="group" aria-labelledby="' + id + '-label"' + desc + "></div>" + help + "</div>"
      );
    }
    if (f.type === "switch") {
      return (
        open + '<label class="switch"><input type="checkbox" role="switch" id="' + id + '" name="' + f.name + '"' + dis + desc +
        '><span class="switch__track"><span class="switch__thumb"></span></span><span><span class="switch__label">' + esc(f.label) +
        "</span>" + (f.helper ? '<span class="switch__helper" id="' + id + '-help">' + esc(f.helper) + "</span>" : "") +
        "</span></label></div>"
      );
    }
    if (f.type === "select") {
      return (
        open + '<label class="field__label" for="' + id + '">' + esc(f.label) + req + "</label>" +
        '<div class="field__control field__control--select"><select id="' + id + '" name="' + f.name + '"' + dis + desc +
        (f.required ? ' aria-required="true"' : "") + ">" + selectOptionsHTML(f, values) +
        '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div>' + help + "</div>"
      );
    }
    if (f.type === "multiselect") {
      return (
        open + '<span class="field__label' + (f.hideLabel ? " sr-only" : "") + '" id="' + id + '-label">' + esc(f.label) + req + "</span>" +
        '<button type="button" class="field__control multiselect multiselect--wrap" id="' + id + '" data-menu="' + id +
        '-menu" aria-haspopup="menu" aria-expanded="false" aria-labelledby="' + id + '-label"' + desc + dis +
        '><span class="multiselect__value"></span><iconify-icon class="multiselect__chevron" icon="tabler:chevron-down"></iconify-icon></button>' +
        '<div class="menu form-menu" id="' + id + '-menu" role="menu" hidden><div data-options></div></div>' + help + "</div>"
      );
    }
    if (f.type === "richtext") {
      var tool = function (cmd, icon, label) {
        return '<button type="button" class="icon-btn icon-btn--sm" data-rt="' + cmd + '" aria-label="' + label + '" title="' + label +
          '"><iconify-icon icon="tabler:' + icon + '"></iconify-icon></button>';
      };
      return (
        open.replace('class="field', 'class="field form-grid__full') +
        '<span class="field__label" id="' + id + '-label">' + esc(f.label) + req + "</span>" +
        '<div class="field__control richtext"><div class="richtext__bar" role="toolbar" aria-label="Formatting">' +
        tool("bold", "bold", "Bold") + tool("italic", "italic", "Italic") + tool("underline", "underline", "Underline") +
        '<span class="richtext__sep"></span>' + tool("insertUnorderedList", "list", "Bulleted list") +
        tool("insertOrderedList", "list-numbers", "Numbered list") + "</div>" +
        '<div class="richtext__area" id="' + id + '" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="' +
        id + '-label"' + desc + (f.required ? ' aria-required="true"' : "") +
        (f.placeholder ? ' data-placeholder="' + esc(f.placeholder) + '"' : "") + "></div></div>" + help + "</div>"
      );
    }
    if (f.type === "imagepick") {
      return (
        open.replace('class="field', 'class="field form-grid__full') +
        '<span class="field__label" id="' + id + '-label">' + esc(f.label) + req + "</span>" +
        (f.searchable
          ? '<div class="field__control imagepick__search"><iconify-icon icon="tabler:search"></iconify-icon>' +
            '<input type="search" data-imagepick-search placeholder="Search backgrounds" aria-label="Search ' + esc(f.label.toLowerCase()) + '"></div>'
          : "") +
        '<div class="imagepick" id="' + id + '" role="radiogroup" tabindex="-1" aria-labelledby="' + id + '-label"' + desc + ">" +
        imageCardsHTML(f, id) + "</div>" +
        '<p class="imagepick__none t-body2 t-muted" hidden>No backgrounds match.</p>' + help + "</div>"
      );
    }
    if (f.type === "password") {
      // Show / hide button is handled globally in core/ui.js ([data-toggle-password])
      return (
        open + '<label class="field__label" for="' + id + '">' + esc(f.label) + req + "</label>" +
        '<div class="field__control field__control--adorned"><input id="' + id + '" name="' + f.name + '" type="password" autocomplete="new-password"' +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") + (f.required ? ' aria-required="true"' : "") + dis + desc + ">" +
        '<button type="button" class="icon-btn icon-btn--sm field__adornment" data-toggle-password aria-label="Show password" aria-pressed="false">' +
        '<iconify-icon icon="tabler:eye"></iconify-icon></button></div>' + help + "</div>"
      );
    }
    var num = f.type === "number";
    var kind = f.type === "url" ? "url" : f.type === "email" ? "email" : f.type === "datetime" ? "datetime-local" : "text";
    return (
      open + '<label class="field__label" for="' + id + '">' + esc(f.label) + req + "</label>" +
      '<div class="field__control' + (num ? " field__control--number" : "") + '"><input id="' + id + '" name="' + f.name + '" type="' + kind +
      '" autocomplete="off" spellcheck="false"' + (num ? ' inputmode="decimal"' : "") +
      (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") +
      (f.maxLength ? ' maxlength="' + f.maxLength + '"' : "") + (f.required ? ' aria-required="true"' : "") + dis + desc +
      "></div>" + help + "</div>"
    );
  }

  function gridHTML(fields, uid, values) {
    return '<div class="form-grid">' + fields.map(function (f) {
      return fieldHTML(f, uid + "-" + f.name, values);
    }).join("") + "</div>";
  }

  function sectionHTML(s, uid, i, values) {
    var tabs = "";
    if (s.tabs) {
      tabs =
        '<div class="tabs form-tabs" role="tablist" aria-label="' + esc(s.title) + '">' +
        s.tabs.map(function (t, j) {
          var req = t.fields.some(function (f) {
            return f.required;
          });
          return '<button type="button" class="tabs__tab" role="tab" id="' + uid + "-tab-" + t.id + '" aria-controls="' + uid + "-panel-" + t.id +
            '" aria-selected="' + (j === 0) + '"' + (j ? ' tabindex="-1"' : "") + ">" + esc(t.label) +
            (req ? '<span class="req" aria-hidden="true">*</span>' : "") + '<span class="form-tabs__dot" hidden aria-hidden="true"></span></button>';
        }).join("") + "</div>" +
        s.tabs.map(function (t, j) {
          return '<div class="form-tabs__panel" role="tabpanel" id="' + uid + "-panel-" + t.id + '" aria-labelledby="' + uid + "-tab-" + t.id + '"' +
            (j ? " hidden" : "") + ">" + gridHTML(t.fields, uid, values) + "</div>";
        }).join("");
    }
    return (
      '<section class="card' + (s.columns ? " form-cols-" + s.columns : "") + '" data-section="' + i + '"><header class="card__header card__header--divided"><div class="card__heading"><h2 class="card__title">' +
      esc(s.title) + "</h2>" + (s.description ? '<p class="card__subheader">' + esc(s.description) + "</p>" : "") +
      '</div></header><div class="card__content">' + (s.fields && s.fields.length ? gridHTML(s.fields, uid, values) : "") + tabs +
      "</div></section>"
    );
  }

  function skeletonHTML(sections) {
    return sections
      .filter(function (s) {
        return !s.showIf;
      })
      .map(function (s) {
        var n = (s.fields || []).length + (s.tabs ? 2 : 0);
        return (
          '<section class="card"><header class="card__header card__header--divided"><div class="card__heading stack" style="gap:8px">' +
          '<span class="skeleton skeleton--text" style="--w:140px"></span><span class="skeleton skeleton--text" style="--w:260px"></span>' +
          '</div></header><div class="card__content"><div class="form-skeleton">' +
          new Array(Math.max(n, 2) + 1).join("x").split("").map(function () {
            return '<div class="stack" style="gap:8px"><span class="skeleton skeleton--text" style="--w:35%"></span><span class="skeleton skeleton--block" style="--h:40px"></span></div>';
          }).join("") +
          "</div></div></section>"
        );
      })
      .join("");
  }

  function create(o) {
    var root = o.root;
    var body = root.querySelector("[data-form-body]");
    var status = root.querySelector("[data-form-status]");
    var submit = root.querySelector("[data-form-submit]");
    var cancel = root.querySelector("[data-form-cancel]");
    var summary = root.querySelector("[data-form-summary]");
    var uid = "f" + Math.random().toString(36).slice(2, 6);
    var fields = [];
    var owner = {}; // field name → section
    var tabOf = {}; // field name → tab id
    o.sections.forEach(function (s) {
      (s.fields || []).forEach(function (f) {
        fields.push(f);
        owner[f.name] = s;
      });
      (s.tabs || []).forEach(function (t) {
        t.fields.forEach(function (f) {
          fields.push(f);
          owner[f.name] = s;
          tabOf[f.name] = t.id;
        });
      });
    });
    var inputs = fields.filter(function (f) {
      return !VALUELESS[f.type];
    });
    var ms = {};
    var custom = {}; // name → { get, set, focus } from field.mount()
    var initial = "";
    var busy = false;

    var el = function (f) {
      return document.getElementById(uid + "-" + f.name);
    };
    var wrap = function (f) {
      return document.getElementById(uid + "-" + f.name + "-wrap");
    };
    var byName = function (n) {
      return fields.filter(function (f) {
        return f.name === n;
      })[0];
    };
    var validatable = function (f) {
      return f.type !== "switch" && !VALUELESS[f.type];
    };

    function visible(f, values) {
      var s = owner[f.name];
      if (s.showIf && !s.showIf(values)) return false;
      return !f.showIf || f.showIf(values);
    }
    var readonly = function (f, values) {
      return !!(f.readonlyIf && f.readonlyIf(values));
    };

    // Re-check everything that depends on other values: visibility, read-only, option lists, html blocks
    function refreshDerived() {
      var v = get();
      o.sections.forEach(function (s, i) {
        var card = body.querySelector('[data-section="' + i + '"]');
        if (card) card.hidden = !!(s.showIf && !s.showIf(v));
      });
      fields.forEach(function (f) {
        var w = wrap(f);
        if (!w) return;
        var on = visible(f, v);
        w.hidden = !on;
        if (!on && validatable(f)) ui.fieldError(el(f), "");
        if (f.readonlyIf) {
          var ro = readonly(f, v);
          el(f).readOnly = ro;
          w.classList.toggle("field--readonly", ro);
          if (ro) ui.fieldError(el(f), "");
        }
        if (f.type === "select" && typeof f.options === "function") {
          var sel = el(f);
          var cur = sel.value;
          var html = selectOptionsHTML(f, v);
          if (sel.getAttribute("data-opts") !== html) {
            sel.innerHTML = html;
            sel.setAttribute("data-opts", html);
            sel.value = cur;
            if (sel.value !== cur) sel.value = ""; // the old choice isn't offered any more
          }
        }
        if (f.type === "html") el(f).innerHTML = f.render(v);
      });
      paintTabs();
    }

    // Values of the fields on screen (what the port would send to the API)
    function shownValues() {
      var v = get();
      var out = {};
      inputs.forEach(function (f) {
        if (visible(f, v)) out[f.name] = v[f.name];
      });
      return out;
    }

    function render() {
      body.innerHTML = o.sections.map(function (s, i) {
        return sectionHTML(s, uid, i, {});
      }).join("");
      fields.forEach(function (f) {
        if (f.type === "custom") {
          custom[f.name] = f.mount(el(f), function () {
            clearError(f);
            changed(f.name);
          });
          return;
        }
        if (f.type !== "multiselect") return;
        ms[f.name] = ui.multiselect(wrap(f), {
          options: f.options,
          selected: [],
          placeholder: f.placeholder || "Select…",
          wrap: true,
          onChange: function () {
            clearError(f);
            changed(f.name);
          },
        });
      });
    }

    function getOne(f) {
      var e = el(f);
      if (f.type === "switch") return e.checked;
      if (f.type === "multiselect") return ms[f.name].get();
      if (f.type === "custom") return custom[f.name].get();
      if (f.type === "richtext") return textOf(e.innerHTML) ? e.innerHTML.trim() : "";
      if (f.type === "imagepick") {
        var c = e.querySelector("input:checked");
        return c ? c.value : "";
      }
      return e.value.trim();
    }
    function setOne(f, val) {
      var e = el(f);
      if (f.type === "switch") e.checked = !!val;
      else if (f.type === "multiselect") ms[f.name].set(val || []);
      else if (f.type === "custom") custom[f.name].set(val);
      else if (f.type === "richtext") e.innerHTML = val || "";
      else if (f.type === "imagepick") {
        e.querySelectorAll("input").forEach(function (r) {
          r.checked = r.value === val;
        });
      } else {
        if (f.type === "select" && typeof f.options === "function") {
          // options may depend on values set in this same pass
          e.innerHTML = selectOptionsHTML(f, Object.assign(get(), setting || {}));
          e.setAttribute("data-opts", e.innerHTML);
        }
        e.value = val == null ? "" : val;
      }
    }

    function get() {
      var v = {};
      inputs.forEach(function (f) {
        v[f.name] = getOne(f);
      });
      return v;
    }

    var setting = null;
    function set(values) {
      setting = values = values || {};
      inputs.forEach(function (f) {
        setOne(f, values[f.name]);
      });
      setting = null;
      refreshDerived();
      initial = JSON.stringify(get());
      setErrors({});
      paint();
    }

    function isDirty() {
      return JSON.stringify(get()) !== initial;
    }

    function paint() {
      if (!status) return;
      var dirty = isDirty();
      status.classList.toggle("is-dirty", dirty && o.requireChanges);
      status.textContent = o.requireChanges
        ? dirty ? "Unsaved changes" : "No unsaved changes"
        : "Fields marked * are required";
      if (o.requireChanges && !busy) submit.disabled = !dirty;
    }

    function messageFor(f, v, values) {
      var empty = v === "" || v == null || (Array.isArray(v) && !v.length);
      if (f.required && empty) {
        if (f.messages && f.messages.required) return f.messages.required;
        var name = f.label.charAt(0).toLowerCase() + f.label.slice(1); // "Bet URL" → "bet URL"
        return (f.type === "select" || f.type === "multiselect" || f.type === "imagepick" ? "Pick the " : "Enter the ") + name + ".";
      }
      if (!empty && f.type === "url" && !URL_RE.test(v)) return "Enter a full URL that starts with http:// or https://";
      if (!empty && f.type === "number" && !NUM_RE.test(v)) return "Enter a number.";
      if (!empty && f.type === "email" && !EMAIL_RE.test(v)) return "Enter a full email address, like name@example.com.";
      if (f.validate) return f.validate(v, values) || "";
      return "";
    }

    function clearError(f) {
      if (!validatable(f)) return;
      ui.fieldError(el(f), "");
      refreshSummary();
      paintTabs();
    }

    var lastErrors = {};
    function setErrors(errs) {
      lastErrors = errs || {};
      fields.forEach(function (f) {
        if (validatable(f)) ui.fieldError(el(f), lastErrors[f.name] || "");
      });
      refreshSummary(true);
      paintTabs();
    }

    var isBad = function (f) {
      return validatable(f) && !wrap(f).hidden && el(f).getAttribute("aria-invalid") === "true";
    };

    // Error dot on a tab that holds a bad field
    function paintTabs() {
      o.sections.forEach(function (s) {
        (s.tabs || []).forEach(function (t) {
          var tab = document.getElementById(uid + "-tab-" + t.id);
          if (!tab) return;
          tab.querySelector(".form-tabs__dot").hidden = !t.fields.some(isBad);
        });
      });
    }

    function refreshSummary(rebuild) {
      if (!summary) return;
      var bad = fields.filter(isBad);
      if (!bad.length) {
        summary.hidden = true;
        return;
      }
      if (!rebuild && summary.hidden) return;
      summary.hidden = false;
      summary.querySelector(".alert__title").textContent =
        bad.length === 1 ? "1 field needs your attention" : bad.length + " fields need your attention";
      summary.querySelector("ul").innerHTML = bad
        .map(function (f) {
          var tab = tabOf[f.name] ? owner[f.name].tabs.filter(function (t) {
            return t.id === tabOf[f.name];
          })[0] : null;
          var label = tab && f.label.indexOf(tab.label) < 0 ? tab.label + " " + f.label.toLowerCase() : f.label;
          return '<li><a href="#' + uid + "-" + f.name + '" data-jump="' + f.name + '">' + esc(label) + "</a>: " +
            esc(lastErrors[f.name] || messageFor(f, get()[f.name], get())) + "</li>";
        })
        .join("");
    }

    function focusField(f) {
      if (tabOf[f.name]) ui.selectTab(document.getElementById(uid + "-tab-" + tabOf[f.name]));
      var e = el(f);
      wrap(f).scrollIntoView({ block: "center", behavior: "smooth" });
      if (f.type === "imagepick") e = e.querySelector("input:checked") || e.querySelector("input");
      if (f.type === "custom" && custom[f.name].focus) return custom[f.name].focus();
      e.focus({ preventScroll: true });
    }

    function setBusy(on) {
      busy = on;
      ui.busy(submit, on, "Saving…");
      body.querySelectorAll("input, select, button").forEach(function (x) {
        if (x.getAttribute("role") === "tab") return;
        if (on) {
          x.setAttribute("data-was-disabled", x.disabled ? "1" : "");
          x.disabled = true;
        } else if (x.hasAttribute("data-was-disabled")) {
          x.disabled = x.getAttribute("data-was-disabled") === "1";
          x.removeAttribute("data-was-disabled");
        }
      });
      body.querySelectorAll("[contenteditable]").forEach(function (x) {
        x.setAttribute("contenteditable", on ? "false" : "true");
      });
      if (cancel) cancel.disabled = on;
      if (!on) paint();
    }

    var api = {
      setValue: function (name, value) {
        setOne(byName(name), value);
      },
    };
    function changed(name) {
      if (o.onChange && name) o.onChange(name, get(), api);
      refreshDerived();
      refreshSummary();
      paint();
    }

    /* ---------- events ---------- */
    var fieldOf = function (target) {
      var w = target.closest("[data-field]");
      return w ? byName(w.getAttribute("data-field")) : null;
    };
    body.addEventListener("input", function (e) {
      if (e.target.hasAttribute("data-imagepick-search")) {
        var q = e.target.value.trim().toLowerCase();
        var w = e.target.closest(".field");
        var any = false;
        w.querySelectorAll(".imagepick__item").forEach(function (it) {
          var on = !q || it.getAttribute("data-label").indexOf(q) > -1;
          it.hidden = !on;
          any = any || on;
        });
        w.querySelector(".imagepick__none").hidden = any;
        return;
      }
      var f = fieldOf(e.target);
      if (f && wrap(f).classList.contains("field--error")) clearError(f);
      if (f && (f.type === "richtext" || f.type === "text" || f.type === "number")) {
        if (o.onChange) o.onChange(f.name, get(), api);
      }
      paint();
    });
    body.addEventListener("change", function (e) {
      if (e.target.hasAttribute("data-imagepick-search")) return;
      var f = fieldOf(e.target);
      if (f && wrap(f).classList.contains("field--error")) clearError(f);
      changed(f && f.name);
    });
    // Rich text toolbar (execCommand is enough for a prototype; the app uses Lexical)
    body.addEventListener("mousedown", function (e) {
      if (e.target.closest("[data-rt]")) e.preventDefault(); // keep the selection in the editor
    });
    body.addEventListener("click", function (e) {
      var b = e.target.closest("[data-rt]");
      if (!b || busy) return;
      var area = b.closest(".richtext").querySelector(".richtext__area");
      area.focus();
      document.execCommand(b.getAttribute("data-rt"));
      area.dispatchEvent(new Event("input", { bubbles: true }));
    });
    if (summary) {
      summary.addEventListener("click", function (e) {
        var j = e.target.closest("[data-jump]");
        if (!j) return;
        e.preventDefault();
        focusField(byName(j.getAttribute("data-jump")));
      });
    }

    root.addEventListener("submit", function (e) {
      e.preventDefault();
      var values = get();
      var errs = {};
      inputs.forEach(function (f) {
        if (!visible(f, values) || readonly(f, values)) return;
        var m = messageFor(f, values[f.name], values);
        if (m) errs[f.name] = m;
      });
      setErrors(errs);
      var first = fields.filter(function (f) {
        return errs[f.name];
      })[0];
      if (first) {
        summary.scrollIntoView({ block: "start", behavior: "smooth" });
        focusField(first);
        return;
      }
      setBusy(true);
      o.onSubmit(shownValues(), {
        done: function () {
          setBusy(false);
          initial = JSON.stringify(get());
          paint();
        },
        fail: function (serverErrs) {
          setBusy(false);
          setErrors(serverErrs);
          var f = fields.filter(function (x) {
            return serverErrs[x.name];
          })[0];
          if (f) focusField(f);
        },
      });
    });

    if (cancel) {
      cancel.addEventListener("click", function () {
        if (!isDirty()) return o.onCancel();
        DS.dialog.open({
          icon: "tabler:alert-triangle",
          tone: "warning",
          title: "Discard unsaved changes?",
          html: "Your edits haven't been saved and will be lost.",
          actions: [
            { label: "Keep editing", variant: "outlined", autofocus: true },
            {
              label: "Discard changes",
              variant: "contained",
              tone: "error",
              onClick: function (b, close) {
                close();
                o.onCancel();
              },
            },
          ],
        });
      });
    }

    render();
    set(o.values);

    return {
      get: get,
      set: set,
      setValue: function (name, value) {
        api.setValue(name, value);
        changed(name);
      },
      setBusy: setBusy,
      setErrors: setErrors,
      isDirty: isDirty,
      focusField: function (name) {
        focusField(byName(name));
      },
      skeleton: function (on) {
        if (on) {
          body.innerHTML = skeletonHTML(o.sections);
          submit.disabled = true;
          if (cancel) cancel.disabled = true;
          if (status) status.textContent = "Loading…";
        } else {
          render();
          refreshDerived();
          if (cancel) cancel.disabled = false;
          submit.disabled = false;
        }
      },
    };
  }

  DS.form = { create: create };
})(window.DS);
