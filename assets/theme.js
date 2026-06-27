/* =================================================================
   Smart Paper Mill Dashboard — Theme controller (assets/theme.js)
   Include in <head> on every page (before paint) so the saved theme
   applies with no flash:
     <link rel="stylesheet" href="../assets/theme.css" />
     <script src="../assets/theme.js"></script>

   - Persists the choice in localStorage ("smm_theme").
   - Auto-wires any checkbox marked  data-theme-toggle  (e.g. Settings).
   - Exposes window.SMMTheme = { current, set, toggle }.
   ================================================================= */

(function () {
  "use strict";
  var KEY = "smm_theme";

  function current() {
    try { return localStorage.getItem(KEY) === "dark" ? "dark" : "light"; }
    catch (e) { return "light"; }
  }
  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  }

  // Apply immediately (runs in <head>, before the body paints) — no flash.
  apply(current());

  function syncToggles() {
    var on = current() === "dark";
    var nodes = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < nodes.length; i++) nodes[i].checked = on;
  }
  function set(theme) {
    try { localStorage.setItem(KEY, theme === "dark" ? "dark" : "light"); } catch (e) {}
    apply(theme);
    syncToggles();
  }

  window.SMMTheme = { current: current, set: set, toggle: function () { set(current() === "dark" ? "light" : "dark"); } };

  document.addEventListener("DOMContentLoaded", function () {
    syncToggles();
    var nodes = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener("change", function (e) { set(e.target.checked ? "dark" : "light"); });
    }
  });
})();
