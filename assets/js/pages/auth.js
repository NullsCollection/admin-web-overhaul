/* ==========================================================================
   Auth pages (Phase 2): login, forgot-password, reset-password, change-password.
   One file, switched by <body data-page>. Each page registers its states with the
   prototype toolbar (DS.page) so reviewers can see every state without typing.

   Prototype-only shortcut: any email or password containing "wrong" triggers the
   server-error path (bad login, unknown email, wrong current password).
   ========================================================================== */
(function (DS) {
  var ui = DS.ui;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var page = document.body.getAttribute("data-page");
  var base = document.body.getAttribute("data-base") || "";
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------- Blank-layout chrome: logo + mode + language, footer ---------- */
  var top = $("auth-top");
  if (top) {
    top.innerHTML =
      '<a class="brand-logo" href="' + base + 'pages/login.html" aria-label="Home">' + ui.logoHTML(base) + "</a>" +
      '<div class="auth__tools"><button type="button" class="icon-btn" data-action="mode"></button>' +
      ui.langMenuHTML() + "</div>";
    ui.paintModeButtons();
  }
  var foot = $("auth-foot");
  if (foot) foot.innerHTML = "<span>© 2026 Super Admin</span><span>Design prototype</span>";

  function register(states, setState) {
    var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : states[0];
    DS.page = { states: states, state: initial, setState: setState };
    setState(initial);
  }
  function syncDevbar(state) {
    DS.page.state = state;
    if (DS.devbar) DS.devbar.render();
  }
  function wait(ms, fn) {
    setTimeout(fn, ms);
  }
  function show(id, on) {
    $(id).hidden = !on;
  }

  /* ======================================================================
     Login → src/pages/login/index.tsx
     Rules (yup): email valid + required; password min 5 + required.
     Change: server errors show inline above the form instead of a toast.
     ====================================================================== */
  if (page === "login") {
    var lf = { form: $("login-form"), email: $("email"), pw: $("password"), btn: $("login-submit") };

    var setLogin = function (s) {
      show("login-error", s === "error");
      ui.fieldError(lf.email, "");
      ui.fieldError(lf.pw, "");
      ui.busy(lf.btn, s === "loading", "Logging in…");
      lf.email.disabled = lf.pw.disabled = s === "loading";
      if (s === "error") {
        lf.pw.value = "";
        lf.pw.focus();
      }
    };

    lf.form.addEventListener("submit", function (e) {
      e.preventDefault();
      var em = lf.email.value.trim();
      var ok = ui.fieldError(lf.email, !em ? "Enter your email." : !EMAIL.test(em) ? "Enter a valid email address." : "");
      ok = ui.fieldError(lf.pw, lf.pw.value.length < 5 ? "Password must be at least 5 characters." : "") && ok;
      if (!ok) return;
      show("login-error", false);
      setLogin("loading");
      syncDevbar("loading");
      wait(900, function () {
        if (/wrong/i.test(em + lf.pw.value)) {
          setLogin("error");
          syncDevbar("error");
        } else {
          location.href = base + "index.html";
        }
      });
    });

    register(["default", "error", "loading"], setLogin);
  }

  /* ======================================================================
     Forgot password → src/pages/forgot-password/index.tsx
     Change: a "Check your email" screen after sending (today: a toast only).
     ====================================================================== */
  if (page === "forgot-password") {
    var ff = { form: $("forgot-view"), email: $("email"), btn: $("forgot-submit") };

    var setForgot = function (s) {
      show("forgot-view", s !== "sent");
      show("sent-view", s === "sent");
      ui.busy(ff.btn, s === "sending", "Sending…");
      ff.email.disabled = s === "sending";
      ui.fieldError(ff.email, s === "not-found" ? "We couldn't find an admin account with that email." : "");
      $("sent-email").textContent = ff.email.value.trim() || "admin@rb7.com";
      if (s === "sent") $("sent-title").focus();
    };

    ff.form.addEventListener("submit", function (e) {
      e.preventDefault();
      var em = ff.email.value.trim();
      if (!ui.fieldError(ff.email, !em ? "Enter your email." : !EMAIL.test(em) ? "Enter a valid email address." : "")) return;
      setForgot("sending");
      syncDevbar("sending");
      wait(800, function () {
        var next = /wrong/i.test(em) ? "not-found" : "sent";
        setForgot(next);
        syncDevbar(next);
      });
    });
    $("resend").addEventListener("click", function () {
      ui.toast("Reset link sent again", "tabler:mail");
    });

    register(["default", "not-found", "sending", "sent"], setForgot);
  }

  /* ======================================================================
     Reset password → src/pages/reset-password/index.tsx (?email=&token=)
     Rules: both required, confirm must match.
     Change: an "expired link" screen (today: a toast from the server error).
     ====================================================================== */
  if (page === "reset-password") {
    var rf = { form: $("reset-view"), pw: $("password"), confirm: $("confirm"), btn: $("reset-submit") };
    $("reset-email").textContent = DS.params.get("email") || "admin@rb7.com";

    var checkMatch = function () {
      return ui.fieldError(rf.confirm, rf.confirm.value && rf.confirm.value !== rf.pw.value ? "Passwords don't match." : "");
    };
    rf.confirm.addEventListener("input", checkMatch);

    var setReset = function (s) {
      show("reset-view", s !== "expired");
      show("expired-view", s === "expired");
      ui.busy(rf.btn, s === "saving", "Saving…");
      rf.pw.disabled = rf.confirm.disabled = s === "saving";
      ui.fieldError(rf.pw, "");
      if (s === "mismatch") {
        rf.pw.value = "newpass2026";
        rf.confirm.value = "newpass2025";
        checkMatch();
      } else {
        ui.fieldError(rf.confirm, "");
      }
    };

    rf.form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = ui.fieldError(rf.pw, rf.pw.value ? "" : "Enter a new password.");
      ok = (rf.confirm.value ? checkMatch() : ui.fieldError(rf.confirm, "Confirm your new password.")) && ok;
      if (!ok) return;
      setReset("saving");
      syncDevbar("saving");
      wait(900, function () {
        ui.toast("Password reset. Log in with your new password.", "tabler:circle-check");
        wait(1400, function () {
          location.href = "login.html";
        });
      });
    });

    register(["default", "mismatch", "saving", "expired"], setReset);
  }

  /* ======================================================================
     Change password (inside the app shell) → src/views/pages/change-password
     Rules: all required, confirm must match. Cancel → /dashboard.
     ====================================================================== */
  if (page === "change-password") {
    var cf = { form: $("change-form"), cur: $("current"), pw: $("new"), confirm: $("confirm"), btn: $("change-submit") };

    var matchCp = function () {
      return ui.fieldError(cf.confirm, cf.confirm.value && cf.confirm.value !== cf.pw.value ? "Passwords don't match." : "");
    };
    cf.confirm.addEventListener("input", matchCp);

    var setChange = function (s) {
      ui.busy(cf.btn, s === "saving", "Saving…");
      [cf.cur, cf.pw, cf.confirm].forEach(function (i) {
        i.disabled = s === "saving";
        if (s !== "saving") ui.fieldError(i, "");
      });
      if (s === "wrong-current") {
        cf.cur.value = "wrongpass";
        ui.fieldError(cf.cur, "Current password is incorrect.");
      }
      if (s === "mismatch") {
        cf.pw.value = "newpass2026";
        cf.confirm.value = "newpass2025";
        matchCp();
      }
    };

    cf.form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = ui.fieldError(cf.cur, cf.cur.value ? "" : "Enter your current password.");
      ok = ui.fieldError(cf.pw, cf.pw.value ? "" : "Enter a new password.") && ok;
      ok = (cf.confirm.value ? matchCp() : ui.fieldError(cf.confirm, "Confirm your new password.")) && ok;
      if (!ok) return;
      setChange("saving");
      syncDevbar("saving");
      wait(900, function () {
        if (/wrong/i.test(cf.cur.value)) {
          setChange("wrong-current");
          syncDevbar("wrong-current");
          return;
        }
        setChange("default");
        syncDevbar("default");
        cf.form.reset();
        ui.toast("Password changed", "tabler:circle-check");
      });
    });

    register(["default", "wrong-current", "mismatch", "saving"], setChange);
  }
})(window.DS);
