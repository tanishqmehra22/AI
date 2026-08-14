import "server-only";
import type { ZodType } from "zod";
import { createGeminiClient, getChatModel, withGeminiRetry, type AiUsage } from "@/lib/ai/client";

export async function generateValidatedJson<T>(input: {
  system: string;
  user: string;
  schema: ZodType<T>;
}) {
  const ai = createGeminiClient();
  const response = await withGeminiRetry(() => ai.models.generateContent({
    model: getChatModel(),
    contents: [{ role: "user", parts: [{ text: input.user }] }],
    config: {
      systemInstruction: input.system,
      responseMimeType: "application/json",
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
  if (!result.success) throw new Error("The model response did not match the expected format. Please try again.");
  const usage: AiUsage = {
    prompt_tokens: response.usageMetadata?.promptTokenCount,
    completion_tokens: response.usageMetadata?.candidatesTokenCount,
  };
  return { data: result.data, usage };
}
