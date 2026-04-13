import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";

type ParamValue = string | number | null | undefined;

export function useQueryParams() {
  const router = useRouter();

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(router.query)) {
      if (typeof value === "string") {
        params.set(key, value);
      }
    }
    return params;
  }, [router.query]);

  const setParams = useCallback(
    (updates: Record<string, ParamValue>) => {
      const query = { ...router.query };

      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") {
          delete query[key];
        } else {
          query[key] = String(value);
        }
      }

      router.replace({ pathname: router.pathname, query }, undefined, {
        shallow: true,
        scroll: false,
      });
    },
    [router],
  );

  const getParam = useCallback(
    (key: string, defaultValue?: string): string | undefined => {
      const val = router.query[key];
      return typeof val === "string" ? val : defaultValue;
    },
    [router.query],
  );

  const getNumParam = useCallback(
    (key: string, defaultValue?: number): number | undefined => {
      const val = router.query[key];
      return typeof val === "string" ? Number(val) : defaultValue;
    },
    [router.query],
  );

  return { setParams, getParam, getNumParam, searchParams };
}
