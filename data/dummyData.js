/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   CANONICAL DUMMY DATASET — Satia Industries Ltd. (fictional values)

   This is the SINGLE SOURCE OF TRUTH for the whole project.
   Every page reads from the global object  MILL_DATA.
   When more data is needed later, EXTEND this file — do not create a new one.

   Exposes:
     MILL_DATA.meta                  metadata + counts + units
     MILL_DATA.departments           10 plant departments
     MILL_DATA.paperGrades           5 paper grades
     MILL_DATA.shifts                Morning / Evening / Night
     MILL_DATA.operators             25 operators
     MILL_DATA.machines              20 machines (PM-101 … PM-120)
     MILL_DATA.productionRecords     150 production records (>=100)
     MILL_DATA.maintenanceLogs       30 maintenance logs
     MILL_DATA.dashboardStats        live dashboard figures
     MILL_DATA.reports               aggregated report datasets
     MILL_DATA.notifications         alert feed
     MILL_DATA.charts                Chart.js-ready { labels, data } arrays

   The data is built with a SEEDED RNG, so values are realistic AND
   identical on every load (stable demo).  Usage:
     <script src="../data/dummyData.js"></script>   then read MILL_DATA.*
   ================================================================= */

(function (root) {
  "use strict";

  /* ---------------- Seeded RNG (mulberry32) ---------------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(20260616);

  const randInt = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
  const randFloat = (a, b, dp = 1) => +(a + rng() * (b - a)).toFixed(dp);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const chance = (p) => rng() < p;
  function weighted(pairs) {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = rng() * total;
    for (const [v, w] of pairs) { if ((r -= w) < 0) return v; }
    return pairs[pairs.length - 1][0];
  }

  /* ---------------- Date helpers (local, no TZ drift) ---------------- */
  const BASE = new Date(2026, 5, 16); // 16 June 2026
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dateMinus = (n) => { const d = new Date(BASE); d.setDate(d.getDate() - n); return d; };
  const datePlus = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };

  /* ================================================================
     REFERENCE DATA
     ================================================================ */
  const departments = [
    "Raw Material Yard", "Pulp Preparation", "Chemical Processing", "Paper Machine Section",
    "Drying Section", "Finishing & Cutting", "Packaging", "Dispatch", "Maintenance", "Utilities"
  ];
  const paperGrades = [
    "Copier Paper (70 GSM)", "Writing Paper (80 GSM)", "Printing Paper (90 GSM)",
    "Packaging Paper (120 GSM)", "Premium Bond Paper"
  ];
  const shifts = ["Morning", "Evening", "Night"];

  const ENGINEERS = ["Ravi Sharma", "Gurpreet Singh", "Neha Verma", "Arjun Mehta", "Karan Gill", "Sandeep Rana"];

  const NAME_POOL = [
    "Amrit Singh", "Harpreet Kaur", "Rajesh Kumar", "Simran Gill", "Vikram Patel", "Manjeet Singh",
    "Gurpreet Kaur", "Sukhwinder Singh", "Priya Sharma", "Baldev Singh", "Jaspreet Kaur", "Ramesh Yadav",
    "Pooja Nair", "Sandeep Rana", "Kuldeep Singh", "Anjali Mehta", "Devinder Kaur", "Naveen Joshi",
    "Satnam Singh", "Meena Kumari", "Rohit Verma", "Balwinder Kaur", "Ashok Kumar", "Parminder Singh",
    "Sunita Devi", "Tarun Bansal", "Jagdeep Singh", "Komal Arora"
  ];

  const ISSUES = [
    "Dryer cylinder steam leak", "Press roll bearing wear", "Wire mesh tear on Fourdrinier",
    "Felt replacement required", "Gearbox oil leakage", "Vacuum pump failure",
    "Calender roll surface damage", "Headbox pressure fluctuation", "Conveyor belt misalignment",
    "Pulp consistency sensor fault", "Boiler feed pump trip", "ClO2 dosing valve stuck",
    "Refiner plate wear", "Winder tension control fault", "Drive motor overheating",
    "Hydraulic pressure drop", "Steam trap malfunction", "Cooling water pump seal leak",
    "Reel drum vibration", "Sheeter knife blade dull", "Routine preventive lubrication",
    "Quarterly safety inspection", "PLC communication error", "Chemical line blockage",
    "Bearing temperature high"
  ];

  const REMARKS = [
    "Running smooth", "Minor speed dip", "Steam pressure adjusted", "Grade change mid-shift",
    "Sheet break recovered", "Within target", "Slight moisture variation", "Operator handover",
    "Headbox cleaned", "Target achieved", ""
  ];

  /* ================================================================
     1. OPERATORS (25)
     ================================================================ */
  const operators = [];
  for (let i = 0; i < 25; i++) {
    operators.push({
      empId: "OP-" + (1001 + i),
      name: NAME_POOL[i % NAME_POOL.length],
      department: pick(departments),
      shift: pick(shifts),
      experience: randInt(1, 28),                  // years
      contact: "+91 9" + randInt(100000000, 999999999),
      status: weighted([["Active", 80], ["On Leave", 12], ["Inactive", 8]])
    });
  }

  /* ================================================================
     2. MACHINES (20)  PM-101 … PM-120
     ================================================================ */
  const MACHINE_SPECS = [
    ["PM-101", "Straw Conveyor System",   "Raw Material Yard",     350],
    ["PM-102", "Wood Chipper",            "Raw Material Yard",     300],
    ["PM-103", "Hydrapulper",             "Pulp Preparation",      280],
    ["PM-104", "Pulp Refiner",            "Pulp Preparation",      260],
    ["PM-105", "Batch Digester",          "Pulp Preparation",      240],
    ["PM-106", "Bleaching Tower",         "Chemical Processing",   220],
    ["PM-107", "Chemical Dosing Unit",    "Chemical Processing",   200],
    ["PM-108", "ClO2 Generator",          "Chemical Processing",   180],
    ["PM-109", "Paper Machine 1",         "Paper Machine Section", 160],
    ["PM-110", "Paper Machine 2",         "Paper Machine Section", 150],
    ["PM-111", "Paper Machine 3",         "Paper Machine Section", 140],
    ["PM-112", "Headbox & Wire Section",  "Paper Machine Section", 160],
    ["PM-113", "Drying Cylinder Bank",    "Drying Section",        170],
    ["PM-114", "Steam Dryer Unit",        "Drying Section",        160],
    ["PM-115", "Calender Stack",          "Finishing & Cutting",   150],
    ["PM-116", "Sheet Cutter",            "Finishing & Cutting",   120],
    ["PM-117", "Rewinder",                "Finishing & Cutting",   130],
    ["PM-118", "Ream Wrapping Line",      "Packaging",             110],
    ["PM-119", "Automated Stacker",       "Dispatch",              100],
    ["PM-120", "Co-gen Power Boiler",     "Utilities",             320]
  ];

  function tempForDept(dept) {
    switch (dept) {
      case "Raw Material Yard":     return randInt(25, 40);
      case "Pulp Preparation":      return randInt(45, 75);
      case "Chemical Processing":   return randInt(50, 85);
      case "Paper Machine Section": return randInt(60, 95);
      case "Drying Section":        return randInt(90, 140);
      case "Finishing & Cutting":   return randInt(30, 55);
      case "Packaging":             return randInt(25, 40);
      case "Dispatch":              return randInt(25, 40);
      case "Utilities":             return randInt(120, 185);
      default:                      return randInt(25, 40);
    }
  }

  const machines = MACHINE_SPECS.map(([id, name, department, capacity]) => {
    const status = weighted([["Running", 65], ["Idle", 20], ["Maintenance", 15]]);
    const running = status === "Running";
    const lastM = dateMinus(randInt(5, 90));
    return {
      id,
      name,
      department,
      status,                                  // Running | Idle | Maintenance
      capacity,                                // TPD
      runningHours: randInt(500, 9500),
      temperature: tempForDept(department),    // °C
      efficiency: running ? randInt(74, 97) : 0, // %
      lastMaintenance: fmt(lastM),
      nextMaintenance: fmt(datePlus(lastM, randInt(45, 120)))
    };
  });

  const runningMachines = machines.filter((m) => m.status === "Running").length;
  const idleMachines = machines.filter((m) => m.status === "Idle").length;
  const underMaintenance = machines.filter((m) => m.status === "Maintenance").length;
  const paperMachines = machines.filter((m) => /^Paper Machine \d/.test(m.name));

  /* ================================================================
     3. PRODUCTION RECORDS (150)  — 5 per day over the last 30 days
     ================================================================ */
  const productionRecords = [];
  const gradeWeights = [
    ["Copier Paper (70 GSM)", 28], ["Writing Paper (80 GSM)", 26],
    ["Printing Paper (90 GSM)", 22], ["Packaging Paper (120 GSM)", 16], ["Premium Bond Paper", 8]
  ];
  let prodId = 0;
  for (let day = 29; day >= 0; day--) {
    const dateStr = fmt(dateMinus(day));
    for (let r = 0; r < 5; r++) {
      const m = pick(paperMachines);
      const shift = pick(shifts);
      const inShift = operators.filter((o) => o.shift === shift);
      const operator = (inShift.length ? pick(inShift) : pick(operators)).name;
      const status = weighted([["Completed", 78], ["Running", 14], ["Stopped", 8]]);
      const efficiency = status === "Stopped" ? randInt(30, 55) : randInt(75, 97);
      const idealShift = m.capacity / 3;         // tons a machine can make in one 8h shift
      const qty = status === "Stopped"
        ? +(idealShift * randFloat(0.15, 0.42, 2)).toFixed(1)
        : +(idealShift * randFloat(0.62, 0.96, 2)).toFixed(1);
      const rejectPct = status === "Stopped" ? randFloat(0.10, 0.26, 3) : randFloat(0.01, 0.05, 3);
      const reject = +(qty * rejectPct).toFixed(2);
      const downtime = status === "Stopped" ? randInt(60, 240)
                     : status === "Running" ? randInt(0, 45) : randInt(0, 30);
      productionRecords.push({
        id: ++prodId,
        date: dateStr,
        shift,                                   // Morning | Evening | Night
        machineId: m.id,
        machineName: m.name,
        operatorName: operator,
        productionQty: qty,                      // tons
        reject: reject,                          // tons rejected
        paperGrade: weighted(gradeWeights),
        efficiency,                              // %
        downtime,                                // minutes
        status,                                  // Completed | Running | Stopped
        remarks: chance(0.55) ? pick(REMARKS) : ""
      });
    }
  }

  /* ================================================================
     4. MAINTENANCE LOGS (30)
     ================================================================ */
  const maintenanceLogs = [];
  for (let i = 0; i < 30; i++) {
    const m = pick(machines);
    const start = dateMinus(randInt(0, 60));
    const status = weighted([["Completed", 50], ["In Progress", 20], ["Open", 18], ["Scheduled", 12]]);
    const priority = weighted([["Low", 25], ["Medium", 38], ["High", 25], ["Critical", 12]]);
    const heavy = priority === "Critical" || priority === "High";
    let endDate = null;
    if (status === "Completed") {
      let e = datePlus(start, randInt(1, 7));
      if (e > BASE) e = BASE;
      endDate = fmt(e);
    }
    maintenanceLogs.push({
      id: "MNT-" + String(i + 1).padStart(3, "0"),
      machineId: m.id,
      machineName: m.name,
      issue: pick(ISSUES),
      priority,                                  // Low | Medium | High | Critical
      assignedEngineer: pick(ENGINEERS),
      startDate: fmt(start),
      endDate,
      status,                                    // Completed | In Progress | Open | Scheduled
      estimatedCost: randInt(50, 3000) * 100,    // ₹
      remarks: chance(0.5) ? pick(REMARKS) : "Awaiting spare parts"
    });
  }
  maintenanceLogs.sort((a, b) => (a.startDate < b.startDate ? 1 : -1)); // newest first

  /* ================================================================
     5. REPORTS — aggregated datasets (mostly derived for consistency)
     ================================================================ */
  // Last 30 days production (sum of that day's records)
  const byDate = {};
  productionRecords.forEach((p) => { byDate[p.date] = (byDate[p.date] || 0) + p.productionQty; });
  const last30Days = [];
  for (let day = 29; day >= 0; day--) {
    const dateStr = fmt(dateMinus(day));
    last30Days.push({ date: dateStr, production: +(byDate[dateStr] || 0).toFixed(1) });
  }

  // Average efficiency per day (for efficiency chart)
  const effByDate = {};
  productionRecords.forEach((p) => {
    (effByDate[p.date] = effByDate[p.date] || []).push(p.efficiency);
  });
  const dailyEfficiency = last30Days.map((d) => {
    const arr = effByDate[d.date] || [];
    const avg = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    return { date: d.date, efficiency: +avg.toFixed(1) };
  });

  // Monthly production for 12 months (ending current month)
  const monthly12 = [];
  const monthFmt = new Date(BASE);
  monthFmt.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(monthFmt);
    d.setMonth(d.getMonth() - i);
    monthly12.push({
      month: d.toLocaleString("en-US", { month: "short" }) + " " + String(d.getFullYear()).slice(2),
      production: randInt(5400, 6600)
    });
  }

  // Production by paper grade (derived)
  const gradeTotals = {};
  paperGrades.forEach((g) => (gradeTotals[g] = 0));
  productionRecords.forEach((p) => (gradeTotals[p.paperGrade] += p.productionQty));
  const productionByGrade = paperGrades.map((g) => ({ grade: g, production: +gradeTotals[g].toFixed(1) }));

  // Shift-wise production (derived)
  const shiftTotals = { Morning: 0, Evening: 0, Night: 0 };
  productionRecords.forEach((p) => (shiftTotals[p.shift] += p.productionQty));
  const shiftWise = shifts.map((s) => ({ shift: s, production: +shiftTotals[s].toFixed(1) }));

  // Machine utilization (Running uses efficiency; others reduced)
  const machineUtilization = machines.map((m) => ({
    machineId: m.id,
    machineName: m.name,
    utilization: m.status === "Running" ? m.efficiency
               : m.status === "Idle" ? randInt(30, 55) : randInt(8, 28)
  }));

  // Downtime analysis (by reason, minutes)
  const downtimeAnalysis = [
    { reason: "Mechanical",  minutes: randInt(420, 700) },
    { reason: "Electrical",  minutes: randInt(260, 480) },
    { reason: "Process",     minutes: randInt(200, 420) },
    { reason: "Changeover",  minutes: randInt(160, 340) },
    { reason: "Power Cut",   minutes: randInt(120, 300) },
    { reason: "Planned",     minutes: randInt(180, 360) }
  ];

  // Department-wise production (realistic stage throughput)
  const prodDepts = ["Pulp Preparation", "Chemical Processing", "Paper Machine Section",
                     "Drying Section", "Finishing & Cutting", "Packaging"];
  const departmentProduction = prodDepts.map((d) => ({ department: d, production: randInt(4200, 6200) }));

  /* ================================================================
     OEE — Overall Equipment Effectiveness  (Availability x Performance x Quality)
     Computed from production records + machine capacity, for consistency.
     ================================================================ */
  const SHIFT_MIN = 480;                         // one 8-hour shift
  const capById = {};
  machines.forEach((m) => (capById[m.id] = m.capacity));

  function aggregateOEE(records) {
    if (!records.length) return { availability: 0, performance: 0, quality: 0, oee: 0 };
    let plannedT = 0, runT = 0, idealT = 0, qtyT = 0, goodT = 0;
    records.forEach((p) => {
      const runTime = Math.max(0, SHIFT_MIN - p.downtime);
      const idealShift = (capById[p.machineId] || 0) / 3;
      plannedT += SHIFT_MIN;
      runT += runTime;
      idealT += idealShift * (runTime / SHIFT_MIN);
      qtyT += p.productionQty;
      goodT += (p.productionQty - p.reject);
    });
    const availability = plannedT ? runT / plannedT : 0;
    const performance = idealT ? Math.min(1, qtyT / idealT) : 0;
    const quality = qtyT ? goodT / qtyT : 0;
    return {
      availability: +(availability * 100).toFixed(1),
      performance: +(performance * 100).toFixed(1),
      quality: +(quality * 100).toFixed(1),
      oee: +(availability * performance * quality * 100).toFixed(1)
    };
  }

  const plantOEE = aggregateOEE(productionRecords);
  const machineOEE = paperMachines.map((m) =>
    Object.assign({ machineId: m.id, machineName: m.name },
                  aggregateOEE(productionRecords.filter((p) => p.machineId === m.id)))
  );

  /* ================================================================
     THRESHOLDS — configurable limits used by the alert engine
     ================================================================ */
  const thresholds = {
    efficiencyMin: 75,           // %
    downtimeMaxMin: 60,          // minutes per shift
    gsmMin: 45, gsmMax: 120, moistureMax: 6.5,
    tempMaxByDept: {
      "Paper Machine Section": 90, "Drying Section": 132, "Chemical Processing": 80,
      "Pulp Preparation": 72, "Utilities": 178, "Finishing & Cutting": 52,
      "Raw Material Yard": 38, "Packaging": 38, "Dispatch": 38, "Maintenance": 38
    }
  };

  /* ================================================================
     ALERTS — generated from live machine state + thresholds
     ================================================================ */
  const alerts = [];
  let alertSeq = 0;
  const timeAgo = ["just now", "6 min ago", "14 min ago", "28 min ago", "45 min ago",
                   "1 hr ago", "2 hrs ago", "3 hrs ago", "5 hrs ago"];
  function addAlert(type, title, message, machineId) {
    alertSeq++;
    alerts.push({
      id: alertSeq, type, title, message,
      machineId: machineId || null,
      time: timeAgo[alertSeq % timeAgo.length],
      read: false
    });
  }
  machines.forEach((m) => {
    if (m.status === "Maintenance")
      addAlert("warning", "Maintenance Due", m.name + " (" + m.id + ") is under maintenance.", m.id);
    if (m.status === "Running" && m.efficiency < thresholds.efficiencyMin)
      addAlert("warning", "Low Efficiency", m.name + " (" + m.id + ") efficiency at " + m.efficiency +
               "% (below " + thresholds.efficiencyMin + "% target).", m.id);
    const tmax = thresholds.tempMaxByDept[m.department];
    if (tmax && m.temperature > tmax)
      addAlert("danger", "High Temperature", "High temperature (" + m.temperature + "°C) detected on " +
               m.name + " (" + m.id + ").", m.id);
  });
  // Process / business alerts
  addAlert("danger", "Low Chemical Stock", "Chlorine dioxide stock below reorder level in Chemical Processing.", null);
  addAlert("success", "Target Achieved", "Daily production target achieved for Paper Machine 1.", "PM-109");
  addAlert("info", "Shift Change", "A new shift has commenced; operators are on duty.", null);
  addAlert("success", "Maintenance Completed", "Scheduled maintenance on PM-115 (Calender Stack) completed.", "PM-115");
  // Order by severity: danger, warning, info, success
  const sevRank = { danger: 0, warning: 1, info: 2, success: 3 };
  alerts.sort((a, b) => sevRank[a.type] - sevRank[b.type]);

  /* ================================================================
     6. DASHBOARD STATISTICS (derived → internally consistent)
     ================================================================ */
  const todayStr = fmt(BASE);
  const todays = productionRecords.filter((p) => p.date === todayStr);
  const todaysProduction = +todays.reduce((s, p) => s + p.productionQty, 0).toFixed(1);
  const monthlyProduction = +last30Days.reduce((s, d) => s + d.production, 0).toFixed(0);
  const annualProduction = monthly12.reduce((s, m) => s + m.production, 0);
  const runEffs = machines.filter((m) => m.status === "Running").map((m) => m.efficiency);
  const averageEfficiency = +(runEffs.reduce((s, v) => s + v, 0) / runEffs.length).toFixed(1);
  const totalDowntimeToday = todays.reduce((s, p) => s + p.downtime, 0); // minutes

  const dashboardStats = {
    todaysProduction,                                    // tons
    monthlyProduction,                                   // tons (last 30 days)
    annualProduction,                                    // tons (last 12 months)
    runningMachines,
    idleMachines,
    underMaintenance,
    averageEfficiency,                                   // %
    averageOEE: plantOEE.oee,                            // % (plant Overall Equipment Effectiveness)
    totalDowntime: totalDowntimeToday,                   // minutes (today)
    energyConsumption: Math.round(todaysProduction * randInt(960, 1150)), // kWh (today)
    waterConsumption: Math.round(todaysProduction * randFloat(24, 34, 1)) // m3 (today)
  };

  /* ================================================================
     7. NOTIFICATIONS  (the generated alert feed)
     ================================================================ */
  const notifications = alerts;

  /* ================================================================
     8. CHART.JS-READY DATA
     ================================================================ */
  const charts = {
    productionTrend: {
      labels: last30Days.map((d) => d.date.slice(5)),     // MM-DD
      data: last30Days.map((d) => d.production)
    },
    machineStatus: {
      labels: ["Running", "Idle", "Maintenance"],
      data: [runningMachines, idleMachines, underMaintenance],
      colors: ["#16a34a", "#f59e0b", "#dc2626"]
    },
    monthlyProduction: {
      labels: monthly12.map((m) => m.month),
      data: monthly12.map((m) => m.production)
    },
    downtime: {
      labels: downtimeAnalysis.map((d) => d.reason),
      data: downtimeAnalysis.map((d) => d.minutes),
      colors: ["#2563eb", "#0ea5e9", "#f59e0b", "#94a3b8", "#dc2626", "#16a34a"]
    },
    efficiency: {
      labels: dailyEfficiency.slice(-14).map((d) => d.date.slice(5)),
      data: dailyEfficiency.slice(-14).map((d) => d.efficiency)
    },
    oee: {
      labels: machineOEE.map((m) => m.machineId),
      data: machineOEE.map((m) => m.oee)
    },
    departmentWiseProduction: {
      labels: departmentProduction.map((d) => d.department),
      data: departmentProduction.map((d) => d.production)
    }
  };

  /* ================================================================
     EXPORT
     ================================================================ */
  const MILL_DATA = {
    meta: {
      company: "Satia Industries Ltd. (fictional demo data)",
      plant: "Writing & Printing Paper Mill — wheat-straw / agro-residue based",
      asOfDate: todayStr,
      units: { production: "tons", capacity: "TPD", temperature: "°C", efficiency: "%",
               downtime: "minutes", energy: "kWh", water: "m³", cost: "₹" },
      counts: {
        operators: operators.length, machines: machines.length,
        productionRecords: productionRecords.length, maintenanceLogs: maintenanceLogs.length
      }
    },
    departments,
    paperGrades,
    shifts,
    engineers: ENGINEERS,
    operators,
    machines,
    productionRecords,
    maintenanceLogs,
    dashboardStats,
    oee: plantOEE,
    thresholds,
    reports: {
      last30DaysProduction: last30Days,
      dailyEfficiency,
      monthly12,
      machineUtilization,
      machineOEE,
      downtimeAnalysis,
      productionByGrade,
      shiftWise,
      departmentProduction
    },
    notifications,
    alerts,
    charts
  };

  if (typeof module !== "undefined" && module.exports) module.exports = MILL_DATA;
  root.MILL_DATA = MILL_DATA;
})(typeof window !== "undefined" ? window : globalThis);
