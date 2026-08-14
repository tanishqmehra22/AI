import "server-only";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { addDays, formatISO } from "date-fns";
import { ApiError } from "@/lib/api";
import { assignmentPatchSchema, assignmentSchema, idSchema } from "@/lib/validation";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";

type Supabase = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;
type ToolContext = { supabase: Supabase; user: User };

const assignmentLookupSchema = z.object({ assignmentId: idSchema });
const searchDocumentsSchema = z.object({ query: z.string().min(1).max(1_000), courseId: idSchema.optional() });
const createStudyPlanSchema = z.object({ days: z.coerce.number().int().min(1).max(14).default(7), title: z.string().min(2).max(120).optional() });

export const assistantTools = [
  { type: "function" as const, function: { name: "getCourses", description: "List the student's courses.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function" as const, function: { name: "getAssignments", description: "List the student's assignments.", parameters: { type: "object", properties: { courseId: { type: "string" } }, additionalProperties: false } } },
  { type: "function" as const, function: { name: "getUpcomingAssignments", description: "List incomplete assignments due in the next 14 days.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function" as const, function: { name: "getOverdueAssignments", description: "List incomplete overdue assignments.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function" as const, function: { name: "createAssignment", description: "Create a new assignment after extracting a clear title and course.", parameters: { type: "object", properties: { courseId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, dueDate: { type: "string", description: "YYYY-MM-DD" }, priority: { type: "string", enum: ["low", "medium", "high"] }, estimatedHours: { type: "number" } }, required: ["courseId", "title"], additionalProperties: false } } },
  { type: "function" as const, function: { name: "updateAssignment", description: "Update fields of an existing assignment owned by the student.", parameters: { type: "object", properties: { assignmentId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, dueDate: { type: "string" }, status: { type: "string", enum: ["not_started", "in_progress", "completed"] }, priority: { type: "string", enum: ["low", "medium", "high"] }, estimatedHours: { type: "number" } }, required: ["assignmentId"], additionalProperties: false } } },
  { type: "function" as const, function: { name: "markAssignmentComplete", description: "Mark an owned assignment complete.", parameters: { type: "object", properties: { assignmentId: { type: "string" } }, required: ["assignmentId"], additionalProperties: false } } },
  { type: "function" as const, function: { name: "createStudyPlan", description: "Create a simple plan from the student's incomplete assignments.", parameters: { type: "object", properties: { days: { type: "number" }, title: { type: "string" } }, additionalProperties: false } } },
  { type: "function" as const, function: { name: "searchCourseDocuments", description: "Search the student's uploaded course documents for relevant passages.", parameters: { type: "object", properties: { query: { type: "string" }, courseId: { type: "string" } }, required: ["query"], additionalProperties: false } } },
];

function nullable(value: string | undefined) {
  return value?.trim() || null;
}

export async function executeAssistantTool(context: ToolContext, name: string, rawArguments: unknown) {
  const { supabase, user } = context;
  switch (name) {
    case "getCourses": {
      const { data, error } = await supabase.from("courses").select("id, name, course_code, semester").eq("user_id", user.id).order("name");
      if (error) throw new ApiError(error.message, 500);
      return data ?? [];
    }
    case "getAssignments": {
      const args = z.object({ courseId: idSchema.optional() }).parse(rawArguments);
      let query = supabase.from("assignments").select("id, title, due_date, status, priority, estimated_hours, courses(name, course_code)").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false });
      if (args.courseId) query = query.eq("course_id", args.courseId);
      const { data, error } = await query;
      if (error) throw new ApiError(error.message, 500);
      return data ?? [];
    }
    case "getUpcomingAssignments": {
      const today = formatISO(new Date(), { representation: "date" });
      const end = formatISO(addDays(new Date(), 14), { representation: "date" });
      const { data, error } = await supabase.from("assignments").select("id, title, due_date, priority, estimated_hours, courses(name, course_code)").eq("user_id", user.id).neq("status", "completed").gte("due_date", today).lte("due_date", end).order("due_date");
      if (error) throw new ApiError(error.message, 500);
      return data ?? [];
    }
    case "getOverdueAssignments": {
      const today = formatISO(new Date(), { representation: "date" });
      const { data, error } = await supabase.from("assignments").select("id, title, due_date, priority, courses(name, course_code)").eq("user_id", user.id).neq("status", "completed").lt("due_date", today).order("due_date");
      if (error) throw new ApiError(error.message, 500);
      return data ?? [];
    }
    case "createAssignment": {
      const args = assignmentSchema.parse(rawArguments);
      const { data, error } = await supabase.from("assignments").insert({
        user_id: user.id, course_id: args.courseId, title: args.title, description: nullable(args.description), due_date: args.dueDate || null,
        status: args.status, priority: args.priority, estimated_hours: args.estimatedHours ?? null,
      }).select("id, title, due_date, status, priority").single();
      if (error) throw new ApiError(error.message, 400);
      return { created: data };
    }
    case "updateAssignment": {
      const args = assignmentPatchSchema.extend({ assignmentId: idSchema }).parse(rawArguments);
      const patch = {
        title: args.title,
        description: args.description === undefined ? undefined : nullable(args.description),
        due_date: args.dueDate === undefined ? undefined : args.dueDate || null,
        status: args.status,
        priority: args.priority,
        estimated_hours: args.estimatedHours,
        completed_at: args.status === "completed" ? new Date().toISOString() : args.status ? null : undefined,
      };
      const { data, error } = await supabase.from("assignments").update(patch).eq("id", args.assignmentId).eq("user_id", user.id).select("id, title, due_date, status, priority").single();
      if (error) throw new ApiError("Assignment not found or update was not permitted.", 404);
      return { updated: data };
    }
    case "markAssignmentComplete": {
      const args = assignmentLookupSchema.parse(rawArguments);
      const { data, error } = await supabase.from("assignments").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", args.assignmentId).eq("user_id", user.id).select("id, title, status").single();
      if (error) throw new ApiError("Assignment not found or update was not permitted.", 404);
      return { completed: data };
    }
    case "createStudyPlan": {
      const args = createStudyPlanSchema.parse(rawArguments);
      const start = new Date();
      const { data: assignments, error } = await supabase.from("assignments").select("id, title, due_date, estimated_hours, priority").eq("user_id", user.id).neq("status", "completed").order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw new ApiError(error.message, 500);
      const end = addDays(start, args.days - 1);
      const days = Array.from({ length: args.days }, (_, index) => ({ date: formatISO(addDays(start, index), { representation: "date" }), focus: "Focused study", sessions: [] as unknown[] }));
      for (const [index, assignment] of (assignments ?? []).entries()) {
        const day = days[index % days.length];
        day.sessions.push({ assignmentId: assignment.id, title: assignment.title, durationMinutes: Math.min(180, Math.max(30, Number(assignment.estimated_hours ?? 1) * 60)), rationale: "Scheduled from your open assignment list." });
      }
      const plan = { summary: "A practical first-pass plan based only on your open assignments.", days };
      const { data, error: insertError } = await supabase.from("study_plans").insert({ user_id: user.id, title: args.title ?? `Study plan for ${formatISO(start, { representation: "date" })}`, start_date: formatISO(start, { representation: "date" }), end_date: formatISO(end, { representation: "date" }), plan }).select("id, title, start_date, end_date").single();
      if (insertError) throw new ApiError(insertError.message, 500);
      return { created: data };
    }
    case "searchCourseDocuments": {
      const args = searchDocumentsSchema.parse(rawArguments);
      const { chunks } = await retrieveRelevantChunks(supabase, args.query, { courseId: args.courseId });
      return chunks.slice(0, 5).map((chunk) => ({ documentName: chunk.documentName, pageNumber: chunk.pageNumber, content: chunk.content.slice(0, 700) }));
    }
    default:
      throw new ApiError("That tool is not available.", 400);
  }
}
