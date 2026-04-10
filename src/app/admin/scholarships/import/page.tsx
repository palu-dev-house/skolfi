"use client";

import {
  Alert,
  Badge,
  Button,
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
import { useImportScholarships } from "@/hooks/api/useScholarships";

interface ImportResult {
  imported: number;
  skipped: number;
  autoPayments: number;
  errors: Array<{ row: number; error?: string; errors?: string[] }>;
}

export default function ImportScholarshipsPage() {
  const t = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const importScholarships = useImportScholarships();
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleDownloadTemplate = () => {
    window.open("/api/v1/scholarships/template", "_blank");
  };

  const handleImport = () => {
    if (!file) return;

    importScholarships.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
        notifications.show({
          title: t("scholarship.importComplete"),
          message: t("scholarship.importCompleteMessage", {
            imported: data.imported,
            autoPayments: data.autoPayments,
          }),
          color: "green",
        });
        setFile(null);
      },
      onError: (error) => {
        notifications.show({
          title: t("scholarship.importFailed"),
          message: error.message,
          color: "red",
        });
      },
    });
  };

  return (
    <>
      <PageHeader
        title={t("scholarship.importTitle")}
        description={t("scholarship.importPageDescription")}
      />
      <Paper withBorder p="lg">
        <Stack gap="md">
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="blue"
            variant="light"
          >
            <Text size="sm" fw={500} mb="xs">
              {t("scholarship.instructions")}
            </Text>
            <List size="sm">
              <List.Item>
                Download the Excel template which includes reference sheets for
                students and classes
              </List.Item>
              <List.Item>
                Fill in Student NIS, Class name (must match exactly), and
                Nominal amount
              </List.Item>
              <List.Item>
                Full scholarships (nominal &gt;= monthly fee) will automatically
                mark unpaid tuitions as paid
              </List.Item>
              <List.Item>
                Existing scholarships for the same student-class combination
                will be skipped
              </List.Item>
            </List>
          </Alert>

          <Button
            leftSection={<IconDownload size={18} />}
            variant="light"
            onClick={handleDownloadTemplate}
          >
            {t("scholarship.downloadExcelTemplate")}
          </Button>

          <FileInput
            label={t("scholarship.uploadExcelFile")}
            placeholder={t("scholarship.chooseFile")}
            accept=".xlsx,.xls"
            value={file}
            onChange={setFile}
            leftSection={<IconFileUpload size={18} />}
          />

          <Button
            onClick={handleImport}
            disabled={!file}
            loading={importScholarships.isPending}
          >
            {t("scholarship.processImport")}
          </Button>

          {result && (
            <>
              <Alert icon={<IconCheck size={18} />} color="green">
                <Stack gap="xs">
                  <Group gap="md">
                    <Badge color="green" size="lg">
                      {t("scholarship.importComplete")}: {result.imported}
                    </Badge>
                    <Badge color="gray" size="lg">
                      {result.skipped}
                    </Badge>
                    <Badge color="blue" size="lg">
                      {t("scholarship.autoPaid", {
                        count: result.autoPayments,
                      })}
                    </Badge>
                  </Group>
                </Stack>
              </Alert>

              {result.errors.length > 0 && (
                <Alert icon={<IconAlertCircle size={18} />} color="red">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      {t("scholarship.rowErrors", {
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
                        {t("scholarship.andMoreErrors", {
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
