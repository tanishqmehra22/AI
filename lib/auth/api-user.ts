import "server-only";
import { ApiError } from "@/lib/api";
import { getAuthenticatedUser } from "@/lib/auth/guards";

export async function requireApiUser() {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user || !supabase) throw new ApiError("You need to sign in to do that.", 401);
  return { user, supabase };
}
