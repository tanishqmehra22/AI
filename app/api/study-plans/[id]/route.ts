import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { idSchema } from "@/lib/validation";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const planId = idSchema.parse(id);
    const { user, supabase } = await requireApiUser();
    // Report 404 rather than a silent 204 when the row is absent or owned by
    // someone else; the ownership filter is what actually blocks the delete.
    const { data, error } = await supabase.from("study_plans").delete().eq("id", planId).eq("user_id", user.id).select("id");
    if (error) throw error;
    if (!data?.length) throw new ApiError("Study plan not found.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
