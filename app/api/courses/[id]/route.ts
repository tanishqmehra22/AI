import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { courseSchema, idSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const courseId = idSchema.parse(id);
    const values = courseSchema.parse(await request.json());
    const { user, supabase } = await requireApiUser();
    const { data, error } = await supabase.from("courses").update({ name: values.name, course_code: values.courseCode || null, professor: values.professor || null, semester: values.semester || null, description: values.description || null }).eq("id", courseId).eq("user_id", user.id).select("*").single();
    if (error) throw new ApiError("Course not found or update was not permitted.", 404);
    return NextResponse.json({ course: data });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const courseId = idSchema.parse(id);
    const { user, supabase } = await requireApiUser();
    const { error } = await supabase.from("courses").delete().eq("id", courseId).eq("user_id", user.id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
