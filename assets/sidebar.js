/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Shared Sidebar Component  (assets/sidebar.js)
   - Single source of truth for navigation across every page
   - Injects the sidebar, highlights the current page
   - JavaScript navigation + responsive toggle + logout
   Include on every page with:  <script src="../assets/sidebar.js"></script>
   (place it just BEFORE the page's own script.js)
   ================================================================= */

(function () {
  "use strict";

  /* ---------- Navigation model (edit menu here, once) ---------- */
  const NAV = [
    { key: "dashboard",   label: "Dashboard",   href: "../dashboard/index.html",
      icon: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>' },
    { key: "production",  label: "Production",  href: "../production/index.html",
      icon: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' },
    { key: "machines",    label: "Machines",    href: "../machines/index.html",
      icon: '<path d="M2 20h20"/><path d="M4 20V8l5 3V8l5 3V8l5 3v9"/><path d="M9 20v-4h2v4"/>' },
    { key: "maintenance", label: "Maintenance", href: "../maintenance/index.html",
      icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>' },
    { key: "downtime",    label: "Downtime",    href: "../downtime/index.html",
      icon: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>' },
    { key: "reports",     label: "Reports",     href: "../reports/index.html",
      icon: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8M8 17h8M8 9h2"/>' },
    { key: "alerts",      label: "Alerts",      href: "../alerts/index.html",
      icon: '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M21 17H3a3 3 0 0 0 1.7-2.7V10a7.3 7.3 0 0 1 14.6 0v4.3A3 3 0 0 0 21 17Z"/>' },
    { key: "settings",    label: "Settings",    href: "../settings/index.html",
      icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>' }
  ];

  const LOGOUT_ICON = '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>';
  const LOGOUT_HREF = "../login/index.html";

  const svg = (path) =>
    `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

  /* ---------- Detect current page from the URL ---------- */
  function currentKey() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    let folder = parts[parts.length - 1] || "";
    if (folder.includes(".")) folder = parts[parts.length - 2] || ""; // strip index.html
    return folder.toLowerCase();
  }

  /* ---------- Unacknowledged alert count (from MILL_DATA, if present) ---------- */
  function unackAlertCount() {
    try {
      if (!window.MILL_DATA || !MILL_DATA.alerts) return 0;
      const ack = JSON.parse(localStorage.getItem("smm_ack_alerts") || "[]");
      return MILL_DATA.alerts.filter((a) => ack.indexOf(a.id) === -1).length;
    } catch (e) { return 0; }
  }

  /* ---------- Inject one-time layout styles (works on every page) ---------- */
  function injectStyles() {
    if (document.getElementById("smm-sidebar-style")) return;
    const css = `
      #sidebar .nav { display: flex; flex-direction: column; }
      #sidebar .nav-grow { flex: 1 1 auto; }
      #sidebar .nav-item { cursor: pointer; user-select: none; }
      #sidebar .nav-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 10px; }
      #sidebar .nav-item.logout { color: #f6a9a9; }
      #sidebar .nav-item.logout:hover { background: rgba(220,38,38,0.16); color: #fff; }
      #sidebar .nav-badge { margin-left: auto; background: #dc2626; color: #fff; font-size: 11px; font-weight: 600; min-width: 20px; height: 20px; border-radius: 999px; display: grid; place-items: center; padding: 0 6px; }
    `;
    const style = document.createElement("style");
    style.id = "smm-sidebar-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- Build sidebar markup ---------- */
  function buildMarkup(activeKey) {
    // Signed-in user (set by the login flow / auth guard).
    let user = null;
    try { user = JSON.parse(localStorage.getItem("smm_user") || "null"); } catch (e) { user = null; }
    const role = user ? user.role : null;
    const name = user ? user.name : "Guest User";
    const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

    // Settings is Administrator-only — hide it from other roles.
    const visibleNav = NAV.filter((n) => n.key !== "settings" || !role || role === "Administrator");

    // Unacknowledged alert count (drives the Alerts badge).
    const alertCount = unackAlertCount();

    const items = visibleNav.map((n) => {
      const badge = (n.key === "alerts" && alertCount > 0)
        ? `<span class="nav-badge">${alertCount}</span>` : "";
      return `<a class="nav-item${n.key === activeKey ? " active" : ""}" href="${n.href}" data-href="${n.href}" data-key="${n.key}">
         ${svg(n.icon)}<span>${n.label}</span>${badge}
       </a>`;
    }).join("");

    return `
      <div class="sidebar-header">
        <div class="logo-mark">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l5 3V9l5 3V9l5 3V7a1 1 0 0 1 1-1h1v15Z"/><path d="M3 21h18"/></svg>
        </div>
        <div class="logo-text"><strong>Satia</strong><span>Mill Monitor</span></div>
        <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <nav class="nav">
        <p class="nav-section">Menu</p>
        ${items}
        <span class="nav-grow"></span>
        <div class="nav-divider"></div>
        <a class="nav-item logout" href="${LOGOUT_HREF}" data-action="logout">
          ${svg(LOGOUT_ICON)}<span>Logout</span>
        </a>
      </nav>

      <div class="sidebar-user">
        <div class="avatar">${initials || "GU"}</div>
        <div class="user-meta"><strong>${name}</strong><span>${role || "Not signed in"}</span></div>
      </div>`;
  }

  /* ---------- Responsive open/close ---------- */
  function wireResponsive() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const menuBtn = document.getElementById("menuBtn");
    const closeBtn = document.getElementById("sidebarClose");

    const open  = () => { sidebar && sidebar.classList.add("open"); overlay && overlay.classList.add("show"); };
    const close = () => { sidebar && sidebar.classList.remove("open"); overlay && overlay.classList.remove("show"); };

    if (menuBtn)  menuBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (overlay)  overlay.addEventListener("click", close);

    // expose so other code can close the drawer if needed
    window.SMMSidebar = { open, close };
  }

  /* ---------- JavaScript navigation + logout ---------- */
  function wireNavigation() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    sidebar.addEventListener("click", (e) => {
      const link = e.target.closest("a.nav-item");
      if (!link) return;
      e.preventDefault();

      // Logout
      if (link.dataset.action === "logout") {
        if (confirm("Are you sure you want to log out?")) {
          try {
            localStorage.removeItem("smm_token");
            localStorage.removeItem("smm_user");
            localStorage.removeItem("smm_loggedIn");
          } catch (_) {}
          window.location.href = LOGOUT_HREF;
        }
        return;
      }

      // Navigate (close drawer first on mobile)
      const href = link.dataset.href;
      if (!href) return;
      if (window.innerWidth <= 1024 && window.SMMSidebar) window.SMMSidebar.close();
      window.location.href = href;
    });
  }

  /* ---------- Topbar notification bell (badge + link to Alerts) ---------- */
  function wireBell() {
    const count = unackAlertCount();
    document.querySelectorAll(".dot-badge").forEach((b) => {
      b.textContent = count;
      b.style.display = count ? "" : "none";
    });
    const bell = document.querySelector('[aria-label="Notifications"]');
    if (bell) {
      bell.style.cursor = "pointer";
      bell.addEventListener("click", () => { window.location.href = "../alerts/index.html"; });
    }
  }

  /* ---------- Init ---------- */
  function init() {
    const mount = document.getElementById("sidebar");
    if (!mount) return; // page has no sidebar (e.g. login)
    injectStyles();
    mount.innerHTML = buildMarkup(currentKey());
    wireResponsive();
    wireNavigation();
    wireBell();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
