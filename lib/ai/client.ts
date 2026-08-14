import "server-only";
import OpenAI from "openai";
import { DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_MODEL } from "@/lib/constants";

export function getChatModel() {
  return process.env.OPENAI_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}

export function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured. Add OPENAI_API_KEY on the server.");
  return new OpenAI({ apiKey });
}

export async function embedText(input: string) {
  const openai = createOpenAIClient();
  const response = await openai.embeddings.create({ model: getEmbeddingModel(), input });
  return { embedding: response.data[0].embedding, usage: response.usage };
}
