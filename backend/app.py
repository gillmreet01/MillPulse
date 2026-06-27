"""
Smart Paper Mill Production Monitoring Dashboard
Backend — Authentication & Roles (Phase 2)

Stack: Flask + SQLite + bcrypt + JWT
- Real users table with bcrypt-hashed passwords
- JWT-based login (8-hour tokens)
- Role-based route protection
- Also serves the static front-end so everything is same-origin

Run:   python backend/app.py
Then open:  http://localhost:5000/
"""

import os
import sqlite3
import datetime
import functools
import random
import json
import time

import bcrypt
import jwt
from flask import Flask, request, jsonify, g, redirect, send_from_directory, abort, Response

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)                 # the dashboard project folder
DB_PATH = os.path.join(BASE_DIR, "mill.db")
SECRET_KEY = os.environ.get("SMM_SECRET_KEY", "dev-secret-change-in-production-please-32b+")
TOKEN_HOURS = 8

ROLES = ["Administrator", "Plant Manager", "Shift Supervisor", "Machine Operator"]

# Seed accounts (one login id per user type). Passwords are hashed at first run.
SEED_USERS = [
    {"name": "Amrit Singh",   "email": "admin@satia.local",      "username": "admin",      "password": "Admin@123",    "role": "Administrator"},
    {"name": "Rakesh Verma",  "email": "manager@satia.local",    "username": "manager",    "password": "Manager@123",  "role": "Plant Manager"},
    {"name": "Harpreet Kaur", "email": "supervisor@satia.local", "username": "supervisor", "password": "Super@123",    "role": "Shift Supervisor"},
    {"name": "Vikram Patel",  "email": "operator@satia.local",   "username": "operator",   "password": "Operator@123", "role": "Machine Operator"},
]

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_pw(plain):
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_pw(plain, hashed):
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            email         TEXT    UNIQUE NOT NULL,
            username      TEXT    UNIQUE NOT NULL,
            password_hash TEXT    NOT NULL,
            role          TEXT    NOT NULL,
            is_active     INTEGER NOT NULL DEFAULT 1,
            created_at    TEXT    NOT NULL
        )
        """
    )
    conn.commit()

    # Seed the four role accounts only if the table is empty
    count = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    if count == 0:
        now = datetime.datetime.utcnow().isoformat()
        for u in SEED_USERS:
            conn.execute(
                "INSERT INTO users (name, email, username, password_hash, role, is_active, created_at) "
                "VALUES (?, ?, ?, ?, ?, 1, ?)",
                (u["name"], u["email"], u["username"], hash_pw(u["password"]), u["role"], now),
            )
        conn.commit()
        print("[init] Seeded %d users (admin / manager / supervisor / operator)." % len(SEED_USERS))

    # Production records
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS production_records (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            date       TEXT NOT NULL,
            shift      TEXT NOT NULL,
            machine    TEXT NOT NULL,
            operator   TEXT NOT NULL,
            quantity   REAL NOT NULL,
            grade      TEXT NOT NULL,
            gsm        REAL,
            moisture   REAL,
            speed      REAL,
            remarks    TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    # Idempotent migration: add quality columns to a pre-existing database
    cols = [r["name"] for r in conn.execute("PRAGMA table_info(production_records)").fetchall()]
    for col in ("gsm", "moisture", "speed"):
        if col not in cols:
            conn.execute("ALTER TABLE production_records ADD COLUMN %s REAL" % col)

    # Maintenance logs
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS maintenance_logs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            machine    TEXT NOT NULL,
            problem    TEXT NOT NULL,
            priority   TEXT NOT NULL,
            engineer   TEXT NOT NULL,
            date       TEXT NOT NULL,
            status     TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    # Downtime events
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS downtime_events (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            date         TEXT NOT NULL,
            machine      TEXT NOT NULL,
            shift        TEXT NOT NULL,
            reason       TEXT NOT NULL,
            start_time   TEXT NOT NULL,
            end_time     TEXT NOT NULL,
            duration_min INTEGER NOT NULL,
            created_at   TEXT NOT NULL
        )
        """
    )
    # Machines (master data — managed from the admin panel)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS machines (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT UNIQUE NOT NULL,
            name       TEXT NOT NULL,
            department TEXT NOT NULL,
            capacity   REAL,
            status     TEXT NOT NULL DEFAULT 'Idle',
            is_active  INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
        """
    )
    # Thresholds (key-value configuration)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS thresholds (
            key   TEXT PRIMARY KEY,
            value REAL NOT NULL
        )
        """
    )
    # Activity / audit log
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS activity_logs (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            user      TEXT NOT NULL,
            action    TEXT NOT NULL,
            entity    TEXT,
            detail    TEXT,
            timestamp TEXT NOT NULL
        )
        """
    )
    conn.commit()
    seed_demo_data(conn)
    conn.close()


def user_public(row):
    """Return a user dict without the password hash."""
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "username": row["username"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
    }


def optional_number(v):
    if v in (None, ""):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def audit(action, entity="", detail="", user=None):
    """Record a key action in the activity log."""
    try:
        if user is None:
            user = g.user["username"] if getattr(g, "user", None) is not None else "system"
    except Exception:
        user = "system"
    conn = get_db()
    conn.execute("INSERT INTO activity_logs (user, action, entity, detail, timestamp) VALUES (?, ?, ?, ?, ?)",
                 (user, action, entity, detail, datetime.datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def production_public(row):
    return {
        "id": row["id"], "date": row["date"], "shift": row["shift"], "machine": row["machine"],
        "operator": row["operator"], "quantity": row["quantity"], "grade": row["grade"],
        "gsm": row["gsm"], "moisture": row["moisture"], "speed": row["speed"],
        "remarks": row["remarks"] or "", "created_at": row["created_at"],
    }


def maintenance_public(row):
    return {
        "id": row["id"], "machine": row["machine"], "problem": row["problem"], "priority": row["priority"],
        "engineer": row["engineer"], "date": row["date"], "status": row["status"], "created_at": row["created_at"],
    }


def downtime_public(row):
    return {
        "id": row["id"], "date": row["date"], "machine": row["machine"], "shift": row["shift"],
        "reason": row["reason"], "start_time": row["start_time"], "end_time": row["end_time"],
        "duration_min": row["duration_min"], "created_at": row["created_at"],
    }


def machine_public(row):
    return {
        "id": row["id"], "machine_id": row["machine_id"], "name": row["name"],
        "department": row["department"], "capacity": row["capacity"], "status": row["status"],
        "is_active": bool(row["is_active"]), "created_at": row["created_at"],
    }


def seed_demo_data(conn):
    """Seed production & maintenance tables on first run (idempotent)."""
    rnd = random.Random(20260616)
    base = datetime.date(2026, 6, 16)
    now = datetime.datetime.utcnow().isoformat()

    if conn.execute("SELECT COUNT(*) AS c FROM production_records").fetchone()["c"] == 0:
        machines = ["PM-109", "PM-110", "PM-111"]
        operators = ["Amrit Singh", "Harpreet Kaur", "Rajesh Kumar", "Simran Gill", "Vikram Patel", "Manjeet Singh"]
        grades = ["Copier Paper (70 GSM)", "Writing Paper (80 GSM)", "Printing Paper (90 GSM)",
                  "Packaging Paper (120 GSM)", "Premium Bond Paper"]
        shifts = ["Morning", "Evening", "Night"]
        remarks = ["Running smooth", "Minor speed dip", "Grade change mid-shift", "Within target",
                   "Steam pressure adjusted", ""]
        gsm_vals = [48, 54, 58, 60, 64, 70, 80, 90, 100, 120]
        rows = []
        for _ in range(24):
            d = base - datetime.timedelta(days=rnd.randint(0, 14))
            rows.append((d.isoformat(), rnd.choice(shifts), rnd.choice(machines), rnd.choice(operators),
                         round(rnd.uniform(30, 50), 1), rnd.choice(grades),
                         rnd.choice(gsm_vals), round(rnd.uniform(4.0, 6.5), 1), rnd.randint(550, 680),
                         rnd.choice(remarks), now))
        conn.executemany(
            "INSERT INTO production_records (date, shift, machine, operator, quantity, grade, gsm, moisture, speed, remarks, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)
        conn.commit()
        print("[init] Seeded %d production records." % len(rows))

    if conn.execute("SELECT COUNT(*) AS c FROM maintenance_logs").fetchone()["c"] == 0:
        machines = ["PM-%d" % n for n in range(101, 121)]
        problems = ["Dryer cylinder steam leak", "Press roll bearing wear", "Wire mesh tear",
                    "Felt replacement required", "Gearbox oil leakage", "Vacuum pump failure",
                    "Calender roll surface damage", "Headbox pressure fluctuation", "Conveyor belt misalignment",
                    "Refiner plate wear", "Boiler feed pump trip", "ClO2 dosing valve stuck",
                    "Routine preventive lubrication", "PLC communication error"]
        priorities = ["Low", "Medium", "High", "Critical"]
        engineers = ["Ravi Sharma", "Gurpreet Singh", "Neha Verma", "Arjun Mehta", "Karan Gill", "Sandeep Rana"]
        statuses = ["Open", "In Progress", "Completed", "Cancelled"]
        rows = []
        for _ in range(12):
            d = base - datetime.timedelta(days=rnd.randint(0, 40))
            rows.append((rnd.choice(machines), rnd.choice(problems), rnd.choice(priorities),
                         rnd.choice(engineers), d.isoformat(), rnd.choice(statuses), now))
        conn.executemany(
            "INSERT INTO maintenance_logs (machine, problem, priority, engineer, date, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)", rows)
        conn.commit()
        print("[init] Seeded %d maintenance logs." % len(rows))

    if conn.execute("SELECT COUNT(*) AS c FROM downtime_events").fetchone()["c"] == 0:
        machines = ["PM-%d" % n for n in range(101, 121)]
        reasons = ["Mechanical", "Electrical", "Raw Material", "Changeover", "Planned", "Power Cut"]
        shifts = ["Morning", "Evening", "Night"]
        rows = []
        for _ in range(15):
            d = base - datetime.timedelta(days=rnd.randint(0, 25))
            dur = rnd.randint(10, 180)
            start_min = rnd.randint(6, 20) * 60 + rnd.choice([0, 15, 30, 45])
            end_min = start_min + dur
            st = "%02d:%02d" % (start_min // 60 % 24, start_min % 60)
            en = "%02d:%02d" % (end_min // 60 % 24, end_min % 60)
            rows.append((d.isoformat(), rnd.choice(machines), rnd.choice(shifts), rnd.choice(reasons), st, en, dur, now))
        conn.executemany(
            "INSERT INTO downtime_events (date, machine, shift, reason, start_time, end_time, duration_min, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", rows)
        conn.commit()
        print("[init] Seeded %d downtime events." % len(rows))

    if conn.execute("SELECT COUNT(*) AS c FROM machines").fetchone()["c"] == 0:
        specs = [
            ("PM-101", "Straw Conveyor System", "Raw Material Yard", 350),
            ("PM-102", "Wood Chipper", "Raw Material Yard", 300),
            ("PM-103", "Hydrapulper", "Pulp Preparation", 280),
            ("PM-104", "Pulp Refiner", "Pulp Preparation", 260),
            ("PM-105", "Batch Digester", "Pulp Preparation", 240),
            ("PM-106", "Bleaching Tower", "Chemical Processing", 220),
            ("PM-107", "Chemical Dosing Unit", "Chemical Processing", 200),
            ("PM-108", "ClO2 Generator", "Chemical Processing", 180),
            ("PM-109", "Paper Machine 1", "Paper Machine Section", 160),
            ("PM-110", "Paper Machine 2", "Paper Machine Section", 150),
            ("PM-111", "Paper Machine 3", "Paper Machine Section", 140),
            ("PM-112", "Headbox & Wire Section", "Paper Machine Section", 160),
            ("PM-113", "Drying Cylinder Bank", "Drying Section", 170),
            ("PM-114", "Steam Dryer Unit", "Drying Section", 160),
            ("PM-115", "Calender Stack", "Finishing & Cutting", 150),
            ("PM-116", "Sheet Cutter", "Finishing & Cutting", 120),
            ("PM-117", "Rewinder", "Finishing & Cutting", 130),
            ("PM-118", "Ream Wrapping Line", "Packaging", 110),
            ("PM-119", "Automated Stacker", "Dispatch", 100),
            ("PM-120", "Co-gen Power Boiler", "Utilities", 320),
        ]
        sts = ["Running", "Idle", "Maintenance"]
        rows = [(s[0], s[1], s[2], s[3], rnd.choice(sts), 1, now) for s in specs]
        conn.executemany(
            "INSERT INTO machines (machine_id, name, department, capacity, status, is_active, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)", rows)
        conn.commit()
        print("[init] Seeded %d machines." % len(rows))

    if conn.execute("SELECT COUNT(*) AS c FROM thresholds").fetchone()["c"] == 0:
        defaults = {"gsm_min": 45, "gsm_max": 120, "moisture_max": 6.5,
                    "temp_max": 88, "efficiency_min": 75, "downtime_max": 60}
        conn.executemany("INSERT INTO thresholds (key, value) VALUES (?, ?)", list(defaults.items()))
        conn.commit()
        print("[init] Seeded threshold defaults.")


# ---------------------------------------------------------------------------
# JWT helpers + decorators
# ---------------------------------------------------------------------------
def make_token(user_row):
    payload = {
        "sub": str(user_row["id"]),     # PyJWT requires the subject claim to be a string
        "username": user_row["username"],
        "role": user_row["role"],
        "name": user_row["name"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_HOURS),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def token_required(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Authentication required."}), 401
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired. Please sign in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token."}), 401

        conn = get_db()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (int(payload["sub"]),)).fetchone()
        conn.close()
        if row is None or not row["is_active"]:
            return jsonify({"error": "Account not found or disabled."}), 401
        g.user = row
        return fn(*args, **kwargs)

    return wrapper


def role_required(*allowed_roles):
    def decorator(fn):
        @functools.wraps(fn)
        @token_required
        def wrapper(*args, **kwargs):
            if g.user["role"] not in allowed_roles:
                return jsonify({"error": "You do not have permission for this action."}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "roles": ROLES})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if row is None or not check_pw(password, row["password_hash"]):
        return jsonify({"error": "Invalid username or password."}), 401
    if not row["is_active"]:
        return jsonify({"error": "This account is disabled."}), 403

    token = make_token(row)
    audit("Signed in", "auth", "", user=row["username"])
    return jsonify({"token": token, "user": user_public(row)})


@app.route("/api/me")
@token_required
def me():
    return jsonify(user_public(g.user))


@app.route("/api/users")
@role_required("Administrator")
def list_users():
    conn = get_db()
    rows = conn.execute("SELECT * FROM users ORDER BY id").fetchall()
    conn.close()
    return jsonify([user_public(r) for r in rows])


@app.route("/api/users", methods=["POST"])
@role_required("Administrator")
def create_user():
    data = request.get_json(silent=True) or {}
    required = ["name", "email", "username", "password", "role"]
    if any(not (data.get(k) or "").strip() for k in required):
        return jsonify({"error": "All fields (name, email, username, password, role) are required."}), 400
    if data["role"] not in ROLES:
        return jsonify({"error": "Invalid role."}), 400

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO users (name, email, username, password_hash, role, is_active, created_at) "
            "VALUES (?, ?, ?, ?, ?, 1, ?)",
            (data["name"].strip(), data["email"].strip(), data["username"].strip(),
             hash_pw(data["password"]), data["role"], datetime.datetime.utcnow().isoformat()),
        )
        conn.commit()
        new_id = cur.lastrowid
        row = conn.execute("SELECT * FROM users WHERE id = ?", (new_id,)).fetchone()
        audit("Created user", "user", data["username"].strip())
        return jsonify(user_public(row)), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username or email already exists."}), 409
    finally:
        conn.close()


@app.route("/api/users/<int:uid>", methods=["PUT"])
@role_required("Administrator")
def update_user(uid):
    d = request.get_json(silent=True) or {}
    conn = get_db()
    ex = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if ex is None:
        conn.close()
        return jsonify({"error": "User not found."}), 404
    role = d.get("role", ex["role"])
    if role not in ROLES:
        conn.close()
        return jsonify({"error": "Invalid role."}), 400
    name = (d.get("name") or ex["name"]).strip()
    email = (d.get("email") or ex["email"]).strip()
    is_active = 1 if d.get("is_active", ex["is_active"]) else 0
    try:
        conn.execute("UPDATE users SET name=?, email=?, role=?, is_active=? WHERE id=?",
                     (name, email, role, is_active, uid))
        if d.get("password"):
            conn.execute("UPDATE users SET password_hash=? WHERE id=?", (hash_pw(d["password"]), uid))
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        audit("Updated user", "user", ex["username"])
        return jsonify(user_public(row))
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already in use."}), 409
    finally:
        conn.close()


@app.route("/api/users/<int:uid>", methods=["DELETE"])
@role_required("Administrator")
def delete_user(uid):
    if uid == g.user["id"]:
        return jsonify({"error": "You cannot delete your own account."}), 400
    conn = get_db()
    conn.execute("DELETE FROM users WHERE id = ?", (uid,))
    conn.commit()
    conn.close()
    audit("Deleted user", "user", "id %d" % uid)
    return jsonify({"deleted": uid})


# Example of a protected, role-aware resource (proves JWT + roles end to end)
@app.route("/api/admin/ping")
@role_required("Administrator")
def admin_ping():
    return jsonify({"message": "Hello %s — you are an Administrator." % g.user["name"]})


# ---------------------------------------------------------------------------
# Production records — CRUD (any signed-in user)
# ---------------------------------------------------------------------------
@app.route("/api/production")
@token_required
def list_production():
    conn = get_db()
    rows = conn.execute("SELECT * FROM production_records ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return jsonify([production_public(r) for r in rows])


@app.route("/api/production", methods=["POST"])
@token_required
def create_production():
    d = request.get_json(silent=True) or {}
    required = ["date", "shift", "machine", "operator", "quantity", "grade"]
    if any(d.get(k) in (None, "") for k in required):
        return jsonify({"error": "date, shift, machine, operator, quantity and grade are required."}), 400
    try:
        qty = float(d["quantity"])
    except (TypeError, ValueError):
        return jsonify({"error": "quantity must be a number."}), 400
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO production_records (date, shift, machine, operator, quantity, grade, gsm, moisture, speed, remarks, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (d["date"], d["shift"], d["machine"], d["operator"], qty, d["grade"],
         optional_number(d.get("gsm")), optional_number(d.get("moisture")), optional_number(d.get("speed")),
         (d.get("remarks") or "").strip(), datetime.datetime.utcnow().isoformat()))
    conn.commit()
    row = conn.execute("SELECT * FROM production_records WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    audit("Added production record", "production", d["machine"])
    return jsonify(production_public(row)), 201


@app.route("/api/production/<int:rid>", methods=["PUT"])
@token_required
def update_production(rid):
    d = request.get_json(silent=True) or {}
    conn = get_db()
    ex = conn.execute("SELECT * FROM production_records WHERE id = ?", (rid,)).fetchone()
    if ex is None:
        conn.close()
        return jsonify({"error": "Record not found."}), 404
    try:
        qty = float(d.get("quantity", ex["quantity"]))
    except (TypeError, ValueError):
        conn.close()
        return jsonify({"error": "quantity must be a number."}), 400
    gsm = optional_number(d["gsm"]) if "gsm" in d else ex["gsm"]
    moisture = optional_number(d["moisture"]) if "moisture" in d else ex["moisture"]
    speed = optional_number(d["speed"]) if "speed" in d else ex["speed"]
    conn.execute(
        "UPDATE production_records SET date=?, shift=?, machine=?, operator=?, quantity=?, grade=?, gsm=?, moisture=?, speed=?, remarks=? WHERE id=?",
        (d.get("date", ex["date"]), d.get("shift", ex["shift"]), d.get("machine", ex["machine"]),
         d.get("operator", ex["operator"]), qty, d.get("grade", ex["grade"]),
         gsm, moisture, speed, (d.get("remarks") or "").strip(), rid))
    conn.commit()
    row = conn.execute("SELECT * FROM production_records WHERE id = ?", (rid,)).fetchone()
    conn.close()
    audit("Edited production record", "production", "id %d" % rid)
    return jsonify(production_public(row))


@app.route("/api/production/<int:rid>", methods=["DELETE"])
@token_required
def delete_production(rid):
    conn = get_db()
    conn.execute("DELETE FROM production_records WHERE id = ?", (rid,))
    conn.commit()
    conn.close()
    audit("Deleted production record", "production", "id %d" % rid)
    return jsonify({"deleted": rid})


# ---------------------------------------------------------------------------
# Maintenance logs — CRUD (any signed-in user)
# ---------------------------------------------------------------------------
@app.route("/api/maintenance")
@token_required
def list_maintenance():
    conn = get_db()
    rows = conn.execute("SELECT * FROM maintenance_logs ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return jsonify([maintenance_public(r) for r in rows])


@app.route("/api/maintenance", methods=["POST"])
@token_required
def create_maintenance():
    d = request.get_json(silent=True) or {}
    required = ["machine", "problem", "priority", "engineer", "date", "status"]
    if any(not (str(d.get(k) or "")).strip() for k in required):
        return jsonify({"error": "machine, problem, priority, engineer, date and status are required."}), 400
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO maintenance_logs (machine, problem, priority, engineer, date, status, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (d["machine"], d["problem"].strip(), d["priority"], d["engineer"], d["date"], d["status"],
         datetime.datetime.utcnow().isoformat()))
    conn.commit()
    row = conn.execute("SELECT * FROM maintenance_logs WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    audit("Logged maintenance", "maintenance", d.get("machine", ""))
    return jsonify(maintenance_public(row)), 201


@app.route("/api/maintenance/<int:rid>", methods=["PUT"])
@token_required
def update_maintenance(rid):
    d = request.get_json(silent=True) or {}
    conn = get_db()
    ex = conn.execute("SELECT * FROM maintenance_logs WHERE id = ?", (rid,)).fetchone()
    if ex is None:
        conn.close()
        return jsonify({"error": "Record not found."}), 404
    conn.execute(
        "UPDATE maintenance_logs SET machine=?, problem=?, priority=?, engineer=?, date=?, status=? WHERE id=?",
        (d.get("machine", ex["machine"]), (d.get("problem") or ex["problem"]).strip(),
         d.get("priority", ex["priority"]), d.get("engineer", ex["engineer"]),
         d.get("date", ex["date"]), d.get("status", ex["status"]), rid))
    conn.commit()
    row = conn.execute("SELECT * FROM maintenance_logs WHERE id = ?", (rid,)).fetchone()
    conn.close()
    return jsonify(maintenance_public(row))


@app.route("/api/maintenance/<int:rid>", methods=["DELETE"])
@token_required
def delete_maintenance(rid):
    conn = get_db()
    conn.execute("DELETE FROM maintenance_logs WHERE id = ?", (rid,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": rid})


# ---------------------------------------------------------------------------
# Downtime events — CRUD (any signed-in user)
# ---------------------------------------------------------------------------
def _duration_min(start, end):
    try:
        sh, sm = [int(x) for x in start.split(":")]
        eh, em = [int(x) for x in end.split(":")]
        mins = (eh * 60 + em) - (sh * 60 + sm)
        return mins + 24 * 60 if mins < 0 else mins   # handle crossing midnight
    except Exception:
        return 0


@app.route("/api/downtime")
@token_required
def list_downtime():
    conn = get_db()
    rows = conn.execute("SELECT * FROM downtime_events ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return jsonify([downtime_public(r) for r in rows])


@app.route("/api/downtime", methods=["POST"])
@token_required
def create_downtime():
    d = request.get_json(silent=True) or {}
    required = ["date", "machine", "shift", "reason", "start_time", "end_time"]
    if any(not (str(d.get(k) or "")).strip() for k in required):
        return jsonify({"error": "date, machine, shift, reason, start and end time are required."}), 400
    dur = _duration_min(d["start_time"], d["end_time"])
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO downtime_events (date, machine, shift, reason, start_time, end_time, duration_min, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (d["date"], d["machine"], d["shift"], d["reason"], d["start_time"], d["end_time"], dur,
         datetime.datetime.utcnow().isoformat()))
    conn.commit()
    row = conn.execute("SELECT * FROM downtime_events WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    audit("Logged downtime", "downtime", d.get("machine", ""))
    return jsonify(downtime_public(row)), 201


@app.route("/api/downtime/<int:rid>", methods=["PUT"])
@token_required
def update_downtime(rid):
    d = request.get_json(silent=True) or {}
    conn = get_db()
    ex = conn.execute("SELECT * FROM downtime_events WHERE id = ?", (rid,)).fetchone()
    if ex is None:
        conn.close()
        return jsonify({"error": "Record not found."}), 404
    start = d.get("start_time", ex["start_time"])
    end = d.get("end_time", ex["end_time"])
    conn.execute(
        "UPDATE downtime_events SET date=?, machine=?, shift=?, reason=?, start_time=?, end_time=?, duration_min=? WHERE id=?",
        (d.get("date", ex["date"]), d.get("machine", ex["machine"]), d.get("shift", ex["shift"]),
         d.get("reason", ex["reason"]), start, end, _duration_min(start, end), rid))
    conn.commit()
    row = conn.execute("SELECT * FROM downtime_events WHERE id = ?", (rid,)).fetchone()
    conn.close()
    return jsonify(downtime_public(row))


@app.route("/api/downtime/<int:rid>", methods=["DELETE"])
@token_required
def delete_downtime(rid):
    conn = get_db()
    conn.execute("DELETE FROM downtime_events WHERE id = ?", (rid,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": rid})


# ---------------------------------------------------------------------------
# Machines — master data (list: any user; create/update/delete: Administrator)
# ---------------------------------------------------------------------------
@app.route("/api/machines")
@token_required
def list_machines():
    conn = get_db()
    rows = conn.execute("SELECT * FROM machines ORDER BY machine_id").fetchall()
    conn.close()
    return jsonify([machine_public(r) for r in rows])


@app.route("/api/machines", methods=["POST"])
@role_required("Administrator")
def create_machine():
    d = request.get_json(silent=True) or {}
    for k in ("machine_id", "name", "department"):
        if not (str(d.get(k) or "")).strip():
            return jsonify({"error": "machine_id, name and department are required."}), 400
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO machines (machine_id, name, department, capacity, status, is_active, created_at) "
            "VALUES (?, ?, ?, ?, ?, 1, ?)",
            (d["machine_id"].strip(), d["name"].strip(), d["department"].strip(),
             optional_number(d.get("capacity")), d.get("status", "Idle"),
             datetime.datetime.utcnow().isoformat()))
        conn.commit()
        row = conn.execute("SELECT * FROM machines WHERE id = ?", (cur.lastrowid,)).fetchone()
        audit("Created machine", "machine", d["machine_id"].strip())
        return jsonify(machine_public(row)), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "A machine with that ID already exists."}), 409
    finally:
        conn.close()


@app.route("/api/machines/<int:mid>", methods=["PUT"])
@role_required("Administrator")
def update_machine(mid):
    d = request.get_json(silent=True) or {}
    conn = get_db()
    ex = conn.execute("SELECT * FROM machines WHERE id = ?", (mid,)).fetchone()
    if ex is None:
        conn.close()
        return jsonify({"error": "Machine not found."}), 404
    is_active = 1 if d.get("is_active", ex["is_active"]) else 0
    cap = optional_number(d["capacity"]) if "capacity" in d else ex["capacity"]
    conn.execute(
        "UPDATE machines SET name=?, department=?, capacity=?, status=?, is_active=? WHERE id=?",
        ((d.get("name") or ex["name"]).strip(), (d.get("department") or ex["department"]).strip(),
         cap, d.get("status", ex["status"]), is_active, mid))
    conn.commit()
    row = conn.execute("SELECT * FROM machines WHERE id = ?", (mid,)).fetchone()
    conn.close()
    audit("Updated machine", "machine", ex["machine_id"])
    return jsonify(machine_public(row))


@app.route("/api/machines/<int:mid>", methods=["DELETE"])
@role_required("Administrator")
def delete_machine(mid):
    conn = get_db()
    conn.execute("DELETE FROM machines WHERE id = ?", (mid,))
    conn.commit()
    conn.close()
    audit("Deleted machine", "machine", "id %d" % mid)
    return jsonify({"deleted": mid})


# ---------------------------------------------------------------------------
# Thresholds — configuration (read: any user; write: Administrator)
# ---------------------------------------------------------------------------
THRESHOLD_KEYS = ["gsm_min", "gsm_max", "moisture_max", "temp_max", "efficiency_min", "downtime_max"]


@app.route("/api/thresholds")
@token_required
def get_thresholds():
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM thresholds").fetchall()
    conn.close()
    return jsonify({r["key"]: r["value"] for r in rows})


@app.route("/api/thresholds", methods=["PUT"])
@role_required("Administrator")
def set_thresholds():
    d = request.get_json(silent=True) or {}
    conn = get_db()
    for k in THRESHOLD_KEYS:
        if k in d:
            v = optional_number(d[k])
            if v is not None:
                conn.execute("INSERT INTO thresholds (key, value) VALUES (?, ?) "
                             "ON CONFLICT(key) DO UPDATE SET value = excluded.value", (k, v))
    conn.commit()
    rows = conn.execute("SELECT key, value FROM thresholds").fetchall()
    conn.close()
    audit("Updated thresholds", "threshold", ", ".join(k for k in THRESHOLD_KEYS if k in d))
    return jsonify({r["key"]: r["value"] for r in rows})


# ---------------------------------------------------------------------------
# Activity / audit log (Administrator)
# ---------------------------------------------------------------------------
@app.route("/api/activity")
@role_required("Administrator")
def list_activity():
    conn = get_db()
    rows = conn.execute("SELECT * FROM activity_logs ORDER BY id DESC LIMIT 200").fetchall()
    conn.close()
    return jsonify([{"id": r["id"], "user": r["user"], "action": r["action"],
                     "entity": r["entity"] or "", "detail": r["detail"] or "",
                     "timestamp": r["timestamp"]} for r in rows])


# ---------------------------------------------------------------------------
# Live telemetry (Server-Sent Events) — the backend PUSHES machine readings
# ---------------------------------------------------------------------------
LIVE = {}


def init_live():
    rnd = random.Random(7)
    for n in range(101, 121):
        LIVE["PM-%d" % n] = {"temperature": rnd.randint(55, 92), "efficiency": rnd.randint(78, 95)}
    # A few legitimately hot units
    LIVE["PM-113"]["temperature"] = 122   # drying cylinder bank
    LIVE["PM-114"]["temperature"] = 108   # steam dryer
    LIVE["PM-120"]["temperature"] = 165   # power boiler


def next_readings():
    if not LIVE:
        init_live()
    out = []
    for mid, s in LIVE.items():
        s["temperature"] = max(25, min(190, s["temperature"] + random.randint(-1, 1)))
        s["efficiency"] = max(70, min(99, s["efficiency"] + random.randint(-1, 1)))
        out.append({"id": mid, "temperature": s["temperature"], "efficiency": s["efficiency"]})
    return out


@app.route("/api/stream")
def stream():
    # EventSource cannot set headers, so the JWT arrives as a query parameter.
    token = request.args.get("token", "")
    try:
        jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return jsonify({"error": "Authentication required."}), 401

    def gen():
        try:
            while True:
                yield "data: " + json.dumps(next_readings()) + "\n\n"
                time.sleep(3)
        except GeneratorExit:
            return

    return Response(gen(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------------------------------------------------------------------------
# Static front-end serving (same-origin as the API)
# ---------------------------------------------------------------------------
@app.route("/")
def root():
    return redirect("/login/index.html")


@app.route("/<path:path>")
def static_proxy(path):
    # Never let the static handler shadow the API namespace.
    if path.startswith("api/"):
        abort(404)
    full = os.path.join(PROJECT_ROOT, path)
    if not os.path.isfile(full):
        abort(404)
    directory = os.path.dirname(full)
    filename = os.path.basename(full)
    return send_from_directory(directory, filename)


# ---------------------------------------------------------------------------
# Initialise the database and live state at import time so that a WSGI server
# (e.g. gunicorn) triggers it too — but skip during automated tests, which use
# their own isolated temporary database.
import sys as _sys
if "pytest" not in _sys.modules:
    init_db()
    init_live()


if __name__ == "__main__":
    print("Smart Paper Mill backend running at http://localhost:5000/")
    # threaded=True so the long-lived SSE stream does not block other requests.
    app.run(host="127.0.0.1", port=5000, debug=False, threaded=True)
