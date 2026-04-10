"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconEdit,
  IconKey,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ColumnSettingsDrawer, {
  useColumnSettings,
} from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import {
  useBulkDeleteEmployees,
  useDeleteEmployee,
  useEmployees,
  useResetEmployeePassword,
} from "@/hooks/api/useEmployees";
import { useQueryParams } from "@/hooks/useQueryParams";

export default function EmployeeTable() {
  const t = useTranslations();
  const router = useRouter();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const search = getParam("search", "") ?? "";
  const roleFilter = getParam("role") ?? null;

  const columnDefs = [
    { key: "name", label: t("employee.name") },
    { key: "email", label: t("employee.email") },
    { key: "role", label: t("employee.role") },
    { key: "actions", label: t("common.actions") },
  ];
  const { visibleKeys, orderedKeys } = useColumnSettings(
    "employees",
    columnDefs,
  );

  const { data, isLoading, refetch, isFetching } = useEmployees({
    page,
    limit: 10,
    search: search || undefined,
    role: (roleFilter as "ADMIN" | "CASHIER") || undefined,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deleteEmployee = useDeleteEmployee();
  const resetPassword = useResetEmployeePassword();
  const bulkDelete = useBulkDeleteEmployees();

  const employeeIds = data?.employees.map((e) => e.employeeId) || [];
  const allSelected =
    employeeIds.length > 0 && employeeIds.every((id) => selectedIds.has(id));
  const someSelected = employeeIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employeeIds));
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
      title: t("employee.bulk.deleteTitle"),
      children: (
        <Text size="sm">
          {t("employee.bulk.deleteConfirm", { count: ids.length })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        bulkDelete.mutate(ids, {
          onSuccess: (result) => {
            notifications.show({
              title: t("common.success"),
              message: t("employee.bulk.deleteSuccess", {
                deleted: result.deleted,
              }),
              color: "green",
            });
            if (result.skipped.length > 0) {
              notifications.show({
                title: t("common.warning"),
                message: t("employee.bulk.deleteSkipped", {
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

  const handleDelete = (id: string, name: string) => {
    modals.openConfirmModal({
      title: t("employee.deleteTitle"),
      children: (
        <Text size="sm">
          {t.rich("employee.deleteConfirm", {
            name,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteEmployee.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("common.deleted"),
              message: t("employee.deleteSuccess"),
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

  const handleResetPassword = (id: string, name: string) => {
    modals.openConfirmModal({
      title: t("employee.resetPasswordTitle"),
      children: (
        <Text size="sm">
          {t.rich("employee.resetPasswordConfirm", {
            name,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: { confirm: t("employee.reset"), cancel: t("common.cancel") },
      confirmProps: { color: "orange" },
      onConfirm: () => {
        resetPassword.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("employee.passwordReset"),
              message: t("employee.resetPasswordSuccess"),
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

  return (
    <Stack gap="md">
      <Group>
        <TextInput
          placeholder={t("employee.searchPlaceholder")}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setParams({ search: e.currentTarget.value, page: 1 });
          }}
          style={{ flex: 1 }}
        />
        <Select
          placeholder={t("employee.filterByRole")}
          data={[
            { value: "ADMIN", label: t("employee.roles.ADMIN") },
            { value: "CASHIER", label: t("employee.roles.CASHIER") },
          ]}
          value={roleFilter}
          onChange={(value) => {
            setParams({ role: value, page: 1 });
          }}
          clearable
          w={160}
        />
        <ActionIcon variant="default" size="lg" onClick={() => refetch()} loading={isFetching}>
          <IconRefresh size={18} />
        </ActionIcon>
        <ColumnSettingsDrawer tableId="employees" columnDefs={columnDefs} />
      </Group>

      {selectedIds.size > 0 && (
        <Paper withBorder p="sm" bg="blue.0">
          <Group justify="space-between">
            <Group gap="sm">
              <Text size="sm" fw={500}>
                {t("employee.bulk.selected", { count: selectedIds.size })}
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
                onClick={handleBulkDelete}
                loading={bulkDelete.isPending}
              >
                {t("employee.bulk.delete")}
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Paper withBorder>
        <Table.ScrollContainer minWidth={500}>
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
                      return (
                        <Table.Th key={key}>{t("employee.name")}</Table.Th>
                      );
                    case "email":
                      return (
                        <Table.Th key={key}>{t("employee.email")}</Table.Th>
                      );
                    case "role":
                      return (
                        <Table.Th key={key}>{t("employee.role")}</Table.Th>
                      );
                    case "actions":
                      return (
                        <Table.Th key={key} w={140}>
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
              {!isLoading && data?.employees.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length + 1}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("employee.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.employees.map((employee) => (
                <Table.Tr
                  key={employee.employeeId}
                  bg={
                    selectedIds.has(employee.employeeId)
                      ? "var(--mantine-color-blue-light)"
                      : undefined
                  }
                >
                  <Table.Td>
                    <Checkbox
                      checked={selectedIds.has(employee.employeeId)}
                      onChange={() => toggleOne(employee.employeeId)}
                      size="xs"
                    />
                  </Table.Td>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "name":
                        return <Table.Td key={key}>{employee.name}</Table.Td>;
                      case "email":
                        return <Table.Td key={key}>{employee.email}</Table.Td>;
                      case "role":
                        return (
                          <Table.Td key={key}>
                            <Badge
                              color={
                                employee.role === "ADMIN" ? "blue" : "green"
                              }
                              variant="light"
                            >
                              {t(`employee.roles.${employee.role}`)}
                            </Badge>
                          </Table.Td>
                        );
                      case "actions":
                        return (
                          <Table.Td key={key}>
                            <Group gap="xs">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() =>
                                  router.push(
                                    `/employees/${employee.employeeId}`,
                                  )
                                }
                              >
                                <IconEdit size={18} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                color="orange"
                                onClick={() =>
                                  handleResetPassword(
                                    employee.employeeId,
                                    employee.name,
                                  )
                                }
                              >
                                <IconKey size={18} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() =>
                                  handleDelete(
                                    employee.employeeId,
                                    employee.name,
                                  )
                                }
                              >
                                <IconTrash size={18} />
                              </ActionIcon>
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
