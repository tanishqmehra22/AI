import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { createOpenAIClient, getChatModel } from "@/lib/ai/client";
import { recordAiRun } from "@/lib/ai/observability";
import { assistantTools, executeAssistantTool } from "@/lib/ai/tools";
import { agentRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const { message } = agentRequestSchema.parse(await request.json());
    const startedAt = Date.now();
    const openai = createOpenAIClient();
    try {
      const initial = await openai.chat.completions.create({
        model: getChatModel(),
        temperature: 0,
        tools: assistantTools,
        tool_choice: "auto",
        messages: [
          { role: "system", content: "You are the StudyOS task assistant. Use tools for current student data and requested mutations. Never claim a tool action succeeded unless its result says so. Do not use tools for destructive deletion. Ask for clarification when a course or assignment cannot be resolved." },
          { role: "user", content: message },
        ],
      });
      const assistantMessage = initial.choices[0]?.message;
      if (!assistantMessage) throw new Error("The assistant returned no response.");
      const calls = assistantMessage.tool_calls ?? [];
      if (!calls.length) {
        await recordAiRun(supabase, user, { feature: "agent_tools", model: getChatModel(), startedAt, success: true, inputTokens: initial.usage?.prompt_tokens, outputTokens: initial.usage?.completion_tokens });
        return NextResponse.json({ message: assistantMessage.content ?? "I need a little more detail before I can act.", toolCalls: [] });
      }
      const results = [] as { name: string; result: unknown }[];
      for (const call of calls) {
        if (call.type !== "function") continue;
        let argumentsValue: unknown = {};
        try { argumentsValue = JSON.parse(call.function.arguments); } catch { throw new Error(`The assistant sent invalid arguments for ${call.function.name}.`); }
        const result = await executeAssistantTool({ user, supabase }, call.function.name, argumentsValue);
        results.push({ name: call.function.name, result });
      }
      const followUp = await openai.chat.completions.create({
        model: getChatModel(),
        temperature: 0.2,
        messages: [
          { role: "system", content: "Summarize the completed StudyOS tool actions accurately and concisely. If a tool reported no results, say that clearly." },
          { role: "user", content: message },
          { role: "assistant", content: `Tool execution results: ${JSON.stringify(results)}` },
        ],
      });
      await recordAiRun(supabase, user, { feature: "agent_tools", model: getChatModel(), startedAt, success: true, inputTokens: (initial.usage?.prompt_tokens ?? 0) + (followUp.usage?.prompt_tokens ?? 0), outputTokens: (initial.usage?.completion_tokens ?? 0) + (followUp.usage?.completion_tokens ?? 0) });
      return NextResponse.json({ message: followUp.choices[0]?.message.content ?? "Done.", toolCalls: results });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The task assistant could not complete that action.";
      await recordAiRun(supabase, user, { feature: "agent_tools", model: getChatModel(), startedAt, success: false, errorMessage: message });
      throw error;
    }
  } catch (error) { return apiError(error); }
}
