import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  NumberFormatter,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalendar,
  IconCheck,
  IconClock,
  IconGift,
  IconReceipt,
  IconSchool,
  IconSearch,
  IconUser,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { getPeriodDisplayName } from "@/lib/business-logic/tuition-generator";

interface PaymentData {
  student: {
    nis: string;
    nik: string;
    name: string;
    parentName: string;
    parentPhone: string;
  };
  academicYears: Array<{
    academicYear: { id: string; year: string };
    class: { id: string; className: string; grade: number; section: string };
    tuitions: Array<{
      id: string;
      period: string;
      year: number;
      feeAmount: number;
      scholarshipAmount: number;
      discountAmount: number;
      paidAmount: number;
      effectiveFee: number;
      remainingAmount: number;
      status: string;
      dueDate: string;
      payments: Array<{
        id: string;
        amount: number;
        paymentDate: string;
        notes: string | null;
      }>;
    }>;
    summary: {
      totalFees: number;
      totalScholarships: number;
      totalDiscounts: number;
      totalEffectiveFees: number;
      totalPaid: number;
      totalOutstanding: number;
      paidCount: number;
      partialCount: number;
      unpaidCount: number;
    };
  }>;
  scholarships: Array<{
    id: string;
    name: string;
    nominal: number;
    isFullScholarship: boolean;
    academicYear: string;
    className: string;
  }>;
}

export default function StudentPortalPage() {
  const [nis, setNis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaymentData | null>(null);

  const handleSearch = async () => {
    if (!nis.trim()) {
      setError("Please enter your NIS");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/student-portal/${nis.trim()}`);
      const result = await response.json();

      if (!result.success) {
        setError(result.error?.message || "Student not found");
        setData(null);
      } else {
        setData(result.data);
      }
    } catch {
      setError("Failed to fetch data. Please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "dark";
      case "PARTIAL":
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

  return (
    <Container
      size="lg"
      py={{ base: "md", sm: "xl" }}
      px={{ base: "sm", sm: "md" }}
    >
      <Stack gap={24}>
        {/* Header */}
        <Center>
          <Stack align="center" gap="xs">
            <IconSchool size={40} color="var(--mantine-color-dark-6)" />
            <Title order={2} c="dark" ta="center">
              Student Payment Portal
            </Title>
            <Text c="dark.4" size="sm" ta="center">
              Check your tuition payment status
            </Text>
          </Stack>
        </Center>

        {/* Search Box */}
        <Paper withBorder p="lg" radius="md" bg="dark.0">
          <Stack gap="md">
            <Text fw={500} c="dark">
              Enter your Student ID (NIS)
            </Text>
            <Stack gap="sm">
              <TextInput
                placeholder="e.g., 2024001"
                leftSection={<IconUser size={18} />}
                value={nis}
                onChange={(e) => setNis(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                size="md"
                disabled={loading}
              />
              <Button
                leftSection={<IconSearch size={18} />}
                onClick={handleSearch}
                loading={loading}
                size="md"
                fullWidth
              >
                Search
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Error */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="red"
            variant="light"
          >
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Center py="xl">
            <Loader size="lg" />
          </Center>
        )}

        {/* Results */}
        {data && !loading && (
          <Stack gap={24}>
            {/* Student Info */}
            <Card withBorder bg="dark.0">
              <SimpleGrid cols={{ base: 1, xs: 2, sm: 5 }} spacing="md">
                <Stack gap={4}>
                  <Text size="sm" c="dark.4">
                    Student Name
                  </Text>
                  <Text size="lg" fw={600} c="dark">
                    {data.student.name}
                  </Text>
                </Stack>
                <Stack gap={4}>
                  <Text size="sm" c="dark.4">
                    NIS
                  </Text>
                  <Badge size="lg" variant="filled" color="dark">
                    {data.student.nis}
                  </Badge>
                </Stack>
                <Stack gap={4}>
                  <Text size="sm" c="dark.4">
                    NIK
                  </Text>
                  <Text c="dark">{data.student.nik}</Text>
                </Stack>
                <Stack gap={4}>
                  <Text size="sm" c="dark.4">
                    Parent/Guardian
                  </Text>
                  <Text c="dark">{data.student.parentName}</Text>
                </Stack>
                <Stack gap={4}>
                  <Text size="sm" c="dark.4">
                    Contact
                  </Text>
                  <Text c="dark">{data.student.parentPhone}</Text>
                </Stack>
              </SimpleGrid>
            </Card>

            {/* Scholarships */}
            {data.scholarships.length > 0 && (
              <Alert
                icon={<IconGift size={18} />}
                color="teal"
                variant="light"
                title="Active Scholarships"
              >
                <Stack gap="sm">
                  {data.scholarships.map((s) => (
                    <Stack key={s.id} gap={4}>
                      <Group gap="xs" wrap="wrap">
                        <Badge
                          color={s.isFullScholarship ? "green" : "teal"}
                          variant="light"
                          size="sm"
                        >
                          {s.isFullScholarship ? "Full" : "Partial"}
                        </Badge>
                        <Text size="sm">{s.name}</Text>
                        <Text size="sm" c="dimmed">
                          ({s.academicYear} - {s.className})
                        </Text>
                      </Group>
                      <Text size="sm" fw={600} c="teal">
                        <NumberFormatter
                          value={s.nominal}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                        /month
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              </Alert>
            )}

            {/* No Data */}
            {data.academicYears.length === 0 && (
              <Alert
                icon={<IconReceipt size={18} />}
                color="blue"
                variant="light"
              >
                No tuition records found for this student.
              </Alert>
            )}

            {/* Academic Years */}
            {data.academicYears.map((yearData) => (
              <Card key={yearData.academicYear.id} withBorder>
                <Stack gap="md">
                  {/* Year Header */}
                  <Stack gap="xs">
                    <Group gap="xs" wrap="wrap">
                      <IconCalendar
                        size={20}
                        color="var(--mantine-color-dark-6)"
                      />
                      <Title order={4} c="dark">
                        {yearData.class.className}
                      </Title>
                    </Group>
                    <Group gap="xs" wrap="wrap">
                      <Badge color="dark" variant="filled" size="sm">
                        {yearData.summary.paidCount} Paid
                      </Badge>
                      {yearData.summary.partialCount > 0 && (
                        <Badge color="gray" variant="light" size="sm">
                          {yearData.summary.partialCount} Partial
                        </Badge>
                      )}
                      {yearData.summary.unpaidCount > 0 && (
                        <Badge color="red" variant="light" size="sm">
                          {yearData.summary.unpaidCount} Unpaid
                        </Badge>
                      )}
                    </Group>
                  </Stack>

                  {/* Summary Cards */}
                  <SimpleGrid cols={{ base: 2, sm: 3 }}>
                    <Paper withBorder p="sm" radius="sm" bg="dark.0">
                      <Stack gap={2}>
                        <Text size="xs" c="dark.4">
                          Total Fees
                        </Text>
                        <Text fw={600} c="dark">
                          <NumberFormatter
                            value={yearData.summary.totalFees}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Text>
                      </Stack>
                    </Paper>
                    {yearData.summary.totalScholarships > 0 && (
                      <Paper withBorder p="sm" radius="sm" bg="dark.1">
                        <Stack gap={2}>
                          <Text size="xs" c="dark.4">
                            Scholarship
                          </Text>
                          <Text fw={600} c="dark.6">
                            -
                            <NumberFormatter
                              value={yearData.summary.totalScholarships}
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Text>
                        </Stack>
                      </Paper>
                    )}
                    <Paper withBorder p="sm" radius="sm" bg="dark.1">
                      <Stack gap={2}>
                        <Text size="xs" c="dark.4">
                          Total Discounts
                        </Text>
                        <Text fw={600} c="dark.6">
                          -
                          <NumberFormatter
                            value={yearData.summary.totalDiscounts}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Text>
                      </Stack>
                    </Paper>
                    <Paper withBorder p="sm" radius="sm" bg="dark.1">
                      <Stack gap={2}>
                        <Text size="xs" c="dark.4">
                          Total Paid
                        </Text>
                        <Text fw={600} c="dark.6">
                          <NumberFormatter
                            value={yearData.summary.totalPaid}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Text>
                      </Stack>
                    </Paper>

                    <Paper
                      withBorder
                      p="sm"
                      radius="sm"
                      bg={
                        yearData.summary.totalOutstanding > 0
                          ? "red.0"
                          : "dark.1"
                      }
                    >
                      <Stack gap={2}>
                        <Text size="xs" c="dark.4">
                          Outstanding
                        </Text>
                        <Text
                          fw={600}
                          c={
                            yearData.summary.totalOutstanding > 0
                              ? "red.7"
                              : "dark.6"
                          }
                        >
                          <NumberFormatter
                            value={yearData.summary.totalOutstanding}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Text>
                      </Stack>
                    </Paper>
                  </SimpleGrid>

                  {/* Progress */}
                  <div>
                    <Group justify="space-between" mb={4}>
                      <Text size="sm" c="dark.4">
                        Payment Progress
                      </Text>
                      <Text size="sm" fw={500} c="dark">
                        {yearData.summary.totalEffectiveFees > 0
                          ? Math.round(
                              (yearData.summary.totalPaid /
                                yearData.summary.totalEffectiveFees) *
                                100,
                            )
                          : 100}
                        %
                      </Text>
                    </Group>
                    <Progress
                      value={
                        yearData.summary.totalEffectiveFees > 0
                          ? (yearData.summary.totalPaid /
                              yearData.summary.totalEffectiveFees) *
                            100
                          : 100
                      }
                      color={
                        yearData.summary.totalOutstanding === 0
                          ? "dark"
                          : yearData.summary.totalPaid > 0
                            ? "dark.4"
                            : "red"
                      }
                      size="lg"
                    />
                  </div>

                  {/* Tuitions - Mobile Cards */}
                  <Box hiddenFrom="md">
                    <Accordion variant="separated">
                      <Accordion.Item value="details">
                        <Accordion.Control>
                          <Text size="sm" fw={500}>
                            View Monthly Details
                          </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="sm">
                            {yearData.tuitions.map((tuition) => (
                              <Paper
                                key={tuition.id}
                                withBorder
                                p="sm"
                                radius="sm"
                              >
                                <Stack gap="xs">
                                  <Group justify="space-between" wrap="wrap">
                                    <Text size="sm" fw={600} c="dark">
                                      {getPeriodDisplayName(tuition.period)}{" "}
                                      {tuition.year}
                                    </Text>
                                    <Badge
                                      color={getStatusColor(tuition.status)}
                                      variant="light"
                                      leftSection={getStatusIcon(
                                        tuition.status,
                                      )}
                                      size="sm"
                                    >
                                      {tuition.status}
                                    </Badge>
                                  </Group>
                                  <Divider />
                                  <SimpleGrid cols={2} spacing="xs">
                                    <Stack gap={2}>
                                      <Text size="xs" c="dimmed">
                                        Fee
                                      </Text>
                                      <Text size="sm">
                                        <NumberFormatter
                                          value={tuition.feeAmount}
                                          prefix="Rp "
                                          thousandSeparator="."
                                          decimalSeparator=","
                                        />
                                      </Text>
                                    </Stack>
                                    <Stack gap={2}>
                                      <Text size="xs" c="dimmed">
                                        Paid
                                      </Text>
                                      <Text size="sm" fw={500} c="dark.6">
                                        <NumberFormatter
                                          value={tuition.paidAmount}
                                          prefix="Rp "
                                          thousandSeparator="."
                                          decimalSeparator=","
                                        />
                                      </Text>
                                    </Stack>
                                    {tuition.scholarshipAmount > 0 && (
                                      <Stack gap={2}>
                                        <Text size="xs" c="dimmed">
                                          Scholarship
                                        </Text>
                                        <Text size="sm" c="teal">
                                          -
                                          <NumberFormatter
                                            value={tuition.scholarshipAmount}
                                            prefix="Rp "
                                            thousandSeparator="."
                                            decimalSeparator=","
                                          />
                                        </Text>
                                      </Stack>
                                    )}
                                    {tuition.discountAmount > 0 && (
                                      <Stack gap={2}>
                                        <Text size="xs" c="dimmed">
                                          Discount
                                        </Text>
                                        <Text size="sm" c="teal">
                                          -
                                          <NumberFormatter
                                            value={tuition.discountAmount}
                                            prefix="Rp "
                                            thousandSeparator="."
                                            decimalSeparator=","
                                          />
                                        </Text>
                                      </Stack>
                                    )}
                                    <Stack gap={2}>
                                      <Text size="xs" c="dimmed">
                                        Remaining
                                      </Text>
                                      <Text
                                        size="sm"
                                        fw={500}
                                        c={
                                          tuition.remainingAmount > 0
                                            ? "red"
                                            : "dark.6"
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
                                    <Stack gap={2}>
                                      <Text size="xs" c="dimmed">
                                        Due Date
                                      </Text>
                                      <Text size="sm">
                                        {dayjs(tuition.dueDate).format(
                                          "DD/MM/YYYY",
                                        )}
                                      </Text>
                                    </Stack>
                                  </SimpleGrid>
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                  </Box>

                  {/* Tuitions - Desktop Table */}
                  <Box visibleFrom="md">
                    <Accordion variant="separated">
                      <Accordion.Item value="details">
                        <Accordion.Control>
                          <Text size="sm" fw={500}>
                            View Monthly Details
                          </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Table.ScrollContainer minWidth={600}>
                            <Table striped highlightOnHover>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>Period</Table.Th>
                                  <Table.Th ta="right" align="right" miw={180}>
                                    Fee
                                  </Table.Th>
                                  <Table.Th ta="right" align="right" miw={180}>
                                    Scholarship
                                  </Table.Th>
                                  <Table.Th ta="right" align="right" miw={180}>
                                    Paid
                                  </Table.Th>
                                  <Table.Th ta="right" align="right" miw={180}>
                                    Discount
                                  </Table.Th>
                                  <Table.Th ta="right" align="right" miw={180}>
                                    Remaining
                                  </Table.Th>
                                  <Table.Th>Due Date</Table.Th>
                                  <Table.Th miw={120}>Status</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {yearData.tuitions.map((tuition) => (
                                  <Table.Tr key={tuition.id}>
                                    <Table.Td>
                                      <Text size="sm" fw={500}>
                                        {getPeriodDisplayName(tuition.period)}{" "}
                                        {tuition.year}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td ta="right" align="right">
                                      <NumberFormatter
                                        value={tuition.feeAmount}
                                        prefix="Rp "
                                        thousandSeparator="."
                                        decimalSeparator=","
                                      />
                                    </Table.Td>
                                    <Table.Td ta="right" align="right">
                                      {tuition.scholarshipAmount > 0 ? (
                                        <Text c="teal" size="sm">
                                          -
                                          <NumberFormatter
                                            value={tuition.scholarshipAmount}
                                            prefix="Rp "
                                            thousandSeparator="."
                                            decimalSeparator=","
                                          />
                                        </Text>
                                      ) : (
                                        <Text c="dimmed" size="sm">
                                          -
                                        </Text>
                                      )}
                                    </Table.Td>
                                    <Table.Td ta="right" align="right">
                                      <Text c="dark.6" size="sm" fw={500}>
                                        <NumberFormatter
                                          value={tuition.paidAmount}
                                          prefix="Rp "
                                          thousandSeparator="."
                                          decimalSeparator=","
                                        />
                                      </Text>
                                    </Table.Td>
                                    <Table.Td ta="right" align="right">
                                      {tuition.discountAmount > 0 ? (
                                        <Text c="teal" size="sm">
                                          -
                                          <NumberFormatter
                                            value={tuition.discountAmount}
                                            prefix="Rp "
                                            thousandSeparator="."
                                            decimalSeparator=","
                                          />
                                        </Text>
                                      ) : (
                                        <Text c="dimmed" size="sm">
                                          -
                                        </Text>
                                      )}
                                    </Table.Td>
                                    <Table.Td ta="right" align="right">
                                      <Text
                                        c={
                                          tuition.remainingAmount > 0
                                            ? "red"
                                            : "dark.6"
                                        }
                                        fw={500}
                                        size="sm"
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
                                      <Text size="sm">
                                        {dayjs(tuition.dueDate).format(
                                          "DD/MM/YYYY",
                                        )}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Badge
                                        color={getStatusColor(tuition.status)}
                                        variant="light"
                                        leftSection={getStatusIcon(
                                          tuition.status,
                                        )}
                                      >
                                        {tuition.status}
                                      </Badge>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                              </Table.Tbody>
                            </Table>
                          </Table.ScrollContainer>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                  </Box>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        {/* Footer */}
        <Center ta="center">
          <Text size="sm" c="dark.4" ta="center">
            For payment inquiries, please contact the school administration.
          </Text>
        </Center>
      </Stack>
    </Container>
  );
}
