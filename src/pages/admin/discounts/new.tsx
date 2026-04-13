import type { ReactElement } from "react";
import DiscountForm from "@/components/forms/DiscountForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const NewDiscountPage: NextPageWithLayout = function NewDiscountPage() {
  return (
    <>
      <PageHeader
        title="Add Discount"
        description="Create a new tuition discount for specific periods"
      />
      <DiscountForm />
    </>
  );
};
NewDiscountPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default NewDiscountPage;
