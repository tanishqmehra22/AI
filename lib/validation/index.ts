import { z } from "zod";
import { assignmentStatuses, difficulties, priorities } from "@/lib/constants";

const nullableText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
export const idSchema = z.uuid("Use a valid record ID.");

export const courseSchema = z.object({
  name: z.string().trim().min(2, "Course name must be at least 2 characters.").max(120),
  courseCode: nullableText(24),
  professor: nullableText(120),
  semester: nullableText(80),
  description: nullableText(1_000),
});

export const assignmentSchema = z.object({
  courseId: idSchema,
  title: z.string().trim().min(2, "Assignment title must be at least 2 characters.").max(160),
  description: nullableText(2_000),
  dueDate: z.string().date().optional().or(z.literal("")),
  status: z.enum(assignmentStatuses).default("not_started"),
  priority: z.enum(priorities).default("medium"),
  estimatedHours: z.coerce.number().min(0).max(300).optional().nullable(),
});

export const assignmentPatchSchema = assignmentSchema.partial().extend({
  completedAt: z.string().datetime().nullable().optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  conversationId: idSchema.optional(),
  courseId: idSchema.optional(),
  documentId: idSchema.optional(),
});

export const flashcardRequestSchema = z.object({
  courseId: idSchema.optional(),
  documentId: idSchema.optional(),
  count: z.coerce.number().int().min(3).max(30).default(10),
  difficulty: z.enum(difficulties).default("medium"),
});

export const flashcardOutputSchema = z.object({
  flashcards: z.array(z.object({
    question: z.string().min(4).max(500),
    answer: z.string().min(4).max(1_500),
    difficulty: z.enum(difficulties),
  })).min(1).max(30),
});

export const studyPlanRequestSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  title: z.string().trim().min(2).max(120).optional(),
});

export const studyPlanOutputSchema = z.object({
  summary: z.string().min(10).max(1_000),
  days: z.array(z.object({
    date: z.string().date(),
    focus: z.string().min(2).max(120),
    sessions: z.array(z.object({
      assignmentId: idSchema,
      title: z.string().min(2).max(160),
      durationMinutes: z.number().int().min(15).max(480),
      rationale: z.string().min(4).max(300),
    })).max(8),
  })).min(1).max(14),
});

export const agentRequestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}
