# User Manuals — Smart Paper Mill Production Monitoring Dashboard

This folder contains one user manual for each user type (role) of the
Smart Paper Mill Production Monitoring Dashboard, developed for Satia Industries Ltd.
(academic demonstration project).

## Available manuals

| Role | Manual | Primary purpose |
|------|--------|-----------------|
| Administrator | [Administrator-Manual.md](Administrator-Manual.md) | Full system control, configuration and oversight |
| Plant Manager | [Plant-Manager-Manual.md](Plant-Manager-Manual.md) | Monitoring, analysis and report generation |
| Shift Supervisor | [Shift-Supervisor-Manual.md](Shift-Supervisor-Manual.md) | Shift operations, downtime and maintenance logging |
| Machine Operator | [Machine-Operator-Manual.md](Machine-Operator-Manual.md) | Production data entry and machine status checks |

> Two additional roles from the project design — **Quality Inspector** and **Viewer/Guest** —
> share most screens with the Operator and Manager respectively. Dedicated manuals for them
> can be added on request.

## Common information for all users

- **Application type:** Web application with a Python (Flask) backend providing real,
  authenticated, role-based login.
- **Starting the app:**
  1. Open a terminal in the project folder.
  2. Run the backend: `python backend/app.py`
  3. Open **http://localhost:5000** in your browser.
- **Each user type has its own login id.** Use the credentials for your role:

  | Role | Username | Password |
  |------|----------|----------|
  | Administrator | `admin` | `Admin@123` |
  | Plant Manager | `manager` | `Manager@123` |
  | Shift Supervisor | `supervisor` | `Super@123` |
  | Machine Operator | `operator` | `Operator@123` |

  Passwords are stored **hashed (bcrypt)** in the database; login issues a **JWT** that
  authorises your session. The **Settings** module is restricted to Administrators.
- **Sample data:** All production figures shown are realistic but fictional demonstration data
  and do not represent actual Satia Industries production.

## Document set

These manuals are written in Markdown and can be read in any text editor or on GitHub.
Word (.docx) or PDF versions can be generated on request.
