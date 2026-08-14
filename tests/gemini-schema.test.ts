import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toGeminiSchema } from "@/lib/ai/schema";
import { flashcardOutputSchema, studyPlanOutputSchema } from "@/lib/validation";

function collectKeys(node: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(node)) node.forEach((item) => collectKeys(item, found));
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      found.add(key);
      collectKeys(value, found);
    }
  }
  return found;
}

// Gemini answers a schema containing these with a bare 400, so they must never
// survive the conversion. `maxItems` on the nested sessions array was the
// original culprit behind failed flashcard/study-plan generation.
const rejectedByGemini = ["$schema", "format", "pattern", "minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum", "multipleOf"];

describe("Gemini response schema conversion", () => {
  it.each([
    ["flashcards", flashcardOutputSchema],
    ["study plan", studyPlanOutputSchema],
  ])("strips unsupported validation keywords from the %s schema", (_label, schema) => {
    const raw = z.toJSONSchema(schema, { io: "output" });
    // The source schemas must actually exercise the stripping.
    expect(collectKeys(raw)).toContain("maxItems");

    const keys = collectKeys(toGeminiSchema(raw));
    for (const keyword of rejectedByGemini) expect(keys).not.toContain(keyword);
  });

  it("preserves the structure that steers generation", () => {
    const converted = toGeminiSchema(z.toJSONSchema(flashcardOutputSchema, { io: "output" })) as {
      properties: { flashcards: { items: { properties: Record<string, unknown>; required: string[] } } };
    };
    const card = converted.properties.flashcards.items;
    expect(Object.keys(card.properties)).toEqual(["question", "answer", "difficulty"]);
    expect(card.required).toEqual(["question", "answer", "difficulty"]);
    expect(card.properties.difficulty).toEqual({ type: "string", enum: ["easy", "medium", "hard"] });
  });
});
