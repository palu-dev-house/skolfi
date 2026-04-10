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
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconEdit,
  IconFilter,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ColumnSettingsDrawer, { useColumnSettings } from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import {
  useApplyDiscount,
  useApplyDiscountPreview,
  useDeleteDiscount,
  useDiscounts,
} from "@/hooks/api/useDiscounts";
import { useQueryParams } from "@/hooks/useQueryParams";
import { getPeriodDisplayName } from "@/lib/business-logic/tuition-generator";

export default function DiscountTable() {
  const t = useTranslations();
  const router = useRouter();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const academicYearId = getParam("academicYearId") ?? null;
  const isActive = getParam("isActive", "true") ?? "true";

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  // Set default academic year
  const effectiveAcademicYearId = academicYearId || activeYear?.id;

  const { data, isLoading } = useDiscounts({
    page,
    limit: 10,
    academicYearId: effectiveAcademicYearId,
    isActive: isActive === null ? undefined : isActive === "true",
  });

  const columnDefs = [
    { key: "name", label: t("common.name") },
    { key: "amount", label: t("common.amount") },
    { key: "scope", label: t("discount.scope") },
    { key: "targetPeriods", label: t("discount.targetPeriods") },
    { key: "appliedTo", label: t("discount.appliedTo") },
    { key: "status", label: t("common.status") },
    { key: "actions", label: t("common.actions") },
  ];
  const { visibleKeys, orderedKeys } = useColumnSettings("discounts", columnDefs);

  const deleteDiscount = useDeleteDiscount();
  const applyPreview = useApplyDiscountPreview();
  const applyDiscount = useApplyDiscount();

  const handleDelete = (id: string, name: string) => {
    modals.openConfirmModal({
      title: t("discount.deleteTitle"),
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {t.rich("discount.deleteConfirm", {
              name,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </Text>
          <Text size="sm" c="dimmed">
            {t("discount.deleteNote")}
          </Text>
        </Stack>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteDiscount.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("common.deleted"),
              message: t("discount.deleteSuccess"),
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

  const handleApply = async (id: string, name: string) => {
    try {
      const preview = await applyPreview.mutateAsync(id);

      modals.openConfirmModal({
        title: t("discount.applyTitle"),
        children: (
          <Stack gap="xs">
            <Text size="sm">
              {t.rich("discount.applyConfirm", {
                name,
                count: preview.summary.tuitionCount,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </Text>
            <Text size="sm">
              {t("discount.totalDiscount")}{" "}
              <NumberFormatter
                value={preview.summary.totalDiscountAmount}
                prefix="Rp "
                thousandSeparator="."
                decimalSeparator=","
              />
            </Text>
            {preview.affectedTuitions.length > 0 && (
              <Text size="xs" c="dimmed">
                {t("discount.affectingStudents", {
                  students: [
                    ...new Set(
                      preview.affectedTuitions.map((t) => t.studentName),
                    ),
                  ]
                    .slice(0, 5)
                    .join(", "),
                })}
                {preview.affectedTuitions.length > 5 &&
                  ` ${t("discount.andMore")}`}
              </Text>
            )}
          </Stack>
        ),
        labels: {
          confirm: t("discount.applyDiscount"),
          cancel: t("common.cancel"),
        },
        confirmProps: { color: "blue" },
        onConfirm: () => {
          applyDiscount.mutate(id, {
            onSuccess: (result) => {
              notifications.show({
                title: t("discount.applied"),
                message: t("discount.appliedCount", {
                  count: result.results.tuitionsUpdated,
                }),
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
    } catch (error) {
      notifications.show({
        title: t("common.error"),
        message:
          error instanceof Error ? error.message : t("discount.previewError"),
        color: "red",
      });
    }
  };

  const academicYearOptions =
    academicYearsData?.academicYears.map((ay) => ({
      value: ay.id,
      label: `${ay.year}${ay.isActive ? ` (${t("common.active")})` : ""}`,
    })) || [];

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group gap="md">
          <Select
            placeholder={t("discount.filterByYear")}
            leftSection={<IconFilter size={16} />}
            data={academicYearOptions}
            value={academicYearId || activeYear?.id || null}
            onChange={(value) => setParams({ academicYearId: value, page: 1 })}
            clearable
            searchable
            w={250}
          />
          <Select
            placeholder={t("discount.filterByStatus")}
            data={[
              { value: "true", label: t("common.active") },
              { value: "false", label: t("common.inactive") },
            ]}
            value={isActive}
            onChange={(value) => setParams({ isActive: value, page: 1 })}
            clearable
            w={150}
          />
          <ColumnSettingsDrawer tableId="discounts" columnDefs={columnDefs} />
        </Group>
      </Paper>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={900}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "name": return <Table.Th key={key}>{t("common.name")}</Table.Th>;
                    case "amount": return <Table.Th key={key} ta="right" align="right">{t("common.amount")}</Table.Th>;
                    case "scope": return <Table.Th key={key}>{t("discount.scope")}</Table.Th>;
                    case "targetPeriods": return <Table.Th key={key}>{t("discount.targetPeriods")}</Table.Th>;
                    case "appliedTo": return <Table.Th key={key}>{t("discount.appliedTo")}</Table.Th>;
                    case "status": return <Table.Th key={key}>{t("common.status")}</Table.Th>;
                    case "actions": return <Table.Th key={key} w={120}>{t("common.actions")}</Table.Th>;
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
              {!isLoading && data?.discounts.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("discount.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.discounts.map((discount) => (
                <Table.Tr key={discount.id}>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "name": return (
                        <Table.Td key={key}>
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>
                              {discount.name}
                            </Text>
                            {discount.reason && (
                              <Text size="xs" c="dimmed">
                                {discount.reason}
                              </Text>
                            )}
                          </Stack>
                        </Table.Td>
                      );
                      case "amount": return (
                        <Table.Td key={key} ta="right" align="right">
                          <NumberFormatter
                            value={discount.discountAmount}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Table.Td>
                      );
                      case "scope": return (
                        <Table.Td key={key}>
                          <Badge
                            color={discount.classAcademicId ? "blue" : "green"}
                            variant="light"
                          >
                            {discount.classAcademic
                              ? discount.classAcademic.className
                              : t("discount.schoolWide")}
                          </Badge>
                        </Table.Td>
                      );
                      case "targetPeriods": return (
                        <Table.Td key={key}>
                          <Group gap={4}>
                            {discount.targetPeriods.slice(0, 3).map((period) => (
                              <Badge key={period} size="sm" variant="outline">
                                {getPeriodDisplayName(period)}
                              </Badge>
                            ))}
                            {discount.targetPeriods.length > 3 && (
                              <Badge size="sm" variant="outline" color="gray">
                                +{discount.targetPeriods.length - 3}
                              </Badge>
                            )}
                          </Group>
                        </Table.Td>
                      );
                      case "appliedTo": return (
                        <Table.Td key={key}>
                          <Text size="sm">
                            {t("discount.tuitionsCount", {
                              count: discount._count?.tuitions || 0,
                            })}
                          </Text>
                        </Table.Td>
                      );
                      case "status": return (
                        <Table.Td key={key}>
                          <Badge
                            color={discount.isActive ? "green" : "gray"}
                            variant="light"
                          >
                            {discount.isActive
                              ? t("common.active")
                              : t("common.inactive")}
                          </Badge>
                        </Table.Td>
                      );
                      case "actions": return (
                        <Table.Td key={key}>
                          <Group gap="xs">
                            <Tooltip label={t("discount.applyToExisting")}>
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() =>
                                  handleApply(discount.id, discount.name)
                                }
                                disabled={!discount.isActive}
                                loading={applyPreview.isPending}
                              >
                                <IconPlayerPlay size={18} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={t("common.edit")}>
                              <ActionIcon
                                variant="subtle"
                                onClick={() =>
                                  router.push(`/admin/discounts/${discount.id}`)
                                }
                              >
                                <IconEdit size={18} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={t("common.delete")}>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() =>
                                  handleDelete(discount.id, discount.name)
                                }
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
