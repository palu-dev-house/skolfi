"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NumberFormatter,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCash,
  IconCheck,
  IconDiscount,
  IconGift,
  IconReceipt,
  IconUser,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { PaymentStatus } from "@/generated/prisma/client";
import { useCreatePayment } from "@/hooks/api/usePayments";
import { useStudents } from "@/hooks/api/useStudents";
import { useTuitions } from "@/hooks/api/useTuitions";
import { getPeriodDisplayName } from "@/lib/business-logic/tuition-generator";

interface PaymentResult {
  payment: {
    id: string;
    amount: string;
  };
  result: {
    previousStatus: PaymentStatus;
    newStatus: PaymentStatus;
    previousPaidAmount: number;
    newPaidAmount: number;
    remainingAmount: number;
    feeAmount: number;
    scholarshipAmount: number;
    discountAmount: number;
    effectiveFeeAmount: number;
  };
}

export default function PaymentForm() {
  const t = useTranslations();
  const router = useRouter();
  const [studentNis, setStudentNis] = useState<string | null>(null);
  const [tuitionId, setTuitionId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | string>("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<PaymentResult | null>(null);

  const { data: studentsData, isLoading: loadingStudents } = useStudents({
    limit: 1000,
  });

  const { data: tuitionsData, isLoading: loadingTuitions } = useTuitions({
    limit: 100,
    studentNis: studentNis || undefined,
    status: undefined, // Get all statuses, we'll filter in UI
  });

  const createPayment = useCreatePayment();

  // Filter to only show unpaid/partial tuitions
  const unpaidTuitions = useMemo(() => {
    if (!tuitionsData?.tuitions) return [];
    return tuitionsData.tuitions.filter(
      (t) => t.status === "UNPAID" || t.status === "PARTIAL",
    );
  }, [tuitionsData]);

  // Get selected tuition details
  const selectedTuition = useMemo(() => {
    if (!tuitionId || !tuitionsData?.tuitions) return null;
    return tuitionsData.tuitions.find((t) => t.id === tuitionId);
  }, [tuitionId, tuitionsData]);

  // Calculate effective fee (considering scholarships AND discounts)
  const effectiveFeeAmount = useMemo(() => {
    if (!selectedTuition) return 0;
    const fee = Number(selectedTuition.feeAmount);
    const totalScholarship = selectedTuition.scholarshipSummary
      ? Number(selectedTuition.scholarshipSummary.totalAmount)
      : 0;
    const discountAmount = Number(selectedTuition.discountAmount) || 0;
    return Math.max(fee - totalScholarship - discountAmount, 0);
  }, [selectedTuition]);

  // Remaining amount considers scholarship discount
  const remainingAmount = useMemo(() => {
    if (!selectedTuition) return 0;
    return Math.max(effectiveFeeAmount - Number(selectedTuition.paidAmount), 0);
  }, [selectedTuition, effectiveFeeAmount]);

  const handleSubmit = () => {
    if (!tuitionId || !amount) {
      notifications.show({
        title: t("common.validationError"),
        message: t("payment.validationTuitionAmount"),
        color: "red",
      });
      return;
    }

    createPayment.mutate(
      {
        tuitionId,
        amount: Number(amount),
        notes: notes || undefined,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          notifications.show({
            title: t("payment.paymentSuccessful"),
            message: t("payment.paymentSuccessMessage", {
              amount: Number(amount).toLocaleString("id-ID"),
            }),
            color: "green",
          });
          // Reset form for next payment
          setTuitionId(null);
          setAmount("");
          setNotes("");
        },
        onError: (error) => {
          notifications.show({
            title: t("payment.paymentFailed"),
            message: error.message,
            color: "red",
          });
        },
      },
    );
  };

  const handlePayFull = () => {
    if (remainingAmount > 0) {
      setAmount(remainingAmount);
    }
  };

  const studentOptions =
    studentsData?.students.map((s) => ({
      value: s.nis,
      label: `${s.nis} - ${s.name}`,
    })) || [];

  const tuitionOptions = unpaidTuitions.map((t) => ({
    value: t.id,
    label: `${getPeriodDisplayName(t.period)} ${t.year} - ${t.classAcademic?.className} (${t.status})`,
  }));

  // Calculate progress based on effective fee (after scholarship)
  const paidPercentage =
    selectedTuition && effectiveFeeAmount > 0
      ? (Number(selectedTuition.paidAmount) / effectiveFeeAmount) * 100
      : 0;

  return (
    <Paper withBorder p="lg">
      <Stack gap="md">
        <Select
          label={t("payment.selectStudentLabel")}
          placeholder={t("payment.searchStudentPlaceholder")}
          leftSection={<IconUser size={18} />}
          data={studentOptions}
          value={studentNis}
          onChange={(value) => {
            setStudentNis(value);
            setTuitionId(null);
            setResult(null);
          }}
          disabled={loadingStudents}
          searchable
          required
        />

        {studentNis && (
          <Select
            label={t("payment.selectTuitionLabel")}
            placeholder={t("payment.selectUnpaid")}
            leftSection={<IconReceipt size={18} />}
            data={tuitionOptions}
            value={tuitionId}
            onChange={(value) => {
              setTuitionId(value);
              setAmount("");
              setResult(null);
            }}
            disabled={loadingTuitions || unpaidTuitions.length === 0}
            searchable
            required
          />
        )}

        {unpaidTuitions.length === 0 && studentNis && !loadingTuitions && (
          <Alert icon={<IconCheck size={18} />} color="green" variant="light">
            <Text size="sm">{t("payment.allComplete")}</Text>
          </Alert>
        )}

        {selectedTuition && (
          <Card withBorder>
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                {t("payment.tuitionDetails")}
              </Text>
              <SimpleGrid cols={2}>
                <div>
                  <Text size="xs" c="dimmed">
                    {t("payment.classLabel")}
                  </Text>
                  <Text size="sm">
                    {selectedTuition.classAcademic?.className}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    {t("payment.periodLabel")}
                  </Text>
                  <Text size="sm">
                    {getPeriodDisplayName(selectedTuition.period)}{" "}
                    {selectedTuition.year}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    {t("payment.feeAmountLabel")}
                  </Text>
                  <Text size="sm" fw={600}>
                    <NumberFormatter
                      value={selectedTuition.feeAmount}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    {t("payment.alreadyPaid")}
                  </Text>
                  <Text size="sm" c="green">
                    <NumberFormatter
                      value={selectedTuition.paidAmount}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Text>
                </div>
              </SimpleGrid>

              {/* Scholarship Information */}
              {selectedTuition.scholarshipSummary &&
                selectedTuition.scholarships && (
                  <Alert
                    icon={<IconGift size={18} />}
                    color="teal"
                    variant="light"
                    title={
                      selectedTuition.scholarshipSummary.hasFullScholarship
                        ? t("payment.fullScholarship")
                        : t("payment.scholarshipsApplied", {
                            count: selectedTuition.scholarshipSummary.count,
                          })
                    }
                  >
                    <Stack gap="xs">
                      {/* List each scholarship */}
                      {selectedTuition.scholarships.map(
                        (scholarship, index) => (
                          <Group key={scholarship.id} justify="space-between">
                            <Text size="sm" c="dimmed">
                              {index + 1}. {scholarship.name}:
                            </Text>
                            <Text size="sm" c="teal">
                              -
                              <NumberFormatter
                                value={scholarship.nominal}
                                prefix="Rp "
                                thousandSeparator="."
                                decimalSeparator=","
                              />
                            </Text>
                          </Group>
                        ),
                      )}

                      {/* Total discount if multiple scholarships */}
                      {selectedTuition.scholarships.length > 1 && (
                        <Group
                          justify="space-between"
                          style={{
                            borderTop: "1px solid var(--mantine-color-teal-3)",
                            paddingTop: 8,
                          }}
                        >
                          <Text size="sm" fw={600}>
                            {t("payment.totalScholarship")}
                          </Text>
                          <Text size="sm" fw={600} c="teal">
                            -
                            <NumberFormatter
                              value={
                                selectedTuition.scholarshipSummary.totalAmount
                              }
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Text>
                        </Group>
                      )}
                    </Stack>
                  </Alert>
                )}

              {/* Discount Information */}
              {selectedTuition.discount &&
                Number(selectedTuition.discountAmount) > 0 && (
                  <Alert
                    icon={<IconDiscount size={18} />}
                    color="green"
                    variant="light"
                    title={t("payment.discountAppliedTitle")}
                  >
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          {selectedTuition.discount.name}
                          {selectedTuition.discount.reason &&
                            ` (${selectedTuition.discount.reason})`}
                          :
                        </Text>
                        <Text size="sm" c="green">
                          -
                          <NumberFormatter
                            value={selectedTuition.discountAmount}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Text>
                      </Group>
                    </Stack>
                  </Alert>
                )}

              {/* Summary when discounts/scholarships applied */}
              {(Number(selectedTuition.discountAmount) > 0 ||
                selectedTuition.scholarshipSummary) && (
                <Card withBorder bg="gray.0" p="sm">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm">{t("payment.originalFee")}</Text>
                      <Text size="sm" td="line-through" c="dimmed">
                        <NumberFormatter
                          value={selectedTuition.feeAmount}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {t("payment.amountToPay")}
                      </Text>
                      <Text size="sm" fw={600} c="blue">
                        <NumberFormatter
                          value={effectiveFeeAmount}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    </Group>
                  </Stack>
                </Card>
              )}

              <div>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed">
                    {t("payment.paymentProgress")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {paidPercentage.toFixed(0)}%
                  </Text>
                </Group>
                <Progress value={paidPercentage} color="green" size="sm" />
              </div>
              <Group justify="space-between">
                <Text size="sm" fw={600} c="red">
                  {t("payment.remainingLabel")}{" "}
                  <NumberFormatter
                    value={remainingAmount}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
                <Badge
                  color={
                    selectedTuition.status === "PARTIAL" ? "yellow" : "red"
                  }
                >
                  {t(`tuition.status.${selectedTuition.status.toLowerCase()}`)}
                </Badge>
              </Group>
            </Stack>
          </Card>
        )}

        {selectedTuition && (
          <>
            <Group align="flex-end">
              <NumberInput
                label={t("payment.paymentAmountLabel")}
                placeholder={t("payment.paymentAmountPlaceholder")}
                value={amount}
                onChange={setAmount}
                min={1}
                max={remainingAmount}
                prefix="Rp "
                thousandSeparator="."
                decimalSeparator=","
                required
                style={{ flex: 1 }}
              />
              <Button variant="light" onClick={handlePayFull}>
                {t("payment.payFull")}
              </Button>
            </Group>

            <Textarea
              label={t("payment.notesOptional")}
              placeholder={t("payment.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              rows={2}
            />

            <Alert
              icon={<IconAlertCircle size={18} />}
              color="blue"
              variant="light"
            >
              <Text size="sm">
                {Number(amount) >= remainingAmount
                  ? t("payment.willMarkPaid")
                  : Number(amount) > 0
                    ? t("payment.partialPaymentNote")
                    : t("payment.enterAmountNote")}
              </Text>
            </Alert>

            <Group>
              <Button
                leftSection={<IconCash size={18} />}
                onClick={handleSubmit}
                loading={createPayment.isPending}
                disabled={!amount || Number(amount) <= 0}
              >
                {t("payment.processPayment")}
              </Button>
              <Button variant="light" onClick={() => router.push("/payments")}>
                {t("payment.viewPayments")}
              </Button>
            </Group>
          </>
        )}

        {result && (
          <Alert
            icon={<IconCheck size={18} />}
            color="green"
            title={t("payment.paymentProcessed")}
          >
            <Stack gap="xs">
              <Group gap="md">
                <Badge
                  color={
                    result.result.newStatus === "PAID" ? "green" : "yellow"
                  }
                  size="lg"
                >
                  {t(`tuition.status.${result.result.newStatus.toLowerCase()}`)}
                </Badge>
                {result.result.scholarshipAmount > 0 && (
                  <Badge color="teal" variant="light" size="lg">
                    {t("payment.scholarshipAppliedBadge")}
                  </Badge>
                )}
                {result.result.discountAmount > 0 && (
                  <Badge color="green" variant="light" size="lg">
                    {t("payment.discountAppliedBadge")}
                  </Badge>
                )}
              </Group>
              <SimpleGrid cols={2}>
                <Text size="sm">
                  {t("payment.totalPaidResult")}{" "}
                  <NumberFormatter
                    value={result.result.newPaidAmount}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
                <Text size="sm">
                  {t("payment.remainingLabel")}{" "}
                  <NumberFormatter
                    value={result.result.remainingAmount}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
                {(result.result.scholarshipAmount > 0 ||
                  result.result.discountAmount > 0) && (
                  <>
                    <Text size="sm" c="dimmed">
                      {t("payment.originalFeeResult")}{" "}
                      <NumberFormatter
                        value={result.result.feeAmount}
                        prefix="Rp "
                        thousandSeparator="."
                        decimalSeparator=","
                      />
                    </Text>
                    <Text size="sm" c="dimmed">
                      {t("payment.effectiveFee")}{" "}
                      <NumberFormatter
                        value={result.result.effectiveFeeAmount}
                        prefix="Rp "
                        thousandSeparator="."
                        decimalSeparator=","
                      />
                    </Text>
                    {result.result.scholarshipAmount > 0 && (
                      <Text size="sm" c="teal">
                        {t("payment.scholarshipDeduction")} -
                        <NumberFormatter
                          value={result.result.scholarshipAmount}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    )}
                    {result.result.discountAmount > 0 && (
                      <Text size="sm" c="green">
                        {t("payment.discountDeduction")} -
                        <NumberFormatter
                          value={result.result.discountAmount}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    )}
                  </>
                )}
              </SimpleGrid>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
