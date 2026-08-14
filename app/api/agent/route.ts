import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { createGeminiClient, getChatModel } from "@/lib/ai/client";
import { recordAiRun } from "@/lib/ai/observability";
import { assistantTools, executeAssistantTool } from "@/lib/ai/tools";
import { agentRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const { message } = agentRequestSchema.parse(await request.json());
    const startedAt = Date.now();
    const ai = createGeminiClient();
    try {
      const initial = await ai.models.generateContent({
        model: getChatModel(),
        contents: [{ role: "user", parts: [{ text: message }] }],
        config: {
          systemInstruction: "You are the StudyOS task assistant. Use tools for current student data and requested mutations. Never claim a tool action succeeded unless its result says so. Do not use tools for destructive deletion. Ask for clarification when a course or assignment cannot be resolved.",
          temperature: 0,
          tools: [{ functionDeclarations: assistantTools }],
        },
      });
      const calls = initial.functionCalls ?? [];
      if (!calls.length) {
        await recordAiRun(supabase, user, { feature: "agent_tools", model: getChatModel(), startedAt, success: true, inputTokens: initial.usageMetadata?.promptTokenCount, outputTokens: initial.usageMetadata?.candidatesTokenCount });
        return NextResponse.json({ message: initial.text ?? "I need a little more detail before I can act.", toolCalls: [] });
      }
      const results: { name: string; result: unknown }[] = [];
      for (const call of calls) {
        if (!call.name) continue;
        const result = await executeAssistantTool({ user, supabase }, call.name, call.args ?? {});
        results.push({ name: call.name, result });
      }
      const followUp = await ai.models.generateContent({
        model: getChatModel(),
        contents: [
          { role: "user", parts: [{ text: message }] },
          { role: "user", parts: [{ text: `Tool execution results: ${JSON.stringify(results)}` }] },
        ],
        config: {
          systemInstruction: "Summarize the completed StudyOS tool actions accurately and concisely. If a tool reported no results, say that clearly.",
          temperature: 0.2,
        },
      });
      await recordAiRun(supabase, user, {
        feature: "agent_tools",
        model: getChatModel(),
        startedAt,
        success: true,
        inputTokens: (initial.usageMetadata?.promptTokenCount ?? 0) + (followUp.usageMetadata?.promptTokenCount ?? 0),
        outputTokens: (initial.usageMetadata?.candidatesTokenCount ?? 0) + (followUp.usageMetadata?.candidatesTokenCount ?? 0),
      });
      return NextResponse.json({ message: followUp.text ?? "Done.", toolCalls: results });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The task assistant could not complete that action.";
      await recordAiRun(supabase, user, { feature: "agent_tools", model: getChatModel(), startedAt, success: false, errorMessage: message });
      throw error;
    }
  } catch (error) { return apiError(error); }
}
