import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { createOpenAIClient, getChatModel } from "@/lib/ai/client";
import { recordAiRun } from "@/lib/ai/observability";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import { buildRagContext } from "@/lib/rag/context";
import { citationsFromChunks, groundedSystemPrompt } from "@/lib/rag/prompts";
import { chatRequestSchema } from "@/lib/validation";

const encoder = new TextEncoder();
const event = (type: string, data: unknown) => encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const input = chatRequestSchema.parse(await request.json());
    const startedAt = Date.now();
    let conversationId = input.conversationId;
    if (conversationId) {
      const { data: conversation } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
      if (!conversation) return new Response(event("error", { message: "Conversation not found." }), { status: 404 });
    } else {
      const { data: conversation, error } = await supabase.from("conversations").insert({ user_id: user.id, course_id: input.courseId ?? null, title: input.message.slice(0, 72) }).select("id").single();
      if (error || !conversation) throw new Error(error?.message ?? "Conversation could not be created.");
      conversationId = conversation.id;
    }
    const activeConversationId = conversationId;
    const { data: history } = await supabase.from("messages").select("role, content").eq("conversation_id", activeConversationId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    const { chunks, embeddingUsage } = await retrieveRelevantChunks(supabase, input.message, { courseId: input.courseId, documentId: input.documentId });
    const citations = citationsFromChunks(chunks);
    const { error: messageError } = await supabase.from("messages").insert({ conversation_id: activeConversationId, user_id: user.id, role: "user", content: input.message });
    if (messageError) throw new Error(messageError.message);

    const stream = new ReadableStream({
      async start(controller) {
        let answer = "";
        try {
          controller.enqueue(event("conversation", { conversationId: activeConversationId }));
          const openai = createOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: getChatModel(),
            stream: true,
            temperature: 0.2,
            messages: [
              { role: "system", content: groundedSystemPrompt(buildRagContext(chunks)) },
              ...(history ?? []).reverse().map((message) => ({ role: message.role === "assistant" ? "assistant" as const : "user" as const, content: message.content })),
              { role: "user", content: input.message },
            ],
          });
          for await (const part of completion) {
            const text = part.choices[0]?.delta.content;
            if (text) {
              answer += text;
              controller.enqueue(event("text", { text }));
            }
          }
          await supabase.from("messages").insert({ conversation_id: activeConversationId, user_id: user.id, role: "assistant", content: answer, metadata: { citations } });
          await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConversationId).eq("user_id", user.id);
          await recordAiRun(supabase, user, { feature: "rag_chat", model: getChatModel(), startedAt, success: true, inputTokens: embeddingUsage.prompt_tokens ?? null });
          controller.enqueue(event("citations", { citations }));
          controller.enqueue(event("done", {}));
        } catch (error) {
          const message = error instanceof Error ? error.message : "The assistant could not complete that request.";
          await recordAiRun(supabase, user, { feature: "rag_chat", model: getChatModel(), startedAt, success: false, errorMessage: message });
          controller.enqueue(event("error", { message: "The assistant could not complete that request. Please retry." }));
        } finally { controller.close(); }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
  } catch (error) { return apiError(error); }
}
