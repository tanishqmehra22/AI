"use client";

import { useRef, useState } from "react";
import { FileUp, LoaderCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { supportedDocumentAccept } from "@/lib/documents/formats";
import type { Course, StudyDocument } from "@/types/domain";

type UploadResponse = { document?: StudyDocument; documents?: StudyDocument[]; failures?: string[]; error?: string };

export function DocumentManager({ initialDocuments, courses, selectedCourseId }: { initialDocuments: StudyDocument[]; courses: Course[]; selectedCourseId?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [documents, setDocuments] = useState(initialDocuments);
  const [pending, setPending] = useState(false);
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function upload(formData: FormData) {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: formData });
      const body = await response.json().catch(() => ({})) as UploadResponse;
      if (!response.ok) {
        setError(body.error ?? "Upload failed.");
        return;
      }

      const uploaded = body.documents ?? (body.document ? [body.document] : []);
      if (uploaded.length) {
        const ids = new Set(uploaded.map((document) => document.id));
        setDocuments((items) => [...uploaded, ...items.filter((item) => !ids.has(item.id))]);
      }
      formRef.current?.reset();
      setSelectedFileCount(0);

      const readyCount = uploaded.filter((document) => document.processing_status === "ready").length;
      if (readyCount) setNotice(`${readyCount} ${readyCount === 1 ? "file is" : "files are"} ready for grounded questions and flashcards.`);
      if (body.failures?.length) setError(`${body.failures.length} ${body.failures.length === 1 ? "file needs" : "files need"} attention: ${body.failures[0]}`);
    } finally {
      setPending(false);
    }
  }

  async function confirmRemove(document: StudyDocument) {
    setDeletingId(document.id);
    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
      if (response.ok) setDocuments((items) => items.filter((item) => item.id !== document.id));
      else setError("Unable to delete this document.");
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  const uploadLabel = selectedFileCount > 1 ? `Upload ${selectedFileCount} files` : "Upload file";

  return <div className="space-y-6"><form ref={formRef} action={upload} className="card grid gap-4 p-5 lg:grid-cols-[1fr_240px_auto]"><label><span className="label">Study files</span><input className="field file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-2 file:py-1 file:text-sm file:font-medium file:text-emerald-800" name="file" type="file" accept={supportedDocumentAccept} multiple required onChange={(event) => setSelectedFileCount(event.currentTarget.files?.length ?? 0)} /></label><label><span className="label">Associate with course</span><select className="field" name="courseId" defaultValue={selectedCourseId ?? ""}><option value="">No course selected</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.course_code ? `${course.course_code} — ` : ""}{course.name}</option>)}</select></label><div className="flex items-end"><Button className="w-full" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" size={16} />Processing…</> : <><FileUp size={16} />{uploadLabel}</>}</Button></div><p className="text-xs leading-5 text-slate-500 lg:col-span-3">Select up to 10 files at once: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx/.xls), CSV, text, or Markdown · 15 MB maximum per file · files stay private to your account.</p></form>{error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}{documents.length ? <div className="card overflow-hidden"><div className="hidden grid-cols-[minmax(0,1.5fr)_1fr_.7fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"><span>Document</span><span>Course</span><span>Status</span><span /></div>{documents.map((document) => <div key={document.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-[minmax(0,1.5fr)_1fr_.7fr_auto] md:items-center md:gap-4"><div><p className="truncate text-sm font-medium text-slate-800">{document.original_filename}</p><p className="mt-1 text-xs text-slate-500">{Math.max(1, Math.round(document.file_size / 1024))} KB · Uploaded {new Date(document.created_at).toLocaleDateString()}</p>{document.processing_error && <p className="mt-1 text-xs text-rose-600">{document.processing_error}</p>}</div><span className="text-sm text-slate-600">{document.courses?.course_code ?? document.courses?.name ?? "Unassigned"}</span><span><StatusBadge value={document.processing_status} /></span>{confirmingId === document.id ? <div className="flex items-center justify-self-end gap-2"><button onClick={() => confirmRemove(document)} disabled={deletingId === document.id} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60">{deletingId === document.id ? "Deleting…" : "Confirm delete"}</button><button onClick={() => setConfirmingId(null)} aria-label="Cancel delete" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={16} /></button></div> : <button onClick={() => setConfirmingId(document.id)} aria-label={`Delete ${document.original_filename}`} className="justify-self-end rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={17} /></button>}</div>)}</div> : <EmptyState title="Bring your material into StudyOS" copy="Upload notes, readings, slides, spreadsheets, syllabi, or study guides. They will become available to the grounded AI assistant." />}</div>;
}
