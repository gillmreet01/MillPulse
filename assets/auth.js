/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Client-side auth guard (assets/auth.js)

   Include on every PROTECTED page, as the FIRST script:
     <script src="../assets/auth.js"></script>

   - Requires a JWT (issued by /api/login) in localStorage.
   - Validates it against the backend (/api/me) and refreshes the
     stored user record.
   - Enforces page-level role restrictions via:
         <body data-require-role="Administrator">
   - If unauthenticated / expired / wrong role, redirects appropriately.

   NOTE: real auth needs the app served by the backend
   (http://localhost:5000). When opened directly from a file:// path
   the API is unreachable, so the guard stays out of the way.
   ================================================================= */

(function () {
  "use strict";

  // Authenticated fetch helper, available to every page that loads this guard.
  // Usage: smmApi("/api/production", { method:"POST", body: JSON.stringify(obj) })
  window.smmApi = function (path, options) {
    options = options || {};
    options.headers = Object.assign(
      { "Content-Type": "application/json",
        "Authorization": "Bearer " + (localStorage.getItem("smm_token") || "") },
      options.headers || {}
    );
    return fetch(path, options);
  };

  // Static/offline mode (opened via file://) — cannot reach the API, so skip the guard.
  if (location.protocol === "file:") return;

  var LOGIN_URL = "/login/index.html";
  var HOME_URL = "/dashboard/index.html";
  var token = localStorage.getItem("smm_token");

  function goLogin() {
    localStorage.removeItem("smm_token");
    localStorage.removeItem("smm_user");
    if (location.pathname.indexOf("/login/") === -1) location.replace(LOGIN_URL);
  }

  if (!token) { goLogin(); return; }

  fetch("/api/me", { headers: { Authorization: "Bearer " + token } })
    .then(function (res) {
      if (!res.ok) throw new Error("unauthorized");
      return res.json();
    })
    .then(function (user) {
      // Refresh the cached user record.
      localStorage.setItem("smm_user", JSON.stringify(user));
      window.SMM_USER = user;

      // Page-level role restriction.
      var required = document.body.getAttribute("data-require-role");
      if (required && user.role !== required) {
        alert("You do not have permission to view this page.");
        location.replace(HOME_URL);
      }
    })
    .catch(function () { goLogin(); });
})();
