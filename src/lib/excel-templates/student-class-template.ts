import * as XLSX from "xlsx";

export function generateStudentClassTemplate(
  students: Array<{ nis: string; name: string }>,
  classes: Array<{ id: string; className: string }>,
) {
  const workbook = XLSX.utils.book_new();

  // Instructions sheet
  const instructionsData = [
    ["Student Class Assignment Import Template"],
    [""],
    ["Instructions:"],
    ["1. Fill in the Student NIS and Class Name columns"],
    ["2. Student NIS must match an existing student"],
    ["3. Class Name must match an existing class exactly"],
    ["4. You can copy data from the reference sheets"],
    [""],
    ["Columns:"],
    ["- Student NIS: The student's NIS number (required)"],
    ["- Student Name: For reference only (not imported)"],
    ["- Class Name: The class to assign the student to (required)"],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet["!cols"] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  // Data entry sheet
  const dataHeaders = ["Student NIS", "Student Name (Reference)", "Class Name"];
  const dataSheet = XLSX.utils.aoa_to_sheet([dataHeaders]);
  dataSheet["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Import Data");

  // Students reference sheet
  const studentsData = [
    ["Student NIS", "Student Name"],
    ...students.map((s) => [s.nis, s.name]),
  ];
  const studentsSheet = XLSX.utils.aoa_to_sheet(studentsData);
  studentsSheet["!cols"] = [{ wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, studentsSheet, "Students List");

  // Classes reference sheet
  const classesData = [
    ["Class ID", "Class Name"],
    ...classes.map((c) => [c.id, c.className]),
  ];
  const classesSheet = XLSX.utils.aoa_to_sheet(classesData);
  classesSheet["!cols"] = [{ wch: 40 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, classesSheet, "Classes List");

  return workbook;
}

export interface StudentClassImportRow {
  studentId: string;
  className: string;
  rowNumber: number;
}

export function parseStudentClassImport(buffer: ArrayBuffer): {
  rows: StudentClassImportRow[];
  errors: string[];
} {
  const workbook = XLSX.read(buffer, { type: "array" });

  // Find the data sheet
  const sheetName =
    workbook.SheetNames.find(
      (name) =>
        name.toLowerCase().includes("import") ||
        name.toLowerCase().includes("data"),
    ) || workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
  });

  const rows: StudentClassImportRow[] = [];
  const errors: string[] = [];

  // Skip header row
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[];
    const rowNumber = i + 1;

    if (!row || row.length === 0 || (!row[0] && !row[2])) {
      continue; // Skip empty rows
    }

    const studentId = String(row[0] || "").trim();
    const className = String(row[2] || "").trim();

    if (!studentId) {
      errors.push(`Row ${rowNumber}: Student NIS is required`);
      continue;
    }

    if (!className) {
      errors.push(`Row ${rowNumber}: Class Name is required`);
      continue;
    }

    rows.push({
      studentId,
      className,
      rowNumber,
    });
  }

  return { rows, errors };
}
