"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  NumberFormatter,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCopy,
  IconDownload,
  IconX,
} from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PaymentDetailSkeleton } from "@/components/ui/PortalSkeleton";
import { useStudentBanks } from "@/hooks/api/useStudentBanks";
import {
  useCancelPaymentRequest,
  useStudentPaymentRequest,
} from "@/hooks/api/useStudentPaymentRequests";
import { getFrontendExpiryFromBackend } from "@/lib/business-logic/payment-timing";

function formatPeriod(period: string): string {
  const periodMap: Record<string, string> = {
    JULY: "Juli",
    AUGUST: "Agustus",
    SEPTEMBER: "September",
    OCTOBER: "Oktober",
    NOVEMBER: "November",
    DECEMBER: "Desember",
    JANUARY: "Januari",
    FEBRUARY: "Februari",
    MARCH: "Maret",
    APRIL: "April",
    MAY: "Mei",
    JUNE: "Juni",
    Q1: "Kuartal 1",
    Q2: "Kuartal 2",
    Q3: "Kuartal 3",
    Q4: "Kuartal 4",
    SEM1: "Semester 1",
    SEM2: "Semester 2",
  };
  return periodMap[period] || period;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function PaymentDetailPage() {
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = useStudentPaymentRequest(id);
  const { data: banks } = useStudentBanks();
  const cancelPayment = useCancelPaymentRequest();

  const [countdown, setCountdown] = useState(0);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!payment || payment.status !== "PENDING") return;

    const timer = setInterval(() => {
      const now = new Date();
      const expires = new Date(payment.expiresAt);
      const diff = Math.max(
        0,
        Math.floor((expires.getTime() - now.getTime()) / 1000),
      );
      setCountdown(diff);

      if (diff === 0) {
        refetch();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [payment, refetch]);

  const handleCancel = () => {
    if (!payment) return;

    modals.openConfirmModal({
      title: t("cancelConfirmTitle"),
      children: <Text size="sm">{t("cancelConfirmDesc")}</Text>,
      labels: { confirm: t("yesCancel"), cancel: tCommon("no") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setCancelError(null);
        try {
          await cancelPayment.mutateAsync(payment.id);
          refetch();
          notifications.show({
            title: t("paymentCancelled"),
            message: t("cancelledSuccess"),
            color: "orange",
          });
        } catch (err) {
          setCancelError(
            err instanceof Error ? err.message : t("failedCancel"),
          );
        }
      },
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notifications.show({
      title: t("copiedTitle"),
      message: t("copiedToClipboard", { label }),
      color: "green",
      icon: <IconCheck size={16} />,
      autoClose: 2000,
    });
  };

  const handleDownloadPDF = () => {
    window.open(`/api/v1/student/payment-requests/${id}/pdf`, "_blank");
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { color: string; label: string; icon: React.ReactNode }
    > = {
      PENDING: {
        color: "yellow",
        label: "Menunggu Pembayaran",
        icon: <IconClock size={18} />,
      },
      VERIFIED: {
        color: "green",
        label: "Pembayaran Berhasil",
        icon: <IconCheck size={18} />,
      },
      EXPIRED: {
        color: "gray",
        label: "Kadaluarsa",
        icon: <IconX size={18} />,
      },
      CANCELLED: {
        color: "red",
        label: "Dibatalkan",
        icon: <IconX size={18} />,
      },
      FAILED: { color: "red", label: "Gagal", icon: <IconX size={18} /> },
      VERIFYING: {
        color: "blue",
        label: "Sedang Diverifikasi",
        icon: <IconClock size={18} />,
      },
    };
    return configs[status] || { color: "gray", label: status, icon: null };
  };

  if (isLoading) {
    return <PaymentDetailSkeleton />;
  }

  if (error || !payment) {
    return (
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={18} />} color="red">
          {error instanceof Error ? error.message : "Transaksi tidak ditemukan"}
        </Alert>
        <Button
          variant="outline"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => router.push("/portal/payment")}
        >
          Kembali
        </Button>
      </Stack>
    );
  }

  const statusConfig = getStatusConfig(payment.status);
  const isExpired =
    getFrontendExpiryFromBackend(new Date(payment.expiresAt)) < new Date();
  const isPending = payment.status === "PENDING" && !isExpired;
  const isVerified = payment.status === "VERIFIED";

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            onClick={() => router.replace("/portal/history")}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={4}>Detail Transaksi</Title>
        </Group>
        {isVerified && (
          <Button
            variant="light"
            size="xs"
            leftSection={<IconDownload size={16} />}
            onClick={handleDownloadPDF}
          >
            Unduh PDF
          </Button>
        )}
      </Group>

      {cancelError && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="red"
          variant="light"
          withCloseButton
          onClose={() => setCancelError(null)}
        >
          {cancelError}
        </Alert>
      )}

      {/* Status Banner */}
      <Card withBorder p="md" bg={`${statusConfig.color}.0`}>
        <Group justify="space-between" align="center">
          <Group gap="sm">
            {statusConfig.icon}
            <Box>
              <Text fw={600}>{statusConfig.label}</Text>
              <Text size="xs" c="dimmed">
                ID: {payment.id.slice(0, 8)}...
              </Text>
            </Box>
          </Group>
          <Badge color={statusConfig.color} size="lg" variant="filled">
            {payment.status}
          </Badge>
        </Group>
      </Card>

      {/* Countdown for Pending */}
      {isPending && countdown > 0 && (
        <Alert
          icon={<IconClock size={18} />}
          color={countdown < 60 ? "red" : "blue"}
          p="sm"
        >
          <Group justify="space-between">
            <Text size="sm">Selesaikan pembayaran dalam</Text>
            <Badge size="lg" color={countdown < 60 ? "red" : "blue"}>
              {formatTime(countdown)}
            </Badge>
          </Group>
        </Alert>
      )}

      {isPending && countdown === 0 && (
        <Alert icon={<IconAlertCircle size={18} />} color="red">
          Waktu pembayaran telah habis
        </Alert>
      )}

      {/* Student Info */}
      {payment.student && (
        <Card withBorder p="sm">
          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={500}>
              INFORMASI SISWA
            </Text>
            <Divider />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Box>
                <Text size="xs" c="dimmed">
                  Nama
                </Text>
                <Text size="sm" fw={500}>
                  {payment.student.name}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">
                  NIS
                </Text>
                <Text size="sm">{payment.student.nis}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">
                  Wali
                </Text>
                <Text size="sm">{payment.student.parentName}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">
                  No. HP Wali
                </Text>
                <Text size="sm">{payment.student.parentPhone}</Text>
              </Box>
            </SimpleGrid>
          </Stack>
        </Card>
      )}

      {/* Tuitions Info */}
      {payment.tuitions && payment.tuitions.length > 0 && (
        <Card withBorder p="sm">
          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={500}>
              DETAIL TAGIHAN ({payment.tuitions.length} periode)
            </Text>
            <Divider />
            <Stack gap="xs">
              {payment.tuitions.map((tuition, idx) => (
                <Paper key={idx} withBorder p="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500}>
                        {formatPeriod(tuition.period)} {tuition.year}
                      </Text>
                      {tuition.className && (
                        <Text size="xs" c="dimmed">
                          {tuition.className}
                        </Text>
                      )}
                    </Stack>
                    <Text size="sm" fw={500}>
                      <NumberFormatter
                        value={Number(tuition.amount || tuition.feeAmount)}
                        prefix="Rp "
                        thousandSeparator="."
                        decimalSeparator=","
                      />
                    </Text>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      {/* Payment Amount */}
      <Card withBorder p="md">
        <Stack gap="sm" align="center">
          <Text size="xs" c="dimmed">
            NOMINAL TRANSFER
          </Text>
          <Title order={2} c={isVerified ? "green" : "blue"}>
            <NumberFormatter
              value={Number(payment.totalAmount)}
              prefix="Rp "
              thousandSeparator="."
              decimalSeparator=","
            />
          </Title>
          <Text size="xs" c="dimmed">
            Rp {Number(payment.baseAmount).toLocaleString("id-ID")} + kode unik{" "}
            {payment.uniqueCode}
          </Text>
          {isPending && (
            <Button
              variant="light"
              size="sm"
              leftSection={<IconCopy size={16} />}
              onClick={() =>
                handleCopy(payment.totalAmount.toString(), "Nominal")
              }
            >
              Salin Nominal
            </Button>
          )}
        </Stack>
      </Card>

      {/* Bank Transfer Info - Only for Pending */}
      {isPending && banks && banks.length > 0 && (
        <Card withBorder p="sm">
          <Stack gap="sm">
            <Text size="xs" c="dimmed" fw={500}>
              TRANSFER KE REKENING
            </Text>
            <Divider />
            <Stack gap="xs">
              {banks.map((bank) => (
                <Paper key={bank.id} withBorder p="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={600} size="sm">
                        {bank.bankName}
                      </Text>
                      <Text size="sm" ff="monospace">
                        {bank.accountNumber}
                      </Text>
                      <Text size="xs" c="dimmed">
                        a.n. {bank.accountName}
                      </Text>
                    </Stack>
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() =>
                        handleCopy(
                          bank.accountNumber,
                          `No. Rekening ${bank.bankName}`,
                        )
                      }
                    >
                      Salin
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      {/* Verified Bank Info */}
      {isVerified && payment.bankAccount && (
        <Card withBorder p="sm">
          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={500}>
              REKENING TUJUAN
            </Text>
            <Divider />
            <Box>
              <Text fw={600} size="sm">
                {payment.bankAccount.bankName}
              </Text>
              <Text size="sm" ff="monospace">
                {payment.bankAccount.accountNumber}
              </Text>
              <Text size="xs" c="dimmed">
                a.n. {payment.bankAccount.accountName}
              </Text>
            </Box>
          </Stack>
        </Card>
      )}

      {/* Timestamps */}
      <Card withBorder p="sm">
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            WAKTU
          </Text>
          <Divider />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            <Box>
              <Text size="xs" c="dimmed">
                Dibuat
              </Text>
              <Text size="sm">{formatDate(payment.createdAt)}</Text>
            </Box>
            {payment.verifiedAt && (
              <Box>
                <Text size="xs" c="dimmed">
                  Diverifikasi
                </Text>
                <Text size="sm">{formatDate(payment.verifiedAt)}</Text>
              </Box>
            )}
            {isPending && (
              <Box>
                <Text size="xs" c="dimmed">
                  Kadaluarsa
                </Text>
                <Text size="sm">{formatDate(payment.expiresAt)}</Text>
              </Box>
            )}
          </SimpleGrid>
        </Stack>
      </Card>

      {/* Important Notice */}
      {isPending && (
        <Alert color="yellow" variant="light" p="sm">
          <Text size="xs">
            Transfer <strong>tepat</strong> sesuai nominal di atas ke salah satu
            rekening. Pembayaran akan diverifikasi otomatis setelah transfer
            diterima.
          </Text>
        </Alert>
      )}

      {/* Sticky Actions */}
      <Box
        style={{
          position: "sticky",
          bottom: 0,
          backgroundColor: "#F8F9FA",
          paddingTop: "var(--mantine-spacing-sm)",
          paddingBottom: "var(--mantine-spacing-sm)",
          marginBottom: "-var(--mantine-spacing-md)",
          borderTop: "1px solid var(--mantine-color-gray-3)",
        }}
        py={24}
      >
        <Stack gap="xs">
          {isPending && countdown > 0 && (
            <Button
              variant="outline"
              color="red"
              onClick={handleCancel}
              loading={cancelPayment.isPending}
              fullWidth
            >
              Batalkan Pembayaran
            </Button>
          )}
          {isVerified && (
            <Button
              leftSection={<IconDownload size={18} />}
              onClick={handleDownloadPDF}
              fullWidth
            >
              Unduh Bukti Pembayaran (PDF)
            </Button>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
