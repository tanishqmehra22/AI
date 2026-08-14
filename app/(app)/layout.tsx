import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await requireUser();
  return <div className="app-shell lg:pl-64"><Sidebar /><div className="min-h-screen"><Topbar email={user.email ?? "Signed in"} /><main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-10">{children}</main></div></div>;
}
