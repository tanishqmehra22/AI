import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { idSchema } from "@/lib/validation";

// Deletes a flashcard set. Its cards are removed by the set's cascading
// foreign key, and the ownership filter keeps the delete scoped to the caller.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const setId = idSchema.parse(id);
    const { user, supabase } = await requireApiUser();
    const { data, error } = await supabase.from("flashcard_sets").delete().eq("id", setId).eq("user_id", user.id).select("id");
    if (error) throw error;
    if (!data?.length) throw new ApiError("Flashcard set not found.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
