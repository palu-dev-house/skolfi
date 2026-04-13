import { useRouter } from "next/router";
import type { ReactElement } from "react";
import DiscountForm from "@/components/forms/DiscountForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const EditDiscountPage: NextPageWithLayout = function EditDiscountPage() {
  const { id } = useRouter().query as { id: string };

  return (
    <>
      <PageHeader
        title="Edit Discount"
        description="Update discount settings and status"
      />
      <DiscountForm discountId={id} />
    </>
  );
};
EditDiscountPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default EditDiscountPage;
