# Redis Caching Layer Design

## Goal

Add a Redis caching layer using ioredis to reduce PostgreSQL workload. Replace fragile in-memory structures (token blacklist, rate limiting) with Redis, cache heavy read endpoints, and use a hybrid invalidation strategy (explicit invalidation for correctness-critical data, short TTLs for stale-tolerant data).

## Context

- Railway Redis already provisioned (`REDIS_URL` in `.env.local`) but unused
- Current pain points:
  - Token blacklist uses in-memory `Set` -- lost on restart, logged-out tokens become valid again
  - Rate limiting hits PostgreSQL transaction per request
  - Idempotency checks hit PostgreSQL per POST
  - Dashboard stats run 8 sequential DB queries per load
  - Class summary report runs heavy aggregation queries
  - Tuition list has N+1 scholarship query problem

## Architecture

### Approach: Thin Wrapper

Follows the existing singleton pattern (`prisma.ts`). Two new modules:

- **`src/lib/redis.ts`** -- singleton ioredis client with auto-reconnect
- **`src/lib/cache.ts`** -- thin helper for `get`, `set`, `del`, `delPattern`

Each consumer (token blacklist, rate limiter, idempotency, API routes) calls the cache helper directly. No middleware magic, no service layer refactor.

### Key Namespace Convention

| Pattern | Example | Purpose |
|---------|---------|---------|
| `blacklist:{tokenHash}` | `blacklist:a1b2c3...` | Revoked JWT tokens |
| `ratelimit:{ip}:{endpoint}` | `ratelimit:1.2.3.4:/api/v1/login` | Rate limit counters |
| `idempotency:{hash}` | `idempotency:sha256...` | Idempotent POST dedup |
| `dashboard:stats:{academicYearId}` | `dashboard:stats:uuid-123` | Dashboard stats cache |
| `report:class-summary:{academicYearId}` | `report:class-summary:uuid-123` | Report cache |
| `tuitions:list:{queryHash}` | `tuitions:list:sha256...` | Tuition list cache |
| `student:bills:{studentId}` | `student:bills:uuid-456` | Student outstanding bills |
| `lookup:{resource}:{id}` | `lookup:academic-year:active` | Static/slow-changing lookups |

## Part A: Replace In-Memory Structures

### 1. Token Blacklist

**Current:** `src/lib/token-blacklist.ts` -- in-memory `Set<string>`, lost on restart.

**Change to:**
- On logout: `SET blacklist:{sha256(token)} "1" EX {remainingTokenLifetime}`
- On auth check: `EXISTS blacklist:{sha256(token)}` -- if truthy, reject
- TTL matches JWT expiry so keys self-clean
- Delete `token-blacklist.ts`, replace with cache calls in `api-auth.ts` and logout endpoint

### 2. Rate Limiting

**Current:** `RateLimitRecord` PostgreSQL table, checked via DB transaction per request.

**Change to:**
- Sliding window using Redis `INCR` + `EXPIRE`
- Key: `ratelimit:{ip}:{endpoint}`, TTL = window size (60s)
- `INCR` key, if count > limit return 429
- `EXPIRE` only set on first increment (when count = 1)
- Keep `RateLimitRecord` Prisma model for audit trail, remove from hot path
- Update `src/lib/middleware/rate-limiter.ts` to use Redis

### 3. Idempotency

**Current:** `IdempotencyRecord` PostgreSQL table, checked per POST.

**Change to:**
- `SET idempotency:{hash} {jsonResponse} EX 86400 NX` (24h TTL, atomic check-and-set)
- `NX` flag = only set if not exists, giving atomic dedup in one Redis call
- Keep PostgreSQL `IdempotencyRecord` for long-term audit
- Update `src/lib/middleware/idempotency.ts` to check Redis first, fall back to DB

## Part B: Cache Heavy Read Endpoints

### Caching Strategy

| Endpoint | Key Pattern | TTL | Invalidation |
|----------|------------|-----|-------------|
| `GET /api/v1/dashboard/stats` | `dashboard:stats:{academicYearId}` | 5 min | Explicit on payment/tuition create |
| `GET /api/v1/reports/class-summary` | `report:class-summary:{academicYearId}:{classId?}` | 30 min | Pattern delete on financial mutations |
| `GET /api/v1/tuitions` | `tuitions:list:{queryHash}` | 2 min | Pattern delete on tuition CRUD |
| `GET /api/v1/student/outstanding-bills` | `student:bills:{studentId}` | 2 min | Explicit on payment for that student |
| `GET /api/v1/academic-years` (active) | `lookup:academic-year:active` | 1 hour | Explicit on academic year update |

### Invalidation Rules

**Explicit invalidation (correctness-critical):**
- Payment created → `del dashboard:stats:*`, `del student:bills:{studentId}`
- Tuition generated → `del dashboard:stats:*`, `del tuitions:list:*`
- Academic year updated → `del lookup:academic-year:*`

**TTL-only (stale-tolerant):**
- Report caches expire naturally at 30 min
- Tuition list caches expire at 2 min

**Pattern delete implementation:**
- Use `SCAN` with pattern match + `DEL` (not `KEYS` which blocks Redis)

## Graceful Degradation

All cache operations wrapped in try/catch. If Redis is unavailable:
- `cache.get()` returns `null` (cache miss, falls through to DB)
- `cache.set()` silently fails (no error thrown)
- `cache.del()` silently fails
- App continues to function at full correctness, just without caching performance benefit
- Log Redis errors at `warn` level for monitoring

## Tech Stack

- **ioredis** -- Redis client (auto-reconnect, pipeline support)
- **Railway Redis** -- `REDIS_URL` env var (already provisioned)
- **crypto** (Node built-in) -- SHA256 for cache key hashing

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/redis.ts` | Singleton ioredis client |
| `src/lib/cache.ts` | Cache helper (get/set/del/delPattern) |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/token-blacklist.ts` | Replace in-memory Set with Redis |
| `src/lib/middleware/rate-limiter.ts` | Replace PostgreSQL check with Redis INCR |
| `src/lib/middleware/idempotency.ts` | Add Redis as primary check, DB as fallback |
| `src/pages/api/v1/dashboard/stats/index.ts` | Add cache.get/set around DB queries |
| `src/pages/api/v1/reports/class-summary/index.ts` | Add cache.get/set around aggregation |
| `src/pages/api/v1/tuitions/index.ts` | Add cache.get/set around list query |
| `src/pages/api/v1/student/outstanding-bills/index.ts` | Add cache.get/set around bills query |
| `src/pages/api/v1/payments/index.ts` (POST) | Add cache invalidation on payment create |
| `src/pages/api/v1/tuitions/generate/index.ts` | Add cache invalidation on tuition generate |
| `package.json` | Add ioredis dependency |

## Testing

- Unit tests for `cache.ts` helper using a mock Redis (ioredis-mock or manual mock)
- Verify graceful degradation: cache operations don't throw when Redis is down
- Verify TTL expiry behavior
- Verify pattern delete uses SCAN not KEYS
