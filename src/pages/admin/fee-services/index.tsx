"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconEdit,
  IconFilter,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import FeeServiceForm, {
  type FeeServiceFormValues,
} from "@/components/forms/FeeServiceForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import {
  useCreateFeeService,
  useDeleteFeeService,
  useFeeServices,
  useUpdateFeeService,
} from "@/hooks/api/useFeeServices";
import type { NextPageWithLayout } from "@/lib/page-types";

const FeeServicesPage: NextPageWithLayout = function FeeServicesPage() {
  const t = useTranslations();
  const { data: ayData } = useAcademicYears({ limit: 100 });
  const activeYear = ayData?.academicYears.find((ay) => ay.isActive);

  const [page, setPage] = useState(1);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState("");

  const effectiveYearId = academicYearId ?? activeYear?.id;

  const { data, isLoading } = useFeeServices({
    page,
    limit: 10,
    academicYearId: effectiveYearId,
    category: category as "TRANSPORT" | "ACCOMMODATION" | undefined,
    isActive: activeOnly ? true : undefined,
    search: search || undefined,
  });

  const createMutation = useCreateFeeService();
  const updateMutation = useUpdateFeeService();
  const deleteMutation = useDeleteFeeService();

  const [createOpened, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    name: string;
    category: "TRANSPORT" | "ACCOMMODATION";
    academicYearId: string;
    description: string | null;
  } | null>(null);

  const handleCreate = (values: FeeServiceFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        notifications.show({
          color: "green",
          title: t("common.success"),
          message: t("feeService.created"),
        });
        closeCreate();
      },
      onError: (err) =>
        notifications.show({
          color: "red",
          title: t("common.error"),
          message: err.message,
        }),
    });
  };

  const handleUpdate = (values: FeeServiceFormValues) => {
    if (!editTarget) return;
    updateMutation.mutate(
      {
        id: editTarget.id,
        updates: {
          name: values.name,
          description: values.description || undefined,
        },
      },
      {
        onSuccess: () => {
          notifications.show({
            color: "green",
            title: t("common.success"),
            message: t("feeService.updated"),
          });
          setEditTarget(null);
        },
        onError: (err) =>
          notifications.show({
            color: "red",
            title: t("common.error"),
            message: err.message,
          }),
      },
    );
  };

  const confirmDelete = (id: string, name: string) => {
    modals.openConfirmModal({
      title: t("feeService.deleteTitle"),
      children: (
        <Text size="sm">{t("feeService.deleteConfirm", { name })}</Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () =>
        deleteMutation.mutate(id, {
          onSuccess: () =>
            notifications.show({
              color: "green",
              title: t("common.success"),
              message: t("feeService.deleted"),
            }),
          onError: (err) =>
            notifications.show({
              color: "red",
              title: t("common.error"),
              message: err.message,
            }),
        }),
    });
  };

  const yearOptions =
    ayData?.academicYears.map((ay) => ({
      value: ay.id,
      label: `${ay.year}${ay.isActive ? ` (${t("common.active")})` : ""}`,
    })) ?? [];

  return (
    <>
      <PageHeader
        title={t("feeService.title")}
        description={t("feeService.description")}
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
            {t("feeService.create")}
          </Button>
        }
      />

      <Paper withBorder p="md" mb="md">
        <Group gap="md" wrap="wrap">
          <Select
            leftSection={<IconFilter size={16} />}
            placeholder={t("feeService.academicYear")}
            data={yearOptions}
            value={academicYearId}
            onChange={setAcademicYearId}
            clearable
            w={220}
          />
          <Select
            placeholder={t("feeService.category.label")}
            data={[
              { value: "TRANSPORT", label: t("feeService.category.transport") },
              {
                value: "ACCOMMODATION",
                label: t("feeService.category.accommodation"),
              },
            ]}
            value={category}
            onChange={setCategory}
            clearable
            w={200}
          />
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={240}
          />
          <Switch
            label={t("feeService.activeOnly")}
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.currentTarget.checked)}
          />
        </Group>
      </Paper>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("feeService.name")}</Table.Th>
              <Table.Th>{t("feeService.category.label")}</Table.Th>
              <Table.Th>{t("feeService.academicYear")}</Table.Th>
              <Table.Th>{t("common.status")}</Table.Th>
              <Table.Th style={{ width: 120 }}>{t("common.actions")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="md">
                    {t("common.loading")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : !data?.feeServices.length ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="md">
                    {t("common.noData")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              data.feeServices.map((fs) => (
                <Table.Tr key={fs.id}>
                  <Table.Td>
                    <Link
                      href={`/admin/fee-services/${fs.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Text fw={500}>{fs.name}</Text>
                    </Link>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">
                      {t(`feeService.category.${fs.category.toLowerCase()}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{fs.academicYear?.year ?? "-"}</Table.Td>
                  <Table.Td>
                    <Badge color={fs.isActive ? "green" : "gray"}>
                      {fs.isActive ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <Tooltip label={t("common.edit")}>
                        <ActionIcon
                          variant="subtle"
                          onClick={() =>
                            setEditTarget({
                              id: fs.id,
                              name: fs.name,
                              category: fs.category,
                              academicYearId: fs.academicYearId,
                              description: fs.description,
                            })
                          }
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={t("common.delete")}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => confirmDelete(fs.id, fs.name)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
        {data && (
          <Stack p="md">
            <TablePagination
              value={page}
              total={data.pagination.totalPages}
              onChange={setPage}
            />
          </Stack>
        )}
      </Paper>

      <Modal
        opened={createOpened}
        onClose={closeCreate}
        title={t("feeService.create")}
      >
        <FeeServiceForm
          onSubmit={handleCreate}
          onCancel={closeCreate}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal
        opened={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={t("feeService.edit")}
      >
        {editTarget && (
          <FeeServiceForm
            initialValues={{
              name: editTarget.name,
              category: editTarget.category,
              academicYearId: editTarget.academicYearId,
              description: editTarget.description ?? "",
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditTarget(null)}
            isLoading={updateMutation.isPending}
            disableAcademicYear
          />
        )}
      </Modal>
    </>
  );
};
FeeServicesPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default FeeServicesPage;
