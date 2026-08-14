import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { MAX_DOCUMENT_SIZE_BYTES } from "@/lib/constants";
import { getSupportedDocumentType } from "@/lib/documents/formats";
import { processDocument } from "@/lib/documents/process";
import { idSchema } from "@/lib/validation";
import { safeFilename } from "@/lib/utils";

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
    const file = form.get("file");
    const courseValue = form.get("courseId");
    if (!(file instanceof File)) throw new ApiError("Choose a study file to upload.", 422);
    const documentType = getSupportedDocumentType(file.name);
    if (!documentType) throw new ApiError("Upload a PDF, Word document, PowerPoint, spreadsheet, CSV, text, or Markdown file.", 422);
    if (!file.size) throw new ApiError("That file is empty.", 422);
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) throw new ApiError("Files must be 15 MB or smaller.", 422);
    const courseId = courseValue ? idSchema.parse(courseValue) : null;
    if (courseId) {
      const { data: course } = await supabase.from("courses").select("id").eq("id", courseId).eq("user_id", user.id).maybeSingle();
      if (!course) throw new ApiError("The selected course was not found.", 404);
    }
    const documentId = crypto.randomUUID();
    const filename = safeFilename(file.name);
    const storagePath = `${user.id}/${documentId}/${filename}`;
    const { error: dbError } = await supabase.from("documents").insert({
      id: documentId, user_id: user.id, course_id: courseId, filename, original_filename: file.name.slice(0, 255), storage_path: storagePath,
      mime_type: documentType.mimeType, file_size: file.size, processing_status: "uploaded",
    });
    if (dbError) throw new ApiError(dbError.message, 500);
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, bytes, { contentType: documentType.mimeType, upsert: false });
    if (uploadError) {
      await supabase.from("documents").update({ processing_status: "failed", processing_error: "Storage upload failed." }).eq("id", documentId).eq("user_id", user.id);
      throw new ApiError("The file could not be stored. Please try again.", 502);
    }
    try {
      await processDocument({ supabase, documentId, userId: user.id, courseId, bytes, format: documentType.format });
    } catch (processingError) {
      const message = processingError instanceof Error ? processingError.message : "Processing failed.";
      return NextResponse.json({ document: { id: documentId, processing_status: "failed", processing_error: message }, warning: message }, { status: 202 });
    }
    const { data: document } = await supabase.from("documents").select("*, courses(name, course_code)").eq("id", documentId).eq("user_id", user.id).single();
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) { return apiError(error); }
}
