import Link from "next/link";
import { ArrowRight, BookOpenCheck, BrainCircuit, CalendarClock, CircleCheckBig, FileUp, ShieldCheck } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth/guards";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const highlights = [
  { icon: BrainCircuit, title: "Grounded answers", copy: "Ask questions across your course material and see the supporting sources." },
  { icon: CalendarClock, title: "A plan that fits", copy: "Turn upcoming work and estimated effort into a realistic study schedule." },
  { icon: ShieldCheck, title: "Private by design", copy: "Supabase Auth, Row Level Security, and server-side validation protect every record." },
];

export default async function Home() {
  const { user } = await getAuthenticatedUser();
  const configured = isSupabaseConfigured();
  const primaryHref = user ? "/dashboard" : configured ? "/signup" : "/setup-required";
  const primaryLabel = user ? "Open workspace" : configured ? "Get started" : "Connect services";
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f8f5] text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight"><span className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white"><BookOpenCheck size={18} /></span>StudyOS</Link>
          <Link className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" href={user ? "/dashboard" : configured ? "/login" : "/setup-required"}>{user ? "Open workspace" : configured ? "Sign in" : "Set up StudyOS"}</Link>
        </nav>
        <section className="grid items-center gap-12 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">Your academic command center</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-6xl">Study with a system that remembers what matters.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">StudyOS brings assignments, course material, and an evidence-grounded AI assistant into one calm workspace.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href={primaryHref} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 font-medium text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">{primaryLabel} <ArrowRight size={17} /></Link><a href="#how-it-works" className="rounded-full border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:border-slate-400">See how it works</a></div>
          </div>
          <div className="relative rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(15,23,42,.35)]">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-sm text-slate-500">Your private academic workspace</p><h2 className="text-xl font-semibold">Start with your own material</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">No sample data</span></div>
            <div className="space-y-3"><div className="rounded-2xl bg-slate-950 p-4 text-white"><p className="text-sm text-slate-300">1. Add your classes</p><p className="mt-1 font-medium">Keep course work in one organized place.</p><div className="mt-4 flex items-center gap-2 text-sm text-emerald-300"><CircleCheckBig size={15} />You control every record</div></div><div className="flex items-center justify-between rounded-2xl border border-slate-100 p-4"><div><p className="font-medium">2. Upload your PDFs and notes</p><p className="mt-1 text-sm text-slate-500">Your material powers cited answers and flashcards.</p></div><FileUp className="text-emerald-600" /></div><div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950"><span className="font-semibold">3. Add real deadlines:</span> Your dashboard stays empty until you add your own assignments.</div></div>
          </div>
        </section>
        <section id="how-it-works" className="grid gap-4 border-t border-slate-200 py-12 md:grid-cols-3">{highlights.map(({ icon: Icon, title, copy }) => <article key={title} className="rounded-2xl bg-white p-5"><Icon className="mb-4 text-emerald-600" size={22} /><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></article>)}</section>
      </div>
    </main>
  );
}
