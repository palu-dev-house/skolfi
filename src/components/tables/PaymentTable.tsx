"use client";

import {
  ActionIcon,
  Badge,
  Group,
  NumberFormatter,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconDiscount,
  IconFilter,
  IconGift,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import { useDeletePayment, usePayments } from "@/hooks/api/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParams } from "@/hooks/useQueryParams";
import { getMonthDisplayName } from "@/lib/business-logic/tuition-generator";

export default function PaymentTable() {
  const t = useTranslations();
  const { user } = useAuth();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const classAcademicId = getParam("classAcademicId") ?? null;
  const studentSearch = getParam("studentSearch", "") ?? "";
  const dateFrom = getParam("dateFrom", "") ?? "";
  const dateTo = getParam("dateTo", "") ?? "";

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: activeYear?.id,
  });

  const { data, isLoading } = usePayments({
    page,
    limit: 10,
    classAcademicId: classAcademicId || undefined,
    studentNis: studentSearch || undefined,
    paymentDateFrom: dateFrom || undefined,
    paymentDateTo: dateTo || undefined,
  });

  const deletePayment = useDeletePayment();

  const handleDelete = (id: string, studentName: string, amount: string) => {
    modals.openConfirmModal({
      title: t("payment.reverseTitle"),
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {t.rich("payment.reverseConfirm", {
              amount: `Rp ${Number(amount).toLocaleString("id-ID")}`,
              name: studentName,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </Text>
          <Text size="sm" c="red">
            {t("payment.reverseNote")}
          </Text>
        </Stack>
      ),
      labels: {
        confirm: t("payment.reverseButton"),
        cancel: t("common.cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deletePayment.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("payment.reversed"),
              message: t("payment.reverseSuccess"),
              color: "green",
            });
          },
          onError: (error) => {
            notifications.show({
              title: t("common.error"),
              message: error.message,
              color: "red",
            });
          },
        });
      },
    });
  };

  const classOptions =
    classesData?.classes.map((c) => ({
      value: c.id,
      label: c.className,
    })) || [];

  const isAdmin = user?.role === "ADMIN";

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group gap="md" grow>
          <Select
            placeholder={t("tuition.filterByClass")}
            leftSection={<IconFilter size={16} />}
            data={classOptions}
            value={classAcademicId}
            onChange={(value) => setParams({ classAcademicId: value, page: 1 })}
            clearable
            searchable
          />
          <TextInput
            placeholder={t("payment.searchStudent")}
            leftSection={<IconSearch size={16} />}
            value={studentSearch}
            onChange={(e) =>
              setParams({ studentSearch: e.currentTarget.value, page: 1 })
            }
          />
          <TextInput
            type="date"
            placeholder={t("payment.fromDate")}
            value={dateFrom}
            onChange={(e) =>
              setParams({ dateFrom: e.currentTarget.value, page: 1 })
            }
          />
          <TextInput
            type="date"
            placeholder={t("payment.toDate")}
            value={dateTo}
            onChange={(e) =>
              setParams({ dateTo: e.currentTarget.value, page: 1 })
            }
          />
        </Group>
      </Paper>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={900}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("common.date")}</Table.Th>
                <Table.Th>{t("tuition.student")}</Table.Th>
                <Table.Th>{t("tuition.class")}</Table.Th>
                <Table.Th>{t("payment.month")}</Table.Th>
                <Table.Th ta="right" align="right">
                  {t("common.amount")}
                </Table.Th>
                <Table.Th>{t("payment.cashier")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
                {isAdmin && <Table.Th w={80}>{t("common.actions")}</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={`skeleton-${i}`}>
                    {Array.from({ length: isAdmin ? 8 : 7 }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.payments.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 8 : 7}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("payment.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.payments.map((payment) => (
                <Table.Tr key={payment.id}>
                  <Table.Td>
                    <Text size="sm">
                      {dayjs(payment.paymentDate).format("DD/MM/YYYY HH:mm")}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>
                        {payment.tuition?.student?.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {payment.tuition?.student?.nis}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {payment.tuition?.classAcademic?.className}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {payment.tuition?.month
                        ? `${getMonthDisplayName(payment.tuition.month)} ${payment.tuition.year}`
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td align="right">
                    <Stack gap={2} align="flex-end">
                      <Text size="sm" fw={600}>
                        <NumberFormatter
                          value={payment.amount}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                      {!!Number(payment.scholarshipAmount) && (
                        <Badge
                          size="xs"
                          color={"blue"}
                          variant="light"
                          leftSection={<IconGift size={10} />}
                        >
                          {t("payment.scholarship")}:{" "}
                          <NumberFormatter
                            value={Number(payment.scholarshipAmount)}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Badge>
                      )}
                      {!!payment.tuition?.discount && (
                        <Badge
                          size="xs"
                          color={"blue"}
                          variant="light"
                          leftSection={<IconDiscount size={10} />}
                        >
                          {payment.tuition?.discount?.name}:{" "}
                          <NumberFormatter
                            value={Number(payment.tuition?.discountAmount)}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Badge>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{payment.employee?.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        payment.tuition?.status === "PAID"
                          ? "green"
                          : payment.tuition?.status === "PARTIAL"
                            ? "yellow"
                            : "red"
                      }
                      variant="light"
                      size="sm"
                    >
                      {payment.tuition?.status
                        ? t(
                            `tuition.status.${payment.tuition.status.toLowerCase()}`,
                          )
                        : "-"}
                    </Badge>
                  </Table.Td>
                  {isAdmin && (
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label={t("payment.reverseButton")}>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() =>
                              handleDelete(
                                payment.id,
                                payment.tuition?.student?.name || "",
                                payment.amount,
                              )
                            }
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {data && data.pagination.totalPages > 1 && (
        <Group justify="center">
          <Pagination
            total={data.pagination.totalPages}
            value={page}
            onChange={(p) => setParams({ page: p })}
          />
        </Group>
      )}
    </Stack>
  );
}
