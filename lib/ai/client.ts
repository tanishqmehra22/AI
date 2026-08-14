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

export async function embedText(input: string) {
  const ai = createGeminiClient();
  const response = await ai.models.embedContent({
    model: getEmbeddingModel(),
    contents: [input],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) throw new Error("The embedding model returned no vector.");
  return { embedding, usage: {} as AiUsage };
}
