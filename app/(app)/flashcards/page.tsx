import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { FlashcardGenerator } from "@/components/flashcards/flashcard-generator";
import type { Course, FlashcardSet, StudyDocument } from "@/types/domain";

export default async function FlashcardsPage() {
  const { user, supabase } = await requireUser();
  const [{ data: courses }, { data: documents }, { data: sets }] = await Promise.all([
    supabase.from("courses").select("*").eq("user_id", user.id).order("name"),
    supabase.from("documents").select("*, courses(name, course_code)").eq("user_id", user.id).eq("processing_status", "ready").order("created_at", { ascending: false }),
    supabase.from("flashcard_sets").select("id, title, created_at, flashcards(id, question, answer, difficulty)").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  return <><PageHeader eyebrow="Active recall" title="Make your material stick" description="Generate structured flashcards from course material, reveal the answer when you are ready, and move through a focused review." /><FlashcardGenerator courses={(courses ?? []) as Course[]} documents={(documents ?? []) as StudyDocument[]} initialSets={(sets ?? []) as FlashcardSet[]} /></>;
}
