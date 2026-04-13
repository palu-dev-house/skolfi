#!/usr/bin/env node
/**
 * Migration script: App Router -> Pages Router
 *
 * Transforms API route.ts files into Pages Router compatible format:
 * - Copies to src/pages/api/ directory
 * - Removes `export` from handler functions (GET, POST, PUT, DELETE, PATCH)
 * - Adds createApiHandler wrapper
 * - Preserves all other code unchanged
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join, relative } from "path";

const PROJECT_ROOT = dirname(dirname(new URL(import.meta.url).pathname));
const APP_API_DIR = join(PROJECT_ROOT, "src/app/api");
const PAGES_API_DIR = join(PROJECT_ROOT, "src/pages/api");

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

function findRouteFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.name === "route.ts") {
      results.push(fullPath);
    }
  }
  return results;
}

function transformRouteFile(content) {
  const foundMethods = [];
  let transformed = content;

  // Find which methods are exported
  for (const method of METHODS) {
    const exportPattern = new RegExp(
      `export\\s+async\\s+function\\s+${method}\\b`,
    );
    if (exportPattern.test(transformed)) {
      foundMethods.push(method);
      // Remove 'export' keyword
      transformed = transformed.replace(
        new RegExp(`export\\s+(async\\s+function\\s+${method}\\b)`),
        "$1",
      );
    }
  }

  if (foundMethods.length === 0) {
    console.warn("  WARNING: No handler methods found!");
    return content;
  }

  // Add createApiHandler import after existing imports
  const hasAdapterImport = transformed.includes("createApiHandler");
  if (!hasAdapterImport) {
    // Find the last import statement
    const importLines = transformed.split("\n");
    let lastImportIndex = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (
        importLines[i].startsWith("import ") ||
        importLines[i].startsWith("import{")
      ) {
        lastImportIndex = i;
      }
      // Handle multi-line imports
      if (
        lastImportIndex >= 0 &&
        !importLines[lastImportIndex].includes(";") &&
        !importLines[lastImportIndex].includes("from")
      ) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      // Find the actual end of the last import (might span multiple lines)
      let insertIndex = lastImportIndex;
      while (
        insertIndex < importLines.length &&
        !importLines[insertIndex].includes("from") &&
        !importLines[insertIndex].includes(";")
      ) {
        insertIndex++;
      }
      importLines.splice(
        insertIndex + 1,
        0,
        'import { createApiHandler } from "@/lib/api-adapter";',
      );
      transformed = importLines.join("\n");
    }
  }

  // Add export default at the end
  const methodList = foundMethods.join(", ");
  transformed =
    transformed.trimEnd() +
    `\n\nexport default createApiHandler({ ${methodList} });\n`;

  return transformed;
}

// Main
console.log("=== Migrating API Routes ===\n");

const routeFiles = findRouteFiles(APP_API_DIR);
console.log(`Found ${routeFiles.length} route files\n`);

let count = 0;
for (const routeFile of routeFiles) {
  const relPath = relative(APP_API_DIR, routeFile);
  // route.ts -> parent directory becomes the API endpoint
  const dirPath = dirname(relPath);

  // Target: src/pages/api/{dirPath}/index.ts
  const targetDir = join(PAGES_API_DIR, dirPath);
  const targetFile = join(targetDir, "index.ts");

  mkdirSync(targetDir, { recursive: true });

  const content = readFileSync(routeFile, "utf-8");
  const transformed = transformRouteFile(content);

  writeFileSync(targetFile, transformed);
  count++;

  // Find methods for logging
  const methods = METHODS.filter((m) =>
    new RegExp(`async\\s+function\\s+${m}\\b`).test(transformed),
  );
  console.log(`  [${count}] ${dirPath} -> ${methods.join(", ")}`);
}

console.log(`\n=== Done! Migrated ${count} API routes ===`);
