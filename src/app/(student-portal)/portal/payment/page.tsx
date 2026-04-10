"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Loader,
  NumberFormatter,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconAlertCircle,
  IconCreditCard,
  IconLoader,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyAnimation } from "@/components/ui/LottieAnimation";
import {
  useCancelOnlinePayment,
  useCreateOnlinePayment,
  usePaymentConfig,
  useStudentOnlinePayments,
} from "@/hooks/api/useOnlinePayments";
import type { StudentTuition } from "@/hooks/api/useStudentTuitions";
import { useStudentTuitions } from "@/hooks/api/useStudentTuitions";

declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: Record<string, unknown>) => void;
          onPending?: (result: Record<string, unknown>) => void;
          onError?: (result: Record<string, unknown>) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "SETTLEMENT":
      return "green";
    case "PENDING":
      return "yellow";
    case "EXPIRE":
      return "gray";
    case "CANCEL":
      return "gray";
    default:
      return "red";
  }
}

export default function PaymentPage() {
  const t = useTranslations();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snapReady, setSnapReady] = useState(false);
  const snapLoadedRef = useRef(false);

  const { data: config, isLoading: configLoading } = usePaymentConfig();
  const { data: tuitions = [], isLoading: tuitionsLoading } =
    useStudentTuitions();
  const { data: onlinePayments = [], isLoading: paymentsLoading } =
    useStudentOnlinePayments();

  const createPayment = useCreateOnlinePayment();
  const cancelPayment = useCancelOnlinePayment();

  // Find active pending payment
  const pendingPayment = useMemo(
    () => onlinePayments.find((p) => p.status === "PENDING"),
    [onlinePayments],
  );

  // Unpaid tuitions available for payment
  const payableTuitions = useMemo(
    () => tuitions.filter((t) => t.status !== "PAID" && t.remainingAmount > 0),
    [tuitions],
  );

  const selectedTotal = useMemo(
    () =>
      payableTuitions
        .filter((t) => selectedIds.has(t.id))
        .reduce((sum, t) => sum + t.remainingAmount, 0),
    [payableTuitions, selectedIds],
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === payableTuitions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payableTuitions.map((t) => t.id)));
    }
  };

  const handleSnapCallback = useCallback(() => {
    // Refetch after any Snap interaction
    createPayment.reset();
  }, [createPayment]);

  const handleCreatePayment = async () => {
    if (selectedIds.size === 0) return;

    try {
      const result = await createPayment.mutateAsync({
        tuitionIds: Array.from(selectedIds),
      });

      // Open Snap popup
      if (window.snap && result.snapToken) {
        window.snap.pay(result.snapToken, {
          onSuccess: handleSnapCallback,
          onPending: handleSnapCallback,
          onError: handleSnapCallback,
          onClose: handleSnapCallback,
        });
      }
    } catch {
      // Error shown via mutation state
    }
  };

  const handleCancelPayment = (paymentId: string) => {
    modals.openConfirmModal({
      title: t("common.confirm"),
      children: <Text size="sm">{t("onlinePayment.cancelConfirm")}</Text>,
      labels: {
        confirm: t("onlinePayment.cancelPayment"),
        cancel: t("common.cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: () => cancelPayment.mutate(paymentId),
    });
  };

  const handleRetrySnap = () => {
    if (pendingPayment?.snapToken && window.snap) {
      window.snap.pay(pendingPayment.snapToken, {
        onSuccess: handleSnapCallback,
        onPending: handleSnapCallback,
        onError: handleSnapCallback,
        onClose: handleSnapCallback,
      });
    }
  };

  // Load snap.js
  useEffect(() => {
    if (config?.snapJsUrl && !snapLoadedRef.current) {
      snapLoadedRef.current = true;
    }
  }, [config?.snapJsUrl]);

  const isLoading = configLoading || tuitionsLoading || paymentsLoading;

  if (isLoading) {
    return (
      <Stack align="center" justify="center" h={300}>
        <Loader />
      </Stack>
    );
  }

  // Maintenance mode
  if (config && !config.enabled) {
    return (
      <Stack gap="lg">
        <Title order={3}>{t("onlinePayment.title")}</Title>
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="orange"
          variant="light"
        >
          {config.maintenanceMessage || t("onlinePayment.maintenance")}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {config?.snapJsUrl && (
        <Script
          src={config.snapJsUrl}
          data-client-key={config.clientKey}
          onLoad={() => setSnapReady(true)}
        />
      )}

      <Title order={3}>{t("onlinePayment.title")}</Title>

      {/* Active Pending Payment */}
      {pendingPayment && (
        <Card
          withBorder
          p="lg"
          style={{ borderLeft: "4px solid var(--mantine-color-yellow-6)" }}
        >
          <Stack gap="md">
            <Group justify="space-between">
              <Group gap="xs">
                <IconLoader size={20} />
                <Text fw={600}>{t("onlinePayment.pendingPayment")}</Text>
              </Group>
              <Badge color="yellow" variant="light">
                {t("onlinePayment.waitingPayment")}
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  {t("onlinePayment.orderId")}
                </Text>
                <Text size="sm" fw={500}>
                  {pendingPayment.orderId}
                </Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  {t("onlinePayment.amount")}
                </Text>
                <Text size="sm" fw={700} c="blue">
                  <NumberFormatter
                    value={Number(pendingPayment.grossAmount)}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </Stack>
              {pendingPayment.expiryTime && (
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    {t("onlinePayment.expiresAt")}
                  </Text>
                  <Text size="sm">
                    {dayjs(pendingPayment.expiryTime).format(
                      "DD/MM/YYYY HH:mm",
                    )}
                  </Text>
                </Stack>
              )}
            </SimpleGrid>

            <Divider />

            <Text size="xs" c="dimmed" fw={600}>
              {t("onlinePayment.items")}:
            </Text>
            {pendingPayment.items.map((item) => (
              <Group key={item.id} justify="space-between">
                <Text size="sm">
                  {item.tuition.classAcademic.className} - {item.tuition.period}{" "}
                  {item.tuition.year}
                </Text>
                <Text size="sm" fw={500}>
                  <NumberFormatter
                    value={Number(item.amount)}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </Group>
            ))}

            <Group>
              <Button
                onClick={handleRetrySnap}
                disabled={!snapReady}
                leftSection={<IconCreditCard size={18} />}
              >
                {t("onlinePayment.continuePayment")}
              </Button>
              <Button
                variant="light"
                color="red"
                leftSection={<IconX size={18} />}
                onClick={() => handleCancelPayment(pendingPayment.id)}
                loading={cancelPayment.isPending}
              >
                {t("onlinePayment.cancelPayment")}
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Tuition Selection (only if no pending payment) */}
      {!pendingPayment && (
        <>
          {payableTuitions.length === 0 ? (
            <Card withBorder>
              <EmptyAnimation message={t("onlinePayment.allPaid")} />
            </Card>
          ) : (
            <>
              <Card withBorder p="md">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text fw={600}>{t("onlinePayment.selectTuitions")}</Text>
                    <Button variant="subtle" size="xs" onClick={selectAll}>
                      {selectedIds.size === payableTuitions.length
                        ? t("common.deselectAll")
                        : t("common.selectAll")}
                    </Button>
                  </Group>

                  {payableTuitions.map((tuition) => (
                    <TuitionCheckItem
                      key={tuition.id}
                      tuition={tuition}
                      checked={selectedIds.has(tuition.id)}
                      onChange={() => toggleSelection(tuition.id)}
                    />
                  ))}
                </Stack>
              </Card>

              {/* Summary & Pay */}
              {selectedIds.size > 0 && (
                <Card
                  pos="sticky"
                  bottom={0}
                  withBorder
                  p="md"
                  bg="white"
                  style={{ zIndex: 100 }}
                >
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t("onlinePayment.totalSelected", {
                          count: selectedIds.size,
                        })}
                      </Text>
                      <Text size="lg" fw={700} c="blue">
                        <NumberFormatter
                          value={selectedTotal}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    </Box>
                    <Button
                      size="md"
                      leftSection={<IconCreditCard size={20} />}
                      onClick={handleCreatePayment}
                      loading={createPayment.isPending}
                      disabled={!snapReady}
                    >
                      {t("onlinePayment.payNow")}
                    </Button>
                  </Group>

                  {createPayment.isError && (
                    <Alert
                      color="red"
                      variant="light"
                      mt="sm"
                      icon={<IconAlertCircle size={16} />}
                    >
                      {createPayment.error instanceof Error
                        ? createPayment.error.message
                        : t("common.error")}
                    </Alert>
                  )}
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Payment History */}
      {onlinePayments.length > 0 && (
        <>
          <Title order={4} mt="md">
            {t("onlinePayment.history")}
          </Title>
          {onlinePayments
            .filter((p) => p.status !== "PENDING")
            .map((payment) => (
              <Card key={payment.id} withBorder p="md">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>
                    {payment.orderId}
                  </Text>
                  <Badge color={getStatusColor(payment.status)} variant="light">
                    {payment.status}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    {dayjs(payment.createdAt).format("DD/MM/YYYY HH:mm")}
                  </Text>
                  <Text size="sm" fw={600}>
                    <NumberFormatter
                      value={Number(payment.grossAmount)}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Text>
                </Group>
              </Card>
            ))}
        </>
      )}
    </Stack>
  );
}

function TuitionCheckItem({
  tuition,
  checked,
  onChange,
}: {
  tuition: StudentTuition;
  checked: boolean;
  onChange: () => void;
}) {
  const t = useTranslations();

  return (
    <Paper withBorder p="sm" onClick={onChange} style={{ cursor: "pointer" }}>
      <Group wrap="nowrap" gap="sm">
        <Checkbox checked={checked} onChange={onChange} readOnly />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={500} truncate>
              {tuition.className} - {tuition.period} {tuition.year}
            </Text>
            <Badge
              color={tuition.status === "PARTIAL" ? "yellow" : "red"}
              variant="light"
              size="sm"
            >
              {tuition.status}
            </Badge>
          </Group>
          <Group justify="space-between" mt={4}>
            <Text size="xs" c="dimmed">
              {t("tuition.dueDate")}:{" "}
              {dayjs(tuition.dueDate).format("DD/MM/YYYY")}
            </Text>
            <Text size="sm" fw={600} c="red">
              <NumberFormatter
                value={tuition.remainingAmount}
                prefix="Rp "
                thousandSeparator="."
                decimalSeparator=","
              />
            </Text>
          </Group>
        </Box>
      </Group>
    </Paper>
  );
}
