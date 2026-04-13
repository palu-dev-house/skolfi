"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  NumberFormatter,
  NumberInput,
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
  IconCheck,
  IconCurrencyDollar,
  IconEdit,
  IconFilter,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ColumnSettingsDrawer, {
  useColumnSettings,
} from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import {
  useApplyDiscount,
  useApplyDiscountPreview,
  useBulkDeleteDiscounts,
  useBulkUpdateDiscounts,
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

  const { data, isLoading, refetch, isFetching } = useDiscounts({
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
  const { visibleKeys, orderedKeys } = useColumnSettings(
    "discounts",
    columnDefs,
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deleteDiscount = useDeleteDiscount();
  const applyPreview = useApplyDiscountPreview();
  const applyDiscount = useApplyDiscount();
  const bulkDelete = useBulkDeleteDiscounts();
  const bulkUpdate = useBulkUpdateDiscounts();

  const discountIds = data?.discounts.map((d) => d.id) || [];
  const allSelected =
    discountIds.length > 0 && discountIds.every((id) => selectedIds.has(id));
  const someSelected = discountIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(discountIds));
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

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    modals.openConfirmModal({
      title: t("discount.bulk.deleteTitle"),
      children: (
        <Text size="sm">
          {t("discount.bulk.deleteConfirm", { count: ids.length })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        bulkDelete.mutate(ids, {
          onSuccess: (result) => {
            notifications.show({
              title: t("common.success"),
              message: t("discount.bulk.deleteSuccess", {
                deleted: result.deleted,
              }),
              color: "green",
            });
            if (result.skipped.length > 0) {
              notifications.show({
                title: t("common.warning"),
                message: t("discount.bulk.deleteSkipped", {
                  count: result.skipped.length,
                  names: result.skipped.map((s) => s.name).join(", "),
                }),
                color: "orange",
                autoClose: 8000,
              });
            }
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

  const handleBulkUpdateAmount = () => {
    const ids = Array.from(selectedIds);
    modals.open({
      title: t("discount.bulk.updateAmountTitle"),
      children: (
        <BulkUpdateDiscountAmountForm
          ids={ids}
          onSuccess={(count) => {
            setSelectedIds(new Set());
            notifications.show({
              title: t("common.success"),
              message: t("discount.bulk.updateSuccess", { count }),
              color: "green",
            });
          }}
          onError={(msg) => {
            notifications.show({
              title: t("common.error"),
              message: msg,
              color: "red",
            });
          }}
        />
      ),
    });
  };

  const handleBulkSetActive = (isActive: boolean) => {
    const ids = Array.from(selectedIds);
    bulkUpdate.mutate(
      { ids, updates: { isActive } },
      {
        onSuccess: (result) => {
          notifications.show({
            title: t("common.success"),
            message: t("discount.bulk.updateSuccess", {
              count: result.updated,
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
      },
    );
  };

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
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <IconRefresh size={18} />
          </ActionIcon>
          <ColumnSettingsDrawer tableId="discounts" columnDefs={columnDefs} />
        </Group>
      </Paper>

      {selectedIds.size > 0 && (
        <Paper withBorder p="sm" bg="blue.0">
          <Group justify="space-between">
            <Group gap="sm">
              <Text size="sm" fw={500}>
                {t("discount.bulk.selected", { count: selectedIds.size })}
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
                color="blue"
                leftSection={<IconCurrencyDollar size={14} />}
                onClick={handleBulkUpdateAmount}
                loading={bulkUpdate.isPending}
              >
                {t("discount.bulk.updateAmount")}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="green"
                leftSection={<IconCheck size={14} />}
                onClick={() => handleBulkSetActive(true)}
                loading={bulkUpdate.isPending}
              >
                {t("discount.bulk.activate")}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="orange"
                leftSection={<IconPlayerStop size={14} />}
                onClick={() => handleBulkSetActive(false)}
                loading={bulkUpdate.isPending}
              >
                {t("discount.bulk.deactivate")}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={handleBulkDelete}
                loading={bulkDelete.isPending}
              >
                {t("discount.bulk.delete")}
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
                <Table.Th w={40}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAll}
                    size="xs"
                  />
                </Table.Th>
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "name":
                      return <Table.Th key={key}>{t("common.name")}</Table.Th>;
                    case "amount":
                      return (
                        <Table.Th key={key} ta="right" align="right">
                          {t("common.amount")}
                        </Table.Th>
                      );
                    case "scope":
                      return (
                        <Table.Th key={key}>{t("discount.scope")}</Table.Th>
                      );
                    case "targetPeriods":
                      return (
                        <Table.Th key={key}>
                          {t("discount.targetPeriods")}
                        </Table.Th>
                      );
                    case "appliedTo":
                      return (
                        <Table.Th key={key}>{t("discount.appliedTo")}</Table.Th>
                      );
                    case "status":
                      return (
                        <Table.Th key={key}>{t("common.status")}</Table.Th>
                      );
                    case "actions":
                      return (
                        <Table.Th key={key} w={120}>
                          {t("common.actions")}
                        </Table.Th>
                      );
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
                    <Table.Td>
                      <Skeleton height={20} width={20} />
                    </Table.Td>
                    {Array.from({ length: orderedKeys.length }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.discounts.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length + 1}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("discount.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.discounts.map((discount) => (
                <Table.Tr
                  key={discount.id}
                  bg={
                    selectedIds.has(discount.id)
                      ? "var(--mantine-color-blue-light)"
                      : undefined
                  }
                >
                  <Table.Td>
                    <Checkbox
                      checked={selectedIds.has(discount.id)}
                      onChange={() => toggleOne(discount.id)}
                      size="xs"
                    />
                  </Table.Td>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "name":
                        return (
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
                      case "amount":
                        return (
                          <Table.Td key={key} ta="right" align="right">
                            <NumberFormatter
                              value={discount.discountAmount}
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Table.Td>
                        );
                      case "scope":
                        return (
                          <Table.Td key={key}>
                            <Badge
                              color={
                                discount.classAcademicId ? "blue" : "green"
                              }
                              variant="light"
                            >
                              {discount.classAcademic
                                ? discount.classAcademic.className
                                : t("discount.schoolWide")}
                            </Badge>
                          </Table.Td>
                        );
                      case "targetPeriods":
                        return (
                          <Table.Td key={key}>
                            <Group gap={4}>
                              {discount.targetPeriods
                                .slice(0, 3)
                                .map((period) => (
                                  <Badge
                                    key={period}
                                    size="sm"
                                    variant="outline"
                                  >
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
                      case "appliedTo":
                        return (
                          <Table.Td key={key}>
                            <Text size="sm">
                              {t("discount.tuitionsCount", {
                                count: discount._count?.tuitions || 0,
                              })}
                            </Text>
                          </Table.Td>
                        );
                      case "status":
                        return (
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
                      case "actions":
                        return (
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
                                    router.push(
                                      `/admin/discounts/${discount.id}`,
                                    )
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
                      default:
                        return null;
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

function BulkUpdateDiscountAmountForm({
  ids,
  onSuccess,
  onError,
}: {
  ids: string[];
  onSuccess: (count: number) => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations();
  const [amount, setAmount] = useState<string | number>("");
  const bulkUpdate = useBulkUpdateDiscounts();

  return (
    <Stack gap="md">
      <Text size="sm">
        {t("discount.bulk.updateAmountConfirm", { count: ids.length })}
      </Text>
      <NumberInput
        label={t("common.amount")}
        placeholder={t("discount.amountPlaceholder")}
        value={amount}
        onChange={setAmount}
        min={0}
        prefix="Rp "
        thousandSeparator="."
        decimalSeparator=","
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={() => modals.closeAll()}>
          {t("common.cancel")}
        </Button>
        <Button
          disabled={!amount || Number(amount) <= 0}
          loading={bulkUpdate.isPending}
          onClick={() => {
            if (!amount || Number(amount) <= 0) return;
            bulkUpdate.mutate(
              { ids, updates: { discountAmount: Number(amount) } },
              {
                onSuccess: (result) => {
                  modals.closeAll();
                  onSuccess(result.updated);
                },
                onError: (error) => {
                  onError(error.message);
                },
              },
            );
          }}
        >
          {t("common.save")}
        </Button>
      </Group>
    </Stack>
  );
}
