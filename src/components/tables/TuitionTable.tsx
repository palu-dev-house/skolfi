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
import { IconFilter, IconSearch, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import type { PaymentStatus } from "@/generated/prisma/client";
import ColumnSettingsDrawer, { useColumnSettings } from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import { useDeleteTuition, useTuitions } from "@/hooks/api/useTuitions";
import { useQueryParams } from "@/hooks/useQueryParams";
import {
  getPeriodDisplayName,
  PERIODS,
} from "@/lib/business-logic/tuition-generator";

const STATUS_COLORS: Record<PaymentStatus, string> = {
  UNPAID: "red",
  PARTIAL: "yellow",
  PAID: "green",
};

export default function TuitionTable() {
  const t = useTranslations();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const classAcademicId = getParam("classAcademicId") ?? null;
  const status = getParam("status") ?? null;
  const period = getParam("period") ?? null;
  const studentSearch = getParam("studentSearch", "") ?? "";

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: activeYear?.id,
  });

  const { data, isLoading } = useTuitions({
    page,
    limit: 10,
    classAcademicId: classAcademicId || undefined,
    status: status as PaymentStatus | undefined,
    period: period || undefined,
    studentNis: studentSearch || undefined,
  });

  const deleteTuition = useDeleteTuition();

  const columnDefs = [
    { key: "student", label: t("tuition.student") },
    { key: "class", label: t("tuition.class") },
    { key: "period", label: t("tuition.period") },
    { key: "feeAmount", label: t("tuition.feeAmount") },
    { key: "discountAmount", label: t("tuition.discountAmount") },
    { key: "paidAmount", label: t("tuition.paidAmount") },
    { key: "dueDate", label: t("tuition.dueDate") },
    { key: "status", label: t("common.status") },
    { key: "actions", label: t("common.actions") },
  ];

  const { orderedKeys } = useColumnSettings("tuitions", columnDefs);

  const handleDelete = (id: string, studentName: string, monthName: string) => {
    modals.openConfirmModal({
      title: t("tuition.deleteTitle"),
      children: (
        <Text size="sm">
          {t.rich("tuition.deleteConfirm", {
            period: monthName,
            name: studentName,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteTuition.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("common.deleted"),
              message: t("tuition.deleteSuccess"),
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

  // Build period options grouped by frequency type
  const periodOptions = [
    {
      group: t("tuition.monthly"),
      items: PERIODS.MONTHLY.map((p) => ({
        value: p,
        label: getPeriodDisplayName(p),
      })),
    },
    {
      group: t("tuition.quarterly"),
      items: PERIODS.QUARTERLY.map((p) => ({
        value: p,
        label: getPeriodDisplayName(p),
      })),
    },
    {
      group: t("tuition.semester"),
      items: PERIODS.SEMESTER.map((p) => ({
        value: p,
        label: getPeriodDisplayName(p),
      })),
    },
  ];

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
          <Select
            placeholder={t("tuition.filterByStatus")}
            data={[
              { value: "UNPAID", label: t("tuition.status.unpaid") },
              { value: "PARTIAL", label: t("tuition.status.partial") },
              { value: "PAID", label: t("tuition.status.paid") },
            ]}
            value={status}
            onChange={(value) => setParams({ status: value, page: 1 })}
            clearable
          />
          <Select
            placeholder={t("tuition.filterByPeriod")}
            data={periodOptions}
            value={period}
            onChange={(value) => setParams({ period: value, page: 1 })}
            clearable
            searchable
          />
          <TextInput
            placeholder={t("tuition.searchStudent")}
            leftSection={<IconSearch size={16} />}
            value={studentSearch}
            onChange={(e) =>
              setParams({ studentSearch: e.currentTarget.value, page: 1 })
            }
          />
        </Group>
      </Paper>

      <Group justify="flex-end">
        <ColumnSettingsDrawer tableId="tuitions" columnDefs={columnDefs} />
      </Group>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={900}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "student": return <Table.Th key={key}>{t("tuition.student")}</Table.Th>;
                    case "class": return <Table.Th key={key}>{t("tuition.class")}</Table.Th>;
                    case "period": return <Table.Th key={key}>{t("tuition.period")}</Table.Th>;
                    case "feeAmount": return <Table.Th key={key} ta="right">{t("tuition.feeAmount")}</Table.Th>;
                    case "discountAmount": return <Table.Th key={key} ta="right">{t("tuition.discountAmount")}</Table.Th>;
                    case "paidAmount": return <Table.Th key={key} ta="right">{t("tuition.paidAmount")}</Table.Th>;
                    case "dueDate": return <Table.Th key={key}>{t("tuition.dueDate")}</Table.Th>;
                    case "status": return <Table.Th key={key}>{t("common.status")}</Table.Th>;
                    case "actions": return <Table.Th key={key} w={80}>{t("common.actions")}</Table.Th>;
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
              {!isLoading && data?.tuitions.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("tuition.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.tuitions.map((tuition) => (
                <Table.Tr key={tuition.id}>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "student": return (
                        <Table.Td key={key}>
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>
                              {tuition.student?.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {tuition.studentNis}
                            </Text>
                          </Stack>
                        </Table.Td>
                      );
                      case "class": return (
                        <Table.Td key={key}>
                          <Text size="sm">{tuition.classAcademic?.className}</Text>
                        </Table.Td>
                      );
                      case "period": return (
                        <Table.Td key={key}>
                          <Text size="sm">
                            {getPeriodDisplayName(tuition.period)} {tuition.year}
                          </Text>
                        </Table.Td>
                      );
                      case "feeAmount": return (
                        <Table.Td key={key} ta="right">
                          <NumberFormatter
                            value={tuition.feeAmount}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Table.Td>
                      );
                      case "discountAmount": return (
                        <Table.Td key={key} ta="right">
                          {tuition.discount ? (
                            <Tooltip label={tuition.discount.name}>
                              <Badge color="green" variant="light" size="sm">
                                -
                                <NumberFormatter
                                  value={tuition.discountAmount}
                                  prefix="Rp "
                                  thousandSeparator="."
                                  decimalSeparator=","
                                />
                              </Badge>
                            </Tooltip>
                          ) : (
                            <Text size="sm" c="dimmed">
                              -
                            </Text>
                          )}
                        </Table.Td>
                      );
                      case "paidAmount": return (
                        <Table.Td key={key} ta="right">
                          <NumberFormatter
                            value={tuition.paidAmount}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Table.Td>
                      );
                      case "dueDate": return (
                        <Table.Td key={key}>
                          <Text size="sm">
                            {dayjs(tuition.dueDate).format("DD/MM/YYYY")}
                          </Text>
                        </Table.Td>
                      );
                      case "status": return (
                        <Table.Td key={key}>
                          <Badge
                            color={STATUS_COLORS[tuition.status]}
                            variant="light"
                          >
                            {t(`tuition.status.${tuition.status.toLowerCase()}`)}
                          </Badge>
                        </Table.Td>
                      );
                      case "actions": return (
                        <Table.Td key={key}>
                          <Group gap="xs">
                            <Tooltip label={t("common.delete")}>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() =>
                                  handleDelete(
                                    tuition.id,
                                    tuition.student?.name || "",
                                    getPeriodDisplayName(tuition.period),
                                  )
                                }
                                disabled={(tuition._count?.payments ?? 0) > 0}
                              >
                                <IconTrash size={18} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      );
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
