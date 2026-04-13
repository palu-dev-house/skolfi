"use client";

import "./print.css";
import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconFilter,
  IconPrinter,
  IconReceipt,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import {
  usePrintPayments,
  type PrintPayment,
} from "@/hooks/api/usePrintPayments";

function formatRp(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `Rp ${num.toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
}

function InvoiceSlot({ payment }: { payment: PrintPayment }) {
  const t = useTranslations();
  const tu = payment.tuition;
  const fee = parseFloat(tu.feeAmount);
  const scholarship = parseFloat(tu.scholarshipAmount);
  const discount = parseFloat(tu.discountAmount);
  const effectiveFee = fee - scholarship - discount;
  const paidAmount = parseFloat(payment.amount);

  return (
    <div className="invoice-slot">
      {tu.status === "PAID" && (
        <div className="inv-stamp">{t("invoice.paid")}</div>
      )}

      {/* Header */}
      <div className="inv-header">
        <div>
          <div className="inv-school">{t("invoice.schoolName")}</div>
          <div className="inv-school-sub">{t("invoice.schoolAddress")}</div>
        </div>
        <div className="inv-receipt-label">
          <div className="label">{t("invoice.receipt")}</div>
          <div className="receipt-no">
            {payment.id.slice(0, 8).toUpperCase()}
          </div>
          <div className="receipt-date">
            {dayjs(payment.paymentDate).format("DD/MM/YYYY HH:mm")}
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div className="inv-student-row">
        <div className="inv-field">
          <span className="inv-field-label">{t("invoice.studentName")}</span>
          <span className="inv-field-value">{tu.student.name}</span>
        </div>
        <div className="inv-field">
          <span className="inv-field-label">{t("invoice.class")}</span>
          <span className="inv-field-value">{tu.classAcademic.className}</span>
        </div>
        <div className="inv-field">
          <span className="inv-field-label">{t("invoice.nis")}</span>
          <span className="inv-field-value">{tu.student.nis}</span>
        </div>
        <div className="inv-field">
          <span className="inv-field-label">{t("invoice.academicYear")}</span>
          <span className="inv-field-value">
            {tu.classAcademic.academicYear.year}
          </span>
        </div>
      </div>

      {/* Detail Table */}
      <table className="inv-table">
        <thead>
          <tr>
            <th style={{ width: "35%" }}>{t("invoice.description")}</th>
            <th style={{ width: "22%" }} className="num">
              {t("invoice.amount")}
            </th>
            <th style={{ width: "22%" }} className="num">
              {t("invoice.deduction")}
            </th>
            <th style={{ width: "21%" }} className="num">
              {t("invoice.total")}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {t("invoice.tuitionFee")} - {tu.period} {tu.year}
            </td>
            <td className="num">{formatRp(fee)}</td>
            <td className="num">
              {scholarship + discount > 0
                ? formatRp(scholarship + discount)
                : "-"}
            </td>
            <td className="num">{formatRp(effectiveFee)}</td>
          </tr>
          <tr className="total-row">
            <td colSpan={2}>{t("invoice.paymentReceived")}</td>
            <td className="num" colSpan={2}>
              {formatRp(paidAmount)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="inv-footer">
        <div className="inv-footer-left">
          {payment.notes && (
            <div>
              {t("invoice.notes")}: {payment.notes}
            </div>
          )}
          <div>{t("invoice.thankYou")}</div>
        </div>
        <div className="inv-footer-right">
          <div className="inv-signature-line" />
          <div className="inv-signature-name">
            {payment.employee?.name || t("invoice.admin")}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintInvoicePage() {
  const t = useTranslations();
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [mode, setMode] = useState<"today" | "all">("today");

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);
  const effectiveYearId = academicYearId || activeYear?.id;

  const { data: payments, isLoading } = usePrintPayments({
    academicYearId: effectiveYearId,
    mode,
    enabled: !!effectiveYearId,
  });

  const academicYearOptions =
    academicYearsData?.academicYears.map((ay) => ({
      value: ay.id,
      label: `${ay.year}${ay.isActive ? ` (${t("common.active")})` : ""}`,
    })) || [];

  // Chunk payments into groups of 3 (3 per A4 page)
  const pages: PrintPayment[][] = [];
  if (payments) {
    for (let i = 0; i < payments.length; i += 3) {
      pages.push(payments.slice(i, i + 3));
    }
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Controls - hidden on print */}
      <div className="print-controls">
        <PageHeader
          title={t("invoice.printTitle")}
          description={t("invoice.printDescription")}
        />

        <Card withBorder mb="md">
          <Group gap="md" align="flex-end">
            <Select
              label={t("invoice.academicYear")}
              placeholder={t("invoice.selectYear")}
              leftSection={<IconFilter size={16} />}
              data={academicYearOptions}
              value={academicYearId}
              onChange={setAcademicYearId}
              clearable
              w={250}
            />
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                {t("invoice.printMode")}
              </Text>
              <SegmentedControl
                data={[
                  { value: "today", label: t("invoice.today") },
                  { value: "all", label: t("invoice.allPaid") },
                ]}
                value={mode}
                onChange={(v) => setMode(v as "today" | "all")}
              />
            </Stack>
            <Button
              leftSection={<IconPrinter size={18} />}
              onClick={handlePrint}
              disabled={!payments || payments.length === 0}
            >
              {t("invoice.print")} ({payments?.length || 0})
            </Button>
          </Group>
        </Card>

        {isLoading && (
          <Stack align="center" py="xl">
            <Loader />
          </Stack>
        )}

        {!isLoading && payments && payments.length === 0 && (
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="gray"
            variant="light"
          >
            {mode === "today"
              ? t("invoice.noPaymentsToday")
              : t("invoice.noPayments")}
          </Alert>
        )}
      </div>

      {/* Print Area */}
      {payments && payments.length > 0 && (
        <div className="print-area">
          {pages.map((pagePayments, pageIdx) => (
            <div className="print-page" key={pageIdx}>
              {pagePayments.map((payment) => (
                <InvoiceSlot key={payment.id} payment={payment} />
              ))}
              {/* Fill empty slots so page height is always 297mm */}
              {Array.from({ length: 3 - pagePayments.length }).map((_, i) => (
                <div
                  className="invoice-slot"
                  key={`empty-${i}`}
                  style={{ opacity: 0 }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Screen-only: summary count */}
      {payments && payments.length > 0 && (
        <div className="print-controls">
          <Group justify="center" py="md">
            <IconReceipt size={16} color="gray" />
            <Text size="sm" c="dimmed">
              {t("invoice.totalInvoices", { count: payments.length })} &middot;{" "}
              {t("invoice.totalPages", { count: pages.length })}
            </Text>
          </Group>
        </div>
      )}
    </>
  );
}
