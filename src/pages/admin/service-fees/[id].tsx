"use client";

import {
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  MultiSelect,
  NumberInput,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useServiceFeeBills } from "@/hooks/api/useServiceFeeBills";
import { useServiceFee, useUpdateServiceFee } from "@/hooks/api/useServiceFees";
import { useStudentsByClass } from "@/hooks/api/useStudentClasses";
import { PERIODS } from "@/lib/business-logic/tuition-generator";
import type { NextPageWithLayout } from "@/lib/page-types";

function formatRp(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const ServiceFeeDetailPage: NextPageWithLayout =
  function ServiceFeeDetailPage() {
    const router = useRouter();
    const t = useTranslations();
    const { id } = router.query as { id: string };

    const { data: serviceFee, isLoading } = useServiceFee(id);
    const update = useUpdateServiceFee();

    const { data: roster } = useStudentsByClass(
      serviceFee?.classAcademicId ?? "",
    );
    const { data: bills } = useServiceFeeBills({
      serviceFeeId: id,
      limit: 20,
    });

    const form = useForm({
      initialValues: {
        name: "",
        amount: 0 as number,
        billingMonths: [] as string[],
        isActive: true,
      },
    });

    useEffect(() => {
      if (serviceFee) {
        form.setValues({
          name: serviceFee.name,
          amount: Number(serviceFee.amount),
          billingMonths: serviceFee.billingMonths,
          isActive: serviceFee.isActive,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceFee?.id, serviceFee, form.setValues]);

    const handleSave = form.onSubmit((values) => {
      update.mutate(
        {
          id,
          updates: {
            name: values.name,
            amount: String(values.amount),
            billingMonths: values.billingMonths,
            isActive: values.isActive,
          },
        },
        {
          onSuccess: () =>
            notifications.show({
              color: "green",
              title: t("common.success"),
              message: t("serviceFee.updated"),
            }),
          onError: (err) =>
            notifications.show({
              color: "red",
              title: t("common.error"),
              message: err.message,
            }),
        },
      );
    });

    if (isLoading || !serviceFee) return <LoadingOverlay visible />;

    return (
      <>
        <PageHeader
          title={serviceFee.name}
          description={serviceFee.classAcademic?.className ?? ""}
        />
        <Stack gap="lg">
          <Card withBorder>
            <form onSubmit={handleSave}>
              <Stack gap="md">
                <Title order={5}>{t("serviceFee.settings")}</Title>
                <TextInput
                  label={t("serviceFee.name")}
                  required
                  {...form.getInputProps("name")}
                />
                <NumberInput
                  label={t("serviceFee.amount")}
                  required
                  min={1}
                  prefix="Rp "
                  thousandSeparator="."
                  decimalSeparator=","
                  {...form.getInputProps("amount")}
                />
                <MultiSelect
                  label={t("serviceFee.billingMonths")}
                  required
                  data={PERIODS.MONTHLY.map((p) => ({
                    value: p,
                    label: t(`months.${p}`),
                  }))}
                  {...form.getInputProps("billingMonths")}
                />
                <Switch
                  label={t("serviceFee.active")}
                  {...form.getInputProps("isActive", { type: "checkbox" })}
                />
                <Group justify="flex-end">
                  <Button type="submit" loading={update.isPending}>
                    {t("common.save")}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>

          <Card withBorder>
            <Title order={5} mb="sm">
              {t("serviceFee.roster")}
            </Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("student.nis")}</Table.Th>
                  <Table.Th>{t("student.name")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(roster?.students ?? []).length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={2}>
                      <Text ta="center" c="dimmed" py="sm">
                        {t("serviceFee.noStudents")}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  roster?.students.map((s) => (
                    <Table.Tr key={s.nis}>
                      <Table.Td>{s.nis}</Table.Td>
                      <Table.Td>{s.name}</Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Card>

          <Card withBorder>
            <Title order={5} mb="sm">
              {t("serviceFee.recentBills")}
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
                {(bills?.serviceFeeBills ?? []).length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center" c="dimmed" py="sm">
                        {t("feeBill.noBills")}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  bills?.serviceFeeBills.map((b) => (
                    <Table.Tr key={b.id}>
                      <Table.Td>{b.student?.name ?? b.studentNis}</Table.Td>
                      <Table.Td>
                        {t(`months.${b.period}`)} {b.year}
                      </Table.Td>
                      <Table.Td>{formatRp(b.amount)}</Table.Td>
                      <Table.Td>{formatRp(b.paidAmount)}</Table.Td>
                      <Table.Td>
                        <Badge>
                          {t(`tuition.status.${b.status.toLowerCase()}`)}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Stack>
      </>
    );
  };

ServiceFeeDetailPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default ServiceFeeDetailPage;
