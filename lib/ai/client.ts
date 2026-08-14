import "server-only";
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "@/lib/constants";

export interface AiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

export function getChatModel() {
  return process.env.GEMINI_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}

export function getEmbeddingModel() {
  return process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini is not configured. Add GEMINI_API_KEY on the server.");
  return new GoogleGenAI({ apiKey });
}

/**
 * Gemini's free tier enforces a low requests-per-minute cap, so bursts (e.g.
 * embedding many document chunks back to back) routinely hit 429s under
 * normal use. Retries with the API's suggested retryDelay, capped so a
 * single call can't hang indefinitely.
 */
export async function withGeminiRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = (error as { status?: number } | undefined)?.status;
      if (status !== 429 || attempt >= retries) throw error;
      const message = error instanceof Error ? error.message : "";
      const match = message.match(/"retryDelay":"(\d+)s"/);
      const suggestedMs = match ? Number(match[1]) * 1000 : 2000 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, Math.min(suggestedMs, 15_000)));
    }
  }
}

export async function embedText(input: string) {
  const ai = createGeminiClient();
  const response = await withGeminiRetry(() => ai.models.embedContent({
    model: getEmbeddingModel(),
    contents: [input],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  }));
  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) throw new Error("The embedding model returned no vector.");
  return { embedding, usage: {} as AiUsage };
}
