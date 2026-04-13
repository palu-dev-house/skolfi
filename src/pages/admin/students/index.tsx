import { Button, Group } from "@mantine/core";
import { IconFileUpload, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import StudentTable from "@/components/tables/StudentTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import type { NextPageWithLayout } from "@/lib/page-types";

const StudentsPage: NextPageWithLayout = function StudentsPage() {
  const router = useRouter();
  const { canCreate } = usePermissions();
  const t = useTranslations();

  return (
    <>
      <PageHeader
        title={t("student.list")}
        description={t("student.title")}
        actions={
          canCreate ? (
            <Group>
              <Button
                leftSection={<IconFileUpload size={18} />}
                variant="light"
                onClick={() => router.push("/admin/students/import")}
              >
                {t("student.import")}
              </Button>
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => router.push("/admin/students/new")}
              >
                {t("student.add")}
              </Button>
            </Group>
          ) : undefined
        }
      />
      <StudentTable />
    </>
  );
};
StudentsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default StudentsPage;
