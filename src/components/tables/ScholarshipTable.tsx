"use client";

import {
  ActionIcon,
  Badge,
  Group,
  NumberFormatter,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconFilter, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import {
  useDeleteScholarship,
  useScholarships,
} from "@/hooks/api/useScholarships";
import { useQueryParams } from "@/hooks/useQueryParams";

export default function ScholarshipTable() {
  const t = useTranslations();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const classAcademicId = getParam("classAcademicId") ?? null;
  const isFullScholarship = getParam("isFullScholarship") ?? null;

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: activeYear?.id,
  });

  const { data, isLoading } = useScholarships({
    page,
    limit: 10,
    classAcademicId: classAcademicId || undefined,
    isFullScholarship:
      isFullScholarship === null ? undefined : isFullScholarship === "true",
  });

  const deleteScholarship = useDeleteScholarship();

  const handleDelete = (id: string, studentName: string) => {
    modals.openConfirmModal({
      title: t("scholarship.deleteTitle"),
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {t.rich("scholarship.deleteConfirm", {
              name: studentName,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </Text>
          <Text size="sm" c="dimmed">
            {t("scholarship.deleteNote")}
          </Text>
        </Stack>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteScholarship.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("common.deleted"),
              message: t("scholarship.deleteSuccess"),
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
        });
      },
    });
  };

  const classOptions =
    classesData?.classes.map((c) => ({
      value: c.id,
      label: c.className,
    })) || [];

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group gap="md">
          <Select
            placeholder={t("scholarship.filterByClass")}
            leftSection={<IconFilter size={16} />}
            data={classOptions}
            value={classAcademicId}
            onChange={(value) => setParams({ classAcademicId: value, page: 1 })}
            clearable
            searchable
            w={250}
          />
          <Select
            placeholder={t("scholarship.filterByType")}
            data={[
              { value: "true", label: t("scholarship.types.FULL") },
              { value: "false", label: t("scholarship.types.PARTIAL") },
            ]}
            value={isFullScholarship}
            onChange={(value) => setParams({ isFullScholarship: value, page: 1 })}
            clearable
            w={200}
          />
        </Group>
      </Paper>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("scholarship.student")}</Table.Th>
                <Table.Th>{t("scholarship.class")}</Table.Th>
                <Table.Th ta="right" align="right">
                  {t("scholarship.amount")}
                </Table.Th>
                <Table.Th>{t("scholarship.type")}</Table.Th>
                <Table.Th>{t("scholarship.created")}</Table.Th>
                <Table.Th w={80}>{t("common.actions")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={`skeleton-${i}`}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.scholarships.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("scholarship.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.scholarships.map((scholarship) => (
                <Table.Tr key={scholarship.id}>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>
                        {scholarship.student?.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {scholarship.studentNis}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {scholarship.classAcademic?.className}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right" align="right">
                    <NumberFormatter
                      value={scholarship.nominal}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={scholarship.isFullScholarship ? "green" : "blue"}
                      variant="light"
                    >
                      {scholarship.isFullScholarship
                        ? t("scholarship.full")
                        : t("scholarship.partial")}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {dayjs(scholarship.createdAt).format("DD/MM/YYYY")}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label={t("common.delete")}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() =>
                            handleDelete(
                              scholarship.id,
                              scholarship.student?.name || "",
                            )
                          }
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {data && data.pagination.totalPages > 1 && (
        <Group justify="center">
          <Pagination
            total={data.pagination.totalPages}
            value={page}
            onChange={(p) => setParams({ page: p })}
          />
        </Group>
      )}
    </Stack>
  );
}
