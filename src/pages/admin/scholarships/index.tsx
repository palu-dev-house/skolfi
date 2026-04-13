import { Button, Group } from "@mantine/core";
import { IconFileUpload, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import ScholarshipTable from "@/components/tables/ScholarshipTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const ScholarshipsPage: NextPageWithLayout = function ScholarshipsPage() {
  const router = useRouter();
  const t = useTranslations();

  return (
    <>
      <PageHeader
        title={t("scholarship.title")}
        description={t("scholarship.description")}
        actions={
          <Group>
            <Button
              leftSection={<IconFileUpload size={18} />}
              variant="light"
              onClick={() => router.push("/admin/scholarships/import")}
            >
              {t("scholarship.import")}
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => router.push("/admin/scholarships/new")}
            >
              {t("scholarship.add")}
            </Button>
          </Group>
        }
      />
      <ScholarshipTable />
    </>
  );
};
ScholarshipsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default ScholarshipsPage;
