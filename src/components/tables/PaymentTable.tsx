"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
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
import { DateInput } from "@mantine/dates";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCalendar,
  IconDiscount,
  IconFilter,
  IconGift,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import ColumnSettingsDrawer, {
  useColumnSettings,
} from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import {
  useBulkReversePayments,
  useDeletePayment,
  usePayments,
} from "@/hooks/api/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { useQueryFilters } from "@/hooks/useQueryFilters";
import { getMonthDisplayName } from "@/lib/business-logic/tuition-generator";

const filterSchema = z.object({
  classAcademicId: z.string().optional(),
  studentSearch: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export default function PaymentTable() {
  const t = useTranslations();
  const { user } = useAuth();
  const { filters, page, drafts, setFilter, setPage } = useQueryFilters({
    schema: filterSchema,
    debounceKeys: ["studentSearch"],
  });
  const classAcademicId = filters.classAcademicId ?? null;
  const dateFrom = filters.dateFrom ?? "";
  const dateTo = filters.dateTo ?? "";
  const studentSearch = filters.studentSearch ?? "";

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: activeYear?.id,
  });

  const { data, isLoading, refetch, isFetching } = usePayments({
    page,
    limit: 10,
    classAcademicId: classAcademicId || undefined,
    studentId: studentSearch || undefined,
    paymentDateFrom: dateFrom || undefined,
    paymentDateTo: dateTo || undefined,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deletePayment = useDeletePayment();
  const bulkReverse = useBulkReversePayments();

  const paymentIds = data?.payments.map((p) => p.id) || [];
  const allSelected =
    paymentIds.length > 0 && paymentIds.every((id) => selectedIds.has(id));
  const someSelected = paymentIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paymentIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkReverse = () => {
    const ids = Array.from(selectedIds);
    modals.openConfirmModal({
      title: t("payment.bulk.reverseTitle"),
      children: (
        <Text size="sm">
          {t("payment.bulk.reverseConfirm", { count: ids.length })}
        </Text>
      ),
      labels: {
        confirm: t("payment.reverseButton"),
        cancel: t("common.cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: () => {
        bulkReverse.mutate(ids, {
          onSuccess: (result) => {
            notifications.show({
              title: t("common.success"),
              message: t("payment.bulk.reverseSuccess", {
                reversed: result.reversed,
              }),
              color: "green",
            });
            setSelectedIds(new Set());
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

  const { visibleKeys, orderedKeys } = useColumnSettings(
    "payments",
    columnDefs,
  );

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group gap="md" grow>
          <Select
            placeholder={t("tuition.filterByClass")}
            leftSection={<IconFilter size={16} />}
            data={classOptions}
            value={classAcademicId}
            onChange={(value) => setFilter("classAcademicId", value || null)}
            clearable
            searchable
          />
          <TextInput
            placeholder={t("payment.searchStudent")}
            leftSection={<IconSearch size={16} />}
            value={drafts.studentSearch ?? ""}
            onChange={(e) =>
              setFilter("studentSearch", e.currentTarget.value || null)
            }
          />
          <DateInput
            placeholder={t("payment.fromDate")}
            valueFormat="DD/MM/YYYY"
            leftSection={<IconCalendar size={16} />}
            value={dateFrom || null}
            onChange={(val) => setFilter("dateFrom", val || null)}
            clearable
          />
          <DateInput
            placeholder={t("payment.toDate")}
            valueFormat="DD/MM/YYYY"
            leftSection={<IconCalendar size={16} />}
            value={dateTo || null}
            onChange={(val) => setFilter("dateTo", val || null)}
            clearable
          />
          <Group gap="xs" style={{ flexGrow: 0 }}>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => refetch()}
              loading={isFetching}
            >
              <IconRefresh size={18} />
            </ActionIcon>
            <ColumnSettingsDrawer tableId="payments" columnDefs={columnDefs} />
          </Group>
        </Group>
      </Paper>

      {isAdmin && selectedIds.size > 0 && (
        <Paper withBorder p="sm" bg="blue.0">
          <Group justify="space-between">
            <Group gap="sm">
              <Text size="sm" fw={500}>
                {t("payment.bulk.selected", { count: selectedIds.size })}
              </Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <IconX size={14} />
              </ActionIcon>
            </Group>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={handleBulkReverse}
                loading={bulkReverse.isPending}
              >
                {t("payment.bulk.reverse")}
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Paper withBorder>
        <Table.ScrollContainer minWidth={900}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {isAdmin && (
                  <Table.Th w={40}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={toggleAll}
                      size="xs"
                    />
                  </Table.Th>
                )}
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "date":
                      return <Table.Th key={key}>{t("common.date")}</Table.Th>;
                    case "student":
                      return (
                        <Table.Th key={key}>{t("tuition.student")}</Table.Th>
                      );
                    case "class":
                      return (
                        <Table.Th key={key}>{t("tuition.class")}</Table.Th>
                      );
                    case "month":
                      return (
                        <Table.Th key={key}>{t("payment.month")}</Table.Th>
                      );
                    case "amount":
                      return (
                        <Table.Th key={key} ta="right" align="right">
                          {t("common.amount")}
                        </Table.Th>
                      );
                    case "cashier":
                      return (
                        <Table.Th key={key}>{t("payment.cashier")}</Table.Th>
                      );
                    case "status":
                      return (
                        <Table.Th key={key}>{t("common.status")}</Table.Th>
                      );
                    case "actions":
                      return isAdmin ? (
                        <Table.Th key={key} w={80}>
                          {t("common.actions")}
                        </Table.Th>
                      ) : null;
                    default:
                      return null;
                  }
                })}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={`skeleton-${i}`}>
                    {isAdmin && (
                      <Table.Td>
                        <Skeleton height={20} width={20} />
                      </Table.Td>
                    )}
                    {Array.from({ length: orderedKeys.length }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.payments.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length + (isAdmin ? 1 : 0)}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("payment.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.payments.map((payment) => {
                const student =
                  payment.tuition?.student ??
                  payment.feeBill?.student ??
                  payment.serviceFeeBill?.student ??
                  null;
                const className =
                  payment.tuition?.classAcademic?.className ??
                  payment.serviceFeeBill?.classAcademic?.className ??
                  payment.feeBill?.student?.studentClasses?.[0]?.classAcademic
                    ?.className ??
                  null;
                const periodLabel = payment.tuition?.month
                  ? `${getMonthDisplayName(payment.tuition.month)} ${payment.tuition.year}`
                  : payment.feeBill
                    ? `${payment.feeBill.period} ${payment.feeBill.year} · ${payment.feeBill.feeService?.name ?? ""}`
                    : payment.serviceFeeBill
                      ? `${payment.serviceFeeBill.period} ${payment.serviceFeeBill.year} · ${payment.serviceFeeBill.serviceFee?.name ?? ""}`
                      : "-";
                const status =
                  payment.tuition?.status ??
                  payment.feeBill?.status ??
                  payment.serviceFeeBill?.status ??
                  null;
                return (
                  <Table.Tr
                    key={payment.id}
                    bg={
                      isAdmin && selectedIds.has(payment.id)
                        ? "var(--mantine-color-blue-light)"
                        : undefined
                    }
                  >
                    {isAdmin && (
                      <Table.Td>
                        <Checkbox
                          checked={selectedIds.has(payment.id)}
                          onChange={() => toggleOne(payment.id)}
                          size="xs"
                        />
                      </Table.Td>
                    )}
                    {orderedKeys.map((key) => {
                      switch (key) {
                        case "date":
                          return (
                            <Table.Td key={key}>
                              <Text size="sm">
                                {dayjs(payment.paymentDate).format(
                                  "DD/MM/YYYY HH:mm",
                                )}
                              </Text>
                            </Table.Td>
                          );
                        case "student":
                          return (
                            <Table.Td key={key}>
                              <Stack gap={0}>
                                <Text size="sm" fw={500}>
                                  {student?.name ?? "-"}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {student?.nis ? `NIS ${student.nis}` : ""}
                                  {student?.schoolLevel
                                    ? ` · ${student.schoolLevel}`
                                    : ""}
                                </Text>
                              </Stack>
                            </Table.Td>
                          );
                        case "class":
                          return (
                            <Table.Td key={key}>
                              <Text size="sm">{className ?? "-"}</Text>
                            </Table.Td>
                          );
                        case "month":
                          return (
                            <Table.Td key={key}>
                              <Text size="sm">{periodLabel}</Text>
                            </Table.Td>
                          );
                        case "amount":
                          return (
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
                                      value={Number(
                                        payment.tuition?.discountAmount,
                                      )}
                                      prefix="Rp "
                                      thousandSeparator="."
                                      decimalSeparator=","
                                    />
                                  </Badge>
                                )}
                              </Stack>
                            </Table.Td>
                          );
                        case "cashier":
                          return (
                            <Table.Td key={key}>
                              <Text size="sm">{payment.employee?.name}</Text>
                            </Table.Td>
                          );
                        case "status":
                          return (
                            <Table.Td key={key}>
                              <Badge
                                color={
                                  status === "PAID"
                                    ? "green"
                                    : status === "PARTIAL"
                                      ? "yellow"
                                      : status === "VOID"
                                        ? "gray"
                                        : "red"
                                }
                                variant="light"
                                size="sm"
                              >
                                {status
                                  ? t(`tuition.status.${status.toLowerCase()}`)
                                  : "-"}
                              </Badge>
                            </Table.Td>
                          );
                        case "actions":
                          return isAdmin ? (
                            <Table.Td key={key}>
                              <Group gap="xs">
                                <Tooltip label={t("payment.reverseButton")}>
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    onClick={() =>
                                      handleDelete(
                                        payment.id,
                                        student?.name || "",
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
                        default:
                          return null;
                      }
                    })}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {data && (
        <TablePagination
          total={data.pagination.totalPages}
          value={page}
          onChange={setPage}
        />
      )}
    </Stack>
  );
}
