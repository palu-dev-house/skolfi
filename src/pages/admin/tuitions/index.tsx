import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import TuitionTable from "@/components/tables/TuitionTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const TuitionsPage: NextPageWithLayout = function TuitionsPage() {
  const router = useRouter();
  const t = useTranslations();

  return (
    <>
      <PageHeader
        title={t("tuition.list")}
        description={t("tuition.description")}
        actions={
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => router.push("/admin/tuitions/generate")}
          >
            {t("tuition.generate")}
          </Button>
        }
      />
      <TuitionTable />
    </>
  );
};
TuitionsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default TuitionsPage;
