import type { GlobalState } from "../../src/lib/types";
import { v4 as uuidv4 } from "uuid";
import { queryLLM, type Provider } from "../lib/llm";
import { searchPapers, type RawPaper } from "../lib/semanticScholar";
import {
  reconcilePapers,
  buildReferences,
  buildInTextCitations,
  validateCitations
} from "../lib/citations";
import { verifyProposal } from "./verify";

export async function runFullResearchPipeline(
  provider: Provider,
  question: string,
  apiKey: string,
  model: string = "gemini-2.5-flash",
  verify: boolean,
  onProgress: (step: string, message: string, state?: Partial<GlobalState>) => void
): Promise<GlobalState> {
  onProgress("orchestrator_parse", "Parsing research question and extracting variables...");

  const session_id = uuidv4();
  const timestamp = new Date().toISOString();

  // STEP 1: Parse and validate query
  const parsePrompt = `
    You are the Master Orchestrator of a scientific research pipeline.
    Analyze the following research question and extract its domain, subdomain, key concepts, independent/dependent/confounding variables, research type, and construct 3 distinct search keywords for literature search.

    Research Question: "${question}"

    Return a JSON object conforming exactly to this structure:
    {
      "domain": "string",
      "subdomain": "string",
      "key_concepts": ["string"],
      "variables": {
        "independent": ["string"],
        "dependent": ["string"],
        "confounding": ["string"]
      },
      "research_type": "exploratory | confirmatory | mechanistic | applied",
      "keywords_for_search": ["string"]
    }
  `;

  const parsedQuery = await queryLLM(provider, apiKey, model, parsePrompt);

  // Construct starting state
  let globalState: GlobalState = {
    session_id,
    timestamp,
    research_question: question,
    parsed_query: parsedQuery,
    literature: { papers: [], synthesis: "", knowledge_gaps: [], consensus_findings: [], contradictions: [] },
    hypotheses: [],
    experiments: [],
    critique: { overall_score: 0, summary: "", best_hypothesis: "", recommended_sequence: [], synergy_opportunities: [], fatal_flaws: [], cross_cutting_recommendations: [], per_hypothesis: [] },
    proposal: { title: "", abstract: "", sections: {} as any }
  };

  onProgress("literature_agent", "Searching Semantic Scholar API and analyzing literature...", globalState);

  // STEP 2: Literature search (robust, multi-query, deduped)
  const retrieval = await searchPapers(parsedQuery.keywords_for_search || [], question);
  const rawById = new Map<string, RawPaper>(retrieval.papers.map((p) => [p.paperId, p]));

  if (retrieval.note) {
    onProgress("literature_agent", `⚠️ ${retrieval.note}`, globalState);
  }
  onProgress(
    "literature_agent",
    `Retrieved ${retrieval.retrieved} papers (${retrieval.withAbstracts} with abstracts). Scoring, filtering, and synthesizing...`,
    globalState
  );

  // Prepare paper data for the LLM (real metadata only).
  const papersForLLM = retrieval.papers.map((p) => ({
    paperId: p.paperId,
    title: p.title || "Untitled Paper",
    abstract: p.abstract || "No abstract available",
    authors: p.authors ? p.authors.map((a) => a.name) : ["Unknown"],
    year: p.year || 2020,
    citationCount: p.citationCount || 0,
    referenceCount: p.referenceCount || 0,
    venue: p.venue || "Academic Journal",
    openAccessPdf: p.openAccessPdf?.url || ""
  }));

  const litPrompt = `
    You are the Literature Agent, an expert in academic research synthesis.
    Analyze the following papers retrieved from Semantic Scholar for the research question: "${question}".

    Parsed query context: ${JSON.stringify(parsedQuery)}

    Retrieved papers:
    ${JSON.stringify(papersForLLM, null, 2)}

    GROUNDING RULES (critical):
    - Use ONLY the exact "paperId" values provided above as paper_id. Never invent a paper_id.
    - Do NOT fabricate papers, findings, DOIs, or citations. If the retrieved papers are
      insufficient, retain fewer papers rather than inventing any.
    - Base every claim on the provided abstracts. Cite papers as (LastName, Year).

    Instructions:
    1. Score each paper (0-10) based on:
       - Relevance (0-4): direct address of the question.
       - Recency (0-2): 2021-2026 = 2, 2016-2020 = 1, older = 0.
       - Impact (0-2): Citations > 100 = 2, 50-100 = 1, < 50 = 0.
       - Methodological richness (0-2): does it detail methods?
    2. Retain up to 8 top papers with score >= 5. If none, retain the best available.
    3. For each retained paper, extract detailed knowledge matching the PaperObject schema.
    4. Generate a narrative synthesis of 3-4 paragraphs using academic tone.
    5. Identify 3-5 knowledge gaps.
    6. Identify 3-5 consensus findings.
    7. Identify contradictions where papers disagree.

    Return a JSON object conforming exactly to this structure:
    {
      "papers": [
        {
          "paper_id": "string (MUST be one of the provided paperId values)",
          "title": "string",
          "authors": ["LastName, FirstInitial"],
          "year": number,
          "venue": "string",
          "citation_count": number,
          "relevance_score": number,
          "abstract_summary": "2-3 sentence summary",
          "key_findings": ["string"],
          "methodology_used": "string",
          "variables_studied": { "independent": ["string"], "dependent": ["string"] },
          "limitations_stated": ["string"],
          "supports_direction": "supports | contradicts | neutral | mixed",
          "doi_or_url": "string"
        }
      ],
      "synthesis": "string (narrative synthesis)",
      "knowledge_gaps": ["string"],
      "consensus_findings": ["string"],
      "contradictions": [
        {
          "topic": "string",
          "contradiction_description": "string",
          "paper_ids_side_a": ["string"],
          "paper_ids_side_b": ["string"]
        }
      ]
    }
  `;

  const literatureResults = await queryLLM(provider, apiKey, model, litPrompt);
  // Workstream 1: overwrite factual fields with real metadata; drop invented papers.
  literatureResults.papers = reconcilePapers(literatureResults.papers, rawById);
  globalState.literature = literatureResults;
  globalState.grounding = {
    papers_retrieved: retrieval.retrieved,
    papers_with_abstracts: retrieval.withAbstracts,
    dropped_citations: [],
    note: retrieval.note
  };

  const validIds = new Set<string>(globalState.literature.papers.map((p) => p.paper_id));

  onProgress("hypothesis_agent", "Generating testable and falsifiable hypotheses...", globalState);

  // STEP 3: Hypothesis Agent
  const hypPrompt = `
    You are the Hypothesis Agent. Generate exactly 3 distinct hypotheses based on the literature synthesis and gaps:

    Research Question: "${question}"
    Literature Gaps: ${JSON.stringify(literatureResults.knowledge_gaps)}
    Literature Synthesis: "${literatureResults.synthesis}"

    Strategy:
    - H1 (Gap-filling): Directly addresses a gap.
    - H2 (Mechanistic): Proposes a causal mechanism.
    - H3 (Contrarian/Novel): Challenges a consensus or proposes a new angle.

    Requirements:
    - Must use If-Then-Because format.
    - Must state Null (H0) and Alternative (H1) hypotheses.
    - Specify independent, dependent, and controls.
    - Falsification criteria.
    - Novelty score (1-10) and Testability score (1-10) with justifications.
    - In evidence_map, cite ONLY these real paper_ids (never invent one): ${JSON.stringify(
      literatureResults.papers.map((p: any) => ({ id: p.paper_id, title: p.title }))
    )}

    Return a JSON array of exactly 3 HypothesisObjects, conforming to this schema for each object:
    {
      "hypothesis_id": "H1 | H2 | H3",
      "strategy": "gap-filling | mechanistic | contrarian",
      "title": "string",
      "statement": {
        "if_then_because": "If [manipulation], then [expected outcome], because [mechanistic rationale]",
        "H0": "string",
        "H1": "string"
      },
      "variables": {
        "independent": "string",
        "dependent": "string",
        "controls": ["string"]
      },
      "predicted_outcome": "string",
      "falsification_criterion": "string",
      "novelty_score": number,
      "novelty_justification": "string",
      "testability_score": number,
      "testability_justification": "string",
      "evidence_map": {
        "supporting_papers": ["paper_id"],
        "supporting_reasoning": "string",
        "contradicting_papers": ["paper_id"],
        "contradicting_reasoning": "string",
        "gap_being_addressed": "string"
      },
      "theoretical_framework": "string"
    }
  `;

  const hypotheses = await queryLLM(provider, apiKey, model, hypPrompt);
  globalState.hypotheses = hypotheses;

  onProgress("experiment_agent", "Designing experimental protocols and methodologies...", globalState);

  // STEP 4: Experiment Design Agent
  const expPrompt = `
    You are the Experiment Design Agent. For each of the 3 hypotheses generated, design a complete, rigorous experimental methodology:

    Hypotheses: ${JSON.stringify(hypotheses, null, 2)}
    Parsed variables: ${JSON.stringify(parsedQuery.variables)}

    For each hypothesis (H1, H2, H3), generate a corresponding experiment (E1, E2, E3). Use appropriate study designs (e.g. RCT, in-vitro/in-vivo, simulation, longitudinal).

    Return a JSON array of exactly 3 ExperimentObjects, conforming to this schema for each object:
    {
      "experiment_id": "E1 | E2 | E3",
      "hypothesis_id": "H1 | H2 | H3",
      "study_design": "string",
      "design_justification": "string",
      "participants_or_subjects": {
        "type": "human | animal | cell line | dataset | simulation",
        "inclusion_criteria": ["string"],
        "exclusion_criteria": ["string"],
        "sample_size": "string (with power calculation details)",
        "sampling_strategy": "string",
        "power_analysis": "string (alpha, beta, effect size, N)"
      },
      "materials_and_tools": {
        "equipment": ["string"],
        "reagents_or_stimuli": ["string"],
        "software": ["string"],
        "datasets_if_computational": ["string"]
      },
      "procedure": {
        "phases": [
          {
            "phase_name": "string",
            "duration": "string",
            "steps": ["string"],
            "measurements": ["string"]
          }
        ],
        "blinding": "single-blind | double-blind | open-label | not applicable",
        "randomization_method": "string",
        "control_group_description": "string"
      },
      "measurements": {
        "primary_outcome": {
          "measure": "string",
          "instrument": "string",
          "timepoints": ["string"],
          "units": "string"
        },
        "secondary_outcomes": [
          { "measure": "string", "instrument": "string", "timepoints": ["string"] }
        ]
      },
      "statistical_analysis": {
        "primary_test": "string",
        "significance_threshold": "string",
        "effect_size_metric": "string",
        "correction_for_multiple_comparisons": "string",
        "software": "string"
      },
      "timeline": {
        "total_duration": "string",
        "milestones": [
          { "week": number, "milestone": "string" }
        ]
      },
      "budget_estimate": {
        "personnel": "string (USD range)",
        "equipment": "string (USD range)",
        "consumables": "string (USD range)",
        "total_estimated": "string (USD range)"
      },
      "potential_confounds": ["string"],
      "mitigation_strategies": ["string"],
      "replication_strategy": "string"
    }
  `;

  const experiments = await queryLLM(provider, apiKey, model, expPrompt);
  globalState.experiments = experiments;

  onProgress("critique_agent", "Performing peer-review and ethical critique of the proposal...", globalState);

  // STEP 5: Critique Agent
  const critPrompt = `
    You are the Critique Agent, a senior peer reviewer.
    Evaluate the following hypotheses and experiment designs:

    Hypotheses: ${JSON.stringify(hypotheses, null, 2)}
    Experiments: ${JSON.stringify(experiments, null, 2)}

    Instructions:
    1. Evaluate each pair (H1+E1, H2+E2, H3+E3) on:
       - Novelty (0-10)
       - Feasibility (0-10)
       - Ethical concerns (including severity and mitigations)
       - Scientific rigor (0-10)
    2. Rank them and suggest optimal sequence.
    3. Outline synergies and fatal flaws.

    Return a JSON object conforming exactly to this structure:
    {
      "overall_score": number,
      "summary": "string",
      "best_hypothesis": "H1 | H2 | H3",
      "recommended_sequence": ["H1", "H2", "H3"],
      "synergy_opportunities": ["string"],
      "fatal_flaws": ["string"],
      "cross_cutting_recommendations": ["string"],
      "per_hypothesis": [
        {
          "hypothesis_id": "H1 | H2 | H3",
          "experiment_id": "E1 | E2 | E3",
          "novelty_assessment": {
            "score": number,
            "max_score": 10,
            "verdict": "highly novel | moderately novel | incremental | derivative",
            "rationale": "string",
            "prior_art_concerns": "string",
            "recommendation": "string"
          },
          "feasibility_assessment": {
            "score": number,
            "max_score": 10,
            "verdict": "highly feasible | feasible | challenging | not feasible",
            "rationale": "string",
            "resource_requirements": "low | moderate | high | very high",
            "technical_barriers": ["string"],
            "expertise_required": ["string"],
            "timeline_realism": "realistic | optimistic | unrealistic",
            "recommendation": "string"
          },
          "ethical_assessment": {
            "concerns_identified": boolean,
            "severity": "none | minor | moderate | major | blocking",
            "concern_list": [
              { "concern": "string", "severity": "minor | moderate | major", "mitigation": "string" }
            ],
            "irb_required": boolean,
            "animal_welfare_issues": boolean,
            "data_privacy_issues": boolean,
            "informed_consent_required": boolean,
            "dual_use_risk": boolean,
            "recommendation": "string"
          },
          "scientific_rigor_assessment": {
            "score": number,
            "max_score": 10,
            "internal_validity": "high | moderate | low",
            "external_validity": "high | moderate | low",
            "construct_validity": "high | moderate | low",
            "statistical_power": "adequate | borderline | inadequate",
            "confound_control": "thorough | partial | insufficient",
            "measurement_validity": "validated instruments | reasonable | weak",
            "weaknesses": ["string"],
            "strengths": ["string"],
            "recommendation": "string"
          },
          "overall_score": number,
          "overall_verdict": "strongly recommend | recommend with revisions | major revisions needed | do not recommend",
          "priority_ranking": number,
          "summary_for_researcher": "string (3-4 sentences)"
        }
      ]
    }
  `;

  const critique = await queryLLM(provider, apiKey, model, critPrompt);
  globalState.critique = critique;

  onProgress("proposal_synthesizer", "Synthesizing the final proposal document...", globalState);

  // STEP 6: Synthesizer
  const synthPrompt = `
    You are the Research Proposal Synthesizer.
    Using the accumulated research state, construct a cohesive and formal research proposal.

    Research Question: "${question}"
    Parsed query: ${JSON.stringify(parsedQuery)}
    Literature Synthesis: "${literatureResults.synthesis}"
    Hypotheses: ${JSON.stringify(hypotheses)}
    Experiments: ${JSON.stringify(experiments)}
    Critique: ${JSON.stringify(critique)}

    Assemble the proposal into 10 structured sections. Write rich, academic-style content.
    Do NOT invent references — the reference list and in-text citation tokens are generated
    separately from verified metadata, so leave "citations" and "10_references" as empty arrays.

    Return a JSON object conforming exactly to this structure:
    {
      "title": "string",
      "abstract": "string (250-word abstract)",
      "sections": {
        "1_introduction": {
          "background": "string (2-3 paragraphs)",
          "problem_statement": "string",
          "research_question": "string",
          "significance": "string"
        },
        "2_literature_review": {
          "content": "string (narrative synthesis)",
          "citations": []
        },
        "3_hypotheses": {
          "hypothesis_1": { "title": "string", "statement": "string", "null_hyp": "string", "alt_hyp": "string" },
          "hypothesis_2": { "title": "string", "statement": "string", "null_hyp": "string", "alt_hyp": "string" },
          "hypothesis_3": { "title": "string", "statement": "string", "null_hyp": "string", "alt_hyp": "string" }
        },
        "4_methodology": {
          "overview": "string",
          "primary_experiment": {},
          "alternative_experiments": []
        },
        "5_ethical_considerations": "string (consolidated ethical analysis)",
        "6_timeline_and_budget": "string (consolidated budget and timeline)",
        "7_expected_outcomes": "string",
        "8_limitations": "string",
        "9_future_directions": "string",
        "10_references": []
      }
    }
  `;

  const proposalResults = await queryLLM(provider, apiKey, model, synthPrompt);
  globalState.proposal = proposalResults;

  // Workstream 1: replace references/citations with deterministic ones from real metadata.
  if (globalState.proposal?.sections) {
    const refs = buildReferences(globalState.literature.papers);
    const inText = buildInTextCitations(globalState.literature.papers);
    globalState.proposal.sections["10_references"] = refs;
    if (globalState.proposal.sections["2_literature_review"]) {
      globalState.proposal.sections["2_literature_review"].citations = inText;
    }
  }

  // Workstream 2: drop any citations that don't map to a real retrieved paper.
  const dropped = validateCitations(globalState, validIds);
  if (globalState.grounding) globalState.grounding.dropped_citations = dropped;
  if (dropped.length > 0) {
    onProgress(
      "proposal_synthesizer",
      `⚠️ Removed ${dropped.length} invented citation(s) that did not match any retrieved paper.`,
      globalState
    );
  }

  // OPTIONAL: Verification agent (extra LLM call; only when enabled).
  if (verify) {
    onProgress("verification_agent", "Cross-checking claims against real source abstracts...", globalState);
    try {
      globalState.verification = await verifyProposal(provider, apiKey, model, globalState, rawById);
      onProgress(
        "verification_agent",
        `Verification complete — trust score ${globalState.verification.score}% (${globalState.verification.verified}/${globalState.verification.total_claims} claims supported).`,
        globalState
      );
    } catch (err: any) {
      globalState.verification = {
        enabled: true,
        score: 0,
        total_claims: 0,
        verified: 0,
        partially_supported: 0,
        unsupported: 0,
        claims: [],
        error: err?.message || "Verification failed."
      };
      onProgress("verification_agent", `⚠️ Verification could not complete: ${err?.message || "error"}`, globalState);
    }
  }

  onProgress("completed", "Pipeline completed successfully!", globalState);
  return globalState;
}
