import "server-only";
import type { User } from "@supabase/supabase-js";

interface RunDetails {
  feature: string;
  model: string;
  startedAt: number;
  success: boolean;
  inputTokens?: number | null;
  outputTokens?: number | null;
  errorMessage?: string | null;
}

export async function recordAiRun(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>,
  user: User,
  details: RunDetails,
) {
  const { error } = await supabase.from("ai_runs").insert({
    user_id: user.id,
    feature: details.feature,
    model: details.model,
    latency_ms: Math.max(0, Date.now() - details.startedAt),
    input_tokens: details.inputTokens ?? null,
    output_tokens: details.outputTokens ?? null,
    success: details.success,
    error_message: details.errorMessage ?? null,
  });
  if (error) console.error("Unable to record AI run", error.message);
}
