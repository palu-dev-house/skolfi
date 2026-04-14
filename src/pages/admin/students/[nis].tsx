import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconKey,
  IconPlus,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import StudentExitSection from "@/components/forms/StudentExitSection";
import StudentForm from "@/components/forms/StudentForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useFeeBills } from "@/hooks/api/useFeeBills";
import { useFeeServices } from "@/hooks/api/useFeeServices";
import {
  useCreateFeeSubscription,
  useFeeSubscriptions,
  useUpdateFeeSubscription,
} from "@/hooks/api/useFeeSubscriptions";
import { useServiceFeeBills } from "@/hooks/api/useServiceFeeBills";
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

      <Grid gutter="lg">
        {/* Main Column - Student Form */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Paper withBorder p="lg">
            <StudentForm
              initialData={student}
              onSubmit={handleSubmit}
              isLoading={updateStudent.isPending}
              isEdit
            />
          </Paper>
        </Grid.Col>

        {/* Sidebar Column - Status & Account (sticky on desktop) */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Box
            style={{
              position: "sticky",
              top: 76,
            }}
          >
            <Stack gap="md">
              <StudentExitSection
                nis={student.nis}
                startJoinDate={student.startJoinDate}
                exitedAt={student.exitedAt ?? null}
                exitReason={student.exitReason ?? null}
                exitedBy={student.exitedBy ?? null}
                onChanged={() => refetch()}
              />

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
                      <Group gap="xs">
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

                      <Stack gap="xs">
                        <Button
                          variant="outline"
                          leftSection={<IconKey size={18} />}
                          onClick={openResetModal}
                          fullWidth
                        >
                          {t("studentAccount.resetPassword")}
                        </Button>
                        <Button
                          variant="outline"
                          color="red"
                          leftSection={<IconTrash size={18} />}
                          onClick={openDeleteModal}
                          fullWidth
                        >
                          {t("studentAccount.deleteAccount")}
                        </Button>
                      </Stack>
                    </>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Box>
        </Grid.Col>

        <Grid.Col span={12}>
          <SubscriptionsSection nis={student.nis} />
        </Grid.Col>
        <Grid.Col span={12}>
          <FeeBillsSection nis={student.nis} />
        </Grid.Col>
      </Grid>

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
function formatRp(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function SubscriptionsSection({ nis }: { nis: string }) {
  const t = useTranslations();
  const { data, isLoading } = useFeeSubscriptions({
    studentNis: nis,
    limit: 50,
  });
  const { data: services } = useFeeServices({ isActive: true, limit: 200 });
  const create = useCreateFeeSubscription();
  const endSub = useUpdateFeeSubscription();
  const [opened, { open, close }] = useDisclosure(false);
  const [feeServiceId, setFeeServiceId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(
    dayjs().format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState<string | null>(null);

  const subs = data?.subscriptions ?? [];

  const handleCreate = () => {
    if (!feeServiceId || !startDate) return;
    create.mutate(
      {
        feeServiceId,
        studentNis: nis,
        startDate,
        endDate: endDate ?? undefined,
      },
      {
        onSuccess: () => {
          notifications.show({
            color: "green",
            title: t("common.success"),
            message: t("feeService.subscribed"),
          });
          close();
          setFeeServiceId(null);
          setStartDate(dayjs().format("YYYY-MM-DD"));
          setEndDate(null);
        },
        onError: (err) =>
          notifications.show({
            color: "red",
            title: t("common.error"),
            message: err.message,
          }),
      },
    );
  };

  const handleEnd = (id: string) =>
    modals.openConfirmModal({
      title: t("feeService.endSubscriptionTitle"),
      children: (
        <Text size="sm">
          {t("feeService.endSubscriptionConfirm", { name: "" })}
        </Text>
      ),
      labels: { confirm: t("common.confirm"), cancel: t("common.cancel") },
      onConfirm: () =>
        endSub.mutate({
          id,
          updates: { endDate: dayjs().format("YYYY-MM-DD") },
        }),
    });

  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm">
        <Title order={5}>{t("student.subscriptions")}</Title>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={open}>
          {t("feeService.subscribeStudent")}
        </Button>
      </Group>
      {isLoading ? (
        <Text c="dimmed">{t("common.loading")}</Text>
      ) : subs.length === 0 ? (
        <Text c="dimmed">{t("feeService.noSubscribers")}</Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("feeService.name")}</Table.Th>
              <Table.Th>{t("feeService.category.label")}</Table.Th>
              <Table.Th>{t("feeService.startDate")}</Table.Th>
              <Table.Th>{t("feeService.endDate")}</Table.Th>
              <Table.Th style={{ width: 120 }}>{t("common.actions")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {subs.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td>{s.feeService?.name ?? "-"}</Table.Td>
                <Table.Td>
                  {s.feeService?.category
                    ? t(
                        `feeService.category.${s.feeService.category.toLowerCase()}`,
                      )
                    : "-"}
                </Table.Td>
                <Table.Td>{dayjs(s.startDate).format("DD MMM YYYY")}</Table.Td>
                <Table.Td>
                  {s.endDate ? (
                    dayjs(s.endDate).format("DD MMM YYYY")
                  ) : (
                    <Badge color="green" variant="light">
                      {t("feeService.active")}
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  {!s.endDate && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => handleEnd(s.id)}
                    >
                      {t("feeService.endSubscription")}
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={opened}
        onClose={close}
        title={t("feeService.subscribeStudent")}
      >
        <Stack gap="md">
          <Select
            label={t("feeService.label")}
            required
            searchable
            data={(services?.feeServices ?? []).map((f) => ({
              value: f.id,
              label: `${f.name} — ${t(`feeService.category.${f.category.toLowerCase()}`)}`,
            }))}
            value={feeServiceId}
            onChange={setFeeServiceId}
          />
          <DatePickerInput
            label={t("feeService.startDate")}
            required
            value={startDate}
            onChange={setStartDate}
          />
          <DatePickerInput
            label={t("feeService.endDate")}
            clearable
            value={endDate}
            onChange={setEndDate}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} loading={create.isPending}>
              {t("common.save")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}

function FeeBillsSection({ nis }: { nis: string }) {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { data: feeBillsData } = useFeeBills({
    studentNis: nis,
    page,
    limit: 10,
    period: period || undefined,
    status: status as "UNPAID" | "PARTIAL" | "PAID" | "VOID" | undefined,
  });
  const { data: serviceFeeBillsData } = useServiceFeeBills({
    studentNis: nis,
    page,
    limit: 10,
    period: period || undefined,
    status: status as "UNPAID" | "PARTIAL" | "PAID" | "VOID" | undefined,
  });

  type Row = {
    key: string;
    type: "FEE" | "SERVICE_FEE";
    description: string;
    period: string;
    year: number;
    amount: string;
    paidAmount: string;
    status: string;
  };

  const rows: Row[] = [
    ...(feeBillsData?.feeBills ?? []).map((b) => ({
      key: `fee:${b.id}`,
      type: "FEE" as const,
      description: b.feeService?.name ?? t("feeBill.label"),
      period: b.period,
      year: b.year,
      amount: b.amount,
      paidAmount: b.paidAmount,
      status: b.status,
    })),
    ...(serviceFeeBillsData?.serviceFeeBills ?? []).map((b) => ({
      key: `svc:${b.id}`,
      type: "SERVICE_FEE" as const,
      description: b.serviceFee?.name ?? t("serviceFee.label"),
      period: b.period,
      year: b.year,
      amount: b.amount,
      paidAmount: b.paidAmount,
      status: b.status,
    })),
  ].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : a.period.localeCompare(b.period),
  );

  const months = [
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
  ];

  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm">
        <Title order={5}>{t("student.feeBills")}</Title>
        <Group>
          <Select
            placeholder={t("feeBill.period")}
            data={months.map((p) => ({ value: p, label: t(`months.${p}`) }))}
            value={period}
            onChange={setPeriod}
            clearable
            w={160}
          />
          <Select
            placeholder={t("common.status")}
            data={["UNPAID", "PARTIAL", "PAID", "VOID"].map((s) => ({
              value: s,
              label: t(`tuition.status.${s.toLowerCase()}`),
            }))}
            value={status}
            onChange={setStatus}
            clearable
            w={160}
          />
        </Group>
      </Group>
      {rows.length === 0 ? (
        <Text c="dimmed">{t("feeBill.noBills")}</Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("payment.type")}</Table.Th>
              <Table.Th>{t("payment.description")}</Table.Th>
              <Table.Th>{t("feeBill.period")}</Table.Th>
              <Table.Th>{t("feeBill.amount")}</Table.Th>
              <Table.Th>{t("feeBill.paid")}</Table.Th>
              <Table.Th>{t("common.status")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.key}>
                <Table.Td>
                  <Badge
                    color={r.type === "FEE" ? "orange" : "grape"}
                    variant="light"
                  >
                    {t(`payment.itemType.${r.type}`)}
                  </Badge>
                </Table.Td>
                <Table.Td>{r.description}</Table.Td>
                <Table.Td>
                  {t(`months.${r.period}`)} {r.year}
                </Table.Td>
                <Table.Td>{formatRp(r.amount)}</Table.Td>
                <Table.Td>{formatRp(r.paidAmount)}</Table.Td>
                <Table.Td>
                  <Badge>{t(`tuition.status.${r.status.toLowerCase()}`)}</Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Group justify="center" mt="sm">
        <Button
          size="xs"
          variant="subtle"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          {t("common.previous")}
        </Button>
        <Text size="sm">{page}</Text>
        <Button
          size="xs"
          variant="subtle"
          onClick={() => setPage((p) => p + 1)}
        >
          {t("common.next")}
        </Button>
      </Group>
    </Card>
  );
}

EditStudentPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default EditStudentPage;
