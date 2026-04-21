import { describe, expect, it } from "vitest";
import { generateClassName } from "@/lib/business-logic/class-name-generator";

describe("generateClassName", () => {
  it("converts grade 1 to roman I", () => {
    expect(generateClassName(1, "A", "2024/2025")).toBe("I-A-2024/2025");
  });

  it("converts grade 10 to roman X", () => {
    expect(generateClassName(10, "IPA", "2024/2025")).toBe("X-IPA-2024/2025");
  });

  it("converts grade 12 to roman XII", () => {
    expect(generateClassName(12, "IPS", "2026/2027")).toBe("XII-IPS-2026/2027");
  });

  it("falls back to arabic numerals for out-of-range grades", () => {
    expect(generateClassName(13, "A", "2024/2025")).toBe("13-A-2024/2025");
    expect(generateClassName(0, "A", "2024/2025")).toBe("0-A-2024/2025");
  });

  it("preserves section casing verbatim", () => {
    expect(generateClassName(7, "b", "2024/2025")).toBe("VII-b-2024/2025");
  });

  it("uses tingkat tokens (PG/TKA/TKB) for TK level", () => {
    expect(generateClassName(1, "A", "2024/2025", "TK")).toBe(
      "TK-PG-A-2024/2025",
    );
    expect(generateClassName(2, "A", "2024/2025", "TK")).toBe(
      "TK-TKA-A-2024/2025",
    );
    expect(generateClassName(3, "B", "2024/2025", "TK")).toBe(
      "TK-TKB-B-2024/2025",
    );
  });
});
