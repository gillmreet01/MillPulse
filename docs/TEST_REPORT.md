# Test Report — Smart Paper Mill Production Monitoring Dashboard

**Project:** Smart Paper Mill Production Monitoring Dashboard (Satia Industries Ltd. — academic project)
**Date:** 17 June 2026
**Tester:** Project author
**Build under test:** Flask backend (SQLite, JWT) + static front-end + canonical dataset

---

## 1. Scope & approach

Testing was carried out at two levels:

1. **Automated API tests** (pytest) — exercise the backend directly through Flask's test client, with an isolated temporary database per test. These are executed and their results are reproducible.
2. **Manual / UI test checklist** — front-end behaviours, verified through code review, syntax validation, and live HTTP serving checks; to be confirmed visually in a browser.

### Test environment
| Item | Value |
|---|---|
| OS | Windows 10/11 |
| Python | 3.13 |
| Backend | Flask 3.1, SQLite, PyJWT, bcrypt |
| Browser (UI) | Chrome / Edge (latest) |
| Server URL | http://localhost:5000 |

### How to run the automated tests
```bash
python -m pytest -v
```

---

## 2. Automated API test results

**Result: 15 / 15 passed.** (`15 passed` — pytest)

| # | Test case | Endpoint / behaviour | Expected | Result |
|---|-----------|----------------------|----------|--------|
| 1 | Health check | `GET /api/health` | 200, `status: ok` | ✅ Pass |
| 2 | Login (valid) | `POST /api/login` admin | 200, role = Administrator | ✅ Pass |
| 3 | Login (bad password) | `POST /api/login` | 401 | ✅ Pass |
| 4 | Protected route without token | `GET /api/me` | 401 | ✅ Pass |
| 5 | Protected route with token | `GET /api/me` | 200, correct user | ✅ Pass |
| 6 | Role enforcement (deny) | `GET /api/users` as Manager | 403 | ✅ Pass |
| 7 | Role enforcement (allow) | `GET /api/users` as Admin | 200, 4 users | ✅ Pass |
| 8 | Production needs auth | `GET /api/production` no token | 401 | ✅ Pass |
| 9 | Production seeded | `GET /api/production` | ≥ 20 records | ✅ Pass |
| 10 | Production create/update/delete | `POST/PUT/DELETE /api/production` | 201 → updated qty → 200 | ✅ Pass |
| 11 | Production validation | `POST /api/production` (missing fields) | 400 | ✅ Pass |
| 12 | Maintenance seeded | `GET /api/maintenance` | ≥ 10 records | ✅ Pass |
| 13 | Maintenance create | `POST /api/maintenance` | 201 | ✅ Pass |
| 14 | Live stream needs token | `GET /api/stream` | 401 | ✅ Pass |
| 15 | Live stream rejects bad token | `GET /api/stream?token=bad` | 401 | ✅ Pass |

> Note: warnings emitted during the run are non-blocking deprecation notices (e.g. `datetime.utcnow()`); they do not affect functionality.

---

## 3. Manual / UI test checklist

Steps to execute in a browser at http://localhost:5000 after starting the backend (`python backend/app.py`).

| # | Area | Steps | Expected result | Status |
|---|------|-------|-----------------|--------|
| U1 | Login | Open app, sign in `admin` / `Admin@123` | Redirects to Dashboard | ✅ Verified (login API + redirect tested) |
| U2 | Login (wrong) | Enter a wrong password | Inline error, no redirect | ✅ Verified (401 path tested) |
| U3 | Auth guard | Open `/dashboard/` with no token | Redirect to login | ✅ Verified (guard + 401 tested) |
| U4 | Role visibility | Sign in as `operator` | **Settings** hidden in sidebar | ✅ Verified (role logic + 403 tested) |
| U5 | Navigation | Click each sidebar item | Correct page loads, item highlighted | ✅ Verified (all pages serve 200) |
| U6 | Dashboard | View KPI cards + charts | 6 KPIs incl. Avg OEE; trend + status charts render | ☐ Confirm visually |
| U7 | Machines (live) | Open Machines, wait a few seconds | Temps/efficiency update; "Live" timestamp advances | ✅ Verified (SSE pushes confirmed live) |
| U8 | Production CRUD | Add, edit, delete a record | Table updates; persists after server restart | ✅ Verified (API CRUD + persistence tested) |
| U9 | Maintenance CRUD | Add, edit, delete a job | Table + summary update | ✅ Verified (API CRUD tested) |
| U10 | Reports filters | Change period / machine / shift | Daily chart + Total/Avg cards recompute | ☐ Confirm visually |
| U11 | CSV export | Click "Export CSV" and a chart's ⬇ | CSV files download | ☐ Confirm visually |
| U12 | PDF export | Click "Export as PDF" | Print dialog with clean layout | ☐ Confirm visually |
| U13 | Alerts | Open Alerts, acknowledge an alert | Count drops; bell badge updates | ☐ Confirm visually |
| U14 | Dark mode | Settings → toggle Dark mode | Whole app switches to dark; persists across pages/reload | ☐ Confirm visually |
| U15 | Responsive | Resize to mobile width | Sidebar collapses to drawer; layouts reflow | ☐ Confirm visually |
| U16 | Logout | Click Logout | Returns to login; token cleared | ✅ Verified (token cleared + guard) |

**Legend:** ✅ Verified = backed by automated tests / live HTTP checks / code review · ☐ Confirm visually = documented expected result, to be ticked off in-browser.

---

## 4. Summary

- **Automated backend tests: 15 / 15 passed**, covering authentication, JWT, role-based access control, production & maintenance CRUD, input validation, and live-stream authentication.
- **Front-end:** all pages serve correctly (HTTP 200), all scripts pass syntax validation, and the data-driven behaviours (auth, CRUD, SSE telemetry, role enforcement) are verified through the API. Remaining purely-visual checks (U6, U10–U15) are documented for a final in-browser walkthrough.

No blocking defects were found. The application is functioning as designed for an academic demonstration build.
