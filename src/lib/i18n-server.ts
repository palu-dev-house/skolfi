import type { NextRequest } from "next/server";

type Messages = Record<
  string,
  string | Record<string, string | Record<string, string>>
>;

const messagesCache: Record<string, Messages> = {};

async function loadMessages(locale: string): Promise<Messages> {
  if (messagesCache[locale]) return messagesCache[locale];
  const messages = (await import(`@/messages/${locale}.json`)).default;
  messagesCache[locale] = messages;
  return messages;
}

function getNestedValue(obj: Messages, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`,
  );
}

export type ServerT = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export async function getServerT(request: NextRequest): Promise<ServerT> {
  const locale = request.cookies.get("NEXT_LOCALE")?.value;
  const validLocale = locale === "en" ? "en" : "id";
  const messages = await loadMessages(validLocale);

  return (key: string, params?: Record<string, string | number>) => {
    const value = getNestedValue(messages, key);
    return params ? interpolate(value, params) : value;
  };
}
