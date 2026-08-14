import { describe, expect, it } from "vitest";
import { getSupportedDocumentType, supportedDocumentAccept } from "@/lib/documents/formats";

describe("supported study-file formats", () => {
  it("recognises common academic file extensions", () => {
    expect(getSupportedDocumentType("lecture-slides.PPTX")?.format).toBe("pptx");
    expect(getSupportedDocumentType("reading.docx")?.format).toBe("docx");
    expect(getSupportedDocumentType("gradebook.xlsx")?.format).toBe("spreadsheet");
    expect(getSupportedDocumentType("notes.md")?.format).toBe("text");
  });

  it("does not accept unsupported binary formats", () => {
    expect(getSupportedDocumentType("lecture.ppt")).toBeNull();
    expect(getSupportedDocumentType("archive.zip")).toBeNull();
  });

  it("exposes the supported extensions to the file chooser", () => {
    expect(supportedDocumentAccept).toContain(".pptx");
    expect(supportedDocumentAccept).toContain(".docx");
    expect(supportedDocumentAccept).toContain(".xlsx");
  });
});
