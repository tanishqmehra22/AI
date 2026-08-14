import { type Content } from "@google/genai";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { createGeminiClient, getChatModel, withGeminiRetry } from "@/lib/ai/client";
import { recordAiRun } from "@/lib/ai/observability";
import { assistantTools, executeAssistantTool } from "@/lib/ai/tools";
import { agentRequestSchema } from "@/lib/validation";

// Resolving an assignment by name then mutating it takes more than one turn, so
// the model runs in a loop until it stops calling tools. Capped so a confused
// model cannot spin indefinitely.
const MAX_TOOL_ROUNDS = 5;

const SYSTEM_PROMPT = [
  "You are the StudyOS task assistant. Use tools for current student data and requested mutations.",
  "Only these tools exist; never invent a tool name or claim to have used one you did not call.",
  "Never state that an action succeeded unless a tool result you received says so. If a tool returned an error, say plainly that the action failed and why.",
  "When a request needs a record ID you do not have, call a read tool first, then call the mutating tool in a later step.",
  "Do not use tools for destructive deletion. Ask for clarification when a course or assignment cannot be resolved.",
].join(" ");

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const { message } = agentRequestSchema.parse(await request.json());
    const startedAt = Date.now();
    const ai = createGeminiClient();
    try {
      const contents: Content[] = [{ role: "user", parts: [{ text: message }] }];
      const executed: { name: string; result: unknown }[] = [];
      let inputTokens = 0;
      let outputTokens = 0;
      let reply = "";

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await withGeminiRetry(() => ai.models.generateContent({
          model: getChatModel(),
          contents,
          config: { systemInstruction: SYSTEM_PROMPT, temperature: 0, tools: [{ functionDeclarations: assistantTools }] },
        }));
        inputTokens += response.usageMetadata?.promptTokenCount ?? 0;
        outputTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

        const calls = (response.functionCalls ?? []).filter((call) => call.name);
        if (!calls.length) {
          reply = response.text ?? "I need a little more detail before I can act.";
          break;
        }

        // Preserve the model's own turn so later rounds keep their tool context.
        const modelContent = response.candidates?.[0]?.content;
        contents.push(modelContent ?? { role: "model", parts: calls.map((call) => ({ functionCall: call })) });

        const responseParts = [];
        for (const call of calls) {
          const name = call.name as string;
          let result: unknown;
          try {
            result = await executeAssistantTool({ user, supabase }, name, call.args ?? {});
            executed.push({ name, result });
          } catch (error) {
            // Report the failure to the model instead of aborting, so it tells
            // the student the action failed rather than inventing success.
            const reason = error instanceof Error ? error.message : "The tool could not complete.";
            result = { error: reason };
            executed.push({ name, result });
          }
          responseParts.push({ functionResponse: { id: call.id, name, response: { output: result } } });
        }
        contents.push({ role: "user", parts: responseParts });
      }

      if (!reply) reply = "I stopped before finishing that request. Please try a smaller step.";
      await recordAiRun(supabase, user, { feature: "agent_tools", model: getChatModel(), startedAt, success: true, inputTokens, outputTokens });
      return NextResponse.json({ message: reply, toolCalls: executed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The task assistant could not complete that action.";
      await recordAiRun(supabase, user, { feature: "agent_tools", model: getChatModel(), startedAt, success: false, errorMessage: message });
      throw error;
    }
  } catch (error) { return apiError(error); }
}
