#!/bin/bash
# Migration script: App Router -> Pages Router
# Moves API routes and wraps them with createApiHandler adapter

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$PROJECT_ROOT/src/app"
PAGES_DIR="$PROJECT_ROOT/src/pages"

echo "=== Migrating API Routes ==="

# Find all route.ts files under src/app/api/
find "$APP_DIR/api" -name "route.ts" | while read -r route_file; do
  # Get the relative path from src/app/api/
  rel_path="${route_file#$APP_DIR/api/}"
  # Remove /route.ts from the end to get the directory path
  dir_path="${rel_path%/route.ts}"

  # Create target directory
  target_dir="$PAGES_DIR/api/$dir_path"
  mkdir -p "$(dirname "$target_dir")"

  # If the route is at the root of a directory (e.g., students/route.ts)
  # it becomes students.ts or students/index.ts
  # We'll use index.ts to keep directory structure clean
  mkdir -p "$target_dir"
  target_file="$target_dir/index.ts"

  # But if there's only route.ts in a leaf directory (no subdirectories),
  # we can use a simpler path. For now, always use index.ts

  echo "  $rel_path -> api/$dir_path/index.ts"
  cp "$route_file" "$target_file"
done

echo ""
echo "=== API Routes copied. Total: $(find "$PAGES_DIR/api" -name "index.ts" | wc -l) ==="
echo ""
echo "Done! Now run the transform script to wrap handlers."
