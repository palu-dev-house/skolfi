"use client";

import {
  ActionIcon,
  Badge,
  Group,
  NumberFormatter,
  Pagination,
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

      <Paper withBorder>
        <Table.ScrollContainer minWidth={900}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("tuition.student")}</Table.Th>
                <Table.Th>{t("tuition.class")}</Table.Th>
                <Table.Th>{t("tuition.period")}</Table.Th>
                <Table.Th ta="right" align="right">
                  {t("tuition.feeAmount")}
                </Table.Th>
                <Table.Th ta="right" align="right">
                  {t("tuition.discountAmount")}
                </Table.Th>
                <Table.Th ta="right" align="right">
                  {t("tuition.paidAmount")}
                </Table.Th>
                <Table.Th>{t("tuition.dueDate")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
                <Table.Th w={80}>{t("common.actions")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={`skeleton-${i}`}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.tuitions.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("tuition.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.tuitions.map((tuition) => (
                <Table.Tr key={tuition.id}>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>
                        {tuition.student?.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {tuition.studentNis}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{tuition.classAcademic?.className}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {getPeriodDisplayName(tuition.period)} {tuition.year}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right" align="right">
                    <NumberFormatter
                      value={tuition.feeAmount}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Table.Td>
                  <Table.Td ta="right" align="right">
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
                  <Table.Td ta="right" align="right">
                    <NumberFormatter
                      value={tuition.paidAmount}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {dayjs(tuition.dueDate).format("DD/MM/YYYY")}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={STATUS_COLORS[tuition.status]}
                      variant="light"
                    >
                      {t(`tuition.status.${tuition.status.toLowerCase()}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
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
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {data && data.pagination.totalPages > 1 && (
        <Group justify="center">
          <Pagination
            total={data.pagination.totalPages}
            value={page}
            onChange={(p) => setParams({ page: p })}
          />
        </Group>
      )}
    </Stack>
  );
}
