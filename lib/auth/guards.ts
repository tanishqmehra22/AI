import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/setup-required");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { user, supabase };
}

export async function getAuthenticatedUser() {
  if (!isSupabaseConfigured()) return { user: null, supabase: null };
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user: error ? null : user, supabase };
}
