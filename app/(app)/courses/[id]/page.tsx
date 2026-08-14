import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { AssignmentList } from "@/components/dashboard/assignment-list";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Assignment, Course, StudyDocument } from "@/types/domain";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { user, supabase } = await requireUser();
  const [{ data: course }, { data: assignments }, { data: documents }, { data: conversations }, { data: sets }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("assignments").select("*, courses(name, course_code)").eq("course_id", id).eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("documents").select("*, courses(name, course_code)").eq("course_id", id).eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("conversations").select("*").eq("course_id", id).eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
    supabase.from("flashcard_sets").select("id").eq("course_id", id).eq("user_id", user.id),
  ]);
  if (!course) notFound(); const typedCourse = course as Course;
  return <><Link href="/courses" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-emerald-700"><ArrowLeft size={16} />All courses</Link><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-sm font-semibold text-emerald-700">{typedCourse.course_code ?? "COURSE"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{typedCourse.name}</h1><p className="mt-2 text-sm text-slate-600">{typedCourse.professor ?? "Professor not added"}{typedCourse.semester && ` · ${typedCourse.semester}`}</p>{typedCourse.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{typedCourse.description}</p>}</div><div className="flex gap-2"><Link href={`/assistant?course=${id}`} className="rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-medium text-white">Ask AI</Link><Link href={`/documents?course=${id}`} className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700">Upload PDF</Link></div></div><div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><section className="card p-5"><h2 className="font-semibold">Assignments</h2><AssignmentList initialAssignments={(assignments ?? []) as Assignment[]} /></section><aside className="space-y-5"><section className="card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Documents</h2><FileText size={18} className="text-emerald-700" /></div><div className="mt-3 space-y-2">{((documents ?? []) as StudyDocument[]).map((doc) => <div key={doc.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><p className="max-w-[65%] truncate text-sm font-medium">{doc.original_filename}</p><StatusBadge value={doc.processing_status} /></div>)}{!documents?.length && <p className="text-sm text-slate-500">No material uploaded yet.</p>}</div></section><section className="card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Learning activity</h2><MessageSquare size={18} className="text-emerald-700" /></div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xl font-semibold text-emerald-900">{conversations?.length ?? 0}</p><p className="mt-1 text-xs text-emerald-800">Recent chats</p></div><div className="rounded-xl bg-slate-100 p-3"><p className="text-xl font-semibold">{sets?.length ?? 0}</p><p className="mt-1 text-xs text-slate-600">Card sets</p></div></div></section></aside></div></>;
}
