-- Add schoolLevel column to class_academics with default SD so existing rows backfill, then normalise from grade.
ALTER TABLE "class_academics" ADD COLUMN "school_level" "SchoolLevel" NOT NULL DEFAULT 'SD';

UPDATE "class_academics" SET "school_level" = 'SMP' WHERE "grade" BETWEEN 7 AND 9;
UPDATE "class_academics" SET "school_level" = 'SMA' WHERE "grade" BETWEEN 10 AND 12;

-- Replace the old uniqueness constraint so TK can coexist with SD at the same numeric grade/section.
DROP INDEX "class_academics_academic_year_id_grade_section_key";
CREATE UNIQUE INDEX "class_academics_academic_year_id_school_level_grade_section_key"
  ON "class_academics"("academic_year_id", "school_level", "grade", "section");
