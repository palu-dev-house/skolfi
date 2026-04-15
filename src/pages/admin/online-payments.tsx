import {
  Badge,
  Card,
  Group,
  NumberFormatter,
  Select,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconClockHour4,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { z } from "zod";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import TablePagination from "@/components/ui/TablePagination";
import {
  type AdminOnlinePayment,
  useAdminOnlinePayments,
} from "@/hooks/api/useAdminOnlinePayments";
import { useQueryFilters } from "@/hooks/useQueryFilters";
import type { NextPageWithLayout } from "@/lib/page-types";

const filterSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["PENDING", "SETTLEMENT", "EXPIRE", "CANCEL", "DENY", "FAILURE"])
    .optional(),
});

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "SETTLEMENT", label: "Settlement" },
  { value: "EXPIRE", label: "Expired" },
  { value: "CANCEL", label: "Cancelled" },
  { value: "DENY", label: "Denied" },
  { value: "FAILURE", label: "Failed" },
];

function getStatusColor(status: string) {
  switch (status) {
    case "SETTLEMENT":
      return "green";
    case "PENDING":
      return "yellow";
    case "EXPIRE":
    case "CANCEL":
      return "gray";
    case "DENY":
    case "FAILURE":
      return "red";
    default:
      return "blue";
  }
}

function statusNotificationMeta(status: string) {
  switch (status) {
    case "SETTLEMENT":
      return { color: "green", icon: <IconCheck size={18} /> };
    case "PENDING":
      return { color: "yellow", icon: <IconClockHour4 size={18} /> };
    case "EXPIRE":
    case "CANCEL":
      return { color: "gray", icon: <IconX size={18} /> };
    case "DENY":
    case "FAILURE":
      return { color: "red", icon: <IconX size={18} /> };
    default:
      return { color: "blue", icon: <IconClockHour4 size={18} /> };
  }
}

const OnlinePaymentsPage: NextPageWithLayout = function OnlinePaymentsPage() {
  const t = useTranslations();
  const { filters, page, drafts, setFilter, setPage } = useQueryFilters({
    schema: filterSchema,
    defaultLimit: 10,
  });
  const search = filters.search ?? "";
  const status = filters.status ?? "";
  const searchDraft = drafts.search ?? search;

  const { data, isLoading } = useAdminOnlinePayments(
    {
      page,
      limit: 10,
      search: search || undefined,
      status: status || undefined,
    },
    { refetchInterval: 15_000 },
  );

  const seenStatusRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!data?.payments) return;
    const seen = seenStatusRef.current;
    const isFirstRun = seen.size === 0;
    for (const p of data.payments) {
      const prev = seen.get(p.id);
      seen.set(p.id, p.status);
      if (isFirstRun) continue;
      if (prev && prev !== p.status) {
        const meta = statusNotificationMeta(p.status);
        notifications.show({
          color: meta.color,
          icon: meta.icon,
          title: t("onlinePayment.statusChanged"),
          message: t("onlinePayment.statusChangedMessage", {
            student: p.student.name,
            from: prev,
            to: p.status,
          }),
        });
      } else if (!prev) {
        const meta = statusNotificationMeta(p.status);
        notifications.show({
          color: meta.color,
          icon: meta.icon,
          title: t("onlinePayment.newPayment"),
          message: t("onlinePayment.newPaymentMessage", {
            student: p.student.name,
            status: p.status,
          }),
        });
      }
    }
  }, [data, t]);

  return (
    <>
      <PageHeader
        title={t("admin.onlinePayments")}
        description={t("onlinePayment.adminDescription")}
      />

      <Card withBorder>
        <Group mb="md" gap="sm">
          <TextInput
            placeholder={t("common.search")}
            leftSection={<IconSearch size={16} />}
            value={searchDraft}
            onChange={(e) => setFilter("search", e.currentTarget.value || null)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            data={STATUS_OPTIONS}
            value={status}
            onChange={(v) =>
              setFilter(
                "status",
                (v as
                  | "PENDING"
                  | "SETTLEMENT"
                  | "EXPIRE"
                  | "CANCEL"
                  | "DENY"
                  | "FAILURE"
                  | null) || null,
              )
            }
            placeholder={t("common.status")}
            clearable
            w={160}
          />
        </Group>

        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("onlinePayment.orderId")}</Table.Th>
                <Table.Th>{t("student.name")}</Table.Th>
                <Table.Th>{t("onlinePayment.bank")}</Table.Th>
                <Table.Th ta="right">{t("onlinePayment.amount")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
                <Table.Th>{t("common.createdAt")}</Table.Th>
                <Table.Th>{t("onlinePayment.items")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <Table.Td key={j}>
                        <Text size="sm" c="dimmed">
                          ...
                        </Text>
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))
              ) : data?.payments.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} ta="center" py="xl">
                    <Text c="dimmed">{t("common.noData")}</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                data?.payments.map((payment: AdminOnlinePayment) => (
                  <Table.Tr key={payment.id}>
                    <Table.Td>
                      <Text size="xs" ff="monospace">
                        {payment.orderId}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {payment.student.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {payment.student.nis}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" tt="uppercase">
                        {payment.bank || payment.paymentType || "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" fw={500}>
                        <NumberFormatter
                          value={Number(payment.grossAmount)}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(payment.status)}
                        variant="light"
                        size="sm"
                      >
                        {payment.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {dayjs(payment.createdAt).format("DD/MM/YYYY HH:mm")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {payment.items.map((item) => (
                        <Text key={item.id} size="xs">
                          {item.tuition.classAcademic.className} -{" "}
                          {item.tuition.period} {item.tuition.year}
                        </Text>
                      ))}
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <TablePagination
          value={page}
          total={data?.totalPages || 1}
          onChange={setPage}
        />
      </Card>
    </>
  );
};
OnlinePaymentsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default OnlinePaymentsPage;
