# Changelog

## [2.16.2] - 2026-04-16

### Fixes
- add VOID status color to bill and payment badges



## [2.16.1] - 2026-04-16

### Fixes
- auth-aware redirects, payments table null fields, sidebar reorder, and locale gaps



## [2.16.0] - 2026-04-15

### Features
- feat(hooks): add useQueryFilters for URL-persisted filters
- feat(reports): add service fee summary business logic
- feat(api): add fee service summary report endpoint
- feat(api): add fee service summary xlsx export
- feat(hooks): add useFeeServiceSummary query + export hooks
- feat(i18n): add fee service summary translations
- feat(reports): add fee service summary filter bar
- feat(reports): add fee service summary table
- feat(reports): add fee service summary page and nav links
- rebrand to SkolFi and document new report features

### Other
- docs(spec): service fee report + URL-persisted filters design
- docs(plan): service fee report + URL-persisted filters implementation plan
- refactor(reports): rename service-fee-summary to fee-service-summary
- docs: align plan and spec with FeeService naming
- refactor(employees): persist list filters in URL
- refactor(tuitions): persist list filters in URL
- refactor(payments): persist list filters in URL
- refactor(students): persist list filters in URL
- refactor(student-accounts): persist list filters in URL
- refactor(scholarships): persist list filters in URL
- refactor(academic-years): persist list filters in URL
- refactor(classes): persist list filters in URL
- refactor(reports): persist overdue report filters in URL
- refactor(service-fees): persist list filters in URL
- refactor(fee-services): persist list filters in URL
- refactor(online-payments): persist list filters in URL
- refactor(reports): persist tab and academic year filter in URL
- refactor(fee-bills): persist tab filters in URL with debounced student search
- docs: document fee-service-summary endpoint and useQueryFilters hook



## [2.15.0] - 2026-04-15

### Features
- feat(online-payments): live status polling with toast notifications



## [2.14.0] - 2026-04-15

### Features
- class summary breakdowns, docs refresh, remove Cetak Kuitansi



## [2.13.3] - 2026-04-15

### Fixes
- fix(payment-card): fixed column widths and selected-mode header gap



## [2.13.2] - 2026-04-15

### Fixes
- fix(payment-card): header/selected mode layout, print visibility



## [2.13.1] - 2026-04-15

### Fixes
- fix(payment-card): preserve row height in selected mode to avoid overlap



## [2.13.0] - 2026-04-15

### Features
- feat(payment-card): frequency-aware rows, cashier column, clean overlay layout



## [2.12.1] - 2026-04-15

### Fixes
- fix(payment-card): use A4 paper instead of A5



## [2.12.0] - 2026-04-15

### Features
- feat(reports): add overdue tabs for tuition, fee bills, and service fees
- feat(students): payment card print with header/selected/all modes

### Fixes
- fix(admin): bill list response, sidebar active highlight, print label, naming

### Other
- docs: document overdue tabs and A5 payment card print



## [2.11.0] - 2026-04-15

### Features
- feat(db): add fee services, subscriptions, bills, and service fees
- feat(db): add (studentNis, status) composite index and align onDelete on service-fee-bill
- feat(fee-bills): add bill generation with price history resolution
- feat(payments): add single-bill-target invariant helper
- feat(service-fee-bills): add per-class service fee bill generation
- feat(student-exit): cascade exit/undo to fee subscriptions and fee bills
- feat(api): fee-services CRUD endpoints
- feat(api): fee-subscriptions endpoints
- feat(api): service-fees CRUD endpoints
- feat(api): fee-bills CRUD + generation endpoints
- feat(api): service-fee-bills endpoints + generation
- feat(payments): include fee + service-fee bills in /payments/print
- feat(query-keys): add fee-service, subscription, bill, and service-fee families
- feat(payments): accept mixed tuition/fee/service-fee items in POST /payments
- feat(online-payments): accept mixed bill items end-to-end
- feat(hooks): add useFeeSubscriptions
- feat(hooks): add useFeeServices and useFeeServicePrices
- feat(hooks): add useServiceFees and useServiceFeeBills
- feat(hooks): add useFeeBills, migrate useCreatePayment to mixed items
- feat(fee-services): add admin list + create/edit/delete page
- feat(fee-services): add detail page with price history + subscribers + bills
- feat(fee-bills): add combined list with generate-all (fee + service tabs)
- feat(service-fees): add admin list + detail pages
- feat(payments): multi-bill picker payment form
- feat(students): add subscriptions and fee bills sections to detail page
- feat(print): render fee and service fee lines on payment slip
- feat(nav): add fee services, service fees, and all-bills sidebar entries
- feat(portal): combined outstanding bills (tuition + fee + service fee)

### Fixes
- fix(api): null-guard polymorphic payment fields in dashboard/stats and bulk-reverse
- fix(hooks): align generate-all hooks with backend response shape

### Other
- docs: spec for fees & services module (transport + service fee)
- docs(spec): make scholarship/discount exclusion an explicit rule
- docs(spec): resolve open questions — exit cascade, generate-all, help docs
- docs(plan): add fees & services implementation plan
- style: remove unused Paper import in fee-services/[id].tsx
- i18n: add fee-service, fee-bill, service-fee translation keys
- seed: add fee services, subscriptions, service fees, bills, and payments
- docs: document fee services, service fees, and multi-bill payment
- Merge branch 'feat/fees-services'



## [2.10.0] - 2026-04-14

### Features
- print slip redesign, bilingual help, and UX polish



## [2.9.0] - 2026-04-14

### Features
- feat(db): add student exit tracking fields
- feat(exit): add period-start helpers for student exit logic
- feat(exit): add zod schema for student exit input
- feat(exit): implement recordStudentExit business logic
- feat(exit): implement undoStudentExit business logic
- feat(exit): skip post-exit periods during tuition generation
- feat(exit): add POST/DELETE student exit API endpoints
- feat(exit): support status filter on GET /students
- feat(exit): add student exit hooks and types
- feat(exit): add i18n strings for student exit feature
- add usePageTitle hook for browser tab title
- feat(exit): add StudentExitSection UI component
- feat(exit): wire StudentExitSection into student detail page
- feat(exit): add status filter and exited badge on student list
- feat(exit): show banner to exited students in portal
- sync browser tab title with PageHeader and portal pages

### Fixes
- fix(exit): move guards inside transaction to avoid TOCTOU race
- fix(layout): move user menu from header to sidebar for mobile

### Other
- docs: add design spec for student exit tracking
- docs: add implementation plan for student exit tracking



## [2.8.1] - 2026-04-13

### Fixes
- simplify backup script to local storage only



## [2.8.0] - 2026-04-13

### Features
- add database backup script with Supabase Storage upload



## [2.7.0] - 2026-04-13

### Features
- migrate App Router to Pages Router with React 18, add Husky + Biome pre-commit



## [2.6.0] - 2026-04-13

### Features
- add print invoices, profile modal, student accounts refactor, mobile card view



## [2.5.1] - 2026-04-10

### Other
- chore: add i18next config and tuitions mass-update endpoint



## [2.5.0] - 2026-04-10

### Features
- add bulk operations, payment tabs, history filters, i18n fixes, and UI consistency



## [2.4.0] - 2026-04-10

### Features
- integrate Midtrans Snap payment gateway with admin controls



## [2.3.0] - 2026-04-10

### Features
- persist table pagination, search, and filters in URL query params
- complete hardcoded string audit — all UI strings now translated
- add stress test seed script with 250 students
- migrate to pnpm, add column management, sidebar search, and React Virtuoso

### Other
- chore: lint fixes and cleanup
- chore: remove online payment system (bank transfer, payment requests)



## [2.2.0] - 2026-04-09

### Features
- add server-side i18n helper with api namespace translations
- add shared Zod validation schemas for all entities
- add backend parseWithLocale and frontend Mantine Zod resolver
- migrate all API routes to i18n + Zod validation
- add circuit breaker for database operations
- add request deduplication for concurrent GET requests
- add vaul-based BottomSheet component for mobile interactions
- migrate all forms to shared Zod validation with Mantine resolver
- expand idempotency to all financial mutation endpoints
- add mobile bottom navigation for student portal

### Fixes
- fix LanguageSwitcher cookie bug, translate rate limit errors

### Other
- docs: add hardening and mobile UX design spec
- docs: remove testing section from design spec
- docs: add hardening and mobile UX implementation plan
- chore: remove WhatsApp integration (will be re-added later)
- Merge branch 'main' of github.com-ARS-Ferdy:ferdyars/tuition-app-system



## [2.1.1] - 2026-02-06

### Fixes
- missing locales



## [2.1.0] - 2026-02-06

### Fixes
- fix: cache 6 days



## [2.0.0] - 2026-02-06

### Features
- feat: lottie files
- feat: pwa

### Fixes
- fix: change release note

### Other
- chore: release v1.0.5
- :wq Merge branch 'main' of github.com:ferdyars/tuition-app-system
- chore: release v1.1.0



## [1.1.0] - 2026-02-06

### Features
- feat: lottie files
- feat: pwa

### Fixes
- fix: change release note

### Other
- chore: release v1.0.5
- :wq Merge branch 'main' of github.com:ferdyars/tuition-app-system



## [1.0.5] - 2026-02-06

### Fixes
- missing locale

### Other
- chore: release v1.0.4
- Merge branch 'main' of github.com:ferdyars/tuition-app-system



## [1.0.4] - 2026-02-06

### Features
- feat: release note

### Fixes
- fix: missing locale



## [1.0.3] - 2026-02-06

### Fixes
- fix: overlaps sidebar



## [1.0.2] - 2026-02-06

### Other
- chore: setup automated release workflow with changelog



## [1.0.1] - 2026-02-06



## [1.0.0] - 2026-02-06



## [0.1.3] - 2026-02-06

### Features
- automated changelog workflow

### Other
- chore: release v0.1.2



## [0.1.2] - 2026-02-06

### Features
- feat: automated changelog workflow



## [0.1.1] - 2026-02-06

### Features
- feat: phase 1
- feat: phase 2
- feat: formatting
- feat: post install script
- feat: allow public for student-portal
- feat: phase 3
- feat: recovery accordion
- feat: censor private data
- feat: phase 3

### Fixes
- fix: formatting
- fix: adjust discount table
- fix: adjust discount
- fix: adjust student portal
- fix: report
- fix: datepicker
- fix: formatting
- fix: align number
- fix: formatting
- fix: public cache api
- fix: layout
- fix: alignment
- fix: change layout
- fix: migrate middleware to proxy
- fix: logout
- fix: missing locale
- fix: missing locale

### Other
- Initial commit from Create Next App



