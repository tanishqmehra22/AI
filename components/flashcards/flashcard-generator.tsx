"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, LoaderCircle, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Course, Difficulty, FlashcardSet, StudyDocument } from "@/types/domain";

export function FlashcardGenerator({ courses, documents, initialSets }: { courses: Course[]; documents: StudyDocument[]; initialSets: FlashcardSet[] }) {
  const [courseId, setCourseId] = useState(""); const [documentId, setDocumentId] = useState(""); const [count, setCount] = useState("10"); const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [sets, setSets] = useState(initialSets);
  const [activeId, setActiveId] = useState<string | null>(initialSets[0]?.id ?? null);
  const [index, setIndex] = useState(0); const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const readyDocs = useMemo(() => documents.filter((document) => document.processing_status === "ready" && (!courseId || document.course_id === courseId)), [documents, courseId]);
  const activeSet = sets.find((set) => set.id === activeId) ?? null;
  const cards = activeSet?.flashcards ?? [];
  const card = cards[index];

  function openSet(setId: string) { setActiveId(setId); setIndex(0); setRevealed(false); }

  async function generate() {
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/flashcards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: courseId || undefined, documentId: documentId || undefined, count: Number(count), difficulty }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setError(body.error ?? "Flashcards could not be created."); return; }
      const created: FlashcardSet = { id: body.set.id, title: body.set.title, created_at: new Date().toISOString(), flashcards: body.flashcards };
      setSets((items) => [created, ...items]);
      openSet(created.id);
    } finally { setPending(false); }
  }

  async function removeSet(set: FlashcardSet) {
    setDeletingId(set.id); setError(null);
    try {
      const response = await fetch(`/api/flashcards/${set.id}`, { method: "DELETE" });
      if (!response.ok) { setError("Unable to delete this deck."); return; }
      setSets((items) => {
        const next = items.filter((item) => item.id !== set.id);
        if (activeId === set.id) { setActiveId(next[0]?.id ?? null); setIndex(0); setRevealed(false); }
        return next;
      });
    } finally { setDeletingId(null); }
  }

  return <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
    <div className="space-y-4">
      <form onSubmit={(event) => { event.preventDefault(); void generate(); }} className="card h-fit space-y-4 p-5">
        <div><h2 className="font-semibold">Build a deck</h2><p className="mt-1 text-sm leading-6 text-slate-500">Generated cards are grounded in the selected material and saved to your workspace.</p></div>
        <label><span className="label">Course</span><select className="field" value={courseId} onChange={(event) => { setCourseId(event.target.value); setDocumentId(""); }}><option value="">Any course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.course_code ?? course.name}</option>)}</select></label>
        <label><span className="label">Document</span><select className="field" value={documentId} onChange={(event) => setDocumentId(event.target.value)}><option value="">All ready material</option>{readyDocs.map((document) => <option key={document.id} value={document.id}>{document.original_filename}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="label">Cards</span><select className="field" value={count} onChange={(event) => setCount(event.target.value)}><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option></select></label>
          <label><span className="label">Difficulty</span><select className="field" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <Button className="w-full" disabled={pending || (!courseId && !documentId)} type="submit">{pending ? <><LoaderCircle size={16} className="animate-spin" />Generating…</> : <><Sparkles size={16} />Generate flashcards</>}</Button>
      </form>
      <div className="card p-4">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Saved decks</p>
        <div className="mt-2 space-y-1">{sets.length ? sets.map((set) => <div key={set.id} className={`group flex items-center gap-1 rounded-lg ${set.id === activeId ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
          <button onClick={() => openSet(set.id)} className={`min-w-0 flex-1 px-2.5 py-2 text-left text-sm ${set.id === activeId ? "font-medium text-emerald-800" : "text-slate-600"}`}>
            <span className="block truncate">{set.title}</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-400">{set.flashcards.length} cards · {new Date(set.created_at).toLocaleDateString()}</span>
          </button>
          <button onClick={() => removeSet(set)} disabled={deletingId === set.id} aria-label={`Delete ${set.title}`} className="mr-1 shrink-0 rounded-lg p-1.5 text-slate-400 opacity-100 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100">{deletingId === set.id ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}</button>
        </div>) : <p className="px-2.5 py-2 text-xs text-slate-400">Decks you generate are saved here.</p>}</div>
      </div>
    </div>
    <section>{card ? <div className="card min-h-96 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><span className="text-sm font-medium text-slate-600">Card {index + 1} of {cards.length}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{card.difficulty}</span></div>
      <button onClick={() => setRevealed((value) => !value)} className="flex min-h-64 w-full flex-col items-center justify-center px-8 text-center"><span className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">{revealed ? "Answer" : "Question"}</span><p className="mt-5 max-w-2xl text-xl font-medium leading-8 text-slate-800">{revealed ? card.answer : card.question}</p><span className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500">{revealed ? <EyeOff size={16} /> : <Eye size={16} />}{revealed ? "Hide answer" : "Reveal answer"}</span></button>
      <div className="flex justify-between border-t border-slate-100 p-4"><Button variant="secondary" disabled={index === 0} onClick={() => { setIndex((value) => value - 1); setRevealed(false); }}><ChevronLeft size={16} />Previous</Button><Button variant="secondary" disabled={index === cards.length - 1} onClick={() => { setIndex((value) => value + 1); setRevealed(false); }}>Next<ChevronRight size={16} /></Button></div>
    </div> : <EmptyState title="Create a focused review deck" copy="Choose a course or a processed document to turn the important concepts into usable flashcards." />}</section>
  </div>;
}
