import "server-only";
import JSZip from "jszip";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";
import type { TextPage } from "@/lib/documents/chunk";
import type { DocumentFormat } from "@/lib/documents/formats";

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

function textPage(text: string, pageNumber = 1): TextPage[] {
  if (!text.trim()) throw new Error("No readable text was found in this file.");
  return [{ pageNumber, text }];
}

function decodeXmlText(text: string) {
  return text.replace(/&#x([0-9a-f]+);|&#(\d+);|&amp;|&lt;|&gt;|&quot;|&apos;/gi, (entity, hex, decimal) => {
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
    return { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" }[entity.toLowerCase()] ?? entity;
  });
}

async function extractPptxSlides(buffer: ArrayBuffer): Promise<TextPage[]> {
  const zip = await JSZip.loadAsync(buffer);
  const slides = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((left, right) => Number(left.match(/slide(\d+)\.xml/i)?.[1]) - Number(right.match(/slide(\d+)\.xml/i)?.[1]));
  const pages = await Promise.all(slides.map(async (path, index) => {
    const xml = await zip.file(path)?.async("text");
    const text = Array.from(xml?.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi) ?? [], (match) => decodeXmlText(match[1])).join(" ");
    return { pageNumber: index + 1, text };
  }));
  if (!pages.some((page) => page.text.trim())) throw new Error("This PowerPoint has no readable slide text.");
  return pages;
}

async function extractDocxText(buffer: ArrayBuffer): Promise<TextPage[]> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return textPage(result.value);
}

function extractSpreadsheetSheets(buffer: ArrayBuffer): TextPage[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const pages = workbook.SheetNames.map((name, index) => ({
    pageNumber: index + 1,
    text: `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`,
  }));
  if (!pages.some((page) => page.text.replace(/^Sheet:.*\n?/, "").trim())) throw new Error("This spreadsheet has no readable cells.");
  return pages;
}

export async function extractDocumentPages(format: DocumentFormat, buffer: ArrayBuffer): Promise<{ pages: TextPage[]; extraction: string }> {
  switch (format) {
    case "pdf": return { pages: await extractPdfPages(buffer), extraction: "pdf-parse" };
    case "docx": return { pages: await extractDocxText(buffer), extraction: "mammoth" };
    case "pptx": return { pages: await extractPptxSlides(buffer), extraction: "pptx-xml" };
    case "spreadsheet": return { pages: extractSpreadsheetSheets(buffer), extraction: "sheetjs" };
    case "text": return { pages: textPage(new TextDecoder().decode(buffer)), extraction: "text" };
  }
}
