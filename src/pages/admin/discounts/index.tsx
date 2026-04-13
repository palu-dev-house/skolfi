import { Button, Group } from "@mantine/core";
import { IconFileUpload, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import DiscountTable from "@/components/tables/DiscountTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const DiscountsPage: NextPageWithLayout = function DiscountsPage() {
  const router = useRouter();
  const t = useTranslations();

  return (
    <>
      <PageHeader
        title={t("discount.title")}
        description={t("discount.description")}
        actions={
          <Group>
            <Button
              leftSection={<IconFileUpload size={18} />}
              variant="light"
              onClick={() => router.push("/admin/discounts/import")}
            >
              {t("discount.import")}
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => router.push("/admin/discounts/new")}
            >
              {t("discount.add")}
            </Button>
          </Group>
        }
      />
      <DiscountTable />
    </>
  );
};
DiscountsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default DiscountsPage;
