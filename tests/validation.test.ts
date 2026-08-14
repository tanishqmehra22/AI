import { describe, expect, it } from "vitest";
import { assignmentSchema, courseSchema, flashcardOutputSchema } from "@/lib/validation";

const courseId = "72e17c9e-0c80-4f2b-b671-72c68da664d6";

describe("input validation", () => {
  it("accepts a valid course", () => {
    expect(courseSchema.parse({ name: "Data Structures", courseCode: "CS 146" }).name).toBe("Data Structures");
  });
  it("rejects an assignment without a title or valid course", () => {
    expect(() => assignmentSchema.parse({ courseId: "not-an-id", title: "x" })).toThrow();
  });
  it("normalizes allowed assignment values", () => {
    const assignment = assignmentSchema.parse({ courseId, title: "Problem set", dueDate: "2026-10-10", priority: "high", estimatedHours: "2.5" });
    expect(assignment.estimatedHours).toBe(2.5);
    expect(assignment.status).toBe("not_started");
  });
  it("rejects malformed model flashcard JSON", () => {
    expect(flashcardOutputSchema.safeParse({ flashcards: [{ question: "x", answer: "short", difficulty: "impossible" }] }).success).toBe(false);
  });
});
