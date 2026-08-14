import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { courseSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { user, supabase } = await requireApiUser();
    const { data, error } = await supabase.from("courses").select("*").eq("user_id", user.id).order("name");
    if (error) throw error;
    return NextResponse.json({ courses: data ?? [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const values = courseSchema.parse(await request.json());
    const { data, error } = await supabase.from("courses").insert({ user_id: user.id, name: values.name, course_code: values.courseCode || null, professor: values.professor || null, semester: values.semester || null, description: values.description || null }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ course: data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
