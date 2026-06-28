"""
Role-based workflow tests for the Smart Paper Mill dashboard.

Each test class follows the step-by-step procedures documented in the
corresponding user manual under docs/manuals/:
  - Administrator-Manual.md
  - Plant-Manager-Manual.md
  - Shift-Supervisor-Manual.md
  - Machine-Operator-Manual.md

Run from the project root:  python -m pytest tests/test_role_workflows.py -v
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
import app as appmod  # noqa: E402


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client(tmp_path):
    appmod.DB_PATH = str(tmp_path / "test.db")
    appmod.init_db()
    appmod.init_live()
    appmod.app.config["TESTING"] = True
    return appmod.app.test_client()


def login(client, username, password):
    """Login and return (token, user_dict), or raise on failure."""
    r = client.post("/api/login", json={"username": username, "password": password})
    assert r.status_code == 200, f"Login failed for {username!r}: {r.get_json()}"
    body = r.get_json()
    return body["token"], body["user"]


def auth_header(token):
    return {"Authorization": "Bearer " + token}


# ---------------------------------------------------------------------------
# Administrator workflow  (Administrator-Manual.md)
# ---------------------------------------------------------------------------

class TestAdministratorWorkflow:
    """
    Manual §2.2  Sign in, §4.1 Dashboard review, §4.2 Threshold config,
    §4.3 Notifications/Appearance, §4.4 Production & Maintenance oversight,
    §7 Logout.
    """

    def test_2_2_sign_in(self, client):
        """Manual §2.2 — Admin can sign in and receives the correct role."""
        tok, user = login(client, "admin", "Admin@123")
        assert user["role"] == "Administrator"
        assert user["username"] == "admin"

    def test_4_1_dashboard_kpis_production(self, client):
        """Manual §4.1 — Production records are available for dashboard KPIs."""
        tok, _ = login(client, "admin", "Admin@123")
        r = client.get("/api/production", headers=auth_header(tok))
        assert r.status_code == 200
        records = r.get_json()
        assert len(records) >= 20, "Expected seeded production records for dashboard display"

    def test_4_1_dashboard_machines(self, client):
        """Manual §4.1 — Machine status data is available for the status chart."""
        tok, _ = login(client, "admin", "Admin@123")
        r = client.get("/api/machines", headers=auth_header(tok))
        assert r.status_code == 200
        machines = r.get_json()
        assert len(machines) == 20
        statuses = {m["status"] for m in machines}
        assert statuses <= {"Running", "Idle", "Maintenance"}, "Unexpected machine status value"

    def test_4_2_configure_thresholds(self, client):
        """Manual §4.2 — Admin can read and update quality/alert thresholds."""
        tok, _ = login(client, "admin", "Admin@123")

        # Read current thresholds
        r = client.get("/api/thresholds", headers=auth_header(tok))
        assert r.status_code == 200
        th = r.get_json()
        assert "gsm_min" in th and "gsm_max" in th
        assert "moisture_max" in th and "temp_max" in th
        assert "efficiency_min" in th and "downtime_max" in th

        # Adjust values and save (§4.2 step 3)
        r = client.put("/api/thresholds", headers=auth_header(tok), json={
            "gsm_min": 48, "gsm_max": 115,
            "moisture_max": 6.0, "temp_max": 85,
            "efficiency_min": 78, "downtime_max": 45,
        })
        assert r.status_code == 200
        updated = r.get_json()
        assert updated["gsm_min"] == 48
        assert updated["gsm_max"] == 115
        assert updated["moisture_max"] == 6.0

    def test_4_4_edit_production_record(self, client):
        """Manual §4.4 — Admin can edit any production record."""
        tok, _ = login(client, "admin", "Admin@123")
        records = client.get("/api/production", headers=auth_header(tok)).get_json()
        rid = records[0]["id"]

        r = client.put(f"/api/production/{rid}", headers=auth_header(tok),
                       json={"quantity": 99.9, "remarks": "admin correction"})
        assert r.status_code == 200
        assert r.get_json()["quantity"] == 99.9
        assert r.get_json()["remarks"] == "admin correction"

    def test_4_4_delete_production_record(self, client):
        """Manual §4.4 — Admin can delete a production record."""
        tok, _ = login(client, "admin", "Admin@123")
        # Create a record to delete
        created = client.post("/api/production", headers=auth_header(tok), json={
            "date": "2026-06-20", "shift": "Night", "machine": "PM-110",
            "operator": "Amrit Singh", "quantity": 35.0,
            "grade": "Copier Paper (70 GSM)", "remarks": "to be deleted",
        }).get_json()
        rid = created["id"]

        r = client.delete(f"/api/production/{rid}", headers=auth_header(tok))
        assert r.status_code == 200
        assert r.get_json()["deleted"] == rid

    def test_4_4_update_maintenance_status(self, client):
        """Manual §4.4 — Admin can change a maintenance job status."""
        tok, _ = login(client, "admin", "Admin@123")
        jobs = client.get("/api/maintenance", headers=auth_header(tok)).get_json()
        jid = jobs[0]["id"]

        r = client.put(f"/api/maintenance/{jid}", headers=auth_header(tok),
                       json={"status": "Completed"})
        assert r.status_code == 200
        assert r.get_json()["status"] == "Completed"

    def test_admin_user_management(self, client):
        """Admin-only: list users, create user, toggle active, delete."""
        tok, _ = login(client, "admin", "Admin@123")

        # List users
        r = client.get("/api/users", headers=auth_header(tok))
        assert r.status_code == 200
        assert len(r.get_json()) == 4

        # Create a new user
        new = client.post("/api/users", headers=auth_header(tok), json={
            "name": "Test User", "email": "test@satia.local",
            "username": "testuser", "password": "Test@123",
            "role": "Machine Operator",
        }).get_json()
        assert new["username"] == "testuser"
        uid = new["id"]

        # Disable the user
        r = client.put(f"/api/users/{uid}", headers=auth_header(tok), json={"is_active": False})
        assert r.get_json()["is_active"] is False

        # Delete the user
        assert client.delete(f"/api/users/{uid}", headers=auth_header(tok)).status_code == 200

    def test_admin_activity_log(self, client):
        """Manual §4.2 confirms actions are audited; admin can view activity log."""
        tok, _ = login(client, "admin", "Admin@123")
        client.put("/api/thresholds", headers=auth_header(tok), json={"gsm_max": 118})

        r = client.get("/api/activity", headers=auth_header(tok))
        assert r.status_code == 200
        actions = [e["action"] for e in r.get_json()]
        assert "Signed in" in actions
        assert "Updated thresholds" in actions

    def test_7_logout_token_still_works(self, client):
        """Manual §7 — After the frontend clears the token, old token is invalid
        only when the backend user is disabled. Verify the /api/me endpoint
        confirms identity while logged in (frontend handles the redirect)."""
        tok, _ = login(client, "admin", "Admin@123")
        r = client.get("/api/me", headers=auth_header(tok))
        assert r.status_code == 200
        assert r.get_json()["role"] == "Administrator"


# ---------------------------------------------------------------------------
# Plant Manager workflow  (Plant-Manager-Manual.md)
# ---------------------------------------------------------------------------

class TestPlantManagerWorkflow:
    """
    Manual §2.2 Sign in, §4.1 Dashboard, §4.2 Machine health, §4.3 Reports,
    plus RBAC checks — manager must NOT access admin-only endpoints.
    """

    def test_2_2_sign_in(self, client):
        """Manual §2.2 — Manager can sign in and receives the correct role."""
        tok, user = login(client, "manager", "Manager@123")
        assert user["role"] == "Plant Manager"
        assert user["username"] == "manager"

    def test_4_1_dashboard_summary_cards(self, client):
        """Manual §4.1 — Manager can read production data that populates summary cards."""
        tok, _ = login(client, "manager", "Manager@123")
        r = client.get("/api/production", headers=auth_header(tok))
        assert r.status_code == 200
        records = r.get_json()
        assert len(records) >= 20

    def test_4_2_machine_health(self, client):
        """Manual §4.2 — Manager can view all machines with status, temperature, efficiency."""
        tok, _ = login(client, "manager", "Manager@123")
        r = client.get("/api/machines", headers=auth_header(tok))
        assert r.status_code == 200
        machines = r.get_json()
        assert len(machines) == 20
        # Every machine card must have the fields shown in the UI
        for m in machines:
            assert "status" in m
            assert "machine_id" in m
            assert "name" in m
            assert "department" in m

    def test_4_3_reports_read_thresholds(self, client):
        """Manual §4.3 — Manager can read thresholds used for report context."""
        tok, _ = login(client, "manager", "Manager@123")
        r = client.get("/api/thresholds", headers=auth_header(tok))
        assert r.status_code == 200

    def test_4_3_reports_maintenance_data(self, client):
        """Manual §4.3 — Manager can view maintenance data for cross-checking."""
        tok, _ = login(client, "manager", "Manager@123")
        r = client.get("/api/maintenance", headers=auth_header(tok))
        assert r.status_code == 200
        assert len(r.get_json()) >= 10

    def test_4_3_reports_downtime_data(self, client):
        """Manual §4.3 — Manager can view downtime data for Downtime Analysis chart."""
        tok, _ = login(client, "manager", "Manager@123")
        r = client.get("/api/downtime", headers=auth_header(tok))
        assert r.status_code == 200
        assert len(r.get_json()) >= 10

    # RBAC — manager must be blocked from admin-only actions
    def test_rbac_cannot_list_users(self, client):
        """Manager must not be able to list users (admin-only)."""
        tok, _ = login(client, "manager", "Manager@123")
        assert client.get("/api/users", headers=auth_header(tok)).status_code == 403

    def test_rbac_cannot_update_thresholds(self, client):
        """Manager must not be able to change thresholds (admin-only)."""
        tok, _ = login(client, "manager", "Manager@123")
        r = client.put("/api/thresholds", headers=auth_header(tok), json={"gsm_max": 200})
        assert r.status_code == 403

    def test_rbac_cannot_view_activity_log(self, client):
        """Manager must not be able to view the audit log (admin-only)."""
        tok, _ = login(client, "manager", "Manager@123")
        assert client.get("/api/activity", headers=auth_header(tok)).status_code == 403

    def test_rbac_cannot_create_machine(self, client):
        """Manager must not be able to add machines (admin-only)."""
        tok, _ = login(client, "manager", "Manager@123")
        r = client.post("/api/machines", headers=auth_header(tok), json={
            "machine_id": "PM-999", "name": "Rogue", "department": "Utilities"})
        assert r.status_code == 403

    def test_rbac_cannot_delete_machine(self, client):
        """Manager must not be able to delete machines (admin-only)."""
        tok, _ = login(client, "manager", "Manager@123")
        assert client.delete("/api/machines/1", headers=auth_header(tok)).status_code == 403

    def test_rbac_cannot_manage_users(self, client):
        """Manager must not be able to create users (admin-only)."""
        tok, _ = login(client, "manager", "Manager@123")
        r = client.post("/api/users", headers=auth_header(tok), json={
            "name": "X", "email": "x@x.com", "username": "xuser",
            "password": "X@123456", "role": "Machine Operator"})
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Shift Supervisor workflow  (Shift-Supervisor-Manual.md)
# ---------------------------------------------------------------------------

class TestShiftSupervisorWorkflow:
    """
    Manual §2.2 Sign in, §4.1 Monitor machines, §4.2 Log maintenance job,
    §4.3 Update maintenance status, §4.4 Review production entries,
    §4.5 Downtime card; plus RBAC checks.
    """

    def test_2_2_sign_in(self, client):
        """Manual §2.2 — Supervisor can sign in and receives the correct role."""
        tok, user = login(client, "supervisor", "Super@123")
        assert user["role"] == "Shift Supervisor"
        assert user["username"] == "supervisor"

    def test_4_1_monitor_machines(self, client):
        """Manual §4.1 — Supervisor can view all machine statuses."""
        tok, _ = login(client, "supervisor", "Super@123")
        r = client.get("/api/machines", headers=auth_header(tok))
        assert r.status_code == 200
        machines = r.get_json()
        assert len(machines) == 20
        for m in machines:
            assert m["status"] in ("Running", "Idle", "Maintenance")

    def test_4_2_log_maintenance_job(self, client):
        """Manual §4.2 — Supervisor can raise a new maintenance job with all fields."""
        tok, _ = login(client, "supervisor", "Super@123")
        r = client.post("/api/maintenance", headers=auth_header(tok), json={
            "machine": "PM-112",
            "problem": "Press roll bearing wear",
            "priority": "High",
            "engineer": "Ravi Sharma",
            "date": "2026-06-20",
            "status": "Open",
        })
        assert r.status_code == 201
        job = r.get_json()
        assert job["machine"] == "PM-112"
        assert job["problem"] == "Press roll bearing wear"
        assert job["priority"] == "High"
        assert job["status"] == "Open"

    def test_4_2_log_critical_maintenance_job(self, client):
        """Manual §4.2 tip — Critical priority stops production; must be loggable."""
        tok, _ = login(client, "supervisor", "Super@123")
        r = client.post("/api/maintenance", headers=auth_header(tok), json={
            "machine": "PM-109",
            "problem": "Wire mesh tear — production stopped",
            "priority": "Critical",
            "engineer": "Gurpreet Singh",
            "date": "2026-06-20",
            "status": "Open",
        })
        assert r.status_code == 201
        assert r.get_json()["priority"] == "Critical"

    def test_4_3_update_maintenance_to_in_progress(self, client):
        """Manual §4.3 — Supervisor can update a job status to In Progress."""
        tok, _ = login(client, "supervisor", "Super@123")
        jobs = client.get("/api/maintenance", headers=auth_header(tok)).get_json()
        jid = jobs[0]["id"]

        r = client.put(f"/api/maintenance/{jid}", headers=auth_header(tok),
                       json={"status": "In Progress"})
        assert r.status_code == 200
        assert r.get_json()["status"] == "In Progress"

    def test_4_3_update_maintenance_to_completed(self, client):
        """Manual §4.3 — Supervisor can mark a job Completed."""
        tok, _ = login(client, "supervisor", "Super@123")
        jobs = client.get("/api/maintenance", headers=auth_header(tok)).get_json()
        jid = jobs[0]["id"]

        r = client.put(f"/api/maintenance/{jid}", headers=auth_header(tok),
                       json={"status": "Completed"})
        assert r.status_code == 200
        assert r.get_json()["status"] == "Completed"

    def test_4_4_review_production_entries(self, client):
        """Manual §4.4 — Supervisor can read all production entries to validate them."""
        tok, _ = login(client, "supervisor", "Super@123")
        r = client.get("/api/production", headers=auth_header(tok))
        assert r.status_code == 200
        assert len(r.get_json()) >= 20

    def test_4_4_correct_production_entry(self, client):
        """Manual §4.4 — Supervisor can edit an operator's production entry if wrong."""
        tok, _ = login(client, "supervisor", "Super@123")
        records = client.get("/api/production", headers=auth_header(tok)).get_json()
        rid = records[0]["id"]

        r = client.put(f"/api/production/{rid}", headers=auth_header(tok),
                       json={"quantity": 47.3, "remarks": "corrected by supervisor"})
        assert r.status_code == 200
        assert r.get_json()["quantity"] == 47.3

    def test_4_5_downtime_data_visible(self, client):
        """Manual §4.5 — Downtime data is accessible for the supervisor's shift monitoring."""
        tok, _ = login(client, "supervisor", "Super@123")
        r = client.get("/api/downtime", headers=auth_header(tok))
        assert r.status_code == 200
        assert len(r.get_json()) >= 10

    # RBAC
    def test_rbac_cannot_list_users(self, client):
        """Supervisor must not be able to list users (admin-only)."""
        tok, _ = login(client, "supervisor", "Super@123")
        assert client.get("/api/users", headers=auth_header(tok)).status_code == 403

    def test_rbac_cannot_update_thresholds(self, client):
        """Supervisor must not be able to change thresholds (admin-only)."""
        tok, _ = login(client, "supervisor", "Super@123")
        r = client.put("/api/thresholds", headers=auth_header(tok), json={"gsm_max": 200})
        assert r.status_code == 403

    def test_rbac_cannot_view_activity_log(self, client):
        """Supervisor must not be able to view the audit log (admin-only)."""
        tok, _ = login(client, "supervisor", "Super@123")
        assert client.get("/api/activity", headers=auth_header(tok)).status_code == 403

    def test_rbac_cannot_create_machine(self, client):
        """Supervisor must not be able to add machines (admin-only)."""
        tok, _ = login(client, "supervisor", "Super@123")
        r = client.post("/api/machines", headers=auth_header(tok), json={
            "machine_id": "PM-998", "name": "Rogue", "department": "Utilities"})
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Machine Operator workflow  (Machine-Operator-Manual.md)
# ---------------------------------------------------------------------------

class TestMachineOperatorWorkflow:
    """
    Manual §2.2 Sign in, §4 Enter production record, §5 Correct an entry,
    §6 Check machine status; plus RBAC checks.
    """

    def test_2_2_sign_in(self, client):
        """Manual §2.2 — Operator can sign in and receives the correct role."""
        tok, user = login(client, "operator", "Operator@123")
        assert user["role"] == "Machine Operator"
        assert user["username"] == "operator"

    def test_6_check_machine_status(self, client):
        """Manual §6 — Operator can view all machine cards with status, temp, efficiency."""
        tok, _ = login(client, "operator", "Operator@123")
        r = client.get("/api/machines", headers=auth_header(tok))
        assert r.status_code == 200
        machines = r.get_json()
        assert len(machines) == 20
        for m in machines:
            assert "status" in m
            assert m["status"] in ("Running", "Idle", "Maintenance")

    def test_4_enter_production_record_required_fields(self, client):
        """Manual §4 — Operator can save a production record with all required fields."""
        tok, _ = login(client, "operator", "Operator@123")
        r = client.post("/api/production", headers=auth_header(tok), json={
            "date": "2026-06-20",
            "shift": "Morning",
            "machine": "PM-109",
            "operator": "Vikram Patel",
            "quantity": 52.4,
            "grade": "Copier Paper (70 GSM)",
            "remarks": "",
        })
        assert r.status_code == 201
        rec = r.get_json()
        assert rec["machine"] == "PM-109"
        assert rec["shift"] == "Morning"
        assert rec["quantity"] == 52.4
        assert rec["grade"] == "Copier Paper (70 GSM)"

    def test_4_enter_production_with_quality_metrics(self, client):
        """Manual §4 — Operator can include GSM, moisture and speed in a record."""
        tok, _ = login(client, "operator", "Operator@123")
        r = client.post("/api/production", headers=auth_header(tok), json={
            "date": "2026-06-20",
            "shift": "Evening",
            "machine": "PM-110",
            "operator": "Vikram Patel",
            "quantity": 48.0,
            "grade": "Writing Paper (80 GSM)",
            "gsm": 80,
            "moisture": 5.2,
            "speed": 615,
            "remarks": "Running smooth",
        })
        assert r.status_code == 201
        rec = r.get_json()
        assert rec["gsm"] == 80
        assert rec["moisture"] == 5.2
        assert rec["speed"] == 615

    def test_4_missing_required_field_shows_error(self, client):
        """Manual §4 — Submitting without required fields returns a 400 error."""
        tok, _ = login(client, "operator", "Operator@123")
        # Missing operator, quantity and grade
        r = client.post("/api/production", headers=auth_header(tok), json={
            "date": "2026-06-20",
            "shift": "Night",
            "machine": "PM-109",
        })
        assert r.status_code == 400

    def test_5_correct_production_entry(self, client):
        """Manual §5 — Operator can edit their own record (pencil icon → Update Record)."""
        tok, _ = login(client, "operator", "Operator@123")

        # First create a record
        created = client.post("/api/production", headers=auth_header(tok), json={
            "date": "2026-06-20", "shift": "Night", "machine": "PM-111",
            "operator": "Vikram Patel", "quantity": 39.0,
            "grade": "Printing Paper (90 GSM)",
        }).get_json()
        rid = created["id"]

        # Correct the quantity and grade
        r = client.put(f"/api/production/{rid}", headers=auth_header(tok), json={
            "quantity": 41.5,
            "grade": "Writing Paper (80 GSM)",
            "remarks": "grade change mid-shift",
        })
        assert r.status_code == 200
        updated = r.get_json()
        assert updated["quantity"] == 41.5
        assert updated["grade"] == "Writing Paper (80 GSM)"
        assert updated["remarks"] == "grade change mid-shift"

    def test_5_delete_mistaken_entry(self, client):
        """Manual §5 — Operator can delete a record entered by mistake (bin icon)."""
        tok, _ = login(client, "operator", "Operator@123")

        created = client.post("/api/production", headers=auth_header(tok), json={
            "date": "2026-06-20", "shift": "Morning", "machine": "PM-109",
            "operator": "Vikram Patel", "quantity": 1.0,
            "grade": "Copier Paper (70 GSM)", "remarks": "entered by mistake",
        }).get_json()
        rid = created["id"]

        r = client.delete(f"/api/production/{rid}", headers=auth_header(tok))
        assert r.status_code == 200
        assert r.get_json()["deleted"] == rid

    def test_4_see_existing_records(self, client):
        """Manual §4 — Operator can view the existing production table below the form."""
        tok, _ = login(client, "operator", "Operator@123")
        r = client.get("/api/production", headers=auth_header(tok))
        assert r.status_code == 200
        assert len(r.get_json()) >= 20

    # RBAC
    def test_rbac_cannot_list_users(self, client):
        """Operator must not be able to list users (admin-only)."""
        tok, _ = login(client, "operator", "Operator@123")
        assert client.get("/api/users", headers=auth_header(tok)).status_code == 403

    def test_rbac_cannot_update_thresholds(self, client):
        """Operator must not be able to change thresholds (admin-only)."""
        tok, _ = login(client, "operator", "Operator@123")
        r = client.put("/api/thresholds", headers=auth_header(tok), json={"gsm_max": 200})
        assert r.status_code == 403

    def test_rbac_cannot_view_activity_log(self, client):
        """Operator must not be able to view the audit log (admin-only)."""
        tok, _ = login(client, "operator", "Operator@123")
        assert client.get("/api/activity", headers=auth_header(tok)).status_code == 403

    def test_rbac_cannot_create_machine(self, client):
        """Operator must not be able to add machines (admin-only)."""
        tok, _ = login(client, "operator", "Operator@123")
        r = client.post("/api/machines", headers=auth_header(tok), json={
            "machine_id": "PM-997", "name": "Rogue", "department": "Utilities"})
        assert r.status_code == 403

    def test_rbac_cannot_manage_users(self, client):
        """Operator must not be able to create or delete users (admin-only)."""
        tok, _ = login(client, "operator", "Operator@123")
        r = client.post("/api/users", headers=auth_header(tok), json={
            "name": "X", "email": "x@x.com", "username": "xuser",
            "password": "X@123456", "role": "Machine Operator"})
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Cross-role: unauthenticated requests are rejected everywhere
# ---------------------------------------------------------------------------

class TestUnauthenticatedAccess:
    """Every protected endpoint must return 401 without a token."""

    @pytest.mark.parametrize("method,url", [
        ("GET",    "/api/me"),
        ("GET",    "/api/production"),
        ("POST",   "/api/production"),
        ("GET",    "/api/maintenance"),
        ("POST",   "/api/maintenance"),
        ("GET",    "/api/downtime"),
        ("POST",   "/api/downtime"),
        ("GET",    "/api/machines"),
        ("GET",    "/api/thresholds"),
        ("GET",    "/api/stream"),
    ])
    def test_requires_auth(self, client, method, url):
        if method == "GET":
            r = client.get(url)
        else:
            r = client.post(url, json={})
        assert r.status_code == 401, f"{method} {url} should be 401 without token, got {r.status_code}"
