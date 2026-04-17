import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import {
  useAssignStudentsToClass,
  useRemoveStudentsFromClass,
  useStudentsByClass,
  useUnassignedStudents,
} from "@/hooks/api/useStudentClasses";
import type { NextPageWithLayout } from "@/lib/page-types";

const ClassStudentsPage: NextPageWithLayout = function ClassStudentsPage() {
  const t = useTranslations();
  const router = useRouter();
  const classId = router.query.id as string;

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchUnassigned, setSearchUnassigned] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [opened, { open, close }] = useDisclosure(false);

  const { data, isLoading } = useStudentsByClass(classId);
  const { data: unassignedData, isLoading: loadingUnassigned } =
    useUnassignedStudents({
      classAcademicId: classId,
      search: searchUnassigned || undefined,
      limit: 100,
    });

  const assignStudents = useAssignStudentsToClass();
  const removeStudents = useRemoveStudentsFromClass();

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedStudents(data.students.map((s) => s.nis));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (nis: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents((prev) => [...prev, nis]);
    } else {
      setSelectedStudents((prev) => prev.filter((n) => n !== nis));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedStudents.length === 0) return;

    modals.openConfirmModal({
      title: t("class.removeStudents"),
      children: (
        <Text size="sm">
          {t("class.removeStudentsConfirm", { count: selectedStudents.length })}
        </Text>
      ),
      labels: { confirm: t("class.remove"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        removeStudents.mutate(
          { classAcademicId: classId, studentIdList: selectedStudents },
          {
            onSuccess: () => {
              setSelectedStudents([]);
              notifications.show({
                title: t("common.success"),
                message: t("class.studentsRemovedSuccess"),
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
      },
    });
  };

  const handleAddStudents = () => {
    if (selectedToAdd.length === 0) {
      notifications.show({
        title: t("class.noStudentsSelected"),
        message: t("class.pleaseSelectStudents"),
        color: "yellow",
      });
      return;
    }

    assignStudents.mutate(
      { classAcademicId: classId, studentIdList: selectedToAdd },
      {
        onSuccess: (data) => {
          setSelectedToAdd([]);
          close();
          if (data.skipped > 0) {
            notifications.show({
              title: t("class.studentsAssigned"),
              message: t("class.studentsAssignedMessage", {
                assigned: data.assigned,
                skipped: data.skipped,
              }),
              color: "yellow",
            });
          } else {
            notifications.show({
              title: t("common.success"),
              message: t("class.studentsAssignedSuccess", {
                assigned: data.assigned,
              }),
              color: "green",
            });
          }
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

  const handleSelectToAdd = (nis: string, checked: boolean) => {
    if (checked) {
      setSelectedToAdd((prev) => [...prev, nis]);
    } else {
      setSelectedToAdd((prev) => prev.filter((n) => n !== nis));
    }
  };

  const handleSelectAllToAdd = (checked: boolean) => {
    if (checked && unassignedData) {
      setSelectedToAdd(unassignedData.students.map((s) => s.nis));
    } else {
      setSelectedToAdd([]);
    }
  };

  return (
    <>
      <PageHeader
        title={
          data
            ? t("class.studentsTitle", { className: data.class.className })
            : t("class.studentsDefaultTitle")
        }
        description={
          data
            ? t("class.studentsDescription", {
                count: data.totalStudents,
                academicYear: data.class.academicYear,
              })
            : t("class.studentsDefaultDescription")
        }
        actions={
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={18} />}
              onClick={() => router.push("/admin/classes")}
            >
              {t("class.backToClasses")}
            </Button>
            <Button leftSection={<IconPlus size={18} />} onClick={open}>
              {t("class.addStudents")}
            </Button>
          </Group>
        }
      />

      {/* Action Bar */}
      {selectedStudents.length > 0 && (
        <Paper withBorder p="sm" mb="md" bg="red.0">
          <Group justify="space-between">
            <Text size="sm">
              {t("class.selectedCount", { count: selectedStudents.length })}
            </Text>
            <Button
              size="sm"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleRemoveSelected}
              loading={removeStudents.isPending}
            >
              {t("class.removeFromClass")}
            </Button>
          </Group>
        </Paper>
      )}

      {/* Students Table */}
      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>
                <Checkbox
                  checked={
                    data &&
                    data.students.length > 0 &&
                    selectedStudents.length === data.students.length
                  }
                  indeterminate={
                    selectedStudents.length > 0 &&
                    data &&
                    selectedStudents.length < data.students.length
                  }
                  onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                />
              </Table.Th>
              <Table.Th>{t("student.nis")}</Table.Th>
              <Table.Th>{t("common.name")}</Table.Th>
              <Table.Th>{t("student.parentName")}</Table.Th>
              <Table.Th>{t("common.phone")}</Table.Th>
              <Table.Th>{t("class.joinDate")}</Table.Th>
              <Table.Th>{t("class.enrolledAt")}</Table.Th>
              <Table.Th w={80}>{t("common.actions")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <Table.Tr key={`skeleton-${i}`}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Table.Td key={`skeleton-cell-${j}`}>
                      <Skeleton height={20} />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            {!isLoading && data?.students.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Stack align="center" gap="md" py="xl">
                    <IconUsers size={48} color="gray" />
                    <Text ta="center" c="dimmed">
                      {t("class.noStudentsYet")}
                      <br />
                      {t("class.clickAddStudents")}
                    </Text>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            )}
            {data?.students.map((student) => (
              <Table.Tr key={student.nis}>
                <Table.Td>
                  <Checkbox
                    checked={selectedStudents.includes(student.nis)}
                    onChange={(e) =>
                      handleSelectStudent(student.nis, e.currentTarget.checked)
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{student.nis}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {student.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{student.parentName}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{student.parentPhone}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {dayjs(student.startJoinDate).format("DD/MM/YYYY")}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {dayjs(student.enrolledAt).format("DD/MM/YYYY")}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Tooltip label={t("class.removeFromClassTooltip")}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        modals.openConfirmModal({
                          title: t("class.removeStudents"),
                          children: (
                            <Text size="sm">
                              {t("class.removeStudentConfirmSingle", {
                                name: student.name,
                              })}
                            </Text>
                          ),
                          labels: {
                            confirm: t("class.remove"),
                            cancel: t("common.cancel"),
                          },
                          confirmProps: { color: "red" },
                          onConfirm: () => {
                            removeStudents.mutate(
                              {
                                classAcademicId: classId,
                                studentIdList: [student.nis],
                              },
                              {
                                onSuccess: () => {
                                  notifications.show({
                                    title: t("common.success"),
                                    message: t("class.studentsRemovedSuccess"),
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
                          },
                        });
                      }}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Add Students Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={t("class.addStudentsToClass")}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            placeholder={t("class.searchStudents")}
            leftSection={<IconSearch size={16} />}
            value={searchUnassigned}
            onChange={(e) => setSearchUnassigned(e.currentTarget.value)}
          />

          <Paper withBorder>
            <ScrollArea h={400}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}>
                      <Checkbox
                        checked={
                          unassignedData &&
                          unassignedData.students.length > 0 &&
                          selectedToAdd.length ===
                            unassignedData.students.length
                        }
                        indeterminate={
                          selectedToAdd.length > 0 &&
                          unassignedData &&
                          selectedToAdd.length < unassignedData.students.length
                        }
                        onChange={(e) =>
                          handleSelectAllToAdd(e.currentTarget.checked)
                        }
                      />
                    </Table.Th>
                    <Table.Th>{t("student.nis")}</Table.Th>
                    <Table.Th>{t("common.name")}</Table.Th>
                    <Table.Th>{t("class.joinDate")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {loadingUnassigned &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <Table.Tr key={`skeleton-${i}`}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <Table.Td key={`skeleton-cell-${j}`}>
                            <Skeleton height={20} />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  {!loadingUnassigned &&
                    unassignedData?.students.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Text ta="center" c="dimmed" py="md">
                            {t("class.noUnassignedStudents")}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  {unassignedData?.students.map((student) => (
                    <Table.Tr key={student.nis}>
                      <Table.Td>
                        <Checkbox
                          checked={selectedToAdd.includes(student.nis)}
                          onChange={(e) =>
                            handleSelectToAdd(
                              student.nis,
                              e.currentTarget.checked,
                            )
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" size="sm">
                          {student.nis}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{student.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {dayjs(student.startJoinDate).format("DD/MM/YYYY")}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>

          {selectedToAdd.length > 0 && (
            <Text size="sm" c="dimmed">
              {t("class.selectedCount", { count: selectedToAdd.length })}
            </Text>
          )}

          <Group justify="flex-end">
            <Button variant="light" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAddStudents}
              loading={assignStudents.isPending}
              disabled={selectedToAdd.length === 0}
            >
              {selectedToAdd.length > 0
                ? t("class.addStudentsCount", { count: selectedToAdd.length })
                : t("class.addStudentsBtn")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
ClassStudentsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default ClassStudentsPage;
