"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, ChevronRight, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Course } from "@/types/domain";

type FormValues = { name: string; courseCode: string; professor: string; semester: string; description: string };
const blank: FormValues = { name: "", courseCode: "", professor: "", semester: "", description: "" };
const toForm = (course: Course): FormValues => ({ name: course.name, courseCode: course.course_code ?? "", professor: course.professor ?? "", semester: course.semester ?? "", description: course.description ?? "" });

export function CourseManager({ initialCourses }: { initialCourses: Course[] }) {
  const [courses, setCourses] = useState(initialCourses);
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setError(null); setPending(true);
    const values = Object.fromEntries(formData) as FormValues;
    const url = editing === "new" ? "/api/courses" : `/api/courses/${editing?.id}`;
    const response = await fetch(url, { method: editing === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? "Unable to save this course.");
    else { const course = body.course as Course; setCourses((items) => editing === "new" ? [...items, course].sort((a, b) => a.name.localeCompare(b.name)) : items.map((item) => item.id === course.id ? course : item)); setEditing(null); }
    setPending(false);
  }
  async function remove(course: Course) { setDeletingId(course.id); try { const response = await fetch(`/api/courses/${course.id}`, { method: "DELETE" }); if (response.ok) setCourses((items) => items.filter((item) => item.id !== course.id)); else setError("Unable to delete this course."); } finally { setDeletingId(null); } }
  return <div className="space-y-5">{error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}<div className="flex justify-end"><Button onClick={() => { setError(null); setEditing("new"); }}><Plus size={16} />Add course</Button></div>{editing && <form action={submit} className="card grid gap-4 p-5 md:grid-cols-2"><div className="flex items-center justify-between md:col-span-2"><h2 className="font-semibold">{editing === "new" ? "New course" : `Edit ${editing.name}`}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Close form"><X size={18} /></button></div>{([ ["name", "Course name", true], ["courseCode", "Course code", false], ["professor", "Professor", false], ["semester", "Semester", false] ] as const).map(([name, label, required]) => <label key={name}><span className="label">{label}</span><input className="field" name={name} defaultValue={editing === "new" ? blank[name] : toForm(editing)[name]} required={required} /></label>)}<label className="md:col-span-2"><span className="label">Description</span><textarea className="field min-h-20" name="description" defaultValue={editing === "new" ? "" : editing.description ?? ""} /></label><div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save course"}</Button></div></form>}{courses.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <article key={course.id} className="card group p-5"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><BookOpen size={20} /></span><div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100"><button onClick={() => setEditing(course)} aria-label={`Edit ${course.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button><button onClick={() => remove(course)} disabled={deletingId === course.id} aria-label={`Delete ${course.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">{deletingId === course.id ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}</button></div></div><p className="mt-6 text-xs font-semibold tracking-wide text-emerald-700">{course.course_code ?? "COURSE"}</p><h2 className="mt-1 text-lg font-semibold tracking-tight">{course.name}</h2><p className="mt-2 h-10 text-sm text-slate-500">{course.professor ?? course.semester ?? "No course details yet"}</p><Link href={`/courses/${course.id}`} className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-medium text-slate-700 hover:text-emerald-700">Open course <ChevronRight size={16} /></Link></article>)}</div> : <EmptyState title="Start with a course" copy="Courses keep assignments, documents, flashcards, and assistant conversations organized." action={<Button onClick={() => setEditing("new")}>Add your first course</Button>} />}</div>;
}
