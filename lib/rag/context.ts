import type { RetrievedChunk } from "@/types/domain";

export function buildRagContext(chunks: RetrievedChunk[]) {
  if (!chunks.length) return "No relevant uploaded course material was retrieved.";
  return chunks.map((chunk, index) => [
    `<source id="${index + 1}" document="${chunk.documentName}" page="${chunk.pageNumber ?? "unknown"}" chunk="${chunk.chunkIndex}">`,
    chunk.content,
    "</source>",
  ].join("\n")).join("\n\n");
}
