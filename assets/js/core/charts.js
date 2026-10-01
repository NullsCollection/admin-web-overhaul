/* ==========================================================================
   Tiny SVG charts, colored by CSS variables so themes/modes switch for free.
   The app uses Recharts; these only fix the LOOK (see chart.css for the specs).

   DS.charts.line(el, opts)     → change over time (AreaChart/LineChart in Recharts)
   DS.charts.columns(el, opts)  → grouped columns per category (BarChart)

   opts = {
     labels: [...x labels],                 // dates (line) or category names (columns)
     series: [{ key, label, color: "--viz-1", values: [...], area?: true }],
     xFormat: fn(label) → string,           // tick + tooltip title
     yFormat: fn(n) → string,               // axis ticks (compact)
     valueFormat: fn(n) → string,           // tooltip values (full)
     label: "Accessible summary",
   }
   Redraws on resize. Hover (pointer) or ←/→ (keyboard) shows the tooltip.
   ========================================================================== */
(function (DS) {
  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* Nice round ticks covering [min, max] (always includes 0).
     Picks the smallest 1/2/2.5/5 × 10^n step that needs ≤ maxIntervals.
     A small dip below zero (< half a step) gets headroom but no extra tick,
     so one slightly negative value doesn't waste a whole grid band. */
  function niceScale(min, max, maxIntervals) {
    min = Math.min(0, min);
    max = Math.max(0, max);
    if (max === min) max = min + 1;
    var mag = Math.pow(10, Math.floor(Math.log10((max - min) / maxIntervals)));
    var steps = [1, 2, 2.5, 5, 10, 20].map(function (k) {
      return k * mag;
    });
    var step, lo, hi, first;
    for (var i = 0; i < steps.length; i++) {
      step = steps[i];
      hi = Math.ceil(max / step) * step;
      var tight = min < 0 && -min < step / 2;
      first = tight ? 0 : Math.floor(min / step) * step;
      lo = tight ? min * 1.3 : first;
      if ((hi - first) / step <= maxIntervals) break;
    }
    var ticks = [];
    for (var v = first; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return { lo: lo, hi: hi, ticks: ticks };
  }

  /* Shared frame: svg, margins, y scale, grid, tooltip element */
  function frame(container, opts) {
    container.innerHTML = "";
    var w = container.clientWidth || 600;
    var h = container.clientHeight || 280;
    var all = [];
    opts.series.forEach(function (s) {
      all = all.concat(s.values);
    });
    var sc = niceScale(Math.min.apply(null, all), Math.max.apply(null, all), h < 220 ? 4 : 5);
    var tickText = sc.ticks.map(function (t) {
      return opts.yFormat(t);
    });
    var longest = Math.max.apply(
      null,
      tickText.map(function (t) {
        return t.length;
      })
    );
    var m = { t: 8, r: 8, b: 28, l: Math.max(36, longest * 7 + 12) };
    var iw = Math.max(10, w - m.l - m.r);
    var ih = Math.max(10, h - m.t - m.b);
    var y = function (v) {
      return m.t + ih - ((v - sc.lo) / (sc.hi - sc.lo)) * ih;
    };

    var svg = el("svg", { width: w, height: h, viewBox: "0 0 " + w + " " + h, role: "img", "aria-label": opts.label || "" });
    var gGrid = el("g", {}, svg);
    sc.ticks.forEach(function (t, i) {
      var yy = Math.round(y(t)) + 0.5;
      el("line", { x1: m.l, x2: w - m.r, y1: yy, y2: yy, class: t === 0 ? "chart__zero" : "chart__grid" }, gGrid);
      var tx = el("text", { x: m.l - 8, y: yy, "text-anchor": "end", "dominant-baseline": "middle" }, gGrid);
      tx.textContent = tickText[i];
    });

    container.appendChild(svg);
    var tip = document.createElement("div");
    tip.className = "chart-tooltip";
    tip.hidden = true;
    tip.setAttribute("aria-hidden", "true");
    container.appendChild(tip);
    if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "0");

    return { svg: svg, tip: tip, w: w, h: h, m: m, iw: iw, ih: ih, y: y, sc: sc };
  }

  function showTip(f, container, opts, i, anchorX) {
    var title = opts.xFormat ? opts.xFormat(opts.labels[i]) : opts.labels[i];
    f.tip.innerHTML =
      '<div class="chart-tooltip__title">' + DS.fmt.esc(title) + "</div>" +
      opts.series
        .map(function (s) {
          return (
            '<div class="chart-tooltip__row"><span class="legend__swatch" style="--c: var(' + s.color + ')"></span>' +
            DS.fmt.esc(s.label) + "<b>" + (opts.valueFormat || opts.yFormat)(s.values[i]) + "</b></div>"
          );
        })
        .join("");
    f.tip.hidden = false;
    var tw = f.tip.offsetWidth;
    var left = anchorX + 12;
    if (left + tw > f.w) left = anchorX - tw - 12;
    f.tip.style.transform = "translate(" + Math.max(0, left) + "px," + f.m.t + "px)";
  }

  /* x tick labels, thinned so they never collide */
  function xTicks(f, opts, xAt) {
    var n = opts.labels.length;
    var room = Math.floor(f.iw / 64) || 1;
    var every = Math.max(1, Math.ceil(n / room));
    var g = el("g", {}, f.svg);
    // A label wider than its slot is cut with "…" (full text in a <title>), so long category
    // names (games) never run into each other
    var maxW = (f.iw / n) * every - 8;
    opts.labels.forEach(function (l, i) {
      if (i % every) return;
      var t = el("text", { x: xAt(i), y: f.h - 8, "text-anchor": "middle" }, g);
      var full = opts.xFormat ? opts.xFormat(l) : String(l);
      t.textContent = full;
      if (t.getComputedTextLength && t.getComputedTextLength() > maxW) {
        var cut = full;
        while (cut.length > 1 && t.getComputedTextLength() > maxW) {
          cut = cut.slice(0, -1);
          t.textContent = cut.replace(/\s+$/, "") + "…";
        }
        el("title", {}, t).textContent = full;
      }
    });
  }

  /* Pointer + keyboard driver. hover(i) draws the highlight, returns anchor x. */
  function interact(container, f, opts, indexAt, hover, clear) {
    var current = -1;
    function go(i) {
      current = i;
      var x = hover(i);
      showTip(f, container, opts, i, x);
    }
    function stop() {
      current = -1;
      f.tip.hidden = true;
      clear();
    }
    var hit = el("rect", { x: f.m.l, y: f.m.t, width: f.iw, height: f.ih, fill: "transparent" }, f.svg);
    hit.addEventListener("pointermove", function (e) {
      var r = f.svg.getBoundingClientRect();
      go(indexAt(e.clientX - r.left));
    });
    hit.addEventListener("pointerleave", stop);
    container.onkeydown = function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      var n = opts.labels.length;
      go(current < 0 ? 0 : Math.max(0, Math.min(n - 1, current + (e.key === "ArrowRight" ? 1 : -1))));
    };
    container.onblur = stop;
  }

  /* ResizeObserver wrapper: redraw on width change */
  function responsive(container, draw) {
    var lastW = 0;
    var raf = 0;
    draw();
    lastW = container.clientWidth;
    if (!window.ResizeObserver) return;
    var ro = new ResizeObserver(function () {
      if (container.clientWidth === lastW || !container.offsetParent) return;
      lastW = container.clientWidth;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    });
    ro.observe(container);
    return ro;
  }

  /* ---------- Line ---------- */
  function drawLine(container, opts) {
    var f = frame(container, opts);
    var n = opts.labels.length;
    var x = function (i) {
      return n === 1 ? f.m.l + f.iw / 2 : f.m.l + (i * f.iw) / (n - 1);
    };
    xTicks(f, opts, x);

    var gSeries = el("g", {}, f.svg);
    opts.series.forEach(function (s) {
      var d = s.values
        .map(function (v, i) {
          return (i ? "L" : "M") + x(i).toFixed(1) + "," + f.y(v).toFixed(1);
        })
        .join("");
      if (s.area && n > 1) {
        // Soft vertical fade under the line (SVG gradient, colored by the series token)
        var gid = "g" + Math.random().toString(36).slice(2, 8);
        var defs = el("defs", {}, gSeries);
        var lg = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        el("stop", { offset: "0%", style: "stop-color: var(" + s.color + "); stop-opacity: 0.22" }, lg);
        el("stop", { offset: "100%", style: "stop-color: var(" + s.color + "); stop-opacity: 0" }, lg);
        el("path", {
          d: d + "L" + x(n - 1) + "," + f.y(f.sc.lo) + "L" + x(0) + "," + f.y(f.sc.lo) + "Z",
          class: "chart__area",
          fill: "url(#" + gid + ")",
        }, gSeries);
      }
      if (n > 1) el("path", { d: d, class: "chart__line", style: "stroke: var(" + s.color + ")" }, gSeries);
      else el("circle", { cx: x(0), cy: f.y(s.values[0]), r: 4, class: "chart__dot", style: "fill: var(" + s.color + ")" }, gSeries);
    });

    var cross = el("line", { class: "chart__cross", y1: f.m.t, y2: f.m.t + f.ih, visibility: "hidden" }, f.svg);
    var dots = opts.series.map(function (s) {
      return el("circle", { r: 5, class: "chart__dot chart__dot--hover", style: "stroke: var(" + s.color + ")", visibility: "hidden" }, f.svg);
    });

    interact(
      container, f, opts,
      function (px) {
        return n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(((px - f.m.l) / f.iw) * (n - 1))));
      },
      function (i) {
        var xx = Math.round(x(i)) + 0.5;
        cross.setAttribute("x1", xx);
        cross.setAttribute("x2", xx);
        cross.setAttribute("visibility", "visible");
        dots.forEach(function (d, k) {
          d.setAttribute("cx", x(i));
          d.setAttribute("cy", f.y(opts.series[k].values[i]));
          d.setAttribute("visibility", "visible");
        });
        return xx;
      },
      function () {
        cross.setAttribute("visibility", "hidden");
        dots.forEach(function (d) {
          d.setAttribute("visibility", "hidden");
        });
      }
    );
  }

  /* ---------- Grouped columns ---------- */
  function barPath(x, y0, y1, w, r) {
    var h = Math.abs(y0 - y1);
    if (h < 0.5) return "";
    r = Math.min(r, w / 2, h);
    var up = y1 < y0;
    var e = up ? y1 + r : y1 - r;
    return (
      "M" + x + "," + y0 + "V" + e + "Q" + x + "," + y1 + " " + (x + r) + "," + y1 +
      "H" + (x + w - r) + "Q" + (x + w) + "," + y1 + " " + (x + w) + "," + e + "V" + y0 + "Z"
    );
  }

  function drawColumns(container, opts) {
    var f = frame(container, opts);
    var n = opts.labels.length;
    var k = opts.series.length;
    var GAP = 2;
    var band = f.iw / n;
    var barW = Math.max(4, Math.min(18, (band * 0.62 - GAP * (k - 1)) / k));
    var groupW = barW * k + GAP * (k - 1);
    var cx = function (i) {
      return f.m.l + band * i + band / 2;
    };

    var hl = el("rect", { class: "chart__band", y: f.m.t, height: f.ih, width: band, rx: 10, visibility: "hidden" }, f.svg);
    xTicks(f, opts, cx);

    var y0 = f.y(0);
    var gBars = el("g", {}, f.svg);
    opts.labels.forEach(function (_, i) {
      var left = cx(i) - groupW / 2;
      opts.series.forEach(function (s, j) {
        var d = barPath(left + j * (barW + GAP), y0, f.y(s.values[i]), barW, 6);
        if (d) el("path", { d: d, style: "fill: var(" + s.color + ")" }, gBars);
      });
    });
    // zero line on top of bars so negative bars read against it
    el("line", { x1: f.m.l, x2: f.w - f.m.r, y1: Math.round(y0) + 0.5, y2: Math.round(y0) + 0.5, class: "chart__zero" }, f.svg);

    interact(
      container, f, opts,
      function (px) {
        return Math.max(0, Math.min(n - 1, Math.floor((px - f.m.l) / band)));
      },
      function (i) {
        hl.setAttribute("x", f.m.l + band * i);
        hl.setAttribute("visibility", "visible");
        return cx(i) + groupW / 2;
      },
      function () {
        hl.setAttribute("visibility", "hidden");
      }
    );
  }

  /* ---------- Gauge (returns markup): a half ring of ticks, the filled share in brand ----------
     gauge({ value, max, label, caption }) → html. Port: MUI X <Gauge> with a custom tick arc. */
  function gauge(o) {
    var N = 36;
    var W = 240;
    var R = 104;
    var cx = W / 2;
    var cy = 116;
    var share = Math.max(0, Math.min(1, (o.value || 0) / (o.max || 1)));
    var on = Math.round(share * N);
    var ticks = "";
    for (var i = 0; i < N; i++) {
      var a = Math.PI + (i / (N - 1)) * Math.PI; // left → right across the top
      var r1 = R - 22;
      var x1 = cx + Math.cos(a) * r1;
      var y1 = cy + Math.sin(a) * r1;
      var x2 = cx + Math.cos(a) * R;
      var y2 = cy + Math.sin(a) * R;
      ticks += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" class="gauge__tick' + (i < on ? " is-on" : "") + '" style="--i:' + i + '"></line>';
    }
    return (
      '<div class="gauge" role="meter" aria-label="' + DS.fmt.esc(o.label || "") + '" aria-valuemin="0" aria-valuemax="' + o.max +
      '" aria-valuenow="' + (o.value || 0).toFixed(2) + '"><svg viewBox="0 0 ' + W + ' 128" aria-hidden="true" focusable="false">' + ticks + "</svg>" +
      '<div class="gauge__center"><div class="gauge__value">' + DS.fmt.esc(o.display) + "</div>" +
      (o.caption ? '<div class="gauge__caption">' + DS.fmt.esc(o.caption) + "</div>" : "") + "</div></div>"
    );
  }

  /* ---------- Highlight bars (returns markup): one bar per label, the top one in brand with its value ----------
     bars({ labels, values, format, label }) → html. Port: Recharts <BarChart> with a Cell per bar. */
  function bars(o) {
    var max = Math.max.apply(null, o.values.concat(1));
    var top = o.values.indexOf(Math.max.apply(null, o.values));
    return (
      '<div class="hbars" role="img" aria-label="' + DS.fmt.esc(o.label || "") + '">' +
      o.values.map(function (v, i) {
        var h = Math.max(6, (v / max) * 100);
        return (
          '<div class="hbars__col' + (i === top ? " is-top" : "") + '" title="' + DS.fmt.esc(o.labels[i] + ": " + o.format(v)) + '">' +
          '<span class="hbars__value">' + (i === top ? DS.fmt.esc(o.short ? o.short(v) : o.format(v)) : "&nbsp;") + "</span>" +
          '<span class="hbars__track"><span class="hbars__bar" style="height:' + h.toFixed(1) + '%"></span></span>' +
          '<span class="hbars__label">' + DS.fmt.esc(o.labels[i]) + "</span></div>"
        );
      }).join("") +
      "</div>"
    );
  }

  DS.charts = {
    gauge: gauge,
    bars: bars,
    line: function (container, opts) {
      return responsive(container, function () {
        drawLine(container, opts);
      });
    },
    columns: function (container, opts) {
      return responsive(container, function () {
        drawColumns(container, opts);
      });
    },
  };
})(window.DS);
