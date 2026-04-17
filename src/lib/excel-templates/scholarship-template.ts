import * as XLSX from "xlsx";

export interface ScholarshipExcelRow {
  "Student NIS": string;
  "Student Name": string;
  Class: string;
  Nominal: number;
}

export function createScholarshipTemplate(
  students: Array<{ nis: string; name: string }>,
  classes: Array<{ id: string; className: string }>,
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Create main data sheet
  const headers = ["Student NIS", "Student Name", "Class", "Nominal"];
  const wsData: (string | number)[][] = [headers];

  // Add sample row
  if (students.length > 0 && classes.length > 0) {
    wsData.push([
      students[0].nis,
      students[0].name,
      classes[0].className,
      500000,
    ]);
  }

  // Add empty rows for user input
  for (let i = 0; i < 99; i++) {
    wsData.push(["", "", "", ""]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 15 }, // Student NIS
    { wch: 30 }, // Student Name
    { wch: 25 }, // Class
    { wch: 15 }, // Nominal
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Scholarships");

  // Create reference sheet for students
  const studentData = [["NIS", "Name"]];
  students.forEach((s) => {
    studentData.push([s.nis, s.name]);
  });
  const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
  studentSheet["!cols"] = [{ wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, studentSheet, "Students Reference");

  // Create reference sheet for classes
  const classData = [["Class Name"]];
  classes.forEach((c) => {
    classData.push([c.className]);
  });
  const classSheet = XLSX.utils.aoa_to_sheet(classData);
  classSheet["!cols"] = [{ wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, classSheet, "Classes Reference");

  return workbook;
}

export interface ValidatedScholarshipRow {
  studentId: string;
  studentName: string;
  className: string;
  nominal: number;
}

export function validateScholarshipData(
  data: ScholarshipExcelRow[],
  validStudentNis: string[],
  validClassNames: string[],
): {
  valid: ValidatedScholarshipRow[];
  errors: Array<{ row: number; errors: string[] }>;
} {
  const valid: ValidatedScholarshipRow[] = [];
  const errors: Array<{ row: number; errors: string[] }> = [];

  data.forEach((row, index) => {
    const rowErrors: string[] = [];
    const rowNum = index + 2; // +2 for header row and 0-index

    // Skip empty rows
    if (!row["Student NIS"] && !row.Class && !row.Nominal) {
      return;
    }

    // Validate Student NIS
    const nis = String(row["Student NIS"]).trim();
    if (!nis) {
      rowErrors.push("Student NIS is required");
    } else if (!validStudentNis.includes(nis)) {
      rowErrors.push(`Student NIS "${nis}" not found`);
    }

    // Validate Class
    const className = String(row.Class).trim();
    if (!className) {
      rowErrors.push("Class is required");
    } else if (!validClassNames.includes(className)) {
      rowErrors.push(`Class "${className}" not found`);
    }

    // Validate Nominal
    const nominal = Number(row.Nominal);
    if (!row.Nominal && row.Nominal !== 0) {
      rowErrors.push("Nominal is required");
    } else if (Number.isNaN(nominal) || nominal < 0) {
      rowErrors.push("Nominal must be a positive number");
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, errors: rowErrors });
    } else {
      valid.push({
        studentId: nis,
        studentName: String(row["Student Name"] || "").trim(),
        className,
        nominal,
      });
    }
  });

  return { valid, errors };
}
