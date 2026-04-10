"use client";

import {
  ActionIcon,
  Badge,
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
import { IconEdit, IconKey, IconSearch, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ColumnSettingsDrawer, {
  useColumnSettings,
} from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import {
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

  const { data, isLoading } = useEmployees({
    page,
    limit: 10,
    search: search || undefined,
    role: (roleFilter as "ADMIN" | "CASHIER") || undefined,
  });

  const deleteEmployee = useDeleteEmployee();
  const resetPassword = useResetEmployeePassword();

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
        <ColumnSettingsDrawer tableId="employees" columnDefs={columnDefs} />
      </Group>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={500}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
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
                    {Array.from({ length: orderedKeys.length }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.employees.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("employee.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.employees.map((employee) => (
                <Table.Tr key={employee.employeeId}>
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
