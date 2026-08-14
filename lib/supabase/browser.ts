"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey } from "@/lib/supabase/config";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();
  if (!url || !key) throw new Error("Supabase is not configured.");
  client = createBrowserClient(url, key);
  return client;
}
