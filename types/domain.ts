import type { assignmentStatuses, difficulties, documentStatuses, priorities } from "@/lib/constants";

export type AssignmentStatus = (typeof assignmentStatuses)[number];
export type Priority = (typeof priorities)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type Difficulty = (typeof difficulties)[number];

export interface Course {
  id: string;
  user_id: string;
  name: string;
  course_code: string | null;
  professor: string | null;
  semester: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: AssignmentStatus;
  priority: Priority;
  estimated_hours: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  courses?: Pick<Course, "name" | "course_code"> | null;
}

export interface StudyDocument {
  id: string;
  user_id: string;
  course_id: string | null;
  filename: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  processing_status: DocumentStatus;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
  courses?: Pick<Course, "name" | "course_code"> | null;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: Difficulty;
}

export interface FlashcardSet {
  id: string;
  title: string;
  created_at: string;
  flashcards: Flashcard[];
}

export interface Citation {
  documentId: string;
  chunkId: string;
  documentName: string;
  pageNumber: number | null;
  chunkIndex: number;
}

export interface RetrievedChunk extends Citation {
  content: string;
  similarity: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata: { citations?: Citation[]; toolCalls?: unknown[] } | null;
  created_at: string;
}
