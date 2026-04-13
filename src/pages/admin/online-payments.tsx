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
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import TablePagination from "@/components/ui/TablePagination";
import {
  type AdminOnlinePayment,
  useAdminOnlinePayments,
} from "@/hooks/api/useAdminOnlinePayments";
import type { NextPageWithLayout } from "@/lib/page-types";

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

const OnlinePaymentsPage: NextPageWithLayout = function OnlinePaymentsPage() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { data, isLoading } = useAdminOnlinePayments({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });

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
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            data={STATUS_OPTIONS}
            value={status}
            onChange={(v) => {
              setStatus(v || "");
              setPage(1);
            }}
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
