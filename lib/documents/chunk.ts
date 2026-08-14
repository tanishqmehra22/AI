export interface TextPage {
  pageNumber: number;
  text: string;
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
}

const normalizeText = (text: string) => text.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

/**
 * Splits normalized text near paragraph or sentence boundaries. Character counts
 * are intentionally used here: it is predictable, cheap, and close enough for
 * embedding chunk sizes without introducing a tokenizer dependency.
 */
export function chunkPages(pages: TextPage[], size = 1_500, overlap = 220): TextChunk[] {
  const chunks: TextChunk[] = [];
  let index = 0;
  for (const page of pages) {
    const text = normalizeText(page.text);
    if (!text) continue;
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + size, text.length);
      if (end < text.length) {
        const boundary = Math.max(text.lastIndexOf("\n\n", end), text.lastIndexOf(". ", end), text.lastIndexOf(" ", end));
        if (boundary > start + Math.floor(size * 0.55)) end = boundary + 1;
      }
      const content = text.slice(start, end).trim();
      if (content.length >= 80) chunks.push({ content, chunkIndex: index++, pageNumber: page.pageNumber });
      if (end >= text.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  }
  return chunks;
}
