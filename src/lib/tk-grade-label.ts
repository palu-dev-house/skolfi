export type SchoolLevel = "TK" | "SD" | "SMP" | "SMA";

const TK_GRADE_LABELS: Record<number, string> = {
  1: "PG",
  2: "TK A",
  3: "TK B",
};

export const TK_GRADE_OPTIONS = [
  { value: "1", label: "PG" },
  { value: "2", label: "TK A" },
  { value: "3", label: "TK B" },
];

export function tkGradeLabel(grade: number): string {
  return TK_GRADE_LABELS[grade] ?? String(grade);
}

export function formatGradeLabel(
  schoolLevel: SchoolLevel | string | null | undefined,
  grade: number,
): string {
  if (schoolLevel === "TK") return tkGradeLabel(grade);
  return String(grade);
}
