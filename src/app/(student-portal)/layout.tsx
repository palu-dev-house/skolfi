"use client";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./portal.css";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Button,
  Group,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconCreditCard,
  IconHistory,
  IconHome,
  IconKey,
  IconLogout,
  IconSchool,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { BottomNav } from "@/components/portal/BottomNav";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { LoadingAnimation } from "@/components/ui/LottieAnimation";
import { useStudentLogout, useStudentMe } from "@/hooks/api/useStudentAuth";

const navLinks = [
  { href: "/portal", labelKey: "nav.home", icon: IconHome, color: "teal" },
  {
    href: "/portal/payment",
    labelKey: "nav.payment",
    icon: IconCreditCard,
    color: "teal",
  },
  {
    href: "/portal/history",
    labelKey: "nav.history",
    icon: IconHistory,
    color: "teal",
  },
  {
    href: "/portal/change-password",
    labelKey: "nav.changePassword",
    icon: IconKey,
    color: "teal",
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "morning";
  if (hour < 15) return "afternoon";
  if (hour < 18) return "evening";
  return "night";
}

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const isLoginPage = pathname === "/portal/login";

  const {
    data: userData,
    isLoading: loading,
    isError,
  } = useStudentMe({
    enabled: !isLoginPage,
  });
  const logout = useStudentLogout();

  useEffect(() => {
    if (!isLoginPage && !loading && (isError || !userData)) {
      router.push("/portal/login");
    }
  }, [isLoginPage, loading, isError, userData, router]);

  const user = userData
    ? { studentNis: userData.nis, studentName: userData.name }
    : null;

  const handleLogout = () => {
    modals.openConfirmModal({
      title: t("common.confirm"),
      children: <Text size="sm">{t("auth.logoutConfirm")}</Text>,
      labels: {
        confirm: `${t("common.yes")}, ${t("auth.logout")}`,
        cancel: t("common.cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: () => logout.mutate(),
    });
  };

  if (isLoginPage) return children;

  if (loading) {
    return (
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--portal-bg)",
        }}
      >
        <LoadingAnimation />
      </Box>
    );
  }

  return (
    <AppShell
      className="portal-shell"
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: true },
      }}
      padding="md"
    >
      {/* Header */}
      <AppShell.Header className="portal-header">
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Box
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSchool size={20} color="white" />
            </Box>
            <Box visibleFrom="xs">
              <Text size="sm" fw={700} c="white" lh={1.2}>
                {t("portal.title")}
              </Text>
              <Text size="xs" c="white" opacity={0.75} lh={1.2}>
                {t("portal.subtitle")}
              </Text>
            </Box>
          </Group>
          <Group gap="sm">
            <Box visibleFrom="sm" ta="right">
              <Text size="xs" c="white" opacity={0.75}>
                {t(`portal.greeting.${getGreetingKey()}`)}
              </Text>
              <Text size="sm" fw={600} c="white">
                {user?.studentName}
              </Text>
            </Box>
            <Avatar
              radius="xl"
              size={36}
              styles={{
                root: {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                },
              }}
            >
              {user?.studentName ? (
                getInitials(user.studentName)
              ) : (
                <IconUser size={16} />
              )}
            </Avatar>
            <LanguageSwitcher />
            <ActionIcon
              variant="subtle"
              color="white"
              size="lg"
              onClick={handleLogout}
              title={t("auth.logout")}
              visibleFrom="sm"
            >
              <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Sidebar */}
      <AppShell.Navbar className="portal-nav" p="md" component={ScrollArea}>
        <Stack gap="md" style={{ flex: 1 }}>
          {/* Mobile user card */}
          <Box hiddenFrom="sm">
            <Box
              className="portal-card-accent"
              p="md"
              style={{ borderRadius: "var(--portal-radius-sm)" }}
            >
              <Group gap="sm" style={{ position: "relative", zIndex: 1 }}>
                <Avatar
                  radius="xl"
                  size="lg"
                  styles={{
                    root: {
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "white",
                      fontWeight: 700,
                    },
                  }}
                >
                  {user?.studentName ? (
                    getInitials(user.studentName)
                  ) : (
                    <IconUser size={20} />
                  )}
                </Avatar>
                <Box>
                  <Text size="xs" c="white" opacity={0.8}>
                    {t(`portal.greeting.${getGreetingKey()}`)}
                  </Text>
                  <Text size="sm" fw={700} c="white">
                    {user?.studentName}
                  </Text>
                  <Text size="xs" c="white" opacity={0.6}>
                    NIS: {user?.studentNis}
                  </Text>
                </Box>
              </Group>
            </Box>
          </Box>

          <Text
            size="xs"
            fw={700}
            c="dimmed"
            tt="uppercase"
            px="xs"
            style={{ letterSpacing: "0.06em" }}
          >
            {t("nav.mainMenu")}
          </Text>

          <Stack gap={4}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <UnstyledButton
                  key={link.href}
                  component={Link}
                  href={link.href}
                  className="portal-nav-item"
                  data-active={isActive}
                  style={{
                    background: isActive
                      ? "var(--portal-gradient-subtle)"
                      : "transparent",
                    borderLeft: isActive
                      ? "3px solid var(--portal-accent)"
                      : "3px solid transparent",
                  }}
                >
                  <Group gap="sm">
                    <Box
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isActive
                          ? "var(--portal-gradient)"
                          : "var(--portal-gradient-subtle)",
                        color: isActive ? "white" : "var(--portal-accent)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <link.icon size={18} />
                    </Box>
                    <Text
                      size="sm"
                      fw={isActive ? 700 : 500}
                      c={isActive ? "var(--portal-accent-dark)" : "dark"}
                    >
                      {t(link.labelKey)}
                    </Text>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>

          <Box style={{ flex: 1 }} />

          <Button
            variant="light"
            color="red"
            leftSection={<IconLogout size={18} />}
            onClick={handleLogout}
            hiddenFrom="sm"
            radius="md"
          >
            {t("auth.logout")}
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main className="portal-main">
        <Box pb={{ base: 80, sm: 0 }}>{children}</Box>
      </AppShell.Main>
      <BottomNav />
    </AppShell>
  );
}
