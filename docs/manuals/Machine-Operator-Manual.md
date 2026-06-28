# Machine Operator — User Manual
### Smart Paper Mill Production Monitoring Dashboard · Satia Industries Ltd.

---

## 1. Who this manual is for

This manual is for the **Machine Operator** — the person who operates a machine on the floor. Your
main task in the dashboard is to **record production data for your shift** and to **check the status
of your machine**. This is the simplest and most frequently used part of the system.

---

## 2. Getting started

### 2.1 Opening the application
1. Start the backend server: `python backend/app.py`
2. Open **http://localhost:5000** in a web browser.

### 2.2 Signing in
1. Sign in with your Machine Operator credentials — username `operator`, password `Operator@123`.
2. Click **Sign In**. The **Dashboard** opens.
3. From the sidebar, open **Production** to begin entering data.

---

## 3. What you do

| Module | Your role |
|--------|-----------|
| Production | Enter production records (output, GSM, moisture, speed) for each shift |
| Machines | Check the status, temperature and efficiency of your machine |
| Downtime | Record a machine stoppage if asked to (reason, start and end time) |
| Alerts | View alerts that affect your machine (for example, high temperature) |

---

## 4. Entering a production record

This is your main task. Do it at the end of each shift, or whenever a batch is completed.

1. Open **Production** from the sidebar.
2. In the **Add Production Record** form, fill in each field:
   - **Date** — defaults to today; change it only if recording for an earlier day.
   - **Shift** — select **Morning**, **Evening** or **Night**.
   - **Machine** — choose your machine ID (for example, PM-109).
   - **Operator** — select your name.
   - **Production Quantity (tons)** — enter the tonnage produced (for example, 52.4).
   - **Paper Grade** — choose the grade you produced, such as *Copier Paper (70 GSM)* or
     *Writing Paper (80 GSM)*.
   - **GSM (g/m²)** — the measured grammage of the paper (for example, 70).
   - **Moisture (%)** — the measured moisture content (for example, 5.2).
   - **Machine Speed (m/min)** — the running speed of the machine (for example, 620).
   - **Remarks** — optional notes (for example, "grade change mid-shift").
3. Click **Save Record**.
   - A green confirmation message appears and your entry is added to the table below.
4. To clear the form and start again, click **Reset**.
5. To leave without saving, click **Cancel**.

> **Required fields** are marked with a red asterisk (\*). If you miss one, a message in red tells
> you what to complete. (GSM, moisture and speed are optional, but record them when you have them.)

> **Quality check:** if the **GSM** or **moisture** you enter is outside the allowed tolerance, that
> value appears in **red with a ⚠** in the records table, so an out-of-spec reading is easy to spot.
> Re-check the measurement if a value is flagged.

---

## 5. Correcting an entry

1. Find your record in the table below the form (use the **search box** if needed).
2. Click the **edit (pencil)** icon — the record loads into the form and the button changes to
   **Update Record**.
3. Make your change and click **Update Record**.
4. To remove a record entered by mistake, click the **delete (bin)** icon and confirm.

---

## 6. Checking your machine

1. Open **Machines** from the sidebar.
2. Find your machine by name or ID (use the **search box**).
3. Read the card:
   - **Status colour:** green = running, yellow = idle, red = maintenance.
   - **Temperature**, **running hours**, **efficiency** and **capacity** are shown on the card.
4. If your machine shows **red (maintenance)** or an unusually **high temperature**, inform your
   **Shift Supervisor** so a maintenance job can be raised.

---

## 7. Tips and best practices

- Enter production data promptly so the dashboard stays accurate for supervisors and managers.
- Double-check the **quantity**, **paper grade** and the **GSM / moisture / speed** readings before
  saving — these feed the daily totals and the quality checks.
- Use the **Remarks** field to explain anything unusual (sheet break, speed change, grade change).

---

## 8. Troubleshooting

| Problem | What to do |
|---------|-----------|
| The form will not save | Look for red error messages and complete any missing required field. Confirm the backend server is running. |
| I selected the wrong grade | Use the **edit** icon to correct the record, then **Update Record**. |
| A value shows in red with ⚠ | The GSM or moisture is outside the allowed tolerance — re-check the measurement and correct the record if it was a typing error. |
| My entry is missing | Check the **search box** is empty; records are listed newest first. |

---

## 9. Logging out
Click **Logout** at the bottom of the sidebar and confirm. You return to the login page.

---

*Smart Paper Mill Production Monitoring Dashboard — academic demonstration project.
All data shown is fictional.*
