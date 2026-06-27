# -*- coding: utf-8 -*-
"""
Builds the final Industrial Training Project Report (.docx) for the
Smart Paper Mill Production Monitoring Dashboard, following the
Chandigarh University 'Industrial/Institutional Training Project Report' format.
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
OUT = os.path.join(HERE, "Final_Project_Report.docx")

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

def style_heading(name, size, center=False):
    st = doc.styles[name]
    st.font.name = "Times New Roman"; st.font.size = Pt(size); st.font.bold = True
    st.font.color.rgb = RGBColor(0, 0, 0)
    st.paragraph_format.space_before = Pt(12); st.paragraph_format.space_after = Pt(6)
    if center:
        st.paragraph_format.alignment = AL.CENTER

style_heading("Heading 1", 16, center=True)   # Chapter name
style_heading("Heading 2", 14)                 # Main heading
style_heading("Heading 3", 12)                 # Sub-heading

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

def h1(text):
    return doc.add_heading(text, level=1)

def h2(text):
    return doc.add_heading(text, level=2)

def h3(text):
    return doc.add_heading(text, level=3)

def bullets(items):
    for it in items:
        doc.add_paragraph(it, style="List Bullet")

def numbered(items):
    for it in items:
        doc.add_paragraph(it, style="List Number")

def page_break():
    doc.add_page_break()

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), fill)
    tcPr.append(shd)

def set_cell(cell, text, bold=False, size=11):
    cell.text = ""
    p = cell.paragraphs[0]; r = p.add_run(str(text))
    r.bold = bold; r.font.size = Pt(size); r.font.name = "Times New Roman"
    p.paragraph_format.space_after = Pt(0); p.paragraph_format.line_spacing = 1.0

def table(title, headers, rows):
    # caption above the table
    cp = doc.add_paragraph(style="Caption")
    cp.add_run("Table ").bold = True
    _seq(cp, "Table")
    rr = cp.add_run(": " + title); rr.bold = True; rr.font.size = Pt(10)
    cp.runs[0].font.size = Pt(10)
    t = doc.add_table(rows=1, cols=len(headers)); t.style = "Table Grid"; t.allow_autofit = True
    for i, h in enumerate(headers):
        set_cell(t.rows[0].cells[i], h, bold=True); shade(t.rows[0].cells[i], "D9E2F3")
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            set_cell(cells[i], v)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def figure(filename, title, width=150):
    path = os.path.join(DIAG, filename)
    if os.path.exists(path):
        doc.add_picture(path, width=Mm(width))
        doc.paragraphs[-1].alignment = AL.CENTER
    p = doc.add_paragraph(style="Caption"); p.alignment = AL.CENTER
    p.add_run("Figure ").bold = True
    _seq(p, "Figure")
    rr = p.add_run(": " + title); rr.bold = True; rr.font.size = Pt(10)
    p.runs[0].font.size = Pt(10)

def toc_field(instr):
    p = doc.add_paragraph(); _field(p.add_run(), instr)

# Footer page numbers (linked across sections; format differs per section)
sec0.different_first_page_header_footer = True   # no number on the title page
fp = sec0.footer.paragraphs[0]; fp.alignment = AL.CENTER
fp.add_run("Page "); _page_field(fp)
set_pgnum(sec0, "lowerRoman")                    # front matter: i, ii, iii ...

# ==================================================================
# TITLE PAGE
# ==================================================================
for _ in range(2):
    doc.add_paragraph()
title_line("SMART PAPER MILL PRODUCTION MONITORING DASHBOARD", 18, after=18)
center("A PROJECT REPORT", 14, bold=True, after=14)
center("Submitted by", 14, bold=True, italic=True, after=10)
center("[STUDENT NAME]  (UID: [__________])", 16, bold=True, after=18)
center("in partial fulfillment for the award of the degree of", 14, bold=True, italic=True, after=10)
center("BACHELOR OF ENGINEERING", 16, bold=True, after=2)
center("IN", 14, bold=False, after=2)
center("COMPUTER SCIENCE & ENGINEERING", 16, bold=True, after=18)
center("Industrial Training carried out at", 12, after=2)
center("SATIA INDUSTRIES LIMITED", 14, bold=True, after=18)
center("Chandigarh University", 14, after=2)
center("[MONTH] [YEAR]", 14, after=2)
page_break()

# ==================================================================
# TRAINING COMPLETION CERTIFICATE
# ==================================================================
title_line("TRAINING COMPLETION CERTIFICATE", 16, after=18)
doc.add_paragraph()
p = para('Certified that this project report "SMART PAPER MILL PRODUCTION MONITORING DASHBOARD" '
         'is the bonafide training work of [STUDENT NAME] (UID: [__________]) who carried out the '
         'project work under my/our supervision during the industrial training from [START DATE] to '
         '[END DATE].')
p.paragraph_format.line_spacing = 2.0
doc.add_paragraph(); doc.add_paragraph()
center("<<Signature of the Supervisor>>", 12, after=2)
center("SIGNATURE", 12, bold=True, after=2)
center("[Supervisor Name]", 12, after=2)
center("SUPERVISOR", 12, bold=True, after=2)
center("[Industry / Academic Designation]", 12, after=2)
center("[Department / Institution]", 12, after=14)
page_break()

# ==================================================================
# ACKNOWLEDGEMENT
# ==================================================================
title_line("ACKNOWLEDGEMENT", 16, after=14)
para("I express my sincere gratitude to Satia Industries Limited for providing the opportunity to "
     "undertake my industrial training and to gain practical exposure to the production processes of "
     "a modern paper manufacturing plant. I am thankful to my industry supervisor and to the faculty "
     "of the Department of Computer Science & Engineering, Chandigarh University, for their continued "
     "guidance, encouragement and valuable feedback throughout the course of this project. I also "
     "acknowledge the support of my family and friends. The data used in this report is fictional and "
     "industry-realistic; no confidential or proprietary company data has been used.")
page_break()

# ==================================================================
# TABLE OF CONTENTS
# ==================================================================
title_line("TABLE OF CONTENTS", 16, after=10)
toc_field('TOC \\o "1-3" \\h \\z \\u')
para("(Right-click the table and choose 'Update Field' to generate the contents and page numbers.)")
page_break()

# LIST OF FIGURES
title_line("LIST OF FIGURES", 16, after=10)
toc_field('TOC \\h \\z \\c "Figure"')
para("(Right-click and 'Update Field' to populate the list of figures.)")
page_break()

# LIST OF TABLES
title_line("LIST OF TABLES", 16, after=10)
toc_field('TOC \\h \\z \\c "Table"')
para("(Right-click and 'Update Field' to populate the list of tables.)")
page_break()

# ==================================================================
# ABSTRACT
# ==================================================================
h1("ABSTRACT")
ab = para("This report presents the design, development and validation of the Smart Paper Mill "
     "Production Monitoring Dashboard, a web-based application developed during industrial training at "
     "Satia Industries Limited, a manufacturer of writing and printing paper from agricultural "
     "residue (wheat straw) and wood pulp. The objective of the project is to replace fragmented, "
     "paper-based production logging with a single, real-time, role-based digital platform that "
     "consolidates production output, machine status, quality parameters, downtime and Overall "
     "Equipment Effectiveness (OEE). The system is implemented as a Python (Flask) backend with an "
     "SQLite database, secured using bcrypt password hashing and JSON Web Token (JWT) authentication "
     "with role-based access control, and a responsive HTML5/CSS3/JavaScript front-end that uses "
     "Chart.js for visualization. Live machine telemetry is delivered to the browser using "
     "Server-Sent Events, demonstrating real-time monitoring without page reloads. Because live "
     "plant-floor integration is outside the scope of an academic assignment, the system operates on "
     "realistic, internally consistent simulated data. The delivered solution includes secure login, "
     "an administrative panel for users, machines and thresholds, production and downtime data entry, "
     "automatic OEE computation, threshold-based alerts, analytical reports with CSV and PDF export, "
     "an audit trail, and a dark-mode interface. The backend was validated using an automated test "
     "suite of thirty-six test cases, all of which pass. The project demonstrates the core principles "
     "of industrial production monitoring while remaining free, lightweight and runnable on standard "
     "student hardware.")
ab.paragraph_format.line_spacing = 2.0
page_break()

# ==================================================================
# ABBREVIATIONS
# ==================================================================
h1("ABBREVIATIONS")
table("List of abbreviations used in the report",
      ["Abbreviation", "Expansion"],
      [["OEE", "Overall Equipment Effectiveness"],
       ["GSM", "Grams per Square Metre (paper grammage)"],
       ["TPD", "Tonnes Per Day"],
       ["JWT", "JSON Web Token"],
       ["RBAC", "Role-Based Access Control"],
       ["SSE", "Server-Sent Events"],
       ["API", "Application Programming Interface"],
       ["CRUD", "Create, Read, Update, Delete"],
       ["KPI", "Key Performance Indicator"],
       ["SRS", "Software Requirements Specification"],
       ["UI / UX", "User Interface / User Experience"],
       ["PLC / DCS", "Programmable Logic Controller / Distributed Control System"]])

# ==================================================================
# BODY SECTION — restart page numbers at 1 (Arabic)
# ==================================================================
body = doc.add_section(WD_SECTION.NEW_PAGE)
body.page_width, body.page_height = Mm(210), Mm(297)
body.top_margin = body.bottom_margin = Mm(25)
body.left_margin = Mm(32); body.right_margin = Mm(25)
body.different_first_page_header_footer = False
set_pgnum(body, "decimal", start=1)

# ------------------------------------------------------------------
# CHAPTER 1 — INTRODUCTION
# ------------------------------------------------------------------
center("CHAPTER 1", 16, bold=True, after=2)
h1("INTRODUCTION")
h2("1.1 Client Identification / Need Identification / Relevant Contemporary Issue")
para("Satia Industries Limited is an established manufacturer of writing and printing paper that uses "
     "agricultural residue, principally wheat straw, together with wood pulp as raw material. Paper "
     "production is a continuous, multi-stage process spanning raw-material handling, pulping, "
     "chemical processing and bleaching, the paper machine section, drying, finishing and cutting, "
     "packaging and dispatch. The performance of each stage directly affects output, product quality "
     "and operating cost.")
para("At present, much of the production information at the plant is recorded manually in shift "
     "registers, logbooks and disconnected spreadsheets maintained separately for each section. This "
     "practice is consistent with a wider industry challenge: as the manufacturing sector moves "
     "towards Industry 4.0 and digitalisation, plants that still rely on manual record-keeping lack "
     "the real-time visibility required for timely decisions. The need for a consolidated monitoring "
     "tool was identified through observation of the plant's record-keeping practices during the "
     "training period.")
para("The relevant contemporary issue is the digital transformation of process industries and, in "
     "particular, the use of Overall Equipment Effectiveness as a standard metric for measuring "
     "manufacturing productivity. A monitoring dashboard that brings these concepts to a paper mill "
     "addresses a genuine, documented operational need.")

h2("1.2 Identification of Problem")
para("The broad problem addressed by this project is the absence of a single, real-time, role-based "
     "digital platform through which paper-mill production, quality and downtime information can be "
     "recorded, monitored and analysed in a consistent and timely manner. The consequences include "
     "delayed managerial decisions, laborious consolidation of scattered data, late detection of "
     "out-of-specification quality, and an inability to compare the performance of different shifts, "
     "machines or time periods.")

h2("1.3 Identification of Tasks")
para("To build and validate the solution, the work was divided into the following tasks, which also "
     "form the structure of the report:")
table("Identification of project tasks",
      ["Task", "Description"],
      [["Requirements", "Prepare the Software Requirements Specification and database design."],
       ["Authentication", "Implement secure login, JWT and role-based access control."],
       ["Data entry", "Build production, maintenance and downtime data-entry modules."],
       ["Real-time", "Provide a live data feed (simulator) to the monitoring screens."],
       ["Dashboard", "Develop KPI cards, machine-status board and trend charts."],
       ["OEE & alerts", "Compute OEE and generate threshold-based alerts."],
       ["Reports", "Build analytical reports with filters and CSV/PDF export."],
       ["Administration", "Provide an admin panel for users, machines and thresholds."],
       ["Testing", "Validate the backend with an automated test suite."]])

h2("1.4 Timeline")
para("The project was planned over a ten-week internship schedule. The timeline is shown as a Gantt "
     "chart in Figure 1, with each phase delivering a defined increment of functionality.")
figure("timeline-gantt.png", "Project timeline (ten-week internship schedule)")

h2("1.5 Organization of the Report")
para("The remainder of the report is organised as follows. Chapter 2 presents the literature review "
     "and background study, defines the problem and states the objectives. Chapter 3 describes the "
     "design flow, including the evaluation of features, the design constraints, two alternative "
     "designs and the selection of the final design. Chapter 4 presents the implementation using "
     "modern engineering tools together with the testing and validation results. Chapter 5 concludes "
     "the report and outlines future work, followed by the references, appendices and the user "
     "manual.")

# ------------------------------------------------------------------
# CHAPTER 2 — LITERATURE REVIEW
# ------------------------------------------------------------------
page_break()
center("CHAPTER 2", 16, bold=True, after=2)
h1("LITERATURE REVIEW / BACKGROUND STUDY")
h2("2.1 Timeline of the Reported Problem")
para("The problem of monitoring and improving manufacturing productivity has been studied for "
     "several decades. Overall Equipment Effectiveness was introduced by Seiichi Nakajima in the "
     "1980s as part of Total Productive Maintenance and remains the standard composite metric, "
     "defined as the product of Availability, Performance and Quality. From the 1990s onwards, "
     "Manufacturing Execution Systems and Supervisory Control and Data Acquisition systems were "
     "increasingly deployed to collect plant data automatically. More recently, the Industry 4.0 "
     "movement has emphasised connected sensors, real-time dashboards and data-driven decision "
     "making across process industries, including pulp and paper.")

h2("2.2 Proposed Solutions")
para("Several classes of solution to production-monitoring problems exist. Commercial MES and OEE "
     "software platforms offer comprehensive data collection and analytics but are costly and complex "
     "to deploy. SCADA systems provide real-time control-room visualisation but require integration "
     "with plant instrumentation through industrial protocols. Lightweight custom dashboards, built "
     "with open web technologies, offer a low-cost alternative suited to demonstration and "
     "small-scale deployments.")

h2("2.3 Bibliometric Analysis")
table("Comparison of existing solution classes",
      ["Solution class", "Key features", "Effectiveness", "Drawback"],
      [["Commercial MES", "End-to-end data, analytics, ERP links", "High", "Expensive, complex"],
       ["SCADA / DCS", "Real-time control and visualisation", "High", "Needs plant instrumentation"],
       ["Spreadsheets", "Familiar, low cost", "Low", "Manual, no real-time, error-prone"],
       ["Custom web dashboard", "Lightweight, configurable, free", "Medium", "Requires development effort"]])

h2("2.4 Review Summary")
para("The literature confirms that OEE-based monitoring is the accepted approach and that real-time "
     "dashboards deliver clear benefits. For an academic internship, where cost must be zero and the "
     "solution must run on standard hardware without plant access, a lightweight custom web dashboard "
     "is the most appropriate option. This project therefore implements such a dashboard, reproducing "
     "the essential concepts of industrial monitoring on realistic simulated data.")

h2("2.5 Problem Definition")
para("The project shall design and implement a web-based dashboard that records and consolidates "
     "paper-mill production, quality and downtime data; computes OEE; visualises live machine status "
     "and historical trends; raises threshold-based alerts; and enforces role-based access. The "
     "system shall be free, lightweight and runnable on a standard laptop. It shall not require live "
     "plant instrumentation, and shall not use any confidential company data.")

h2("2.6 Goals / Objectives")
numbered([
    "Provide a centralized, role-based dashboard for real-time paper-mill production monitoring.",
    "Capture production data, including grammage, moisture and machine speed, and flag out-of-specification readings.",
    "Compute Overall Equipment Effectiveness automatically from availability, performance and quality.",
    "Deliver live machine telemetry to the browser without manual page reloads.",
    "Generate threshold-based alerts and present them in a dedicated panel.",
    "Provide analytical reports with date, shift and machine filters and CSV/PDF export.",
    "Provide an administrative panel for managing users, machines and thresholds, with an audit log.",
    "Validate the backend with an automated test suite.",
])

# ------------------------------------------------------------------
# CHAPTER 3 — DESIGN FLOW / PROCESS
# ------------------------------------------------------------------
page_break()
center("CHAPTER 3", 16, bold=True, after=2)
h1("DESIGN FLOW / PROCESS")
h2("3.1 Evaluation & Selection of Specifications / Features")
para("Drawing on the literature review, the features ideally required in the solution were "
     "identified: secure role-based login; real-time key performance indicators; a live "
     "machine-status board; production and downtime data entry; automatic OEE calculation; "
     "threshold-based alerts; historical reports with export; and an administrative panel. These "
     "were prioritised into core features (essential for demonstration) and supporting features "
     "(value-adding), and recorded in the Software Requirements Specification.")

h2("3.2 Design Constraints")
para("The design was developed under the following constraints. Economic: the solution must be built "
     "entirely with free and open-source tools, with no licensing or API cost. Manufacturability / "
     "deployability: it must run on standard student hardware and a normal web browser. Health, "
     "safety and environmental: the system is informational and introduces no physical risk; it "
     "reflects the plant's agro-residue, low-impact raw material. Professional and ethical: no "
     "confidential or proprietary company data is used, and all demonstration data is fictional. "
     "Social and regulatory: the interface is accessible and conveys status through icon, colour and "
     "label together rather than colour alone.")

h2("3.3 Analysis and Feature Finalization subject to Constraints")
para("In light of these constraints, live sensor and PLC integration was removed from scope and "
     "replaced by a built-in data simulator and manual data entry. Predictive-maintenance and "
     "machine-learning features were deferred to future work. The remaining feature set was retained "
     "and finalised as the basis for implementation.")

h2("3.4 Design Flow")
para("Two alternative designs were considered for the technology stack, as compared in Table 3.")
table("Comparison of two candidate designs",
      ["Aspect", "Alternative A (Node stack)", "Alternative B (Python stack) — selected"],
      [["Backend", "Node.js + Express", "Python + Flask"],
       ["Database", "MySQL (server required)", "SQLite (serverless, built-in)"],
       ["Real-time", "Socket.IO (extra dependency)", "Server-Sent Events (built-in)"],
       ["Runtime availability", "Requires Node runtime", "Python widely pre-installed"],
       ["Setup effort", "Higher", "Lower"],
       ["Cost", "Free", "Free"]])

h2("3.5 Design Selection")
para("Alternative B was selected. Although the project was originally specified around a Node.js "
     "stack, the Python/Flask stack with SQLite and Server-Sent Events was chosen because it requires "
     "no separate database server, no additional real-time library and no runtime that is not already "
     "commonly available, while remaining equally free. This minimises setup effort and maximises the "
     "likelihood that the application runs unmodified on a standard laptop, satisfying the "
     "deployability constraint.")

h2("3.6 Implementation Plan / Methodology")
para("The system follows a three-tier architecture comprising a presentation layer (the web "
     "browser), an application layer (the Flask REST API, which also serves the static front-end) "
     "and a data layer (the SQLite database). Authentication uses bcrypt-hashed passwords and JWTs, "
     "and every protected route enforces a role check. The architecture is shown in Figure 2 and the "
     "database entity-relationship design in Figure 3.")
figure("architecture-diagram.png", "Three-tier system architecture")
figure("er-diagram.png", "Entity-relationship diagram of the database schema")
para("The technologies used are summarised in Table 4.")
table("Technology stack",
      ["Layer", "Technology", "Purpose"],
      [["Front-end", "HTML5, CSS3, JavaScript", "Structure, styling, interactivity"],
       ["Charts", "Chart.js", "KPI and trend visualisation"],
       ["Backend", "Python (Flask)", "REST API and static file serving"],
       ["Database", "SQLite", "Persistent storage"],
       ["Security", "bcrypt, PyJWT", "Password hashing and token authentication"],
       ["Real-time", "Server-Sent Events", "Live telemetry push"],
       ["Testing", "pytest", "Automated backend tests"],
       ["Version control", "Git", "Source management"]])

# ------------------------------------------------------------------
# CHAPTER 4 — RESULTS ANALYSIS AND VALIDATION
# ------------------------------------------------------------------
page_break()
center("CHAPTER 4", 16, bold=True, after=2)
h1("RESULTS ANALYSIS AND VALIDATION")
h2("4.1 Implementation of Solution")
para("The solution was implemented using modern engineering tools: Visual Studio Code as the editor; "
     "Python with the Flask framework and SQLite for the backend; HTML, CSS, JavaScript and Chart.js "
     "for the front-end; Git for version control; and pytest for automated testing. The "
     "supplementary figures and the report itself were generated programmatically using Python "
     "libraries (matplotlib and python-docx). The delivered modules are listed in Table 5.")
table("Implemented modules",
      ["Module", "Function"],
      [["Authentication", "JWT login, role-based access, session handling"],
       ["Dashboard", "KPI cards (incl. average OEE), trend and status charts, live efficiency feed"],
       ["Machine Monitoring", "Status board with live temperature and efficiency via SSE"],
       ["Production Entry", "Records output, GSM, moisture and speed; flags out-of-spec readings"],
       ["Downtime Logging", "Logs events with reason and automatically computed duration"],
       ["Maintenance", "Logs and tracks maintenance jobs by priority and status"],
       ["Reports", "Filterable charts, OEE by machine, CSV and PDF export"],
       ["Alerts", "Threshold-driven alert panel with acknowledgement"],
       ["Admin Panel", "Manage users, machines and thresholds; view the audit log"]])
para("Key engineering results include the automatic OEE computation (Availability x Performance x "
     "Quality) derived from production records and machine capacity; live machine telemetry pushed "
     "from the backend every three seconds; persistent storage of all production, downtime, "
     "maintenance, user, machine and threshold data; and an audit trail recording logins and key "
     "changes.")

h2("4.2 Testing / Characterization / Data Validation")
para("The backend was validated using an automated test suite executed with pytest, using an "
     "isolated temporary database for each test. All thirty-six test cases pass. The categories of "
     "tests are summarised in Table 6.")
table("Summary of automated test results",
      ["Test category", "Cases", "Result"],
      [["Health and authentication", "5", "Pass"],
       ["Role-based access control", "4", "Pass"],
       ["Production CRUD and quality fields", "6", "Pass"],
       ["Maintenance and downtime", "5", "Pass"],
       ["Live-stream authentication", "2", "Pass"],
       ["User management", "5", "Pass"],
       ["Machine management and thresholds", "8", "Pass"],
       ["Activity / audit log", "1", "Pass"],
       ["Total", "36", "All Pass"]])
para("In addition to automated tests, the running application was validated through live request "
     "tests that confirmed the live telemetry stream, role enforcement, data persistence across "
     "restarts and the correct computation of downtime duration. Against the Software Requirements "
     "Specification, the functional requirements are approximately 88% complete, the non-functional "
     "requirements approximately 81%, and the feature set approximately 87%, as summarised in "
     "Table 7.")
table("Requirement completion against the SRS",
      ["Section", "Completion"],
      [["Functional Requirements", "~88%"],
       ["Non-Functional Requirements", "~81%"],
       ["Features", "~87%"],
       ["User Roles (four implemented)", "~88%"]])

# ------------------------------------------------------------------
# CHAPTER 5 — CONCLUSION AND FUTURE WORK
# ------------------------------------------------------------------
page_break()
center("CHAPTER 5", 16, bold=True, after=2)
h1("CONCLUSION AND FUTURE WORK")
h2("5.1 Conclusion")
para("The industrial training project successfully delivered a functional, web-based dashboard for "
     "monitoring the production activities of a paper manufacturing plant. The system consolidates "
     "production, quality, downtime, maintenance and machine information within a single, secure, "
     "role-based interface; computes Overall Equipment Effectiveness; delivers live telemetry without "
     "page reloads; raises threshold-based alerts; provides analytical reports with export; and "
     "includes a complete administrative panel and audit trail. The backend is validated by a "
     "thirty-six-case automated test suite, all passing.")
para("The principal deviation from the original specification is the absence of live plant-floor "
     "instrumentation. This was a deliberate scope decision: integrating with real sensors and PLCs "
     "requires industrial protocols and plant access that are not available in an academic setting. "
     "Live data was therefore replaced by an internally consistent simulator, which fully "
     "demonstrates the monitoring concepts. The original Node.js technology choice was also revised "
     "to a Python/Flask stack for the deployability reasons discussed in Chapter 3.")

h2("5.2 Future Work")
para("The solution provides a clear path for further development. The recommended next steps are:")
bullets([
    "Integration with real sensors and PLCs using industrial protocols such as OPC-UA or Modbus, replacing the simulator with live measurements.",
    "Predictive maintenance using statistical or machine-learning techniques to anticipate equipment failure.",
    "Migration of the database from SQLite to MySQL and deployment to a free cloud tier for a live demonstration.",
    "Addition of a dedicated quality-inspection module and a read-only viewer role.",
    "A native or progressive mobile application for supervisors on the move.",
    "Automated report scheduling and notification by electronic mail.",
])

# ------------------------------------------------------------------
# REFERENCES
# ------------------------------------------------------------------
page_break()
h1("REFERENCES")
refs = [
    'Chart.js (2024) "Chart.js Documentation", https://www.chartjs.org (accessed 2026).',
    'Flask (2024) "Flask Documentation (3.x)", Pallets Projects, https://flask.palletsprojects.com (accessed 2026).',
    'Grinberg, M. (2018) "Flask Web Development", 2nd ed., O\'Reilly Media, Sebastopol, CA.',
    'Jones, M., Bradley, J. and Sakimura, N. (2015) "JSON Web Token (JWT)", RFC 7519, Internet Engineering Task Force.',
    'Nakajima, S. (1988) "Introduction to TPM: Total Productive Maintenance", Productivity Press, Cambridge, MA.',
    'Provos, N. and Mazieres, D. (1999) "A Future-Adaptable Password Scheme", Proc. USENIX Annual Technical Conference, pp. 81-91.',
    'SQLite (2024) "SQLite Documentation", https://www.sqlite.org (accessed 2026).',
]
for r in refs:
    p = doc.add_paragraph(r); p.paragraph_format.line_spacing = 1.0; p.alignment = AL.JUSTIFY

# ------------------------------------------------------------------
# APPENDIX
# ------------------------------------------------------------------
page_break()
h1("APPENDIX")
h2("Appendix 1: Demonstration Login Credentials")
table("Role-based demonstration accounts",
      ["Role", "Username", "Password"],
      [["Administrator", "admin", "Admin@123"],
       ["Plant Manager", "manager", "Manager@123"],
       ["Shift Supervisor", "supervisor", "Super@123"],
       ["Machine Operator", "operator", "Operator@123"]])
h2("Appendix 2: Database Schema (Principal Tables)")
bullets([
    "users — accounts with bcrypt password hash, role and active flag.",
    "production_records — date, shift, machine, operator, quantity, grade, GSM, moisture, speed.",
    "maintenance_logs — machine, problem, priority, engineer, date, status.",
    "downtime_events — date, machine, shift, reason, start, end, duration.",
    "machines — machine ID, name, department, capacity, status, active flag.",
    "thresholds — configurable limits (GSM, moisture, temperature, efficiency, downtime).",
    "activity_logs — audit trail of logins and key changes.",
])
h2("Appendix 3: Principal REST API Endpoints")
bullets([
    "POST /api/login, GET /api/me — authentication.",
    "GET/POST/PUT/DELETE /api/users — user management (Administrator).",
    "GET/POST/PUT/DELETE /api/machines — machine management (Administrator).",
    "GET/PUT /api/thresholds — threshold configuration.",
    "GET/POST/PUT/DELETE /api/production — production records.",
    "GET/POST/PUT/DELETE /api/downtime — downtime events.",
    "GET/POST /api/maintenance — maintenance logs.",
    "GET /api/stream — live telemetry (Server-Sent Events).",
    "GET /api/activity — audit log (Administrator).",
])

# ------------------------------------------------------------------
# USER MANUAL
# ------------------------------------------------------------------
page_break()
h1("USER MANUAL")
h2("Step 1: Install dependencies (once)")
para("Open a terminal in the project folder and run: pip install -r backend/requirements.txt")
h2("Step 2: Start the application")
para("Run: python backend/app.py. The terminal confirms that the server is running at "
     "http://localhost:5000/.")
h2("Step 3: Open the application")
para("Open a web browser and navigate to http://localhost:5000. The login page is displayed.")
h2("Step 4: Sign in")
para("Sign in using the credentials for your role (see Appendix 1). For full access, sign in as "
     "Administrator with username 'admin' and password 'Admin@123'. On success, the Dashboard opens.")
h2("Step 5: Use the modules")
bullets([
    "Dashboard — view KPI cards, charts and the live efficiency indicator.",
    "Machines — monitor live machine status, temperature and efficiency.",
    "Production — add production records, including GSM, moisture and speed; out-of-spec values are flagged.",
    "Downtime — log machine stoppages; the duration is computed automatically.",
    "Maintenance — log and track maintenance jobs.",
    "Reports — filter by period, machine and shift; export as CSV or PDF.",
    "Alerts — review and acknowledge threshold-based alerts.",
    "Settings (Administrator) — manage users, machines and thresholds, and view the activity log; toggle dark mode.",
])
h2("Step 6: Sign out")
para("Use the Logout option at the bottom of the sidebar to end the session and return to the login "
     "page. Detailed, role-specific user manuals are provided separately in the project documentation.")

doc.save(OUT)
print("Saved:", OUT)
