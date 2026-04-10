"use client";

import {
  Alert,
  Button,
  FileInput,
  Group,
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
import { useImportClassAcademics } from "@/hooks/api/useClassAcademics";

export default function ImportClassesPage() {
  const t = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const importClasses = useImportClassAcademics();
  const [result, setResult] = useState<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  const handleDownloadTemplate = () => {
    window.open("/api/v1/class-academics/template", "_blank");
  };

  const handleImport = () => {
    if (!file) return;

    importClasses.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
        notifications.show({
          title: t("student.importComplete"),
          message: t("class.importClassesSuccess", { count: data.imported }),
          color: "green",
        });
        setFile(null);
      },
      onError: (error) => {
        notifications.show({
          title: t("student.importFailed"),
          message: error.message,
          color: "red",
        });
      },
    });
  };

  return (
    <>
      <PageHeader
        title={t("class.importClasses")}
        description={t("class.importClassesDescription")}
      />
      <Paper withBorder p="lg">
        <Stack gap="md">
          <Button
            leftSection={<IconDownload size={18} />}
            variant="light"
            onClick={handleDownloadTemplate}
          >
            {t("student.downloadExcelTemplate")}
          </Button>

          <FileInput
            label={t("student.uploadExcelFile")}
            placeholder={t("student.chooseFile")}
            accept=".xlsx,.xls"
            value={file}
            onChange={setFile}
            leftSection={<IconFileUpload size={18} />}
          />

          <Button
            onClick={handleImport}
            disabled={!file}
            loading={importClasses.isPending}
          >
            {t("student.processImport")}
          </Button>

          {result && (
            <>
              {result.imported > 0 && (
                <Alert icon={<IconCheck size={18} />} color="green">
                  <Group gap="xs">
                    <Text size="sm">
                      {t("class.importClassesSuccess", {
                        count: result.imported,
                      })}
                    </Text>
                  </Group>
                </Alert>
              )}
              {result.errors.length > 0 && (
                <Alert icon={<IconAlertCircle size={18} />} color="red">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      {t("discount.rowErrors", {
                        count: result.errors.length,
                      })}
                    </Text>
                    {result.errors.slice(0, 5).map((err) => (
                      <Text key={err.row} size="sm">
                        Row {err.row}: {err.error}
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
