"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpenCheck, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isSignup = mode === "signup";
  async function submit(formData: FormData) {
    setError(null); setNotice(null); setPending(true);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();
    if (!email || !password || (isSignup && !fullName)) { setError("Complete the required fields."); setPending(false); return; }
    const supabase = createSupabaseBrowserClient();
    if (isSignup) {
      const { data, error: signupError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (signupError) setError(signupError.message);
      else if (data.session) { router.replace("/dashboard"); router.refresh(); }
      else setNotice("Check your email to confirm your account, then sign in.");
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) setError(loginError.message);
      else { router.replace("/dashboard"); router.refresh(); }
    }
    setPending(false);
  }
  return <main className="grid min-h-screen place-items-center bg-[#f6f8f5] px-5 py-10"><div className="w-full max-w-md"><Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold"><span className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white"><BookOpenCheck size={18} /></span>StudyOS</Link><section className="card p-6 shadow-sm sm:p-8"><p className="text-sm font-medium text-emerald-700">{isSignup ? "Create your workspace" : "Welcome back"}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{isSignup ? "Start studying with more clarity." : "Pick up where you left off."}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{isSignup ? "Your courses, documents, and AI work stay private to your account." : "Sign in to your private academic workspace."}</p><form action={submit} className="mt-6 space-y-4">{isSignup && <label><span className="label">Full name</span><input className="field" name="fullName" autoComplete="name" required /></label>}<label><span className="label">Email</span><input className="field" name="email" type="email" autoComplete="email" required /></label><label><span className="label">Password</span><input className="field" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required /><span className="mt-1 block text-xs text-slate-500">At least 8 characters.</span></label>{error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}<Button type="submit" className="w-full" disabled={pending}>{pending && <LoaderCircle className="animate-spin" size={16} />}{isSignup ? "Create account" : "Sign in"}</Button></form><p className="mt-5 text-center text-sm text-slate-600">{isSignup ? "Already have an account?" : "New to StudyOS?"} <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create one"}</Link></p></section></div></main>;
}
