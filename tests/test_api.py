"""
Automated API tests for the Smart Paper Mill backend.
Run from the project root:   python -m pytest -v

Each test gets an isolated temporary SQLite database, so the real
backend/mill.db is never touched.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
import app as appmod  # noqa: E402


@pytest.fixture
def client(tmp_path):
    appmod.DB_PATH = str(tmp_path / "test.db")   # isolated DB per test
    appmod.init_db()
    appmod.init_live()
    appmod.app.config["TESTING"] = True
    return appmod.app.test_client()


def token(client, username="admin", password="Admin@123"):
    return client.post("/api/login", json={"username": username, "password": password}).get_json()["token"]


def auth(tok):
    return {"Authorization": "Bearer " + tok}


# ----------------------------- Health -----------------------------
def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


# ----------------------------- Auth -------------------------------
def test_login_success(client):
    r = client.post("/api/login", json={"username": "admin", "password": "Admin@123"})
    assert r.status_code == 200
    assert r.get_json()["user"]["role"] == "Administrator"


def test_login_bad_password(client):
    r = client.post("/api/login", json={"username": "admin", "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/me").status_code == 401


def test_me_with_token(client):
    r = client.get("/api/me", headers=auth(token(client)))
    assert r.status_code == 200
    assert r.get_json()["username"] == "admin"


# --------------------------- Roles --------------------------------
def test_users_forbidden_for_manager(client):
    r = client.get("/api/users", headers=auth(token(client, "manager", "Manager@123")))
    assert r.status_code == 403


def test_users_ok_for_admin(client):
    r = client.get("/api/users", headers=auth(token(client)))
    assert r.status_code == 200
    assert len(r.get_json()) == 4


# --------------------- Production CRUD -----------------------------
def test_production_requires_auth(client):
    assert client.get("/api/production").status_code == 401


def test_production_seeded(client):
    r = client.get("/api/production", headers=auth(token(client)))
    assert r.status_code == 200
    assert len(r.get_json()) >= 20


def test_production_create_update_delete(client):
    tok = token(client)
    created = client.post("/api/production", headers=auth(tok), json={
        "date": "2026-06-16", "shift": "Morning", "machine": "PM-109",
        "operator": "Amrit Singh", "quantity": 41.0,
        "grade": "Copier Paper (70 GSM)", "remarks": "unit test"}).get_json()
    rid = created["id"]
    assert created["quantity"] == 41.0

    updated = client.put("/api/production/%d" % rid, headers=auth(tok),
                         json={"quantity": 45.5}).get_json()
    assert updated["quantity"] == 45.5

    assert client.delete("/api/production/%d" % rid, headers=auth(tok)).status_code == 200


def test_production_validation(client):
    r = client.post("/api/production", headers=auth(token(client)), json={"date": "2026-06-16"})
    assert r.status_code == 400


# --------------------- Maintenance CRUD ----------------------------
def test_maintenance_seeded(client):
    r = client.get("/api/maintenance", headers=auth(token(client)))
    assert r.status_code == 200
    assert len(r.get_json()) >= 10


def test_maintenance_create(client):
    r = client.post("/api/maintenance", headers=auth(token(client)), json={
        "machine": "PM-104", "problem": "Bearing noise", "priority": "High",
        "engineer": "Ravi Sharma", "date": "2026-06-16", "status": "Open"})
    assert r.status_code == 201
    assert r.get_json()["priority"] == "High"


# --------------------- Live stream auth ----------------------------
def test_stream_requires_token(client):
    assert client.get("/api/stream").status_code == 401


def test_stream_rejects_bad_token(client):
    assert client.get("/api/stream?token=not-a-jwt").status_code == 401


# ----------------- Production quality fields (FR-3) ---------------
def test_production_quality_fields(client):
    tok = token(client)
    rec = client.post("/api/production", headers=auth(tok), json={
        "date": "2026-06-16", "shift": "Morning", "machine": "PM-109",
        "operator": "Amrit Singh", "quantity": 40.0, "grade": "Writing Paper (80 GSM)",
        "gsm": 80, "moisture": 5.4, "speed": 620}).get_json()
    assert rec["gsm"] == 80
    assert rec["moisture"] == 5.4
    assert rec["speed"] == 620


def test_production_seed_has_quality(client):
    rows = client.get("/api/production", headers=auth(token(client))).get_json()
    assert all("gsm" in r and "moisture" in r and "speed" in r for r in rows)


# --------------------- Downtime CRUD (FR-7) -----------------------
def test_downtime_requires_auth(client):
    assert client.get("/api/downtime").status_code == 401


def test_downtime_seeded(client):
    r = client.get("/api/downtime", headers=auth(token(client)))
    assert r.status_code == 200
    assert len(r.get_json()) >= 10


def test_downtime_create_computes_duration(client):
    tok = token(client)
    rec = client.post("/api/downtime", headers=auth(tok), json={
        "date": "2026-06-16", "machine": "PM-104", "shift": "Morning",
        "reason": "Mechanical", "start_time": "09:00", "end_time": "10:30"}).get_json()
    assert rec["duration_min"] == 90      # backend computes it
    rid = rec["id"]
    assert client.delete("/api/downtime/%d" % rid, headers=auth(tok)).status_code == 200


def test_downtime_validation(client):
    r = client.post("/api/downtime", headers=auth(token(client)), json={"date": "2026-06-16"})
    assert r.status_code == 400


# ------------------ User management (FR-14) -----------------------
def _operator(client, tok):
    return [u for u in client.get("/api/users", headers=auth(tok)).get_json() if u["username"] == "operator"][0]


def test_user_update_role(client):
    tok = token(client)
    op = _operator(client, tok)
    r = client.put("/api/users/%d" % op["id"], headers=auth(tok), json={"role": "Shift Supervisor"})
    assert r.status_code == 200
    assert r.get_json()["role"] == "Shift Supervisor"


def test_user_toggle_active(client):
    tok = token(client)
    op = _operator(client, tok)
    r = client.put("/api/users/%d" % op["id"], headers=auth(tok), json={"is_active": False})
    assert r.get_json()["is_active"] is False


def test_user_delete(client):
    tok = token(client)
    new = client.post("/api/users", headers=auth(tok), json={
        "name": "Temp", "email": "temp@x.com", "username": "tempuser",
        "password": "Temp@123", "role": "Machine Operator"}).get_json()
    assert client.delete("/api/users/%d" % new["id"], headers=auth(tok)).status_code == 200


def test_user_cannot_delete_self(client):
    tok = token(client)
    me = client.get("/api/me", headers=auth(tok)).get_json()
    assert client.delete("/api/users/%d" % me["id"], headers=auth(tok)).status_code == 400


def test_user_update_forbidden_for_manager(client):
    op = _operator(client, token(client))
    mtok = token(client, "manager", "Manager@123")
    r = client.put("/api/users/%d" % op["id"], headers=auth(mtok), json={"role": "Administrator"})
    assert r.status_code == 403


# ------------------ Machine management (FR-13) --------------------
def test_machines_requires_auth(client):
    assert client.get("/api/machines").status_code == 401


def test_machines_seeded(client):
    r = client.get("/api/machines", headers=auth(token(client)))
    assert r.status_code == 200
    assert len(r.get_json()) == 20


def test_machine_create_update_delete(client):
    tok = token(client)
    new = client.post("/api/machines", headers=auth(tok), json={
        "machine_id": "PM-201", "name": "Test Unit", "department": "Utilities",
        "capacity": 90, "status": "Idle"}).get_json()
    mid = new["id"]
    assert new["machine_id"] == "PM-201"
    upd = client.put("/api/machines/%d" % mid, headers=auth(tok),
                     json={"status": "Maintenance", "is_active": False}).get_json()
    assert upd["status"] == "Maintenance" and upd["is_active"] is False
    assert client.delete("/api/machines/%d" % mid, headers=auth(tok)).status_code == 200


def test_machine_duplicate_id(client):
    tok = token(client)
    r = client.post("/api/machines", headers=auth(tok), json={
        "machine_id": "PM-101", "name": "Dup", "department": "Utilities"})
    assert r.status_code == 409


def test_machine_create_forbidden_for_manager(client):
    r = client.post("/api/machines", headers=auth(token(client, "manager", "Manager@123")),
                    json={"machine_id": "PM-202", "name": "X", "department": "Utilities"})
    assert r.status_code == 403


# ------------------ Thresholds (FR-13) ----------------------------
def test_thresholds_seeded(client):
    th = client.get("/api/thresholds", headers=auth(token(client))).get_json()
    assert th["gsm_min"] == 45 and th["gsm_max"] == 120


def test_thresholds_update(client):
    tok = token(client)
    r = client.put("/api/thresholds", headers=auth(tok), json={"gsm_max": 130, "moisture_max": 7.0})
    assert r.status_code == 200
    assert r.get_json()["gsm_max"] == 130


def test_thresholds_update_forbidden_for_manager(client):
    r = client.put("/api/thresholds", headers=auth(token(client, "manager", "Manager@123")), json={"gsm_max": 999})
    assert r.status_code == 403


# ------------------ Activity log (FR-15) --------------------------
def test_activity_logged(client):
    tok = token(client)                                  # login is logged
    client.put("/api/thresholds", headers=auth(tok), json={"gsm_max": 125})   # logged change
    rows = client.get("/api/activity", headers=auth(tok)).get_json()
    assert isinstance(rows, list) and len(rows) >= 2
    actions = [r["action"] for r in rows]
    assert "Signed in" in actions
    assert "Updated thresholds" in actions


def test_activity_forbidden_for_manager(client):
    r = client.get("/api/activity", headers=auth(token(client, "manager", "Manager@123")))
    assert r.status_code == 403
