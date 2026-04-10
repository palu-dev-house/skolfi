import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ============================================================
// NAME DATA
// ============================================================

const firstNames = [
  "Budi", "Andi", "Siti", "Dewi", "Rizki", "Ahmad", "Putri", "Dian",
  "Agus", "Wahyu", "Eka", "Sri", "Yuni", "Fitri", "Rina", "Hadi",
  "Nur", "Wati", "Joko", "Bambang", "Rudi", "Hendra", "Sari", "Lina",
  "Tuti", "Yanto", "Sugeng", "Mulyani", "Dwi", "Tri", "Citra", "Indah",
  "Ayu", "Deni", "Fajar", "Gilang", "Hani", "Irfan", "Jihan", "Kiki",
  "Leni", "Mira", "Nanda", "Okta", "Pandu", "Qori", "Reza", "Sinta",
  "Tika", "Udin", "Vera", "Winda", "Xena", "Yoga", "Zahra", "Alfian",
  "Bella", "Candra", "Dita", "Eko", "Fina", "Gita", "Hafiz", "Ira",
  "Jaka", "Kartika", "Lukman", "Maya", "Niko", "Opi", "Prita", "Rafi",
  "Salsa", "Tono", "Ulfah", "Vina", "Wawan", "Yesi", "Zulfa", "Arif",
];

const lastNames = [
  "Pratama", "Wijaya", "Sari", "Kusuma", "Hidayat", "Saputra", "Rahayu",
  "Wulandari", "Permana", "Nugroho", "Santoso", "Setiawan", "Utama",
  "Lestari", "Purnomo", "Hartono", "Suryanto", "Budiman", "Wahyudi",
  "Kurniawan", "Firmansyah", "Handoko", "Prasetyo", "Sutanto", "Gunawan",
  "Halim", "Iskandar", "Juwono", "Kristianto", "Lukito", "Mulyono",
  "Natawijaya", "Oesman", "Priyatno", "Rachmat", "Soetrisno", "Tanoto",
  "Usman", "Valentino", "Wibowo", "Yusuf", "Zubaidi", "Adiputra",
  "Basuki", "Cahyono", "Darmawan", "Erwanto", "Fadhilah", "Guntoro",
];

const parentFirstNames = [
  "Bapak Hadi", "Ibu Siti", "Bapak Ahmad", "Ibu Dewi", "Bapak Agus",
  "Ibu Rina", "Bapak Joko", "Ibu Wati", "Bapak Bambang", "Ibu Sri",
  "Bapak Wahyu", "Ibu Yuni", "Bapak Eko", "Ibu Fitri", "Bapak Rudi",
  "Ibu Lina", "Bapak Hendra", "Ibu Tuti", "Bapak Sugeng", "Ibu Mulyani",
  "Bapak Dwi", "Ibu Tri", "Bapak Deni", "Ibu Citra", "Bapak Fajar",
  "Ibu Indah", "Bapak Gilang", "Ibu Ayu", "Bapak Irfan", "Ibu Jihan",
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

function generateNik(): string {
  // 16-digit NIK
  let nik = "";
  for (let i = 0; i < 16; i++) {
    nik += Math.floor(Math.random() * 10).toString();
  }
  return nik;
}

function generatePhone(): string {
  const prefixes = ["0811", "0812", "0813", "0814", "0815", "0816", "0817",
    "0818", "0819", "0821", "0822", "0823", "0851", "0852", "0853",
    "0855", "0856", "0857", "0858", "0877", "0878", "0881", "0882",
    "0883", "0896", "0897", "0898", "0899"];
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
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
  };
  return romans[grade] ?? String(grade);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=== Stress Test Seed ===");
  console.log("Starting data generation for ~300 students (250 current + 50 historical)...\n");

  const hashedPassword = await bcrypt.hash("123456", 10);

  // ============================================================
  // 1. EMPLOYEES
  // ============================================================
  console.log("Creating 8 employees (3 admins + 5 cashiers)...");

  const employeeData = [
    { name: "Admin Utama", email: "admin1@school.com", role: "ADMIN" as const },
    { name: "Admin Dua", email: "admin2@school.com", role: "ADMIN" as const },
    { name: "Admin Tiga", email: "admin3@school.com", role: "ADMIN" as const },
    { name: "Kasir Satu", email: "cashier1@school.com", role: "CASHIER" as const },
    { name: "Kasir Dua", email: "cashier2@school.com", role: "CASHIER" as const },
    { name: "Kasir Tiga", email: "cashier3@school.com", role: "CASHIER" as const },
    { name: "Kasir Empat", email: "cashier4@school.com", role: "CASHIER" as const },
    { name: "Kasir Lima", email: "cashier5@school.com", role: "CASHIER" as const },
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

  console.log(`  Created: ${ay2122.year}, ${ay2223.year}, ${ay2425.year}, ${ay2526.year}`);

  // ============================================================
  // 3. CLASSES (12 per year = 48 total)
  // ============================================================
  console.log("Creating 48 class academics (grades 1-6, sections A-B, 4 years)...");

  const academicYears = [ay2122, ay2223, ay2425, ay2526];
  const sections = ["A", "B"];

  // Track created classes for later use
  // Map: yearId -> grade -> section -> classAcademic
  const classMap: Record<string, Record<number, Record<string, { id: string; paymentFrequency: string; monthlyFee: number }>>> = {};

  for (const ay of academicYears) {
    classMap[ay.id] = {};
    for (let grade = 1; grade <= 6; grade++) {
      classMap[ay.id][grade] = {};
      for (const section of sections) {
        const isMonthly = grade <= 4;
        const className = `${toRoman(grade)}-${section}-${ay.year}`;

        const cls = await prisma.classAcademic.upsert({
          where: {
            academicYearId_grade_section: {
              academicYearId: ay.id,
              grade,
              section,
            },
          },
          update: {},
          create: {
            academicYearId: ay.id,
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

  // ============================================================
  // SHARED CONSTANTS & HELPERS (used by both historical and current data)
  // ============================================================

  const BATCH_SIZE = 500;
  const UPDATE_BATCH = 100;

  // Generate unique NIKs
  const usedNiks = new Set<string>();
  const generateUniqueNik = (): string => {
    let nik: string;
    do {
      nik = generateNik();
    } while (usedNiks.has(nik));
    usedNiks.add(nik);
    return nik;
  };

  const monthlyPeriods: { period: string; month: string; monthNum: number; calYear: number }[] = [
    { period: "JULY",      month: "JULY",      monthNum: 7,  calYear: 0 },
    { period: "AUGUST",    month: "AUGUST",    monthNum: 8,  calYear: 0 },
    { period: "SEPTEMBER", month: "SEPTEMBER", monthNum: 9,  calYear: 0 },
    { period: "OCTOBER",   month: "OCTOBER",   monthNum: 10, calYear: 0 },
    { period: "NOVEMBER",  month: "NOVEMBER",  monthNum: 11, calYear: 0 },
    { period: "DECEMBER",  month: "DECEMBER",  monthNum: 12, calYear: 0 },
    { period: "JANUARY",   month: "JANUARY",   monthNum: 1,  calYear: 1 },
    { period: "FEBRUARY",  month: "FEBRUARY",  monthNum: 2,  calYear: 1 },
    { period: "MARCH",     month: "MARCH",     monthNum: 3,  calYear: 1 },
    { period: "APRIL",     month: "APRIL",     monthNum: 4,  calYear: 1 },
    { period: "MAY",       month: "MAY",       monthNum: 5,  calYear: 1 },
    { period: "JUNE",      month: "JUNE",      monthNum: 6,  calYear: 1 },
  ];

  type TuitionInput = {
    classAcademicId: string;
    studentNis: string;
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
    const joinDate = new Date(`2021-07-${String(Math.min(randomInt(1, 31), 28)).padStart(2, "0")}`);
    const parentPhone = generatePhone();
    const hashedPhone = await bcrypt.hash(parentPhone, 10);

    oldStudentInputs.push({
      nis,
      nik: generateUniqueNik(),
      name: generateStudentName(i + 200), // offset to avoid name collisions with current students
      address: `Jl. Veteran No. ${randomInt(1, 200)}, RT ${randomInt(1, 15)}/RW ${randomInt(1, 10)}, Jakarta`,
      parentName: generateParentName(),
      parentPhone,
      startJoinDate: joinDate,
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
    select: { nis: true },
  });

  console.log(`  Created ${oldStudents.length} historical students.`);

  // ============================================================
  // 4b. HISTORICAL STUDENT-CLASS ASSIGNMENTS
  // ============================================================
  console.log("Assigning historical students to classes in 2021/2022 and 2022/2023...");

  const oldStudentNisList = oldStudents.map((s) => s.nis);

  // Build flat list of classes for historical years
  const classes2122: { id: string; grade: number; section: string; paymentFrequency: string; monthlyFee: number }[] = [];
  const classes2223: { id: string; grade: number; section: string; paymentFrequency: string; monthlyFee: number }[] = [];

  for (const grade of [1, 2, 3, 4, 5, 6]) {
    for (const section of ["A", "B"]) {
      classes2122.push({ ...classMap[ay2122.id][grade][section], grade, section });
      classes2223.push({ ...classMap[ay2223.id][grade][section], grade, section });
    }
  }

  // Assign each old student to one class in 2021/2022 (round-robin)
  const oldStudentClassAssignment2122: Record<string, { grade: number; section: string; classId: string; paymentFrequency: string; monthlyFee: number }> = {};

  const oldStudentClassData2122 = [];
  for (let i = 0; i < oldStudentNisList.length; i++) {
    const cls = classes2122[i % classes2122.length];
    const studentNis = oldStudentNisList[i];
    oldStudentClassAssignment2122[studentNis] = {
      grade: cls.grade,
      section: cls.section,
      classId: cls.id,
      paymentFrequency: cls.paymentFrequency,
      monthlyFee: cls.monthlyFee,
    };
    oldStudentClassData2122.push({
      studentNis,
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
  const oldStudentClassAssignment2223: Record<string, { classId: string; paymentFrequency: string; monthlyFee: number }> = {};

  for (const studentNis of oldStudentNisList) {
    const prev = oldStudentClassAssignment2122[studentNis];
    const nextGrade = Math.min(prev.grade + 1, 6);
    const section = prev.section;
    const cls = classMap[ay2223.id][nextGrade][section];
    oldStudentClassAssignment2223[studentNis] = {
      classId: cls.id,
      paymentFrequency: cls.paymentFrequency,
      monthlyFee: cls.monthlyFee,
    };
    oldStudentClassData2223.push({
      studentNis,
      classAcademicId: cls.id,
      enrolledAt: new Date("2022-07-15"),
    });
  }

  await prisma.studentClass.createMany({
    data: oldStudentClassData2223,
    skipDuplicates: true,
  });

  console.log(`  Assigned ${oldStudentNisList.length * 2} historical student-class records (2 years each).`);

  // ============================================================
  // 4c. HISTORICAL TUITIONS (~30% PAID, ~20% PARTIAL, ~50% UNPAID)
  // ============================================================
  console.log("Generating tuitions for historical students...");

  const quarterlyPeriods2122: { period: string; dueDate: Date; calYear: number }[] = [
    { period: "Q1", dueDate: new Date("2021-09-30"), calYear: 0 },
    { period: "Q2", dueDate: new Date("2021-12-31"), calYear: 0 },
    { period: "Q3", dueDate: new Date("2022-03-31"), calYear: 1 },
    { period: "Q4", dueDate: new Date("2022-06-30"), calYear: 1 },
  ];

  const quarterlyPeriods2223: { period: string; dueDate: Date; calYear: number }[] = [
    { period: "Q1", dueDate: new Date("2022-09-30"), calYear: 0 },
    { period: "Q2", dueDate: new Date("2022-12-31"), calYear: 0 },
    { period: "Q3", dueDate: new Date("2023-03-31"), calYear: 1 },
    { period: "Q4", dueDate: new Date("2023-06-30"), calYear: 1 },
  ];

  const oldTuitionInputs: TuitionInput[] = [];

  for (const studentNis of oldStudentNisList) {
    // 2021/2022
    const asgn2122 = oldStudentClassAssignment2122[studentNis];
    const startYear2122 = 2021;
    if (asgn2122.paymentFrequency === "MONTHLY") {
      for (const p of monthlyPeriods) {
        const dueCalYear = startYear2122 + p.calYear;
        oldTuitionInputs.push({
          classAcademicId: asgn2122.classId,
          studentNis,
          period: p.period,
          month: p.month,
          year: startYear2122,
          feeAmount: asgn2122.monthlyFee,
          dueDate: new Date(`${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`),
        });
      }
    } else {
      for (const p of quarterlyPeriods2122) {
        oldTuitionInputs.push({
          classAcademicId: asgn2122.classId,
          studentNis,
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
          studentNis,
          period: p.period,
          month: p.month,
          year: startYear2223,
          feeAmount: asgn2223.monthlyFee,
          dueDate: new Date(`${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`),
        });
      }
    } else {
      for (const p of quarterlyPeriods2223) {
        oldTuitionInputs.push({
          classAcademicId: asgn2223.classId,
          studentNis,
          period: p.period,
          month: null,
          year: startYear2223,
          feeAmount: asgn2223.monthlyFee * 3,
          dueDate: p.dueDate,
        });
      }
    }
  }

  console.log(`  Generated ${oldTuitionInputs.length} historical tuition records. Inserting in batches...`);

  for (let i = 0; i < oldTuitionInputs.length; i += BATCH_SIZE) {
    const batch = oldTuitionInputs.slice(i, i + BATCH_SIZE);
    await prisma.tuition.createMany({
      data: batch.map((t) => ({
        classAcademicId: t.classAcademicId,
        studentNis: t.studentNis,
        period: t.period,
        month: t.month as
          | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER"
          | "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE"
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
    console.log(`  Historical batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(oldTuitionInputs.length / BATCH_SIZE)}`);
  }

  // ============================================================
  // 4d. HISTORICAL PAYMENTS (~30% PAID, ~20% PARTIAL, ~50% UNPAID)
  // ============================================================
  console.log("Generating payments for historical tuitions...");

  const oldTuitions = await prisma.tuition.findMany({
    where: { studentNis: { in: oldStudentNisList } },
    select: {
      id: true,
      feeAmount: true,
      classAcademicId: true,
      studentNis: true,
      period: true,
      year: true,
    },
  });

  const oldPaymentInserts: PaymentInput[] = [];
  const oldTuitionUpdates: { id: string; paidAmount: number; status: "PAID" | "PARTIAL" | "UNPAID" }[] = [];

  for (const tuition of oldTuitions) {
    const roll = Math.random();
    const fee = Number(tuition.feeAmount);
    const cashier = randomItem(cashiers);

    if (roll < 0.30) {
      // PAID (~30%)
      const payDate = new Date(2021, randomInt(6, 11), randomInt(1, 28));
      oldPaymentInserts.push({
        tuitionId: tuition.id,
        employeeId: cashier.employeeId,
        amount: fee,
        paymentDate: payDate,
        notes: null,
      });
      oldTuitionUpdates.push({ id: tuition.id, paidAmount: fee, status: "PAID" });
    } else if (roll < 0.50) {
      // PARTIAL (~20%)
      const partialRatio = 0.3 + Math.random() * 0.5;
      const partialAmount = Math.floor(fee * partialRatio / 1000) * 1000;
      const payDate = new Date(2021, randomInt(6, 11), randomInt(1, 28));
      oldPaymentInserts.push({
        tuitionId: tuition.id,
        employeeId: cashier.employeeId,
        amount: partialAmount,
        paymentDate: payDate,
        notes: "Pembayaran sebagian",
      });
      oldTuitionUpdates.push({ id: tuition.id, paidAmount: partialAmount, status: "PARTIAL" });
    }
    // else: UNPAID (~50%) — no payment record
  }

  console.log(`  Inserting ${oldPaymentInserts.length} historical payment records...`);

  for (let i = 0; i < oldPaymentInserts.length; i += BATCH_SIZE) {
    const batch = oldPaymentInserts.slice(i, i + BATCH_SIZE);
    await prisma.payment.createMany({
      data: batch,
      skipDuplicates: false,
    });
    console.log(`  Historical payment batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(oldPaymentInserts.length / BATCH_SIZE)}`);
  }

  console.log(`  Updating ${oldTuitionUpdates.length} historical tuition statuses...`);

  for (let i = 0; i < oldTuitionUpdates.length; i += UPDATE_BATCH) {
    const batch = oldTuitionUpdates.slice(i, i + UPDATE_BATCH);
    await Promise.all(
      batch.map((u) =>
        prisma.tuition.update({
          where: { id: u.id },
          data: { paidAmount: u.paidAmount, status: u.status },
        })
      )
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
    const joinDate = new Date(`2024-07-${String(Math.min(joinDay, 28)).padStart(2, "0")}`);
    const parentPhone = generatePhone();
    const hashedPhone = await bcrypt.hash(parentPhone, 10);

    studentInputs.push({
      nis,
      nik: generateUniqueNik(),
      name: generateStudentName(i - 1),
      address: `Jl. Merdeka No. ${randomInt(1, 200)}, RT ${randomInt(1, 15)}/RW ${randomInt(1, 10)}, Jakarta`,
      parentName: generateParentName(),
      parentPhone,
      startJoinDate: joinDate,
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
    select: { nis: true },
  });

  console.log(`  Created ${students.length} students.`);

  // ============================================================
  // 5b. CURRENT STUDENT-CLASS ASSIGNMENTS
  // ============================================================
  console.log("Assigning students to classes (~20 per class)...");

  // For 2024/2025: distribute students evenly across 12 classes
  // For 2025/2026: same students, assigned to (grade+1) or same grade if already grade 6

  const studentNisList = students.map((s) => s.nis);
  const gradeList = [1, 2, 3, 4, 5, 6];
  const sectionList = ["A", "B"];

  // Build flat list of classes per year
  const classes2425: { id: string; grade: number; section: string; paymentFrequency: string; monthlyFee: number }[] = [];
  const classes2526: { id: string; grade: number; section: string; paymentFrequency: string; monthlyFee: number }[] = [];

  for (const grade of gradeList) {
    for (const section of sectionList) {
      classes2425.push({ ...classMap[ay2425.id][grade][section], grade, section });
      classes2526.push({ ...classMap[ay2526.id][grade][section], grade, section });
    }
  }

  // Assign each student to one class in 2024/2025 (round-robin)
  // studentClassMap: studentNis -> { grade, section } for 2024/2025
  const studentClassAssignment2425: Record<string, { grade: number; section: string; classId: string; paymentFrequency: string; monthlyFee: number }> = {};

  const studentClassData2425 = [];
  for (let i = 0; i < studentNisList.length; i++) {
    const cls = classes2425[i % classes2425.length];
    const studentNis = studentNisList[i];
    studentClassAssignment2425[studentNis] = {
      grade: cls.grade,
      section: cls.section,
      classId: cls.id,
      paymentFrequency: cls.paymentFrequency,
      monthlyFee: cls.monthlyFee,
    };
    studentClassData2425.push({
      studentNis,
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
  const studentClassAssignment2526: Record<string, { classId: string; paymentFrequency: string; monthlyFee: number }> = {};

  for (const studentNis of studentNisList) {
    const prev = studentClassAssignment2425[studentNis];
    const nextGrade = Math.min(prev.grade + 1, 6);
    const section = prev.section; // keep same section
    const cls = classMap[ay2526.id][nextGrade][section];
    studentClassAssignment2526[studentNis] = {
      classId: cls.id,
      paymentFrequency: cls.paymentFrequency,
      monthlyFee: cls.monthlyFee,
    };
    studentClassData2526.push({
      studentNis,
      classAcademicId: cls.id,
      enrolledAt: new Date("2025-07-15"),
    });
  }

  await prisma.studentClass.createMany({
    data: studentClassData2526,
    skipDuplicates: true,
  });

  console.log(`  Assigned ${studentNisList.length * 2} student-class records (2 years each).`);

  // ============================================================
  // 6. TUITIONS
  // ============================================================
  console.log("Generating tuitions for all student-class assignments...");

  const quarterlyPeriods: { period: string; dueDate: Date; calYear: number }[] = [
    { period: "Q1", dueDate: new Date("2024-09-30"), calYear: 0 },
    { period: "Q2", dueDate: new Date("2024-12-31"), calYear: 0 },
    { period: "Q3", dueDate: new Date("2025-03-31"), calYear: 1 },
    { period: "Q4", dueDate: new Date("2025-06-30"), calYear: 1 },
  ];

  const quarterlyPeriods2526: { period: string; dueDate: Date; calYear: number }[] = [
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
    // 2024/2025
    const asgn2425 = studentClassAssignment2425[studentNis];
    const startYear2425 = ayStartYears[ay2425.id];
    if (asgn2425.paymentFrequency === "MONTHLY") {
      for (const p of monthlyPeriods) {
        const dueCalYear = startYear2425 + p.calYear;
        tuitionInputs.push({
          classAcademicId: asgn2425.classId,
          studentNis,
          period: p.period,
          month: p.month,
          year: startYear2425,
          feeAmount: asgn2425.monthlyFee,
          dueDate: new Date(`${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`),
        });
      }
    } else {
      for (const p of quarterlyPeriods) {
        tuitionInputs.push({
          classAcademicId: asgn2425.classId,
          studentNis,
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
          studentNis,
          period: p.period,
          month: p.month,
          year: startYear2526,
          feeAmount: asgn2526.monthlyFee,
          dueDate: new Date(`${dueCalYear}-${String(p.monthNum).padStart(2, "0")}-10`),
        });
      }
    } else {
      for (const p of quarterlyPeriods2526) {
        tuitionInputs.push({
          classAcademicId: asgn2526.classId,
          studentNis,
          period: p.period,
          month: null,
          year: startYear2526,
          feeAmount: asgn2526.monthlyFee * 3,
          dueDate: p.dueDate,
        });
      }
    }
  }

  console.log(`  Generated ${tuitionInputs.length} tuition records. Inserting in batches...`);

  // Insert tuitions in batches of 500
  for (let i = 0; i < tuitionInputs.length; i += BATCH_SIZE) {
    const batch = tuitionInputs.slice(i, i + BATCH_SIZE);
    await prisma.tuition.createMany({
      data: batch.map((t) => ({
        classAcademicId: t.classAcademicId,
        studentNis: t.studentNis,
        period: t.period,
        month: t.month as
          | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER"
          | "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE"
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
    console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tuitionInputs.length / BATCH_SIZE)}`);
  }

  // ============================================================
  // 7. PAYMENTS (~40% PAID, ~10% PARTIAL, rest UNPAID)
  // ============================================================
  console.log("Fetching all inserted tuitions to create payments...");

  const allTuitions = await prisma.tuition.findMany({
    where: { studentNis: { in: studentNisList } },
    select: {
      id: true,
      feeAmount: true,
      classAcademicId: true,
      studentNis: true,
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

    if (roll < 0.40) {
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
    } else if (roll < 0.50) {
      // PARTIAL — pay between 30% and 80%
      const partialRatio = 0.3 + Math.random() * 0.5;
      const partialAmount = Math.floor(fee * partialRatio / 1000) * 1000; // round to nearest 1000
      const payDate = new Date(2024, randomInt(6, 11), randomInt(1, 28));
      paymentInserts.push({
        tuitionId: tuition.id,
        employeeId: cashier.employeeId,
        amount: partialAmount,
        paymentDate: payDate,
        notes: "Pembayaran sebagian",
      });
      tuitionUpdates.push({ id: tuition.id, paidAmount: partialAmount, status: "PARTIAL" });
    }
    // else: UNPAID — no payment record, no update needed
  }

  console.log(`  Inserting ${paymentInserts.length} payment records in batches...`);

  for (let i = 0; i < paymentInserts.length; i += BATCH_SIZE) {
    const batch = paymentInserts.slice(i, i + BATCH_SIZE);
    await prisma.payment.createMany({
      data: batch,
      skipDuplicates: false, // payments don't have a unique constraint to skip
    });
    console.log(`  Payment batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(paymentInserts.length / BATCH_SIZE)}`);
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
        })
      )
    );
  }

  console.log("  Payments done.");

  // ============================================================
  // 8. SCHOLARSHIPS (15 students)
  // ============================================================
  console.log("Creating scholarships for 15 students...");

  const scholarshipStudents = studentNisList.slice(0, 15);
  const scholarshipData = [];

  for (let i = 0; i < scholarshipStudents.length; i++) {
    const studentNis = scholarshipStudents[i];
    const asgn = studentClassAssignment2425[studentNis];
    const isFullScholarship = i < 5; // first 5 get full scholarships
    const nominal = isFullScholarship ? asgn.monthlyFee : Math.floor(asgn.monthlyFee * 0.5);

    scholarshipData.push({
      studentNis,
      classAcademicId: asgn.classId,
      name: isFullScholarship ? "Beasiswa Penuh" : "Beasiswa Sebagian",
      nominal,
      isFullScholarship,
    });
  }

  await prisma.scholarship.createMany({
    data: scholarshipData,
    skipDuplicates: true,
  });

  console.log(`  Created ${scholarshipData.length} scholarships.`);

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
        targetPeriods: ["JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
          "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE"],
        academicYearId: ay2425.id,
        classAcademicId: null,
        isActive: true,
      },
    });
  }

  console.log("  Created discounts.");

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
  const partialCount = tuitionUpdates.filter((t) => t.status === "PARTIAL").length;
  const unpaidCount = totalCurrentTuitions - paidCount - partialCount;

  const oldPaidCount = oldTuitionUpdates.filter((t) => t.status === "PAID").length;
  const oldPartialCount = oldTuitionUpdates.filter((t) => t.status === "PARTIAL").length;
  const oldUnpaidCount = totalOldTuitions - oldPaidCount - oldPartialCount;

  console.log("\n=== Stress Test Seed Complete ===");
  console.log(`  Employees:        8 (3 admins, 5 cashiers)`);
  console.log(`  Academic years:   4 (2021/2022, 2022/2023, 2024/2025, 2025/2026)`);
  console.log(`  Class academics:  48 (grades 1-6, sections A-B, 4 years)`);
  console.log(`  Students:         ${totalStudents} total (all with portal accounts, password = parentPhone)`);
  console.log(`    Current:        ${totalCurrentStudents} (NIS 2024xxx)`);
  console.log(`    Historical:     ${totalOldStudents} (NIS 2021xxx)`);
  console.log(`  Student-class:    ${totalCurrentStudents * 2 + totalOldStudents * 2} assignments`);
  console.log(`  Tuitions:         ${totalTuitions} total`);
  console.log(`  Current tuitions: ${totalCurrentTuitions}`);
  console.log(`    PAID:           ${paidCount} (~${Math.round((paidCount / totalCurrentTuitions) * 100)}%)`);
  console.log(`    PARTIAL:        ${partialCount} (~${Math.round((partialCount / totalCurrentTuitions) * 100)}%)`);
  console.log(`    UNPAID:         ${unpaidCount} (~${Math.round((unpaidCount / totalCurrentTuitions) * 100)}%)`);
  console.log(`  Historical tuitions: ${totalOldTuitions}`);
  console.log(`    PAID:           ${oldPaidCount} (~${Math.round((oldPaidCount / totalOldTuitions) * 100)}%)`);
  console.log(`    PARTIAL:        ${oldPartialCount} (~${Math.round((oldPartialCount / totalOldTuitions) * 100)}%)`);
  console.log(`    UNPAID:         ${oldUnpaidCount} (~${Math.round((oldUnpaidCount / totalOldTuitions) * 100)}%)`);
  console.log(`  Payments:         ${paymentInserts.length + oldPaymentInserts.length} (${paymentInserts.length} current + ${oldPaymentInserts.length} historical)`);
  console.log(`  Scholarships:     ${scholarshipData.length}`);
  console.log(`  Discounts:        2`);
}

main()
  .catch((e) => {
    console.error("Stress seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
