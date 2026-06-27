# Backend — Authentication & Roles (Phase 2)

Real login for the Smart Paper Mill Production Monitoring Dashboard.

**Stack:** Flask · SQLite · bcrypt · JWT
The backend also serves the static front-end, so the whole app runs from one origin.

---

## 1. Setup (once)

```bash
pip install -r backend/requirements.txt
```

Requires Python 3.9+ (developed on 3.13). No database server is needed — SQLite is built in.

## 2. Run

```bash
python backend/app.py
```

On first run it creates `backend/mill.db` and seeds the four role accounts.
Then open **http://localhost:5000** — you are redirected to the login page.

> Always open the app at **http://localhost:5000**, not by double-clicking the HTML files.
> Real authentication needs the server (a `file://` page cannot reach the API).

## 3. Login accounts

| Role | Username | Password |
|------|----------|----------|
| Administrator | `admin` | `Admin@123` |
| Plant Manager | `manager` | `Manager@123` |
| Shift Supervisor | `supervisor` | `Super@123` |
| Machine Operator | `operator` | `Operator@123` |

Passwords are stored **bcrypt-hashed**; they are never kept in plain text.

## 4. How it works

- **Login** (`POST /api/login`) verifies the bcrypt hash and returns a signed **JWT** (8-hour expiry).
- The browser stores the token and sends it as `Authorization: Bearer <token>` on protected requests.
- **`token_required`** rejects missing/expired/invalid tokens (401).
- **`role_required(...)`** rejects users without the needed role (403).
- The front-end guard (`assets/auth.js`) redirects unauthenticated users to the login page and
  enforces page-level role rules (the **Settings** page is Administrator-only).

## 5. API reference

| Method & path | Auth | Purpose |
|---------------|------|---------|
| `GET  /api/health` | public | Service check |
| `POST /api/login` | public | Sign in → `{ token, user }` |
| `GET  /api/me` | any signed-in user | Current user profile |
| `GET  /api/users` | Administrator | List all users |
| `POST /api/users` | Administrator | Create a user |
| `GET  /api/admin/ping` | Administrator | Role-protection demo |

## 6. Notes for production

This is an academic build. Before real use you would:
- Set a strong `SMM_SECRET_KEY` environment variable (the default is for development only).
- Serve over HTTPS behind a production WSGI server (e.g. gunicorn/waitress), not Flask's dev server.
- Add token refresh, password-reset and account-lockout policies.
