"use client";

import {
  Alert,
  Badge,
  Button,
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
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
  const [monthlyFee, setMonthlyFee] = useState<number | string>(500000);
  const [result, setResult] = useState<GenerationResult | null>(null);

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

  const { data: discountsData } = useDiscounts({
    academicYearId: academicYearId || undefined,
    isActive: true,
    limit: 100,
  });

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

  const monthlyFeeNum = Number(monthlyFee) || 0;

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
        feeAmount: monthlyFeeNum,
        paymentFrequency: "MONTHLY",
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
    <Paper withBorder p="lg">
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

        {monthlyFeeNum > 0 && (
          <Alert variant="light" color="blue">
            <Text size="sm" fw={500}>
              {t("tuition.annualFeeSummary")}
            </Text>
            <Group justify="space-between" mt="xs">
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
          <Button
            variant="light"
            onClick={() => router.push("/admin/tuitions")}
          >
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
