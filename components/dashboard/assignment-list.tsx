"use client";

import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { format, isPast } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Assignment } from "@/types/domain";

export function AssignmentList({ initialAssignments, compact = false }: { initialAssignments: Assignment[]; compact?: boolean }) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [busyId, setBusyId] = useState<string | null>(null);
  async function toggle(assignment: Assignment) {
    setBusyId(assignment.id);
    const status = assignment.status === "completed" ? "not_started" : "completed";
    const response = await fetch(`/api/assignments/${assignment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) { const { assignment: updated } = await response.json(); setAssignments((items) => items.map((item) => item.id === updated.id ? updated : item)); }
    setBusyId(null);
  }
  if (!assignments.length) return <p className="py-6 text-sm text-slate-500">Nothing due here — enjoy the breathing room.</p>;
  return <div className="divide-y divide-slate-100">{assignments.slice(0, compact ? 5 : undefined).map((assignment) => { const overdue = assignment.due_date && assignment.status !== "completed" && isPast(new Date(`${assignment.due_date}T23:59:59`)); return <div key={assignment.id} className="flex items-center gap-3 py-3"><button disabled={busyId === assignment.id} onClick={() => toggle(assignment)} aria-label={assignment.status === "completed" ? `Reopen ${assignment.title}` : `Complete ${assignment.title}`} className="grid size-6 shrink-0 place-items-center rounded-full border border-slate-300 text-white hover:border-emerald-500">{assignment.status === "completed" && <Check size={14} className="rounded-full bg-emerald-600" />}{assignment.status !== "completed" && <Circle size={10} className="text-transparent" />}</button><div className="min-w-0 flex-1"><p className={assignment.status === "completed" ? "truncate text-sm text-slate-400 line-through" : "truncate text-sm font-medium text-slate-800"}>{assignment.title}</p><p className="mt-0.5 text-xs text-slate-500">{assignment.courses?.course_code ?? assignment.courses?.name ?? "Course"}{assignment.due_date && ` · ${overdue ? "Overdue" : `Due ${format(new Date(`${assignment.due_date}T12:00:00`), "MMM d")}`}`}</p></div><StatusBadge value={assignment.priority} /></div>; })}</div>;
}
