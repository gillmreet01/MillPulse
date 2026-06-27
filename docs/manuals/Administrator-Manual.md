# Administrator — User Manual
### Smart Paper Mill Production Monitoring Dashboard · Satia Industries Ltd.

---

## 1. Who this manual is for

This manual is for the **Administrator** — the person responsible for the overall operation,
configuration and oversight of the dashboard. The Administrator has access to every module and
controls system-wide settings such as alert thresholds, notification preferences and appearance.

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
  Reports, Settings and Logout. The page you are on is highlighted.
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
| Reports | Generate and export analytical reports |
| Settings | Configure profile, notifications, thresholds and appearance |

---

## 4. Daily tasks

### 4.1 Reviewing plant status (Dashboard)
1. Open **Dashboard** from the sidebar.
2. Read the five **summary cards**: Today's Production, Monthly Production, Running Machines,
   Maintenance Machines and Downtime Hours.
3. Use the **Production Trend** chart to check output against target, and the **Machine Status**
   chart to see how many machines are running, idle or under maintenance.
4. Check the **Recent Production** table for the latest entries.

### 4.2 Configuring thresholds (Settings)
Thresholds control when the system flags a quality or temperature problem.
1. Open **Settings** → **Thresholds** tab.
2. Adjust values such as GSM minimum/maximum, maximum moisture, maximum temperature and
   minimum efficiency.
3. Click **Save Changes**. A confirmation message appears.

### 4.3 Managing notifications and appearance
1. In **Settings → Notifications**, turn alerts on or off (machine downtime, quality deviations,
   maintenance due, daily report email).
2. In **Settings → Appearance**, adjust density, theme and live-ticker options.
3. Click **Save Changes**.

### 4.4 Overseeing production and maintenance
- In **Production**, you can correct or remove any record using the **edit** and **delete** icons.
- In **Maintenance**, you can change a job's **status** (Open → In Progress → Completed),
  reassign engineers, or delete obsolete entries.

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
| Sidebar links do nothing | Refresh the page; confirm all project folders are kept together. |
| Settings changes seem lost | Click **Save Changes** before leaving the page. |
| Entered records disappear | Records are stored in the browser; clearing browser data removes them. |

---

## 7. Logging out
1. Click **Logout** at the bottom of the sidebar.
2. Confirm when prompted. You are returned to the login page.

---

*Smart Paper Mill Production Monitoring Dashboard — academic demonstration project.
All data shown is fictional.*
