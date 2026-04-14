# Fees & Services — Design Spec

**Date:** 2026-04-14
**Status:** Draft — pending implementation plan
**Scope:** Add two new billable-fee systems to the school tuition app:
1. **Transport / Accommodation** (opt-in, subscription-based, price history supported)
2. **Service fee / Uang Perlengkapan** (mandatory for all students in a class, 2× per year by default, configurable months)

---

## 1. Goals

- Track recurring **transport** and **accommodation** fees per student, with per-academic-year pricing and support for mid-year price changes.
- Track a **service fee (uang perlengkapan)** — a mandatory charge billed N times per academic year at admin-configured months.
- Record cashier payments that may combine tuition + transport + service fee line items in a single transaction and print them on one receipt.
- Extend the student portal so subscribers can see and pay transport/accommodation/service fee bills alongside tuition via the existing Midtrans flow.
- Seed the new tables so dev/staging reproduces realistic data.

**Explicit design rule:** Scholarships and discounts **do not apply** to transport/accommodation fees or service fees. Both existing models (`Scholarship`, `Discount`) remain tuition-only. `FeeBill` and `ServiceFeeBill` therefore do **not** carry `scholarshipAmount` / `discountAmount` / `discountId` columns — amount owed is always the snapshotted fee amount. The cashier payment screen must not offer scholarship/discount options on non-tuition line items.

Non-goals (deferred):
- Partial-month proration.
- Multi-academic-year copy/duplicate helpers for services (admin creates per year).
- Price history on the service fee model (single editable amount; can be added later).

## 2. Current context

- Stack: Next.js 14 (Pages Router), React 18, Prisma 7, PostgreSQL (Railway), Mantine UI, TanStack Query. See `memory/MEMORY.md`.
- Existing billable model `Tuition` has composite key `(classAcademicId, studentNis, period, year)`; its `Payment` rows are linked via required `tuitionId`.
- Payment receipts group by `(studentNis, paymentDate)` in [print.tsx](src/pages/admin/payments/print.tsx). That grouping continues to work for mixed-type transactions.
- Student exit flow already voids future unpaid tuition bills; the same flow will void future fee bills.

## 3. Decisions taken during brainstorming

| # | Decision |
|---|---|
| Q1 | Transport/accommodation is a **separate module**, not folded into `Tuition`. |
| Q2 | Price changes are modeled as **price history on the route** (`(effectiveFrom, amount)` entries). Bill generation snapshots the price active on the month's first day. |
| Q3 | **Unified `FeeService` model** with `category` enum for `TRANSPORT` and `ACCOMMODATION`. |
| Q4 | Subscriptions are **open-ended** — `startDate` required, `endDate` nullable. |
| Q5 | Bills are **batch-generated per month** (admin-triggered, mirrors Tuition generation). |
| Q6 | `Payment` becomes **polymorphic** — `tuitionId` nullable, plus new optional `feeBillId` / `serviceFeeBillId` and `transactionId` columns. Same for `OnlinePaymentItem`. |
| Q7 | **Full-month billing** — no proration. A student subscribed any day in a month owes the full month. |
| Q8 | **Unified portal view** — students see tuition + fee bills + service fee bills in one list. |
| Q9 | Service fee is modeled as a **parallel `ServiceFee` / `ServiceFeeBill`** pair, scoped to `ClassAcademic`, with configurable `billingMonths`. No price history. |

## 4. Architecture

Two parallel fee tracks — both analogous to Tuition — plus Payment polymorphism.

```
Tuition track (existing)       FeeService track (new)          ServiceFee track (new)
─────────────────────────      ──────────────────────          ──────────────────────
ClassAcademic                  FeeService                      ServiceFee
    │                              │    │                          │
    │ (monthly/Q/Sem fees           │    └─ FeeServicePrice[]       │
    │  inline)                      │                              │
    ↓                              ↓                              ↓
Tuition  ─────────────         FeeSubscription                 (no subscription —
(one per student per period)       │                            every student in
    │                              ↓                            the class is
    │                          FeeBill                          implicitly in scope)
    │                          (one per sub per period)             │
    │                              │                              ↓
    ↓                              ↓                          ServiceFeeBill
                                                                 (one per student
                                       \\      |      /          per configured
                                        \\     |     /           period per year)
                                         \\    |    /
                                          ↓   ↓   ↓
                                          Payment (polymorphic)
                                          OnlinePaymentItem (polymorphic)
```

**Separation of concerns (file-level):**

- `src/pages/admin/fee-services/` — transport/accommodation CRUD & detail pages
- `src/pages/admin/service-fees/` — service fee CRUD
- `src/pages/admin/fee-bills/` — fee bill list & generation UI
- `src/pages/admin/service-fee-bills/` — service fee bill list & generation UI (or a combined `bills` page with tabs — see §7)
- `src/pages/api/v1/fee-services/` + `fee-subscriptions/` + `fee-bills/`
- `src/pages/api/v1/service-fees/` + `service-fee-bills/`
- `src/lib/business-logic/fee-bills.ts` — bill generation, price lookup, exit voiding
- `src/lib/business-logic/service-fee-bills.ts` — same, simpler
- `src/hooks/api/` — new query hooks; `src/lib/query-keys.ts` — new key families

**Key invariants (app-enforced, not DB-enforced):**
- A `Payment` has exactly **one** of `tuitionId`, `feeBillId`, `serviceFeeBillId` set.
- Same for `OnlinePaymentItem`.
- A `FeeServicePrice.effectiveFrom` is normalized to the 1st of a month at write time.
- `FeeSubscription.endDate >= startDate` when present.
- Bill generation is idempotent via unique constraints (re-running a generate call is safe).

## 5. Data model

### 5.1 New enum

```prisma
enum FeeServiceCategory {
  TRANSPORT
  ACCOMMODATION
}
```

### 5.2 Transport / accommodation models

```prisma
model FeeService {
  id              String             @id @default(uuid())
  academicYearId  String             @map("academic_year_id")
  category        FeeServiceCategory
  name            String             // "Bus A-B", "Dorm Wing A"
  description     String?
  isActive        Boolean            @default(true) @map("is_active")
  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")

  academicYear  AcademicYear      @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  prices        FeeServicePrice[]
  subscriptions FeeSubscription[]
  bills         FeeBill[]

  @@index([academicYearId])
  @@index([category, isActive])
  @@map("fee_services")
}

model FeeServicePrice {
  id            String   @id @default(uuid())
  feeServiceId  String   @map("fee_service_id")
  effectiveFrom DateTime @map("effective_from") // always 1st of a month at write time
  amount        Decimal  @db.Decimal(10, 2)
  createdAt     DateTime @default(now()) @map("created_at")

  feeService FeeService @relation(fields: [feeServiceId], references: [id], onDelete: Cascade)

  @@unique([feeServiceId, effectiveFrom])
  @@index([feeServiceId, effectiveFrom])
  @@map("fee_service_prices")
}

model FeeSubscription {
  id           String    @id @default(uuid())
  feeServiceId String    @map("fee_service_id")
  studentNis   String    @map("student_nis")
  startDate    DateTime  @map("start_date")
  endDate      DateTime? @map("end_date")
  notes        String?
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  feeService FeeService @relation(fields: [feeServiceId], references: [id], onDelete: Cascade)
  student    Student    @relation(fields: [studentNis], references: [nis], onDelete: Cascade)
  bills      FeeBill[]

  @@index([studentNis])
  @@index([feeServiceId])
  @@index([studentNis, endDate])
  @@map("fee_subscriptions")
}

model FeeBill {
  id             String        @id @default(uuid())
  subscriptionId String        @map("subscription_id")
  feeServiceId   String        @map("fee_service_id")   // denormalized
  studentNis     String        @map("student_nis")       // denormalized
  period         String                                   // "OCTOBER" etc. — matches Tuition.period
  year           Int
  amount         Decimal       @db.Decimal(10, 2)         // snapshot from price history
  paidAmount     Decimal       @default(0) @map("paid_amount") @db.Decimal(10, 2)
  status         PaymentStatus @default(UNPAID)
  dueDate        DateTime      @map("due_date")
  generatedAt    DateTime      @default(now()) @map("generated_at")
  voidedByExit   Boolean       @default(false) @map("voided_by_exit")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  subscription       FeeSubscription     @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  feeService         FeeService          @relation(fields: [feeServiceId], references: [id], onDelete: Restrict)
  student            Student             @relation(fields: [studentNis], references: [nis], onDelete: Cascade)
  payments           Payment[]
  onlinePaymentItems OnlinePaymentItem[]

  @@unique([subscriptionId, period, year])
  @@index([studentNis])
  @@index([feeServiceId])
  @@index([status])
  @@index([dueDate])
  @@map("fee_bills")
}
```

### 5.3 Service fee models

```prisma
model ServiceFee {
  id              String   @id @default(uuid())
  classAcademicId String   @map("class_academic_id")
  name            String              // "Uang Perlengkapan"
  amount          Decimal  @db.Decimal(10, 2)
  billingMonths   Month[]  @map("billing_months") // default [JULY, JANUARY]
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  classAcademic ClassAcademic    @relation(fields: [classAcademicId], references: [id], onDelete: Cascade)
  bills         ServiceFeeBill[]

  @@index([classAcademicId, isActive])
  @@map("service_fees")
}

model ServiceFeeBill {
  id              String        @id @default(uuid())
  serviceFeeId    String        @map("service_fee_id")
  studentNis      String        @map("student_nis")
  classAcademicId String        @map("class_academic_id") // denormalized
  period          String                                   // "JULY", "JANUARY"
  year            Int
  amount          Decimal       @db.Decimal(10, 2)         // snapshot from ServiceFee.amount
  paidAmount      Decimal       @default(0) @map("paid_amount") @db.Decimal(10, 2)
  status          PaymentStatus @default(UNPAID)
  dueDate         DateTime      @map("due_date")
  generatedAt     DateTime      @default(now()) @map("generated_at")
  voidedByExit    Boolean       @default(false) @map("voided_by_exit")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  serviceFee         ServiceFee          @relation(fields: [serviceFeeId], references: [id], onDelete: Cascade)
  student            Student             @relation(fields: [studentNis], references: [nis], onDelete: Cascade)
  classAcademic      ClassAcademic       @relation(fields: [classAcademicId], references: [id], onDelete: Restrict)
  payments           Payment[]
  onlinePaymentItems OnlinePaymentItem[]

  @@unique([serviceFeeId, studentNis, period, year])
  @@index([studentNis])
  @@index([classAcademicId])
  @@index([status])
  @@map("service_fee_bills")
}
```

### 5.4 Payment / OnlinePaymentItem modifications

```prisma
model Payment {
  id                String   @id @default(uuid())
  tuitionId         String?  @map("tuition_id")         // was required → NULLABLE
  feeBillId         String?  @map("fee_bill_id")        // NEW
  serviceFeeBillId  String?  @map("service_fee_bill_id")// NEW
  transactionId     String?  @map("transaction_id")     // NEW
  employeeId        String?  @map("employee_id")
  onlinePaymentId   String?  @map("online_payment_id")
  amount            Decimal  @db.Decimal(10, 2)
  scholarshipAmount Decimal  @default(0) @map("scholarship_amount") @db.Decimal(10, 2)
  paymentDate       DateTime @default(now()) @map("payment_date")
  notes             String?
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  tuition        Tuition?        @relation(fields: [tuitionId], references: [id], onDelete: Cascade)
  feeBill        FeeBill?        @relation(fields: [feeBillId], references: [id], onDelete: Cascade)
  serviceFeeBill ServiceFeeBill? @relation(fields: [serviceFeeBillId], references: [id], onDelete: Cascade)
  employee       Employee?       @relation(fields: [employeeId], references: [employeeId], onDelete: Restrict)
  onlinePayment  OnlinePayment?  @relation(fields: [onlinePaymentId], references: [id], onDelete: SetNull)

  @@index([tuitionId])
  @@index([feeBillId])
  @@index([serviceFeeBillId])
  @@index([transactionId])
  @@index([employeeId])
  @@index([onlinePaymentId])
  @@index([paymentDate])
  @@map("payments")
}

model OnlinePaymentItem {
  id               String   @id @default(uuid())
  onlinePaymentId  String   @map("online_payment_id")
  tuitionId        String?  @map("tuition_id")          // was required → NULLABLE
  feeBillId        String?  @map("fee_bill_id")         // NEW
  serviceFeeBillId String?  @map("service_fee_bill_id") // NEW
  amount           Decimal  @db.Decimal(10, 2)
  createdAt        DateTime @default(now()) @map("created_at")

  onlinePayment  OnlinePayment   @relation(fields: [onlinePaymentId], references: [id], onDelete: Cascade)
  tuition        Tuition?        @relation(fields: [tuitionId], references: [id], onDelete: Cascade)
  feeBill        FeeBill?        @relation(fields: [feeBillId], references: [id], onDelete: Cascade)
  serviceFeeBill ServiceFeeBill? @relation(fields: [serviceFeeBillId], references: [id], onDelete: Cascade)

  @@index([tuitionId])
  @@index([feeBillId])
  @@index([serviceFeeBillId])
  @@map("online_payment_items")
}
```

### 5.5 Student / ClassAcademic / AcademicYear additions

```prisma
model Student {
  // ... existing fields
  feeSubscriptions FeeSubscription[]
  feeBills         FeeBill[]
  serviceFeeBills  ServiceFeeBill[]
}

model ClassAcademic {
  // ... existing fields
  serviceFees     ServiceFee[]
  serviceFeeBills ServiceFeeBill[]
}

model AcademicYear {
  // ... existing fields
  feeServices FeeService[]
}
```

## 6. Business logic

### 6.1 Price resolution (transport/accommodation)

Given `feeServiceId`, `period` (e.g. `"OCTOBER"`), `year`:
1. Compute the target month's first day: `new Date(year, monthIndex(period), 1)` (in server timezone).
2. Find the `FeeServicePrice` with `feeServiceId = :id AND effectiveFrom <= targetDate`, ordered by `effectiveFrom DESC`, limit 1.
3. If none found → throw `NoPriceForPeriodError` (aborts generation, surfaces as 422).

### 6.2 Fee-bill generation (transport/accommodation)

Two endpoints — the "generate all" one is the primary operator path (see §13c for the full spec).

**Primary:** `POST /api/v1/fee-bills/generate-all` — body `{ academicYearId?: string }`. Generates missing bills for every active service × every active subscription × every month in the academic year. Idempotent. Re-run after data changes.

**Targeted (edge cases):** `POST /api/v1/fee-bills/generate` — body `{ feeServiceId?: string; period: string; year: number }`. Used for one-off fixes (e.g., regenerate after a past-month price correction that didn't exist at original run time).

Shared algorithm per (subscription, period) pair:
1. Resolve target month's first day (`targetDate`) and last day (`getPeriodStart` from [student-exit.ts:36](src/lib/business-logic/student-exit.ts#L36) reused).
2. Subscription must cover the period: `startDate <= lastDay` AND `(endDate IS NULL OR endDate >= firstDay)`.
3. Skip if student is exited and `targetDate > student.exitedAt`.
4. Resolve price (§6.1) → amount. Missing price → add to `priceWarnings`, do not abort run.
5. Upsert `FeeBill` using unique `(subscriptionId, period, year)` — inserts only; existing rows untouched (preserves paid status and original amount snapshot).
6. `dueDate = firstDay + 10 days` (same rule as Tuition — reuse existing helper from `src/lib/business-logic/tuition-generator.ts` if one exists).

Wrapped in a single Prisma transaction for the whole run.

### 6.3 Service-fee-bill generation

**Primary:** `POST /api/v1/service-fee-bills/generate-all` — body `{ academicYearId?: string }`. See §13c for full spec.

**Targeted:** `POST /api/v1/service-fee-bills/generate` — body `{ classAcademicId?: string; period: string; year: number }`.

Shared algorithm:
1. For each active `ServiceFee` (optionally filtered by `classAcademicId`) whose `billingMonths` contains the target period:
2. For each student in the class via `StudentClass`:
3. Skip if student exited and period's first day > `student.exitedAt`.
4. Upsert `ServiceFeeBill` by `(serviceFeeId, studentNis, period, year)`. Amount snapshotted from `ServiceFee.amount` at insert time. `dueDate = firstDay + 10 days`.

### 6.4 Payment recording (unified)

Endpoint: `POST /api/v1/payments` — body:
```ts
{
  studentNis: string;
  paymentDate?: string;  // ISO, defaults now
  notes?: string;
  items: Array<{
    tuitionId?: string;
    feeBillId?: string;
    serviceFeeBillId?: string;
    amount: string; // decimal as string
    scholarshipAmount?: string;
  }>;
}
```

Algorithm:
1. Validate: each item has exactly one of the three IDs; amount > 0.
2. Generate one `transactionId = uuid()`.
3. In a single Prisma transaction:
   - For each item: create `Payment` row with the FK set + `transactionId`.
   - Update the target bill's `paidAmount` and `status` (UNPAID → PARTIAL → PAID based on totals).
4. Return `{ transactionId, payments: [...] }`.

Voiding a payment (existing flow) needs to be extended to handle the three FK cases — update the matching bill's `paidAmount`/`status`.

### 6.5 Student exit cascade

File: [src/lib/business-logic/student-exit.ts](src/lib/business-logic/student-exit.ts). Two functions to extend: `recordStudentExit` and `undoStudentExit`.

**`recordStudentExit(params)` — add after the existing tuition loop:**
1. Update active `FeeSubscription` rows: `where: { studentNis: nis, OR: [{ endDate: null }, { endDate: { gt: exitDate } }] }` → `set endDate = exitDate`.
2. For `FeeBill` rows where `studentNis = nis` and `status IN (UNPAID, PARTIAL)`:
   - Reuse `isPeriodAfterExit(period, year, "MONTHLY", exitDate)` from [student-exit.ts:63](src/lib/business-logic/student-exit.ts#L63).
   - UNPAID → void: `status = VOID, voidedByExit = true, amount = 0, paidAmount = 0`.
   - PARTIAL → append to `partialWarnings` (mirror tuition behavior — don't auto-void partially-paid bills).
3. Same logic for `ServiceFeeBill`.
4. The existing `RecordExitResult.voidedCount` is incremented across all three tables; `partialWarnings` items grow a `source` discriminator field: `"tuition" | "feeBill" | "serviceFeeBill"`.

**`undoStudentExit(params)` — extend the restore phase:**
1. Existing: restore voided tuitions with re-snapshotted class fee.
2. New: find `FeeSubscription` rows where `studentNis = nis AND endDate = student.exitedAt` → set `endDate = null`.
3. New: find `FeeBill` rows where `studentNis = nis AND voidedByExit = true` → re-resolve price via §6.1, restore `status = UNPAID, voidedByExit = false, amount = <resolved>, paidAmount = 0`. If price resolution fails for a bill's period, skip it (same "data inconsistent, skip" pattern tuition uses at [student-exit.ts:250](src/lib/business-logic/student-exit.ts#L250)).
4. New: find `ServiceFeeBill` rows where `studentNis = nis AND voidedByExit = true` → restore `amount` from current `ServiceFee.amount`. If `ServiceFee` has been deleted or inactivated, skip.
5. `UndoExitResult.restoredCount` aggregates across all three tables.

### 6.6 Invariant enforcement helpers

Add to `src/lib/business-logic/payment-items.ts` (new file):
```ts
export function assertSingleBillTarget(item: {
  tuitionId?: string | null;
  feeBillId?: string | null;
  serviceFeeBillId?: string | null;
}): void;
```
Used by payment POST + online-payment POST + voiding code paths.

## 7. API surface

All routes follow existing conventions: `createApiHandler`, `requireAuth`, `successResponse`, `errorResponse` (see `src/lib/api-*`).

### Fee services (transport / accommodation)
```
GET    /api/v1/fee-services                        list; filters: academicYearId, category, isActive
POST   /api/v1/fee-services                        create (ADMIN only)
GET    /api/v1/fee-services/[id]                   detail
PATCH  /api/v1/fee-services/[id]                   update (ADMIN only)
DELETE /api/v1/fee-services/[id]                   delete (ADMIN only, only if no bills)
GET    /api/v1/fee-services/[id]/prices            price history
POST   /api/v1/fee-services/[id]/prices            add price (ADMIN only)
DELETE /api/v1/fee-services/[id]/prices/[priceId]  remove price (ADMIN, only if unreferenced)
```

### Fee subscriptions
```
GET    /api/v1/fee-subscriptions        list; filters: studentNis, feeServiceId, active
POST   /api/v1/fee-subscriptions        subscribe a student (ADMIN only)
PATCH  /api/v1/fee-subscriptions/[id]   end subscription / edit notes
DELETE /api/v1/fee-subscriptions/[id]   hard delete only if no bills
```

### Fee bills
```
GET    /api/v1/fee-bills               list; standard pagination; filters: studentNis, feeServiceId, period, year, status
GET    /api/v1/fee-bills/[id]          detail
PATCH  /api/v1/fee-bills/[id]          update notes only; status transitions via payment flow
DELETE /api/v1/fee-bills/[id]          only if unpaid + no payments
POST   /api/v1/fee-bills/generate      body: { feeServiceId?, period, year }
```

### Service fees
```
GET    /api/v1/service-fees                    list; filters: classAcademicId, isActive
POST   /api/v1/service-fees                    create (ADMIN only)
GET    /api/v1/service-fees/[id]               detail
PATCH  /api/v1/service-fees/[id]               update
DELETE /api/v1/service-fees/[id]               delete (only if no bills)
GET    /api/v1/service-fee-bills               list
GET    /api/v1/service-fee-bills/[id]          detail
DELETE /api/v1/service-fee-bills/[id]          only if unpaid
POST   /api/v1/service-fee-bills/generate      body: { classAcademicId?, period, year }
```

### Extended endpoints
- `POST /api/v1/payments` — body shape change (see §6.4). Existing callers that POST single-tuition payloads must be updated.
- `GET /api/v1/payments/print` — include FeeBill / ServiceFeeBill linked payments in the response grouped by student+date. Add bill type + details to each line.
- `POST /api/v1/online-payments` — accept mixed items (tuitionId | feeBillId | serviceFeeBillId). Update Midtrans `item_details` builder to label each line appropriately.

## 8. UI surface

### 8.1 Sidebar ([src/components/layouts/Sidebar.tsx](src/components/layouts/Sidebar.tsx))

Add under the existing "Pembayaran" area — a new collapsible nav group (`IconWallet`):
- **Services** (`IconBus`) → `/admin/fee-services`
- **Uang Perlengkapan** (`IconPackage`) → `/admin/service-fees`
- **All bills** (`IconReceipt2`) → `/admin/fee-bills` (tabbed: Transport/Accommodation / Service Fee)

Cashier role sees the bills view only (read + payment), not service CRUD.

### 8.2 Admin pages (new)

```
/admin/fee-services              list, filter by category + academic year, create button
/admin/fee-services/[id]         detail: info, price history table, subscribers table, "Add price" form, "Subscribe student" form
/admin/fee-services/generate     bulk generation form: pick service (or all) + period + year → submit

/admin/service-fees              list by class, filter by academic year
/admin/service-fees/[id]         detail: edit amount + billingMonths; students table; recent bills
/admin/service-fees/generate     generation form: pick class (or all) + period + year

/admin/fee-bills                 combined bill list; tabs for transport / accommodation / service fee; standard filters
```

Student detail page ([src/pages/admin/students/[nis].tsx](src/pages/admin/students/[nis].tsx)) gains two new sections:
- **Subscriptions** — active/past transport/accommodation subs; add/end actions
- **Fee bills** — filterable list of this student's FeeBill + ServiceFeeBill rows

Payment recording page: the outstanding-items picker now shows tuition, fee bills, and service fee bills together with a type badge. A single "Process payment" action creates one transaction.

### 8.3 Portal

Extend [src/pages/portal/payment.tsx](src/pages/portal/payment.tsx) so "outstanding bills" combines Tuition + FeeBill + ServiceFeeBill. Student selects any subset to pay via Midtrans. The existing `OnlinePayment` flow generates items for the selected bills of each type.

### 8.4 Print receipts

Existing [src/pages/admin/payments/print.tsx](src/pages/admin/payments/print.tsx) currently fetches by date and renders one slip per student. It needs to:
- Include `feeBill` and `serviceFeeBill` line items for each student on that date
- Render line labels like "SPP Juli", "Bus A-B Juli", "Uang Perlengkapan Juli" with amounts
- Totals already sum — just need the wider source

No layout overhaul required. Both compact and full layouts adapt via the existing item-list rendering.

### 8.5 Hooks + query keys

New files in `src/hooks/api/`:
- `useFeeServices.ts` — list/detail/create/update/delete
- `useFeeServicePrices.ts`
- `useFeeSubscriptions.ts`
- `useFeeBills.ts` — list/detail/generate
- `useServiceFees.ts`
- `useServiceFeeBills.ts`

Extend `src/lib/query-keys.ts`:
```ts
feeServices: {
  all: ["feeServices"] as const,
  lists: () => ["feeServices", "list"] as const,
  list: (filters) => ["feeServices", "list", filters] as const,
  details: () => ["feeServices", "detail"] as const,
  detail: (id) => ["feeServices", "detail", id] as const,
  prices: (id) => ["feeServices", id, "prices"] as const,
},
feeSubscriptions: { ... },
feeBills: { ... },
serviceFees: { ... },
serviceFeeBills: { ... },
```

Invalidation on mutation mirrors existing patterns.

### 8.6 i18n

New namespaces in `src/messages/{en,id}.json`:
- `feeService.*` — fieldnames, category labels, subscribe/unsubscribe, price history, generate
- `serviceFee.*` — fieldnames, billing months picker, generate

Sidebar labels added to existing `admin.*` namespace.

## 9. Edge cases

| # | Case | Behavior |
|---|---|---|
| 1 | Price not defined for a target month | Generation fails with 422 listing missing services. No silent 0-amount bills. |
| 2 | Retroactive price added after bills generated | Existing bills keep their snapshotted amount. Only future generations pick up the new price. |
| 3 | Retroactive subscription start | Generation endpoint can be run for past months; `(subscriptionId, period, year)` uniqueness makes this safe. |
| 4 | Student exits mid-year | `endDate` set on active subs, future unpaid bills voided with `voidedByExit = true, status = VOID`. Paid bills untouched. |
| 5 | Multiple subs to same service | Each sub is its own row. History preserved. Bill generation respects each sub's date range separately. |
| 6 | Deleting a service with bills | 409 Conflict. Use `isActive = false` to retire. |
| 7 | Over-pay / under-pay a bill | Same semantics as tuition: `paidAmount` accumulates, `status` flips UNPAID → PARTIAL → PAID. |
| 8 | Multi-bill transaction partial failure | Entire payment POST wrapped in a Prisma transaction. All-or-nothing. |
| 9 | Academic year rollover | New services must be created per year. No auto-copy at launch. |
| 10 | Service fee amount changes mid-year | Update `ServiceFee.amount`; only future-generated bills reflect it. Existing bills keep their snapshot. |
| 11 | `billingMonths` changes mid-year | Next generation respects the new list. Existing bills untouched. |
| 12 | Student changes class mid-year | Existing service fee bills stay linked to original class; new class's service fee applies to future months. |
| 13 | Student has a scholarship | Scholarship applies to tuition only. Transport, accommodation, and service fee bills are billed in full regardless of scholarship status. |
| 14 | Active discount covers a period | Discount applies to tuition only. No discount_amount column exists on `FeeBill` / `ServiceFeeBill`. |

## 9a. User documentation

After implementation, update both help-page sources so end users see the new features documented in-app:

- [docs/USER-GUIDE-ID.md](docs/USER-GUIDE-ID.md) — Indonesian user guide
- [docs/USER-GUIDE-EN.md](docs/USER-GUIDE-EN.md) — English mirror

Add sections covering:
- Managing transport / accommodation services (create, price history, subscribe/unsubscribe students)
- Managing service fee (uang perlengkapan) per class — amount + billing months
- Using the "Generate all bills" button, what it does, when to re-run it
- Cashier multi-bill payment (selecting tuition + transport + service fee line items in one transaction)
- Portal: new unified bill list for students
- Behavior on student exit (automatic subscription end + future bill voiding)
- Clarification that scholarships and discounts remain tuition-only

The help page is rendered from these files at [src/pages/admin/help.tsx](src/pages/admin/help.tsx) — changes take effect on next build.

## 10. Seed data

Update `prisma/seed.ts` to add (against the currently-active academic year):

**Fee services:**
- `"Bus A-B"` (TRANSPORT) — prices: 250_000 effective Jul 1, 275_000 effective Jan 1
- `"Bus B-C"` (TRANSPORT) — price: 500_000 effective Jul 1
- `"Dorm Putra"` (ACCOMMODATION) — price: 1_500_000 effective Jul 1

**Subscriptions:** ~5 students spread across services. Include:
- 2 full-year subscribers on Bus A-B (exercise the price-change path)
- 1 mid-year joiner (Oct 1) on Bus B-C
- 1 full-year dorm subscriber
- 1 student who exits school in Feb (exercise exit-void)

**Service fees:** per seeded `ClassAcademic`, add one "Uang Perlengkapan" at Rp 750_000 with `billingMonths: [JULY, JANUARY]`.

**Bills:** generate July through the current month for all three tracks.

**Payments:** mark ~60% of bills paid. Include at least 3 multi-bill transactions (`transactionId` shared across tuition + transport + service-fee rows) to exercise the unified payment path.

## 11. Testing strategy

**Business logic unit tests** (`src/lib/business-logic/__tests__/`):
- `fee-bills.test.ts`
  - Price resolution: returns correct amount across multi-entry history including exact `effectiveFrom` boundary
  - Generation idempotent: running twice yields identical state
  - Subscription range respected: no bills outside `[startDate, endDate]`
  - Exit voiding: only future unpaid bills → VOID; paid bills untouched
  - Missing price → throws `NoPriceForPeriodError`
- `service-fee-bills.test.ts`
  - Generation respects `billingMonths` (no bills in non-billing months)
  - Generation filters by `classAcademicId`
  - Exit voiding
- `payment-items.test.ts`
  - `assertSingleBillTarget` rejects 0 and ≥2 ids
- `student-exit.test.ts`
  - Existing tests extended: verify subs ended, fee bills voided

**API route tests** (where infra exists — follow patterns in current `src/pages/api/v1/__tests__`):
- `POST /payments` with mixed items: creates rows with shared `transactionId`
- `POST /payments` with bad item shape: 422
- Generation endpoints: return `{ created, skipped }` correctly

**Manual test checklist** captured in the implementation plan:
- Admin creates a fee service and a price; subscribes a student; generates bills; pays at cashier
- Admin creates a service fee; generates bills for a class; pays at cashier with mixed items
- Print receipt for a mixed-item day shows tuition + transport + service fee lines
- Portal student sees all bill types; pays a subset via Midtrans (sandbox)
- Exit a student mid-year; verify future bills voided and subs ended

## 12. Migration plan (high-level)

1. Prisma schema migration:
   - Add new enum, tables, columns.
   - `Payment.tuitionId` and `OnlinePaymentItem.tuitionId` go nullable.
2. Data backfill: none needed (existing rows already have `tuitionId` set; nullable is purely additive).
3. Code changes: business-logic helpers, API routes, UI pages, i18n, seed script (in that order per implementation plan).
4. Deploy via existing Railway pipeline. No downtime expected.

## 13. Resolved implementation decisions

**13a — Seed target:** Seed extends the currently-active academic year (same scope as existing tuition seed). No new academic year is created for testing.

**13b — Student exit cascade file:** [src/lib/business-logic/student-exit.ts](src/lib/business-logic/student-exit.ts).
- `recordStudentExit(params)` — extend to also:
  - Set `endDate = exitDate` on active `FeeSubscription` rows for this student (`endDate IS NULL OR endDate > exitDate`).
  - Apply the same period-after-exit + status-check logic used for tuition to `FeeBill` and `ServiceFeeBill` (UNPAID → VOID with `voidedByExit = true, amount = 0, paidAmount = 0`; PARTIAL → added to `partialWarnings` result, not auto-voided).
- `undoStudentExit(params)` — extend to also:
  - Restore any `FeeSubscription` where `endDate = student.exitedAt`, setting `endDate = null`.
  - Restore `FeeBill` rows where `voidedByExit = true` by re-snapshotting amount from the price history (use the same price resolution §6.1 for the bill's period).
  - Restore `ServiceFeeBill` rows where `voidedByExit = true` by re-snapshotting from the current `ServiceFee.amount`.
- Reuse existing `getPeriodStart(period, year, frequency)` helper — all fee bills use `frequency = "MONTHLY"` (transport/accommodation) or `"MONTHLY"` mapping (service fee periods are always month names).

**13c — Bulk generation logic ("generate everything, idempotent, re-runnable"):**

The primary admin action is **one-click generate-all**. Running it repeatedly is the supported way to pick up new students, new subscriptions, and exits.

Endpoint: `POST /api/v1/fee-bills/generate-all` with body `{ academicYearId?: string }` (defaults to active AY):

1. Compute the list of months in the academic year: from `academicYear.startDate` month through `academicYear.endDate` month, inclusive.
2. For each active `FeeService` in the academic year:
   - For each active `FeeSubscription` on that service (regardless of status — scoping is done per-month):
     - For each month in the AY list where the month is within `[startDate, min(endDate, academicYear.endDate)]`:
       - Skip if the student is exited and that month starts after `student.exitedAt`.
       - Resolve price (§6.1). If missing → collect as a warning, do not abort.
       - Upsert `FeeBill` by unique `(subscriptionId, period, year)`. Existing bills are left untouched.
3. Return `{ created, skipped, priceWarnings: [...], exitSkipped: N }`.

Analogous endpoint: `POST /api/v1/service-fee-bills/generate-all` with body `{ academicYearId?: string }`:

1. For each active `ClassAcademic` in the academic year:
   - For each active `ServiceFee` on that class:
     - For each `period` in `ServiceFee.billingMonths`:
       - For each currently-enrolled student in the class (`StudentClass` rows):
         - Skip if student is exited and that period starts after `student.exitedAt`.
         - Upsert `ServiceFeeBill` by `(serviceFeeId, studentNis, period, year)`. Existing bills left untouched.
2. Return `{ created, skipped, exitSkipped }`.

**Safety properties:**
- **Idempotent:** unique constraints (`@@unique([subscriptionId, period, year])` / `@@unique([serviceFeeId, studentNis, period, year])`) prevent duplicates on re-run.
- **No retro-rewrites:** paid or partially-paid bills are never touched on re-generation — the upsert only inserts new rows.
- **Data-drift aware:** new students added, new subscriptions, and mid-year exits are all picked up naturally by the next run.
- **Past bills safe:** amount is snapshotted on first insert. A later price change or `ServiceFee.amount` edit does not alter existing rows.

**UI:**
- `/admin/fee-bills` and `/admin/service-fee-bills` each gain a prominent **"Generate all bills for <active AY>"** button at the top.
- A confirmation modal summarizes: "This will create any missing bills for the current academic year. Existing bills will not be modified. Continue?"
- Result is displayed with counts + any price warnings listed so admins can fix missing prices and re-run.
- Per-service / per-period targeted generation endpoints (§7) remain for edge cases but the generate-all button is the default path.

---

## Self-review checklist

- [x] Placeholder scan: no TBD / TODO left unresolved in normative sections.
- [x] Internal consistency: data model in §5 matches API surface in §7 and UI in §8.
- [x] Scope check: all three fee tracks (tuition existing, transport/accommodation new, service fee new) are covered. Portal, receipt, seed, and exit flow all addressed.
- [x] Ambiguity check: Payment polymorphism enforcement documented as app-level; invariants listed explicitly; price snapshot vs live-lookup resolved (snapshot on generation).
