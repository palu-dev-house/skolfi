const ROMAN_MAP: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
  9: "IX",
  10: "X",
  11: "XI",
  12: "XII",
};

export type SchoolLevelInput = "TK" | "SD" | "SMP" | "SMA";

const TK_TINGKAT_MAP: Record<number, string> = {
  1: "PG",
  2: "TKA",
  3: "TKB",
};

/**
 * Generate class name pattern.
 * TK uses Indonesian tingkat tokens (PG/TKA/TKB) rather than numeric grade,
 * e.g. TK-PG-A-2024/2025, TK-TKA-A-2024/2025. SD/SMP/SMA keep roman numerals.
 */
export function generateClassName(
  grade: number,
  section: string,
  academicYear: string,
  schoolLevel?: SchoolLevelInput,
): string {
  if (schoolLevel === "TK") {
    const tingkat = TK_TINGKAT_MAP[grade] || String(grade);
    return `TK-${tingkat}-${section}-${academicYear}`;
  }
  const romanGrade = ROMAN_MAP[grade] || String(grade);
  return `${romanGrade}-${section}-${academicYear}`;
}
