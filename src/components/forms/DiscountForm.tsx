"use client";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  MultiSelect,
  NumberFormatter,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconInfoCircle, IconPercentage } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import {
  useCreateDiscount,
  useDiscount,
  useUpdateDiscount,
} from "@/hooks/api/useDiscounts";
import {
  getPeriodDisplayName,
  PERIODS,
} from "@/lib/business-logic/tuition-generator";

interface DiscountFormProps {
  discountId?: string;
}

export default function DiscountForm({ discountId }: DiscountFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const isEdit = !!discountId;

  const REASON_PRESETS = [
    { value: "COVID Relief", label: t("discount.reasons.COVIDRelief") },
    {
      value: "School Anniversary",
      label: t("discount.reasons.SchoolAnniversary"),
    },
    { value: "Economic Support", label: t("discount.reasons.EconomicSupport") },
    { value: "Early Payment", label: t("discount.reasons.EarlyPayment") },
    { value: "Sibling Discount", label: t("discount.reasons.SiblingDiscount") },
    { value: "Other", label: t("discount.reasons.Other") },
  ];

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number | string>(100000);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [classAcademicId, setClassAcademicId] = useState<string | null>(null);
  const [isSchoolWide, setIsSchoolWide] = useState(true);
  const [targetPeriods, setTargetPeriods] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Queries
  const { data: academicYearsData, isLoading: loadingYears } = useAcademicYears(
    {
      limit: 100,
    },
  );
  const { data: classesData, isLoading: loadingClasses } = useClassAcademics({
    limit: 100,
    academicYearId: academicYearId || undefined,
  });
  const { data: discountData } = useDiscount(discountId || "");

  // Mutations
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();

  // Load existing discount data
  useEffect(() => {
    if (discountData?.discount) {
      const d = discountData.discount;
      setName(d.name);
      setDescription(d.description || "");
      setReason(d.reason);
      setDiscountAmount(Number(d.discountAmount));
      setAcademicYearId(d.academicYearId);
      setClassAcademicId(d.classAcademicId);
      setIsSchoolWide(!d.classAcademicId);
      setTargetPeriods(d.targetPeriods);
      setIsActive(d.isActive);
    }
  }, [discountData]);

  // Auto-select active academic year
  useEffect(() => {
    if (!academicYearId && academicYearsData?.academicYears) {
      const activeYear = academicYearsData.academicYears.find(
        (ay) => ay.isActive,
      );
      if (activeYear) {
        setAcademicYearId(activeYear.id);
      }
    }
  }, [academicYearsData, academicYearId]);

  const handleSubmit = () => {
    if (!name.trim()) {
      notifications.show({
        title: t("common.validationError"),
        message: t("discount.validationNameRequired"),
        color: "red",
      });
      return;
    }

    if (!discountAmount || Number(discountAmount) <= 0) {
      notifications.show({
        title: t("common.validationError"),
        message: t("discount.validationAmountRequired"),
        color: "red",
      });
      return;
    }

    if (!academicYearId) {
      notifications.show({
        title: t("common.validationError"),
        message: t("discount.validationYearRequired"),
        color: "red",
      });
      return;
    }

    if (targetPeriods.length === 0) {
      notifications.show({
        title: t("common.validationError"),
        message: t("discount.validationPeriodsRequired"),
        color: "red",
      });
      return;
    }

    if (isEdit && discountId) {
      updateDiscount.mutate(
        {
          id: discountId,
          updates: {
            name,
            description: description || null,
            reason,
            discountAmount: Number(discountAmount),
            targetPeriods,
            isActive,
          },
        },
        {
          onSuccess: () => {
            notifications.show({
              title: t("common.success"),
              message: t("discount.updateSuccess"),
              color: "green",
            });
            router.push("/discounts");
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
    } else {
      createDiscount.mutate(
        {
          name,
          description: description || undefined,
          reason: reason || undefined,
          discountAmount: Number(discountAmount),
          targetPeriods,
          academicYearId,
          classAcademicId: isSchoolWide ? null : classAcademicId,
        },
        {
          onSuccess: () => {
            notifications.show({
              title: t("common.success"),
              message: t("discount.createSuccess"),
              color: "green",
            });
            router.push("/discounts");
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
    }
  };

  // Build period options
  const periodOptions = [
    {
      group: t("tuition.monthly"),
      items: PERIODS.MONTHLY.map((p) => ({
        value: p,
        label: getPeriodDisplayName(p),
      })),
    },
    {
      group: t("tuition.quarterly"),
      items: PERIODS.QUARTERLY.map((p) => ({
        value: p,
        label: getPeriodDisplayName(p),
      })),
    },
    {
      group: t("tuition.semester"),
      items: PERIODS.SEMESTER.map((p) => ({
        value: p,
        label: getPeriodDisplayName(p),
      })),
    },
  ];

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

  const isPending = createDiscount.isPending || updateDiscount.isPending;

  return (
    <Paper withBorder p="lg">
      <Stack gap="md">
        <TextInput
          label={t("discount.name")}
          placeholder={t("discount.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />

        <Textarea
          label={t("common.description")}
          placeholder={t("discount.descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          rows={2}
        />

        <Select
          label={t("discount.reason")}
          placeholder={t("discount.reasonPlaceholder")}
          data={REASON_PRESETS}
          value={reason}
          onChange={setReason}
          searchable
          clearable
        />

        <NumberInput
          label={t("discount.amount")}
          description={t("discount.amountDescription")}
          placeholder={t("discount.amountPlaceholder")}
          value={discountAmount}
          onChange={setDiscountAmount}
          min={0}
          prefix="Rp "
          thousandSeparator="."
          decimalSeparator=","
          required
          leftSection={<IconPercentage size={16} />}
        />

        <Divider label={t("discount.scope")} labelPosition="center" />

        <Select
          label={t("class.academicYear")}
          placeholder={t("discount.selectAcademicYear")}
          data={academicYearOptions}
          value={academicYearId}
          onChange={(value) => {
            setAcademicYearId(value);
            setClassAcademicId(null);
          }}
          disabled={loadingYears || isEdit}
          required
        />

        <Checkbox
          label={t("discount.applyAllClasses")}
          checked={isSchoolWide}
          onChange={(e) => {
            setIsSchoolWide(e.currentTarget.checked);
            if (e.currentTarget.checked) {
              setClassAcademicId(null);
            }
          }}
          disabled={isEdit}
        />

        {!isSchoolWide && (
          <Select
            label={t("discount.specificClass")}
            placeholder={t("discount.selectClass")}
            data={classOptions}
            value={classAcademicId}
            onChange={setClassAcademicId}
            disabled={!academicYearId || loadingClasses || isEdit}
            searchable
            required={!isSchoolWide}
          />
        )}

        <Divider label={t("discount.targetPeriods")} labelPosition="center" />

        <MultiSelect
          label={t("discount.targetPeriods")}
          description={t("discount.periodsDescription")}
          placeholder={t("discount.selectPeriods")}
          data={periodOptions}
          value={targetPeriods}
          onChange={setTargetPeriods}
          searchable
          clearable
          required
        />

        {targetPeriods.length > 0 && (
          <Group gap={4}>
            <Text size="sm" c="dimmed">
              {t("discount.selectedLabel")}
            </Text>
            {targetPeriods.map((p) => (
              <Badge key={p} size="sm" variant="light">
                {getPeriodDisplayName(p)}
              </Badge>
            ))}
          </Group>
        )}

        <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
          <Text size="sm">
            {isSchoolWide
              ? t("discount.schoolWideInfo")
              : t("discount.classOnlyInfo")}
          </Text>
          <Text size="sm" mt="xs">
            {t("discount.autoApplyInfo")}
          </Text>
        </Alert>

        {isEdit && (
          <Checkbox
            label={t("discount.activeCheckbox")}
            description={t("discount.inactiveDesc")}
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
          />
        )}

        {discountData?.stats && (
          <Alert
            icon={<IconCheck size={18} />}
            color="green"
            variant="light"
            title={t("discount.usageStats")}
          >
            <Stack gap="xs">
              <Text size="sm">
                {t("discount.appliedToCount", {
                  count: discountData.stats.totalTuitionsApplied,
                })}
              </Text>
              <Text size="sm">
                {t("discount.totalDiscountGiven")}{" "}
                <NumberFormatter
                  value={discountData.stats.totalDiscountApplied}
                  prefix="Rp "
                  thousandSeparator="."
                  decimalSeparator=","
                />
              </Text>
            </Stack>
          </Alert>
        )}

        <Group>
          <Button
            leftSection={<IconPercentage size={18} />}
            onClick={handleSubmit}
            loading={isPending}
            disabled={
              !name ||
              !discountAmount ||
              !academicYearId ||
              targetPeriods.length === 0
            }
          >
            {isEdit ? t("common.update") : t("common.create")}
          </Button>
          <Button variant="light" onClick={() => router.push("/discounts")}>
            {t("common.cancel")}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
