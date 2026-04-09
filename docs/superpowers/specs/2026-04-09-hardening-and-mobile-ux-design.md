# School Tuition System — Hardening & Mobile UX Design

**Date:** 2026-04-09
**Status:** Approved

---

## 1. i18n — Full Bilingual Coverage

### Goal
Ensure every user-facing string in the app (frontend + backend) is translated to both Bahasa Indonesia and English. Default locale is `"id"`. Language preference persisted via `NEXT_LOCALE` cookie (already in place).

### Changes

#### 1.1 Full Hardcoded String Audit
- Audit **every file** in the codebase for hardcoded copywriting — admin pages, student portal pages, API routes, components (forms, tables, layouts, modals), notifications, error messages, placeholders, tooltips, labels.
- Move every hardcoded string to translation keys in `src/messages/en.json` and `src/messages/id.json`.

#### 1.2 Backend API Error Translation
- New file: `src/lib/i18n-server.ts`
  - Loads messages from `src/messages/{locale}.json`
  - Reads `NEXT_LOCALE` cookie from the request
  - Exposes `getServerTranslation(request)` returning a `t()` function
  - Falls back to `"id"` if cookie is missing/invalid
- All API routes use `t()` for error messages instead of hardcoded strings.
- New namespace `api` in translation files for backend-specific messages (e.g., `api.invalidCredentials`, `api.paymentNotFound`).

#### 1.3 Fix LanguageSwitcher
- Fix `cookieStore` import issue in `src/components/ui/LanguageSwitcher.tsx`.

### Not Changing
- Frontend translation pattern (next-intl with `useTranslations()`) — already solid.
- Locale routing config (`prefix: "never"`, default `"id"`).

---

## 2. Shared Zod Validation (Backend + Frontend)

### Goal
Single source of truth for validation rules. Same Zod schema validates on both frontend (forms) and backend (API routes). Error messages are translated.

### Architecture

```
src/lib/validations/
  ├── schemas/
  │   ├── auth.schema.ts
  │   ├── student.schema.ts
  │   ├── employee.schema.ts
  │   ├── payment.schema.ts
  │   ├── tuition.schema.ts
  │   ├── academic-year.schema.ts
  │   ├── class.schema.ts
  │   ├── scholarship.schema.ts
  │   ├── discount.schema.ts
  │   └── bank-account.schema.ts
  └── index.ts
```

### How It Works

1. **Schemas define structure only** — field types, min/max, regex patterns. No hardcoded error messages.
2. **Error messages from translation files** — `validation` namespace keys (some already exist, extend as needed).
3. **Frontend**: Custom Mantine form resolver that runs Zod validation and maps errors to translated messages via `t()`. Mantine `useForm()` stays as form state manager.
4. **Backend**: `parseWithLocale(schema, data, request)` helper reads `NEXT_LOCALE` cookie and returns translated Zod validation errors in the API error response format.
5. **Consistency**: Same schema on both sides — rules never drift.

### UI State in Query Params
- All list/table pages persist state in URL query params: `page`, `limit`, `search`, `status`, `tab`, `sort`.
- Use `useSearchParams()` + `router.replace()` to sync.
- Applies to both admin dashboard and student portal.

---

## 3. Infrastructure Hardening

### 3.1 Circuit Breaker for Supabase/DB
- New file: `src/lib/middleware/circuit-breaker.ts`
- In-memory circuit breaker wrapping critical Prisma calls.
- 3 states: CLOSED (normal) → OPEN (failing, reject fast) → HALF-OPEN (test recovery).
- Config: 5 consecutive failures to trip, 30s cooldown before half-open test.
- When OPEN: returns graceful error response immediately instead of piling up requests.

### 3.2 Request Deduplication
- New file: `src/lib/middleware/request-dedup.ts`
- In-memory Map keyed by URL + query params for identical concurrent GET requests.
- Second identical request waits for the first to resolve, returns the same result.
- Auto-cleanup after response. Hard TTL of 5s to prevent memory leaks.

### 3.3 Idempotency Expansion
- Extend existing idempotency system (`src/lib/middleware/idempotency.ts`) to all financial mutations:
  - Payment creation (already done)
  - Payment cancellation
  - Payment verification
  - Tuition generation
  - Discount assignment
  - Scholarship assignment

### 3.4 Remove WhatsApp Integration
- Remove WhatsApp-related cron jobs, services, and config files.
- Keep cron infrastructure for remaining jobs (payment expiration, cleanup).

### Not Adding
- Request queue / backpressure — overkill for school system scale.
- External circuit breaker for WhatsApp — removed entirely.

---

## 4. Student Portal Mobile UX

### 4.1 Bottom Navigation
- Replace sidebar/drawer with fixed bottom navigation on mobile (`< sm` breakpoint).
- 4 tabs: Home, Payments, History, Settings.
- Active tab: highlighted icon + label. Inactive: icon only.
- Desktop (`>= sm`): keeps existing sidebar layout.
- Sticky bottom with safe-area padding (`env(safe-area-inset-bottom)`).
- Header/top area respects `env(safe-area-inset-top)` for notched devices.
- Touch-friendly tap targets (min 44px).

### 4.2 Bottom Sheet (vaul)
- Install `vaul` package.
- Use for mobile interactions: payment detail actions, confirmation dialogs, filter options.
- On mobile: bottom sheet replaces modals. On desktop: modals stay.
- Features: drag-to-dismiss, snap points.

### 4.3 Other Mobile Improvements
- Payment cards on mobile — already in place, keep as-is.
- Ensure all interactive elements meet 44px minimum touch target.

---

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Locale persistence | `NEXT_LOCALE` cookie | Consistent frontend + backend, already in place |
| Zod scope | Shared backend + frontend | Single source of truth, no drift |
| Bottom nav tabs | 4 (Home, Payments, History, Settings) | Only 4 items, clean fit |
| Bottom sheet lib | vaul | Native-feeling drag gestures, lightweight |
| Mobile nav pattern | Bottom nav (no sidebar/drawer) | Mobile-native behavior |
| Infra hardening | Circuit breaker + dedup + expanded idempotency | Practical for school system scale |
| WhatsApp | Remove for now | Not needed yet |
| Backend i18n | Read `NEXT_LOCALE` cookie | Simple, consistent with frontend |
| UI state | URL query params | Survives refresh, shareable |
