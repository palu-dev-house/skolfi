"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  List,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconBolt,
  IconReceipt2,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import { z } from "zod";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import {
  useDeleteFeeBill,
  useFeeBills,
  useGenerateAllFeeBills,
} from "@/hooks/api/useFeeBills";
import {
  useDeleteServiceFeeBill,
  useGenerateAllServiceFeeBills,
  useServiceFeeBills,
} from "@/hooks/api/useServiceFeeBills";
import { useQueryFilters } from "@/hooks/useQueryFilters";
import { PERIODS } from "@/lib/business-logic/tuition-generator";
import type { NextPageWithLayout } from "@/lib/page-types";

const billFilterSchema = z.object({
  studentNis: z.string().optional(),
  period: z.string().optional(),
  year: z.string().optional(),
  status: z.enum(["UNPAID", "PARTIAL", "PAID", "VOID"]).optional(),
});

function formatRp(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const STATUSES = ["UNPAID", "PARTIAL", "PAID", "VOID"] as const;

const STATUS_COLORS: Record<string, string> = {
  UNPAID: "red",
  PARTIAL: "yellow",
  PAID: "green",
  VOID: "gray",
};

interface FeeBillGenerateResult {
  created: number;
  skipped: number;
  exitSkipped: number;
  priceWarnings: string[];
}

interface ServiceFeeBillGenerateResult {
  created: number;
  skipped: number;
  exitSkipped: number;
}

const FeeBillsPage: NextPageWithLayout = function FeeBillsPage() {
  const t = useTranslations();
  const router = useRouter();
  const tabParam = router.query.tab;
  const tab: "fee" | "service" = tabParam === "service" ? "service" : "fee";
  const setTab = (next: "fee" | "service") => {
    if (!router.isReady) return;
    const { tab: _ignore, ...rest } = router.query;
    router.replace(
      {
        pathname: router.pathname,
        query: next === "fee" ? rest : { ...rest, tab: next },
      },
      undefined,
      { shallow: true },
    );
  };
  const { data: ayData } = useAcademicYears({ limit: 100 });
  const activeYear = ayData?.academicYears.find((ay) => ay.isActive);

  return (
    <>
      <PageHeader
        title={t("feeBill.title")}
        description={t("feeBill.description")}
      />
      <Tabs
        value={tab}
        onChange={(v) => setTab((v as "fee" | "service") ?? "fee")}
      >
        <Tabs.List>
          <Tabs.Tab value="fee" leftSection={<IconReceipt2 size={16} />}>
            {t("feeBill.tabFee")}
          </Tabs.Tab>
          <Tabs.Tab value="service" leftSection={<IconReceipt2 size={16} />}>
            {t("feeBill.tabService")}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="fee" pt="md">
          <FeeBillTab activeYearId={activeYear?.id} />
        </Tabs.Panel>
        <Tabs.Panel value="service" pt="md">
          <ServiceFeeBillTab activeYearId={activeYear?.id} />
        </Tabs.Panel>
      </Tabs>
    </>
  );
};

function FeeBillTab({ activeYearId }: { activeYearId?: string }) {
  const t = useTranslations();
  const { filters, page, drafts, setFilter, setPage } = useQueryFilters({
    schema: billFilterSchema,
    defaultLimit: 15,
    debounceKeys: ["studentNis"],
  });
  const studentNis = filters.studentNis ?? "";
  const studentNisDraft = drafts.studentNis ?? studentNis;
  const period = filters.period ?? null;
  const yearStr = filters.year ?? null;
  const year = yearStr ? Number(yearStr) : null;
  const status = filters.status ?? null;

  const { data, isLoading } = useFeeBills({
    page,
    limit: 15,
    studentNis: studentNis || undefined,
    period: period || undefined,
    year: year ?? undefined,
    status: status as (typeof STATUSES)[number] | undefined,
  });

  const generate = useGenerateAllFeeBills();
  const deleteBill = useDeleteFeeBill();
  const [resultOpened, { open: openResult, close: closeResult }] =
    useDisclosure(false);
  const [result, setResult] = useState<FeeBillGenerateResult | null>(null);

  const handleGenerate = () => {
    modals.openConfirmModal({
      title: t("feeBill.generateAllTitle"),
      children: <Text size="sm">{t("feeBill.generateAllConfirm")}</Text>,
      labels: {
        confirm: t("feeBill.generateAll"),
        cancel: t("common.cancel"),
      },
      onConfirm: () =>
        generate.mutate(
          { academicYearId: activeYearId },
          {
            onSuccess: (data) => {
              setResult(data);
              openResult();
            },
            onError: (err) =>
              notifications.show({
                color: "red",
                title: t("common.error"),
                message: err.message,
              }),
          },
        ),
    });
  };

  const confirmDelete = (id: string) => {
    modals.openConfirmModal({
      title: t("feeBill.deleteTitle"),
      children: <Text size="sm">{t("feeBill.deleteConfirm")}</Text>,
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () =>
        deleteBill.mutate(id, {
          onError: (err) =>
            notifications.show({
              color: "red",
              title: t("common.error"),
              message: err.message,
            }),
        }),
    });
  };

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="md" wrap="wrap">
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder={t("feeBill.searchStudent")}
              value={studentNisDraft}
              onChange={(e) =>
                setFilter("studentNis", e.currentTarget.value || null)
              }
              w={240}
            />
            <Select
              placeholder={t("feeBill.period")}
              data={PERIODS.MONTHLY.map((p) => ({
                value: p,
                label: t(`months.${p}`),
              }))}
              value={period}
              onChange={(v) => setFilter("period", v || null)}
              clearable
              w={160}
            />
            <NumberInput
              placeholder={t("feeBill.year")}
              value={year ?? ""}
              onChange={(v) =>
                setFilter("year", typeof v === "number" ? String(v) : null)
              }
              w={120}
            />
            <Select
              placeholder={t("common.status")}
              data={STATUSES.map((s) => ({
                value: s,
                label: t(`tuition.status.${s.toLowerCase()}`),
              }))}
              value={status}
              onChange={(v) =>
                setFilter(
                  "status",
                  (v as "UNPAID" | "PARTIAL" | "PAID" | "VOID" | null) || null,
                )
              }
              clearable
              w={160}
            />
          </Group>
          <Button
            leftSection={<IconBolt size={16} />}
            loading={generate.isPending}
            onClick={handleGenerate}
          >
            {t("feeBill.generateAll")}
          </Button>
        </Group>
      </Paper>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("student.name")}</Table.Th>
              <Table.Th>{t("feeService.name")}</Table.Th>
              <Table.Th>{t("feeBill.period")}</Table.Th>
              <Table.Th>{t("feeBill.amount")}</Table.Th>
              <Table.Th>{t("feeBill.paid")}</Table.Th>
              <Table.Th>{t("common.status")}</Table.Th>
              <Table.Th style={{ width: 60 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" c="dimmed" py="md">
                    {t("common.loading")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : !data?.feeBills.length ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" c="dimmed" py="md">
                    {t("feeBill.noBills")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              data.feeBills.map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{b.student?.name ?? b.studentNis}</Table.Td>
                  <Table.Td>{b.feeService?.name ?? "-"}</Table.Td>
                  <Table.Td>
                    {t(`months.${b.period}`)} {b.year}
                  </Table.Td>
                  <Table.Td>{formatRp(b.amount)}</Table.Td>
                  <Table.Td>{formatRp(b.paidAmount)}</Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLORS[b.status] ?? "gray"}>
                      {t(`tuition.status.${b.status.toLowerCase()}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {b.status === "UNPAID" && (
                      <Tooltip label={t("common.delete")}>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => confirmDelete(b.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
        {data && (
          <Stack p="md">
            <TablePagination
              value={page}
              total={data.pagination.totalPages}
              onChange={setPage}
            />
          </Stack>
        )}
      </Paper>

      <Modal
        opened={resultOpened}
        onClose={closeResult}
        title={t("feeBill.generateResultTitle")}
      >
        {result && <FeeBillResultBody result={result} />}
      </Modal>
    </Stack>
  );
}

function ServiceFeeBillTab({ activeYearId }: { activeYearId?: string }) {
  const t = useTranslations();
  const { filters, page, drafts, setFilter, setPage } = useQueryFilters({
    schema: billFilterSchema,
    defaultLimit: 15,
    debounceKeys: ["studentNis"],
  });
  const studentNis = filters.studentNis ?? "";
  const studentNisDraft = drafts.studentNis ?? studentNis;
  const period = filters.period ?? null;
  const yearStr = filters.year ?? null;
  const year = yearStr ? Number(yearStr) : null;
  const status = filters.status ?? null;

  const { data, isLoading } = useServiceFeeBills({
    page,
    limit: 15,
    studentNis: studentNis || undefined,
    period: period || undefined,
    year: year ?? undefined,
    status: status as (typeof STATUSES)[number] | undefined,
  });

  const generate = useGenerateAllServiceFeeBills();
  const deleteBill = useDeleteServiceFeeBill();
  const [resultOpened, { open: openResult, close: closeResult }] =
    useDisclosure(false);
  const [result, setResult] = useState<ServiceFeeBillGenerateResult | null>(
    null,
  );

  const handleGenerate = () => {
    modals.openConfirmModal({
      title: t("serviceFee.generateAllTitle"),
      children: <Text size="sm">{t("serviceFee.generateAllConfirm")}</Text>,
      labels: {
        confirm: t("serviceFee.generateAll"),
        cancel: t("common.cancel"),
      },
      onConfirm: () =>
        generate.mutate(
          { academicYearId: activeYearId },
          {
            onSuccess: (data) => {
              setResult(data);
              openResult();
            },
            onError: (err) =>
              notifications.show({
                color: "red",
                title: t("common.error"),
                message: err.message,
              }),
          },
        ),
    });
  };

  const confirmDelete = (id: string) => {
    modals.openConfirmModal({
      title: t("feeBill.deleteTitle"),
      children: <Text size="sm">{t("feeBill.deleteConfirm")}</Text>,
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () =>
        deleteBill.mutate(id, {
          onError: (err) =>
            notifications.show({
              color: "red",
              title: t("common.error"),
              message: err.message,
            }),
        }),
    });
  };

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="md" wrap="wrap">
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder={t("feeBill.searchStudent")}
              value={studentNisDraft}
              onChange={(e) =>
                setFilter("studentNis", e.currentTarget.value || null)
              }
              w={240}
            />
            <Select
              placeholder={t("feeBill.period")}
              data={PERIODS.MONTHLY.map((p) => ({
                value: p,
                label: t(`months.${p}`),
              }))}
              value={period}
              onChange={(v) => setFilter("period", v || null)}
              clearable
              w={160}
            />
            <NumberInput
              placeholder={t("feeBill.year")}
              value={year ?? ""}
              onChange={(v) =>
                setFilter("year", typeof v === "number" ? String(v) : null)
              }
              w={120}
            />
            <Select
              placeholder={t("common.status")}
              data={STATUSES.map((s) => ({
                value: s,
                label: t(`tuition.status.${s.toLowerCase()}`),
              }))}
              value={status}
              onChange={(v) =>
                setFilter(
                  "status",
                  (v as "UNPAID" | "PARTIAL" | "PAID" | "VOID" | null) || null,
                )
              }
              clearable
              w={160}
            />
          </Group>
          <Button
            leftSection={<IconBolt size={16} />}
            loading={generate.isPending}
            onClick={handleGenerate}
          >
            {t("serviceFee.generateAll")}
          </Button>
        </Group>
      </Paper>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("student.name")}</Table.Th>
              <Table.Th>{t("serviceFee.name")}</Table.Th>
              <Table.Th>{t("feeBill.period")}</Table.Th>
              <Table.Th>{t("feeBill.amount")}</Table.Th>
              <Table.Th>{t("feeBill.paid")}</Table.Th>
              <Table.Th>{t("common.status")}</Table.Th>
              <Table.Th style={{ width: 60 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" c="dimmed" py="md">
                    {t("common.loading")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : !data?.serviceFeeBills.length ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" c="dimmed" py="md">
                    {t("feeBill.noBills")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              data.serviceFeeBills.map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{b.student?.name ?? b.studentNis}</Table.Td>
                  <Table.Td>{b.serviceFee?.name ?? "-"}</Table.Td>
                  <Table.Td>
                    {t(`months.${b.period}`)} {b.year}
                  </Table.Td>
                  <Table.Td>{formatRp(b.amount)}</Table.Td>
                  <Table.Td>{formatRp(b.paidAmount)}</Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLORS[b.status] ?? "gray"}>
                      {t(`tuition.status.${b.status.toLowerCase()}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {b.status === "UNPAID" && (
                      <Tooltip label={t("common.delete")}>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => confirmDelete(b.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
        {data && (
          <Stack p="md">
            <TablePagination
              value={page}
              total={data.pagination.totalPages}
              onChange={setPage}
            />
          </Stack>
        )}
      </Paper>

      <Modal
        opened={resultOpened}
        onClose={closeResult}
        title={t("serviceFee.generateResultTitle")}
      >
        {result && <ServiceFeeBillResultBody result={result} />}
      </Modal>
    </Stack>
  );
}

function FeeBillResultBody({ result }: { result: FeeBillGenerateResult }) {
  const t = useTranslations();
  return (
    <Stack gap="sm">
      <Card withBorder>
        <Group>
          <Badge color="green" size="lg">
            {t("feeBill.created")}: {result.created}
          </Badge>
          <Badge color="gray" size="lg">
            {t("feeBill.skipped")}: {result.skipped}
          </Badge>
          <Badge color="orange" size="lg">
            {t("feeBill.exitSkipped")}: {result.exitSkipped}
          </Badge>
        </Group>
      </Card>
      {result.priceWarnings.length > 0 && (
        <Card withBorder>
          <Text fw={600} mb="xs" c="yellow">
            {t("feeBill.priceWarnings")}
          </Text>
          <List size="sm">
            {result.priceWarnings.map((w) => (
              <List.Item key={w}>{w}</List.Item>
            ))}
          </List>
        </Card>
      )}
    </Stack>
  );
}

function ServiceFeeBillResultBody({
  result,
}: {
  result: ServiceFeeBillGenerateResult;
}) {
  const t = useTranslations();
  return (
    <Card withBorder>
      <Group>
        <Badge color="green" size="lg">
          {t("feeBill.created")}: {result.created}
        </Badge>
        <Badge color="gray" size="lg">
          {t("feeBill.skipped")}: {result.skipped}
        </Badge>
        <Badge color="orange" size="lg">
          {t("feeBill.exitSkipped")}: {result.exitSkipped}
        </Badge>
      </Group>
    </Card>
  );
}

FeeBillsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default FeeBillsPage;
