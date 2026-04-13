import {
  Badge,
  Card,
  Group,
  NumberFormatter,
  Paper,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCalendar,
  IconCash,
  IconDiscount,
  IconGift,
  IconReceipt,
  IconSchool,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useDashboardStats } from "@/hooks/api/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import type { NextPageWithLayout } from "@/lib/page-types";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
  subtitle,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
  subtitle?: string;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            {title}
          </Text>
          {loading ? (
            <Skeleton height={28} width={80} />
          ) : (
            <Title order={3}>{value}</Title>
          )}
          {subtitle && (
            <Text size="xs" c="dimmed">
              {subtitle}
            </Text>
          )}
        </Stack>
        <ThemeIcon size="lg" color={color} variant="light">
          <Icon size={20} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

const DashboardPage: NextPageWithLayout = function DashboardPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  const collectionRate =
    stats && stats.tuitionStats.total > 0
      ? (stats.tuitionStats.paid / stats.tuitionStats.total) * 100
      : 0;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">
          {t("dashboard.welcome")}, {user?.name}
        </Title>
        <Group gap="md">
          <Text c="dimmed">{t("dashboard.title")}</Text>
          {stats?.activeAcademicYear && (
            <Badge
              leftSection={<IconCalendar size={14} />}
              variant="light"
              color="blue"
            >
              {stats.activeAcademicYear}
            </Badge>
          )}
        </Group>
      </div>

      {/* Stats Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          title={t("dashboard.totalStudents")}
          value={stats?.totalStudents ?? 0}
          icon={IconSchool}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          title={t("dashboard.monthlyRevenue")}
          value={
            <NumberFormatter
              value={stats?.monthlyRevenue ?? 0}
              prefix="Rp "
              thousandSeparator="."
              decimalSeparator=","
            />
          }
          icon={IconCash}
          color="green"
          loading={isLoading}
          subtitle={`${stats?.monthlyPaymentsCount ?? 0} ${t("dashboard.totalPayments").toLowerCase()}`}
        />
        <StatCard
          title={t("dashboard.unpaidTuitions")}
          value={stats?.overdueTuitions ?? 0}
          icon={IconAlertTriangle}
          color="red"
          loading={isLoading}
        />
        <StatCard
          title={t("dashboard.totalOutstanding")}
          value={
            <NumberFormatter
              value={stats?.totalOutstanding ?? 0}
              prefix="Rp "
              thousandSeparator="."
              decimalSeparator=","
            />
          }
          icon={IconTrendingUp}
          color="orange"
          loading={isLoading}
        />
      </SimpleGrid>

      {/* Collection Progress & Stats */}
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card withBorder>
          <Stack gap="md">
            <Text fw={600}>{t("dashboard.collectionProgress")}</Text>
            {isLoading ? (
              <Skeleton height={60} />
            ) : (
              <>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    {t("dashboard.overallCollectionRate")}
                  </Text>
                  <Text
                    fw={700}
                    c={
                      collectionRate >= 80
                        ? "green"
                        : collectionRate >= 50
                          ? "yellow"
                          : "red"
                    }
                  >
                    {collectionRate.toFixed(1)}%
                  </Text>
                </Group>
                <Progress
                  value={collectionRate}
                  color={
                    collectionRate >= 80
                      ? "green"
                      : collectionRate >= 50
                        ? "yellow"
                        : "red"
                  }
                  size="xl"
                />
                <Group justify="center" gap="xl">
                  <Group gap="xs">
                    <Badge color="green" variant="dot" />
                    <Text size="sm">
                      {t("dashboard.paid")}: {stats?.tuitionStats.paid ?? 0}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Badge color="yellow" variant="dot" />
                    <Text size="sm">
                      {t("dashboard.partial")}:{" "}
                      {stats?.tuitionStats.partial ?? 0}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Badge color="red" variant="dot" />
                    <Text size="sm">
                      {t("dashboard.unpaid")}: {stats?.tuitionStats.unpaid ?? 0}
                    </Text>
                  </Group>
                </Group>
              </>
            )}
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="md">
            <Text fw={600}>{t("dashboard.overview")}</Text>
            {isLoading ? (
              <Skeleton height={60} />
            ) : (
              <SimpleGrid cols={2}>
                <Paper withBorder p="sm" radius="sm">
                  <Group gap="xs">
                    <ThemeIcon size="sm" color="blue" variant="light">
                      <IconUsers size={14} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("dashboard.employees")}
                      </Text>
                      <Text fw={600}>{stats?.totalEmployees ?? 0}</Text>
                    </div>
                  </Group>
                </Paper>
                <Paper withBorder p="sm" radius="sm">
                  <Group gap="xs">
                    <ThemeIcon size="sm" color="teal" variant="light">
                      <IconReceipt size={14} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("dashboard.totalTuitions")}
                      </Text>
                      <Text fw={600}>{stats?.tuitionStats.total ?? 0}</Text>
                    </div>
                  </Group>
                </Paper>
              </SimpleGrid>
            )}
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Recent Payments */}
      <Card withBorder>
        <Stack gap="md">
          <Text fw={600}>{t("dashboard.recentPayments")}</Text>
          {isLoading ? (
            <Stack gap="xs">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`skeleton-${i}`} height={40} />
              ))}
            </Stack>
          ) : stats?.recentPayments && stats.recentPayments.length > 0 ? (
            <Table.ScrollContainer minWidth={700}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("dashboard.date")}</Table.Th>
                    <Table.Th>{t("dashboard.student")}</Table.Th>
                    <Table.Th>{t("dashboard.class")}</Table.Th>
                    <Table.Th ta="right">{t("dashboard.amount")}</Table.Th>
                    <Table.Th>{t("dashboard.processedBy")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {stats.recentPayments.map((payment) => {
                    return (
                      <Table.Tr key={payment.id}>
                        <Table.Td>
                          <Text size="sm">
                            {dayjs(payment.paymentDate).format(
                              "DD/MM/YYYY HH:mm",
                            )}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>
                              {payment.studentName}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {payment.studentNis}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{payment.className}</Text>
                        </Table.Td>
                        <Table.Td align="right">
                          <Text size="sm" fw={500}>
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
                              {t("admin.scholarships")}:{" "}
                              <NumberFormatter
                                value={Number(payment.scholarshipAmount)}
                                prefix="Rp "
                                thousandSeparator="."
                                decimalSeparator=","
                              />
                            </Badge>
                          )}
                          {!!payment.discount && (
                            <Badge
                              size="xs"
                              color={"blue"}
                              variant="light"
                              leftSection={<IconDiscount size={10} />}
                            >
                              {payment.discount?.name}:{" "}
                              <NumberFormatter
                                value={Number(payment.discountAmount)}
                                prefix="Rp "
                                thousandSeparator="."
                                decimalSeparator=","
                              />
                            </Badge>
                          )}
                        </Table.Td>

                        <Table.Td>
                          <Text size="sm">{payment.processedBy}</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <Text c="dimmed" ta="center" py="md">
              {t("dashboard.noRecentPayments")}
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};
DashboardPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default DashboardPage;
