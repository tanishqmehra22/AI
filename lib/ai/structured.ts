import "server-only";
import { z, type ZodType } from "zod";
import { createGeminiClient, getChatModel, withGeminiRetry, type AiUsage } from "@/lib/ai/client";
import { toGeminiSchema } from "@/lib/ai/schema";

export async function generateValidatedJson<T>(input: {
  system: string;
  user: string;
  schema: ZodType<T>;
}) {
  const ai = createGeminiClient();
  const responseJsonSchema = toGeminiSchema(z.toJSONSchema(input.schema, { io: "output" }));
  const response = await withGeminiRetry(() => ai.models.generateContent({
    model: getChatModel(),
    contents: [{ role: "user", parts: [{ text: input.user }] }],
    config: {
      systemInstruction: input.system,
      responseMimeType: "application/json",
      responseJsonSchema,
      temperature: 0.2,
    },
  }));
  const raw = response.text;
  if (!raw) throw new Error("The model returned an empty structured response.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The model returned malformed JSON. Please try again.");
  }
  const result = input.schema.safeParse(parsed);
  if (!result.success) {
    console.error("Structured output failed validation:", z.prettifyError(result.error));
    throw new Error("The model response did not match the expected format. Please try again.");
  }
  const usage: AiUsage = {
    prompt_tokens: response.usageMetadata?.promptTokenCount,
    completion_tokens: response.usageMetadata?.candidatesTokenCount,
  };
  return { data: result.data, usage };
}
