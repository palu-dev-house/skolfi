import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type ReportPeriod = "daily" | "monthly" | "yearly";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const period = (searchParams.get("period") || "monthly") as ReportPeriod;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }

  // Fetch all payments in range (match existing payments API pattern)
  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
    include: {
      tuition: {
        include: {
          student: { select: { nis: true, name: true } },
          classAcademic: { select: { className: true } },
        },
      },
      feeBill: {
        include: {
          feeService: { select: { id: true, name: true, category: true } },
          student: { select: { nis: true, name: true } },
        },
      },
      serviceFeeBill: {
        include: {
          serviceFee: { select: { id: true, name: true } },
          student: { select: { nis: true, name: true } },
          classAcademic: { select: { className: true } },
        },
      },
      employee: { select: { name: true } },
    },
    orderBy: { paymentDate: "asc" },
  });

  const workbook = XLSX.utils.book_new();

  // === Detail Sheet ===
  const detailData = payments.map((p) => {
    let paymentType = "";
    let studentName = "";
    let studentNis = "";
    let className = "";
    let billPeriod = "";

    if (p.tuition) {
      paymentType = "SPP";
      studentName = p.tuition.student?.name || "";
      studentNis = p.tuition.student?.nis || "";
      className = p.tuition.classAcademic?.className || "";
      billPeriod = `${p.tuition.period} ${p.tuition.year}`;
    } else if (p.feeBill) {
      paymentType =
        p.feeBill.feeService?.category === "TRANSPORT"
          ? "Transport"
          : "Akomodasi";
      studentName = p.feeBill.student?.name || "";
      studentNis = p.feeBill.student?.nis || "";
      className = p.feeBill.feeService?.name || paymentType;
      billPeriod = `${p.feeBill.period} ${p.feeBill.year}`;
    } else if (p.serviceFeeBill) {
      paymentType = "Uang Perlengkapan";
      studentName = p.serviceFeeBill.student?.name || "";
      studentNis = p.serviceFeeBill.student?.nis || "";
      className = p.serviceFeeBill.classAcademic?.className || "";
      billPeriod = `${p.serviceFeeBill.period} ${p.serviceFeeBill.year}`;
    }

    const date = new Date(p.paymentDate);

    return {
      Tanggal: date.toISOString().split("T")[0],
      Waktu: date.toTimeString().split(" ")[0],
      "Jenis Pembayaran": paymentType,
      NIS: studentNis,
      "Nama Siswa": studentName,
      Kelas: className,
      Periode: billPeriod,
      Nominal: Number(p.amount),
      Beasiswa: Number(p.scholarshipAmount),
      Kasir: p.employee?.name || "Online",
      Catatan: p.notes || "",
    };
  });

  const detailSheet = XLSX.utils.json_to_sheet(
    detailData.length > 0
      ? detailData
      : [
          {
            Tanggal: "",
            Waktu: "",
            "Jenis Pembayaran": "",
            NIS: "",
            "Nama Siswa": "",
            Kelas: "",
            Periode: "",
            Nominal: 0,
            Beasiswa: 0,
            Kasir: "",
            Catatan: "",
          },
        ],
  );
  detailSheet["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detail Pembayaran");

  // === Summary Sheet (grouped by period) ===
  const grouped = new Map<
    string,
    {
      spp: number;
      transport: number;
      serviceFee: number;
      total: number;
      count: number;
    }
  >();

  for (const p of payments) {
    const date = new Date(p.paymentDate);
    let key: string;
    if (period === "daily") {
      key = date.toISOString().split("T")[0];
    } else if (period === "monthly") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else {
      key = String(date.getFullYear());
    }

    const existing = grouped.get(key) || {
      spp: 0,
      transport: 0,
      serviceFee: 0,
      total: 0,
      count: 0,
    };
    const amount = Number(p.amount);

    if (p.tuitionId) {
      existing.spp += amount;
    } else if (p.feeBillId) {
      existing.transport += amount;
    } else if (p.serviceFeeBillId) {
      existing.serviceFee += amount;
    }
    existing.total += amount;
    existing.count += 1;
    grouped.set(key, existing);
  }

  const periodLabel =
    period === "daily" ? "Tanggal" : period === "monthly" ? "Bulan" : "Tahun";

  const summaryData = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({
      [periodLabel]: key,
      "Jumlah Transaksi": val.count,
      SPP: val.spp,
      "Transport & Akomodasi": val.transport,
      "Uang Perlengkapan": val.serviceFee,
      "Total Pendapatan": val.total,
    }));

  // Add totals row
  const totalRow = {
    [periodLabel]: "TOTAL",
    "Jumlah Transaksi": payments.length,
    SPP: Array.from(grouped.values()).reduce((s, v) => s + v.spp, 0),
    "Transport & Akomodasi": Array.from(grouped.values()).reduce(
      (s, v) => s + v.transport,
      0,
    ),
    "Uang Perlengkapan": Array.from(grouped.values()).reduce(
      (s, v) => s + v.serviceFee,
      0,
    ),
    "Total Pendapatan": Array.from(grouped.values()).reduce(
      (s, v) => s + v.total,
      0,
    ),
  };

  const summarySheet = XLSX.utils.json_to_sheet(
    summaryData.length > 0 ? [...summaryData, totalRow] : [totalRow],
  );
  summarySheet["!cols"] = [
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");

  // === Info Sheet ===
  const periodName =
    period === "daily"
      ? "Harian"
      : period === "monthly"
        ? "Bulanan"
        : "Tahunan";
  const infoData = [
    {
      Keterangan: "Jenis Laporan",
      Nilai: `Laporan Pendapatan (${periodName})`,
    },
    {
      Keterangan: "Periode",
      Nilai: `${dateFrom || "Semua"} s/d ${dateTo || "Semua"}`,
    },
    { Keterangan: "Total Transaksi", Nilai: payments.length },
    {
      Keterangan: "Total Pendapatan",
      Nilai: payments.reduce((s, p) => s + Number(p.amount), 0),
    },
    { Keterangan: "Tanggal Cetak", Nilai: new Date().toISOString() },
  ];
  const infoSheet = XLSX.utils.json_to_sheet(infoData);
  infoSheet["!cols"] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Info");

  const buffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  const filenamePeriod =
    period === "daily"
      ? "harian"
      : period === "monthly"
        ? "bulanan"
        : "tahunan";
  const filename = `laporan-pendapatan-${filenamePeriod}-${new Date().toISOString().split("T")[0]}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export default createApiHandler({ GET });
