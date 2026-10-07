/* ==========================================================================
   Error pages (Phase 12): 401, 404, 500 on the blank layout.
   Source: src/pages/401.tsx, 404.tsx, 500.tsx
     401 "You are not authorized!" + "You do not have permission to view this page using the
         credentials that you have provided while login." + "Please contact your site administrator."
     404 "Page Not Found :(" + "Oops! 😖 The requested URL was not found on this server."
     500 "Oops, something went wrong!" + "There was an error with the internal server. Please contact
         your site administrator."
     one button "Back to Home"; illustration per theme × mode (kept)
   Changes: plain words, sentence case, no emoji; the code shown small above the title; a second
   action that fits each case (Go back / Log in as someone else / Try again); same logo + mode +
   language bar as the auth pages.
   ========================================================================== */
(function (DS) {
  var $ = function (id) {
    return document.getElementById(id);
  };
  var COPY = {
    401: {
      title: "You don't have access to this page",
      text: "Your account can't open this page. Ask your site admin to add it to your user group.",
      actions: '<a class="btn btn--contained" href="../index.html">Back to dashboard</a>' +
        '<a class="btn btn--outlined" href="login.html">Log in as someone else</a>',
    },
    404: {
      title: "Page not found",
      text: "The link may be old or typed wrong. Check the address, or go back to the dashboard.",
      actions: '<a class="btn btn--contained" href="../index.html">Back to dashboard</a>' +
        '<button type="button" class="btn btn--outlined" data-back>Go back</button>',
    },
    500: {
      title: "Something went wrong on our side",
      text: "The server hit an error. Try again in a minute. If it keeps happening, tell your site admin.",
      actions: '<button type="button" class="btn btn--contained" data-retry><iconify-icon icon="tabler:refresh"></iconify-icon>Try again</button>' +
        '<a class="btn btn--outlined" href="../index.html">Back to dashboard</a>',
    },
  };
  var code = "404";

  // The app's illustration for this theme × mode (semi-dark uses the dark one, like the app)
  function art() {
    var r = document.documentElement;
    var theme = r.getAttribute("data-theme") === "blue" ? "blue" : "gold";
    var mode = r.getAttribute("data-mode") === "dark" ? "dark" : "light";
    $("err-art").src = "../../../public/images/pages/" + theme + "/" + code + "/error_" + code + "_" + mode + ".svg";
  }
  new MutationObserver(art).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });

  function render(c) {
    code = c;
    var x = COPY[c];
    document.title = x.title + " | Admin prototype";
    $("err-code").textContent = "Error " + c;
    $("err-title").textContent = x.title;
    $("err-text").textContent = x.text;
    $("err-actions").innerHTML = x.actions;
    art();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-back]")) history.back();
    var r = e.target.closest("[data-retry]");
    if (r) {
      DS.ui.busy(r, true, "Trying…");
      setTimeout(function () {
        DS.ui.busy(r, false);
        DS.ui.toast("Still not working. Try again later.", "tabler:alert-triangle");
      }, 900);
    }
  });

  var states = ["404", "401", "500"];
  var q = DS.params.get("code") || DS.params.get("state");
  var initial = states.indexOf(q) > -1 ? q : "404";
  DS.page = { states: states, state: initial, setState: render };
  render(initial);
})(window.DS);
