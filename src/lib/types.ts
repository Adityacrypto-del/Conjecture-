export interface PaperObject {
  paper_id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  citation_count: number;
  relevance_score: number;
  abstract_summary: string;
  key_findings: string[];
  methodology_used: string;
  variables_studied: {
    independent: string[];
    dependent: string[];
  };
  limitations_stated: string[];
  supports_direction: "supports" | "contradicts" | "neutral" | "mixed";
  doi_or_url: string;
}

export interface GlobalState {
  session_id: string;
  timestamp: string;
  research_question: string;
  parsed_query: {
    domain: string;
    subdomain: string;
    key_concepts: string[];
    variables: {
      independent: string[];
      dependent: string[];
      confounding: string[];
    };
    research_type: "exploratory" | "confirmatory" | "mechanistic" | "applied";
    keywords_for_search: string[];
  };
  literature: {
    papers: PaperObject[];
    synthesis: string;
    knowledge_gaps: string[];
    consensus_findings: string[];
    contradictions: {
      topic: string;
      contradiction_description: string;
      paper_ids_side_a: string[];
      paper_ids_side_b: string[];
    }[];
  };
  hypotheses: HypothesisObject[];
  experiments: ExperimentObject[];
  critique: {
    overall_score: number;
    summary: string;
    best_hypothesis: string;
    recommended_sequence: string[];
    synergy_opportunities: string[];
    fatal_flaws: string[];
    cross_cutting_recommendations: string[];
    per_hypothesis: CritiqueObject[];
  };
  proposal: {
    title: string;
    abstract: string;
    sections: {
      "1_introduction": {
        background: string;
        problem_statement: string;
        research_question: string;
        significance: string;
      };
      "2_literature_review": {
        content: string;
        citations: string[];
      };
      "3_hypotheses": {
        hypothesis_1: {
          title: string;
          statement: string;
          null_hyp: string;
          alt_hyp: string;
        };
        hypothesis_2: {
          title: string;
          statement: string;
          null_hyp: string;
          alt_hyp: string;
        };
        hypothesis_3: {
          title: string;
          statement: string;
          null_hyp: string;
          alt_hyp: string;
        };
      };
      "4_methodology": {
        overview: string;
        primary_experiment: any;
        alternative_experiments: any[];
      };
      "5_ethical_considerations": string;
      "6_timeline_and_budget": string;
      "7_expected_outcomes": string;
      "8_limitations": string;
      "9_future_directions": string;
      "10_references": string[];
    };
  };
}

export interface HypothesisObject {
  hypothesis_id: "H1" | "H2" | "H3";
  strategy: "gap-filling" | "mechanistic" | "contrarian";
  title: string;
  statement: {
    if_then_because: string;
    H0: string;
    H1: string;
  };
  variables: {
    independent: string;
    dependent: string;
    controls: string[];
  };
  predicted_outcome: string;
  falsification_criterion: string;
  novelty_score: number;
  novelty_justification: string;
  testability_score: number;
  testability_justification: string;
  evidence_map: {
    supporting_papers: string[];
    supporting_reasoning: string;
    contradicting_papers: string[];
    contradicting_reasoning: string;
    gap_being_addressed: string;
  };
  theoretical_framework: string;
}

export interface ExperimentObject {
  experiment_id: "E1" | "E2" | "E3";
  hypothesis_id: "H1" | "H2" | "H3";
  study_design: string;
  design_justification: string;
  participants_or_subjects: {
    type: "human" | "animal" | "cell line" | "dataset" | "simulation";
    inclusion_criteria: string[];
    exclusion_criteria: string[];
    sample_size: string;
    sampling_strategy: string;
    power_analysis: string;
  };
  materials_and_tools: {
    equipment: string[];
    reagents_or_stimuli: string[];
    software: string[];
    datasets_if_computational: string[];
  };
  procedure: {
    phases: {
      phase_name: string;
      duration: string;
      steps: string[];
      measurements: string[];
    }[];
    blinding: "single-blind" | "double-blind" | "open-label" | "not applicable";
    randomization_method: string;
    control_group_description: string;
  };
  measurements: {
    primary_outcome: {
      measure: string;
      instrument: string;
      timepoints: string[];
      units: string;
    };
    secondary_outcomes: {
      measure: string;
      instrument: string;
      timepoints: string[];
    }[];
  };
  statistical_analysis: {
    primary_test: string;
    significance_threshold: string;
    effect_size_metric: string;
    correction_for_multiple_comparisons: string;
    software: string;
  };
  timeline: {
    total_duration: string;
    milestones: {
      week: number;
      milestone: string;
    }[];
  };
  budget_estimate: {
    personnel: string;
    equipment: string;
    consumables: string;
    total_estimated: string;
  };
  potential_confounds: string[];
  mitigation_strategies: string[];
  replication_strategy: string;
}

export interface CritiqueObject {
  hypothesis_id: "H1" | "H2" | "H3";
  experiment_id: "E1" | "E2" | "E3";
  novelty_assessment: {
    score: number;
    max_score: 10;
    verdict: "highly novel" | "moderately novel" | "incremental" | "derivative";
    rationale: string;
    prior_art_concerns: string;
    recommendation: string;
  };
  feasibility_assessment: {
    score: number;
    max_score: 10;
    verdict: "highly feasible" | "feasible" | "challenging" | "not feasible";
    rationale: string;
    resource_requirements: "low" | "moderate" | "high" | "very high";
    technical_barriers: string[];
    expertise_required: string[];
    timeline_realism: "realistic" | "optimistic" | "unrealistic";
    recommendation: string;
  };
  ethical_assessment: {
    concerns_identified: boolean;
    severity: "none" | "minor" | "moderate" | "major" | "blocking";
    concern_list: {
      concern: string;
      severity: "minor" | "moderate" | "major";
      mitigation: string;
    }[];
    irb_required: boolean;
    animal_welfare_issues: boolean;
    data_privacy_issues: boolean;
    informed_consent_required: boolean;
    dual_use_risk: boolean;
    recommendation: string;
  };
  scientific_rigor_assessment: {
    score: number;
    max_score: 10;
    internal_validity: "high" | "moderate" | "low";
    external_validity: "high" | "moderate" | "low";
    construct_validity: "high" | "moderate" | "low";
    statistical_power: "adequate" | "borderline" | "inadequate";
    confound_control: "thorough" | "partial" | "insufficient";
    measurement_validity: "validated instruments" | "reasonable" | "weak";
    weaknesses: string[];
    strengths: string[];
    recommendation: string;
  };
  overall_score: number;
  overall_verdict: "strongly recommend" | "recommend with revisions" | "major revisions needed" | "do not recommend";
  priority_ranking: number;
  summary_for_researcher: string;
}

export type PipelineStep =
  | "idle"
  | "orchestrator_parse"
  | "literature_agent"
  | "hypothesis_agent"
  | "experiment_agent"
  | "critique_agent"
  | "proposal_synthesizer"
  | "completed"
  | "error";

export interface LogEntry {
  timestamp: string;
  agent: "Orchestrator" | "Literature Agent" | "Hypothesis Agent" | "Experiment Agent" | "Critique Agent" | "Synthesizer";
  message: string;
  type: "info" | "success" | "warning" | "error";
}
