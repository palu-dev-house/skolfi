"use client";

import {
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Paper,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconDownload,
  IconUpload,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import {
  useDownloadStudentClassTemplate,
  useImportStudentClasses,
} from "@/hooks/api/useStudentClasses";

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: Array<{ row: number; nis: string; error: string }>;
}

export default function ImportStudentClassesPage() {
  const t = useTranslations();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const importMutation = useImportStudentClasses();
  const { downloadTemplate } = useDownloadStudentClassTemplate();

  const handleImport = async () => {
    if (!file) return;

    try {
      const response = await importMutation.mutateAsync(file);
      setResult(response.data);
      const result = response.data;
      if (result.errors.length > 0) {
        notifications.show({
          title: t("class.importCompleteWithErrors"),
          message: t("class.importCompleteWithErrorsMessage", {
            imported: result.imported,
            skipped: result.skipped,
            errors: result.errors.length,
          }),
          color: "yellow",
        });
      } else {
        notifications.show({
          title: t("common.success"),
          message: t("class.importSuccessMessage", {
            imported: result.imported,
            skipped: result.skipped,
          }),
          color: "green",
        });
      }
    } catch (error) {
      notifications.show({
        title: t("class.importFailedError"),
        message: error instanceof Error ? error.message : String(error),
        color: "red",
      });
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(academicYearId || activeYear?.id);
  };

  const yearOptions =
    academicYearsData?.academicYears.map((ay) => ({
      value: ay.id,
      label:
        ay.year +
        (ay.isActive ? ` (${t("academicYear.statuses.active")})` : ""),
    })) || [];

  return (
    <>
      <PageHeader
        title={t("class.importAssignmentsTitle")}
        description={t("class.importAssignmentsDescription")}
        actions={
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => router.push("/admin/classes")}
          >
            {t("class.backToClasses")}
          </Button>
        }
      />

      <Stack gap="md">
        <Paper withBorder p="md">
          <Stack gap="md">
            <Text fw={600}>{t("class.downloadTemplateStep")}</Text>
            <Text size="sm" c="dimmed">
              {t("class.downloadTemplateDesc")}
            </Text>
            <Group>
              <Select
                placeholder={t("class.selectAcademicYearForClasses")}
                data={yearOptions}
                value={academicYearId}
                onChange={setAcademicYearId}
                clearable
                w={250}
              />
              <Button
                variant="light"
                leftSection={<IconDownload size={18} />}
                onClick={handleDownloadTemplate}
              >
                {t("class.downloadTemplate")}
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder p="md">
          <Stack gap="md">
            <Text fw={600}>{t("class.uploadStep")}</Text>
            <Text size="sm" c="dimmed">
              {t("class.uploadStepDesc")}
            </Text>
            <Group>
              <FileInput
                placeholder={t("class.selectExcelFile")}
                accept=".xlsx,.xls"
                value={file}
                onChange={setFile}
                w={300}
              />
              <Button
                leftSection={<IconUpload size={18} />}
                onClick={handleImport}
                loading={importMutation.isPending}
                disabled={!file}
              >
                {t("common.import")}
              </Button>
            </Group>
          </Stack>
        </Paper>

        {result && (
          <Paper withBorder p="md">
            <Stack gap="md">
              <Text fw={600}>{t("class.importResults")}</Text>

              <Group gap="xl">
                <Group gap="xs">
                  <Badge
                    color="green"
                    size="lg"
                    leftSection={<IconCheck size={14} />}
                  >
                    {
                      t("student.importedCount", {
                        count: result.imported,
                        updated: 0,
                      }).split(",")[0]
                    }
                    : {result.imported}
                  </Badge>
                </Group>
                <Group gap="xs">
                  <Badge color="yellow" size="lg">
                    {t("common.filter")}: {result.skipped}
                  </Badge>
                </Group>
                <Group gap="xs">
                  <Badge color="red" size="lg">
                    {t("common.error")}: {result.errors.length}
                  </Badge>
                </Group>
              </Group>

              {result.errors.length > 0 && (
                <>
                  <Alert
                    icon={<IconAlertCircle size={18} />}
                    title={t("class.importErrors")}
                    color="red"
                  >
                    {t("class.importErrorsDetail")}
                  </Alert>

                  <Table striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t("common.actions")}</Table.Th>
                        <Table.Th>{t("student.nis")}</Table.Th>
                        <Table.Th>{t("common.error")}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {result.errors.slice(0, 50).map((err, i) => (
                        <Table.Tr key={`error-${i}`}>
                          <Table.Td>{err.row || "-"}</Table.Td>
                          <Table.Td>{err.nis || "-"}</Table.Td>
                          <Table.Td>
                            <Text size="sm" c="red">
                              {err.error}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  {result.errors.length > 50 && (
                    <Text size="sm" c="dimmed">
                      {t("class.showingErrors", {
                        count: result.errors.length,
                      })}
                    </Text>
                  )}
                </>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </>
  );
}
