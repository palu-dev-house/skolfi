"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
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
  IconGift,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import { useCreateScholarship } from "@/hooks/api/useScholarships";
import { useStudents } from "@/hooks/api/useStudents";
import { useTuitions } from "@/hooks/api/useTuitions";

interface CreationResult {
  scholarship: {
    id: string;
    studentNis: string;
    classAcademicId: string;
    nominal: string;
    isFullScholarship: boolean;
  };
  applicationResult?: {
    isFullScholarship: boolean;
    tuitionsAffected: number;
  };
}

export default function ScholarshipForm() {
  const t = useTranslations();
  const router = useRouter();
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [classAcademicId, setClassAcademicId] = useState<string | null>(null);
  const [studentNis, setStudentNis] = useState<string | null>(null);
  const [scholarshipName, setScholarshipName] = useState<string | null>(
    "Academic",
  );
  const [nominal, setNominal] = useState<number | string>(500000);
  const [result, setResult] = useState<CreationResult | null>(null);

  const SCHOLARSHIP_TYPES = [
    { value: "Academic", label: t("scholarship.scholarshipTypes.Academic") },
    { value: "Sports", label: t("scholarship.scholarshipTypes.Sports") },
    { value: "Arts", label: t("scholarship.scholarshipTypes.Arts") },
    { value: "Need-based", label: t("scholarship.scholarshipTypes.NeedBased") },
    { value: "Merit", label: t("scholarship.scholarshipTypes.Merit") },
    { value: "Other", label: t("scholarship.scholarshipTypes.Other") },
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

  const { data: studentsData, isLoading: loadingStudents } = useStudents({
    limit: 1000,
  });

  // Fetch tuitions for the selected class to get the fee amount
  const { data: tuitionsData } = useTuitions({
    classAcademicId: classAcademicId || undefined,
    limit: 1,
  });

  // Get the tuition fee for the selected class
  const classTuitionFee = useMemo(() => {
    if (!tuitionsData?.tuitions?.length) return null;
    return Number(tuitionsData.tuitions[0].feeAmount);
  }, [tuitionsData]);

  const createScholarship = useCreateScholarship();

  const handleSubmit = () => {
    if (!studentNis || !classAcademicId || !nominal || !scholarshipName) {
      notifications.show({
        title: t("common.validationError"),
        message: t("common.fillRequired"),
        color: "red",
      });
      return;
    }

    createScholarship.mutate(
      {
        studentNis,
        classAcademicId,
        name: scholarshipName,
        nominal: Number(nominal),
      },
      {
        onSuccess: (data) => {
          setResult(data);
          notifications.show({
            title: t("scholarship.createdTitle"),
            message: data.applicationResult?.tuitionsAffected
              ? t("scholarship.createdAndAutoPaid", {
                  count: data.applicationResult.tuitionsAffected,
                })
              : t("scholarship.createSuccess"),
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

  const studentOptions =
    studentsData?.students.map((s) => ({
      value: s.nis,
      label: `${s.nis} - ${s.name}`,
    })) || [];

  return (
    <Paper withBorder p="lg">
      <Stack gap="md">
        <Select
          label={t("class.academicYear")}
          placeholder={t("scholarship.selectAcademicYear")}
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
          placeholder={t("scholarship.selectClass")}
          data={classOptions}
          value={classAcademicId}
          onChange={setClassAcademicId}
          disabled={!academicYearId || loadingClasses}
          searchable
          required
        />

        <Select
          label={t("scholarship.student")}
          placeholder={t("scholarship.selectStudent")}
          data={studentOptions}
          value={studentNis}
          onChange={setStudentNis}
          disabled={loadingStudents}
          searchable
          required
        />

        <Select
          label={t("scholarship.scholarshipType")}
          placeholder={t("scholarship.selectType")}
          data={SCHOLARSHIP_TYPES}
          value={scholarshipName}
          onChange={setScholarshipName}
          searchable
          required
        />

        {/* Tuition Fee Reference Card */}
        {classAcademicId && (
          <Card withBorder bg="gray.0">
            <Group gap="xs" mb="xs">
              <IconInfoCircle size={18} color="var(--mantine-color-blue-6)" />
              <Text size="sm" fw={600}>
                {t("scholarship.tuitionReference")}
              </Text>
            </Group>
            {classTuitionFee ? (
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    {t("scholarship.monthlyTuitionFee")}
                  </Text>
                  <Text size="sm" fw={600}>
                    <NumberFormatter
                      value={classTuitionFee}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {t("scholarship.nominalHint")}
                </Text>
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                {t("scholarship.noTuitions")}
              </Text>
            )}
          </Card>
        )}

        <NumberInput
          label={t("scholarship.nominal")}
          placeholder={t("scholarship.nominalPlaceholder")}
          description={
            classTuitionFee
              ? t("scholarship.maxNominal", {
                  amount: classTuitionFee.toLocaleString("id-ID"),
                })
              : undefined
          }
          value={nominal}
          onChange={setNominal}
          min={0}
          max={classTuitionFee || undefined}
          prefix="Rp "
          thousandSeparator="."
          decimalSeparator=","
          required
        />

        {classTuitionFee && Number(nominal) > 0 && (
          <Alert
            icon={
              Number(nominal) >= classTuitionFee ? (
                <IconGift size={18} />
              ) : (
                <IconInfoCircle size={18} />
              )
            }
            color={Number(nominal) >= classTuitionFee ? "green" : "blue"}
            variant="light"
          >
            <Text size="sm">
              {Number(nominal) >= classTuitionFee ? (
                <>
                  <strong>{t("scholarship.fullScholarshipLabel")}</strong>{" "}
                  {t("scholarship.fullScholarshipDesc")}
                </>
              ) : (
                <>
                  <strong>{t("scholarship.partialScholarshipLabel")}</strong>{" "}
                  {t("scholarship.partialScholarshipDesc", {
                    amount: `Rp ${(classTuitionFee - Number(nominal)).toLocaleString("id-ID")}`,
                  })}
                </>
              )}
            </Text>
          </Alert>
        )}

        {!classTuitionFee && (
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="yellow"
            variant="light"
          >
            <Text size="sm">{t("scholarship.selectClassHint")}</Text>
          </Alert>
        )}

        <Group>
          <Button
            leftSection={<IconGift size={18} />}
            onClick={handleSubmit}
            loading={createScholarship.isPending}
            disabled={!studentNis || !classAcademicId || !nominal}
          >
            {t("scholarship.createButton")}
          </Button>
          <Button variant="light" onClick={() => router.push("/scholarships")}>
            {t("scholarship.viewList")}
          </Button>
        </Group>

        {result && (
          <Alert
            icon={<IconCheck size={18} />}
            color="green"
            title={t("scholarship.createdTitle")}
          >
            <Stack gap="xs">
              <Group gap="md">
                <Badge
                  color={
                    result.scholarship.isFullScholarship ? "green" : "blue"
                  }
                  size="lg"
                >
                  {result.scholarship.isFullScholarship
                    ? t("scholarship.full")
                    : t("scholarship.partial")}{" "}
                  {t("scholarship.title")}
                </Badge>
              </Group>
              {result.applicationResult && (
                <Text size="sm">
                  {t("scholarship.autoPaid", {
                    count: result.applicationResult.tuitionsAffected,
                  })}
                </Text>
              )}
            </Stack>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
