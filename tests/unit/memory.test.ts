import { describe, it, expect } from "vitest";
import { buildSeed } from "@/lib/demo/seed";
import * as ops from "@/lib/store/operations";

const TODAY = "2026-07-25";

describe("what Nook remembers (memory)", () => {
  it("seeds a set of memories across categories", () => {
    const data = buildSeed(TODAY);
    expect(data.memories.length).toBeGreaterThanOrEqual(5);
    const categories = new Set(data.memories.map((m) => m.category));
    expect(categories.has("fact")).toBe(true);
    expect(categories.has("preference")).toBe(true);
    expect(categories.has("date")).toBe(true);
    // Every memory records why Nook remembers it (transparency).
    expect(data.memories.every((m) => m.source.length > 0)).toBe(true);
  });

  it("adds a new memory the user tells Nook", () => {
    const data = buildSeed(TODAY);
    const next = ops.addMemory(data, {
      category: "fact",
      label: "Note",
      value: "I'm vegetarian",
    });
    expect(next.memories.length).toBe(data.memories.length + 1);
    expect(next.memories[0].value).toBe("I'm vegetarian");
    expect(next.memories[0].source).toBeTruthy();
  });

  it("updates a memory's value (correct it)", () => {
    const data = buildSeed(TODAY);
    const id = data.memories[0].id;
    const next = ops.updateMemory(data, id, "Updated value");
    expect(next.memories.find((m) => m.id === id)!.value).toBe("Updated value");
  });

  it("forgets a memory for good (delete it)", () => {
    const data = buildSeed(TODAY);
    const id = data.memories[0].id;
    const next = ops.forgetMemory(data, id);
    expect(next.memories.find((m) => m.id === id)).toBeUndefined();
    expect(next.memories.length).toBe(data.memories.length - 1);
  });
});
