import type { ReactElement } from "react";
import ScholarshipForm from "@/components/forms/ScholarshipForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const NewScholarshipPage: NextPageWithLayout = function NewScholarshipPage() {
  return (
    <>
      <PageHeader
        title="Add Scholarship"
        description="Create a new scholarship for a student"
      />
      <ScholarshipForm />
    </>
  );
};
NewScholarshipPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default NewScholarshipPage;
