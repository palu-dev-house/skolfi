import type { ReactElement } from "react";
import PaymentForm from "@/components/forms/PaymentForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const NewPaymentPage: NextPageWithLayout = function NewPaymentPage() {
  return (
    <>
      <PageHeader
        title="Process Payment"
        description="Record a tuition payment for a student"
      />
      <PaymentForm />
    </>
  );
};
NewPaymentPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default NewPaymentPage;
