export const APP_NAME = "StudyOS";
export const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
export const DEFAULT_CHAT_MODEL = "gpt-4.1-mini";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const MAX_DOCUMENT_CHUNKS = 2_000;
export const RAG_MATCH_COUNT = 7;

export const assignmentStatuses = [
  "not_started",
  "in_progress",
  "completed",
] as const;
export const priorities = ["low", "medium", "high"] as const;
export const documentStatuses = ["uploaded", "processing", "ready", "failed"] as const;
export const difficulties = ["easy", "medium", "hard"] as const;
