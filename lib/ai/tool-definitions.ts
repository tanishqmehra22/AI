import type { FunctionDeclaration } from "@google/genai";

// Declarations only — the schema the model sees. Execution lives in
// `@/lib/ai/tools`, which is server-only because it authorizes and runs each
// action. Keeping the declarations separate lets the evaluation harness assert
// tool routing without pulling in server modules.
export const assistantTools: FunctionDeclaration[] = [
  { name: "getCourses", description: "List the student's courses.", parametersJsonSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "getAssignments", description: "List the student's assignments.", parametersJsonSchema: { type: "object", properties: { courseId: { type: "string" } }, additionalProperties: false } },
  { name: "getUpcomingAssignments", description: "List incomplete assignments due in the next 14 days.", parametersJsonSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "getOverdueAssignments", description: "List incomplete overdue assignments.", parametersJsonSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "createAssignment", description: "Create a new assignment after extracting a clear title and course.", parametersJsonSchema: { type: "object", properties: { courseId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, dueDate: { type: "string", description: "YYYY-MM-DD" }, priority: { type: "string", enum: ["low", "medium", "high"] }, estimatedHours: { type: "number" } }, required: ["courseId", "title"], additionalProperties: false } },
  { name: "updateAssignment", description: "Update fields of an existing assignment owned by the student.", parametersJsonSchema: { type: "object", properties: { assignmentId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, dueDate: { type: "string" }, status: { type: "string", enum: ["not_started", "in_progress", "completed"] }, priority: { type: "string", enum: ["low", "medium", "high"] }, estimatedHours: { type: "number" } }, required: ["assignmentId"], additionalProperties: false } },
  { name: "markAssignmentComplete", description: "Mark an owned assignment complete.", parametersJsonSchema: { type: "object", properties: { assignmentId: { type: "string" } }, required: ["assignmentId"], additionalProperties: false } },
  { name: "createStudyPlan", description: "Create a simple plan from the student's incomplete assignments.", parametersJsonSchema: { type: "object", properties: { days: { type: "number" }, title: { type: "string" } }, additionalProperties: false } },
  { name: "searchCourseDocuments", description: "Search the student's uploaded course documents for relevant passages.", parametersJsonSchema: { type: "object", properties: { query: { type: "string" }, courseId: { type: "string" } }, required: ["query"], additionalProperties: false } },
];
