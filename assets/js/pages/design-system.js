/* ==========================================================================
   Design-system page: builds swatches, role tables, and type/space specimens
   from the live CSS variables (no hex duplicated here).
   ========================================================================== */
(function (DS) {
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function swatch(name, role) {
    return (
      '<div class="swatch"><div class="swatch__chip" style="--c: var(' + name + ')"></div><div class="swatch__meta">' +
      '<div class="swatch__name">' + esc(name.replace("--", "")) + "</div>" +
      '<div class="swatch__hex">' + esc(cssVar(name)) + "</div>" +
      (role ? '<div class="swatch__role">' + esc(role) + "</div>" : "") +
      "</div></div>"
    );
  }

  var INK = [
    ["--ink-0", "cards, sidebar, top bar"], ["--ink-25", ""], ["--ink-50", "table header, subtle fills"],
    ["--ink-100", "canvas, row hover"], ["--ink-200", "every border"], ["--ink-300", "input hover border"],
    ["--ink-400", "placeholder, disabled"], ["--ink-500", "muted text, table headers"], ["--ink-600", "secondary text"],
    ["--ink-700", ""], ["--ink-800", "dark: borders"], ["--ink-900", "dark: surface"], ["--ink-950", "the black: text, pill, solid"],
  ];
  var STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  var ROLE_NOTES = { gold: { 500: "brand fill", 600: "hover", 700: "brand text" }, blue: { 500: "brand", 600: "fill", 700: "brand text" } };

  var ROLES = [
    ["--bg-canvas", "palette.background.default"], ["--bg-surface", "palette.background.paper"],
    ["--bg-subtle", "customColors.tableHeaderBg"], ["--bg-hover", "palette.action.hover"],
    ["--bg-muted", "tiles, tracks, skeleton"], ["--bg-inverse", "palette.ink.main (new)"],
    ["--text-primary", "palette.text.primary"], ["--text-secondary", "palette.text.secondary"],
    ["--text-muted", "customColors.textMuted (new)"], ["--text-faint", "palette.text.disabled"],
    ["--text-inverse", "palette.ink.contrastText"], ["--border", "palette.divider"],
    ["--border-strong", "customColors.borderStrong (new)"], ["--primary", "palette.primary.main"],
    ["--primary-hover", "palette.primary.dark"], ["--on-primary", "palette.primary.contrastText"],
    ["--primary-text", "customColors.primaryText (new)"], ["--primary-soft", "customColors.primarySoft (new)"],
    ["--focus-ring", "focus outline"],
  ];
  var STATUS = [
    ["--success", "success.main"], ["--success-soft", "chip bg"], ["--error", "error.main"], ["--error-soft", "chip bg"],
    ["--warning", "warning.main"], ["--warning-soft", "chip bg"], ["--info", "info.main"], ["--info-soft", "chip bg"],
    ["--viz-1", "chart series 1 (brand)"], ["--viz-2", "chart series 2"], ["--viz-3", "chart series 3"],
  ];
  var TYPE = [
    ["t-h1", "h1", "32 / 40 · 600"], ["t-h2", "h2", "28 / 36 · 600"], ["t-h3", "h3", "24 / 32 · 600"],
    ["t-h4", "h4", "20 / 28 · 600"], ["t-h5", "h5", "18 / 26 · 600"], ["t-h6", "h6", "16 / 24 · 600"],
    ["t-subtitle1", "subtitle1", "15 / 22 · 500"], ["t-subtitle2", "subtitle2", "13 / 20 · 500"],
    ["t-body1", "body1", "14 / 22 · 400"], ["t-body2", "body2", "13 / 20 · 400"],
    ["t-caption", "caption", "12 / 16 · 400"], ["t-overline", "overline", "11 / 16 · 600 caps"],
    ["t-display t-num", "sx on h3 (figures)", "40 / 44 · 600 tabular"],
  ];

  function paint() {
    $("sw-ink").innerHTML = INK.map(function (r) {
      return swatch(r[0], r[1]);
    }).join("");
    ["gold", "blue"].forEach(function (hue) {
      $("sw-" + hue).innerHTML = STEPS.map(function (s) {
        return swatch("--" + hue + "-" + s, ROLE_NOTES[hue][s] || "");
      }).join("");
    });
    $("tbl-roles").innerHTML =
      '<thead><tr><th>Token</th><th>Now</th><th>Value</th><th>MUI path</th></tr></thead><tbody>' +
      ROLES.map(function (r) {
        return (
          '<tr><td class="is-strong"><span class="ds-code">' + r[0] + '</span></td><td><span class="token-dot" style="--c: var(' +
          r[0] + ')"></span></td><td class="t-num">' + esc(cssVar(r[0])) + "</td><td>" + esc(r[1]) + "</td></tr>"
        );
      }).join("") +
      "</tbody>";
    $("sw-status").innerHTML = STATUS.map(function (r) {
      return swatch(r[0], r[1]);
    }).join("");
  }

  $("type-rows").innerHTML = TYPE.map(function (t) {
    var sample = t[1].indexOf("sx") === 0 ? "฿3,369,959.15" : "Win & loss ผลแพ้ชนะ 1,234";
    return (
      '<div class="type-row"><span class="ds-code">' + t[1] + '</span><span class="' + t[0] + '">' + sample +
      '</span><span class="type-row__spec">' + t[2] + " · ." + t[0].split(" ")[0] + "</span></div>"
    );
  }).join("");

  $("space-rows").innerHTML = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16]
    .map(function (n) {
      return (
        '<div class="ds-row"><span class="ds-row__label">space-' + n + " · " + n * 4 + 'px</span><div class="space-bar" style="width:' +
        n * 4 + 'px"></div></div>'
      );
    })
    .join("");

  DS.ui.multiselect($("ds-multi"), {
    options: [
      { value: "1", label: "Golden Dragon (GD01)" },
      { value: "2", label: "Siam 88 (S88)" },
      { value: "3", label: "Lucky Star (LS07)" },
    ],
    selected: ["1", "2"],
    placeholder: "All providers",
  });

  var days = [];
  for (var i = 0; i < 14; i++) days.push(new Date(2026, 8, 11 + i).toISOString());
  DS.charts.line($("ds-chart"), {
    labels: days,
    series: [
      { label: "Series 1", color: "--viz-1", area: true, values: [3, 4, 3.6, 5, 4.4, 5.2, 6, 5.1, 5.8, 6.4, 6, 7, 6.6, 7.4] },
      { label: "Series 2", color: "--viz-2", values: [6, 5.4, 6.2, 6.8, 6, 7.2, 7, 7.8, 7.1, 8, 8.4, 7.9, 8.8, 9] },
      { label: "Series 3", color: "--viz-3", values: [1, 1.6, 1.2, 2, 2.4, 1.8, 2.6, 2.2, 3, 2.7, 3.4, 3, 3.6, 3.2] },
    ],
    xFormat: DS.fmt.dayMonth,
    yFormat: function (n) {
      return String(n);
    },
    label: "Sample line chart",
  });

  paint();
  DS.settings.on(function () {
    requestAnimationFrame(paint);
  });
})(window.DS);
