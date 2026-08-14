import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { AssignmentManager } from "@/components/assignments/assignment-manager";
import type { Assignment, Course } from "@/types/domain";

export default async function AssignmentsPage() {
  const { user, supabase } = await requireUser();
  const [{ data: assignments }, { data: courses }] = await Promise.all([supabase.from("assignments").select("*, courses(name, course_code)").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false }), supabase.from("courses").select("*").eq("user_id", user.id).order("name")]);
  return <><PageHeader eyebrow="Workload" title="Assignments, in one place" description="Track deadlines, effort, and priority so your study plan has something real to work from." /><AssignmentManager initialAssignments={(assignments ?? []) as Assignment[]} courses={(courses ?? []) as Course[]} /></>;
}
