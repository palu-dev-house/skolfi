"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput, MonthPickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconTrash, IconUserPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useFeeBills } from "@/hooks/api/useFeeBills";
import {
  useAddFeeServicePrice,
  useDeleteFeeServicePrice,
  useFeeServicePrices,
} from "@/hooks/api/useFeeServicePrices";
import { useFeeService } from "@/hooks/api/useFeeServices";
import {
  useCreateFeeSubscription,
  useFeeSubscriptions,
  useUpdateFeeSubscription,
} from "@/hooks/api/useFeeSubscriptions";
import { useStudents } from "@/hooks/api/useStudents";
import type { NextPageWithLayout } from "@/lib/page-types";

function formatRp(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const FeeServiceDetailPage: NextPageWithLayout =
  function FeeServiceDetailPage() {
    const router = useRouter();
    const t = useTranslations();
    const { id } = router.query as { id: string };

    const { data: service, isLoading } = useFeeService(id);
    const { data: prices } = useFeeServicePrices(id);
    const { data: subs } = useFeeSubscriptions({
      feeServiceId: id,
      limit: 100,
    });
    const { data: bills } = useFeeBills({
      feeServiceId: id,
      limit: 20,
    });

    const addPrice = useAddFeeServicePrice(id);
    const deletePrice = useDeleteFeeServicePrice(id);
    const subscribe = useCreateFeeSubscription();
    const endSub = useUpdateFeeSubscription();

    const [priceOpened, { open: openPrice, close: closePrice }] =
      useDisclosure(false);
    const [subOpened, { open: openSub, close: closeSub }] =
      useDisclosure(false);

    if (isLoading || !service) return <LoadingOverlay visible />;

    return (
      <>
        <PageHeader
          title={service.name}
          description={`${t(`feeService.category.${service.category.toLowerCase()}`)} · ${service.academicYear?.year ?? ""}`}
        />

        <Stack gap="lg">
          <InfoCard service={service} />
          <PriceHistoryCard
            prices={prices ?? []}
            onAdd={openPrice}
            onDelete={(priceId) => {
              modals.openConfirmModal({
                title: t("feeService.deletePriceTitle"),
                children: (
                  <Text size="sm">{t("feeService.deletePriceConfirm")}</Text>
                ),
                labels: {
                  confirm: t("common.delete"),
                  cancel: t("common.cancel"),
                },
                confirmProps: { color: "red" },
                onConfirm: () =>
                  deletePrice.mutate(priceId, {
                    onError: (err) =>
                      notifications.show({
                        color: "red",
                        title: t("common.error"),
                        message: err.message,
                      }),
                  }),
              });
            }}
          />
          <SubscribersCard
            subs={subs?.subscriptions ?? []}
            onAdd={openSub}
            onEnd={(subId, studentName) => {
              modals.openConfirmModal({
                title: t("feeService.endSubscriptionTitle"),
                children: (
                  <Text size="sm">
                    {t("feeService.endSubscriptionConfirm", {
                      name: studentName,
                    })}
                  </Text>
                ),
                labels: {
                  confirm: t("common.confirm"),
                  cancel: t("common.cancel"),
                },
                onConfirm: () =>
                  endSub.mutate({
                    id: subId,
                    updates: { endDate: dayjs().format("YYYY-MM-DD") },
                  }),
              });
            }}
          />
          <RecentBillsCard bills={bills?.feeBills ?? []} />
        </Stack>

        <AddPriceModal
          opened={priceOpened}
          onClose={closePrice}
          onSubmit={(values) => {
            // Normalize to 1st of month (server also normalizes; we mirror)
            const d = dayjs(values.effectiveFrom).startOf("month");
            addPrice.mutate(
              {
                effectiveFrom: d.format("YYYY-MM-DD"),
                amount: String(values.amount),
              },
              {
                onSuccess: () => {
                  notifications.show({
                    color: "green",
                    title: t("common.success"),
                    message: t("feeService.priceAdded"),
                  });
                  closePrice();
                },
                onError: (err) =>
                  notifications.show({
                    color: "red",
                    title: t("common.error"),
                    message: err.message,
                  }),
              },
            );
          }}
          isLoading={addPrice.isPending}
        />

        <SubscribeModal
          opened={subOpened}
          onClose={closeSub}
          feeServiceId={id}
          onSubmit={(values) => {
            subscribe.mutate(
              {
                feeServiceId: id,
                studentNis: values.studentNis,
                startDate: dayjs(values.startDate).format("YYYY-MM-DD"),
                endDate: values.endDate
                  ? dayjs(values.endDate).format("YYYY-MM-DD")
                  : undefined,
                notes: values.notes || undefined,
              },
              {
                onSuccess: () => {
                  notifications.show({
                    color: "green",
                    title: t("common.success"),
                    message: t("feeService.subscribed"),
                  });
                  closeSub();
                },
                onError: (err) =>
                  notifications.show({
                    color: "red",
                    title: t("common.error"),
                    message: err.message,
                  }),
              },
            );
          }}
          isLoading={subscribe.isPending}
        />
      </>
    );
  };

function InfoCard({
  service,
}: {
  service: {
    name: string;
    description: string | null;
    isActive: boolean;
    academicYear?: { year: string } | null;
  };
}) {
  const t = useTranslations();
  return (
    <Card withBorder>
      <Stack gap="xs">
        <Title order={5}>{t("feeService.info")}</Title>
        {service.description && <Text size="sm">{service.description}</Text>}
        <Group gap="xs">
          <Badge color={service.isActive ? "green" : "gray"}>
            {service.isActive ? t("common.active") : t("common.inactive")}
          </Badge>
        </Group>
      </Stack>
    </Card>
  );
}

function PriceHistoryCard({
  prices,
  onAdd,
  onDelete,
}: {
  prices: Array<{ id: string; effectiveFrom: string; amount: string }>;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations();
  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm">
        <Title order={5}>{t("feeService.priceHistory")}</Title>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={onAdd}>
          {t("feeService.addPrice")}
        </Button>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("feeService.effectiveFrom")}</Table.Th>
            <Table.Th>{t("feeService.amount")}</Table.Th>
            <Table.Th style={{ width: 60 }}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {prices.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={3}>
                <Text ta="center" c="dimmed" py="sm">
                  {t("feeService.noPrices")}
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            prices.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>
                  {dayjs(p.effectiveFrom).format("MMMM YYYY")}
                </Table.Td>
                <Table.Td>{formatRp(p.amount)}</Table.Td>
                <Table.Td>
                  <Tooltip label={t("common.delete")}>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => onDelete(p.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

function SubscribersCard({
  subs,
  onAdd,
  onEnd,
}: {
  subs: Array<{
    id: string;
    studentNis: string;
    startDate: string;
    endDate: string | null;
    student?: { name: string };
  }>;
  onAdd: () => void;
  onEnd: (id: string, name: string) => void;
}) {
  const t = useTranslations();
  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm">
        <Title order={5}>{t("feeService.subscribers")}</Title>
        <Button
          size="xs"
          leftSection={<IconUserPlus size={14} />}
          onClick={onAdd}
        >
          {t("feeService.subscribeStudent")}
        </Button>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("student.name")}</Table.Th>
            <Table.Th>{t("student.nis")}</Table.Th>
            <Table.Th>{t("feeService.startDate")}</Table.Th>
            <Table.Th>{t("feeService.endDate")}</Table.Th>
            <Table.Th style={{ width: 110 }}>{t("common.actions")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {subs.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text ta="center" c="dimmed" py="sm">
                  {t("feeService.noSubscribers")}
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            subs.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td>{s.student?.name ?? s.studentNis}</Table.Td>
                <Table.Td>{s.studentNis}</Table.Td>
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
                      onClick={() =>
                        onEnd(s.id, s.student?.name ?? s.studentNis)
                      }
                    >
                      {t("feeService.endSubscription")}
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

function RecentBillsCard({
  bills,
}: {
  bills: Array<{
    id: string;
    period: string;
    year: number;
    amount: string;
    paidAmount: string;
    status: string;
    student?: { name: string; nis: string };
    studentNis: string;
  }>;
}) {
  const t = useTranslations();
  return (
    <Card withBorder>
      <Title order={5} mb="sm">
        {t("feeService.recentBills")}
      </Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("student.name")}</Table.Th>
            <Table.Th>{t("feeBill.period")}</Table.Th>
            <Table.Th>{t("feeBill.amount")}</Table.Th>
            <Table.Th>{t("feeBill.paid")}</Table.Th>
            <Table.Th>{t("common.status")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {bills.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text ta="center" c="dimmed" py="sm">
                  {t("feeBill.noBills")}
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            bills.map((b) => (
              <Table.Tr key={b.id}>
                <Table.Td>{b.student?.name ?? b.studentNis}</Table.Td>
                <Table.Td>
                  {t(`months.${b.period}`)} {b.year}
                </Table.Td>
                <Table.Td>{formatRp(b.amount)}</Table.Td>
                <Table.Td>{formatRp(b.paidAmount)}</Table.Td>
                <Table.Td>
                  <Badge>{t(`tuition.status.${b.status.toLowerCase()}`)}</Badge>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

function AddPriceModal({
  opened,
  onClose,
  onSubmit,
  isLoading,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (v: { effectiveFrom: Date; amount: number }) => void;
  isLoading?: boolean;
}) {
  const t = useTranslations();
  const form = useForm({
    initialValues: {
      effectiveFrom: dayjs().startOf("month").toDate() as Date,
      amount: 0 as number,
    },
    validate: {
      amount: (v) => (v > 0 ? null : t("common.required")),
    },
  });
  return (
    <Modal opened={opened} onClose={onClose} title={t("feeService.addPrice")}>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <MonthPickerInput
            label={t("feeService.effectiveFrom")}
            required
            {...form.getInputProps("effectiveFrom")}
          />
          <NumberInput
            label={t("feeService.amount")}
            required
            min={1}
            prefix="Rp "
            thousandSeparator="."
            decimalSeparator=","
            {...form.getInputProps("amount")}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isLoading}>
              {t("common.save")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function SubscribeModal({
  opened,
  onClose,
  onSubmit,
  isLoading,
}: {
  opened: boolean;
  onClose: () => void;
  feeServiceId: string;
  onSubmit: (v: {
    studentNis: string;
    startDate: Date;
    endDate: Date | null;
    notes: string;
  }) => void;
  isLoading?: boolean;
}) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const { data: studentsData } = useStudents({ limit: 20, search });
  const options = useMemo(
    () =>
      studentsData?.students.map((s) => ({
        value: s.nis,
        label: `${s.nis} — ${s.name}`,
      })) ?? [],
    [studentsData],
  );
  const form = useForm({
    initialValues: {
      studentNis: "",
      startDate: new Date() as Date,
      endDate: null as Date | null,
      notes: "",
    },
    validate: {
      studentNis: (v) => (v ? null : t("common.required")),
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("feeService.subscribeStudent")}
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <Select
            label={t("student.label")}
            required
            searchable
            data={options}
            {...form.getInputProps("studentNis")}
          />
          <DatePickerInput
            label={t("feeService.startDate")}
            required
            {...form.getInputProps("startDate")}
          />
          <DatePickerInput
            label={t("feeService.endDate")}
            clearable
            {...form.getInputProps("endDate")}
          />
          <TextInput
            label={t("feeService.notes")}
            {...form.getInputProps("notes")}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isLoading}>
              {t("common.save")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

FeeServiceDetailPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default FeeServiceDetailPage;
