/* ==========================================================================
   User group new / edit (Phase 11c) on the FORM TEMPLATE + a permission grid (custom field).
   Source: views/pages/user-group/UserGroupForm.tsx
     yup: name req; description optional; permissions: number[] from ONE Autocomplete (multiple) of up
       to 500 permissions by name ("Lotto Game update"…), server search after a 1.5s delay
     success: toast "User Group created / updated successfully" → /user-groups; Cancel: reset()
   Changes: permissions as a grid: one row per area (grouped like the sidebar), columns Read / Create /
   Update / Delete, extras (Custom price, Limit numbers…) in a last column; a filter box, "Select
   all", "Clear all", per-section "All"; a live "34 of 80" count. Read comes on with any other box in
   its row, and turning Read off clears the row (proposal: an update you can't see is useless).
   Cancel goes back. The API still gets a flat list of permission ids.
   ========================================================================== */
(function (DS) {
  var M = DS.mock;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var id = DS.params.get("id");
  var record = id ? M.userGroup(id) : null;
  var isEdit = !!record;
  var VERBS = ["read", "create", "update", "delete"];
  var TOTAL = M.permissions.length;

  /* ---------- Permission grid (custom field) ---------- */
  function mountGrid(el, changed) {
    var picked = {};
    var q = "";
    function idsOf(area) {
      return VERBS.map(function (v) {
        return area.cells[v];
      }).filter(Boolean).concat(area.extras.map(function (x) {
        return x.id;
      }));
    }
    function box(pid, label) {
      if (!pid) return '<span class="t-faint" aria-hidden="true">–</span>';
      return '<label class="checkbox perm-grid__box"><input type="checkbox" data-perm="' + pid + '"' + (picked[pid] ? " checked" : "") +
        ' aria-label="' + esc(label) + '"><span class="check"><iconify-icon icon="tabler:check"></iconify-icon></span></label>';
    }
    function render() {
      var shown = M.permissionAreas.filter(function (a) {
        return !q || (a.section + " " + a.label + " " + a.extras.map(function (x) {
          return x.label;
        }).join(" ")).toLowerCase().indexOf(q) > -1;
      });
      var sections = [];
      shown.forEach(function (a) {
        if (sections.indexOf(a.section) < 0) sections.push(a.section);
      });
      var n = Object.keys(picked).length;
      el.innerHTML =
        '<div class="perm-tools"><div class="field__control perm-tools__search"><iconify-icon icon="tabler:search"></iconify-icon>' +
        '<input type="search" id="perm-q" placeholder="Filter areas, like games or users" aria-label="Filter permission areas" value="' + esc(q) + '"></div>' +
        '<span class="perm-tools__count" aria-live="polite"><strong>' + fmt.int(n) + "</strong> of " + TOTAL + " picked</span>" +
        '<button type="button" class="btn btn--text btn--sm" data-all="on">Select all</button><button type="button" class="btn btn--text btn--sm" data-all="off">Clear all</button></div>' +
        (shown.length
          ? '<div class="table-wrap"><table class="table perm-grid"><thead><tr><th scope="col">Area</th>' + VERBS.map(function (v) {
              return '<th scope="col" class="perm-grid__col">' + v.charAt(0).toUpperCase() + v.slice(1) + "</th>";
            }).join("") + '<th scope="col">More</th></tr></thead>' +
            sections.map(function (sec) {
              var areas = shown.filter(function (a) {
                return a.section === sec;
              });
              var ids = [].concat.apply([], areas.map(idsOf));
              var on = ids.filter(function (x) {
                return picked[x];
              }).length;
              return '<tbody><tr class="perm-grid__section"><th scope="rowgroup" colspan="6"><span>' + esc(sec) + '</span><span class="t-muted t-body2">' + on + " of " + ids.length +
                '</span><button type="button" class="btn btn--text btn--sm" data-section="' + esc(sec) + '">' + (on === ids.length ? "Clear" : "All") + "</button></th></tr>" +
                areas.map(function (a) {
                  return '<tr><th scope="row">' + esc(a.label) + "</th>" + VERBS.map(function (v) {
                    return '<td class="perm-grid__col">' + box(a.cells[v], a.label + ": " + v) + "</td>";
                  }).join("") + '<td class="perm-grid__more"><div class="perm-grid__extras">' + a.extras.map(function (x) {
                    return '<label class="checkbox"><input type="checkbox" data-perm="' + x.id + '"' + (picked[x.id] ? " checked" : "") + '><span class="check">' +
                      '<iconify-icon icon="tabler:check"></iconify-icon></span>' + esc(x.label) + "</label>";
                  }).join("") + "</div></td></tr>";
                }).join("") + "</tbody>";
            }).join("") + "</table></div>"
          : '<p class="t-body2 t-muted perm-tools__none">No area matches “' + esc(q) + '”.</p>');
    }
    function areaOf(pid) {
      return M.permissionAreas.filter(function (a) {
        return idsOf(a).indexOf(pid) > -1;
      })[0];
    }
    el.addEventListener("input", function (e) {
      if (e.target.id !== "perm-q") return;
      q = e.target.value.trim().toLowerCase();
      var pos = e.target.selectionStart;
      render();
      var inp = $("perm-q");
      inp.focus();
      inp.setSelectionRange(pos, pos);
    });
    el.addEventListener("change", function (e) {
      var pid = Number(e.target.getAttribute("data-perm"));
      if (!pid) return;
      var a = areaOf(pid);
      if (e.target.checked) {
        picked[pid] = 1;
        if (a.cells.read && pid !== a.cells.read) picked[a.cells.read] = 1; // read comes with the rest of the row
      } else {
        delete picked[pid];
        if (pid === a.cells.read) idsOf(a).forEach(function (x) {
          delete picked[x];
        });
      }
      render();
      var again = el.querySelector('[data-perm="' + pid + '"]');
      if (again) again.focus();
      changed();
    });
    el.addEventListener("click", function (e) {
      var all = e.target.closest("[data-all]");
      var sec = e.target.closest("[data-section]");
      if (all) {
        if (all.getAttribute("data-all") === "on") M.permissions.forEach(function (p) {
          picked[p.id] = 1;
        });
        else picked = {};
      }
      if (sec) {
        var ids = [].concat.apply([], M.permissionAreas.filter(function (a) {
          return a.section === sec.getAttribute("data-section");
        }).map(idsOf));
        var full = ids.every(function (x) {
          return picked[x];
        });
        ids.forEach(function (x) {
          if (full) delete picked[x];
          else picked[x] = 1;
        });
      }
      if (all || sec) {
        render();
        changed();
      }
    });
    render();
    return {
      get: function () {
        return Object.keys(picked).map(Number).sort(function (a, b) {
          return a - b;
        });
      },
      set: function (ids) {
        picked = {};
        (ids || []).forEach(function (x) {
          picked[x] = 1;
        });
        render();
      },
      focus: function () {
        $("perm-q").focus();
      },
    };
  }

  var sections = [
    {
      title: "Details",
      fields: [
        { name: "name", label: "Group name", type: "text", required: true, placeholder: "e.g. nightShiftSupport", messages: { required: "Enter a group name." } },
        { name: "description", label: "Description", type: "text", placeholder: "What the group is for" },
      ],
    },
    {
      title: "Permissions",
      description: "Pick what this group can do. Read comes on with any other box in its row.",
      fields: [
        { name: "permissions", label: "Permissions", type: "custom", span: 2, hideLabel: true, mount: mountGrid,
          validate: function (v) {
            return v && v.length ? "" : "Pick at least one permission.";
          } },
      ],
    },
  ];

  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    $("form-title").textContent = "Edit user group";
    $("form-sub").textContent = record.name + ", ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Admin", "User groups", isEdit ? "Edit" : "New"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  var toForm = function (g) {
    return { name: g.name, description: g.description || "", permissions: g.permissions.slice() };
  };
  var DEFAULTS = { name: "", description: "", permissions: [] };
  var form = DS.form.create({
    root: $("ug-form"),
    sections: sections,
    values: isEdit ? toForm(record) : DEFAULTS,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "user-groups.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        if (M.userGroups.some(function (g) {
          return g.name.toLowerCase() === String(values.name).toLowerCase() && (!isEdit || g.id !== record.id);
        })) {
          return api.fail({ name: "This name is already used by another group." }); // mock 422
        }
        console.log("[prototype] payload", { name: values.name, description: values.description, permissions: values.permissions });
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "User group created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "user-groups.html";
        }, 1200);
      }, 800);
    },
  });

  var states = isEdit ? ["default", "loading", "dirty", "errors", "saving"] : ["default", "filled", "errors", "saving", "server-error"];
  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : DEFAULTS);
    var filled = { name: "nightShiftSupport", description: "tickets and players, read only",
      permissions: M.permissions.filter(function (p) {
        return /^(lotto\.bet_ticket|provider\.player)/.test(p.slug);
      }).map(function (p) {
        return p.id;
      }) };
    if (s === "filled") form.set(filled);
    if (s === "dirty") {
      var box = document.querySelector("#ug-form [data-perm]:not(:checked)");
      if (box) box.click(); // a real change, so the save bar says "Unsaved changes"
    }
    if (s === "errors") {
      form.set({ name: "", description: "", permissions: [] });
      $("ug-form").requestSubmit();
    }
    if (s === "saving") {
      form.set(isEdit ? Object.assign(toForm(record), { description: "Updated" }) : filled);
      form.setBusy(true);
    }
    if (s === "server-error") {
      form.set(Object.assign({}, filled, { name: "operator" }));
      form.setErrors({ name: "This name is already used by another group." });
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
