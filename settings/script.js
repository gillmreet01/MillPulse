/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Settings Page — JavaScript
   - Sub-navigation tabs
   - User management (admin): list / create / change role / activate / delete
     via the JWT-protected /api/users endpoints.
   (Sidebar, navigation, logout, dark mode handled by shared assets.)
   ================================================================= */

(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const ROLES = ["Administrator", "Plant Manager", "Shift Supervisor", "Machine Operator"];

  let selfId = null;
  try { const u = JSON.parse(localStorage.getItem("smm_user") || "null"); if (u) selfId = u.id; } catch (e) {}

  function api(path, opts) {
    if (typeof window.smmApi === "function") return window.smmApi(path, opts);
    opts = opts || {};
    opts.headers = Object.assign(
      { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("smm_token") || "") },
      opts.headers || {});
    return fetch(path, opts);
  }

  /* ---------- Sub-nav tabs ---------- */
  const navItems = document.querySelectorAll(".snav-item");
  const panels = document.querySelectorAll(".panel");
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      navItems.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.querySelector(`.panel[data-panel="${btn.dataset.tab}"]`);
      if (panel) panel.classList.add("active");
      if (btn.dataset.tab === "users") loadUsers();
      if (btn.dataset.tab === "machines") loadMachines();
      if (btn.dataset.tab === "thresholds") loadThresholds();
      if (btn.dataset.tab === "activity") loadActivity();
    });
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, type) {
    const t = $("#toast");
    const icon = type === "danger" ? '<path d="M18 6 6 18M6 6l12 12"/>' : '<path d="M20 6 9 17l-5-5"/>';
    t.className = "toast show" + (type === "danger" ? " danger" : "");
    t.innerHTML = '<span class="t-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg></span><span>' + msg + "</span>";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  }

  $("#saveBtn").addEventListener("click", () => toast("Settings saved successfully"));
  $("#resetBtn").addEventListener("click", () => toast("Changes discarded"));

  /* ================= USER MANAGEMENT ================= */
  const usersBody = $("#usersBody");
  const usersHint = $("#usersHint");
  const TRASH = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>';

  function loadUsers() {
    if (!usersBody) return;
    usersHint.textContent = "Loading users…";
    api("/api/users")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((users) => {
        usersBody.innerHTML = "";
        users.forEach((u) => usersBody.appendChild(buildUserRow(u)));
        usersHint.textContent = users.length + " user(s).";
      })
      .catch(() => { usersHint.textContent = "Could not load users — start the backend and sign in as Administrator."; });
  }

  function buildUserRow(u) {
    const tr = document.createElement("tr");
    const td = (text) => { const c = document.createElement("td"); c.textContent = text; return c; };

    tr.appendChild(td(u.name + (u.id === selfId ? "  (you)" : "")));
    tr.appendChild(td(u.email));
    tr.appendChild(td(u.username));

    // Role select
    const roleTd = document.createElement("td");
    const sel = document.createElement("select");
    sel.className = "row-role";
    ROLES.forEach((r) => { const o = document.createElement("option"); o.value = r; o.textContent = r; if (r === u.role) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", () => updateUser(u.id, { role: sel.value }));
    roleTd.appendChild(sel); tr.appendChild(roleTd);

    // Active toggle
    const actTd = document.createElement("td");
    const lbl = document.createElement("label"); lbl.className = "switch";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!u.is_active;
    const sl = document.createElement("span"); sl.className = "slider";
    cb.addEventListener("change", () => updateUser(u.id, { is_active: cb.checked }));
    lbl.appendChild(cb); lbl.appendChild(sl); actTd.appendChild(lbl); tr.appendChild(actTd);

    // Delete
    const delTd = document.createElement("td"); delTd.style.textAlign = "right";
    const del = document.createElement("button");
    del.className = "row-btn delete"; del.title = "Delete user"; del.innerHTML = TRASH;
    if (u.id === selfId) { del.disabled = true; del.style.opacity = "0.4"; del.style.cursor = "not-allowed"; }
    else del.addEventListener("click", () => deleteUser(u));
    delTd.appendChild(del); tr.appendChild(delTd);

    return tr;
  }

  function updateUser(id, patch) {
    api("/api/users/" + id, { method: "PUT", body: JSON.stringify(patch) })
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => { if (!ok) { toast(b.error || "Update failed", "danger"); loadUsers(); } else toast("User updated"); })
      .catch(() => toast("Update failed", "danger"));
  }

  function deleteUser(u) {
    if (!confirm("Delete user \"" + u.username + "\"? This cannot be undone.")) return;
    api("/api/users/" + u.id, { method: "DELETE" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => { toast("User deleted"); loadUsers(); })
      .catch(() => toast("Delete failed", "danger"));
  }

  /* ---------- Add user ---------- */
  const addForm = $("#addUserForm");
  if (addForm) {
    $("#addUserToggle").addEventListener("click", () => { addForm.hidden = !addForm.hidden; });
    $("#addUserCancel").addEventListener("click", () => { addForm.hidden = true; addForm.reset(); });
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        name: $("#nu_name").value.trim(), email: $("#nu_email").value.trim(),
        username: $("#nu_username").value.trim(), password: $("#nu_password").value,
        role: $("#nu_role").value,
      };
      if (!payload.name || !payload.email || !payload.username || !payload.password) {
        toast("All fields are required.", "danger"); return;
      }
      api("/api/users", { method: "POST", body: JSON.stringify(payload) })
        .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
        .then(({ ok, b }) => {
          if (!ok) { toast(b.error || "Could not create user.", "danger"); return; }
          toast("User created"); addForm.reset(); addForm.hidden = true; loadUsers();
        })
        .catch(() => toast("Could not create user.", "danger"));
    });
  }

  /* ================= MACHINE MANAGEMENT ================= */
  const machinesBody = $("#machinesBody");
  const machinesHint = $("#machinesHint");
  const DEPARTMENTS = ["Raw Material Yard", "Pulp Preparation", "Chemical Processing", "Paper Machine Section",
                       "Drying Section", "Finishing & Cutting", "Packaging", "Dispatch", "Maintenance", "Utilities"];
  const MSTATUS = ["Running", "Idle", "Maintenance", "Stopped"];

  function selectEl(options, current) {
    const sel = document.createElement("select"); sel.className = "row-role";
    options.forEach((o) => { const op = document.createElement("option"); op.value = o; op.textContent = o; if (o === current) op.selected = true; sel.appendChild(op); });
    return sel;
  }

  function loadMachines() {
    if (!machinesBody) return;
    machinesHint.textContent = "Loading machines…";
    api("/api/machines")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((list) => {
        machinesBody.innerHTML = "";
        list.forEach((m) => machinesBody.appendChild(buildMachineRow(m)));
        machinesHint.textContent = list.length + " machine(s).";
      })
      .catch(() => { machinesHint.textContent = "Could not load machines — start the backend and sign in as Administrator."; });
  }

  function buildMachineRow(m) {
    const tr = document.createElement("tr");
    const td = (text, cls) => { const c = document.createElement("td"); if (cls) c.className = cls; c.textContent = text; return c; };
    const idCell = td(m.machine_id); idCell.style.fontWeight = "600";
    tr.appendChild(idCell);
    tr.appendChild(td(m.name));
    const depTd = document.createElement("td");
    const dep = selectEl(DEPARTMENTS, m.department);
    dep.addEventListener("change", () => updateMachine(m.id, { department: dep.value }));
    depTd.appendChild(dep); tr.appendChild(depTd);
    tr.appendChild(td(m.capacity == null ? "—" : m.capacity, "num"));
    const stTd = document.createElement("td");
    const st = selectEl(MSTATUS, m.status);
    st.addEventListener("change", () => updateMachine(m.id, { status: st.value }));
    stTd.appendChild(st); tr.appendChild(stTd);
    const actTd = document.createElement("td");
    const lbl = document.createElement("label"); lbl.className = "switch";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!m.is_active;
    const sl = document.createElement("span"); sl.className = "slider";
    cb.addEventListener("change", () => updateMachine(m.id, { is_active: cb.checked }));
    lbl.appendChild(cb); lbl.appendChild(sl); actTd.appendChild(lbl); tr.appendChild(actTd);
    const delTd = document.createElement("td"); delTd.style.textAlign = "right";
    const del = document.createElement("button"); del.className = "row-btn delete"; del.title = "Delete machine"; del.innerHTML = TRASH;
    del.addEventListener("click", () => {
      if (!confirm("Delete machine \"" + m.machine_id + "\"?")) return;
      api("/api/machines/" + m.id, { method: "DELETE" })
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then(() => { toast("Machine deleted"); loadMachines(); })
        .catch(() => toast("Delete failed", "danger"));
    });
    delTd.appendChild(del); tr.appendChild(delTd);
    return tr;
  }

  function updateMachine(id, patch) {
    api("/api/machines/" + id, { method: "PUT", body: JSON.stringify(patch) })
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => { if (!ok) { toast(b.error || "Update failed", "danger"); loadMachines(); } else toast("Machine updated"); })
      .catch(() => toast("Update failed", "danger"));
  }

  const addMachineForm = $("#addMachineForm");
  if (addMachineForm) {
    $("#addMachineToggle").addEventListener("click", () => { addMachineForm.hidden = !addMachineForm.hidden; });
    $("#addMachineCancel").addEventListener("click", () => { addMachineForm.hidden = true; addMachineForm.reset(); });
    addMachineForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        machine_id: $("#nm_id").value.trim(), name: $("#nm_name").value.trim(),
        department: $("#nm_department").value, capacity: $("#nm_capacity").value, status: $("#nm_status").value,
      };
      if (!payload.machine_id || !payload.name) { toast("Machine ID and name are required.", "danger"); return; }
      api("/api/machines", { method: "POST", body: JSON.stringify(payload) })
        .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
        .then(({ ok, b }) => {
          if (!ok) { toast(b.error || "Could not create machine.", "danger"); return; }
          toast("Machine created"); addMachineForm.reset(); addMachineForm.hidden = true; loadMachines();
        })
        .catch(() => toast("Could not create machine.", "danger"));
    });
  }

  /* ================= THRESHOLDS ================= */
  const TH_KEYS = ["gsm_min", "gsm_max", "moisture_max", "temp_max", "efficiency_min", "downtime_max"];
  function loadThresholds() {
    api("/api/thresholds")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((th) => {
        TH_KEYS.forEach((k) => { const el = $("#th_" + k); if (el && th[k] != null) el.value = th[k]; });
        if ($("#thresholdsHint")) $("#thresholdsHint").textContent = "";
      })
      .catch(() => { if ($("#thresholdsHint")) $("#thresholdsHint").textContent = "Could not load thresholds."; });
  }
  const saveTh = $("#saveThresholdsBtn");
  if (saveTh) {
    saveTh.addEventListener("click", () => {
      const payload = {};
      TH_KEYS.forEach((k) => { const el = $("#th_" + k); if (el && el.value !== "") payload[k] = el.value; });
      api("/api/thresholds", { method: "PUT", body: JSON.stringify(payload) })
        .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
        .then(({ ok, b }) => {
          if (!ok) { toast(b.error || "Could not save thresholds.", "danger"); return; }
          toast("Thresholds saved");
          TH_KEYS.forEach((k) => { const el = $("#th_" + k); if (el && b[k] != null) el.value = b[k]; });
        })
        .catch(() => toast("Could not save thresholds.", "danger"));
    });
  }

  /* ================= ACTIVITY LOG ================= */
  const activityBody = $("#activityBody");
  const activityHint = $("#activityHint");
  function fmtTime(iso) { try { return new Date(iso).toLocaleString([], { hour12: false }); } catch (e) { return iso; } }
  function loadActivity() {
    if (!activityBody) return;
    activityHint.textContent = "Loading activity…";
    api("/api/activity")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((rows) => {
        activityBody.innerHTML = "";
        rows.forEach((a) => {
          const tr = document.createElement("tr");
          const td = (t) => { const c = document.createElement("td"); c.textContent = t; return c; };
          tr.appendChild(td(fmtTime(a.timestamp)));
          tr.appendChild(td(a.user));
          tr.appendChild(td(a.action));
          tr.appendChild(td(a.entity));
          tr.appendChild(td(a.detail));
          activityBody.appendChild(tr);
        });
        activityHint.textContent = rows.length + " event(s) (latest 200).";
      })
      .catch(() => { activityHint.textContent = "Could not load activity — sign in as Administrator."; });
  }
  if ($("#refreshActivity")) $("#refreshActivity").addEventListener("click", loadActivity);
})();
