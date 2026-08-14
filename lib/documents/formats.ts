export type DocumentFormat = "pdf" | "docx" | "pptx" | "spreadsheet" | "text";

export interface SupportedDocumentType {
  format: DocumentFormat;
  extension: string;
  mimeType: string;
  label: string;
}

export const supportedDocumentTypes: SupportedDocumentType[] = [
  { format: "pdf", extension: "pdf", mimeType: "application/pdf", label: "PDF" },
  { format: "docx", extension: "docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word document" },
  { format: "pptx", extension: "pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PowerPoint presentation" },
  { format: "spreadsheet", extension: "xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel workbook" },
  { format: "spreadsheet", extension: "xls", mimeType: "application/vnd.ms-excel", label: "Excel spreadsheet" },
  { format: "spreadsheet", extension: "csv", mimeType: "text/csv", label: "CSV spreadsheet" },
  { format: "text", extension: "txt", mimeType: "text/plain", label: "Text file" },
  { format: "text", extension: "md", mimeType: "text/markdown", label: "Markdown file" },
];

export const supportedDocumentAccept = supportedDocumentTypes.flatMap(({ extension, mimeType }) => [mimeType, `.${extension}`]).join(",");

export function getSupportedDocumentType(filename: string): SupportedDocumentType | null {
  const extension = filename.trim().toLowerCase().split(".").at(-1);
  return supportedDocumentTypes.find((type) => type.extension === extension) ?? null;
}
