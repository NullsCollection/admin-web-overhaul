/* ==========================================================================
   Access link (Phase 12): /access?key=<token> signs in with a token (links from another system).
   Source: src/pages/access/index.tsx
     loading: CircularProgress 60 + "Authenticating..." + "Please wait while we verify your access"
     failed: h3 "Authentication Failed" + error Alert (API message in red + "The access link may have
       expired or is invalid. Please request a new access link or contact your administrator.") +
       full-width "Go to login"; also a toast with the same message (shown twice)
     no key: same failed card with "No access token provided"
   Changes: the auth split screen (same as login) instead of a card on a tinted photo; plain words;
   the error shows once (no toast on top of the alert); a "no key" case says the link is incomplete.
   ========================================================================== */
(function (DS) {
  var $ = function (id) {
    return document.getElementById(id);
  };
  var timer = 0;
  function setState(s) {
    clearTimeout(timer);
    $("acc-checking").hidden = s !== "checking";
    $("acc-failed").hidden = s === "checking";
    if (s === "checking") {
      document.title = "Signing you in | Admin prototype";
      return;
    }
    document.title = "Access link didn't work | Admin prototype";
    var noKey = s === "no-key";
    $("acc-title").textContent = noKey ? "This access link is incomplete" : "This access link didn't work";
    $("acc-text").textContent = noKey
      ? "The link has no access key. Copy the whole link again, or log in with your email and password."
      : "It may have expired or already been used. Ask your admin for a new link, or log in with your email and password.";
    $("acc-msg").textContent = noKey ? "No access key in the link." : "Token has expired."; // mock API message
  }
  var states = ["checking", "failed", "no-key"];
  var q = DS.params.get("state");
  var initial = states.indexOf(q) > -1 ? q : "checking";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
  // A real visit with no ?state: pretend the check fails after a moment (prototype)
  if (!q) timer = setTimeout(function () {
    DS.page.state = "failed";
    setState("failed");
    if (DS.devbar) DS.devbar.render();
  }, 2500);
})(window.DS);
