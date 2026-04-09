import type { z } from "zod";

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

export function zodResolver<T extends z.ZodType>(
  schema: T,
  t: TranslationFn,
) {
  return (values: z.infer<T>): Record<string, string | null> => {
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
      if (issue.type === "string" && issue.minimum === 1) {
        return t("validation.required");
      }
      if (issue.type === "string") {
        return t("validation.minLength", { min: issue.minimum as number });
      }
      if (issue.type === "number") {
        return t("validation.min", { min: issue.minimum as number });
      }
      if (issue.type === "array") {
        return t("validation.required");
      }
      return t("validation.required");
    case "too_big":
      if (issue.type === "string") {
        return t("validation.maxLength", { max: issue.maximum as number });
      }
      return t("validation.max", { max: issue.maximum as number });
    case "invalid_string":
      if (issue.validation === "email") {
        return t("validation.email");
      }
      return t("validation.invalidFormat", { field });
    case "invalid_type":
      if (issue.expected === "number") return t("validation.number");
      if (issue.expected === "date") return t("validation.date");
      return t("validation.required");
    case "invalid_enum_value":
      return t("validation.invalidFormat", { field });
    case "custom":
      return issue.message || t("validation.required");
    default:
      return t("validation.required");
  }
}
