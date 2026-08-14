import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { StudyPlanner } from "@/components/study-plan/study-planner";

export default async function StudyPlanPage() {
  const { user, supabase } = await requireUser();
  const [{ data: plans }, { count }] = await Promise.all([supabase.from("study_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12), supabase.from("assignments").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "completed")]);
  return <><PageHeader eyebrow="Intentional progress" title="A plan for the work you actually have" description="StudyOS weighs upcoming deadlines, status, priority, and estimated hours to draft a realistic schedule. Review it as a suggestion, not a command." /><StudyPlanner initialPlans={(plans ?? []) as never[]} openAssignmentCount={count ?? 0} /></>;
}
