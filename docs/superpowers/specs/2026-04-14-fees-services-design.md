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

Non-goals (deferred):
- Discounts or scholarships applied to transport/accommodation/service fee bills.
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

Endpoint: `POST /api/v1/fee-bills/generate` with body `{ feeServiceId?: string; period: string; year: number }`.

Algorithm:
1. Resolve target month's first day (`targetDate`) and last day.
2. Query `FeeSubscription` rows with:
   - `feeServiceId = body.feeServiceId` (if provided)
   - `startDate <= lastDay` AND `(endDate IS NULL OR endDate >= firstDay)`
3. For each subscription, resolve price (§6.1) → amount.
4. Upsert `FeeBill` using unique `(subscriptionId, period, year)`:
   - If exists → skip (idempotent)
   - Else insert with `dueDate = firstDay + 10` (same rule as Tuition, reuse existing helper if available).
5. Wrap in one Prisma transaction; return `{ created: N, skipped: M }`.

### 6.3 Service-fee-bill generation

Endpoint: `POST /api/v1/service-fee-bills/generate` with body `{ classAcademicId?: string; period: string; year: number }`.

Algorithm:
1. Query `ServiceFee` rows where `isActive = true`, optionally filtered by `classAcademicId`, where `billingMonths` contains the target period.
2. For each `ServiceFee`, fetch students in the class via `StudentClass`.
3. Upsert `ServiceFeeBill` per `(serviceFeeId, studentNis, period, year)`. Amount snapshotted from `ServiceFee.amount`. `dueDate = firstDay + 10`.
4. Return `{ created, skipped }`.

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

Existing `src/lib/business-logic/student-exit.ts` (or wherever the exit flow lives) is extended in one place:

When a student is marked exited on `exitDate`:
1. Existing behavior: void future unpaid `Tuition` rows.
2. New: for each active `FeeSubscription` (endDate NULL or > exitDate), set `endDate = exitDate`.
3. New: for `FeeBill` with `year` + period first-day > exitDate and `status = UNPAID`: set `voidedByExit = true`, `status = VOID`.
4. New: for `ServiceFeeBill` with period first-day > exitDate and `status = UNPAID`: set `voidedByExit = true`, `status = VOID`.

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

## 13. Open questions for implementation

- Does `prisma/seed.ts` currently target an active academic year, or does it create its own? Confirm before extending.
- Which exact file holds the student exit cascade logic? Will be identified during plan step 1.
- Should the "generate bills" UI allow bulk generation across all services + all months at once, or stay one-at-a-time? Defer to a follow-up.

---

## Self-review checklist

- [x] Placeholder scan: no TBD / TODO left unresolved in normative sections.
- [x] Internal consistency: data model in §5 matches API surface in §7 and UI in §8.
- [x] Scope check: all three fee tracks (tuition existing, transport/accommodation new, service fee new) are covered. Portal, receipt, seed, and exit flow all addressed.
- [x] Ambiguity check: Payment polymorphism enforcement documented as app-level; invariants listed explicitly; price snapshot vs live-lookup resolved (snapshot on generation).
