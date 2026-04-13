"use client";

import { Button, Group } from "@mantine/core";
import { IconPlus, IconPrinter } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import PaymentTable from "@/components/tables/PaymentTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";

export default function PaymentsPage() {
  const router = useRouter();
  const t = useTranslations();

  return (
    <>
      <PageHeader
        title={t("payment.title")}
        description={t("payment.description")}
        actions={
          <Group>
            <Button
              variant="light"
              leftSection={<IconPrinter size={18} />}
              onClick={() => router.push("/admin/payments/print")}
            >
              {t("invoice.print")}
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => router.push("/admin/payments/new")}
            >
              {t("payment.newPayment")}
            </Button>
          </Group>
        }
      />
      <PaymentTable />
    </>
  );
}
