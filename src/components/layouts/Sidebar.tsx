"use client";

import {
  Avatar,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  NavLink,
  PasswordInput,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBuilding,
  IconCalendar,
  IconCash,
  IconChartBar,
  IconCheck,
  IconCreditCard,
  IconDiscount,
  IconGift,
  IconHome,
  IconKey,
  IconLogout,
  IconReceipt,
  IconReportAnalytics,
  IconSchool,
  IconSearch,
  IconSettings,
  IconUser,
  IconUserCircle,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useAuth, useChangePassword } from "@/hooks/useAuth";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  children?: NavItem[];
}

export default function Sidebar() {
  const { pathname } = useRouter();
  const { user, logout, isLoading } = useAuth();
  const t = useTranslations("admin");
  const tCommon = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [
    passwordModalOpened,
    { open: openPasswordModal, close: closePasswordModal },
  ] = useDisclosure(false);
  const [
    profileModalOpened,
    { open: openProfileModal, close: closeProfileModal },
  ] = useDisclosure(false);
  const changePassword = useChangePassword();

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      currentPassword: (value) =>
        value.length < 1 ? tCommon("auth.passwordRequired") : null,
      newPassword: (value) =>
        value.length < 6 ? tCommon("auth.newPasswordMinChars") : null,
      confirmPassword: (value, values) =>
        value !== values.newPassword
          ? tCommon("auth.passwordsDoNotMatch")
          : null,
    },
  });

  const handleChangePassword = (values: typeof form.values) => {
    changePassword.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          notifications.show({
            title: tCommon("common.confirm"),
            message: tCommon("auth.passwordChanged"),
            color: "green",
            icon: <IconCheck size={16} />,
          });
          form.reset();
          closePasswordModal();
        },
        onError: (error) => {
          notifications.show({
            title: tCommon("common.error"),
            message:
              error instanceof Error
                ? error.message
                : tCommon("auth.passwordChangeError"),
            color: "red",
          });
        },
      },
    );
  };

  const adminLinks: NavItem[] = [
    { icon: IconHome, label: t("dashboard"), href: "/admin/dashboard" },
    { icon: IconUsers, label: t("employees"), href: "/admin/employees" },
    { icon: IconSchool, label: t("students"), href: "/admin/students" },
    {
      icon: IconCalendar,
      label: t("academicYears"),
      href: "/admin/academic-years",
    },
    { icon: IconBuilding, label: t("classes"), href: "/admin/classes" },
    { icon: IconCash, label: t("tuitions"), href: "/admin/tuitions" },
    { icon: IconGift, label: t("scholarships"), href: "/admin/scholarships" },
    { icon: IconDiscount, label: t("discounts"), href: "/admin/discounts" },
    { icon: IconReceipt, label: t("payments"), href: "/admin/payments" },
    {
      icon: IconCreditCard,
      label: t("onlinePayments"),
      href: "/admin/online-payments",
    },
    {
      icon: IconUserCircle,
      label: t("studentAccounts"),
      href: "/admin/student-accounts",
    },
    {
      icon: IconSettings,
      label: t("paymentSettings"),
      href: "/admin/payment-settings",
    },
    {
      icon: IconReportAnalytics,
      label: t("reports"),
      children: [
        {
          icon: IconAlertTriangle,
          label: t("overdueReport"),
          href: "/admin/reports/overdue",
        },
        {
          icon: IconChartBar,
          label: t("classSummary"),
          href: "/admin/reports/class-summary",
        },
      ],
    },
  ];

  const cashierLinks: NavItem[] = [
    { icon: IconHome, label: t("dashboard"), href: "/admin/dashboard" },
    { icon: IconSchool, label: t("students"), href: "/admin/students" },
    { icon: IconReceipt, label: t("payments"), href: "/admin/payments" },
    {
      icon: IconReportAnalytics,
      label: t("reports"),
      children: [
        {
          icon: IconAlertTriangle,
          label: t("overdueReport"),
          href: "/admin/reports/overdue",
        },
        {
          icon: IconChartBar,
          label: t("classSummary"),
          href: "/admin/reports/class-summary",
        },
      ],
    },
  ];

  const links = user?.role === "ADMIN" ? adminLinks : cashierLinks;

  const [search, setSearch] = useState("");

  const filteredLinks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return links;

    return links.reduce<NavItem[]>((acc, item) => {
      const parentMatches = item.label.toLowerCase().includes(query);

      if (item.children) {
        if (parentMatches) {
          acc.push(item);
        } else {
          const matchingChildren = item.children.filter((child) =>
            child.label.toLowerCase().includes(query),
          );
          if (matchingChildren.length > 0) {
            acc.push({ ...item, children: matchingChildren });
          }
        }
      } else if (parentMatches) {
        acc.push(item);
      }

      return acc;
    }, []);
  }, [links, search]);

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin" || pathname === "/admin/dashboard";
    }
    return pathname.startsWith(href);
  };

  const hasActiveChild = (children?: NavItem[]) => {
    return children?.some((child) => child.href && isActive(child.href));
  };

  return (
    <Stack h="100%" gap="xs" style={{ flex: 1 }}>
      <TextInput
        placeholder={t("searchMenu")}
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />

      <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
        <nav>
          {filteredLinks.map((link) => {
            if (link.children) {
              return (
                <NavLink
                  key={link.label}
                  label={link.label}
                  leftSection={<link.icon size={20} />}
                  defaultOpened={hasActiveChild(link.children)}
                  childrenOffset={28}
                >
                  {link.children.map((child) => (
                    <NavLink
                      key={child.href}
                      component={Link}
                      href={child.href!}
                      label={child.label}
                      leftSection={<child.icon size={18} />}
                      active={isActive(child.href!)}
                    />
                  ))}
                </NavLink>
              );
            }

            return (
              <NavLink
                key={link.href}
                component={Link}
                href={link.href!}
                label={link.label}
                leftSection={<link.icon size={20} />}
                active={isActive(link.href!)}
              />
            );
          })}
        </nav>
      </ScrollArea>

      <Box>
        <Divider mb="xs" />
        <Menu shadow="md" width={220} position="top-end" withinPortal>
          <Menu.Target>
            <UnstyledButton
              style={{ display: "block", width: "100%", padding: 4 }}
            >
              <Group gap="xs" wrap="nowrap">
                {!mounted || isLoading ? (
                  <>
                    <Skeleton circle height={32} width={32} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Skeleton height={14} width={80} mb={4} />
                      <Skeleton height={10} width={50} />
                    </Box>
                  </>
                ) : (
                  <>
                    <Avatar size="sm" radius="xl" color="blue">
                      {user?.name?.charAt(0).toUpperCase() || "?"}
                    </Avatar>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>
                        {user?.name || "User"}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {user?.role || "Guest"}
                      </Text>
                    </Box>
                  </>
                )}
              </Group>
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconUser size={14} />}
              onClick={openProfileModal}
            >
              {tCommon("auth.profile")}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconKey size={14} />}
              onClick={openPasswordModal}
            >
              {tCommon("auth.changePassword")}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={14} />}
              onClick={logout}
            >
              {tCommon("auth.logout")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <Text size="xs" c="dimmed" ta="center" mt="xs">
          v{process.env.APP_VERSION}
        </Text>
      </Box>

      <Modal
        opened={profileModalOpened}
        onClose={closeProfileModal}
        title={tCommon("auth.profile")}
      >
        <Stack gap="md">
          <Group justify="center">
            <Avatar size="xl" radius="xl" color="blue">
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </Avatar>
          </Group>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {tCommon("common.name")}
              </Text>
              <Text size="sm" fw={500}>
                {user?.name || "-"}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {tCommon("auth.email")}
              </Text>
              <Text size="sm" fw={500}>
                {user?.email || "-"}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {tCommon("employee.role")}
              </Text>
              <Text size="sm" fw={500}>
                {user?.role || "-"}
              </Text>
            </Group>
          </Stack>
        </Stack>
      </Modal>

      <Modal
        opened={passwordModalOpened}
        onClose={closePasswordModal}
        title={tCommon("auth.changePassword")}
      >
        <form onSubmit={form.onSubmit(handleChangePassword)}>
          <Stack gap="md">
            <PasswordInput
              label={tCommon("auth.currentPassword")}
              placeholder={tCommon("auth.currentPassword")}
              required
              {...form.getInputProps("currentPassword")}
            />
            <PasswordInput
              label={tCommon("auth.newPassword")}
              placeholder={tCommon("auth.newPassword")}
              required
              {...form.getInputProps("newPassword")}
            />
            <PasswordInput
              label={tCommon("auth.confirmPassword")}
              placeholder={tCommon("auth.confirmPassword")}
              required
              {...form.getInputProps("confirmPassword")}
            />
            <Group justify="flex-end">
              <Button variant="outline" onClick={closePasswordModal}>
                {tCommon("common.cancel")}
              </Button>
              <Button type="submit" loading={changePassword.isPending}>
                {tCommon("auth.changePassword")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
