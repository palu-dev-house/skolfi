# Changelog

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



