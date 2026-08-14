import { addDays, formatISO } from "date-fns";
import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { getChatModel } from "@/lib/ai/client";
import { recordAiRun } from "@/lib/ai/observability";
import { generateValidatedJson } from "@/lib/ai/structured";
import { studyPlanOutputSchema, studyPlanRequestSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { user, supabase } = await requireApiUser();
    const { data, error } = await supabase.from("study_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ plans: data ?? [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const input = studyPlanRequestSchema.parse(await request.json());
    const startDate = input.startDate ?? formatISO(new Date(), { representation: "date" });
    const endDate = input.endDate ?? formatISO(addDays(new Date(`${startDate}T12:00:00`), 6), { representation: "date" });
    if (endDate < startDate) throw new ApiError("The plan end date must be after its start date.", 422);
    const { data: assignments, error } = await supabase.from("assignments").select("id, title, due_date, status, priority, estimated_hours, courses(name, course_code)").eq("user_id", user.id).neq("status", "completed").order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    if (!assignments?.length) throw new ApiError("Add an open assignment before generating a study plan.", 422);
    const startedAt = Date.now();
    try {
      const generated = await generateValidatedJson({
        schema: studyPlanOutputSchema,
        system: `Create a realistic study plan in JSON. Schedule only the given assignments, never invent assignment IDs. Return {summary, days:[{date,focus,sessions:[{assignmentId,title,durationMinutes,rationale}]}]}. Use dates from ${startDate} through ${endDate} only.`,
        user: `OPEN ASSIGNMENTS:\n${JSON.stringify(assignments)}\n\nPlan from ${startDate} through ${endDate}.`,
      });
      const knownAssignments = new Map(assignments.map((assignment) => [assignment.id, assignment]));
      const safeDays = generated.data.days.filter((day) => day.date >= startDate && day.date <= endDate).map((day) => ({
        ...day,
        sessions: day.sessions.filter((session) => knownAssignments.has(session.assignmentId)).map((session) => ({ ...session, title: knownAssignments.get(session.assignmentId)?.title ?? session.title })),
      })).filter((day) => day.sessions.length);
      if (!safeDays.length) throw new Error("The model plan referenced no valid assignments. Please try again.");
      const plan = { ...generated.data, days: safeDays };
      const { data, error: saveError } = await supabase.from("study_plans").insert({ user_id: user.id, title: input.title ?? `Plan: ${startDate} — ${endDate}`, start_date: startDate, end_date: endDate, plan }).select("*").single();
      if (saveError) throw new Error(saveError.message);
      await recordAiRun(supabase, user, { feature: "study_plan", model: getChatModel(), startedAt, success: true, inputTokens: generated.usage?.prompt_tokens, outputTokens: generated.usage?.completion_tokens });
      return NextResponse.json({ plan: data }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Study plan could not be generated.";
      await recordAiRun(supabase, user, { feature: "study_plan", model: getChatModel(), startedAt, success: false, errorMessage: message });
      throw error;
    }
  } catch (error) { return apiError(error); }
}
