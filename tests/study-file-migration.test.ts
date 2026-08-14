import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("study file migration", () => {
  const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608130003_support_study_file_types.sql"), "utf8");

  it("allows Office documents and spreadsheets in both the data row and storage bucket", () => {
    expect(sql).toMatch(/wordprocessingml\.document/);
    expect(sql).toMatch(/presentationml\.presentation/);
    expect(sql).toMatch(/spreadsheetml\.sheet/);
    expect(sql).toMatch(/update storage\.buckets/i);
  });
});
