"use client";

import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Clock3, XCircle } from "lucide-react";

type Usage = { total: number; successful: number; failed: number; averageLatencyMs: number; byFeature: { feature: string; count: number }[] };
export function UsageMetrics() {
  const [usage, setUsage] = useState<Usage | null>(null); const [error, setError] = useState(false);
  useEffect(() => { fetch("/api/usage").then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Usage>; }).then(setUsage).catch(() => setError(true)); }, []);
  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Usage metrics could not be loaded right now.</p>;
  if (!usage) return <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
  const cards = [{ label: "AI requests", value: usage.total, icon: BarChart3, color: "text-slate-700" }, { label: "Successful", value: usage.successful, icon: CheckCircle2, color: "text-emerald-700" }, { label: "Failed", value: usage.failed, icon: XCircle, color: "text-rose-700" }, { label: "Average latency", value: usage.averageLatencyMs ? `${(usage.averageLatencyMs / 1000).toFixed(1)}s` : "—", icon: Clock3, color: "text-amber-700" }];
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, color }) => <div key={label} className="card p-5"><Icon className={color} size={19} /><p className="mt-5 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>)}</div><div className="card p-5"><h2 className="font-semibold">Usage by feature</h2><div className="mt-4 space-y-3">{usage.byFeature.length ? usage.byFeature.map(({ feature, count }) => <div key={feature} className="grid grid-cols-[130px_1fr_32px] items-center gap-3 text-sm"><span className="capitalize text-slate-600">{feature.replaceAll("_", " ")}</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(8, (count / usage.total) * 100)}%` }} /></div><span className="text-right font-medium">{count}</span></div>) : <p className="text-sm text-slate-500">AI calls will appear here after you use a feature.</p>}</div></div></div>;
}
