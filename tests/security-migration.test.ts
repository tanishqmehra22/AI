import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("nested authorization migration", () => {
  const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608130002_harden_nested_rls.sql"), "utf8");
  it("requires parent ownership for assignments, messages, and chunks", () => {
    expect(sql).toMatch(/assignments[\s\S]*exists \([\s\S]*courses c/);
    expect(sql).toMatch(/messages[\s\S]*exists \([\s\S]*conversations c/);
    expect(sql).toMatch(/document_chunks[\s\S]*exists \([\s\S]*documents d/);
  });
});
