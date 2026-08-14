// Gemini rejects several JSON Schema validation keywords outright — `maxItems`
// on a nested array returns a bare 400, for example. Only the structural parts
// (types, properties, required, enums, nesting) actually steer generation, so
// send those and let Zod stay the trust boundary for value constraints.
const UNSUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$schema", "format", "pattern",
  "minLength", "maxLength", "minItems", "maxItems",
  "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
]);

export function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !UNSUPPORTED_SCHEMA_KEYWORDS.has(key))
        .map(([key, value]) => [key, toGeminiSchema(value)]),
    );
  }
  return node;
}
