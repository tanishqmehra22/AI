// Golden evaluation cases. Expected values only — retrieved chunks and answers
// are produced live by the harness in `run.ts`, never stored here.

export interface RagCase {
  id: string;
  question: string;
  /** Document the top-ranked chunk should come from. */
  expectedSource: string;
  /** Substrings the grounded answer should contain (case-insensitive). */
  expectedConcepts: string[];
}

export interface RefusalCase {
  id: string;
  question: string;
  /** The corpus has no material on this, so the answer must decline. */
  reason: string;
}

export interface ToolCase {
  id: string;
  message: string;
  expectedTool: string;
  /** Argument names the call must include. */
  expectedArgs?: string[];
}

export const ragCases: RagCase[] = [
  { id: "rag-01", question: "When do I use a right rotation?", expectedSource: "Lecture 6 — Balanced Trees", expectedConcepts: ["right rotation", "LL"] },
  { id: "rag-02", question: "What does a balance factor measure?", expectedSource: "Lecture 6 — Balanced Trees", expectedConcepts: ["balance factor", "height"] },
  { id: "rag-03", question: "How many rotations does an LR imbalance need?", expectedSource: "Lecture 6 — Balanced Trees", expectedConcepts: ["two"] },
  { id: "rag-04", question: "What is third normal form designed to remove?", expectedSource: "Lecture 3 — Normalization", expectedConcepts: ["transitive"] },
  { id: "rag-05", question: "What makes a relation BCNF?", expectedSource: "Lecture 3 — Normalization", expectedConcepts: ["determinant", "candidate key"] },
  { id: "rag-06", question: "What does the I in ACID stand for?", expectedSource: "Lecture 4 — Transactions", expectedConcepts: ["isolation"] },
  { id: "rag-07", question: "Define atomicity for a transaction.", expectedSource: "Lecture 4 — Transactions", expectedConcepts: ["atomicity"] },
  { id: "rag-08", question: "How does separate chaining handle collisions?", expectedSource: "Lecture 9 — Hashing", expectedConcepts: ["linked list", "bucket"] },
];

export const refusalCases: RefusalCase[] = [
  { id: "ground-01", question: "What do my notes say about Dijkstra's shortest path algorithm?", reason: "no graph-algorithm material in the corpus" },
  { id: "ground-02", question: "According to my notes, what is the capital of Portugal?", reason: "unrelated to any uploaded course material" },
];

export const toolCases: ToolCase[] = [
  { id: "tool-01", message: "Add a CS 146 assignment called Heap homework due 2026-09-04.", expectedTool: "createAssignment", expectedArgs: ["title", "courseId"] },
  { id: "tool-02", message: "Mark my database homework complete.", expectedTool: "markAssignmentComplete", expectedArgs: ["assignmentId"] },
  { id: "tool-03", message: "What is due in the next two weeks?", expectedTool: "getUpcomingAssignments" },
  { id: "tool-04", message: "Show my overdue work.", expectedTool: "getOverdueAssignments" },
  { id: "tool-05", message: "List my courses.", expectedTool: "getCourses" },
  { id: "tool-06", message: "Find lecture material about normalization.", expectedTool: "searchCourseDocuments", expectedArgs: ["query"] },
  { id: "tool-07", message: "Make a seven-day plan for my remaining work.", expectedTool: "createStudyPlan" },
];
