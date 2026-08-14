import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { assignmentPatchSchema, idSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assignmentId = idSchema.parse(id);
    const values = assignmentPatchSchema.parse(await request.json());
    const { user, supabase } = await requireApiUser();
    const update = {
      title: values.title,
      course_id: values.courseId,
      description: values.description === undefined ? undefined : values.description || null,
      due_date: values.dueDate === undefined ? undefined : values.dueDate || null,
      status: values.status,
      priority: values.priority,
      estimated_hours: values.estimatedHours,
      completed_at: values.completedAt === undefined ? (values.status === "completed" ? new Date().toISOString() : values.status ? null : undefined) : values.completedAt,
    };
    const { data, error } = await supabase.from("assignments").update(update).eq("id", assignmentId).eq("user_id", user.id).select("*, courses(name, course_code)").single();
    if (error) throw new ApiError("Assignment not found or update was not permitted.", 404);
    return NextResponse.json({ assignment: data });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assignmentId = idSchema.parse(id);
    const { user, supabase } = await requireApiUser();
    const { error } = await supabase.from("assignments").delete().eq("id", assignmentId).eq("user_id", user.id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
