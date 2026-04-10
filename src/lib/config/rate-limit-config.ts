export interface RateLimitConfig {
  limit: number; // Max requests allowed
  windowMs: number; // Time window in milliseconds
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Login: 3 attempts per 1 minute per NIS (as requested by user)
  login: {
    limit: 3,
    windowMs: 60 * 1000, // 1 minute
  },

  // Change password: 3 per minute per user
  changePassword: {
    limit: 3,
    windowMs: 60 * 1000,
  },

  // General API: 100 requests per minute per user
  api: {
    limit: 100,
    windowMs: 60 * 1000,
  },

  // Strict: 10 requests per minute (for sensitive endpoints)
  strict: {
    limit: 10,
    windowMs: 60 * 1000,
  },
};
