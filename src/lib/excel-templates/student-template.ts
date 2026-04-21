import ExcelJS from "exceljs";
import { applyListValidation, inlineListFormula } from "../exceljs-utils";

const SCHOOL_LEVELS = ["TK", "SD", "SMP", "SMA"];
const LAST_ROW = 1000;

export function createStudentTemplate(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Students");

  const columns: Array<{ header: string; width: number }> = [
    { header: "NIS", width: 15 },
    { header: "School Level", width: 15 },
    { header: "Student Name", width: 25 },
    { header: "Address", width: 40 },
    { header: "Parent Name", width: 25 },
    { header: "Parent Phone", width: 15 },
    { header: "Start Join Date", width: 15 },
  ];

  sheet.addRow(columns.map((c) => c.header));
  sheet.columns.forEach((col, i) => {
    col.width = columns[i].width;
  });

  // Sample row
  sheet.addRow([
    "2024001",
    "SD",
    "Ahmad Rizki",
    "Jl. Merdeka No. 123",
    "Budi Santoso",
    "081234567890",
    "2024-07-01",
  ]);

  // Dropdown on School Level (column B) for rows 2..LAST_ROW
  applyListValidation(
    sheet,
    "B",
    2,
    LAST_ROW,
    [inlineListFormula(SCHOOL_LEVELS)],
    {
      promptTitle: "School Level",
      prompt: "Pick TK, SD, SMP or SMA.",
    },
  );

  return workbook;
}
