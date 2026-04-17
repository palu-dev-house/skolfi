import {
  Alert,
  Badge,
  Button,
  Collapse,
  FileInput,
  Group,
  List,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconDownload,
  IconFileUpload,
  IconPlus,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import TuitionTable from "@/components/tables/TuitionTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useImportTuitions } from "@/hooks/api/useTuitions";
import type { NextPageWithLayout } from "@/lib/page-types";

interface ImportResult {
  generated: number;
  skipped: number;
  errors: Array<{ row: number; error?: string; errors?: string[] }>;
}

const TuitionsPage: NextPageWithLayout = function TuitionsPage() {
  const router = useRouter();
  const t = useTranslations();
  const [importOpened, { toggle: toggleImport }] = useDisclosure(false);
  const [file, setFile] = useState<File | null>(null);
  const importTuitions = useImportTuitions();
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleDownloadTemplate = () => {
    window.open("/api/v1/tuitions/template", "_blank");
  };

  const handleImport = () => {
    if (!file) return;
    importTuitions.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
        notifications.show({
          title: t("common.success"),
          message: t("import.completeMessage", {
            imported: data.generated,
            skipped: data.skipped,
          }),
          color: "green",
        });
        setFile(null);
      },
      onError: (error) => {
        notifications.show({
          title: t("common.error"),
          message: error.message,
          color: "red",
        });
      },
    });
  };

  return (
    <>
      <PageHeader
        title={t("tuition.list")}
        description={t("tuition.description")}
        actions={
          <Group gap="xs">
            <Button
              leftSection={<IconFileUpload size={18} />}
              variant="light"
              onClick={toggleImport}
            >
              {t("common.import")}
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => router.push("/admin/tuitions/generate")}
            >
              {t("tuition.generate")}
            </Button>
          </Group>
        }
      />

      <Collapse in={importOpened} mb="md">
        <Paper withBorder p="lg">
          <Stack gap="md">
            <Alert
              icon={<IconAlertCircle size={18} />}
              color="blue"
              variant="light"
            >
              <Text size="sm" fw={500} mb="xs">
                {t("import.instructions")}
              </Text>
              <List size="sm">
                <List.Item>{t("tuition.importStep1")}</List.Item>
                <List.Item>{t("tuition.importStep2")}</List.Item>
                <List.Item>{t("tuition.importStep3")}</List.Item>
              </List>
            </Alert>

            <Group gap="md">
              <Button
                leftSection={<IconDownload size={18} />}
                variant="light"
                onClick={handleDownloadTemplate}
              >
                {t("import.downloadTemplate")}
              </Button>
            </Group>

            <FileInput
              label={t("import.uploadFile")}
              placeholder={t("import.chooseFile")}
              accept=".xlsx,.xls"
              value={file}
              onChange={setFile}
              leftSection={<IconFileUpload size={18} />}
            />

            <Button
              onClick={handleImport}
              disabled={!file}
              loading={importTuitions.isPending}
            >
              {t("import.process")}
            </Button>

            {result && (
              <>
                <Alert icon={<IconCheck size={18} />} color="green">
                  <Group gap="md">
                    <Badge color="green" size="lg">
                      {t("tuition.generatedCount", {
                        count: result.generated,
                      })}
                    </Badge>
                    <Badge color="gray" size="lg">
                      {t("tuition.skippedCount", { count: result.skipped })}
                    </Badge>
                  </Group>
                </Alert>

                {result.errors.length > 0 && (
                  <Alert icon={<IconAlertCircle size={18} />} color="red">
                    <Stack gap="xs">
                      <Text size="sm" fw={600}>
                        {t("import.rowErrors", {
                          count: result.errors.length,
                        })}
                      </Text>
                      {result.errors.slice(0, 5).map((err, index) => (
                        <Text key={index} size="sm">
                          Row {err.row}:{" "}
                          {err.error || err.errors?.join(", ") || "Unknown"}
                        </Text>
                      ))}
                      {result.errors.length > 5 && (
                        <Text size="sm" c="dimmed">
                          ...{" "}
                          {t("import.andMore", {
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
      </Collapse>

      <TuitionTable />
    </>
  );
};
TuitionsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default TuitionsPage;
