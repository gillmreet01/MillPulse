/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Alerts & Notifications Page — JavaScript
   - Reads threshold/machine-driven alerts from MILL_DATA.alerts
   - Filter by severity / unacknowledged
   - Acknowledge individual alerts or mark all read (persisted)
   ================================================================= */

(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const ACK_KEY = "smm_ack_alerts";

  const ALERTS = (window.MILL_DATA && MILL_DATA.alerts) ? MILL_DATA.alerts : [];
  let activeFilter = "all";

  /* ---------- Acknowledged set (persisted) ---------- */
  function loadAck() {
    try { return new Set(JSON.parse(localStorage.getItem(ACK_KEY) || "[]")); }
    catch (e) { return new Set(); }
  }
  function saveAck(set) { localStorage.setItem(ACK_KEY, JSON.stringify(Array.from(set))); }
  let ackSet = loadAck();

  const ICONS = {
    danger:  '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    warning: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    info:    '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    success: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>'
  };
  const svg = (p) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const isAck = (a) => ackSet.has(a.id);

  /* ---------- Summary chips ---------- */
  function renderSummary() {
    const total = ALERTS.length;
    const unack = ALERTS.filter((a) => !isAck(a)).length;
    const danger = ALERTS.filter((a) => a.type === "danger").length;
    const warning = ALERTS.filter((a) => a.type === "warning").length;
    const bell = '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M21 17H3a3 3 0 0 0 1.7-2.7V10a7.3 7.3 0 0 1 14.6 0v4.3A3 3 0 0 0 21 17Z"/>';
    const chips = [
      { key: "total",   label: "Total Alerts",     value: total,   icon: bell },
      { key: "unack",   label: "Unacknowledged",   value: unack,   icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2 2"/>' },
      { key: "danger",  label: "Critical",          value: danger,  icon: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>' },
      { key: "warning", label: "Warnings",          value: warning, icon: '<path d="M12 9v6M9 12h6"/><circle cx="12" cy="12" r="9"/>' }
    ];
    $("#summaryBar").innerHTML = chips.map((c) =>
      `<div class="summary-chip"><div class="s-icon ${c.key}">${svg(c.icon)}</div>
       <div><div class="s-value">${c.value}</div><div class="s-label">${c.label}</div></div></div>`).join("");
  }

  /* ---------- Render alert list ---------- */
  function render() {
    const list = ALERTS.filter((a) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "unack") return !isAck(a);
      return a.type === activeFilter;
    });

    const wrap = $("#alertsList");
    wrap.innerHTML = "";
    if (!list.length) {
      $("#emptyState").hidden = false;
      $("#emptyText").textContent = activeFilter === "unack"
        ? "No unacknowledged alerts — you're all caught up."
        : "No alerts match this filter.";
      renderSummary();
      return;
    }
    $("#emptyState").hidden = true;

    list.forEach((a, i) => {
      const acked = isAck(a);
      const card = document.createElement("div");
      card.className = "alert-card " + a.type + (acked ? "" : " unread");
      card.style.animationDelay = (i * 0.03) + "s";
      card.innerHTML = `
        <div class="a-icon ${a.type}">${svg(ICONS[a.type] || ICONS.info)}</div>
        <div class="a-body">
          <div class="a-title">${a.title} <span class="badge ${a.type}">${a.type === "danger" ? "Critical" : a.type}</span></div>
          <div class="a-msg"></div>
          <div class="a-meta">
            ${a.machineId ? `<span class="a-chip">${a.machineId}</span>` : ""}
            <span>${a.time}</span>
          </div>
        </div>
        <div class="a-action"></div>`;
      // XSS-safe message
      card.querySelector(".a-msg").textContent = a.message;

      const action = card.querySelector(".a-action");
      if (acked) {
        action.innerHTML = `<span class="ack-done">${svg('<path d="M20 6 9 17l-5-5"/>')}Acknowledged</span>`;
      } else {
        const btn = document.createElement("button");
        btn.className = "ack-btn";
        btn.textContent = "Acknowledge";
        btn.addEventListener("click", () => {
          ackSet.add(a.id);
          saveAck(ackSet);
          render();
          updateNavBadges();
        });
        action.appendChild(btn);
      }
      wrap.appendChild(card);
    });

    renderSummary();
  }

  /* ---------- Keep sidebar/topbar badges in sync ---------- */
  function updateNavBadges() {
    const unack = ALERTS.filter((a) => !isAck(a)).length;
    document.querySelectorAll('.nav-item[data-key="alerts"] .nav-badge, .dot-badge').forEach((b) => {
      b.textContent = unack;
      b.style.display = unack ? "" : "none";
    });
  }

  /* ---------- Events ---------- */
  $("#filterPills").addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    document.querySelectorAll("#filterPills .pill").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    render();
  });

  $("#markAllBtn").addEventListener("click", () => {
    ALERTS.forEach((a) => ackSet.add(a.id));
    saveAck(ackSet);
    render();
    updateNavBadges();
  });

  document.addEventListener("DOMContentLoaded", () => {
    render();
    // Give the injected sidebar a moment, then sync its badge.
    setTimeout(updateNavBadges, 60);
  });
})();
