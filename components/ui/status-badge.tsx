import { cn } from "@/lib/utils";

export function StatusBadge({ value }: { value: string }) {
  const color = value === "completed" || value === "ready" ? "bg-emerald-50 text-emerald-700" : value === "failed" || value === "high" ? "bg-rose-50 text-rose-700" : value === "in_progress" || value === "processing" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", color)}>{value.replaceAll("_", " ")}</span>;
}
