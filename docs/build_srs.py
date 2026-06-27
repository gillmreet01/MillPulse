# -*- coding: utf-8 -*-
"""
Builds the Software Requirements Specification (SRS) as a .docx file,
formatted to MATCH the final project report's template (Chandigarh
University Industrial Training format): A4, Times New Roman, the same
title page, heading sizes, figure/table captions and roman -> arabic
page numbering.
"""

import os
from docx import Document
from docx.shared import Pt, Mm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH as AL
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

HERE = os.path.dirname(os.path.abspath(__file__))
DIAG = os.path.join(HERE, "diagrams")
OUT = os.path.join(HERE, "Software_Requirements_Specification.docx")

doc = Document()

# ---------------- Page setup (A4) ----------------
sec0 = doc.sections[0]
sec0.page_width, sec0.page_height = Mm(210), Mm(297)
sec0.top_margin = sec0.bottom_margin = Mm(25)
sec0.left_margin = Mm(32); sec0.right_margin = Mm(25)

# ---------------- Base styles (Times New Roman) ----------------
normal = doc.styles["Normal"]
normal.font.name = "Times New Roman"; normal.font.size = Pt(12)
normal.paragraph_format.line_spacing = 1.5; normal.paragraph_format.space_after = Pt(6)

def style_heading(name, size):
    st = doc.styles[name]
    st.font.name = "Times New Roman"; st.font.size = Pt(size); st.font.bold = True
    st.font.color.rgb = RGBColor(0, 0, 0)
    st.paragraph_format.space_before = Pt(12); st.paragraph_format.space_after = Pt(6)

style_heading("Heading 1", 16)
style_heading("Heading 2", 14)
style_heading("Heading 3", 12)

cap = doc.styles["Caption"]
cap.font.name = "Times New Roman"; cap.font.size = Pt(10); cap.font.bold = True
cap.font.color.rgb = RGBColor(0, 0, 0); cap.font.italic = False

# ---------------- Field helpers ----------------
def _field(run, instr):
    b = OxmlElement("w:fldChar"); b.set(qn("w:fldCharType"), "begin")
    i = OxmlElement("w:instrText"); i.set(qn("xml:space"), "preserve"); i.text = instr
    s = OxmlElement("w:fldChar"); s.set(qn("w:fldCharType"), "separate")
    t = OxmlElement("w:t"); t.set(qn("xml:space"), "preserve"); t.text = "[update field]"
    e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), "end")
    for el in (b, i, s, t, e):
        run._r.append(el)

def _seq(p, label):
    run = p.add_run()
    b = OxmlElement("w:fldChar"); b.set(qn("w:fldCharType"), "begin")
    i = OxmlElement("w:instrText"); i.set(qn("xml:space"), "preserve"); i.text = " SEQ %s \\* ARABIC " % label
    e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), "end")
    run._r.append(b); run._r.append(i); run._r.append(e)
    run.font.name = "Times New Roman"; run.font.size = Pt(10); run.bold = True

def _page_field(p):
    run = p.add_run()
    b = OxmlElement("w:fldChar"); b.set(qn("w:fldCharType"), "begin")
    i = OxmlElement("w:instrText"); i.set(qn("xml:space"), "preserve"); i.text = "PAGE"
    e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), "end")
    run._r.append(b); run._r.append(i); run._r.append(e)

def set_pgnum(section, fmt, start=None):
    sectPr = section._sectPr
    for e in sectPr.findall(qn("w:pgNumType")):
        sectPr.remove(e)
    pg = OxmlElement("w:pgNumType"); pg.set(qn("w:fmt"), fmt)
    if start is not None:
        pg.set(qn("w:start"), str(start))
    sectPr.append(pg)

# ---------------- Content helpers ----------------
def para(text):
    p = doc.add_paragraph(text); p.alignment = AL.JUSTIFY; return p

def center(text, size=12, bold=False, italic=False, after=4):
    p = doc.add_paragraph(); p.alignment = AL.CENTER
    r = p.add_run(text); r.font.size = Pt(size); r.font.bold = bold; r.font.italic = italic
    r.font.name = "Times New Roman"; p.paragraph_format.space_after = Pt(after); return p

def title_line(text, size=16, after=6):
    return center(text, size, bold=True, after=after)

def h1(text): return doc.add_heading(text, level=1)
def h2(text): return doc.add_heading(text, level=2)

def subhead(text):
    p = doc.add_paragraph(); r = p.add_run(text); r.bold = True; r.font.name = "Times New Roman"
    p.paragraph_format.space_before = Pt(6); p.paragraph_format.space_after = Pt(2); return p

def bullets(items):
    for it in items: doc.add_paragraph(it, style="List Bullet")

def numbered(items):
    for it in items: doc.add_paragraph(it, style="List Number")

def page_break(): doc.add_page_break()

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), fill)
    tcPr.append(shd)

def set_cell(cell, text, bold=False, size=10.5):
    cell.text = ""
    p = cell.paragraphs[0]; r = p.add_run(str(text))
    r.bold = bold; r.font.size = Pt(size); r.font.name = "Times New Roman"
    p.paragraph_format.space_after = Pt(0); p.paragraph_format.line_spacing = 1.0

def _grid(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers)); t.style = "Table Grid"; t.allow_autofit = True
    for i, h in enumerate(headers):
        set_cell(t.rows[0].cells[i], h, bold=True); shade(t.rows[0].cells[i], "D9E2F3")
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            set_cell(cells[i], v)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t

def ctable(title, headers, rows):     # captioned table (appears in List of Tables)
    cp = doc.add_paragraph(style="Caption")
    cp.add_run("Table ").bold = True
    _seq(cp, "Table")
    rr = cp.add_run(": " + title); rr.bold = True; rr.font.size = Pt(10)
    cp.runs[0].font.size = Pt(10)
    _grid(headers, rows)

def ptable(headers, rows):            # plain table (no caption)
    _grid(headers, rows)

def code_block(text):
    for line in text.split("\n"):
        p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(0); p.paragraph_format.line_spacing = 1.0
        r = p.add_run(line if line else " "); r.font.name = "Consolas"; r.font.size = Pt(9)

def figure(filename, title, width=150):
    path = os.path.join(DIAG, filename)
    if os.path.exists(path):
        doc.add_picture(path, width=Mm(width)); doc.paragraphs[-1].alignment = AL.CENTER
    p = doc.add_paragraph(style="Caption"); p.alignment = AL.CENTER
    p.add_run("Figure ").bold = True
    _seq(p, "Figure")
    rr = p.add_run(": " + title); rr.bold = True; rr.font.size = Pt(10)
    p.runs[0].font.size = Pt(10)

def toc_field(instr):
    p = doc.add_paragraph(); _field(p.add_run(), instr)

# Footer page numbers (no number on title page; roman front matter)
sec0.different_first_page_header_footer = True
fp = sec0.footer.paragraphs[0]; fp.alignment = AL.CENTER
fp.add_run("Page "); _page_field(fp)
set_pgnum(sec0, "lowerRoman")

# ==================================================================
# TITLE PAGE  (mirrors the final report)
# ==================================================================
for _ in range(2): doc.add_paragraph()
title_line("SOFTWARE REQUIREMENTS SPECIFICATION", 18, after=14)
center("for the", 12, after=10)
center("SMART PAPER MILL PRODUCTION MONITORING DASHBOARD", 16, bold=True, after=18)
center("A PROJECT DOCUMENT", 14, bold=True, after=14)
center("Submitted by", 14, bold=True, italic=True, after=10)
center("[STUDENT NAME]  (UID: [__________])", 16, bold=True, after=18)
center("in partial fulfillment for the award of the degree of", 14, bold=True, italic=True, after=10)
center("BACHELOR OF ENGINEERING", 16, bold=True, after=2)
center("IN", 14, after=2)
center("COMPUTER SCIENCE & ENGINEERING", 16, bold=True, after=18)
center("Industrial Training carried out at", 12, after=2)
center("SATIA INDUSTRIES LIMITED", 14, bold=True, after=18)
center("Chandigarh University", 14, after=2)
center("Document Version 1.0   ·   [MONTH] [YEAR]", 12, after=2)
page_break()

# ==================================================================
# TABLE OF CONTENTS / LIST OF FIGURES / LIST OF TABLES
# ==================================================================
title_line("TABLE OF CONTENTS", 16, after=10)
toc_field('TOC \\o "1-2" \\h \\z \\u')
para("(Right-click and choose 'Update Field' to generate the contents and page numbers.)")
page_break()
title_line("LIST OF FIGURES", 16, after=10)
toc_field('TOC \\h \\z \\c "Figure"')
para("(Right-click and 'Update Field' to populate the list of figures.)")
page_break()
title_line("LIST OF TABLES", 16, after=10)
toc_field('TOC \\h \\z \\c "Table"')
para("(Right-click and 'Update Field' to populate the list of tables.)")

# ==================================================================
# BODY SECTION — restart page numbers at 1 (Arabic)
# ==================================================================
body = doc.add_section(WD_SECTION.NEW_PAGE)
body.page_width, body.page_height = Mm(210), Mm(297)
body.top_margin = body.bottom_margin = Mm(25)
body.left_margin = Mm(32); body.right_margin = Mm(25)
body.different_first_page_header_footer = False
set_pgnum(body, "decimal", start=1)

# 1. PROJECT OVERVIEW
h1("1. Project Overview")
para("The Smart Paper Mill Production Monitoring Dashboard is a web-based application that "
     "centralizes and visualizes the production performance of a paper manufacturing plant. Satia "
     "Industries manufactures writing and printing paper from agricultural residue (wheat straw) and "
     "wood pulp across multiple process stages — pulping, bleaching, stock preparation, paper "
     "machines, finishing and packaging.")
para("At present, much of this production data is recorded in paper logbooks, shift registers and "
     "disconnected spreadsheets. The dashboard replaces this with a single screen on which "
     "supervisors and managers can view live production output, machine status, quality metrics, "
     "downtime and resource consumption, and can drill into historical trends.")
para("The system is intentionally lightweight, free to run and deployable on a standard laptop or a "
     "free cloud tier, making it suitable for an academic demonstration while still reflecting genuine "
     "industrial-monitoring concepts such as OEE, downtime tracking and GSM/moisture quality control. "
     "Because live plant-floor integration is outside the scope of an academic assignment, the system "
     "is built around operator data entry together with a built-in data simulator that emulates "
     "sensor feeds.")

# 2. PROBLEM STATEMENT
h1("2. Problem Statement")
para("In a typical paper mill, production tracking suffers from the following difficulties:")
bullets([
    "Manual, paper-based logging of shift production, machine speed and downtime, which is error-prone and slow to consolidate.",
    "No real-time visibility — a manager cannot instantly see how much paper was produced this shift or whether a machine is down.",
    "Delayed quality feedback — out-of-specification GSM or moisture is often noticed only after large quantities are produced, causing waste.",
    "Scattered data — production, quality, energy and downtime information is held in separate registers, making analysis tedious.",
    "No historical trend analysis — it is hard to compare shifts, machines or days to detect recurring inefficiencies.",
])
para("Core problem: there is no single, real-time, role-based digital platform that consolidates and "
     "visualizes paper mill production, quality and downtime data for fast decision-making.")

# 3. OBJECTIVES
h1("3. Objectives")
numbered([
    "Provide a centralized digital dashboard for real-time paper mill production monitoring.",
    "Enable role-based access so operators, supervisors and managers see relevant views.",
    "Capture and store production records (output, GSM, moisture, machine speed) per machine and per shift.",
    "Track and categorize machine downtime and compute Overall Equipment Effectiveness (OEE).",
    "Visualize quality metrics and flag out-of-specification production automatically.",
    "Generate alerts when key parameters cross configured thresholds.",
    "Provide historical reports and trend charts (daily, shift-wise and machine-wise).",
    "Demonstrate the system using a data simulator that emulates live sensor feeds, with manual entry as a fallback.",
    "Keep the solution free, open-source and lightweight so that it runs on standard student hardware.",
])

# 4. SCOPE
h1("4. Scope")
h2("4.1 In Scope")
bullets([
    "Web dashboard with secure login and role-based access control.",
    "Manual production and quality data-entry forms for operators.",
    "A simulated sensor data generator for live demonstration.",
    "Real-time KPI cards, charts and machine-status indicators.",
    "Downtime logging with reason categorization.",
    "Automatic OEE and efficiency calculation.",
    "Threshold-based alerts (for example, moisture too high, machine stopped).",
    "Historical reports with date/shift/machine filters and CSV/PDF export.",
    "Admin panel to manage users, machines and thresholds.",
])
h2("4.2 Out of Scope")
bullets([
    "Live PLC/DCS/sensor hardware integration — replaced by the simulator and manual entry.",
    "Predictive maintenance and AI failure prediction (listed under Future Scope).",
    "ERP / SAP integration.",
    "Financial accounting, payroll and raw-material procurement.",
    "Native mobile applications (the web application is responsive instead).",
])

# 5. FUNCTIONAL REQUIREMENTS
h1("5. Functional Requirements")
ctable("Functional requirements", ["ID", "Requirement"], [
    ["FR-1", "The system shall allow users to register/login with a username and password."],
    ["FR-2", "The system shall enforce role-based access (Admin, Manager, Supervisor, Operator, Viewer)."],
    ["FR-3", "Operators shall be able to record production data (machine, shift, output, GSM, moisture, speed)."],
    ["FR-4", "The system shall run a data simulator that generates realistic live readings at fixed intervals."],
    ["FR-5", "The dashboard shall display real-time KPI cards (today's output, active machines, average OEE, reject rate)."],
    ["FR-6", "The system shall show per-machine live status (Running / Idle / Stopped / Maintenance)."],
    ["FR-7", "Supervisors shall be able to log downtime events with start time, end time and reason category."],
    ["FR-8", "The system shall automatically calculate OEE = Availability x Performance x Quality."],
    ["FR-9", "The system shall flag out-of-spec quality when GSM or moisture exceeds the configured tolerance."],
    ["FR-10", "The system shall generate alerts when a parameter crosses a threshold or a machine stops unexpectedly."],
    ["FR-11", "The system shall provide historical charts filterable by date range, shift and machine."],
    ["FR-12", "The system shall allow export of reports to CSV and PDF."],
    ["FR-13", "Admins shall be able to manage machines (add/edit/disable) and set thresholds."],
    ["FR-14", "Admins shall be able to manage users and roles."],
    ["FR-15", "The system shall maintain an audit/activity log of key actions."],
    ["FR-16", "The dashboard shall auto-refresh live data without a manual page reload."],
])

# 6. NON-FUNCTIONAL REQUIREMENTS
h1("6. Non-Functional Requirements")
ctable("Non-functional requirements", ["ID", "Category", "Requirement"], [
    ["NFR-1", "Performance", "The dashboard shall load within 3 seconds and update live data within 2 seconds of a new reading."],
    ["NFR-2", "Usability", "The UI shall be clean, responsive and usable by non-technical plant staff on desktop and tablet."],
    ["NFR-3", "Security", "Passwords shall be stored hashed (bcrypt); routes protected by JWT; role checks on every protected API."],
    ["NFR-4", "Reliability", "The system shall handle simulator and manual entries without data loss; failed writes shall be logged."],
    ["NFR-5", "Scalability", "The architecture shall support adding more machines/sensors without redesign."],
    ["NFR-6", "Maintainability", "Modular, documented code following a clear folder structure and naming conventions."],
    ["NFR-7", "Portability", "Runs on Windows/Linux; deployable on free cloud tiers."],
    ["NFR-8", "Availability", "Target 99% uptime during demonstration; graceful handling of disconnects."],
    ["NFR-9", "Cost", "Built entirely with free and open-source tools; no paid API keys required."],
    ["NFR-10", "Data integrity", "Input validation on all forms; constraints enforced at the database level."],
    ["NFR-11", "Accessibility", "Sufficient colour contrast; status conveyed by icon and label, not colour alone."],
])

# 7. USER ROLES
h1("7. User Roles")
ctable("User roles and permissions", ["Role", "Description", "Key Permissions"], [
    ["Administrator", "System owner / IT.", "Manage users, machines, thresholds; view everything; access audit logs."],
    ["Plant Manager", "Oversees overall production.", "View all dashboards and reports, export data, see OEE, acknowledge alerts."],
    ["Shift Supervisor", "Runs a shift on the floor.", "Log downtime, validate operator entries, view machine status and alerts."],
    ["Machine Operator", "Operates a specific machine.", "Enter production/quality readings; view own machine status."],
    ["Quality Inspector", "Checks paper quality.", "Record GSM/moisture/quality checks; flag rejects."],
    ["Viewer / Guest", "Read-only stakeholder.", "View dashboards and reports only; no data entry."],
])

# 8. FEATURES
h1("8. Features")
h2("8.1 Core Features")
bullets([
    "Secure login and role-based dashboards.",
    "Real-time KPI cards (output, OEE, reject rate, active machines).",
    "Live machine-status board (Running / Idle / Stopped / Maintenance).",
    "Trend charts: production over time, GSM/moisture against tolerance, shift comparison.",
    "Downtime logging with reason categories.",
    "Automatic OEE and shift-efficiency calculation.",
    "Threshold-based alert system with an alerts panel.",
    "Historical reports with date/shift/machine filters.",
    "Export to CSV and PDF.",
    "Admin panel for machines, thresholds and users.",
    "Auto-refreshing live data.",
])
h2("8.2 Supporting Features")
bullets([
    "Built-in sensor data simulator (the demonstration engine).",
    "Activity / audit log.",
    "Light/Dark theme toggle.",
    "Responsive layout for tablets on the shop floor.",
])

# 9. TECHNOLOGY STACK
h1("9. Technology Stack")
ctable("Technology stack", ["Layer", "Technology", "Reason"], [
    ["Frontend", "HTML5, CSS3, JavaScript", "Lightweight, universal, no build tooling required."],
    ["Charts", "Chart.js", "Free, interactive charts for dashboards and reports."],
    ["Backend", "Python (Flask)", "Simple REST API; runs on standard hardware without licensing cost."],
    ["Database", "SQLite (demo) / MySQL (target)", "SQLite needs no server for the demo; MySQL for production."],
    ["Authentication", "JWT + bcrypt", "Standard, secure token-based authentication with hashed passwords."],
    ["Real-time", "Server-Sent Events", "Built-in live push with no extra dependency."],
    ["Version control", "Git + GitHub", "Track work; suitable for internship evaluation."],
])
h2("9.1 System Architecture")
para("The system follows a three-tier architecture: a presentation layer (web browser), an "
     "application/logic layer (Flask) and a data layer (SQLite/MySQL), as shown in Figure 1.")
figure("architecture-diagram.png", "Three-tier system architecture")

# 10. DATABASE DESIGN
h1("10. Database Design")
para("The system uses a relational schema. The principal tables and their key fields are listed "
     "below; primary keys are marked PK and foreign keys FK. The entity-relationship diagram is shown "
     "in Figure 2.")
figure("er-diagram.png", "Entity-relationship diagram of the database schema")

def db_table(name, rows):
    subhead(name)
    ptable(["Field", "Type", "Key / Notes"], rows)

db_table("users", [["user_id", "INT", "PK"], ["name", "VARCHAR", ""], ["email", "VARCHAR", "Unique"],
                   ["password_hash", "VARCHAR", "bcrypt"], ["role_id", "INT", "FK -> roles"], ["created_at", "DATETIME", ""]])
db_table("roles", [["role_id", "INT", "PK"], ["role_name", "VARCHAR", "Admin / Manager / Supervisor / Operator / Viewer"]])
db_table("machines", [["machine_id", "INT", "PK"], ["machine_name", "VARCHAR", ""],
                      ["department", "VARCHAR", "Process department"], ["status", "ENUM", "Running / Idle / Maintenance"],
                      ["capacity", "DECIMAL", "Tonnes per day"], ["is_active", "BOOLEAN", ""]])
db_table("production_records", [["record_id", "INT", "PK"], ["machine_id", "INT", "FK -> machines"],
                                ["shift_id", "INT", "FK -> shifts"], ["operator_id", "INT", "FK -> users"],
                                ["quantity", "DECIMAL", "Tonnes"], ["gsm", "DECIMAL", "Grammage"],
                                ["moisture", "DECIMAL", "%"], ["speed", "DECIMAL", "m/min"]])
db_table("downtime_events", [["downtime_id", "INT", "PK"], ["machine_id", "INT", "FK -> machines"],
                             ["reason", "VARCHAR", "Mechanical / Electrical / ..."], ["start_time", "TIME", ""],
                             ["end_time", "TIME", ""], ["duration_min", "INT", "Computed"]])
db_table("maintenance_logs", [["maintenance_id", "INT", "PK"], ["machine_id", "INT", "FK -> machines"],
                              ["problem", "VARCHAR", ""], ["priority", "ENUM", "Low / Medium / High / Critical"],
                              ["engineer", "VARCHAR", ""], ["status", "ENUM", "Open / In Progress / Completed"]])
db_table("thresholds", [["key", "VARCHAR", "PK (gsm_min, gsm_max, ...)"], ["value", "DECIMAL", ""]])
db_table("activity_logs", [["log_id", "INT", "PK"], ["user", "VARCHAR", ""], ["action", "VARCHAR", ""],
                           ["entity", "VARCHAR", ""], ["timestamp", "DATETIME", ""]])

# 11. PROJECT FOLDER STRUCTURE
h1("11. Project Folder Structure")
para("The project is organized into a static front-end (one folder per page), shared assets, a "
     "canonical dataset, a Python backend and documentation:")
code_block(
"smart-paper-mill-dashboard/\n"
"|-- login/  dashboard/  machines/  production/\n"
"|-- maintenance/  downtime/  reports/  settings/  alerts/\n"
"|-- assets/           # shared sidebar, auth guard, theme\n"
"|-- data/             # canonical demo dataset (MILL_DATA)\n"
"|-- backend/          # Flask API: auth, JWT, roles, SQLite\n"
"|   |-- app.py  requirements.txt  mill.db\n"
"|-- tests/            # automated backend tests (pytest)\n"
"`-- docs/             # SRS, report, manuals, diagrams\n")

# 12. DEVELOPMENT ROADMAP
h1("12. Development Roadmap")
ctable("Development roadmap", ["Phase", "Duration", "Deliverables"], [
    ["0 - Requirements & Design", "Week 1", "SRS, ER diagram, architecture diagram, UI wireframes."],
    ["1 - Project Setup", "Week 2", "Folder structure, DB created, backend + frontend baseline, auth scaffolding."],
    ["2 - Auth & Roles", "Week 3", "Login, JWT, role-based route protection, user/machine admin CRUD."],
    ["3 - Core Data & Entry", "Week 4", "Production-record forms, shifts, validation, database writes."],
    ["4 - Simulator & Real-time", "Week 5", "Sensor data simulator and live updates to the dashboard."],
    ["5 - Dashboard & Charts", "Week 6", "KPI cards, machine-status board, trend charts, live refresh."],
    ["6 - Downtime, OEE & Alerts", "Week 7", "Downtime logging, OEE calculation, threshold alerts panel."],
    ["7 - Reports & Export", "Week 8", "Historical reports, filters, CSV/PDF export."],
    ["8 - Testing & Polish", "Week 9", "Bug fixing, validation, responsive/dark-mode polish, security check."],
    ["9 - Documentation & Deploy", "Week 10", "Final report, user manuals, deployment, demonstration."],
])

# 13. SUGGESTED UI THEME
h1("13. Suggested UI Theme")
para('Concept: "Industrial Clean" — professional, factory-floor friendly and highly readable.')
bullets([
    "Primary colour: deep industrial blue (navbar and headers).",
    "Accent colour: blue/teal for buttons and active states.",
    "Status colours: green (running / within spec), amber (idle / warning), red (stopped / out of spec), grey (maintenance).",
    "Background: soft neutral with white cards (light mode); dark slate (dark mode).",
    "Typography: Inter / Roboto — clean, modern and legible.",
    "Layout: left sidebar navigation, top KPI strip and a card-based grid.",
    "Principle: status conveyed by icon, colour and label together for accessibility.",
])

# 14. FUTURE SCOPE
h1("14. Future Scope")
numbered([
    "Real sensor/PLC integration via OPC-UA or Modbus to replace the simulator with live plant data.",
    "Predictive maintenance using machine learning to forecast equipment failure.",
    "AI-based quality prediction to anticipate GSM/moisture deviations before they occur.",
    "Energy-optimization analytics for steam, power and water efficiency.",
    "A mobile application for supervisors on the move.",
    "ERP/SAP integration for end-to-end plant digitization.",
    "Automated report scheduling (daily production emailed to managers).",
    "Multi-plant support to monitor several mills from one dashboard.",
    "Anomaly detection and smart alerts using statistical or machine-learning models.",
])

doc.save(OUT)
print("Saved:", OUT)
