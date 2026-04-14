import crypto from "node:crypto";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
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

// Business-logic modules are imported lazily so their Prisma singleton picks
// up DATABASE_URL after dotenv.config() has run above.
async function loadBusinessLogic() {
  const [feeBills, serviceFeeBills, studentExit] = await Promise.all([
    import("../src/lib/business-logic/fee-bills"),
    import("../src/lib/business-logic/service-fee-bills"),
    import("../src/lib/business-logic/student-exit"),
  ]);
  return {
    generateAllFeeBills: feeBills.generateAllFeeBills,
    generateAllServiceFeeBills: serviceFeeBills.generateAllServiceFeeBills,
    recordStudentExit: studentExit.recordStudentExit,
  };
}

interface FeeServiceSeed {
  name: string;
  category: FeeServiceCategory;
  prices: Array<{ amount: number; effectiveFrom: Date }>;
}

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
  const academicYear = await prisma.academicYear.upsert({
    where: { year: currentYear },
    update: {},
    create: {
      year: currentYear,
      startDate: new Date("2024-07-01"),
      endDate: new Date("2025-06-30"),
      isActive: true,
    },
  });
  console.log("Created academic year:", academicYear.year);
  return academicYear;
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
    where: { exitedAt: null },
    take: 5,
    orderBy: { nis: "asc" },
  });
  if (students.length === 0) {
    console.log("No active students available; skipping subscription seed");
    return { students, exitingStudent: undefined };
  }
  if (students.length < 5) {
    console.warn(
      `Only ${students.length} active students available; subscription seed will cover what it can.`,
    );
  }

  const busAB = feeServices.find((s) => s.name === "Bus A-B");
  const busBC = feeServices.find((s) => s.name === "Bus B-C");
  const dorm = feeServices.find((s) => s.name === "Dorm Putra");
  if (!busAB || !busBC || !dorm) return { students, exitingStudent: undefined };

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

  let createdCount = 0;
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
    createdCount++;
  }
  console.log(
    `Seeded ${createdCount} new subscriptions (${plan.length - createdCount} already existed)`,
  );
  return { students, exitingStudent };
}

async function seedServiceFees(academicYearId: string) {
  const classes = await prisma.classAcademic.findMany({
    where: { academicYearId },
  });

  let created = 0;
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
    created++;
  }
  console.log(
    `Seeded service fees for ${created}/${classes.length} class(es) (rest already existed)`,
  );
}

type BusinessLogic = Awaited<ReturnType<typeof loadBusinessLogic>>;

async function generateAllBills(bl: BusinessLogic, academicYearId: string) {
  const feeResult = await bl.generateAllFeeBills(academicYearId);
  console.log(
    `Fee bills: ${feeResult.created} created, ${feeResult.skipped} skipped, ${feeResult.priceWarnings.length} warnings`,
  );
  const svcResult = await bl.generateAllServiceFeeBills({ academicYearId });
  console.log(
    `Service fee bills: ${svcResult.created} created, ${svcResult.skipped} skipped`,
  );
}

async function simulateExit(
  bl: BusinessLogic,
  exitingStudent: { nis: string } | undefined,
  employeeId: string,
) {
  if (!exitingStudent) return;
  const existing = await prisma.student.findUnique({
    where: { nis: exitingStudent.nis },
  });
  if (!existing || existing.exitedAt) return;
  try {
    await bl.recordStudentExit({
      nis: exitingStudent.nis,
      exitDate: new Date("2025-02-15"),
      reason: "TRANSFERRED",
      employeeId,
    });
    console.log(`Simulated exit for student ${exitingStudent.nis}`);
  } catch (err) {
    console.warn(
      `Could not simulate exit for ${exitingStudent.nis}: ${(err as Error).message}`,
    );
  }
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
      amount:
        Number(t.feeAmount) -
        Number(t.paidAmount) -
        Number(t.scholarshipAmount) -
        Number(t.discountAmount),
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

  if (all.length === 0) {
    console.log("No outstanding bills to pay; skipping payment seed");
    return;
  }

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
  for (const [, rows] of byStudent) {
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
              serviceFeeBillId: item.kind === "serviceFeeBill" ? item.id : null,
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

  const bl = await loadBusinessLogic();
  const { cashier } = await seedEmployees();
  const academicYear = await seedAcademicYear();

  const feeServices = await seedFeeServices(academicYear.id);
  const { students, exitingStudent } = await seedSubscriptions(feeServices);
  await seedServiceFees(academicYear.id);

  if (students.length > 0) {
    await generateAllBills(bl, academicYear.id);
    await simulateExit(bl, exitingStudent, cashier.employeeId);
    // Re-run generation post-exit so voiding + void-skip behavior is reflected.
    await generateAllBills(bl, academicYear.id);

    await seedPayments(cashier.employeeId);
  } else {
    console.log("Skipping bill generation and payments (no students)");
  }

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
