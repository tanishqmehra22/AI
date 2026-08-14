export interface EvalCase {
  id: string;
  question: string;
  expectedSource: string;
  expectedConcepts: string[];
  expectedTool?: string;
  retrievedChunks: { document: string; content: string }[];
  generatedAnswer: string;
}

const avl = "AVL rotations rebalance a node when its balance factor becomes outside -1 through 1. LL uses a right rotation; RR uses a left rotation.";
const db = "Third normal form removes transitive dependencies. A relation in BCNF requires every determinant to be a candidate key.";
const sql = "A transaction is atomic, consistent, isolated, and durable. Isolation prevents concurrent transactions from exposing intermediate state.";
type RawCase = readonly [string, string, string, string[], string | undefined, string, string];
const cases: readonly RawCase[] = [
  ["rag-01", "When do I use a right rotation?", "Lecture 6 — Balanced Trees", ["right rotation", "LL"], undefined, avl, "Use a right rotation for an LL imbalance in an AVL tree."],
  ["rag-02", "What does a balance factor measure?", "Lecture 6 — Balanced Trees", ["balance factor", "-1", "1"], undefined, avl, "The balance factor identifies whether a node is outside the allowed -1 to 1 range."],
  ["rag-03", "What is 3NF designed to remove?", "Lecture 3 — Normalization", ["third normal form", "transitive"], undefined, db, "Third normal form removes transitive dependencies."],
  ["rag-04", "What makes a relation BCNF?", "Lecture 3 — Normalization", ["determinant", "candidate key"], undefined, db, "In BCNF, every determinant must be a candidate key."],
  ["rag-05", "What does the I in ACID mean?", "Lecture 4 — Transactions", ["isolation", "concurrent"], undefined, sql, "Isolation prevents concurrent transactions from exposing intermediate state."],
  ["rag-06", "Define atomicity.", "Lecture 4 — Transactions", ["atomic"], undefined, sql, "Atomicity is one of the ACID transaction properties."],
  ["rag-07", "How does an RR imbalance get fixed?", "Lecture 6 — Balanced Trees", ["RR", "left rotation"], undefined, avl, "An RR imbalance is fixed with a left rotation."],
  ["rag-08", "Do the notes explain B-trees?", "Lecture 6 — Balanced Trees", ["not", "notes"], undefined, avl, "The supplied notes do not contain enough information about B-trees."],
  ["tool-01", "Add my CS 146 homework due Friday.", "Tool: createAssignment", [], "createAssignment", "course match: CS 146", "I created the homework assignment in CS 146."],
  ["tool-02", "Mark my database homework complete.", "Tool: markAssignmentComplete", [], "markAssignmentComplete", "assignment match: database homework", "I marked database homework complete."],
  ["tool-03", "What is due in the next two weeks?", "Tool: getUpcomingAssignments", [], "getUpcomingAssignments", "upcoming assignments", "Here are the open assignments due in the next two weeks."],
  ["tool-04", "Show my overdue work.", "Tool: getOverdueAssignments", [], "getOverdueAssignments", "overdue assignments", "Here is your overdue work."],
  ["tool-05", "List my courses.", "Tool: getCourses", [], "getCourses", "CS 146, CS 157A", "You have CS 146 and CS 157A."],
  ["tool-06", "Find lecture material about normalization.", "Tool: searchCourseDocuments", [], "searchCourseDocuments", db, "I found a passage about third normal form and BCNF."],
  ["tool-07", "Make a seven-day plan for my remaining work.", "Tool: createStudyPlan", [], "createStudyPlan", "open assignments", "I created a seven-day plan from your open assignments."],
] as const;

export const evalCases: EvalCase[] = cases.map(([id, question, expectedSource, expectedConcepts, expectedTool, content, generatedAnswer]) => ({ id, question, expectedSource, expectedConcepts, expectedTool, retrievedChunks: [{ document: expectedSource, content }], generatedAnswer }));
