import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import type { Conversation, Course, Message, StudyDocument } from "@/types/domain";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ conversation?: string | string[]; course?: string | string[] }> }) {
  const params = await searchParams; const requestedConversation = typeof params.conversation === "string" ? params.conversation : undefined; const initialCourseId = typeof params.course === "string" ? params.course : undefined; const { user, supabase } = await requireUser();
  const [{ data: courses }, { data: documents }, { data: conversations }] = await Promise.all([
    supabase.from("courses").select("*").eq("user_id", user.id).order("name"),
    supabase.from("documents").select("*, courses(name, course_code)").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("conversations").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20),
  ]);
  const initialConversation = ((conversations ?? []) as Conversation[]).find((conversation) => conversation.id === requestedConversation) ?? null;
  const { data: messages } = initialConversation ? await supabase.from("messages").select("*").eq("conversation_id", initialConversation.id).eq("user_id", user.id).in("role", ["user", "assistant"]).order("created_at").limit(40) : { data: [] };
  return <><PageHeader eyebrow="AI workspace" title="Ask, understand, act" description="Grounded mode uses your retrieved academic material as evidence. Task mode can safely manage your own courses and assignments through validated server-side tools." /><AssistantChat courses={(courses ?? []) as Course[]} documents={(documents ?? []) as StudyDocument[]} conversations={(conversations ?? []) as Conversation[]} initialConversation={initialConversation} initialMessages={(messages ?? []) as Message[]} initialCourseId={initialCourseId} /></>;
}
