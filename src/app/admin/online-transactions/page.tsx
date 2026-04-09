"use client";

import {
  Badge,
  Card,
  Group,
  NumberFormatter,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconClock, IconSearch } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useAdminPaymentRequests } from "@/hooks/api/useAdminPaymentRequests";
import { useQueryParams } from "@/hooks/useQueryParams";

export default function OnlineTransactionsPage() {
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const status = getParam("status") ?? null;
  const search = getParam("search", "") ?? "";
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const t = useTranslations();

  const { data, isLoading } = useAdminPaymentRequests({
    page,
    limit: 20,
    status: status || undefined,
    search: debouncedSearch || undefined,
  });

  const paymentRequests = data?.paymentRequests || [];
  const totalPages = data?.pagination.totalPages || 1;

  const getStatusBadge = (reqStatus: string, expiresAt: string) => {
    const isExpired = new Date() > new Date(expiresAt);

    if (reqStatus === "PENDING" && isExpired) {
      return <Badge color="gray">{t("payment.status.expired")}</Badge>;
    }

    const config: Record<string, { color: string; key: string }> = {
      PENDING: { color: "yellow", key: "pending" },
      VERIFIED: { color: "green", key: "verified" },
      EXPIRED: { color: "gray", key: "expired" },
      CANCELLED: { color: "red", key: "cancelled" },
    };
    const { color, key } = config[reqStatus] || {
      color: "gray",
      key: reqStatus.toLowerCase(),
    };
    return <Badge color={color}>{t(`payment.status.${key}`)}</Badge>;
  };

  const formatPeriods = (tuitions: { period: string; year: number }[]) => {
    if (tuitions.length === 1) {
      return `${tuitions[0].period} ${tuitions[0].year}`;
    }
    return `${tuitions.length} periode`;
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={3}>{t("onlineTransaction.title")}</Title>
          <Text size="sm" c="dimmed">
            {t("onlineTransaction.subtitle")}
          </Text>
        </div>
      </Group>

      <Card withBorder>
        <Stack gap="md">
          <Group>
            <TextInput
              placeholder={t("onlineTransaction.searchPlaceholder")}
              leftSection={<IconSearch size={18} />}
              value={search}
              onChange={(e) => {
                setParams({ search: e.currentTarget.value, page: 1 });
              }}
              style={{ flex: 1 }}
            />
            <Select
              placeholder={t("onlineTransaction.allStatus")}
              value={status}
              onChange={(v) => {
                setParams({ status: v, page: 1 });
              }}
              data={[
                { value: "PENDING", label: t("payment.status.pending") },
                { value: "VERIFIED", label: t("payment.status.verified") },
                { value: "EXPIRED", label: t("payment.status.expired") },
                { value: "CANCELLED", label: t("payment.status.cancelled") },
              ]}
              clearable
              w={180}
            />
          </Group>

          {isLoading ? (
            <Stack gap="sm">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={60} />
              ))}
            </Stack>
          ) : paymentRequests.length === 0 ? (
            <Text ta="center" py="xl" c="dimmed">
              {t("table.noResults")}
            </Text>
          ) : (
            <>
              <Table.ScrollContainer minWidth={900}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t("payment.time")}</Table.Th>
                      <Table.Th>{t("onlineTransaction.student")}</Table.Th>
                      <Table.Th>{t("tuition.period")}</Table.Th>
                      <Table.Th ta="right">{t("payment.nominal")}</Table.Th>
                      <Table.Th>{t("payment.bank")}</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>{t("payment.expiresAt")}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {paymentRequests.map((pr) => (
                      <Table.Tr key={pr.id}>
                        <Table.Td>
                          <Text size="sm">
                            {dayjs(pr.createdAt).format("DD/MM/YY HH:mm")}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>
                              {pr.student.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {t("portal.nis")}: {pr.student.nis}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatPeriods(pr.tuitions)}</Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Stack gap={0} align="flex-end">
                            <Text size="sm" fw={500}>
                              <NumberFormatter
                                value={Number(pr.totalAmount)}
                                prefix="Rp "
                                thousandSeparator="."
                                decimalSeparator=","
                              />
                            </Text>
                            <Text size="xs" c="dimmed">
                              +{pr.uniqueCode}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {pr.bankAccount?.bankName || "-"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {getStatusBadge(pr.status, pr.expiresAt)}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <IconClock size={14} />
                            <Text size="sm">
                              {dayjs(pr.expiresAt).format("DD/MM/YY HH:mm")}
                            </Text>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              {totalPages > 1 && (
                <Group justify="center">
                  <Pagination
                    value={page}
                    onChange={(p) => setParams({ page: p })}
                    total={totalPages}
                  />
                </Group>
              )}
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
