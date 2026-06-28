# Administrator — User Manual
### Smart Paper Mill Production Monitoring Dashboard · Satia Industries Ltd.

---

## 1. Who this manual is for

This manual is for the **Administrator** — the person responsible for the overall operation,
configuration and oversight of the dashboard. The Administrator has access to every module and is
the only role that can **manage user accounts and machines, configure thresholds and review the
activity (audit) log**, in addition to notification and appearance settings.

---

## 2. Getting started

### 2.1 Opening the application
1. Start the backend server: `python backend/app.py`
2. Open **http://localhost:5000** in a web browser (Chrome, Edge or Firefox).

### 2.2 Signing in
1. Enter your **Username** and **Password**.
   - As Administrator, sign in with username `admin`, password `Admin@123`.
2. (Optional) Use the **eye icon** to reveal the password, and tick **Remember me** to save your username.
3. Click **Sign In**. You are taken to the **Dashboard**.

### 2.3 Moving around
- The **sidebar** on the left links to every module: Dashboard, Production, Machines, Maintenance,
  Downtime, Reports, Alerts, Settings and Logout. The page you are on is highlighted.
- On a small screen, tap the **menu (☰) button** in the top bar to open the sidebar.

---

## 3. What you can do

As Administrator you have **full access**:

| Module | Your actions |
|--------|--------------|
| Dashboard | View all plant KPIs, charts and recent activity |
| Machines | Monitor all 20 machines and their live status |
| Production | View, add, edit and delete production records |
| Maintenance | Raise, assign, update and close maintenance jobs |
| Downtime | Log and review machine stoppages and their causes |
| Reports | Generate and export analytical reports (CSV / PDF) |
| Alerts | Review and acknowledge threshold-based alerts |
| Settings (admin) | **Manage users, machines and thresholds**; **view the activity (audit) log**; set notification and appearance preferences |

---

## 4. Daily tasks

### 4.1 Reviewing plant status (Dashboard)
1. Open **Dashboard** from the sidebar.
2. Read the **summary cards**: Today's Production, Monthly Production, **Average OEE**, Running
   Machines, Maintenance Machines and Downtime Hours.
3. Use the **Production Trend** chart to check output against target, and the **Machine Status**
   chart to see how many machines are running, idle or under maintenance. The top-bar
   live-efficiency figure updates from the server.
4. Check the **Recent Production** table for the latest entries.

### 4.2 Overseeing production, maintenance and downtime
- In **Production**, you can correct or remove any record using the **edit** and **delete** icons.
- In **Maintenance**, you can change a job's **status** (Open → In Progress → Completed),
  reassign engineers, or delete obsolete entries.
- In **Downtime**, you can review logged stoppages, filter them by reason, and add or correct events.
  The duration of each event is calculated automatically from the start and end times.

### 4.3 Managing user accounts (Settings → Users)
This is an Administrator-only function.
1. Open **Settings** → **Users** tab. A table of all accounts is shown.
2. To **add a user**, click **+ Add User**, fill in name, email, username, password and role, then
   click **Create User**.
3. To **change a role**, use the **role dropdown** on that user's row — the change saves immediately.
4. To **enable or disable** an account, use the **Active** toggle on that row.
5. To **delete** a user, click the **bin** icon. (You cannot delete your own account.)

### 4.4 Managing machines (Settings → Machines)
1. Open **Settings** → **Machines** tab.
2. To **add a machine**, click **+ Add Machine** and enter its ID, name, department, capacity and status.
3. To **edit** a machine, change its **department** or **status** dropdown, or its **Active** toggle,
   directly on the row.
4. To **remove** a machine, click the **bin** icon.

### 4.5 Configuring thresholds (Settings → Thresholds)
Thresholds control when the system flags a quality or temperature problem.
1. Open **Settings** → **Thresholds** tab. Current values are loaded from the server.
2. Adjust GSM minimum/maximum, maximum moisture, maximum temperature, minimum efficiency and the
   downtime alert limit.
3. Click **Save Thresholds**. The values are stored on the server and used to flag out-of-spec data.

### 4.6 Reviewing the activity (audit) log (Settings → Activity)
1. Open **Settings** → **Activity** tab.
2. The table lists key actions — sign-ins, and changes to users, machines, thresholds, production,
   maintenance and downtime — with the time, user, action and details.
3. Use **Refresh** to load the latest entries.

### 4.7 Notifications and appearance (Settings)
1. In **Settings → Notifications**, choose which alerts you want (machine downtime, quality
   deviations, maintenance due, daily report email).
2. In **Settings → Appearance**, adjust density, toggle **Dark mode**, and the live-ticker option.

### 4.8 Reviewing alerts
- Open **Alerts** from the sidebar to see threshold-based alerts (for example, high temperature or
  low efficiency). Click **Acknowledge** on an alert, or **Mark all read**, to clear the bell badge.

---

## 5. Tips and best practices

- Review the Dashboard at the start of each shift to catch issues early.
- Keep thresholds realistic — values that are too tight create unnecessary alerts.
- Use the Reports module weekly to track trends rather than relying only on daily figures.

---

## 6. Troubleshooting

| Problem | What to do |
|---------|-----------|
| Charts do not appear | Ensure you have an internet connection on first load (the charting library loads online). |
| Sidebar links do nothing | Confirm the backend is running and that you opened the app at **http://localhost:5000**. |
| Settings changes seem lost | Click **Save** before leaving the page. |
| Entered records disappear / "could not reach server" | Records are saved in the **database via the backend**. If they don't appear, the backend server is not running — start it with `python backend/app.py` and reload. |
| User / machine / threshold changes fail | These are Administrator-only. Confirm you are signed in as `admin`. |

---

## 7. Logging out
1. Click **Logout** at the bottom of the sidebar.
2. Confirm when prompted. You are returned to the login page.

---

*Smart Paper Mill Production Monitoring Dashboard — academic demonstration project.
All data shown is fictional.*
