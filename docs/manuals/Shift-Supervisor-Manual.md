# Shift Supervisor — User Manual
### Smart Paper Mill Production Monitoring Dashboard · Satia Industries Ltd.

---

## 1. Who this manual is for

This manual is for the **Shift Supervisor** — the person who runs a shift on the floor. Your main
responsibilities in the dashboard are to **log maintenance issues, track downtime, monitor machine
status and oversee the production entries** made by operators during your shift.

---

## 2. Getting started

### 2.1 Opening the application
1. Start the backend server: `python backend/app.py`
2. Open **http://localhost:5000** in a web browser.

### 2.2 Signing in
1. Sign in with your Shift Supervisor credentials — username `supervisor`, password `Super@123`.
2. Click **Sign In**. The **Dashboard** opens.

### 2.3 Knowing your shift
The top bar shows a live **shift indicator** and clock (Morning, Evening or Night), so you can
confirm the active shift at a glance.

---

## 3. What you focus on

| Module | Your role |
|--------|-----------|
| Machines | Watch live machine status during your shift |
| Downtime | Log machine stoppages with their cause and duration |
| Maintenance | Raise and track maintenance jobs |
| Production | Review and validate operator entries |
| Alerts | Review and acknowledge threshold-based alerts |
| Dashboard | Keep an eye on downtime and overall output |

---

## 4. Key tasks

### 4.1 Monitoring machines during the shift
1. Open **Machines**.
2. Watch the colour-coded status: **green = running, yellow = idle, red = maintenance**.
3. Note any machine showing a **high temperature** (shown in amber/red) or **low efficiency**, and
   raise a maintenance job if needed.

### 4.2 Logging a maintenance job
1. Open **Maintenance**.
2. In the **Add Maintenance Record** form, fill in:
   - **Machine** — the affected machine.
   - **Problem / Issue** — a clear description of the fault.
   - **Priority** — Low, Medium, High or Critical.
   - **Engineer** — the engineer you are assigning.
   - **Date** — defaults to today.
   - **Status** — usually **Open** for a new job.
3. Click **Save Record**. The job appears in the table below and the summary chips update.

### 4.3 Updating a maintenance job
1. Find the job in the table (use **search** or the **status / priority filters**).
2. Click the **edit (pencil)** icon to load it into the form.
3. Change the **Status** to *In Progress* or *Completed* as work proceeds, then click
   **Update Record**.
4. Use the **delete (bin)** icon only to remove an entry created in error.

### 4.4 Reviewing production entries
1. Open **Production**.
2. Use the **search box** to check the entries your operators have submitted this shift.
3. If an entry is wrong, click **edit** to correct it, or **delete** to remove a mistaken record.

### 4.5 Logging a downtime event
When a machine stops, record the stoppage so it is reflected in the downtime figures.
1. Open **Downtime** from the sidebar.
2. In the **Log Downtime Event** form, fill in:
   - **Date** — defaults to today.
   - **Machine** — the machine that stopped.
   - **Shift** — Morning, Evening or Night.
   - **Reason** — Mechanical, Electrical, Raw Material, Changeover, Planned, Power Cut or Other.
   - **Start Time** and **End Time** — when the stoppage began and ended.
3. Click **Save Event**. The **duration is calculated automatically**, the event appears in the
   table, and the summary chips (total events, total downtime, top reason) update.
4. Use the **search box** or the **reason filter** to review past events, and the **edit / delete**
   icons to correct them.

### 4.6 Watching overall downtime
- On the **Dashboard**, the **Downtime Hours** card and trend charts, and the **Downtime Analysis**
  chart in **Reports**, help you keep total downtime under control during your shift.

### 4.7 Reviewing alerts
1. Open **Alerts** from the sidebar.
2. Review the threshold-based alerts for your line (high temperature, low efficiency, maintenance
   due) and click **Acknowledge** to clear an alert, or **Mark all read** to clear the bell badge.

---

## 5. Tips and best practices

- Raise maintenance jobs as soon as a fault appears — set **Critical** priority for anything that
  stops production.
- Keep problem descriptions specific (for example, "Press roll bearing wear") so engineers can
  prepare the right spares.
- Validate operator entries before the end of the shift so the records are accurate for the next team.

---

## 6. Troubleshooting

| Problem | What to do |
|---------|-----------|
| A new maintenance or downtime entry is not saved | Check that all required fields are filled (errors appear in red) and that the backend server is running. |
| A job has the wrong status colour | Edit the record and set the correct status, then update. |
| A downtime duration looks wrong | Check the start and end times; the duration is computed from them (an end time before the start is treated as crossing midnight). |
| Machine values keep changing | Running machines update live every few seconds — this is normal. |

---

## 7. Logging out
Click **Logout** at the bottom of the sidebar and confirm. You return to the login page.

---

*Smart Paper Mill Production Monitoring Dashboard — academic demonstration project.
All data shown is fictional.*
