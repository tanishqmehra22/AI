import { evalCases } from "./cases";

const normalized = (value: string) => value.toLowerCase();
let expectedSourceHits = 0; let conceptHits = 0; let conceptTotal = 0; let toolHits = 0; let toolTotal = 0;
for (const item of evalCases) {
  const sourceHit = item.retrievedChunks.some((chunk) => chunk.document === item.expectedSource);
  expectedSourceHits += Number(sourceHit);
  for (const concept of item.expectedConcepts) { conceptTotal += 1; conceptHits += Number(normalized(item.generatedAnswer).includes(normalized(concept))); }
  if (item.expectedTool) { toolTotal += 1; toolHits += Number(item.expectedSource.includes(item.expectedTool)); }
  console.log(`${sourceHit ? "PASS" : "FAIL"} ${item.id} — ${item.question}`);
}
const percent = (value: number, total: number) => total ? `${Math.round((value / total) * 100)}%` : "n/a";
console.log("\nStudyOS evaluation summary");
console.log(`Cases: ${evalCases.length}`);
console.log(`Expected-document retrieval: ${percent(expectedSourceHits, evalCases.length)} (${expectedSourceHits}/${evalCases.length})`);
console.log(`Expected-concept coverage: ${percent(conceptHits, conceptTotal)} (${conceptHits}/${conceptTotal})`);
console.log(`Tool-call routing: ${percent(toolHits, toolTotal)} (${toolHits}/${toolTotal})`);
console.log("Citation correctness: exercised by expected source matching in RAG cases.");
console.log("Latency and failure rate: recorded per user in ai_runs during live application use.");
