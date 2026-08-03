import { describe, it, expect } from "vitest";
import {
  reconcilePapers,
  buildReferences,
  buildInTextCitations,
  validateCitations,
} from "./citations";
import type { RawPaper } from "./semanticScholar";
import type { GlobalState, PaperObject } from "../../src/lib/types";

function paper(overrides: Partial<PaperObject>): PaperObject {
  return {
    paper_id: "p1",
    title: "LLM title",
    authors: ["LLM Author"],
    year: 2020,
    venue: "LLM Venue",
    citation_count: 0,
    relevance_score: 7,
    abstract_summary: "summary",
    key_findings: ["finding"],
    methodology_used: "method",
    variables_studied: { independent: [], dependent: [] },
    limitations_stated: [],
    supports_direction: "supports",
    doi_or_url: "",
    ...overrides,
  };
}

function raw(overrides: Partial<RawPaper>): RawPaper {
  return {
    paperId: "p1",
    title: "Real Title",
    abstract: "real abstract",
    year: 2023,
    authors: [{ name: "Cryan J." }, { name: "Dinan T." }],
    venue: "Nature",
    citationCount: 450,
    externalIds: { DOI: "10.1/abc" },
    ...overrides,
  } as RawPaper;
}

describe("reconcilePapers (anti-hallucination core)", () => {
  it("overwrites factual fields with real metadata, keeps interpretive fields", () => {
    const out = reconcilePapers([paper({ abstract_summary: "keep me", relevance_score: 9 })], new Map([["p1", raw({})]]));
    expect(out).toHaveLength(1);
    // real metadata wins
    expect(out[0].title).toBe("Real Title");
    expect(out[0].year).toBe(2023);
    expect(out[0].venue).toBe("Nature");
    expect(out[0].citation_count).toBe(450);
    expect(out[0].authors).toEqual(["Cryan J.", "Dinan T."]);
    expect(out[0].doi_or_url).toBe("https://doi.org/10.1/abc");
    // LLM interpretation kept
    expect(out[0].abstract_summary).toBe("keep me");
    expect(out[0].relevance_score).toBe(9);
  });

  it("drops invented papers whose id matches no retrieved paper", () => {
    const out = reconcilePapers(
      [paper({ paper_id: "real" }), paper({ paper_id: "invented" })],
      new Map([["real", raw({ paperId: "real" })]])
    );
    expect(out.map((p) => p.paper_id)).toEqual(["real"]);
  });

  it("returns [] for non-array input", () => {
    expect(reconcilePapers(undefined as any, new Map())).toEqual([]);
  });

  it("prefers openAccessPdf, then arXiv, then S2 URL when no DOI", () => {
    const pdf = reconcilePapers([paper({})], new Map([["p1", raw({ externalIds: {}, openAccessPdf: { url: "http://pdf" } as any })]]));
    expect(pdf[0].doi_or_url).toBe("http://pdf");
    const arx = reconcilePapers([paper({})], new Map([["p1", raw({ externalIds: { ArXiv: "2401.1" } })]]));
    expect(arx[0].doi_or_url).toBe("https://arxiv.org/abs/2401.1");
    const s2 = reconcilePapers([paper({})], new Map([["p1", raw({ externalIds: {} })]]));
    expect(s2[0].doi_or_url).toBe("https://www.semanticscholar.org/paper/p1");
  });
});

describe("buildReferences / buildInTextCitations", () => {
  it("formats an APA-style reference", () => {
    const refs = buildReferences([paper({ authors: ["Cryan J.", "Dinan T."], year: 2023, venue: "Nature", title: "Gut brain", doi_or_url: "https://doi.org/10.1/x" })]);
    expect(refs[0]).toBe("Cryan J., Dinan T. (2023). Gut brain. Nature. https://doi.org/10.1/x");
  });

  it("handles missing authors/year gracefully", () => {
    const refs = buildReferences([paper({ authors: [], year: undefined as any, venue: "" })]);
    expect(refs[0]).toContain("Unknown author");
    expect(refs[0]).toContain("(n.d.)");
  });

  it("builds 'et al.' in-text tokens", () => {
    expect(buildInTextCitations([paper({ authors: ["Smith, John", "Doe, Jane"], year: 2023 })])[0]).toBe("Smith et al. (2023)");
    expect(buildInTextCitations([paper({ authors: ["Solo, Han"], year: 2021 })])[0]).toBe("Solo (2021)");
  });
});

describe("validateCitations", () => {
  it("strips invented ids from hypotheses + contradictions and reports them", () => {
    const state = {
      hypotheses: [
        { evidence_map: { supporting_papers: ["real", "fake1"], contradicting_papers: ["fake2"] } },
      ],
      literature: {
        contradictions: [{ paper_ids_side_a: ["real"], paper_ids_side_b: ["fake3", "real"] }],
      },
    } as unknown as GlobalState;

    const dropped = validateCitations(state, new Set(["real"]));

    expect(dropped.sort()).toEqual(["fake1", "fake2", "fake3"]);
    expect(state.hypotheses[0].evidence_map.supporting_papers).toEqual(["real"]);
    expect(state.hypotheses[0].evidence_map.contradicting_papers).toEqual([]);
    expect(state.literature.contradictions[0].paper_ids_side_b).toEqual(["real"]);
  });

  it("returns [] when everything is valid", () => {
    const state = {
      hypotheses: [{ evidence_map: { supporting_papers: ["a"], contradicting_papers: [] } }],
      literature: { contradictions: [] },
    } as unknown as GlobalState;
    expect(validateCitations(state, new Set(["a"]))).toEqual([]);
  });
});
