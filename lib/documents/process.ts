import "server-only";
import { MAX_DOCUMENT_CHUNKS } from "@/lib/constants";
import { embedText } from "@/lib/ai/client";
import { chunkPages } from "@/lib/documents/chunk";
import { extractDocumentPages } from "@/lib/documents/extract";
import type { DocumentFormat } from "@/lib/documents/formats";

type Supabase = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export async function processDocument(input: {
  supabase: Supabase;
  documentId: string;
  userId: string;
  courseId: string | null;
  bytes: ArrayBuffer;
  format: DocumentFormat;
}) {
  const { supabase, documentId, userId, courseId, bytes, format } = input;
  await supabase.from("documents").update({ processing_status: "processing", processing_error: null }).eq("id", documentId).eq("user_id", userId);
  try {
    const { pages, extraction } = await extractDocumentPages(format, bytes);
    const chunks = chunkPages(pages);
    if (!chunks.length) throw new Error("No readable text was found in this file.");
    if (chunks.length > MAX_DOCUMENT_CHUNKS) throw new Error("This file is too large to process safely. Upload a smaller excerpt.");

    const rows = [];
    for (const chunk of chunks) {
      const { embedding } = await embedText(chunk.content);
      rows.push({
        document_id: documentId,
        user_id: userId,
        course_id: courseId,
        content: chunk.content,
        chunk_index: chunk.chunkIndex,
        page_number: chunk.pageNumber,
        embedding,
        metadata: { extraction, format, charCount: chunk.content.length },
      });
    }
    const { error: chunksError } = await supabase.from("document_chunks").insert(rows);
    if (chunksError) throw new Error(chunksError.message);
    const { error: readyError } = await supabase.from("documents").update({ processing_status: "ready" }).eq("id", documentId).eq("user_id", userId);
    if (readyError) throw new Error(readyError.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The document could not be processed.";
    await supabase.from("documents").update({ processing_status: "failed", processing_error: message.slice(0, 500) }).eq("id", documentId).eq("user_id", userId);
    throw error;
  }
}
