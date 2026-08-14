import type { ReactNode } from "react";

export function EmptyState({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="card grid min-h-48 place-items-center px-6 py-10 text-center"><div><h3 className="font-semibold text-slate-800">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{copy}</p>{action && <div className="mt-4">{action}</div>}</div></div>;
}
