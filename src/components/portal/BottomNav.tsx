"use client";

import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import {
  IconCreditCard,
  IconHistory,
  IconHome,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/portal", labelKey: "nav.home", icon: IconHome },
  { href: "/portal/payment", labelKey: "nav.payment", icon: IconCreditCard },
  { href: "/portal/history", labelKey: "nav.history", icon: IconHistory },
  {
    href: "/portal/change-password",
    labelKey: "nav.settings",
    icon: IconSettings,
  },
];

export function BottomNav() {
  const { pathname } = useRouter();
  const t = useTranslations();

  return (
    <Box
      hiddenFrom="sm"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        backgroundColor: "white",
        borderTop: "1px solid var(--mantine-color-gray-2)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <Group grow gap={0} h={60}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <UnstyledButton
              key={item.href}
              component={Link}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 44,
                color: isActive
                  ? "var(--mantine-color-blue-6)"
                  : "var(--mantine-color-gray-6)",
              }}
            >
              <Icon size={22} stroke={isActive ? 2.5 : 1.5} />
              {isActive && (
                <Text size="xs" fw={600} mt={2}>
                  {t(item.labelKey)}
                </Text>
              )}
            </UnstyledButton>
          );
        })}
      </Group>
    </Box>
  );
}
