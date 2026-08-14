import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";

export async function GET() {
  try {
    const { user, supabase } = await requireApiUser();
    const { data, error } = await supabase.from("ai_runs").select("feature, latency_ms, success, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    const runs = data ?? [];
    const successRuns = runs.filter((run) => run.success);
    const byFeature = Object.entries(runs.reduce<Record<string, number>>((total, run) => { total[run.feature] = (total[run.feature] ?? 0) + 1; return total; }, {})).map(([feature, count]) => ({ feature, count }));
    return NextResponse.json({ total: runs.length, successful: successRuns.length, failed: runs.length - successRuns.length, averageLatencyMs: successRuns.length ? Math.round(successRuns.reduce((total, run) => total + (run.latency_ms ?? 0), 0) / successRuns.length) : 0, byFeature });
  } catch (error) { return apiError(error); }
}
