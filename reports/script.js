/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Reports & Analytics Page — JavaScript
   - Summary cards + 5 Chart.js charts
     (Daily, Weekly, Monthly, Machine Utilization, Downtime)
   - Period tabs + "Export as PDF" (UI → browser print-to-PDF)
   Replace REPORT_DATA with live API data later.
   ================================================================= */

(function () {
  "use strict";

  /* =================================================================
     1. DUMMY REPORT DATA  (swap for live API data)
     ================================================================= */
  // Derived from the canonical dataset (data/dummyData.js), preserving this page's shape.
  const REPORT_DATA = (function () {
    const D = window.MILL_DATA;
    const dtColors = ["#2563eb", "#0ea5e9", "#f59e0b", "#94a3b8", "#dc2626", "#16a34a"];
    if (!D) {
      return { summary: [], daily: { labels: [], data: [] }, weekly: { labels: [], data: [] },
               monthly: { labels: [], data: [] }, utilization: { labels: [], data: [] }, downtime: [] };
    }
    const s = D.dashboardStats;
    const trend = D.charts.productionTrend;

    // Weekly buckets from the last 28 days
    const weekly = { labels: [], data: [] };
    const days = D.reports.last30DaysProduction.slice(-28);
    for (let w = 0; w < 4; w++) {
      const chunk = days.slice(w * 7, w * 7 + 7);
      weekly.labels.push("W" + (w + 1));
      weekly.data.push(+chunk.reduce((a, b) => a + b.production, 0).toFixed(0));
    }

    return {
      summary: [
        { label: "Total Production", key: "total", value: s.monthlyProduction.toLocaleString(), unit: "t", delta: "+3.1%", dir: "up", color: "blue",
          icon: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' },
        { label: "Avg Daily Output", key: "avg", value: Math.round(s.monthlyProduction / 30).toString(), unit: "t", delta: "+6.4%", dir: "up", color: "green",
          icon: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>' },
        { label: "Plant OEE", value: s.averageOEE.toString(), unit: "%", delta: "+1.8%", dir: "up", color: "violet",
          icon: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="m12 12 4-4"/><circle cx="12" cy="12" r="1.6"/>' },
        { label: "Avg Efficiency", value: s.averageEfficiency.toString(), unit: "%", delta: "+2.0%", dir: "up", color: "cyan",
          icon: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 12 21 3"/><path d="M12 12V3"/>' },
        { label: "Total Downtime", value: (s.totalDowntime / 60).toFixed(1), unit: "h", delta: "-4.2 h", dir: "down", color: "red",
          icon: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>' }
      ],
      daily:   { labels: trend.labels.slice(-7), data: trend.data.slice(-7) },
      weekly:  weekly,
      monthly: { labels: D.charts.monthlyProduction.labels, data: D.charts.monthlyProduction.data },
      utilization: {
        labels: D.reports.machineUtilization.map((m) => m.machineId),
        data:   D.reports.machineUtilization.map((m) => m.utilization)
      },
      downtime: D.reports.downtimeAnalysis.map((d, i) => ({
        reason: d.reason, hours: +(d.minutes / 60).toFixed(1), color: dtColors[i % dtColors.length]
      })),
      oee: { labels: D.charts.oee.labels, data: D.charts.oee.data }
    };
  })();

  const $ = (s) => document.querySelector(s);

  /* =================================================================
     1b. RAW RECORDS + WORKING FILTERS (period / machine / shift)
     The Daily view + summary are computed from the LIVE API (/api/production),
     falling back to the seeded dataset when the backend is unavailable.
     ================================================================= */
  let RECORDS = (window.MILL_DATA && MILL_DATA.productionRecords) ? MILL_DATA.productionRecords : [];
  const asofParts = ((window.MILL_DATA && MILL_DATA.meta && MILL_DATA.meta.asOfDate) || "2026-06-16").split("-").map(Number);
  let ASOF = new Date(asofParts[0], asofParts[1] - 1, asofParts[2]);
  const filterState = { days: 7, machine: "all", shift: "all" };

  const ymd = (dt) =>
    dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");

  function computeDaily() {
    const dates = [], byDate = {};
    for (let i = filterState.days - 1; i >= 0; i--) {
      const dt = new Date(ASOF); dt.setDate(dt.getDate() - i);
      const s = ymd(dt); dates.push(s); byDate[s] = 0;
    }
    RECORDS.forEach((r) => {
      if (byDate[r.date] === undefined) return;
      if (filterState.machine !== "all" && r.machineId !== filterState.machine) return;
      if (filterState.shift !== "all" && r.shift !== filterState.shift) return;
      byDate[r.date] += r.productionQty;
    });
    const data = dates.map((s) => +byDate[s].toFixed(1));
    const total = +data.reduce((a, b) => a + b, 0).toFixed(1);
    const avg = data.length ? +(total / data.length).toFixed(1) : 0;
    return { dates: dates, labels: dates.map((s) => s.slice(5)), data: data, total: total, avg: avg };
  }

  function applyFilters() {
    const f = computeDaily();
    if (charts.daily) {
      charts.daily.data.labels = f.labels;
      charts.daily.data.datasets[0].data = f.data;
      charts.daily.update();
    }
    const totalNum = document.querySelector('[data-kpi="total"] .kpi-num');
    const avgNum = document.querySelector('[data-kpi="avg"] .kpi-num');
    if (totalNum) totalNum.textContent = f.total.toLocaleString();
    if (avgNum) avgNum.textContent = f.avg.toLocaleString();
    const sub = $("#dailySub");
    if (sub) {
      const mc = filterState.machine === "all" ? "all machines" : filterState.machine;
      const sh = filterState.shift === "all" ? "all shifts" : filterState.shift + " shift";
      sub.textContent = "Last " + filterState.days + " days · " + mc + " · " + sh;
    }
  }

  /* ---------- CSV export ---------- */
  function toCsv(rows) {
    return rows.map((r) => r.map((c) => {
      const s = String(c == null ? "" : c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\n");
  }
  function downloadCsv(name, rows) {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }
  function chartCsvRows(name) {
    switch (name) {
      case "Daily Production": { const f = computeDaily(); return [["Date", "Output (t)"]].concat(f.dates.map((d, i) => [d, f.data[i]])); }
      case "Weekly Production": return [["Week", "Output (t)"]].concat(REPORT_DATA.weekly.labels.map((l, i) => [l, REPORT_DATA.weekly.data[i]]));
      case "Monthly Production": return [["Month", "Output (t)"]].concat(REPORT_DATA.monthly.labels.map((l, i) => [l, REPORT_DATA.monthly.data[i]]));
      case "Machine Utilization": return [["Machine", "Utilization (%)"]].concat(REPORT_DATA.utilization.labels.map((l, i) => [l, REPORT_DATA.utilization.data[i]]));
      case "OEE by Machine": return [["Machine", "OEE (%)"]].concat(REPORT_DATA.oee.labels.map((l, i) => [l, REPORT_DATA.oee.data[i]]));
      case "Downtime": return [["Reason", "Hours"]].concat(REPORT_DATA.downtime.map((d) => [d.reason, d.hours]));
      default: return null;
    }
  }
  function exportFullCsv() {
    const D = window.MILL_DATA;
    const f = computeDaily();
    let rows = [["Smart Paper Mill — Production Report"],
                ["Generated", new Date().toISOString().slice(0, 10),
                 "Period (days)", filterState.days, "Machine", filterState.machine, "Shift", filterState.shift], []];
    rows = rows.concat([["Daily Production (filtered)"], ["Date", "Output (t)"]], f.dates.map((d, i) => [d, f.data[i]]), [[]]);
    if (D) {
      rows = rows.concat([["Machine OEE (%)"], ["Machine", "OEE"]], D.reports.machineOEE.map((m) => [m.machineId, m.oee]), [[]]);
      rows = rows.concat([["Production by Grade (t)"], ["Grade", "Production"]], D.reports.productionByGrade.map((g) => [g.grade, g.production]), [[]]);
      rows = rows.concat([["Shift-wise Production (t)"], ["Shift", "Production"]], D.reports.shiftWise.map((sd) => [sd.shift, sd.production]), [[]]);
      rows = rows.concat([["Downtime by Reason (min)"], ["Reason", "Minutes"]], D.reports.downtimeAnalysis.map((x) => [x.reason, x.minutes]));
    }
    downloadCsv("satia-production-report.csv", rows);
  }

  /* =================================================================
     2. SUMMARY CARDS
     ================================================================= */
  function renderSummary() {
    const grid = $("#kpiGrid");
    const arrow = (dir) => dir === "up"
      ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>'
      : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

    grid.innerHTML = REPORT_DATA.summary.map((k) => `
      <article class="kpi-card"${k.key ? ` data-kpi="${k.key}"` : ""}>
        <div class="kpi-top">
          <div class="kpi-icon ${k.color}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${k.icon}</svg></div>
          <span class="kpi-delta ${k.dir}">${arrow(k.dir)}${k.delta}</span>
        </div>
        <div class="kpi-value"><span class="kpi-num">${k.value}</span> <small>${k.unit}</small></div>
        <div class="kpi-label">${k.label}</div>
      </article>`).join("");
  }

  /* =================================================================
     3. CHARTS
     ================================================================= */
  const charts = {};
  const tooltipStyle = { backgroundColor: "#0f2a47", padding: 11, cornerRadius: 8, titleColor: "#fff", bodyColor: "#cbd5e1" };
  const axisGrid = { color: "#eef2f7" };

  function makeGradient(ctx, hex) {
    const g = ctx.createLinearGradient(0, 0, 0, 280);
    g.addColorStop(0, hex + "38");
    g.addColorStop(1, hex + "00");
    return g;
  }

  function buildCharts() {
    if (typeof Chart === "undefined") { console.warn("Chart.js not loaded."); return; }
    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    Chart.defaults.color = "#64748b";

    /* --- Daily Production (bar) --- */
    charts.daily = new Chart($("#dailyChart"), {
      type: "bar",
      data: { labels: REPORT_DATA.daily.labels, datasets: [{
        label: "Output (t)", data: REPORT_DATA.daily.data,
        backgroundColor: "#2563eb", borderRadius: 6, maxBarThickness: 38
      }]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltipStyle, callbacks: { label: (c) => ` ${c.parsed.y} t` } } },
        scales: { y: { beginAtZero: false, grid: axisGrid, ticks: { callback: (v) => v + " t" } }, x: { grid: { display: false } } }
      }
    });

    /* --- Weekly Production (bar) --- */
    charts.weekly = new Chart($("#weeklyChart"), {
      type: "bar",
      data: { labels: REPORT_DATA.weekly.labels, datasets: [{
        label: "Output (t)", data: REPORT_DATA.weekly.data,
        backgroundColor: "#0ea5e9", borderRadius: 6, maxBarThickness: 44
      }]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltipStyle, callbacks: { label: (c) => ` ${c.parsed.y} t` } } },
        scales: { y: { grid: axisGrid, ticks: { callback: (v) => v + " t" } }, x: { grid: { display: false } } }
      }
    });

    /* --- Monthly Production (area line) --- */
    const mctx = $("#monthlyChart").getContext("2d");
    charts.monthly = new Chart(mctx, {
      type: "line",
      data: { labels: REPORT_DATA.monthly.labels, datasets: [{
        label: "Output (t)", data: REPORT_DATA.monthly.data,
        borderColor: "#16a34a", backgroundColor: makeGradient(mctx, "#16a34a"),
        borderWidth: 2.5, fill: true, tension: 0.4,
        pointBackgroundColor: "#16a34a", pointBorderColor: "#fff", pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6
      }]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltipStyle, callbacks: { label: (c) => ` ${c.parsed.y} t` } } },
        scales: { y: { grid: axisGrid, ticks: { callback: (v) => v + " t" } }, x: { grid: { display: false } } }
      }
    });

    /* --- Machine Utilization (horizontal bar, colored by value) --- */
    const utilColors = REPORT_DATA.utilization.data.map((v) =>
      v >= 85 ? "#16a34a" : v >= 70 ? "#2563eb" : v >= 50 ? "#f59e0b" : "#dc2626");
    charts.utilization = new Chart($("#utilizationChart"), {
      type: "bar",
      data: { labels: REPORT_DATA.utilization.labels, datasets: [{
        label: "Utilization", data: REPORT_DATA.utilization.data,
        backgroundColor: utilColors, borderRadius: 5, maxBarThickness: 22
      }]},
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltipStyle, callbacks: { label: (c) => ` ${c.parsed.x}% utilized` } } },
        scales: { x: { beginAtZero: true, max: 100, grid: axisGrid, ticks: { callback: (v) => v + "%" } }, y: { grid: { display: false } } }
      }
    });

    /* --- Downtime (doughnut) --- */
    const totalHrs = REPORT_DATA.downtime.reduce((s, d) => s + d.hours, 0);
    const centerText = {
      id: "centerText",
      afterDraw(chart) {
        const { ctx } = chart, meta = chart.getDatasetMeta(0);
        if (!meta.data.length) return;
        const { x, y } = meta.data[0];
        ctx.save();
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#0f172a"; ctx.font = "700 22px Inter, sans-serif";
        ctx.fillText(totalHrs.toFixed(1), x, y - 6);
        ctx.fillStyle = "#64748b"; ctx.font = "500 11px Inter, sans-serif";
        ctx.fillText("Total hrs", x, y + 14);
        ctx.restore();
      }
    };
    charts.downtime = new Chart($("#downtimeChart"), {
      type: "doughnut",
      data: { labels: REPORT_DATA.downtime.map((d) => d.reason), datasets: [{
        data: REPORT_DATA.downtime.map((d) => d.hours),
        backgroundColor: REPORT_DATA.downtime.map((d) => d.color),
        borderColor: "#fff", borderWidth: 3, hoverOffset: 6
      }]},
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "68%",
        plugins: { legend: { display: false }, tooltip: { ...tooltipStyle, callbacks: { label: (c) => ` ${c.label}: ${c.parsed} h` } } }
      },
      plugins: [centerText]
    });

    // Downtime custom legend
    $("#downtimeLegend").innerHTML = REPORT_DATA.downtime.map((d) =>
      `<li><span class="dot" style="background:${d.color}"></span>${d.reason}<span class="val">${d.hours} h</span></li>`).join("");

    /* --- OEE by machine (bar, coloured by value) --- */
    const oeeColors = REPORT_DATA.oee.data.map((v) => v >= 70 ? "#16a34a" : v >= 50 ? "#f59e0b" : "#dc2626");
    charts.oee = new Chart($("#oeeChart"), {
      type: "bar",
      data: { labels: REPORT_DATA.oee.labels, datasets: [{
        label: "OEE", data: REPORT_DATA.oee.data,
        backgroundColor: oeeColors, borderRadius: 6, maxBarThickness: 64
      }]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltipStyle, callbacks: { label: (c) => ` OEE: ${c.parsed.y}%` } } },
        scales: { y: { beginAtZero: true, max: 100, grid: axisGrid, ticks: { callback: (v) => v + "%" } }, x: { grid: { display: false } } }
      }
    });
  }

  /* =================================================================
     4. TOAST
     ================================================================= */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.className = "toast show";
    t.innerHTML = `<span class="t-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg></span><span>${msg}</span>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  }

  /* =================================================================
     5. EVENTS
     ================================================================= */
  // Period tabs — recompute the daily view + summary from the raw records
  $("#periodTabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".ptab");
    if (!tab) return;
    document.querySelectorAll(".ptab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    filterState.days = parseInt(tab.dataset.period, 10) || 30;
    applyFilters();
  });

  // Machine + shift filters
  $("#machineFilter").addEventListener("change", (e) => { filterState.machine = e.target.value; applyFilters(); });
  $("#shiftFilter").addEventListener("change", (e) => { filterState.shift = e.target.value; applyFilters(); });

  // Export full report as CSV
  $("#csvBtn").addEventListener("click", () => { exportFullCsv(); toast("CSV exported."); });

  // Export as PDF → opens the browser's print-to-PDF dialog
  function exportPdf() {
    toast("Preparing PDF… choose “Save as PDF”.");
    setTimeout(() => window.print(), 600);
  }
  $("#exportBtn").addEventListener("click", exportPdf);
  $("#printBtn").addEventListener("click", () => window.print());

  // Per-chart export buttons → download that chart's data as CSV
  document.querySelectorAll("[data-export]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const rows = chartCsvRows(btn.dataset.export);
      if (!rows) { toast("Nothing to export."); return; }
      downloadCsv(btn.dataset.export.toLowerCase().replace(/\s+/g, "-") + ".csv", rows);
      toast(`Exported “${btn.dataset.export}” as CSV.`);
    }));

  /* Sidebar */
  function initSidebar() {
    const sidebar = $("#sidebar"), overlay = $("#overlay");
    $("#menuBtn").addEventListener("click", () => { sidebar.classList.add("open"); overlay.classList.add("show"); });
    const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); };
    $("#sidebarClose").addEventListener("click", close);
    overlay.addEventListener("click", close);
  }

  /* =================================================================
     6. INIT
     ================================================================= */
  // Populate the machine filter from the machines that actually appear in the records
  function populateMachineFilter() {
    const msel = $("#machineFilter");
    msel.innerHTML = '<option value="all">All machines</option>';
    const ids = Array.from(new Set(RECORDS.map((r) => r.machineId).filter(Boolean))).sort();
    ids.forEach((id) => { const o = document.createElement("option"); o.value = id; o.textContent = id; msel.appendChild(o); });
    if (filterState.machine !== "all" && ids.indexOf(filterState.machine) === -1) filterState.machine = "all";
    msel.value = filterState.machine;
  }

  // Anchor the rolling date window to the most recent record so newly-entered
  // production shows up in the Daily view.
  function setAsofFromRecords() {
    let max = null;
    RECORDS.forEach((r) => { if (r.date && (max === null || r.date > max)) max = r.date; });
    if (max) { const p = max.split("-").map(Number); ASOF = new Date(p[0], p[1] - 1, p[2]); }
  }

  // Refresh the production data from the LIVE API so reports reflect records
  // entered through the app. Falls back silently to the seeded dataset offline.
  function loadProductionFromApi() {
    if (typeof window.smmApi !== "function") return;   // static / file:// mode
    smmApi("/api/production")
      .then((r) => { if (!r.ok) throw new Error("api"); return r.json(); })
      .then((rows) => {
        if (!Array.isArray(rows) || !rows.length) return;
        RECORDS = rows.map((p) => ({
          date: p.date, shift: p.shift, machineId: p.machine, productionQty: Number(p.quantity) || 0
        }));
        setAsofFromRecords();
        populateMachineFilter();
        applyFilters();
      })
      .catch(() => { /* keep the seeded fallback already on screen */ });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#reportDate").textContent = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    renderSummary();
    buildCharts();
    populateMachineFilter();   // seeded fallback first, so the page renders instantly
    applyFilters();            // sync the daily chart + summary with the default filter
    loadProductionFromApi();   // then refresh the Daily view from the live backend
    initSidebar();
  });
})();
