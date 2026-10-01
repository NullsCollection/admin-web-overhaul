/* ==========================================================================
   Formatters. Port: src/utils/currency (toTHB) + date-fns.
   Money shows full precision (admins reconcile to the satang); decimals are
   rendered muted so the whole baht amount reads first.
   ========================================================================== */
(function (DS) {
  var SYMBOLS = { THB: "฿", USD: "$", LAK: "₭", KRW: "₩", VND: "₫" };
  var MINUS = "−";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  var nfc = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

  function parts(n, currency) {
    var sign = n < 0 ? MINUS : "";
    var s = nf2.format(Math.abs(n));
    var dot = s.lastIndexOf(".");
    var cur = currency || DS.fmt.currency;
    // No symbol known → the currency code, so an amount never shows without its currency
    return { sign: sign, sym: SYMBOLS[cur] || cur + " ", int: s.slice(0, dot), dec: s.slice(dot) };
  }

  DS.fmt = {
    currency: "THB",
    now: new Date(2026, 8, 24, 13, 40).getTime(), // the prototype's "today"

    /* "฿12,480,350.42" */
    money: function (n, currency) {
      var p = parts(n, currency);
      return p.sign + p.sym + p.int + p.dec;
    },

    /* same, with the decimals wrapped for muted styling */
    moneyHTML: function (n, currency) {
      var p = parts(n, currency);
      return p.sign + p.sym + p.int + '<span class="stat__dec">' + p.dec + "</span>";
    },

    /* "฿1.2M" for axes */
    moneyCompact: function (n, currency) {
      var sym = SYMBOLS[currency || DS.fmt.currency] || "";
      return (n < 0 ? MINUS : "") + sym + nfc.format(Math.abs(n));
    },

    int: function (n) {
      return nf0.format(n);
    },

    /* Pay rate / plain amount, up to 2 decimals: "150,000", "3.2" */
    rate: function (n) {
      return n == null || n === "" ? "" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
    },

    pct: function (n, digits) {
      return (n < 0 ? MINUS : "") + Math.abs(n).toFixed(digits == null ? 2 : digits) + "%";
    },

    /* "11 Sep" */
    dayMonth: function (d) {
      d = new Date(d);
      return d.getDate() + " " + MONTHS[d.getMonth()];
    },

    /* "11 Sep 2026, 00:00" */
    dateTime: function (d) {
      d = new Date(d);
      var hh = String(d.getHours()).padStart(2, "0");
      var mm = String(d.getMinutes()).padStart(2, "0");
      return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() + ", " + hh + ":" + mm;
    },

    /* "3 hours ago", "5 months ago" (prototype "now" = 24 Sep 2026, 13:40) */
    ago: function (ts) {
      var ms = DS.fmt.now - ts;
      var m = Math.round(ms / 60000);
      if (m < 1) return "Just now";
      if (m < 60) return m + (m === 1 ? " minute ago" : " minutes ago");
      var h = Math.round(m / 60);
      if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
      var d = Math.round(h / 24);
      if (d < 31) return d + (d === 1 ? " day ago" : " days ago");
      var mo = Math.round(d / 30.4);
      return mo + (mo === 1 ? " month ago" : " months ago");
    },

    /* "2d 4h", "5h 12m", "18m" */
    duration: function (ms) {
      var m = Math.max(0, Math.floor(ms / 60000));
      var d = Math.floor(m / 1440);
      var h = Math.floor((m % 1440) / 60);
      var mm = m % 60;
      if (d) return d + "d " + h + "h";
      if (h) return h + "h " + mm + "m";
      return mm + "m";
    },

    /* "16 Sep 2026, 14:22:08" (formatDateTimeDetail) */
    dateTimeSec: function (d) {
      d = new Date(d);
      return DS.fmt.dateTime(d) + ":" + String(d.getSeconds()).padStart(2, "0");
    },

    esc: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    },
  };
})(window.DS);
