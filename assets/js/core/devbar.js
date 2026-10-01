/* ==========================================================================
   Prototype toolbar (bottom right). NOT product UI.
   Switches theme (gold/blue), mode (light/dark) and, if the page registers
   them, page states: DS.page = { states: ["data","loading",...], setState(s) }.
   ========================================================================== */
(function (DS) {
  var bar = document.createElement("div");
  bar.className = "devbar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Prototype controls");

  function seg(name, current, values) {
    return (
      '<div class="segmented" role="group" aria-label="' + name + '">' +
      values
        .map(function (v) {
          return (
            '<button type="button" class="segmented__btn" data-dev="' + name + '" data-value="' + v + '" aria-pressed="' +
            (v === current) + '">' + v.charAt(0).toUpperCase() + v.slice(1) + "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function render() {
    var states = DS.page && DS.page.states;
    bar.innerHTML =
      '<span class="devbar__label">Prototype</span>' +
      '<div class="devbar__group"><span>Theme</span>' + seg("theme", DS.settings.get("theme"), ["gold", "blue"]) + "</div>" +
      '<div class="devbar__group"><span>Mode</span>' + seg("mode", DS.settings.get("mode"), ["light", "dark"]) + "</div>" +
      (states
        ? '<div class="devbar__group"><span>State</span>' + seg("state", DS.page.state || states[0], states) + "</div>"
        : "") +
      '<button type="button" class="icon-btn icon-btn--sm devbar__toggle" aria-label="Hide prototype controls">' +
      '<iconify-icon icon="tabler:chevron-right"></iconify-icon></button>';
  }

  bar.addEventListener("click", function (e) {
    var b = e.target.closest("[data-dev]");
    if (b) {
      var name = b.getAttribute("data-dev");
      var v = b.getAttribute("data-value");
      if (name === "state") {
        DS.page.state = v;
        DS.page.setState(v);
      } else {
        DS.settings.set(name, v);
      }
      render();
      return;
    }
    if (e.target.closest(".devbar__toggle")) {
      bar.classList.toggle("is-min");
      var min = bar.classList.contains("is-min");
      e.target.closest(".devbar__toggle").setAttribute("aria-label", min ? "Show prototype controls" : "Hide prototype controls");
    }
  });

  DS.settings.on(render);
  DS.devbar = { render: render };

  function mount() {
    render();
    document.body.appendChild(bar);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})(window.DS);
