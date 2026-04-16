# User Guide — SkolFi

This guide explains how to use **SkolFi**, the school tuition (SPP) application, for day-to-day operations. It is intended for school staff (Admins and Cashiers) as well as students/parents who use the portal.

**App version:** 2.14.0
**UI language:** Available in Bahasa Indonesia and English (switchable via the flag button at the top of the page).

---

## Table of Contents

1. [Signing In](#1-signing-in)
2. [User Roles](#2-user-roles)
3. [Dashboard](#3-dashboard)
4. [Master Data](#4-master-data)
   - [4.1 Academic Years](#41-academic-years)
   - [4.2 Classes](#42-classes)
   - [4.3 Students](#43-students)
   - [4.4 Employees](#44-employees)
5. [Scholarships & Discounts](#5-scholarships--discounts)
6. [Tuition Bills](#6-tuition-bills)
7. [Payments](#7-payments)
   - [Transport](#transport)
   - [Service Fee (Uang Perlengkapan)](#service-fee-uang-perlengkapan)
   - [Generate All Bills](#generate-all-bills)
   - [Multi-Bill Payment (Cashier)](#multi-bill-payment-cashier)
   - [Portal — Combined Bills](#portal--combined-bills)
   - [Student Exit Behavior](#student-exit-behavior)
   - [Scholarships and Discounts — Tuition Only](#scholarships-and-discounts--tuition-only)
8. [Student Portal Accounts](#8-student-portal-accounts)
9. [Online Payments](#9-online-payments)
10. [Student Exit Status](#10-student-exit-status)
11. [Reports](#11-reports)
    - [11.1 Overdue Report](#111-overdue-report)
    - [11.2 Class Summary Report](#112-class-summary-report)
    - [11.3 Fee Service Summary Report](#113-fee-service-summary-report)
    - [11.4 Shareable filters](#114-shareable-filters)
12. [Student / Parent Portal](#12-student--parent-portal)
13. [Account Settings](#13-account-settings)
14. [FAQ](#14-faq)
15. [Workflows](#15-workflows)
16. [Case Studies](#16-case-studies)
17. [For Developers](#for-developers)

---

## 1. Signing In

1. Open the app URL in your browser (typically `https://your-school.id/admin`).
2. Enter the **Email** and **Password** provided by your administrator.
3. Click **Login**.

After a successful login, you will be redirected to the Dashboard.

**Forgot password?** Contact your administrator for a manual password reset.

---

## 2. User Roles

The application has two roles with different access rights:

| Role | Access |
|------|--------|
| **ADMIN** | All features — master data, bills, payments, reports, settings, plus admin-only features like marking students as exited. |
| **CASHIER** | Only the pages needed to record payments: Dashboard, Students (read-only), Payments, and Reports. |

The sidebar menu adapts to your role.

---

## 3. Dashboard

The first page after login. It shows:

- **General stats** — number of active students, current-month bills, today's payments.
- **Payment achievement rate** — progress bar for the active academic year.
- **Recent activity** — latest payments and changes.
- **Personal greeting** — displays the logged-in user's name.

---

## 4. Master Data

Master data is the core data used throughout the system. The order in which you create it matters:

> **Required order:** Academic Year → Class → Student → (scholarship/discount if any) → Generate Bills.

### 4.1 Academic Years

**Menu:** `Academic Year`

**Create a new academic year:**
1. Click **Add Academic Year**.
2. Fill in the name (e.g., `2025/2026`), start date, and end date.
3. Click **Save**.

**Activate an academic year:**
- Click the three-dot menu on the year's row, then choose **Set Active**.
- Only one academic year can be active at a time. All features automatically use the active academic year.

**Note:** An academic year that has been used to issue bills cannot be deleted — this preserves historical data integrity.

### 4.2 Classes

**Menu:** `Classes`

**Create an academic class:**
1. Click **Add Class**.
2. Fill in:
   - **Class name** — e.g., `7A`, `XII Science 1`.
   - **Grade / Level** — number 1–12.
   - **Academic Year** — pick from the dropdown.
   - **Tuition fee** — enter the amount matching the payment frequency (see below).
   - **Payment frequency** — `MONTHLY`, `QUARTERLY`, or `SEMESTER`.
3. Click **Save**.

**Bulk import:**
- Click **Import** to upload many classes at once from an Excel file.
- Click **Download Template** to get the correct format.

**Class ↔ student relationship:** After the class is created, assign students to the class via the class detail page (**Students** tab).

### 4.3 Students

**Menu:** `Students`

**Add a student:**
1. Click **Add Student**.
2. Fill in:
   - **NIS** — unique; also serves as the portal login ID.
   - **NIK** — 16 digits.
   - **Full name**, **address**, **parent's name**, **parent's phone**.
   - **Start date** (Start Join Date).
3. Click **Save**.

A student portal account is created automatically with the default password set to the parent's phone number (digits only, no `+` or `-`). The student is required to change their password at first login.

**Status filter:**
- The **Status** dropdown above the table — choose `Active` (default), `Exited`, or `All`.
- Exited students appear dimmed with an "Exited" label.

**Bulk actions:** Check multiple students to delete or update their start date in bulk.

**Excel import:** Use the `Import` menu → upload a file based on the provided template.

### 4.4 Employees

**Menu:** `Employees` *(Admin only)*

Use this to manage Admin/Cashier accounts:
1. **Add Employee** → fill in name, email, role, and initial password.
2. Employees must change their password at first login.
3. An employee's role cannot be changed after creation — delete and recreate if needed.

---

## 5. Scholarships & Discounts

### 5.1 Scholarships

**Menu:** `Scholarships` *(Admin only)*

A scholarship reduces a specific student's tuition fee for a specific academic year.

**Create a scholarship:**
1. Click **Add Scholarship**.
2. Choose the student (NIS) and the academic class.
3. Pick one of:
   - **Full Scholarship** — student pays 0 (bill auto-set to 0).
   - **Percentage** — e.g., 50% (fee halved).
   - **Fixed amount** — flat IDR deduction.
4. Click **Save**.

Scholarships are applied automatically when bills are generated.

### 5.2 Discounts

**Menu:** `Discounts` *(Admin only)*

Discounts apply to entire classes (for example, sibling discounts, Independence Day promos, etc.).

**Create a discount:**
1. Click **Add Discount**.
2. Choose the academic class and academic year.
3. Set the discount type (percentage or fixed) and the effective period.
4. Enable/disable as needed.

**Note:** Inactive discounts are not applied when bills are generated.

---

## 6. Tuition Bills

**Menu:** `Tuition Bills`

### 6.1 Generate Bills

Tuition bills are typically generated at the start of the academic year for the full period.

1. Click **Generate Bills**.
2. Pick an academic class (or use **Generate Bulk** for all classes at once).
3. The system automatically:
   - Computes periods based on the class frequency (monthly: 12 periods, quarterly: 4, semester: 2).
   - Applies active scholarships and discounts.
   - **Skips periods after the exit date** for students who have exited.
   - Does not duplicate existing periods.

**Note:** Existing bills are not overwritten. If a deleted bill is regenerated, it will be recreated.

### 6.2 Viewing & Filtering Bills

The bills table can be filtered by:
- Academic class
- Student (NIS)
- Status: `UNPAID`, `PAID`, `PARTIAL`, `VOID`
- Period and year
- Due date range

### 6.3 Bill Statuses

| Status | Meaning |
|--------|---------|
| **UNPAID** | Not paid at all. |
| **PARTIAL** | Partially paid; balance remaining. |
| **PAID** | Fully settled. |
| **VOID** | Cancelled (not billed). |

### 6.4 Bulk Updates

Admins can change many bills' status at once (e.g., bulk VOID). Bills that already have payments **cannot** be voided.

---

## 7. Payments

**Menu:** `Payments`

### 7.1 Recording a Payment

1. Click **Add Payment**.
2. Search for the student (by NIS or name).
3. Select bills to settle (multiple allowed).
4. Fill in:
   - **Amount paid** (partial or full).
   - **Payment date**.
   - **Method** — cash, transfer, etc.
   - **Notes** (optional).
5. Click **Save**.

The system automatically:
- Updates bill status (UNPAID → PARTIAL → PAID).
- Records which Cashier received the payment.
- Prepares a receipt ready to print.

### 7.2 Printing Receipts / Proof of Payment

There are two ways to print receipts:

**Option 1 — Bulk print from the Payments page (recommended for daily use):**
1. Open the **Payments** menu.
2. Click the **Print** button at the top-right of the page.
3. Choose filters:
   - **Academic Year** — usually pre-set to the active one.
   - **Print Mode:**
     - **Today** — all payments recorded today (most-used by cashiers).
     - **All Paid** — every PAID payment within the selected academic year.
     - **Per Student** — look up a specific student (NIS/name) and reprint all of their receipts (for lost transaction slips).
4. Optional: tick the checkboxes on the slips you want and click **Print Selected (N)**; or click **Print All (N)** to print everything in the current view.
5. The browser opens a print dialog. Pick a printer or *Save as PDF*.

**Print formats:**
- Paper size: **A4**.
- **Compact slip layout (default)** — 8 slips per A4 sheet (100 mm × 70 mm each), grouped by student so multiple months appear on the same slip. Best when you want small, tear-apart proofs.
- **Full invoice layout** — 3 full invoices per A4 sheet including school header, receipt number, student details, fee breakdown, payment received, cashier, and signature line. Use this when you need a formal invoice.
- Payments tied to a **PAID** bill automatically show a **"PAID"** stamp.

**Option 2 — Reprint an old receipt:**
1. Open the **Payments** menu.
2. Use the table filters to find the specific payment (by NIS, date, class).
3. Click **Print** → pick **All Paid** (or **Per Student** for a single student's history) → filter by academic year.
4. Print.

**Notes:**
- Receipts serve as official proof of payment for parents.
- Save a digital copy (Save as PDF) for archival.
- If no printer is available, export to PDF and send via WhatsApp.

### 7.3 Payment Card (A4)

For schools that still use **pre-printed physical payment cards** as proof of payment, the system provides a dedicated print feature that places payment data onto the card's printed grid.

**How to open:**
1. Go to **Students** → click the NIS of the target student.
2. On the student detail page, click the **Payment Card** button in the top right.
3. Pick an **Academic Year** (defaults to the active year).

**Three print modes:**
- **Header only** — prints the title, student identity, and an empty 12-month table frame. Use this to prepare blank cards that will be filled in by hand.
- **Selected months** — pick which months to print. The system auto-checks every month that has been paid (autofill). Helper buttons **Select Paid**, **Select All**, and **Clear** are provided.
- **All months** — prints every month that has payment data.

**Card columns:** No, Month, Tuition, Transport & Boarding, Supplies, Total, Pay Date, Receipt No., Cashier. A totals row at the bottom sums the currently visible months.

**Print format:**
- Paper size: **A4 portrait** (210 mm × 297 mm).
- Row count is **frequency-aware** — the table shows one row per tuition period (10 rows for MONTHLY classes, 4 for QUARTERLY, 2 for SEMESTER). July and August are excluded.
- Each month row is exactly **12 px** tall to align with the pre-printed card grid.
- In the browser dialog, ensure the scale is **100%** and margins are **none/default** so the rows do not shift.

**Notes:**
- Use **Selected months** when a parent asks for proof of specific months only.
- This feature is independent from the receipt print in section 7.2 — both can be used together as needed.

### 7.4 Payment History

Use the filters on the payments page to see:
- All payments for a specific student
- Payments per class
- Payments per cashier
- Date ranges

---

## Transport

Transport fees are managed as **services** with per-student subscriptions and price history.

### Create a service

1. Open **Transport** from the Fees & Services menu.
2. Click **Add Service** and fill in Name, Category, and optional notes.
3. Save. A service with no price cannot generate bills yet.

### Import services from Excel

1. On the Transport page, click the **Import** button.
2. Download the Excel template — it includes academic years and categories as reference.
3. Fill in the service data (Academic Year, Category, Name, Description) following the template format.
4. Upload the file and click **Process Import**. Duplicate services (same name + year + category) are skipped.

### Set prices and price history

Each service has a price history. Bill generation snapshots the price active on the first day of the billed month.

1. Open a service's detail page → **Price History** → **Add Price**.
2. Enter the **Effective From** date (any day of a month — it is normalized to the 1st on save) and the amount.
3. To raise prices mid-year, add a new entry with a later effective date. Bills already generated keep their original snapshot.

### Subscribe and unsubscribe students

1. On the service detail page, open **Subscribers** → **Subscribe Student**.
2. Pick a student, set Start Date, optionally Notes. Leave End Date empty for open-ended.
3. **End Subscription** sets the end date; the student will stop receiving bills for months after that date.

### Generate bills

Use the **Generate All Bills** button at the top of the All Bills page. It is idempotent — safe to re-run any time. Existing bills are never modified. New students, new subscriptions, and student exits are picked up automatically on the next run.

If any services are missing a price for a period, you will see a **Missing prices** warning list. Add the price and re-run.

## Service Fee (Uang Perlengkapan)

A **service fee** is a mandatory per-class charge billed at admin-configured months (default July and January).

### Create a service fee

1. Open **Service Fees** from the Fees & Services menu.
2. Click **Add Service Fee**, pick the Class, enter Amount and Billing Months.
3. Save.

Every student enrolled in that class will get a bill on each billing month.

### Import service fees from Excel

1. On the Service Fees page, click the **Import** button.
2. Download the Excel template — it includes class names and months as reference.
3. Fill in the data (Class, Name, Amount, Billing Months) following the template format.
4. Upload the file and click **Process Import**. Duplicate entries (same name + class) are skipped.

### Billing months

Edit the service fee to add or remove billing months. Next generation respects the new list; existing bills are untouched.

### Amount changes

Changing the amount affects future-generated bills only. Existing bills keep their snapshot.

## Generate All Bills

The **Generate All Bills** button at the top of **All Bills** creates any missing bills for the active academic year across all three tracks.

- **Idempotent:** running it multiple times is safe.
- **Non-destructive:** paid or partial bills are never touched.
- **Data-drift aware:** picks up new students, subscriptions, and exits on next run.
- Re-run after adding a missing price, subscribing a late joiner, or recording a student exit.

## Multi-Bill Payment (Cashier)

On the cashier payment page the outstanding list combines tuition, transport bills, and service-fee bills for the selected student.

### Print Payment Proof Card

After selecting a student, a **Payment Proof Card** button appears above the outstanding list. Click it to open the student's payment card in a new tab — select which months to include, then click **Print**.

### Processing Payment

1. Check the bills to pay and enter the amounts.
2. Click **Process Payment** — a confirmation dialog shows the item count and total amount.
3. Confirm to proceed. A single transaction is created covering all selected items.

- Each payment row is linked to exactly one bill (tuition, fee bill, or service-fee bill).
- All rows in a transaction share the same **Transaction ID**, so the receipt prints as one slip.
- Voiding a payment updates the originating bill's paid amount and status.

## Portal — Combined Bills

Students and parents see all three bill types in one outstanding list on the portal payment page. They can select any subset and pay via Midtrans in one transaction. Paid items disappear from the list automatically after settlement.

## Student Exit Behavior

When a student is marked as exited:

- Active **transport subscriptions** have their End Date set to the exit date.
- **Unpaid** future bills (including fee bills and service-fee bills) are **voided** — `voidedByExit` flag set, amount zeroed. They no longer count toward totals.
- **Partially paid** bills are kept, and a warning is surfaced so staff can decide how to settle them.
- Paid bills are never touched.

Undoing an exit restores subscriptions and reinstates voided bills (amounts re-resolved from price history or current service-fee amount).

## Scholarships and Discounts — Tuition Only

**Important:** Scholarships and discounts apply only to tuition. Transport and service-fee bills are billed in full regardless of a student's scholarship or discount status. The cashier screen does not offer scholarship/discount fields on non-tuition line items.

---

## 8. Student Portal Accounts

**Menu:** `Student Accounts` *(Admin only)*

This page manages portal login accounts for students/parents.

**Available operations:**
- **Create Account** — for students who don't yet have one (e.g., imported before the portal was enabled).
- **Reset Password** — generates a new default password to share with the parent.
- **Delete Account** — disables login (bills remain stored).
- **Restore Account** — reactivates a previously deleted account.

**Default password:** the parent's phone number, digits only. The student must change their password at first login.

---

## 9. Online Payments

**Menu:** `Online Payments` *(Admin only)*

Monitors online payment transactions made by students/parents through the portal (integrated with Midtrans).

**Statuses tracked:**
- **PENDING** — awaiting payment.
- **SETTLEMENT** — payment successful; the bill auto-updates to PAID.
- **EXPIRE** — expired (default: 24 hours).
- **CANCEL / FAILED / DENY** — failed.

**Settings:**
The `Payment Settings` menu lets you configure Midtrans server key, client key, available methods, and payment timeout.

---

## 10. Student Exit Status

*Handles students who leave mid-year so future bills are automatically voided.*

### 10.1 Problem Solved

Before this feature: if a student transferred schools in the middle of the year, bills for subsequent periods continued to appear as "unpaid," skewing overdue reports and total receivables.

### 10.2 Rules

- **Admins only** can mark students as exited.
- The exit date must be **>= start join date** and **<= today**.
- UNPAID bills with periods **starting after** the exit date are automatically voided.
- The period that is already running on the exit date **is still billed in full** (matching common practice in Indonesian schools).
- PARTIAL bills (already partially paid) **are not auto-voided** — they appear as a warning to handle manually (refund or keep collecting).
- The action is **reversible** — bills voided due to exit are restored to UNPAID when the exit is cancelled.

### 10.3 How to Mark a Student as Exited

1. Open the **Students** menu → click a student's name to open the detail page.
2. Scroll to the **Student Status** section.
3. Click the red **Mark as Exited** button.
4. On the modal:
   - Pick an **Exit Date** (default: today).
   - Fill in the **Exit Reason** (e.g., "Moved to Surabaya").
5. Click **Mark as Exited**.

Once done, a notification appears with the number of bills voided. If any PARTIAL bills need manual handling, an extra warning appears.

### 10.4 Cancelling an Exit Status

If the student returns:

1. Open the student's detail page.
2. On the yellow banner **Student exited on [date]...**, click **Cancel Exit**.
3. Confirm in the modal.

The system will:
- Restore the student to active.
- Restore bills that were voided by the exit feature (back to UNPAID) with fees matching the class rate.
- Bills that were voided **manually** (not due to exit) will **not** be restored.

### 10.5 Exited-Student Filter

On the students list, use the **Status** dropdown to:
- `Active` (default) — hide exited students.
- `Exited` — only show exited students.
- `All` — show both.

### 10.6 Generating Bills for Exited Students

If you run **Generate Bills** after marking a student as exited, the system automatically skips periods after the exit date — no special handling needed.

---

## 11. Reports

**Menu:** `Reports`

### 11.1 Overdue Report

Shows a list of bills that are **past due** and still unpaid. The report is split into three tabs by bill type:

- **Tuition (SPP)** — monthly tuition bills.
- **Transport & Boarding** — subscription service fee bills.
- **Supplies Fee** — one-time service fee bills per class.

Each tab uses the same filters and table format, so you can switch between bill types without losing context.

**Available filters:**
- Academic class
- Grade / level
- Academic year

**Per-row info:**
- Student name, class, period, due date.
- Outstanding amount.
- Days overdue.

Use this report as the basis for WhatsApp collections with parents. Check all three tabs regularly so no bill type slips through.

### 11.2 Class Summary Report

Shows per-class:
- Total bills issued.
- Total collected.
- Total outstanding.
- Collection rate (percentage).

Useful for monthly/quarterly meetings with the principal.

### 11.3 Fee Service Summary Report

**Menu:** `Reports → Fee Services`

A unified view of **transport** fee services, grouped by service. Use this when you want to see how each bus route is performing without digging through the bill list.

**Summary cards (top):** grand totals for *Billed*, *Paid*, and *Outstanding* across the currently filtered services.

**Per-row info:**
- Fee service name and category badge.
- Active students subscribed to the service.
- Total billed, total paid, outstanding.
- Count of overdue bills.

**Available filters:**
- Academic year
- Category
- Specific fee service
- Bill status (Unpaid / Partial / Paid / Void)
- Class
- Billing month range (from / to)
- Search by fee-service name

**Export:** click **Export Excel** to download the current filtered view as an `.xlsx` file.

### 11.4 Shareable filters

Every filter and page number on the admin list and report pages is **saved in the URL**. This means you can:

- **Bookmark** a specific filtered view (e.g. "Overdue, Grade 8, AY 2025/2026") and return to it with one click.
- **Share links** with colleagues — they open with the same filter state.
- Use the browser **back / forward** buttons to step through filter changes.

Changing any filter automatically resets the table back to page 1 so you never land on an empty page.

---

## 12. Student / Parent Portal

Portal URL: `https://your-school.id/portal`

This portal is used by students/parents, **not** school staff.

### 12.1 Login

1. Open the portal page.
2. Enter **NIS** and **password** (default: parent's phone number).
3. The user must change their password at first login.

### 12.2 Portal Menu

| Menu | Purpose |
|------|---------|
| **Home** | Dashboard with a summary of bills and status. |
| **Pay** | List of bills eligible for online payment (via Midtrans). |
| **History** | List of historical bills and payments. |
| **Change Password** | Update the account password. |

### 12.3 Paying Online

1. **Pay** menu → tick the bills you want to pay.
2. Click **Pay Now**.
3. Pick a payment method (QRIS, virtual account, e-wallet, credit card).
4. Complete the payment on the Midtrans page.
5. On success, the bill status auto-updates to PAID.

### 12.4 Exited Student Banner

If the logged-in account is a student marked as exited, the portal shows a **yellow banner** at the top of the page:

> *"This account is marked as exited as of [date]. Only outstanding bills can be viewed."*

The student can still view and pay outstanding bills (overdue amounts), so any remaining financial obligations can be settled.

---

## 13. Account Settings

Click your username at the bottom-left of the sidebar to:

- **Profile** — view account info (name, email, role).
- **Change Password** — update your own password.
- **Logout** — sign out of the application.

### Switching Language

Click the **flag** at the top-right corner to toggle between Bahasa Indonesia and English. The preference is stored in your browser.

---

## 14. FAQ

**Q: Can a VOID bill be restored?**
A: Admins can change status via the bills page (edit or bulk update). Bills auto-voided because of exit status can only be restored by cancelling the student's exit status.

**Q: What's the difference between a Full scholarship and a 100% Percentage?**
A: Numerically the same (IDR 0). However, Full Scholarship is specially flagged in reports for easier auditing.

**Q: A student changed classes mid-year — what do I do?**
A: A dedicated class-change feature isn't available yet. Workaround: mark the student as exited from the old class, then create a new student entry in the new class (same NIS is not allowed — use a different NIS or contact the developer for special handling).

**Q: A student has paid all bills for January but exited in February — what happens?**
A: January PAID bills remain intact. February UNPAID bills are auto-voided when you mark the exit with a February date. Periods whose start date is after the exit date are voided.

**Q: How is data backed up?**
A: Database backups run automatically via a script. Contact your IT/system admin for scheduling and restore.

**Q: A student can't log in to the portal — what should I do?**
A: In the **Student Accounts** menu, find the NIS, click **Reset Password**, and share the new password with the parent. If the account has been deleted, click **Restore Account** first.

**Q: Can historical data be viewed after switching academic years?**
A: Yes. All historical data stays stored. Use the academic-year filter on bills and reports to look at previous periods.

---

## 15. Workflows

This section describes typical work flows from initial setup through daily operations.

### 15.1 Initial Setup Flow (Admin, once per academic year)

```
Academic Year → Classes → Students → Portal Accounts → Tuition Bills
```

1. **Create a new Academic Year** in the *Academic Year* menu. Mark it **Active**.
2. **Create Classes** for that academic year (e.g., 7A, 7B, 8A ...). Set the tuition fee per class.
3. **Add / import Students** into the system. Fill in NIS, name, class, start date (`startJoinDate`).
4. **Generate Portal Accounts** for the students (the *Generate Account* button in Student Accounts). Default passwords are generated automatically.
5. **Generate Tuition Bills** in the *Bills* menu — choose the academic year, period (monthly/quarterly/semester), and class. The system creates bills for every student in that class.

### 15.2 Daily Flow (Cashier)

```
Student pays → Look up NIS → Record Payment → Print Receipt
```

1. Student/parent arrives at the cashier with cash.
2. Cashier opens the *Payments* menu → *Record New Payment*.
3. Search the student by NIS or name.
4. Pick the bills to be settled (one or more).
5. Enter the amount paid and method (Cash / Transfer).
6. Save → bill status auto-updates (PAID or PARTIAL).
7. Click *Print Receipt* → hand it to the student.

### 15.3 Monthly Flow (Admin)

```
Check overdue bills → Remind → Wrap up monthly report
```

1. Early in the month: review the *Overdue Report* for students who haven't paid.
2. Export / print the list for follow-up (phone calls / messages to parents).
3. End of the month: review the *Income Report* for cash-in totals.
4. Check *Payment History* for an audit trail.

### 15.4 End-of-Year Flow (Admin)

```
Close academic year → Final recap → Create new academic year → Promote classes
```

1. Ensure every payment for the running year is recorded.
2. Generate the *Annual Report*.
3. Create a new *Academic Year*, mark it Active (the old one becomes inactive automatically).
4. Create new Classes for the new academic year.
5. Move students into the new classes (promotions) — or mark graduates as exited.
6. Generate tuition bills for the new academic year.

### 15.5 Mid-Year Exit Flow (Admin)

```
Student does not continue → Mark as Exited → System auto-VOIDs future bills
```

1. Open the student detail page in the *Students* menu (click the NIS).
2. Scroll to the **Student Exit Status** section.
3. Click **Mark as Exited**, enter the exit date and reason.
4. The system shows a preview: "X UNPAID bills will be voided" → confirm.
5. The student status changes to **Exited**, and bills for periods after the exit date are voided.
6. If the date was wrong, click **Cancel Exit** to restore.

### 15.6 Student / Parent Portal Flow

```
Log into portal → View bills → Pay online (optional) → Download receipt
```

1. Parent / student opens `https://your-school.id/portal`.
2. Log in with NIS + password (default password initially; must be changed at first login).
3. Review the bill summary (PAID / PARTIAL / UNPAID).
4. If the online gateway is active: click **Pay Online** → select bills → pay via virtual account / QRIS.
5. View *Payment History* for the digital receipt.

---

## 16. Case Studies

This section gives real-world scenarios and how to handle them.

### Scenario 1: New school setup (academic year 2026/2027)

**Situation:** The school has just gone live with the application. There are 3 classes (7A, 7B, 7C) with 90 students total. Tuition is IDR 500,000 per month.

**Steps:**
1. Log in as ADMIN.
2. Create the *Academic Year* "2026/2027", dates 1 Jul 2026 – 30 Jun 2027, mark as Active.
3. Create 3 Classes: 7A, 7B, 7C — each with IDR 500,000/month tuition.
4. Import students via Excel (*Students → Import*) — the template is provided by the app.
5. Generate portal accounts for all students (bulk action in *Student Accounts*).
6. Generate bills: pick year 2026/2027, MONTHLY frequency (12 months from Jul 2026 to Jun 2027), all classes.
7. The system creates 90 students × 12 months = 1,080 bills automatically.
8. Share usernames (NIS) + default passwords with parents via WhatsApp / broadcast letter.

**Outcome:** The school is ready to operate. The cashier simply records incoming payments.

### Scenario 2: A student moves to another city mid-year

**Situation:** Budi (NIS 2026001) of class 7A has paid for Jul–Oct 2026. Budi is moving cities; the last day of attendance is 15 November 2026. The November 2026 bill is unpaid, and bills from December 2026 through June 2027 remain UNPAID.

**Steps:**
1. Admin opens Budi's detail page (NIS 2026001).
2. Under **Student Exit Status**, click **Mark as Exited**.
3. Exit date: 15 November 2026. Reason: "Moved to Surabaya".
4. The system shows a preview:
   - November 2026 bill → remains UNPAID (the November period starts on 1 Nov, before 15 Nov).
   - December 2026 – June 2027 bills → will be VOIDed (7 bills).
5. Admin clicks **Confirm**.
6. System update: 7 bills VOID, Budi status "Exited".

**Note:** The November bill that is still UNPAID is **not** auto-voided because its period started before the exit date. The admin can negotiate with the parent: pay in full, pay pro-rata (PARTIAL), or void manually.

**Outcome:** The financial report is clean; future bills no longer appear as overdue.

### Scenario 3: A student receives a 50% scholarship

**Situation:** Siti (NIS 2026042) of class 8B receives a 50% merit scholarship starting January 2027.

**Steps:**
1. Admin opens the *Scholarships* menu.
2. Click **Add Scholarship** → pick student Siti, type "Percentage", value 50%, effective Jan 2027 – Jun 2027.
3. Save. The system flags the scholarship as active.
4. For the January 2027 bill onward, the amount is auto-reduced by 50% → IDR 250,000.
5. Earlier months' bills (already issued) are **not** affected unless regenerated.

**Outcome:** The scholarship is applied automatically without manually editing each bill.

### Scenario 4: A student pays in instalments

**Situation:** Rio's parent (NIS 2026077) can only afford IDR 300,000 of the November 2026 SPP, which is IDR 500,000. The remainder will be paid next month.

**Steps:**
1. Cashier opens *Payments → Record Payment*.
2. Look up NIS 2026077, select the November 2026 bill.
3. Enter amount IDR 300,000, method Cash.
4. Save → bill status becomes **PARTIAL** (IDR 200,000 remaining).
5. The following month, when the parent settles the balance:
   - Record another payment for the same bill, amount IDR 200,000.
   - Status auto-changes to **PAID**.
6. Print receipts for both transactions.

**Outcome:** Instalments are neatly recorded; the cashier can audit them anytime.

### Scenario 5: An exit was marked by mistake

**Situation:** Admin input error — marked Ayu (NIS 2026099) as exited when it should have been another student. As a result, 6 of Ayu's future bills were voided.

**Steps:**
1. Open Ayu's detail page (NIS 2026099).
2. Under **Student Exit Status**, click **Cancel Exit**.
3. Confirm. The system:
   - Restores the 6 VOID bills → UNPAID.
   - Clears exitedAt, exitReason, exitedBy from the student data.
4. Ayu is active again and her future bills reappear normally.

**Outcome:** Input errors can be reverted without data loss.

### Scenario 6: A parent forgets their portal password

**Situation:** Mrs. Ani, parent of Dita (NIS 2026110), forgot her password and requests a reset.

**Steps:**
1. Admin opens *Student Accounts*, looks up NIS 2026110.
2. Clicks the **Reset Password** button.
3. The system generates a new default password (e.g., `dita2026`).
4. Admin sends the new password to Mrs. Ani via WhatsApp.
5. Mrs. Ani logs in with the new password → the system prompts a password change at first login.

**Outcome:** Portal access is restored without technical intervention.

### Scenario 7: Online payment via gateway

**Situation:** The school has enabled the Midtrans gateway. Rafi's parent (NIS 2026120) wants to pay from home without visiting the cashier.

**Steps:**
1. Mrs. Ani (Rafi's parent) logs into the portal using Rafi's NIS.
2. Sees the January 2027 bill = UNPAID IDR 500,000.
3. Clicks **Pay Online**, selects the January bill.
4. The system redirects to the Midtrans Snap page.
5. Mrs. Ani picks BCA Virtual Account and pays via mobile banking.
6. After a successful payment, the Midtrans webhook updates the January bill status to **PAID**.
7. A digital receipt appears in the portal history.

**Outcome:** The payment is completed without a visit to the school.

---

## For Developers

### Biome (Linter & Formatter)

This project uses [Biome](https://biomejs.dev/) as its linter and formatter. Configuration is in `biome.json` at the project root.

| Command | Description |
|---|---|
| `pnpm lint` | Run linter (Biome check) |
| `pnpm format` | Auto-format all files |

Linted file types: `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs`, `*.json`, `*.css`.

### Husky & lint-staged (Pre-commit Hook)

Every `git commit` automatically triggers **Husky** which runs **lint-staged**. This hook ensures all staged files pass Biome checks before a commit is created.

**Flow:**
1. Developer runs `git commit`.
2. Husky fires the pre-commit hook → `pnpm exec lint-staged`.
3. lint-staged runs `biome check --write` on staged files.
4. If errors are found, the commit is rejected — fix the errors and commit again.

> **Note:** Do not use `--no-verify` to skip hooks unless absolutely necessary.

## Further Help

- **Bugs / technical errors:** Contact your school's IT administrator.
- **Operational questions:** Contact the primary Admin at the school.
- **Developer documentation:** See the `docs/` folder in the repository.

*This document was last updated in April 2026 for app version 2.16.*
