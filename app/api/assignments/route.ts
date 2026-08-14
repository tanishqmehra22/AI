import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { assignmentSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { user, supabase } = await requireApiUser();
    const { data, error } = await supabase.from("assignments").select("*, courses(name, course_code)").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return NextResponse.json({ assignments: data ?? [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const values = assignmentSchema.parse(await request.json());
    const { data, error } = await supabase.from("assignments").insert({ user_id: user.id, course_id: values.courseId, title: values.title, description: values.description || null, due_date: values.dueDate || null, status: values.status, priority: values.priority, estimated_hours: values.estimatedHours ?? null }).select("*, courses(name, course_code)").single();
    if (error) throw error;
    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
