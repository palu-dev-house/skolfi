import type { z } from "zod";

type TranslationFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function zodResolver<T extends z.ZodType>(schema: T, t: TranslationFn) {
  // biome-ignore lint/suspicious/noExplicitAny: resolver must accept any Mantine form values shape
  return (values: any): Record<string, string | null> => {
    const result = schema.safeParse(values);
    if (result.success) return {};

    const errors: Record<string, string | null> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join(".");
      if (!errors[field]) {
        errors[field] = mapZodErrorToTranslation(issue, t, field);
      }
    }
    return errors;
  };
}

function mapZodErrorToTranslation(
  issue: z.ZodIssue,
  t: TranslationFn,
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
      if (issue.expected === "number") return t("validation.number");
      if (issue.expected === "date") return t("validation.date");
      return t("validation.required");
    case "invalid_value":
      return t("validation.invalidFormat", { field });
    case "custom":
      return issue.message || t("validation.required");
    default:
      return t("validation.required");
  }
}
