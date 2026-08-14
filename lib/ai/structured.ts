import "server-only";
import type { ZodType } from "zod";
import { createOpenAIClient, getChatModel } from "@/lib/ai/client";

export async function generateValidatedJson<T>(input: {
  system: string;
  user: string;
  schema: ZodType<T>;
}) {
  const openai = createOpenAIClient();
  const response = await openai.chat.completions.create({
    model: getChatModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: 0.2,
  });
  const raw = response.choices[0]?.message.content;
  if (!raw) throw new Error("The model returned an empty structured response.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The model returned malformed JSON. Please try again.");
  }
  const result = input.schema.safeParse(parsed);
  if (!result.success) throw new Error("The model response did not match the expected format. Please try again.");
  return { data: result.data, usage: response.usage };
}
