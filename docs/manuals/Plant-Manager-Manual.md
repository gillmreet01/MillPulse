# Plant Manager — User Manual
### Smart Paper Mill Production Monitoring Dashboard · Satia Industries Ltd.

---

## 1. Who this manual is for

This manual is for the **Plant Manager** — the person who oversees overall production performance
and uses the dashboard mainly to **monitor, analyse and report**. Your focus is on understanding
how the plant is performing and producing summaries for management, rather than entering raw data.

---

## 2. Getting started

### 2.1 Opening the application
1. Start the backend server: `python backend/app.py`
2. Open **http://localhost:5000** in a web browser.

### 2.2 Signing in
1. Sign in with your Plant Manager credentials — username `manager`, password `Manager@123`.
2. Click **Sign In**. The **Dashboard** opens.

### 2.3 Moving around
Use the left **sidebar** to switch between Dashboard, Machines, Production, Maintenance and
Reports. The current page is highlighted. On mobile, use the **menu (☰)** button.

---

## 3. What you focus on

| Module | Why it matters to you |
|--------|-----------------------|
| Dashboard | A single-screen overview of plant performance |
| Machines | Health and utilization of all machines |
| Reports | Trend analysis and exportable summaries |
| Production / Maintenance | Reviewing what is happening on the floor |

---

## 4. Key tasks

### 4.1 Reading the Dashboard
1. Open **Dashboard**.
2. The five **summary cards** show Today's Production, Monthly Production, Running Machines,
   Maintenance Machines and Downtime Hours.
3. The **Production Trend** chart compares daily output with the target line.
4. The **Machine Status** chart shows the split of running, idle and maintenance machines.
5. The **Recent Production** table lists the most recent shift entries.

### 4.2 Checking machine health
1. Open **Machines**.
2. The chips at the top summarise Total, Running, Idle and Maintenance machines.
3. Each card shows status by colour — **green = running, yellow = idle, red = maintenance** —
   along with temperature, running hours, efficiency and capacity.
4. Use the **search box** or **status filter** to focus on specific machines.

### 4.3 Generating and exporting a report
1. Open **Reports**.
2. Choose a period using the tabs: **This Week, This Month, This Quarter** or **This Year**.
3. Review the summary cards and charts: Daily, Weekly and Monthly Production, Machine Utilization
   and Downtime Analysis.
4. Click **Export as PDF** (or **Print**). In the print dialog, choose **Save as PDF** to produce
   a shareable report. The sidebar and buttons are automatically hidden in the printed version.

### 4.4 Interpreting the figures
- **Efficiency / utilization** below target on a particular machine usually points to a
  maintenance or process issue — cross-check it in the Maintenance module.
- A **rising downtime** trend is an early warning; review the Downtime Analysis chart to see the
  main causes.

---

## 5. Tips and best practices

- Start each day on the Dashboard, then drill into Machines or Reports as needed.
- Export a PDF at the end of each week for management review.
- Compare shift-wise and grade-wise figures in Reports to spot patterns.

---

## 6. Troubleshooting

| Problem | What to do |
|---------|-----------|
| Charts are blank | Check your internet connection on first load. |
| PDF export looks wrong | Use a desktop browser and select A4 / Portrait in the print dialog. |
| Figures look unchanged | This demo uses fixed sample data; values are stable by design. |

---

## 7. Logging out
Click **Logout** at the bottom of the sidebar and confirm. You return to the login page.

---

*Smart Paper Mill Production Monitoring Dashboard — academic demonstration project.
All data shown is fictional.*
