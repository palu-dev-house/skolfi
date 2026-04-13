import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconKey,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import StudentForm from "@/components/forms/StudentForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import {
  useCreateStudentAccount,
  useDeleteStudentAccount,
  useResetStudentPassword,
  useRestoreStudentAccount,
} from "@/hooks/api/useStudentAccounts";
import { useStudent, useUpdateStudent } from "@/hooks/api/useStudents";
import type { NextPageWithLayout } from "@/lib/page-types";

const EditStudentPage: NextPageWithLayout = function EditStudentPage() {
  const router = useRouter();
  const { nis } = router.query as { nis: string };
  const t = useTranslations();
  const { data: student, isLoading, refetch } = useStudent(nis);
  const updateStudent = useUpdateStudent();

  const [
    createAccountModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const [
    resetPasswordModalOpened,
    { open: openResetModal, close: closeResetModal },
  ] = useDisclosure(false);
  const [
    deleteAccountModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const createAccount = useCreateStudentAccount();
  const resetPassword = useResetStudentPassword();
  const deleteAccount = useDeleteStudentAccount();
  const restoreAccount = useRestoreStudentAccount();

  const handleSubmit = (data: {
    nis: string;
    nik: string;
    name: string;
    address: string;
    parentName: string;
    parentPhone: string;
    startJoinDate: string;
  }) => {
    const { nis: _nis, ...updates } = data;
    updateStudent.mutate(
      { nis, updates },
      {
        onSuccess: () => {
          notifications.show({
            title: t("common.success"),
            message: t("student.updateSuccess"),
            color: "green",
          });
          router.push("/admin/students");
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

  const handleCreateAccount = () => {
    createAccount.mutate(nis, {
      onSuccess: (data) => {
        setCreatedPassword(data.defaultPassword);
        notifications.show({
          title: t("common.success"),
          message: t("studentAccount.createSuccess"),
          color: "green",
        });
        refetch();
      },
      onError: (err) => {
        notifications.show({
          title: t("common.error"),
          message: err instanceof Error ? err.message : t("common.error"),
          color: "red",
        });
        closeCreateModal();
      },
    });
  };

  const handleResetPassword = () => {
    resetPassword.mutate(nis, {
      onSuccess: (data) => {
        notifications.show({
          title: t("common.success"),
          message: `${t("studentAccount.resetPasswordSuccess")}: ${data.newPassword}`,
          color: "green",
        });
        closeResetModal();
      },
      onError: (err) => {
        notifications.show({
          title: t("common.error"),
          message: err instanceof Error ? err.message : t("common.error"),
          color: "red",
        });
      },
    });
  };

  const handleDeleteAccount = () => {
    deleteAccount.mutate(
      { nis, reason: "Manual deletion by admin" },
      {
        onSuccess: () => {
          notifications.show({
            title: t("common.success"),
            message: t("studentAccount.deleteSuccess"),
            color: "green",
          });
          closeDeleteModal();
          refetch();
        },
        onError: (err) => {
          notifications.show({
            title: t("common.error"),
            message: err instanceof Error ? err.message : t("common.error"),
            color: "red",
          });
        },
      },
    );
  };

  const handleRestoreAccount = () => {
    restoreAccount.mutate(nis, {
      onSuccess: () => {
        notifications.show({
          title: t("common.success"),
          message: t("studentAccount.restoreSuccess", {
            name: student?.name || "",
          }),
          color: "green",
        });
        refetch();
      },
      onError: (err) => {
        notifications.show({
          title: t("common.error"),
          message:
            err instanceof Error
              ? err.message
              : t("studentAccount.restoreError"),
          color: "red",
        });
      },
    });
  };

  if (isLoading) return <LoadingOverlay visible />;
  if (!student) return <Text>{t("student.noStudents")}</Text>;

  const hasAccount = student.hasAccount;
  const isDeleted = student.accountDeleted;

  return (
    <>
      <PageHeader
        title={t("student.edit")}
        description={`${t("student.edit")} ${student.name}`}
      />

      <Stack gap="lg">
        {/* Student Form */}
        <Paper withBorder p="lg">
          <StudentForm
            initialData={student}
            onSubmit={handleSubmit}
            isLoading={updateStudent.isPending}
            isEdit
          />
        </Paper>

        {/* Account Management */}
        <Card withBorder>
          <Stack gap="md">
            <Title order={5}>{t("studentAccount.portalAccount")}</Title>

            {!hasAccount ? (
              <>
                <Alert icon={<IconAlertCircle size={18} />} color="gray">
                  {t("studentAccount.noAccountMsg")}
                </Alert>
                <Button
                  leftSection={<IconUserPlus size={18} />}
                  onClick={openCreateModal}
                >
                  {t("studentAccount.createAccount")}
                </Button>
              </>
            ) : isDeleted ? (
              <>
                <Alert icon={<IconAlertCircle size={18} />} color="red">
                  {t("studentAccount.accountDeletedMsg")}
                </Alert>
                <Button
                  variant="outline"
                  onClick={handleRestoreAccount}
                  loading={restoreAccount.isPending}
                >
                  {t("studentAccount.restore")}
                </Button>
              </>
            ) : (
              <>
                <Group>
                  <Badge color="green" variant="light">
                    {t("studentAccount.status.active")}
                  </Badge>
                  {student.mustChangePassword && (
                    <Badge color="yellow" variant="light">
                      {t("studentAccount.status.mustChangePassword")}
                    </Badge>
                  )}
                </Group>

                <Divider />

                <Group>
                  <Button
                    variant="outline"
                    leftSection={<IconKey size={18} />}
                    onClick={openResetModal}
                  >
                    {t("studentAccount.resetPassword")}
                  </Button>
                  <Button
                    variant="outline"
                    color="red"
                    leftSection={<IconTrash size={18} />}
                    onClick={openDeleteModal}
                  >
                    {t("studentAccount.deleteAccount")}
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Card>
      </Stack>

      {/* Create Account Modal */}
      <Modal
        opened={createAccountModalOpened}
        onClose={() => {
          closeCreateModal();
          setCreatedPassword(null);
        }}
        title={t("studentAccount.createAccount")}
      >
        <Stack gap="md">
          {createdPassword ? (
            <>
              <Alert icon={<IconCheck size={18} />} color="green">
                {t("studentAccount.createSuccess")}
              </Alert>
              <Text>
                {t.rich("studentAccount.defaultPasswordMsg", {
                  password: createdPassword,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </Text>
              <Text size="sm" c="dimmed">
                {t("studentAccount.givePasswordMsg")}
              </Text>
              <Button
                onClick={() => {
                  closeCreateModal();
                  setCreatedPassword(null);
                }}
              >
                {t("studentAccount.close")}
              </Button>
            </>
          ) : (
            <>
              <Text>
                {t.rich("studentAccount.createConfirm", {
                  phone: student.parentPhone,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </Text>
              <Group justify="flex-end">
                <Button variant="outline" onClick={closeCreateModal}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleCreateAccount}
                  loading={createAccount.isPending}
                >
                  {t("studentAccount.createAccount")}
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        opened={resetPasswordModalOpened}
        onClose={closeResetModal}
        title={t("studentAccount.resetPassword")}
      >
        <Stack gap="md">
          <Text>
            {t.rich("studentAccount.resetPasswordMessage", {
              name: student.name,
              nis: student.nis,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={closeResetModal}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleResetPassword}
              loading={resetPassword.isPending}
            >
              {t("studentAccount.resetPassword")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        opened={deleteAccountModalOpened}
        onClose={closeDeleteModal}
        title={t("studentAccount.deleteAccount")}
      >
        <Stack gap="md">
          <Text>
            {t.rich("studentAccount.deleteAccountMessage", {
              name: student.name,
              nis: student.nis,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={closeDeleteModal}>
              {t("common.cancel")}
            </Button>
            <Button
              color="red"
              onClick={handleDeleteAccount}
              loading={deleteAccount.isPending}
            >
              {t("studentAccount.deleteAccount")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
EditStudentPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default EditStudentPage;
