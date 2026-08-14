import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentManager } from "@/components/documents/document-manager";
import type { Course, StudyDocument } from "@/types/domain";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ course?: string | string[] }> }) {
  const { course } = await searchParams; const selectedCourseId = typeof course === "string" ? course : undefined; const { user, supabase } = await requireUser();
  const [{ data: documents }, { data: courses }] = await Promise.all([supabase.from("documents").select("*, courses(name, course_code)").eq("user_id", user.id).order("created_at", { ascending: false }), supabase.from("courses").select("*").eq("user_id", user.id).order("name")]);
  return <><PageHeader eyebrow="Knowledge base" title="Your course material" description="Upload private PDFs, then StudyOS extracts page-aware chunks and generates embeddings for grounded study support." /><DocumentManager initialDocuments={(documents ?? []) as StudyDocument[]} courses={(courses ?? []) as Course[]} selectedCourseId={selectedCourseId} /></>;
}
