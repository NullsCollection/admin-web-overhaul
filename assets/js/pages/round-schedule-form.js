/* ==========================================================================
   Round schedule new / edit (Phase 8a) on the FORM TEMPLATE (core/form.js).
   Source: src/views/pages/lotto/round-schedule/RoundScheduleForm.tsx
     yup: name req · game req (autocomplete) · upFrontRound req · cronExpression (react-js-cron,
       default "* * * * *") · closeInHours req · closeInMinutes req · isEnable switch
     excludeDatetimes: repeater of { dayOfWeek, useTime, time (HH:mm, 10-min steps) }; Add copies
       the last row, or Sunday 09:00
     Cancel = reset() (stays on the page) · success: toast + router.push("/lotto/round-schedules")
   Changes: a simpler builder (Daily / Weekly / Monthly + Cron for anything else) with the
   schedule in words and the next 5 runs, which skip the exclusions; exclusion rows with a
   remove icon; Cancel goes back (and asks if there are changes), like every other form.
   ========================================================================== */
(function (DS) {
  var L = DS.lotto;
  var M = DS.mock;
  var C = DS.cron;
  var fmt = DS.fmt;
  var esc = fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var pad = function (n) {
    return String(n).padStart(2, "0");
  };

  var id = DS.params.get("id");
  var record = id ? M.roundSchedule(id) : null;
  var isEdit = !!record;

  /* ---------- Schedule builder (replaces react-js-cron) ---------- */
  function scheduleWidget(el, changed) {
    var st = C.toBuilder("0 15 * * *");
    var MODES = [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["cron", "Cron"]];
    function render() {
      el.innerHTML =
        '<div class="sched-builder">' +
        '<div class="segmented" role="radiogroup" aria-label="Repeat">' +
        MODES.map(function (m) {
          return '<button type="button" class="segmented__btn" role="radio" aria-checked="' + (st.mode === m[0]) + '" aria-pressed="' +
            (st.mode === m[0]) + '" data-mode="' + m[0] + '">' + m[1] + "</button>";
        }).join("") + "</div>" +
        (st.mode === "weekly"
          ? '<div class="sched-builder__row"><span class="sched-builder__label">On</span><div class="toggle-set" role="group" aria-label="Days of the week">' +
            C.DAYS_SHORT.map(function (d, i) {
              return '<button type="button" class="toggle" data-day="' + i + '" aria-pressed="' + (st.days.indexOf(i) > -1) + '" aria-label="' + C.DAYS[i] + '">' + d + "</button>";
            }).join("") + "</div></div>"
          : "") +
        (st.mode === "monthly"
          ? '<div class="sched-builder__row"><span class="sched-builder__label">On day</span><div class="toggle-set toggle-set--dates" role="group" aria-label="Days of the month">' +
            Array.apply(null, Array(31)).map(function (x, i) {
              var d = i + 1;
              return '<button type="button" class="toggle" data-date="' + d + '" aria-pressed="' + (st.dates.indexOf(d) > -1) + '">' + d + "</button>";
            }).join("") + "</div></div>"
          : "") +
        (st.mode !== "cron"
          ? '<div class="sched-builder__row"><label class="sched-builder__label" for="sched-time">At</label>' +
            '<div class="field__control sched-builder__time"><input type="time" id="sched-time" value="' + esc(st.time) + '" step="60"></div></div>'
          : '<div class="sched-builder__row sched-builder__row--cron"><label class="sched-builder__label" for="sched-cron">Cron</label>' +
            '<div class="field__control"><input id="sched-cron" class="sched-builder__cron" value="' + esc(st.cron) + '" spellcheck="false" autocomplete="off" placeholder="0 15 1,16 * *"></div>' +
            '<span class="sched-builder__hint">minute · hour · day of month · month · day of week</span></div>') +
        "</div>";
    }
    el.addEventListener("click", function (e) {
      var m = e.target.closest("[data-mode]");
      var d = e.target.closest("[data-day]");
      var t = e.target.closest("[data-date]");
      if (m) {
        var next = m.getAttribute("data-mode");
        if (next === "cron") st.cron = C.fromBuilder(st);
        else if (st.mode === "cron") {
          var b = C.toBuilder(st.cron);
          st.time = b.time;
          st.days = b.days;
          st.dates = b.dates;
        }
        st.mode = next;
        render();
        el.querySelector('[data-mode="' + next + '"]').focus();
        return changed();
      }
      if (d || t) {
        var key = d ? "days" : "dates";
        var v = Number((d || t).getAttribute(d ? "data-day" : "data-date"));
        var i = st[key].indexOf(v);
        if (i > -1) st[key].splice(i, 1);
        else st[key].push(v);
        (d || t).setAttribute("aria-pressed", String(i < 0));
        changed();
      }
    });
    el.addEventListener("input", function (e) {
      if (e.target.id === "sched-time") st.time = e.target.value;
      if (e.target.id === "sched-cron") st.cron = e.target.value;
      changed(); // live preview
    });
    el.addEventListener("change", function () {
      changed();
    });
    return {
      get: function () {
        if ((st.mode === "weekly" && !st.days.length) || (st.mode === "monthly" && !st.dates.length)) return "";
        return C.fromBuilder(st);
      },
      set: function (v) {
        st = C.toBuilder(v || "0 15 * * *");
        render();
      },
      focus: function () {
        var f = el.querySelector('[aria-checked="true"]');
        if (f) f.focus();
      },
      mode: function () {
        return st.mode;
      },
    };
  }

  /* ---------- Exclusions (excludeDatetimes repeater) ---------- */
  function excludeWidget(el, changed) {
    var rows = [];
    function render(focusIndex) {
      el.innerHTML =
        (rows.length
          ? '<ul class="exclude-list">' +
            rows.map(function (r, i) {
              return (
                '<li class="exclude-row" data-i="' + i + '">' +
                '<div class="field__control field__control--select"><select data-k="dayOfWeek" aria-label="Day ' + (i + 1) + '">' +
                C.DAYS.map(function (d, n) {
                  return '<option value="' + n + '"' + (Number(r.dayOfWeek) === n ? " selected" : "") + ">" + d + "</option>";
                }).join("") +
                '</select><iconify-icon icon="tabler:chevron-down"></iconify-icon></div>' +
                '<label class="checkbox"><input type="checkbox" data-k="useTime"' + (r.useTime ? " checked" : "") +
                '><span class="check"><iconify-icon icon="tabler:check"></iconify-icon></span>Only at</label>' +
                '<div class="field__control exclude-row__time"><input type="time" data-k="time" value="' + esc(r.time || "") + '" aria-label="Time ' + (i + 1) + '"' +
                (r.useTime ? "" : " disabled") + "></div>" +
                '<span class="exclude-row__note">' + (r.useTime ? "" : "All day") + "</span>" +
                '<button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-remove="' + i + '" aria-label="Remove exclusion ' + (i + 1) +
                '" title="Remove"><iconify-icon icon="tabler:x"></iconify-icon></button></li>'
              );
            }).join("") + "</ul>"
          : '<p class="exclude-empty">No exclusions. Rounds run on every scheduled day.</p>') +
        '<button type="button" class="btn btn--text btn--sm" data-add><iconify-icon icon="tabler:plus"></iconify-icon>Add exclusion</button>';
      if (focusIndex != null) {
        var f = el.querySelector('[data-i="' + focusIndex + '"] select') || el.querySelector("[data-add]");
        if (f) f.focus();
      }
    }
    el.addEventListener("click", function (e) {
      if (e.target.closest("[data-add]")) {
        // same as the app: copy the last row, or Sunday 09:00
        var last = rows[rows.length - 1];
        rows.push(last ? Object.assign({}, last) : { dayOfWeek: 0, useTime: true, time: "09:00" });
        render(rows.length - 1);
        return changed();
      }
      var rm = e.target.closest("[data-remove]");
      if (rm) {
        var i = Number(rm.getAttribute("data-remove"));
        rows.splice(i, 1);
        render(Math.min(i, rows.length - 1) < 0 ? null : Math.min(i, rows.length - 1));
        changed();
      }
    });
    el.addEventListener("change", function (e) {
      var li = e.target.closest("[data-i]");
      if (!li) return;
      var r = rows[Number(li.getAttribute("data-i"))];
      var k = e.target.getAttribute("data-k");
      r[k] = k === "useTime" ? e.target.checked : k === "dayOfWeek" ? Number(e.target.value) : e.target.value;
      if (k === "useTime") render(null);
      changed();
    });
    return {
      get: function () {
        return rows.map(function (r) {
          return { dayOfWeek: Number(r.dayOfWeek), useTime: !!r.useTime, time: r.useTime ? r.time : "" };
        });
      },
      set: function (v) {
        rows = (v || []).map(function (r) {
          return Object.assign({}, r);
        });
        render(null);
      },
    };
  }

  function previewHTML(v) {
    if (!v.cronExpression || !C.valid(v.cronExpression)) {
      return '<div class="sched-preview sched-preview--empty">' + (v.cronExpression ? "Fix the schedule to see the next runs." : "Pick when rounds run to see the next runs.") + "</div>";
    }
    var n = C.next(v.cronExpression, fmt.now, 5, v.excludeDatetimes);
    return (
      '<div class="sched-preview"><div class="sched-preview__head"><iconify-icon icon="tabler:calendar-repeat"></iconify-icon>' +
      '<span class="t-subtitle2">' + esc(C.describe(v.cronExpression)) + "</span></div>" +
      '<ol class="sched-preview__runs">' +
      n.runs.map(function (t) {
        var d = new Date(t);
        return "<li><span>" + C.DAYS_SHORT[d.getDay()] + "</span>" + fmt.dateTime(t) + "</li>";
      }).join("") + "</ol>" +
      (n.skipped ? '<div class="sched-preview__foot">' + n.skipped + (n.skipped === 1 ? " run" : " runs") + " skipped by exclusions before these.</div>" : "") +
      "</div>"
    );
  }

  /* ---------- Sections ---------- */
  var sections = [
    {
      title: "Details",
      fields: [
        { name: "name", label: "Round name", type: "text", required: true, placeholder: "e.g. Hanoi VIP daily",
          messages: { required: "Enter a round name." } },
        { name: "lottoGameId", label: "Game", type: "select", required: true, placeholder: "Select a game",
          options: M.games.map(function (g) {
            return { value: String(g.id), label: L.name(g.translations) };
          }),
          messages: { required: "Pick a game." } },
        { name: "closeInHours", label: "Close in hours", type: "number", required: true, placeholder: "00",
          messages: { required: "Enter the hours." } },
        { name: "closeInMinutes", label: "Close in minutes", type: "number", required: true, placeholder: "00",
          messages: { required: "Enter the minutes." },
          validate: function (v) {
            return Number(v) > 59 ? "Use 0 to 59 minutes." : "";
          } },
        { name: "upFrontRound", label: "Up front rounds", type: "number", required: true, placeholder: "0",
          messages: { required: "Enter the number of up front rounds." } },
        { name: "isEnable", label: "Enabled", type: "switch" },
      ],
    },
    {
      title: "Schedule",
      description: "When this game's rounds run. The preview uses the exclusions below.",
      fields: [
        { name: "cronExpression", label: "Repeat", type: "custom", span: 2, required: true, mount: scheduleWidget,
          messages: { required: "Pick at least one day." },
          validate: function (v) {
            return C.valid(v) ? "" : "Enter a valid cron: 5 parts, like 0 15 1,16 * *.";
          } },
        { name: "preview", label: "Next runs", type: "html", render: previewHTML },
        { name: "excludeDatetimes", label: "Exclusions", type: "custom", span: 2, mount: excludeWidget,
          helper: "Skip runs on these days, or only at a set time on them." },
      ],
    },
  ];

  function toForm(r) {
    return {
      name: r.name,
      lottoGameId: String(r.lottoGameId),
      upFrontRound: String(r.upFrontRound),
      closeInHours: r.closeInHours,
      closeInMinutes: r.closeInMinutes,
      isEnable: r.isEnable === "yes",
      cronExpression: r.cronExpression,
      excludeDatetimes: r.excludeDatetimes,
    };
  }

  /* ---------- Header ---------- */
  if (isEdit) {
    document.title = "Edit " + record.name + " | Admin prototype";
    $("form-title").textContent = "Edit schedule";
    $("form-sub").textContent = record.name + ", ID " + record.id;
    $("form-submit").textContent = "Save changes";
  }
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) {
    var parts = ["Lotto", "Lotto setup", "Round schedules", isEdit ? "Edit schedule" : "New schedule"];
    crumbs.innerHTML = parts.map(function (c, i) {
      var end = i === parts.length - 1;
      return (end ? '<span aria-current="page">' : "<span>") + esc(c) + "</span>" +
        (end ? "" : '<iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon>');
    }).join("");
  }

  /* ---------- Form ---------- */
  var defaults = { isEnable: false, cronExpression: "0 15 * * *", excludeDatetimes: [], upFrontRound: "1", closeInHours: "", closeInMinutes: "" };
  var form = DS.form.create({
    root: $("schedule-form"),
    sections: sections,
    values: isEdit ? toForm(record) : defaults,
    requireChanges: isEdit,
    onCancel: function () {
      location.href = "round-schedules.html";
    },
    onSubmit: function (values, api) {
      setTimeout(function () {
        console.log("[prototype] payload", {
          name: values.name, lottoGameId: Number(values.lottoGameId), upFrontRound: Number(values.upFrontRound),
          cronExpression: values.cronExpression, closeInHours: values.closeInHours, closeInMinutes: values.closeInMinutes,
          isEnable: values.isEnable ? "yes" : "no", excludeDatetimes: values.excludeDatetimes,
        });
        api.done();
        DS.ui.toast(isEdit ? "Changes saved" : "Schedule created", "tabler:circle-check");
        setTimeout(function () {
          location.href = "round-schedules.html";
        }, 1200);
      }, 900);
    },
  });

  /* ---------- Prototype states ---------- */
  var filled = {
    name: "Hanoi extra daily", lottoGameId: "309", upFrontRound: "5", closeInHours: "18", closeInMinutes: "0", isEnable: true,
    cronExpression: "30 9 * * 1-5", excludeDatetimes: [{ dayOfWeek: 3, useTime: true, time: "09:30" }],
  };
  var states = isEdit
    ? ["default", "loading", "dirty", "errors", "saving"]
    : ["default", "filled", "monthly", "cron", "errors", "saving"];
  function setState(s) {
    DS.dialog.close();
    form.skeleton(s === "loading");
    if (s === "loading") return;
    form.setBusy(false);
    form.set(isEdit ? toForm(record) : defaults);
    var f = $("schedule-form");
    if (s === "filled") form.set(filled);
    if (s === "monthly") form.set(Object.assign({}, filled, { cronExpression: "0 15 1,16 * *", excludeDatetimes: [] }));
    if (s === "cron") form.set(Object.assign({}, filled, { cronExpression: "0,30 16 * * 1-5" }));
    if (s === "dirty") form.setValue("excludeDatetimes", record.excludeDatetimes.concat([{ dayOfWeek: 0, useTime: false, time: "" }]));
    if (s === "errors") {
      if (isEdit) form.set(Object.assign(toForm(record), { name: "", cronExpression: "0 25 * * *" }));
      f.requestSubmit();
    }
    if (s === "saving") {
      if (!isEdit) form.set(filled);
      else form.setValue("closeInMinutes", "15");
      form.setBusy(true);
    }
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "default";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
