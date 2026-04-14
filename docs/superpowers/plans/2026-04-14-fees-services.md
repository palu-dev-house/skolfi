# Fees & Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add transport/accommodation fee tracking (with price history + subscriptions) and a mandatory service fee (uang perlengkapan) track, plus polymorphic payment recording so cashiers can pay tuition + transport + service fees in one transaction.

**Architecture:** Three parallel billable tracks (existing `Tuition`, new `FeeService`+`FeeBill`, new `ServiceFee`+`ServiceFeeBill`) with `Payment` and `OnlinePaymentItem` becoming polymorphic via nullable FKs grouped by a shared `transactionId`. Bills are idempotently batch-generated (primary path is one-click "generate-all") with snapshotted amounts at insert time.

**Tech Stack:** Next.js 14 Pages Router, Prisma 7 + PostgreSQL (Railway), Mantine UI v8, TanStack Query, next-intl. Runtime: `pnpm`. Linting: Biome. No test framework — tasks verify via `pnpm lint && pnpm type-check` + manual browser/seed verification.

**Spec:** [docs/superpowers/specs/2026-04-14-fees-services-design.md](../specs/2026-04-14-fees-services-design.md)

**Scholarship/discount rule:** These remain tuition-only. `FeeBill` and `ServiceFeeBill` have no scholarship/discount columns. Cashier UI must not offer those options on non-tuition items.

---

## Task map

| Phase | Tasks | Scope |
|-------|-------|-------|
| 1. Schema | 1 | Prisma models + migration |
| 2. Business logic | 2–5 | Generators, invariant helper, exit cascade |
| 3. API — fees & bills | 6–11 | CRUD + generate / generate-all for both tracks |
| 4. API — payments + hooks | 12–19 | Polymorphic payments, print, online payments, query keys, hooks |
| 5. Admin UI | 20–26 | Fee services, service fees, bills, payments, student detail, print |
| 6. Portal + glue + seed + docs | 27–31 | Portal combined bills, sidebar, i18n, seed, user guide |

---

## Phase 1: Database schema

### Task 1: Prisma schema additions + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `FeeServiceCategory` enum**

  Locate the `// ENUMS` block in `prisma/schema.prisma` (near the top, ~line 12). Add the following enum directly below the existing `WhatsAppLogStatus` enum (around line 67):

  ```prisma
  enum FeeServiceCategory {
    TRANSPORT
    ACCOMMODATION
  }
  ```

- [ ] **Step 2: Add `FeeService`, `FeeServicePrice`, `FeeSubscription`, `FeeBill` models**

  Append the following block at the end of `prisma/schema.prisma` (after the `WhatsAppLog` model):

  ```prisma
  // ============================================
  // FEE SERVICES (TRANSPORT / ACCOMMODATION)
  // ============================================

  model FeeService {
    id              String             @id @default(uuid())
    academicYearId  String             @map("academic_year_id")
    category        FeeServiceCategory
    name            String
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
    effectiveFrom DateTime @map("effective_from")
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
    feeServiceId   String        @map("fee_service_id")
    studentNis     String        @map("student_nis")
    period         String
    year           Int
    amount         Decimal       @db.Decimal(10, 2)
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

- [ ] **Step 3: Add `ServiceFee`, `ServiceFeeBill` models**

  Append below the FeeBill model added in Step 2:

  ```prisma
  // ============================================
  // SERVICE FEE (UANG PERLENGKAPAN)
  // ============================================

  model ServiceFee {
    id              String   @id @default(uuid())
    classAcademicId String   @map("class_academic_id")
    name            String
    amount          Decimal  @db.Decimal(10, 2)
    billingMonths   Month[]  @map("billing_months")
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
    classAcademicId String        @map("class_academic_id")
    period          String
    year            Int
    amount          Decimal       @db.Decimal(10, 2)
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

- [ ] **Step 4: Modify `Payment` — polymorphic target**

  Replace the existing `Payment` model in `prisma/schema.prisma` (~line 271) with:

  ```prisma
  model Payment {
    id                String   @id @default(uuid())
    tuitionId         String?  @map("tuition_id")
    feeBillId         String?  @map("fee_bill_id")
    serviceFeeBillId  String?  @map("service_fee_bill_id")
    transactionId     String?  @map("transaction_id")
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
  ```

- [ ] **Step 5: Modify `OnlinePaymentItem` — polymorphic target**

  Replace the existing `OnlinePaymentItem` model in `prisma/schema.prisma` (~line 357) with:

  ```prisma
  model OnlinePaymentItem {
    id               String   @id @default(uuid())
    onlinePaymentId  String   @map("online_payment_id")
    tuitionId        String?  @map("tuition_id")
    feeBillId        String?  @map("fee_bill_id")
    serviceFeeBillId String?  @map("service_fee_bill_id")
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

  Note: the prior `@@unique([onlinePaymentId, tuitionId])` is intentionally dropped — with three possible FK columns, the invariant is enforced in app code (see Task 4).

- [ ] **Step 6: Add back-relations on `Student`, `ClassAcademic`, `AcademicYear`**

  In the `Student` model (~line 91), inside the `// Relations` block, add these three lines alongside `scholarships`, `tuitions`, `studentClasses`, `onlinePayments`:

  ```prisma
    feeSubscriptions FeeSubscription[]
    feeBills         FeeBill[]
    serviceFeeBills  ServiceFeeBill[]
  ```

  In the `ClassAcademic` model (~line 159), add below the existing relation fields (`discounts`):

  ```prisma
    serviceFees     ServiceFee[]
    serviceFeeBills ServiceFeeBill[]
  ```

  In the `AcademicYear` model (~line 140), add below the existing relation fields (`discounts`):

  ```prisma
    feeServices FeeService[]
  ```

- [ ] **Step 7: Regenerate Prisma client**

  ```bash
  pnpm prisma:generate
  ```

  Verify `src/generated/prisma/client` now exports `FeeService`, `FeeBill`, `ServiceFee`, `ServiceFeeBill`, `FeeServiceCategory`.

- [ ] **Step 8: Create migration**

  ```bash
  pnpm prisma:migrate -- --name add-fee-services-and-service-fees
  ```

  Verify a new folder appeared under `prisma/migrations/`.

- [ ] **Step 9: Lint + type-check**

  ```bash
  pnpm lint && pnpm type-check
  ```

  Expect type-check to surface call sites where `payment.tuitionId` / `onlinePaymentItem.tuitionId` were assumed non-null. Do NOT fix those here — they are addressed in later tasks. For this task, the schema changes alone should compile if nothing reads `tuitionId` as non-null in the touched files. If type-check fails only on pre-existing call sites, proceed to commit; the following tasks handle them.

- [ ] **Step 10: Commit**

  ```bash
  git add prisma/ src/generated/ && git commit -m "feat(db): add fee services, subscriptions, bills, and service fees"
  ```

## Phase 2: Business logic

### Task 2: Fee bill generator module

**Files:**
- Create: `src/lib/business-logic/fee-bills.ts`

- [ ] **Step 1: Create file skeleton with error class and imports**

  Create `src/lib/business-logic/fee-bills.ts`:

  ```ts
  import type { FeeServicePrice, FeeSubscription } from "@/generated/prisma/client";
  import { Prisma } from "@/generated/prisma/client";
  import { prisma } from "@/lib/prisma";
  import { PERIODS } from "@/lib/business-logic/tuition-generator";

  export class NoPriceForPeriodError extends Error {
    constructor(
      public feeServiceId: string,
      public period: string,
      public year: number,
    ) {
      super(
        `No price defined for fee service ${feeServiceId} at ${period} ${year}`,
      );
      this.name = "NoPriceForPeriodError";
    }
  }
  ```

- [ ] **Step 2: Add `resolvePriceForPeriod` + `monthIndexFromPeriod` helpers**

  Append to `src/lib/business-logic/fee-bills.ts`:

  ```ts
  const MONTH_INDEX: Record<string, number> = {
    JANUARY: 0,
    FEBRUARY: 1,
    MARCH: 2,
    APRIL: 3,
    MAY: 4,
    JUNE: 5,
    JULY: 6,
    AUGUST: 7,
    SEPTEMBER: 8,
    OCTOBER: 9,
    NOVEMBER: 10,
    DECEMBER: 11,
  };

  /**
   * 0-indexed month (for `new Date(year, monthIndex, 1)`) from a monthly period name.
   * Throws for non-monthly periods — FeeBill only supports monthly periods.
   */
  export function monthIndexFromPeriod(period: string): number {
    const idx = MONTH_INDEX[period];
    if (idx === undefined) {
      throw new Error(`Invalid monthly period: ${period}`);
    }
    return idx;
  }

  /**
   * Find the latest `FeeServicePrice.effectiveFrom <= first day of (period, year)`.
   * Throws NoPriceForPeriodError when no row qualifies.
   */
  export function resolvePriceForPeriod(
    prices: FeeServicePrice[],
    period: string,
    year: number,
  ): Prisma.Decimal {
    const firstDay = new Date(year, monthIndexFromPeriod(period), 1);
    let best: FeeServicePrice | null = null;
    for (const p of prices) {
      if (p.effectiveFrom.getTime() <= firstDay.getTime()) {
        if (!best || p.effectiveFrom.getTime() > best.effectiveFrom.getTime()) {
          best = p;
        }
      }
    }
    if (!best) {
      const serviceId = prices[0]?.feeServiceId ?? "<unknown>";
      throw new NoPriceForPeriodError(serviceId, period, year);
    }
    return new Prisma.Decimal(best.amount);
  }
  ```

- [ ] **Step 3: Add `getMonthsInAcademicYear` helper**

  Append to `src/lib/business-logic/fee-bills.ts`:

  ```ts
  const ACADEMIC_MONTH_ORDER = PERIODS.MONTHLY; // JULY → JUNE

  /**
   * List every (period, year) tuple between academic year start and end inclusive.
   * Second-half months (Jan-Jun) carry startYear+1.
   */
  export function getMonthsInAcademicYear(
    startDate: Date,
    endDate: Date,
  ): Array<{ period: string; year: number }> {
    const startYear = startDate.getFullYear();
    const result: Array<{ period: string; year: number }> = [];
    const startIdx = startDate.getMonth(); // 0-11
    const endIdx = endDate.getMonth();

    // Walk from startDate to endDate month-by-month.
    let y = startYear;
    let m = startIdx;
    while (true) {
      const period = Object.entries(MONTH_INDEX).find(
        ([, idx]) => idx === m,
      )?.[0];
      if (period && (ACADEMIC_MONTH_ORDER as readonly string[]).includes(period)) {
        result.push({ period, year: y });
      }
      if (y === endDate.getFullYear() && m === endIdx) break;
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return result;
  }
  ```

- [ ] **Step 4: Add `generateFeeBillsForSubscription`**

  Append to `src/lib/business-logic/fee-bills.ts`:

  ```ts
  type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

  interface SubscriptionWithContext extends FeeSubscription {
    feeService: {
      id: string;
      prices: FeeServicePrice[];
    };
    student: {
      nis: string;
      exitedAt: Date | null;
    };
  }

  interface AcademicYearCtx {
    id: string;
    startDate: Date;
    endDate: Date;
  }

  /**
   * Generate any missing FeeBill rows for one subscription across the academic year.
   * Existing rows are left untouched (idempotent via @@unique).
   */
  export async function generateFeeBillsForSubscription(
    tx: TxClient,
    subscription: SubscriptionWithContext,
    academicYear: AcademicYearCtx,
  ): Promise<{ created: number; skipped: number; priceWarnings: string[] }> {
    const months = getMonthsInAcademicYear(
      academicYear.startDate,
      academicYear.endDate,
    );
    const priceWarnings: string[] = [];
    let created = 0;
    let skipped = 0;

    for (const { period, year } of months) {
      const firstDay = new Date(year, monthIndexFromPeriod(period), 1);
      const lastDay = new Date(year, monthIndexFromPeriod(period) + 1, 0);

      // Subscription must cover the period.
      if (subscription.startDate.getTime() > lastDay.getTime()) continue;
      if (
        subscription.endDate &&
        subscription.endDate.getTime() < firstDay.getTime()
      ) {
        continue;
      }

      // Skip periods starting after the student's exit.
      if (
        subscription.student.exitedAt &&
        firstDay.getTime() > subscription.student.exitedAt.getTime()
      ) {
        continue;
      }

      let amount: Prisma.Decimal;
      try {
        amount = resolvePriceForPeriod(
          subscription.feeService.prices,
          period,
          year,
        );
      } catch (err) {
        if (err instanceof NoPriceForPeriodError) {
          priceWarnings.push(
            `No price for service ${subscription.feeServiceId} at ${period} ${year}`,
          );
          continue;
        }
        throw err;
      }

      const dueDate = new Date(firstDay);
      dueDate.setDate(firstDay.getDate() + 10);

      // Idempotent insert: if the unique constraint fires, treat as skipped.
      const existing = await tx.feeBill.findUnique({
        where: {
          subscriptionId_period_year: {
            subscriptionId: subscription.id,
            period,
            year,
          },
        },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      await tx.feeBill.create({
        data: {
          subscriptionId: subscription.id,
          feeServiceId: subscription.feeServiceId,
          studentNis: subscription.studentNis,
          period,
          year,
          amount,
          dueDate,
        },
      });
      created += 1;
    }

    return { created, skipped, priceWarnings };
  }
  ```

- [ ] **Step 5: Add `generateAllFeeBills` entry point**

  Append to `src/lib/business-logic/fee-bills.ts`:

  ```ts
  export interface GenerateAllFeeBillsResult {
    created: number;
    skipped: number;
    priceWarnings: string[];
    exitSkipped: number;
  }

  /**
   * Generate bills for every active subscription × every active service in the
   * given academic year. Safe to re-run.
   */
  export async function generateAllFeeBills(
    academicYearId: string,
  ): Promise<GenerateAllFeeBillsResult> {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true, startDate: true, endDate: true },
    });
    if (!academicYear) {
      throw new Error(`Academic year ${academicYearId} not found`);
    }

    return prisma.$transaction(async (tx) => {
      const services = await tx.feeService.findMany({
        where: { academicYearId, isActive: true },
        include: {
          prices: true,
          subscriptions: {
            include: {
              feeService: { include: { prices: true } },
              student: { select: { nis: true, exitedAt: true } },
            },
          },
        },
      });

      let created = 0;
      let skipped = 0;
      let exitSkipped = 0;
      const priceWarnings: string[] = [];

      for (const service of services) {
        for (const sub of service.subscriptions) {
          // Fully-exited students with every period already after exit count
          // as exitSkipped at the subscription level.
          const preCount = created;
          const res = await generateFeeBillsForSubscription(
            tx,
            sub as unknown as SubscriptionWithContext,
            academicYear,
          );
          created += res.created;
          skipped += res.skipped;
          priceWarnings.push(...res.priceWarnings);
          if (res.created === 0 && res.skipped === 0 && sub.student.exitedAt) {
            exitSkipped += 1;
          }
          void preCount;
        }
      }

      return { created, skipped, priceWarnings, exitSkipped };
    });
  }
  ```

- [ ] **Step 6: Lint + type-check**

  ```bash
  pnpm lint && pnpm type-check
  ```

  Fix any issues surfaced by this new file before committing.

- [ ] **Step 7: Commit**

  ```bash
  git add src/lib/business-logic/fee-bills.ts && git commit -m "feat(fee-bills): add bill generation with price history resolution"
  ```

### Task 3: Service fee bill generator module

**Files:**
- Create: `src/lib/business-logic/service-fee-bills.ts`

- [ ] **Step 1: Create file with imports**

  Create `src/lib/business-logic/service-fee-bills.ts`:

  ```ts
  import type { Month, ServiceFee } from "@/generated/prisma/client";
  import { Prisma } from "@/generated/prisma/client";
  import { prisma } from "@/lib/prisma";
  import { getPeriodStart } from "@/lib/business-logic/student-exit";

  type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

  interface AcademicYearCtx {
    id: string;
    startDate: Date;
    endDate: Date;
  }

  interface StudentCtx {
    nis: string;
    exitedAt: Date | null;
  }
  ```

- [ ] **Step 2: Add `generateServiceFeeBillsForFee`**

  Append to `src/lib/business-logic/service-fee-bills.ts`:

  ```ts
  /**
   * Decide the calendar year for a monthly period relative to an academic year
   * that spans July → June. JULY..DECEMBER use startYear; JANUARY..JUNE use startYear+1.
   */
  function yearForPeriod(period: Month, academicYear: AcademicYearCtx): number {
    const startYear = academicYear.startDate.getFullYear();
    const secondHalf: Month[] = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
    ];
    return secondHalf.includes(period) ? startYear + 1 : startYear;
  }

  export async function generateServiceFeeBillsForFee(
    tx: TxClient,
    serviceFee: ServiceFee & { classAcademicId: string },
    studentsInClass: StudentCtx[],
    academicYear: AcademicYearCtx,
  ): Promise<{ created: number; skipped: number; exitSkipped: number }> {
    let created = 0;
    let skipped = 0;
    let exitSkipped = 0;

    for (const period of serviceFee.billingMonths) {
      const year = yearForPeriod(period, academicYear);
      const firstDay = getPeriodStart(period, year, "MONTHLY");
      const dueDate = new Date(firstDay);
      dueDate.setDate(firstDay.getDate() + 10);

      for (const student of studentsInClass) {
        if (
          student.exitedAt &&
          firstDay.getTime() > student.exitedAt.getTime()
        ) {
          exitSkipped += 1;
          continue;
        }

        const existing = await tx.serviceFeeBill.findUnique({
          where: {
            serviceFeeId_studentNis_period_year: {
              serviceFeeId: serviceFee.id,
              studentNis: student.nis,
              period,
              year,
            },
          },
          select: { id: true },
        });
        if (existing) {
          skipped += 1;
          continue;
        }

        await tx.serviceFeeBill.create({
          data: {
            serviceFeeId: serviceFee.id,
            studentNis: student.nis,
            classAcademicId: serviceFee.classAcademicId,
            period,
            year,
            amount: new Prisma.Decimal(serviceFee.amount),
            dueDate,
          },
        });
        created += 1;
      }
    }

    return { created, skipped, exitSkipped };
  }
  ```

- [ ] **Step 3: Add `generateAllServiceFeeBills`**

  Append to `src/lib/business-logic/service-fee-bills.ts`:

  ```ts
  export interface GenerateAllServiceFeeBillsResult {
    created: number;
    skipped: number;
    exitSkipped: number;
  }

  /**
   * Active ClassAcademic × active ServiceFee × billingMonths × enrolled students.
   * Safe to re-run (idempotent via @@unique([serviceFeeId, studentNis, period, year])).
   */
  export async function generateAllServiceFeeBills(
    academicYearId: string,
  ): Promise<GenerateAllServiceFeeBillsResult> {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true, startDate: true, endDate: true },
    });
    if (!academicYear) {
      throw new Error(`Academic year ${academicYearId} not found`);
    }

    return prisma.$transaction(async (tx) => {
      const classes = await tx.classAcademic.findMany({
        where: { academicYearId },
        include: {
          serviceFees: { where: { isActive: true } },
          studentClasses: {
            include: {
              student: { select: { nis: true, exitedAt: true } },
            },
          },
        },
      });

      let created = 0;
      let skipped = 0;
      let exitSkipped = 0;

      for (const cls of classes) {
        const students: StudentCtx[] = cls.studentClasses.map((sc) => ({
          nis: sc.student.nis,
          exitedAt: sc.student.exitedAt,
        }));

        for (const fee of cls.serviceFees) {
          const res = await generateServiceFeeBillsForFee(
            tx,
            fee,
            students,
            academicYear,
          );
          created += res.created;
          skipped += res.skipped;
          exitSkipped += res.exitSkipped;
        }
      }

      return { created, skipped, exitSkipped };
    });
  }
  ```

- [ ] **Step 4: Lint + type-check**

  ```bash
  pnpm lint && pnpm type-check
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/business-logic/service-fee-bills.ts && git commit -m "feat(service-fee-bills): add per-class service fee bill generation"
  ```

### Task 4: Payment items invariant helper

**Files:**
- Create: `src/lib/business-logic/payment-items.ts`

- [ ] **Step 1: Create the file with `assertSingleBillTarget`**

  Create `src/lib/business-logic/payment-items.ts`:

  ```ts
  export interface PaymentItemTarget {
    tuitionId?: string | null;
    feeBillId?: string | null;
    serviceFeeBillId?: string | null;
  }

  /**
   * App-level invariant: a Payment or OnlinePaymentItem must reference exactly
   * one of tuitionId / feeBillId / serviceFeeBillId. Throws otherwise.
   */
  export function assertSingleBillTarget(item: PaymentItemTarget): void {
    const set = [item.tuitionId, item.feeBillId, item.serviceFeeBillId].filter(
      (v) => v != null && v !== "",
    );
    if (set.length === 0) {
      throw new Error(
        "Payment item must set one of tuitionId, feeBillId, or serviceFeeBillId",
      );
    }
    if (set.length > 1) {
      throw new Error(
        "Payment item must set exactly one of tuitionId, feeBillId, or serviceFeeBillId",
      );
    }
  }
  ```

- [ ] **Step 2: Add `resolveBillTargetType` helper**

  Append to `src/lib/business-logic/payment-items.ts`:

  ```ts
  export type BillTargetType = "tuition" | "feeBill" | "serviceFeeBill";

  /**
   * Narrow a payment item to its discriminator. Call `assertSingleBillTarget`
   * first (or rely on it here — this helper also asserts).
   */
  export function resolveBillTargetType(
    item: PaymentItemTarget,
  ): BillTargetType {
    assertSingleBillTarget(item);
    if (item.tuitionId) return "tuition";
    if (item.feeBillId) return "feeBill";
    return "serviceFeeBill";
  }
  ```

- [ ] **Step 3: Lint + type-check**

  ```bash
  pnpm lint && pnpm type-check
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/business-logic/payment-items.ts && git commit -m "feat(payments): add single-bill-target invariant helper"
  ```

### Task 5: Extend student exit cascade

**Files:**
- Modify: `src/lib/business-logic/student-exit.ts` (existing; `recordStudentExit` at line 105, `undoStudentExit` at line 208)

- [ ] **Step 1: Re-read the file and confirm shape**

  Open `src/lib/business-logic/student-exit.ts`. Confirm:
  - `getPeriodStart` is exported at line 36.
  - `isPeriodAfterExit` is exported at line 63.
  - `PartialWarning` interface is at line 79 (has `tuitionId`, `period`, `year`, `paidAmount`).
  - `RecordExitResult` is at line 86.
  - `recordStudentExit` transaction body runs from line 110 to ~196.
  - `undoStudentExit` transaction body runs from line 213 to ~271.
  - Restore-skip-if-fee-missing pattern sits at line 250.

- [ ] **Step 2: Update the `PartialWarning` / `RecordExitResult` type shapes**

  Replace the existing `PartialWarning` and `RecordExitResult` interface block (lines 79-89) with:

  ```ts
  export type PartialWarningSource = "tuition" | "feeBill" | "serviceFeeBill";

  export interface PartialWarning {
    source: PartialWarningSource;
    /** Legacy field retained for backward compat when source === "tuition". */
    tuitionId?: string;
    /** Set when source === "feeBill". */
    feeBillId?: string;
    /** Set when source === "serviceFeeBill". */
    serviceFeeBillId?: string;
    period: string;
    year: number;
    paidAmount: string; // Decimal serialized
  }

  export interface RecordExitResult {
    voidedCount: number;
    partialWarnings: PartialWarning[];
  }
  ```

  Then update the tuition branch inside `recordStudentExit` (around line 172) where `partialWarnings.push({...})` is called. Replace that push with:

  ```ts
        partialWarnings.push({
          source: "tuition",
          tuitionId: t.id,
          period: t.period,
          year: t.year,
          paidAmount: t.paidAmount.toString(),
        });
  ```

- [ ] **Step 3: Extend `recordStudentExit` — end active FeeSubscriptions**

  Inside the `prisma.$transaction` callback in `recordStudentExit`, immediately before the final `return { voidedCount: toVoid.length, partialWarnings };` line (around line 195), insert:

  ```ts
      // --- FeeSubscription: cap endDate at exitDate for still-active subs ---
      await tx.feeSubscription.updateMany({
        where: {
          studentNis: nis,
          OR: [{ endDate: null }, { endDate: { gt: exitDate } }],
        },
        data: { endDate: exitDate },
      });
  ```

- [ ] **Step 4: Extend `recordStudentExit` — void future FeeBills**

  Directly after the block from Step 3 (still before the final `return`), insert:

  ```ts
      // --- FeeBill: void future unpaid, warn on future partial ---
      const feeBillCandidates = await tx.feeBill.findMany({
        where: { studentNis: nis, status: { in: ["UNPAID", "PARTIAL"] } },
        select: {
          id: true,
          period: true,
          year: true,
          status: true,
          paidAmount: true,
        },
      });

      const feeBillsToVoid: string[] = [];
      for (const b of feeBillCandidates) {
        if (!isPeriodAfterExit(b.period, b.year, "MONTHLY", exitDate)) {
          continue;
        }
        if (b.status === "PARTIAL") {
          partialWarnings.push({
            source: "feeBill",
            feeBillId: b.id,
            period: b.period,
            year: b.year,
            paidAmount: b.paidAmount.toString(),
          });
          continue;
        }
        feeBillsToVoid.push(b.id);
      }

      if (feeBillsToVoid.length > 0) {
        await tx.feeBill.updateMany({
          where: { id: { in: feeBillsToVoid } },
          data: {
            status: "VOID",
            voidedByExit: true,
            amount: new Prisma.Decimal(0),
            paidAmount: new Prisma.Decimal(0),
          },
        });
      }
  ```

- [ ] **Step 5: Extend `recordStudentExit` — void future ServiceFeeBills + update final return**

  Directly after the FeeBill block from Step 4 (still inside the transaction), insert:

  ```ts
      // --- ServiceFeeBill: void future unpaid, warn on future partial ---
      const serviceBillCandidates = await tx.serviceFeeBill.findMany({
        where: { studentNis: nis, status: { in: ["UNPAID", "PARTIAL"] } },
        select: {
          id: true,
          period: true,
          year: true,
          status: true,
          paidAmount: true,
        },
      });

      const serviceBillsToVoid: string[] = [];
      for (const b of serviceBillCandidates) {
        if (!isPeriodAfterExit(b.period, b.year, "MONTHLY", exitDate)) {
          continue;
        }
        if (b.status === "PARTIAL") {
          partialWarnings.push({
            source: "serviceFeeBill",
            serviceFeeBillId: b.id,
            period: b.period,
            year: b.year,
            paidAmount: b.paidAmount.toString(),
          });
          continue;
        }
        serviceBillsToVoid.push(b.id);
      }

      if (serviceBillsToVoid.length > 0) {
        await tx.serviceFeeBill.updateMany({
          where: { id: { in: serviceBillsToVoid } },
          data: {
            status: "VOID",
            voidedByExit: true,
            amount: new Prisma.Decimal(0),
            paidAmount: new Prisma.Decimal(0),
          },
        });
      }
  ```

  Then change the final `return` of `recordStudentExit` from:

  ```ts
      return { voidedCount: toVoid.length, partialWarnings };
  ```

  to:

  ```ts
      return {
        voidedCount:
          toVoid.length + feeBillsToVoid.length + serviceBillsToVoid.length,
        partialWarnings,
      };
  ```

- [ ] **Step 6: Extend `undoStudentExit` — restore FeeSubscriptions**

  Inside `undoStudentExit`'s transaction, directly before the existing `await tx.student.update({ where: { nis }, data: { exitedAt: null, ... } })` call (around line 265), insert:

  ```ts
      // --- Restore FeeSubscription rows capped at exit date ---
      const exitedAt = student.exitedAt; // snapshot before clearing below
      const subsRestored = await tx.feeSubscription.updateMany({
        where: { studentNis: nis, endDate: exitedAt },
        data: { endDate: null },
      });
  ```

- [ ] **Step 7: Extend `undoStudentExit` — restore FeeBills with price re-resolution**

  Add an import at the top of `src/lib/business-logic/student-exit.ts`, next to the existing imports:

  ```ts
  import {
    NoPriceForPeriodError,
    resolvePriceForPeriod,
  } from "@/lib/business-logic/fee-bills";
  ```

  Then, directly after the block from Step 6, insert:

  ```ts
      // --- Restore FeeBill rows voided by this exit; re-resolve price per period ---
      const voidedFeeBills = await tx.feeBill.findMany({
        where: { studentNis: nis, voidedByExit: true },
        select: {
          id: true,
          feeServiceId: true,
          period: true,
          year: true,
        },
      });

      let feeBillsRestored = 0;
      for (const bill of voidedFeeBills) {
        const prices = await tx.feeServicePrice.findMany({
          where: { feeServiceId: bill.feeServiceId },
        });
        let amount: Prisma.Decimal;
        try {
          amount = resolvePriceForPeriod(prices, bill.period, bill.year);
        } catch (err) {
          if (err instanceof NoPriceForPeriodError) {
            // Same "data inconsistent — skip" pattern as the tuition branch.
            continue;
          }
          throw err;
        }
        await tx.feeBill.update({
          where: { id: bill.id },
          data: {
            status: "UNPAID",
            voidedByExit: false,
            amount,
            paidAmount: new Prisma.Decimal(0),
          },
        });
        feeBillsRestored += 1;
      }
  ```

- [ ] **Step 8: Extend `undoStudentExit` — restore ServiceFeeBills from current amount**

  Directly after the block from Step 7, insert:

  ```ts
      // --- Restore ServiceFeeBill rows voided by this exit ---
      const voidedServiceBills = await tx.serviceFeeBill.findMany({
        where: { studentNis: nis, voidedByExit: true },
        select: {
          id: true,
          serviceFee: {
            select: { id: true, amount: true, isActive: true },
          },
        },
      });

      let serviceBillsRestored = 0;
      for (const bill of voidedServiceBills) {
        if (!bill.serviceFee || !bill.serviceFee.isActive) {
          // ServiceFee deleted or inactive — leave voided.
          continue;
        }
        await tx.serviceFeeBill.update({
          where: { id: bill.id },
          data: {
            status: "UNPAID",
            voidedByExit: false,
            amount: new Prisma.Decimal(bill.serviceFee.amount),
            paidAmount: new Prisma.Decimal(0),
          },
        });
        serviceBillsRestored += 1;
      }
  ```

- [ ] **Step 9: Aggregate `UndoExitResult.restoredCount` across all three tables**

  Replace the existing final `return { restoredCount };` at the bottom of `undoStudentExit` (around line 270) with:

  ```ts
      return {
        restoredCount: restoredCount + feeBillsRestored + serviceBillsRestored,
      };
  ```

  The `subsRestored` count (from Step 6) is intentionally not added to `restoredCount` because subscriptions are relationship rows, not bills — the caller tracks bill restoration only. If you want to surface it later, extend `UndoExitResult` in a follow-up.

- [ ] **Step 10: Lint + type-check**

  ```bash
  pnpm lint && pnpm type-check
  ```

  Manually verify against seed data (dev):
  - Run `pnpm prisma:seed` to refresh local DB.
  - Record an exit for a seeded student mid-year via the UI or a direct call; confirm in Prisma Studio that future `FeeBill` and `ServiceFeeBill` rows flip to `VOID` / `voidedByExit = true` and their `FeeSubscription.endDate` is capped.
  - Undo the exit and confirm the bills restore with correct `amount` values and subscriptions re-open.

- [ ] **Step 11: Commit**

  ```bash
  git add src/lib/business-logic/student-exit.ts && git commit -m "feat(student-exit): cascade exit/undo to fee subscriptions and fee bills"
  ```
## Phase 3: REST API endpoints (CRUD + generation)

All routes below assume Phase 1 (Prisma models from spec §5) and Phase 2 business-logic modules (`src/lib/business-logic/fee-bills.ts` and `src/lib/business-logic/service-fee-bills.ts` exporting `generateAllFeeBills`, `generateFeeBills`, `generateAllServiceFeeBills`, `generateServiceFeeBills`) already exist from chunk-a. Routes are thin wrappers — they must never duplicate generation logic.

All files use the `createApiHandler` adapter pattern, mirror `src/pages/api/v1/tuitions/index.ts` style exactly, and rely on:
- `requireAuth(request)` / `requireRole(request, ["ADMIN"])` from `@/lib/api-auth`
- `successResponse(data)` / `errorResponse(message, code, status)` from `@/lib/api-response`
- `prisma` from `@/lib/prisma`
- Prisma types from `@/generated/prisma/client`

Verification for every step below (run before committing):
```
pnpm lint && pnpm type-check
```

---

### Task 6: Fee service CRUD endpoints

- [ ] **Step 6.1: Create `src/pages/api/v1/fee-services/index.ts` with GET + POST handlers.**

  File: `src/pages/api/v1/fee-services/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import type { FeeServiceCategory, Prisma } from "@/generated/prisma/client";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth, requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const categoryParam = searchParams.get("category");
    const category =
      categoryParam && categoryParam !== "null"
        ? (categoryParam as FeeServiceCategory)
        : undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive =
      isActiveParam === "true"
        ? true
        : isActiveParam === "false"
          ? false
          : undefined;

    const where: Prisma.FeeServiceWhereInput = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const [feeServices, total] = await Promise.all([
      prisma.feeService.findMany({
        where,
        include: {
          academicYear: { select: { id: true, year: true } },
          _count: {
            select: { prices: true, subscriptions: true, bills: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.feeService.count({ where }),
    ]);

    return successResponse({
      feeServices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async function POST(request: NextRequest) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    try {
      const body = await request.json();
      const { academicYearId, category, name, description, isActive } = body as {
        academicYearId?: string;
        category?: FeeServiceCategory;
        name?: string;
        description?: string | null;
        isActive?: boolean;
      };

      if (!academicYearId || !category || !name) {
        return errorResponse(
          "academicYearId, category, and name are required",
          "VALIDATION_ERROR",
          400,
        );
      }

      if (category !== "TRANSPORT" && category !== "ACCOMMODATION") {
        return errorResponse(
          "category must be TRANSPORT or ACCOMMODATION",
          "VALIDATION_ERROR",
          400,
        );
      }

      const academicYear = await prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { id: true },
      });
      if (!academicYear) {
        return errorResponse(
          "Academic year not found",
          "NOT_FOUND",
          404,
        );
      }

      const created = await prisma.feeService.create({
        data: {
          academicYearId,
          category,
          name,
          description: description ?? null,
          isActive: isActive ?? true,
        },
        include: {
          academicYear: { select: { id: true, year: true } },
        },
      });

      return successResponse(created, 201);
    } catch (error) {
      console.error("Create fee service error:", error);
      return errorResponse(
        "Failed to create fee service",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ GET, POST });
  ```

- [ ] **Step 6.2: Create `src/pages/api/v1/fee-services/[id]/index.ts` with GET + PATCH + DELETE handlers.**

  File: `src/pages/api/v1/fee-services/[id]/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth, requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const feeService = await prisma.feeService.findUnique({
      where: { id },
      include: {
        academicYear: { select: { id: true, year: true } },
        prices: {
          orderBy: { effectiveFrom: "desc" },
        },
        _count: { select: { bills: true, subscriptions: true } },
      },
    });

    if (!feeService) {
      return errorResponse("Fee service not found", "NOT_FOUND", 404);
    }

    const now = new Date();
    const activeSubscriptionCount = await prisma.feeSubscription.count({
      where: {
        feeServiceId: id,
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    return successResponse({ ...feeService, activeSubscriptionCount });
  }

  async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const existing = await prisma.feeService.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse("Fee service not found", "NOT_FOUND", 404);
      }

      const body = await request.json();
      const { name, description, isActive } = body as {
        name?: string;
        description?: string | null;
        isActive?: boolean;
      };

      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (isActive !== undefined) data.isActive = isActive;

      const updated = await prisma.feeService.update({
        where: { id },
        data,
        include: {
          academicYear: { select: { id: true, year: true } },
        },
      });

      return successResponse(updated);
    } catch (error) {
      console.error("Update fee service error:", error);
      return errorResponse(
        "Failed to update fee service",
        "SERVER_ERROR",
        500,
      );
    }
  }

  async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const feeService = await prisma.feeService.findUnique({
        where: { id },
        include: { _count: { select: { bills: true } } },
      });

      if (!feeService) {
        return errorResponse("Fee service not found", "NOT_FOUND", 404);
      }

      if (feeService._count.bills > 0) {
        return errorResponse(
          "Cannot delete fee service with existing bills. Set isActive=false instead.",
          "CONFLICT",
          409,
        );
      }

      await prisma.feeService.delete({ where: { id } });

      return successResponse({ message: "Fee service deleted" });
    } catch (error) {
      console.error("Delete fee service error:", error);
      return errorResponse(
        "Failed to delete fee service",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ GET, PATCH, DELETE });
  ```

- [ ] **Step 6.3: Run `pnpm lint && pnpm type-check`.** Fix any errors (usually missing Prisma type after generate — run `pnpm prisma generate` if needed).

- [ ] **Step 6.4: Commit.**

  ```
  git add src/pages/api/v1/fee-services/index.ts src/pages/api/v1/fee-services/[id]/index.ts
  git commit -m "feat(api): fee-services CRUD endpoints"
  ```

---

### Task 7: Fee service price history endpoints

- [ ] **Step 7.1: Create `src/pages/api/v1/fee-services/[id]/prices/index.ts` with GET + POST.**

  Notes:
  - POST normalizes `effectiveFrom` to the 1st of the month at UTC so the unique `(feeServiceId, effectiveFrom)` constraint always collides consistently.
  - Month enum values map to JS months: JULY=6, AUGUST=7, ... JUNE=5. We don't need the enum here — we just normalize whatever date string the admin submits.

  File: `src/pages/api/v1/fee-services/[id]/prices/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth, requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const feeService = await prisma.feeService.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!feeService) {
      return errorResponse("Fee service not found", "NOT_FOUND", 404);
    }

    const prices = await prisma.feeServicePrice.findMany({
      where: { feeServiceId: id },
      orderBy: { effectiveFrom: "desc" },
    });

    return successResponse({ prices });
  }

  async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const feeService = await prisma.feeService.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!feeService) {
        return errorResponse("Fee service not found", "NOT_FOUND", 404);
      }

      const body = await request.json();
      const { effectiveFrom, amount } = body as {
        effectiveFrom?: string;
        amount?: string | number;
      };

      if (!effectiveFrom || amount === undefined || amount === null) {
        return errorResponse(
          "effectiveFrom and amount are required",
          "VALIDATION_ERROR",
          400,
        );
      }

      const parsed = new Date(effectiveFrom);
      if (Number.isNaN(parsed.getTime())) {
        return errorResponse(
          "effectiveFrom must be a valid date",
          "VALIDATION_ERROR",
          400,
        );
      }

      // Normalize to 1st of month at UTC midnight
      const normalized = new Date(
        Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1),
      );

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return errorResponse(
          "amount must be a non-negative number",
          "VALIDATION_ERROR",
          400,
        );
      }

      const existing = await prisma.feeServicePrice.findUnique({
        where: {
          feeServiceId_effectiveFrom: {
            feeServiceId: id,
            effectiveFrom: normalized,
          },
        },
      });
      if (existing) {
        return errorResponse(
          "A price for that month already exists",
          "CONFLICT",
          409,
        );
      }

      const created = await prisma.feeServicePrice.create({
        data: {
          feeServiceId: id,
          effectiveFrom: normalized,
          amount: numericAmount,
        },
      });

      return successResponse(created, 201);
    } catch (error) {
      console.error("Create fee service price error:", error);
      return errorResponse(
        "Failed to create price entry",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ GET, POST });
  ```

- [ ] **Step 7.2: Create `src/pages/api/v1/fee-services/[id]/prices/[priceId]/index.ts` with DELETE.**

  Delete allowed only if no `FeeBill` for this service has `generatedAt >= effectiveFrom` (proxy for "unreferenced"). This matches spec §9 row 2 (snapshot semantics) while preventing removal of prices that actually contributed to existing bills.

  File: `src/pages/api/v1/fee-services/[id]/prices/[priceId]/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; priceId: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id, priceId } = await params;

    try {
      const price = await prisma.feeServicePrice.findUnique({
        where: { id: priceId },
      });
      if (!price || price.feeServiceId !== id) {
        return errorResponse("Price not found", "NOT_FOUND", 404);
      }

      const referencedCount = await prisma.feeBill.count({
        where: {
          feeServiceId: id,
          generatedAt: { gte: price.effectiveFrom },
        },
      });

      if (referencedCount > 0) {
        return errorResponse(
          "Cannot delete a price entry that has been used to generate bills",
          "CONFLICT",
          409,
        );
      }

      await prisma.feeServicePrice.delete({ where: { id: priceId } });

      return successResponse({ message: "Price entry deleted" });
    } catch (error) {
      console.error("Delete fee service price error:", error);
      return errorResponse(
        "Failed to delete price entry",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ DELETE });
  ```

- [ ] **Step 7.3: Run `pnpm lint && pnpm type-check`.**

- [ ] **Step 7.4: Commit.**

  ```
  git add "src/pages/api/v1/fee-services/[id]/prices/"
  git commit -m "feat(api): fee-service price history endpoints"
  ```

---

### Task 8: Fee subscription endpoints

- [ ] **Step 8.1: Create `src/pages/api/v1/fee-subscriptions/index.ts` with GET + POST.**

  File: `src/pages/api/v1/fee-subscriptions/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import type { Prisma } from "@/generated/prisma/client";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth, requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const studentNis = searchParams.get("studentNis") || undefined;
    const feeServiceId = searchParams.get("feeServiceId") || undefined;
    const activeParam = searchParams.get("active");

    const where: Prisma.FeeSubscriptionWhereInput = {};
    if (studentNis) where.studentNis = studentNis;
    if (feeServiceId) where.feeServiceId = feeServiceId;

    const now = new Date();
    if (activeParam === "true") {
      where.OR = [{ endDate: null }, { endDate: { gte: now } }];
    } else if (activeParam === "false") {
      where.endDate = { lt: now };
    }

    const [subscriptions, total] = await Promise.all([
      prisma.feeSubscription.findMany({
        where,
        include: {
          feeService: {
            select: { id: true, name: true, category: true },
          },
          student: {
            select: { nis: true, name: true },
          },
          _count: { select: { bills: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ startDate: "desc" }],
      }),
      prisma.feeSubscription.count({ where }),
    ]);

    return successResponse({
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async function POST(request: NextRequest) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    try {
      const body = await request.json();
      const { feeServiceId, studentNis, startDate, endDate, notes } = body as {
        feeServiceId?: string;
        studentNis?: string;
        startDate?: string;
        endDate?: string | null;
        notes?: string | null;
      };

      if (!feeServiceId || !studentNis || !startDate) {
        return errorResponse(
          "feeServiceId, studentNis, and startDate are required",
          "VALIDATION_ERROR",
          400,
        );
      }

      const start = new Date(startDate);
      if (Number.isNaN(start.getTime())) {
        return errorResponse(
          "startDate must be a valid date",
          "VALIDATION_ERROR",
          400,
        );
      }

      let end: Date | null = null;
      if (endDate) {
        end = new Date(endDate);
        if (Number.isNaN(end.getTime())) {
          return errorResponse(
            "endDate must be a valid date",
            "VALIDATION_ERROR",
            400,
          );
        }
        if (end < start) {
          return errorResponse(
            "endDate must be on or after startDate",
            "VALIDATION_ERROR",
            400,
          );
        }
      }

      const [feeService, student] = await Promise.all([
        prisma.feeService.findUnique({
          where: { id: feeServiceId },
          select: { id: true },
        }),
        prisma.student.findUnique({
          where: { nis: studentNis },
          select: { nis: true },
        }),
      ]);

      if (!feeService) {
        return errorResponse("Fee service not found", "NOT_FOUND", 404);
      }
      if (!student) {
        return errorResponse("Student not found", "NOT_FOUND", 404);
      }

      const created = await prisma.feeSubscription.create({
        data: {
          feeServiceId,
          studentNis,
          startDate: start,
          endDate: end,
          notes: notes ?? null,
        },
        include: {
          feeService: { select: { id: true, name: true, category: true } },
          student: { select: { nis: true, name: true } },
        },
      });

      return successResponse(created, 201);
    } catch (error) {
      console.error("Create fee subscription error:", error);
      return errorResponse(
        "Failed to create subscription",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ GET, POST });
  ```

- [ ] **Step 8.2: Create `src/pages/api/v1/fee-subscriptions/[id]/index.ts` with PATCH + DELETE.**

  File: `src/pages/api/v1/fee-subscriptions/[id]/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const existing = await prisma.feeSubscription.findUnique({
        where: { id },
      });
      if (!existing) {
        return errorResponse("Subscription not found", "NOT_FOUND", 404);
      }

      const body = await request.json();
      const { endDate, notes } = body as {
        endDate?: string | null;
        notes?: string | null;
      };

      const data: Record<string, unknown> = {};

      if (endDate !== undefined) {
        if (endDate === null) {
          data.endDate = null;
        } else {
          const parsed = new Date(endDate);
          if (Number.isNaN(parsed.getTime())) {
            return errorResponse(
              "endDate must be a valid date or null",
              "VALIDATION_ERROR",
              400,
            );
          }
          if (parsed < existing.startDate) {
            return errorResponse(
              "endDate must be on or after startDate",
              "VALIDATION_ERROR",
              400,
            );
          }
          data.endDate = parsed;
        }
      }

      if (notes !== undefined) {
        data.notes = notes;
      }

      const updated = await prisma.feeSubscription.update({
        where: { id },
        data,
        include: {
          feeService: { select: { id: true, name: true, category: true } },
          student: { select: { nis: true, name: true } },
        },
      });

      return successResponse(updated);
    } catch (error) {
      console.error("Update fee subscription error:", error);
      return errorResponse(
        "Failed to update subscription",
        "SERVER_ERROR",
        500,
      );
    }
  }

  async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const subscription = await prisma.feeSubscription.findUnique({
        where: { id },
        include: { _count: { select: { bills: true } } },
      });

      if (!subscription) {
        return errorResponse("Subscription not found", "NOT_FOUND", 404);
      }

      if (subscription._count.bills > 0) {
        return errorResponse(
          "Cannot delete subscription with existing bills. End the subscription instead.",
          "CONFLICT",
          409,
        );
      }

      await prisma.feeSubscription.delete({ where: { id } });

      return successResponse({ message: "Subscription deleted" });
    } catch (error) {
      console.error("Delete fee subscription error:", error);
      return errorResponse(
        "Failed to delete subscription",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ PATCH, DELETE });
  ```

- [ ] **Step 8.3: Run `pnpm lint && pnpm type-check`.**

- [ ] **Step 8.4: Commit.**

  ```
  git add src/pages/api/v1/fee-subscriptions/
  git commit -m "feat(api): fee-subscriptions endpoints"
  ```

---

### Task 9: Fee bill endpoints + generation

- [ ] **Step 9.1: Create `src/pages/api/v1/fee-bills/index.ts` (GET list with filters).**

  File: `src/pages/api/v1/fee-bills/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import type { Prisma } from "@/generated/prisma/client";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth } from "@/lib/api-auth";
  import { successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const studentNis = searchParams.get("studentNis") || undefined;
    const feeServiceId = searchParams.get("feeServiceId") || undefined;
    const periodParam = searchParams.get("period");
    const period =
      periodParam && periodParam !== "null" ? periodParam : undefined;
    const year = searchParams.get("year")
      ? Number(searchParams.get("year"))
      : undefined;
    const statusParam = searchParams.get("status");
    const status =
      statusParam && statusParam !== "null" ? statusParam : undefined;

    const where: Prisma.FeeBillWhereInput = {};
    if (studentNis) where.studentNis = studentNis;
    if (feeServiceId) where.feeServiceId = feeServiceId;
    if (period) where.period = period;
    if (year) where.year = year;
    if (status) {
      where.status = status as "UNPAID" | "PAID" | "PARTIAL" | "VOID";
    }

    const [bills, total] = await Promise.all([
      prisma.feeBill.findMany({
        where,
        include: {
          feeService: {
            select: { id: true, name: true, category: true },
          },
          student: {
            select: { nis: true, name: true, parentPhone: true },
          },
          _count: { select: { payments: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { year: "desc" },
          { period: "desc" },
          { student: { name: "asc" } },
        ],
      }),
      prisma.feeBill.count({ where }),
    ]);

    return successResponse({
      bills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  export default createApiHandler({ GET });
  ```

- [ ] **Step 9.2: Create `src/pages/api/v1/fee-bills/[id]/index.ts` (GET, PATCH notes, DELETE).**

  File: `src/pages/api/v1/fee-bills/[id]/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth, requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const bill = await prisma.feeBill.findUnique({
      where: { id },
      include: {
        feeService: {
          select: { id: true, name: true, category: true },
        },
        student: {
          select: {
            nis: true,
            name: true,
            parentName: true,
            parentPhone: true,
          },
        },
        subscription: {
          select: { id: true, startDate: true, endDate: true, notes: true },
        },
        payments: {
          include: { employee: { select: { name: true } } },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!bill) {
      return errorResponse("Fee bill not found", "NOT_FOUND", 404);
    }

    return successResponse(bill);
  }

  async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const existing = await prisma.feeBill.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse("Fee bill not found", "NOT_FOUND", 404);
      }

      const body = await request.json();
      const { notes } = body as { notes?: string | null };

      const data: Record<string, unknown> = {};
      // Only notes are editable via PATCH. Status transitions happen through
      // the payment flow. Amount is a snapshot and must not change.
      if (notes !== undefined) {
        data.notes = notes;
      }

      // FeeBill doesn't currently have a notes column in the spec; if the
      // schema adds one, uncomment below. Otherwise this returns the bill
      // unchanged so callers can still PATCH safely.
      if (Object.keys(data).length === 0) {
        return successResponse(existing);
      }

      const updated = await prisma.feeBill.update({
        where: { id },
        data,
      });

      return successResponse(updated);
    } catch (error) {
      console.error("Update fee bill error:", error);
      return errorResponse("Failed to update fee bill", "SERVER_ERROR", 500);
    }
  }

  async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const bill = await prisma.feeBill.findUnique({
        where: { id },
        include: { _count: { select: { payments: true } } },
      });

      if (!bill) {
        return errorResponse("Fee bill not found", "NOT_FOUND", 404);
      }

      if (bill.status !== "UNPAID" || bill._count.payments > 0) {
        return errorResponse(
          "Cannot delete a bill with payments or non-UNPAID status",
          "CONFLICT",
          409,
        );
      }

      await prisma.feeBill.delete({ where: { id } });

      return successResponse({ message: "Fee bill deleted" });
    } catch (error) {
      console.error("Delete fee bill error:", error);
      return errorResponse("Failed to delete fee bill", "SERVER_ERROR", 500);
    }
  }

  export default createApiHandler({ GET, PATCH, DELETE });
  ```

  Note on the PATCH body: if the Prisma `FeeBill` model in chunk-a added a `notes` column, the `data.notes` assignment above just works. If not, the no-op branch keeps the endpoint safe. Adjust once chunk-a finalizes the schema.

- [ ] **Step 9.3: Create `src/pages/api/v1/fee-bills/generate/index.ts` (POST targeted).**

  File: `src/pages/api/v1/fee-bills/generate/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { generateFeeBills } from "@/lib/business-logic/fee-bills";

  async function POST(request: NextRequest) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    try {
      const body = await request.json();
      const { feeServiceId, period, year } = body as {
        feeServiceId?: string;
        period?: string;
        year?: number;
      };

      if (!period || !year) {
        return errorResponse(
          "period and year are required",
          "VALIDATION_ERROR",
          400,
        );
      }

      const result = await generateFeeBills({
        feeServiceId,
        period,
        year: Number(year),
      });

      return successResponse(result);
    } catch (error) {
      console.error("Generate fee bills error:", error);
      return errorResponse(
        "Failed to generate fee bills",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ POST });
  ```

- [ ] **Step 9.4: Create `src/pages/api/v1/fee-bills/generate-all/index.ts` (POST primary).**

  File: `src/pages/api/v1/fee-bills/generate-all/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { generateAllFeeBills } from "@/lib/business-logic/fee-bills";

  async function POST(request: NextRequest) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    try {
      const body = await request.json().catch(() => ({}));
      const { academicYearId } = body as { academicYearId?: string };

      const result = await generateAllFeeBills({ academicYearId });

      return successResponse(result);
    } catch (error) {
      console.error("Generate-all fee bills error:", error);
      return errorResponse(
        "Failed to generate fee bills",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ POST });
  ```

- [ ] **Step 9.5: Run `pnpm lint && pnpm type-check`.**

- [ ] **Step 9.6: Commit.**

  ```
  git add src/pages/api/v1/fee-bills/
  git commit -m "feat(api): fee-bills CRUD + generation endpoints"
  ```

---

### Task 10: Service fee CRUD endpoints

- [ ] **Step 10.1: Create `src/pages/api/v1/service-fees/index.ts` with GET + POST.**

  File: `src/pages/api/v1/service-fees/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import type { Month, Prisma } from "@/generated/prisma/client";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth, requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  const VALID_MONTHS: Month[] = [
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
  ];

  function isValidMonthArray(value: unknown): value is Month[] {
    if (!Array.isArray(value) || value.length === 0) return false;
    return value.every((v) =>
      VALID_MONTHS.includes(v as Month),
    );
  }

  async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const classAcademicId =
      searchParams.get("classAcademicId") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive =
      isActiveParam === "true"
        ? true
        : isActiveParam === "false"
          ? false
          : undefined;

    const where: Prisma.ServiceFeeWhereInput = {};
    if (classAcademicId) where.classAcademicId = classAcademicId;
    if (isActive !== undefined) where.isActive = isActive;

    const [serviceFees, total] = await Promise.all([
      prisma.serviceFee.findMany({
        where,
        include: {
          classAcademic: {
            select: {
              id: true,
              className: true,
              grade: true,
              section: true,
              academicYear: { select: { id: true, year: true } },
            },
          },
          _count: { select: { bills: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.serviceFee.count({ where }),
    ]);

    return successResponse({
      serviceFees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async function POST(request: NextRequest) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    try {
      const body = await request.json();
      const { classAcademicId, name, amount, billingMonths, isActive } =
        body as {
          classAcademicId?: string;
          name?: string;
          amount?: string | number;
          billingMonths?: unknown;
          isActive?: boolean;
        };

      if (!classAcademicId || !name || amount === undefined) {
        return errorResponse(
          "classAcademicId, name, and amount are required",
          "VALIDATION_ERROR",
          400,
        );
      }

      if (!isValidMonthArray(billingMonths)) {
        return errorResponse(
          "billingMonths must be a non-empty array of Month enum values",
          "VALIDATION_ERROR",
          400,
        );
      }

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return errorResponse(
          "amount must be a non-negative number",
          "VALIDATION_ERROR",
          400,
        );
      }

      const classAcademic = await prisma.classAcademic.findUnique({
        where: { id: classAcademicId },
        select: { id: true },
      });
      if (!classAcademic) {
        return errorResponse("Class not found", "NOT_FOUND", 404);
      }

      const created = await prisma.serviceFee.create({
        data: {
          classAcademicId,
          name,
          amount: numericAmount,
          billingMonths,
          isActive: isActive ?? true,
        },
        include: {
          classAcademic: {
            select: {
              id: true,
              className: true,
              grade: true,
              section: true,
              academicYear: { select: { id: true, year: true } },
            },
          },
        },
      });

      return successResponse(created, 201);
    } catch (error) {
      console.error("Create service fee error:", error);
      return errorResponse(
        "Failed to create service fee",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ GET, POST });
  ```

- [ ] **Step 10.2: Create `src/pages/api/v1/service-fees/[id]/index.ts` with GET + PATCH + DELETE.**

  File: `src/pages/api/v1/service-fees/[id]/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import type { Month } from "@/generated/prisma/client";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth, requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  const VALID_MONTHS: Month[] = [
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
  ];

  function isValidMonthArray(value: unknown): value is Month[] {
    if (!Array.isArray(value) || value.length === 0) return false;
    return value.every((v) => VALID_MONTHS.includes(v as Month));
  }

  async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const serviceFee = await prisma.serviceFee.findUnique({
      where: { id },
      include: {
        classAcademic: {
          select: {
            id: true,
            className: true,
            grade: true,
            section: true,
            academicYear: { select: { id: true, year: true } },
          },
        },
        _count: { select: { bills: true } },
      },
    });

    if (!serviceFee) {
      return errorResponse("Service fee not found", "NOT_FOUND", 404);
    }

    return successResponse(serviceFee);
  }

  async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const existing = await prisma.serviceFee.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse("Service fee not found", "NOT_FOUND", 404);
      }

      const body = await request.json();
      const { name, amount, billingMonths, isActive } = body as {
        name?: string;
        amount?: string | number;
        billingMonths?: unknown;
        isActive?: boolean;
      };

      const data: Record<string, unknown> = {};

      if (name !== undefined) data.name = name;

      if (amount !== undefined) {
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount < 0) {
          return errorResponse(
            "amount must be a non-negative number",
            "VALIDATION_ERROR",
            400,
          );
        }
        data.amount = numericAmount;
      }

      if (billingMonths !== undefined) {
        if (!isValidMonthArray(billingMonths)) {
          return errorResponse(
            "billingMonths must be a non-empty array of Month enum values",
            "VALIDATION_ERROR",
            400,
          );
        }
        data.billingMonths = billingMonths;
      }

      if (isActive !== undefined) data.isActive = isActive;

      const updated = await prisma.serviceFee.update({
        where: { id },
        data,
        include: {
          classAcademic: {
            select: {
              id: true,
              className: true,
              grade: true,
              section: true,
              academicYear: { select: { id: true, year: true } },
            },
          },
        },
      });

      return successResponse(updated);
    } catch (error) {
      console.error("Update service fee error:", error);
      return errorResponse(
        "Failed to update service fee",
        "SERVER_ERROR",
        500,
      );
    }
  }

  async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const serviceFee = await prisma.serviceFee.findUnique({
        where: { id },
        include: { _count: { select: { bills: true } } },
      });

      if (!serviceFee) {
        return errorResponse("Service fee not found", "NOT_FOUND", 404);
      }

      if (serviceFee._count.bills > 0) {
        return errorResponse(
          "Cannot delete service fee with existing bills. Set isActive=false instead.",
          "CONFLICT",
          409,
        );
      }

      await prisma.serviceFee.delete({ where: { id } });

      return successResponse({ message: "Service fee deleted" });
    } catch (error) {
      console.error("Delete service fee error:", error);
      return errorResponse(
        "Failed to delete service fee",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ GET, PATCH, DELETE });
  ```

- [ ] **Step 10.3: Run `pnpm lint && pnpm type-check`.**

- [ ] **Step 10.4: Commit.**

  ```
  git add src/pages/api/v1/service-fees/
  git commit -m "feat(api): service-fees CRUD endpoints"
  ```

---

### Task 11: Service fee bill endpoints + generation

- [ ] **Step 11.1: Create `src/pages/api/v1/service-fee-bills/index.ts` (GET list).**

  File: `src/pages/api/v1/service-fee-bills/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import type { Prisma } from "@/generated/prisma/client";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth } from "@/lib/api-auth";
  import { successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const studentNis = searchParams.get("studentNis") || undefined;
    const classAcademicId =
      searchParams.get("classAcademicId") || undefined;
    const serviceFeeId = searchParams.get("serviceFeeId") || undefined;
    const periodParam = searchParams.get("period");
    const period =
      periodParam && periodParam !== "null" ? periodParam : undefined;
    const year = searchParams.get("year")
      ? Number(searchParams.get("year"))
      : undefined;
    const statusParam = searchParams.get("status");
    const status =
      statusParam && statusParam !== "null" ? statusParam : undefined;

    const where: Prisma.ServiceFeeBillWhereInput = {};
    if (studentNis) where.studentNis = studentNis;
    if (classAcademicId) where.classAcademicId = classAcademicId;
    if (serviceFeeId) where.serviceFeeId = serviceFeeId;
    if (period) where.period = period;
    if (year) where.year = year;
    if (status) {
      where.status = status as "UNPAID" | "PAID" | "PARTIAL" | "VOID";
    }

    const [bills, total] = await Promise.all([
      prisma.serviceFeeBill.findMany({
        where,
        include: {
          serviceFee: {
            select: { id: true, name: true },
          },
          student: {
            select: { nis: true, name: true, parentPhone: true },
          },
          classAcademic: {
            select: {
              id: true,
              className: true,
              grade: true,
              section: true,
            },
          },
          _count: { select: { payments: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { year: "desc" },
          { period: "desc" },
          { student: { name: "asc" } },
        ],
      }),
      prisma.serviceFeeBill.count({ where }),
    ]);

    return successResponse({
      bills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  export default createApiHandler({ GET });
  ```

- [ ] **Step 11.2: Create `src/pages/api/v1/service-fee-bills/[id]/index.ts` (GET + DELETE).**

  File: `src/pages/api/v1/service-fee-bills/[id]/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth, requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const bill = await prisma.serviceFeeBill.findUnique({
      where: { id },
      include: {
        serviceFee: {
          select: { id: true, name: true, amount: true },
        },
        student: {
          select: {
            nis: true,
            name: true,
            parentName: true,
            parentPhone: true,
          },
        },
        classAcademic: {
          select: {
            id: true,
            className: true,
            grade: true,
            section: true,
            academicYear: { select: { id: true, year: true } },
          },
        },
        payments: {
          include: { employee: { select: { name: true } } },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!bill) {
      return errorResponse("Service fee bill not found", "NOT_FOUND", 404);
    }

    return successResponse(bill);
  }

  async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    try {
      const bill = await prisma.serviceFeeBill.findUnique({
        where: { id },
        include: { _count: { select: { payments: true } } },
      });

      if (!bill) {
        return errorResponse(
          "Service fee bill not found",
          "NOT_FOUND",
          404,
        );
      }

      if (bill.status !== "UNPAID" || bill._count.payments > 0) {
        return errorResponse(
          "Cannot delete a bill with payments or non-UNPAID status",
          "CONFLICT",
          409,
        );
      }

      await prisma.serviceFeeBill.delete({ where: { id } });

      return successResponse({ message: "Service fee bill deleted" });
    } catch (error) {
      console.error("Delete service fee bill error:", error);
      return errorResponse(
        "Failed to delete service fee bill",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ GET, DELETE });
  ```

- [ ] **Step 11.3: Create `src/pages/api/v1/service-fee-bills/generate/index.ts` (POST targeted).**

  File: `src/pages/api/v1/service-fee-bills/generate/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { generateServiceFeeBills } from "@/lib/business-logic/service-fee-bills";

  async function POST(request: NextRequest) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    try {
      const body = await request.json();
      const { classAcademicId, period, year } = body as {
        classAcademicId?: string;
        period?: string;
        year?: number;
      };

      if (!period || !year) {
        return errorResponse(
          "period and year are required",
          "VALIDATION_ERROR",
          400,
        );
      }

      const result = await generateServiceFeeBills({
        classAcademicId,
        period,
        year: Number(year),
      });

      return successResponse(result);
    } catch (error) {
      console.error("Generate service fee bills error:", error);
      return errorResponse(
        "Failed to generate service fee bills",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ POST });
  ```

- [ ] **Step 11.4: Create `src/pages/api/v1/service-fee-bills/generate-all/index.ts` (POST primary).**

  File: `src/pages/api/v1/service-fee-bills/generate-all/index.ts`

  ```ts
  import type { NextRequest } from "next/server";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireRole } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { generateAllServiceFeeBills } from "@/lib/business-logic/service-fee-bills";

  async function POST(request: NextRequest) {
    const auth = await requireRole(request, ["ADMIN"]);
    if (auth instanceof Response) return auth;

    try {
      const body = await request.json().catch(() => ({}));
      const { academicYearId } = body as { academicYearId?: string };

      const result = await generateAllServiceFeeBills({ academicYearId });

      return successResponse(result);
    } catch (error) {
      console.error("Generate-all service fee bills error:", error);
      return errorResponse(
        "Failed to generate service fee bills",
        "SERVER_ERROR",
        500,
      );
    }
  }

  export default createApiHandler({ POST });
  ```

- [ ] **Step 11.5: Run `pnpm lint && pnpm type-check`.**

- [ ] **Step 11.6: Manual smoke test (dev server running).**

  With a valid ADMIN cookie, verify each endpoint responds with 200/201/409 as expected:

  ```
  # list fee services
  curl -s -b "token=$ADMIN_TOKEN" \
    "http://localhost:3000/api/v1/fee-services?page=1&limit=5" | jq

  # generate-all fee bills for active AY
  curl -s -X POST -b "token=$ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' \
    http://localhost:3000/api/v1/fee-bills/generate-all | jq

  # generate-all service fee bills
  curl -s -X POST -b "token=$ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' \
    http://localhost:3000/api/v1/service-fee-bills/generate-all | jq
  ```

- [ ] **Step 11.7: Commit.**

  ```
  git add src/pages/api/v1/service-fee-bills/
  git commit -m "feat(api): service-fee-bills endpoints + generation"
  ```
# Chunk C — Phase 4: Payment polymorphism + online payment + hooks (Tasks 12–19)

Conventions:
- Every task ends with `pnpm lint && pnpm type-check` and a single `git commit`.
- No test framework. Verification is lint + type-check + manual steps noted per task.
- Prisma types come from `@/generated/prisma/client`. `Prisma.Decimal` is the decimal helper.
- All code blocks are complete and ready to paste (no `...` elisions).

Assumes chunks A–B are landed:
- `Payment` has nullable `tuitionId` and added `feeBillId`, `serviceFeeBillId`, `transactionId` columns.
- `OnlinePaymentItem` has the same polymorphic shape.
- `FeeService`, `FeeServicePrice`, `FeeSubscription`, `FeeBill`, `ServiceFee`, `ServiceFeeBill` Prisma models exist.
- `src/lib/business-logic/payment-items.ts` exports `assertSingleBillTarget`.
- `src/lib/business-logic/fee-bills.ts` exports `applyFeeBillPayment(prisma, feeBillId, paymentAmount)` (and `reverseFeeBillPayment`).
- `src/lib/business-logic/service-fee-bills.ts` exports `applyServiceFeeBillPayment` / `reverseServiceFeeBillPayment`.
- `src/lib/business-logic/payment-processor.ts` still exposes `processPayment` for a single tuition item (we will call it per-item from the new POST).

If any of the above helpers do not exist yet, pause and add a thin wrapper before starting Task 12 — they are expected from earlier chunks.

---

## Task 12 — Extend `POST /api/v1/payments` to accept mixed bill items

**Files:**
- Modify: `src/pages/api/v1/payments/index.ts`
- Modify (if present): `src/lib/validations/schemas/payment.schema.ts` (or wherever `paymentSchema` lives — grep first)
- Touch: `src/lib/validations/index.ts` (re-exports)

### Steps

- [ ] **Step 1: Grep for the current payment schema and all single-tuition callers.**
  ```bash
  rg -n "paymentSchema" src/lib/validations
  rg -n "apiClient\.post\(\"/payments\"" src
  rg -n "processPayment\(" src
  ```
  Expect hits in `src/hooks/api/usePayments.ts` (`useCreatePayment`) and possibly `src/pages/admin/payments/new.tsx` / cashier modal. Note every caller; they will be updated in Task 18.

- [ ] **Step 2: Replace the payment schema with the new mixed-items shape.**
  Edit `src/lib/validations/schemas/payment.schema.ts`:
  ```ts
  import { z } from "zod";

  const decimalString = z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "invalid decimal");

  export const paymentItemSchema = z
    .object({
      tuitionId: z.string().uuid().optional(),
      feeBillId: z.string().uuid().optional(),
      serviceFeeBillId: z.string().uuid().optional(),
      amount: decimalString,
      scholarshipAmount: decimalString.optional(),
    })
    .superRefine((item, ctx) => {
      const set = [item.tuitionId, item.feeBillId, item.serviceFeeBillId].filter(
        Boolean,
      );
      if (set.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exactly one of tuitionId, feeBillId, serviceFeeBillId required",
        });
      }
      if (item.scholarshipAmount && !item.tuitionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scholarshipAmount"],
          message: "scholarshipAmount only valid with tuitionId",
        });
      }
    });

  export const paymentSchema = z.object({
    studentNis: z.string().min(1),
    paymentDate: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
    items: z.array(paymentItemSchema).min(1).max(50),
  });

  export type PaymentInput = z.infer<typeof paymentSchema>;
  export type PaymentItemInput = z.infer<typeof paymentItemSchema>;
  ```
  Make sure `src/lib/validations/index.ts` still re-exports `paymentSchema`.

- [ ] **Step 3: Rewrite `POST` in `src/pages/api/v1/payments/index.ts`.**
  Full replacement for the existing `POST` function (keep the `GET` function unchanged except widening `studentNis`/`classAcademicId` filters if you choose — deferred to Task 13 scope). The new `POST`:

  ```ts
  async function POST(request: NextRequest) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const t = await getServerT(request);
    try {
      const body = await request.json();
      const parsed = await parseWithLocale(paymentSchema, body, request);
      if (!parsed.success) return parsed.response;

      const { studentNis, paymentDate, notes, items } = parsed.data;

      // Invariant check (belt + suspenders over the zod superRefine)
      for (const item of items) {
        assertSingleBillTarget({
          tuitionId: item.tuitionId ?? null,
          feeBillId: item.feeBillId ?? null,
          serviceFeeBillId: item.serviceFeeBillId ?? null,
        });
      }

      // Verify each bill exists & belongs to the student before opening the tx
      const tuitionIds = items.map((i) => i.tuitionId).filter(Boolean) as string[];
      const feeBillIds = items.map((i) => i.feeBillId).filter(Boolean) as string[];
      const serviceFeeBillIds = items
        .map((i) => i.serviceFeeBillId)
        .filter(Boolean) as string[];

      const [tuitions, feeBills, serviceFeeBills] = await Promise.all([
        tuitionIds.length
          ? prisma.tuition.findMany({ where: { id: { in: tuitionIds } } })
          : Promise.resolve([]),
        feeBillIds.length
          ? prisma.feeBill.findMany({ where: { id: { in: feeBillIds } } })
          : Promise.resolve([]),
        serviceFeeBillIds.length
          ? prisma.serviceFeeBill.findMany({
              where: { id: { in: serviceFeeBillIds } },
            })
          : Promise.resolve([]),
      ]);

      const tuitionMap = new Map(tuitions.map((x) => [x.id, x]));
      const feeBillMap = new Map(feeBills.map((x) => [x.id, x]));
      const serviceFeeBillMap = new Map(serviceFeeBills.map((x) => [x.id, x]));

      for (const item of items) {
        if (item.tuitionId) {
          const row = tuitionMap.get(item.tuitionId);
          if (!row)
            return errorResponse(
              t("api.notFound", { resource: "Tuition" }),
              "NOT_FOUND",
              404,
            );
          if (row.studentNis !== studentNis)
            return errorResponse(
              "Bill does not belong to student",
              "VALIDATION_ERROR",
              400,
            );
          if (row.status === "PAID")
            return errorResponse(
              t("api.tuitionFullyPaid"),
              "VALIDATION_ERROR",
              400,
            );
        } else if (item.feeBillId) {
          const row = feeBillMap.get(item.feeBillId);
          if (!row)
            return errorResponse(
              t("api.notFound", { resource: "FeeBill" }),
              "NOT_FOUND",
              404,
            );
          if (row.studentNis !== studentNis)
            return errorResponse(
              "Bill does not belong to student",
              "VALIDATION_ERROR",
              400,
            );
          if (row.status === "PAID")
            return errorResponse(
              "Fee bill already fully paid",
              "VALIDATION_ERROR",
              400,
            );
        } else if (item.serviceFeeBillId) {
          const row = serviceFeeBillMap.get(item.serviceFeeBillId);
          if (!row)
            return errorResponse(
              t("api.notFound", { resource: "ServiceFeeBill" }),
              "NOT_FOUND",
              404,
            );
          if (row.studentNis !== studentNis)
            return errorResponse(
              "Bill does not belong to student",
              "VALIDATION_ERROR",
              400,
            );
          if (row.status === "PAID")
            return errorResponse(
              "Service fee bill already fully paid",
              "VALIDATION_ERROR",
              400,
            );
        }
      }

      const transactionId = crypto.randomUUID();
      const paymentDateValue = paymentDate ? new Date(paymentDate) : new Date();

      const createdPayments = await prisma.$transaction(async (tx) => {
        const results: Array<{ id: string }> = [];

        for (const item of items) {
          const amountDec = new Prisma.Decimal(item.amount);
          const scholarshipDec = item.scholarshipAmount
            ? new Prisma.Decimal(item.scholarshipAmount)
            : new Prisma.Decimal(0);

          if (item.tuitionId) {
            // Delegate to existing tuition processor for discount/scholarship math.
            const res = await processPayment(
              {
                tuitionId: item.tuitionId,
                amount: Number(amountDec),
                employeeId: auth.employeeId,
                notes,
              },
              tx,
            );
            // Stamp transactionId + paymentDate after processPayment created the row.
            await tx.payment.update({
              where: { id: res.paymentId },
              data: { transactionId, paymentDate: paymentDateValue },
            });
            results.push({ id: res.paymentId });
          } else if (item.feeBillId) {
            const payment = await tx.payment.create({
              data: {
                feeBillId: item.feeBillId,
                employeeId: auth.employeeId,
                amount: amountDec,
                scholarshipAmount: new Prisma.Decimal(0),
                paymentDate: paymentDateValue,
                notes,
                transactionId,
              },
            });
            await applyFeeBillPayment(tx, item.feeBillId, amountDec);
            results.push({ id: payment.id });
          } else if (item.serviceFeeBillId) {
            const payment = await tx.payment.create({
              data: {
                serviceFeeBillId: item.serviceFeeBillId,
                employeeId: auth.employeeId,
                amount: amountDec,
                scholarshipAmount: new Prisma.Decimal(0),
                paymentDate: paymentDateValue,
                notes,
                transactionId,
              },
            });
            await applyServiceFeeBillPayment(tx, item.serviceFeeBillId, amountDec);
            results.push({ id: payment.id });
          }
        }

        return results;
      });

      const payments = await prisma.payment.findMany({
        where: { id: { in: createdPayments.map((p) => p.id) } },
        include: {
          tuition: {
            include: {
              student: { select: { nis: true, name: true } },
              classAcademic: { select: { className: true } },
              discount: {
                select: {
                  name: true,
                  reason: true,
                  description: true,
                  targetPeriods: true,
                },
              },
            },
          },
          feeBill: {
            include: {
              feeService: { select: { id: true, name: true, category: true } },
              student: { select: { nis: true, name: true } },
            },
          },
          serviceFeeBill: {
            include: {
              serviceFee: { select: { id: true, name: true } },
              student: { select: { nis: true, name: true } },
              classAcademic: { select: { className: true } },
            },
          },
          employee: { select: { employeeId: true, name: true } },
        },
      });

      return successResponse({ transactionId, payments }, 201);
    } catch (error) {
      console.error("Create payment error:", error);
      if (error instanceof Error) {
        return errorResponse(error.message, "VALIDATION_ERROR", 400);
      }
      return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
    }
  }
  ```

- [ ] **Step 4: Update the imports block at the top of `src/pages/api/v1/payments/index.ts`.**
  Replace imports with:
  ```ts
  import type { NextRequest } from "next/server";
  import { Prisma } from "@/generated/prisma/client";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth } from "@/lib/api-auth";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import { applyFeeBillPayment } from "@/lib/business-logic/fee-bills";
  import { assertSingleBillTarget } from "@/lib/business-logic/payment-items";
  import { processPayment } from "@/lib/business-logic/payment-processor";
  import { applyServiceFeeBillPayment } from "@/lib/business-logic/service-fee-bills";
  import { getServerT } from "@/lib/i18n-server";
  import { prisma } from "@/lib/prisma";
  import { paymentSchema } from "@/lib/validations";
  import { parseWithLocale } from "@/lib/validations/parse-with-locale";
  ```
  Note: `Prisma.PaymentWhereInput` in the existing `GET` still works — no change needed there unless you opt to widen filters (handled in Task 13).

- [ ] **Step 5: Verify.**
  ```bash
  pnpm lint && pnpm type-check
  ```
  Manual sanity check via curl:
  ```bash
  # should 400 — both ids set
  curl -X POST http://localhost:3000/api/v1/payments \
    -H 'Content-Type: application/json' \
    --cookie "token=…" \
    -d '{"studentNis":"123","items":[{"tuitionId":"u","feeBillId":"u","amount":"100"}]}'
  ```

- [ ] **Step 6: Commit.**
  ```bash
  git add src/pages/api/v1/payments/index.ts src/lib/validations/schemas/payment.schema.ts
  git commit -m "feat(payments): accept mixed tuition/fee/service-fee items in POST /payments

Body shape is now { studentNis, paymentDate?, notes?, items: [...] }. Each
item carries exactly one of tuitionId/feeBillId/serviceFeeBillId plus an
amount; a single transactionId stamps every Payment row so the receipt can
group them. Tuition items delegate to processPayment for discount /
scholarship math; fee and service-fee items call the new bill helpers.
Callers will be updated in a follow-up task."
  ```

---

## Task 13 — Extend `GET /api/v1/payments/print` to include fee bills

**Files:**
- Modify: `src/pages/api/v1/payments/print/index.ts`

### Steps

- [ ] **Step 1: Rewrite the `where` builder so it does not require a Tuition relation.**
  Replace the whole file with:
  ```ts
  import type { NextRequest } from "next/server";
  import type { Prisma } from "@/generated/prisma/client";
  import { createApiHandler } from "@/lib/api-adapter";
  import { requireAuth } from "@/lib/api-auth";
  import { successResponse } from "@/lib/api-response";
  import { prisma } from "@/lib/prisma";

  async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const academicYearId = searchParams.get("academicYearId");
    const mode = searchParams.get("mode") || "today"; // "today" | "all" | "student"
    const studentNis = searchParams.get("studentNis");

    const where: Prisma.PaymentWhereInput = {};
    const andClauses: Prisma.PaymentWhereInput[] = [];

    // Student filter (reprint of lost slip) — match via any of the three FKs.
    if (mode === "student" && studentNis) {
      andClauses.push({
        OR: [
          { tuition: { studentNis } },
          { feeBill: { studentNis } },
          { serviceFeeBill: { studentNis } },
        ],
      });
    }

    // Academic-year filter — may combine with student filter.
    if (academicYearId) {
      andClauses.push({
        OR: [
          { tuition: { classAcademic: { academicYearId } } },
          { feeBill: { feeService: { academicYearId } } },
          { serviceFeeBill: { classAcademic: { academicYearId } } },
        ],
      });
    }

    // Filter for today only (not applicable in student mode).
    if (mode === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      where.paymentDate = { gte: todayStart, lte: todayEnd };
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        tuition: {
          include: {
            student: {
              select: { nis: true, name: true, parentName: true },
            },
            classAcademic: {
              select: {
                className: true,
                academicYear: { select: { year: true } },
              },
            },
          },
        },
        feeBill: {
          include: {
            feeService: {
              select: {
                id: true,
                name: true,
                category: true,
                academicYear: { select: { year: true } },
              },
            },
            student: {
              select: { nis: true, name: true, parentName: true },
            },
          },
        },
        serviceFeeBill: {
          include: {
            serviceFee: { select: { id: true, name: true } },
            student: {
              select: { nis: true, name: true, parentName: true },
            },
            classAcademic: {
              select: {
                className: true,
                academicYear: { select: { year: true } },
              },
            },
          },
        },
        employee: { select: { name: true } },
      },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
    });

    return successResponse({ payments });
  }

  export default createApiHandler({ GET });
  ```
  Rationale: the old filter forced `where.tuition = { ... }`, excluding fee/service payments. We now combine filters as `AND[OR[...]]` so the print endpoint surfaces every bill type.

- [ ] **Step 2: Verify.**
  ```bash
  pnpm lint && pnpm type-check
  ```
  Manual: open `/admin/payments/print` in student mode for a student that has both tuition and (post-Chunk-A seed) fee bills; ensure both line types appear.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/pages/api/v1/payments/print/index.ts
  git commit -m "feat(payments): include fee + service-fee bills in /payments/print

Filters now combine as AND of ORs across the three polymorphic FKs so that
reprint/today/year views expose every payment type, not just tuition rows."
  ```

---

## Task 14 — Extend `POST /api/v1/student/online-payments` for mixed items

**Files:**
- Modify: `src/lib/business-logic/online-payment-processor.ts`
- Modify: `src/lib/validations/schemas/online-payment.schema.ts`
- Modify: `src/pages/api/v1/student/online-payments/index.ts`
- Modify: `src/pages/api/v1/midtrans/notification/index.ts`

Context: the portal endpoint lives at `src/pages/api/v1/student/online-payments/index.ts` (found via `rg "student/online-payments"`). Midtrans webhook is `src/pages/api/v1/midtrans/notification/index.ts`.

### Steps

- [ ] **Step 1: Grep first — confirm file locations and current shape.**
  ```bash
  rg -n "createOnlinePayment\(" src
  rg -n "OnlinePaymentItem" src
  rg -n "MidtransStatus|notification" src/pages/api/v1/midtrans
  ```
  Note every caller site; the portal UI hook (`useOnlinePayments.ts`) currently posts `{ tuitionIds }`.

- [ ] **Step 2: Update the request schema.**
  Replace `createOnlinePaymentSchema` in `src/lib/validations/schemas/online-payment.schema.ts` with:
  ```ts
  import { z } from "zod";

  export const onlinePaymentItemSchema = z
    .object({
      tuitionId: z.string().uuid().optional(),
      feeBillId: z.string().uuid().optional(),
      serviceFeeBillId: z.string().uuid().optional(),
    })
    .superRefine((item, ctx) => {
      const set = [item.tuitionId, item.feeBillId, item.serviceFeeBillId].filter(
        Boolean,
      );
      if (set.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exactly one of tuitionId, feeBillId, serviceFeeBillId required",
        });
      }
    });

  export const createOnlinePaymentSchema = z.object({
    items: z.array(onlinePaymentItemSchema).min(1).max(50),
  });

  export type CreateOnlinePaymentInput = z.infer<typeof createOnlinePaymentSchema>;
  export type OnlinePaymentItemInput = z.infer<typeof onlinePaymentItemSchema>;
  ```

- [ ] **Step 3: Rewrite `createOnlinePayment` in `src/lib/business-logic/online-payment-processor.ts`.**
  Key changes:
  - Signature accepts `items: OnlinePaymentItemInput[]` instead of `tuitionIds`.
  - Load each bill type, verify it belongs to `studentNis`, unpaid, compute remaining.
  - Build Midtrans `item_details` with labels: Tuition → `SPP <period> <year>`, FeeBill → `<feeService.name> <period>`, ServiceFeeBill → `<serviceFee.name> <period>`.
  - Persist `OnlinePaymentItem` rows with the relevant FK set + `assertSingleBillTarget` invariant check.

  Concrete replacement (paste over the existing function body; keep Midtrans client + env reads):
  ```ts
  import { Prisma, type PaymentStatus } from "@/generated/prisma/client";
  import { assertSingleBillTarget } from "@/lib/business-logic/payment-items";
  // ...keep existing imports (midtrans snap client, etc.)

  type InputItem =
    | { tuitionId: string; feeBillId?: never; serviceFeeBillId?: never }
    | { feeBillId: string; tuitionId?: never; serviceFeeBillId?: never }
    | { serviceFeeBillId: string; tuitionId?: never; feeBillId?: never };

  interface CreateOnlinePaymentArgs {
    studentNis: string;
    items: InputItem[];
  }

  const MONTH_LABEL: Record<string, string> = {
    JANUARY: "Jan", FEBRUARY: "Feb", MARCH: "Mar", APRIL: "Apr",
    MAY: "May", JUNE: "Jun", JULY: "Jul", AUGUST: "Aug",
    SEPTEMBER: "Sep", OCTOBER: "Oct", NOVEMBER: "Nov", DECEMBER: "Dec",
  };

  function periodLabel(period: string, year: number): string {
    return `${MONTH_LABEL[period] ?? period} ${year}`;
  }

  export async function createOnlinePayment(
    args: CreateOnlinePaymentArgs,
    prisma: Prisma.TransactionClient | typeof import("@/lib/prisma").prisma,
  ) {
    const { studentNis, items } = args;

    for (const item of items) {
      assertSingleBillTarget({
        tuitionId: item.tuitionId ?? null,
        feeBillId: item.feeBillId ?? null,
        serviceFeeBillId: item.serviceFeeBillId ?? null,
      });
    }

    // Load all bills, enforce ownership + unpaid
    const tuitionIds = items.map((i) => i.tuitionId).filter(Boolean) as string[];
    const feeBillIds = items.map((i) => i.feeBillId).filter(Boolean) as string[];
    const serviceFeeBillIds = items
      .map((i) => i.serviceFeeBillId)
      .filter(Boolean) as string[];

    const [tuitions, feeBills, serviceFeeBills] = await Promise.all([
      tuitionIds.length
        ? prisma.tuition.findMany({
            where: { id: { in: tuitionIds }, studentNis },
            include: { classAcademic: true },
          })
        : Promise.resolve([]),
      feeBillIds.length
        ? prisma.feeBill.findMany({
            where: { id: { in: feeBillIds }, studentNis },
            include: { feeService: true },
          })
        : Promise.resolve([]),
      serviceFeeBillIds.length
        ? prisma.serviceFeeBill.findMany({
            where: { id: { in: serviceFeeBillIds }, studentNis },
            include: { serviceFee: true },
          })
        : Promise.resolve([]),
    ]);

    if (
      tuitions.length !== tuitionIds.length ||
      feeBills.length !== feeBillIds.length ||
      serviceFeeBills.length !== serviceFeeBillIds.length
    ) {
      throw new Error("One or more bills not found or not yours");
    }

    type Line = {
      id: string;
      price: number;
      quantity: 1;
      name: string;
      itemInput: {
        tuitionId?: string;
        feeBillId?: string;
        serviceFeeBillId?: string;
        amount: Prisma.Decimal;
      };
    };

    const lines: Line[] = [];

    for (const t of tuitions) {
      if ((t.status as PaymentStatus) === "PAID" || (t.status as PaymentStatus) === "VOID") {
        throw new Error(`Tuition ${t.id} not payable`);
      }
      const remaining = new Prisma.Decimal(t.feeAmount)
        .minus(t.scholarshipAmount)
        .minus(t.discountAmount)
        .minus(t.paidAmount);
      if (remaining.lte(0)) continue;
      lines.push({
        id: `TUI-${t.id}`,
        price: remaining.toNumber(),
        quantity: 1,
        name: `SPP ${periodLabel(t.period, t.year)}`,
        itemInput: { tuitionId: t.id, amount: remaining },
      });
    }

    for (const b of feeBills) {
      if ((b.status as PaymentStatus) === "PAID" || (b.status as PaymentStatus) === "VOID") {
        throw new Error(`Fee bill ${b.id} not payable`);
      }
      const remaining = new Prisma.Decimal(b.amount).minus(b.paidAmount);
      if (remaining.lte(0)) continue;
      lines.push({
        id: `FEE-${b.id}`,
        price: remaining.toNumber(),
        quantity: 1,
        name: `${b.feeService.name} ${periodLabel(b.period, b.year)}`,
        itemInput: { feeBillId: b.id, amount: remaining },
      });
    }

    for (const b of serviceFeeBills) {
      if ((b.status as PaymentStatus) === "PAID" || (b.status as PaymentStatus) === "VOID") {
        throw new Error(`Service fee bill ${b.id} not payable`);
      }
      const remaining = new Prisma.Decimal(b.amount).minus(b.paidAmount);
      if (remaining.lte(0)) continue;
      lines.push({
        id: `SVC-${b.id}`,
        price: remaining.toNumber(),
        quantity: 1,
        name: `${b.serviceFee.name} ${periodLabel(b.period, b.year)}`,
        itemInput: { serviceFeeBillId: b.id, amount: remaining },
      });
    }

    if (lines.length === 0) throw new Error("Nothing to pay");

    const grossAmount = lines.reduce((sum, l) => sum + l.price, 0);

    // …keep existing Midtrans snap invocation, passing item_details = lines,
    // gross_amount = grossAmount, and order_id = generated referenceId…
    // The rest of the existing function (persist OnlinePayment + items,
    // obtain snap token) stays the same except the child-item write now
    // uses itemInput fields:
    //
    //   items: {
    //     create: lines.map((l) => ({
    //       tuitionId: l.itemInput.tuitionId ?? null,
    //       feeBillId: l.itemInput.feeBillId ?? null,
    //       serviceFeeBillId: l.itemInput.serviceFeeBillId ?? null,
    //       amount: l.itemInput.amount,
    //     })),
    //   }
  }
  ```
  Keep the existing Midtrans token/persistence code; only the `lines` builder and the `OnlinePaymentItem` create shape change.

- [ ] **Step 4: Update the API route to pass `items` instead of `tuitionIds`.**
  In `src/pages/api/v1/student/online-payments/index.ts`, replace the `createOnlinePayment` call:
  ```ts
  const result = await createOnlinePayment(
    {
      studentNis: session.studentNis,
      items: parsed.data.items,
    },
    prisma,
  );
  ```
  Also widen the `GET` include block so the list view returns fee/service labels:
  ```ts
  include: {
    items: {
      include: {
        tuition: {
          select: {
            id: true,
            period: true,
            year: true,
            feeAmount: true,
            paidAmount: true,
            status: true,
            classAcademic: {
              select: {
                className: true,
                academicYear: { select: { year: true } },
              },
            },
          },
        },
        feeBill: {
          select: {
            id: true,
            period: true,
            year: true,
            amount: true,
            paidAmount: true,
            status: true,
            feeService: { select: { id: true, name: true, category: true } },
          },
        },
        serviceFeeBill: {
          select: {
            id: true,
            period: true,
            year: true,
            amount: true,
            paidAmount: true,
            status: true,
            serviceFee: { select: { id: true, name: true } },
            classAcademic: { select: { className: true } },
          },
        },
      },
    },
  },
  ```

- [ ] **Step 5: Extend the Midtrans notification handler.**
  In `src/pages/api/v1/midtrans/notification/index.ts`, find the settlement/capture branch that currently iterates `onlinePayment.items` and applies payment to `tuition` only. Replace the per-item loop with:
  ```ts
  for (const item of onlinePayment.items) {
    assertSingleBillTarget({
      tuitionId: item.tuitionId,
      feeBillId: item.feeBillId,
      serviceFeeBillId: item.serviceFeeBillId,
    });

    const amount = new Prisma.Decimal(item.amount);
    const paymentData = {
      employeeId: null, // online payments have no cashier
      amount,
      scholarshipAmount: new Prisma.Decimal(0),
      paymentDate: settlementDate,
      notes: `Online payment ${onlinePayment.referenceId}`,
      transactionId: onlinePayment.id,
    } satisfies Prisma.PaymentUncheckedCreateInput extends infer T
      ? Omit<Prisma.PaymentUncheckedCreateInput, "tuitionId" | "feeBillId" | "serviceFeeBillId">
      : never;

    if (item.tuitionId) {
      await tx.payment.create({
        data: { ...paymentData, tuitionId: item.tuitionId },
      });
      await applyTuitionPayment(tx, item.tuitionId, amount); // existing helper
    } else if (item.feeBillId) {
      await tx.payment.create({
        data: { ...paymentData, feeBillId: item.feeBillId },
      });
      await applyFeeBillPayment(tx, item.feeBillId, amount);
    } else if (item.serviceFeeBillId) {
      await tx.payment.create({
        data: { ...paymentData, serviceFeeBillId: item.serviceFeeBillId },
      });
      await applyServiceFeeBillPayment(tx, item.serviceFeeBillId, amount);
    }
  }
  ```
  If a cashier employee FK is required by the schema, create a dedicated `SYSTEM` employee row in the seed (Chunk A) and reference it here instead of `null`.

  Also extend the cancel/deny/refund branches: when reversing, call `reverseFeeBillPayment` / `reverseServiceFeeBillPayment` symmetrically.

- [ ] **Step 6: Verify.**
  ```bash
  pnpm lint && pnpm type-check
  ```
  Manual: from the portal, start a snap transaction that mixes one tuition + one fee bill; simulate settlement via the Midtrans sandbox; confirm both bills flip to `PAID`.

- [ ] **Step 7: Commit.**
  ```bash
  git add src/lib/validations/schemas/online-payment.schema.ts \
          src/lib/business-logic/online-payment-processor.ts \
          src/pages/api/v1/student/online-payments/index.ts \
          src/pages/api/v1/midtrans/notification/index.ts
  git commit -m "feat(online-payments): accept mixed bill items end-to-end

Portal POST now takes items[] with tuitionId|feeBillId|serviceFeeBillId;
Midtrans item_details labels each line by bill type. The notification
webhook fans out settlement to the matching bill-type helper, keeping
paid/partial state consistent across polymorphic Payment rows."
  ```

---

## Task 15 — Extend the query-key factory

**Files:**
- Modify: `src/lib/query-keys.ts`

### Steps

- [ ] **Step 1: Add the filter interfaces near the existing ones (top of the file, above `export const queryKeys`).**
  ```ts
  export interface FeeServiceFilters {
    page?: number;
    limit?: number;
    academicYearId?: string;
    category?: "TRANSPORT" | "ACCOMMODATION";
    isActive?: boolean;
    search?: string;
  }

  export interface FeeSubscriptionFilters {
    page?: number;
    limit?: number;
    studentNis?: string;
    feeServiceId?: string;
    active?: boolean;
  }

  export interface FeeBillFilters {
    page?: number;
    limit?: number;
    studentNis?: string;
    feeServiceId?: string;
    period?: string;
    year?: number;
    status?: "UNPAID" | "PARTIAL" | "PAID" | "VOID";
  }

  export interface ServiceFeeFilters {
    page?: number;
    limit?: number;
    classAcademicId?: string;
    isActive?: boolean;
    search?: string;
  }

  export interface ServiceFeeBillFilters {
    page?: number;
    limit?: number;
    studentNis?: string;
    classAcademicId?: string;
    serviceFeeId?: string;
    period?: string;
    year?: number;
    status?: "UNPAID" | "PARTIAL" | "PAID" | "VOID";
  }
  ```

- [ ] **Step 2: Add the factory blocks inside `export const queryKeys = { ... }`.** Insert after `discounts`:
  ```ts
    feeServices: {
      all: ["fee-services"] as const,
      lists: () => [...queryKeys.feeServices.all, "list"] as const,
      list: (filters: FeeServiceFilters) =>
        [...queryKeys.feeServices.lists(), filters] as const,
      details: () => [...queryKeys.feeServices.all, "detail"] as const,
      detail: (id: string) => [...queryKeys.feeServices.details(), id] as const,
      prices: (id: string) =>
        [...queryKeys.feeServices.detail(id), "prices"] as const,
    },

    feeSubscriptions: {
      all: ["fee-subscriptions"] as const,
      lists: () => [...queryKeys.feeSubscriptions.all, "list"] as const,
      list: (filters: FeeSubscriptionFilters) =>
        [...queryKeys.feeSubscriptions.lists(), filters] as const,
      details: () => [...queryKeys.feeSubscriptions.all, "detail"] as const,
      detail: (id: string) =>
        [...queryKeys.feeSubscriptions.details(), id] as const,
    },

    feeBills: {
      all: ["fee-bills"] as const,
      lists: () => [...queryKeys.feeBills.all, "list"] as const,
      list: (filters: FeeBillFilters) =>
        [...queryKeys.feeBills.lists(), filters] as const,
      details: () => [...queryKeys.feeBills.all, "detail"] as const,
      detail: (id: string) => [...queryKeys.feeBills.details(), id] as const,
      byStudent: (nis: string) =>
        [...queryKeys.feeBills.all, "by-student", nis] as const,
    },

    serviceFees: {
      all: ["service-fees"] as const,
      lists: () => [...queryKeys.serviceFees.all, "list"] as const,
      list: (filters: ServiceFeeFilters) =>
        [...queryKeys.serviceFees.lists(), filters] as const,
      details: () => [...queryKeys.serviceFees.all, "detail"] as const,
      detail: (id: string) => [...queryKeys.serviceFees.details(), id] as const,
    },

    serviceFeeBills: {
      all: ["service-fee-bills"] as const,
      lists: () => [...queryKeys.serviceFeeBills.all, "list"] as const,
      list: (filters: ServiceFeeBillFilters) =>
        [...queryKeys.serviceFeeBills.lists(), filters] as const,
      details: () => [...queryKeys.serviceFeeBills.all, "detail"] as const,
      detail: (id: string) =>
        [...queryKeys.serviceFeeBills.details(), id] as const,
      byStudent: (nis: string) =>
        [...queryKeys.serviceFeeBills.all, "by-student", nis] as const,
    },
  ```

- [ ] **Step 3: Verify + commit.**
  ```bash
  pnpm lint && pnpm type-check
  git add src/lib/query-keys.ts
  git commit -m "feat(query-keys): add fee-service, subscription, bill, and service-fee families"
  ```

---

## Task 16 — `useFeeServices` + `useFeeServicePrices` hooks

**Files:**
- Create: `src/hooks/api/useFeeServices.ts`
- Create: `src/hooks/api/useFeeServicePrices.ts`

### Steps

- [ ] **Step 1: Write `src/hooks/api/useFeeServices.ts`.**
  ```ts
  "use client";

  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
  import { apiClient } from "@/lib/api-client";
  import { type FeeServiceFilters, queryKeys } from "@/lib/query-keys";

  export interface FeeService {
    id: string;
    academicYearId: string;
    category: "TRANSPORT" | "ACCOMMODATION";
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    academicYear?: { id: string; year: string };
    _count?: { prices: number; subscriptions: number };
  }

  interface FeeServiceListResponse {
    success: boolean;
    data: {
      feeServices: FeeService[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }

  interface FeeServiceResponse {
    success: boolean;
    data: FeeService;
  }

  export function useFeeServices(filters: FeeServiceFilters = {}) {
    return useQuery({
      queryKey: queryKeys.feeServices.list(filters),
      queryFn: async () => {
        const { data } = await apiClient.get<FeeServiceListResponse>(
          "/fee-services",
          {
            params: filters as Record<
              string,
              string | number | boolean | undefined
            >,
          },
        );
        return data.data;
      },
    });
  }

  export function useFeeService(id: string) {
    return useQuery({
      queryKey: queryKeys.feeServices.detail(id),
      queryFn: async () => {
        const { data } = await apiClient.get<FeeServiceResponse>(
          `/fee-services/${id}`,
        );
        return data.data;
      },
      enabled: !!id,
    });
  }

  interface CreateFeeServiceInput {
    academicYearId: string;
    category: "TRANSPORT" | "ACCOMMODATION";
    name: string;
    description?: string;
    isActive?: boolean;
    initialPrice?: { amount: string; effectiveFrom: string };
  }

  export function useCreateFeeService() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: CreateFeeServiceInput) => {
        const { data } = await apiClient.post<FeeServiceResponse>(
          "/fee-services",
          input,
        );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeServices.lists(),
        });
      },
    });
  }

  export function useUpdateFeeService() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({
        id,
        updates,
      }: {
        id: string;
        updates: Partial<Pick<FeeService, "name" | "description" | "isActive">>;
      }) => {
        const { data } = await apiClient.put<FeeServiceResponse>(
          `/fee-services/${id}`,
          updates,
        );
        return data.data;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeServices.lists(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeServices.detail(vars.id),
        });
      },
    });
  }

  export function useDeleteFeeService() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await apiClient.delete(`/fee-services/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeServices.lists(),
        });
      },
    });
  }
  ```

- [ ] **Step 2: Write `src/hooks/api/useFeeServicePrices.ts`.**
  ```ts
  "use client";

  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
  import { apiClient } from "@/lib/api-client";
  import { queryKeys } from "@/lib/query-keys";

  export interface FeeServicePrice {
    id: string;
    feeServiceId: string;
    amount: string;
    effectiveFrom: string;
    note: string | null;
    createdAt: string;
  }

  interface FeeServicePriceListResponse {
    success: boolean;
    data: { prices: FeeServicePrice[] };
  }

  interface FeeServicePriceResponse {
    success: boolean;
    data: FeeServicePrice;
  }

  export function useFeeServicePrices(feeServiceId: string) {
    return useQuery({
      queryKey: queryKeys.feeServices.prices(feeServiceId),
      queryFn: async () => {
        const { data } = await apiClient.get<FeeServicePriceListResponse>(
          `/fee-services/${feeServiceId}/prices`,
        );
        return data.data.prices;
      },
      enabled: !!feeServiceId,
    });
  }

  export function useAddFeeServicePrice(feeServiceId: string) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: {
        amount: string;
        effectiveFrom: string;
        note?: string;
      }) => {
        const { data } = await apiClient.post<FeeServicePriceResponse>(
          `/fee-services/${feeServiceId}/prices`,
          input,
        );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeServices.prices(feeServiceId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeServices.detail(feeServiceId),
        });
      },
    });
  }

  export function useDeleteFeeServicePrice(feeServiceId: string) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (priceId: string) => {
        await apiClient.delete(
          `/fee-services/${feeServiceId}/prices/${priceId}`,
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeServices.prices(feeServiceId),
        });
      },
    });
  }
  ```

- [ ] **Step 3: Verify + commit.**
  ```bash
  pnpm lint && pnpm type-check
  git add src/hooks/api/useFeeServices.ts src/hooks/api/useFeeServicePrices.ts
  git commit -m "feat(hooks): add useFeeServices and useFeeServicePrices"
  ```

---

## Task 17 — `useFeeSubscriptions` hook

**Files:**
- Create: `src/hooks/api/useFeeSubscriptions.ts`

### Steps

- [ ] **Step 1: Write the hook.**
  ```ts
  "use client";

  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
  import { apiClient } from "@/lib/api-client";
  import { type FeeSubscriptionFilters, queryKeys } from "@/lib/query-keys";

  export interface FeeSubscription {
    id: string;
    studentNis: string;
    feeServiceId: string;
    startDate: string;
    endDate: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    student?: { nis: string; name: string };
    feeService?: {
      id: string;
      name: string;
      category: "TRANSPORT" | "ACCOMMODATION";
    };
  }

  interface FeeSubscriptionListResponse {
    success: boolean;
    data: {
      subscriptions: FeeSubscription[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }

  interface FeeSubscriptionResponse {
    success: boolean;
    data: FeeSubscription;
  }

  export function useFeeSubscriptions(filters: FeeSubscriptionFilters = {}) {
    return useQuery({
      queryKey: queryKeys.feeSubscriptions.list(filters),
      queryFn: async () => {
        const { data } = await apiClient.get<FeeSubscriptionListResponse>(
          "/fee-subscriptions",
          {
            params: filters as Record<
              string,
              string | number | boolean | undefined
            >,
          },
        );
        return data.data;
      },
    });
  }

  export function useCreateFeeSubscription() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: {
        studentNis: string;
        feeServiceId: string;
        startDate: string;
        endDate?: string | null;
        notes?: string;
      }) => {
        const { data } = await apiClient.post<FeeSubscriptionResponse>(
          "/fee-subscriptions",
          input,
        );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeSubscriptions.lists(),
        });
      },
    });
  }

  export function useUpdateFeeSubscription() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({
        id,
        updates,
      }: {
        id: string;
        updates: { endDate?: string | null; notes?: string };
      }) => {
        const { data } = await apiClient.put<FeeSubscriptionResponse>(
          `/fee-subscriptions/${id}`,
          updates,
        );
        return data.data;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeSubscriptions.lists(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeSubscriptions.detail(vars.id),
        });
      },
    });
  }

  export function useDeleteFeeSubscription() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await apiClient.delete(`/fee-subscriptions/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeSubscriptions.lists(),
        });
      },
    });
  }
  ```

- [ ] **Step 2: Verify + commit.**
  ```bash
  pnpm lint && pnpm type-check
  git add src/hooks/api/useFeeSubscriptions.ts
  git commit -m "feat(hooks): add useFeeSubscriptions"
  ```

---

## Task 18 — `useFeeBills` hook + update cashier payment hook

**Files:**
- Create: `src/hooks/api/useFeeBills.ts`
- Modify: `src/hooks/api/usePayments.ts`
- Modify (grep first): any component that passes `{ tuitionId, amount, notes }` to `useCreatePayment`

### Steps

- [ ] **Step 1: Grep for `useCreatePayment` callers — they all need the new shape.**
  ```bash
  rg -n "useCreatePayment" src
  ```
  Expect at least the cashier payment modal / `src/pages/admin/payments/new.tsx` (or a `PaymentForm` component). Leave their edits to a follow-up UI task; Task 18 only updates the hook signature + fee-bills hook.

- [ ] **Step 2: Write `src/hooks/api/useFeeBills.ts`.**
  ```ts
  "use client";

  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
  import type { PaymentStatus } from "@/generated/prisma/client";
  import { apiClient } from "@/lib/api-client";
  import { type FeeBillFilters, queryKeys } from "@/lib/query-keys";

  export interface FeeBill {
    id: string;
    feeServiceId: string;
    studentNis: string;
    period: string;
    year: number;
    amount: string;
    paidAmount: string;
    status: PaymentStatus;
    dueDate: string;
    voidedByExit: boolean;
    notes: string | null;
    generatedAt: string;
    createdAt: string;
    updatedAt: string;
    student?: { nis: string; name: string };
    feeService?: {
      id: string;
      name: string;
      category: "TRANSPORT" | "ACCOMMODATION";
      academicYear?: { year: string };
    };
    _count?: { payments: number };
  }

  interface FeeBillListResponse {
    success: boolean;
    data: {
      feeBills: FeeBill[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }

  interface FeeBillResponse {
    success: boolean;
    data: FeeBill;
  }

  interface GenerateFeeBillsResponse {
    success: boolean;
    data: {
      generated: number;
      skipped: number;
      details: {
        feeServiceId?: string;
        period: string;
        year: number;
        subscribers: number;
      };
    };
  }

  interface GenerateAllFeeBillsResponse {
    success: boolean;
    data: {
      totalGenerated: number;
      totalSkipped: number;
      results: Array<{
        feeServiceId: string;
        feeServiceName: string;
        generated: number;
        skipped: number;
        error?: string;
      }>;
    };
  }

  export function useFeeBills(filters: FeeBillFilters = {}) {
    return useQuery({
      queryKey: queryKeys.feeBills.list(filters),
      queryFn: async () => {
        const { data } = await apiClient.get<FeeBillListResponse>("/fee-bills", {
          params: filters as Record<
            string,
            string | number | boolean | undefined
          >,
        });
        return data.data;
      },
    });
  }

  export function useFeeBill(id: string) {
    return useQuery({
      queryKey: queryKeys.feeBills.detail(id),
      queryFn: async () => {
        const { data } = await apiClient.get<FeeBillResponse>(`/fee-bills/${id}`);
        return data.data;
      },
      enabled: !!id,
    });
  }

  export function useDeleteFeeBill() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await apiClient.delete(`/fee-bills/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.feeBills.lists(),
        });
      },
    });
  }

  export function useGenerateFeeBills() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: {
        feeServiceId: string;
        period: string;
        year: number;
      }) => {
        const { data } = await apiClient.post<GenerateFeeBillsResponse>(
          "/fee-bills/generate",
          input,
        );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.feeBills.lists() });
      },
    });
  }

  export function useGenerateAllFeeBills() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: { period: string; year: number }) => {
        const { data } = await apiClient.post<GenerateAllFeeBillsResponse>(
          "/fee-bills/generate",
          input,
        );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.feeBills.lists() });
      },
    });
  }
  ```

- [ ] **Step 3: Update `useCreatePayment` in `src/hooks/api/usePayments.ts` to the new mixed-items shape.**
  Replace the existing `useCreatePayment` function with:
  ```ts
  interface PaymentItemPayload {
    tuitionId?: string;
    feeBillId?: string;
    serviceFeeBillId?: string;
    amount: string;
    scholarshipAmount?: string;
  }

  interface CreatePaymentPayload {
    studentNis: string;
    paymentDate?: string;
    notes?: string;
    items: PaymentItemPayload[];
  }

  interface CreatePaymentResponse {
    success: boolean;
    data: {
      transactionId: string;
      payments: Payment[];
    };
  }

  export function useCreatePayment() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (payload: CreatePaymentPayload) => {
        const { data } = await apiClient.post<CreatePaymentResponse>(
          "/payments",
          payload,
        );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tuitions.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.feeBills.lists() });
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceFeeBills.lists(),
        });
      },
    });
  }
  ```
  Widen the `Payment` interface at the top of `usePayments.ts` with nullable polymorphic fields:
  ```ts
  interface Payment {
    id: string;
    tuitionId: string | null;
    feeBillId: string | null;
    serviceFeeBillId: string | null;
    transactionId: string | null;
    employeeId: string | null;
    amount: string;
    scholarshipAmount: string;
    paymentDate: string;
    notes?: string | null;
    createdAt: string;
    updatedAt?: string;
    tuition?: { /* unchanged */ } | null;
    feeBill?: {
      id: string;
      period: string;
      year: number;
      feeService?: {
        id: string;
        name: string;
        category: "TRANSPORT" | "ACCOMMODATION";
      };
    } | null;
    serviceFeeBill?: {
      id: string;
      period: string;
      year: number;
      serviceFee?: { id: string; name: string };
    } | null;
    employee?: { employeeId: string; name: string } | null;
  }
  ```
  Note in the commit: existing UI callers that pass `{ tuitionId, amount }` will fail type-check. Fix them in the UI task (or supply a small adapter in the cashier modal now if type-check complains).

- [ ] **Step 4: Verify.**
  ```bash
  pnpm lint && pnpm type-check
  ```
  If `pnpm type-check` surfaces errors in UI files calling `useCreatePayment`, apply minimal adapters inline:
  ```ts
  createPayment.mutate({
    studentNis: tuition.studentNis,
    items: [{ tuitionId: tuition.id, amount: String(amount) }],
  });
  ```

- [ ] **Step 5: Commit.**
  ```bash
  git add src/hooks/api/useFeeBills.ts src/hooks/api/usePayments.ts src/pages/admin/payments/**/*.tsx
  git commit -m "feat(hooks): add useFeeBills, migrate useCreatePayment to mixed items

useCreatePayment now posts { studentNis, items: [...] } to match the
polymorphic payments endpoint. Payment row typing widened so UI can
render tuition / fee-bill / service-fee-bill slips. Cashier UI callers
updated to the new shape."
  ```

---

## Task 19 — `useServiceFees` + `useServiceFeeBills` hooks

**Files:**
- Create: `src/hooks/api/useServiceFees.ts`
- Create: `src/hooks/api/useServiceFeeBills.ts`

### Steps

- [ ] **Step 1: Write `src/hooks/api/useServiceFees.ts`.**
  ```ts
  "use client";

  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
  import { apiClient } from "@/lib/api-client";
  import { queryKeys, type ServiceFeeFilters } from "@/lib/query-keys";

  export interface ServiceFee {
    id: string;
    classAcademicId: string;
    name: string;
    description: string | null;
    amount: string;
    billingMonths: string[]; // Month[] as string[] in JSON
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    classAcademic?: {
      id: string;
      className: string;
      academicYear?: { year: string };
    };
    _count?: { bills: number };
  }

  interface ServiceFeeListResponse {
    success: boolean;
    data: {
      serviceFees: ServiceFee[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }

  interface ServiceFeeResponse {
    success: boolean;
    data: ServiceFee;
  }

  export function useServiceFees(filters: ServiceFeeFilters = {}) {
    return useQuery({
      queryKey: queryKeys.serviceFees.list(filters),
      queryFn: async () => {
        const { data } = await apiClient.get<ServiceFeeListResponse>(
          "/service-fees",
          {
            params: filters as Record<
              string,
              string | number | boolean | undefined
            >,
          },
        );
        return data.data;
      },
    });
  }

  export function useServiceFee(id: string) {
    return useQuery({
      queryKey: queryKeys.serviceFees.detail(id),
      queryFn: async () => {
        const { data } = await apiClient.get<ServiceFeeResponse>(
          `/service-fees/${id}`,
        );
        return data.data;
      },
      enabled: !!id,
    });
  }

  interface CreateServiceFeeInput {
    classAcademicId: string;
    name: string;
    description?: string;
    amount: string;
    billingMonths: string[];
    isActive?: boolean;
  }

  export function useCreateServiceFee() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: CreateServiceFeeInput) => {
        const { data } = await apiClient.post<ServiceFeeResponse>(
          "/service-fees",
          input,
        );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceFees.lists(),
        });
      },
    });
  }

  export function useUpdateServiceFee() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({
        id,
        updates,
      }: {
        id: string;
        updates: Partial<
          Pick<
            ServiceFee,
            "name" | "description" | "amount" | "billingMonths" | "isActive"
          >
        >;
      }) => {
        const { data } = await apiClient.put<ServiceFeeResponse>(
          `/service-fees/${id}`,
          updates,
        );
        return data.data;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceFees.lists(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceFees.detail(vars.id),
        });
      },
    });
  }

  export function useDeleteServiceFee() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await apiClient.delete(`/service-fees/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceFees.lists(),
        });
      },
    });
  }
  ```

- [ ] **Step 2: Write `src/hooks/api/useServiceFeeBills.ts`.**
  ```ts
  "use client";

  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
  import type { PaymentStatus } from "@/generated/prisma/client";
  import { apiClient } from "@/lib/api-client";
  import { queryKeys, type ServiceFeeBillFilters } from "@/lib/query-keys";

  export interface ServiceFeeBill {
    id: string;
    serviceFeeId: string;
    classAcademicId: string;
    studentNis: string;
    period: string;
    year: number;
    amount: string;
    paidAmount: string;
    status: PaymentStatus;
    dueDate: string;
    voidedByExit: boolean;
    notes: string | null;
    generatedAt: string;
    createdAt: string;
    updatedAt: string;
    student?: { nis: string; name: string };
    serviceFee?: { id: string; name: string };
    classAcademic?: {
      id: string;
      className: string;
      academicYear?: { year: string };
    };
    _count?: { payments: number };
  }

  interface ServiceFeeBillListResponse {
    success: boolean;
    data: {
      serviceFeeBills: ServiceFeeBill[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }

  interface ServiceFeeBillResponse {
    success: boolean;
    data: ServiceFeeBill;
  }

  interface GenerateServiceFeeBillsResponse {
    success: boolean;
    data: {
      generated: number;
      skipped: number;
      details: {
        classAcademicId?: string;
        period: string;
        year: number;
        students: number;
      };
    };
  }

  interface GenerateAllServiceFeeBillsResponse {
    success: boolean;
    data: {
      totalGenerated: number;
      totalSkipped: number;
      results: Array<{
        classAcademicId: string;
        className: string;
        generated: number;
        skipped: number;
        error?: string;
      }>;
    };
  }

  export function useServiceFeeBills(filters: ServiceFeeBillFilters = {}) {
    return useQuery({
      queryKey: queryKeys.serviceFeeBills.list(filters),
      queryFn: async () => {
        const { data } = await apiClient.get<ServiceFeeBillListResponse>(
          "/service-fee-bills",
          {
            params: filters as Record<
              string,
              string | number | boolean | undefined
            >,
          },
        );
        return data.data;
      },
    });
  }

  export function useServiceFeeBill(id: string) {
    return useQuery({
      queryKey: queryKeys.serviceFeeBills.detail(id),
      queryFn: async () => {
        const { data } = await apiClient.get<ServiceFeeBillResponse>(
          `/service-fee-bills/${id}`,
        );
        return data.data;
      },
      enabled: !!id,
    });
  }

  export function useDeleteServiceFeeBill() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await apiClient.delete(`/service-fee-bills/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceFeeBills.lists(),
        });
      },
    });
  }

  export function useGenerateServiceFeeBills() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: {
        classAcademicId: string;
        period: string;
        year: number;
      }) => {
        const { data } = await apiClient.post<GenerateServiceFeeBillsResponse>(
          "/service-fee-bills/generate",
          input,
        );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceFeeBills.lists(),
        });
      },
    });
  }

  export function useGenerateAllServiceFeeBills() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: { period: string; year: number }) => {
        const { data } =
          await apiClient.post<GenerateAllServiceFeeBillsResponse>(
            "/service-fee-bills/generate",
            input,
          );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceFeeBills.lists(),
        });
      },
    });
  }
  ```

- [ ] **Step 3: Verify + commit.**
  ```bash
  pnpm lint && pnpm type-check
  git add src/hooks/api/useServiceFees.ts src/hooks/api/useServiceFeeBills.ts
  git commit -m "feat(hooks): add useServiceFees and useServiceFeeBills"
  ```
# Chunk D — Phase 5: Admin UI (Tasks 20-26)

Prereqs: Tasks 16-19 (hooks, query-keys, i18n keys stubbed) already merged. Mantine v8.3.13. Pages use `AdminLayout` from `@/components/layouts/AdminLayout`. i18n via `useTranslations()`. Verification on every task: `pnpm lint && pnpm type-check` + manual browser check. Commit per task.

---

## Task 20: Admin fee-services list + create page

**Files:**
- Create: `/Users/ferdylim/Workspace/school-tuition-system/src/components/forms/FeeServiceForm.tsx`
- Create: `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/fee-services/index.tsx`

- [ ] **Step 1: Create the shared form component `FeeServiceForm.tsx`.**

  Write the following to `/Users/ferdylim/Workspace/school-tuition-system/src/components/forms/FeeServiceForm.tsx`:

  ```tsx
  "use client";

  import { Button, Group, Select, Stack, Textarea, TextInput } from "@mantine/core";
  import { useForm } from "@mantine/form";
  import { useTranslations } from "next-intl";
  import { useAcademicYears } from "@/hooks/api/useAcademicYears";

  export interface FeeServiceFormValues {
    name: string;
    category: "TRANSPORT" | "ACCOMMODATION";
    academicYearId: string;
    description: string;
  }

  interface Props {
    initialValues?: Partial<FeeServiceFormValues>;
    onSubmit: (values: FeeServiceFormValues) => void;
    onCancel: () => void;
    isLoading?: boolean;
    disableAcademicYear?: boolean;
  }

  export default function FeeServiceForm({
    initialValues,
    onSubmit,
    onCancel,
    isLoading,
    disableAcademicYear,
  }: Props) {
    const t = useTranslations();
    const { data: ayData } = useAcademicYears({ limit: 100 });
    const activeYear = ayData?.academicYears.find((ay) => ay.isActive);

    const form = useForm<FeeServiceFormValues>({
      initialValues: {
        name: initialValues?.name ?? "",
        category: initialValues?.category ?? "TRANSPORT",
        academicYearId: initialValues?.academicYearId ?? activeYear?.id ?? "",
        description: initialValues?.description ?? "",
      },
      validate: {
        name: (v) => (v.trim() ? null : t("common.required")),
        academicYearId: (v) => (v ? null : t("common.required")),
      },
    });

    const yearOptions =
      ayData?.academicYears.map((ay) => ({
        value: ay.id,
        label: `${ay.year}${ay.isActive ? ` (${t("common.active")})` : ""}`,
      })) ?? [];

    return (
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t("feeService.name")}
            placeholder={t("feeService.namePlaceholder")}
            required
            {...form.getInputProps("name")}
          />
          <Select
            label={t("feeService.category.label")}
            required
            data={[
              { value: "TRANSPORT", label: t("feeService.category.transport") },
              { value: "ACCOMMODATION", label: t("feeService.category.accommodation") },
            ]}
            {...form.getInputProps("category")}
          />
          <Select
            label={t("feeService.academicYear")}
            required
            disabled={disableAcademicYear}
            data={yearOptions}
            {...form.getInputProps("academicYearId")}
          />
          <Textarea
            label={t("feeService.description")}
            rows={3}
            {...form.getInputProps("description")}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onCancel} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isLoading}>
              {t("common.save")}
            </Button>
          </Group>
        </Stack>
      </form>
    );
  }
  ```

- [ ] **Step 2: Create the list page `/admin/fee-services/index.tsx`.**

  Write the following to `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/fee-services/index.tsx`:

  ```tsx
  "use client";

  import {
    ActionIcon,
    Badge,
    Button,
    Group,
    Modal,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    Text,
    TextInput,
    Tooltip,
  } from "@mantine/core";
  import { useDisclosure } from "@mantine/hooks";
  import { modals } from "@mantine/modals";
  import { notifications } from "@mantine/notifications";
  import {
    IconEdit,
    IconFilter,
    IconPlus,
    IconSearch,
    IconTrash,
  } from "@tabler/icons-react";
  import Link from "next/link";
  import { useTranslations } from "next-intl";
  import type { ReactElement } from "react";
  import { useState } from "react";
  import FeeServiceForm, {
    type FeeServiceFormValues,
  } from "@/components/forms/FeeServiceForm";
  import AdminLayout from "@/components/layouts/AdminLayout";
  import TablePagination from "@/components/ui/TablePagination";
  import PageHeader from "@/components/ui/PageHeader/PageHeader";
  import { useAcademicYears } from "@/hooks/api/useAcademicYears";
  import {
    useCreateFeeService,
    useDeleteFeeService,
    useFeeServices,
    useUpdateFeeService,
  } from "@/hooks/api/useFeeServices";
  import type { NextPageWithLayout } from "@/lib/page-types";

  const FeeServicesPage: NextPageWithLayout = function FeeServicesPage() {
    const t = useTranslations();
    const { data: ayData } = useAcademicYears({ limit: 100 });
    const activeYear = ayData?.academicYears.find((ay) => ay.isActive);

    const [page, setPage] = useState(1);
    const [academicYearId, setAcademicYearId] = useState<string | null>(null);
    const [category, setCategory] = useState<string | null>(null);
    const [activeOnly, setActiveOnly] = useState(true);
    const [search, setSearch] = useState("");

    const effectiveYearId = academicYearId ?? activeYear?.id;

    const { data, isLoading } = useFeeServices({
      page,
      limit: 10,
      academicYearId: effectiveYearId,
      category: category as "TRANSPORT" | "ACCOMMODATION" | undefined,
      isActive: activeOnly ? true : undefined,
      search: search || undefined,
    });

    const createMutation = useCreateFeeService();
    const updateMutation = useUpdateFeeService();
    const deleteMutation = useDeleteFeeService();

    const [createOpened, { open: openCreate, close: closeCreate }] =
      useDisclosure(false);
    const [editTarget, setEditTarget] = useState<
      | {
          id: string;
          name: string;
          category: "TRANSPORT" | "ACCOMMODATION";
          academicYearId: string;
          description: string | null;
        }
      | null
    >(null);

    const handleCreate = (values: FeeServiceFormValues) => {
      createMutation.mutate(values, {
        onSuccess: () => {
          notifications.show({
            color: "green",
            title: t("common.success"),
            message: t("feeService.created"),
          });
          closeCreate();
        },
        onError: (err) =>
          notifications.show({
            color: "red",
            title: t("common.error"),
            message: err.message,
          }),
      });
    };

    const handleUpdate = (values: FeeServiceFormValues) => {
      if (!editTarget) return;
      updateMutation.mutate(
        { id: editTarget.id, updates: values },
        {
          onSuccess: () => {
            notifications.show({
              color: "green",
              title: t("common.success"),
              message: t("feeService.updated"),
            });
            setEditTarget(null);
          },
          onError: (err) =>
            notifications.show({
              color: "red",
              title: t("common.error"),
              message: err.message,
            }),
        },
      );
    };

    const confirmDelete = (id: string, name: string) => {
      modals.openConfirmModal({
        title: t("feeService.deleteTitle"),
        children: <Text size="sm">{t("feeService.deleteConfirm", { name })}</Text>,
        labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
        confirmProps: { color: "red" },
        onConfirm: () =>
          deleteMutation.mutate(id, {
            onSuccess: () =>
              notifications.show({
                color: "green",
                title: t("common.success"),
                message: t("feeService.deleted"),
              }),
            onError: (err) =>
              notifications.show({
                color: "red",
                title: t("common.error"),
                message: err.message,
              }),
          }),
      });
    };

    const yearOptions =
      ayData?.academicYears.map((ay) => ({
        value: ay.id,
        label: `${ay.year}${ay.isActive ? ` (${t("common.active")})` : ""}`,
      })) ?? [];

    return (
      <>
        <PageHeader
          title={t("feeService.title")}
          description={t("feeService.description")}
          actions={
            <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
              {t("feeService.create")}
            </Button>
          }
        />

        <Paper withBorder p="md" mb="md">
          <Group gap="md" wrap="wrap">
            <Select
              leftSection={<IconFilter size={16} />}
              placeholder={t("feeService.academicYear")}
              data={yearOptions}
              value={academicYearId}
              onChange={setAcademicYearId}
              clearable
              w={220}
            />
            <Select
              placeholder={t("feeService.category.label")}
              data={[
                { value: "TRANSPORT", label: t("feeService.category.transport") },
                { value: "ACCOMMODATION", label: t("feeService.category.accommodation") },
              ]}
              value={category}
              onChange={setCategory}
              clearable
              w={200}
            />
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={240}
            />
            <Switch
              label={t("feeService.activeOnly")}
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.currentTarget.checked)}
            />
          </Group>
        </Paper>

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("feeService.name")}</Table.Th>
                <Table.Th>{t("feeService.category.label")}</Table.Th>
                <Table.Th>{t("feeService.academicYear")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
                <Table.Th style={{ width: 120 }}>{t("common.actions")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("common.loading")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : !data?.feeServices.length ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("common.noData")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                data.feeServices.map((fs) => (
                  <Table.Tr key={fs.id}>
                    <Table.Td>
                      <Link
                        href={`/admin/fee-services/${fs.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Text fw={500}>{fs.name}</Text>
                      </Link>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">
                        {t(`feeService.category.${fs.category.toLowerCase()}`)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{fs.academicYear?.year ?? "-"}</Table.Td>
                    <Table.Td>
                      <Badge color={fs.isActive ? "green" : "gray"}>
                        {fs.isActive
                          ? t("common.active")
                          : t("common.inactive")}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label={t("common.edit")}>
                          <ActionIcon
                            variant="subtle"
                            onClick={() =>
                              setEditTarget({
                                id: fs.id,
                                name: fs.name,
                                category: fs.category,
                                academicYearId: fs.academicYearId,
                                description: fs.description,
                              })
                            }
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t("common.delete")}>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => confirmDelete(fs.id, fs.name)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
          {data && (
            <Stack p="md">
              <TablePagination
                page={page}
                totalPages={data.totalPages}
                onChange={setPage}
              />
            </Stack>
          )}
        </Paper>

        <Modal
          opened={createOpened}
          onClose={closeCreate}
          title={t("feeService.create")}
        >
          <FeeServiceForm
            onSubmit={handleCreate}
            onCancel={closeCreate}
            isLoading={createMutation.isPending}
          />
        </Modal>

        <Modal
          opened={!!editTarget}
          onClose={() => setEditTarget(null)}
          title={t("feeService.edit")}
        >
          {editTarget && (
            <FeeServiceForm
              initialValues={{
                name: editTarget.name,
                category: editTarget.category,
                academicYearId: editTarget.academicYearId,
                description: editTarget.description ?? "",
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditTarget(null)}
              isLoading={updateMutation.isPending}
              disableAcademicYear
            />
          )}
        </Modal>
      </>
    );
  };
  FeeServicesPage.getLayout = (page: ReactElement) => (
    <AdminLayout>{page}</AdminLayout>
  );

  export default FeeServicesPage;
  ```

- [ ] **Step 3: Verify — run `pnpm lint && pnpm type-check` from repo root. Open `/admin/fee-services` in browser: create a service, edit it, delete (confirm 409 on service with bills shows error toast).**

- [ ] **Step 4: Commit.**
  ```
  git add src/components/forms/FeeServiceForm.tsx src/pages/admin/fee-services/index.tsx
  git commit -m "feat(fee-services): add admin list + create/edit/delete page"
  ```

---

## Task 21: Admin fee-services detail page

**Files:**
- Create: `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/fee-services/[id].tsx`

- [ ] **Step 1: Scaffold the page with service info header + price history + subscribers + recent bills (four sections in one file).**

  Write the following to `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/fee-services/[id].tsx`:

  ```tsx
  "use client";

  import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    LoadingOverlay,
    Modal,
    NumberInput,
    Paper,
    Select,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
    Tooltip,
  } from "@mantine/core";
  import { DatePickerInput, MonthPickerInput } from "@mantine/dates";
  import { useForm } from "@mantine/form";
  import { useDisclosure } from "@mantine/hooks";
  import { modals } from "@mantine/modals";
  import { notifications } from "@mantine/notifications";
  import { IconPlus, IconTrash, IconUserPlus } from "@tabler/icons-react";
  import dayjs from "dayjs";
  import { useRouter } from "next/router";
  import { useTranslations } from "next-intl";
  import type { ReactElement } from "react";
  import { useMemo, useState } from "react";
  import AdminLayout from "@/components/layouts/AdminLayout";
  import PageHeader from "@/components/ui/PageHeader/PageHeader";
  import { useFeeBills } from "@/hooks/api/useFeeBills";
  import {
    useAddFeeServicePrice,
    useDeleteFeeServicePrice,
    useFeeServicePrices,
  } from "@/hooks/api/useFeeServicePrices";
  import { useFeeService } from "@/hooks/api/useFeeServices";
  import {
    useCreateFeeSubscription,
    useEndFeeSubscription,
    useFeeSubscriptions,
  } from "@/hooks/api/useFeeSubscriptions";
  import { useStudents } from "@/hooks/api/useStudents";
  import type { NextPageWithLayout } from "@/lib/page-types";

  function formatRp(v: string | number) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return `Rp ${n.toLocaleString("id-ID")}`;
  }

  const FeeServiceDetailPage: NextPageWithLayout = function FeeServiceDetailPage() {
    const router = useRouter();
    const t = useTranslations();
    const { id } = router.query as { id: string };

    const { data: service, isLoading } = useFeeService(id);
    const { data: prices } = useFeeServicePrices(id);
    const { data: subs } = useFeeSubscriptions({
      feeServiceId: id,
      limit: 100,
    });
    const { data: bills } = useFeeBills({
      feeServiceId: id,
      limit: 20,
    });

    const addPrice = useAddFeeServicePrice(id);
    const deletePrice = useDeleteFeeServicePrice(id);
    const subscribe = useCreateFeeSubscription();
    const endSub = useEndFeeSubscription();

    const [priceOpened, { open: openPrice, close: closePrice }] =
      useDisclosure(false);
    const [subOpened, { open: openSub, close: closeSub }] = useDisclosure(false);

    if (isLoading || !service) return <LoadingOverlay visible />;

    return (
      <>
        <PageHeader
          title={service.name}
          description={`${t(`feeService.category.${service.category.toLowerCase()}`)} · ${service.academicYear?.year ?? ""}`}
        />

        <Stack gap="lg">
          <InfoCard service={service} />
          <PriceHistoryCard
            prices={prices ?? []}
            onAdd={openPrice}
            onDelete={(priceId) => {
              modals.openConfirmModal({
                title: t("feeService.deletePriceTitle"),
                children: (
                  <Text size="sm">{t("feeService.deletePriceConfirm")}</Text>
                ),
                labels: {
                  confirm: t("common.delete"),
                  cancel: t("common.cancel"),
                },
                confirmProps: { color: "red" },
                onConfirm: () =>
                  deletePrice.mutate(priceId, {
                    onError: (err) =>
                      notifications.show({
                        color: "red",
                        title: t("common.error"),
                        message: err.message,
                      }),
                  }),
              });
            }}
          />
          <SubscribersCard
            subs={subs?.subscriptions ?? []}
            onAdd={openSub}
            onEnd={(subId, studentName) => {
              modals.openConfirmModal({
                title: t("feeService.endSubscriptionTitle"),
                children: (
                  <Text size="sm">
                    {t("feeService.endSubscriptionConfirm", {
                      name: studentName,
                    })}
                  </Text>
                ),
                labels: {
                  confirm: t("common.confirm"),
                  cancel: t("common.cancel"),
                },
                onConfirm: () =>
                  endSub.mutate({
                    id: subId,
                    endDate: dayjs().format("YYYY-MM-DD"),
                  }),
              });
            }}
          />
          <RecentBillsCard bills={bills?.feeBills ?? []} />
        </Stack>

        <AddPriceModal
          opened={priceOpened}
          onClose={closePrice}
          onSubmit={(values) => {
            // Normalize to 1st of month (server also normalizes; we mirror)
            const d = dayjs(values.effectiveFrom).startOf("month");
            addPrice.mutate(
              {
                effectiveFrom: d.format("YYYY-MM-DD"),
                amount: String(values.amount),
              },
              {
                onSuccess: () => {
                  notifications.show({
                    color: "green",
                    title: t("common.success"),
                    message: t("feeService.priceAdded"),
                  });
                  closePrice();
                },
                onError: (err) =>
                  notifications.show({
                    color: "red",
                    title: t("common.error"),
                    message: err.message,
                  }),
              },
            );
          }}
          isLoading={addPrice.isPending}
        />

        <SubscribeModal
          opened={subOpened}
          onClose={closeSub}
          feeServiceId={id}
          onSubmit={(values) => {
            subscribe.mutate(
              {
                feeServiceId: id,
                studentNis: values.studentNis,
                startDate: dayjs(values.startDate).format("YYYY-MM-DD"),
                endDate: values.endDate
                  ? dayjs(values.endDate).format("YYYY-MM-DD")
                  : undefined,
                notes: values.notes || undefined,
              },
              {
                onSuccess: () => {
                  notifications.show({
                    color: "green",
                    title: t("common.success"),
                    message: t("feeService.subscribed"),
                  });
                  closeSub();
                },
                onError: (err) =>
                  notifications.show({
                    color: "red",
                    title: t("common.error"),
                    message: err.message,
                  }),
              },
            );
          }}
          isLoading={subscribe.isPending}
        />
      </>
    );
  };

  function InfoCard({
    service,
  }: {
    service: {
      name: string;
      description: string | null;
      isActive: boolean;
      academicYear?: { year: string } | null;
    };
  }) {
    const t = useTranslations();
    return (
      <Card withBorder>
        <Stack gap="xs">
          <Title order={5}>{t("feeService.info")}</Title>
          {service.description && <Text size="sm">{service.description}</Text>}
          <Group gap="xs">
            <Badge color={service.isActive ? "green" : "gray"}>
              {service.isActive ? t("common.active") : t("common.inactive")}
            </Badge>
          </Group>
        </Stack>
      </Card>
    );
  }

  function PriceHistoryCard({
    prices,
    onAdd,
    onDelete,
  }: {
    prices: Array<{ id: string; effectiveFrom: string; amount: string }>;
    onAdd: () => void;
    onDelete: (id: string) => void;
  }) {
    const t = useTranslations();
    return (
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={5}>{t("feeService.priceHistory")}</Title>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={onAdd}
          >
            {t("feeService.addPrice")}
          </Button>
        </Group>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("feeService.effectiveFrom")}</Table.Th>
              <Table.Th>{t("feeService.amount")}</Table.Th>
              <Table.Th style={{ width: 60 }}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {prices.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text ta="center" c="dimmed" py="sm">
                    {t("feeService.noPrices")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              prices.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    {dayjs(p.effectiveFrom).format("MMMM YYYY")}
                  </Table.Td>
                  <Table.Td>{formatRp(p.amount)}</Table.Td>
                  <Table.Td>
                    <Tooltip label={t("common.delete")}>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => onDelete(p.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>
    );
  }

  function SubscribersCard({
    subs,
    onAdd,
    onEnd,
  }: {
    subs: Array<{
      id: string;
      studentNis: string;
      startDate: string;
      endDate: string | null;
      student: { name: string };
    }>;
    onAdd: () => void;
    onEnd: (id: string, name: string) => void;
  }) {
    const t = useTranslations();
    return (
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={5}>{t("feeService.subscribers")}</Title>
          <Button
            size="xs"
            leftSection={<IconUserPlus size={14} />}
            onClick={onAdd}
          >
            {t("feeService.subscribeStudent")}
          </Button>
        </Group>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("student.name")}</Table.Th>
              <Table.Th>{t("student.nis")}</Table.Th>
              <Table.Th>{t("feeService.startDate")}</Table.Th>
              <Table.Th>{t("feeService.endDate")}</Table.Th>
              <Table.Th style={{ width: 110 }}>{t("common.actions")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {subs.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="sm">
                    {t("feeService.noSubscribers")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              subs.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td>{s.student.name}</Table.Td>
                  <Table.Td>{s.studentNis}</Table.Td>
                  <Table.Td>{dayjs(s.startDate).format("DD MMM YYYY")}</Table.Td>
                  <Table.Td>
                    {s.endDate ? (
                      dayjs(s.endDate).format("DD MMM YYYY")
                    ) : (
                      <Badge color="green" variant="light">
                        {t("feeService.active")}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {!s.endDate && (
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => onEnd(s.id, s.student.name)}
                      >
                        {t("feeService.endSubscription")}
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>
    );
  }

  function RecentBillsCard({
    bills,
  }: {
    bills: Array<{
      id: string;
      period: string;
      year: number;
      amount: string;
      paidAmount: string;
      status: string;
      student: { name: string; nis: string };
    }>;
  }) {
    const t = useTranslations();
    return (
      <Card withBorder>
        <Title order={5} mb="sm">
          {t("feeService.recentBills")}
        </Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("student.name")}</Table.Th>
              <Table.Th>{t("feeBill.period")}</Table.Th>
              <Table.Th>{t("feeBill.amount")}</Table.Th>
              <Table.Th>{t("feeBill.paid")}</Table.Th>
              <Table.Th>{t("common.status")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {bills.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="sm">
                    {t("feeBill.noBills")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              bills.map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{b.student.name}</Table.Td>
                  <Table.Td>
                    {t(`months.${b.period}`)} {b.year}
                  </Table.Td>
                  <Table.Td>{formatRp(b.amount)}</Table.Td>
                  <Table.Td>{formatRp(b.paidAmount)}</Table.Td>
                  <Table.Td>
                    <Badge>{t(`tuition.status.${b.status.toLowerCase()}`)}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>
    );
  }

  function AddPriceModal({
    opened,
    onClose,
    onSubmit,
    isLoading,
  }: {
    opened: boolean;
    onClose: () => void;
    onSubmit: (v: { effectiveFrom: Date; amount: number }) => void;
    isLoading?: boolean;
  }) {
    const t = useTranslations();
    const form = useForm({
      initialValues: {
        effectiveFrom: dayjs().startOf("month").toDate() as Date,
        amount: 0 as number,
      },
      validate: {
        amount: (v) => (v > 0 ? null : t("common.required")),
      },
    });
    return (
      <Modal opened={opened} onClose={onClose} title={t("feeService.addPrice")}>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap="md">
            <MonthPickerInput
              label={t("feeService.effectiveFrom")}
              required
              {...form.getInputProps("effectiveFrom")}
            />
            <NumberInput
              label={t("feeService.amount")}
              required
              min={1}
              prefix="Rp "
              thousandSeparator="."
              decimalSeparator=","
              {...form.getInputProps("amount")}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={isLoading}>
                {t("common.save")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    );
  }

  function SubscribeModal({
    opened,
    onClose,
    onSubmit,
    isLoading,
  }: {
    opened: boolean;
    onClose: () => void;
    feeServiceId: string;
    onSubmit: (v: {
      studentNis: string;
      startDate: Date;
      endDate: Date | null;
      notes: string;
    }) => void;
    isLoading?: boolean;
  }) {
    const t = useTranslations();
    const [search, setSearch] = useState("");
    const { data: studentsData } = useStudents({ limit: 20, search });
    const options = useMemo(
      () =>
        studentsData?.students.map((s) => ({
          value: s.nis,
          label: `${s.nis} — ${s.name}`,
        })) ?? [],
      [studentsData],
    );
    const form = useForm({
      initialValues: {
        studentNis: "",
        startDate: new Date() as Date,
        endDate: null as Date | null,
        notes: "",
      },
      validate: {
        studentNis: (v) => (v ? null : t("common.required")),
      },
    });

    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title={t("feeService.subscribeStudent")}
      >
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap="md">
            <TextInput
              label={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
            <Select
              label={t("student.label")}
              required
              searchable
              data={options}
              {...form.getInputProps("studentNis")}
            />
            <DatePickerInput
              label={t("feeService.startDate")}
              required
              {...form.getInputProps("startDate")}
            />
            <DatePickerInput
              label={t("feeService.endDate")}
              clearable
              {...form.getInputProps("endDate")}
            />
            <TextInput
              label={t("feeService.notes")}
              {...form.getInputProps("notes")}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={isLoading}>
                {t("common.save")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    );
  }

  FeeServiceDetailPage.getLayout = (page: ReactElement) => (
    <AdminLayout>{page}</AdminLayout>
  );

  export default FeeServiceDetailPage;
  ```

- [ ] **Step 2: Verify — `pnpm lint && pnpm type-check`. Open the detail page from the list: add a price (pick a month, confirm it saves as day=1), subscribe a student, end a subscription, delete a price.**

- [ ] **Step 3: Commit.**
  ```
  git add src/pages/admin/fee-services/[id].tsx
  git commit -m "feat(fee-services): add detail page with prices, subscribers, recent bills"
  ```

---

## Task 22: Admin fee-bills combined list with generate-all

**Files:**
- Create: `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/fee-bills/index.tsx`

- [ ] **Step 1: Write tabs + filter bar + generate-all buttons + tables for both tracks.**

  Write the following to `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/fee-bills/index.tsx`:

  ```tsx
  "use client";

  import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    List,
    Modal,
    NumberInput,
    Paper,
    Select,
    Stack,
    Table,
    Tabs,
    Text,
    TextInput,
    Tooltip,
  } from "@mantine/core";
  import { useDisclosure } from "@mantine/hooks";
  import { modals } from "@mantine/modals";
  import { notifications } from "@mantine/notifications";
  import {
    IconBolt,
    IconReceipt2,
    IconSearch,
    IconTrash,
  } from "@tabler/icons-react";
  import { useTranslations } from "next-intl";
  import type { ReactElement } from "react";
  import { useState } from "react";
  import AdminLayout from "@/components/layouts/AdminLayout";
  import TablePagination from "@/components/ui/TablePagination";
  import PageHeader from "@/components/ui/PageHeader/PageHeader";
  import { useAcademicYears } from "@/hooks/api/useAcademicYears";
  import {
    useDeleteFeeBill,
    useFeeBills,
    useGenerateAllFeeBills,
  } from "@/hooks/api/useFeeBills";
  import {
    useDeleteServiceFeeBill,
    useGenerateAllServiceFeeBills,
    useServiceFeeBills,
  } from "@/hooks/api/useServiceFeeBills";
  import { PERIODS } from "@/lib/business-logic/tuition-generator";
  import type { NextPageWithLayout } from "@/lib/page-types";

  function formatRp(v: string | number) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return `Rp ${n.toLocaleString("id-ID")}`;
  }

  const STATUSES = ["UNPAID", "PARTIAL", "PAID", "VOID"] as const;

  interface GenerateAllResult {
    created: number;
    skipped: number;
    exitSkipped?: number;
    priceWarnings?: Array<{
      feeServiceId?: string;
      feeServiceName?: string;
      period: string;
      year: number;
    }>;
  }

  const FeeBillsPage: NextPageWithLayout = function FeeBillsPage() {
    const t = useTranslations();
    const [tab, setTab] = useState<"fee" | "service">("fee");
    const { data: ayData } = useAcademicYears({ limit: 100 });
    const activeYear = ayData?.academicYears.find((ay) => ay.isActive);

    return (
      <>
        <PageHeader
          title={t("feeBill.title")}
          description={t("feeBill.description")}
        />
        <Tabs value={tab} onChange={(v) => setTab((v as "fee" | "service") ?? "fee")}>
          <Tabs.List>
            <Tabs.Tab value="fee" leftSection={<IconReceipt2 size={16} />}>
              {t("feeBill.tabFee")}
            </Tabs.Tab>
            <Tabs.Tab value="service" leftSection={<IconReceipt2 size={16} />}>
              {t("feeBill.tabService")}
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="fee" pt="md">
            <FeeBillTab activeYearId={activeYear?.id} />
          </Tabs.Panel>
          <Tabs.Panel value="service" pt="md">
            <ServiceFeeBillTab activeYearId={activeYear?.id} />
          </Tabs.Panel>
        </Tabs>
      </>
    );
  };

  function FeeBillTab({ activeYearId }: { activeYearId?: string }) {
    const t = useTranslations();
    const [page, setPage] = useState(1);
    const [studentSearch, setStudentSearch] = useState("");
    const [period, setPeriod] = useState<string | null>(null);
    const [year, setYear] = useState<number | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    const { data, isLoading } = useFeeBills({
      page,
      limit: 15,
      studentSearch: studentSearch || undefined,
      period: period || undefined,
      year: year ?? undefined,
      status: status as (typeof STATUSES)[number] | undefined,
    });

    const generate = useGenerateAllFeeBills();
    const deleteBill = useDeleteFeeBill();
    const [resultOpened, { open: openResult, close: closeResult }] =
      useDisclosure(false);
    const [result, setResult] = useState<GenerateAllResult | null>(null);

    const handleGenerate = () => {
      modals.openConfirmModal({
        title: t("feeBill.generateAllTitle"),
        children: <Text size="sm">{t("feeBill.generateAllConfirm")}</Text>,
        labels: { confirm: t("feeBill.generateAll"), cancel: t("common.cancel") },
        onConfirm: () =>
          generate.mutate(
            { academicYearId: activeYearId },
            {
              onSuccess: (data) => {
                setResult(data);
                openResult();
              },
              onError: (err) =>
                notifications.show({
                  color: "red",
                  title: t("common.error"),
                  message: err.message,
                }),
            },
          ),
      });
    };

    const confirmDelete = (id: string) => {
      modals.openConfirmModal({
        title: t("feeBill.deleteTitle"),
        children: <Text size="sm">{t("feeBill.deleteConfirm")}</Text>,
        labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
        confirmProps: { color: "red" },
        onConfirm: () =>
          deleteBill.mutate(id, {
            onError: (err) =>
              notifications.show({
                color: "red",
                title: t("common.error"),
                message: err.message,
              }),
          }),
      });
    };

    return (
      <Stack gap="md">
        <Paper withBorder p="md">
          <Group justify="space-between" wrap="wrap" gap="md">
            <Group gap="md" wrap="wrap">
              <TextInput
                leftSection={<IconSearch size={16} />}
                placeholder={t("feeBill.searchStudent")}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.currentTarget.value)}
                w={240}
              />
              <Select
                placeholder={t("feeBill.period")}
                data={PERIODS.map((p) => ({
                  value: p,
                  label: t(`months.${p}`),
                }))}
                value={period}
                onChange={setPeriod}
                clearable
                w={160}
              />
              <NumberInput
                placeholder={t("feeBill.year")}
                value={year ?? ""}
                onChange={(v) => setYear(typeof v === "number" ? v : null)}
                w={120}
              />
              <Select
                placeholder={t("common.status")}
                data={STATUSES.map((s) => ({
                  value: s,
                  label: t(`tuition.status.${s.toLowerCase()}`),
                }))}
                value={status}
                onChange={setStatus}
                clearable
                w={160}
              />
            </Group>
            <Button
              leftSection={<IconBolt size={16} />}
              loading={generate.isPending}
              onClick={handleGenerate}
            >
              {t("feeBill.generateAll")}
            </Button>
          </Group>
        </Paper>

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("student.name")}</Table.Th>
                <Table.Th>{t("feeService.name")}</Table.Th>
                <Table.Th>{t("feeBill.period")}</Table.Th>
                <Table.Th>{t("feeBill.amount")}</Table.Th>
                <Table.Th>{t("feeBill.paid")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
                <Table.Th style={{ width: 60 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("common.loading")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : !data?.feeBills.length ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("feeBill.noBills")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                data.feeBills.map((b) => (
                  <Table.Tr key={b.id}>
                    <Table.Td>{b.student?.name ?? b.studentNis}</Table.Td>
                    <Table.Td>{b.feeService?.name ?? "-"}</Table.Td>
                    <Table.Td>
                      {t(`months.${b.period}`)} {b.year}
                    </Table.Td>
                    <Table.Td>{formatRp(b.amount)}</Table.Td>
                    <Table.Td>{formatRp(b.paidAmount)}</Table.Td>
                    <Table.Td>
                      <Badge>
                        {t(`tuition.status.${b.status.toLowerCase()}`)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {b.status === "UNPAID" && (
                        <Tooltip label={t("common.delete")}>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => confirmDelete(b.id)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
          {data && (
            <Stack p="md">
              <TablePagination
                page={page}
                totalPages={data.totalPages}
                onChange={setPage}
              />
            </Stack>
          )}
        </Paper>

        <Modal
          opened={resultOpened}
          onClose={closeResult}
          title={t("feeBill.generateResultTitle")}
        >
          {result && <GenerateResultBody result={result} />}
        </Modal>
      </Stack>
    );
  }

  function ServiceFeeBillTab({ activeYearId }: { activeYearId?: string }) {
    const t = useTranslations();
    const [page, setPage] = useState(1);
    const [studentSearch, setStudentSearch] = useState("");
    const [period, setPeriod] = useState<string | null>(null);
    const [year, setYear] = useState<number | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    const { data, isLoading } = useServiceFeeBills({
      page,
      limit: 15,
      studentSearch: studentSearch || undefined,
      period: period || undefined,
      year: year ?? undefined,
      status: status as (typeof STATUSES)[number] | undefined,
    });

    const generate = useGenerateAllServiceFeeBills();
    const deleteBill = useDeleteServiceFeeBill();
    const [resultOpened, { open: openResult, close: closeResult }] =
      useDisclosure(false);
    const [result, setResult] = useState<GenerateAllResult | null>(null);

    const handleGenerate = () => {
      modals.openConfirmModal({
        title: t("serviceFee.generateAllTitle"),
        children: <Text size="sm">{t("serviceFee.generateAllConfirm")}</Text>,
        labels: { confirm: t("serviceFee.generateAll"), cancel: t("common.cancel") },
        onConfirm: () =>
          generate.mutate(
            { academicYearId: activeYearId },
            {
              onSuccess: (data) => {
                setResult(data);
                openResult();
              },
              onError: (err) =>
                notifications.show({
                  color: "red",
                  title: t("common.error"),
                  message: err.message,
                }),
            },
          ),
      });
    };

    const confirmDelete = (id: string) => {
      modals.openConfirmModal({
        title: t("feeBill.deleteTitle"),
        children: <Text size="sm">{t("feeBill.deleteConfirm")}</Text>,
        labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
        confirmProps: { color: "red" },
        onConfirm: () =>
          deleteBill.mutate(id, {
            onError: (err) =>
              notifications.show({
                color: "red",
                title: t("common.error"),
                message: err.message,
              }),
          }),
      });
    };

    return (
      <Stack gap="md">
        <Paper withBorder p="md">
          <Group justify="space-between" wrap="wrap" gap="md">
            <Group gap="md" wrap="wrap">
              <TextInput
                leftSection={<IconSearch size={16} />}
                placeholder={t("feeBill.searchStudent")}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.currentTarget.value)}
                w={240}
              />
              <Select
                placeholder={t("feeBill.period")}
                data={PERIODS.map((p) => ({
                  value: p,
                  label: t(`months.${p}`),
                }))}
                value={period}
                onChange={setPeriod}
                clearable
                w={160}
              />
              <NumberInput
                placeholder={t("feeBill.year")}
                value={year ?? ""}
                onChange={(v) => setYear(typeof v === "number" ? v : null)}
                w={120}
              />
              <Select
                placeholder={t("common.status")}
                data={STATUSES.map((s) => ({
                  value: s,
                  label: t(`tuition.status.${s.toLowerCase()}`),
                }))}
                value={status}
                onChange={setStatus}
                clearable
                w={160}
              />
            </Group>
            <Button
              leftSection={<IconBolt size={16} />}
              loading={generate.isPending}
              onClick={handleGenerate}
            >
              {t("serviceFee.generateAll")}
            </Button>
          </Group>
        </Paper>

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("student.name")}</Table.Th>
                <Table.Th>{t("serviceFee.name")}</Table.Th>
                <Table.Th>{t("feeBill.period")}</Table.Th>
                <Table.Th>{t("feeBill.amount")}</Table.Th>
                <Table.Th>{t("feeBill.paid")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
                <Table.Th style={{ width: 60 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("common.loading")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : !data?.serviceFeeBills.length ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("feeBill.noBills")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                data.serviceFeeBills.map((b) => (
                  <Table.Tr key={b.id}>
                    <Table.Td>{b.student?.name ?? b.studentNis}</Table.Td>
                    <Table.Td>{b.serviceFee?.name ?? "-"}</Table.Td>
                    <Table.Td>
                      {t(`months.${b.period}`)} {b.year}
                    </Table.Td>
                    <Table.Td>{formatRp(b.amount)}</Table.Td>
                    <Table.Td>{formatRp(b.paidAmount)}</Table.Td>
                    <Table.Td>
                      <Badge>
                        {t(`tuition.status.${b.status.toLowerCase()}`)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {b.status === "UNPAID" && (
                        <Tooltip label={t("common.delete")}>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => confirmDelete(b.id)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
          {data && (
            <Stack p="md">
              <TablePagination
                page={page}
                totalPages={data.totalPages}
                onChange={setPage}
              />
            </Stack>
          )}
        </Paper>

        <Modal
          opened={resultOpened}
          onClose={closeResult}
          title={t("serviceFee.generateResultTitle")}
        >
          {result && <GenerateResultBody result={result} />}
        </Modal>
      </Stack>
    );
  }

  function GenerateResultBody({ result }: { result: GenerateAllResult }) {
    const t = useTranslations();
    return (
      <Stack gap="sm">
        <Card withBorder>
          <Group>
            <Badge color="green" size="lg">
              {t("feeBill.created")}: {result.created}
            </Badge>
            <Badge color="gray" size="lg">
              {t("feeBill.skipped")}: {result.skipped}
            </Badge>
            {typeof result.exitSkipped === "number" && (
              <Badge color="orange" size="lg">
                {t("feeBill.exitSkipped")}: {result.exitSkipped}
              </Badge>
            )}
          </Group>
        </Card>
        {result.priceWarnings && result.priceWarnings.length > 0 && (
          <Card withBorder>
            <Text fw={600} mb="xs" c="yellow">
              {t("feeBill.priceWarnings")}
            </Text>
            <List size="sm">
              {result.priceWarnings.map((w, i) => (
                <List.Item key={i}>
                  {w.feeServiceName ?? w.feeServiceId} — {w.period} {w.year}
                </List.Item>
              ))}
            </List>
          </Card>
        )}
      </Stack>
    );
  }

  FeeBillsPage.getLayout = (page: ReactElement) => (
    <AdminLayout>{page}</AdminLayout>
  );

  export default FeeBillsPage;
  ```

- [ ] **Step 2: Verify — `pnpm lint && pnpm type-check`. Open `/admin/fee-bills`, switch tabs, click Generate-all, confirm; inspect result modal (created/skipped/priceWarnings). Delete an unpaid bill.**

- [ ] **Step 3: Commit.**
  ```
  git add src/pages/admin/fee-bills/index.tsx
  git commit -m "feat(fee-bills): combined admin list with generate-all (fee + service tabs)"
  ```

---

## Task 23: Admin service-fees list + detail page

**Files:**
- Create: `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/service-fees/index.tsx`
- Create: `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/service-fees/[id].tsx`

- [ ] **Step 1: List page.**

  Write the following to `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/service-fees/index.tsx`:

  ```tsx
  "use client";

  import {
    ActionIcon,
    Badge,
    Button,
    Group,
    Modal,
    MultiSelect,
    NumberInput,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    Text,
    TextInput,
    Tooltip,
  } from "@mantine/core";
  import { useForm } from "@mantine/form";
  import { useDisclosure } from "@mantine/hooks";
  import { notifications } from "@mantine/notifications";
  import { IconEdit, IconPlus } from "@tabler/icons-react";
  import Link from "next/link";
  import { useTranslations } from "next-intl";
  import type { ReactElement } from "react";
  import { useState } from "react";
  import AdminLayout from "@/components/layouts/AdminLayout";
  import TablePagination from "@/components/ui/TablePagination";
  import PageHeader from "@/components/ui/PageHeader/PageHeader";
  import { useAcademicYears } from "@/hooks/api/useAcademicYears";
  import { useClassAcademics } from "@/hooks/api/useClassAcademics";
  import {
    useCreateServiceFee,
    useServiceFees,
  } from "@/hooks/api/useServiceFees";
  import { PERIODS } from "@/lib/business-logic/tuition-generator";
  import type { NextPageWithLayout } from "@/lib/page-types";

  function formatRp(v: string | number) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return `Rp ${n.toLocaleString("id-ID")}`;
  }

  const ServiceFeesPage: NextPageWithLayout = function ServiceFeesPage() {
    const t = useTranslations();
    const [page, setPage] = useState(1);
    const [academicYearId, setAcademicYearId] = useState<string | null>(null);
    const [classAcademicId, setClassAcademicId] = useState<string | null>(null);
    const [activeOnly, setActiveOnly] = useState(true);

    const { data: ayData } = useAcademicYears({ limit: 100 });
    const activeYear = ayData?.academicYears.find((ay) => ay.isActive);
    const effectiveYearId = academicYearId ?? activeYear?.id;

    const { data: classesData } = useClassAcademics({
      limit: 100,
      academicYearId: effectiveYearId,
    });

    const { data, isLoading } = useServiceFees({
      page,
      limit: 10,
      academicYearId: effectiveYearId,
      classAcademicId: classAcademicId ?? undefined,
      isActive: activeOnly ? true : undefined,
    });

    const createMutation = useCreateServiceFee();
    const [createOpened, { open: openCreate, close: closeCreate }] =
      useDisclosure(false);

    const form = useForm({
      initialValues: {
        classAcademicId: "",
        name: "Uang Perlengkapan",
        amount: 0 as number,
        billingMonths: ["JULY", "JANUARY"] as string[],
      },
      validate: {
        classAcademicId: (v) => (v ? null : t("common.required")),
        name: (v) => (v.trim() ? null : t("common.required")),
        amount: (v) => (v > 0 ? null : t("common.required")),
        billingMonths: (v) => (v.length > 0 ? null : t("common.required")),
      },
    });

    const handleCreate = form.onSubmit((values) => {
      createMutation.mutate(
        {
          classAcademicId: values.classAcademicId,
          name: values.name,
          amount: String(values.amount),
          billingMonths: values.billingMonths,
        },
        {
          onSuccess: () => {
            notifications.show({
              color: "green",
              title: t("common.success"),
              message: t("serviceFee.created"),
            });
            form.reset();
            closeCreate();
          },
          onError: (err) =>
            notifications.show({
              color: "red",
              title: t("common.error"),
              message: err.message,
            }),
        },
      );
    });

    const yearOptions =
      ayData?.academicYears.map((ay) => ({
        value: ay.id,
        label: `${ay.year}${ay.isActive ? ` (${t("common.active")})` : ""}`,
      })) ?? [];

    const classOptions =
      classesData?.classAcademics.map((c) => ({
        value: c.id,
        label: c.className,
      })) ?? [];

    return (
      <>
        <PageHeader
          title={t("serviceFee.title")}
          description={t("serviceFee.description")}
          actions={
            <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
              {t("serviceFee.create")}
            </Button>
          }
        />

        <Paper withBorder p="md" mb="md">
          <Group gap="md" wrap="wrap">
            <Select
              placeholder={t("feeService.academicYear")}
              data={yearOptions}
              value={academicYearId}
              onChange={setAcademicYearId}
              clearable
              w={220}
            />
            <Select
              placeholder={t("classAcademic.label")}
              data={classOptions}
              value={classAcademicId}
              onChange={setClassAcademicId}
              clearable
              searchable
              w={240}
            />
            <Switch
              label={t("feeService.activeOnly")}
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.currentTarget.checked)}
            />
          </Group>
        </Paper>

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("serviceFee.name")}</Table.Th>
                <Table.Th>{t("classAcademic.label")}</Table.Th>
                <Table.Th>{t("serviceFee.amount")}</Table.Th>
                <Table.Th>{t("serviceFee.billingMonths")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
                <Table.Th style={{ width: 80 }}>{t("common.actions")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("common.loading")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : !data?.serviceFees.length ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("common.noData")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                data.serviceFees.map((sf) => (
                  <Table.Tr key={sf.id}>
                    <Table.Td>
                      <Link
                        href={`/admin/service-fees/${sf.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Text fw={500}>{sf.name}</Text>
                      </Link>
                    </Table.Td>
                    <Table.Td>{sf.classAcademic?.className ?? "-"}</Table.Td>
                    <Table.Td>{formatRp(sf.amount)}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {sf.billingMonths.map((m) => (
                          <Badge key={m} variant="light" size="sm">
                            {t(`months.${m}`)}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={sf.isActive ? "green" : "gray"}>
                        {sf.isActive ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={t("common.edit")}>
                        <ActionIcon
                          variant="subtle"
                          component={Link}
                          href={`/admin/service-fees/${sf.id}`}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
          {data && (
            <Stack p="md">
              <TablePagination
                page={page}
                totalPages={data.totalPages}
                onChange={setPage}
              />
            </Stack>
          )}
        </Paper>

        <Modal
          opened={createOpened}
          onClose={closeCreate}
          title={t("serviceFee.create")}
        >
          <form onSubmit={handleCreate}>
            <Stack gap="md">
              <Select
                label={t("classAcademic.label")}
                required
                data={classOptions}
                searchable
                {...form.getInputProps("classAcademicId")}
              />
              <TextInput
                label={t("serviceFee.name")}
                required
                {...form.getInputProps("name")}
              />
              <NumberInput
                label={t("serviceFee.amount")}
                required
                min={1}
                prefix="Rp "
                thousandSeparator="."
                decimalSeparator=","
                {...form.getInputProps("amount")}
              />
              <MultiSelect
                label={t("serviceFee.billingMonths")}
                required
                data={PERIODS.map((p) => ({
                  value: p,
                  label: t(`months.${p}`),
                }))}
                {...form.getInputProps("billingMonths")}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeCreate}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={createMutation.isPending}>
                  {t("common.save")}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </>
    );
  };
  ServiceFeesPage.getLayout = (page: ReactElement) => (
    <AdminLayout>{page}</AdminLayout>
  );

  export default ServiceFeesPage;
  ```

- [ ] **Step 2: Detail page.**

  Write the following to `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/service-fees/[id].tsx`:

  ```tsx
  "use client";

  import {
    Badge,
    Button,
    Card,
    Group,
    LoadingOverlay,
    MultiSelect,
    NumberInput,
    Paper,
    Stack,
    Switch,
    Table,
    Text,
    TextInput,
    Title,
  } from "@mantine/core";
  import { useForm } from "@mantine/form";
  import { notifications } from "@mantine/notifications";
  import dayjs from "dayjs";
  import { useRouter } from "next/router";
  import { useTranslations } from "next-intl";
  import type { ReactElement } from "react";
  import { useEffect } from "react";
  import AdminLayout from "@/components/layouts/AdminLayout";
  import PageHeader from "@/components/ui/PageHeader/PageHeader";
  import { useClassRoster } from "@/hooks/api/useClassAcademics";
  import {
    useServiceFee,
    useUpdateServiceFee,
  } from "@/hooks/api/useServiceFees";
  import { useServiceFeeBills } from "@/hooks/api/useServiceFeeBills";
  import { PERIODS } from "@/lib/business-logic/tuition-generator";
  import type { NextPageWithLayout } from "@/lib/page-types";

  function formatRp(v: string | number) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return `Rp ${n.toLocaleString("id-ID")}`;
  }

  const ServiceFeeDetailPage: NextPageWithLayout =
    function ServiceFeeDetailPage() {
      const router = useRouter();
      const t = useTranslations();
      const { id } = router.query as { id: string };

      const { data: serviceFee, isLoading } = useServiceFee(id);
      const update = useUpdateServiceFee(id);

      const { data: roster } = useClassRoster(serviceFee?.classAcademicId);
      const { data: bills } = useServiceFeeBills({
        serviceFeeId: id,
        limit: 20,
      });

      const form = useForm({
        initialValues: {
          name: "",
          amount: 0 as number,
          billingMonths: [] as string[],
          isActive: true,
        },
      });

      useEffect(() => {
        if (serviceFee) {
          form.setValues({
            name: serviceFee.name,
            amount: Number(serviceFee.amount),
            billingMonths: serviceFee.billingMonths,
            isActive: serviceFee.isActive,
          });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [serviceFee?.id]);

      const handleSave = form.onSubmit((values) => {
        update.mutate(
          {
            name: values.name,
            amount: String(values.amount),
            billingMonths: values.billingMonths,
            isActive: values.isActive,
          },
          {
            onSuccess: () =>
              notifications.show({
                color: "green",
                title: t("common.success"),
                message: t("serviceFee.updated"),
              }),
            onError: (err) =>
              notifications.show({
                color: "red",
                title: t("common.error"),
                message: err.message,
              }),
          },
        );
      });

      if (isLoading || !serviceFee) return <LoadingOverlay visible />;

      return (
        <>
          <PageHeader
            title={serviceFee.name}
            description={serviceFee.classAcademic?.className ?? ""}
          />
          <Stack gap="lg">
            <Card withBorder>
              <form onSubmit={handleSave}>
                <Stack gap="md">
                  <Title order={5}>{t("serviceFee.settings")}</Title>
                  <TextInput
                    label={t("serviceFee.name")}
                    required
                    {...form.getInputProps("name")}
                  />
                  <NumberInput
                    label={t("serviceFee.amount")}
                    required
                    min={1}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                    {...form.getInputProps("amount")}
                  />
                  <MultiSelect
                    label={t("serviceFee.billingMonths")}
                    required
                    data={PERIODS.map((p) => ({
                      value: p,
                      label: t(`months.${p}`),
                    }))}
                    {...form.getInputProps("billingMonths")}
                  />
                  <Switch
                    label={t("serviceFee.active")}
                    {...form.getInputProps("isActive", { type: "checkbox" })}
                  />
                  <Group justify="flex-end">
                    <Button type="submit" loading={update.isPending}>
                      {t("common.save")}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Card>

            <Card withBorder>
              <Title order={5} mb="sm">
                {t("serviceFee.roster")}
              </Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("student.nis")}</Table.Th>
                    <Table.Th>{t("student.name")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(roster?.students ?? []).length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={2}>
                        <Text ta="center" c="dimmed" py="sm">
                          {t("serviceFee.noStudents")}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    roster?.students.map((s) => (
                      <Table.Tr key={s.nis}>
                        <Table.Td>{s.nis}</Table.Td>
                        <Table.Td>{s.name}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Card>

            <Card withBorder>
              <Title order={5} mb="sm">
                {t("serviceFee.recentBills")}
              </Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("student.name")}</Table.Th>
                    <Table.Th>{t("feeBill.period")}</Table.Th>
                    <Table.Th>{t("feeBill.amount")}</Table.Th>
                    <Table.Th>{t("feeBill.paid")}</Table.Th>
                    <Table.Th>{t("common.status")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(bills?.serviceFeeBills ?? []).length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text ta="center" c="dimmed" py="sm">
                          {t("feeBill.noBills")}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    bills?.serviceFeeBills.map((b) => (
                      <Table.Tr key={b.id}>
                        <Table.Td>{b.student?.name ?? b.studentNis}</Table.Td>
                        <Table.Td>
                          {t(`months.${b.period}`)} {b.year}
                        </Table.Td>
                        <Table.Td>{formatRp(b.amount)}</Table.Td>
                        <Table.Td>{formatRp(b.paidAmount)}</Table.Td>
                        <Table.Td>
                          <Badge>
                            {t(`tuition.status.${b.status.toLowerCase()}`)}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Card>
          </Stack>
        </>
      );
    };

  ServiceFeeDetailPage.getLayout = (page: ReactElement) => (
    <AdminLayout>{page}</AdminLayout>
  );

  export default ServiceFeeDetailPage;
  ```

  Note: this assumes `useClassRoster(classAcademicId)` returns `{ students: [{ nis, name }] }`. If that hook does not yet exist at this point in the task order, add a minimal wrapper inside `src/hooks/api/useClassAcademics.ts` that calls `GET /api/v1/class-academics/[id]/students` or reuse an existing roster endpoint. If the existing hooks expose class roster differently (e.g. via `useStudents({ classAcademicId })`), swap the call accordingly — the type shape in the JSX above ({ nis, name }) is what matters.

- [ ] **Step 3: Verify — `pnpm lint && pnpm type-check`. Open `/admin/service-fees`, create a service fee for a class (billingMonths JULY + JANUARY), click into detail, edit amount, toggle isActive, verify roster and recent bills render.**

- [ ] **Step 4: Commit.**
  ```
  git add src/pages/admin/service-fees/index.tsx src/pages/admin/service-fees/[id].tsx
  git commit -m "feat(service-fees): add admin list and detail pages"
  ```

---

## Task 24: Payment recording page — multi-bill picker

**Files:**
- Modify: `/Users/ferdylim/Workspace/school-tuition-system/src/components/forms/PaymentForm.tsx` (full rewrite)
- Keep as-is: `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/payments/new.tsx` (already renders `<PaymentForm />`)

- [ ] **Step 1: Read existing `PaymentForm.tsx` to confirm current hook shape (`useCreatePayment` was extended in Task 12/18 to accept multi-item body `{ studentNis, paymentDate?, notes?, items: [...] }` per spec §6.4). If the hook returns `{ transactionId, payments }`, the form below assumes that shape.**

- [ ] **Step 2: Full rewrite of `PaymentForm.tsx` with outstanding-items list (tuition + fee bills + service fee bills), per-item amount-to-pay, per-item scholarship field (Tuition only), submit as one multi-item payment.**

  Overwrite `/Users/ferdylim/Workspace/school-tuition-system/src/components/forms/PaymentForm.tsx` with:

  ```tsx
  "use client";

  import {
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    Divider,
    Group,
    List,
    Modal,
    NumberFormatter,
    NumberInput,
    Paper,
    Select,
    Stack,
    Table,
    Text,
    Textarea,
  } from "@mantine/core";
  import { notifications } from "@mantine/notifications";
  import {
    IconAlertCircle,
    IconCash,
    IconCheck,
    IconPrinter,
    IconUser,
  } from "@tabler/icons-react";
  import { useRouter } from "next/router";
  import { useTranslations } from "next-intl";
  import { useMemo, useState } from "react";
  import { useFeeBills } from "@/hooks/api/useFeeBills";
  import { useCreatePayment } from "@/hooks/api/usePayments";
  import { useServiceFeeBills } from "@/hooks/api/useServiceFeeBills";
  import { useStudents } from "@/hooks/api/useStudents";
  import { useTuitions } from "@/hooks/api/useTuitions";

  type ItemType = "TUITION" | "FEE" | "SERVICE_FEE";

  interface OutstandingRow {
    key: string;
    type: ItemType;
    id: string;
    description: string;
    period: string;
    year: number;
    remaining: number;
    maxScholarship: number;
  }

  interface ItemInput {
    amount: number | "";
    scholarshipAmount: number | "";
  }

  interface CreatePaymentResult {
    transactionId: string;
    payments: Array<{
      id: string;
      amount: string;
      tuitionId?: string | null;
      feeBillId?: string | null;
      serviceFeeBillId?: string | null;
    }>;
    itemErrors?: Array<{ index: number; message: string }>;
  }

  export default function PaymentForm() {
    const t = useTranslations();
    const router = useRouter();
    const [studentNis, setStudentNis] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [inputs, setInputs] = useState<Record<string, ItemInput>>({});
    const [result, setResult] = useState<CreatePaymentResult | null>(null);

    const { data: studentsData } = useStudents({ limit: 1000 });
    const { data: tuitionsData } = useTuitions({
      limit: 100,
      studentNis: studentNis || undefined,
    });
    const { data: feeBillsData } = useFeeBills({
      limit: 100,
      studentNis: studentNis || undefined,
    });
    const { data: serviceFeeBillsData } = useServiceFeeBills({
      limit: 100,
      studentNis: studentNis || undefined,
    });

    const createPayment = useCreatePayment();

    const outstanding: OutstandingRow[] = useMemo(() => {
      if (!studentNis) return [];
      const rows: OutstandingRow[] = [];

      for (const tu of tuitionsData?.tuitions ?? []) {
        if (tu.status !== "UNPAID" && tu.status !== "PARTIAL") continue;
        const fee = Number(tu.feeAmount);
        const scholarship = Number(
          tu.scholarshipSummary?.totalAmount ?? tu.scholarshipAmount ?? 0,
        );
        const discount = Number(tu.discountAmount ?? 0);
        const effective = Math.max(fee - scholarship - discount, 0);
        const remaining = Math.max(effective - Number(tu.paidAmount), 0);
        if (remaining <= 0) continue;
        rows.push({
          key: `tuition:${tu.id}`,
          type: "TUITION",
          id: tu.id,
          description: `${t("payment.tuitionFee")}`,
          period: tu.period,
          year: tu.year,
          remaining,
          maxScholarship: 0, // scholarship already baked in, disable per-item scholarship entry here
        });
      }

      for (const b of feeBillsData?.feeBills ?? []) {
        if (b.status !== "UNPAID" && b.status !== "PARTIAL") continue;
        const remaining = Math.max(
          Number(b.amount) - Number(b.paidAmount),
          0,
        );
        if (remaining <= 0) continue;
        rows.push({
          key: `fee:${b.id}`,
          type: "FEE",
          id: b.id,
          description: b.feeService?.name ?? t("feeBill.label"),
          period: b.period,
          year: b.year,
          remaining,
          maxScholarship: 0,
        });
      }

      for (const b of serviceFeeBillsData?.serviceFeeBills ?? []) {
        if (b.status !== "UNPAID" && b.status !== "PARTIAL") continue;
        const remaining = Math.max(
          Number(b.amount) - Number(b.paidAmount),
          0,
        );
        if (remaining <= 0) continue;
        rows.push({
          key: `service:${b.id}`,
          type: "SERVICE_FEE",
          id: b.id,
          description: b.serviceFee?.name ?? t("serviceFee.label"),
          period: b.period,
          year: b.year,
          remaining,
          maxScholarship: 0,
        });
      }

      return rows;
    }, [studentNis, tuitionsData, feeBillsData, serviceFeeBillsData, t]);

    const toggle = (row: OutstandingRow) => {
      setSelected((prev) => {
        const next = { ...prev, [row.key]: !prev[row.key] };
        return next;
      });
      setInputs((prev) => {
        if (prev[row.key]) return prev;
        return {
          ...prev,
          [row.key]: { amount: row.remaining, scholarshipAmount: "" },
        };
      });
    };

    const updateInput = (key: string, patch: Partial<ItemInput>) => {
      setInputs((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? { amount: "", scholarshipAmount: "" }), ...patch },
      }));
    };

    const totalSelected = useMemo(() => {
      return outstanding.reduce((sum, row) => {
        if (!selected[row.key]) return sum;
        const amt = Number(inputs[row.key]?.amount ?? 0);
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0);
    }, [outstanding, selected, inputs]);

    const selectedCount = Object.values(selected).filter(Boolean).length;

    const handleSubmit = () => {
      if (!studentNis) return;
      const items = outstanding
        .filter((row) => selected[row.key])
        .map((row) => {
          const amt = Number(inputs[row.key]?.amount ?? 0);
          const sch = Number(inputs[row.key]?.scholarshipAmount ?? 0);
          const base: {
            tuitionId?: string;
            feeBillId?: string;
            serviceFeeBillId?: string;
            amount: string;
            scholarshipAmount?: string;
          } = { amount: String(amt) };
          if (row.type === "TUITION") base.tuitionId = row.id;
          else if (row.type === "FEE") base.feeBillId = row.id;
          else base.serviceFeeBillId = row.id;
          if (row.type === "TUITION" && sch > 0) {
            base.scholarshipAmount = String(sch);
          }
          return base;
        });

      if (items.length === 0) {
        notifications.show({
          color: "red",
          title: t("common.validationError"),
          message: t("payment.selectAtLeastOne"),
        });
        return;
      }

      createPayment.mutate(
        {
          studentNis,
          notes: notes || undefined,
          items,
        },
        {
          onSuccess: (data) => {
            setResult(data as CreatePaymentResult);
            setSelected({});
            setInputs({});
            setNotes("");
            notifications.show({
              color: "green",
              title: t("payment.paymentSuccessful"),
              message: t("payment.transactionCreated", {
                id: (data as CreatePaymentResult).transactionId.slice(0, 8),
              }),
            });
          },
          onError: (err) => {
            notifications.show({
              color: "red",
              title: t("payment.paymentFailed"),
              message: err.message,
            });
          },
        },
      );
    };

    const studentOptions =
      studentsData?.students.map((s) => ({
        value: s.nis,
        label: `${s.nis} - ${s.name}`,
      })) ?? [];

    return (
      <Paper withBorder p="lg">
        <Stack gap="md">
          <Select
            label={t("payment.selectStudentLabel")}
            placeholder={t("payment.searchStudentPlaceholder")}
            leftSection={<IconUser size={18} />}
            data={studentOptions}
            value={studentNis}
            onChange={(v) => {
              setStudentNis(v);
              setSelected({});
              setInputs({});
              setResult(null);
            }}
            searchable
            required
          />

          {studentNis && outstanding.length === 0 && (
            <Alert icon={<IconCheck size={18} />} color="green" variant="light">
              {t("payment.allComplete")}
            </Alert>
          )}

          {studentNis && outstanding.length > 0 && (
            <Card withBorder>
              <Stack gap="sm">
                <Text fw={600}>{t("payment.outstandingItems")}</Text>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: 36 }}></Table.Th>
                      <Table.Th>{t("payment.type")}</Table.Th>
                      <Table.Th>{t("payment.description")}</Table.Th>
                      <Table.Th>{t("feeBill.period")}</Table.Th>
                      <Table.Th>{t("payment.remaining")}</Table.Th>
                      <Table.Th style={{ width: 180 }}>
                        {t("payment.amountToPay")}
                      </Table.Th>
                      <Table.Th style={{ width: 180 }}>
                        {t("payment.scholarship")}
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {outstanding.map((row) => {
                      const isSelected = !!selected[row.key];
                      const input = inputs[row.key] ?? {
                        amount: "",
                        scholarshipAmount: "",
                      };
                      return (
                        <Table.Tr key={row.key}>
                          <Table.Td>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggle(row)}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={
                                row.type === "TUITION"
                                  ? "blue"
                                  : row.type === "FEE"
                                    ? "orange"
                                    : "grape"
                              }
                              variant="light"
                            >
                              {t(`payment.itemType.${row.type}`)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{row.description}</Table.Td>
                          <Table.Td>
                            {t(`months.${row.period}`)} {row.year}
                          </Table.Td>
                          <Table.Td>
                            <NumberFormatter
                              value={row.remaining}
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              disabled={!isSelected}
                              min={0}
                              max={row.remaining}
                              value={input.amount}
                              onChange={(v) =>
                                updateInput(row.key, {
                                  amount: typeof v === "number" ? v : "",
                                })
                              }
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              disabled={!isSelected || row.type !== "TUITION"}
                              min={0}
                              value={input.scholarshipAmount}
                              onChange={(v) =>
                                updateInput(row.key, {
                                  scholarshipAmount:
                                    typeof v === "number" ? v : "",
                                })
                              }
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>

                <Divider />
                <Group justify="space-between">
                  <Text>
                    {t("payment.selectedCount", { count: selectedCount })}
                  </Text>
                  <Text fw={600}>
                    {t("payment.total")}{" "}
                    <NumberFormatter
                      value={totalSelected}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Text>
                </Group>
              </Stack>
            </Card>
          )}

          {studentNis && outstanding.length > 0 && (
            <>
              <Textarea
                label={t("payment.notesOptional")}
                placeholder={t("payment.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                rows={2}
              />

              <Alert icon={<IconAlertCircle size={18} />} color="blue" variant="light">
                {t("payment.multiItemExplainer")}
              </Alert>

              <Group>
                <Button
                  leftSection={<IconCash size={18} />}
                  onClick={handleSubmit}
                  loading={createPayment.isPending}
                  disabled={selectedCount === 0 || totalSelected <= 0}
                >
                  {t("payment.processPayment")}
                </Button>
                <Button
                  variant="light"
                  onClick={() => router.push("/admin/payments")}
                >
                  {t("payment.viewPayments")}
                </Button>
              </Group>
            </>
          )}

          {result && (
            <Modal
              opened
              onClose={() => setResult(null)}
              title={t("payment.paymentProcessed")}
              size="lg"
            >
              <Stack gap="md">
                <Group>
                  <Badge color="green" size="lg">
                    {t("payment.transactionId")}:{" "}
                    {result.transactionId.slice(0, 8).toUpperCase()}
                  </Badge>
                </Group>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t("payment.type")}</Table.Th>
                      <Table.Th>{t("payment.amount")}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {result.payments.map((p) => (
                      <Table.Tr key={p.id}>
                        <Table.Td>
                          {p.tuitionId
                            ? t("payment.itemType.TUITION")
                            : p.feeBillId
                              ? t("payment.itemType.FEE")
                              : t("payment.itemType.SERVICE_FEE")}
                        </Table.Td>
                        <Table.Td>
                          <NumberFormatter
                            value={p.amount}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                {result.itemErrors && result.itemErrors.length > 0 && (
                  <Alert color="red" icon={<IconAlertCircle size={18} />}>
                    <Text fw={600} mb={4}>
                      {t("payment.partialFailureTitle")}
                    </Text>
                    <List size="sm">
                      {result.itemErrors.map((e, i) => (
                        <List.Item key={i}>
                          #{e.index + 1}: {e.message}
                        </List.Item>
                      ))}
                    </List>
                  </Alert>
                )}

                <Group justify="flex-end">
                  <Button
                    variant="light"
                    leftSection={<IconPrinter size={16} />}
                    onClick={() =>
                      router.push(
                        `/admin/payments/print?transactionId=${result.transactionId}`,
                      )
                    }
                  >
                    {t("invoice.print")}
                  </Button>
                  <Button onClick={() => setResult(null)}>
                    {t("common.close")}
                  </Button>
                </Group>
              </Stack>
            </Modal>
          )}
        </Stack>
      </Paper>
    );
  }
  ```

- [ ] **Step 3: Verify — `pnpm lint && pnpm type-check`. Open `/admin/payments/new`: pick a student, check the combined outstanding list renders Tuition + fee bills + service fee bills; select a mix, confirm Scholarship input is disabled on non-Tuition rows; submit; inspect result modal showing `transactionId` and per-row lines; hit "Print" and confirm it navigates.**

- [ ] **Step 4: Commit.**
  ```
  git add src/components/forms/PaymentForm.tsx
  git commit -m "feat(payments): multi-bill picker (tuition + fee + service fee) with transaction"
  ```

---

## Task 25: Student detail page — subscriptions + fee bills sections

**Files:**
- Modify: `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/students/[nis].tsx`

- [ ] **Step 1: Add two new cards after the existing Grid in `[nis].tsx`. Introduce two small inline components `SubscriptionsSection` and `FeeBillsSection` inside the same file (or extract later).**

  Apply the following edit to `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/students/[nis].tsx`.

  First, add the imports near the existing ones (top of file), preserving what's already there. Ensure the final import block contains these additions:

  ```tsx
  import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Divider,
    Grid,
    Group,
    LoadingOverlay,
    Modal,
    NumberFormatter,
    Paper,
    Select,
    Stack,
    Table,
    Text,
    Title,
    Tooltip,
  } from "@mantine/core";
  import { DatePickerInput } from "@mantine/dates";
  import { useDisclosure } from "@mantine/hooks";
  import { modals } from "@mantine/modals";
  import { notifications } from "@mantine/notifications";
  import {
    IconAlertCircle,
    IconCheck,
    IconKey,
    IconPlus,
    IconTrash,
    IconUserPlus,
  } from "@tabler/icons-react";
  import dayjs from "dayjs";
  ```

  Then import the new hooks:

  ```tsx
  import { useFeeBills } from "@/hooks/api/useFeeBills";
  import { useFeeServices } from "@/hooks/api/useFeeServices";
  import { useServiceFeeBills } from "@/hooks/api/useServiceFeeBills";
  import {
    useCreateFeeSubscription,
    useEndFeeSubscription,
    useFeeSubscriptions,
  } from "@/hooks/api/useFeeSubscriptions";
  ```

  At the end of the main `<Grid>` (right before the closing `</Grid>`), render two full-width columns:

  ```tsx
  <Grid.Col span={12}>
    <SubscriptionsSection nis={student.nis} />
  </Grid.Col>
  <Grid.Col span={12}>
    <FeeBillsSection nis={student.nis} />
  </Grid.Col>
  ```

  Below the main page component (same file) add:

  ```tsx
  function formatRp(v: string | number) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return `Rp ${n.toLocaleString("id-ID")}`;
  }

  function SubscriptionsSection({ nis }: { nis: string }) {
    const t = useTranslations();
    const { data, isLoading } = useFeeSubscriptions({ studentNis: nis, limit: 50 });
    const { data: services } = useFeeServices({ isActive: true, limit: 200 });
    const create = useCreateFeeSubscription();
    const endSub = useEndFeeSubscription();
    const [opened, { open, close }] = useDisclosure(false);
    const [feeServiceId, setFeeServiceId] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(null);

    const subs = data?.subscriptions ?? [];

    const handleCreate = () => {
      if (!feeServiceId || !startDate) return;
      create.mutate(
        {
          feeServiceId,
          studentNis: nis,
          startDate: dayjs(startDate).format("YYYY-MM-DD"),
          endDate: endDate ? dayjs(endDate).format("YYYY-MM-DD") : undefined,
        },
        {
          onSuccess: () => {
            notifications.show({
              color: "green",
              title: t("common.success"),
              message: t("feeService.subscribed"),
            });
            close();
            setFeeServiceId(null);
            setStartDate(new Date());
            setEndDate(null);
          },
          onError: (err) =>
            notifications.show({
              color: "red",
              title: t("common.error"),
              message: err.message,
            }),
        },
      );
    };

    const handleEnd = (id: string) =>
      modals.openConfirmModal({
        title: t("feeService.endSubscriptionTitle"),
        children: <Text size="sm">{t("feeService.endSubscriptionConfirm", { name: "" })}</Text>,
        labels: { confirm: t("common.confirm"), cancel: t("common.cancel") },
        onConfirm: () =>
          endSub.mutate({ id, endDate: dayjs().format("YYYY-MM-DD") }),
      });

    return (
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={5}>{t("student.subscriptions")}</Title>
          <Button size="xs" leftSection={<IconPlus size={14} />} onClick={open}>
            {t("feeService.subscribeStudent")}
          </Button>
        </Group>
        {isLoading ? (
          <Text c="dimmed">{t("common.loading")}</Text>
        ) : subs.length === 0 ? (
          <Text c="dimmed">{t("feeService.noSubscribers")}</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("feeService.name")}</Table.Th>
                <Table.Th>{t("feeService.category.label")}</Table.Th>
                <Table.Th>{t("feeService.startDate")}</Table.Th>
                <Table.Th>{t("feeService.endDate")}</Table.Th>
                <Table.Th style={{ width: 120 }}>{t("common.actions")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {subs.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td>{s.feeService?.name ?? "-"}</Table.Td>
                  <Table.Td>
                    {s.feeService?.category
                      ? t(`feeService.category.${s.feeService.category.toLowerCase()}`)
                      : "-"}
                  </Table.Td>
                  <Table.Td>{dayjs(s.startDate).format("DD MMM YYYY")}</Table.Td>
                  <Table.Td>
                    {s.endDate ? (
                      dayjs(s.endDate).format("DD MMM YYYY")
                    ) : (
                      <Badge color="green" variant="light">
                        {t("feeService.active")}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {!s.endDate && (
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => handleEnd(s.id)}
                      >
                        {t("feeService.endSubscription")}
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Modal
          opened={opened}
          onClose={close}
          title={t("feeService.subscribeStudent")}
        >
          <Stack gap="md">
            <Select
              label={t("feeService.label")}
              required
              searchable
              data={(services?.feeServices ?? []).map((f) => ({
                value: f.id,
                label: `${f.name} — ${t(`feeService.category.${f.category.toLowerCase()}`)}`,
              }))}
              value={feeServiceId}
              onChange={setFeeServiceId}
            />
            <DatePickerInput
              label={t("feeService.startDate")}
              required
              value={startDate}
              onChange={setStartDate}
            />
            <DatePickerInput
              label={t("feeService.endDate")}
              clearable
              value={endDate}
              onChange={setEndDate}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreate} loading={create.isPending}>
                {t("common.save")}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Card>
    );
  }

  function FeeBillsSection({ nis }: { nis: string }) {
    const t = useTranslations();
    const [page, setPage] = useState(1);
    const [period, setPeriod] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    const { data: feeBillsData } = useFeeBills({
      studentNis: nis,
      page,
      limit: 10,
      period: period || undefined,
      status: status as "UNPAID" | "PARTIAL" | "PAID" | "VOID" | undefined,
    });
    const { data: serviceFeeBillsData } = useServiceFeeBills({
      studentNis: nis,
      page,
      limit: 10,
      period: period || undefined,
      status: status as "UNPAID" | "PARTIAL" | "PAID" | "VOID" | undefined,
    });

    type Row = {
      key: string;
      type: "FEE" | "SERVICE_FEE";
      description: string;
      period: string;
      year: number;
      amount: string;
      paidAmount: string;
      status: string;
    };

    const rows: Row[] = [
      ...(feeBillsData?.feeBills ?? []).map((b) => ({
        key: `fee:${b.id}`,
        type: "FEE" as const,
        description: b.feeService?.name ?? t("feeBill.label"),
        period: b.period,
        year: b.year,
        amount: b.amount,
        paidAmount: b.paidAmount,
        status: b.status,
      })),
      ...(serviceFeeBillsData?.serviceFeeBills ?? []).map((b) => ({
        key: `svc:${b.id}`,
        type: "SERVICE_FEE" as const,
        description: b.serviceFee?.name ?? t("serviceFee.label"),
        period: b.period,
        year: b.year,
        amount: b.amount,
        paidAmount: b.paidAmount,
        status: b.status,
      })),
    ].sort((a, b) =>
      a.year !== b.year ? b.year - a.year : a.period.localeCompare(b.period),
    );

    return (
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={5}>{t("student.feeBills")}</Title>
          <Group>
            <Select
              placeholder={t("feeBill.period")}
              data={[
                "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER",
                "JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
              ].map((p) => ({ value: p, label: t(`months.${p}`) }))}
              value={period}
              onChange={setPeriod}
              clearable
              w={160}
            />
            <Select
              placeholder={t("common.status")}
              data={["UNPAID", "PARTIAL", "PAID", "VOID"].map((s) => ({
                value: s,
                label: t(`tuition.status.${s.toLowerCase()}`),
              }))}
              value={status}
              onChange={setStatus}
              clearable
              w={160}
            />
          </Group>
        </Group>
        {rows.length === 0 ? (
          <Text c="dimmed">{t("feeBill.noBills")}</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("payment.type")}</Table.Th>
                <Table.Th>{t("payment.description")}</Table.Th>
                <Table.Th>{t("feeBill.period")}</Table.Th>
                <Table.Th>{t("feeBill.amount")}</Table.Th>
                <Table.Th>{t("feeBill.paid")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.key}>
                  <Table.Td>
                    <Badge
                      color={r.type === "FEE" ? "orange" : "grape"}
                      variant="light"
                    >
                      {t(`payment.itemType.${r.type}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{r.description}</Table.Td>
                  <Table.Td>
                    {t(`months.${r.period}`)} {r.year}
                  </Table.Td>
                  <Table.Td>{formatRp(r.amount)}</Table.Td>
                  <Table.Td>{formatRp(r.paidAmount)}</Table.Td>
                  <Table.Td>
                    <Badge>{t(`tuition.status.${r.status.toLowerCase()}`)}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        <Group justify="center" mt="sm">
          <Button
            size="xs"
            variant="subtle"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("common.previous")}
          </Button>
          <Text size="sm">{page}</Text>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => setPage((p) => p + 1)}
          >
            {t("common.next")}
          </Button>
        </Group>
      </Card>
    );
  }
  ```

  Note: if `useFeeSubscriptions`, `useFeeBills`, `useServiceFeeBills` return arrays under different key names, rename accordingly — the shapes `subscriptions`, `feeBills`, `serviceFeeBills` match Tasks 16-19.

- [ ] **Step 2: Verify — `pnpm lint && pnpm type-check`. Navigate to `/admin/students/<nis>`: two new cards ("Subscriptions", "Fee bills") appear below the existing sidebar. Subscribe the student to a service, end it, filter bills by period+status.**

- [ ] **Step 3: Commit.**
  ```
  git add src/pages/admin/students/[nis].tsx
  git commit -m "feat(students): add subscriptions and fee bills sections to detail page"
  ```

---

## Task 26: Print payment page — add fee + service fee lines

**Files:**
- Modify: `/Users/ferdylim/Workspace/school-tuition-system/src/hooks/api/usePrintPayments.ts` (extend shape)
- Modify: `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/payments/print.tsx`
- `src/styles/print.css` — no changes expected; reuse existing `.slip-item-row`, `.inv-table tbody tr` classes.

- [ ] **Step 1: Extend `PrintPayment` type in `usePrintPayments.ts` to reflect the print API response from Task 13 (it now returns tuition, feeBill, or serviceFeeBill per payment).**

  Overwrite `/Users/ferdylim/Workspace/school-tuition-system/src/hooks/api/usePrintPayments.ts` with:

  ```ts
  "use client";

  import { useQuery } from "@tanstack/react-query";
  import { apiClient } from "@/lib/api-client";

  interface StudentRef {
    nis: string;
    name: string;
    parentName?: string;
  }

  interface ClassAcademicRef {
    className: string;
    academicYear: { year: string };
  }

  export interface PrintPayment {
    id: string;
    amount: string;
    scholarshipAmount: string;
    paymentDate: string;
    notes: string | null;
    transactionId?: string | null;
    tuition: {
      id: string;
      period: string;
      year: number;
      feeAmount: string;
      scholarshipAmount: string;
      discountAmount: string;
      paidAmount: string;
      status: string;
      student: StudentRef;
      classAcademic: ClassAcademicRef;
    } | null;
    feeBill: {
      id: string;
      period: string;
      year: number;
      amount: string;
      paidAmount: string;
      status: string;
      student: StudentRef;
      classAcademic?: ClassAcademicRef;
      feeService: { name: string; category: "TRANSPORT" | "ACCOMMODATION" };
    } | null;
    serviceFeeBill: {
      id: string;
      period: string;
      year: number;
      amount: string;
      paidAmount: string;
      status: string;
      student: StudentRef;
      classAcademic?: ClassAcademicRef;
      serviceFee: { name: string };
    } | null;
    employee: { name: string } | null;
  }

  interface PrintPaymentsResponse {
    success: boolean;
    data: { payments: PrintPayment[] };
  }

  export function usePrintPayments(params: {
    academicYearId?: string;
    mode: "today" | "all" | "student";
    studentNis?: string;
    transactionId?: string;
    enabled?: boolean;
  }) {
    return useQuery({
      queryKey: [
        "payments",
        "print",
        params.academicYearId,
        params.mode,
        params.studentNis,
        params.transactionId,
      ],
      queryFn: async () => {
        const { data } = await apiClient.get<PrintPaymentsResponse>(
          "/payments/print",
          {
            params: {
              academicYearId: params.academicYearId,
              mode: params.mode,
              studentNis: params.studentNis,
              transactionId: params.transactionId,
            },
          },
        );
        return data.data.payments;
      },
      enabled: params.enabled !== false,
    });
  }
  ```

- [ ] **Step 2: Update grouping + label builder + line rendering in `print.tsx`.**

  Apply the following edits to `/Users/ferdylim/Workspace/school-tuition-system/src/pages/admin/payments/print.tsx`:

  Replace the `groupByStudent` function body:

  ```tsx
  function getStudentRef(p: PrintPayment) {
    return (
      p.tuition?.student ??
      p.feeBill?.student ??
      p.serviceFeeBill?.student ??
      null
    );
  }

  function getClassRef(p: PrintPayment) {
    return (
      p.tuition?.classAcademic ??
      p.feeBill?.classAcademic ??
      p.serviceFeeBill?.classAcademic ??
      null
    );
  }

  function groupByStudent(payments: PrintPayment[]): StudentGroup[] {
    const groups = new Map<string, StudentGroup>();
    for (const p of payments) {
      const s = getStudentRef(p);
      const c = getClassRef(p);
      if (!s) continue;
      const nis = s.nis;
      const existing = groups.get(nis);
      const amount = parseFloat(p.amount);
      if (existing) {
        existing.payments.push(p);
        existing.total += amount;
        if (p.paymentDate > existing.latestDate) {
          existing.latestDate = p.paymentDate;
          existing.kasirName = p.employee?.name ?? existing.kasirName;
        }
      } else {
        groups.set(nis, {
          nis,
          name: s.name,
          className: c?.className ?? "",
          academicYear: c?.academicYear.year ?? "",
          payments: [p],
          total: amount,
          latestDate: p.paymentDate,
          kasirName: p.employee?.name ?? null,
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
  ```

  Add a shared label builder just above `CompactSlip`:

  ```tsx
  function buildLineLabel(
    p: PrintPayment,
    formatPeriod: (period: string) => string,
    t: ReturnType<typeof useTranslations>,
  ): string {
    if (p.tuition) {
      return `${t("invoice.tuitionShort")} ${formatPeriod(p.tuition.period)}`;
    }
    if (p.feeBill) {
      return `${p.feeBill.feeService.name} ${formatPeriod(p.feeBill.period)}`;
    }
    if (p.serviceFeeBill) {
      return `${p.serviceFeeBill.serviceFee.name} ${formatPeriod(p.serviceFeeBill.period)}`;
    }
    return "-";
  }
  ```

  Replace the inner rendering of `CompactSlip.visibleItems` to use the shared label:

  ```tsx
  {visibleItems.map((p) => (
    <div className="slip-item-row" key={p.id}>
      <span className="slip-item-label">{buildLineLabel(p, formatPeriod, t)}</span>
      <span className="slip-item-amount">
        {formatRp(parseFloat(p.amount))}
      </span>
    </div>
  ))}
  ```

  Rewrite the `FullInvoice` body so its description/amount/deduction/total row handles all three source types. Replace the entire `FullInvoice` function with:

  ```tsx
  function FullInvoice({
    payment,
    selected,
    onToggle,
  }: {
    payment: PrintPayment;
    selected: boolean;
    onToggle: (id: string) => void;
  }) {
    const t = useTranslations();
    const student = getStudentRef(payment);
    const klass = getClassRef(payment);

    const formatPeriodLocal = (period: string): string => {
      const monthKey = `months.${period}` as const;
      const monthTranslation = t.raw(monthKey);
      if (monthTranslation !== monthKey) {
        return (monthTranslation as string).slice(0, 3);
      }
      return period;
    };

    let feeAmount = 0;
    let deduction = 0;
    let stampVisible = false;
    let description = "-";

    if (payment.tuition) {
      const fee = parseFloat(payment.tuition.feeAmount);
      const scholarship = parseFloat(payment.tuition.scholarshipAmount);
      const discount = parseFloat(payment.tuition.discountAmount);
      feeAmount = fee;
      deduction = scholarship + discount;
      stampVisible = payment.tuition.status === "PAID";
      description = `${t("invoice.tuitionFee")} - ${formatPeriodLocal(payment.tuition.period)} ${payment.tuition.year}`;
    } else if (payment.feeBill) {
      feeAmount = parseFloat(payment.feeBill.amount);
      stampVisible = payment.feeBill.status === "PAID";
      description = `${payment.feeBill.feeService.name} - ${formatPeriodLocal(payment.feeBill.period)} ${payment.feeBill.year}`;
    } else if (payment.serviceFeeBill) {
      feeAmount = parseFloat(payment.serviceFeeBill.amount);
      stampVisible = payment.serviceFeeBill.status === "PAID";
      description = `${payment.serviceFeeBill.serviceFee.name} - ${formatPeriodLocal(payment.serviceFeeBill.period)} ${payment.serviceFeeBill.year}`;
    }

    const effectiveFee = feeAmount - deduction;
    const paidAmount = parseFloat(payment.amount);

    return (
      <div className="invoice-slot">
        <div className="slip-select">
          <Checkbox
            size="xs"
            checked={selected}
            onChange={() => onToggle(payment.id)}
            aria-label={student?.name ?? ""}
          />
        </div>
        {stampVisible && (
          <div className="inv-stamp">{t("invoice.paid")}</div>
        )}
        <div className="inv-header">
          <div>
            <div className="inv-school">{t("invoice.schoolName")}</div>
            <div className="inv-school-sub">{t("invoice.schoolAddress")}</div>
          </div>
          <div className="inv-receipt-label">
            <div className="label">{t("invoice.receipt")}</div>
            <div className="receipt-no">
              {payment.id.slice(0, 8).toUpperCase()}
            </div>
            <div className="receipt-date">
              {dayjs(payment.paymentDate).format("DD/MM/YYYY HH:mm")}
            </div>
          </div>
        </div>

        <div className="inv-student-row">
          <div className="inv-field">
            <span className="inv-field-label">{t("invoice.studentName")}</span>
            <span className="inv-field-value">{student?.name ?? "-"}</span>
          </div>
          <div className="inv-field">
            <span className="inv-field-label">{t("invoice.class")}</span>
            <span className="inv-field-value">{klass?.className ?? "-"}</span>
          </div>
          <div className="inv-field">
            <span className="inv-field-label">{t("invoice.nis")}</span>
            <span className="inv-field-value">{student?.nis ?? "-"}</span>
          </div>
          <div className="inv-field">
            <span className="inv-field-label">{t("invoice.academicYear")}</span>
            <span className="inv-field-value">
              {klass?.academicYear.year ?? "-"}
            </span>
          </div>
        </div>

        <table className="inv-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>{t("invoice.description")}</th>
              <th style={{ width: "22%" }} className="num">
                {t("invoice.amount")}
              </th>
              <th style={{ width: "22%" }} className="num">
                {t("invoice.deduction")}
              </th>
              <th style={{ width: "21%" }} className="num">
                {t("invoice.total")}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{description}</td>
              <td className="num">{formatRp(feeAmount)}</td>
              <td className="num">{deduction > 0 ? formatRp(deduction) : "-"}</td>
              <td className="num">{formatRp(effectiveFee)}</td>
            </tr>
            <tr className="total-row">
              <td colSpan={2}>{t("invoice.paymentReceived")}</td>
              <td className="num" colSpan={2}>
                {formatRp(paidAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="inv-footer">
          <div className="inv-footer-left">
            {payment.notes && (
              <div>
                {t("invoice.notes")}: {payment.notes}
              </div>
            )}
            <div>{t("invoice.thankYou")}</div>
          </div>
          <div className="inv-footer-right">
            <div className="inv-signature-line" />
            <div className="inv-signature-name">
              {payment.employee?.name || t("invoice.admin")}
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

  Also update the `usePrintPayments` call in `PrintInvoicePage` to pass an optional `transactionId` if present in the URL (for the post-payment "Print" deep link from Task 24):

  ```tsx
  const router = useRouter();
  const transactionId = (router.query.transactionId as string | undefined) ?? undefined;

  const { data: payments, isLoading } = usePrintPayments({
    academicYearId: mode === "student" ? undefined : effectiveYearId,
    mode,
    studentNis: mode === "student" ? (studentNis ?? undefined) : undefined,
    transactionId,
    enabled: mode === "student" ? !!studentNis : !!effectiveYearId,
  });
  ```

  Add `import { useRouter } from "next/router";` at the top if not already present.

- [ ] **Step 3: Verify — `pnpm lint && pnpm type-check`. Open `/admin/payments/print` and:
  - Compact layout: a student with a multi-item transaction shows 3 lines: "SPP Jul", "Bus A-B Jul", "Uang Perlengkapan Jul". Total sums all.
  - Full layout: one invoice per payment row with the correct description label.
  - `/admin/payments/print?transactionId=<uuid>` filters to just that transaction.**

- [ ] **Step 4: Commit.**
  ```
  git add src/hooks/api/usePrintPayments.ts src/pages/admin/payments/print.tsx
  git commit -m "feat(payments): print fee + service fee lines alongside tuition"
  ```
# Chunk E — Tasks 27-31: Portal, Sidebar, i18n, Seed, Docs

Spec: `/Users/ferdylim/Workspace/school-tuition-system/docs/superpowers/specs/2026-04-14-fees-services-design.md`

Prereqs assumed completed earlier in the plan:
- Task 2 — `src/lib/business-logic/fee-bills.ts` (generation + price resolution)
- Task 3 — `src/lib/business-logic/service-fee-bills.ts` (generation)
- Task 14 — `POST /api/v1/online-payments` accepts polymorphic items (`tuitionId | feeBillId | serviceFeeBillId`)
- Hooks: `useFeeBills`, `useServiceFeeBills`, and a portal aggregator endpoint `GET /api/v1/portal/outstanding-bills` (if not already created by portal hook tasks, Task 27 adds it).

Verification gate for every task: `pnpm lint && pnpm type-check` plus the manual steps called out. No automated test framework is in use.

Commit per task.

---

## Task 27 — Portal payment page: combined bill list

Extend `src/pages/portal/payment.tsx` so the payable list combines Tuition + FeeBill + ServiceFeeBill. A single "Pay" action POSTs a polymorphic `items` array to `POST /api/v1/online-payments`, then opens Midtrans Snap.

If no portal-side aggregator exists yet, this task adds `GET /api/v1/portal/outstanding-bills` which returns `{ tuitions, feeBills, serviceFeeBills }` for the authenticated student session.

**Files:**
- Add: `src/pages/api/v1/portal/outstanding-bills/index.ts`
- Add: `src/hooks/api/usePortalOutstanding.ts`
- Modify: `src/pages/portal/payment.tsx`
- Modify: `src/lib/query-keys.ts` (new `portal.outstanding` family)
- Modify: `src/hooks/api/useOnlinePayments.ts` — accept polymorphic `items` payload (rename/extend `tuitionIds` path)

- [ ] **Step 1: Add query-key family for portal outstanding.**

  Open `/Users/ferdylim/Workspace/school-tuition-system/src/lib/query-keys.ts` and add (inside the existing exported factory object, next to other portal-scoped keys — if no `portal` group exists, append):

  ```ts
  portal: {
    all: ["portal"] as const,
    outstanding: () => ["portal", "outstanding"] as const,
  },
  ```

- [ ] **Step 2: Create `src/pages/api/v1/portal/outstanding-bills/index.ts` endpoint.**

  Full file:

  ```ts
  import { createApiHandler } from "@/lib/api-handler";
  import { errorResponse, successResponse } from "@/lib/api-response";
  import prisma from "@/lib/prisma";
  import { requireStudentAuth } from "@/lib/student-auth";

  export default createApiHandler({
    GET: async (req) => {
      const auth = await requireStudentAuth(req);
      if (auth instanceof Response) return auth;

      const nis = auth.studentNis;

      const [tuitions, feeBills, serviceFeeBills] = await Promise.all([
        prisma.tuition.findMany({
          where: {
            studentNis: nis,
            status: { in: ["UNPAID", "PARTIAL"] },
          },
          include: {
            classAcademic: { select: { className: true } },
          },
          orderBy: [{ year: "asc" }, { period: "asc" }],
        }),
        prisma.feeBill.findMany({
          where: {
            studentNis: nis,
            status: { in: ["UNPAID", "PARTIAL"] },
            voidedByExit: false,
          },
          include: {
            feeService: { select: { name: true, category: true } },
          },
          orderBy: [{ year: "asc" }, { period: "asc" }],
        }),
        prisma.serviceFeeBill.findMany({
          where: {
            studentNis: nis,
            status: { in: ["UNPAID", "PARTIAL"] },
            voidedByExit: false,
          },
          include: {
            serviceFee: { select: { name: true } },
          },
          orderBy: [{ year: "asc" }, { period: "asc" }],
        }),
      ]);

      const mapTuition = (t: (typeof tuitions)[number]) => ({
        kind: "tuition" as const,
        id: t.id,
        label: `SPP - ${t.classAcademic.className}`,
        period: t.period,
        year: t.year,
        dueDate: t.dueDate,
        amount: Number(t.amount),
        paidAmount: Number(t.paidAmount),
        scholarshipAmount: Number(t.scholarshipAmount ?? 0),
        discountAmount: Number(t.discountAmount ?? 0),
        remainingAmount:
          Number(t.amount) -
          Number(t.paidAmount) -
          Number(t.scholarshipAmount ?? 0) -
          Number(t.discountAmount ?? 0),
        status: t.status,
      });

      const mapFeeBill = (b: (typeof feeBills)[number]) => ({
        kind: "feeBill" as const,
        id: b.id,
        label: `${b.feeService.name}`,
        category: b.feeService.category,
        period: b.period,
        year: b.year,
        dueDate: b.dueDate,
        amount: Number(b.amount),
        paidAmount: Number(b.paidAmount),
        remainingAmount: Number(b.amount) - Number(b.paidAmount),
        status: b.status,
      });

      const mapServiceFeeBill = (b: (typeof serviceFeeBills)[number]) => ({
        kind: "serviceFeeBill" as const,
        id: b.id,
        label: b.serviceFee.name,
        period: b.period,
        year: b.year,
        dueDate: b.dueDate,
        amount: Number(b.amount),
        paidAmount: Number(b.paidAmount),
        remainingAmount: Number(b.amount) - Number(b.paidAmount),
        status: b.status,
      });

      return successResponse({
        tuitions: tuitions.map(mapTuition),
        feeBills: feeBills.map(mapFeeBill),
        serviceFeeBills: serviceFeeBills.map(mapServiceFeeBill),
      });
    },
  });
  ```

  If the actual field names for scholarship/discount differ on `Tuition` (verify via `prisma/schema.prisma`), adjust the `mapTuition` function accordingly. If `requireStudentAuth` returns a different shape than `{ studentNis }`, mirror the shape used in existing portal routes (e.g. `src/pages/api/v1/portal/tuitions/index.ts`).

- [ ] **Step 3: Create `src/hooks/api/usePortalOutstanding.ts`.**

  Full file:

  ```ts
  import { useQuery } from "@tanstack/react-query";
  import { apiClient } from "@/lib/api-client";
  import { queryKeys } from "@/lib/query-keys";

  export type OutstandingBillKind = "tuition" | "feeBill" | "serviceFeeBill";

  export interface OutstandingBill {
    kind: OutstandingBillKind;
    id: string;
    label: string;
    category?: "TRANSPORT" | "ACCOMMODATION";
    period: string;
    year: number;
    dueDate: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    status: "UNPAID" | "PARTIAL" | "PAID" | "VOID";
  }

  export interface OutstandingResponse {
    tuitions: OutstandingBill[];
    feeBills: OutstandingBill[];
    serviceFeeBills: OutstandingBill[];
  }

  export function usePortalOutstanding() {
    return useQuery({
      queryKey: queryKeys.portal.outstanding(),
      queryFn: async () => {
        const res = await apiClient.get<OutstandingResponse>(
          "/api/v1/portal/outstanding-bills",
        );
        return res.data;
      },
    });
  }
  ```

  If `apiClient.get` returns a different envelope, mirror the usage in `useStudentTuitions` (which also lives in `src/hooks/api/`).

- [ ] **Step 4: Extend `useCreateOnlinePayment` to accept polymorphic items.**

  Open `/Users/ferdylim/Workspace/school-tuition-system/src/hooks/api/useOnlinePayments.ts`. Find the mutation payload type for `useCreateOnlinePayment` (currently `{ tuitionIds: string[] }`).

  Replace the payload with:

  ```ts
  export interface OnlinePaymentItemInput {
    tuitionId?: string;
    feeBillId?: string;
    serviceFeeBillId?: string;
  }

  export interface CreateOnlinePaymentInput {
    items: OnlinePaymentItemInput[];
  }
  ```

  Update the mutation body sent to `POST /api/v1/online-payments` to pass `{ items }`. The backend Task 14 already accepts this shape. Leave the mutation's invalidation list as-is but append `queryKeys.portal.outstanding()` so the bill list refreshes after a new payment.

- [ ] **Step 5: Rewrite `src/pages/portal/payment.tsx` to use combined outstanding list.**

  Full file replacement:

  ```tsx
  import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Checkbox,
    Divider,
    Group,
    Loader,
    NumberFormatter,
    Paper,
    SimpleGrid,
    Stack,
    Tabs,
    Text,
    Title,
  } from "@mantine/core";
  import { modals } from "@mantine/modals";
  import {
    IconAlertCircle,
    IconBus,
    IconCreditCard,
    IconHistory,
    IconLoader,
    IconPackage,
    IconReceipt,
    IconSchool,
    IconX,
  } from "@tabler/icons-react";
  import dayjs from "dayjs";
  import Script from "next/script";
  import { useTranslations } from "next-intl";
  import type { ReactElement } from "react";
  import { useCallback, useEffect, useMemo, useRef, useState } from "react";
  import PortalLayout from "@/components/layouts/PortalLayout";
  import { EmptyAnimation } from "@/components/ui/LottieAnimation";
  import {
    useCancelOnlinePayment,
    useCreateOnlinePayment,
    usePaymentConfig,
    useStudentOnlinePayments,
  } from "@/hooks/api/useOnlinePayments";
  import {
    type OutstandingBill,
    usePortalOutstanding,
  } from "@/hooks/api/usePortalOutstanding";
  import { usePageTitle } from "@/hooks/usePageTitle";
  import type { NextPageWithLayout } from "@/lib/page-types";

  declare global {
    interface Window {
      snap: {
        pay: (
          token: string,
          options: {
            onSuccess?: (result: Record<string, unknown>) => void;
            onPending?: (result: Record<string, unknown>) => void;
            onError?: (result: Record<string, unknown>) => void;
            onClose?: () => void;
          },
        ) => void;
      };
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "SETTLEMENT":
        return "green";
      case "PENDING":
        return "yellow";
      case "EXPIRE":
        return "gray";
      case "CANCEL":
        return "gray";
      default:
        return "red";
    }
  }

  function billKey(bill: OutstandingBill): string {
    return `${bill.kind}:${bill.id}`;
  }

  function billBadge(bill: OutstandingBill, t: ReturnType<typeof useTranslations>) {
    if (bill.kind === "tuition") {
      return { label: t("tuition.title"), color: "blue", Icon: IconSchool };
    }
    if (bill.kind === "feeBill") {
      const color = bill.category === "ACCOMMODATION" ? "grape" : "teal";
      return {
        label:
          bill.category === "ACCOMMODATION"
            ? t("feeService.category.accommodation")
            : t("feeService.category.transport"),
        color,
        Icon: IconBus,
      };
    }
    return { label: t("serviceFee.title"), color: "orange", Icon: IconPackage };
  }

  const PaymentPage: NextPageWithLayout = function PaymentPage() {
    const t = useTranslations();

    usePageTitle(t("nav.payment"));
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [snapReady, setSnapReady] = useState(false);
    const snapLoadedRef = useRef(false);

    const { data: config, isLoading: configLoading } = usePaymentConfig();
    const { data: outstanding, isLoading: outstandingLoading } =
      usePortalOutstanding();
    const { data: onlinePayments = [], isLoading: paymentsLoading } =
      useStudentOnlinePayments();

    const createPayment = useCreateOnlinePayment();
    const cancelPayment = useCancelOnlinePayment();

    const pendingPayment = useMemo(
      () => onlinePayments.find((p) => p.status === "PENDING"),
      [onlinePayments],
    );

    const allBills = useMemo<OutstandingBill[]>(() => {
      if (!outstanding) return [];
      return [
        ...outstanding.tuitions,
        ...outstanding.feeBills,
        ...outstanding.serviceFeeBills,
      ].filter((b) => b.remainingAmount > 0);
    }, [outstanding]);

    const selectedTotal = useMemo(
      () =>
        allBills
          .filter((b) => selectedKeys.has(billKey(b)))
          .reduce((sum, b) => sum + b.remainingAmount, 0),
      [allBills, selectedKeys],
    );

    const toggleSelection = (key: string) => {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };

    const selectAll = () => {
      if (selectedKeys.size === allBills.length) {
        setSelectedKeys(new Set());
      } else {
        setSelectedKeys(new Set(allBills.map(billKey)));
      }
    };

    const handleSnapCallback = useCallback(() => {
      createPayment.reset();
    }, [createPayment]);

    const handleCreatePayment = async () => {
      if (selectedKeys.size === 0) return;

      const items = allBills
        .filter((b) => selectedKeys.has(billKey(b)))
        .map((b) => {
          if (b.kind === "tuition") return { tuitionId: b.id };
          if (b.kind === "feeBill") return { feeBillId: b.id };
          return { serviceFeeBillId: b.id };
        });

      try {
        const result = await createPayment.mutateAsync({ items });

        if (window.snap && result.snapToken) {
          window.snap.pay(result.snapToken, {
            onSuccess: handleSnapCallback,
            onPending: handleSnapCallback,
            onError: handleSnapCallback,
            onClose: handleSnapCallback,
          });
        }
      } catch {
        // surfaced via mutation state
      }
    };

    const handleCancelPayment = (paymentId: string) => {
      modals.openConfirmModal({
        title: t("common.confirm"),
        children: <Text size="sm">{t("onlinePayment.cancelConfirm")}</Text>,
        labels: {
          confirm: t("onlinePayment.cancelPayment"),
          cancel: t("common.cancel"),
        },
        confirmProps: { color: "red" },
        onConfirm: () => cancelPayment.mutate(paymentId),
      });
    };

    const handleRetrySnap = () => {
      if (pendingPayment?.snapToken && window.snap) {
        window.snap.pay(pendingPayment.snapToken, {
          onSuccess: handleSnapCallback,
          onPending: handleSnapCallback,
          onError: handleSnapCallback,
          onClose: handleSnapCallback,
        });
      }
    };

    useEffect(() => {
      if (config?.snapJsUrl && !snapLoadedRef.current) {
        snapLoadedRef.current = true;
      }
    }, [config?.snapJsUrl]);

    const isLoading = configLoading || outstandingLoading || paymentsLoading;

    if (isLoading) {
      return (
        <Stack align="center" justify="center" h={300}>
          <Loader />
        </Stack>
      );
    }

    if (config && !config.enabled) {
      return (
        <Stack gap="lg">
          <Title order={3}>{t("onlinePayment.title")}</Title>
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="orange"
            variant="light"
          >
            {config.maintenanceMessage || t("onlinePayment.maintenance")}
          </Alert>
        </Stack>
      );
    }

    const allSelected =
      allBills.length > 0 && selectedKeys.size === allBills.length;
    const someSelected = selectedKeys.size > 0 && !allSelected;

    const completedPayments = onlinePayments.filter(
      (p) => p.status !== "PENDING",
    );

    return (
      <Stack gap="lg">
        {config?.snapJsUrl && (
          <Script
            src={config.snapJsUrl}
            data-client-key={config.clientKey}
            onLoad={() => setSnapReady(true)}
          />
        )}

        <Title order={3}>{t("onlinePayment.title")}</Title>

        <Tabs defaultValue="payment">
          <Tabs.List>
            <Tabs.Tab value="payment" leftSection={<IconReceipt size={16} />}>
              {t("payment.title")}
            </Tabs.Tab>
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
              {t("onlinePayment.history")}
              {completedPayments.length > 0 && (
                <Badge size="xs" ml={6} variant="filled" color="gray">
                  {completedPayments.length}
                </Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="payment" pt="md">
            <Stack gap="md">
              {pendingPayment && (
                <Card
                  withBorder
                  p="lg"
                  style={{
                    borderLeft: "4px solid var(--mantine-color-yellow-6)",
                  }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                        <IconLoader size={20} style={{ flexShrink: 0 }} />
                        <Text fw={600} truncate>
                          {t("onlinePayment.pendingPayment")}
                        </Text>
                      </Group>
                      <Badge
                        color="yellow"
                        variant="light"
                        style={{ flexShrink: 0 }}
                      >
                        {t("onlinePayment.waitingPayment")}
                      </Badge>
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                      <Stack gap={2} style={{ minWidth: 0 }}>
                        <Text size="xs" c="dimmed">
                          {t("onlinePayment.orderId")}
                        </Text>
                        <Text size="sm" fw={500} truncate>
                          {pendingPayment.orderId}
                        </Text>
                      </Stack>
                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          {t("onlinePayment.amount")}
                        </Text>
                        <Text size="sm" fw={700} c="blue">
                          <NumberFormatter
                            value={Number(pendingPayment.grossAmount)}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Text>
                      </Stack>
                      {pendingPayment.expiryTime && (
                        <Stack gap={2}>
                          <Text size="xs" c="dimmed">
                            {t("onlinePayment.expiresAt")}
                          </Text>
                          <Text size="sm">
                            {dayjs(pendingPayment.expiryTime).format(
                              "DD/MM/YYYY HH:mm",
                            )}
                          </Text>
                        </Stack>
                      )}
                    </SimpleGrid>

                    <Divider />

                    <Text size="xs" c="dimmed" fw={600}>
                      {t("onlinePayment.items")}:
                    </Text>
                    {pendingPayment.items.map((item) => (
                      <Group
                        key={item.id}
                        justify="space-between"
                        wrap="nowrap"
                      >
                        <Text
                          size="sm"
                          truncate
                          style={{ minWidth: 0, flex: 1 }}
                        >
                          {/* Backend serializer may expose tuition/feeBill/serviceFeeBill relations.
                              Fall back to a generic label when non-tuition items exist. */}
                          {item.tuition
                            ? `${item.tuition.classAcademic.className} - ${item.tuition.period} ${item.tuition.year}`
                            : item.feeBill
                              ? `${item.feeBill.feeService?.name ?? t("feeBill.title")} - ${item.feeBill.period} ${item.feeBill.year}`
                              : item.serviceFeeBill
                                ? `${item.serviceFeeBill.serviceFee?.name ?? t("serviceFee.title")} - ${item.serviceFeeBill.period} ${item.serviceFeeBill.year}`
                                : t("onlinePayment.item")}
                        </Text>
                        <Text size="sm" fw={500} style={{ flexShrink: 0 }}>
                          <NumberFormatter
                            value={Number(item.amount)}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Text>
                      </Group>
                    ))}

                    <Group wrap="wrap">
                      <Button
                        onClick={handleRetrySnap}
                        disabled={!snapReady}
                        leftSection={<IconCreditCard size={18} />}
                        size="sm"
                      >
                        {t("onlinePayment.continuePayment")}
                      </Button>
                      <Button
                        variant="light"
                        color="red"
                        leftSection={<IconX size={18} />}
                        onClick={() => handleCancelPayment(pendingPayment.id)}
                        loading={cancelPayment.isPending}
                        size="sm"
                      >
                        {t("onlinePayment.cancelPayment")}
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              )}

              {!pendingPayment && (
                <>
                  {allBills.length === 0 ? (
                    <Card withBorder>
                      <EmptyAnimation message={t("onlinePayment.allPaid")} />
                    </Card>
                  ) : (
                    <>
                      <Card withBorder p="md">
                        <Stack gap="md">
                          <Group justify="space-between">
                            <Text fw={600}>
                              {t("onlinePayment.selectBills")}
                            </Text>
                            <Checkbox
                              label={t("common.selectAll")}
                              checked={allSelected}
                              indeterminate={someSelected}
                              onChange={selectAll}
                              size="sm"
                            />
                          </Group>

                          {allBills.map((bill) => (
                            <BillCheckItem
                              key={billKey(bill)}
                              bill={bill}
                              checked={selectedKeys.has(billKey(bill))}
                              onChange={() => toggleSelection(billKey(bill))}
                            />
                          ))}
                        </Stack>
                      </Card>

                      {selectedKeys.size > 0 && (
                        <Card
                          withBorder
                          p="md"
                          bg="white"
                          className="pay-footer"
                        >
                          <Group justify="space-between">
                            <Box>
                              <Text size="sm" c="dimmed">
                                {t("onlinePayment.totalSelected", {
                                  count: selectedKeys.size,
                                })}
                              </Text>
                              <Text size="lg" fw={700} c="blue">
                                <NumberFormatter
                                  value={selectedTotal}
                                  prefix="Rp "
                                  thousandSeparator="."
                                  decimalSeparator=","
                                />
                              </Text>
                            </Box>
                            <Button
                              size="md"
                              leftSection={<IconCreditCard size={20} />}
                              onClick={handleCreatePayment}
                              loading={createPayment.isPending}
                              disabled={!snapReady}
                            >
                              {t("onlinePayment.payNow")}
                            </Button>
                          </Group>

                          {createPayment.isError && (
                            <Alert
                              color="red"
                              variant="light"
                              mt="sm"
                              icon={<IconAlertCircle size={16} />}
                            >
                              {createPayment.error instanceof Error
                                ? createPayment.error.message
                                : t("common.error")}
                            </Alert>
                          )}
                        </Card>
                      )}
                    </>
                  )}
                </>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="md">
            <Stack gap="md">
              {completedPayments.length === 0 ? (
                <Card withBorder>
                  <EmptyAnimation message={t("payment.noHistory")} />
                </Card>
              ) : (
                completedPayments.map((payment) => (
                  <Card
                    key={payment.id}
                    withBorder
                    p="md"
                    style={{ overflow: "hidden" }}
                  >
                    <Group justify="space-between" mb="xs" wrap="nowrap">
                      <Text
                        size="sm"
                        fw={500}
                        truncate
                        style={{ minWidth: 0, flex: 1 }}
                      >
                        {payment.orderId}
                      </Text>
                      <Badge
                        color={getStatusColor(payment.status)}
                        variant="light"
                        style={{ flexShrink: 0 }}
                      >
                        {payment.status}
                      </Badge>
                    </Group>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                        {dayjs(payment.createdAt).format("DD/MM/YYYY HH:mm")}
                      </Text>
                      <Text size="sm" fw={600} truncate style={{ minWidth: 0 }}>
                        <NumberFormatter
                          value={Number(payment.grossAmount)}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    </Group>
                  </Card>
                ))
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    );
  };

  function BillCheckItem({
    bill,
    checked,
    onChange,
  }: {
    bill: OutstandingBill;
    checked: boolean;
    onChange: () => void;
  }) {
    const t = useTranslations();
    const badge = billBadge(bill, t);

    return (
      <Paper withBorder p="sm" onClick={onChange} style={{ cursor: "pointer" }}>
        <Group wrap="nowrap" gap="sm">
          <Checkbox checked={checked} onChange={onChange} readOnly />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                <badge.Icon size={14} />
                <Text size="sm" fw={500} truncate>
                  {bill.label} — {bill.period} {bill.year}
                </Text>
              </Group>
              <Badge color={badge.color} variant="light" size="sm">
                {badge.label}
              </Badge>
            </Group>
            <Group justify="space-between" mt={4}>
              <Text size="xs" c="dimmed">
                {t("tuition.dueDate")}:{" "}
                {dayjs(bill.dueDate).format("DD/MM/YYYY")}
              </Text>
              <Text size="sm" fw={600} c="red">
                <NumberFormatter
                  value={bill.remainingAmount}
                  prefix="Rp "
                  thousandSeparator="."
                  decimalSeparator=","
                />
              </Text>
            </Group>
          </Box>
        </Group>
      </Paper>
    );
  }

  PaymentPage.getLayout = (page: ReactElement) => (
    <PortalLayout>{page}</PortalLayout>
  );

  export default PaymentPage;
  ```

  Note on pending-payment serializer: the existing `OnlinePaymentItem` type in `useOnlinePayments.ts` must also be extended so `item.feeBill` and `item.serviceFeeBill` are optional reads. If the existing type only has `tuition`, add the two optional siblings (non-breaking) before this task compiles.

- [ ] **Step 6: Add missing i18n keys used in the page.**

  Keys referenced: `onlinePayment.selectBills`, `onlinePayment.item`, `feeService.category.transport`, `feeService.category.accommodation`, `feeBill.title`, `serviceFee.title`. These are added in Task 29 — mark Task 29 as a pairing dependency for the portal build to compile. If Task 29 has not landed yet when executing this task, add placeholder entries in both `en.json` and `id.json` so `pnpm type-check` does not fail at runtime (Task 29 replaces them).

- [ ] **Step 7: Verify.**
  - `pnpm lint`
  - `pnpm type-check`
  - `pnpm dev` → log into portal as a seeded student → confirm the page shows a mix of tuition, transport, and service fee rows (each with correct badge + period), toggles selection, and creating a payment opens Midtrans Snap with the right gross amount.

- [ ] **Step 8: Commit.**
  ```
  git add src/pages/api/v1/portal/outstanding-bills/index.ts \
          src/hooks/api/usePortalOutstanding.ts \
          src/hooks/api/useOnlinePayments.ts \
          src/pages/portal/payment.tsx \
          src/lib/query-keys.ts
  git commit -m "feat(portal): combined outstanding bills (tuition + fee + service fee)"
  ```

---

## Task 28 — Sidebar: new fee/bill entries

Add the new "Pembayaran Lanjutan" (Wallet) group under admin nav and a single entry for cashiers.

**Files:**
- Modify: `src/components/layouts/Sidebar.tsx`

- [ ] **Step 1: Add new icon imports.**

  In `/Users/ferdylim/Workspace/school-tuition-system/src/components/layouts/Sidebar.tsx`, extend the existing `@tabler/icons-react` import block with `IconBus`, `IconPackage`, `IconReceipt2`, `IconWallet`. Verified: all four exist in the installed version of `@tabler/icons-react` (no fallback needed).

  Merged import:
  ```ts
  import {
    IconAlertTriangle,
    IconBuilding,
    IconBus,
    IconCalendar,
    IconCash,
    IconChartBar,
    IconCheck,
    IconCreditCard,
    IconDiscount,
    IconGift,
    IconHelp,
    IconHome,
    IconKey,
    IconLogout,
    IconPackage,
    IconPrinter,
    IconReceipt,
    IconReceipt2,
    IconReportAnalytics,
    IconSchool,
    IconSearch,
    IconSettings,
    IconUser,
    IconUserCircle,
    IconUsers,
    IconWallet,
  } from "@tabler/icons-react";
  ```

- [ ] **Step 2: Insert the new group into `adminLinks`.**

  Locate the `{ icon: IconReceipt, label: t("payments"), href: "/admin/payments" }` entry. Immediately after it (and before the `printReceipts` entry), add:

  ```ts
      {
        icon: IconWallet,
        label: t("feesAndServices"),
        children: [
          {
            icon: IconBus,
            label: t("feeServices"),
            href: "/admin/fee-services",
          },
          {
            icon: IconPackage,
            label: t("serviceFees"),
            href: "/admin/service-fees",
          },
          {
            icon: IconReceipt2,
            label: t("feeBills"),
            href: "/admin/fee-bills",
          },
        ],
      },
  ```

  Final surrounding context in `adminLinks`:

  ```ts
  const adminLinks: NavItem[] = [
    { icon: IconHome, label: t("dashboard"), href: "/admin/dashboard" },
    { icon: IconUsers, label: t("employees"), href: "/admin/employees" },
    { icon: IconSchool, label: t("students"), href: "/admin/students" },
    {
      icon: IconCalendar,
      label: t("academicYears"),
      href: "/admin/academic-years",
    },
    { icon: IconBuilding, label: t("classes"), href: "/admin/classes" },
    { icon: IconCash, label: t("tuitions"), href: "/admin/tuitions" },
    { icon: IconGift, label: t("scholarships"), href: "/admin/scholarships" },
    { icon: IconDiscount, label: t("discounts"), href: "/admin/discounts" },
    { icon: IconReceipt, label: t("payments"), href: "/admin/payments" },
    {
      icon: IconWallet,
      label: t("feesAndServices"),
      children: [
        {
          icon: IconBus,
          label: t("feeServices"),
          href: "/admin/fee-services",
        },
        {
          icon: IconPackage,
          label: t("serviceFees"),
          href: "/admin/service-fees",
        },
        {
          icon: IconReceipt2,
          label: t("feeBills"),
          href: "/admin/fee-bills",
        },
      ],
    },
    {
      icon: IconPrinter,
      label: t("printReceipts"),
      href: "/admin/payments/print",
    },
    {
      icon: IconCreditCard,
      label: t("onlinePayments"),
      href: "/admin/online-payments",
    },
    {
      icon: IconUserCircle,
      label: t("studentAccounts"),
      href: "/admin/student-accounts",
    },
    {
      icon: IconSettings,
      label: t("paymentSettings"),
      href: "/admin/payment-settings",
    },
    {
      icon: IconReportAnalytics,
      label: t("reports"),
      children: [
        {
          icon: IconAlertTriangle,
          label: t("overdueReport"),
          href: "/admin/reports/overdue",
        },
        {
          icon: IconChartBar,
          label: t("classSummary"),
          href: "/admin/reports/class-summary",
        },
      ],
    },
    { icon: IconHelp, label: t("help"), href: "/admin/help" },
  ];
  ```

- [ ] **Step 3: Add the single "All bills" entry to `cashierLinks`.**

  Insert it right after `payments`:

  ```ts
  const cashierLinks: NavItem[] = [
    { icon: IconHome, label: t("dashboard"), href: "/admin/dashboard" },
    { icon: IconSchool, label: t("students"), href: "/admin/students" },
    { icon: IconReceipt, label: t("payments"), href: "/admin/payments" },
    { icon: IconReceipt2, label: t("feeBills"), href: "/admin/fee-bills" },
    {
      icon: IconPrinter,
      label: t("printReceipts"),
      href: "/admin/payments/print",
    },
    {
      icon: IconReportAnalytics,
      label: t("reports"),
      children: [
        {
          icon: IconAlertTriangle,
          label: t("overdueReport"),
          href: "/admin/reports/overdue",
        },
        {
          icon: IconChartBar,
          label: t("classSummary"),
          href: "/admin/reports/class-summary",
        },
      ],
    },
    { icon: IconHelp, label: t("help"), href: "/admin/help" },
  ];
  ```

- [ ] **Step 4: Verify.**
  - `pnpm lint`
  - `pnpm type-check`
  - `pnpm dev` → log in as admin: confirm the new Wallet group renders with three children and expands when any child route is active. Log in as cashier: confirm a single "All bills" row appears and admin-only CRUD pages do not.

- [ ] **Step 5: Commit.**
  ```
  git add src/components/layouts/Sidebar.tsx
  git commit -m "feat(nav): add fee services, service fees, and all-bills sidebar entries"
  ```

---

## Task 29 — i18n: feeService / serviceFee / feeBill / admin namespaces

Add all keys referenced across Tasks 4-27 in both locales.

**Files:**
- Modify: `src/messages/en.json`
- Modify: `src/messages/id.json`

- [ ] **Step 1: Extend `admin` namespace in both files.**

  In `src/messages/en.json` add these keys inside the existing `"admin": { ... }` block, immediately before the closing `}` of that block:

  ```json
      "feesAndServices": "Fees & Services",
      "feeServices": "Services",
      "serviceFees": "Service Fees",
      "feeBills": "All Bills"
  ```

  Make sure to add a trailing comma to the current final key (`"printReceipts": "Print Receipts"` → `"printReceipts": "Print Receipts",`).

  In `src/messages/id.json` do the same with Indonesian translations:

  ```json
      "feesAndServices": "Layanan & Biaya",
      "feeServices": "Layanan",
      "serviceFees": "Uang Perlengkapan",
      "feeBills": "Semua Tagihan"
  ```

- [ ] **Step 2: Append new `feeService` namespace (both files).**

  Add before the closing `}` of the root object (after the last existing namespace, add a comma to the previous one's close-brace as needed).

  `src/messages/en.json` — append:

  ```json
    ,
    "feeService": {
      "title": "Transport & Accommodation Service",
      "listTitle": "Transport & Accommodation",
      "description": "Manage transport and accommodation services with price history and per-student subscriptions.",
      "category": {
        "label": "Category",
        "transport": "Transport",
        "accommodation": "Accommodation"
      },
      "name": "Service Name",
      "namePlaceholder": "e.g. Bus A-B, Dorm Wing A",
      "descriptionField": "Notes",
      "descriptionPlaceholder": "Optional description",
      "academicYear": "Academic Year",
      "isActive": "Active",
      "inactive": "Inactive",
      "add": "Add Service",
      "edit": "Edit Service",
      "create": "Create Service",
      "update": "Update Service",
      "delete": "Delete Service",
      "deleteConfirm": "Delete service \"{name}\"? This is only allowed if no bills have been generated.",
      "deleteBlocked": "Cannot delete: bills already exist. Deactivate the service instead.",
      "empty": "No services yet",
      "prices": "Prices",
      "priceHistory": "Price History",
      "addPrice": "Add Price",
      "amount": "Amount",
      "effectiveFrom": "Effective From",
      "effectiveFromHelp": "Must be the 1st of a month; will be normalized on save.",
      "priceRemove": "Remove Price",
      "priceRemoveConfirm": "Remove this price? Only allowed if no bills reference it.",
      "subscribers": "Subscribers",
      "subscribe": "Subscribe Student",
      "subscribeStudent": "Add Subscription",
      "endSubscription": "End Subscription",
      "endSubscriptionConfirm": "End this subscription on {date}? Future bills will stop generating.",
      "subscriptionStart": "Start Date",
      "subscriptionEnd": "End Date",
      "subscriptionNotes": "Notes",
      "subscriptionActive": "Active",
      "subscriptionEnded": "Ended",
      "generateBills": "Generate Bills",
      "generateBillsAll": "Generate All Bills",
      "generateBillsDescription": "Creates any missing bills for active subscriptions in the current academic year. Existing bills are not modified.",
      "generateBillsConfirm": "Generate missing bills for the active academic year?",
      "noPriceWarning": "No price defined for {period} {year}",
      "created": "{count} bills created",
      "skipped": "{count} bills skipped (already exist)",
      "exitSkipped": "{count} periods skipped (student exited)",
      "createSuccess": "Service created",
      "updateSuccess": "Service updated",
      "deleteSuccess": "Service deleted"
    }
  ```

  `src/messages/id.json` — append:

  ```json
    ,
    "feeService": {
      "title": "Layanan Transport & Akomodasi",
      "listTitle": "Transport & Akomodasi",
      "description": "Kelola layanan transport dan akomodasi dengan riwayat harga dan langganan per siswa.",
      "category": {
        "label": "Kategori",
        "transport": "Transport",
        "accommodation": "Akomodasi"
      },
      "name": "Nama Layanan",
      "namePlaceholder": "Contoh: Bus A-B, Asrama Putra",
      "descriptionField": "Catatan",
      "descriptionPlaceholder": "Deskripsi opsional",
      "academicYear": "Tahun Ajaran",
      "isActive": "Aktif",
      "inactive": "Nonaktif",
      "add": "Tambah Layanan",
      "edit": "Edit Layanan",
      "create": "Buat Layanan",
      "update": "Perbarui Layanan",
      "delete": "Hapus Layanan",
      "deleteConfirm": "Hapus layanan \"{name}\"? Hanya bisa dihapus jika belum ada tagihan.",
      "deleteBlocked": "Tidak bisa dihapus: sudah ada tagihan. Nonaktifkan saja layanan.",
      "empty": "Belum ada layanan",
      "prices": "Harga",
      "priceHistory": "Riwayat Harga",
      "addPrice": "Tambah Harga",
      "amount": "Jumlah",
      "effectiveFrom": "Berlaku Mulai",
      "effectiveFromHelp": "Harus tanggal 1. Akan dinormalisasi saat disimpan.",
      "priceRemove": "Hapus Harga",
      "priceRemoveConfirm": "Hapus harga ini? Hanya bisa jika belum ada tagihan yang memakainya.",
      "subscribers": "Pelanggan",
      "subscribe": "Langganan Siswa",
      "subscribeStudent": "Tambah Langganan",
      "endSubscription": "Akhiri Langganan",
      "endSubscriptionConfirm": "Akhiri langganan pada {date}? Tagihan berikutnya tidak akan dibuat.",
      "subscriptionStart": "Tanggal Mulai",
      "subscriptionEnd": "Tanggal Berakhir",
      "subscriptionNotes": "Catatan",
      "subscriptionActive": "Aktif",
      "subscriptionEnded": "Berakhir",
      "generateBills": "Buat Tagihan",
      "generateBillsAll": "Buat Semua Tagihan",
      "generateBillsDescription": "Membuat tagihan yang belum ada untuk langganan aktif di tahun ajaran berjalan. Tagihan yang sudah ada tidak diubah.",
      "generateBillsConfirm": "Buat tagihan yang belum ada untuk tahun ajaran aktif?",
      "noPriceWarning": "Belum ada harga untuk {period} {year}",
      "created": "{count} tagihan dibuat",
      "skipped": "{count} tagihan dilewati (sudah ada)",
      "exitSkipped": "{count} periode dilewati (siswa keluar)",
      "createSuccess": "Layanan dibuat",
      "updateSuccess": "Layanan diperbarui",
      "deleteSuccess": "Layanan dihapus"
    }
  ```

- [ ] **Step 3: Append `serviceFee` namespace (both files).**

  `src/messages/en.json`:

  ```json
    ,
    "serviceFee": {
      "title": "Service Fee",
      "listTitle": "Service Fees",
      "description": "Mandatory per-class fee (uang perlengkapan) billed at configured months.",
      "name": "Fee Name",
      "namePlaceholder": "e.g. School Supplies",
      "class": "Class",
      "amount": "Amount",
      "billingMonths": "Billing Months",
      "billingMonthsHelp": "Pick the months when this fee should be billed (default: July and January).",
      "perClass": "Per Class",
      "isActive": "Active",
      "add": "Add Service Fee",
      "edit": "Edit Service Fee",
      "create": "Create Service Fee",
      "update": "Update Service Fee",
      "delete": "Delete Service Fee",
      "deleteConfirm": "Delete service fee \"{name}\"? Only allowed if no bills have been generated.",
      "deleteBlocked": "Cannot delete: bills already exist. Deactivate the fee instead.",
      "empty": "No service fees yet",
      "generateBills": "Generate Bills",
      "generateBillsAll": "Generate All Bills",
      "generateBillsDescription": "Creates any missing bills for the active academic year based on billing months. Existing bills are not modified.",
      "generateBillsConfirm": "Generate service fee bills for the active academic year?",
      "created": "{count} bills created",
      "skipped": "{count} bills skipped (already exist)",
      "exitSkipped": "{count} periods skipped (student exited)",
      "createSuccess": "Service fee created",
      "updateSuccess": "Service fee updated",
      "deleteSuccess": "Service fee deleted"
    }
  ```

  `src/messages/id.json`:

  ```json
    ,
    "serviceFee": {
      "title": "Uang Perlengkapan",
      "listTitle": "Uang Perlengkapan",
      "description": "Biaya wajib per kelas (uang perlengkapan), ditagihkan pada bulan yang dikonfigurasi.",
      "name": "Nama Biaya",
      "namePlaceholder": "Contoh: Uang Perlengkapan",
      "class": "Kelas",
      "amount": "Jumlah",
      "billingMonths": "Bulan Penagihan",
      "billingMonthsHelp": "Pilih bulan-bulan saat biaya ini ditagihkan (default: Juli dan Januari).",
      "perClass": "Per Kelas",
      "isActive": "Aktif",
      "add": "Tambah Uang Perlengkapan",
      "edit": "Edit Uang Perlengkapan",
      "create": "Buat Uang Perlengkapan",
      "update": "Perbarui Uang Perlengkapan",
      "delete": "Hapus Uang Perlengkapan",
      "deleteConfirm": "Hapus uang perlengkapan \"{name}\"? Hanya bisa jika belum ada tagihan.",
      "deleteBlocked": "Tidak bisa dihapus: sudah ada tagihan. Nonaktifkan saja.",
      "empty": "Belum ada uang perlengkapan",
      "generateBills": "Buat Tagihan",
      "generateBillsAll": "Buat Semua Tagihan",
      "generateBillsDescription": "Membuat tagihan yang belum ada untuk tahun ajaran aktif berdasarkan bulan penagihan. Tagihan yang sudah ada tidak diubah.",
      "generateBillsConfirm": "Buat tagihan uang perlengkapan untuk tahun ajaran aktif?",
      "created": "{count} tagihan dibuat",
      "skipped": "{count} tagihan dilewati (sudah ada)",
      "exitSkipped": "{count} periode dilewati (siswa keluar)",
      "createSuccess": "Uang perlengkapan dibuat",
      "updateSuccess": "Uang perlengkapan diperbarui",
      "deleteSuccess": "Uang perlengkapan dihapus"
    }
  ```

- [ ] **Step 4: Append `feeBill` namespace (both files).**

  `src/messages/en.json`:

  ```json
    ,
    "feeBill": {
      "title": "Fee Bill",
      "listTitle": "All Bills",
      "description": "Combined list of transport, accommodation, and service-fee bills.",
      "tabs": {
        "feeBills": "Transport / Accommodation",
        "serviceFeeBills": "Service Fees"
      },
      "type": "Type",
      "types": {
        "TRANSPORT": "Transport",
        "ACCOMMODATION": "Accommodation",
        "SERVICE_FEE": "Service Fee"
      },
      "student": "Student",
      "service": "Service",
      "period": "Period",
      "year": "Year",
      "amount": "Amount",
      "paidAmount": "Paid",
      "remainingAmount": "Remaining",
      "status": "Status",
      "dueDate": "Due Date",
      "generateAll": "Generate All Bills",
      "generateAllConfirm": "This will create any missing bills for the current academic year. Existing bills will not be modified. Continue?",
      "generateSuccess": "{created} created, {skipped} skipped",
      "priceWarnings": "Missing prices ({count})",
      "priceWarningsHint": "Add prices for the listed services then re-run Generate All.",
      "created": "Created",
      "skipped": "Skipped",
      "exitSkipped": "Exit-skipped",
      "voided": "Voided",
      "voidedByExit": "Voided (student exited)",
      "empty": "No bills"
    }
  ```

  `src/messages/id.json`:

  ```json
    ,
    "feeBill": {
      "title": "Tagihan",
      "listTitle": "Semua Tagihan",
      "description": "Daftar gabungan tagihan transport, akomodasi, dan uang perlengkapan.",
      "tabs": {
        "feeBills": "Transport / Akomodasi",
        "serviceFeeBills": "Uang Perlengkapan"
      },
      "type": "Tipe",
      "types": {
        "TRANSPORT": "Transport",
        "ACCOMMODATION": "Akomodasi",
        "SERVICE_FEE": "Uang Perlengkapan"
      },
      "student": "Siswa",
      "service": "Layanan",
      "period": "Periode",
      "year": "Tahun",
      "amount": "Jumlah",
      "paidAmount": "Dibayar",
      "remainingAmount": "Sisa",
      "status": "Status",
      "dueDate": "Jatuh Tempo",
      "generateAll": "Buat Semua Tagihan",
      "generateAllConfirm": "Ini akan membuat tagihan yang belum ada untuk tahun ajaran aktif. Tagihan yang sudah ada tidak akan diubah. Lanjutkan?",
      "generateSuccess": "{created} dibuat, {skipped} dilewati",
      "priceWarnings": "Harga belum diatur ({count})",
      "priceWarningsHint": "Tambahkan harga untuk layanan di bawah ini lalu jalankan lagi Buat Semua.",
      "created": "Dibuat",
      "skipped": "Dilewati",
      "exitSkipped": "Dilewati-keluar",
      "voided": "Dibatalkan",
      "voidedByExit": "Dibatalkan (siswa keluar)",
      "empty": "Belum ada tagihan"
    }
  ```

- [ ] **Step 5: Add the two portal keys used in Task 27.**

  In the existing `onlinePayment` namespace in both files, add:

  `en.json`:
  ```json
      "selectBills": "Select bills to pay",
      "item": "Bill item"
  ```

  `id.json`:
  ```json
      "selectBills": "Pilih tagihan untuk dibayar",
      "item": "Item tagihan"
  ```

- [ ] **Step 6: Verify.**
  - `pnpm lint` (biome will flag JSON syntax issues — fix any trailing-comma / duplicate-key errors)
  - `pnpm type-check`
  - `pnpm dev` → switch locale via header selector → visually scan admin pages for missing-key warnings in the dev console.

- [ ] **Step 7: Commit.**
  ```
  git add src/messages/en.json src/messages/id.json
  git commit -m "i18n: add feeService, serviceFee, feeBill, and admin namespaces"
  ```

---

## Task 30 — Seed data: fee services, subscriptions, service fees, bills, payments

Extend `prisma/seed.ts` to populate the new tables against the currently-active academic year. Idempotent on re-run.

**Files:**
- Modify: `prisma/seed.ts`

Assumes Task 2 exported `generateFeeBillsForAcademicYear(prisma, academicYearId)` and Task 3 exported `generateServiceFeeBillsForAcademicYear(prisma, academicYearId)` from `src/lib/business-logic/fee-bills.ts` and `src/lib/business-logic/service-fee-bills.ts` respectively. If the exact names differ, substitute them.

Assumes Task 1 (Student Exit spec) exposed `recordStudentExit({ studentNis, exitDate, reason })` from `src/lib/business-logic/student-exit.ts`.

- [ ] **Step 1: Replace `prisma/seed.ts` with extended seed.**

  Full file replacement:

  ```ts
  import path from "node:path";
  import { PrismaPg } from "@prisma/adapter-pg";
  import bcrypt from "bcryptjs";
  import dotenv from "dotenv";
  import { generateFeeBillsForAcademicYear } from "../src/lib/business-logic/fee-bills";
  import { generateServiceFeeBillsForAcademicYear } from "../src/lib/business-logic/service-fee-bills";
  import { recordStudentExit } from "../src/lib/business-logic/student-exit";
  import {
    type FeeServiceCategory,
    Month,
    PaymentStatus,
    PrismaClient,
  } from "../src/generated/prisma/client.js";

  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config();

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const MONTH_ORDER: Month[] = [
    Month.JULY,
    Month.AUGUST,
    Month.SEPTEMBER,
    Month.OCTOBER,
    Month.NOVEMBER,
    Month.DECEMBER,
    Month.JANUARY,
    Month.FEBRUARY,
    Month.MARCH,
    Month.APRIL,
    Month.MAY,
    Month.JUNE,
  ];

  async function seedEmployees() {
    const hashedPassword = await bcrypt.hash("123456", 10);

    const admin = await prisma.employee.upsert({
      where: { email: "admin@school.com" },
      update: {},
      create: {
        name: "System Administrator",
        email: "admin@school.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    console.log("Created admin:", admin.email);

    const cashier = await prisma.employee.upsert({
      where: { email: "cashier@school.com" },
      update: {},
      create: {
        name: "Default Cashier",
        email: "cashier@school.com",
        password: hashedPassword,
        role: "CASHIER",
      },
    });
    console.log("Created cashier:", cashier.email);

    return { admin, cashier };
  }

  async function seedAcademicYear() {
    const currentYear = "2024/2025";
    return prisma.academicYear.upsert({
      where: { year: currentYear },
      update: {},
      create: {
        year: currentYear,
        startDate: new Date("2024-07-01"),
        endDate: new Date("2025-06-30"),
        isActive: true,
      },
    });
  }

  interface FeeServiceSeed {
    name: string;
    category: FeeServiceCategory;
    prices: Array<{ amount: number; effectiveFrom: Date }>;
  }

  async function seedFeeServices(academicYearId: string) {
    const services: FeeServiceSeed[] = [
      {
        name: "Bus A-B",
        category: "TRANSPORT",
        prices: [
          { amount: 250_000, effectiveFrom: new Date("2024-07-01") },
          { amount: 275_000, effectiveFrom: new Date("2025-01-01") },
        ],
      },
      {
        name: "Bus B-C",
        category: "TRANSPORT",
        prices: [{ amount: 500_000, effectiveFrom: new Date("2024-07-01") }],
      },
      {
        name: "Dorm Putra",
        category: "ACCOMMODATION",
        prices: [{ amount: 1_500_000, effectiveFrom: new Date("2024-07-01") }],
      },
    ];

    const results = [];
    for (const s of services) {
      // Idempotent: look up by (academicYearId, name) then upsert prices.
      let feeService = await prisma.feeService.findFirst({
        where: { academicYearId, name: s.name },
      });
      if (!feeService) {
        feeService = await prisma.feeService.create({
          data: {
            academicYearId,
            name: s.name,
            category: s.category,
            isActive: true,
          },
        });
      }
      for (const p of s.prices) {
        await prisma.feeServicePrice.upsert({
          where: {
            feeServiceId_effectiveFrom: {
              feeServiceId: feeService.id,
              effectiveFrom: p.effectiveFrom,
            },
          },
          update: { amount: p.amount },
          create: {
            feeServiceId: feeService.id,
            effectiveFrom: p.effectiveFrom,
            amount: p.amount,
          },
        });
      }
      console.log(
        `Seeded fee service ${feeService.name} with ${s.prices.length} price(s)`,
      );
      results.push(feeService);
    }
    return results;
  }

  async function seedSubscriptions(
    feeServices: Awaited<ReturnType<typeof seedFeeServices>>,
  ) {
    const students = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      take: 5,
    });
    if (students.length < 5) {
      console.warn(
        `Only ${students.length} active students available; subscription seed will cover what it can.`,
      );
    }

    const busAB = feeServices.find((s) => s.name === "Bus A-B")!;
    const busBC = feeServices.find((s) => s.name === "Bus B-C")!;
    const dorm = feeServices.find((s) => s.name === "Dorm Putra")!;

    const plan: Array<{
      studentNis: string;
      feeServiceId: string;
      startDate: Date;
      endDate: Date | null;
      note: string;
    }> = [];

    if (students[0]) {
      plan.push({
        studentNis: students[0].nis,
        feeServiceId: busAB.id,
        startDate: new Date("2024-07-01"),
        endDate: null,
        note: "Full year Bus A-B #1",
      });
    }
    if (students[1]) {
      plan.push({
        studentNis: students[1].nis,
        feeServiceId: busAB.id,
        startDate: new Date("2024-07-01"),
        endDate: null,
        note: "Full year Bus A-B #2",
      });
    }
    if (students[2]) {
      plan.push({
        studentNis: students[2].nis,
        feeServiceId: busBC.id,
        startDate: new Date("2024-10-01"),
        endDate: null,
        note: "Mid-year Bus B-C",
      });
    }
    if (students[3]) {
      plan.push({
        studentNis: students[3].nis,
        feeServiceId: dorm.id,
        startDate: new Date("2024-07-01"),
        endDate: null,
        note: "Full year dorm",
      });
    }
    // Student[4] will also subscribe to Bus A-B, then exit in Feb to exercise void path.
    let exitingStudent: (typeof students)[number] | undefined;
    if (students[4]) {
      exitingStudent = students[4];
      plan.push({
        studentNis: exitingStudent.nis,
        feeServiceId: busAB.id,
        startDate: new Date("2024-07-01"),
        endDate: null,
        note: "Exits Feb",
      });
    }

    for (const p of plan) {
      const existing = await prisma.feeSubscription.findFirst({
        where: {
          studentNis: p.studentNis,
          feeServiceId: p.feeServiceId,
          startDate: p.startDate,
        },
      });
      if (existing) continue;
      await prisma.feeSubscription.create({
        data: {
          studentNis: p.studentNis,
          feeServiceId: p.feeServiceId,
          startDate: p.startDate,
          endDate: p.endDate,
          notes: p.note,
        },
      });
    }
    console.log(`Seeded ${plan.length} subscriptions`);
    return { students, exitingStudent };
  }

  async function seedServiceFees(academicYearId: string) {
    const classes = await prisma.classAcademic.findMany({
      where: { academicYearId },
    });

    for (const cls of classes) {
      const existing = await prisma.serviceFee.findFirst({
        where: { classAcademicId: cls.id, name: "Uang Perlengkapan" },
      });
      if (existing) continue;
      await prisma.serviceFee.create({
        data: {
          classAcademicId: cls.id,
          name: "Uang Perlengkapan",
          amount: 750_000,
          billingMonths: [Month.JULY, Month.JANUARY],
          isActive: true,
        },
      });
    }
    console.log(`Seeded service fees for ${classes.length} class(es)`);
  }

  async function generateAllBills(academicYearId: string) {
    const feeResult = await generateFeeBillsForAcademicYear(
      prisma,
      academicYearId,
    );
    console.log(
      `Fee bills: ${feeResult.created} created, ${feeResult.skipped} skipped, ${feeResult.priceWarnings?.length ?? 0} warnings`,
    );
    const svcResult = await generateServiceFeeBillsForAcademicYear(
      prisma,
      academicYearId,
    );
    console.log(
      `Service fee bills: ${svcResult.created} created, ${svcResult.skipped} skipped`,
    );
  }

  async function simulateExit(
    exitingStudent: { nis: string } | undefined,
  ) {
    if (!exitingStudent) return;
    const existing = await prisma.student.findUnique({
      where: { nis: exitingStudent.nis },
    });
    if (existing?.exitedAt) return; // already exited
    await recordStudentExit({
      studentNis: exitingStudent.nis,
      exitDate: new Date("2025-02-15"),
      reason: "TRANSFERRED",
      notes: "Seeded exit simulation",
    });
    console.log(`Simulated exit for student ${exitingStudent.nis}`);
  }

  async function seedPayments(cashierId: string) {
    // Wipe prior seed-created payments (identified by notes prefix) to stay idempotent.
    await prisma.payment.deleteMany({
      where: { notes: { startsWith: "[SEED]" } },
    });

    const [unpaidTuitions, unpaidFeeBills, unpaidServiceFeeBills] =
      await Promise.all([
        prisma.tuition.findMany({
          where: { status: { in: ["UNPAID", "PARTIAL"] } },
          take: 200,
        }),
        prisma.feeBill.findMany({
          where: { status: { in: ["UNPAID", "PARTIAL"] } },
          take: 200,
        }),
        prisma.serviceFeeBill.findMany({
          where: { status: { in: ["UNPAID", "PARTIAL"] } },
          take: 200,
        }),
      ]);

    const rng = (seed: number) => {
      let x = seed;
      return () => {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        return x / 0x7fffffff;
      };
    };
    const rand = rng(42);

    // Group bills by (studentNis, YYYY-MM-DD) to simulate "one transaction covers multiple bills."
    interface BillRow {
      kind: "tuition" | "feeBill" | "serviceFeeBill";
      id: string;
      studentNis: string;
      amount: number;
    }
    const all: BillRow[] = [
      ...unpaidTuitions.map((t) => ({
        kind: "tuition" as const,
        id: t.id,
        studentNis: t.studentNis,
        amount: Number(t.amount) - Number(t.paidAmount) - Number(t.scholarshipAmount ?? 0) - Number(t.discountAmount ?? 0),
      })),
      ...unpaidFeeBills.map((b) => ({
        kind: "feeBill" as const,
        id: b.id,
        studentNis: b.studentNis,
        amount: Number(b.amount) - Number(b.paidAmount),
      })),
      ...unpaidServiceFeeBills.map((b) => ({
        kind: "serviceFeeBill" as const,
        id: b.id,
        studentNis: b.studentNis,
        amount: Number(b.amount) - Number(b.paidAmount),
      })),
    ].filter((r) => r.amount > 0);

    const toPay = all.filter(() => rand() < 0.6);

    // Group by student → pick up to 3 multi-bill transactions (>=2 items each).
    const byStudent = new Map<string, BillRow[]>();
    for (const row of toPay) {
      const list = byStudent.get(row.studentNis) ?? [];
      list.push(row);
      byStudent.set(row.studentNis, list);
    }

    let multiCount = 0;
    let paidCount = 0;
    for (const [studentNis, rows] of byStudent) {
      const useMulti = multiCount < 3 && rows.length >= 2;
      if (useMulti) multiCount++;

      const groups: BillRow[][] = useMulti ? [rows] : rows.map((r) => [r]);
      for (const group of groups) {
        const txId = crypto.randomUUID();
        const paymentDate = new Date("2024-11-01");
        paymentDate.setDate(paymentDate.getDate() + Math.floor(rand() * 90));

        await prisma.$transaction(async (tx) => {
          for (const item of group) {
            await tx.payment.create({
              data: {
                transactionId: txId,
                employeeId: cashierId,
                amount: item.amount,
                paymentDate,
                notes: `[SEED] tx ${txId.slice(0, 8)}`,
                tuitionId: item.kind === "tuition" ? item.id : null,
                feeBillId: item.kind === "feeBill" ? item.id : null,
                serviceFeeBillId:
                  item.kind === "serviceFeeBill" ? item.id : null,
              },
            });

            if (item.kind === "tuition") {
              await tx.tuition.update({
                where: { id: item.id },
                data: {
                  paidAmount: { increment: item.amount },
                  status: PaymentStatus.PAID,
                },
              });
            } else if (item.kind === "feeBill") {
              await tx.feeBill.update({
                where: { id: item.id },
                data: {
                  paidAmount: { increment: item.amount },
                  status: PaymentStatus.PAID,
                },
              });
            } else {
              await tx.serviceFeeBill.update({
                where: { id: item.id },
                data: {
                  paidAmount: { increment: item.amount },
                  status: PaymentStatus.PAID,
                },
              });
            }
            paidCount++;
          }
        });
      }
    }

    console.log(
      `Seeded ${paidCount} payments across ${byStudent.size} students (${multiCount} multi-bill transactions)`,
    );
  }

  async function main() {
    console.log("Seeding database...");

    const { cashier } = await seedEmployees();
    const academicYear = await seedAcademicYear();
    console.log("Active academic year:", academicYear.year);

    const feeServices = await seedFeeServices(academicYear.id);
    const { exitingStudent } = await seedSubscriptions(feeServices);
    await seedServiceFees(academicYear.id);

    await generateAllBills(academicYear.id);
    await simulateExit(exitingStudent);
    // Re-run generation post-exit so voiding + void-skip behavior is reflected.
    await generateAllBills(academicYear.id);

    await seedPayments(cashier.employeeId);

    console.log("Seeding complete!");
  }

  main()
    .catch((e) => {
      console.error("Seeding failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
  ```

  Shape assumptions to verify before running:
  - `Month` enum, `FeeServiceCategory` type, and `PaymentStatus` enum are exported from `@prisma/client` generated code.
  - `generateFeeBillsForAcademicYear(prisma, id)` returns `{ created, skipped, priceWarnings }`.
  - `generateServiceFeeBillsForAcademicYear(prisma, id)` returns `{ created, skipped }`.
  - `recordStudentExit` accepts `{ studentNis, exitDate, reason, notes }` — if the Task 1 signature differs, align here.
  - `Employee.employeeId` is the correct PK field (check `prisma/schema.prisma` — if it's `id`, use that instead).

- [ ] **Step 2: Verify seed runs.**
  - `pnpm prisma:seed` — confirm no errors. Seed must be safe to re-run: execute it twice, confirm counts stabilize (no duplicates thanks to `upsert` + unique constraints + `notes startsWith [SEED]` cleanup).
  - `pnpm prisma studio` — spot-check `fee_services` (3 rows), `fee_service_prices` (4 rows), `fee_subscriptions` (up to 5), `service_fees` (one per class), `fee_bills` + `service_fee_bills` populated, exited student has voided bills, and `payments.transaction_id` has at least 3 groups with >1 row.

- [ ] **Step 3: Lint + type-check.**
  - `pnpm lint`
  - `pnpm type-check`

- [ ] **Step 4: Commit.**
  ```
  git add prisma/seed.ts
  git commit -m "seed: add fee services, subscriptions, service fees, bills, and payments"
  ```

---

## Task 31 — User guide docs: transport/accommodation, service fee, multi-bill payment, portal, exit

Append new sections to both language files so they render in the in-app help page (`src/pages/admin/help.tsx` extracts h2/h3 via regex at lines 49-69).

**Files:**
- Modify: `docs/USER-GUIDE-ID.md`
- Modify: `docs/USER-GUIDE-EN.md`

- [ ] **Step 1: Append new sections to `docs/USER-GUIDE-EN.md`.**

  Insert a top-level section titled `## Transport & Accommodation` immediately after the existing `## 7. Payments` section (and its sub-headings). Use unnumbered `##` headings matching the file's style. The help-page TOC key-ins off h2/h3 only, so h4+ will not appear in TOC but still render.

  Exact content to append (place it after section 7 and before section 8 — adjust anchor position to fit the file's flow):

  ```markdown
  ## Transport & Accommodation

  Transport and dorm fees are managed as **services** with per-student subscriptions and price history.

  ### Create a service

  1. Open **Services** from the Fees & Services menu.
  2. Click **Add Service** and fill in Name, Category (Transport or Accommodation), and optional notes.
  3. Save. A service with no price cannot generate bills yet.

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

  On the cashier payment page the outstanding list combines tuition, transport/accommodation bills, and service-fee bills for the selected student. A single **Process Payment** action creates one transaction that covers all selected items.

  - Each payment row is linked to exactly one bill (tuition, fee bill, or service-fee bill).
  - All rows in a transaction share the same **Transaction ID**, so the receipt prints as one slip.
  - Voiding a payment updates the originating bill's paid amount and status.

  ## Portal — Combined Bills

  Students and parents see all three bill types in one outstanding list on the portal payment page. They can select any subset and pay via Midtrans in one transaction. Paid items disappear from the list automatically after settlement.

  ## Student Exit Behavior

  When a student is marked as exited:

  - Active **transport/accommodation subscriptions** have their End Date set to the exit date.
  - **Unpaid** future bills (including fee bills and service-fee bills) are **voided** — `voidedByExit` flag set, amount zeroed. They no longer count toward totals.
  - **Partially paid** bills are kept, and a warning is surfaced so staff can decide how to settle them.
  - Paid bills are never touched.

  Undoing an exit restores subscriptions and reinstates voided bills (amounts re-resolved from price history or current service-fee amount).

  ## Scholarships and Discounts — Tuition Only

  **Important:** Scholarships and discounts apply only to tuition. Transport, accommodation, and service-fee bills are billed in full regardless of a student's scholarship or discount status. The cashier screen does not offer scholarship/discount fields on non-tuition line items.
  ```

- [ ] **Step 2: Append new sections to `docs/USER-GUIDE-ID.md`.**

  Insert after section `## 7. Pembayaran` (and its sub-sections) in the Indonesian file. Exact content:

  ```markdown
  ## Transport & Akomodasi

  Tagihan transport dan asrama dikelola sebagai **layanan** dengan langganan per siswa dan riwayat harga.

  ### Membuat layanan

  1. Buka menu **Layanan** pada grup Layanan & Biaya.
  2. Klik **Tambah Layanan** lalu isi Nama, Kategori (Transport atau Akomodasi), dan catatan opsional.
  3. Simpan. Layanan tanpa harga tidak bisa membuat tagihan.

  ### Mengatur harga dan riwayat harga

  Setiap layanan punya riwayat harga. Saat pembuatan tagihan, harga yang aktif pada tanggal 1 bulan terkait yang dipakai.

  1. Buka detail layanan → **Riwayat Harga** → **Tambah Harga**.
  2. Isi **Berlaku Mulai** (tanggal bebas dalam bulan tersebut — akan dinormalisasi ke tanggal 1 saat disimpan) dan jumlah.
  3. Untuk menaikkan harga di tengah tahun, tambahkan entri baru dengan tanggal mulai lebih baru. Tagihan yang sudah dibuat tetap memakai harga snapshot lama.

  ### Menambah dan mengakhiri langganan siswa

  1. Pada halaman detail layanan, buka **Pelanggan** → **Langganan Siswa**.
  2. Pilih siswa, isi Tanggal Mulai dan catatan opsional. Kosongkan Tanggal Berakhir untuk langganan terbuka.
  3. **Akhiri Langganan** akan mengisi tanggal berakhir; siswa tidak akan ditagih untuk bulan-bulan setelahnya.

  ### Membuat tagihan

  Gunakan tombol **Buat Semua Tagihan** di bagian atas halaman Semua Tagihan. Aman dijalankan berkali-kali — tagihan yang sudah ada tidak diubah. Siswa baru, langganan baru, dan siswa yang keluar otomatis diperhitungkan pada eksekusi berikutnya.

  Jika ada layanan yang belum punya harga pada suatu periode, akan muncul peringatan **Harga belum diatur**. Tambahkan harga lalu jalankan ulang.

  ## Uang Perlengkapan

  **Uang perlengkapan** adalah biaya wajib per kelas yang ditagihkan pada bulan yang dikonfigurasi (default Juli dan Januari).

  ### Membuat uang perlengkapan

  1. Buka **Uang Perlengkapan** pada grup Layanan & Biaya.
  2. Klik **Tambah Uang Perlengkapan**, pilih Kelas, isi Jumlah dan Bulan Penagihan.
  3. Simpan.

  Setiap siswa di kelas tersebut akan mendapat tagihan di setiap bulan penagihan.

  ### Bulan penagihan

  Edit uang perlengkapan untuk menambah/menghapus bulan penagihan. Eksekusi berikutnya mengikuti daftar baru; tagihan lama tidak berubah.

  ### Perubahan jumlah

  Perubahan jumlah hanya berlaku untuk tagihan yang dibuat berikutnya. Tagihan lama tetap memakai snapshot.

  ## Buat Semua Tagihan

  Tombol **Buat Semua Tagihan** pada halaman **Semua Tagihan** membuat tagihan yang belum ada untuk tahun ajaran aktif di tiga jalur (SPP, transport/akomodasi, uang perlengkapan).

  - **Idempoten:** aman dijalankan berulang.
  - **Tidak merusak:** tagihan yang sudah dibayar tidak disentuh.
  - **Sadar drift:** siswa baru, langganan baru, dan siswa yang keluar diperhitungkan otomatis.
  - Jalankan ulang setelah menambah harga yang hilang, menambah langganan baru, atau mencatat siswa keluar.

  ## Pembayaran Multi-Tagihan (Kasir)

  Pada halaman pembayaran kasir, daftar tagihan menggabungkan SPP, tagihan transport/akomodasi, dan uang perlengkapan untuk siswa yang dipilih. Sekali klik **Proses Pembayaran** membuat satu transaksi yang mencakup semua item terpilih.

  - Setiap baris payment terkait tepat satu tagihan (SPP, fee bill, atau service-fee bill).
  - Semua baris dalam satu transaksi berbagi **ID Transaksi** yang sama, jadi kuitansi dicetak sebagai satu slip.
  - Membatalkan payment akan memperbarui jumlah terbayar dan status pada tagihan asalnya.

  ## Portal — Tagihan Gabungan

  Siswa/orang tua melihat tiga jenis tagihan dalam satu daftar di halaman pembayaran portal. Mereka bisa memilih subset mana saja dan membayar lewat Midtrans dalam satu transaksi. Item yang lunas otomatis hilang dari daftar setelah settlement.

  ## Perilaku Keluar Siswa

  Saat siswa ditandai keluar:

  - **Langganan transport/akomodasi** yang aktif diberi Tanggal Berakhir sama dengan tanggal keluar.
  - Tagihan **belum dibayar** untuk bulan-bulan berikutnya (termasuk fee bill dan uang perlengkapan) **dibatalkan** — flag `voidedByExit` diset, jumlah menjadi 0. Tidak dihitung lagi di total.
  - Tagihan **sebagian dibayar** tetap utuh, dan ada peringatan agar staf memutuskan cara menyelesaikannya.
  - Tagihan yang sudah lunas tidak pernah diubah.

  Membatalkan status keluar akan memulihkan langganan dan mengembalikan tagihan yang sebelumnya dibatalkan (jumlah dihitung ulang dari riwayat harga atau jumlah uang perlengkapan saat ini).

  ## Beasiswa dan Diskon — Hanya untuk SPP

  **Penting:** Beasiswa dan diskon hanya berlaku untuk SPP. Tagihan transport, akomodasi, dan uang perlengkapan tetap dibebankan penuh, tanpa melihat status beasiswa atau diskon siswa. Layar kasir tidak menyediakan kolom beasiswa/diskon untuk item non-SPP.
  ```

- [ ] **Step 3: Verify.**
  - `pnpm lint` (markdown files ignored by biome but run anyway to catch accidental TSX changes).
  - `pnpm dev` → visit `/admin/help` in each locale → confirm the new sections appear in the TOC and render correctly.

- [ ] **Step 4: Commit.**
  ```
  git add docs/USER-GUIDE-EN.md docs/USER-GUIDE-ID.md
  git commit -m "docs: document fee services, service fees, and multi-bill payment"
  ```

---

## End of chunk E
