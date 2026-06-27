/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Downtime Logging Page — JavaScript
   - Log / edit / delete downtime events (machine, shift, reason, start, end)
   - Duration computed by the backend; persisted in SQLite via /api/downtime
   ================================================================= */

(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);

  const D = window.MILL_DATA || { machines: [] };
  const MACHINES = D.machines.length ? D.machines.map((m) => m.id)
                 : ["PM-101", "PM-102", "PM-103", "PM-104", "PM-105"];

  let records = [];
  let editingId = null;
  let reasonFilter = "all";

  const form        = $("#downtimeForm");
  const tbody       = $("#recordsBody");
  const searchInput = $("#searchInput");
  const reasonFilterEl = $("#reasonFilter");
  const recordCount = $("#recordCount");
  const emptyState  = $("#emptyState");
  const emptyText   = $("#emptyText");
  const saveLabel   = $("#saveLabel");
  const formTitle   = $("#formTitle");
  const formSub     = $("#formSub");
  const modePill    = $("#modePill");
  const summaryBar  = $("#summaryBar");

  const FIELD_NAMES = ["date", "machine", "shift", "reason", "start_time", "end_time"];
  const REASON_CLASS = (r) => "rs-" + r.toLowerCase().replace(/\s+/g, "-");

  /* ---------- Dropdowns ---------- */
  function fillSelect(id, items) {
    const sel = $("#" + id);
    items.forEach((v) => { const o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
  }

  /* ---------- Persistence (backend API) ---------- */
  function load() {
    return smmApi("/api/downtime")
      .then((r) => { if (!r.ok) throw new Error("load failed"); return r.json(); })
      .then((rows) => { records = rows; renderSummary(); render(); })
      .catch(() => { records = []; renderSummary(); render(); toast("Could not load events. Is the backend running?", "danger"); });
  }

  /* ---------- Summary ---------- */
  function renderSummary() {
    const total = records.length;
    const mins = records.reduce((s, r) => s + (r.duration_min || 0), 0);
    const counts = {};
    records.forEach((r) => (counts[r.reason] = (counts[r.reason] || 0) + 1));
    let topReason = "—", topN = 0;
    Object.keys(counts).forEach((k) => { if (counts[k] > topN) { topN = counts[k]; topReason = k; } });
    const chips = [
      { label: "Total Events", value: total },
      { label: "Total Downtime", value: (mins / 60).toFixed(1) + " h" },
      { label: "Top Reason", value: topReason }
    ];
    summaryBar.innerHTML = chips.map((c) =>
      `<div class="summary-chip"><div class="s-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/></svg></div>
       <div><div class="s-value">${c.value}</div><div class="s-label">${c.label}</div></div></div>`).join("");
  }

  /* ---------- Render table ---------- */
  function render() {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = records.filter((r) => {
      const matchReason = reasonFilter === "all" || r.reason === reasonFilter;
      const matchSearch = (r.machine + " " + r.reason + " " + r.shift).toLowerCase().includes(term);
      return matchReason && matchSearch;
    });
    tbody.innerHTML = "";
    if (!filtered.length) {
      emptyState.hidden = false;
      emptyText.textContent = records.length === 0
        ? "No downtime events logged yet. Add your first event above."
        : "No events match your search or filter.";
    } else {
      emptyState.hidden = true;
      filtered.forEach((r) => tbody.appendChild(buildRow(r)));
    }
    recordCount.textContent = filtered.length;
  }

  function buildRow(r) {
    const tr = document.createElement("tr");
    const cell = (text, cls) => { const td = document.createElement("td"); if (cls) td.className = cls; td.textContent = text; return td; };
    tr.appendChild(cell("#" + String(r.id).padStart(3, "0"), "id-cell"));
    tr.appendChild(cell(r.date, "date-cell"));
    tr.appendChild(cell(r.machine, "machine-tag"));
    tr.appendChild(cell(r.shift));
    // reason badge
    const rTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge " + REASON_CLASS(r.reason);
    badge.innerHTML = '<span class="dot"></span>';
    badge.appendChild(document.createTextNode(r.reason));
    rTd.appendChild(badge);
    tr.appendChild(rTd);
    tr.appendChild(cell(r.start_time));
    tr.appendChild(cell(r.end_time));
    tr.appendChild(cell(r.duration_min, "num"));
    // actions
    const actTd = document.createElement("td");
    const wrap = document.createElement("div"); wrap.className = "row-actions";
    wrap.appendChild(actionBtn("edit", r.id));
    wrap.appendChild(actionBtn("delete", r.id));
    actTd.appendChild(wrap); tr.appendChild(actTd);
    return tr;
  }

  function actionBtn(type, id) {
    const btn = document.createElement("button");
    btn.className = "row-btn " + type; btn.dataset.id = id; btn.dataset.action = type;
    btn.setAttribute("aria-label", type + " event");
    btn.innerHTML = type === "edit"
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>';
    return btn;
  }

  /* ---------- Validation ---------- */
  function setError(name, msg) {
    const field = form.querySelector(`[name="${name}"]`).closest(".field");
    field.classList.add("invalid");
    field.querySelector(`[data-error="${name}"]`).textContent = msg;
  }
  function clearError(name) {
    const field = form.querySelector(`[name="${name}"]`).closest(".field");
    field.classList.remove("invalid");
    const err = field.querySelector(`[data-error="${name}"]`);
    if (err) err.textContent = "";
  }
  function clearAllErrors() { FIELD_NAMES.forEach(clearError); }
  function validate(d) {
    clearAllErrors();
    let ok = true;
    const labels = { date: "Date", machine: "Machine", shift: "Shift", reason: "Reason", start_time: "Start time", end_time: "End time" };
    FIELD_NAMES.forEach((f) => { if (!d[f]) { setError(f, labels[f] + " is required."); ok = false; } });
    return ok;
  }

  /* ---------- Edit mode ---------- */
  function enterEditMode(r) {
    editingId = r.id;
    form.date.value = r.date; form.machine.value = r.machine; form.shift.value = r.shift;
    form.reason.value = r.reason; form.start_time.value = r.start_time; form.end_time.value = r.end_time;
    formTitle.textContent = "Edit Downtime Event";
    formSub.textContent = "Update the details and save your changes";
    saveLabel.textContent = "Update Event";
    modePill.hidden = false; clearAllErrors();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function exitEditMode() {
    editingId = null;
    formTitle.textContent = "Log Downtime Event";
    formSub.textContent = "Record a machine stoppage with its reason and duration";
    saveLabel.textContent = "Save Event"; modePill.hidden = true;
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(message, type = "success") {
    const t = $("#toast");
    const icons = { success: '<path d="M20 6 9 17l-5-5"/>', danger: '<path d="M18 6 6 18M6 6l12 12"/>' };
    t.className = "toast show " + type;
    t.innerHTML = `<span class="t-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icons[type]}</svg></span><span>${message}</span>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------- Events ---------- */
  FIELD_NAMES.forEach((name) => form.querySelector(`[name="${name}"]`).addEventListener("input", () => clearError(name)));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = {
      date: form.date.value, machine: form.machine.value, shift: form.shift.value,
      reason: form.reason.value, start_time: form.start_time.value, end_time: form.end_time.value
    };
    if (!validate(d)) return;
    const editing = editingId !== null;
    const url = editing ? "/api/downtime/" + editingId : "/api/downtime";
    smmApi(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(d) })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) { toast(body.error || "Could not save event.", "danger"); return; }
        toast(editing ? "Downtime event updated" : "Downtime event logged");
        exitEditMode(); form.reset(); clearAllErrors();
        return load();
      })
      .catch(() => toast("Could not reach the server.", "danger"));
  });

  form.addEventListener("reset", () => { clearAllErrors(); exitEditMode(); });
  $("#cancelBtn").addEventListener("click", () => { window.location.href = "../dashboard/index.html"; });
  searchInput.addEventListener("input", render);
  reasonFilterEl.addEventListener("change", (e) => { reasonFilter = e.target.value; render(); });

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".row-btn");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const r = records.find((x) => x.id === id);
    if (!r) return;
    if (btn.dataset.action === "edit") {
      enterEditMode(r);
    } else if (confirm(`Delete downtime event #${String(id).padStart(3, "0")} for ${r.machine}?`)) {
      smmApi("/api/downtime/" + id, { method: "DELETE" })
        .then((res) => { if (!res.ok) throw new Error(); if (editingId === id) { form.reset(); exitEditMode(); } return load(); })
        .then(() => toast("Event deleted", "danger"))
        .catch(() => toast("Could not delete event.", "danger"));
    }
  });

  /* ---------- Sidebar ---------- */
  function initSidebar() {
    const sidebar = $("#sidebar"), overlay = $("#overlay");
    $("#menuBtn").addEventListener("click", () => { sidebar.classList.add("open"); overlay.classList.add("show"); });
    const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); };
    $("#sidebarClose").addEventListener("click", close);
    overlay.addEventListener("click", close);
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    fillSelect("machine", MACHINES);
    form.date.value = new Date().toISOString().slice(0, 10);
    load();
    initSidebar();
  });
})();
