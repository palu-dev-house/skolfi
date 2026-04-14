import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ============================================
// ACCOUNT CREATION (Admin Only)
// ============================================

interface CreateStudentAccountInput {
  studentNis: string;
  createdBy: string;
}

interface CreateStudentAccountResult {
  success: boolean;
  message: string;
  studentNis: string;
  defaultPassword: string;
}

export async function createStudentAccount(
  input: CreateStudentAccountInput,
): Promise<CreateStudentAccountResult> {
  const { studentNis, createdBy } = input;

  const student = await prisma.student.findUnique({
    where: { nis: studentNis },
  });

  if (!student) {
    throw new Error("Siswa tidak ditemukan");
  }

  if (student.hasAccount) {
    if (student.accountDeleted) {
      throw new Error(
        "Akun telah dihapus. Gunakan fitur restore untuk mengaktifkan kembali.",
      );
    }
    throw new Error("Akun untuk siswa ini sudah ada");
  }

  // Normalize phone number (remove non-digits)
  const normalizedPassword = student.parentPhone.replace(/\D/g, "");
  const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

  await prisma.student.update({
    where: { nis: studentNis },
    data: {
      hasAccount: true,
      password: hashedPassword,
      mustChangePassword: true,
      accountCreatedAt: new Date(),
      accountCreatedBy: createdBy,
    },
  });

  return {
    success: true,
    message: "Akun berhasil dibuat. Password default: nomor HP orang tua.",
    studentNis,
    defaultPassword: normalizedPassword,
  };
}

// ============================================
// LOGIN
// ============================================

interface LoginInput {
  nis: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  student?: {
    nis: string;
    name: string;
    mustChangePassword: boolean;
  };
  error?: string;
}

export async function loginStudent(input: LoginInput): Promise<LoginResult> {
  const { nis, password } = input;

  const student = await prisma.student.findUnique({
    where: { nis },
  });

  if (!student || !student.hasAccount || student.accountDeleted) {
    return { success: false, error: "NIS atau password salah" };
  }

  if (!student.password) {
    return { success: false, error: "Akun belum dikonfigurasi dengan benar" };
  }

  const isValidPassword = await bcrypt.compare(password, student.password);
  if (!isValidPassword) {
    return { success: false, error: "NIS atau password salah" };
  }

  await prisma.student.update({
    where: { nis },
    data: { lastLoginAt: new Date() },
  });

  return {
    success: true,
    student: {
      nis: student.nis,
      name: student.name,
      mustChangePassword: student.mustChangePassword,
    },
  };
}

// ============================================
// CHANGE PASSWORD (Self-Service)
// ============================================

interface ChangePasswordInput {
  studentNis: string;
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<boolean> {
  const { studentNis, currentPassword, newPassword } = input;

  const student = await prisma.student.findUnique({
    where: { nis: studentNis },
  });

  if (!student || !student.hasAccount || student.accountDeleted) {
    throw new Error("Akun tidak ditemukan");
  }

  if (!student.password) {
    throw new Error("Akun belum dikonfigurasi dengan benar");
  }

  const isValid = await bcrypt.compare(currentPassword, student.password);
  if (!isValid) {
    throw new Error("Password lama salah");
  }

  if (newPassword.length < 8) {
    throw new Error("Password baru minimal 8 karakter");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.student.update({
    where: { nis: studentNis },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
    },
  });

  return true;
}

// ============================================
// RESET PASSWORD (Admin Only)
// ============================================

interface ResetPasswordInput {
  studentNis: string;
  resetBy: string;
}

interface ResetPasswordResult {
  success: boolean;
  message: string;
  newPassword: string;
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ResetPasswordResult> {
  const { studentNis } = input;

  const student = await prisma.student.findUnique({
    where: { nis: studentNis },
  });

  if (!student || !student.hasAccount) {
    throw new Error("Akun tidak ditemukan");
  }

  const normalizedPassword = student.parentPhone.replace(/\D/g, "");
  const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

  await prisma.student.update({
    where: { nis: studentNis },
    data: {
      password: hashedPassword,
      mustChangePassword: true,
    },
  });

  return {
    success: true,
    message: "Password berhasil direset ke nomor HP orang tua.",
    newPassword: normalizedPassword,
  };
}

// ============================================
// SOFT DELETE (Admin)
// ============================================

export async function softDeleteAccount(
  studentNis: string,
  deletedBy: string,
  reason?: string,
) {
  return prisma.student.update({
    where: { nis: studentNis },
    data: {
      accountDeleted: true,
      accountDeletedAt: new Date(),
      accountDeletedBy: deletedBy,
      accountDeletedReason: reason || "Manual deletion by admin",
    },
  });
}

// ============================================
// RESTORE ACCOUNT (Admin)
// ============================================

export async function restoreAccount(studentNis: string) {
  const student = await prisma.student.findUnique({
    where: { nis: studentNis },
  });

  if (!student) {
    throw new Error("Siswa tidak ditemukan");
  }

  if (!student.hasAccount) {
    throw new Error("Siswa tidak memiliki akun");
  }

  if (!student.accountDeleted) {
    throw new Error("Akun tidak dalam status terhapus");
  }

  return prisma.student.update({
    where: { nis: studentNis },
    data: {
      accountDeleted: false,
      accountDeletedAt: null,
      accountDeletedBy: null,
      accountDeletedReason: null,
    },
  });
}

// ============================================
// GET STUDENT PROFILE
// ============================================

export async function getStudentProfile(studentNis: string) {
  const student = await prisma.student.findFirst({
    where: {
      nis: studentNis,
      hasAccount: true,
      accountDeleted: false,
    },
    select: {
      nis: true,
      name: true,
      address: true,
      parentName: true,
      parentPhone: true,
      mustChangePassword: true,
      lastLoginAt: true,
      exitedAt: true,
      exitReason: true,
    },
  });

  if (!student) {
    throw new Error("Akun tidak ditemukan");
  }

  return student;
}

// ============================================
// LIST STUDENTS WITH ACCOUNTS (Admin)
// ============================================

interface ListStudentsWithAccountsOptions {
  page: number;
  limit: number;
  includeDeleted?: boolean;
  search?: string;
}

export async function listStudentsWithAccounts(
  options: ListStudentsWithAccountsOptions,
) {
  const { page, limit, includeDeleted = false, search } = options;

  const where = {
    hasAccount: true,
    ...(includeDeleted ? {} : { accountDeleted: false }),
    ...(search
      ? {
          OR: [
            { nis: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { parentName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { accountCreatedAt: "desc" },
      select: {
        nis: true,
        name: true,
        parentName: true,
        parentPhone: true,
        hasAccount: true,
        mustChangePassword: true,
        lastLoginAt: true,
        lastPaymentAt: true,
        accountCreatedAt: true,
        accountDeleted: true,
        accountDeletedAt: true,
        accountDeletedReason: true,
      },
    }),
    prisma.student.count({ where }),
  ]);

  return {
    students,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
