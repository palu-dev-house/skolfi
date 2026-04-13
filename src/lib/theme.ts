"use client";

import { createTheme } from "@mantine/core";

export function createAppTheme(fontFamily: string) {
  return createTheme({
    fontFamily,
    headings: { fontFamily },
  });
}
