# Smart Paper Mill Production Monitoring Dashboard

A web-based, real-time, role-based dashboard for monitoring the production of a paper
manufacturing plant — developed as an **industrial training / academic project** inspired by
**Satia Industries Ltd.** (writing & printing paper from wheat-straw and wood pulp).

> All data shown is **fictional but industry-realistic**. No confidential or proprietary company
> data is used.

---

## ✨ Features

- 🔐 **Secure auth** — bcrypt-hashed passwords, JWT, role-based access control (Admin / Manager / Supervisor / Operator)
- 📊 **Dashboard** — KPI cards (incl. **average OEE**), production-trend & machine-status charts, **live efficiency** feed
- 🏭 **Machine monitoring** — colour-coded status board with **live temperature & efficiency** (server push)
- 📄 **Production entry** — output, **GSM / moisture / speed**; out-of-spec readings flagged
- ⏱️ **Downtime logging** — reason + automatically computed duration
- 🔧 **Maintenance** — log and track jobs by priority and status
- 🧮 **OEE** — Availability × Performance × Quality, computed and charted
- 🚨 **Alerts** — threshold-driven panel with acknowledgement
- 📈 **Reports** — period / machine / shift filters, OEE-by-machine, **CSV & PDF export**
- ⚙️ **Admin panel** — manage **users, machines and thresholds**, view the **audit log**
- 🌗 **Dark mode**, responsive layout, and a 36-test automated backend suite

---

## 🧱 Tech stack

| Layer | Technology |
|-------|------------|
| Front-end | HTML5, CSS3, JavaScript, Chart.js |
| Backend | Python · Flask (REST API + static serving) |
| Database | SQLite (MySQL is the production target) |
| Security | bcrypt, PyJWT |
| Real-time | Server-Sent Events (SSE) |
| Tests | pytest |

---

## 🚀 Run it locally

**Prerequisites:** Python 3.9+ (developed on 3.13).

```bash
# 1. install backend dependencies (once)
pip install -r backend/requirements.txt

# 2. start the server (creates & seeds the database on first run)
python backend/app.py

# 3. open the app
#    http://localhost:5000
```

> Always open the app at **http://localhost:5000** — not by double-clicking the HTML files —
> because real authentication needs the backend.

### Demo accounts

| Role | Username | Password |
|------|----------|----------|
| Administrator | `admin` | `Admin@123` |
| Plant Manager | `manager` | `Manager@123` |
| Shift Supervisor | `supervisor` | `Super@123` |
| Machine Operator | `operator` | `Operator@123` |

---

## 🧪 Tests

```bash
python -m pytest -v        # 36 tests covering auth, RBAC, CRUD, thresholds, audit, streaming
```

---

## 📂 Project structure

```
SmartPaperMillDashboard/
├── login/  dashboard/  machines/  production/        # one folder per page
├── maintenance/  downtime/  reports/  settings/  alerts/
├── assets/        # shared sidebar, auth guard, theme
├── data/          # canonical demo dataset (MILL_DATA) + preview
├── backend/       # Flask API: auth, JWT, roles, SQLite  (app.py)
├── tests/         # automated backend tests (pytest)
├── docs/          # SRS, reports, user manuals, diagrams
├── render.yaml  Procfile  runtime.txt                 # deployment config
└── README.md
```

---

## ☁️ Deployment (free)

The app is deploy-ready for **Render** (free tier). See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**
for step-by-step instructions. In short: push this repo to GitHub, create a Render *Blueprint*
from `render.yaml`, and Render builds and runs it with gunicorn.

> Note: on free tiers the SQLite file lives on an ephemeral disk, so it **reseeds** on each
> redeploy — which is fine for a demonstration.

---

## 📚 Documentation

- `docs/Software_Requirements_Specification.docx` — SRS
- `docs/Final_Project_Report.docx` — final project report
- `docs/manuals/` — role-based user manuals
- `docs/TEST_REPORT.md` — test report
- `docs/diagrams/` — architecture & ER diagrams

---

## 📝 License & disclaimer

Academic / educational project. Built entirely with free, open-source tools. All production
figures are simulated and do not represent actual Satia Industries data.
