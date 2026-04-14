import {
  ActionIcon,
  Alert,
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
  IconAlertTriangle,
  IconCreditCard,
  IconHistory,
  IconHome,
  IconKey,
  IconLogout,
  IconSchool,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { BottomNav } from "@/components/portal/BottomNav";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { LoadingAnimation } from "@/components/ui/LottieAnimation";
import { useStudentLogout, useStudentMe } from "@/hooks/api/useStudentAuth";

const navLinks = [
  { href: "/portal", labelKey: "nav.home", icon: IconHome },
  { href: "/portal/payment", labelKey: "nav.payment", icon: IconCreditCard },
  { href: "/portal/history", labelKey: "nav.history", icon: IconHistory },
  {
    href: "/portal/change-password",
    labelKey: "nav.changePassword",
    icon: IconKey,
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

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = router.pathname;
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

  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--mantine-color-gray-0)",
        }}
      >
        <LoadingAnimation />
      </Box>
    );
  }

  return (
    <AppShell
      className="portal-shell"
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: "sm",
        collapsed: { mobile: true },
      }}
      padding="md"
    >
      {/* Header */}
      <AppShell.Header className="portal-header">
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <IconSchool size={22} color="white" />
            <Text size="sm" fw={700} c="white" visibleFrom="xs">
              {t("portal.title")}
            </Text>
          </Group>
          <Group gap="sm">
            <Box visibleFrom="sm" ta="right">
              <Text size="sm" fw={600} c="white">
                {user?.studentName}
              </Text>
            </Box>
            <Avatar
              radius="xl"
              size={32}
              color="white"
              variant="transparent"
              styles={{
                root: {
                  border: "1.5px solid rgba(255,255,255,0.4)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
                },
              }}
            >
              {user?.studentName ? (
                getInitials(user.studentName)
              ) : (
                <IconUser size={14} />
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
          {/* Mobile user info */}
          <Box
            hiddenFrom="sm"
            pb="sm"
            mb="sm"
            bd="0 0 1px 0 solid var(--mantine-color-gray-2)"
          >
            <Group gap="sm">
              <Avatar radius="xl" size="md" color="dark">
                {user?.studentName ? (
                  getInitials(user.studentName)
                ) : (
                  <IconUser size={16} />
                )}
              </Avatar>
              <Box>
                <Text size="sm" fw={600}>
                  {user?.studentName}
                </Text>
                <Text size="xs" c="dimmed">
                  NIS: {user?.studentNis}
                </Text>
              </Box>
            </Group>
          </Box>

          <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="xs">
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
                    borderLeft: isActive
                      ? "3px solid var(--mantine-color-blue-6)"
                      : "3px solid transparent",
                  }}
                >
                  <Group gap="sm">
                    <link.icon
                      size={18}
                      color={
                        isActive
                          ? "var(--mantine-color-blue-6)"
                          : "var(--mantine-color-gray-6)"
                      }
                    />
                    <Text
                      size="sm"
                      fw={isActive ? 600 : 400}
                      c={isActive ? "blue.7" : "dark"}
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

          <Text size="xs" c="dimmed" ta="center">
            v{process.env.APP_VERSION}
          </Text>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main className="portal-main">
        <Box className="portal-content">
          {userData?.exitedAt && (
            <Alert
              icon={<IconAlertTriangle size={18} />}
              color="yellow"
              mb="md"
            >
              {t("student.exit.portalBanner", {
                date: new Date(userData.exitedAt).toLocaleDateString(),
              })}
            </Alert>
          )}
          {children}
        </Box>
      </AppShell.Main>
      <BottomNav />
    </AppShell>
  );
}
