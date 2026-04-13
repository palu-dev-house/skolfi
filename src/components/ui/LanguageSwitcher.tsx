import { ActionIcon, Tooltip } from "@mantine/core";
import { useRouter } from "next/router";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/routing";

interface LanguageSwitcherProps {
  variant?: "subtle" | "light" | "filled";
  color?: string;
}

export function LanguageSwitcher({
  variant = "subtle",
  color = "white",
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();

  const toggleLocale = () => {
    const newLocale: Locale = locale === "id" ? "en" : "id";
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.reload();
  };

  const label = locale === "id" ? "EN" : "ID";
  const tooltipLabel =
    locale === "id" ? "Switch to English" : "Ganti ke Indonesia";

  return (
    <Tooltip label={tooltipLabel}>
      <ActionIcon
        variant={variant}
        color={color}
        size="lg"
        onClick={toggleLocale}
        style={{ fontWeight: 600, fontSize: 12 }}
      >
        {label}
      </ActionIcon>
    </Tooltip>
  );
}
