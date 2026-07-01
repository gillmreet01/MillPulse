# -*- coding: utf-8 -*-
"""
Build the CONDENSED project presentation (10 slides) for a shorter slot.

Generates: docs/Smart_Paper_Mill_Presentation_Short.pptx
Run:       python docs/build_presentation_short.py
           (honours SMM_NAME / SMM_UID / SMM_DATE like the full deck)
"""

from pptx_common import (
    title_slide, content_slide, table_slide, image_slide,
    screenshot_slide, closing_slide, save, SHORT_OUT,
)

# 1 -------------------------------------------------------------------
title_slide()

# 2 -------------------------------------------------------------------
content_slide(
    "The Gap", "Problem & Objectives",
    [
        "**Problem:** production, quality (GSM / moisture), machine status and downtime are recorded "
        "**manually** in registers and spreadsheets - no single, real-time view, and problems are "
        "caught late.",
        "**Objective:** a **centralised, role-based web dashboard** for real-time production monitoring.",
        "Capture output plus **quality and downtime** in a database, with **live machine telemetry** "
        "and **automatic threshold alerts**.",
        "Compute **OEE and KPIs**, export **reports (CSV / PDF)**, and enforce **secure, role-based "
        "access** - all on standard student hardware.",
    ],
    "I'll start with the gap and what I set out to build. Today the plant's data lives on paper and in "
    "spreadsheets, so there's no live picture and issues are noticed late. The objective was a single "
    "role-based dashboard that captures production, quality and downtime, shows live machine data, "
    "raises automatic alerts, computes OEE and exports reports - with proper security, on a normal laptop.")

# 3 -------------------------------------------------------------------
table_slide(
    "Tools", "Technology Stack",
    ["Layer", "Technology", "Why"],
    [
        ["Front-end", "HTML5, CSS3, JavaScript, Chart.js", "Lightweight, no build step"],
        ["Back-end", "Python - Flask (REST API + static)", "Same-origin API & UI"],
        ["Database", "SQLite (MySQL is production target)", "Zero-config persistence"],
        ["Security", "bcrypt, PyJWT", "Hashed passwords + JWT auth"],
        ["Real-time", "Server-Sent Events (SSE)", "Live push, zero extra deps"],
        ["Testing / Deploy", "pytest (94 tests); gunicorn / Render", "Verified; free hosting"],
    ],
    "The stack is deliberately free, open-source and lightweight: a vanilla HTML/CSS/JS front-end with "
    "Chart.js, a Flask back-end serving both the API and the pages, SQLite for storage, bcrypt and JWT "
    "for security, and Server-Sent Events for the live feed. Everything runs on a normal laptop.",
    col_w=[2.5, 5.4, 4.0], fs=13)

# 4 -------------------------------------------------------------------
image_slide(
    "Design", "System Architecture", "architecture-diagram.png",
    "Three-tier: browser front-end  ->  Flask REST API + SSE  ->  SQLite database (same origin).",
    "The design is a clean three-tier architecture: the browser runs the pages and charts, a single "
    "Flask app serves the front-end and the REST API on the same origin and pushes the live stream, "
    "and SQLite holds all persisted data.")

# 5 -------------------------------------------------------------------
screenshot_slide(
    "Walkthrough", "Dashboard", "dashboard.png",
    "Live overview: KPI cards (incl. average OEE), production-trend and machine-status charts.",
    "This is the dashboard - the landing screen, with six KPI cards including average OEE, a "
    "production-trend chart and a machine-status doughnut. The KPIs and charts read live from the API, "
    "so they reflect data entered through the app.")

# 6 -------------------------------------------------------------------
screenshot_slide(
    "Walkthrough", "Machine Monitoring", "machines.png",
    "Colour-coded status board - Running / Idle / Stopped / Maintenance - with live telemetry.",
    "The machine-monitoring page is a colour-coded status board with search and status filters and a "
    "card per machine showing temperature, hours, capacity and efficiency - with temperature and "
    "efficiency updating live via the server stream.")

# 7 -------------------------------------------------------------------
screenshot_slide(
    "Walkthrough", "Reports & Analytics", "reports.png",
    "Filtered reports, plant OEE, downtime breakdown, and CSV / PDF export.",
    "The reports page turns the raw data into analytics - summary KPIs, a live daily-production chart, "
    "a downtime-by-reason breakdown and OEE by machine - all filterable by period, machine and shift, "
    "and exportable to CSV or PDF.")

# 8 -------------------------------------------------------------------
content_slide(
    "Highlights", "Real-Time, OEE & Alerts",
    [
        "**Live telemetry:** the server pushes temperature & efficiency to open pages via **SSE**, "
        "updating every few seconds without a reload.",
        "**API-driven:** dashboard KPIs, the daily report and alerts reflect records entered through "
        "the app, with graceful fallback when offline.",
        "**Quality & OEE:** every record captures GSM / moisture / speed against admin-editable limits; "
        "**OEE = Availability x Performance x Quality** is charted per machine.",
        "**Threshold alerts:** out-of-spec quality and over-limit downtime raise alerts that can be "
        "filtered by severity and acknowledged.",
    ],
    "A few technical highlights: live telemetry via Server-Sent Events; KPIs, reports and alerts that "
    "read live from the API with a fallback when offline; quality capture of GSM, moisture and speed "
    "against editable limits; OEE charted per machine; and automatic threshold-driven alerts you can "
    "acknowledge.")

# 9 -------------------------------------------------------------------
content_slide(
    "Results", "Testing & Outcomes",
    [
        "**94 / 94 automated tests passing** (pytest) - authentication, role-based access, full CRUD, "
        "quality & thresholds, live stream and audit log.",
        "A **working, end-to-end application** with real auth, role-based access and **persistence "
        "that survives restarts**.",
        "A complete **documentation set** - SRS, project report and role-based user manuals - and a "
        "**deploy-ready** build for free hosting (Render).",
        "Hands-on experience across **full-stack development, REST APIs, security, testing and "
        "deployment**.",
    ],
    "On results: the back-end is backed by 94 passing automated tests covering auth, roles, CRUD, "
    "thresholds, streaming and the audit log. The outcome is a complete, working application with real "
    "authentication and persistence, a full documentation set, and a deploy-ready build - and genuine "
    "full-stack experience for me.")

# 10 ------------------------------------------------------------------
closing_slide()

save(SHORT_OUT)
