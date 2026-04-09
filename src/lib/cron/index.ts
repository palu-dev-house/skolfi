/**
 * Cron Job Initialization
 *
 * Import this file to start all cron jobs.
 * Only import in server environment (not serverless).
 *
 * For serverless deployment (Vercel), use:
 * - Supabase pg_cron for database cleanup
 * - Supabase Edge Functions with cron trigger
 * - External cron service (cron-job.org, etc.)
 *
 * Usage in server environment:
 * ```
 * if (process.env.ENABLE_CRON === 'true') {
 *   import('@/lib/cron');
 *   console.log('Cron jobs initialized');
 * }
 * ```
 */

// Import to initialize all cron jobs
import "./cleanup-cron";
// import "./payment-checker-cron"; // IMAP checker - add when implementing

console.log("[Cron] All cron jobs initialized");
