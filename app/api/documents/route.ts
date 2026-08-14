import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { MAX_DOCUMENT_SIZE_BYTES } from "@/lib/constants";
import { getSupportedDocumentType } from "@/lib/documents/formats";
import { processDocument } from "@/lib/documents/process";
import { idSchema } from "@/lib/validation";
import { safeFilename } from "@/lib/utils";

const MAX_FILES_PER_BATCH = 10;

export async function GET() {
  try {
    const { user, supabase } = await requireApiUser();
    const { data, error } = await supabase.from("documents").select("*, courses(name, course_code)").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ documents: data ?? [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const form = await request.formData();
    const files = form.getAll("file").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const courseValue = form.get("courseId");

    if (!files.length) throw new ApiError("Choose at least one study file to upload.", 422);
    if (files.length > MAX_FILES_PER_BATCH) throw new ApiError(`Upload up to ${MAX_FILES_PER_BATCH} files at a time.`, 422);

    const courseId = courseValue ? idSchema.parse(courseValue) : null;
    if (courseId) {
      const { data: course } = await supabase.from("courses").select("id").eq("id", courseId).eq("user_id", user.id).maybeSingle();
      if (!course) throw new ApiError("The selected course was not found.", 404);
    }

    const documents: unknown[] = [];
    const failures: string[] = [];

    for (const file of files) {
      const documentType = getSupportedDocumentType(file.name);
      if (!documentType) {
        failures.push(`${file.name}: use a PDF, Word document, PowerPoint, spreadsheet, CSV, text, or Markdown file.`);
        continue;
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        failures.push(`${file.name}: files must be 15 MB or smaller.`);
        continue;
      }

      const documentId = crypto.randomUUID();
      const filename = safeFilename(file.name);
      const storagePath = `${user.id}/${documentId}/${filename}`;
      const { error: dbError } = await supabase.from("documents").insert({
        id: documentId, user_id: user.id, course_id: courseId, filename, original_filename: file.name.slice(0, 255), storage_path: storagePath,
        mime_type: documentType.mimeType, file_size: file.size, processing_status: "uploaded",
      });
      if (dbError) {
        failures.push(`${file.name}: ${dbError.message}`);
        continue;
      }

      const bytes = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, bytes, { contentType: documentType.mimeType, upsert: false });
      let processingError: string | null = null;
      if (uploadError) {
        processingError = "The file could not be stored. Please try again.";
        await supabase.from("documents").update({ processing_status: "failed", processing_error: processingError }).eq("id", documentId).eq("user_id", user.id);
      } else {
        try {
          await processDocument({ supabase, documentId, userId: user.id, courseId, bytes, format: documentType.format });
        } catch (error) {
          processingError = error instanceof Error ? error.message : "Processing failed.";
        }
      }

      const { data: document, error: documentError } = await supabase
        .from("documents")
        .select("*, courses(name, course_code)")
        .eq("id", documentId)
        .eq("user_id", user.id)
        .single();
      if (documentError || !document) {
        failures.push(`${file.name}: ${documentError?.message ?? "The upload record could not be loaded."}`);
        continue;
      }
      documents.push(document);
      if (processingError) failures.push(`${file.name}: ${processingError}`);
    }

    if (!documents.length) throw new ApiError(failures[0] ?? "No files could be uploaded.", 422);
    return NextResponse.json({ document: documents[0], documents, failures }, { status: failures.length ? 207 : 201 });
  } catch (error) { return apiError(error); }
}
