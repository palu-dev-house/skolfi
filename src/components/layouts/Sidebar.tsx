"use client";

import { NavLink, Stack, Text, TextInput } from "@mantine/core";
import {
  IconAlertTriangle,
  IconBuilding,
  IconCalendar,
  IconCash,
  IconChartBar,
  IconCreditCard,
  IconDiscount,
  IconGift,
  IconHome,
  IconReceipt,
  IconReportAnalytics,
  IconSchool,
  IconSearch,
  IconSettings,
  IconUserCircle,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  children?: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations("admin");

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
    <Stack justify="space-between" h="100%">
      <nav>
        <TextInput
          placeholder={t("searchMenu")}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="xs"
        />
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
      <Text size="xs" c="dimmed" ta="center" py="sm">
        v{process.env.APP_VERSION}
      </Text>
    </Stack>
  );
}
