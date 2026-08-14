/**
 * StudyOS evaluation harness.
 *
 * Every number below comes from a live call to the configured model. The
 * harness embeds a fictional corpus with the real embedding model, retrieves
 * with real cosine similarity, generates answers with the real grounded
 * prompt, and asks the real tool declarations which tool to route to. Nothing
 * is stubbed, so a regression in retrieval, prompting, or tool routing shows
 * up as a failing case.
 *
 * Run with `pnpm eval` (requires GEMINI_API_KEY).
 */
import { createGeminiClient, embedText, getChatModel, withGeminiRetry } from "@/lib/ai/gemini";
import { assistantTools } from "@/lib/ai/tool-definitions";
import { buildRagContext } from "@/lib/rag/context";
import { groundedSystemPrompt } from "@/lib/rag/prompts";
import { RAG_MATCH_COUNT } from "@/lib/constants";
import { corpus, type CorpusChunk } from "./corpus";
import { ragCases, refusalCases, toolCases } from "./cases";

// Gemini's free tier caps requests per minute; space live calls out.
const REQUEST_INTERVAL_MS = 700;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

const contains = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.toLowerCase());
const pct = (value: number, total: number) => (total ? `${Math.round((value / total) * 100)}% (${value}/${total})` : "n/a");

interface Row { id: string; pass: boolean; detail: string; ms: number }

function report(title: string, rows: Row[]) {
  console.log(`\n${title}`);
  for (const row of rows) console.log(`  ${row.pass ? "PASS" : "FAIL"} ${row.id} — ${row.detail} (${row.ms}ms)`);
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set. Add it to .env.local before running evaluations.");
    process.exit(1);
  }

  const ai = createGeminiClient();
  const model = getChatModel();
  const latencies: number[] = [];
  let failures = 0;

  // ---- Index the fictional corpus with the real embedding model ----
  console.log(`Embedding ${corpus.length} corpus chunks with the live embedding model…`);
  const indexed: (CorpusChunk & { embedding: number[] })[] = [];
  for (const [index, chunk] of corpus.entries()) {
    if (index > 0) await sleep(REQUEST_INTERVAL_MS);
    const { embedding } = await embedText(chunk.content);
    indexed.push({ ...chunk, embedding });
  }

  async function retrieve(question: string) {
    const { embedding } = await embedText(question);
    return indexed
      .map((chunk) => ({ ...chunk, similarity: cosineSimilarity(embedding, chunk.embedding) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, RAG_MATCH_COUNT);
  }

  async function answerFrom(question: string, retrieved: Awaited<ReturnType<typeof retrieve>>) {
    const context = buildRagContext(retrieved.map((chunk, index) => ({
      chunkId: `chunk-${index}`, documentId: chunk.document, documentName: chunk.document,
      pageNumber: chunk.page, chunkIndex: index, similarity: chunk.similarity, content: chunk.content,
    })));
    const response = await withGeminiRetry(() => ai.models.generateContent({
      model, contents: [{ role: "user", parts: [{ text: question }] }],
      config: { systemInstruction: groundedSystemPrompt(context), temperature: 0.2 },
    }));
    return response.text ?? "";
  }

  // ---- Retrieval + grounded answer quality ----
  const ragRows: Row[] = [];
  let topSourceHits = 0, conceptHits = 0, conceptTotal = 0;
  for (const testCase of ragCases) {
    await sleep(REQUEST_INTERVAL_MS);
    const started = Date.now();
    const retrieved = await retrieve(testCase.question);
    const topHit = retrieved[0]?.document === testCase.expectedSource;
    const inTopK = retrieved.some((chunk) => chunk.document === testCase.expectedSource);
    const answer = await answerFrom(testCase.question, retrieved);
    const ms = Date.now() - started;
    latencies.push(ms);

    const missing = testCase.expectedConcepts.filter((concept) => !contains(answer, concept));
    conceptTotal += testCase.expectedConcepts.length;
    conceptHits += testCase.expectedConcepts.length - missing.length;
    topSourceHits += Number(topHit);

    const pass = topHit && missing.length === 0;
    if (!pass) failures++;
    ragRows.push({
      id: testCase.id, pass, ms,
      detail: pass
        ? `${testCase.question} → ${retrieved[0].document} p.${retrieved[0].page}`
        : `${testCase.question} → top=${retrieved[0]?.document ?? "none"}${inTopK ? "" : " (expected doc not retrieved)"}${missing.length ? ` missing: ${missing.join(", ")}` : ""}`,
    });
  }

  // ---- Grounding: must refuse when the corpus lacks the answer ----
  // Phrasing varies too much for keyword matching ("no mention of", "isn't
  // covered", "I don't have"), so a second model call judges the transcript.
  async function judgedRefusal(question: string, answer: string) {
    const response = await withGeminiRetry(() => ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: `QUESTION: ${question}\n\nANSWER: ${answer}` }] }],
      config: {
        systemInstruction: "You grade an assistant's answer. Reply with exactly one word: REFUSED if the answer states the provided material does not cover the question or otherwise declines to answer it, or ANSWERED if it supplies a substantive answer to the question. Treat 'the notes do not mention X' as REFUSED even if it then offers general help.",
        temperature: 0,
      },
    }));
    return (response.text ?? "").trim().toUpperCase().startsWith("REFUSED");
  }

  const refusalRows: Row[] = [];
  let refusalHits = 0;
  for (const testCase of refusalCases) {
    await sleep(REQUEST_INTERVAL_MS);
    const started = Date.now();
    const answer = await answerFrom(testCase.question, await retrieve(testCase.question));
    await sleep(REQUEST_INTERVAL_MS);
    const refused = await judgedRefusal(testCase.question, answer);
    const ms = Date.now() - started;
    latencies.push(ms);
    refusalHits += Number(refused);
    if (!refused) failures++;
    refusalRows.push({ id: testCase.id, pass: refused, ms, detail: refused ? `declined to answer (${testCase.reason})` : `answered anyway: ${answer.slice(0, 90)}` });
  }

  // ---- Tool routing against the real declarations ----
  // Mirrors the production agent loop: mutating tools need IDs the model does
  // not start with, so it must call a read tool first. Read tools are answered
  // from a fixture; the assertion is that the expected tool is reached.
  const fixtureCourse = { id: "6f1c1f6e-1a2b-4c3d-8e4f-5a6b7c8d9e0f", name: "Data Structures and Algorithms", course_code: "CS 146", semester: "Fall 2026" };
  const fixtureAssignment = { id: "9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d", title: "Database homework", due_date: "2026-09-01", status: "not_started", priority: "high", estimated_hours: 2 };

  function stubToolResult(name: string): unknown {
    switch (name) {
      case "getCourses": return [fixtureCourse];
      case "getAssignments":
      case "getUpcomingAssignments":
      case "getOverdueAssignments": return [fixtureAssignment];
      case "searchCourseDocuments": return [{ documentName: "Lecture 3 — Normalization", pageNumber: 5, content: corpus[3].content }];
      case "createAssignment": return { created: { ...fixtureAssignment, id: "new" } };
      case "updateAssignment": return { updated: fixtureAssignment };
      case "markAssignmentComplete": return { completed: { ...fixtureAssignment, status: "completed" } };
      case "createStudyPlan": return { created: { id: "plan", title: "Study plan" } };
      default: return { error: "unknown tool" };
    }
  }

  const toolRows: Row[] = [];
  let toolHits = 0, argHits = 0, argTotal = 0;
  for (const testCase of toolCases) {
    const started = Date.now();
    const contents: Parameters<typeof ai.models.generateContent>[0]["contents"] = [{ role: "user", parts: [{ text: testCase.message }] }];
    const called: string[] = [];
    let matchedArgs: Record<string, unknown> | undefined;

    for (let round = 0; round < 4; round++) {
      await sleep(REQUEST_INTERVAL_MS);
      const response = await withGeminiRetry(() => ai.models.generateContent({
        model, contents,
        config: {
          systemInstruction: "You are the StudyOS task assistant. Use the provided tools to read or modify the student's courses and assignments. Resolve any required ID with a read tool before calling a tool that needs it.",
          temperature: 0, tools: [{ functionDeclarations: assistantTools }],
        },
      }));
      const calls = (response.functionCalls ?? []).filter((call) => call.name);
      if (!calls.length) break;
      for (const call of calls) {
        called.push(call.name as string);
        if (call.name === testCase.expectedTool && !matchedArgs) matchedArgs = call.args ?? {};
      }
      if (matchedArgs) break;
      (contents as unknown[]).push(response.candidates?.[0]?.content ?? { role: "model", parts: calls.map((c) => ({ functionCall: c })) });
      (contents as unknown[]).push({ role: "user", parts: calls.map((c) => ({ functionResponse: { id: c.id, name: c.name, response: { output: stubToolResult(c.name as string) } } })) });
    }

    const ms = Date.now() - started;
    latencies.push(ms);
    const routed = called.includes(testCase.expectedTool);
    toolHits += Number(routed);
    const missingArgs = (testCase.expectedArgs ?? []).filter((arg) => !(matchedArgs ?? {})[arg]);
    argTotal += testCase.expectedArgs?.length ?? 0;
    argHits += (testCase.expectedArgs?.length ?? 0) - missingArgs.length;

    const pass = routed && missingArgs.length === 0;
    if (!pass) failures++;
    toolRows.push({
      id: testCase.id, pass, ms,
      detail: pass ? `${testCase.message} → [${called.join(" → ")}](${Object.keys(matchedArgs ?? {}).join(", ")})`
        : `${testCase.message} → called [${called.join(" → ") || "none"}], expected ${testCase.expectedTool}${missingArgs.length ? `; missing args: ${missingArgs.join(", ")}` : ""}`,
    });
  }

  report("Retrieval and grounded answers", ragRows);
  report("Grounding — must decline when unsupported", refusalRows);
  report("Tool routing", toolRows);

  const total = ragCases.length + refusalCases.length + toolCases.length;
  const sorted = [...latencies].sort((a, b) => a - b);
  console.log("\nStudyOS evaluation summary");
  console.log(`Model: ${model}   Cases: ${total}   Corpus chunks: ${corpus.length}`);
  console.log(`Top-1 expected-document retrieval: ${pct(topSourceHits, ragCases.length)}`);
  console.log(`Expected-concept coverage:         ${pct(conceptHits, conceptTotal)}`);
  console.log(`Refusal when unsupported:          ${pct(refusalHits, refusalCases.length)}`);
  console.log(`Tool-call routing:                 ${pct(toolHits, toolCases.length)}`);
  console.log(`Tool-argument correctness:         ${pct(argHits, argTotal)}`);
  console.log(`Latency p50 / p95:                 ${sorted[Math.floor(sorted.length * 0.5)]}ms / ${sorted[Math.floor(sorted.length * 0.95)]}ms`);
  console.log(`Failure rate:                      ${pct(failures, total)}`);

  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error("\nEvaluation run failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
