"use client";

import {
  ActionIcon,
  Badge,
  Box,
  Divider,
  Group,
  Menu,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDotsVertical,
  IconKey,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ColumnSettingsDrawer, {
  useColumnSettings,
} from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import {
  useDeleteStudentAccount,
  useResetStudentPassword,
  useRestoreStudentAccount,
  useStudentAccounts,
} from "@/hooks/api/useStudentAccounts";
import { useQueryParams } from "@/hooks/useQueryParams";

interface StudentAccount {
  nis: string;
  name: string;
  parentName: string;
  parentPhone: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  lastPaymentAt: string | null;
  accountCreatedAt: string | null;
  accountDeleted: boolean;
  accountDeletedAt: string | null;
  accountDeletedReason: string | null;
}

function StatusBadge({
  account,
  t,
}: {
  account: StudentAccount;
  t: ReturnType<typeof useTranslations>;
}) {
  if (account.accountDeleted)
    return (
      <Badge color="red" variant="light" size="sm">
        {t("studentAccount.status.deleted")}
      </Badge>
    );
  if (account.mustChangePassword)
    return (
      <Badge color="yellow" variant="light" size="sm">
        {t("studentAccount.status.mustChangePassword")}
      </Badge>
    );
  return (
    <Badge color="green" variant="light" size="sm">
      {t("studentAccount.status.active")}
    </Badge>
  );
}

function AccountActions({
  account,
  onReset,
  onDelete,
  onRestore,
  resetPending,
  deletePending,
  restorePending,
  t,
}: {
  account: StudentAccount;
  onReset: (a: StudentAccount) => void;
  onDelete: (a: StudentAccount) => void;
  onRestore: (a: StudentAccount) => void;
  resetPending: boolean;
  deletePending: boolean;
  restorePending: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle">
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {account.accountDeleted ? (
          <Menu.Item
            onClick={() => onRestore(account)}
            disabled={restorePending}
          >
            {t("studentAccount.restore")}
          </Menu.Item>
        ) : (
          <>
            <Menu.Item
              leftSection={<IconKey size={14} />}
              onClick={() => onReset(account)}
              disabled={resetPending}
            >
              {t("studentAccount.resetPassword")}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconTrash size={14} />}
              color="red"
              onClick={() => onDelete(account)}
              disabled={deletePending}
            >
              {t("studentAccount.deleteAccount")}
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

export default function StudentAccountTable() {
  const t = useTranslations();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const search = getParam("search", "") ?? "";
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const columnDefs = [
    { key: "nis", label: t("student.nis") },
    { key: "name", label: t("common.name") },
    { key: "parent", label: t("studentAccount.parent") },
    { key: "phone", label: t("studentAccount.phone") },
    { key: "lastLogin", label: t("studentAccount.lastLogin") },
    { key: "status", label: t("common.status") },
    { key: "actions", label: t("common.actions") },
  ];
  const { orderedKeys } = useColumnSettings("studentAccounts", columnDefs);

  const { data, isLoading, refetch, isFetching } = useStudentAccounts({
    page,
    limit: 10,
    search: search || undefined,
    includeDeleted,
  });

  const resetPassword = useResetStudentPassword();
  const deleteAccount = useDeleteStudentAccount();
  const restoreAccount = useRestoreStudentAccount();

  const accounts = data?.students || [];

  const handleResetPassword = (account: StudentAccount) => {
    modals.openConfirmModal({
      title: t("studentAccount.resetPassword"),
      children: (
        <Text size="sm">
          {t.rich("studentAccount.resetPasswordMessage", {
            name: account.name,
            nis: account.nis,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: {
        confirm: t("studentAccount.resetPassword"),
        cancel: t("common.cancel"),
      },
      onConfirm: async () => {
        try {
          const result = await resetPassword.mutateAsync(account.nis);
          notifications.show({
            title: t("studentAccount.resetPasswordSuccess"),
            message: `${t("auth.newPassword")}: ${result.newPassword}`,
            color: "green",
            icon: <IconCheck size={16} />,
            autoClose: 10000,
          });
        } catch (err) {
          notifications.show({
            title: t("common.error"),
            message: err instanceof Error ? err.message : t("common.error"),
            color: "red",
          });
        }
      },
    });
  };

  const handleDeleteAccount = (account: StudentAccount) => {
    modals.openConfirmModal({
      title: t("studentAccount.deleteAccount"),
      children: (
        <Text size="sm">
          {t.rich("studentAccount.deleteAccountMessage", {
            name: account.name,
            nis: account.nis,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: {
        confirm: t("studentAccount.deleteAccount"),
        cancel: t("common.cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteAccount.mutateAsync({
            nis: account.nis,
            reason: "Manual deletion by admin",
          });
          notifications.show({
            title: t("common.success"),
            message: t("studentAccount.deleteSuccess"),
            color: "green",
            icon: <IconCheck size={16} />,
          });
        } catch (err) {
          notifications.show({
            title: t("common.error"),
            message: err instanceof Error ? err.message : t("common.error"),
            color: "red",
          });
        }
      },
    });
  };

  const handleRestoreAccount = async (account: StudentAccount) => {
    try {
      await restoreAccount.mutateAsync(account.nis);
      notifications.show({
        title: t("common.success"),
        message: t("studentAccount.restoreSuccess", { name: account.name }),
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: t("common.error"),
        message:
          err instanceof Error ? err.message : t("studentAccount.restoreError"),
        color: "red",
      });
    }
  };

  const actionProps = {
    onReset: handleResetPassword,
    onDelete: handleDeleteAccount,
    onRestore: handleRestoreAccount,
    resetPending: resetPassword.isPending,
    deletePending: deleteAccount.isPending,
    restorePending: restoreAccount.isPending,
    t,
  };

  return (
    <Stack gap="md">
      {/* Filter bar - responsive */}
      <Paper withBorder p="md">
        <Group gap="md" wrap="wrap">
          <TextInput
            placeholder={t("studentAccount.searchPlaceholder")}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) =>
              setParams({ search: e.currentTarget.value || null, page: 1 })
            }
            style={{ flex: 1, minWidth: 180 }}
          />
          <Switch
            label={t("studentAccount.includeDeleted")}
            checked={includeDeleted}
            onChange={(e) => {
              setIncludeDeleted(e.currentTarget.checked);
              setParams({ page: 1 });
            }}
          />
          <Group gap="xs">
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => refetch()}
              loading={isFetching}
            >
              <IconRefresh size={18} />
            </ActionIcon>
            <ColumnSettingsDrawer
              tableId="studentAccounts"
              columnDefs={columnDefs}
            />
          </Group>
        </Group>
      </Paper>

      {/* Loading state */}
      {isLoading && (
        <Stack gap="sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={60} radius="sm" />
          ))}
        </Stack>
      )}

      {/* Empty state */}
      {!isLoading && accounts.length === 0 && (
        <Paper withBorder p="xl">
          <Text ta="center" c="dimmed">
            {t("student.noStudents")}
          </Text>
        </Paper>
      )}

      {!isLoading && accounts.length > 0 && (
        <>
          {/* Mobile card view */}
          <Box hiddenFrom="md">
            <Stack gap="sm">
              {accounts.map((account) => (
                <Paper key={account.nis} withBorder p="sm">
                  <Stack gap="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <Text fw={600} size="sm" truncate>
                          {account.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          NIS: {account.nis}
                        </Text>
                      </Box>
                      <Group gap="xs" wrap="nowrap">
                        <StatusBadge account={account} t={t} />
                        <AccountActions account={account} {...actionProps} />
                      </Group>
                    </Group>
                    <Divider />
                    <SimpleGrid cols={2} spacing="xs">
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">
                          {t("studentAccount.parent")}
                        </Text>
                        <Text size="sm" truncate>
                          {account.parentName}
                        </Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">
                          {t("studentAccount.phone")}
                        </Text>
                        <Text size="sm">{account.parentPhone}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">
                          {t("studentAccount.lastLogin")}
                        </Text>
                        <Text size="sm">
                          {account.lastLoginAt
                            ? dayjs(account.lastLoginAt).format(
                                "DD/MM/YY HH:mm",
                              )
                            : "-"}
                        </Text>
                      </Stack>
                    </SimpleGrid>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* Desktop table view */}
          <Box visibleFrom="md">
            <Paper withBorder>
              <Table.ScrollContainer minWidth={800}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      {orderedKeys.map((key) => {
                        switch (key) {
                          case "nis":
                            return (
                              <Table.Th key={key}>
                                {t("student.nis")}
                              </Table.Th>
                            );
                          case "name":
                            return (
                              <Table.Th key={key}>
                                {t("common.name")}
                              </Table.Th>
                            );
                          case "parent":
                            return (
                              <Table.Th key={key}>
                                {t("studentAccount.parent")}
                              </Table.Th>
                            );
                          case "phone":
                            return (
                              <Table.Th key={key}>
                                {t("studentAccount.phone")}
                              </Table.Th>
                            );
                          case "lastLogin":
                            return (
                              <Table.Th key={key}>
                                {t("studentAccount.lastLogin")}
                              </Table.Th>
                            );
                          case "status":
                            return (
                              <Table.Th key={key}>
                                {t("common.status")}
                              </Table.Th>
                            );
                          case "actions":
                            return (
                              <Table.Th key={key} w={80}>
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
                    {accounts.map((account) => (
                      <Table.Tr key={account.nis}>
                        {orderedKeys.map((key) => {
                          switch (key) {
                            case "nis":
                              return (
                                <Table.Td key={key}>
                                  <Text fw={500}>{account.nis}</Text>
                                </Table.Td>
                              );
                            case "name":
                              return (
                                <Table.Td key={key}>{account.name}</Table.Td>
                              );
                            case "parent":
                              return (
                                <Table.Td key={key}>
                                  {account.parentName}
                                </Table.Td>
                              );
                            case "phone":
                              return (
                                <Table.Td key={key}>
                                  {account.parentPhone}
                                </Table.Td>
                              );
                            case "lastLogin":
                              return (
                                <Table.Td key={key}>
                                  {account.lastLoginAt
                                    ? dayjs(account.lastLoginAt).format(
                                        "DD/MM/YY HH:mm",
                                      )
                                    : "-"}
                                </Table.Td>
                              );
                            case "status":
                              return (
                                <Table.Td key={key}>
                                  <StatusBadge account={account} t={t} />
                                </Table.Td>
                              );
                            case "actions":
                              return (
                                <Table.Td key={key}>
                                  <AccountActions
                                    account={account}
                                    {...actionProps}
                                  />
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
          </Box>
        </>
      )}

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
