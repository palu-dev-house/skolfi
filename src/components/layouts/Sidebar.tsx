"use client";

import {
  Accordion,
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
  IconBus,
  IconCalendar,
  IconCash,
  IconChartBar,
  IconCheck,
  IconCoin,
  IconDiscount,
  IconGift,
  IconHelp,
  IconHome,
  IconKey,
  IconLogout,
  IconPackage,
  IconPrinter,
  IconReceipt,
  IconReceipt2,
  IconReportAnalytics,
  IconSchool,
  IconSearch,
  IconUser,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
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

  interface NavGroup {
    key: string;
    icon: React.ElementType;
    label: string;
    items: NavItem[];
  }

  const tSidebar = useTranslations("sidebar.groups");

  const adminGroups: NavGroup[] = [
    {
      key: "main",
      icon: IconHome,
      label: tSidebar("main"),
      items: [
        { icon: IconHome, label: t("dashboard"), href: "/admin/dashboard" },
        { icon: IconReceipt, label: t("payments"), href: "/admin/payments" },
        {
          icon: IconReceipt2,
          label: t("feeBills"),
          href: "/admin/fee-bills",
        },
        { icon: IconSchool, label: t("students"), href: "/admin/students" },
      ],
    },
    {
      key: "academic",
      icon: IconCalendar,
      label: tSidebar("academic"),
      items: [
        {
          icon: IconCalendar,
          label: t("academicYears"),
          href: "/admin/academic-years",
        },
        { icon: IconBuilding, label: t("classes"), href: "/admin/classes" },
      ],
    },
    {
      key: "finance",
      icon: IconWallet,
      label: tSidebar("finance"),
      items: [
        { icon: IconCash, label: t("tuitions"), href: "/admin/tuitions" },
        {
          icon: IconDiscount,
          label: t("discounts"),
          href: "/admin/discounts",
        },
        {
          icon: IconGift,
          label: t("scholarships"),
          href: "/admin/scholarships",
        },
        {
          icon: IconPackage,
          label: t("serviceFees"),
          href: "/admin/service-fees",
        },
        {
          icon: IconBus,
          label: t("feeServices"),
          href: "/admin/fee-services",
        },
      ],
    },
    {
      key: "reports",
      icon: IconReportAnalytics,
      label: tSidebar("reports"),
      items: [
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
        {
          icon: IconBus,
          label: t("feeServiceSummary"),
          href: "/admin/reports/fee-services",
        },
        {
          icon: IconCoin,
          label: t("incomeReport"),
          href: "/admin/reports/income",
        },
        {
          icon: IconPrinter,
          label: t("paymentCardReport"),
          href: "/admin/payment-card",
        },
      ],
    },
    {
      key: "system",
      icon: IconUsers,
      label: tSidebar("system"),
      items: [
        { icon: IconUsers, label: t("employees"), href: "/admin/employees" },
        { icon: IconHelp, label: t("help"), href: "/admin/help" },
      ],
    },
  ];

  const cashierGroups: NavGroup[] = [
    {
      key: "main",
      icon: IconHome,
      label: tSidebar("main"),
      items: [
        { icon: IconHome, label: t("dashboard"), href: "/admin/dashboard" },
        { icon: IconReceipt, label: t("payments"), href: "/admin/payments" },
        {
          icon: IconReceipt2,
          label: t("feeBills"),
          href: "/admin/fee-bills",
        },
        { icon: IconSchool, label: t("students"), href: "/admin/students" },
      ],
    },
    {
      key: "reports",
      icon: IconReportAnalytics,
      label: tSidebar("reports"),
      items: [
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
        {
          icon: IconBus,
          label: t("feeServiceSummary"),
          href: "/admin/reports/fee-services",
        },
        {
          icon: IconCoin,
          label: t("incomeReport"),
          href: "/admin/reports/income",
        },
        {
          icon: IconPrinter,
          label: t("paymentCardReport"),
          href: "/admin/payment-card",
        },
      ],
    },
    {
      key: "system",
      icon: IconHelp,
      label: tSidebar("system"),
      items: [{ icon: IconHelp, label: t("help"), href: "/admin/help" }],
    },
  ];

  const groups = user?.role === "ADMIN" ? adminGroups : cashierGroups;

  const [search, setSearch] = useState("");

  const activeHref = useMemo(() => {
    const candidates: string[] = [];
    for (const group of groups) {
      for (const item of group.items) {
        if (item.href) candidates.push(item.href);
      }
    }
    const matching = candidates.filter(
      (href) => pathname === href || pathname.startsWith(`${href}/`),
    );
    if (matching.length === 0) {
      if (pathname === "/admin" || pathname === "/admin/dashboard") {
        return "/admin/dashboard";
      }
      return null;
    }
    return matching.reduce((a, b) => (b.length > a.length ? b : a));
  }, [groups, pathname]);

  const isActive = (href: string) => href === activeHref;

  // Persisted accordion state
  const STORAGE_KEY = "sidebar:openGroups";
  const [userOpenGroups, setUserOpenGroups] = useState<string[] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((v) => typeof v === "string");
        }
      }
    } catch {
      // ignore malformed storage
    }
    return null;
  });

  // Default (all open) computed from current groups; used only when
  // nothing has been persisted yet.
  const defaultOpenGroups = useMemo(() => groups.map((g) => g.key), [groups]);

  // Persist whenever user toggles
  useEffect(() => {
    if (userOpenGroups === null) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userOpenGroups));
    } catch {
      // ignore quota errors
    }
  }, [userOpenGroups]);

  // When navigating to a new route, auto-open the group containing the
  // active route. Only fires on route change (not re-renders), so users can
  // still collapse the active group afterwards.
  const lastAutoOpenedHref = useRef<string | null>(null);
  useEffect(() => {
    if (!activeHref) return;
    if (lastAutoOpenedHref.current === activeHref) return;
    lastAutoOpenedHref.current = activeHref;
    const activeGroup = groups.find((g) =>
      g.items.some((item) => item.href === activeHref),
    );
    if (!activeGroup) return;
    setUserOpenGroups((prev) => {
      const base = prev ?? defaultOpenGroups;
      if (base.includes(activeGroup.key)) return prev;
      return [...base, activeGroup.key];
    });
  }, [activeHref, groups, defaultOpenGroups]);

  const searching = search.trim().length > 0;

  // Flat filtered items (used while searching)
  const filteredFlatItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [] as NavItem[];
    const out: NavItem[] = [];
    for (const group of groups) {
      for (const item of group.items) {
        if (item.label.toLowerCase().includes(query)) {
          out.push(item);
        }
      }
    }
    return out;
  }, [groups, search]);

  const effectiveOpenGroups = useMemo(() => {
    if (searching) return defaultOpenGroups;
    return userOpenGroups ?? defaultOpenGroups;
  }, [defaultOpenGroups, userOpenGroups, searching]);

  const handleAccordionChange = (value: string[]) => {
    // While searching, don't let user toggles clobber the search-expand state.
    if (searching) return;
    setUserOpenGroups(value);
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
          {searching ? (
            <Stack gap={0}>
              {filteredFlatItems.length === 0 ? (
                <Text size="sm" c="dimmed" p="sm">
                  {tCommon("common.noResults")}
                </Text>
              ) : (
                filteredFlatItems.map((item) => (
                  <NavLink
                    key={item.href}
                    component={Link}
                    href={item.href!}
                    label={item.label}
                    leftSection={<item.icon size={20} />}
                    active={isActive(item.href!)}
                  />
                ))
              )}
            </Stack>
          ) : (
            <Accordion
              multiple
              value={effectiveOpenGroups}
              onChange={handleAccordionChange}
              chevronPosition="right"
              variant="default"
              styles={{
                control: {
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 6,
                  paddingBottom: 6,
                },
                label: {
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: "var(--mantine-color-dimmed)",
                },
                content: { padding: 0, paddingLeft: 6 },
                item: {
                  borderBottom: "none",
                  marginBottom: 2,
                },
                chevron: { color: "var(--mantine-color-dimmed)" },
              }}
            >
              {groups.map((group) => (
                <Accordion.Item key={group.key} value={group.key}>
                  <Accordion.Control
                    icon={
                      <group.icon
                        size={14}
                        color="var(--mantine-color-dimmed)"
                      />
                    }
                  >
                    {group.label}
                  </Accordion.Control>
                  <Accordion.Panel>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.href}
                        component={Link}
                        href={item.href!}
                        label={item.label}
                        leftSection={<item.icon size={18} />}
                        active={isActive(item.href!)}
                        style={{ borderRadius: 6 }}
                      />
                    ))}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
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
