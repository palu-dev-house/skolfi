import {
  Alert,
  Badge,
  Box,
  Card,
  Divider,
  Group,
  NumberFormatter,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalendar,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconMoodSmile,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { Virtuoso } from "react-virtuoso";
import PortalLayout from "@/components/layouts/PortalLayout";
import { EmptyAnimation } from "@/components/ui/LottieAnimation";
import { DashboardSkeleton } from "@/components/ui/PortalSkeleton";
import { useStudentTuitions } from "@/hooks/api/useStudentTuitions";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { NextPageWithLayout } from "@/lib/page-types";

type TuitionsData = NonNullable<ReturnType<typeof useStudentTuitions>["data"]>;

interface GroupedTuitions {
  academicYear: string;
  className: string;
  tuitions: TuitionsData;
}

function groupByAcademicYearAndClass(
  tuitions: TuitionsData | undefined,
): GroupedTuitions[] {
  if (!tuitions) return [];

  const groups: Record<string, GroupedTuitions> = {};

  for (const tuition of tuitions) {
    const key = `${tuition.academicYear}-${tuition.className}`;
    if (!groups[key]) {
      groups[key] = {
        academicYear: tuition.academicYear,
        className: tuition.className,
        tuitions: [],
      };
    }
    groups[key].tuitions.push(tuition);
  }

  return Object.values(groups);
}

const StudentDashboardPage: NextPageWithLayout =
  function StudentDashboardPage() {
    const t = useTranslations();
    const { data: tuitions = [], isLoading, error } = useStudentTuitions();

    usePageTitle(t("nav.home"));

    const groupedTuitions = groupByAcademicYearAndClass(tuitions);

    const getStatusColor = (status: string) => {
      switch (status) {
        case "PAID":
          return "green";
        case "PARTIAL":
          return "yellow";
        case "VOID":
          return "gray";
        default:
          return "red";
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case "PAID":
          return <IconCheck size={14} />;
        case "PARTIAL":
          return <IconClock size={14} />;
        default:
          return <IconAlertCircle size={14} />;
      }
    };

    const activeTuitions = tuitions.filter((t) => t.status !== "VOID");

    const totalUnpaid = activeTuitions
      .filter((t) => t.status !== "PAID")
      .reduce((sum, t) => sum + t.remainingAmount, 0);

    const paidCount = activeTuitions.filter((t) => t.status === "PAID").length;
    const pendingCount = activeTuitions.filter(
      (t) => t.status !== "PAID",
    ).length;

    if (isLoading) {
      return <DashboardSkeleton />;
    }

    return (
      <Stack gap="lg">
        {/* Welcome Header */}
        <Card p="lg" radius="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="lg" fw={600}>
                {t("dashboard.summary")}
              </Text>
              <Text size="sm" c="dimmed">
                {groupedTuitions.length > 0
                  ? t("dashboard.registeredClasses", {
                      count: groupedTuitions.length,
                    })
                  : t("dashboard.noDataYet")}
              </Text>
            </Box>
            <ThemeIcon size={42} radius="xl" variant="light" color="dark">
              <IconCalendar size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        {error && (
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="red"
            variant="light"
          >
            {error instanceof Error ? error.message : t("common.error")}
          </Alert>
        )}

        {/* Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <Card
            withBorder
            p="lg"
            style={{
              borderLeft: `4px solid ${totalUnpaid > 0 ? "var(--mantine-color-red-6)" : "var(--mantine-color-green-6)"}`,
              overflow: "hidden",
            }}
          >
            <Stack gap="xs">
              <Group gap="xs">
                <ThemeIcon
                  size="md"
                  radius="md"
                  variant="light"
                  color={totalUnpaid > 0 ? "red" : "green"}
                >
                  <IconCreditCard size={16} />
                </ThemeIcon>
                <Text size="sm" c="dimmed" truncate>
                  {t("dashboard.totalUnpaid")}
                </Text>
              </Group>
              <Text
                size="xl"
                fw={700}
                c={totalUnpaid > 0 ? "red" : "green"}
                truncate
              >
                <NumberFormatter
                  value={totalUnpaid}
                  prefix="Rp "
                  thousandSeparator="."
                  decimalSeparator=","
                />
              </Text>
            </Stack>
          </Card>

          <Card
            withBorder
            p="lg"
            style={{
              borderLeft: "4px solid var(--mantine-color-orange-6)",
              overflow: "hidden",
            }}
          >
            <Stack gap="xs">
              <Group gap="xs">
                <ThemeIcon size="md" radius="md" variant="light" color="orange">
                  <IconClock size={16} />
                </ThemeIcon>
                <Text size="sm" c="dimmed" truncate>
                  {t("dashboard.pendingBills")}
                </Text>
              </Group>
              <Text size="xl" fw={700} c="orange">
                {pendingCount}{" "}
                <Text span size="sm" c="dimmed" fw={400}>
                  {t("dashboard.months")}
                </Text>
              </Text>
            </Stack>
          </Card>

          <Card
            withBorder
            p="lg"
            style={{
              borderLeft: "4px solid var(--mantine-color-green-6)",
              overflow: "hidden",
            }}
          >
            <Stack gap="xs">
              <Group gap="xs">
                <ThemeIcon size="md" radius="md" variant="light" color="green">
                  <IconCheck size={16} />
                </ThemeIcon>
                <Text size="sm" c="dimmed" truncate>
                  {t("dashboard.paidBills")}
                </Text>
              </Group>
              <Group gap="xs" align="baseline">
                <Text size="xl" fw={700} c="green">
                  {paidCount}{" "}
                  <Text span size="sm" c="dimmed" fw={400}>
                    {t("dashboard.months")}
                  </Text>
                </Text>
                {paidCount === tuitions.length && tuitions.length > 0 && (
                  <IconMoodSmile
                    size={20}
                    color="var(--mantine-color-green-6)"
                  />
                )}
              </Group>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Tuitions List */}
        {tuitions.length === 0 ? (
          <Card withBorder>
            <EmptyAnimation message={t("dashboard.noBills")} />
          </Card>
        ) : (
          <Virtuoso
            useWindowScroll
            data={groupedTuitions}
            itemContent={(_index, group) => (
              <Card withBorder mb="md">
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Box>
                      <Title order={5}>{group.className}</Title>
                      <Text size="sm" c="dimmed">
                        {t("dashboard.academicYear", {
                          year: group.academicYear,
                        })}
                      </Text>
                    </Box>
                    <Badge
                      color={
                        group.tuitions.every(
                          (tuition) => tuition.status === "PAID",
                        )
                          ? "green"
                          : "orange"
                      }
                      variant="light"
                    >
                      {t("dashboard.paidOf", {
                        paid: group.tuitions.filter(
                          (tuition) => tuition.status === "PAID",
                        ).length,
                        total: group.tuitions.length,
                      })}
                    </Badge>
                  </Group>

                  {/* Mobile View - Cards */}
                  <Box hiddenFrom="md">
                    <Stack gap="xs">
                      {group.tuitions.map((tuition) => (
                        <Paper
                          key={tuition.id}
                          withBorder
                          p="sm"
                          style={{ overflow: "hidden" }}
                        >
                          <Stack gap="xs">
                            <Group justify="space-between" wrap="nowrap">
                              <Text
                                fw={600}
                                size="sm"
                                truncate
                                style={{ minWidth: 0, flex: 1 }}
                              >
                                {tuition.period} {tuition.year}
                              </Text>
                              <Badge
                                color={getStatusColor(tuition.status)}
                                variant="light"
                                size="sm"
                                leftSection={getStatusIcon(tuition.status)}
                                style={{ flexShrink: 0 }}
                              >
                                {tuition.status}
                              </Badge>
                            </Group>
                            <Divider />
                            <SimpleGrid cols={2} spacing="xs">
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                <Text size="xs" c="dimmed">
                                  {t("tuition.fee")}
                                </Text>
                                <Text size="sm" truncate>
                                  <NumberFormatter
                                    value={Number(tuition.feeAmount)}
                                    prefix="Rp "
                                    thousandSeparator="."
                                    decimalSeparator=","
                                  />
                                </Text>
                              </Stack>
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                <Text size="xs" c="dimmed">
                                  {t("tuition.paid")}
                                </Text>
                                <Text size="sm" truncate>
                                  <NumberFormatter
                                    value={Number(tuition.paidAmount)}
                                    prefix="Rp "
                                    thousandSeparator="."
                                    decimalSeparator=","
                                  />
                                </Text>
                              </Stack>
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                <Text size="xs" c="dimmed">
                                  {t("tuition.remaining")}
                                </Text>
                                <Text
                                  size="sm"
                                  fw={500}
                                  truncate
                                  c={
                                    tuition.remainingAmount > 0
                                      ? "red"
                                      : "green"
                                  }
                                >
                                  <NumberFormatter
                                    value={tuition.remainingAmount}
                                    prefix="Rp "
                                    thousandSeparator="."
                                    decimalSeparator=","
                                  />
                                </Text>
                              </Stack>
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                <Text size="xs" c="dimmed">
                                  {t("tuition.dueDate")}
                                </Text>
                                <Text size="sm" truncate>
                                  {dayjs(tuition.dueDate).format("DD/MM/YYYY")}
                                </Text>
                              </Stack>
                            </SimpleGrid>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>

                  {/* Desktop View - Table */}
                  <Box visibleFrom="md">
                    <Table.ScrollContainer minWidth={600}>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t("tuition.period")}</Table.Th>
                            <Table.Th ta="right">{t("tuition.fee")}</Table.Th>
                            <Table.Th ta="right">{t("tuition.paid")}</Table.Th>
                            <Table.Th ta="right">
                              {t("tuition.remaining")}
                            </Table.Th>
                            <Table.Th>{t("tuition.dueDate")}</Table.Th>
                            <Table.Th>{t("common.status")}</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {group.tuitions.map((tuition) => (
                            <Table.Tr key={tuition.id}>
                              <Table.Td>
                                <Text fw={500}>
                                  {tuition.period} {tuition.year}
                                </Text>
                              </Table.Td>
                              <Table.Td ta="right">
                                <NumberFormatter
                                  value={Number(tuition.feeAmount)}
                                  prefix="Rp "
                                  thousandSeparator="."
                                  decimalSeparator=","
                                />
                              </Table.Td>
                              <Table.Td ta="right">
                                <NumberFormatter
                                  value={Number(tuition.paidAmount)}
                                  prefix="Rp "
                                  thousandSeparator="."
                                  decimalSeparator=","
                                />
                              </Table.Td>
                              <Table.Td ta="right">
                                <Text
                                  c={
                                    tuition.remainingAmount > 0
                                      ? "red"
                                      : "green"
                                  }
                                  fw={500}
                                >
                                  <NumberFormatter
                                    value={tuition.remainingAmount}
                                    prefix="Rp "
                                    thousandSeparator="."
                                    decimalSeparator=","
                                  />
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                {dayjs(tuition.dueDate).format("DD/MM/YYYY")}
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={getStatusColor(tuition.status)}
                                  variant="light"
                                  leftSection={getStatusIcon(tuition.status)}
                                >
                                  {tuition.status}
                                </Badge>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  </Box>
                </Stack>
              </Card>
            )}
          />
        )}

        {/* Pay Now link removed - accessible via bottom nav */}
      </Stack>
    );
  };
StudentDashboardPage.getLayout = (page: ReactElement) => (
  <PortalLayout>{page}</PortalLayout>
);

export default StudentDashboardPage;
