/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Production Entry Page — JavaScript
   - Add / Edit / Delete production records
   - Live searchable table
   - localStorage persistence  (swap for a backend API later)
   ================================================================= */

(function () {
  "use strict";

  /* ---------- Reference data (would come from the DB) ---------- */
  // Reference data sourced from the canonical dataset (data/dummyData.js)
  const D = window.MILL_DATA || { machines: [], operators: [], productionRecords: [] };
  const MACHINES  = D.machines.map((m) => m.id);
  const OPERATORS = D.operators.length ? D.operators.map((o) => o.name)
                  : ["Amrit Singh", "Harpreet Kaur", "Rajesh Kumar", "Simran Gill", "Vikram Patel", "Manjeet Singh"];

  // Quality tolerances used to flag out-of-spec readings (FR-9)
  const TH = Object.assign({ gsmMin: 45, gsmMax: 120, moistureMax: 6.5 }, D.thresholds || {});

  /* ---------- State ---------- */
  let records   = [];
  let editingId = null;

  /* ---------- Element refs ---------- */
  const $  = (s) => document.querySelector(s);
  const form        = $("#productionForm");
  const tbody       = $("#recordsBody");
  const searchInput = $("#searchInput");
  const recordCount = $("#recordCount");
  const emptyState  = $("#emptyState");
  const emptyText   = $("#emptyText");
  const saveLabel   = $("#saveLabel");
  const formTitle   = $("#formTitle");
  const formSub     = $("#formSub");
  const modePill    = $("#modePill");

  /* =================================================================
     Persistence — records live in the backend (SQLite via /api/production)
     ================================================================= */
  function load() {
    return smmApi("/api/production")
      .then((r) => { if (!r.ok) throw new Error("load failed"); return r.json(); })
      .then((rows) => { records = rows; render(); })
      .catch(() => { records = []; render(); toast("Could not load records. Is the backend running?", "danger"); });
  }

  /* =================================================================
     Populate dropdowns
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
     Render table (with optional search filter)
     ================================================================= */
  const gradeClass = (g) => ({
    "Grade A": "grade-a", "Grade B": "grade-b", "Grade C": "grade-c", "Reject": "reject"
  }[g] || "grade-b");

  function render() {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = records.filter((r) =>
      [r.date, "shift " + r.shift, r.machine, r.operator, r.grade, r.remarks]
        .join(" ").toLowerCase().includes(term)
    );

    tbody.innerHTML = "";

    if (filtered.length === 0) {
      emptyState.hidden = false;
      emptyText.textContent = records.length === 0
        ? "No production records yet. Add your first entry above."
        : "No records match your search.";
    } else {
      emptyState.hidden = true;
      // newest first
      filtered.slice().reverse().forEach((r) => tbody.appendChild(buildRow(r)));
    }

    recordCount.textContent = filtered.length;
  }

  /* Build one table row using safe DOM nodes (prevents HTML injection from remarks) */
  function buildRow(r) {
    const tr = document.createElement("tr");

    const cell = (text, cls) => {
      const td = document.createElement("td");
      if (cls) td.className = cls;
      td.textContent = text;
      return td;
    };

    tr.appendChild(cell(r.date));
    tr.appendChild(cell("Shift " + r.shift));
    tr.appendChild(cell(r.machine, "machine-tag"));
    tr.appendChild(cell(r.operator));
    tr.appendChild(cell(Number(r.quantity).toFixed(1), "num"));

    // Grade badge
    const gradeTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge " + gradeClass(r.grade);
    badge.innerHTML = '<span class="dot"></span>';
    badge.appendChild(document.createTextNode(r.grade));
    gradeTd.appendChild(badge);
    tr.appendChild(gradeTd);

    // GSM / Moisture / Speed (with out-of-spec flagging — FR-9)
    const num = (v) => (v === null || v === undefined || v === "") ? "—" : v;
    const gsmTd = cell(num(r.gsm), "num");
    const moistTd = cell(num(r.moisture), "num");
    if (r.gsm != null && (r.gsm < TH.gsmMin || r.gsm > TH.gsmMax)) {
      gsmTd.classList.add("spec-bad");
      gsmTd.title = "Out of spec (allowed " + TH.gsmMin + "–" + TH.gsmMax + " GSM)";
    }
    if (r.moisture != null && r.moisture > TH.moistureMax) {
      moistTd.classList.add("spec-bad");
      moistTd.title = "Out of spec (max " + TH.moistureMax + "% moisture)";
    }
    tr.appendChild(gsmTd);
    tr.appendChild(moistTd);
    tr.appendChild(cell(num(r.speed), "num"));

    // Remarks
    const remarksTd = cell(r.remarks || "—", "remarks-cell");
    remarksTd.title = r.remarks || "";
    tr.appendChild(remarksTd);

    // Actions
    const actTd = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "row-actions";
    wrap.appendChild(makeActionBtn("edit", r.id));
    wrap.appendChild(makeActionBtn("delete", r.id));
    actTd.appendChild(wrap);
    tr.appendChild(actTd);

    return tr;
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
  function clearAllErrors() {
    ["date", "shift", "machine", "operator", "quantity", "grade"].forEach(clearError);
  }

  function validate(data) {
    clearAllErrors();
    let ok = true;
    if (!data.date)     { setError("date", "Date is required.");          ok = false; }
    if (!data.shift)    { setError("shift", "Select a shift.");           ok = false; }
    if (!data.machine)  { setError("machine", "Select a machine.");       ok = false; }
    if (!data.operator) { setError("operator", "Select an operator.");    ok = false; }
    if (data.quantity === "" || isNaN(data.quantity)) {
      setError("quantity", "Enter a valid quantity.");                    ok = false;
    } else if (Number(data.quantity) < 0) {
      setError("quantity", "Quantity cannot be negative.");               ok = false;
    }
    if (!data.grade)    { setError("grade", "Select a quality grade.");   ok = false; }
    return ok;
  }

  /* =================================================================
     Form mode helpers
     ================================================================= */
  function enterEditMode(record) {
    editingId = record.id;
    form.date.value     = record.date;
    form.shift.value    = record.shift;
    form.machine.value  = record.machine;
    form.operator.value = record.operator;
    form.quantity.value = record.quantity;
    form.grade.value    = record.grade;
    form.gsm.value      = record.gsm == null ? "" : record.gsm;
    form.moisture.value = record.moisture == null ? "" : record.moisture;
    form.speed.value    = record.speed == null ? "" : record.speed;
    form.remarks.value  = record.remarks || "";

    formTitle.textContent = "Edit Production Record";
    formSub.textContent   = "Update the details and save your changes";
    saveLabel.textContent = "Update Record";
    modePill.hidden = false;
    clearAllErrors();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exitEditMode() {
    editingId = null;
    formTitle.textContent = "Add Production Record";
    formSub.textContent   = "Fill in the details and save the entry";
    saveLabel.textContent = "Save Record";
    modePill.hidden = true;
  }

  /* =================================================================
     Toast
     ================================================================= */
  let toastTimer;
  function toast(message, type = "success") {
    const t = $("#toast");
    const icons = {
      success: '<path d="M20 6 9 17l-5-5"/>',
      danger:  '<path d="M18 6 6 18M6 6l12 12"/>',
      info:    '<path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="9"/>'
    };
    t.className = "toast show " + type;
    t.innerHTML =
      `<span class="t-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icons[type]}</svg></span>` +
      `<span>${message}</span>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* =================================================================
     Events
     ================================================================= */
  // Clear field error as the user corrects it
  ["date", "shift", "machine", "operator", "quantity", "grade"].forEach((name) => {
    form.querySelector(`[name="${name}"]`).addEventListener("input", () => clearError(name));
  });

  // Submit (Save / Update)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      date: form.date.value,
      shift: form.shift.value,
      machine: form.machine.value,
      operator: form.operator.value,
      quantity: form.quantity.value,
      grade: form.grade.value,
      gsm: form.gsm.value,
      moisture: form.moisture.value,
      speed: form.speed.value,
      remarks: form.remarks.value.trim()
    };
    if (!validate(data)) return;
    data.quantity = parseFloat(data.quantity);

    const editing = editingId !== null;
    const url = editing ? "/api/production/" + editingId : "/api/production";

    smmApi(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(data) })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { toast(d.error || "Could not save record.", "danger"); return; }
        toast(editing ? "Record updated successfully" : "Production record saved");
        exitEditMode();
        form.reset();
        clearAllErrors();
        return load();
      })
      .catch(() => toast("Could not reach the server.", "danger"));
  });

  // Reset button — also exits edit mode
  form.addEventListener("reset", () => {
    clearAllErrors();
    exitEditMode();
  });

  // Cancel — leave the page (go back to dashboard)
  $("#cancelBtn").addEventListener("click", () => {
    window.location.href = "../dashboard/index.html";
  });

  // Search (live filter)
  searchInput.addEventListener("input", render);

  // Table action buttons (event delegation)
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".row-btn");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const record = records.find((r) => r.id === id);
    if (!record) return;

    if (btn.dataset.action === "edit") {
      enterEditMode(record);
    } else if (btn.dataset.action === "delete") {
      if (confirm(`Delete the ${record.machine} record from ${record.date}?`)) {
        smmApi("/api/production/" + id, { method: "DELETE" })
          .then((r) => { if (!r.ok) throw new Error(); if (editingId === id) { form.reset(); exitEditMode(); } return load(); })
          .then(() => toast("Record deleted", "danger"))
          .catch(() => toast("Could not delete record.", "danger"));
      }
    }
  });

  /* =================================================================
     Sidebar (responsive)
     ================================================================= */
  function initSidebar() {
    const sidebar = $("#sidebar");
    const overlay = $("#overlay");
    const open  = () => { sidebar.classList.add("open"); overlay.classList.add("show"); };
    const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); };
    $("#menuBtn").addEventListener("click", open);
    $("#sidebarClose").addEventListener("click", close);
    overlay.addEventListener("click", close);
  }

  /* =================================================================
     Init
     ================================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    fillSelect("machine", MACHINES);
    fillSelect("operator", OPERATORS);
    form.date.value = new Date().toISOString().slice(0, 10); // default today
    load();        // fetches from the API and renders
    initSidebar();
  });
})();
