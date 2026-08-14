"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function Topbar({ email }: { email: string }) {
  const router = useRouter();
  async function signOut() { await createSupabaseBrowserClient().auth.signOut(); router.replace("/"); router.refresh(); }
  return <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-[#f6f8f5] px-5 py-3 lg:px-10"><span className="hidden max-w-48 truncate text-sm text-slate-500 sm:block">{email}</span><button aria-label="Sign out" onClick={signOut} className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><LogOut size={16} /></button></header>;
}
