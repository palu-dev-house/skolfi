"use client";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  FileInput,
  Group,
  List,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconDownload,
  IconFileUpload,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useImportDiscounts } from "@/hooks/api/useDiscounts";

interface ImportResult {
  imported: number;
  skipped: number;
  tuitionsAffected: number;
  errors: Array<{ row: number; error?: string; errors?: string[] }>;
}

export default function ImportDiscountsPage() {
  const t = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const [applyImmediately, setApplyImmediately] = useState(false);
  const importDiscounts = useImportDiscounts();
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleDownloadTemplate = () => {
    window.open("/api/v1/discounts/template", "_blank");
  };

  const handleImport = () => {
    if (!file) return;

    importDiscounts.mutate(
      { file, applyImmediately },
      {
        onSuccess: (data) => {
          setResult(data);
          const affected =
            data.tuitionsAffected > 0
              ? t("discount.importCompleteApplied", {
                  count: data.tuitionsAffected,
                })
              : "";
          notifications.show({
            title: t("discount.importComplete"),
            message: t("discount.importCompleteMessage", {
              imported: data.imported,
              affected,
            }),
            color: "green",
          });
          setFile(null);
        },
        onError: (error) => {
          notifications.show({
            title: t("discount.importFailed"),
            message: error.message,
            color: "red",
          });
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title={t("discount.importTitle")}
        description={t("discount.importPageDescription")}
      />
      <Paper withBorder p="lg">
        <Stack gap="md">
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="blue"
            variant="light"
          >
            <Text size="sm" fw={500} mb="xs">
              {t("discount.instructions")}
            </Text>
            <List size="sm">
              <List.Item>
                Download the Excel template which includes reference sheets for
                periods, academic years, and classes
              </List.Item>
              <List.Item>
                Fill in Name, Discount Amount, Target Periods (comma-separated),
                and Academic Year
              </List.Item>
              <List.Item>
                Target Periods can be monthly (JULY, AUGUST, etc.), quarterly
                (Q1, Q2, Q3, Q4), or semester (SEM1, SEM2)
              </List.Item>
              <List.Item>
                Leave Class empty for school-wide discounts, or specify a class
                name for class-specific discounts
              </List.Item>
              <List.Item>
                Discounts with the same name, academic year, and class will be
                skipped
              </List.Item>
            </List>
          </Alert>

          <Button
            leftSection={<IconDownload size={18} />}
            variant="light"
            onClick={handleDownloadTemplate}
          >
            {t("discount.downloadExcelTemplate")}
          </Button>

          <FileInput
            label={t("discount.uploadExcelFile")}
            placeholder={t("discount.chooseFile")}
            accept=".xlsx,.xls"
            value={file}
            onChange={setFile}
            leftSection={<IconFileUpload size={18} />}
          />

          <Checkbox
            label={t("discount.applyImmediately")}
            description={t("discount.applyImmediatelyDesc")}
            checked={applyImmediately}
            onChange={(e) => setApplyImmediately(e.currentTarget.checked)}
          />

          <Button
            onClick={handleImport}
            disabled={!file}
            loading={importDiscounts.isPending}
          >
            {t("discount.processImport")}
          </Button>

          {result && (
            <>
              <Alert icon={<IconCheck size={18} />} color="green">
                <Stack gap="xs">
                  <Group gap="md">
                    <Badge color="green" size="lg">
                      {t("discount.importComplete")}: {result.imported}
                    </Badge>
                    <Badge color="gray" size="lg">
                      {result.skipped}
                    </Badge>
                    {result.tuitionsAffected > 0 && (
                      <Badge color="blue" size="lg">
                        {t("discount.tuitionsAffected", {
                          count: result.tuitionsAffected,
                        })}
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Alert>

              {result.errors.length > 0 && (
                <Alert icon={<IconAlertCircle size={18} />} color="red">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      {t("discount.rowErrors", {
                        count: result.errors.length,
                      })}
                    </Text>
                    {result.errors.slice(0, 5).map((err, index) => (
                      <Text key={index} size="sm">
                        Row {err.row}:{" "}
                        {err.error || err.errors?.join(", ") || "Unknown error"}
                      </Text>
                    ))}
                    {result.errors.length > 5 && (
                      <Text size="sm" c="dimmed">
                        {t("discount.andMoreErrors", {
                          count: result.errors.length - 5,
                        })}
                      </Text>
                    )}
                  </Stack>
                </Alert>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </>
  );
}
