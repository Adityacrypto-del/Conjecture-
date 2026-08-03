import { describe, it, expect, beforeEach } from "vitest";
import { saveRun, listRuns, getRun, deleteRun, clearRuns } from "./history";
import type { GlobalState } from "./types";

// Minimal localStorage polyfill for the node test environment.
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  get length() {
    return this.m.size;
  }
}

function mkState(id: string, title: string, q: string): GlobalState {
  return {
    session_id: id,
    timestamp: new Date().toISOString(),
    research_question: q,
    parsed_query: {},
    literature: { papers: [], synthesis: "", knowledge_gaps: [], consensus_findings: [], contradictions: [] },
    hypotheses: [],
    experiments: [],
    critique: {} as any,
    proposal: { title, abstract: "", sections: {} as any },
  } as unknown as GlobalState;
}

beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
});

describe("run history persistence", () => {
  it("saves, lists newest-first, and reloads full state", () => {
    saveRun(mkState("a", "Alpha", "Q-A"));
    saveRun(mkState("b", "Beta", "Q-B"));
    const list = listRuns();
    expect(list.map((e) => e.id)).toEqual(["b", "a"]);
    expect(getRun("a")?.research_question).toBe("Q-A");
    expect(getRun("missing")).toBeNull();
  });

  it("dedupes by session id and moves the updated run to the front", () => {
    saveRun(mkState("a", "Alpha", "Q"));
    saveRun(mkState("b", "Beta", "Q"));
    saveRun(mkState("a", "Alpha v2", "Q2"));
    const list = listRuns();
    expect(list.filter((e) => e.id === "a")).toHaveLength(1);
    expect(list[0].id).toBe("a");
    expect(getRun("a")?.proposal.title).toBe("Alpha v2");
  });

  it("deletes a run and its stored state", () => {
    saveRun(mkState("a", "Alpha", "Q"));
    deleteRun("a");
    expect(listRuns()).toHaveLength(0);
    expect(getRun("a")).toBeNull();
  });

  it("caps history at 15 runs, evicting the oldest", () => {
    for (let i = 0; i < 20; i++) saveRun(mkState("r" + i, "T" + i, "q"));
    expect(listRuns()).toHaveLength(15);
    expect(getRun("r0")).toBeNull(); // evicted
    expect(getRun("r19")).not.toBeNull(); // newest kept
  });

  it("tolerates corrupt index without throwing", () => {
    localStorage.setItem("conjecture.history.index.v1", "{not json");
    expect(listRuns()).toEqual([]);
  });

  it("clearRuns wipes everything", () => {
    saveRun(mkState("a", "Alpha", "Q"));
    clearRuns();
    expect(listRuns()).toEqual([]);
  });
});
