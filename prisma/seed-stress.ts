import crypto from "node:crypto";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import {
  type FeeServiceCategory,
  Month,
  PrismaClient,
} from "../src/generated/prisma/client.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ============================================================
// NAME DATA
// ============================================================

const firstNames = [
  "Budi",
  "Andi",
  "Siti",
  "Dewi",
  "Rizki",
  "Ahmad",
  "Putri",
  "Dian",
  "Agus",
  "Wahyu",
  "Eka",
  "Sri",
  "Yuni",
  "Fitri",
  "Rina",
  "Hadi",
  "Nur",
  "Wati",
  "Joko",
  "Bambang",
  "Rudi",
  "Hendra",
  "Sari",
  "Lina",
  "Tuti",
  "Yanto",
  "Sugeng",
  "Mulyani",
  "Dwi",
  "Tri",
  "Citra",
  "Indah",
  "Ayu",
  "Deni",
  "Fajar",
  "Gilang",
  "Hani",
  "Irfan",
  "Jihan",
  "Kiki",
  "Leni",
  "Mira",
  "Nanda",
  "Okta",
  "Pandu",
  "Qori",
  "Reza",
  "Sinta",
  "Tika",
  "Udin",
  "Vera",
  "Winda",
  "Xena",
  "Yoga",
  "Zahra",
  "Alfian",
  "Bella",
  "Candra",
  "Dita",
  "Eko",
  "Fina",
  "Gita",
  "Hafiz",
  "Ira",
  "Jaka",
  "Kartika",
  "Lukman",
  "Maya",
  "Niko",
  "Opi",
  "Prita",
  "Rafi",
  "Salsa",
  "Tono",
  "Ulfah",
  "Vina",
  "Wawan",
  "Yesi",
  "Zulfa",
  "Arif",
];

const lastNames = [
  "Pratama",
  "Wijaya",
  "Sari",
  "Kusuma",
  "Hidayat",
  "Saputra",
  "Rahayu",
  "Wulandari",
  "Permana",
  "Nugroho",
  "Santoso",
  "Setiawan",
  "Utama",
  "Lestari",
  "Purnomo",
  "Hartono",
  "Suryanto",
  "Budiman",
  "Wahyudi",
  "Kurniawan",
  "Firmansyah",
  "Handoko",
  "Prasetyo",
  "Sutanto",
  "Gunawan",
  "Halim",
  "Iskandar",
  "Juwono",
  "Kristianto",
  "Lukito",
  "Mulyono",
  "Natawijaya",
  "Oesman",
  "Priyatno",
  "Rachmat",
  "Soetrisno",
  "Tanoto",
  "Usman",
  "Valentino",
  "Wibowo",
  "Yusuf",
  "Zubaidi",
  "Adiputra",
  "Basuki",
  "Cahyono",
  "Darmawan",
  "Erwanto",
  "Fadhilah",
  "Guntoro",
];

const parentFirstNames = [
  "Bapak Hadi",
  "Ibu Siti",
  "Bapak Ahmad",
  "Ibu Dewi",
  "Bapak Agus",
  "Ibu Rina",
  "Bapak Joko",
  "Ibu Wati",
  "Bapak Bambang",
  "Ibu Sri",
  "Bapak Wahyu",
  "Ibu Yuni",
  "Bapak Eko",
  "Ibu Fitri",
  "Bapak Rudi",
  "Ibu Lina",
  "Bapak Hendra",
  "Ibu Tuti",
  "Bapak Sugeng",
  "Ibu Mulyani",
  "Bapak Dwi",
  "Ibu Tri",
  "Bapak Deni",
  "Ibu Citra",
  "Bapak Fajar",
  "Ibu Indah",
  "Bapak Gilang",
  "Ibu Ayu",
  "Bapak Irfan",
  "Ibu Jihan",
];

// ============================================================
// HELPERS
// ============================================================

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  const prefixes = [
    "0811",
    "0812",
    "0813",
    "0814",
    "0815",
    "0816",
    "0817",
    "0818",
    "0819",
    "0821",
    "0822",
    "0823",
    "0851",
    "0852",
    "0853",
    "0855",
    "0856",
    "0857",
    "0858",
    "0877",
    "0878",
    "0881",
    "0882",
    "0883",
    "0896",
    "0897",
    "0898",
    "0899",
  ];
  const prefix = randomItem(prefixes);
  const suffix = String(randomInt(1000000, 9999999));
  return `${prefix}${suffix}`;
}

function generateStudentName(index: number): string {
  const firstName = firstNames[index % firstNames.length];
  const lastName = randomItem(lastNames);
  return `${firstName} ${lastName}`;
}

function generateParentName(): string {
  return `${randomItem(parentFirstNames)} ${randomItem(lastNames)}`;
}

function toRoman(grade: number): string {
  const romans: Record<number, string> = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
  };
  return romans[grade] ?? String(grade);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=== Stress Test Seed ===");
  console.log(
    "Starting data generation for ~300 students (250 current + 50 historical)...\n",
  );

  const hashedPassword = await bcrypt.hash("123456", 10);

  // ============================================================
  // 1. EMPLOYEES
  // ============================================================
  console.log("Creating 8 employees (3 admins + 5 cashiers)...");

  const employeeData = [
    { name: "Admin Utama", email: "admin1@school.com", role: "ADMIN" as const },
    { name: "Admin Dua", email: "admin2@school.com", role: "ADMIN" as const },
    { name: "Admin Tiga", email: "admin3@school.com", role: "ADMIN" as const },
    {
      name: "Kasir Satu",
      email: "cashier1@school.com",
      role: "CASHIER" as const,
    },
    {
      name: "Kasir Dua",
      email: "cashier2@school.com",
      role: "CASHIER" as const,
    },
    {
      name: "Kasir Tiga",
      email: "cashier3@school.com",
      role: "CASHIER" as const,
    },
    {
      name: "Kasir Empat",
      email: "cashier4@school.com",
      role: "CASHIER" as const,
    },
    {
      name: "Kasir Lima",
      email: "cashier5@school.com",
      role: "CASHIER" as const,
    },
  ];

  for (const emp of employeeData) {
    await prisma.employee.upsert({
      where: { email: emp.email },
      update: {},
      create: { ...emp, password: hashedPassword },
    });
  }

  // Fetch all cashiers for use in payments
  const cashiers = await prisma.employee.findMany({
    where: { role: "CASHIER" },
    select: { employeeId: true },
  });

  console.log(`  Done. ${cashiers.length} cashiers available.`);

  // ============================================================
  // 2. ACADEMIC YEARS (4 total: 2 historical + 2 current)
  // ============================================================
  console.log("Creating 4 academic years (2 historical + 2 current)...");

  const ay2122 = await prisma.academicYear.upsert({
    where: { year: "2021/2022" },
    update: {},
    create: {
      year: "2021/2022",
      startDate: new Date("2021-07-01"),
      endDate: new Date("2022-06-30"),
      isActive: false,
    },
  });

  const ay2223 = await prisma.academicYear.upsert({
    where: { year: "2022/2023" },
    update: {},
    create: {
      year: "2022/2023",
      startDate: new Date("2022-07-01"),
      endDate: new Date("2023-06-30"),
      isActive: false,
    },
  });

  const ay2425 = await prisma.academicYear.upsert({
    where: { year: "2024/2025" },
    update: {},
    create: {
      year: "2024/2025",
      startDate: new Date("2024-07-01"),
      endDate: new Date("2025-06-30"),
      isActive: false,
    },
  });

  const ay2526 = await prisma.academicYear.upsert({
    where: { year: "2025/2026" },
    update: {},
    create: {
      year: "2025/2026",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
    },
  });

  console.log(
    `  Created: ${ay2122.year}, ${ay2223.year}, ${ay2425.year}, ${ay2526.year}`,
  );

  // ============================================================
  // 3. CLASSES (12 per year = 48 total)
  // ============================================================
  console.log(
    "Creating 48 class academics (grades 1-6, sections A-B, 4 years)...",
  );

  const academicYears = [ay2122, ay2223, ay2425, ay2526];
  const sections = ["A", "B"];

  // Track created classes for later use
  // Map: yearId -> grade -> section -> classAcademic
  const classMap: Record<
    string,
    Record<
      number,
      Record<
        string,
        { id: string; paymentFrequency: string; monthlyFee: number }
      >
    >
  > = {};

  for (const ay of academicYears) {
    classMap[ay.id] = {};
    for (let grade = 1; grade <= 6; grade++) {
      classMap[ay.id][grade] = {};
      for (const section of sections) {
        const isMonthly = grade <= 4;
        const className = `${toRoman(grade)}-${section}-${ay.year}`;

        const cls = await prisma.classAcademic.upsert({
          where: {
            academicYearId_schoolLevel_grade_section: {
              academicYearId: ay.id,
              schoolLevel: "SD",
              grade,
              section,
            },
          },
          update: {},
          create: {
            academicYearId: ay.id,
            schoolLevel: "SD",
            grade,
            section,
            className,
            paymentFrequency: isMonthly ? "MONTHLY" : "QUARTERLY",
            monthlyFee: isMonthly ? 500000 : 600000,
          },
        });

        classMap[ay.id][grade][section] = {
          id: cls.id,
          paymentFrequency: cls.paymentFrequency,
          monthlyFee: isMonthly ? 500000 : 600000,
        };
      }
    }
  }

  console.log("  Done.");

  // TK/SMP/SMA cohorts are created later in section 5c (after SHARED CONSTANTS).

  // ============================================================
  // SHARED CONSTANTS & HELPERS (used by both historical and current data)
  // ============================================================

  const BATCH_SIZE = 500;
  const UPDATE_BATCH = 100;

  const monthlyPeriods: {
    period: string;
    month: string;
    monthNum: number;
    calYear: number;
  }[] = [
    { period: "JULY", month: "JULY", monthNum: 7, calYear: 0 },
    { period: "AUGUST", month: "AUGUST", monthNum: 8, calYear: 0 },
    { period: "SEPTEMBER", month: "SEPTEMBER", monthNum: 9, calYear: 0 },
    { period: "OCTOBER", month: "OCTOBER", monthNum: 10, calYear: 0 },
    { period: "NOVEMBER", month: "NOVEMBER", monthNum: 11, calYear: 0 },
    { period: "DECEMBER", month: "DECEMBER", monthNum: 12, calYear: 0 },
    { period: "JANUARY", month: "JANUARY", monthNum: 1, calYear: 1 },
    { period: "FEBRUARY", month: "FEBRUARY", monthNum: 2, calYear: 1 },
    { period: "MARCH", month: "MARCH", monthNum: 3, calYear: 1 },
    { period: "APRIL", month: "APRIL", monthNum: 4, calYear: 1 },
    { period: "MAY", month: "MAY", monthNum: 5, calYear: 1 },
    { period: "JUNE", month: "JUNE", monthNum: 6, calYear: 1 },
  ];

  type TuitionInput = {
    classAcademicId: string;
    studentId: string;
    period: string;
    month: string | null;
    year: number;
    feeAmount: number;
    dueDate: Date;
  };

  type PaymentInput = {
    tuitionId: string;
    employeeId: string;
    amount: number;
    paymentDate: Date;
    notes: string | null;
  };

  // ============================================================
  // 4a. HISTORICAL STUDENTS (50 old students from 2021)
  // ============================================================
  console.log("Creating 50 historical students (NIS 2021xxx)...");

  const OLD_STUDENT_COUNT = 50;

  const oldStudentInputs = [];
  for (let i = 1; i <= OLD_STUDENT_COUNT; i++) {
    const nis = `2021${String(i).padStart(3, "0")}`;
    const joinDate = new Date(
      `2021-07-${String(Math.min(randomInt(1, 31), 28)).padStart(2, "0")}`,
    );
    const parentPhone = generatePhone();
    const hashedPhone = await bcrypt.hash(parentPhone, 10);

    oldStudentInputs.push({
      nis,
      name: generateStudentName(i + 200), // offset to avoid name collisions with current students
      address: `Jl. Veteran No. ${randomInt(1, 200)}, RT ${randomInt(1, 15)}/RW ${randomInt(1, 10)}, Jakarta`,
      parentName: generateParentName(),
      parentPhone,
      startJoinDate: joinDate,
      schoolLevel: "SD" as const,
      hasAccount: true,
      password: hashedPhone,
      mustChangePassword: true,
      accountCreatedAt: joinDate,
      accountCreatedBy: "SEED",
    });
  }

  await prisma.student.createMany({
    data: oldStudentInputs,
    skipDuplicates: true,
  });

  const oldStudents = await prisma.student.findMany({
    where: { nis: { in: oldStudentInputs.map((s) => s.nis) } },
    select: { id: true, nis: true },
  });

  console.log(`  Created ${oldStudents.length} historical students.`);

  // ============================================================
  // 4b. HISTORICAL STUDENT-CLASS ASSIGNMENTS
  // ============================================================
  console.log(
    "Assigning historical students to classes in 2021/2022 and 2022/2023...",
  );

  const oldStudentNisList = oldStudents.map((s) => s.nis);
  const oldStudentIdByNis = Object.fromEntries(
    oldStudents.map((s) => [s.nis, s.id]),
  );

  // Build flat list of classes for historical years
  const classes2122: {
    id: string;
    grade: number;
    section: string;
    paymentFrequency: string;
    monthlyFee: number;
  }[] = [];
  const classes2223: {
    id: string;
    grade: number;
    section: string;
    paymentFrequency: string;
    monthlyFee: number;
  }[] = [];

  for (const grade of [1, 2, 3, 4, 5, 6]) {
    for (const section of ["A", "B"]) {
      classes2122.push({
        ...classMap[ay2122.id][grade][section],
        grade,
        section,
      });
      classes2223.push({
        ...classMap[ay2223.id][grade][section],
        grade,
        section,
      });
    }
  }

  // Assign each old student to one class in 2021/2022 (round-robin)
  const oldStudentClassAssignment2122: Record<
    string,
    {
      grade: number;
      section: string;
      classId: string;
      paymentFrequency: string;
      monthlyFee: number;
    }
  > = {};

  const oldStudentClassData2122 = [];
  for (let i = 0; i < oldStudentNisList.length; i++) {
    const cls = classes2122[i % classes2122.length];
    const studentNis = oldStudentNisList[i];
    const studentId = oldStudentIdByNis[studentNis];
    oldStudentClassAssignment2122[studentNis] = {
      grade: cls.grade,
      section: cls.section,
      classId: cls.id,
      paymentFrequency: cls.paymentFrequency,
      monthlyFee: cls.monthlyFee,
    };
    oldStudentClassData2122.push({
      studentId,
      classAcademicId: cls.id,
      enrolledAt: new Date("2021-07-15"),
    });
  }

  await prisma.studentClass.createMany({
    data: oldStudentClassData2122,
    skipDuplicates: true,
  });

  // Assign each old student to 2022/2023 (promote to next grade, max grade 6)
  const oldStudentClassData2223 = [];
  const oldStudentClassAssignment2223: Record<
    string,
    { classId: string; paymentFrequency: string; monthlyFee: number }
  > = {};

  for (const studentNis of oldStudentNisList) {
    const prev = oldStudentClassAssignment2122[studentNis];
    const nextGrade = Math.min(prev.grade + 1, 6);
    const section = prev.section;
    const cls = classMap[ay2223.id][nextGrade][section];
    const studentId = oldStudentIdByNis[studentNis];
    oldStudentClassAssignment2223[studentNis] = {
      classId: cls.id,
      paymentFrequency: cls.paymentFrequency,
      monthlyFee: cls.monthlyFee,
    };
    oldStudentClassData2223.push({
      studentId,
      classAcademicId: cls.id,
      enrolledAt: new Date("2022-07-15"),
    });
  }

  await prisma.studentClass.createMany({
    data: oldStudentClassData2223,
    skipDuplicates: true,
  });

  console.log(
    `  Assigned ${oldStudentNisList.length * 2} historical student-class records (2 years each).`,
  );

  // ============================================================
  // 4c. HISTORICAL TUITIONS (~30% PAID, ~20% PARTIAL, ~50% UNPAID)
  // ============================================================
  console.log("Generating tuitions for historical students...");

  const quarterlyPeriods2122: {
    period: string;
    dueDate: Date;
    calYear: number;
  }[] = [
    { period: "Q1", dueDate: new Date("2021-09-30"), calYear: 0 },
    { period: "Q2", dueDate: new Date("2021-12-31"), calYear: 0 },
    { period: "Q3", dueDate: new Date("2022-03-31"), calYear: 1 },
    { period: "Q4", dueDate: new Date("2022-06-30"), calYear: 1 },
  ];

  const quarterlyPeriods2223: {
    period: string;
    dueDate: Date;
    calYear: number;
  }[] = [
    { period: "Q1", dueDate: new Date("2022-09-30"), calYear: 0 },
    { period: "Q2", dueDate: new Date("2022-12-31"), calYear: 0 },
    { period: "Q3", dueDate: new Date("2023-03-31"), calYear: 1 },
    { period: "Q4", dueDate: new Date("2023-06-30"), calYear: 1 },
  ];

  const oldTuitionInputs: TuitionInput[] = [];

  for (const studentNis of oldStudentNisList) {
    const studentId = oldStudentIdByNis[studentNis];
    // 2021/2022
    const asgn2122 = oldStudentClassAssignment2122[studentNis];
    const startYear2122 = 2021;
    if (asgn2122.paymentFrequency === "MONTHLY") {
      for (const p of monthlyPeriods) {
        const dueCalYear = startYear2122 + p.calYear;
        oldTuitionInputs.push({
          classAcademicId: asgn2122.classId,
          studentId,
          period: p.period,
          month: p.month,
          year: startYear2122,
          feeAmount: asgn2122.monthlyFee,
          dueDate: new Date(
            `${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`,
          ),
        });
      }
    } else {
      for (const p of quarterlyPeriods2122) {
        oldTuitionInputs.push({
          classAcademicId: asgn2122.classId,
          studentId,
          period: p.period,
          month: null,
          year: startYear2122,
          feeAmount: asgn2122.monthlyFee * 3,
          dueDate: p.dueDate,
        });
      }
    }

    // 2022/2023
    const asgn2223 = oldStudentClassAssignment2223[studentNis];
    const startYear2223 = 2022;
    if (asgn2223.paymentFrequency === "MONTHLY") {
      for (const p of monthlyPeriods) {
        const dueCalYear = startYear2223 + p.calYear;
        oldTuitionInputs.push({
          classAcademicId: asgn2223.classId,
          studentId,
          period: p.period,
          month: p.month,
          year: startYear2223,
          feeAmount: asgn2223.monthlyFee,
          dueDate: new Date(
            `${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`,
          ),
        });
      }
    } else {
      for (const p of quarterlyPeriods2223) {
        oldTuitionInputs.push({
          classAcademicId: asgn2223.classId,
          studentId,
          period: p.period,
          month: null,
          year: startYear2223,
          feeAmount: asgn2223.monthlyFee * 3,
          dueDate: p.dueDate,
        });
      }
    }
  }

  console.log(
    `  Generated ${oldTuitionInputs.length} historical tuition records. Inserting in batches...`,
  );

  for (let i = 0; i < oldTuitionInputs.length; i += BATCH_SIZE) {
    const batch = oldTuitionInputs.slice(i, i + BATCH_SIZE);
    await prisma.tuition.createMany({
      data: batch.map((t) => ({
        classAcademicId: t.classAcademicId,
        studentId: t.studentId,
        period: t.period,
        month: t.month as
          | "JULY"
          | "AUGUST"
          | "SEPTEMBER"
          | "OCTOBER"
          | "NOVEMBER"
          | "DECEMBER"
          | "JANUARY"
          | "FEBRUARY"
          | "MARCH"
          | "APRIL"
          | "MAY"
          | "JUNE"
          | null
          | undefined,
        year: t.year,
        feeAmount: t.feeAmount,
        dueDate: t.dueDate,
        status: "UNPAID",
        paidAmount: 0,
        scholarshipAmount: 0,
        discountAmount: 0,
      })),
      skipDuplicates: true,
    });
    console.log(
      `  Historical batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(oldTuitionInputs.length / BATCH_SIZE)}`,
    );
  }

  // ============================================================
  // 4d. HISTORICAL PAYMENTS (~30% PAID, ~20% PARTIAL, ~50% UNPAID)
  // ============================================================
  console.log("Generating payments for historical tuitions...");

  const oldStudentIdList = oldStudentNisList.map(
    (nis) => oldStudentIdByNis[nis],
  );
  const oldTuitions = await prisma.tuition.findMany({
    where: { studentId: { in: oldStudentIdList } },
    select: {
      id: true,
      feeAmount: true,
      classAcademicId: true,
      studentId: true,
      period: true,
      year: true,
    },
  });

  const oldPaymentInserts: PaymentInput[] = [];
  const oldTuitionUpdates: {
    id: string;
    paidAmount: number;
    status: "PAID" | "PARTIAL" | "UNPAID";
  }[] = [];

  for (const tuition of oldTuitions) {
    const roll = Math.random();
    const fee = Number(tuition.feeAmount);
    const cashier = randomItem(cashiers);

    if (roll < 0.3) {
      // PAID (~30%)
      const payDate = new Date(2021, randomInt(6, 11), randomInt(1, 28));
      oldPaymentInserts.push({
        tuitionId: tuition.id,
        employeeId: cashier.employeeId,
        amount: fee,
        paymentDate: payDate,
        notes: null,
      });
      oldTuitionUpdates.push({
        id: tuition.id,
        paidAmount: fee,
        status: "PAID",
      });
    } else if (roll < 0.5) {
      // PARTIAL (~20%)
      const partialRatio = 0.3 + Math.random() * 0.5;
      const partialAmount = Math.floor((fee * partialRatio) / 1000) * 1000;
      const payDate = new Date(2021, randomInt(6, 11), randomInt(1, 28));
      oldPaymentInserts.push({
        tuitionId: tuition.id,
        employeeId: cashier.employeeId,
        amount: partialAmount,
        paymentDate: payDate,
        notes: "Pembayaran sebagian",
      });
      oldTuitionUpdates.push({
        id: tuition.id,
        paidAmount: partialAmount,
        status: "PARTIAL",
      });
    }
    // else: UNPAID (~50%) — no payment record
  }

  console.log(
    `  Inserting ${oldPaymentInserts.length} historical payment records...`,
  );

  for (let i = 0; i < oldPaymentInserts.length; i += BATCH_SIZE) {
    const batch = oldPaymentInserts.slice(i, i + BATCH_SIZE);
    await prisma.payment.createMany({
      data: batch,
      skipDuplicates: false,
    });
    console.log(
      `  Historical payment batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(oldPaymentInserts.length / BATCH_SIZE)}`,
    );
  }

  console.log(
    `  Updating ${oldTuitionUpdates.length} historical tuition statuses...`,
  );

  for (let i = 0; i < oldTuitionUpdates.length; i += UPDATE_BATCH) {
    const batch = oldTuitionUpdates.slice(i, i + UPDATE_BATCH);
    await Promise.all(
      batch.map((u) =>
        prisma.tuition.update({
          where: { id: u.id },
          data: { paidAmount: u.paidAmount, status: u.status },
        }),
      ),
    );
  }

  console.log("  Historical data done.\n");

  // ============================================================
  // 5a. CURRENT STUDENTS (250 total)
  // ============================================================
  console.log("Creating 250 students...");

  const STUDENT_COUNT = 250;

  const studentInputs = [];
  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const nis = `2024${String(i).padStart(3, "0")}`;
    const joinDay = randomInt(1, 31);
    const joinDate = new Date(
      `2024-07-${String(Math.min(joinDay, 28)).padStart(2, "0")}`,
    );
    const parentPhone = generatePhone();
    const hashedPhone = await bcrypt.hash(parentPhone, 10);

    studentInputs.push({
      nis,
      name: generateStudentName(i - 1),
      address: `Jl. Merdeka No. ${randomInt(1, 200)}, RT ${randomInt(1, 15)}/RW ${randomInt(1, 10)}, Jakarta`,
      parentName: generateParentName(),
      parentPhone,
      startJoinDate: joinDate,
      schoolLevel: "SD" as const,
      hasAccount: true,
      password: hashedPhone,
      mustChangePassword: true,
      accountCreatedAt: joinDate,
      accountCreatedBy: "SEED",
    });
  }

  await prisma.student.createMany({
    data: studentInputs,
    skipDuplicates: true,
  });

  const students = await prisma.student.findMany({
    where: { nis: { in: studentInputs.map((s) => s.nis) } },
    select: { id: true, nis: true },
  });

  console.log(`  Created ${students.length} students.`);

  // 5a-extra: Create SMP students with same NIS as first 10 SD students
  console.log(
    "Creating 10 SMP students with duplicate NIS (different tingkatan)...",
  );

  const SMP_DUPLICATE_COUNT = 10;
  const smpStudentInputs = [];
  for (let i = 1; i <= SMP_DUPLICATE_COUNT; i++) {
    const nis = `2024${String(i).padStart(3, "0")}`; // same NIS as SD students
    const joinDate = new Date("2024-07-15");
    const parentPhone = generatePhone();
    const hashedPhone = await bcrypt.hash(parentPhone, 10);

    smpStudentInputs.push({
      nis,
      name: `${generateStudentName(i + 500)} (SMP)`,
      address: `Jl. Pendidikan No. ${randomInt(1, 100)}, Jakarta`,
      parentName: generateParentName(),
      parentPhone,
      startJoinDate: joinDate,
      schoolLevel: "SMP" as const,
      hasAccount: true,
      password: hashedPhone,
      mustChangePassword: true,
      accountCreatedAt: joinDate,
      accountCreatedBy: "SEED",
    });
  }

  await prisma.student.createMany({
    data: smpStudentInputs,
    skipDuplicates: true,
  });
  console.log(
    `  Created ${SMP_DUPLICATE_COUNT} SMP students with duplicate NIS.`,
  );

  // ============================================================
  // 5c. TK / SMP / SMA COHORTS (classes + students + tuitions + payments)
  // ============================================================
  type LevelKey = "TK" | "SMP" | "SMA";

  async function createCohort(opts: {
    schoolLevel: LevelKey;
    grades: number[];
    monthlyFee: number;
    studentCount: number;
    nisPrefix: string; // e.g., "TK2024", "SMP2024", "SMA2024"
    nameSuffix: string; // e.g., "(TK)"
    classPrefix: string; // e.g., "TK-", "SMP-", "SMA-"
    addressStreet: string;
    nameOffset: number;
  }) {
    const {
      schoolLevel,
      grades,
      monthlyFee,
      studentCount,
      nisPrefix,
      nameSuffix,
      classPrefix,
      addressStreet,
      nameOffset,
    } = opts;
    console.log(
      `\n[${schoolLevel}] Creating classes (grades ${grades[0]}-${grades[grades.length - 1]}, sections A-B, 2 current years)...`,
    );

    // Classes per year
    const classMapLvl: Record<
      string,
      Record<number, Record<string, { id: string; monthlyFee: number }>>
    > = {};
    for (const ay of [ay2425, ay2526]) {
      classMapLvl[ay.id] = {};
      for (const grade of grades) {
        classMapLvl[ay.id][grade] = {};
        for (const section of sections) {
          const className = `${classPrefix}${grade}-${section}-${ay.year}`;
          const cls = await prisma.classAcademic.upsert({
            where: {
              academicYearId_schoolLevel_grade_section: {
                academicYearId: ay.id,
                schoolLevel,
                grade,
                section,
              },
            },
            update: {},
            create: {
              academicYearId: ay.id,
              schoolLevel,
              grade,
              section,
              className,
              paymentFrequency: "MONTHLY",
              monthlyFee,
            },
          });
          classMapLvl[ay.id][grade][section] = { id: cls.id, monthlyFee };
        }
      }
    }

    // Students
    console.log(`[${schoolLevel}] Creating ${studentCount} students...`);
    const inputs = [];
    for (let i = 1; i <= studentCount; i++) {
      const nis = `${nisPrefix}${String(i).padStart(3, "0")}`;
      const joinDate = new Date(
        `2024-07-${String(Math.min(randomInt(1, 31), 28)).padStart(2, "0")}`,
      );
      const parentPhone = generatePhone();
      const hashedPhone = await bcrypt.hash(parentPhone, 10);
      inputs.push({
        nis,
        name: `${generateStudentName(i + nameOffset)} ${nameSuffix}`,
        address: `${addressStreet} No. ${randomInt(1, 200)}, Jakarta`,
        parentName: generateParentName(),
        parentPhone,
        startJoinDate: joinDate,
        schoolLevel,
        hasAccount: true,
        password: hashedPhone,
        mustChangePassword: true,
        accountCreatedAt: joinDate,
        accountCreatedBy: "SEED",
      });
    }
    await prisma.student.createMany({ data: inputs, skipDuplicates: true });
    const created = await prisma.student.findMany({
      where: { nis: { in: inputs.map((s) => s.nis) }, schoolLevel },
      select: { id: true, nis: true },
    });

    // Flat class lists per year + assignments (round-robin with promotion, capped at max grade)
    const maxGrade = grades[grades.length - 1];
    const list2425: {
      id: string;
      grade: number;
      section: string;
      monthlyFee: number;
    }[] = [];
    for (const g of grades) {
      for (const s of sections) {
        list2425.push({
          ...classMapLvl[ay2425.id][g][s],
          grade: g,
          section: s,
        });
      }
    }

    const assign2425: Record<
      string,
      { classId: string; grade: number; section: string; monthlyFee: number }
    > = {};
    const assign2526: Record<string, { classId: string; monthlyFee: number }> =
      {};
    const classData: {
      studentId: string;
      classAcademicId: string;
      enrolledAt: Date;
    }[] = [];

    for (let i = 0; i < created.length; i++) {
      const student = created[i];
      const cls2425 = list2425[i % list2425.length];
      assign2425[student.nis] = {
        classId: cls2425.id,
        grade: cls2425.grade,
        section: cls2425.section,
        monthlyFee: cls2425.monthlyFee,
      };
      classData.push({
        studentId: student.id,
        classAcademicId: cls2425.id,
        enrolledAt: new Date("2024-07-15"),
      });

      const nextGrade = Math.min(cls2425.grade + 1, maxGrade);
      const cls2526 = classMapLvl[ay2526.id][nextGrade][cls2425.section];
      assign2526[student.nis] = {
        classId: cls2526.id,
        monthlyFee: cls2526.monthlyFee,
      };
      classData.push({
        studentId: student.id,
        classAcademicId: cls2526.id,
        enrolledAt: new Date("2025-07-15"),
      });
    }
    await prisma.studentClass.createMany({
      data: classData,
      skipDuplicates: true,
    });

    // Tuitions (monthly, both years)
    const idByNis = Object.fromEntries(created.map((s) => [s.nis, s.id]));
    const tuitionInputs: TuitionInput[] = [];
    for (const student of created) {
      for (const [startYear, asgn] of [
        [2024, assign2425[student.nis]] as const,
        [2025, assign2526[student.nis]] as const,
      ]) {
        for (const p of monthlyPeriods) {
          const dueCalYear = startYear + p.calYear;
          tuitionInputs.push({
            classAcademicId: asgn.classId,
            studentId: idByNis[student.nis],
            period: p.period,
            month: p.month,
            year: startYear,
            feeAmount: asgn.monthlyFee,
            dueDate: new Date(
              `${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`,
            ),
          });
        }
      }
    }
    for (let i = 0; i < tuitionInputs.length; i += BATCH_SIZE) {
      const batch = tuitionInputs.slice(i, i + BATCH_SIZE);
      await prisma.tuition.createMany({
        data: batch.map((t) => ({
          classAcademicId: t.classAcademicId,
          studentId: t.studentId,
          period: t.period,
          month: t.month as
            | "JULY"
            | "AUGUST"
            | "SEPTEMBER"
            | "OCTOBER"
            | "NOVEMBER"
            | "DECEMBER"
            | "JANUARY"
            | "FEBRUARY"
            | "MARCH"
            | "APRIL"
            | "MAY"
            | "JUNE"
            | null
            | undefined,
          year: t.year,
          feeAmount: t.feeAmount,
          dueDate: t.dueDate,
          status: "UNPAID",
          paidAmount: 0,
          scholarshipAmount: 0,
          discountAmount: 0,
        })),
        skipDuplicates: true,
      });
    }

    // Payments (~40% PAID, ~10% PARTIAL)
    const allT = await prisma.tuition.findMany({
      where: { studentId: { in: Object.values(idByNis) } },
      select: { id: true, feeAmount: true },
    });
    const paymentInserts: PaymentInput[] = [];
    const tuitionUpdates: {
      id: string;
      paidAmount: number;
      status: "PAID" | "PARTIAL";
    }[] = [];
    for (const tuition of allT) {
      const roll = Math.random();
      const fee = Number(tuition.feeAmount);
      const cashier = randomItem(cashiers);
      if (roll < 0.4) {
        const payDate = new Date(2024, randomInt(6, 11), randomInt(1, 28));
        paymentInserts.push({
          tuitionId: tuition.id,
          employeeId: cashier.employeeId,
          amount: fee,
          paymentDate: payDate,
          notes: null,
        });
        tuitionUpdates.push({
          id: tuition.id,
          paidAmount: fee,
          status: "PAID",
        });
      } else if (roll < 0.5) {
        const partialRatio = 0.3 + Math.random() * 0.5;
        const partialAmount = Math.floor((fee * partialRatio) / 1000) * 1000;
        const payDate = new Date(2024, randomInt(6, 11), randomInt(1, 28));
        paymentInserts.push({
          tuitionId: tuition.id,
          employeeId: cashier.employeeId,
          amount: partialAmount,
          paymentDate: payDate,
          notes: "Pembayaran sebagian",
        });
        tuitionUpdates.push({
          id: tuition.id,
          paidAmount: partialAmount,
          status: "PARTIAL",
        });
      }
    }
    for (let i = 0; i < paymentInserts.length; i += BATCH_SIZE) {
      await prisma.payment.createMany({
        data: paymentInserts.slice(i, i + BATCH_SIZE),
        skipDuplicates: false,
      });
    }
    for (let i = 0; i < tuitionUpdates.length; i += UPDATE_BATCH) {
      const batch = tuitionUpdates.slice(i, i + UPDATE_BATCH);
      await Promise.all(
        batch.map((u) =>
          prisma.tuition.update({
            where: { id: u.id },
            data: { paidAmount: u.paidAmount, status: u.status },
          }),
        ),
      );
    }
    console.log(
      `[${schoolLevel}] Done: ${created.length} students, ${tuitionInputs.length} tuitions, ${paymentInserts.length} payments.`,
    );
  }

  await createCohort({
    schoolLevel: "TK",
    grades: [1, 2, 3],
    monthlyFee: 400_000,
    studentCount: 30,
    nisPrefix: "TK2024",
    nameSuffix: "(TK)",
    classPrefix: "TK-",
    addressStreet: "Jl. Anggrek",
    nameOffset: 700,
  });
  await createCohort({
    schoolLevel: "SMP",
    grades: [7, 8, 9],
    monthlyFee: 700_000,
    studentCount: 40,
    nisPrefix: "SMP2024",
    nameSuffix: "(SMP)",
    classPrefix: "VII-IX-",
    addressStreet: "Jl. Kenanga",
    nameOffset: 400,
  });
  await createCohort({
    schoolLevel: "SMA",
    grades: [10, 11, 12],
    monthlyFee: 900_000,
    studentCount: 40,
    nisPrefix: "SMA2024",
    nameSuffix: "(SMA)",
    classPrefix: "X-XII-",
    addressStreet: "Jl. Melati",
    nameOffset: 600,
  });

  // ============================================================
  // 5b. CURRENT STUDENT-CLASS ASSIGNMENTS
  // ============================================================
  console.log("Assigning students to classes (~20 per class)...");

  // For 2024/2025: distribute students evenly across 12 classes
  // For 2025/2026: same students, assigned to (grade+1) or same grade if already grade 6

  const studentNisList = students.map((s) => s.nis);
  const studentIdByNis = Object.fromEntries(students.map((s) => [s.nis, s.id]));
  const gradeList = [1, 2, 3, 4, 5, 6];
  const sectionList = ["A", "B"];

  // Build flat list of classes per year
  const classes2425: {
    id: string;
    grade: number;
    section: string;
    paymentFrequency: string;
    monthlyFee: number;
  }[] = [];
  const classes2526: {
    id: string;
    grade: number;
    section: string;
    paymentFrequency: string;
    monthlyFee: number;
  }[] = [];

  for (const grade of gradeList) {
    for (const section of sectionList) {
      classes2425.push({
        ...classMap[ay2425.id][grade][section],
        grade,
        section,
      });
      classes2526.push({
        ...classMap[ay2526.id][grade][section],
        grade,
        section,
      });
    }
  }

  // Assign each student to one class in 2024/2025 (round-robin)
  // studentClassMap: studentNis -> { grade, section } for 2024/2025
  const studentClassAssignment2425: Record<
    string,
    {
      grade: number;
      section: string;
      classId: string;
      paymentFrequency: string;
      monthlyFee: number;
    }
  > = {};

  const studentClassData2425 = [];
  for (let i = 0; i < studentNisList.length; i++) {
    const cls = classes2425[i % classes2425.length];
    const studentNis = studentNisList[i];
    const studentId = studentIdByNis[studentNis];
    studentClassAssignment2425[studentNis] = {
      grade: cls.grade,
      section: cls.section,
      classId: cls.id,
      paymentFrequency: cls.paymentFrequency,
      monthlyFee: cls.monthlyFee,
    };
    studentClassData2425.push({
      studentId,
      classAcademicId: cls.id,
      enrolledAt: new Date("2024-07-15"),
    });
  }

  await prisma.studentClass.createMany({
    data: studentClassData2425,
    skipDuplicates: true,
  });

  // Assign each student to 2025/2026 (promote to next grade, max grade 6)
  const studentClassData2526 = [];
  const studentClassAssignment2526: Record<
    string,
    { classId: string; paymentFrequency: string; monthlyFee: number }
  > = {};

  for (const studentNis of studentNisList) {
    const prev = studentClassAssignment2425[studentNis];
    const nextGrade = Math.min(prev.grade + 1, 6);
    const section = prev.section; // keep same section
    const cls = classMap[ay2526.id][nextGrade][section];
    const studentId = studentIdByNis[studentNis];
    studentClassAssignment2526[studentNis] = {
      classId: cls.id,
      paymentFrequency: cls.paymentFrequency,
      monthlyFee: cls.monthlyFee,
    };
    studentClassData2526.push({
      studentId,
      classAcademicId: cls.id,
      enrolledAt: new Date("2025-07-15"),
    });
  }

  await prisma.studentClass.createMany({
    data: studentClassData2526,
    skipDuplicates: true,
  });

  console.log(
    `  Assigned ${studentNisList.length * 2} student-class records (2 years each).`,
  );

  // ============================================================
  // 6. TUITIONS
  // ============================================================
  console.log("Generating tuitions for all student-class assignments...");

  const quarterlyPeriods: { period: string; dueDate: Date; calYear: number }[] =
    [
      { period: "Q1", dueDate: new Date("2024-09-30"), calYear: 0 },
      { period: "Q2", dueDate: new Date("2024-12-31"), calYear: 0 },
      { period: "Q3", dueDate: new Date("2025-03-31"), calYear: 1 },
      { period: "Q4", dueDate: new Date("2025-06-30"), calYear: 1 },
    ];

  const quarterlyPeriods2526: {
    period: string;
    dueDate: Date;
    calYear: number;
  }[] = [
    { period: "Q1", dueDate: new Date("2025-09-30"), calYear: 0 },
    { period: "Q2", dueDate: new Date("2025-12-31"), calYear: 0 },
    { period: "Q3", dueDate: new Date("2026-03-31"), calYear: 1 },
    { period: "Q4", dueDate: new Date("2026-06-30"), calYear: 1 },
  ];

  const tuitionInputs: TuitionInput[] = [];

  // Year offsets for academic years
  const ayStartYears: Record<string, number> = {
    [ay2425.id]: 2024,
    [ay2526.id]: 2025,
  };

  for (const studentNis of studentNisList) {
    const studentId = studentIdByNis[studentNis];
    // 2024/2025
    const asgn2425 = studentClassAssignment2425[studentNis];
    const startYear2425 = ayStartYears[ay2425.id];
    if (asgn2425.paymentFrequency === "MONTHLY") {
      for (const p of monthlyPeriods) {
        const dueCalYear = startYear2425 + p.calYear;
        tuitionInputs.push({
          classAcademicId: asgn2425.classId,
          studentId,
          period: p.period,
          month: p.month,
          year: startYear2425,
          feeAmount: asgn2425.monthlyFee,
          dueDate: new Date(
            `${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`,
          ),
        });
      }
    } else {
      for (const p of quarterlyPeriods) {
        tuitionInputs.push({
          classAcademicId: asgn2425.classId,
          studentId,
          period: p.period,
          month: null,
          year: startYear2425,
          feeAmount: asgn2425.monthlyFee * 3, // quarterly fee = 3x monthly
          dueDate: p.dueDate,
        });
      }
    }

    // 2025/2026
    const asgn2526 = studentClassAssignment2526[studentNis];
    const startYear2526 = ayStartYears[ay2526.id];
    if (asgn2526.paymentFrequency === "MONTHLY") {
      for (const p of monthlyPeriods) {
        const dueCalYear = startYear2526 + p.calYear;
        tuitionInputs.push({
          classAcademicId: asgn2526.classId,
          studentId,
          period: p.period,
          month: p.month,
          year: startYear2526,
          feeAmount: asgn2526.monthlyFee,
          dueDate: new Date(
            `${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`,
          ),
        });
      }
    } else {
      for (const p of quarterlyPeriods2526) {
        tuitionInputs.push({
          classAcademicId: asgn2526.classId,
          studentId,
          period: p.period,
          month: null,
          year: startYear2526,
          feeAmount: asgn2526.monthlyFee * 3,
          dueDate: p.dueDate,
        });
      }
    }
  }

  console.log(
    `  Generated ${tuitionInputs.length} tuition records. Inserting in batches...`,
  );

  // Insert tuitions in batches of 500
  for (let i = 0; i < tuitionInputs.length; i += BATCH_SIZE) {
    const batch = tuitionInputs.slice(i, i + BATCH_SIZE);
    await prisma.tuition.createMany({
      data: batch.map((t) => ({
        classAcademicId: t.classAcademicId,
        studentId: t.studentId,
        period: t.period,
        month: t.month as
          | "JULY"
          | "AUGUST"
          | "SEPTEMBER"
          | "OCTOBER"
          | "NOVEMBER"
          | "DECEMBER"
          | "JANUARY"
          | "FEBRUARY"
          | "MARCH"
          | "APRIL"
          | "MAY"
          | "JUNE"
          | null
          | undefined,
        year: t.year,
        feeAmount: t.feeAmount,
        dueDate: t.dueDate,
        status: "UNPAID",
        paidAmount: 0,
        scholarshipAmount: 0,
        discountAmount: 0,
      })),
      skipDuplicates: true,
    });
    console.log(
      `  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tuitionInputs.length / BATCH_SIZE)}`,
    );
  }

  // ============================================================
  // 7. PAYMENTS (~40% PAID, ~10% PARTIAL, rest UNPAID)
  // ============================================================
  console.log("Fetching all inserted tuitions to create payments...");

  const currentStudentIdList = studentNisList.map((nis) => studentIdByNis[nis]);
  const allTuitions = await prisma.tuition.findMany({
    where: { studentId: { in: currentStudentIdList } },
    select: {
      id: true,
      feeAmount: true,
      classAcademicId: true,
      studentId: true,
      period: true,
      year: true,
    },
  });

  console.log(`  Found ${allTuitions.length} tuitions. Generating payments...`);

  const paymentInserts: PaymentInput[] = [];

  const tuitionUpdates: {
    id: string;
    paidAmount: number;
    status: "PAID" | "PARTIAL" | "UNPAID";
  }[] = [];

  for (const tuition of allTuitions) {
    const roll = Math.random();
    const fee = Number(tuition.feeAmount);
    const cashier = randomItem(cashiers);

    if (roll < 0.4) {
      // PAID
      const payDate = new Date(2024, randomInt(6, 11), randomInt(1, 28));
      paymentInserts.push({
        tuitionId: tuition.id,
        employeeId: cashier.employeeId,
        amount: fee,
        paymentDate: payDate,
        notes: null,
      });
      tuitionUpdates.push({ id: tuition.id, paidAmount: fee, status: "PAID" });
    } else if (roll < 0.5) {
      // PARTIAL — pay between 30% and 80%
      const partialRatio = 0.3 + Math.random() * 0.5;
      const partialAmount = Math.floor((fee * partialRatio) / 1000) * 1000; // round to nearest 1000
      const payDate = new Date(2024, randomInt(6, 11), randomInt(1, 28));
      paymentInserts.push({
        tuitionId: tuition.id,
        employeeId: cashier.employeeId,
        amount: partialAmount,
        paymentDate: payDate,
        notes: "Pembayaran sebagian",
      });
      tuitionUpdates.push({
        id: tuition.id,
        paidAmount: partialAmount,
        status: "PARTIAL",
      });
    }
    // else: UNPAID — no payment record, no update needed
  }

  console.log(
    `  Inserting ${paymentInserts.length} payment records in batches...`,
  );

  for (let i = 0; i < paymentInserts.length; i += BATCH_SIZE) {
    const batch = paymentInserts.slice(i, i + BATCH_SIZE);
    await prisma.payment.createMany({
      data: batch,
      skipDuplicates: false, // payments don't have a unique constraint to skip
    });
    console.log(
      `  Payment batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(paymentInserts.length / BATCH_SIZE)}`,
    );
  }

  console.log(`  Updating ${tuitionUpdates.length} tuition statuses...`);

  // Update tuitions in batches using individual updates (Prisma doesn't support bulk conditional updates)
  for (let i = 0; i < tuitionUpdates.length; i += UPDATE_BATCH) {
    const batch = tuitionUpdates.slice(i, i + UPDATE_BATCH);
    await Promise.all(
      batch.map((u) =>
        prisma.tuition.update({
          where: { id: u.id },
          data: { paidAmount: u.paidAmount, status: u.status },
        }),
      ),
    );
  }

  console.log("  Payments done.");

  // ============================================================
  // 8. SCHOLARSHIPS — per level (SD + TK + SMP + SMA)
  // ============================================================
  console.log("Creating scholarships across all school levels...");

  // Pull 3-6 students per level from 2024/2025 enrollments
  const scholarshipData: {
    studentId: string;
    classAcademicId: string;
    name: string;
    nominal: number;
    isFullScholarship: boolean;
  }[] = [];
  const studentsPerLevel = { TK: 3, SD: 15, SMP: 5, SMA: 5 } as const;

  for (const [lvl, count] of Object.entries(studentsPerLevel)) {
    const enrolled = await prisma.studentClass.findMany({
      where: {
        classAcademic: {
          academicYearId: ay2425.id,
          schoolLevel: lvl as "TK" | "SD" | "SMP" | "SMA",
        },
      },
      select: {
        studentId: true,
        classAcademicId: true,
        classAcademic: { select: { monthlyFee: true } },
      },
      take: count,
    });
    for (let i = 0; i < enrolled.length; i++) {
      const isFull = i < Math.ceil(count / 3);
      const monthlyFee = Number(enrolled[i].classAcademic.monthlyFee);
      scholarshipData.push({
        studentId: enrolled[i].studentId,
        classAcademicId: enrolled[i].classAcademicId,
        name: isFull ? `Beasiswa Penuh ${lvl}` : `Beasiswa Sebagian ${lvl}`,
        nominal: isFull ? monthlyFee : Math.floor(monthlyFee * 0.5),
        isFullScholarship: isFull,
      });
    }
  }

  await prisma.scholarship.createMany({
    data: scholarshipData,
    skipDuplicates: true,
  });

  console.log(
    `  Created ${scholarshipData.length} scholarships across all levels.`,
  );

  // ============================================================
  // 9. DISCOUNTS (2 school-wide)
  // ============================================================
  console.log("Creating 2 school-wide discounts...");

  const existingDiscounts = await prisma.discount.findMany({
    where: {
      academicYearId: ay2425.id,
      name: { in: ["COVID Relief", "Early Payment"] },
    },
    select: { id: true, name: true },
  });

  const existingDiscountNames = new Set(existingDiscounts.map((d) => d.name));

  if (!existingDiscountNames.has("COVID Relief")) {
    await prisma.discount.create({
      data: {
        name: "COVID Relief",
        description: "Keringanan biaya akibat dampak COVID-19",
        reason: "COVID Relief",
        discountAmount: 100000,
        targetPeriods: ["JULY", "AUGUST", "SEPTEMBER"],
        academicYearId: ay2425.id,
        classAcademicId: null,
        isActive: true,
      },
    });
  }

  if (!existingDiscountNames.has("Early Payment")) {
    await prisma.discount.create({
      data: {
        name: "Early Payment",
        description: "Diskon untuk pembayaran lebih awal sebelum tanggal 5",
        reason: "Early Payment Incentive",
        discountAmount: 50000,
        targetPeriods: [
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
        ],
        academicYearId: ay2425.id,
        classAcademicId: null,
        isActive: true,
      },
    });
  }

  // Per-level class-specific discount (one grade-level target per cohort)
  for (const lvl of ["TK", "SD", "SMP", "SMA"] as const) {
    const cls = await prisma.classAcademic.findFirst({
      where: { academicYearId: ay2425.id, schoolLevel: lvl },
      orderBy: { grade: "asc" },
    });
    if (!cls) continue;
    const name = `Diskon Kelas ${lvl}`;
    const exists = await prisma.discount.findFirst({
      where: { academicYearId: ay2425.id, name },
    });
    if (exists) continue;
    await prisma.discount.create({
      data: {
        name,
        description: `Diskon khusus untuk siswa ${lvl}`,
        reason: `Promosi ${lvl}`,
        discountAmount: 75_000,
        targetPeriods: ["JULY", "AUGUST", "SEPTEMBER"],
        academicYearId: ay2425.id,
        classAcademicId: cls.id,
        isActive: true,
      },
    });
  }

  console.log("  Created discounts (2 school-wide + 4 per-level).");

  // ============================================================
  // 10. FEE SERVICES (Transport + Accommodation) for current years
  // ============================================================
  console.log(
    "Creating fee services (transport + accommodation) for 2024/2025 and 2025/2026...",
  );

  interface FeeServiceDef {
    name: string;
    category: FeeServiceCategory;
    priceByYear: Record<string, number>;
  }

  const feeServiceDefs: FeeServiceDef[] = [
    {
      name: "Bus Rute Utara",
      category: "TRANSPORT",
      priceByYear: { [ay2425.id]: 250_000, [ay2526.id]: 275_000 },
    },
    {
      name: "Bus Rute Selatan",
      category: "TRANSPORT",
      priceByYear: { [ay2425.id]: 300_000, [ay2526.id]: 325_000 },
    },
    {
      name: "Asrama Putra",
      category: "ACCOMMODATION",
      priceByYear: { [ay2425.id]: 1_500_000, [ay2526.id]: 1_650_000 },
    },
  ];

  const feeServicesByYear: Record<
    string,
    { id: string; name: string; amount: number }[]
  > = {
    [ay2425.id]: [],
    [ay2526.id]: [],
  };

  for (const ay of [ay2425, ay2526]) {
    for (const def of feeServiceDefs) {
      let svc = await prisma.feeService.findFirst({
        where: { academicYearId: ay.id, name: def.name },
      });
      if (!svc) {
        svc = await prisma.feeService.create({
          data: {
            academicYearId: ay.id,
            name: def.name,
            category: def.category,
            isActive: true,
          },
        });
      }
      await prisma.feeServicePrice.upsert({
        where: {
          feeServiceId_effectiveFrom: {
            feeServiceId: svc.id,
            effectiveFrom: ay.startDate,
          },
        },
        update: { amount: def.priceByYear[ay.id] },
        create: {
          feeServiceId: svc.id,
          effectiveFrom: ay.startDate,
          amount: def.priceByYear[ay.id],
        },
      });
      feeServicesByYear[ay.id].push({
        id: svc.id,
        name: svc.name,
        amount: def.priceByYear[ay.id],
      });
    }
  }

  console.log(
    `  Created ${feeServiceDefs.length * 2} fee services (3 per year × 2 years) with prices.`,
  );

  // ============================================================
  // 11. SERVICE FEES (Uang Perlengkapan) per class for current years
  // ============================================================
  console.log(
    "Creating service fees (Uang Perlengkapan) per class for 2024/2025 and 2025/2026...",
  );

  const serviceFeesByClass: Record<string, { id: string; amount: number }> = {};
  let serviceFeeCreated = 0;

  // Query ALL classes across current years (covers SD, TK, SMP, SMA)
  const allCurrentClasses = await prisma.classAcademic.findMany({
    where: { academicYearId: { in: [ay2425.id, ay2526.id] } },
    select: { id: true, schoolLevel: true },
  });

  // Vary service fee amount by level
  const svcFeeAmountByLevel: Record<string, number> = {
    TK: 500_000,
    SD: 750_000,
    SMP: 900_000,
    SMA: 1_100_000,
  };

  for (const cls of allCurrentClasses) {
    const amount = svcFeeAmountByLevel[cls.schoolLevel] ?? 750_000;
    let svcFee = await prisma.serviceFee.findFirst({
      where: { classAcademicId: cls.id, name: "Uang Perlengkapan" },
    });
    if (!svcFee) {
      svcFee = await prisma.serviceFee.create({
        data: {
          classAcademicId: cls.id,
          name: "Uang Perlengkapan",
          amount,
          billingMonths: [Month.JULY, Month.JANUARY],
          isActive: true,
        },
      });
      serviceFeeCreated++;
    }
    serviceFeesByClass[cls.id] = { id: svcFee.id, amount };
  }

  console.log(
    `  Created ${serviceFeeCreated} service fees across ${allCurrentClasses.length} classes (rest already existed).`,
  );

  // ============================================================
  // 12. FEE SUBSCRIPTIONS (~30% of current students per year)
  // ============================================================
  console.log("Creating fee subscriptions (~30% of students per year)...");

  interface SubRow {
    id: string;
    studentId: string;
    feeServiceId: string;
    feeServiceName: string;
    amount: number;
    startDate: Date;
    endDate: Date | null;
    academicYearId: string;
  }

  const allSubs: SubRow[] = [];

  // Query all students enrolled in each current year (via student_classes)
  for (const ay of [ay2425, ay2526]) {
    const services = feeServicesByYear[ay.id];
    const enrollments = await prisma.studentClass.findMany({
      where: { classAcademic: { academicYearId: ay.id } },
      select: { studentId: true },
      distinct: ["studentId"],
    });

    const subInputs: {
      id: string;
      studentId: string;
      feeServiceId: string;
      startDate: Date;
      endDate: Date | null;
      notes: string;
    }[] = [];

    for (const { studentId } of enrollments) {
      const roll = Math.random();
      if (roll >= 0.3) continue;
      const numServices = roll < 0.03 ? 3 : roll < 0.12 ? 2 : 1;
      const shuffled = [...services].sort(() => Math.random() - 0.5);
      for (let s = 0; s < Math.min(numServices, shuffled.length); s++) {
        const svc = shuffled[s];
        const subId = crypto.randomUUID();
        subInputs.push({
          id: subId,
          studentId,
          feeServiceId: svc.id,
          startDate: ay.startDate,
          endDate: null,
          notes: `[STRESS] ${svc.name} ${ay.year}`,
        });
        allSubs.push({
          id: subId,
          studentId,
          feeServiceId: svc.id,
          feeServiceName: svc.name,
          amount: svc.amount,
          startDate: ay.startDate,
          endDate: null,
          academicYearId: ay.id,
        });
      }
    }

    for (let i = 0; i < subInputs.length; i += BATCH_SIZE) {
      const batch = subInputs.slice(i, i + BATCH_SIZE);
      await prisma.feeSubscription.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }
    console.log(
      `  ${ay.year}: created ${subInputs.length} subscriptions across ${enrollments.length} enrolled students.`,
    );
  }

  // ============================================================
  // 13. FEE BILLS (direct inserts — monthly per subscription)
  // ============================================================
  console.log("Generating fee bills (one per month per subscription)...");

  type FeeBillInput = {
    id: string;
    subscriptionId: string;
    feeServiceId: string;
    studentId: string;
    period: string;
    year: number;
    amount: number;
    dueDate: Date;
  };

  const feeBillInputs: FeeBillInput[] = [];

  for (const sub of allSubs) {
    const startYear = sub.academicYearId === ay2425.id ? 2024 : 2025;
    for (const p of monthlyPeriods) {
      const dueCalYear = startYear + p.calYear;
      feeBillInputs.push({
        id: crypto.randomUUID(),
        subscriptionId: sub.id,
        feeServiceId: sub.feeServiceId,
        studentId: sub.studentId,
        period: p.period,
        year: startYear,
        amount: sub.amount,
        dueDate: new Date(
          `${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`,
        ),
      });
    }
  }

  console.log(
    `  Generated ${feeBillInputs.length} fee bill records. Inserting in batches...`,
  );

  for (let i = 0; i < feeBillInputs.length; i += BATCH_SIZE) {
    const batch = feeBillInputs.slice(i, i + BATCH_SIZE);
    await prisma.feeBill.createMany({
      data: batch.map((b) => ({
        id: b.id,
        subscriptionId: b.subscriptionId,
        feeServiceId: b.feeServiceId,
        studentId: b.studentId,
        period: b.period,
        year: b.year,
        amount: b.amount,
        dueDate: b.dueDate,
        status: "UNPAID" as const,
        paidAmount: 0,
      })),
      skipDuplicates: true,
    });
    console.log(
      `  Fee bill batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(feeBillInputs.length / BATCH_SIZE)}`,
    );
  }

  // ============================================================
  // 14. SERVICE FEE BILLS (Uang Perlengkapan — Jul & Jan per student)
  // ============================================================
  console.log(
    "Generating service fee bills (Jul & Jan per student per year)...",
  );

  type ServiceFeeBillInput = {
    id: string;
    serviceFeeId: string;
    studentId: string;
    classAcademicId: string;
    period: string;
    year: number;
    amount: number;
    dueDate: Date;
  };

  const svcBillInputs: ServiceFeeBillInput[] = [];

  // Query all enrollments in current years (covers SD + TK/SMP/SMA cohorts)
  for (const { ayId, startYear } of [
    { ayId: ay2425.id, startYear: 2024 },
    { ayId: ay2526.id, startYear: 2025 },
  ]) {
    const enrollments = await prisma.studentClass.findMany({
      where: { classAcademic: { academicYearId: ayId } },
      select: { studentId: true, classAcademicId: true },
    });
    for (const enr of enrollments) {
      const svcFee = serviceFeesByClass[enr.classAcademicId];
      if (!svcFee) continue;
      svcBillInputs.push({
        id: crypto.randomUUID(),
        serviceFeeId: svcFee.id,
        studentId: enr.studentId,
        classAcademicId: enr.classAcademicId,
        period: "JULY",
        year: startYear,
        amount: svcFee.amount,
        dueDate: new Date(`${startYear}-07-10`),
      });
      svcBillInputs.push({
        id: crypto.randomUUID(),
        serviceFeeId: svcFee.id,
        studentId: enr.studentId,
        classAcademicId: enr.classAcademicId,
        period: "JANUARY",
        year: startYear,
        amount: svcFee.amount,
        dueDate: new Date(`${startYear + 1}-01-10`),
      });
    }
  }

  console.log(
    `  Generated ${svcBillInputs.length} service fee bill records. Inserting in batches...`,
  );

  for (let i = 0; i < svcBillInputs.length; i += BATCH_SIZE) {
    const batch = svcBillInputs.slice(i, i + BATCH_SIZE);
    await prisma.serviceFeeBill.createMany({
      data: batch.map((b) => ({
        id: b.id,
        serviceFeeId: b.serviceFeeId,
        studentId: b.studentId,
        classAcademicId: b.classAcademicId,
        period: b.period,
        year: b.year,
        amount: b.amount,
        dueDate: b.dueDate,
        status: "UNPAID" as const,
        paidAmount: 0,
      })),
      skipDuplicates: true,
    });
    console.log(
      `  Service fee bill batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(svcBillInputs.length / BATCH_SIZE)}`,
    );
  }

  // ============================================================
  // 15. PAYMENTS for fee bills and service fee bills (~45% PAID, ~10% PARTIAL)
  // ============================================================
  console.log("Generating payments for fee bills and service fee bills...");

  type BillPayInput = {
    kind: "feeBill" | "serviceFeeBill";
    id: string;
    amount: number;
    startYear: number;
  };

  const payableBills: BillPayInput[] = [
    ...feeBillInputs.map((b) => ({
      kind: "feeBill" as const,
      id: b.id,
      amount: b.amount,
      startYear: b.year,
    })),
    ...svcBillInputs.map((b) => ({
      kind: "serviceFeeBill" as const,
      id: b.id,
      amount: b.amount,
      startYear: b.year,
    })),
  ];

  const feePaymentInserts: Array<{
    feeBillId: string | null;
    serviceFeeBillId: string | null;
    employeeId: string;
    amount: number;
    paymentDate: Date;
    notes: string | null;
  }> = [];

  const feeBillUpdates: {
    id: string;
    paidAmount: number;
    status: "PAID" | "PARTIAL" | "VOID";
  }[] = [];
  const svcBillUpdates: {
    id: string;
    paidAmount: number;
    status: "PAID" | "PARTIAL" | "VOID";
  }[] = [];

  for (const bill of payableBills) {
    const roll = Math.random();
    const cashier = randomItem(cashiers);
    if (roll < 0.03) {
      // ~3% VOID — bill cancelled, no payment
      if (bill.kind === "feeBill") {
        feeBillUpdates.push({ id: bill.id, paidAmount: 0, status: "VOID" });
      } else {
        svcBillUpdates.push({ id: bill.id, paidAmount: 0, status: "VOID" });
      }
    } else if (roll < 0.45) {
      const payMonth = randomInt(6, 11);
      const payDate = new Date(bill.startYear, payMonth, randomInt(1, 28));
      feePaymentInserts.push({
        feeBillId: bill.kind === "feeBill" ? bill.id : null,
        serviceFeeBillId: bill.kind === "serviceFeeBill" ? bill.id : null,
        employeeId: cashier.employeeId,
        amount: bill.amount,
        paymentDate: payDate,
        notes: null,
      });
      if (bill.kind === "feeBill") {
        feeBillUpdates.push({
          id: bill.id,
          paidAmount: bill.amount,
          status: "PAID",
        });
      } else {
        svcBillUpdates.push({
          id: bill.id,
          paidAmount: bill.amount,
          status: "PAID",
        });
      }
    } else if (roll < 0.55) {
      const partialRatio = 0.3 + Math.random() * 0.5;
      const partialAmount =
        Math.floor((bill.amount * partialRatio) / 1000) * 1000;
      if (partialAmount <= 0) continue;
      const payMonth = randomInt(6, 11);
      const payDate = new Date(bill.startYear, payMonth, randomInt(1, 28));
      feePaymentInserts.push({
        feeBillId: bill.kind === "feeBill" ? bill.id : null,
        serviceFeeBillId: bill.kind === "serviceFeeBill" ? bill.id : null,
        employeeId: cashier.employeeId,
        amount: partialAmount,
        paymentDate: payDate,
        notes: "Pembayaran sebagian",
      });
      if (bill.kind === "feeBill") {
        feeBillUpdates.push({
          id: bill.id,
          paidAmount: partialAmount,
          status: "PARTIAL",
        });
      } else {
        svcBillUpdates.push({
          id: bill.id,
          paidAmount: partialAmount,
          status: "PARTIAL",
        });
      }
    }
  }

  console.log(
    `  Inserting ${feePaymentInserts.length} fee/service-fee payment records...`,
  );

  for (let i = 0; i < feePaymentInserts.length; i += BATCH_SIZE) {
    const batch = feePaymentInserts.slice(i, i + BATCH_SIZE);
    await prisma.payment.createMany({ data: batch, skipDuplicates: false });
    console.log(
      `  Fee payment batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(feePaymentInserts.length / BATCH_SIZE)}`,
    );
  }

  console.log(`  Updating ${feeBillUpdates.length} fee bill statuses...`);
  for (let i = 0; i < feeBillUpdates.length; i += UPDATE_BATCH) {
    const batch = feeBillUpdates.slice(i, i + UPDATE_BATCH);
    await Promise.all(
      batch.map((u) =>
        prisma.feeBill.update({
          where: { id: u.id },
          data: { paidAmount: u.paidAmount, status: u.status },
        }),
      ),
    );
  }

  console.log(
    `  Updating ${svcBillUpdates.length} service fee bill statuses...`,
  );
  for (let i = 0; i < svcBillUpdates.length; i += UPDATE_BATCH) {
    const batch = svcBillUpdates.slice(i, i + UPDATE_BATCH);
    await Promise.all(
      batch.map((u) =>
        prisma.serviceFeeBill.update({
          where: { id: u.id },
          data: { paidAmount: u.paidAmount, status: u.status },
        }),
      ),
    );
  }

  console.log("  Fee/service-fee payments done.");

  // ============================================================
  // SUMMARY
  // ============================================================
  const totalCurrentStudents = studentNisList.length;
  const totalOldStudents = oldStudentNisList.length;
  const totalStudents = totalCurrentStudents + totalOldStudents;

  const totalCurrentTuitions = allTuitions.length;
  const totalOldTuitions = oldTuitions.length;
  const totalTuitions = totalCurrentTuitions + totalOldTuitions;

  const paidCount = tuitionUpdates.filter((t) => t.status === "PAID").length;
  const partialCount = tuitionUpdates.filter(
    (t) => t.status === "PARTIAL",
  ).length;
  const unpaidCount = totalCurrentTuitions - paidCount - partialCount;

  const oldPaidCount = oldTuitionUpdates.filter(
    (t) => t.status === "PAID",
  ).length;
  const oldPartialCount = oldTuitionUpdates.filter(
    (t) => t.status === "PARTIAL",
  ).length;
  const oldUnpaidCount = totalOldTuitions - oldPaidCount - oldPartialCount;

  console.log("\n=== Stress Test Seed Complete ===");
  console.log(`  Employees:        8 (3 admins, 5 cashiers)`);
  console.log(
    `  Academic years:   4 (2021/2022, 2022/2023, 2024/2025, 2025/2026)`,
  );
  console.log(`  Class academics:  48 (grades 1-6, sections A-B, 4 years)`);
  console.log(
    `  Students:         ${totalStudents} total (all with portal accounts, password = parentPhone)`,
  );
  console.log(`    Current:        ${totalCurrentStudents} (NIS 2024xxx)`);
  console.log(`    Historical:     ${totalOldStudents} (NIS 2021xxx)`);
  console.log(
    `  Student-class:    ${totalCurrentStudents * 2 + totalOldStudents * 2} assignments`,
  );
  console.log(`  Tuitions:         ${totalTuitions} total`);
  console.log(`  Current tuitions: ${totalCurrentTuitions}`);
  console.log(
    `    PAID:           ${paidCount} (~${Math.round((paidCount / totalCurrentTuitions) * 100)}%)`,
  );
  console.log(
    `    PARTIAL:        ${partialCount} (~${Math.round((partialCount / totalCurrentTuitions) * 100)}%)`,
  );
  console.log(
    `    UNPAID:         ${unpaidCount} (~${Math.round((unpaidCount / totalCurrentTuitions) * 100)}%)`,
  );
  console.log(`  Historical tuitions: ${totalOldTuitions}`);
  console.log(
    `    PAID:           ${oldPaidCount} (~${Math.round((oldPaidCount / totalOldTuitions) * 100)}%)`,
  );
  console.log(
    `    PARTIAL:        ${oldPartialCount} (~${Math.round((oldPartialCount / totalOldTuitions) * 100)}%)`,
  );
  console.log(
    `    UNPAID:         ${oldUnpaidCount} (~${Math.round((oldUnpaidCount / totalOldTuitions) * 100)}%)`,
  );
  console.log(
    `  Payments:         ${paymentInserts.length + oldPaymentInserts.length} (${paymentInserts.length} current + ${oldPaymentInserts.length} historical)`,
  );
  console.log(`  Scholarships:     ${scholarshipData.length}`);
  console.log(`  Discounts:        2`);
  console.log(
    `  Fee services:     ${feeServiceDefs.length * 2} (3 per year × 2 current years)`,
  );
  console.log(`  Fee subscriptions: ${allSubs.length}`);
  console.log(`  Fee bills:        ${feeBillInputs.length}`);
  console.log(
    `  Service fees:     ${Object.keys(serviceFeesByClass).length} (per class, 2 years)`,
  );
  console.log(`  Service fee bills: ${svcBillInputs.length}`);
  console.log(`  Fee/svc payments: ${feePaymentInserts.length}`);
}

main()
  .catch((e) => {
    console.error("Stress seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
