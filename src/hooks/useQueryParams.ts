"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type ParamValue = string | number | null | undefined;

export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, ParamValue>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const getParam = useCallback(
    (key: string, defaultValue?: string): string | undefined => {
      return searchParams.get(key) ?? defaultValue;
    },
    [searchParams],
  );

  const getNumParam = useCallback(
    (key: string, defaultValue?: number): number | undefined => {
      const val = searchParams.get(key);
      return val != null ? Number(val) : defaultValue;
    },
    [searchParams],
  );

  return { setParams, getParam, getNumParam, searchParams };
}
