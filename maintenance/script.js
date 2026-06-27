/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Maintenance Management Page — JavaScript
   - Add / Edit / Delete maintenance records
   - Search + status filter + priority filter
   - Local data with localStorage persistence
   Replace the local data layer with a backend API later.
   ================================================================= */

(function () {
  "use strict";

  /* ---------- Reference data (would come from the DB) ---------- */
  // Reference data sourced from the canonical dataset (data/dummyData.js)
  const D = window.MILL_DATA || { machines: [], engineers: [], maintenanceLogs: [] };
  const MACHINES  = D.machines.map((m) => m.id);
  const ENGINEERS = D.engineers.length ? D.engineers : ["Ravi Sharma", "Gurpreet Singh", "Neha Verma", "Arjun Mehta", "Karan Gill"];
  /* ---------- State ---------- */
  let records = [];
  let editingId = null;
  let statusFilter = "all";

  /* ---------- Refs ---------- */
  const $ = (s) => document.querySelector(s);
  const form         = $("#maintenanceForm");
  const tbody        = $("#recordsBody");
  const searchInput  = $("#searchInput");
  const priorityFilterEl = $("#priorityFilter");
  const recordCount  = $("#recordCount");
  const emptyState   = $("#emptyState");
  const emptyText    = $("#emptyText");
  const saveLabel    = $("#saveLabel");
  const formTitle    = $("#formTitle");
  const formSub      = $("#formSub");
  const modePill     = $("#modePill");
  const summaryBar   = $("#summaryBar");

  /* ---------- Class maps ---------- */
  const PRIORITY_CLASS = { "Low": "priority-low", "Medium": "priority-medium", "High": "priority-high", "Critical": "priority-critical" };
  const STATUS_CLASS   = { "Open": "st-open", "In Progress": "st-progress", "Completed": "st-completed", "Cancelled": "st-cancelled" };

  const FIELD_NAMES = ["machine", "engineer", "date", "priority", "status", "problem"];

  /* =================================================================
     Persistence
     ================================================================= */
  function load() {
    return smmApi("/api/maintenance")
      .then((r) => { if (!r.ok) throw new Error("load failed"); return r.json(); })
      .then((rows) => { records = rows; renderSummary(); render(); })
      .catch(() => { records = []; renderSummary(); render(); toast("Could not load records. Is the backend running?", "danger"); });
  }

  /* =================================================================
     Dropdowns
     ================================================================= */
  function fillSelect(id, items) {
    const sel = $("#" + id);
    items.forEach((v) => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    });
  }

  /* =================================================================
     Summary chips
     ================================================================= */
  function renderSummary() {
    const c = { total: records.length, open: 0, progress: 0, completed: 0 };
    records.forEach((r) => {
      if (r.status === "Open") c.open++;
      else if (r.status === "In Progress") c.progress++;
      else if (r.status === "Completed") c.completed++;
    });
    const icons = {
      total:     '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
      open:      '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
      progress:  '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2"/>',
      completed: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>'
    };
    const chips = [
      { key: "total",     label: "Total Records", value: c.total },
      { key: "open",      label: "Open",          value: c.open },
      { key: "progress",  label: "In Progress",   value: c.progress },
      { key: "completed", label: "Completed",     value: c.completed }
    ];
    summaryBar.innerHTML = chips.map((x) => `
      <div class="summary-chip">
        <div class="s-icon ${x.key}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[x.key]}</svg></div>
        <div class="s-meta"><span class="s-value">${x.value}</span><span class="s-label">${x.label}</span></div>
      </div>`).join("");
  }

  /* =================================================================
     Render table (search + filters)
     ================================================================= */
  function render() {
    const term = searchInput.value.trim().toLowerCase();
    const pf = priorityFilterEl.value;

    const filtered = records.filter((r) => {
      const matchStatus   = statusFilter === "all" || r.status === statusFilter;
      const matchPriority = pf === "all" || r.priority === pf;
      const matchSearch   = (r.machine + " " + r.problem + " " + r.engineer).toLowerCase().includes(term);
      return matchStatus && matchPriority && matchSearch;
    });

    tbody.innerHTML = "";

    if (filtered.length === 0) {
      emptyState.hidden = false;
      emptyText.textContent = records.length === 0
        ? "No maintenance records yet. Add your first record above."
        : "No records match your search or filters.";
    } else {
      emptyState.hidden = true;
      filtered.slice().reverse().forEach((r) => tbody.appendChild(buildRow(r)));
    }
    recordCount.textContent = filtered.length;
  }

  function buildRow(r) {
    const tr = document.createElement("tr");
    const cell = (text, cls) => { const td = document.createElement("td"); if (cls) td.className = cls; td.textContent = text; return td; };

    tr.appendChild(cell("#" + String(r.id).padStart(3, "0"), "id-cell"));
    tr.appendChild(cell(r.machine, "machine-tag"));

    const prob = cell(r.problem, "problem-cell");
    prob.title = r.problem;
    tr.appendChild(prob);

    tr.appendChild(makeBadgeCell(r.priority, PRIORITY_CLASS[r.priority]));
    tr.appendChild(cell(r.engineer));
    tr.appendChild(cell(r.date, "date-cell"));
    tr.appendChild(makeBadgeCell(r.status, STATUS_CLASS[r.status]));

    // actions
    const actTd = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "row-actions";
    wrap.appendChild(makeActionBtn("edit", r.id));
    wrap.appendChild(makeActionBtn("delete", r.id));
    actTd.appendChild(wrap);
    tr.appendChild(actTd);

    return tr;
  }

  function makeBadgeCell(text, cls) {
    const td = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge " + cls;
    badge.innerHTML = '<span class="dot"></span>';
    badge.appendChild(document.createTextNode(text));
    td.appendChild(badge);
    return td;
  }

  function makeActionBtn(type, id) {
    const btn = document.createElement("button");
    btn.className = "row-btn " + type;
    btn.dataset.id = id;
    btn.dataset.action = type;
    btn.setAttribute("aria-label", type + " record");
    btn.innerHTML = type === "edit"
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>';
    return btn;
  }

  /* =================================================================
     Validation
     ================================================================= */
  function setError(name, msg) {
    const field = form.querySelector(`[name="${name}"]`).closest(".field");
    field.classList.add("invalid");
    field.querySelector(`[data-error="${name}"]`).textContent = msg;
  }
  function clearError(name) {
    const input = form.querySelector(`[name="${name}"]`);
    const field = input.closest(".field");
    field.classList.remove("invalid");
    const err = field.querySelector(`[data-error="${name}"]`);
    if (err) err.textContent = "";
  }
  function clearAllErrors() { FIELD_NAMES.forEach(clearError); }

  function validate(d) {
    clearAllErrors();
    let ok = true;
    if (!d.machine)  { setError("machine", "Select a machine.");          ok = false; }
    if (!d.engineer) { setError("engineer", "Assign an engineer.");       ok = false; }
    if (!d.date)     { setError("date", "Date is required.");             ok = false; }
    if (!d.priority) { setError("priority", "Select a priority.");        ok = false; }
    if (!d.status)   { setError("status", "Select a status.");            ok = false; }
    if (!d.problem)  { setError("problem", "Describe the problem.");      ok = false; }
    return ok;
  }

  /* =================================================================
     Edit mode helpers
     ================================================================= */
  function enterEditMode(r) {
    editingId = r.id;
    form.machine.value  = r.machine;
    form.engineer.value = r.engineer;
    form.date.value     = r.date;
    form.priority.value = r.priority;
    form.status.value   = r.status;
    form.problem.value  = r.problem;
    formTitle.textContent = "Edit Maintenance Record";
    formSub.textContent   = "Update the details and save your changes";
    saveLabel.textContent = "Update Record";
    modePill.hidden = false;
    clearAllErrors();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function exitEditMode() {
    editingId = null;
    formTitle.textContent = "Add Maintenance Record";
    formSub.textContent   = "Log a new maintenance request or job";
    saveLabel.textContent = "Save Record";
    modePill.hidden = true;
  }

  /* =================================================================
     Toast
     ================================================================= */
  let toastTimer;
  function toast(message, type = "success") {
    const t = $("#toast");
    const icons = { success: '<path d="M20 6 9 17l-5-5"/>', danger: '<path d="M18 6 6 18M6 6l12 12"/>' };
    t.className = "toast show " + type;
    t.innerHTML = `<span class="t-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icons[type]}</svg></span><span>${message}</span>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* =================================================================
     Events
     ================================================================= */
  FIELD_NAMES.forEach((name) => {
    form.querySelector(`[name="${name}"]`).addEventListener("input", () => clearError(name));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = {
      machine:  form.machine.value,
      engineer: form.engineer.value,
      date:     form.date.value,
      priority: form.priority.value,
      status:   form.status.value,
      problem:  form.problem.value.trim()
    };
    if (!validate(d)) return;

    const editing = editingId !== null;
    const url = editing ? "/api/maintenance/" + editingId : "/api/maintenance";

    smmApi(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(d) })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) { toast(body.error || "Could not save record.", "danger"); return; }
        toast(editing ? "Maintenance record updated" : "Maintenance record saved");
        exitEditMode();
        form.reset();
        clearAllErrors();
        return load();
      })
      .catch(() => toast("Could not reach the server.", "danger"));
  });

  form.addEventListener("reset", () => { clearAllErrors(); exitEditMode(); });

  $("#cancelBtn").addEventListener("click", () => { window.location.href = "../dashboard/index.html"; });

  searchInput.addEventListener("input", render);
  priorityFilterEl.addEventListener("change", render);

  $("#statusPills").addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    document.querySelectorAll("#statusPills .pill").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    statusFilter = btn.dataset.status;
    render();
  });

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".row-btn");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const r = records.find((x) => x.id === id);
    if (!r) return;

    if (btn.dataset.action === "edit") {
      enterEditMode(r);
    } else {
      if (confirm(`Delete maintenance record #${String(id).padStart(3, "0")} for ${r.machine}?`)) {
        smmApi("/api/maintenance/" + id, { method: "DELETE" })
          .then((res) => { if (!res.ok) throw new Error(); if (editingId === id) { form.reset(); exitEditMode(); } return load(); })
          .then(() => toast("Record deleted", "danger"))
          .catch(() => toast("Could not delete record.", "danger"));
      }
    }
  });

  /* Sidebar */
  function initSidebar() {
    const sidebar = $("#sidebar");
    const overlay = $("#overlay");
    $("#menuBtn").addEventListener("click", () => { sidebar.classList.add("open"); overlay.classList.add("show"); });
    const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); };
    $("#sidebarClose").addEventListener("click", close);
    overlay.addEventListener("click", close);
  }

  /* =================================================================
     Init
     ================================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    fillSelect("machine", MACHINES);
    fillSelect("engineer", ENGINEERS);
    form.date.value = new Date().toISOString().slice(0, 10);
    load();        // fetches from the API, then renders summary + table
    initSidebar();
  });
})();
