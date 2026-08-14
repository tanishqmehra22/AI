import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; children: ReactNode }) {
  const styles = { primary: "bg-emerald-600 text-white hover:bg-emerald-700", secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50", danger: "bg-rose-600 text-white hover:bg-rose-700", ghost: "text-slate-600 hover:bg-slate-100" };
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50", styles[variant], className)} {...props}>{children}</button>;
}
