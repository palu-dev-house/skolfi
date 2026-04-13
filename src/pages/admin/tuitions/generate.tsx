import type { ReactElement } from "react";
import TuitionGeneratorForm from "@/components/forms/TuitionGeneratorForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const GenerateTuitionsPage: NextPageWithLayout =
  function GenerateTuitionsPage() {
    return (
      <>
        <PageHeader
          title="Generate Tuitions"
          description="Generate monthly tuition records for a class"
        />
        <TuitionGeneratorForm />
      </>
    );
  };
GenerateTuitionsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default GenerateTuitionsPage;
