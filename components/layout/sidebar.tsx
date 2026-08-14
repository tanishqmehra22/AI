"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, Bot, CalendarDays, FileText, FolderKanban, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, { href: "/courses", label: "Courses", icon: FolderKanban },
  { href: "/assignments", label: "Assignments", icon: CalendarDays }, { href: "/documents", label: "Documents", icon: FileText },
  { href: "/assistant", label: "AI Assistant", icon: Bot }, { href: "/flashcards", label: "Flashcards", icon: Sparkles },
  { href: "/study-plan", label: "Study Plan", icon: BookOpenCheck }, { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return <aside className="border-b border-slate-200 bg-white px-4 py-3 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0 lg:px-4 lg:py-6"><div className="mx-auto flex max-w-7xl items-center gap-5 lg:flex lg:h-full lg:flex-col lg:items-stretch"><Link href="/dashboard" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"><span className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white"><BookOpenCheck size={18} /></span>StudyOS</Link><nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto lg:mx-0 lg:mt-8 lg:block lg:flex-none lg:space-y-1">{links.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition", active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}><Icon size={17} />{label}</Link>; })}</nav><div className="hidden rounded-2xl bg-slate-950 p-4 text-sm text-slate-200 lg:mt-auto lg:block"><p className="font-medium text-white">Keep it grounded</p><p className="mt-1 leading-5 text-slate-400">Answers are linked back to your uploaded material.</p></div></div></aside>;
}
