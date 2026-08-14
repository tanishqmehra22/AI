import "server-only";
import { RAG_MATCH_COUNT } from "@/lib/constants";
import { embedText } from "@/lib/ai/client";
import type { RetrievedChunk } from "@/types/domain";

interface ChunkRow {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  page_number: number | null;
  document_name: string;
  similarity: number;
}

export async function retrieveRelevantChunks(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>,
  question: string,
  filters: { courseId?: string; documentId?: string } = {},
) {
  const { embedding, usage } = await embedText(question);
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_count: RAG_MATCH_COUNT,
    filter_course_id: filters.courseId ?? null,
    filter_document_id: filters.documentId ?? null,
  });
  if (error) throw new Error(`Document search failed: ${error.message}`);
  const chunks = ((data ?? []) as ChunkRow[]).map((chunk) => ({
    chunkId: chunk.id,
    documentId: chunk.document_id,
    content: chunk.content,
    chunkIndex: chunk.chunk_index,
    pageNumber: chunk.page_number,
    documentName: chunk.document_name,
    similarity: chunk.similarity,
  })) satisfies RetrievedChunk[];
  return { chunks, embeddingUsage: usage };
}
