#!/usr/bin/env node
/**
 * Migration script: Migrate App Router pages to Pages Router
 *
 * Transforms page.tsx files:
 * - Moves to correct location in src/pages/
 * - Removes "use client" directive
 * - Changes next/navigation imports to next/router
 * - Adds getLayout wrapper for admin/portal pages
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const PROJECT_ROOT = dirname(dirname(new URL(import.meta.url).pathname));
const APP_DIR = join(PROJECT_ROOT, "src/app");
const PAGES_DIR = join(PROJECT_ROOT, "src/pages");

// Page mapping: [source relative to src/app, target relative to src/pages, layout]
const PAGE_MAP = [
  // Auth pages (no layout - or simple center layout)
  ["(auth)/admin/login/page.tsx", "admin/login.tsx", "auth"],

  // Admin pages
  ["admin/dashboard/page.tsx", "admin/dashboard.tsx", "admin"],
  ["admin/academic-years/page.tsx", "admin/academic-years/index.tsx", "admin"],
  [
    "admin/academic-years/new/page.tsx",
    "admin/academic-years/new.tsx",
    "admin",
  ],
  [
    "admin/academic-years/[id]/page.tsx",
    "admin/academic-years/[id].tsx",
    "admin",
  ],
  ["admin/classes/page.tsx", "admin/classes/index.tsx", "admin"],
  ["admin/classes/new/page.tsx", "admin/classes/new.tsx", "admin"],
  ["admin/classes/import/page.tsx", "admin/classes/import.tsx", "admin"],
  ["admin/classes/[id]/page.tsx", "admin/classes/[id]/index.tsx", "admin"],
  [
    "admin/classes/[id]/students/page.tsx",
    "admin/classes/[id]/students.tsx",
    "admin",
  ],
  [
    "admin/classes/students/import/page.tsx",
    "admin/classes/students/import.tsx",
    "admin",
  ],
  ["admin/discounts/page.tsx", "admin/discounts/index.tsx", "admin"],
  ["admin/discounts/new/page.tsx", "admin/discounts/new.tsx", "admin"],
  ["admin/discounts/import/page.tsx", "admin/discounts/import.tsx", "admin"],
  ["admin/discounts/[id]/page.tsx", "admin/discounts/[id].tsx", "admin"],
  ["admin/employees/page.tsx", "admin/employees/index.tsx", "admin"],
  ["admin/employees/new/page.tsx", "admin/employees/new.tsx", "admin"],
  ["admin/employees/[id]/page.tsx", "admin/employees/[id].tsx", "admin"],
  ["admin/payments/page.tsx", "admin/payments/index.tsx", "admin"],
  ["admin/payments/new/page.tsx", "admin/payments/new.tsx", "admin"],
  ["admin/payments/print/page.tsx", "admin/payments/print.tsx", "admin"],
  ["admin/payment-settings/page.tsx", "admin/payment-settings.tsx", "admin"],
  ["admin/online-payments/page.tsx", "admin/online-payments.tsx", "admin"],
  [
    "admin/reports/class-summary/page.tsx",
    "admin/reports/class-summary.tsx",
    "admin",
  ],
  ["admin/reports/overdue/page.tsx", "admin/reports/overdue.tsx", "admin"],
  ["admin/scholarships/page.tsx", "admin/scholarships/index.tsx", "admin"],
  ["admin/scholarships/new/page.tsx", "admin/scholarships/new.tsx", "admin"],
  [
    "admin/scholarships/import/page.tsx",
    "admin/scholarships/import.tsx",
    "admin",
  ],
  ["admin/students/page.tsx", "admin/students/index.tsx", "admin"],
  ["admin/students/new/page.tsx", "admin/students/new.tsx", "admin"],
  ["admin/students/import/page.tsx", "admin/students/import.tsx", "admin"],
  ["admin/students/[nis]/page.tsx", "admin/students/[nis].tsx", "admin"],
  ["admin/student-accounts/page.tsx", "admin/student-accounts.tsx", "admin"],
  ["admin/tuitions/page.tsx", "admin/tuitions/index.tsx", "admin"],
  ["admin/tuitions/generate/page.tsx", "admin/tuitions/generate.tsx", "admin"],

  // Portal pages
  ["(student-portal)/portal/page.tsx", "portal/index.tsx", "portal"],
  ["(student-portal)/portal/login/page.tsx", "portal/login.tsx", "portal"],
  ["(student-portal)/portal/payment/page.tsx", "portal/payment.tsx", "portal"],
  ["(student-portal)/portal/history/page.tsx", "portal/history.tsx", "portal"],
  [
    "(student-portal)/portal/change-password/page.tsx",
    "portal/change-password.tsx",
    "portal",
  ],
  ["(student-portal)/portal/error.tsx", "portal/error.tsx", "portal"],

  // API docs
  ["api-docs/page.tsx", "api-docs.tsx", "none"],

  // Student portal public page
  ["student-portal/page.tsx", "student-portal.tsx", "none"],
];

function transformPageContent(content, layout, targetPath) {
  let result = content;

  // Remove "use client" directive
  result = result.replace(/^"use client";\s*\n?/m, "");

  // Replace next/navigation imports
  result = result.replace(
    /import\s*\{([^}]*)\}\s*from\s*"next\/navigation"\s*;?\n?/g,
    (match, imports) => {
      const importList = imports
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const routerImports = [];
      const removedImports = [];

      for (const imp of importList) {
        if (
          imp === "useRouter" ||
          imp === "usePathname" ||
          imp === "useParams" ||
          imp === "useSearchParams"
        ) {
          if (!routerImports.includes("useRouter")) {
            routerImports.push("useRouter");
          }
        } else if (imp === "redirect") {
          removedImports.push(imp);
        } else {
          routerImports.push(imp);
        }
      }

      let replacement = "";
      if (routerImports.length > 0) {
        replacement = `import { ${routerImports.join(", ")} } from "next/router";\n`;
      }
      return replacement;
    },
  );

  // Replace usePathname() with useRouter().pathname
  // This is tricky because usePathname might be called at top level
  result = result.replace(
    /const\s+(\w+)\s*=\s*usePathname\(\)/g,
    "const { pathname: $1 } = useRouter()",
  );

  // Replace useParams() with useRouter().query
  result = result.replace(
    /const\s*\{([^}]+)\}\s*=\s*useParams\(\)/g,
    (match, params) => {
      return `const { ${params} } = useRouter().query as Record<string, string>`;
    },
  );

  // Replace useSearchParams() with useRouter().query
  result = result.replace(
    /const\s+(\w+)\s*=\s*useSearchParams\(\)/g,
    (match, varName) => {
      return `const ${varName} = new URLSearchParams(useRouter().asPath.split("?")[1] || "")`;
    },
  );

  // Replace redirect() with router.push (for simple redirect pages)
  if (result.includes("redirect(")) {
    // For pages that are just redirects, create a simple redirect page
    const redirectMatch = result.match(/redirect\(["']([^"']+)["']\)/);
    if (redirectMatch) {
      const redirectTarget = redirectMatch[1];
      return `import { useEffect } from "react";
import { useRouter } from "next/router";

export default function RedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("${redirectTarget}");
  }, [router]);
  return null;
}
`;
    }
  }

  // Find the default export function name
  const exportMatch = result.match(/export\s+default\s+function\s+(\w+)/);
  if (!exportMatch) {
    console.warn(
      `  WARNING: No default export function found in ${targetPath}`,
    );
    return result;
  }

  const funcName = exportMatch[0].replace("export default function ", "");

  if (layout === "admin" || layout === "portal" || layout === "auth") {
    // Check if ReactElement is already imported
    const hasReactElementImport = result.includes("ReactElement");

    // Add layout imports
    let layoutImport = "";
    if (layout === "admin") {
      layoutImport = `import AdminLayout from "@/components/layouts/AdminLayout";\n`;
    } else if (layout === "portal") {
      layoutImport = `import PortalLayout from "@/components/layouts/PortalLayout";\n`;
    } else if (layout === "auth") {
      layoutImport = `import { Center } from "@mantine/core";\n`;
    }

    const typeImport = `import type { ReactElement } from "react";\nimport type { NextPageWithLayout } from "@/lib/page-types";\n`;

    // Insert imports after existing imports
    const lines = result.split("\n");
    let lastImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].startsWith("import ") ||
        (lastImportLine >= 0 && lines[i].match(/^\s*(from|}\s*from)/))
      ) {
        lastImportLine = i;
      }
    }

    if (lastImportLine >= 0) {
      lines.splice(lastImportLine + 1, 0, typeImport + layoutImport);
      result = lines.join("\n");
    }

    // Change export default function to const
    result = result.replace(
      /export\s+default\s+function\s+(\w+)/,
      `const $1: NextPageWithLayout = function $1`,
    );

    // Add getLayout and export at the end
    let layoutWrapper = "";
    if (layout === "admin") {
      layoutWrapper = `\n${funcName}.getLayout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>;\n`;
    } else if (layout === "portal") {
      layoutWrapper = `\n${funcName}.getLayout = (page: ReactElement) => <PortalLayout>{page}</PortalLayout>;\n`;
    } else if (layout === "auth") {
      layoutWrapper = `\n${funcName}.getLayout = (page: ReactElement) => <Center mih="100vh" bg="gray.0">{page}</Center>;\n`;
    }

    result =
      result.trimEnd() + layoutWrapper + `\nexport default ${funcName};\n`;
  }

  return result;
}

// Main
console.log("=== Migrating Pages ===\n");

let count = 0;
let skipped = 0;

for (const [source, target, layout] of PAGE_MAP) {
  const sourcePath = join(APP_DIR, source);
  const targetPath = join(PAGES_DIR, target);

  if (!existsSync(sourcePath)) {
    console.log(`  SKIP (not found): ${source}`);
    skipped++;
    continue;
  }

  mkdirSync(dirname(targetPath), { recursive: true });

  const content = readFileSync(sourcePath, "utf-8");
  const transformed = transformPageContent(content, layout, target);

  writeFileSync(targetPath, transformed);
  count++;
  console.log(`  [${count}] ${source} -> ${target} (${layout})`);
}

console.log(`\n=== Done! Migrated ${count} pages (${skipped} skipped) ===`);

// Create root index page (redirect to /admin/login)
const rootIndex = `import { useEffect } from "react";
import { useRouter } from "next/router";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/login");
  }, [router]);
  return null;
}
`;
writeFileSync(join(PAGES_DIR, "index.tsx"), rootIndex);
console.log("\nCreated root index.tsx (redirect to /admin/login)");

// Create admin index (redirect to dashboard)
const adminIndex = `import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);
  return null;
}
`;
mkdirSync(join(PAGES_DIR, "admin"), { recursive: true });
writeFileSync(join(PAGES_DIR, "admin/index.tsx"), adminIndex);
console.log("Created admin/index.tsx (redirect to /admin/dashboard)");
