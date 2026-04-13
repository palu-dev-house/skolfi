import type { z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";

export async function parseWithLocale<T extends z.ZodType>(
  schema: T,
  data: unknown,
  request: Request,
): Promise<
  { success: true; data: z.infer<T> } | { success: false; response: Response }
> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const t = await getServerT(request);

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".");
    if (!fieldErrors[field]) {
      fieldErrors[field] = mapZodErrorToTranslation(issue, t, field);
    }
  }

  return {
    success: false,
    response: errorResponse(
      t("api.requiredFields"),
      "VALIDATION_ERROR",
      400,
      fieldErrors,
    ),
  };
}

function mapZodErrorToTranslation(
  issue: z.ZodIssue,
  t: (key: string, params?: Record<string, string | number>) => string,
  field: string,
): string {
  switch (issue.code) {
    case "too_small":
      if (issue.origin === "string" && Number(issue.minimum) === 1) {
        return t("validation.required");
      }
      if (issue.origin === "string") {
        return t("validation.minLength", { min: Number(issue.minimum) });
      }
      if (issue.origin === "number" || issue.origin === "int") {
        return t("validation.min", { min: Number(issue.minimum) });
      }
      if (issue.origin === "array" || issue.origin === "set") {
        return t("validation.required");
      }
      return t("validation.required");
    case "too_big":
      if (issue.origin === "string") {
        return t("validation.maxLength", { max: Number(issue.maximum) });
      }
      return t("validation.max", { max: Number(issue.maximum) });
    case "invalid_format":
      if (issue.format === "email") {
        return t("validation.email");
      }
      return t("validation.invalidFormat", { field });
    case "invalid_type":
      if (issue.expected === "number") {
        return t("validation.number");
      }
      if (issue.expected === "date") {
        return t("validation.date");
      }
      return t("validation.required");
    case "invalid_value":
      return t("validation.invalidFormat", { field });
    case "custom":
      return issue.message || t("validation.required");
    default:
      return t("validation.required");
  }
}
