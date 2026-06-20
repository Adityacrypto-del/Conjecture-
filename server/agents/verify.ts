import type { GlobalState, VerificationReport } from "../../src/lib/types";
import type { RawPaper } from "../lib/semanticScholar";
import { queryLLM, type Provider } from "../lib/llm";

/**
 * Verification agent: cross-checks the generated claims against the REAL paper
 * abstracts and judges whether each is supported. This is the only stage that
 * costs an extra LLM call, so it runs only when explicitly enabled.
 */
export async function verifyProposal(
  provider: Provider,
  apiKey: string,
  model: string,
  state: GlobalState,
  rawById: Map<string, RawPaper>
): Promise<VerificationReport> {
  // Source material: real abstracts for every retained paper.
  const sources = state.literature.papers.map((p) => ({
    paper_id: p.paper_id,
    title: p.title,
    abstract: rawById.get(p.paper_id)?.abstract || p.abstract_summary || "No abstract available"
  }));

  if (sources.length === 0) {
    return {
      enabled: true,
      score: 0,
      total_claims: 0,
      verified: 0,
      partially_supported: 0,
      unsupported: 0,
      claims: [],
      error: "No grounded sources available to verify against."
    };
  }

  // Claims to check: literature synthesis, consensus findings, and each
  // hypothesis's supporting reasoning (with the papers it cites).
  const claimsToCheck = [
    { claim: state.literature.synthesis, cited_papers: state.literature.papers.map((p) => p.paper_id) },
    ...(state.literature.consensus_findings || []).map((c) => ({
      claim: c,
      cited_papers: state.literature.papers.map((p) => p.paper_id)
    })),
    ...(state.hypotheses || []).map((h) => ({
      claim: h.evidence_map?.supporting_reasoning || h.statement?.if_then_because || h.title,
      cited_papers: h.evidence_map?.supporting_papers || []
    }))
  ].filter((c) => c.claim && c.claim.trim().length > 0);

  const prompt = `
    You are the Verification Agent, a meticulous fact-checker. Your job is to judge
    whether each CLAIM is actually supported by the ABSTRACTS of the papers it cites.
    Do NOT use outside knowledge. Judge ONLY against the provided abstracts.

    SOURCES (real paper abstracts):
    ${JSON.stringify(sources, null, 2)}

    CLAIMS TO VERIFY:
    ${JSON.stringify(claimsToCheck, null, 2)}

    For each claim, decide:
    - "supported": the cited abstracts clearly back the claim.
    - "partially_supported": the abstracts are related but do not fully establish it.
    - "unsupported": the abstracts do not support the claim, or no usable abstract was cited.

    Return a JSON object exactly in this shape:
    {
      "claims": [
        {
          "claim": "string (echo the claim, trimmed to <= 240 chars)",
          "cited_papers": ["paper_id"],
          "verdict": "supported | partially_supported | unsupported",
          "reason": "string (one sentence, grounded in the abstracts)"
        }
      ]
    }
  `;

  const result = await queryLLM(provider, apiKey, model, prompt);
  const claims = Array.isArray(result?.claims) ? result.claims : [];

  const verified = claims.filter((c: any) => c.verdict === "supported").length;
  const partially = claims.filter((c: any) => c.verdict === "partially_supported").length;
  const unsupported = claims.filter((c: any) => c.verdict === "unsupported").length;
  const total = claims.length;
  const score = total > 0 ? Math.round(((verified + partially * 0.5) / total) * 100) : 0;

  return {
    enabled: true,
    score,
    total_claims: total,
    verified,
    partially_supported: partially,
    unsupported,
    claims
  };
}
