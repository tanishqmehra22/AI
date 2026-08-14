import "server-only";
import { PDFParse } from "pdf-parse";
import type { TextPage } from "@/lib/documents/chunk";

export async function extractPdfPages(buffer: ArrayBuffer): Promise<TextPage[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const text = await parser.getText();
    const pages = text.pages.map((page, index) => ({ pageNumber: index + 1, text: page.text }));
    if (!pages.some((page) => page.text.trim())) throw new Error("This PDF has no extractable text. Try an OCRed PDF.");
    return pages;
  } finally {
    await parser.destroy();
  }
}
