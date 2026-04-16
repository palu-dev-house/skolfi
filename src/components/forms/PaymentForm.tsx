"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  List,
  Modal,
  NumberFormatter,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCash,
  IconCheck,
  IconPrinter,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFeeBills } from "@/hooks/api/useFeeBills";
import { useCreatePayment } from "@/hooks/api/usePayments";
import { useServiceFeeBills } from "@/hooks/api/useServiceFeeBills";
import { useStudents } from "@/hooks/api/useStudents";
import { useTuitions } from "@/hooks/api/useTuitions";

type ItemType = "TUITION" | "FEE" | "SERVICE_FEE";

interface OutstandingRow {
  key: string;
  type: ItemType;
  id: string;
  description: string;
  period: string;
  year: number;
  remaining: number;
  maxScholarship: number;
}

interface ItemInput {
  amount: number | "";
  scholarshipAmount: number | "";
}

interface CreatePaymentResult {
  transactionId: string;
  payments: Array<{
    id: string;
    amount: string;
    tuitionId?: string | null;
    feeBillId?: string | null;
    serviceFeeBillId?: string | null;
  }>;
  itemErrors?: Array<{ index: number; message: string }>;
}

export default function PaymentForm() {
  const t = useTranslations();
  const router = useRouter();
  const [studentNis, setStudentNis] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, ItemInput>>({});
  const [result, setResult] = useState<CreatePaymentResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: studentsData } = useStudents({ limit: 1000 });
  const { data: tuitionsData } = useTuitions({
    limit: 100,
    studentNis: studentNis || undefined,
  });
  const { data: feeBillsData } = useFeeBills({
    limit: 100,
    studentNis: studentNis || undefined,
  });
  const { data: serviceFeeBillsData } = useServiceFeeBills({
    limit: 100,
    studentNis: studentNis || undefined,
  });

  const createPayment = useCreatePayment();

  const outstanding: OutstandingRow[] = useMemo(() => {
    if (!studentNis) return [];
    const rows: OutstandingRow[] = [];

    for (const tu of tuitionsData?.tuitions ?? []) {
      if (tu.status !== "UNPAID" && tu.status !== "PARTIAL") continue;
      const fee = Number(tu.feeAmount);
      const scholarship = Number(
        tu.scholarshipSummary?.totalAmount ?? tu.scholarshipAmount ?? 0,
      );
      const discount = Number(tu.discountAmount ?? 0);
      const effective = Math.max(fee - scholarship - discount, 0);
      const remaining = Math.max(effective - Number(tu.paidAmount), 0);
      if (remaining <= 0) continue;
      rows.push({
        key: `tuition:${tu.id}`,
        type: "TUITION",
        id: tu.id,
        description: `${t("payment.tuitionFee")}`,
        period: tu.period,
        year: tu.year,
        remaining,
        maxScholarship: 0, // scholarship already baked in, disable per-item scholarship entry here
      });
    }

    for (const b of feeBillsData?.feeBills ?? []) {
      if (b.status !== "UNPAID" && b.status !== "PARTIAL") continue;
      const remaining = Math.max(Number(b.amount) - Number(b.paidAmount), 0);
      if (remaining <= 0) continue;
      rows.push({
        key: `fee:${b.id}`,
        type: "FEE",
        id: b.id,
        description: b.feeService?.name ?? t("feeBill.label"),
        period: b.period,
        year: b.year,
        remaining,
        maxScholarship: 0,
      });
    }

    for (const b of serviceFeeBillsData?.serviceFeeBills ?? []) {
      if (b.status !== "UNPAID" && b.status !== "PARTIAL") continue;
      const remaining = Math.max(Number(b.amount) - Number(b.paidAmount), 0);
      if (remaining <= 0) continue;
      rows.push({
        key: `service:${b.id}`,
        type: "SERVICE_FEE",
        id: b.id,
        description: b.serviceFee?.name ?? t("serviceFee.label"),
        period: b.period,
        year: b.year,
        remaining,
        maxScholarship: 0,
      });
    }

    return rows;
  }, [studentNis, tuitionsData, feeBillsData, serviceFeeBillsData, t]);

  const toggle = (row: OutstandingRow) => {
    setSelected((prev) => {
      const next = { ...prev, [row.key]: !prev[row.key] };
      return next;
    });
    setInputs((prev) => {
      if (prev[row.key]) return prev;
      return {
        ...prev,
        [row.key]: { amount: row.remaining, scholarshipAmount: "" },
      };
    });
  };

  const updateInput = (key: string, patch: Partial<ItemInput>) => {
    setInputs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { amount: "", scholarshipAmount: "" }),
        ...patch,
      },
    }));
  };

  const totalSelected = useMemo(() => {
    return outstanding.reduce((sum, row) => {
      if (!selected[row.key]) return sum;
      const amt = Number(inputs[row.key]?.amount ?? 0);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0);
  }, [outstanding, selected, inputs]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleSubmit = () => {
    if (!studentNis) return;
    const items = outstanding
      .filter((row) => selected[row.key])
      .map((row) => {
        const amt = Number(inputs[row.key]?.amount ?? 0);
        const sch = Number(inputs[row.key]?.scholarshipAmount ?? 0);
        const base: {
          tuitionId?: string;
          feeBillId?: string;
          serviceFeeBillId?: string;
          amount: string;
          scholarshipAmount?: string;
        } = { amount: String(amt) };
        if (row.type === "TUITION") base.tuitionId = row.id;
        else if (row.type === "FEE") base.feeBillId = row.id;
        else base.serviceFeeBillId = row.id;
        if (row.type === "TUITION" && sch > 0) {
          base.scholarshipAmount = String(sch);
        }
        return base;
      });

    if (items.length === 0) {
      notifications.show({
        color: "red",
        title: t("common.validationError"),
        message: t("payment.selectAtLeastOne"),
      });
      return;
    }

    createPayment.mutate(
      {
        studentNis,
        notes: notes || undefined,
        items,
      },
      {
        onSuccess: (data) => {
          setResult(data as CreatePaymentResult);
          setSelected({});
          setInputs({});
          setNotes("");
          notifications.show({
            color: "green",
            title: t("payment.paymentSuccessful"),
            message: t("payment.transactionCreated", {
              id: (data as CreatePaymentResult).transactionId.slice(0, 8),
            }),
          });
        },
        onError: (err) => {
          notifications.show({
            color: "red",
            title: t("payment.paymentFailed"),
            message: err.message,
          });
        },
      },
    );
  };

  const studentOptions =
    studentsData?.students.map((s) => ({
      value: s.nis,
      label: `${s.nis} - ${s.name}`,
    })) ?? [];

  return (
    <Paper withBorder p="lg">
      <Stack gap="md">
        <Select
          label={t("payment.selectStudentLabel")}
          placeholder={t("payment.searchStudentPlaceholder")}
          leftSection={<IconUser size={18} />}
          data={studentOptions}
          value={studentNis}
          onChange={(v) => {
            setStudentNis(v);
            setSelected({});
            setInputs({});
            setResult(null);
          }}
          searchable
          required
        />

        {studentNis && (
          <Group>
            <Button
              component={Link}
              href={`/admin/students/${studentNis}/payment-card`}
              target="_blank"
              variant="light"
              leftSection={<IconPrinter size={18} />}
            >
              {t("paymentCard.title")}
            </Button>
          </Group>
        )}

        {studentNis && outstanding.length === 0 && (
          <Alert icon={<IconCheck size={18} />} color="green" variant="light">
            {t("payment.allComplete")}
          </Alert>
        )}

        {studentNis && outstanding.length > 0 && (
          <Card withBorder>
            <Stack gap="sm">
              <Text fw={600}>{t("payment.outstandingItems")}</Text>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 36 }}></Table.Th>
                    <Table.Th>{t("payment.type")}</Table.Th>
                    <Table.Th>{t("payment.description")}</Table.Th>
                    <Table.Th>{t("feeBill.period")}</Table.Th>
                    <Table.Th>{t("payment.remaining")}</Table.Th>
                    <Table.Th style={{ width: 180 }}>
                      {t("payment.amountToPay")}
                    </Table.Th>
                    <Table.Th style={{ width: 180 }}>
                      {t("payment.scholarship")}
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {outstanding.map((row) => {
                    const isSelected = !!selected[row.key];
                    const input = inputs[row.key] ?? {
                      amount: "",
                      scholarshipAmount: "",
                    };
                    return (
                      <Table.Tr key={row.key}>
                        <Table.Td>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggle(row)}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              row.type === "TUITION"
                                ? "blue"
                                : row.type === "FEE"
                                  ? "orange"
                                  : "grape"
                            }
                            variant="light"
                          >
                            {t(`payment.itemType.${row.type}`)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{row.description}</Table.Td>
                        <Table.Td>
                          {t(`months.${row.period}`)} {row.year}
                        </Table.Td>
                        <Table.Td>
                          <NumberFormatter
                            value={row.remaining}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            size="xs"
                            disabled={!isSelected}
                            min={0}
                            max={row.remaining}
                            value={input.amount}
                            onChange={(v) =>
                              updateInput(row.key, {
                                amount: typeof v === "number" ? v : "",
                              })
                            }
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            size="xs"
                            disabled={!isSelected || row.type !== "TUITION"}
                            min={0}
                            value={input.scholarshipAmount}
                            onChange={(v) =>
                              updateInput(row.key, {
                                scholarshipAmount:
                                  typeof v === "number" ? v : "",
                              })
                            }
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>

              <Divider />
              <Group justify="space-between">
                <Text>
                  {t("payment.selectedCount", { count: selectedCount })}
                </Text>
                <Text fw={600}>
                  {t("payment.total")}{" "}
                  <NumberFormatter
                    value={totalSelected}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </Group>
            </Stack>
          </Card>
        )}

        {studentNis && outstanding.length > 0 && (
          <>
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
              {t("payment.multiItemExplainer")}
            </Alert>

            <Group>
              <Button
                leftSection={<IconCash size={18} />}
                onClick={() => setConfirmOpen(true)}
                loading={createPayment.isPending}
                disabled={selectedCount === 0 || totalSelected <= 0}
              >
                {t("payment.processPayment")}
              </Button>
              <Button
                variant="light"
                onClick={() => router.push("/admin/payments")}
              >
                {t("payment.viewPayments")}
              </Button>
            </Group>
          </>
        )}

        <Modal
          opened={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={t("payment.confirmPayment")}
          size="md"
        >
          <Stack gap="md">
            <Text>
              {t("payment.confirmPaymentMessage", {
                count: selectedCount,
              })}
            </Text>
            <Text fw={600} size="lg" ta="center">
              <NumberFormatter
                value={totalSelected}
                prefix="Rp "
                thousandSeparator="."
                decimalSeparator=","
              />
            </Text>
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setConfirmOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                leftSection={<IconCash size={18} />}
                loading={createPayment.isPending}
                onClick={() => {
                  setConfirmOpen(false);
                  handleSubmit();
                }}
              >
                {t("payment.processPayment")}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {result && (
          <Modal
            opened
            onClose={() => setResult(null)}
            title={t("payment.paymentProcessed")}
            size="lg"
          >
            <Stack gap="md">
              <Group>
                <Badge color="green" size="lg">
                  {t("payment.transactionId")}:{" "}
                  {result.transactionId.slice(0, 8).toUpperCase()}
                </Badge>
              </Group>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("payment.type")}</Table.Th>
                    <Table.Th>{t("payment.amount")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.payments.map((p) => (
                    <Table.Tr key={p.id}>
                      <Table.Td>
                        {p.tuitionId
                          ? t("payment.itemType.TUITION")
                          : p.feeBillId
                            ? t("payment.itemType.FEE")
                            : t("payment.itemType.SERVICE_FEE")}
                      </Table.Td>
                      <Table.Td>
                        <NumberFormatter
                          value={p.amount}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {result.itemErrors && result.itemErrors.length > 0 && (
                <Alert color="red" icon={<IconAlertCircle size={18} />}>
                  <Text fw={600} mb={4}>
                    {t("payment.partialFailureTitle")}
                  </Text>
                  <List size="sm">
                    {result.itemErrors.map((e, i) => (
                      <List.Item key={i}>
                        #{e.index + 1}: {e.message}
                      </List.Item>
                    ))}
                  </List>
                </Alert>
              )}

              <Group justify="flex-end">
                <Button onClick={() => setResult(null)}>
                  {t("common.close")}
                </Button>
              </Group>
            </Stack>
          </Modal>
        )}
      </Stack>
    </Paper>
  );
}
