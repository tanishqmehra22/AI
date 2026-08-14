import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicKey } from "@/lib/supabase/config";

const protectedPrefixes = ["/dashboard", "/courses", "/assignments", "/documents", "/assistant", "/flashcards", "/study-plan", "/settings"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();
  if (!url || !key) {
    if (protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
      const redirect = request.nextUrl.clone(); redirect.pathname = "/setup-required"; return NextResponse.redirect(redirect);
    }
    return response;
  }
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (values) => { values.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    const redirect = request.nextUrl.clone(); redirect.pathname = "/login"; redirect.searchParams.set("next", request.nextUrl.pathname); return NextResponse.redirect(redirect);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
