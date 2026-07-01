# -*- coding: utf-8 -*-
"""
Build the FULL project presentation (24 slides).

  Smart Paper Mill Production Monitoring Dashboard
  Industrial Training Project - Satia Industries Limited

Generates: docs/Smart_Paper_Mill_Presentation.pptx
Run:       python docs/build_presentation.py
           (set SMM_NAME / SMM_UID / SMM_DATE to fill the cover, e.g.
            SMM_NAME="Amrit Singh" SMM_UID="21BCS1234" SMM_DATE="July 2026")
"""

from pptx_common import (
    title_slide, agenda_slide, content_slide, table_slide, image_slide,
    screenshot_slide, screenshot_two, closing_slide, save, OUT,
)

title_slide()
agenda_slide()

content_slide(
    "Context", "Organisation & Domain",
    [
        "**Satia Industries Ltd.** - a leading agro-residue paper manufacturer producing "
        "writing & printing paper primarily from **wheat straw** and wood pulp.",
        "Production flows through several stages: **pulping -> stock preparation -> paper "
        "machine (PM) -> finishing**, run on multiple paper machines.",
        "Key process parameters: output (tonnes), **GSM**, **moisture**, machine speed, "
        "temperature, running hours and efficiency.",
        "Continuous, round-the-clock operation across **three shifts (A / B / C)** makes "
        "timely visibility of production, quality and machine health business-critical.",
        ("Disclaimer: all figures in this project are simulated and industry-realistic - no "
         "confidential Satia data is used.", 1),
    ],
    "Satia is one of India's larger eco-friendly paper makers, using wheat straw instead of "
    "felling trees. Paper-making is a continuous process across several stages and runs 24x7 in "
    "three shifts, so managers need a single, live view of what every machine is doing. I want to "
    "stress that all the data in the system is fictional but realistic.")

content_slide(
    "Motivation", "Problem Statement",
    [
        "Production is recorded **manually** in shift registers, logbooks and disconnected "
        "spreadsheets kept separately for each section.",
        "**No consolidated, real-time view** of output, quality (GSM / moisture), machine "
        "status, downtime or efficiency across the plant.",
        "Out-of-spec quality and excessive downtime are often **detected late**, after the "
        "shift, when corrective action is harder.",
        "**KPIs such as OEE are tedious to compute** by hand, and management reports take "
        "time to compile from scattered sources.",
        "Data is hard to secure, audit or share role-by-role across the organisation.",
    ],
    "The core problem is that today the data lives on paper and in spreadsheets. There's no single "
    "live picture, problems are caught late, and computing KPIs or generating reports is slow and "
    "manual. That's the gap this project addresses.")

content_slide(
    "Goals", "Objectives",
    [
        "Provide a **centralised, role-based web dashboard** for real-time production monitoring.",
        "Capture production output and **quality parameters (GSM, moisture, speed)** plus "
        "**downtime events**, persisted in a database.",
        "Show **live machine status and telemetry** and raise **threshold-driven alerts** "
        "automatically.",
        "Compute **OEE and key KPIs** and let users **export reports (CSV / PDF)**.",
        "Enforce **secure authentication and access control**, and run on standard, low-cost "
        "student hardware and a normal browser.",
    ],
    "The objectives follow directly from the problem: one centralised role-based dashboard; capture "
    "of output, quality and downtime that actually persists; live status and automatic alerts; OEE "
    "and exportable reports; and proper security - all while staying lightweight enough to run on a "
    "normal laptop.")

content_slide(
    "Boundaries", "Scope",
    [
        "**In scope:** a complete web application - responsive front-end, REST API back-end and a "
        "database - with four user roles and nine functional modules.",
        "**In scope:** authentication, production & quality entry, machine monitoring, maintenance, "
        "downtime logging, reports, alerts, settings and an admin panel.",
        "**Simulated sensors:** live machine telemetry is streamed from the server to mimic a "
        "real sensor feed, since plant PLC/DCS hardware is not available to a student project.",
        "**Out of scope:** direct PLC / DCS / IoT sensor integration, ERP/SAP integration, and a "
        "native mobile application - identified instead as future scope.",
    ],
    "To keep the project achievable, the scope is the full software stack with four roles and nine "
    "modules. The one honest simplification is that real plant sensors are simulated by a server "
    "stream - I don't have access to the mill's control hardware. Deeper integrations are listed as "
    "future work.")

table_slide(
    "Tools", "Technology Stack",
    ["Layer", "Technology", "Why"],
    [
        ["Front-end", "HTML5, CSS3, JavaScript, Chart.js", "Lightweight, no build step, runs anywhere"],
        ["Back-end", "Python - Flask (REST API + static)", "Simple, same-origin API & UI"],
        ["Database", "SQLite (MySQL is production target)", "Zero-config, file-based persistence"],
        ["Security", "bcrypt, PyJWT", "Hashed passwords + stateless JWT auth"],
        ["Real-time", "Server-Sent Events (SSE)", "Live push with zero extra dependencies"],
        ["Testing", "pytest (94 automated tests)", "Reproducible backend verification"],
        ["Docs / Deploy", "python-docx, Matplotlib; gunicorn / Render", "Auto-generated docs; free hosting"],
    ],
    "The stack is deliberately free, open-source and lightweight. A vanilla HTML/CSS/JS front-end "
    "with Chart.js, a Flask back-end that serves both the API and the pages same-origin, SQLite for "
    "persistence, bcrypt and JWT for security, and Server-Sent Events for the live feed - chosen "
    "over Socket.IO because it needs no extra dependencies. Everything runs on a normal laptop.",
    col_w=[2.2, 4.7, 5.0], fs=12.5)

image_slide(
    "Design", "System Architecture", "architecture-diagram.png",
    "Three-tier architecture: browser front-end  ->  Flask REST API + SSE  ->  SQLite database (same origin).",
    "Architecturally it's a clean three-tier design. The browser runs the pages and charts; a single "
    "Flask application serves both the static front-end and the REST API on the same origin and also "
    "pushes the live SSE stream; and SQLite holds all persisted data. Same-origin serving keeps "
    "authentication and deployment simple.")

image_slide(
    "Data", "Database Design", "er-diagram.png",
    "Core tables: users, production_records, maintenance_logs, downtime_events, machines, thresholds, activity_logs.",
    "The database centres on production records, with supporting tables for users, machines, "
    "maintenance logs, downtime events, configurable thresholds and an activity/audit log. Production "
    "records carry the quality fields - GSM, moisture and speed - alongside output, grade and shift.")

table_slide(
    "Security", "User Roles & Access Control",
    ["Role", "Representative permissions"],
    [
        ["Administrator", "Full access; manage users, machines & thresholds; view audit log"],
        ["Plant Manager", "View all dashboards & reports; oversee production, OEE and downtime"],
        ["Shift Supervisor", "Log production, downtime and maintenance for their shift"],
        ["Machine Operator", "Enter production & quality readings; view machine status & alerts"],
    ],
    "Access is role-based with four roles. Security rests on three pillars: bcrypt-hashed passwords, "
    "stateless JWT tokens, and role-required checks on every protected API endpoint. Sensitive "
    "actions are written to an audit log. So an operator can enter readings but cannot, for example, "
    "manage users - that's enforced on the server, not just hidden in the UI.",
    col_w=[3.0, 8.9], fs=14)

content_slide(
    "Functionality", "Modules & Key Features",
    [
        "**Dashboard** - KPI cards (incl. average OEE), production-trend & machine-status charts, "
        "live feed.",
        "**Production** - record output and **GSM / moisture / speed**; out-of-spec values flagged.",
        "**Machines** - colour-coded status board (Running / Idle / Stopped / Maintenance) with live "
        "temperature & efficiency.",
        "**Maintenance & Downtime** - log and track jobs by priority/status; capture stoppages with "
        "auto-computed duration.",
        "**Reports, Alerts, Settings & Admin** - filtered reports with CSV/PDF export, threshold "
        "alerts, dark mode, and user/machine/threshold management.",
    ],
    "Functionally there are nine modules. The dashboard is the landing view with KPIs and charts. "
    "Production captures output and the three quality parameters. Machines is a live colour-coded "
    "status board. Maintenance and downtime track jobs and stoppages. And reports, alerts, settings "
    "and the admin panel round it out - including CSV/PDF export, dark mode and full admin control.")

content_slide(
    "Live", "Real-Time Monitoring",
    [
        "The server **pushes live readings** (temperature, efficiency) to every open page using "
        "**Server-Sent Events** over an authenticated stream.",
        "Machine cards and the dashboard's live indicator **update every few seconds** without "
        "reloading the page; a 'Live' timestamp shows freshness.",
        "**KPIs, reports and alerts are API-driven:** records entered through the app immediately "
        "feed the dashboard KPIs, the daily report and the alerts list.",
        "Pages **degrade gracefully** - if the backend is unavailable they fall back to a seeded "
        "demonstration dataset, so the UI never breaks.",
    ],
    "A flagship feature is real-time monitoring. The Flask server streams live machine readings using "
    "Server-Sent Events on an authenticated channel, so machine cards and the dashboard update every "
    "few seconds with no page reload. I also wired the dashboard KPIs, the daily report and the "
    "alerts to read live from the API - so if you enter a record it shows up immediately - with a "
    "graceful fallback to seeded data when offline.")

content_slide(
    "Analytics", "Quality, OEE & Alerts",
    [
        "Every production record carries **quality readings - GSM, moisture and machine speed** - "
        "validated against configurable limits.",
        "**Thresholds:** GSM 45-120, moisture <= 6.5%, temperature <= 88 deg C, efficiency >= 75%, "
        "downtime <= 60 min (all admin-editable).",
        "**OEE = Availability x Performance x Quality** is computed and charted per machine.",
        "**Threshold-driven alerts** are raised automatically for out-of-spec GSM/moisture and "
        "over-limit downtime, with acknowledge & severity filtering.",
    ],
    "On the analytics side, each record stores GSM, moisture and speed, checked against limits that "
    "the admin can edit. OEE - availability times performance times quality - is computed and charted "
    "per machine. And the alerts page derives warnings live by comparing the actual data against "
    "those thresholds, so an out-of-spec sheet or an over-long stoppage raises an alert you can "
    "acknowledge.")

screenshot_slide(
    "Walkthrough", "Dashboard", "dashboard.png",
    "Live production overview: KPI cards, production-trend and machine-status charts, and quick actions.",
    "This is the dashboard - the landing screen. Six KPI cards including average OEE, a production-trend "
    "line chart against target, a machine-status doughnut, quick actions and a recent-production table. "
    "The KPIs and charts read live from the API, so they reflect data entered through the app.")

screenshot_slide(
    "Walkthrough", "Machine Monitoring", "machines.png",
    "Colour-coded status board - Running / Idle / Stopped / Maintenance - with live temperature & efficiency.",
    "The machine-monitoring page is a colour-coded status board. Summary chips at the top, search and "
    "status filters - including the Stopped state - and a card per machine showing temperature, running "
    "hours, capacity and an efficiency bar. Temperature and efficiency update live via the server stream.")

screenshot_slide(
    "Walkthrough", "Reports & Analytics", "reports.png",
    "Period / machine / shift filters, plant OEE, downtime breakdown, and CSV / PDF export.",
    "The reports page turns the raw data into analytics: summary KPIs, a daily-production chart that reads "
    "live from the API, a downtime-by-reason breakdown, weekly and monthly views and OEE by machine - all "
    "filterable by period, machine and shift, and exportable to CSV or PDF.")

screenshot_two(
    "Walkthrough", "Production Entry & Alerts",
    "production.png", "Production entry with GSM / moisture / speed quality capture.",
    "alerts.png", "Threshold-driven alerts with severity filtering and acknowledgement.",
    "On the left, the production-entry screen captures output plus the quality parameters - GSM, moisture "
    "and speed - which are validated against the configured limits. On the right, the alerts page, which "
    "raises threshold-driven warnings for out-of-spec quality and excessive downtime that a supervisor "
    "can filter by severity and acknowledge.")

image_slide(
    "Plan", "Project Timeline", "timeline-gantt.png",
    "Phased delivery: requirements & design  ->  module build  ->  backend & security  ->  testing, docs & deployment.",
    "The work was delivered in phases - starting with requirements and design, then building the "
    "modules, then the real back-end with authentication and persistence, and finally testing, "
    "documentation and deployment. This Gantt chart summarises that schedule.")

table_slide(
    "Verification", "Testing & Quality Assurance",
    ["Test area", "Coverage"],
    [
        ["Authentication & JWT", "Valid/invalid login, token guard, expiry handling"],
        ["Role-based access control", "Allowed vs. forbidden endpoints per role (403/200)"],
        ["Production / Maintenance / Downtime", "Full create-read-update-delete + validation"],
        ["Quality & thresholds", "GSM / moisture / speed fields and limit checks"],
        ["Live stream & audit", "Authenticated SSE; audit-log entries"],
        ["Role workflows", "End-to-end tasks for each of the four roles"],
    ],
    "Quality is backed by 94 automated tests in pytest - 36 in the core API suite and 58 in a "
    "role-workflow suite - each running against an isolated temporary database. They cover "
    "authentication, role-based access, full CRUD on production, maintenance and downtime, the "
    "quality fields and thresholds, the live stream and the audit log. All 94 pass.",
    col_w=[4.3, 7.6], fs=13.5)

content_slide(
    "Outcome", "Results & Outcomes",
    [
        "A **working, end-to-end web application** with real authentication, role-based access and "
        "**database persistence that survives restarts**.",
        "**Live telemetry** plus API-driven KPIs, reports and alerts across the dashboard.",
        "A **canonical, seeded dataset** (machines, production, maintenance, operators) for a "
        "consistent, repeatable demonstration.",
        "**94/94 automated tests passing**, and a complete documentation set - **SRS, project "
        "report and role-based user manuals**.",
        "**Deployment-ready** for free hosting (Render) via gunicorn, with no paid services.",
    ],
    "The outcome is a complete, working application - not a mock-up. Real login and roles, data that "
    "persists across restarts, live telemetry, a consistent demo dataset, 94 passing tests, full "
    "documentation including an SRS, report and user manuals, and it's ready to deploy free on Render.")

content_slide(
    "Reflection", "Challenges & Learnings",
    [
        "**Simulating real-time data without hardware** - solved cleanly with Server-Sent Events "
        "instead of polling or heavyweight sockets.",
        "**Keeping documentation consistent with code** - a single source of truth (canonical "
        "dataset + build scripts) prevented drift.",
        "**Security details** - e.g. correct JWT subject typing and enforcing role checks on the "
        "server, not just the UI.",
        "**Designing for constraints** - the whole stack had to run on a low-spec laptop and a "
        "normal browser, which shaped every technology choice.",
        "Gained hands-on experience across **full-stack development, REST APIs, auth, testing and "
        "deployment**.",
    ],
    "The main challenges were simulating live data without plant hardware - solved with SSE - and "
    "keeping a large set of documents consistent with evolving code, which I handled with a single "
    "canonical dataset and generator scripts. I also learned a lot about practical security and about "
    "designing within real hardware constraints. Overall it was genuine full-stack experience.")

content_slide(
    "Next", "Future Scope",
    [
        "Integrate **real plant sensors via PLC / DCS / IoT gateways** to replace the simulated feed.",
        "Migrate to **MySQL / PostgreSQL** for multi-user, production-scale deployment.",
        "Add **predictive maintenance** using machine-learning on historical machine data.",
        "Deliver a **mobile app** and **email / SMS alert** notifications for supervisors on the move.",
        "Extend to **multi-plant / multi-line** monitoring with consolidated group dashboards.",
    ],
    "Looking ahead, the natural next steps are connecting real sensors through PLC or IoT gateways, "
    "moving to a production database, adding predictive maintenance with machine learning, a mobile "
    "app with push and SMS alerts, and scaling from one mill to multiple plants.")

content_slide(
    "Summary", "Conclusion",
    [
        "The project delivers a **secure, real-time, role-based monitoring dashboard** that turns "
        "manual, scattered records into a **single live view** of the plant.",
        "It demonstrates a **complete, tested and documented full-stack system** built entirely with "
        "free, open-source tools.",
        "It directly addresses the industry need for **timely production, quality and machine-health "
        "visibility** - and provides a clear path to a sensor-connected production system.",
    ],
    "To conclude: the project replaces manual logbooks with a secure, real-time, role-based dashboard "
    "- a complete, tested and documented full-stack system built with free tools, and a solid "
    "foundation for a fully sensor-connected solution. Thank you.")

closing_slide()
save(OUT)
