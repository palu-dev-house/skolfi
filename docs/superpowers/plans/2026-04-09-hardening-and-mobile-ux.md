# Hardening & Mobile UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full bilingual i18n coverage (ID/EN), shared Zod validation, infrastructure hardening (circuit breaker, request dedup, expanded idempotency), WhatsApp removal, mobile-native student portal UX (bottom nav, vaul bottom sheet), and URL-based UI state persistence.

**Architecture:** Server-side i18n helper reads `NEXT_LOCALE` cookie for backend translations. Zod schemas are shared between frontend (Mantine resolver) and backend (parseWithLocale). Circuit breaker wraps Prisma calls. Student portal gets bottom nav on mobile, keeps sidebar on desktop.

**Tech Stack:** Next.js 16, React 19, Mantine 8, next-intl 4, Zod 4, vaul, Prisma 7, PostgreSQL (Supabase)

---

## File Structure

### New Files
- `src/lib/i18n-server.ts` — Server-side translation helper (reads NEXT_LOCALE cookie)
- `src/lib/validations/schemas/auth.schema.ts` — Login, change-password Zod schemas
- `src/lib/validations/schemas/student.schema.ts` — Student CRUD schemas
- `src/lib/validations/schemas/employee.schema.ts` — Employee CRUD schemas
- `src/lib/validations/schemas/academic-year.schema.ts` — Academic year schemas
- `src/lib/validations/schemas/class.schema.ts` — Class academic schemas
- `src/lib/validations/schemas/payment.schema.ts` — Payment schemas
- `src/lib/validations/schemas/tuition.schema.ts` — Tuition generation schemas
- `src/lib/validations/schemas/scholarship.schema.ts` — Scholarship schemas
- `src/lib/validations/schemas/discount.schema.ts` — Discount schemas
- `src/lib/validations/schemas/bank-account.schema.ts` — Bank account schemas
- `src/lib/validations/schemas/student-class.schema.ts` — Student-class assignment schemas
- `src/lib/validations/index.ts` — Re-exports all schemas
- `src/lib/validations/parse-with-locale.ts` — Backend: parse Zod + translate errors via NEXT_LOCALE
- `src/lib/validations/mantine-zod-resolver.ts` — Frontend: Mantine form resolver wrapping Zod
- `src/lib/middleware/circuit-breaker.ts` — In-memory circuit breaker for DB calls
- `src/lib/middleware/request-dedup.ts` — In-memory GET request deduplication
- `src/components/portal/BottomNav.tsx` — Mobile bottom navigation component
- `src/components/portal/BottomSheet.tsx` — vaul-based bottom sheet wrapper
- `src/hooks/useQueryParams.ts` — Hook for syncing UI state to URL query params

### Modified Files
- `src/messages/en.json` — Add `api.*` namespace, expand `validation.*`, add missing keys
- `src/messages/id.json` — Same additions as en.json
- `src/components/ui/LanguageSwitcher.tsx` — Fix cookieStore bug
- `src/lib/api-response.ts` — No changes (keep as-is, translation happens in route handlers)
- `src/lib/middleware/rate-limit.ts` — Translate rate limit error message via NEXT_LOCALE
- `src/app/(student-portal)/layout.tsx` — Replace sidebar with bottom nav on mobile
- All API route files under `src/app/api/v1/` — Use `getServerT()` + Zod validation
- All form components under `src/components/forms/` — Use Zod resolver
- `src/components/tables/OverdueReportTable.tsx` — Translate all hardcoded strings
- `src/hooks/api/useStudentClasses.ts` — Translate all hardcoded notification messages
- All list/table pages — Add URL query param state persistence

### Deleted Files
- `src/lib/services/notification-service.ts` — WhatsApp notification service
- `src/lib/services/whatsapp-link.ts` — WhatsApp link generator
- `src/lib/cron/payment-reminder-cron.ts` — WhatsApp reminder cron
- `src/hooks/api/useNotifications.ts` — Notification hooks
- `src/app/api/v1/admin/notifications/route.ts` — Notification API route
- `docs/15-WHATSAPP-NOTIFICATION.md` — WhatsApp docs

---

## Task 1: Server-Side i18n Helper

**Files:**
- Create: `src/lib/i18n-server.ts`
- Modify: `src/messages/en.json`
- Modify: `src/messages/id.json`

- [ ] **Step 1: Create server-side translation helper**

```typescript
// src/lib/i18n-server.ts
import type { NextRequest } from "next/server";

type Messages = Record<string, string | Record<string, string | Record<string, string>>>;

let messagesCache: Record<string, Messages> = {};

async function loadMessages(locale: string): Promise<Messages> {
  if (messagesCache[locale]) return messagesCache[locale];
  const messages = (await import(`@/messages/${locale}.json`)).default;
  messagesCache[locale] = messages;
  return messages;
}

function getNestedValue(obj: Messages, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

export type ServerT = (key: string, params?: Record<string, string | number>) => string;

export async function getServerT(request: NextRequest): Promise<ServerT> {
  const locale = request.cookies.get("NEXT_LOCALE")?.value;
  const validLocale = locale === "en" ? "en" : "id";
  const messages = await loadMessages(validLocale);

  return (key: string, params?: Record<string, string | number>) => {
    const value = getNestedValue(messages, key);
    return params ? interpolate(value, params) : value;
  };
}
```

- [ ] **Step 2: Add `api` namespace to en.json**

Add these keys to `src/messages/en.json` under a new `"api"` top-level key:

```json
"api": {
  "internalError": "Internal server error",
  "unauthorized": "Unauthorized",
  "forbidden": "You do not have permission to access this resource",
  "notFound": "{resource} not found",
  "alreadyExists": "{resource} already exists",
  "cannotDelete": "Cannot delete {resource} with existing {dependency}. Delete {dependency} first.",
  "deleteSuccess": "{resource} deleted successfully",
  "requiredFields": "All required fields must be filled",
  "invalidFormat": "Invalid format for {field}",
  "mustBePositive": "{field} must be greater than 0",
  "loginSuccess": "Login successful",
  "logoutSuccess": "Logged out successfully",
  "invalidCredentials": "Invalid email or password",
  "emailPasswordRequired": "Email and password are required",
  "nisPasswordRequired": "NIS and password are required",
  "passwordChanged": "Password changed successfully",
  "passwordChangeFailed": "Failed to change password",
  "currentPasswordRequired": "Current password and new password are required",
  "currentPasswordIncorrect": "Current password is incorrect",
  "passwordMinLength": "New password must be at least 6 characters",
  "passwordResetSuccess": "Password reset to default (123456)",
  "yearFormatInvalid": "Year must be in format YYYY/YYYY (e.g., 2024/2025)",
  "gradeRange": "Grade must be between 1 and 12",
  "paymentFrequencyInvalid": "Payment frequency must be MONTHLY, QUARTERLY, or SEMESTER",
  "classAlreadyExists": "Class already exists for this academic year, grade, and section",
  "allStudentsAssigned": "All students are already assigned to this class",
  "tuitionFullyPaid": "Tuition is already fully paid",
  "cannotDeleteSelf": "Cannot delete your own account",
  "fileRequired": "File is required",
  "missingRequiredFields": "Missing required fields",
  "discountInactive": "Cannot apply inactive discount",
  "noStudentsForTuition": "No students found to generate tuitions for",
  "rateLimitExceeded": "Too many requests. Try again in {seconds} seconds.",
  "duplicateRequest": "Duplicate request detected",
  "paymentReversed": "Payment reversed successfully",
  "importCompleted": "{imported} imported, {skipped} skipped",
  "importFailed": "Failed to import {resource}",
  "noValidData": "No valid data found in file",
  "excelEmpty": "Excel file is empty",
  "invalidAction": "Invalid action",
  "studentsAssigned": "{count} student(s) assigned to class",
  "studentsAssignedPartial": "{assigned} assigned, {skipped} already in class",
  "studentsRemoved": "Student(s) removed from class",
  "removeStudentsFailed": "Failed to remove students",
  "importCompletedWithErrors": "Import completed: {imported} imported, {skipped} skipped, {errors} errors",
  "importSuccessful": "{imported} student-class assignments imported, {skipped} skipped",
  "periodRequired": "At least one target period is required",
  "academicYearRequired": "Academic year is required",
  "classNotInYear": "Class does not belong to the selected academic year"
}
```

- [ ] **Step 3: Add `api` namespace to id.json**

Add the same structure to `src/messages/id.json`:

```json
"api": {
  "internalError": "Terjadi kesalahan server",
  "unauthorized": "Tidak diizinkan",
  "forbidden": "Anda tidak memiliki akses ke sumber daya ini",
  "notFound": "{resource} tidak ditemukan",
  "alreadyExists": "{resource} sudah ada",
  "cannotDelete": "Tidak dapat menghapus {resource} yang memiliki {dependency}. Hapus {dependency} terlebih dahulu.",
  "deleteSuccess": "{resource} berhasil dihapus",
  "requiredFields": "Semua field wajib harus diisi",
  "invalidFormat": "Format {field} tidak valid",
  "mustBePositive": "{field} harus lebih dari 0",
  "loginSuccess": "Login berhasil",
  "logoutSuccess": "Berhasil keluar",
  "invalidCredentials": "Email atau password salah",
  "emailPasswordRequired": "Email dan password harus diisi",
  "nisPasswordRequired": "NIS dan password harus diisi",
  "passwordChanged": "Password berhasil diubah",
  "passwordChangeFailed": "Gagal mengubah password",
  "currentPasswordRequired": "Password lama dan baru harus diisi",
  "currentPasswordIncorrect": "Password lama salah",
  "passwordMinLength": "Password baru minimal 6 karakter",
  "passwordResetSuccess": "Password direset ke default (123456)",
  "yearFormatInvalid": "Tahun harus dalam format TTTT/TTTT (contoh: 2024/2025)",
  "gradeRange": "Kelas harus antara 1 dan 12",
  "paymentFrequencyInvalid": "Frekuensi pembayaran harus MONTHLY, QUARTERLY, atau SEMESTER",
  "classAlreadyExists": "Kelas sudah ada untuk tahun ajaran, tingkat, dan rombel ini",
  "allStudentsAssigned": "Semua siswa sudah terdaftar di kelas ini",
  "tuitionFullyPaid": "Tagihan sudah lunas",
  "cannotDeleteSelf": "Tidak dapat menghapus akun Anda sendiri",
  "fileRequired": "File harus diunggah",
  "missingRequiredFields": "Field wajib tidak lengkap",
  "discountInactive": "Tidak dapat menerapkan diskon yang tidak aktif",
  "noStudentsForTuition": "Tidak ada siswa untuk membuat tagihan",
  "rateLimitExceeded": "Terlalu banyak permintaan. Coba lagi dalam {seconds} detik.",
  "duplicateRequest": "Permintaan duplikat terdeteksi",
  "paymentReversed": "Pembayaran berhasil dibatalkan",
  "importCompleted": "{imported} diimpor, {skipped} dilewati",
  "importFailed": "Gagal mengimpor {resource}",
  "noValidData": "Tidak ada data valid dalam file",
  "excelEmpty": "File Excel kosong",
  "invalidAction": "Aksi tidak valid",
  "studentsAssigned": "{count} siswa ditambahkan ke kelas",
  "studentsAssignedPartial": "{assigned} ditambahkan, {skipped} sudah di kelas",
  "studentsRemoved": "Siswa dihapus dari kelas",
  "removeStudentsFailed": "Gagal menghapus siswa",
  "importCompletedWithErrors": "Impor selesai: {imported} diimpor, {skipped} dilewati, {errors} error",
  "importSuccessful": "{imported} penempatan siswa diimpor, {skipped} dilewati",
  "periodRequired": "Minimal satu periode target harus dipilih",
  "academicYearRequired": "Tahun ajaran harus dipilih",
  "classNotInYear": "Kelas tidak termasuk dalam tahun ajaran yang dipilih"
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n-server.ts src/messages/en.json src/messages/id.json
git commit -m "feat: add server-side i18n helper with api namespace translations"
```

---

## Task 2: Fix LanguageSwitcher & Translate Rate Limit Middleware

**Files:**
- Modify: `src/components/ui/LanguageSwitcher.tsx`
- Modify: `src/lib/middleware/rate-limit.ts`

- [ ] **Step 1: Fix LanguageSwitcher cookieStore bug**

Replace the `toggleLocale` function in `src/components/ui/LanguageSwitcher.tsx`:

```typescript
const toggleLocale = () => {
  const newLocale: Locale = locale === "id" ? "en" : "id";
  document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  startTransition(() => {
    router.refresh();
  });
};
```

This replaces the broken `cookieStore.set()` call with standard `document.cookie` (available in client components).

- [ ] **Step 2: Translate rate limit error message**

In `src/lib/middleware/rate-limit.ts`, update `rateLimitErrorResponse` to accept a translated message:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RATE_LIMITS } from "@/lib/config/rate-limit-config";
import {
  checkRateLimit,
  type RateLimitResult,
} from "@/lib/services/rate-limit-service";
import { getServerT } from "@/lib/i18n-server";

/**
 * Rate limit error response with i18n
 */
export async function rateLimitErrorResponse(result: RateLimitResult, request: NextRequest) {
  const t = await getServerT(request);
  const retryAfter = Math.ceil((result.reset.getTime() - Date.now()) / 1000);

  return NextResponse.json(
    {
      success: false,
      error: {
        message: t("api.rateLimitExceeded", { seconds: retryAfter }),
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter,
      },
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toISOString(),
        "Retry-After": retryAfter.toString(),
      },
    },
  );
}
```

Update all callers of `rateLimitErrorResponse` to pass `request` as second argument.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/LanguageSwitcher.tsx src/lib/middleware/rate-limit.ts
git commit -m "fix: fix LanguageSwitcher cookie bug, translate rate limit errors"
```

---

## Task 3: Shared Zod Validation Schemas

**Files:**
- Create: `src/lib/validations/schemas/auth.schema.ts`
- Create: `src/lib/validations/schemas/student.schema.ts`
- Create: `src/lib/validations/schemas/employee.schema.ts`
- Create: `src/lib/validations/schemas/academic-year.schema.ts`
- Create: `src/lib/validations/schemas/class.schema.ts`
- Create: `src/lib/validations/schemas/payment.schema.ts`
- Create: `src/lib/validations/schemas/tuition.schema.ts`
- Create: `src/lib/validations/schemas/scholarship.schema.ts`
- Create: `src/lib/validations/schemas/discount.schema.ts`
- Create: `src/lib/validations/schemas/bank-account.schema.ts`
- Create: `src/lib/validations/schemas/student-class.schema.ts`
- Create: `src/lib/validations/index.ts`

- [ ] **Step 1: Create auth schemas**

```typescript
// src/lib/validations/schemas/auth.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

export const studentLoginSchema = z.object({
  nis: z.string().min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

- [ ] **Step 2: Create student schema**

```typescript
// src/lib/validations/schemas/student.schema.ts
import { z } from "zod";

export const studentSchema = z.object({
  nis: z.string().min(1),
  nik: z.string().length(16),
  name: z.string().min(1),
  address: z.string().min(1),
  parentName: z.string().min(1),
  parentPhone: z.string().min(10),
  startJoinDate: z.coerce.date(),
});

export const studentUpdateSchema = studentSchema.partial().omit({ nis: true });

export type StudentInput = z.infer<typeof studentSchema>;
```

- [ ] **Step 3: Create employee schema**

```typescript
// src/lib/validations/schemas/employee.schema.ts
import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1).email(),
  role: z.enum(["ADMIN", "CASHIER"]),
});

export const employeeUpdateSchema = employeeSchema.partial();

export type EmployeeInput = z.infer<typeof employeeSchema>;
```

- [ ] **Step 4: Create academic-year schema**

```typescript
// src/lib/validations/schemas/academic-year.schema.ts
import { z } from "zod";

export const academicYearSchema = z.object({
  year: z.string().regex(/^\d{4}\/\d{4}$/).refine((val) => {
    const [start, end] = val.split("/").map(Number);
    return end === start + 1;
  }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().optional().default(false),
});

export type AcademicYearInput = z.infer<typeof academicYearSchema>;
```

- [ ] **Step 5: Create class schema**

```typescript
// src/lib/validations/schemas/class.schema.ts
import { z } from "zod";

export const classAcademicSchema = z.object({
  academicYearId: z.string().min(1),
  grade: z.coerce.number().int().min(1).max(12),
  section: z.string().min(1),
  paymentFrequency: z.enum(["MONTHLY", "QUARTERLY", "SEMESTER"]).optional().default("MONTHLY"),
});

export const classAcademicUpdateSchema = classAcademicSchema.partial();

export type ClassAcademicInput = z.infer<typeof classAcademicSchema>;
```

- [ ] **Step 6: Create payment schema**

```typescript
// src/lib/validations/schemas/payment.schema.ts
import { z } from "zod";

export const paymentSchema = z.object({
  tuitionId: z.string().min(1),
  amount: z.coerce.number().positive(),
  notes: z.string().optional(),
});

export const paymentRequestSchema = z.object({
  tuitionIds: z.array(z.string().min(1)).min(1),
  bankAccountId: z.string().min(1),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
export type PaymentRequestInput = z.infer<typeof paymentRequestSchema>;
```

- [ ] **Step 7: Create tuition schema**

```typescript
// src/lib/validations/schemas/tuition.schema.ts
import { z } from "zod";

export const tuitionGenerateSchema = z.object({
  classAcademicId: z.string().min(1),
  monthlyFee: z.coerce.number().positive(),
  quarterlyFee: z.coerce.number().positive().optional(),
  semesterFee: z.coerce.number().positive().optional(),
});

export const tuitionUpdateSchema = z.object({
  feeAmount: z.coerce.number().positive().optional(),
  dueDate: z.coerce.date().optional(),
});

export type TuitionGenerateInput = z.infer<typeof tuitionGenerateSchema>;
```

- [ ] **Step 8: Create scholarship schema**

```typescript
// src/lib/validations/schemas/scholarship.schema.ts
import { z } from "zod";

export const scholarshipSchema = z.object({
  studentNis: z.string().min(1),
  classAcademicId: z.string().min(1),
  nominal: z.coerce.number().positive(),
  scholarshipName: z.string().min(1),
  scholarshipType: z.enum(["Academic", "Sports", "Arts", "NeedBased", "Merit", "Other"]).optional().default("Academic"),
  isFullScholarship: z.boolean().optional().default(false),
});

export type ScholarshipInput = z.infer<typeof scholarshipSchema>;
```

- [ ] **Step 9: Create discount schema**

```typescript
// src/lib/validations/schemas/discount.schema.ts
import { z } from "zod";

export const discountSchema = z.object({
  name: z.string().min(1),
  discountAmount: z.coerce.number().positive(),
  reason: z.string().optional(),
  academicYearId: z.string().min(1),
  classAcademicId: z.string().optional(),
  targetPeriods: z.array(z.string()).min(1),
  isActive: z.boolean().optional().default(true),
});

export const discountUpdateSchema = discountSchema.partial();

export const discountApplySchema = z.object({
  discountId: z.string().min(1),
});

export type DiscountInput = z.infer<typeof discountSchema>;
```

- [ ] **Step 10: Create bank-account schema**

```typescript
// src/lib/validations/schemas/bank-account.schema.ts
import { z } from "zod";

export const bankAccountSchema = z.object({
  bankCode: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  accountName: z.string().min(1),
  isActive: z.boolean().optional().default(true),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
```

- [ ] **Step 11: Create student-class schema**

```typescript
// src/lib/validations/schemas/student-class.schema.ts
import { z } from "zod";

export const studentClassAssignSchema = z.object({
  classAcademicId: z.string().min(1),
  studentNisList: z.array(z.string().min(1)).min(1),
});

export const studentClassRemoveSchema = z.object({
  classAcademicId: z.string().min(1),
  studentNisList: z.array(z.string().min(1)).min(1),
});

export type StudentClassAssignInput = z.infer<typeof studentClassAssignSchema>;
```

- [ ] **Step 12: Create index re-exports**

```typescript
// src/lib/validations/index.ts
export * from "./schemas/auth.schema";
export * from "./schemas/student.schema";
export * from "./schemas/employee.schema";
export * from "./schemas/academic-year.schema";
export * from "./schemas/class.schema";
export * from "./schemas/payment.schema";
export * from "./schemas/tuition.schema";
export * from "./schemas/scholarship.schema";
export * from "./schemas/discount.schema";
export * from "./schemas/bank-account.schema";
export * from "./schemas/student-class.schema";
```

- [ ] **Step 13: Commit**

```bash
git add src/lib/validations/
git commit -m "feat: add shared Zod validation schemas for all entities"
```

---

## Task 4: Backend Zod Parsing Helper + Frontend Mantine Resolver

**Files:**
- Create: `src/lib/validations/parse-with-locale.ts`
- Create: `src/lib/validations/mantine-zod-resolver.ts`
- Modify: `src/messages/en.json` (expand validation namespace)
- Modify: `src/messages/id.json` (expand validation namespace)

- [ ] **Step 1: Create backend parseWithLocale helper**

```typescript
// src/lib/validations/parse-with-locale.ts
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { getServerT } from "@/lib/i18n-server";
import { errorResponse } from "@/lib/api-response";

interface ParseResult<T> {
  success: true;
  data: T;
} | {
  success: false;
  response: Response;
}

export async function parseWithLocale<T extends z.ZodType>(
  schema: T,
  data: unknown,
  request: NextRequest,
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: Response }> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const t = await getServerT(request);

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".");
    if (!fieldErrors[field]) {
      fieldErrors[field] = mapZodErrorToTranslation(issue, t, field);
    }
  }

  return {
    success: false,
    response: errorResponse(
      t("api.requiredFields"),
      "VALIDATION_ERROR",
      400,
      fieldErrors,
    ),
  };
}

function mapZodErrorToTranslation(
  issue: z.ZodIssue,
  t: (key: string, params?: Record<string, string | number>) => string,
  field: string,
): string {
  switch (issue.code) {
    case "too_small":
      if (issue.type === "string" && issue.minimum === 1) {
        return t("validation.required");
      }
      if (issue.type === "string") {
        return t("validation.minLength", { min: issue.minimum as number });
      }
      if (issue.type === "number") {
        return t("validation.min", { min: issue.minimum as number });
      }
      if (issue.type === "array") {
        return t("validation.required");
      }
      return t("validation.required");
    case "too_big":
      if (issue.type === "string") {
        return t("validation.maxLength", { max: issue.maximum as number });
      }
      if (issue.type === "number") {
        return t("validation.max", { max: issue.maximum as number });
      }
      return t("validation.max", { max: issue.maximum as number });
    case "invalid_string":
      if (issue.validation === "email") {
        return t("validation.email");
      }
      return t("validation.invalidFormat", { field });
    case "invalid_type":
      if (issue.expected === "number") {
        return t("validation.number");
      }
      if (issue.expected === "date") {
        return t("validation.date");
      }
      return t("validation.required");
    case "invalid_enum_value":
      return t("validation.invalidFormat", { field });
    case "custom":
      return issue.message || t("validation.required");
    default:
      return t("validation.required");
  }
}
```

- [ ] **Step 2: Create Mantine Zod resolver for frontend**

```typescript
// src/lib/validations/mantine-zod-resolver.ts
import type { z } from "zod";

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

export function zodResolver<T extends z.ZodType>(
  schema: T,
  t: TranslationFn,
) {
  return (values: z.infer<T>): Record<string, string | null> => {
    const result = schema.safeParse(values);
    if (result.success) return {};

    const errors: Record<string, string | null> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join(".");
      if (!errors[field]) {
        errors[field] = mapZodErrorToTranslation(issue, t, field);
      }
    }
    return errors;
  };
}

function mapZodErrorToTranslation(
  issue: z.ZodIssue,
  t: TranslationFn,
  field: string,
): string {
  switch (issue.code) {
    case "too_small":
      if (issue.type === "string" && issue.minimum === 1) {
        return t("validation.required");
      }
      if (issue.type === "string") {
        return t("validation.minLength", { min: issue.minimum as number });
      }
      if (issue.type === "number") {
        return t("validation.min", { min: issue.minimum as number });
      }
      if (issue.type === "array") {
        return t("validation.required");
      }
      return t("validation.required");
    case "too_big":
      if (issue.type === "string") {
        return t("validation.maxLength", { max: issue.maximum as number });
      }
      return t("validation.max", { max: issue.maximum as number });
    case "invalid_string":
      if (issue.validation === "email") {
        return t("validation.email");
      }
      return t("validation.invalidFormat", { field });
    case "invalid_type":
      if (issue.expected === "number") return t("validation.number");
      if (issue.expected === "date") return t("validation.date");
      return t("validation.required");
    case "invalid_enum_value":
      return t("validation.invalidFormat", { field });
    case "custom":
      return issue.message || t("validation.required");
    default:
      return t("validation.required");
  }
}
```

- [ ] **Step 3: Expand validation namespace in translation files**

Add to `src/messages/en.json` `validation` key (merge with existing):

```json
"validation": {
  "required": "Required",
  "minLength": "Minimum {min} characters",
  "maxLength": "Maximum {max} characters",
  "email": "Invalid email format",
  "phone": "Invalid phone format",
  "number": "Must be a number",
  "min": "Minimum value {min}",
  "max": "Maximum value {max}",
  "date": "Invalid date format",
  "unique": "Already in use",
  "invalidFormat": "Invalid format for {field}",
  "positive": "Must be greater than 0"
}
```

Add to `src/messages/id.json` `validation` key (merge with existing):

```json
"validation": {
  "required": "Wajib diisi",
  "minLength": "Minimal {min} karakter",
  "maxLength": "Maksimal {max} karakter",
  "email": "Format email tidak valid",
  "phone": "Format telepon tidak valid",
  "number": "Harus berupa angka",
  "min": "Nilai minimal {min}",
  "max": "Nilai maksimal {max}",
  "date": "Format tanggal tidak valid",
  "unique": "Sudah digunakan",
  "invalidFormat": "Format {field} tidak valid",
  "positive": "Harus lebih dari 0"
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/validations/parse-with-locale.ts src/lib/validations/mantine-zod-resolver.ts src/messages/en.json src/messages/id.json
git commit -m "feat: add backend parseWithLocale and frontend Mantine Zod resolver"
```

---

## Task 5: Migrate All API Routes to i18n + Zod

**Files:**
- Modify: All API route files under `src/app/api/v1/`

This is the largest task. Each API route must:
1. Import `getServerT` and the relevant Zod schema
2. Replace manual validation with `parseWithLocale(schema, body, request)`
3. Replace hardcoded English error strings with `t("api.xxx")` calls

- [ ] **Step 1: Migrate auth routes**

For each auth route (`login`, `logout`, `change-password`, `me`), replace hardcoded strings with `t()` calls and add Zod validation.

Example for `src/app/api/v1/auth/login/route.ts`:

```typescript
import type { NextRequest } from "next/server";
import { getServerT } from "@/lib/i18n-server";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";
import { loginSchema } from "@/lib/validations";
// ... existing imports

export async function POST(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const body = await request.json();
    const parsed = await parseWithLocale(loginSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { email, password } = parsed.data;
    // ... rest of logic, replacing hardcoded strings:
    // "Invalid email or password" → t("api.invalidCredentials")
    // "Login successful" → t("api.loginSuccess")
    // "Internal server error" → t("api.internalError")
  } catch (error) {
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
```

Apply this same pattern to all auth routes:
- `src/app/api/v1/auth/login/route.ts`
- `src/app/api/v1/auth/logout/route.ts`
- `src/app/api/v1/auth/change-password/route.ts`
- `src/app/api/v1/student-auth/login/route.ts`
- `src/app/api/v1/student-auth/logout/route.ts`
- `src/app/api/v1/student-auth/change-password/route.ts`
- `src/app/api/v1/student-auth/me/route.ts`

- [ ] **Step 2: Migrate CRUD routes (academic-years, employees, students)**

Apply `getServerT` + `parseWithLocale` to:
- `src/app/api/v1/academic-years/route.ts` (GET, POST)
- `src/app/api/v1/academic-years/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/api/v1/academic-years/[id]/set-active/route.ts` (POST)
- `src/app/api/v1/employees/route.ts` (GET, POST)
- `src/app/api/v1/employees/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/api/v1/employees/[id]/reset-password/route.ts` (POST)
- `src/app/api/v1/students/route.ts` (GET, POST)
- `src/app/api/v1/students/[nis]/route.ts` (GET, PUT, DELETE)
- `src/app/api/v1/students/import/route.ts` (POST)

Replace all hardcoded strings. Example pattern for "not found":
```typescript
return errorResponse(t("api.notFound", { resource: "Employee" }), "NOT_FOUND", 404);
```

- [ ] **Step 3: Migrate class, student-class, tuition, payment routes**

Apply same pattern to:
- `src/app/api/v1/class-academics/route.ts`
- `src/app/api/v1/class-academics/[id]/route.ts`
- `src/app/api/v1/class-academics/import/route.ts`
- `src/app/api/v1/student-classes/route.ts`
- `src/app/api/v1/student-classes/by-class/[classId]/route.ts`
- `src/app/api/v1/student-classes/import/route.ts`
- `src/app/api/v1/tuitions/[id]/route.ts`
- `src/app/api/v1/tuitions/generate/route.ts`
- `src/app/api/v1/payments/route.ts`
- `src/app/api/v1/payments/[id]/route.ts`

- [ ] **Step 4: Migrate scholarship, discount, bank-account, admin routes**

Apply same pattern to:
- `src/app/api/v1/scholarships/route.ts`
- `src/app/api/v1/scholarships/[id]/route.ts`
- `src/app/api/v1/scholarships/import/route.ts`
- `src/app/api/v1/discounts/route.ts`
- `src/app/api/v1/discounts/[id]/route.ts`
- `src/app/api/v1/discounts/apply/route.ts`
- `src/app/api/v1/discounts/import/route.ts`
- `src/app/api/v1/admin/bank-accounts/route.ts`
- `src/app/api/v1/admin/bank-accounts/[id]/route.ts`
- `src/app/api/v1/admin/students/[nis]/account/route.ts`
- `src/app/api/v1/admin/students/[nis]/account/reset-password/route.ts`
- `src/app/api/v1/admin/students/[nis]/account/restore/route.ts`
- `src/app/api/v1/admin/student-accounts/route.ts`
- `src/app/api/v1/admin/payment-requests/route.ts`
- `src/app/api/v1/admin/rate-limits/route.ts`

- [ ] **Step 5: Migrate student portal API routes**

Apply same pattern to:
- `src/app/api/v1/student/tuitions/route.ts`
- `src/app/api/v1/student/banks/route.ts`
- `src/app/api/v1/student/payment-requests/route.ts`
- `src/app/api/v1/student/payment-requests/[id]/route.ts`
- `src/app/api/v1/student/payment-requests/[id]/cancel/route.ts`
- `src/app/api/v1/student/payment-requests/active/route.ts`

- [ ] **Step 6: Commit all API route migrations**

```bash
git add src/app/api/
git commit -m "feat: migrate all API routes to i18n + Zod validation"
```

---

## Task 6: Migrate Frontend Forms to Zod Resolver

**Files:**
- Modify: `src/components/forms/EmployeeForm.tsx`
- Modify: `src/components/forms/StudentForm.tsx`
- Modify: `src/components/forms/AcademicYearForm.tsx`
- Modify: `src/components/forms/ClassAcademicForm.tsx`
- Modify: `src/components/forms/DiscountForm.tsx`
- Modify: `src/components/forms/PaymentForm.tsx`
- Modify: `src/components/forms/ScholarshipForm.tsx`
- Modify: `src/components/forms/TuitionGeneratorForm.tsx`

- [ ] **Step 1: Migrate EmployeeForm**

Replace inline validate with Zod resolver:

```typescript
import { zodResolver } from "@/lib/validations/mantine-zod-resolver";
import { employeeSchema } from "@/lib/validations";

// Inside component:
const t = useTranslations();
const form = useForm<EmployeeInput>({
  initialValues: { name: "", email: "", role: "CASHIER", ...initialData },
  validate: zodResolver(employeeSchema, t),
});
```

- [ ] **Step 2: Migrate StudentForm**

```typescript
import { zodResolver } from "@/lib/validations/mantine-zod-resolver";
import { studentSchema } from "@/lib/validations";

const form = useForm<StudentInput>({
  initialValues: { nis: "", nik: "", name: "", address: "", parentName: "", parentPhone: "", startJoinDate: new Date(), ...initialData },
  validate: zodResolver(studentSchema, t),
});
```

- [ ] **Step 3: Migrate AcademicYearForm**

```typescript
import { zodResolver } from "@/lib/validations/mantine-zod-resolver";
import { academicYearSchema } from "@/lib/validations";

const form = useForm<AcademicYearInput>({
  initialValues: { year: "", startDate: null, endDate: null, isActive: false, ...initialData },
  validate: zodResolver(academicYearSchema, t),
});
```

- [ ] **Step 4: Migrate ClassAcademicForm**

```typescript
import { zodResolver } from "@/lib/validations/mantine-zod-resolver";
import { classAcademicSchema } from "@/lib/validations";

const form = useForm<ClassAcademicInput>({
  initialValues: { academicYearId: "", grade: 1, section: "", paymentFrequency: "MONTHLY", ...initialData },
  validate: zodResolver(classAcademicSchema, t),
});
```

- [ ] **Step 5: Migrate DiscountForm, PaymentForm, ScholarshipForm, TuitionGeneratorForm**

Apply same pattern — import the relevant schema, use `zodResolver(schema, t)` in `useForm`. For forms with manual validation (DiscountForm, PaymentForm, ScholarshipForm, TuitionGeneratorForm), replace the inline `if` checks with the Zod resolver and remove manual `notifications.show()` for validation errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/forms/
git commit -m "feat: migrate all forms to shared Zod validation with Mantine resolver"
```

---

## Task 7: Full Hardcoded String Audit & Translation

**Files:**
- Modify: `src/components/tables/OverdueReportTable.tsx`
- Modify: `src/hooks/api/useStudentClasses.ts`
- Modify: `src/messages/en.json`
- Modify: `src/messages/id.json`
- Modify: Any remaining files with hardcoded strings

- [ ] **Step 1: Translate OverdueReportTable**

This file has ~20 hardcoded English strings. Add translation keys to both JSON files under `report` namespace:

```json
// en.json additions to "report":
"studentsWithOverdue": "Students with Overdue",
"totalOverdueRecords": "Total Overdue Records",
"totalOutstandingAmount": "Total Outstanding Amount",
"filterByAcademicYear": "Filter by academic year",
"filterByGrade": "Filter by grade",
"filterByClass": "Filter by class",
"exportToExcel": "Export to Excel",
"noOverdueFound": "No overdue payments found",
"overdueAmount": "Overdue Amount",
"parentName": "Parent Name",
"phone": "Phone",
"callParent": "Call parent",
"month": "Month",
"dueDate": "Due Date",
"feeAmount": "Fee Amount",
"scholarshipAmount": "Scholarship Amount",
"discountAmount": "Discount Amount",
"paidAmount": "Paid Amount",
"outstanding": "Outstanding",
"daysOverdue": "Days Overdue",
"days": "days"
```

Add corresponding Indonesian translations to `id.json`.

Replace all hardcoded strings in `OverdueReportTable.tsx` with `t("report.xxx")` calls.

- [ ] **Step 2: Translate useStudentClasses hook**

This hook has ~12 hardcoded notification messages. Replace all with translation keys.

The hook is a client-side hook, so use `useTranslations()`:

```typescript
// Add to hook or pass t as parameter
// Replace all notifications.show() hardcoded strings:
// "Students Assigned" → t("api.studentsAssigned", { count: data.assigned })
// "Success" → t("common.success")
// "Error" → t("common.error")
// etc.
```

Since hooks don't have direct access to `useTranslations()`, pass `t` function as a parameter to mutation callbacks, or use the translation keys from the component that calls the hook.

- [ ] **Step 3: Audit and fix remaining hardcoded strings**

Do a full grep for common hardcoded patterns across the codebase:
- Notification titles: `"Success"`, `"Error"`, `"Warning"`
- Page headers: `title=` and `description=` props with English strings
- Modal labels: `labels: { confirm:`, `labels: { cancel:`
- Placeholder text in forms
- `"Rp "` currency prefix — keep as-is (region-specific formatting)
- `"DD/MM/YYYY"` date placeholders — keep as-is (format string)
- DiscountForm reason presets (`"COVID Relief"`, etc.) — move to translations

Ensure both `en.json` and `id.json` have every new key.

- [ ] **Step 4: Commit**

```bash
git add src/components/ src/hooks/ src/messages/ src/app/
git commit -m "feat: complete hardcoded string audit — all UI strings now translated"
```

---

## Task 8: Remove WhatsApp Integration

**Files:**
- Delete: `src/lib/services/notification-service.ts`
- Delete: `src/lib/services/whatsapp-link.ts`
- Delete: `src/lib/cron/payment-reminder-cron.ts`
- Delete: `src/hooks/api/useNotifications.ts`
- Delete: `src/app/api/v1/admin/notifications/route.ts`
- Delete: `docs/15-WHATSAPP-NOTIFICATION.md`
- Modify: `src/lib/cron/index.ts`

- [ ] **Step 1: Remove WhatsApp files**

Delete all WhatsApp-related files listed above.

- [ ] **Step 2: Update cron index**

Replace `src/lib/cron/index.ts`:

```typescript
/**
 * Cron Job Initialization
 */
import "./cleanup-cron";

console.log("[Cron] All cron jobs initialized");
```

- [ ] **Step 3: Remove WhatsApp references from other files**

Grep for any remaining imports of `notification-service`, `whatsapp-link`, `useNotifications`, or `sendPaymentReminder` and remove them. Check:
- Any component that references notifications admin page
- Sidebar/navigation links to notifications page
- Any admin page that shows notification UI

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove WhatsApp integration (will be re-added later)"
```

---

## Task 9: Circuit Breaker

**Files:**
- Create: `src/lib/middleware/circuit-breaker.ts`

- [ ] **Step 1: Implement circuit breaker**

```typescript
// src/lib/middleware/circuit-breaker.ts

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
  name: string;
}

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime >= this.config.cooldownMs) {
        this.state = "HALF_OPEN";
      } else {
        throw new CircuitOpenError(this.config.name);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
      console.error(
        `[CircuitBreaker:${this.config.name}] Circuit OPEN after ${this.failureCount} failures`,
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" is OPEN — service unavailable`);
    this.name = "CircuitOpenError";
  }
}

// Singleton for database operations
export const dbCircuitBreaker = new CircuitBreaker({
  name: "database",
  failureThreshold: 5,
  cooldownMs: 30_000,
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/middleware/circuit-breaker.ts
git commit -m "feat: add circuit breaker for database operations"
```

---

## Task 10: Request Deduplication

**Files:**
- Create: `src/lib/middleware/request-dedup.ts`

- [ ] **Step 1: Implement request deduplication**

```typescript
// src/lib/middleware/request-dedup.ts

const pendingRequests = new Map<string, Promise<Response>>();
const MAX_TTL = 5_000;

/**
 * Deduplicates identical concurrent GET requests.
 * If the same key is already in-flight, returns the same response.
 */
export async function withDedup(
  key: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const existing = pendingRequests.get(key);
  if (existing) {
    const response = await existing;
    return response.clone();
  }

  const promise = handler().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);

  // Safety: auto-cleanup after TTL in case handler never resolves
  setTimeout(() => {
    pendingRequests.delete(key);
  }, MAX_TTL);

  return promise;
}

/**
 * Generate dedup key from request URL + search params
 */
export function getDedupKey(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/middleware/request-dedup.ts
git commit -m "feat: add request deduplication for concurrent GET requests"
```

---

## Task 11: Expand Idempotency to All Financial Mutations

**Files:**
- Modify: API routes for financial mutations

- [ ] **Step 1: Add idempotency to payment cancellation**

In `src/app/api/v1/student/payment-requests/[id]/cancel/route.ts`, wrap the cancellation logic with `withIdempotency`:

```typescript
import { generateIdempotencyKey, withIdempotency } from "@/lib/middleware/idempotency";

// Inside POST handler:
const idempotencyKey = generateIdempotencyKey(auth.sub, "cancel_payment", { paymentRequestId: id });
const { isDuplicate, result } = await withIdempotency(idempotencyKey, async () => {
  // ... existing cancellation logic
  return cancelResult;
});
```

- [ ] **Step 2: Add idempotency to payment verification**

In the payment verification route, wrap with `withIdempotency` using action `"verify_payment"`.

- [ ] **Step 3: Add idempotency to tuition generation**

In `src/app/api/v1/tuitions/generate/route.ts`:

```typescript
const idempotencyKey = generateIdempotencyKey(auth.sub, "generate_tuitions", { classAcademicId, monthlyFee });
const { isDuplicate, result } = await withIdempotency(idempotencyKey, async () => {
  // ... existing generation logic
  return generationResult;
});

if (isDuplicate) {
  const t = await getServerT(request);
  return successResponse({ ...result, message: t("api.duplicateRequest") });
}
```

- [ ] **Step 4: Add idempotency to discount assignment**

In `src/app/api/v1/discounts/apply/route.ts`, wrap with action `"apply_discount"`.

- [ ] **Step 5: Add idempotency to scholarship creation**

In `src/app/api/v1/scholarships/route.ts` POST handler, wrap with action `"create_scholarship"`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/
git commit -m "feat: expand idempotency to all financial mutation endpoints"
```

---

## Task 12: Student Portal Bottom Navigation

**Files:**
- Create: `src/components/portal/BottomNav.tsx`
- Modify: `src/app/(student-portal)/layout.tsx`

- [ ] **Step 1: Create BottomNav component**

```typescript
// src/components/portal/BottomNav.tsx
"use client";

import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import {
  IconCreditCard,
  IconHistory,
  IconHome,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/portal", labelKey: "nav.home", icon: IconHome, color: "blue" },
  { href: "/portal/payment", labelKey: "nav.payment", icon: IconCreditCard, color: "green" },
  { href: "/portal/history", labelKey: "nav.history", icon: IconHistory, color: "violet" },
  { href: "/portal/change-password", labelKey: "nav.settings", icon: IconSettings, color: "orange" },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <Box
      hiddenFrom="sm"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        backgroundColor: "white",
        borderTop: "1px solid var(--mantine-color-gray-2)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <Group grow gap={0} h={60}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <UnstyledButton
              key={item.href}
              component={Link}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 44,
                color: isActive
                  ? `var(--mantine-color-${item.color}-6)`
                  : "var(--mantine-color-gray-6)",
              }}
            >
              <Icon size={22} stroke={isActive ? 2.5 : 1.5} />
              {isActive && (
                <Text size="xs" fw={600} mt={2}>
                  {t(item.labelKey)}
                </Text>
              )}
            </UnstyledButton>
          );
        })}
      </Group>
    </Box>
  );
}
```

- [ ] **Step 2: Add `nav.settings` translation key**

Add to `en.json`: `"settings": "Settings"` under `nav`
Add to `id.json`: `"settings": "Pengaturan"` under `nav`

- [ ] **Step 3: Rewrite student portal layout**

Replace the AppShell layout in `src/app/(student-portal)/layout.tsx`:

- Remove `AppShell.Navbar` entirely
- Remove `Burger` component and `useDisclosure` hook
- Remove navbar collapsed config from AppShell
- Add `<BottomNav />` after `AppShell.Main`
- Add safe-area-inset-top to AppShell.Header
- Add bottom padding to `AppShell.Main` on mobile (to account for bottom nav height)
- Keep sidebar-style nav visible on desktop (`visibleFrom="sm"`) — implement as a desktop-only sidebar or keep the existing sidebar visible only on desktop

Updated layout structure:

```typescript
import { BottomNav } from "@/components/portal/BottomNav";

// Remove: Burger, useDisclosure, ScrollArea imports
// Remove: opened, toggle, close state

return (
  <AppShell
    header={{ height: 70 }}
    navbar={{
      width: 280,
      breakpoint: "sm",
      collapsed: { mobile: true }, // Always hidden on mobile
    }}
    padding="md"
    styles={{
      header: {
        backgroundColor: "var(--mantine-color-blue-6)",
        borderBottom: "none",
        paddingTop: "env(safe-area-inset-top)",
      },
    }}
  >
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between">
        <Group gap="sm">
          {/* Remove Burger — no more hamburger menu on mobile */}
          <ThemeIcon size={42} radius="xl" variant="white" color="blue">
            <IconSchool size={24} />
          </ThemeIcon>
          <Box visibleFrom="xs">
            <Text size="lg" fw={700} c="white">{t("portal.title")}</Text>
            <Text size="xs" c="white" opacity={0.85}>{t("portal.subtitle")}</Text>
          </Box>
        </Group>
        <Group gap="sm">
          <Box visibleFrom="sm" ta="right">
            <Text size="xs" c="white" opacity={0.85}>{t(`portal.greeting.${getGreetingKey()}`)}</Text>
            <Text size="sm" fw={600} c="white">{user?.studentName}</Text>
          </Box>
          <Avatar ...>{/* existing avatar */}</Avatar>
          <LanguageSwitcher />
          <ActionIcon ... visibleFrom="sm">{/* logout, desktop only */}</ActionIcon>
        </Group>
      </Group>
    </AppShell.Header>

    {/* Desktop sidebar — hidden on mobile */}
    <AppShell.Navbar p="md" style={{ backgroundColor: "#f8f9fa" }} component={ScrollArea}>
      {/* Keep existing sidebar content for desktop */}
    </AppShell.Navbar>

    <AppShell.Main style={{ backgroundColor: "#f8f9fa" }}>
      <Box pb={{ base: 80, sm: 0 }}>{children}</Box>
    </AppShell.Main>

    <BottomNav />
  </AppShell>
);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/portal/BottomNav.tsx src/app/\(student-portal\)/layout.tsx src/messages/en.json src/messages/id.json
git commit -m "feat: add mobile bottom navigation for student portal"
```

---

## Task 13: Bottom Sheet Component (vaul)

**Files:**
- Create: `src/components/portal/BottomSheet.tsx`

- [ ] **Step 1: Install vaul**

```bash
bun add vaul
```

- [ ] **Step 2: Create BottomSheet wrapper**

```typescript
// src/components/portal/BottomSheet.tsx
"use client";

import { Box, Text } from "@mantine/core";
import { Drawer } from "vaul";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  snapPoints,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} snapPoints={snapPoints}>
      <Drawer.Portal>
        <Drawer.Overlay
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            zIndex: 300,
          }}
        />
        <Drawer.Content
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "white",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            zIndex: 301,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Drag handle */}
          <Box
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            <Drawer.Handle />
          </Box>

          {title && (
            <Box px="md" pb="sm">
              <Drawer.Title asChild>
                <Text fw={600} size="lg">{title}</Text>
              </Drawer.Title>
            </Box>
          )}

          <Box
            px="md"
            pb="md"
            style={{ overflow: "auto", flex: 1 }}
          >
            {children}
          </Box>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/BottomSheet.tsx package.json bun.lock
git commit -m "feat: add vaul-based BottomSheet component for mobile interactions"
```

---

## Task 14: URL Query Params State Persistence

**Files:**
- Create: `src/hooks/useQueryParams.ts`
- Modify: List/table pages in admin and student portal

- [ ] **Step 1: Create useQueryParams hook**

```typescript
// src/hooks/useQueryParams.ts
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type ParamValue = string | number | null | undefined;

export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, ParamValue>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const getParam = useCallback(
    (key: string, defaultValue?: string): string | undefined => {
      return searchParams.get(key) ?? defaultValue;
    },
    [searchParams],
  );

  const getNumParam = useCallback(
    (key: string, defaultValue?: number): number | undefined => {
      const val = searchParams.get(key);
      return val != null ? Number(val) : defaultValue;
    },
    [searchParams],
  );

  return { setParams, getParam, getNumParam, searchParams };
}
```

- [ ] **Step 2: Apply to list pages**

For each list/table page, replace local state with `useQueryParams`:

```typescript
// Example in a table page:
const { setParams, getParam, getNumParam } = useQueryParams();

const page = getNumParam("page", 1)!;
const limit = getNumParam("limit", 10)!;
const search = getParam("search", "");
const status = getParam("status", "");

// When user changes page:
setParams({ page: newPage });

// When user changes search:
setParams({ search: newSearch, page: 1 });
```

Apply to all pages that have pagination, search, or filters:
- Admin: students, employees, academic years, classes, tuitions, payments, scholarships, discounts, overdue report, student accounts, payment requests
- Student portal: payment list, history

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useQueryParams.ts src/app/ src/components/
git commit -m "feat: persist table pagination, search, and filters in URL query params"
```

---

## Task 15: Final Audit & Cleanup

- [ ] **Step 1: Run full build to check for errors**

```bash
bun run build
```

Fix any TypeScript errors or build issues.

- [ ] **Step 2: Run biome lint**

```bash
bunx biome check --write src/
```

- [ ] **Step 3: Manual verification**

- Start dev server and test language switching (ID ↔ EN)
- Verify API error messages are translated based on NEXT_LOCALE cookie
- Verify form validation shows translated messages
- Verify bottom nav appears on mobile viewport
- Verify bottom nav hides on desktop
- Verify URL params persist on page refresh
- Verify safe-area insets on mobile viewport

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final audit, lint fixes, and cleanup"
```
