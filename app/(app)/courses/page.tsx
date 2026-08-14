import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { CourseManager } from "@/components/courses/course-manager";
import type { Course } from "@/types/domain";

export default async function CoursesPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase.from("courses").select("*").eq("user_id", user.id).order("name");
  return <><PageHeader eyebrow="Academic workspace" title="Your courses" description="Give every subject a home for its work, documents, flashcards, and conversations." /><CourseManager initialCourses={(data ?? []) as Course[]} /></>;
}
