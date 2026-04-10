"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Group,
  Menu,
  Pagination,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
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
import {
  useDeleteStudentAccount,
  useResetStudentPassword,
  useRestoreStudentAccount,
  useStudentAccounts,
} from "@/hooks/api/useStudentAccounts";

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

export default function StudentAccountsPage() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const { data, isLoading, error, refetch } = useStudentAccounts({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    includeDeleted,
  });

  const resetPassword = useResetStudentPassword();
  const deleteAccount = useDeleteStudentAccount();
  const restoreAccount = useRestoreStudentAccount();

  const accounts = data?.students || [];
  const totalPages = data?.pagination.totalPages || 1;

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

  return (
    <Stack gap="lg">
      <Title order={3}>{t("studentAccount.title")}</Title>

      {error && (
        <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light">
          {error instanceof Error ? error.message : t("common.error")}
        </Alert>
      )}

      <Card withBorder>
        <Stack gap="md">
          <Group>
            <TextInput
              placeholder={t("studentAccount.searchPlaceholder")}
              leftSection={<IconSearch size={18} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
              style={{ flex: 1 }}
            />
            <Switch
              label={t("studentAccount.includeDeleted")}
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.currentTarget.checked);
                setPage(1);
              }}
            />
            <ActionIcon variant="default" size="lg" onClick={() => refetch()} loading={isLoading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>

          {isLoading ? (
            <Stack gap="sm">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={50} />
              ))}
            </Stack>
          ) : accounts.length === 0 ? (
            <Alert icon={<IconAlertCircle size={18} />} color="gray">
              {t("student.noStudents")}
            </Alert>
          ) : (
            <>
              <Table.ScrollContainer minWidth={800}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t("student.nis")}</Table.Th>
                      <Table.Th>{t("common.name")}</Table.Th>
                      <Table.Th>{t("studentAccount.parent")}</Table.Th>
                      <Table.Th>{t("studentAccount.phone")}</Table.Th>
                      <Table.Th>{t("studentAccount.lastLogin")}</Table.Th>
                      <Table.Th>{t("common.status")}</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {accounts.map((account) => (
                      <Table.Tr key={account.nis}>
                        <Table.Td>
                          <Text fw={500}>{account.nis}</Text>
                        </Table.Td>
                        <Table.Td>{account.name}</Table.Td>
                        <Table.Td>{account.parentName}</Table.Td>
                        <Table.Td>{account.parentPhone}</Table.Td>
                        <Table.Td>
                          {account.lastLoginAt
                            ? dayjs(account.lastLoginAt).format(
                                "DD/MM/YY HH:mm",
                              )
                            : "-"}
                        </Table.Td>
                        <Table.Td>
                          {account.accountDeleted ? (
                            <Badge color="red" variant="light">
                              {t("studentAccount.status.deleted")}
                            </Badge>
                          ) : account.mustChangePassword ? (
                            <Badge color="yellow" variant="light">
                              {t("studentAccount.status.mustChangePassword")}
                            </Badge>
                          ) : (
                            <Badge color="green" variant="light">
                              {t("studentAccount.status.active")}
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Menu position="bottom-end">
                            <Menu.Target>
                              <ActionIcon variant="subtle">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {account.accountDeleted ? (
                                <Menu.Item
                                  onClick={() => handleRestoreAccount(account)}
                                  disabled={restoreAccount.isPending}
                                >
                                  {t("studentAccount.restore")}
                                </Menu.Item>
                              ) : (
                                <>
                                  <Menu.Item
                                    leftSection={<IconKey size={14} />}
                                    onClick={() => handleResetPassword(account)}
                                    disabled={resetPassword.isPending}
                                  >
                                    {t("studentAccount.resetPassword")}
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconTrash size={14} />}
                                    color="red"
                                    onClick={() => handleDeleteAccount(account)}
                                    disabled={deleteAccount.isPending}
                                  >
                                    {t("studentAccount.deleteAccount")}
                                  </Menu.Item>
                                </>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              <Group justify="center">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={totalPages}
                />
              </Group>
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
