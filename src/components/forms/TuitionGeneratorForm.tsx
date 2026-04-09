"use client";

import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  List,
  NumberFormatter,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
  IconReceipt,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { PaymentFrequency } from "@/generated/prisma/client";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import { useDiscounts } from "@/hooks/api/useDiscounts";
import { useGenerateTuitions } from "@/hooks/api/useTuitions";
import { getPeriodDisplayName } from "@/lib/business-logic/tuition-generator";

interface GenerationResult {
  generated: number;
  skipped: number;
  details: {
    totalStudents: number;
    studentsWithFullYear: number;
    studentsWithPartialYear: number;
    className: string;
    academicYear: string;
    discountsApplied?: Array<{
      id: string;
      name: string;
      amount: number;
      targetPeriods: string[];
      scope: string;
    }>;
  };
}

export default function TuitionGeneratorForm() {
  const t = useTranslations();
  const router = useRouter();
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [classAcademicId, setClassAcademicId] = useState<string | null>(null);
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency>("MONTHLY");
  const [monthlyFee, setMonthlyFee] = useState<number | string>(500000);
  const [quarterlyFee, setQuarterlyFee] = useState<number | string>("");
  const [semesterFee, setSemesterFee] = useState<number | string>("");
  const [result, setResult] = useState<GenerationResult | null>(null);

  const FREQUENCY_OPTIONS = [
    { value: "MONTHLY", label: t("tuition.frequencyMonthly") },
    { value: "QUARTERLY", label: t("tuition.frequencyQuarterly") },
    { value: "SEMESTER", label: t("tuition.frequencySemester") },
  ];

  const { data: academicYearsData, isLoading: loadingYears } = useAcademicYears(
    {
      limit: 100,
    },
  );

  const { data: classesData, isLoading: loadingClasses } = useClassAcademics({
    limit: 100,
    academicYearId: academicYearId || undefined,
  });

  const generateTuitions = useGenerateTuitions();

  // Fetch applicable discounts for the selected class
  const { data: discountsData } = useDiscounts({
    academicYearId: academicYearId || undefined,
    isActive: true,
    limit: 100,
  });

  // Filter discounts applicable to the selected class
  const applicableDiscounts = discountsData?.discounts.filter(
    (d) => !d.classAcademicId || d.classAcademicId === classAcademicId,
  );

  // Auto-select active academic year
  useState(() => {
    if (academicYearsData?.academicYears) {
      const activeYear = academicYearsData.academicYears.find(
        (ay) => ay.isActive,
      );
      if (activeYear) {
        setAcademicYearId(activeYear.id);
      }
    }
  });

  // Calculate fees
  const monthlyFeeNum = Number(monthlyFee) || 0;
  const quarterlyFeeNum = Number(quarterlyFee) || 0;
  const semesterFeeNum = Number(semesterFee) || 0;

  const defaultQuarterlyFee = monthlyFeeNum * 3;
  const defaultSemesterFee = monthlyFeeNum * 6;

  // Calculate discounts
  const quarterlyDiscount =
    quarterlyFeeNum > 0 && quarterlyFeeNum < defaultQuarterlyFee
      ? defaultQuarterlyFee - quarterlyFeeNum
      : 0;
  const semesterDiscount =
    semesterFeeNum > 0 && semesterFeeNum < defaultSemesterFee
      ? defaultSemesterFee - semesterFeeNum
      : 0;

  const quarterlyDiscountPercent =
    quarterlyDiscount > 0
      ? ((quarterlyDiscount / defaultQuarterlyFee) * 100).toFixed(1)
      : 0;
  const semesterDiscountPercent =
    semesterDiscount > 0
      ? ((semesterDiscount / defaultSemesterFee) * 100).toFixed(1)
      : 0;

  // Determine fee amount based on frequency
  const getFeeAmount = () => {
    switch (paymentFrequency) {
      case "QUARTERLY":
        return quarterlyFeeNum || defaultQuarterlyFee;
      case "SEMESTER":
        return semesterFeeNum || defaultSemesterFee;
      default:
        return monthlyFeeNum;
    }
  };

  const handleGenerate = () => {
    if (!classAcademicId || !monthlyFee) {
      notifications.show({
        title: t("common.validationError"),
        message: t("tuition.validationClassFee"),
        color: "red",
      });
      return;
    }

    generateTuitions.mutate(
      {
        classAcademicId,
        feeAmount: getFeeAmount(),
        paymentFrequency,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          notifications.show({
            title: t("tuition.generateSuccess"),
            message: t("tuition.generatedSuccess", {
              count: data.generated,
            }),
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
      },
    );
  };

  const academicYearOptions =
    academicYearsData?.academicYears.map((ay) => ({
      value: ay.id,
      label: `${ay.year}${ay.isActive ? ` (${t("academicYear.statuses.active")})` : ""}`,
    })) || [];

  const classOptions =
    classesData?.classes.map((c) => ({
      value: c.id,
      label: c.className,
    })) || [];

  return (
    <Paper withBorder p="lg" maw={600}>
      <Stack gap="md">
        <Select
          label={t("class.academicYear")}
          placeholder={t("tuition.selectAcademicYear")}
          data={academicYearOptions}
          value={academicYearId}
          onChange={(value) => {
            setAcademicYearId(value);
            setClassAcademicId(null);
          }}
          disabled={loadingYears}
          required
        />

        <Select
          label={t("class.title")}
          placeholder={t("tuition.selectClassPlaceholder")}
          data={classOptions}
          value={classAcademicId}
          onChange={setClassAcademicId}
          disabled={!academicYearId || loadingClasses}
          searchable
          required
        />

        <Divider label={t("tuition.paymentConfig")} labelPosition="center" />

        <Select
          label={t("tuition.frequency")}
          description={t("tuition.frequencyDescription")}
          data={FREQUENCY_OPTIONS}
          value={paymentFrequency}
          onChange={(value) =>
            setPaymentFrequency((value as PaymentFrequency) || "MONTHLY")
          }
        />

        <NumberInput
          label={t("tuition.monthlyFee")}
          description={t("tuition.monthlyFeeDescription")}
          placeholder={t("tuition.monthlyFeePlaceholder")}
          value={monthlyFee}
          onChange={setMonthlyFee}
          min={0}
          prefix="Rp "
          thousandSeparator="."
          decimalSeparator=","
          required
        />

        {paymentFrequency === "QUARTERLY" && monthlyFeeNum > 0 && (
          <Stack gap="xs">
            <NumberInput
              label={t("tuition.quarterlyFee")}
              description={
                <Text size="xs" c="dimmed">
                  {t("tuition.defaultNoDiscount")}{" "}
                  <NumberFormatter
                    value={defaultQuarterlyFee}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              }
              placeholder={t("tuition.quarterlyFeePlaceholder")}
              value={quarterlyFee}
              onChange={setQuarterlyFee}
              min={0}
              prefix="Rp "
              thousandSeparator="."
              decimalSeparator=","
            />
            {quarterlyDiscount > 0 && (
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="green"
                variant="light"
              >
                <Group gap="xs">
                  <Badge color="green" variant="light">
                    {t("tuition.discountPercent", {
                      percent: quarterlyDiscountPercent,
                    })}
                  </Badge>
                  <Text size="sm">
                    {t("tuition.studentsSaveQuarter", {
                      amount: `Rp ${quarterlyDiscount.toLocaleString("id-ID")}`,
                    })}
                  </Text>
                </Group>
              </Alert>
            )}
          </Stack>
        )}

        {paymentFrequency === "SEMESTER" && monthlyFeeNum > 0 && (
          <Stack gap="xs">
            <NumberInput
              label={t("tuition.semesterFee")}
              description={
                <Text size="xs" c="dimmed">
                  {t("tuition.defaultNoDiscount")}{" "}
                  <NumberFormatter
                    value={defaultSemesterFee}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              }
              placeholder={t("tuition.semesterFeePlaceholder")}
              value={semesterFee}
              onChange={setSemesterFee}
              min={0}
              prefix="Rp "
              thousandSeparator="."
              decimalSeparator=","
            />
            {semesterDiscount > 0 && (
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="green"
                variant="light"
              >
                <Group gap="xs">
                  <Badge color="green" variant="light">
                    {t("tuition.discountPercent", {
                      percent: semesterDiscountPercent,
                    })}
                  </Badge>
                  <Text size="sm">
                    {t("tuition.studentsSaveSemester", {
                      amount: `Rp ${semesterDiscount.toLocaleString("id-ID")}`,
                    })}
                  </Text>
                </Group>
              </Alert>
            )}
          </Stack>
        )}

        {monthlyFeeNum > 0 && (
          <Alert variant="light" color="blue">
            <Text size="sm" fw={500}>
              {t("tuition.annualFeeSummary")}
            </Text>
            <Stack gap={4} mt="xs">
              <Group justify="space-between">
                <Text size="sm">{t("tuition.monthlyTimes")}</Text>
                <Text size="sm" fw={500}>
                  <NumberFormatter
                    value={monthlyFeeNum * 12}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">{t("tuition.quarterlyTimes")}</Text>
                <Text size="sm" fw={500}>
                  <NumberFormatter
                    value={(quarterlyFeeNum || defaultQuarterlyFee) * 4}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">{t("tuition.semesterTimes")}</Text>
                <Text size="sm" fw={500}>
                  <NumberFormatter
                    value={(semesterFeeNum || defaultSemesterFee) * 2}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </Group>
            </Stack>
          </Alert>
        )}

        <Alert
          icon={<IconAlertCircle size={18} />}
          color="blue"
          variant="light"
        >
          <Text size="sm">{t("tuition.generationNote")}</Text>
        </Alert>

        {applicableDiscounts && applicableDiscounts.length > 0 && (
          <Alert
            icon={<IconInfoCircle size={18} />}
            color="green"
            variant="light"
            title={t("tuition.discountsWillApply")}
          >
            <Stack gap="xs">
              <Text size="sm">{t("tuition.autoApplyDiscounts")}</Text>
              {applicableDiscounts.map((discount) => (
                <Group key={discount.id} gap="xs">
                  <Badge color="green" variant="light">
                    {discount.name}
                  </Badge>
                  <Text size="sm">
                    -
                    <NumberFormatter
                      value={discount.discountAmount}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Text>
                  <Text size="xs" c="dimmed">
                    (
                    {discount.targetPeriods
                      .slice(0, 3)
                      .map(getPeriodDisplayName)
                      .join(", ")}
                    {discount.targetPeriods.length > 3 &&
                      ` ${t("tuition.andMore", { count: discount.targetPeriods.length - 3 })}`}
                    )
                  </Text>
                </Group>
              ))}
            </Stack>
          </Alert>
        )}

        <Group>
          <Button
            leftSection={<IconReceipt size={18} />}
            onClick={handleGenerate}
            loading={generateTuitions.isPending}
            disabled={!classAcademicId || !monthlyFee}
          >
            {t("tuition.generateTuitions")}
          </Button>
          <Button variant="light" onClick={() => router.push("/tuitions")}>
            {t("tuition.viewTuitions")}
          </Button>
        </Group>

        {result && (
          <Alert
            icon={<IconCheck size={18} />}
            color="green"
            title={t("tuition.generationComplete")}
          >
            <Stack gap="xs">
              <Group gap="md">
                <Badge color="green" size="lg">
                  {t("tuition.generatedCount", { count: result.generated })}
                </Badge>
                <Badge color="gray" size="lg">
                  {t("tuition.skippedCount", { count: result.skipped })}
                </Badge>
              </Group>
              <List size="sm">
                <List.Item>
                  {t("tuition.resultClass", {
                    name: result.details.className,
                  })}
                </List.Item>
                <List.Item>
                  {t("tuition.resultYear", {
                    year: result.details.academicYear,
                  })}
                </List.Item>
                <List.Item>
                  {t("tuition.resultTotalStudents", {
                    count: result.details.totalStudents,
                  })}
                </List.Item>
                <List.Item>
                  {t("tuition.resultFullYear", {
                    count: result.details.studentsWithFullYear,
                  })}
                </List.Item>
                <List.Item>
                  {t("tuition.resultMidYear", {
                    count: result.details.studentsWithPartialYear,
                  })}
                </List.Item>
                {result.details.discountsApplied &&
                  result.details.discountsApplied.length > 0 && (
                    <List.Item>
                      {t("tuition.resultDiscounts", {
                        names: result.details.discountsApplied
                          .map((d) => d.name)
                          .join(", "),
                      })}
                    </List.Item>
                  )}
              </List>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
