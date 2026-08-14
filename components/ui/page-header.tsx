import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-2 text-sm font-medium text-emerald-700">{eyebrow}</p>}<h1 className="text-3xl font-semibold tracking-[-.035em] text-slate-950">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p></div>{actions && <div className="shrink-0">{actions}</div>}</div>;
}
