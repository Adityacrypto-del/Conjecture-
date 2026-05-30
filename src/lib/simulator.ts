import type { GlobalState, PaperObject, HypothesisObject, ExperimentObject, CritiqueObject } from "./types";
import { v4 as uuidv4 } from "uuid";

export function generateOfflineProposal(question: string): GlobalState {
  const cleanQ = question.trim();
  const lowerQ = cleanQ.toLowerCase();
  
  // Detect domain and subdomain
  let domain = "Biological Sciences";
  let subdomain = "Microbial Ecology";
  let keyConcepts = ["microplastics", "soil microbiome", "diversity"];
  let researchType: "exploratory" | "confirmatory" | "mechanistic" | "applied" = "mechanistic";
  let independent = ["Microplastic concentration (LDPE, 1-5% w/w)", "Microplastic polymer type (LDPE vs. PLA)"];
  let dependent = ["Bacterial species richness (Shannon Index)", "Functional metabolic profiles (respiration rates)", "Nitrogen fixation enzyme activity"];
  let confounding = ["Soil organic matter content", "Soil moisture levels", "Baseline bacterial composition", "Ambient temperature"];
  let keywords = ["microplastics", "soil microbiome", "soil bacteria", "metagenomic sequencing", "soil respiration"];
  
  if (lowerQ.includes("hallucination") || lowerQ.includes("llm") || lowerQ.includes("language model") || lowerQ.includes("ai") || lowerQ.includes("gpt")) {
    domain = "Computer and Information Sciences";
    subdomain = "Natural Language Processing / Artificial Intelligence";
    keyConcepts = ["large language models", "hallucinations", "factual consistency", "retrieval augmented generation"];
    researchType = "mechanistic";
    independent = ["Context window size (1k vs 32k tokens)", "RAG retrieval source density", "Temperature decoding parameter"];
    dependent = ["Factual hallucination rate (ROUGE-L/ROUGE-1 against gold standard)", "F1 score on factual Q&A", "Logical reasoning coherence"];
    confounding = ["Model size (parameters)", "Pre-training corpus overlap", "Prompt template phrasing"];
    keywords = ["LLM hallucination", "Retrieval-Augmented Generation", "factuality in LLMs", "attention mechanisms", "decoding strategies"];
  } else if (lowerQ.includes("quantum") || lowerQ.includes("qubit") || lowerQ.includes("superconductivity") || lowerQ.includes("physics")) {
    domain = "Physical Sciences";
    subdomain = "Quantum Physics / Condensed Matter";
    keyConcepts = ["quantum entanglement", "decoherence", "superconducting qubits", "noise mitigation"];
    researchType = "applied";
    independent = ["Cryogenic temperature (mK)", "Shielding layers (mu-metal vs aluminum)", "Pulse shape modulation"];
    dependent = ["Qubit coherence time (T1 and T2)", "Gate fidelity (Randomized Benchmarking)", "State readout error rates"];
    confounding = ["External electromagnetic noise", "Thermal fluctuations", "Crosstalk between qubits"];
    keywords = ["superconducting qubits", "decoherence times", "noise mitigation in quantum", "gate fidelity", "quantum error correction"];
  } else if (lowerQ.includes("cancer") || lowerQ.includes("tumor") || lowerQ.includes("cell") || lowerQ.includes("crispr") || lowerQ.includes("gene")) {
    domain = "Health & Medical Sciences";
    subdomain = "Oncology & Molecular Biology";
    keyConcepts = ["CRISPR-Cas9", "tumor suppressor genes", "somatic mutation", "immunotherapy"];
    researchType = "mechanistic";
    independent = ["CRISPR transfection efficiency", "Target gene knockout level (p53 vs PTEN)", "Drug dosage (nM)"];
    dependent = ["Cell proliferation rate", "Apoptotic index (Annexin V staining)", "In-vitro tumor spheroid volume"];
    confounding = ["Cell line passage number", "Off-target mutations", "Medium composition"];
    keywords = ["CRISPR-Cas9 gene editing", "tumor suppressor activation", "cell line proliferation", "apoptosis assays", "molecular oncology"];
  } else if (lowerQ.includes("vr") || lowerQ.includes("virtual reality") || lowerQ.includes("learning") || lowerQ.includes("memory") || lowerQ.includes("cognitive")) {
    domain = "Social & Behavioral Sciences";
    subdomain = "Cognitive Psychology & Educational Tech";
    keyConcepts = ["virtual reality", "spatial memory", "cognitive load", "immersive education"];
    researchType = "exploratory";
    independent = ["Immersive environment (Fully immersive VR vs 2D Desktop)", "Session duration (15 min vs 45 min)", "Instructional scaffolding"];
    dependent = ["Spatial recall accuracy (navigation test)", "Subjective cognitive load (NASA-TLX)", "Delayed recall score (after 48h)"];
    confounding = ["Prior video game experience", "Susceptibility to motion sickness", "Participant age"];
    keywords = ["virtual reality education", "cognitive load theory", "spatial memory retention", "NASA-TLX scale", "immersive learning"];
  } else {
    // Dynamic extraction based on user input words
    const words = cleanQ.replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 4);
    if (words.length >= 2) {
      keyConcepts = words.slice(0, 3).map(w => w.toLowerCase());
      independent = [`Varying levels of ${words[0] || "primary factor"}`, `Alternative configurations of ${words[0] || "primary factor"}`];
      dependent = [`Measurable output of ${words[1] || "target phenomenon"}`, `Rate of change in ${words[1] || "target phenomenon"}`];
      keywords = [...keyConcepts, `${keyConcepts[0]} impact`, `${keyConcepts[1]} correlation`];
    }
  }

  // Session metadata
  const session_id = uuidv4();
  const timestamp = new Date().toISOString();

  // Generate 5 Mock Papers
  const papers: PaperObject[] = [
    {
      paper_id: "paper_01",
      title: `Understanding the primary mechanisms of ${keyConcepts[0]} in modern setups`,
      authors: ["Smith, J.", "Martinez, A.", "Chen, L."],
      year: 2023,
      venue: "Journal of Advanced Scientific Research",
      citation_count: 142,
      relevance_score: 9,
      abstract_summary: `This paper provides a baseline investigation into how ${keyConcepts[0]} behaves in controlled environments. The authors show a clear correlation with ${keyConcepts[1] || "secondary variables"} under steady-state conditions, though extreme variants were not tested.`,
      key_findings: [
        `Established a significant positive correlation (p < 0.01) between ${keyConcepts[0]} and initial states.`,
        `Identified that temperature and moisture act as major confounding factors.`
      ],
      methodology_used: "Controlled laboratory replication with randomized blocks and linear regression modeling.",
      variables_studied: {
        independent: [independent[0]],
        dependent: [dependent[0]]
      },
      limitations_stated: [
        "Small sample sizes limit generalizability.",
        "Long-term structural decay of testing mediums was not evaluated."
      ],
      supports_direction: "supports",
      doi_or_url: "https://doi.org/10.1016/j.jasr.2023.04.012"
    },
    {
      paper_id: "paper_02",
      title: `Decoherence and anomalies in ${keyConcepts[1] || "secondary processes"} under high stress`,
      authors: ["Gomez, R.", "Taylor, S."],
      year: 2022,
      venue: "Proceedings of the National Academy of Science",
      citation_count: 89,
      relevance_score: 8,
      abstract_summary: `This study focuses on the failure modes of systems relying on ${keyConcepts[1] || "secondary systems"}. They note that while standard models predict linear decay, non-linear cascades occur when ambient disturbance exceeds specific critical thresholds.`,
      key_findings: [
        `Identified a critical tipping point (threshold alpha) where system degradation accelerates.`,
        `Fails to show a simple linear decay model, indicating complex feedback loops.`
      ],
      methodology_used: "High-throughput observational analysis coupled with non-linear simulation modeling.",
      variables_studied: {
        independent: [independent[0]],
        dependent: [dependent[1] || "system degradation"]
      },
      limitations_stated: [
        "Simulations assumed isotropic noise, which is rarely true in realistic operations.",
        "Measurements were taken at brief time intervals only."
      ],
      supports_direction: "neutral",
      doi_or_url: "https://doi.org/10.1073/pnas.221045982"
    },
    {
      paper_id: "paper_03",
      title: `Critical challenges in mitigating ${keyConcepts[0]} using standard protocols`,
      authors: ["Patel, K.", "Yamamoto, H.", "Schmidt, F."],
      year: 2024,
      venue: "Global Environmental and Technical Review",
      citation_count: 34,
      relevance_score: 9,
      abstract_summary: `The authors critique existing methodologies for controlling ${keyConcepts[0]} and propose a set of standards. They show that current protocols fail to account for ${confounding[0]}, leading to high rates of false negatives.`,
      key_findings: [
        `Demonstrated that 45% of standard trials suffered from confounding bias due to ${confounding[0]}.`,
        `Proposed a novel normalization algorithm to correct for baseline variations.`
      ],
      methodology_used: "Meta-analysis of 112 previous studies combined with validation laboratory experiments.",
      variables_studied: {
        independent: [independent[1]],
        dependent: [dependent[0]]
      },
      limitations_stated: [
        "Normalization algorithm has high computational overhead.",
        "Validation experiments were limited to specific soil/hardware compositions."
      ],
      supports_direction: "mixed",
      doi_or_url: "https://doi.org/10.1002/getr.2024.1105"
    },
    {
      paper_id: "paper_04",
      title: `A contrarian review: Why ${keyConcepts[0]} might not directly degrade ${keyConcepts[1] || "the target system"}`,
      authors: ["O'Connor, M.", "Ivanov, V."],
      year: 2021,
      venue: "Critical Reviews in Modern Science",
      citation_count: 110,
      relevance_score: 7,
      abstract_summary: `This paper challenges the prevailing consensus that ${keyConcepts[0]} is universally harmful. In specific anaerobic or low-activity states, the authors observe no measurable degradation, suggesting that the damaging mechanism is conditional rather than absolute.`,
      key_findings: [
        `Observed zero statistical significance in damage rates when activity was suppressed.`,
        `Argued that co-factors (enzymes or noise spikes) are the true drivers of degradation.`
      ],
      methodology_used: "In-vitro comparison under strict ambient controls (argon atmospheric gloveboxes).",
      variables_studied: {
        independent: ["Suppressed environment activity status"],
        dependent: [dependent[0]]
      },
      limitations_stated: [
        "Environmental suppression levels were highly artificial and difficult to replicate in-situ.",
        "Tested only for a single polymer/system archetype."
      ],
      supports_direction: "contradicts",
      doi_or_url: "https://doi.org/10.1080/crms.2021.9082"
    },
    {
      paper_id: "paper_05",
      title: `Innovative methods for measuring ${dependent[0]} at high fidelity`,
      authors: ["Zhu, Y.", "Al-Mutawa, M.", "Davies, G."],
      year: 2025,
      venue: "Nature Scientific Methods",
      citation_count: 12,
      relevance_score: 10,
      abstract_summary: `This very recent paper introduces a high-fidelity assay/protocol for tracking changes in ${dependent[0]}. It demonstrates a 10x improvement in detection thresholds, making it possible to observe micro-scale variations in real-time.`,
      key_findings: [
        `Developed the 'Bio-Quantum Tracer' (or equivalent diagnostic technique) reducing error margin to ±1.5%.`,
        `Captured transient fluctuations occurring within milliseconds of starting exposure.`
      ],
      methodology_used: "Sensor development and validation with micro-fluidic/micro-scale testbeds.",
      variables_studied: {
        independent: [independent[0]],
        dependent: [dependent[0], dependent[1]]
      },
      limitations_stated: [
        "Extremely high initial instrument calibration cost.",
        "Susceptible to vibrations and power fluctuations."
      ],
      supports_direction: "supports",
      doi_or_url: "https://doi.org/10.1038/s41592-025-01994-x"
    }
  ];

  // Synthesize Literature
  const synthesis = `The literature surrounding ${keyConcepts[0]} and its subsequent impact on ${keyConcepts[1] || "the target system"} reveals a highly complex and conditional interaction. Early baseline work by (Smith et al., 2023) established a strong positive correlation, suggesting that higher exposure to ${keyConcepts[0]} triggers immediate changes in ${dependent[0]}. However, this study did not account for structural variations over time. (Gomez & Taylor, 2022) expanded on this by highlighting non-linear cascades and decoherence under high ambient stress, identifying a critical threshold where degradation accelerates rapidly. 

Conversely, the field faces significant methodological debates. (Patel et al., 2024) demonstrated that traditional protocols suffer from severe confounding bias, specifically from ${confounding[0]}, which raises doubts about older experimental conclusions. This critical viewpoint is supported by the contrarian study of (O'Connor & Ivanov, 2021), who found no significant degradation in suppressed environments, suggesting the primary mechanism is dependent on specific co-factors rather than being an absolute consequence. Most recently, (Zhu et al., 2025) has provided the field with high-fidelity measurement protocols, enabling researchers to observe micro-scale fluctuations in real-time with an error margin of only 1.5%. This technological advancement offers a pathway to resolve these existing contradictions by tracking early-stage dynamics more accurately.`;

  const knowledge_gaps = [
    `Lack of long-term (multi-year) longitudinal studies evaluating whether systems adapt to persistent exposure of ${keyConcepts[0]}.`,
    `Poor understanding of the interactive effects between ${independent[0]} and ${confounding[0]} under natural, unsuppressed environments.`,
    `Absence of molecular-level or sub-nanosecond mechanistic models explaining the specific pathway of transition at the boundary interfaces.`
  ];

  const consensus_findings = [
    `${keyConcepts[0]} exposure causes non-linear variations under high ambient stress levels (agreed by Smith, Gomez, and Zhu).`,
    `Traditional measurement instruments introduce significant background noise or confounding bias (agreed by Patel and Zhu).`,
    `Environmental states (e.g. moisture, temperature, or cryogenic shielding) strongly dictate the rate of the target interaction (agreed by Smith, Patel, and O'Connor).`
  ];

  const contradictions = [
    {
      topic: "Conditionality of Degradation",
      contradiction_description: "Whether exposure to the independent factor causes absolute degradation or is completely conditional upon active co-factors.",
      paper_ids_side_a: ["paper_01", "paper_02"],
      paper_ids_side_b: ["paper_04"]
    }
  ];

  // Generate 3 Hypotheses
  const hypotheses: HypothesisObject[] = [
    {
      hypothesis_id: "H1",
      strategy: "gap-filling",
      title: "Interactive Impact of Exposure and Substrate Composition",
      statement: {
        if_then_because: `If the system is exposed to high levels of ${independent[0]} in a substrate with elevated ${confounding[0]}, then the rate of change in ${dependent[0]} will accelerate quadratically, because the substrate's organic/physical structures serve as a catalyst that amplifies the disruptive properties of the exposure.`,
        H0: `Exposure to ${independent[0]} under varying levels of ${confounding[0]} has no statistically significant interactive effect on ${dependent[0]}.`,
        H1: `There is a significant interactive effect, where higher levels of ${confounding[0]} amplify the degradation caused by ${independent[0]}.`
      },
      variables: {
        independent: `${independent[0]} crossed with three levels of ${confounding[0]} (low, medium, high).`,
        dependent: `Shannon diversity index of ${dependent[0]} and absolute concentration levels.`,
        controls: ["Ambient temperature (22°C)", "Baseline calibration values", "Duration of exposure (90 days)"]
      },
      predicted_outcome: "A 40% steeper reduction in diversity metrics in the high-confound, high-exposure group compared to the low-confound control.",
      falsification_criterion: "No significant interaction term in the two-way ANOVA, or a flat response curve across all substrate levels.",
      novelty_score: 8,
      novelty_justification: "Fills the specific gap identified regarding interactive environmental factors in natural setups.",
      testability_score: 9,
      testability_justification: "Can be tested using standard factorial laboratory designs with verified assays.",
      evidence_map: {
        supporting_papers: ["paper_01", "paper_03"],
        supporting_reasoning: "Smith established the main effect of exposure, and Patel highlighted that substrate composition is a major confounding variable that must be analyzed interactively.",
        contradicting_papers: ["paper_04"],
        contradicting_reasoning: "O'Connor suggests that the interaction may not occur if the baseline environment is kept in an inactive state.",
        gap_being_addressed: knowledge_gaps[1]
      },
      theoretical_framework: "Biotransformation & Physical Catalysis Theory"
    },
    {
      hypothesis_id: "H2",
      strategy: "mechanistic",
      title: "Sub-microscopic Boundary Diffusion Causal Pathway",
      statement: {
        if_then_because: `If the system is subjected to incremental levels of ${independent[0]}, then we will observe discrete transitions in ${dependent[1] || "energy profiles"} at the interface boundaries, because the boundary walls undergo microscopic lattice stress and eventual breakdown, facilitating rapid diffusion.`,
        H0: `Qubit or membrane structures do not show discrete structural transitions or boundary leakage under varying levels of exposure.`,
        H1: `Boundary diffusion rates will show step-like increases corresponding to specific microscopic mechanical stress thresholds.`
      },
      variables: {
        independent: `Exposure dosage steps (0, 0.5%, 1.0%, 2.5%, 5.0% w/w or equivalents).`,
        dependent: `Structural boundary diffusion rate (measured via high-resolution TEM or spectroscopy).`,
        controls: ["Inert gas atmosphere", "Pressure (1 atm)", "Excitation wavelength (532 nm)"]
      },
      predicted_outcome: "Step-like increases in leakage rates at the 1.0% and 2.5% thresholds, validating the lattice stress model.",
      falsification_criterion: "A continuous, smooth linear leakage rate with no threshold behaviors or structural changes observed under imaging.",
      novelty_score: 9,
      novelty_justification: "Proposes a new sub-microscopic mechanism for boundary diffusion that has not been directly imaged in-situ.",
      testability_score: 7,
      testability_justification: "Requires highly specialized electron microscopy or cryogenic sensing, making it technically challenging.",
      evidence_map: {
        supporting_papers: ["paper_02", "paper_05"],
        supporting_reasoning: "Gomez noted non-linear cascades indicating critical thresholds, and Zhu developed high-fidelity measurement methods capable of capturing such rapid changes.",
        contradicting_papers: [],
        contradicting_reasoning: "No retrieved papers directly contradict the molecular boundary hypothesis, although baseline papers lack the resolution to prove it.",
        gap_being_addressed: knowledge_gaps[2]
      },
      theoretical_framework: "Lattice Stress & Interfacial Diffusion Mechanics"
    },
    {
      hypothesis_id: "H3",
      strategy: "contrarian",
      title: "Biphasic Hormetic Adaptation Phenomenon",
      statement: {
        if_then_because: `If the system is exposed to ultra-low concentrations of ${independent[0]} over a prolonged period, then it will exhibit an increase in ${dependent[0]} (hormesis) before showing degradation at high concentrations, because low-level stress activates homeostatic repair mechanisms that overcompensate and temporarily enhance structural resilience.`,
        H0: `Low-level exposure to ${independent[0]} results in either linear degradation or zero change, with no enhancement phase.`,
        H1: `Low-level exposure leads to a statistically significant transient increase (up to 15-20%) in performance/diversity metrics.`
      },
      variables: {
        independent: `Ultra-low dosage (0.01% w/w) vs high dosage (5% w/w) vs zero control.`,
        dependent: `Metabolic activity index and survival rates over a 12-month period.`,
        controls: ["Temperature", "Moisture/Shielding integrity", "Nutrient supply rates"]
      },
      predicted_outcome: "The low-dosage group will display a 15% increase in activity at Month 3, followed by a plateau, while the high-dosage group degrades immediately.",
      falsification_criterion: "Immediate monotonic decline in the low-dosage group, or no statistical deviation from the zero control group.",
      novelty_score: 10,
      novelty_justification: "Directly challenges the consensus that exposure is monotonically toxic, proposing a biphasic adaptation curve instead.",
      testability_score: 8,
      testability_justification: "Highly testable but requires a long-term testing window (12 months) to capture the complete biphasic curve.",
      evidence_map: {
        supporting_papers: ["paper_04"],
        supporting_reasoning: "O'Connor's finding of zero degradation at certain states supports the idea that exposure is not universally toxic and can trigger adaptive equilibrium.",
        contradicting_papers: ["paper_01", "paper_02"],
        contradicting_reasoning: "Smith and Gomez claim that any level of exposure leads to system degradation, proposing simple harmful models.",
        gap_being_addressed: knowledge_gaps[0]
      },
      theoretical_framework: "Hormesis & Homeostatic Overcompensation Theory"
    }
  ];

  // Generate 3 Experiments
  const experiments: ExperimentObject[] = [
    {
      experiment_id: "E1",
      hypothesis_id: "H1",
      study_design: "Factorial Randomized Block Design",
      design_justification: "Allows simultaneous evaluation of the independent variable and the environmental confound (substrate composition), including their interaction effect.",
      participants_or_subjects: {
        type: "dataset",
        inclusion_criteria: ["Homogeneous soil matrix or core substrate", "Organic carbon content between 1.5% and 4.0%", "Zero baseline synthetic polymer contamination"],
        exclusion_criteria: ["Presence of heavy metal contaminants", "History of pesticide treatment within past 3 years"],
        sample_size: "N = 72 test units (6 blocks x 3 exposure levels x 4 confound levels)",
        sampling_strategy: "randomized block assignment",
        power_analysis: "Alpha = 0.05, Power (1-Beta) = 0.85, Expected Effect Size f = 0.35 (medium-large). Required N = 72 achieved using G*Power 3.1 calculations."
      },
      materials_and_tools: {
        equipment: ["High-Throughput Metagenomic Sequencer (Illumina NovaSeq)", "Environmental Micro-Incubators", "Gas Chromatograph-Mass Spectrometer (GC-MS)"],
        reagents_or_stimuli: ["Low-Density Polyethylene microplastics (150-200 µm)", "DNeasy PowerSoil Isolation Kits", "Standard fluorogenic enzyme substrates"],
        software: ["QIIME2 pipeline", "R stats package v4.3.1", "JASP for Bayesian ANOVA"],
        datasets_if_computational: ["SILVA rRNA database v138.1"]
      },
      procedure: {
        phases: [
          {
            phase_name: "Substrate Conditioning & Baseline",
            duration: "2 weeks",
            steps: [
              "Homogenize collected substrates and sieve to <2mm.",
              "Adjust soil moisture to 60% water holding capacity.",
              "Perform baseline microbial extraction and respiration readings."
            ],
            measurements: ["Baseline Shannon Index", "Total organic carbon", "pH levels"]
          },
          {
            phase_name: "Exposure & Incubation",
            duration: "12 weeks",
            steps: [
              "Incorporate microplastics at 0% (control), 1% (low), and 5% (high) w/w.",
              "Distribute blocks across different organic matter levels.",
              "Maintain incubators at 22°C in complete darkness."
            ],
            measurements: ["Weekly CO2 efflux", "Moisture checks"]
          },
          {
            phase_name: "Post-exposure Extraction & Sequencing",
            duration: "2 weeks",
            steps: [
              "Extract microbial DNA from all 72 microcosms.",
              "Perform 16S rRNA gene sequencing (V4 region).",
              "Analyze metabolic profiles using GC-MS."
            ],
            measurements: ["Final Shannon diversity index", "Abundance of nitrogen-fixing taxa", "Enzymatic activity rates"]
          }
        ],
        blinding: "double-blind",
        randomization_method: "Computer-generated random numbers assigned units to treatment codes, kept sealed by an independent administrator until data collection completed.",
        control_group_description: "Microcosms containing 0% microplastics, incubated under identical moisture and temperature levels."
      },
      measurements: {
        primary_outcome: {
          measure: "Shannon Diversity Index (H')",
          instrument: "16S metagenomic operational taxonomic unit (OTU) counts",
          timepoints: ["Baseline (Week 0)", "Midpoint (Week 6)", "Endpoint (Week 12)"],
          units: "dimensionless entropy metric"
        },
        secondary_outcomes: [
          {
            measure: "Net Carbon Respiration Rate",
            instrument: "Infrared Gas Analyzer",
            timepoints: ["Weekly"]
          },
          {
            measure: "Nitrogenase Enzyme Activity",
            instrument: "Acetylene Reduction Assay",
            timepoints: ["Endpoint (Week 12)"]
          }
        ]
      },
      statistical_analysis: {
        primary_test: "Two-Way Factorial ANOVA with interaction terms",
        significance_threshold: "p < 0.05 (FDR-corrected using Benjamini-Hochberg)",
        effect_size_metric: "partial eta-squared (η²)",
        correction_for_multiple_comparisons: "FDR",
        software: "R (stats and car packages)"
      },
      timeline: {
        total_duration: "16 weeks",
        milestones: [
          { week: 0, milestone: "IRB/Ethics exemption approval and material sourcing completed." },
          { week: 2, milestone: "Baseline characterization and blocking completed." },
          { week: 14, milestone: "Incubation and DNA extraction completed." },
          { week: 16, milestone: "Sequencing, statistical analysis, and draft manuscript finalized." }
        ]
      },
      budget_estimate: {
        personnel: "$15,000 - $20,000",
        equipment: "$5,000 - $8,000",
        consumables: "$12,000 - $15,000",
        total_estimated: "$32,000 - $43,000"
      },
      potential_confounds: [
        "Fungal contamination in soil chambers.",
        "Variability in plastic particle size distributions."
      ],
      mitigation_strategies: [
        "Include fungicide pre-treatment or strict sterilization protocols for equipment.",
        "Pass plastic polymers through calibrated micro-sieves to ensure strict 150-200 µm range."
      ],
      replication_strategy: "Run all qPCR and sequencing runs in technical triplicates; maintain three identical chamber rooms to prevent incubator room bias."
    },
    {
      experiment_id: "E2",
      hypothesis_id: "H2",
      study_design: "In-Vitro Microfluidic Real-time Imaging Design",
      design_justification: "Required to capture the transient structural transitions and boundary diffusion rates at sub-microscopic scales in real-time, validating the mechanical stress mechanism.",
      participants_or_subjects: {
        type: "cell line",
        inclusion_criteria: ["Ultra-thin synthetic lipid bilayers (20-30 nm thickness) or silicon nitride membranes", "Baseline impermeability to fluorescent tracer dyes"],
        exclusion_criteria: ["Presence of micro-fractures in silicon frame before testing", "Liposome diameter variations > 5%"],
        sample_size: "N = 30 membranes (10 per exposure step group)",
        sampling_strategy: "purposive selection of crack-free membranes",
        power_analysis: "Alpha = 0.01, Power = 0.90, Expected Effect Size d = 1.2 (large). Required N = 30."
      },
      materials_and_tools: {
        equipment: ["Cryogenic Transmission Electron Microscope (Cryo-TEM)", "Confocal Laser Scanning Microscope (CLSM)", "High-speed scientific CMOS camera (1000 fps)"],
        reagents_or_stimuli: ["Fluorescent tracer dye (FITC-Dextran, 4 kDa)", "Micro-pipette aspiration kit", "Varying concentration solutions of target chemicals"],
        software: ["ImageJ with Particle Tracker plugin", "MATLAB for lattice stress calculations"],
        datasets_if_computational: ["None"]
      },
      procedure: {
        phases: [
          {
            phase_name: "Membrane Assembly & Calibration",
            duration: "3 days",
            steps: [
              "Form lipid membranes across microfluidic apertures.",
              "Confirm lack of leakage using control buffer.",
              "Calibrate laser intensity to minimize photobleaching."
            ],
            measurements: ["Baseline fluorescence", "Membrane resistance (Giga-ohm seal)"]
          },
          {
            phase_name: "Stimulus Introduction & High-Speed Capture",
            duration: "2 days",
            steps: [
              "Inject chemical exposure into the donor side of the microfluidic cell.",
              "Initiate high-speed recording of the receptor chamber.",
              "Monitor membrane deformation using confocal microscopy."
            ],
            measurements: ["Lattice strain percentage", "FITC-Dextran leak rate"]
          }
        ],
        blinding: "single-blind",
        randomization_method: "Membranes assigned to dosage groups using a computer-generated block randomization plan.",
        control_group_description: "Membranes exposed to pure buffer solution, monitored for identical durations."
      },
      measurements: {
        primary_outcome: {
          measure: "Boundary Diffusion Coefficient (D)",
          instrument: "Fluorescence Recovery After Photobleaching (FRAP) & High-speed imaging",
          timepoints: ["T=0 to T=600 seconds, continuously at 100Hz"],
          units: "µm²/second"
        },
        secondary_outcomes: [
          {
            measure: "Lattice Fracture Index",
            instrument: "Cryo-TEM image analysis",
            timepoints: ["T=600 seconds (post-run)"]
          }
        ]
      },
      statistical_analysis: {
        primary_test: "One-Way ANOVA with post-hoc Tukey HSD test",
        significance_threshold: "p < 0.01 (strict significance threshold)",
        effect_size_metric: "Cohen's d",
        correction_for_multiple_comparisons: "Tukey's HSD",
        software: "Python scipy.stats package"
      },
      timeline: {
        total_duration: "6 weeks",
        milestones: [
          { week: 0, milestone: "Source silicon apertures and calibrate cryo-TEM." },
          { week: 2, milestone: "Complete assembly of 40 lipid bilayers." },
          { week: 4, milestone: "Complete all high-speed exposure runs." },
          { week: 6, milestone: "Complete image analysis, stress mapping, and upload code to repository." }
        ]
      },
      budget_estimate: {
        personnel: "$8,000 - $12,000",
        equipment: "$20,000 - $25,000 (TEM facility fees)",
        consumables: "$4,000 - $6,000",
        total_estimated: "$32,000 - $43,000"
      },
      potential_confounds: [
        "Laser-induced thermal expansion of the membrane.",
        "Adsorption of dyes to the microfluidic channel walls."
      ],
      mitigation_strategies: [
        "Use low-intensity pulsed lasers instead of continuous wave.",
        "Coat channels with inert fluorinated polymer layer (CYTOP) to prevent adsorption."
      ],
      replication_strategy: "Replicate each dosage run 5 times on independent days; include standard reference bilayers in each batch."
    },
    {
      experiment_id: "E3",
      hypothesis_id: "H3",
      study_design: "Longitudinal Randomized Cohort Design",
      design_justification: "Necessary to evaluate the biphasic hormetic adaptation curve (overcompensation phase followed by degradation phase) over a prolonged duration (12 months).",
      participants_or_subjects: {
        type: "animal",
        inclusion_criteria: ["Healthy adult subjects (e.g. C. elegans or micro-arthropods)", "Synchronized age cohorts (L4 larval stage)", "Derived from single parent clone to ensure genetic homogeneity"],
        exclusion_criteria: ["Signs of fungal infection in parent plates", "Developmental delays during egg-hatching phase"],
        sample_size: "N = 600 subjects (200 per cohort group: Control, Low-Dose, High-Dose)",
        sampling_strategy: "random selection from synchronized population plates",
        power_analysis: "Alpha = 0.05, Power = 0.90, Expected Hazard Ratio = 1.5. Required N = 180 per group, rounded to 200 to account for natural attrition."
      },
      materials_and_tools: {
        equipment: ["Automated worm tracker (WormLab system)", "Stereo microscopes with cooling stages", "Incubator cabinet with digital timer"],
        reagents_or_stimuli: ["Nematode Growth Medium (NGM)", "Fluorogenically labeled E. coli OP50", "Target chemical concentrations"],
        software: ["WormLab analyzer software v2022", "R survival package", "JMP statistical platform"],
        datasets_if_computational: ["None"]
      },
      procedure: {
        phases: [
          {
            phase_name: "Population Synchronization & Dosing",
            duration: "1 week",
            steps: [
              "Perform egg prep using bleach-sodium hydroxide solution.",
              "Allow eggs to hatch overnight in M9 buffer.",
              "Seed larvae onto plates containing 0% (control), 0.01% (low-dose), and 5.0% (high-dose) exposure."
            ],
            measurements: ["Baseline population counts", "Hatching efficiency"]
          },
          {
            phase_name: "Longitudinal Monitoring",
            duration: "12 months (or equivalent lifespan, e.g. 30 days for C. elegans)",
            steps: [
              "Transfer cohorts to fresh plates every 2 days to prevent starvation and offspring mixing.",
              "Record swimming velocity and pharyngeal pumping rates.",
              "Log daily mortality statistics."
            ],
            measurements: ["Daily survival rate", "Pharyngeal pumping rate (pumps/min)", "Thrashing rate in liquid buffer"]
          }
        ],
        blinding: "double-blind",
        randomization_method: "Plates labeled with randomized bar codes. Investigator tracking and scoring was blind to the barcode mapping, which was stored in an encrypted file.",
        control_group_description: "Synchronized cohort maintained on standard NGM plates with solvent control (no active chemical exposure)."
      },
      measurements: {
        primary_outcome: {
          measure: "Median Lifespan & Survival Rate",
          instrument: "Kaplan-Meier survival logging",
          timepoints: ["Daily monitoring until all subjects deceased"],
          units: "days"
        },
        secondary_outcomes: [
          {
            measure: "Locomotor Performance",
            instrument: "WormLab thrashing frequency analyzer",
            timepoints: ["Day 2", "Day 7", "Day 14", "Day 21"]
          },
          {
            measure: "Intracellular Reactive Oxygen Species",
            instrument: "CM-H2DCFDA fluorescence assay",
            timepoints: ["Day 5", "Day 15"]
          }
        ]
      },
      statistical_analysis: {
        primary_test: "Log-Rank (Mantel-Cox) test for survival curves, Cox Proportional Hazards model",
        significance_threshold: "p < 0.05",
        effect_size_metric: "Hazard Ratio (HR) and Median Lifespan Difference",
        correction_for_multiple_comparisons: "Bonferroni-Holm for post-hoc pair comparison",
        software: "R (survival and survminer packages)"
      },
      timeline: {
        total_duration: "14 months",
        milestones: [
          { week: 0, milestone: "Institutional Animal Care and Use Committee (IACUC) approval/filing." },
          { week: 2, milestone: "Hormesis calibration runs and dosing levels verified." },
          { week: 10, milestone: "First complete cohort lifespan trial completed." },
          { week: 20, milestone: "Second replicate cohort trial completed." },
          { week: 24, milestone: "Final survival data compiled and Cox models fitted." }
        ]
      },
      budget_estimate: {
        personnel: "$12,000 - $16,000",
        equipment: "$4,000 - $6,000",
        consumables: "$6,000 - $9,000",
        total_estimated: "$22,000 - $31,000"
      },
      potential_confounds: [
        "Bacterial pathogen growth on plates mimicking chemical toxicity.",
        "Temperature drift in aging incubators."
      ],
      mitigation_strategies: [
        "Include low-dose kanamycin in NGM plates to restrict bacterial overgrowth.",
        "Utilize dual-sensor temperature logs with automated SMS alarm alerts for drift >0.5°C."
      ],
      replication_strategy: "Conduct three fully independent replicate cohort trials spaced 1 month apart."
    }
  ];

  // Generate Critique Report
  const per_hypothesis: CritiqueObject[] = [
    {
      hypothesis_id: "H1",
      experiment_id: "E1",
      novelty_assessment: {
        score: 8,
        max_score: 10,
        verdict: "highly novel",
        rationale: "Fills a distinct gap concerning environmental interaction. Most previous papers focus either solely on exposure concentration or on soil type, neglecting the combined interaction of both.",
        prior_art_concerns: "Some overlap exists with research on agricultural soils, but specific mechanisms in urban soils are unexamined.",
        recommendation: "Increase novelty by testing multiple polymers (e.g. biodegradable vs non-biodegradable) to compare interaction dynamics."
      },
      feasibility_assessment: {
        score: 9,
        max_score: 10,
        verdict: "highly feasible",
        rationale: "Requires standard agricultural lab equipment and well-established 16S sequencing pipelines. Budget is moderate and timeline is highly realistic.",
        resource_requirements: "moderate",
        technical_barriers: ["DNA extraction yield from high-clay soils might be low"],
        expertise_required: ["Microbial bioinformatics", "Soil chemistry"],
        timeline_realism: "realistic",
        recommendation: "Ensure a dedicated technician is budgeted for bioinformatic analysis to avoid delays."
      },
      ethical_assessment: {
        concerns_identified: false,
        severity: "none",
        concern_list: [
          {
            concern: "Release of microplastics into the environment during soil sampling",
            severity: "minor",
            mitigation: "All microcosms kept in sealed containment bags and autoclaved prior to disposal."
          }
        ],
        irb_required: false,
        animal_welfare_issues: false,
        data_privacy_issues: false,
        informed_consent_required: false,
        dual_use_risk: false,
        recommendation: "None. Follow standard biosafety level 1 containment procedures."
      },
      scientific_rigor_assessment: {
        score: 9,
        max_score: 10,
        internal_validity: "high",
        external_validity: "moderate",
        construct_validity: "high",
        statistical_power: "adequate",
        confound_control: "thorough",
        measurement_validity: "validated instruments",
        weaknesses: ["Metagenomic sequencing shows relative abundance, not absolute cell counts"],
        strengths: ["Factorial design controls for multiple confound states concurrently"],
        recommendation: "Add flow cytometry or qPCR to measure absolute bacterial abundance to supplement the Shannon index."
      },
      overall_score: 8.7,
      overall_verdict: "strongly recommend",
      priority_ranking: 1,
      summary_for_researcher: "H1 offers the highest scientific rigor and feasibility. The study design is solid and directly addresses an open question regarding substrate interactions. With the minor addition of qPCR for cell counts, this proposal is ready for funding."
    },
    {
      hypothesis_id: "H2",
      experiment_id: "E2",
      novelty_assessment: {
        score: 9,
        max_score: 10,
        verdict: "highly novel",
        rationale: "Proposing in-situ sub-nanosecond measurement of boundary diffusion represents a major leap in spatial-temporal resolution for this field.",
        prior_art_concerns: "Similar methods exist in lipid-raft cell biology, but have not been applied to this specific synthetic chemical stress case.",
        recommendation: "Ensure integration with current fluidic models to show compatibility with standard bio-membranes."
      },
      feasibility_assessment: {
        score: 6,
        max_score: 10,
        verdict: "challenging",
        rationale: "Requires advanced Cryo-TEM and sub-millisecond confocal tracking, which are expensive and technically complex. High probability of membrane rupture during setup.",
        resource_requirements: "very high",
        technical_barriers: ["Membrane instability in high-fluid flow", "Photobleaching of tracer dyes during continuous high-intensity laser exposure"],
        expertise_required: ["Cryo-EM operations", "Advanced microfluidic engineering"],
        timeline_realism: "optimistic",
        recommendation: "Add an initial 4-week pilot phase purely dedicated to membrane stability calibration before beginning formal trials."
      },
      ethical_assessment: {
        concerns_identified: false,
        severity: "none",
        concern_list: [],
        irb_required: false,
        animal_welfare_issues: false,
        data_privacy_issues: false,
        informed_consent_required: false,
        dual_use_risk: false,
        recommendation: "Ensure proper chemical waste disposal protocols are followed for fluorophores."
      },
      scientific_rigor_assessment: {
        score: 8,
        max_score: 10,
        internal_validity: "high",
        external_validity: "low",
        construct_validity: "moderate",
        statistical_power: "adequate",
        confound_control: "partial",
        measurement_validity: "validated instruments",
        weaknesses: ["Synthetic membranes do not fully replicate the complexity of living cell walls"],
        strengths: ["Extremely high spatial-temporal resolution enables direct causal observation"],
        recommendation: "Incorporate native bacterial cell envelope proteins into the lipid bilayer to improve biological construct validity."
      },
      overall_score: 7.7,
      overall_verdict: "recommend with revisions",
      priority_ranking: 3,
      summary_for_researcher: "H2 describes an innovative mechanism but faces significant technical barriers. It is highly recommended to establish the lipid membrane stability first. Consider collaborating with a specialized physics core facility to manage Cryo-TEM access."
    },
    {
      hypothesis_id: "H3",
      experiment_id: "E3",
      novelty_assessment: {
        score: 10,
        max_score: 10,
        verdict: "highly novel",
        rationale: "Challenging the linear-toxicity consensus by introducing a biphasic hormetic curve is highly creative and could redefine safety thresholds.",
        prior_art_concerns: "Hormesis is observed in radiation biology, but rarely detailed or formally tested for this category of synthetic contaminants.",
        recommendation: "Provide a detailed biochemical model of stress response pathways to support the empirical results."
      },
      feasibility_assessment: {
        score: 8,
        max_score: 10,
        verdict: "feasible",
        rationale: "C. elegans is a highly accessible model organism with low maintenance costs. However, running a 12-month longitudinal cohort study requires high discipline and persistent tracking.",
        resource_requirements: "moderate",
        technical_barriers: ["Contamination of plates by secondary mold", "Manual transfer labor overhead"],
        expertise_required: ["Nematode husbandry", "Survival modeling statistics"],
        timeline_realism: "realistic",
        recommendation: "Use automated microfluidic plates (like 'WormChips') to automate transfers and reduce manual labor overhead."
      },
      ethical_assessment: {
        concerns_identified: true,
        severity: "minor",
        concern_list: [
          {
            concern: "Mass culturing of invertebrate animal models",
            severity: "minor",
            mitigation: "Nematodes are not protected species under standard IACUC guidelines, but humane disposal via autoclaving/bleaching will be strictly followed."
          }
        ],
        irb_required: false,
        animal_welfare_issues: true,
        data_privacy_issues: false,
        informed_consent_required: false,
        dual_use_risk: false,
        recommendation: "Follow standard NIH Guidelines for the Care and Use of Laboratory Animals."
      },
      scientific_rigor_assessment: {
        score: 8.5,
        max_score: 10,
        internal_validity: "high",
        external_validity: "moderate",
        construct_validity: "high",
        statistical_power: "adequate",
        confound_control: "thorough",
        measurement_validity: "reasonable",
        weaknesses: ["Invertebrate models may not translate directly to vertebrate homeostatic mechanisms"],
        strengths: ["Large sample size (N=600) provides outstanding statistical power for survival analysis"],
        recommendation: "Include a follow-up biomarker assay (e.g. hsp-16.2 expression) to confirm the molecular stress response in the low-dose group."
      },
      overall_score: 8.6,
      overall_verdict: "strongly recommend",
      priority_ranking: 2,
      summary_for_researcher: "H3 is a highly compelling contrarian concept with potential for high-impact publication. The large-scale animal tracking provides excellent power. Some automation revisions are suggested to prevent manual errors during long-term monitoring."
    }
  ];

  const overall_score = parseFloat(((per_hypothesis[0].overall_score + per_hypothesis[1].overall_score + per_hypothesis[2].overall_score) / 3).toFixed(2));

  const critique = {
    overall_score,
    summary: `The overall proposal presents an exceptionally strong, multi-faceted investigation into the dynamics of ${keyConcepts[0]}. H1 offers an immediate, highly rigorous, and feasible pathway to test environmental interactions with low cost. H3 offers a brilliant contrarian angle exploring biphasic adaptation (hormesis) in model organisms, which could heavily impact policy guidelines. H2 represents a high-risk, high-reward mechanistic study that requires advanced imaging cores. Together, these experiments provide excellent methodological triangulation.`,
    best_hypothesis: "H1",
    recommended_sequence: ["H1", "H3", "H2"],
    synergy_opportunities: [
      "Materials and polymer characterization from H1 can feed directly into membrane calibration standards for H2.",
      "The automation pipeline or sensors calibrated in H2 can help track C. elegans movement micro-fluctuations in H3."
    ],
    fatal_flaws: [],
    cross_cutting_recommendations: [
      "Standardize the specific polymer source across all three experiments to allow direct cross-study comparisons.",
      "Engage an advisory bioinformatician early to establish sequencing database pipelines."
    ],
    per_hypothesis
  };

  // Build final proposal skeleton
  const proposal = {
    title: `Deciphering the ${domain} of ${keyConcepts[0]} through Interfacial and Environmental Triangulation`,
    abstract: `This research proposal outlines a comprehensive, multi-agent designed study investigating the impacts and pathways of ${keyConcepts[0]}. While consensus suggests general degradation of ${keyConcepts[1] || "target systems"}, the specific boundary mechanisms and environmental interactions remain unresolved. We present a three-pronged approach: first, a factorial randomized block experiment investigating the interactive effects of exposure and substrate variables; second, a high-resolution cryo-electron microscopy study mapping sub-nanosecond boundary diffusion; and third, a longitudinal cohort model evaluating a novel biphasic hormetic adaptation curve. Together, these experiments triangulate the physical and ecological dynamics of synthetic contaminant exposure. The results will resolve long-standing methodological contradictions, identify critical degradation thresholds, and support updated environmental policy standards.`,
    sections: {
      "1_introduction": {
        background: `The rapid rise of synthetic chemical contaminants in natural environments has emerged as a defining ecological and physical challenge. Initial research, such as the seminal study by (Smith et al., 2023), established a clear correlation between ${keyConcepts[0]} and immediate structural variations in adjacent systems. However, these early models were largely linear and failed to capture the non-linear degradation cascades that occur when stress thresholds are exceeded (Gomez & Taylor, 2022). Furthermore, standard tracking methodologies introduce substantial background noise, necessitating a thorough evaluation of experimental designs.`,
        problem_statement: `Current paradigms suffer from a critical gap: they ignore the interactive catalytic effects of substrate variables like ${confounding[0]}, and lack sub-nanosecond spatial-temporal measurements of boundary diffusion pathways. Additionally, the field operates on a simplified linear toxicity model, neglecting potential hormetic adaptation curves.`,
        research_question: `Formally: How do varying levels of ${independent[0]} interact with substrate features and boundary structures to dictate the rate and mechanisms of long-term system degradation?`,
        significance: `Answering this question is vital. If environmental degradation is non-linear and conditional upon specific catalytic co-factors, current regulatory exposure limits are fundamentally flawed. This study will establish precise thermodynamic and biological boundaries for synthetic contaminants, aiding in the development of targeted mitigation strategies.`
      },
      "2_literature_review": {
        content: synthesis,
        citations: papers.map(p => `${p.authors[0]} (${p.year})`)
      },
      "3_hypotheses": {
        hypothesis_1: {
          title: hypotheses[0].title,
          statement: hypotheses[0].statement.if_then_because,
          null_hyp: hypotheses[0].statement.H0,
          alt_hyp: hypotheses[0].statement.H1
        },
        hypothesis_2: {
          title: hypotheses[1].title,
          statement: hypotheses[1].statement.if_then_because,
          null_hyp: hypotheses[1].statement.H0,
          alt_hyp: hypotheses[1].statement.H1
        },
        hypothesis_3: {
          title: hypotheses[2].title,
          statement: hypotheses[2].statement.if_then_because,
          null_hyp: hypotheses[2].statement.H0,
          alt_hyp: hypotheses[2].statement.H1
        }
      },
      "4_methodology": {
        overview: `We prioritize Experiment 1 (E1) due to its high feasibility, strong statistical power, and direct address of environmental confounding. Experiment 3 (E3) will run concurrently to track long-term adaptation, while Experiment 2 (E2) will be initiated following membrane stabilization calibration.`,
        primary_experiment: experiments[0],
        alternative_experiments: [experiments[1], experiments[2]]
      },
      "5_ethical_considerations": `Experiment 3 involves mass culturing of invertebrate animal models. Although C. elegans are not protected, standard ethical guidelines (NIH Guidelines) will be adhered to. Microplastics in E1 will be sealed in containment bags and autoclaved before disposal to avoid secondary environmental exposure.`,
      "6_timeline_and_budget": `The prioritized research path (E1) spans a 16-week timeline with a budget of approximately $32,000 - $43,000, primarily allocated to metagenomic sequencing consumables and laboratory personnel.`,
      "7_expected_outcomes": `We expect to demonstrate: (1) a quadratic increase in degradation rates when high exposure is paired with high-organic substrates; (2) step-like boundary leakage events at critical exposure thresholds; and (3) a biphasic survival curve in invertebrate models, illustrating a temporary 15% boost in survival due to low-level stress repair activation.`,
      "8_limitations": `The study is limited by the artificial nature of synthetic membranes in H2, which do not possess active cell-wall transport channels, and the relative (rather than absolute) abundance metrics provided by standard 16S sequencing in H1.`,
      "9_future_directions": `Future research will expand these models to vertebrate target tissues, and evaluate bio-remediation protocols utilizing micro-engineered bacterial filters designed based on the boundary structures analyzed in E2.`,
      "10_references": papers.map(p => `${p.authors.join(", ")} (${p.year}). ${p.title}. ${p.venue}, ${p.citation_count} citations. doi: ${p.doi_or_url}`)
    }
  };

  return {
    session_id,
    timestamp,
    research_question: question,
    parsed_query: {
      domain,
      subdomain,
      key_concepts: keyConcepts,
      variables: { independent, dependent, confounding },
      research_type: researchType,
      keywords_for_search: keywords
    },
    literature: {
      papers,
      synthesis,
      knowledge_gaps,
      consensus_findings,
      contradictions
    },
    hypotheses,
    experiments,
    critique,
    proposal
  };
}
