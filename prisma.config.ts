import path from "node:path";
import { defineConfig } from "prisma/config";

// Load .env.local for local development (not needed in production)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config();
} catch {
  // dotenv not available in production build - env vars are set by the platform
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
