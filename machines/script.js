/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Machine Monitoring Page — JavaScript
   - Renders machine cards from sample data
   - Search + status filters
   - Summary chips + subtle live metric updates
   Replace SAMPLE_MACHINES with live API/sensor data later.
   ================================================================= */

(function () {
  "use strict";

  /* =================================================================
     1. SAMPLE DATA  (swap for live sensor/API data)
     status: "running" | "idle" | "maintenance"
     ================================================================= */
  // Sourced from the canonical dataset (data/dummyData.js)
  const SAMPLE_MACHINES = (window.MILL_DATA ? MILL_DATA.machines : []).map((m) => ({
    id: m.id,
    name: m.name,
    stage: m.department,
    status: m.status.toLowerCase(),     // running | idle | maintenance
    temp: m.temperature,
    hours: m.runningHours,
    efficiency: m.efficiency,
    capacity: m.capacity
  }));

  const STATUS_LABEL = { running: "Running", idle: "Idle", maintenance: "Maintenance", stopped: "Stopped" };

  /* ---------- State ---------- */
  let activeFilter = "all";
  const liveRefs = {}; // id -> { tempEl, effVal, effBar } for in-place live updates

  /* ---------- Refs ---------- */
  const $ = (s) => document.querySelector(s);
  const grid        = $("#machineGrid");
  const summaryBar  = $("#summaryBar");
  const searchInput = $("#searchInput");
  const emptyState  = $("#emptyState");
  const lastUpdated = $("#lastUpdated");

  /* ---------- SVG icons ---------- */
  const ICONS = {
    machine: '<path d="M2 20h20"/><path d="M4 20V8l5 3V8l5 3V8l5 3v9"/><path d="M9 20v-4h2v4"/>',
    thermo:  '<path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
    clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    box:     '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3.3 7 8.7 5 8.7-5"/>',
    layers:  '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    pause:   '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    wrench:  '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
    stop:    '<rect x="5" y="5" width="14" height="14" rx="2"/>'
  };
  const svg = (path, size = 20) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

  /* ---------- Helpers ---------- */
  const tempClass = (t) => (t >= 88 ? "temp-high" : t >= 82 ? "temp-warn" : "");
  const effClass  = (e, status) => status !== "running" ? "off" : e >= 85 ? "good" : e >= 70 ? "mid" : "low";
  const statusIcon = (status) => status === "running" ? ICONS.machine
                               : status === "idle" ? ICONS.pause
                               : status === "stopped" ? ICONS.stop
                               : ICONS.wrench;

  /* =================================================================
     2. SUMMARY CHIPS
     ================================================================= */
  function renderSummary() {
    const counts = { total: SAMPLE_MACHINES.length, running: 0, idle: 0, maintenance: 0 };
    SAMPLE_MACHINES.forEach((m) => counts[m.status]++);

    const chips = [
      { key: "total",       label: "Total Machines", value: counts.total,       icon: ICONS.layers },
      { key: "running",     label: "Running",        value: counts.running,     icon: ICONS.machine },
      { key: "idle",        label: "Idle",           value: counts.idle,        icon: ICONS.pause },
      { key: "maintenance", label: "Maintenance",    value: counts.maintenance, icon: ICONS.wrench }
    ];

    summaryBar.innerHTML = chips.map((c) => `
      <div class="summary-chip">
        <div class="s-icon ${c.key}">${svg(c.icon, 22)}</div>
        <div class="s-meta">
          <span class="s-value">${c.value}</span>
          <span class="s-label">${c.label}</span>
        </div>
      </div>`).join("");
  }

  /* =================================================================
     3. RENDER MACHINE CARDS  (applies search + filter)
     ================================================================= */
  function render() {
    const term = searchInput.value.trim().toLowerCase();

    const list = SAMPLE_MACHINES.filter((m) => {
      const matchesFilter = activeFilter === "all" || m.status === activeFilter;
      const matchesSearch = (m.id + " " + m.name + " " + m.stage).toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });

    grid.innerHTML = "";
    for (const k in liveRefs) delete liveRefs[k];

    if (list.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    list.forEach((m, i) => {
      const card = document.createElement("article");
      card.className = "machine-card status-" + m.status;
      card.style.animationDelay = (i * 0.04) + "s";

      const effDisplay = m.status === "running" ? m.efficiency + "%" : "—";

      card.innerHTML = `
        <div class="mc-accent"></div>
        <div class="mc-head">
          <div class="mc-icon">${svg(statusIcon(m.status), 22)}</div>
          <div class="mc-title">
            <h3>${m.name}</h3>
            <span class="mc-id">${m.id} · ${m.stage}</span>
          </div>
          <span class="status-badge ${m.status}"><span class="dot"></span>${STATUS_LABEL[m.status]}</span>
        </div>

        <div class="mc-metrics">
          <div class="metric">
            <span class="metric-label">${svg(ICONS.thermo, 13)} Temp</span>
            <span class="metric-value ${tempClass(m.temp)}" data-temp>${m.temp}<small>°C</small></span>
          </div>
          <div class="metric">
            <span class="metric-label">${svg(ICONS.clock, 13)} Hours</span>
            <span class="metric-value">${m.hours.toLocaleString()}<small> h</small></span>
          </div>
          <div class="metric">
            <span class="metric-label">${svg(ICONS.box, 13)} Capacity</span>
            <span class="metric-value">${m.capacity}<small> t/d</small></span>
          </div>
        </div>

        <div class="mc-eff">
          <div class="eff-row"><span>Efficiency</span><strong data-eff-val>${effDisplay}</strong></div>
          <div class="eff-bar"><span class="${effClass(m.efficiency, m.status)}" data-eff-bar style="width:${m.status === "running" ? m.efficiency : 0}%"></span></div>
        </div>`;

      grid.appendChild(card);

      // store refs for live updates (running machines only)
      if (m.status === "running") {
        liveRefs[m.id] = {
          tempEl: card.querySelector("[data-temp]"),
          effVal: card.querySelector("[data-eff-val]"),
          effBar: card.querySelector("[data-eff-bar]")
        };
      }
    });
  }

  /* =================================================================
     4. LIVE UPDATES — subscribe to readings pushed by the backend (SSE)
     ================================================================= */
  function connectLive() {
    const token = localStorage.getItem("smm_token");
    if (typeof EventSource === "undefined" || location.protocol === "file:" || !token) {
      lastUpdated.textContent = "offline";   // static mode: no backend stream
      return;
    }
    const es = new EventSource("/api/stream?token=" + encodeURIComponent(token));
    es.onmessage = (e) => {
      let readings;
      try { readings = JSON.parse(e.data); } catch (_) { return; }
      readings.forEach((u) => {
        const m = SAMPLE_MACHINES.find((x) => x.id === u.id);
        if (m && m.status === "running") { m.temp = u.temperature; m.efficiency = u.efficiency; }
        const ref = liveRefs[u.id];
        if (!ref) return;   // only running cards have live refs
        ref.tempEl.innerHTML = `${u.temperature}<small>°C</small>`;
        ref.tempEl.className = "metric-value " + tempClass(u.temperature);
        ref.effVal.textContent = u.efficiency + "%";
        ref.effBar.style.width = u.efficiency + "%";
        ref.effBar.className = effClass(u.efficiency, "running");
        ref.tempEl.classList.add("flash");
        setTimeout(() => ref.tempEl.classList.remove("flash"), 600);
      });
      stampTime();
    };
    es.onerror = () => { lastUpdated.textContent = "reconnecting…"; };
  }

  function stampTime() {
    lastUpdated.textContent = new Date().toLocaleTimeString([], { hour12: false });
  }

  /* =================================================================
     5. EVENTS
     ================================================================= */
  searchInput.addEventListener("input", render);

  $("#filterPills").addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    render();
  });

  /* Sidebar (responsive) */
  function initSidebar() {
    const sidebar = $("#sidebar");
    const overlay = $("#overlay");
    $("#menuBtn").addEventListener("click", () => { sidebar.classList.add("open"); overlay.classList.add("show"); });
    const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); };
    $("#sidebarClose").addEventListener("click", close);
    overlay.addEventListener("click", close);
  }

  /* =================================================================
     6. INIT
     ================================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    renderSummary();
    render();
    initSidebar();
    connectLive();   // live machine telemetry streamed from the backend (SSE)
  });
})();
