import "server-only";

// Server-only surface for application code. The implementation lives in
// `@/lib/ai/gemini` so the evaluation harness can reuse it outside Next.js.
export {
  createGeminiClient,
  embedText,
  getChatModel,
  getEmbeddingModel,
  withGeminiRetry,
  type AiUsage,
} from "@/lib/ai/gemini";
