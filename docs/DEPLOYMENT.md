# Deployment Guide

The Smart Paper Mill Dashboard is a single Flask service that serves both the REST API and the
static front-end, so it can be deployed as one free web service. This guide uses **Render**
(free tier), but the same approach works on Railway or any host that runs a Python web process.

---

## What's already included

| File | Purpose |
|------|---------|
| `backend/requirements.txt` | Python dependencies (incl. `gunicorn` on Linux) |
| `render.yaml` | Render Blueprint — build & start commands, auto-generated secret |
| `Procfile` | Generic start command (Railway / Heroku-style hosts) |
| `runtime.txt` | Pins the Python version |

The app reads its signing key from the `SMM_SECRET_KEY` environment variable and binds to the
host-provided `$PORT`, so no code changes are needed to deploy.

---

## Option A — Render (Blueprint, recommended)

1. **Push to GitHub.** Create a repository and push this project:
   ```bash
   git remote add origin https://github.com/<you>/smart-paper-mill-dashboard.git
   git push -u origin main
   ```
2. Sign in to **https://render.com** (free account, GitHub login).
3. Click **New + → Blueprint**, select your repository. Render reads `render.yaml`.
4. Click **Apply**. Render runs:
   - **Build:** `pip install -r backend/requirements.txt`
   - **Start:** `gunicorn --workers 1 --threads 8 --timeout 120 --bind 0.0.0.0:$PORT backend.app:app`
5. When the deploy finishes, open the provided `https://<name>.onrender.com` URL and sign in
   with the demo accounts (see the README).

## Option B — Render (manual web service)

1. **New + → Web Service**, connect the repo.
2. Set **Build Command:** `pip install -r backend/requirements.txt`
3. Set **Start Command:** `gunicorn --workers 1 --threads 8 --timeout 120 --bind 0.0.0.0:$PORT backend.app:app`
4. Add an environment variable `SMM_SECRET_KEY` with a long random value.
5. Create the service and deploy.

---

## Notes & limitations

- **Single worker.** The live telemetry (SSE) keeps in-memory state, so run **one worker** with
  multiple **threads** (as configured). This is appropriate for a demonstration.
- **Ephemeral database.** On free tiers the filesystem is not persistent, so `mill.db` is
  recreated and **reseeded** on each redeploy. For persistent data, attach a disk (paid) or
  migrate to a managed database (e.g. Render PostgreSQL or a MySQL provider).
- **Set a strong secret.** In production always set `SMM_SECRET_KEY` (the Blueprint generates one
  automatically); never rely on the development default.
- **Cold starts.** Free web services sleep after inactivity and take a few seconds to wake.

---

## Local production-style run (optional)

To test the production server locally on Linux/macOS:

```bash
gunicorn --workers 1 --threads 8 --bind 0.0.0.0:5000 backend.app:app
```

On Windows, `gunicorn` does not run; use `python backend/app.py` for local development, or
`waitress-serve --port=5000 backend.app:app` after `pip install waitress`.
