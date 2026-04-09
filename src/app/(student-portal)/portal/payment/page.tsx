"use client";

import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  NumberFormatter,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCheck, IconUser } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { PaymentSkeleton } from "@/components/ui/PortalSkeleton";
import { useStudentMe } from "@/hooks/api/useStudentAuth";
import { useCreatePaymentRequest } from "@/hooks/api/useStudentPaymentRequests";
import {
  type StudentTuition,
  useStudentTuitions,
} from "@/hooks/api/useStudentTuitions";
import { queryKeys } from "@/lib/query-keys";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function groupByAcademicYear(
  tuitions: StudentTuition[],
): Record<string, StudentTuition[]> {
  return tuitions.reduce(
    (acc, tuition) => {
      const key = tuition.academicYear;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(tuition);
      return acc;
    },
    {} as Record<string, StudentTuition[]>,
  );
}

export default function StudentPaymentPage() {
  const router = useRouter();
  const t = useTranslations();
  const [selectedTuitions, setSelectedTuitions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: user, isLoading: userLoading } = useStudentMe();
  const { data: tuitions, isLoading: tuitionsLoading } = useStudentTuitions();
  const createPayment = useCreatePaymentRequest();
  const queryClient = useQueryClient();

  const formatPeriod = (period: string): string => {
    // Check months first
    const monthKey = `months.${period}` as const;
    const monthTranslation = t.raw(monthKey);
    if (monthTranslation !== monthKey) {
      return monthTranslation as string;
    }
    // Check periods (Q1, Q2, SEM1, etc.)
    const periodKey = `periods.${period}` as const;
    const periodTranslation = t.raw(periodKey);
    if (periodTranslation !== periodKey) {
      return periodTranslation as string;
    }
    return period;
  };

  const groupedTuitions = useMemo(() => {
    if (!tuitions) return {};
    return groupByAcademicYear(tuitions);
  }, [tuitions]);

  // Tuitions available for selection (not paid and not in pending payment)
  const selectableTuitions = useMemo(() => {
    return (
      tuitions?.filter((t) => t.status !== "PAID" && !t.pendingPaymentId) || []
    );
  }, [tuitions]);

  const totalAmount = selectableTuitions
    .filter((t) => selectedTuitions.includes(t.id))
    .reduce((sum, t) => sum + t.remainingAmount, 0);

  const handleToggleTuition = (tuitionId: string) => {
    setSelectedTuitions((prev) =>
      prev.includes(tuitionId)
        ? prev.filter((id) => id !== tuitionId)
        : [...prev, tuitionId],
    );
  };

  const handleSelectAllUnpaid = () => {
    if (selectedTuitions.length === selectableTuitions.length) {
      setSelectedTuitions([]);
    } else {
      setSelectedTuitions(selectableTuitions.map((t) => t.id));
    }
  };

  const handleCreatePayment = () => {
    if (selectedTuitions.length === 0) {
      setError(t("payment.selectMinOne"));
      return;
    }

    modals.openConfirmModal({
      title: t("payment.confirmPayment"),
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {t("payment.willCreatePayment", {
              count: selectedTuitions.length,
            })}
          </Text>
          <Text size="lg" fw={700} c="blue" ta="center">
            Rp {totalAmount.toLocaleString("id-ID")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("payment.afterConfirm")}
          </Text>
        </Stack>
      ),
      labels: {
        confirm: t("payment.yesCreate"),
        cancel: t("common.cancel"),
      },
      confirmProps: { color: "blue" },
      onConfirm: async () => {
        setError(null);
        try {
          const res = await createPayment.mutateAsync({
            tuitionIds: selectedTuitions,
          });
          createPayment.resetIdempotencyKey();
          notifications.show({
            title: t("payment.paymentCreated"),
            message: t("payment.completeTransferTime"),
            color: "blue",
            icon: <IconCheck size={16} />,
          });
          router.push(`/portal/payment/${res.id}`);
          queryClient.invalidateQueries({
            queryKey: queryKeys.studentTuitions.list(),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.studentPaymentRequests.lists(),
          });
        } catch (err) {
          setError(
            err instanceof Error ? err.message : t("payment.failedCreate"),
          );
        }
      },
    });
  };

  const getTuitionStatusBadge = (
    status: string,
    hasPendingPayment: boolean,
  ) => {
    if (hasPendingPayment) {
      return (
        <Badge color="blue" size="xs">
          {t("payment.inProcess")}
        </Badge>
      );
    }
    const statusMap: Record<string, { color: string; label: string }> = {
      UNPAID: { color: "red", label: t("tuition.status.unpaid") },
      PARTIAL: { color: "yellow", label: t("tuition.status.partial") },
      PAID: { color: "green", label: t("tuition.status.paid") },
    };
    const { color, label } = statusMap[status] || {
      color: "gray",
      label: status,
    };
    return (
      <Badge color={color} size="xs">
        {label}
      </Badge>
    );
  };

  if (tuitionsLoading || userLoading) {
    return <PaymentSkeleton />;
  }

  const UserHeader = () => (
    <Card withBorder p="sm" mb="md">
      <Group gap="sm">
        <Avatar size="lg" radius="xl" color="blue">
          {user ? getInitials(user.name) : <IconUser size={24} />}
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" truncate>
            {user?.name}
          </Text>
          <Text size="xs" c="dimmed">
            NIS: {user?.nis}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {t("payment.guardian")} {user?.parentName}
          </Text>
        </Box>
      </Group>
    </Card>
  );

  return (
    <Stack gap="md">
      <UserHeader />

      <Group gap="xs" align="center">
        <Title order={4}>{t("payment.title")}</Title>
      </Group>

      {error && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="red"
          variant="light"
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      <Stack gap="md">
        {Object.entries(groupedTuitions).map(([academicYear, yearTuitions]) => {
          const unpaidInYear = yearTuitions.filter((t) => t.status !== "PAID");
          const allPaidInYear = unpaidInYear.length === 0;

          return (
            <Card key={academicYear} withBorder p="sm">
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <Text fw={600} size="sm">
                      {t("dashboard.academicYear", {
                        year: academicYear,
                      })}
                    </Text>
                    {allPaidInYear && (
                      <Badge color="green" size="xs">
                        {t("payment.paidBadge")}
                      </Badge>
                    )}
                  </Group>
                  {(() => {
                    const selectableInYear = unpaidInYear.filter(
                      (t) => !t.pendingPaymentId,
                    );
                    if (selectableInYear.length <= 1) return null;
                    const selectableIds = selectableInYear.map((t) => t.id);
                    const allSelected = selectableIds.every((id) =>
                      selectedTuitions.includes(id),
                    );
                    return (
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => {
                          if (allSelected) {
                            setSelectedTuitions((prev) =>
                              prev.filter((id) => !selectableIds.includes(id)),
                            );
                          } else {
                            setSelectedTuitions((prev) => [
                              ...new Set([...prev, ...selectableIds]),
                            ]);
                          }
                        }}
                      >
                        {allSelected
                          ? t("common.cancel")
                          : t("payment.selectAll")}
                      </Button>
                    );
                  })()}
                </Group>

                <Stack gap="xs">
                  {yearTuitions.map((tuition) => {
                    const isPaid = tuition.status === "PAID";
                    const hasPendingPayment = !!tuition.pendingPaymentId;
                    const isDisabled = isPaid || hasPendingPayment;
                    const isSelected = selectedTuitions.includes(tuition.id);

                    return (
                      <Paper
                        key={tuition.id}
                        withBorder
                        p="xs"
                        style={{
                          cursor: isDisabled ? "default" : "pointer",
                          opacity: isDisabled ? 0.7 : 1,
                          backgroundColor: isSelected
                            ? "var(--mantine-color-blue-0)"
                            : hasPendingPayment
                              ? "var(--mantine-color-blue-0)"
                              : undefined,
                        }}
                        onClick={() =>
                          !isDisabled && handleToggleTuition(tuition.id)
                        }
                      >
                        <Group justify="space-between" wrap="nowrap" gap="xs">
                          <Group
                            gap="xs"
                            wrap="nowrap"
                            style={{ flex: 1, minWidth: 0 }}
                          >
                            {!isDisabled ? (
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleToggleTuition(tuition.id)}
                                size="sm"
                              />
                            ) : (
                              <Box w={20} />
                            )}
                            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                              <Group gap="xs" wrap="nowrap">
                                <Text size="sm" fw={500} truncate>
                                  {formatPeriod(tuition.period)} {tuition.year}
                                </Text>
                                {getTuitionStatusBadge(
                                  tuition.status,
                                  hasPendingPayment,
                                )}
                              </Group>
                              <Text size="xs" c="dimmed" truncate>
                                {tuition.className}
                              </Text>
                            </Stack>
                          </Group>
                          <Stack
                            gap={0}
                            align="flex-end"
                            style={{ flexShrink: 0 }}
                          >
                            <Text
                              size="sm"
                              fw={600}
                              c={
                                isPaid
                                  ? "green"
                                  : hasPendingPayment
                                    ? "blue"
                                    : undefined
                              }
                            >
                              <NumberFormatter
                                value={
                                  isPaid
                                    ? Number(tuition.paidAmount)
                                    : tuition.remainingAmount
                                }
                                prefix="Rp "
                                thousandSeparator="."
                                decimalSeparator=","
                              />
                            </Text>
                            {!isPaid &&
                              tuition.status === "PARTIAL" &&
                              !hasPendingPayment && (
                                <Text size="xs" c="dimmed">
                                  {t("payment.paidLabel")} Rp{" "}
                                  {Number(tuition.paidAmount).toLocaleString(
                                    "id-ID",
                                  )}
                                </Text>
                              )}
                            {hasPendingPayment && (
                              <Text size="xs" c="blue">
                                {t("payment.waitingTransfer")}
                              </Text>
                            )}
                          </Stack>
                        </Group>
                      </Paper>
                    );
                  })}
                </Stack>
              </Stack>
            </Card>
          );
        })}

        {/* Sticky Payment Summary */}
        {selectedTuitions.length > 0 && (
          <Box
            style={{
              position: "sticky",
              bottom: 0,
              marginLeft: "-var(--mantine-spacing-md)",
              marginRight: "-var(--mantine-spacing-md)",
              marginBottom: "-var(--mantine-spacing-md)",
            }}
          >
            <Card
              withBorder
              p="sm"
              bg="blue.0"
              radius={0}
              style={{ borderLeft: 0, borderRight: 0, borderBottom: 0 }}
            >
              <Stack gap="sm">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      {t("payment.totalSelected", {
                        count: selectedTuitions.length,
                      })}
                    </Text>
                    {selectableTuitions.length > selectedTuitions.length && (
                      <Button
                        variant="subtle"
                        size="xs"
                        p={0}
                        h="auto"
                        onClick={handleSelectAllUnpaid}
                      >
                        {t("payment.selectAllCount", {
                          count: selectableTuitions.length,
                        })}
                      </Button>
                    )}
                    {selectedTuitions.length === selectableTuitions.length &&
                      selectableTuitions.length > 0 && (
                        <Button
                          variant="subtle"
                          size="xs"
                          p={0}
                          h="auto"
                          onClick={() => setSelectedTuitions([])}
                        >
                          {t("payment.deselectAll")}
                        </Button>
                      )}
                  </Stack>
                  <Title order={4} c="blue">
                    <NumberFormatter
                      value={totalAmount}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Title>
                </Group>
                <Button
                  fullWidth
                  size="md"
                  onClick={handleCreatePayment}
                  loading={createPayment.isPending}
                >
                  {t("payment.createPayment")}
                </Button>
              </Stack>
            </Card>
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
