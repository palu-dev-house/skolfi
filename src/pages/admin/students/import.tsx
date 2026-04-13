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
import type { ReactElement } from "react";
import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useImportStudents } from "@/hooks/api/useStudents";
import type { NextPageWithLayout } from "@/lib/page-types";

const ImportStudentsPage: NextPageWithLayout = function ImportStudentsPage() {
  const t = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const importStudents = useImportStudents();
  const [result, setResult] = useState<{
    imported: number;
    updated: number;
    errors: unknown[];
  } | null>(null);

  const handleDownloadTemplate = () => {
    window.open("/api/v1/students/template", "_blank");
  };

  const handleImport = () => {
    if (!file) return;

    importStudents.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
        notifications.show({
          title: t("student.importComplete"),
          message: t("student.importCompleteMessage", {
            imported: data.imported,
            updated: data.updated,
          }),
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
        title={t("student.import")}
        description={t("class.importStudentsDescription")}
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
            loading={importStudents.isPending}
          >
            {t("student.processImport")}
          </Button>

          {result && (
            <>
              {(result.imported > 0 || result.updated > 0) && (
                <Alert icon={<IconCheck size={18} />} color="green">
                  <Group gap="xs">
                    <Text size="sm">
                      {t("class.importStudentsSuccess", {
                        imported: result.imported,
                        updated: result.updated,
                      })}
                    </Text>
                  </Group>
                </Alert>
              )}
              {result.errors.length > 0 && (
                <Alert icon={<IconAlertCircle size={18} />} color="red">
                  <Text size="sm" fw={600}>
                    {t("student.rowErrors", { count: result.errors.length })}
                  </Text>
                </Alert>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </>
  );
};
ImportStudentsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default ImportStudentsPage;
