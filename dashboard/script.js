/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Dashboard Page — JavaScript
   - Data-driven rendering (KPIs, quick actions, recent table)
   - Chart.js: Production Trend (line) + Machine Status (doughnut)
   - Live clock + current shift, responsive sidebar
   Replace DUMMY_DATA with live API responses in the build phase.
   ================================================================= */

(function () {
  "use strict";

  /* =================================================================
     1. DUMMY DATA  (swap for real API data later)
     ================================================================= */
  const D = window.MILL_DATA;
  const _mCount = D ? D.machines.length : 0;
  const DUMMY_DATA = {
    kpis: [
      { key: "today",   label: "Today's Production",   value: D ? D.dashboardStats.todaysProduction.toLocaleString() : "0", unit: "t",            delta: "+6.4%",  dir: "up",   color: "blue",
        icon: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' },
      { key: "month",   label: "Monthly Production",   value: D ? D.dashboardStats.monthlyProduction.toLocaleString() : "0", unit: "t",           delta: "+3.1%",  dir: "up",   color: "cyan",
        icon: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>' },
      { key: "oee",     label: "Average OEE",          value: D ? String(D.dashboardStats.averageOEE) : "0", unit: "%",            delta: "+1.8%",  dir: "up",   color: "violet",
        icon: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="m12 12 4-4"/><circle cx="12" cy="12" r="1.6"/>' },
      { key: "running", label: "Running Machines",     value: D ? String(D.dashboardStats.runningMachines) : "0", unit: "/ " + _mCount, delta: "Live",   dir: "flat", color: "green",
        icon: '<path d="M2 20h20"/><path d="M4 20V8l5 3V8l5 3V8l5 3v9"/>' },
      { key: "maint",   label: "Maintenance Machines", value: D ? String(D.dashboardStats.underMaintenance) : "0", unit: "",            delta: "active", dir: "flat", color: "amber",
        icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>' },
      { key: "downtime",label: "Downtime Hours",       value: D ? (D.dashboardStats.totalDowntime / 60).toFixed(1) : "0", unit: "h",     delta: "today",  dir: "flat", color: "red",
        icon: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>' }
    ],

    productionTrend: (function () {
      if (!D) return { labels: [], output: [], target: [] };
      const t = D.charts.productionTrend;
      const labels = t.labels.slice(-7), output = t.data.slice(-7);
      const tgt = Math.round(D.dashboardStats.monthlyProduction / 30);
      return { labels: labels, output: output, target: labels.map(() => tgt) };
    })(),

    machineStatus: (function () {
      if (!D) return [];
      const c = D.charts.machineStatus;
      return c.labels.map((l, i) => ({ label: l, count: c.data[i], color: c.colors[i] }));
    })(),

    quickActions: [
      { title: "Add Production", subtitle: "New record",      color: "#2563eb",
        icon: '<path d="M5 12h14"/><path d="M12 5v14"/>' },
      { title: "Log Downtime",   subtitle: "Report a stop",   color: "#dc2626",
        icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2 2"/>' },
      { title: "Maintenance",    subtitle: "Schedule job",    color: "#0ea5e9",
        icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>' },
      { title: "Generate Report",subtitle: "Export data",     color: "#16a34a",
        icon: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>' }
    ],

    recentProduction: (function () {
      if (!D) return [];
      return D.productionRecords.slice(-7).reverse().map((p) => ({
        date: p.date,
        machine: p.machineId,
        shift: p.shift,
        output: p.productionQty,
        grade: p.paperGrade,
        efficiency: p.efficiency,
        status: p.status === "Stopped" ? "stopped" : "running"
      }));
    })()
  };

  /* =================================================================
     2. SMALL HELPERS
     ================================================================= */
  const $  = (sel) => document.querySelector(sel);
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  const deltaArrow = (dir) =>
    dir === "up"   ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>'
  : dir === "down" ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
  : "";

  const statusLabel = { running: "Running", idle: "Idle", stopped: "Stopped", maintenance: "Maintenance" };

  /* =================================================================
     3. RENDER — KPI CARDS
     ================================================================= */
  function renderKpis() {
    const grid = $("#kpiGrid");
    DUMMY_DATA.kpis.forEach((k, i) => {
      const card = el("article", "kpi-card");
      card.style.animationDelay = (i * 0.06) + "s";
      card.innerHTML = `
        <div class="kpi-top">
          <div class="kpi-icon ${k.color}">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${k.icon}</svg>
          </div>
          <span class="kpi-delta ${k.dir}">${deltaArrow(k.dir)}${k.delta}</span>
        </div>
        <div class="kpi-value">${k.value} <small>${k.unit}</small></div>
        <div class="kpi-label">${k.label}</div>`;
      grid.appendChild(card);
    });
  }

  /* =================================================================
     4. RENDER — QUICK ACTIONS
     ================================================================= */
  function renderActions() {
    const grid = $("#actionsGrid");
    DUMMY_DATA.quickActions.forEach((a) => {
      const btn = el("button", "action-btn");
      btn.innerHTML = `
        <span class="a-icon" style="background:${a.color}">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${a.icon}</svg>
        </span>
        <span class="a-text"><strong>${a.title}</strong><span>${a.subtitle}</span></span>`;
      btn.addEventListener("click", () => {
        console.log(`[Quick Action] "${a.title}" clicked — wire to its page/modal.`);
      });
      grid.appendChild(btn);
    });
  }

  /* =================================================================
     5. RENDER — RECENT PRODUCTION TABLE
     ================================================================= */
  function renderTable() {
    const body = $("#recentTableBody");
    DUMMY_DATA.recentProduction.forEach((r) => {
      const tr = el("tr");
      tr.innerHTML = `
        <td>${r.date}</td>
        <td class="machine-tag">${r.machine}</td>
        <td>${r.shift}</td>
        <td class="num">${r.output.toFixed(1)}</td>
        <td>${r.grade}</td>
        <td class="num">${r.efficiency == null ? "—" : r.efficiency + "%"}</td>
        <td><span class="badge ${r.status}"><span class="dot"></span>${statusLabel[r.status]}</span></td>`;
      body.appendChild(tr);
    });
  }

  /* =================================================================
     6. RENDER — STATUS LEGEND (for doughnut)
     ================================================================= */
  function renderStatusLegend() {
    const list = $("#statusLegend");
    DUMMY_DATA.machineStatus.forEach((s) => {
      const li = el("li");
      li.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.label}
                      <span class="count">${s.count}</span>`;
      list.appendChild(li);
    });
  }

  /* =================================================================
     7. CHARTS (Chart.js)
     ================================================================= */
  function buildCharts() {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js not loaded — charts skipped.");
      return;
    }

    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    Chart.defaults.color = "#64748b";

    /* --- Production Trend (line + area) --- */
    const trendCtx = $("#productionTrendChart").getContext("2d");
    const gradient = trendCtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(37, 99, 235, 0.22)");
    gradient.addColorStop(1, "rgba(37, 99, 235, 0)");

    new Chart(trendCtx, {
      type: "line",
      data: {
        labels: DUMMY_DATA.productionTrend.labels,
        datasets: [
          {
            label: "Output (t)",
            data: DUMMY_DATA.productionTrend.output,
            borderColor: "#2563eb",
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#2563eb",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Target (t)",
            data: DUMMY_DATA.productionTrend.target,
            borderColor: "#94a3b8",
            borderWidth: 1.5,
            borderDash: [6, 6],
            fill: false,
            tension: 0,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0f2a47",
            padding: 12,
            cornerRadius: 8,
            titleColor: "#fff",
            bodyColor: "#cbd5e1",
            callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y} t` }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: "#eef2f7" },
            ticks: { callback: (v) => v + " t" }
          },
          x: { grid: { display: false } }
        }
      }
    });

    /* --- Machine Status (doughnut) with centre total --- */
    const total = DUMMY_DATA.machineStatus.reduce((s, m) => s + m.count, 0);
    const centerText = {
      id: "centerText",
      afterDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta.data.length) return;
        const { x, y } = meta.data[0];
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#0f172a";
        ctx.font = "700 26px Inter, sans-serif";
        ctx.fillText(total, x, y - 6);
        ctx.fillStyle = "#64748b";
        ctx.font = "500 12px Inter, sans-serif";
        ctx.fillText("Machines", x, y + 16);
        ctx.restore();
      }
    };

    new Chart($("#machineStatusChart").getContext("2d"), {
      type: "doughnut",
      data: {
        labels: DUMMY_DATA.machineStatus.map((m) => m.label),
        datasets: [{
          data: DUMMY_DATA.machineStatus.map((m) => m.count),
          backgroundColor: DUMMY_DATA.machineStatus.map((m) => m.color),
          borderColor: "#fff",
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0f2a47",
            padding: 10,
            cornerRadius: 8,
            callbacks: { label: (c) => ` ${c.label}: ${c.parsed} machine(s)` }
          }
        }
      },
      plugins: [centerText]
    });
  }

  /* =================================================================
     8. LIVE CLOCK + CURRENT SHIFT
     ================================================================= */
  function getShift(hour) {
    if (hour >= 6 && hour < 14) return "A";
    if (hour >= 14 && hour < 22) return "B";
    return "C";
  }
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    $("#clock").textContent = `${hh}:${mm}`;
    $("#shiftLabel").textContent = "Shift " + getShift(now.getHours());
  }

  /* Auto-refresh live data from the backend stream (FR-16) */
  function connectLiveDashboard() {
    const token = localStorage.getItem("smm_token");
    const effEl = $("#liveEff");
    if (typeof EventSource === "undefined" || location.protocol === "file:" || !token) {
      if (effEl) effEl.textContent = "offline";
      return;
    }
    const es = new EventSource("/api/stream?token=" + encodeURIComponent(token));
    es.onmessage = (e) => {
      let readings;
      try { readings = JSON.parse(e.data); } catch (_) { return; }
      if (!readings.length) return;
      const avg = Math.round(readings.reduce((s, r) => s + r.efficiency, 0) / readings.length);
      if (effEl) effEl.textContent = avg + "% eff";
      const clk = $("#clock");
      if (clk) clk.textContent = new Date().toLocaleTimeString([], { hour12: false });
    };
    es.onerror = () => { if (effEl) effEl.textContent = "reconnecting…"; };
  }

  /* =================================================================
     9. RESPONSIVE SIDEBAR
     ================================================================= */
  function initSidebar() {
    const sidebar = $("#sidebar");
    const overlay = $("#overlay");
    const open  = () => { sidebar.classList.add("open"); overlay.classList.add("show"); };
    const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); };

    $("#menuBtn").addEventListener("click", open);
    $("#sidebarClose").addEventListener("click", close);
    overlay.addEventListener("click", close);

    // Close drawer when a nav link is tapped on mobile
    sidebar.querySelectorAll(".nav-item").forEach((item) =>
      item.addEventListener("click", () => { if (window.innerWidth <= 1024) close(); })
    );
  }

  /* =================================================================
     10. LIVE DATA — recompute KPIs / charts / table from the API
     ================================================================= */
  const ymd = (dt) => dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");

  function setKpi(key, value, unit) {
    const k = DUMMY_DATA.kpis.find((x) => x.key === key);
    if (k) { k.value = value; if (unit !== undefined) k.unit = unit; }
  }

  function applyLiveData(prod, machines, downtime) {
    // ---- machine status counts + doughnut ----
    const statusColor = { Running: "#16a34a", Idle: "#f59e0b", Maintenance: "#dc2626", Stopped: "#64748b" };
    const order = ["Running", "Idle", "Maintenance", "Stopped"];
    const counts = {};
    machines.forEach((m) => { const s = m.status || "Idle"; counts[s] = (counts[s] || 0) + 1; });
    DUMMY_DATA.machineStatus = order.filter((s) => counts[s]).map((s) => ({ label: s, count: counts[s], color: statusColor[s] || "#94a3b8" }));

    // ---- production aggregates (anchored to the latest record date) ----
    let maxDate = "";
    prod.forEach((p) => { if (p.date && p.date > maxDate) maxDate = p.date; });
    const ym = maxDate.slice(0, 7);
    let today = 0, month = 0;
    prod.forEach((p) => {
      const q = Number(p.quantity) || 0;
      if (p.date === maxDate) today += q;
      if (p.date && p.date.slice(0, 7) === ym) month += q;
    });

    // ---- downtime on the latest day (minutes) ----
    let dtToday = 0;
    downtime.forEach((d) => { if (d.date === maxDate) dtToday += Number(d.duration_min) || 0; });

    // ---- KPI values (icons / deltas preserved; OEE stays the seeded analytic) ----
    setKpi("today", Math.round(today).toLocaleString(), "t");
    setKpi("month", Math.round(month).toLocaleString(), "t");
    setKpi("running", String(counts.Running || 0), "/ " + machines.length);
    setKpi("maint", String(counts.Maintenance || 0), "");
    setKpi("downtime", (dtToday / 60).toFixed(1), "h");

    // ---- production trend (7 days ending at the latest record) ----
    const mp = maxDate.split("-").map(Number);
    const days = [], byDate = {};
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(mp[0], mp[1] - 1, mp[2]); dt.setDate(dt.getDate() - i);
      const s = ymd(dt); days.push(s); byDate[s] = 0;
    }
    prod.forEach((p) => { if (byDate[p.date] !== undefined) byDate[p.date] += Number(p.quantity) || 0; });
    const tgt = Math.round(month / 30) || 0;
    DUMMY_DATA.productionTrend = {
      labels: days.map((s) => s.slice(5)),
      output: days.map((s) => +byDate[s].toFixed(1)),
      target: days.map(() => tgt)
    };

    // ---- recent production table (latest 7 entries; status joined from machines) ----
    const statusByMachine = {};
    machines.forEach((m) => { statusByMachine[m.machine_id] = (m.status || "").toLowerCase(); });
    DUMMY_DATA.recentProduction = prod.slice().sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 7).map((p) => ({
      date: p.date, machine: p.machine, shift: p.shift,
      output: Number(p.quantity) || 0, grade: p.grade || "—",
      efficiency: null, status: statusByMachine[p.machine] || "running"
    }));
  }

  function loadLiveDashboard() {
    if (typeof window.smmApi !== "function") return Promise.resolve();   // static / file:// mode
    return Promise.all([
      smmApi("/api/production").then((r) => (r.ok ? r.json() : Promise.reject(new Error("prod")))),
      smmApi("/api/machines").then((r) => (r.ok ? r.json() : Promise.reject(new Error("mach")))),
      smmApi("/api/downtime").then((r) => (r.ok ? r.json() : []))
    ]).then(function (res) {
      const prod = res[0], machines = res[1];
      const downtime = Array.isArray(res[2]) ? res[2] : [];
      if (Array.isArray(prod) && prod.length && Array.isArray(machines) && machines.length) {
        applyLiveData(prod, machines, downtime);
      }
    }).catch(function () { /* keep the seeded fallback */ });
  }

  function renderDataDriven() {
    renderKpis();
    renderTable();
    renderStatusLegend();
    buildCharts();
  }

  /* =================================================================
     11. INIT
     ================================================================= */
  document.addEventListener("DOMContentLoaded", function () {
    renderActions();                     // static quick actions
    initSidebar();
    updateClock();
    setInterval(updateClock, 1000 * 30); // refresh clock every 30s
    connectLiveDashboard();              // live efficiency feed (SSE)
    loadLiveDashboard().then(renderDataDriven);   // KPIs/charts/table: live API, else seeded
  });
})();
