import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { idSchema } from "@/lib/validation";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const documentId = idSchema.parse(id);
    const { user, supabase } = await requireApiUser();
    const { data: document, error: lookupError } = await supabase.from("documents").select("storage_path").eq("id", documentId).eq("user_id", user.id).single();
    if (lookupError || !document) throw new ApiError("Document not found.", 404);
    const { error: storageError } = await supabase.storage.from("documents").remove([document.storage_path]);
    if (storageError) throw new ApiError("The file could not be removed from storage.", 502);
    const { error } = await supabase.from("documents").delete().eq("id", documentId).eq("user_id", user.id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
