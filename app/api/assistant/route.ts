import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/api-user";
import { createGeminiClient, getChatModel } from "@/lib/ai/client";
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
        let promptTokenCount: number | undefined;
        let candidatesTokenCount: number | undefined;
        try {
          controller.enqueue(event("conversation", { conversationId: activeConversationId }));
          const ai = createGeminiClient();
          const contents = [
            ...(history ?? []).reverse().filter((message) => message.role === "user" || message.role === "assistant").map((message) => ({ role: message.role === "assistant" ? "model" as const : "user" as const, parts: [{ text: message.content }] })),
            { role: "user" as const, parts: [{ text: input.message }] },
          ];
          const result = await ai.models.generateContentStream({
            model: getChatModel(),
            contents,
            config: {
              systemInstruction: groundedSystemPrompt(buildRagContext(chunks)),
              temperature: 0.2,
            },
          });
          for await (const chunk of result) {
            const text = chunk.text;
            if (text) {
              answer += text;
              controller.enqueue(event("text", { text }));
            }
            if (chunk.usageMetadata) {
              promptTokenCount = chunk.usageMetadata.promptTokenCount;
              candidatesTokenCount = chunk.usageMetadata.candidatesTokenCount;
            }
          }
          await supabase.from("messages").insert({ conversation_id: activeConversationId, user_id: user.id, role: "assistant", content: answer, metadata: { citations } });
          await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConversationId).eq("user_id", user.id);
          await recordAiRun(supabase, user, { feature: "rag_chat", model: getChatModel(), startedAt, success: true, inputTokens: promptTokenCount ?? embeddingUsage.prompt_tokens ?? null, outputTokens: candidatesTokenCount ?? null });
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
