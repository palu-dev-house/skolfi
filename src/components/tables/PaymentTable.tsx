"use client";

import {
  ActionIcon,
  Badge,
  Group,
  NumberFormatter,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconDiscount,
  IconFilter,
  IconGift,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import ColumnSettingsDrawer, { useColumnSettings } from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import { useDeletePayment, usePayments } from "@/hooks/api/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParams } from "@/hooks/useQueryParams";
import { getMonthDisplayName } from "@/lib/business-logic/tuition-generator";

export default function PaymentTable() {
  const t = useTranslations();
  const { user } = useAuth();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const classAcademicId = getParam("classAcademicId") ?? null;
  const studentSearch = getParam("studentSearch", "") ?? "";
  const dateFrom = getParam("dateFrom", "") ?? "";
  const dateTo = getParam("dateTo", "") ?? "";

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: activeYear?.id,
  });

  const { data, isLoading } = usePayments({
    page,
    limit: 10,
    classAcademicId: classAcademicId || undefined,
    studentNis: studentSearch || undefined,
    paymentDateFrom: dateFrom || undefined,
    paymentDateTo: dateTo || undefined,
  });

  const deletePayment = useDeletePayment();

  const handleDelete = (id: string, studentName: string, amount: string) => {
    modals.openConfirmModal({
      title: t("payment.reverseTitle"),
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {t.rich("payment.reverseConfirm", {
              amount: `Rp ${Number(amount).toLocaleString("id-ID")}`,
              name: studentName,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </Text>
          <Text size="sm" c="red">
            {t("payment.reverseNote")}
          </Text>
        </Stack>
      ),
      labels: {
        confirm: t("payment.reverseButton"),
        cancel: t("common.cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deletePayment.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("payment.reversed"),
              message: t("payment.reverseSuccess"),
              color: "green",
            });
          },
          onError: (error) => {
            notifications.show({
              title: t("common.error"),
              message: error.message,
              color: "red",
            });
          },
        });
      },
    });
  };

  const classOptions =
    classesData?.classes.map((c) => ({
      value: c.id,
      label: c.className,
    })) || [];

  const isAdmin = user?.role === "ADMIN";

  const baseDefs = [
    { key: "date", label: t("common.date") },
    { key: "student", label: t("tuition.student") },
    { key: "class", label: t("tuition.class") },
    { key: "month", label: t("payment.month") },
    { key: "amount", label: t("common.amount") },
    { key: "cashier", label: t("payment.cashier") },
    { key: "status", label: t("common.status") },
  ];
  const columnDefs = isAdmin
    ? [...baseDefs, { key: "actions", label: t("common.actions") }]
    : baseDefs;

  const { visibleKeys, orderedKeys } = useColumnSettings("payments", columnDefs);

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group gap="md" grow>
          <Select
            placeholder={t("tuition.filterByClass")}
            leftSection={<IconFilter size={16} />}
            data={classOptions}
            value={classAcademicId}
            onChange={(value) => setParams({ classAcademicId: value, page: 1 })}
            clearable
            searchable
          />
          <TextInput
            placeholder={t("payment.searchStudent")}
            leftSection={<IconSearch size={16} />}
            value={studentSearch}
            onChange={(e) =>
              setParams({ studentSearch: e.currentTarget.value, page: 1 })
            }
          />
          <TextInput
            type="date"
            placeholder={t("payment.fromDate")}
            value={dateFrom}
            onChange={(e) =>
              setParams({ dateFrom: e.currentTarget.value, page: 1 })
            }
          />
          <TextInput
            type="date"
            placeholder={t("payment.toDate")}
            value={dateTo}
            onChange={(e) =>
              setParams({ dateTo: e.currentTarget.value, page: 1 })
            }
          />
        </Group>
      </Paper>

      <Group justify="flex-end">
        <ColumnSettingsDrawer tableId="payments" columnDefs={columnDefs} />
      </Group>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={900}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "date": return <Table.Th key={key}>{t("common.date")}</Table.Th>;
                    case "student": return <Table.Th key={key}>{t("tuition.student")}</Table.Th>;
                    case "class": return <Table.Th key={key}>{t("tuition.class")}</Table.Th>;
                    case "month": return <Table.Th key={key}>{t("payment.month")}</Table.Th>;
                    case "amount": return <Table.Th key={key} ta="right" align="right">{t("common.amount")}</Table.Th>;
                    case "cashier": return <Table.Th key={key}>{t("payment.cashier")}</Table.Th>;
                    case "status": return <Table.Th key={key}>{t("common.status")}</Table.Th>;
                    case "actions": return isAdmin ? <Table.Th key={key} w={80}>{t("common.actions")}</Table.Th> : null;
                    default: return null;
                  }
                })}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={`skeleton-${i}`}>
                    {Array.from({ length: orderedKeys.length }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.payments.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("payment.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.payments.map((payment) => (
                <Table.Tr key={payment.id}>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "date": return (
                        <Table.Td key={key}>
                          <Text size="sm">
                            {dayjs(payment.paymentDate).format("DD/MM/YYYY HH:mm")}
                          </Text>
                        </Table.Td>
                      );
                      case "student": return (
                        <Table.Td key={key}>
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>
                              {payment.tuition?.student?.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {payment.tuition?.student?.nis}
                            </Text>
                          </Stack>
                        </Table.Td>
                      );
                      case "class": return (
                        <Table.Td key={key}>
                          <Text size="sm">
                            {payment.tuition?.classAcademic?.className}
                          </Text>
                        </Table.Td>
                      );
                      case "month": return (
                        <Table.Td key={key}>
                          <Text size="sm">
                            {payment.tuition?.month
                              ? `${getMonthDisplayName(payment.tuition.month)} ${payment.tuition.year}`
                              : "-"}
                          </Text>
                        </Table.Td>
                      );
                      case "amount": return (
                        <Table.Td key={key} align="right">
                          <Stack gap={2} align="flex-end">
                            <Text size="sm" fw={600}>
                              <NumberFormatter
                                value={payment.amount}
                                prefix="Rp "
                                thousandSeparator="."
                                decimalSeparator=","
                              />
                            </Text>
                            {!!Number(payment.scholarshipAmount) && (
                              <Badge
                                size="xs"
                                color={"blue"}
                                variant="light"
                                leftSection={<IconGift size={10} />}
                              >
                                {t("payment.scholarship")}:{" "}
                                <NumberFormatter
                                  value={Number(payment.scholarshipAmount)}
                                  prefix="Rp "
                                  thousandSeparator="."
                                  decimalSeparator=","
                                />
                              </Badge>
                            )}
                            {!!payment.tuition?.discount && (
                              <Badge
                                size="xs"
                                color={"blue"}
                                variant="light"
                                leftSection={<IconDiscount size={10} />}
                              >
                                {payment.tuition?.discount?.name}:{" "}
                                <NumberFormatter
                                  value={Number(payment.tuition?.discountAmount)}
                                  prefix="Rp "
                                  thousandSeparator="."
                                  decimalSeparator=","
                                />
                              </Badge>
                            )}
                          </Stack>
                        </Table.Td>
                      );
                      case "cashier": return (
                        <Table.Td key={key}>
                          <Text size="sm">{payment.employee?.name}</Text>
                        </Table.Td>
                      );
                      case "status": return (
                        <Table.Td key={key}>
                          <Badge
                            color={
                              payment.tuition?.status === "PAID"
                                ? "green"
                                : payment.tuition?.status === "PARTIAL"
                                  ? "yellow"
                                  : "red"
                            }
                            variant="light"
                            size="sm"
                          >
                            {payment.tuition?.status
                              ? t(
                                  `tuition.status.${payment.tuition.status.toLowerCase()}`,
                                )
                              : "-"}
                          </Badge>
                        </Table.Td>
                      );
                      case "actions": return isAdmin ? (
                        <Table.Td key={key}>
                          <Group gap="xs">
                            <Tooltip label={t("payment.reverseButton")}>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() =>
                                  handleDelete(
                                    payment.id,
                                    payment.tuition?.student?.name || "",
                                    payment.amount,
                                  )
                                }
                              >
                                <IconTrash size={18} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      ) : null;
                      default: return null;
                    }
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {data && (
        <TablePagination
          total={data.pagination.totalPages}
          value={page}
          onChange={(p) => setParams({ page: p })}
        />
      )}
    </Stack>
  );
}
