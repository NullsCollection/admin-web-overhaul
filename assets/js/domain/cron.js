/* ==========================================================================
   Cron helpers for round schedules (Phase 8a): parse, describe in words, next run times.
   5 fields: minute hour day-of-month month day-of-week (0 or 7 = Sunday). Each field takes
   a star, a star with a step ("every n"), ranges "a-b" (with an optional step), and lists
   "a,b,c". Like standard cron, when both day fields are set a day matches if EITHER matches.
   Port: the app uses react-js-cron (builder only). There's no describe / preview there; if we
   keep these, use `cronstrue` for words and `cron-parser` for next runs.
   ========================================================================== */
(function (DS) {
  var C = (DS.cron = {});
  var RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
  C.DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  C.DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var pad = function (n) {
    return String(n).padStart(2, "0");
  };

  // "1-5,10" → [1,2,3,4,5,10]; returns null when the text isn't valid for that field
  function field(text, i) {
    var lo = RANGES[i][0];
    var hi = RANGES[i][1];
    var out = {};
    var ok = String(text).split(",").every(function (part) {
      var m = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part.trim());
      if (!m) return false;
      var step = m[2] ? Number(m[2]) : 1;
      if (!step) return false;
      var a = lo;
      var b = hi;
      if (m[1] !== "*") {
        var r = m[1].split("-").map(Number);
        a = r[0];
        b = r.length > 1 ? r[1] : m[2] ? hi : r[0];
      }
      if (i === 4) {
        // 7 = Sunday too
        if (a === 7 && b === 7) a = b = 0;
        else if (b === 7) {
          b = 6;
          out[0] = true;
        }
      }
      if (a < lo || b > hi || a > b) return false;
      for (var v = a; v <= b; v += step) out[v] = true;
      return true;
    });
    return ok ? Object.keys(out).map(Number).sort(function (x, y) {
      return x - y;
    }) : null;
  }

  C.parse = function (expr) {
    var parts = String(expr || "").trim().split(/\s+/);
    if (parts.length !== 5) return null;
    var f = parts.map(field);
    if (f.some(function (x) {
      return !x || !x.length;
    })) return null;
    return {
      minutes: f[0], hours: f[1], dom: f[2], months: f[3], dow: f[4],
      domAll: parts[2] === "*", dowAll: parts[4] === "*", monthAll: parts[3] === "*",
      raw: parts,
    };
  };
  C.valid = function (expr) {
    return !!C.parse(expr);
  };

  function list(words) {
    return words.length <= 2 ? words.join(" and ") : words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
  }
  function daysText(dow) {
    var s = dow.join(",");
    if (s === "1,2,3,4,5") return "Every weekday";
    if (s === "0,6") return "Every weekend";
    if (dow.length === 7) return "Every day";
    var run = dow.length >= 3 && dow[dow.length - 1] - dow[0] === dow.length - 1; // e.g. 2,3,4,5,6
    if (run) return "Every " + C.DAYS[dow[0]] + " to " + C.DAYS[dow[dow.length - 1]];
    return "Every " + list(dow.map(function (d) {
      return C.DAYS[d];
    }));
  }

  /* "Every weekday at 09:30", "Day 1 and 16 of every month at 15:00", "Every 15 minutes" */
  C.describe = function (expr) {
    var p = C.parse(expr);
    if (!p) return "Not a valid schedule";
    var r = p.raw;
    var stepMin = /^\*\/(\d+)$/.exec(r[0]);
    var times;
    if (stepMin && r[1] === "*") times = "every " + stepMin[1] + " minutes";
    else if (p.minutes.length * p.hours.length <= 4) {
      var t = [];
      p.hours.forEach(function (h) {
        p.minutes.forEach(function (m) {
          t.push(pad(h) + ":" + pad(m));
        });
      });
      times = "at " + list(t);
    } else times = p.minutes.length * p.hours.length + " times a day";

    var days;
    if (p.domAll && p.dowAll) days = "Every day";
    else if (p.domAll) days = daysText(p.dow);
    else if (p.dowAll) days = "Day " + list(p.dom.map(String)) + " of every month";
    else days = "Day " + list(p.dom.map(String)) + " of the month, or " + daysText(p.dow).toLowerCase();
    var months = p.monthAll ? "" : ", in " + list(p.months.map(function (m) {
      return MONTHS[m - 1];
    }));
    if (stepMin && r[1] === "*") return (days === "Every day" ? "" : days + ", ") + (days === "Every day" ? "Every " : "every ") + stepMin[1] + " minutes" + months;
    return days + " " + times + months;
  };

  /* Next `count` run times after `from` (ms). excludes: [{ dayOfWeek, useTime, time: "HH:MM" }]
     → a run on that weekday (and at that time, if useTime) is skipped and counted. */
  C.next = function (expr, from, count, excludes) {
    var p = C.parse(expr);
    if (!p) return { runs: [], skipped: 0 };
    excludes = excludes || [];
    var runs = [];
    var skipped = 0;
    var d = new Date(from);
    var start = d.getTime();
    d.setHours(0, 0, 0, 0);
    var inSet = function (arr, v) {
      return arr.indexOf(v) > -1;
    };
    for (var day = 0; day < 800 && runs.length < count; day++) {
      var date = new Date(d.getFullYear(), d.getMonth(), d.getDate() + day);
      if (!inSet(p.months, date.getMonth() + 1)) continue;
      var domOk = inSet(p.dom, date.getDate());
      var dowOk = inSet(p.dow, date.getDay());
      var dayOk = p.domAll && p.dowAll ? true : p.domAll ? dowOk : p.dowAll ? domOk : domOk || dowOk;
      if (!dayOk) continue;
      for (var hi = 0; hi < p.hours.length && runs.length < count; hi++) {
        for (var mi = 0; mi < p.minutes.length && runs.length < count; mi++) {
          var t = new Date(date.getFullYear(), date.getMonth(), date.getDate(), p.hours[hi], p.minutes[mi]).getTime();
          if (t <= start) continue;
          var hhmm = pad(p.hours[hi]) + ":" + pad(p.minutes[mi]);
          var hit = excludes.some(function (x) {
            return Number(x.dayOfWeek) === date.getDay() && (!x.useTime || x.time === hhmm);
          });
          if (hit) skipped++;
          else runs.push(t);
        }
      }
    }
    return { runs: runs, skipped: skipped };
  };

  /* Builder modes ↔ cron. mode: daily | weekly | monthly | cron */
  C.toBuilder = function (expr) {
    var p = C.parse(expr);
    var simple = p && p.minutes.length === 1 && p.hours.length === 1 && p.monthAll && /^\d+$/.test(p.raw[0]) && /^\d+$/.test(p.raw[1]);
    var time = simple ? pad(p.hours[0]) + ":" + pad(p.minutes[0]) : "15:00";
    if (simple && p.domAll && p.dowAll) return { mode: "daily", time: time, days: [], dates: [], cron: expr };
    if (simple && p.domAll) return { mode: "weekly", time: time, days: p.dow, dates: [], cron: expr };
    if (simple && p.dowAll) return { mode: "monthly", time: time, days: [], dates: p.dom, cron: expr };
    return { mode: "cron", time: time, days: [], dates: [], cron: expr || "" };
  };
  C.fromBuilder = function (b) {
    if (b.mode === "cron") return (b.cron || "").trim();
    var t = (b.time || "").split(":");
    var h = Number(t[0]);
    var m = Number(t[1]);
    var at = (isNaN(m) ? "*" : m) + " " + (isNaN(h) ? "*" : h);
    if (b.mode === "daily") return at + " * * *";
    if (b.mode === "weekly") return at + " * * " + (b.days.length ? b.days.slice().sort().join(",") : "*");
    return at + " " + (b.dates.length ? b.dates.slice().sort(function (x, y) {
      return x - y;
    }).join(",") : "*") + " * *";
  };
})(window.DS);
