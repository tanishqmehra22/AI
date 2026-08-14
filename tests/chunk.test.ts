import { describe, expect, it } from "vitest";
import { chunkPages } from "@/lib/documents/chunk";

describe("document chunking", () => {
  it("preserves source page information and overlap", () => {
    const text = Array.from({ length: 90 }, (_, index) => `Sentence ${index} explains balanced trees and rotations.`).join(" ");
    const chunks = chunkPages([{ pageNumber: 4, text }], 240, 50);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.pageNumber === 4)).toBe(true);
    expect(chunks[0].content.slice(-25)).not.toEqual(chunks[1].content.slice(-25));
    expect(chunks[0].content.length).toBeGreaterThan(80);
  });
  it("skips unreadably small fragments", () => {
    expect(chunkPages([{ pageNumber: 1, text: "tiny" }])).toEqual([]);
  });
});
