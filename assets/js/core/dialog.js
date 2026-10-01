/* ==========================================================================
   Dialog → MUI <Dialog> (src/components/Modal: ConfirmModal, ErrorDialog)

   DS.dialog.open({
     icon: "tabler:trash", tone: "error" | "warning" | "primary",
     title: "Delete this provider?",
     html: "<strong>Golden Dragon</strong> will be removed. This can't be undone.",
     actions: [
       { label: "Cancel", variant: "outlined" },                       // closes
       { label: "Delete", variant: "contained", tone: "error", autofocus: true,
         onClick: function (btn, close) { ... } },                     // you close
     ],
     wide: true,                        // maxWidth="md", e.g. JSON results (ResultModal)
     size: "xl",                        // maxWidth="lg", e.g. limit set preview (PreviewModal)
     body: '<pre class="code-block">…',  // extra content under the title + text
   }) → { close }

   Esc and a click on the scrim close it (MUI default). Focus is trapped
   inside and returns to the opener on close.
   ========================================================================== */
(function (DS) {
  var esc = DS.fmt.esc;
  var current = null;

  function close() {
    if (!current) return;
    current.backdrop.remove();
    document.removeEventListener("keydown", current.onKey, true);
    if (current.opener && document.contains(current.opener)) current.opener.focus();
    current = null;
  }

  function open(o) {
    close();
    var backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";
    backdrop.innerHTML =
      '<div class="dialog' + (o.wide ? " dialog--wide" : "") + (o.size === "xl" ? " dialog--xl" : "") + '" role="' + (o.wide || o.size ? "dialog" : "alertdialog") +
      '" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-text" tabindex="-1">' +
      '<div class="dialog__header">' +
      (o.icon
        ? '<span class="avatar avatar--square avatar--' + (o.tone || "primary") + '"><iconify-icon icon="' + o.icon + '"></iconify-icon></span>'
        : "") +
      '<div><h2 class="dialog__title" id="dlg-title">' + esc(o.title) + '</h2><div class="dialog__text" id="dlg-text">' +
      (o.html || "") + "</div></div></div>" +
      (o.body ? '<div class="dialog__body">' + o.body + "</div>" : "") +
      '<div class="dialog__actions"></div></div>';

    var dialog = backdrop.querySelector(".dialog");
    var bar = backdrop.querySelector(".dialog__actions");
    var focusFirst = null;

    (o.actions || [{ label: "Close", variant: "outlined" }]).forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className =
        "btn btn--" + (a.variant || "outlined") + (a.tone ? " btn--" + a.tone : "");
      b.textContent = a.label;
      b.addEventListener("click", function () {
        if (a.onClick) a.onClick(b, close);
        else close();
      });
      bar.appendChild(b);
      if (a.autofocus) focusFirst = b;
    });

    backdrop.addEventListener("mousedown", function (e) {
      if (e.target === backdrop && !o.persistent) close();
    });

    var onKey = function (e) {
      if (e.key === "Escape" && !o.persistent) {
        e.stopPropagation();
        close();
      }
      if (e.key === "Tab") {
        var f = dialog.querySelectorAll("button:not([disabled]), a[href], input, select");
        if (!f.length) return;
        var first = f[0];
        var last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);

    document.body.appendChild(backdrop);
    current = { backdrop: backdrop, onKey: onKey, opener: document.activeElement };
    (focusFirst || dialog).focus();
    return { close: close, el: dialog };
  }

  DS.dialog = { open: open, close: close };
})(window.DS);
