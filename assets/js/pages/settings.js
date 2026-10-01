/* ==========================================================================
   Settings (Phase 11e).
   Source: src/pages/settings/index.tsx + views/pages/settings/PrivateKey.tsx
     h4 "Settings"; card "Private Key": a read-only field showing the full key with a copy icon at the
     START (no feedback on copy), "Generate Key" button (200px) that replaces the key right away, no
     confirm; toast "Key generated successfully"; full-page Spinner while loading
   Changes: the key is hidden until you show it (it's a secret on screen); copy is a labelled button at
   the end with a "Copied" toast; generating a new key asks first and says the old one stops working
   (proposal: I assume anything holding the old key needs the new one); the new key is shown once
   after it's made; skeleton instead of the spinner.
   ========================================================================== */
(function (DS) {
  var esc = DS.fmt.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var key = "pk_live_9f2c41d8a7e04b5c93f1d6e2b8a07c5e4d3f2a1b0c9e8d7f";
  var newKey = function () {
    var h = "";
    for (var i = 0; i < 48; i++) h += "0123456789abcdef"[Math.floor(Math.random() * 16)];
    return "pk_live_" + h;
  };

  function render(show) {
    $("key-body").innerHTML =
      '<div class="field"><label class="field__label" for="pk">Key</label>' +
      '<div class="field__control field__control--adorned"><input id="pk" class="t-num" type="' + (show ? "text" : "password") + '" readonly value="' + esc(key) + '">' +
      '<button type="button" class="icon-btn icon-btn--sm field__adornment" data-toggle-password="key" aria-label="' + (show ? "Hide" : "Show") + ' key" aria-pressed="' + !!show + '">' +
      '<iconify-icon icon="' + (show ? "tabler:eye-off" : "tabler:eye") + '"></iconify-icon></button>' +
      '<button type="button" class="icon-btn icon-btn--sm field__adornment" data-copy="' + esc(key) + '" data-copy-label="Private key copied" aria-label="Copy key" title="Copy">' +
      '<iconify-icon icon="tabler:copy"></iconify-icon></button></div></div>' +
      '<div style="margin-top:16px"><button type="button" class="btn btn--outlined" id="gen"><iconify-icon icon="tabler:refresh"></iconify-icon>Generate a new key</button></div>';
    $("gen").addEventListener("click", confirmGen);
  }
  function renderLoading() {
    $("key-body").innerHTML = '<div class="stack" style="gap:10px"><span class="skeleton skeleton--text" style="--w:10%"></span>' +
      '<span class="skeleton" style="display:block;height:44px"></span><span class="skeleton" style="display:block;height:40px;width:200px;margin-top:6px"></span></div>';
  }

  function confirmGen() {
    DS.dialog.open({
      icon: "tabler:alert-triangle", tone: "warning", title: "Generate a new private key?",
      html: "The current key stops working right away. Anything that uses it needs the new one.",
      actions: [
        { label: "Cancel", variant: "outlined", autofocus: true },
        { label: "Generate new key", variant: "contained", onClick: function (b, close) {
          DS.ui.busy(b, true, "Generating…");
          setTimeout(function () {
            close();
            key = newKey();
            render(true);
            DS.ui.toast("New key generated. Copy it now.", "tabler:circle-check");
          }, 800);
        } },
      ],
    });
  }

  // Not in the nav (the app has it commented out), so the shell can't build the crumbs
  var crumbs = document.querySelector(".topbar__crumbs");
  if (crumbs) crumbs.innerHTML = '<span>Admin</span><iconify-icon icon="tabler:chevron-right" aria-hidden="true"></iconify-icon><span aria-current="page">Settings</span>';

  var states = ["data", "loading", "shown", "confirm"];
  function setState(s) {
    DS.dialog.close();
    if (s === "loading") return renderLoading();
    render(s === "shown");
    if (s === "confirm") setTimeout(confirmGen, 300);
  }
  var initial = states.indexOf(DS.params.get("state")) > -1 ? DS.params.get("state") : "data";
  DS.page = { states: states, state: initial, setState: setState };
  setState(initial);
})(window.DS);
