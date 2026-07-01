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

  // Seeded fallback; replaced with live, threshold-driven alerts when the backend is reachable.
  let ALERTS = (window.MILL_DATA && MILL_DATA.alerts) ? MILL_DATA.alerts : [];
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

  /* ---------- LIVE alerts: derive from API data vs. thresholds ---------- */
  function fmtTime(s) {
    if (!s) return "";
    const p = String(s).split("-");
    if (p.length !== 3) return s;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return p[2] + " " + (months[+p[1] - 1] || "") + " " + p[0];
  }

  function deriveLiveAlerts(prod, thr, downtime) {
    const gMin = +thr.gsm_min || 45, gMax = +thr.gsm_max || 120;
    const mMax = +thr.moisture_max || 6.5, dMax = +thr.downtime_max || 60;
    const out = [];
    (prod || []).forEach((p) => {
      const mc = p.machine || "";
      if (p.gsm != null && (p.gsm < gMin || p.gsm > gMax)) {
        out.push({ id: "gsm-" + p.id, type: "danger", title: "GSM out of specification",
          message: mc + ": GSM " + p.gsm + " is outside the " + gMin + "–" + gMax + " gsm range (grade " + (p.grade || "—") + ").",
          machineId: mc, time: fmtTime(p.date), _sort: p.date || "" });
      }
      if (p.moisture != null && p.moisture > mMax) {
        out.push({ id: "moist-" + p.id, type: "warning", title: "High moisture content",
          message: mc + ": moisture " + p.moisture + "% exceeds the " + mMax + "% maximum.",
          machineId: mc, time: fmtTime(p.date), _sort: p.date || "" });
      }
    });
    (downtime || []).forEach((d) => {
      if (d.duration_min != null && d.duration_min > dMax) {
        out.push({ id: "dt-" + d.id, type: "warning", title: "Extended downtime",
          message: (d.machine || "") + ": " + d.duration_min + " min of downtime (" + (d.reason || "unplanned") + ") exceeds the " + dMax + "-min threshold.",
          machineId: d.machine || "", time: fmtTime(d.date), _sort: d.date || "" });
      }
    });
    out.sort((a, b) => (a._sort < b._sort ? 1 : a._sort > b._sort ? -1 : 0));
    return out;
  }

  function loadLiveAlerts() {
    if (typeof window.smmApi !== "function") return;   // static / file:// mode
    Promise.all([
      smmApi("/api/production").then((r) => (r.ok ? r.json() : [])),
      smmApi("/api/thresholds").then((r) => (r.ok ? r.json() : {})),
      smmApi("/api/downtime").then((r) => (r.ok ? r.json() : []))
    ]).then(function (res) {
      const prod = res[0], thr = res[1] || {}, downtime = res[2];
      if (!Array.isArray(prod)) return;   // not authenticated / unexpected
      ALERTS = deriveLiveAlerts(prod, thr, Array.isArray(downtime) ? downtime : []);
      render();
      updateNavBadges();
    }).catch(function () { /* keep the seeded fallback already on screen */ });
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();              // seeded fallback first, so the page renders instantly
    loadLiveAlerts();      // then replace with live, threshold-driven alerts
    // Give the injected sidebar a moment, then sync its badge.
    setTimeout(updateNavBadges, 60);
  });
})();
