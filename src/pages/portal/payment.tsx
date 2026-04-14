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
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconAlertCircle,
  IconBus,
  IconCreditCard,
  IconHistory,
  IconLoader,
  IconPackage,
  IconReceipt,
  IconSchool,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import Script from "next/script";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PortalLayout from "@/components/layouts/PortalLayout";
import { EmptyAnimation } from "@/components/ui/LottieAnimation";
import {
  useCancelOnlinePayment,
  useCreateOnlinePayment,
  usePaymentConfig,
  useStudentOnlinePayments,
} from "@/hooks/api/useOnlinePayments";
import {
  type OutstandingBill,
  usePortalOutstanding,
} from "@/hooks/api/usePortalOutstanding";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { NextPageWithLayout } from "@/lib/page-types";

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

function billKey(bill: OutstandingBill): string {
  return `${bill.kind}:${bill.id}`;
}

function getBillBadge(
  bill: OutstandingBill,
  t: ReturnType<typeof useTranslations>,
) {
  if (bill.kind === "tuition") {
    return { label: t("tuition.title"), color: "blue", Icon: IconSchool };
  }
  if (bill.kind === "feeBill") {
    const isAccommodation = bill.category === "ACCOMMODATION";
    return {
      label: isAccommodation
        ? t("feeService.category.accommodation")
        : t("feeService.category.transport"),
      color: isAccommodation ? "grape" : "teal",
      Icon: IconBus,
    };
  }
  return { label: t("serviceFee.title"), color: "orange", Icon: IconPackage };
}

const PaymentPage: NextPageWithLayout = function PaymentPage() {
  const t = useTranslations();

  usePageTitle(t("nav.payment"));
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [snapReady, setSnapReady] = useState(false);
  const snapLoadedRef = useRef(false);

  const { data: config, isLoading: configLoading } = usePaymentConfig();
  const { data: outstanding, isLoading: outstandingLoading } =
    usePortalOutstanding();
  const { data: onlinePayments = [], isLoading: paymentsLoading } =
    useStudentOnlinePayments();

  const createPayment = useCreateOnlinePayment();
  const cancelPayment = useCancelOnlinePayment();

  const pendingPayment = useMemo(
    () => onlinePayments.find((p) => p.status === "PENDING"),
    [onlinePayments],
  );

  const allBills = useMemo<OutstandingBill[]>(() => {
    if (!outstanding) return [];
    return [
      ...outstanding.tuitions,
      ...outstanding.feeBills,
      ...outstanding.serviceFeeBills,
    ].filter((b) => b.remainingAmount > 0);
  }, [outstanding]);

  const selectedTotal = useMemo(
    () =>
      allBills
        .filter((b) => selectedKeys.has(billKey(b)))
        .reduce((sum, b) => sum + b.remainingAmount, 0),
    [allBills, selectedKeys],
  );

  const toggleSelection = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedKeys.size === allBills.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allBills.map(billKey)));
    }
  };

  const handleSnapCallback = useCallback(() => {
    createPayment.reset();
  }, [createPayment]);

  const handleCreatePayment = async () => {
    if (selectedKeys.size === 0) return;

    const items = allBills
      .filter((b) => selectedKeys.has(billKey(b)))
      .map((b) => {
        if (b.kind === "tuition") return { tuitionId: b.id };
        if (b.kind === "feeBill") return { feeBillId: b.id };
        return { serviceFeeBillId: b.id };
      });

    try {
      const result = await createPayment.mutateAsync({ items });

      if (window.snap && result.snapToken) {
        window.snap.pay(result.snapToken, {
          onSuccess: handleSnapCallback,
          onPending: handleSnapCallback,
          onError: handleSnapCallback,
          onClose: handleSnapCallback,
        });
      }
    } catch {
      // surfaced via mutation state
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

  useEffect(() => {
    if (config?.snapJsUrl && !snapLoadedRef.current) {
      snapLoadedRef.current = true;
    }
  }, [config?.snapJsUrl]);

  const isLoading = configLoading || outstandingLoading || paymentsLoading;

  if (isLoading) {
    return (
      <Stack align="center" justify="center" h={300}>
        <Loader />
      </Stack>
    );
  }

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

  const allSelected =
    allBills.length > 0 && selectedKeys.size === allBills.length;
  const someSelected = selectedKeys.size > 0 && !allSelected;

  const completedPayments = onlinePayments.filter(
    (p) => p.status !== "PENDING",
  );

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

      <Tabs defaultValue="payment">
        <Tabs.List>
          <Tabs.Tab value="payment" leftSection={<IconReceipt size={16} />}>
            {t("payment.title")}
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            {t("onlinePayment.history")}
            {completedPayments.length > 0 && (
              <Badge size="xs" ml={6} variant="filled" color="gray">
                {completedPayments.length}
              </Badge>
            )}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="payment" pt="md">
          <Stack gap="md">
            {pendingPayment && (
              <Card
                withBorder
                p="lg"
                style={{
                  borderLeft: "4px solid var(--mantine-color-yellow-6)",
                }}
              >
                <Stack gap="md">
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                      <IconLoader size={20} style={{ flexShrink: 0 }} />
                      <Text fw={600} truncate>
                        {t("onlinePayment.pendingPayment")}
                      </Text>
                    </Group>
                    <Badge
                      color="yellow"
                      variant="light"
                      style={{ flexShrink: 0 }}
                    >
                      {t("onlinePayment.waitingPayment")}
                    </Badge>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Text size="xs" c="dimmed">
                        {t("onlinePayment.orderId")}
                      </Text>
                      <Text size="sm" fw={500} truncate>
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
                  {pendingPayment.items.map((item) => {
                    let label: string = t("onlinePayment.item");
                    if (item.tuition) {
                      label = `${item.tuition.classAcademic.className} - ${item.tuition.period} ${item.tuition.year}`;
                    } else if (item.feeBill) {
                      label = `${item.feeBill.feeService?.name ?? t("feeBill.title")} - ${item.feeBill.period} ${item.feeBill.year}`;
                    } else if (item.serviceFeeBill) {
                      label = `${item.serviceFeeBill.serviceFee?.name ?? t("serviceFee.title")} - ${item.serviceFeeBill.period} ${item.serviceFeeBill.year}`;
                    }
                    return (
                      <Group
                        key={item.id}
                        justify="space-between"
                        wrap="nowrap"
                      >
                        <Text
                          size="sm"
                          truncate
                          style={{ minWidth: 0, flex: 1 }}
                        >
                          {label}
                        </Text>
                        <Text size="sm" fw={500} style={{ flexShrink: 0 }}>
                          <NumberFormatter
                            value={Number(item.amount)}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Text>
                      </Group>
                    );
                  })}

                  <Group wrap="wrap">
                    <Button
                      onClick={handleRetrySnap}
                      disabled={!snapReady}
                      leftSection={<IconCreditCard size={18} />}
                      size="sm"
                    >
                      {t("onlinePayment.continuePayment")}
                    </Button>
                    <Button
                      variant="light"
                      color="red"
                      leftSection={<IconX size={18} />}
                      onClick={() => handleCancelPayment(pendingPayment.id)}
                      loading={cancelPayment.isPending}
                      size="sm"
                    >
                      {t("onlinePayment.cancelPayment")}
                    </Button>
                  </Group>
                </Stack>
              </Card>
            )}

            {!pendingPayment && (
              <>
                {allBills.length === 0 ? (
                  <Card withBorder>
                    <EmptyAnimation message={t("onlinePayment.allPaid")} />
                  </Card>
                ) : (
                  <>
                    <Card withBorder p="md">
                      <Stack gap="md">
                        <Group justify="space-between">
                          <Text fw={600}>{t("onlinePayment.selectBills")}</Text>
                          <Checkbox
                            label={t("common.selectAll")}
                            checked={allSelected}
                            indeterminate={someSelected}
                            onChange={selectAll}
                            size="sm"
                          />
                        </Group>

                        {allBills.map((bill) => (
                          <BillCheckItem
                            key={billKey(bill)}
                            bill={bill}
                            checked={selectedKeys.has(billKey(bill))}
                            onChange={() => toggleSelection(billKey(bill))}
                          />
                        ))}
                      </Stack>
                    </Card>

                    {selectedKeys.size > 0 && (
                      <Card withBorder p="md" bg="white" className="pay-footer">
                        <Group justify="space-between">
                          <Box>
                            <Text size="sm" c="dimmed">
                              {t("onlinePayment.totalSelected", {
                                count: selectedKeys.size,
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
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          <Stack gap="md">
            {completedPayments.length === 0 ? (
              <Card withBorder>
                <EmptyAnimation message={t("payment.noHistory")} />
              </Card>
            ) : (
              completedPayments.map((payment) => (
                <Card
                  key={payment.id}
                  withBorder
                  p="md"
                  style={{ overflow: "hidden" }}
                >
                  <Group justify="space-between" mb="xs" wrap="nowrap">
                    <Text
                      size="sm"
                      fw={500}
                      truncate
                      style={{ minWidth: 0, flex: 1 }}
                    >
                      {payment.orderId}
                    </Text>
                    <Badge
                      color={getStatusColor(payment.status)}
                      variant="light"
                      style={{ flexShrink: 0 }}
                    >
                      {payment.status}
                    </Badge>
                  </Group>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                      {dayjs(payment.createdAt).format("DD/MM/YYYY HH:mm")}
                    </Text>
                    <Text size="sm" fw={600} truncate style={{ minWidth: 0 }}>
                      <NumberFormatter
                        value={Number(payment.grossAmount)}
                        prefix="Rp "
                        thousandSeparator="."
                        decimalSeparator=","
                      />
                    </Text>
                  </Group>
                </Card>
              ))
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

function BillCheckItem({
  bill,
  checked,
  onChange,
}: {
  bill: OutstandingBill;
  checked: boolean;
  onChange: () => void;
}) {
  const t = useTranslations();
  const badge = getBillBadge(bill, t);
  const BadgeIcon = badge.Icon;

  return (
    <Paper withBorder p="sm" onClick={onChange} style={{ cursor: "pointer" }}>
      <Group wrap="nowrap" gap="sm">
        <Checkbox checked={checked} onChange={onChange} readOnly />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
              <BadgeIcon size={14} />
              <Text size="sm" fw={500} truncate>
                {bill.label} — {bill.period} {bill.year}
              </Text>
            </Group>
            <Badge color={badge.color} variant="light" size="sm">
              {badge.label}
            </Badge>
          </Group>
          <Group justify="space-between" mt={4}>
            <Text size="xs" c="dimmed">
              {t("tuition.dueDate")}: {dayjs(bill.dueDate).format("DD/MM/YYYY")}
            </Text>
            <Text size="sm" fw={600} c="red">
              <NumberFormatter
                value={bill.remainingAmount}
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

PaymentPage.getLayout = (page: ReactElement) => (
  <PortalLayout>{page}</PortalLayout>
);

export default PaymentPage;
