import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { UsageMetrics } from "@/components/settings/usage-metrics";

export default async function SettingsPage() {
  const { user, supabase } = await requireUser(); const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return <><PageHeader eyebrow="Account & observability" title="Settings" description="Your AI usage statistics are private to your account. They help you understand reliability and performance without logging document contents." /><div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><section className="card p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck size={20} /></span><div><h2 className="font-semibold">Private workspace</h2><p className="text-sm text-slate-500">Signed in with Supabase Auth</p></div></div><dl className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm"><div><dt className="text-slate-500">Name</dt><dd className="mt-1 font-medium">{profile?.full_name || "Not provided"}</dd></div><div><dt className="text-slate-500">Email</dt><dd className="mt-1 font-medium">{user.email}</dd></div></dl><p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">All application tables use Row Level Security. APIs also identify the authenticated user and filter ownership server-side before any read or mutation.</p></section><section><UsageMetrics /></section></div></>;
}
