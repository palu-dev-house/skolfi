import * as XLSX from "xlsx";

export interface TuitionExcelRow {
  Class: string;
  "Fee Amount": number | string;
}

export function createTuitionTemplate(
  classes: Array<{ id: string; className: string }>,
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  const headers = ["Class", "Fee Amount"];
  const wsData: (string | number)[][] = [headers];

  if (classes.length > 0) {
    wsData.push([classes[0].className, 500000]);
  }

  for (let i = 0; i < 99; i++) wsData.push(["", ""]);

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  worksheet["!cols"] = [{ wch: 30 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Tuitions");

  // Reference sheet: classes
  const refData: string[][] = [["Class"]];
  for (const c of classes) {
    refData.push([c.className]);
  }
  const refSheet = XLSX.utils.aoa_to_sheet(refData);
  refSheet["!cols"] = [{ wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, refSheet, "Classes (Ref)");

  return workbook;
}

interface ValidatedTuitionRow {
  classAcademicId: string;
  className: string;
  feeAmount: number;
}

interface ValidationError {
  row: number;
  errors: string[];
}

export function validateTuitionData(
  data: TuitionExcelRow[],
  classMap: Map<string, string>,
): { valid: ValidatedTuitionRow[]; errors: ValidationError[] } {
  const valid: ValidatedTuitionRow[] = [];
  const errors: ValidationError[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowErrors: string[] = [];
    const rowNum = i + 2; // header is row 1

    const className = String(row.Class || "").trim();
    if (!className) {
      rowErrors.push("Class is required");
    }

    const feeAmount = Number(row["Fee Amount"]);
    if (!feeAmount || feeAmount <= 0) {
      rowErrors.push("Fee Amount must be greater than 0");
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, errors: rowErrors });
      continue;
    }

    const classAcademicId = classMap.get(className);
    if (!classAcademicId) {
      errors.push({ row: rowNum, errors: [`Class "${className}" not found`] });
      continue;
    }

    valid.push({ classAcademicId, className, feeAmount });
  }

  return { valid, errors };
}
