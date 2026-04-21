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

/**
 * Generate class name pattern.
 * TK uses Arabic numerals prefixed with the level (e.g. TK-1-A-2024/2025) because
 * grade 1 collides with SD grade 1 in roman numerals. SD/SMP/SMA keep the existing
 * roman format for backwards compatibility.
 */
export function generateClassName(
  grade: number,
  section: string,
  academicYear: string,
  schoolLevel?: SchoolLevelInput,
): string {
  if (schoolLevel === "TK") {
    return `TK-${grade}-${section}-${academicYear}`;
  }
  const romanGrade = ROMAN_MAP[grade] || String(grade);
  return `${romanGrade}-${section}-${academicYear}`;
}
