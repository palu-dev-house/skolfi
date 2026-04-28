import {
  Badge,
  Card,
  Grid,
  Group,
  NumberFormatter,
  Paper,
  RingProgress,
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
  IconCheck,
  IconClock,
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
import { usePageTitle } from "@/hooks/usePageTitle";
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
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lh={1}>
            {title}
          </Text>
          {loading ? (
            <Skeleton height={32} width={100} mt="sm" />
          ) : (
            <Text fw={700} fz="xl" mt="sm" lh={1}>
              {value}
            </Text>
          )}
          {subtitle && (
            <Text size="xs" c="dimmed" mt={4}>
              {subtitle}
            </Text>
          )}
        </div>
        <ThemeIcon size={48} radius="md" color={color} variant="light">
          <Icon size={24} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

const DashboardPage: NextPageWithLayout = function DashboardPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  usePageTitle(t("admin.dashboard"));

  const total = stats?.tuitionStats.total ?? 0;
  const paid = stats?.tuitionStats.paid ?? 0;
  const partial = stats?.tuitionStats.partial ?? 0;
  const unpaid = stats?.tuitionStats.unpaid ?? 0;
  const collectionRate = total > 0 ? (paid / total) * 100 : 0;
  const partialRate = total > 0 ? (partial / total) * 100 : 0;
  const unpaidRate = total > 0 ? (unpaid / total) * 100 : 0;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Text c="dimmed" size="sm">
            {t("dashboard.title")}
          </Text>
          <Title order={2}>
            {t("dashboard.welcome")}, {user?.name}
          </Title>
        </div>
        {stats?.activeAcademicYear && (
          <Badge
            size="lg"
            leftSection={<IconCalendar size={14} />}
            variant="light"
            color="blue"
          >
            {stats.activeAcademicYear}
          </Badge>
        )}
      </Group>

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

      <Grid>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card withBorder h="100%" radius="md">
            <Text fw={600} mb="md">
              {t("dashboard.collectionProgress")}
            </Text>
            {isLoading ? (
              <Skeleton height={180} />
            ) : (
              <Stack align="center" gap="md">
                <RingProgress
                  size={180}
                  thickness={16}
                  roundCaps
                  label={
                    <Stack align="center" gap={0} maw={120} mx="auto">
                      <Text fw={700} fz="xl" lh={1}>
                        {collectionRate.toFixed(1)}%
                      </Text>
                      <Text size="xs" c="dimmed" ta="center" lh={1.2}>
                        {t("dashboard.overallCollectionRate")}
                      </Text>
                    </Stack>
                  }
                  sections={[
                    { value: collectionRate, color: "green" },
                    { value: partialRate, color: "yellow" },
                    { value: unpaidRate, color: "red" },
                  ]}
                />
                <Group justify="center" gap="lg">
                  <Stack gap={2} align="center">
                    <Group gap={4}>
                      <ThemeIcon
                        size="xs"
                        color="green"
                        variant="filled"
                        radius="xl"
                      >
                        <IconCheck size={10} />
                      </ThemeIcon>
                      <Text size="sm" fw={600}>
                        {paid}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {t("dashboard.paid")}
                    </Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <Group gap={4}>
                      <ThemeIcon
                        size="xs"
                        color="yellow"
                        variant="filled"
                        radius="xl"
                      >
                        <IconClock size={10} />
                      </ThemeIcon>
                      <Text size="sm" fw={600}>
                        {partial}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {t("dashboard.partial")}
                    </Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <Group gap={4}>
                      <ThemeIcon
                        size="xs"
                        color="red"
                        variant="filled"
                        radius="xl"
                      >
                        <IconAlertTriangle size={10} />
                      </ThemeIcon>
                      <Text size="sm" fw={600}>
                        {unpaid}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {t("dashboard.unpaid")}
                    </Text>
                  </Stack>
                </Group>
              </Stack>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card withBorder h="100%" radius="md">
            <Text fw={600} mb="md">
              {t("dashboard.overview")}
            </Text>
            {isLoading ? (
              <Skeleton height={180} />
            ) : (
              <SimpleGrid cols={2} spacing="md">
                <Paper withBorder p="md" radius="md" bg="blue.0">
                  <Group gap="sm">
                    <ThemeIcon
                      size="lg"
                      color="blue"
                      variant="light"
                      radius="md"
                    >
                      <IconUsers size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("dashboard.employees")}
                      </Text>
                      <Text fw={700} fz="lg">
                        {stats?.totalEmployees ?? 0}
                      </Text>
                    </div>
                  </Group>
                </Paper>
                <Paper withBorder p="md" radius="md" bg="teal.0">
                  <Group gap="sm">
                    <ThemeIcon
                      size="lg"
                      color="teal"
                      variant="light"
                      radius="md"
                    >
                      <IconReceipt size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("dashboard.totalTuitions")}
                      </Text>
                      <Text fw={700} fz="lg">
                        {total}
                      </Text>
                    </div>
                  </Group>
                </Paper>
                <Paper withBorder p="md" radius="md" bg="green.0">
                  <Group gap="sm">
                    <ThemeIcon
                      size="lg"
                      color="green"
                      variant="light"
                      radius="md"
                    >
                      <IconCheck size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("dashboard.paid")}
                      </Text>
                      <Text fw={700} fz="lg">
                        {paid}
                      </Text>
                    </div>
                  </Group>
                </Paper>
                <Paper withBorder p="md" radius="md" bg="orange.0">
                  <Group gap="sm">
                    <ThemeIcon
                      size="lg"
                      color="orange"
                      variant="light"
                      radius="md"
                    >
                      <IconAlertTriangle size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("dashboard.unpaid")}
                      </Text>
                      <Text fw={700} fz="lg">
                        {unpaid}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              </SimpleGrid>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      <Card withBorder radius="md">
        <Text fw={600} mb="md">
          {t("dashboard.recentPayments")}
        </Text>
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
                {stats.recentPayments.map((payment) => (
                  <Table.Tr key={payment.id}>
                    <Table.Td>
                      <Text size="sm">
                        {dayjs(payment.paymentDate).format("DD/MM/YYYY HH:mm")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {payment.studentName}
                      </Text>
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
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{payment.processedBy}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Text c="dimmed" ta="center" py="md">
            {t("dashboard.noRecentPayments")}
          </Text>
        )}
      </Card>
    </Stack>
  );
};
DashboardPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default DashboardPage;
