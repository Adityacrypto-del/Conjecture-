import { useState, useEffect, useRef } from "react";
import { GooeyDemo } from "@/components/ui/demo";
import { generateOfflineProposal } from "@/lib/simulator";
import { runFullResearchPipeline } from "@/lib/gemini";
import type { GlobalState, PipelineStep, LogEntry } from "@/lib/types";
import Dock from "@/components/ui/Dock";
import {
  BookOpen,
  FlaskConical,
  ShieldAlert,
  FileText,
  Terminal,
  Settings,
  Key,
  Cpu,
  Play,
  Download,
  RefreshCw,
  Search,
  Database,
  Copy,
  Check,
  Layers,
  ArrowLeft,
  HelpCircle
} from "lucide-react";

export default function App() {
  const [view, setView] = useState<"landing" | "app">("landing");
  
  // Pipeline Settings
  const [question, setQuestion] = useState("What is the impact of microplastics on soil microbiome diversity?");
  const [apiProvider, setApiProvider] = useState<"gemini" | "groq">("gemini");
  const [geminiApiKey, setGeminiApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || "");
  const [groqApiKey, setGroqApiKey] = useState(import.meta.env.VITE_GROQ_API_KEY || "");
  const [useRealApi, setUseRealApi] = useState(true);
  const [model, setModel] = useState("gemini-2.5-flash");
  
  // Running State
  const [step, setStep] = useState<PipelineStep>("idle");
  const [globalState, setGlobalState] = useState<GlobalState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);

  // Inspector States
  const [activeInspectorTab, setActiveInspectorTab] = useState<"papers" | "protocols" | "critiques">("papers");
  const [selectedHypIndex, setSelectedHypIndex] = useState(0);
  const [selectedExpIndex, setSelectedExpIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const manuscriptRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Auto-switch inspector tabs based on available data
  useEffect(() => {
    if (!globalState) return;
    if (globalState.critique?.per_hypothesis && globalState.critique.per_hypothesis.length > 0) {
      setActiveInspectorTab("critiques");
    } else if (globalState.experiments && globalState.experiments.length > 0) {
      setActiveInspectorTab("protocols");
    } else if (globalState.literature?.papers && globalState.literature.papers.length > 0) {
      setActiveInspectorTab("papers");
    }
  }, [globalState]);

  // Synchronize model selection when API provider changes
  useEffect(() => {
    if (apiProvider === "groq") {
      setModel("llama-3.3-70b-versatile");
    } else {
      setModel("gemini-2.5-flash");
    }
  }, [apiProvider]);

  const addLog = (agent: LogEntry["agent"], message: string, type: LogEntry["type"] = "info") => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      agent,
      message,
      type
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const getStepProgress = (currentStep: PipelineStep): number => {
    switch (currentStep) {
      case "idle": return 0;
      case "orchestrator_parse": return 15;
      case "literature_agent": return 35;
      case "hypothesis_agent": return 55;
      case "experiment_agent": return 75;
      case "critique_agent": return 90;
      case "proposal_synthesizer": return 97;
      case "completed": return 100;
      case "error": return 100;
      default: return 0;
    }
  };

  const triggerPipeline = async () => {
    if (!question.trim()) {
      alert("Please enter a valid research question.");
      return;
    }

    setStep("orchestrator_parse");
    setLogs([]);
    setGlobalState(null);
    setProgressPercent(15);

    addLog("Orchestrator", `Initializing sequential research pipeline.`, "info");
    addLog("Orchestrator", `Target Inquiry: "${question}"`, "success");

    if (!useRealApi) {
      // Offline Simulated Mode
      try {
        const finalState = generateOfflineProposal(question);

        // Stage 1: Initialize baseline with parsed query variables
        setGlobalState({
          ...finalState,
          literature: { papers: [], synthesis: "", knowledge_gaps: [], consensus_findings: [], contradictions: [] },
          hypotheses: [],
          experiments: [],
          critique: { overall_score: 0, summary: "", best_hypothesis: "", recommended_sequence: [], synergy_opportunities: [], fatal_flaws: [], cross_cutting_recommendations: [], per_hypothesis: [] },
          proposal: {
            ...finalState.proposal,
            abstract: "",
            sections: {
              ...finalState.proposal.sections,
              "2_literature_review": { content: "", citations: [] },
              "3_hypotheses": {
                hypothesis_1: { title: "", statement: "", null_hyp: "", alt_hyp: "" },
                hypothesis_2: { title: "", statement: "", null_hyp: "", alt_hyp: "" },
                hypothesis_3: { title: "", statement: "", null_hyp: "", alt_hyp: "" }
              },
              "4_methodology": { overview: "", primary_experiment: null, alternative_experiments: [] },
              "5_ethical_considerations": "",
              "6_timeline_and_budget": "",
              "7_expected_outcomes": "",
              "8_limitations": "",
              "9_future_directions": ""
            }
          }
        });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        
        // Stage 2: Sourced literature and synthesis
        setStep("literature_agent");
        setProgressPercent(35);
        addLog("Literature Agent", "Sourcing databases and scoring primary literature...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        setGlobalState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            literature: finalState.literature,
            proposal: {
              ...prev.proposal,
              sections: {
                ...prev.proposal.sections,
                "2_literature_review": finalState.proposal.sections["2_literature_review"]
              }
            }
          };
        });
        addLog("Literature Agent", "Identified 5 relevant studies. Synthesized knowledge base and gaps.", "success");
        
        // Stage 3: Generated Hypotheses
        setStep("hypothesis_agent");
        setProgressPercent(55);
        addLog("Hypothesis Agent", "Formulating testable alternative (H1) and null (H0) hypotheses...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        setGlobalState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            hypotheses: finalState.hypotheses,
            proposal: {
              ...prev.proposal,
              sections: {
                ...prev.proposal.sections,
                "3_hypotheses": finalState.proposal.sections["3_hypotheses"]
              }
            }
          };
        });
        addLog("Hypothesis Agent", "Mapped evidence trees for 3 distinct hypothesis angles.", "success");
        
        // Stage 4: Designed Experimental Protocols
        setStep("experiment_agent");
        setProgressPercent(75);
        addLog("Experiment Agent", "Drafting experimental protocols, budgets, and power analyses...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        setGlobalState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            experiments: finalState.experiments,
            proposal: {
              ...prev.proposal,
              sections: {
                ...prev.proposal.sections,
                "4_methodology": finalState.proposal.sections["4_methodology"]
              }
            }
          };
        });
        addLog("Experiment Agent", "Created E1, E2, and E3 protocols. Factored potential confounding factors.", "success");
        
        // Stage 5: Performed Ethical and Rigor Critique
        setStep("critique_agent");
        setProgressPercent(90);
        addLog("Critique Agent", "Evaluating design rigor, technical feasibility, and ethical safeguards...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1200));
        
        setGlobalState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            critique: finalState.critique,
            proposal: {
              ...prev.proposal,
              sections: {
                ...prev.proposal.sections,
                "5_ethical_considerations": finalState.proposal.sections["5_ethical_considerations"]
              }
            }
          };
        });
        addLog("Critique Agent", "Critique complete. Average Rigor Score: 8.3/10. Priority order indexed.", "success");
        
        // Stage 6: Compiled Full Proposal
        setStep("proposal_synthesizer");
        setProgressPercent(97);
        addLog("Synthesizer", "Compiling final APA-formatted research manuscript...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1200));
        
        setGlobalState(finalState);
        setStep("completed");
        setProgressPercent(100);
        addLog("Orchestrator", "Research proposal successfully generated and indexed!", "success");
      } catch (err: any) {
        setStep("error");
        addLog("Orchestrator", `Critical error in simulated pipeline: ${err.message}`, "error");
      }
    } else {
      // Real API Mode using Gemini or Groq
      const activeApiKey = apiProvider === "groq" ? groqApiKey : geminiApiKey;
      if (!activeApiKey) {
        alert(`Please enter your ${apiProvider === "groq" ? "Groq" : "Gemini"} API key to run the live pipeline.`);
        setStep("idle");
        return;
      }
      
      try {
        const state = await runFullResearchPipeline(
          apiProvider,
          question,
          activeApiKey,
          model,
          (currentStep, msg, partialState) => {
            setStep(currentStep as PipelineStep);
            setProgressPercent(getStepProgress(currentStep as PipelineStep));
            
            let agentName: LogEntry["agent"] = "Orchestrator";
            if (currentStep === "literature_agent") agentName = "Literature Agent";
            else if (currentStep === "hypothesis_agent") agentName = "Hypothesis Agent";
            else if (currentStep === "experiment_agent") agentName = "Experiment Agent";
            else if (currentStep === "critique_agent") agentName = "Critique Agent";
            else if (currentStep === "proposal_synthesizer") agentName = "Synthesizer";
            
            const isErr = currentStep === "error";
            addLog(agentName, msg, isErr ? "error" : "info");
            
            if (partialState) {
              setGlobalState(partialState as GlobalState);
            }
          }
        );
        setGlobalState(state);
      } catch (err: any) {
        setStep("error");
        addLog("Orchestrator", `Pipeline failed: ${err.message}`, "error");
        alert(`API Error: ${err.message}`);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    if (!globalState) return;
    
    const prop = globalState.proposal;
    let md = `# ${prop.title}\n\n`;
    md += `## Abstract\n${prop.abstract}\n\n`;
    
    Object.entries(prop.sections).forEach(([key, section]: [string, any]) => {
      const sectionName = key.replace(/^\d+_/g, "").toUpperCase();
      md += `## ${sectionName}\n`;
      if (typeof section === "string") {
        md += `${section}\n\n`;
      } else if (section.background) {
        md += `### Background\n${section.background}\n\n`;
        md += `### Problem Statement\n${section.problem_statement}\n\n`;
        md += `### Research Question\n${section.research_question}\n\n`;
        md += `### Significance\n${section.significance}\n\n`;
      } else if (section.content) {
        md += `${section.content}\n\n`;
        if (section.citations) {
          md += `**Citations:**\n${section.citations.map((c: string) => `- ${c}`).join("\n")}\n\n`;
        }
      } else if (key === "3_hypotheses") {
        Object.entries(section).forEach(([hKey, hVal]: [string, any]) => {
          md += `### ${hVal.title} (${hKey.toUpperCase()})\n`;
          md += `**Statement:** ${hVal.statement}\n\n`;
          md += `**Null Hypothesis (H₀):** ${hVal.null_hyp}\n\n`;
          md += `**Alternative Hypothesis (H₁):** ${hVal.alt_hyp}\n\n`;
        });
      } else if (key === "4_methodology") {
        md += `${section.overview}\n\n`;
        md += `### Primary Experiment: E1\n`;
        md += `**Design:** ${section.primary_experiment.study_design}\n`;
        md += `**Justification:** ${section.primary_experiment.design_justification}\n`;
        md += `**Sample Size:** ${section.primary_experiment.participants_or_subjects?.sample_size}\n\n`;
      } else {
        md += `${JSON.stringify(section, null, 2)}\n\n`;
      }
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prop.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_proposal.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepColor = (nodeStep: PipelineStep) => {
    if (step === nodeStep) return "text-purple-400 border-purple-500 bg-purple-950/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]";
    if (step === "completed" || getStepProgress(step) > getStepProgress(nodeStep)) {
      return "text-zinc-300 border-zinc-700 bg-zinc-900";
    }
    return "text-zinc-600 border-zinc-900 bg-black/40";
  };

  const renderRadialScore = (score: number, max: number, label: string) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / max) * circumference;

    return (
      <div className="flex items-center gap-3 bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r={radius} className="stroke-zinc-800" strokeWidth="3" fill="transparent" />
            <circle
              cx="28"
              cy="28"
              r={radius}
              className="stroke-purple-500 transition-all duration-1000"
              strokeWidth="3.5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xs font-mono font-bold text-white">{score}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{label}</span>
          <span className="text-xs text-zinc-300 font-semibold">
            {score >= 8.5 ? "Excellent" : score >= 7.0 ? "Satisfactory" : "Needs Work"}
          </span>
        </div>
      </div>
    );
  };

  const fillTemplate = (text: string) => {
    setQuestion(text);
  };

  const dockItems = [
    {
      icon: <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-white" />,
      label: "Home",
      onClick: () => setView("landing")
    },
    {
      icon: step !== "idle" && step !== "completed" && step !== "error" ? (
        <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
      ) : (
        <Play className="w-4 h-4 fill-current text-white" />
      ),
      label: step !== "idle" && step !== "completed" && step !== "error" ? "Processing" : "Run Engine",
      onClick: triggerPipeline,
      className: step !== "idle" && step !== "completed" && step !== "error" ? "opacity-50 cursor-not-allowed" : ""
    },
    {
      icon: <Settings className={`w-4 h-4 transition-transform duration-500 ${showConfig ? "rotate-90 text-purple-400" : "text-white"}`} />,
      label: "Toggle Config",
      onClick: () => setShowConfig(!showConfig)
    },
    {
      icon: <Database className={`w-4 h-4 ${activeInspectorTab === "papers" ? "text-purple-400" : "text-white"}`} />,
      label: "Papers Info",
      onClick: () => {
        if (globalState?.literature?.papers && globalState.literature.papers.length > 0) {
          setActiveInspectorTab("papers");
        }
      },
      className: !(globalState?.literature?.papers && globalState.literature.papers.length > 0) ? "opacity-30 cursor-not-allowed" : ""
    },
    {
      icon: <FlaskConical className={`w-4 h-4 ${activeInspectorTab === "protocols" ? "text-purple-400" : "text-white"}`} />,
      label: "Protocols",
      onClick: () => {
        if (globalState?.experiments && globalState.experiments.length > 0) {
          setActiveInspectorTab("protocols");
        }
      },
      className: !(globalState?.experiments && globalState.experiments.length > 0) ? "opacity-30 cursor-not-allowed" : ""
    },
    {
      icon: <ShieldAlert className={`w-4 h-4 ${activeInspectorTab === "critiques" ? "text-purple-400" : "text-white"}`} />,
      label: "Critiques",
      onClick: () => {
        if (globalState?.critique?.per_hypothesis && globalState.critique.per_hypothesis.length > 0) {
          setActiveInspectorTab("critiques");
        }
      },
      className: !(globalState?.critique?.per_hypothesis && globalState.critique.per_hypothesis.length > 0) ? "opacity-30 cursor-not-allowed" : ""
    },
    {
      icon: <Copy className="w-4 h-4 text-white" />,
      label: "Copy JSON",
      onClick: () => {
        if (globalState) {
          copyToClipboard(JSON.stringify(globalState.proposal, null, 2));
        }
      },
      className: !globalState ? "opacity-30 cursor-not-allowed" : ""
    },
    {
      icon: <Download className="w-4 h-4 text-white" />,
      label: "Export Markdown",
      onClick: () => {
        if (globalState) {
          downloadMarkdown();
        }
      },
      className: !globalState ? "opacity-30 cursor-not-allowed" : ""
    }
  ];

  return (
    <div className="w-full min-h-screen bg-black text-gray-200 selection:bg-purple-500/30 overflow-x-hidden font-sans">
      {view === "landing" ? (
        <GooeyDemo onStart={() => setView("app")} />
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Header Banner - Clean and minimal */}
          <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-black/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold font-overusedGrotesk tracking-wide text-white uppercase">
                MANUSCRIPT WORKBENCH
              </span>
              <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
                PS-AG8 Research Engine
              </span>
            </div>

            {/* Micro horizontal node pipeline */}
            <div className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-zinc-900 bg-zinc-950/60">
              {[
                { id: "orchestrator_parse", name: "Parse" },
                { id: "literature_agent", name: "Literature" },
                { id: "hypothesis_agent", name: "Hypothesis" },
                { id: "experiment_agent", name: "Methods" },
                { id: "critique_agent", name: "Critique" },
                { id: "proposal_synthesizer", name: "Compile" }
              ].map((n, idx) => (
                <div key={n.id} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-zinc-800 text-[10px]">&rarr;</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${getStepColor(n.id as PipelineStep)}`}>
                    {n.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Status: {step.replace("_", " ")}
              </span>
            </div>
          </header>

          {/* Micro Progress Bar */}
          {step !== "idle" && step !== "completed" && step !== "error" && (
            <div className="w-full bg-zinc-950 h-0.5 relative z-40 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Config Drawer */}
          {showConfig && (
            <div className="w-full border-b border-zinc-900 bg-zinc-950 px-8 py-5 transition-all duration-300 animate-in slide-in-from-top">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    Execution Mode
                  </label>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      onClick={() => setUseRealApi(false)}
                      className={`flex-1 py-1 px-2 rounded text-[9px] uppercase font-mono font-bold border transition-all ${
                        !useRealApi
                          ? "bg-purple-500/10 border-purple-500 text-purple-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      Offline Sim
                    </button>
                    <button
                      onClick={() => {
                        setUseRealApi(true);
                        setApiProvider("gemini");
                      }}
                      className={`flex-1 py-1 px-2 rounded text-[9px] uppercase font-mono font-bold border transition-all ${
                        useRealApi && apiProvider === "gemini"
                          ? "bg-purple-500/10 border-purple-500 text-purple-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      Live Gemini
                    </button>
                    <button
                      onClick={() => {
                        setUseRealApi(true);
                        setApiProvider("groq");
                      }}
                      className={`flex-1 py-1 px-2 rounded text-[9px] uppercase font-mono font-bold border transition-all ${
                        useRealApi && apiProvider === "groq"
                          ? "bg-purple-500/10 border-purple-500 text-purple-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      Live Groq
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    {apiProvider === "groq" ? "Groq API Key" : "Google Gemini API Key"}
                  </label>
                  <input
                    type="password"
                    disabled={!useRealApi}
                    value={apiProvider === "groq" ? groqApiKey : geminiApiKey}
                    onChange={(e) => {
                      if (apiProvider === "groq") {
                        setGroqApiKey(e.target.value);
                      } else {
                        setGeminiApiKey(e.target.value);
                      }
                    }}
                    placeholder={useRealApi ? (apiProvider === "groq" ? "gsk_..." : "AIzaSy...") : "Disabled (Simulation Mode active)"}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs focus:outline-none focus:border-purple-500 disabled:opacity-50 text-white font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-purple-400" />
                    Model Target
                  </label>
                  <select
                    disabled={!useRealApi}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs focus:outline-none focus:border-purple-500 text-white disabled:opacity-50 font-mono"
                  >
                    {apiProvider === "groq" ? (
                      <>
                        <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (recommended)</option>
                        <option value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b</option>
                      </>
                    ) : (
                      <>
                        <option value="gemini-2.5-flash">gemini-2.5-flash (recommended)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (deep research)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Three-Column Workspace */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 items-stretch max-w-8xl w-full mx-auto pb-28">
            
            {/* COLUMN 1: CONTROLS & PARSED VARIABLES (3 Columns) */}
            <aside className="lg:col-span-3 flex flex-col gap-5 h-full">
              {/* Setup Panel */}
              <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col gap-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-400" />
                  Thesis Parameter
                </h3>
                
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  disabled={step !== "idle" && step !== "completed" && step !== "error"}
                  className="w-full p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs focus:outline-none focus:border-purple-500 disabled:opacity-50 text-white resize-none font-light leading-relaxed"
                  placeholder="Formulate your query..."
                />

                {/* Sourcing templates */}
                {step === "idle" && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-zinc-500 font-mono uppercase">Quick-load templates:</span>
                    <div className="flex flex-col gap-1">
                      {[
                        { label: "LLM Hallucinations", query: "What decoding parameters mitigate factual hallucinations in retrieval augmented generation?" },
                        { label: "Soil Microplastics", query: "What is the impact of microplastics on soil microbiome diversity?" },
                        { label: "VR Cognitive Load", query: "Does cognitive load increase in immersive virtual reality learning environments?" }
                      ].map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => fillTemplate(t.query)}
                          className="w-full text-left px-2.5 py-1.5 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded text-[10px] text-zinc-400 hover:text-white truncate transition-all cursor-pointer font-light"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Parsed query state */}
              {globalState && (
                <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    Structured Variables
                  </h3>
                  
                  <div className="flex flex-col gap-3.5 text-[11px] leading-relaxed">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase">Domain / Subfield</span>
                      <span className="text-white font-medium">{globalState.parsed_query.domain} / <em className="text-zinc-400">{globalState.parsed_query.subdomain}</em></span>
                    </div>

                    <div className="border-t border-zinc-900 pt-2 flex flex-col gap-1.5">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Independent Variable
                      </span>
                      <span className="text-zinc-300 font-light">{globalState.parsed_query.variables.independent[0]}</span>
                    </div>

                    <div className="border-t border-zinc-900 pt-2 flex flex-col gap-1.5">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Dependent Variable
                      </span>
                      <span className="text-zinc-300 font-light">{globalState.parsed_query.variables.dependent[0]}</span>
                    </div>

                    <div className="border-t border-zinc-900 pt-2 flex flex-col gap-1.5">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        Confounding Variable
                      </span>
                      <span className="text-zinc-300 font-light">{globalState.parsed_query.variables.confounding[0]}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Logs Monitor */}
              <div className="flex-1 p-5 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col gap-3 min-h-[180px]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  Terminal logs
                </h3>
                
                <div className="flex-1 bg-black/60 border border-zinc-900/80 rounded-lg p-3 font-mono text-[10px] overflow-y-auto max-h-[220px] flex flex-col gap-2 shadow-inner">
                  {logs.length === 0 ? (
                    <span className="text-zinc-700 italic">Workbench standing by. Run engine...</span>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="flex flex-col border-b border-zinc-950 pb-1">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className={`font-bold ${
                            log.type === "success" ? "text-green-500" :
                            log.type === "error" ? "text-red-500" :
                            log.type === "warning" ? "text-yellow-500" : "text-purple-400"
                          }`}>
                            {log.agent.toUpperCase()}
                          </span>
                          <span className="text-[8px] text-zinc-600">{log.timestamp}</span>
                        </div>
                        <span className="text-zinc-400 mt-0.5 font-light leading-normal">{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </aside>

            {/* COLUMN 2: THE ACADEMIC MANUSCRIPT (6 Columns) */}
            <section className="lg:col-span-6 flex flex-col bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              {/* Proposal Header Controls */}
              <div className="px-6 py-3 bg-zinc-900/30 border-b border-zinc-900 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">DRAFT MANUSCRIPT</span>
                </div>
                {globalState && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(globalState.proposal, null, 2))}
                      className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] font-mono hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "COPIED" : "JSON"}</span>
                    </button>
                    <button
                      onClick={downloadMarkdown}
                      className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>MARKDOWN</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Manuscript sheet */}
              <div ref={manuscriptRef} className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[80vh] bg-zinc-950 text-zinc-300 select-text leading-relaxed text-sm scrollbar-thin">
                {step === "idle" ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center gap-4">
                    <div className="w-12 h-12 rounded-full border border-zinc-850 bg-zinc-900/30 flex items-center justify-center text-zinc-500 animate-pulse">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Manuscript Drafting Area</h4>
                    <p className="text-xs text-zinc-500 max-w-sm font-light">
                      Configure your parameters and trigger the research pipeline. The generated manuscript draft will compile here in real-time.
                    </p>
                  </div>
                ) : (
                  <article className="flex flex-col gap-10">
                    {/* Document Header */}
                    <div className="text-center pb-8 border-b border-zinc-900">
                      <h1 className="text-2xl font-calendas text-white leading-snug font-bold max-w-xl mx-auto">
                        {globalState?.proposal?.title || `Deciphering ${globalState?.parsed_query?.domain || "Target Discipline"} of ${globalState?.parsed_query?.key_concepts?.join(", ") || "Concept"}`}
                      </h1>
                      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                        <span>SESSION: {globalState?.session_id?.substring(0, 8) || "..."}</span>
                        <span>&bull;</span>
                        <span>DATE: {globalState ? new Date(globalState.timestamp).toLocaleDateString() : "..."}</span>
                      </div>
                    </div>

                    {/* Abstract Section */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">Abstract</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">SYNTHESIZED</span>
                      </div>
                      {globalState?.proposal?.abstract ? (
                        <p className="text-xs text-zinc-400 italic text-justify leading-relaxed pl-4 border-l border-purple-500/30 animate-fade-in">
                          {globalState.proposal.abstract}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1.5 animate-pulse opacity-30 py-1 pl-4 border-l border-zinc-800">
                          <div className="h-2.5 bg-zinc-850 rounded w-full" />
                          <div className="h-2.5 bg-zinc-850 rounded w-11/12" />
                          <div className="h-2.5 bg-zinc-850 rounded w-4/5" />
                        </div>
                      )}
                    </section>

                    {/* Section 1: Intro */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">1. Introduction & Problem Scope</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">ORCHESTRATOR</span>
                      </div>
                      {globalState?.proposal?.sections?.["1_introduction"]?.background ? (
                        <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed animate-fade-in">
                          {globalState.proposal.sections["1_introduction"].background}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1.5 animate-pulse opacity-35">
                          <div className="h-2.5 bg-zinc-850 rounded w-full" />
                          <div className="h-2.5 bg-zinc-850 rounded w-5/6" />
                        </div>
                      )}
                      
                      <div className="p-3.5 bg-zinc-900/20 border border-zinc-900 rounded-lg text-xs font-light leading-relaxed text-zinc-400 mt-2">
                        <strong className="text-white text-[10px] block font-mono uppercase tracking-wide mb-1">Problem Statement</strong>
                        {globalState?.proposal?.sections?.["1_introduction"]?.problem_statement || (
                          <div className="h-2.5 bg-zinc-850 rounded w-full animate-pulse opacity-25 mt-1" />
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-light leading-relaxed mt-1">
                        <div className="p-3 bg-zinc-900/10 border border-zinc-900 rounded-lg">
                          <strong className="text-zinc-500 block text-[9px] uppercase font-mono">Formal Research Inquiry</strong>
                          {globalState?.proposal?.sections?.["1_introduction"]?.research_question ? (
                            <p className="text-zinc-300 italic mt-1 font-calendas">"{globalState.proposal.sections["1_introduction"].research_question}"</p>
                          ) : (
                            <div className="h-2.5 bg-zinc-850 rounded w-full animate-pulse opacity-25 mt-1.5" />
                          )}
                        </div>
                        <div className="p-3 bg-zinc-900/10 border border-zinc-900 rounded-lg">
                          <strong className="text-zinc-500 block text-[9px] uppercase font-mono">Significance & Utility</strong>
                          {globalState?.proposal?.sections?.["1_introduction"]?.significance ? (
                            <p className="text-zinc-400 mt-1 leading-normal text-[11px]">{globalState.proposal.sections["1_introduction"].significance}</p>
                          ) : (
                            <div className="h-2.5 bg-zinc-850 rounded w-5/6 animate-pulse opacity-25 mt-1.5" />
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Section 2: Lit Review */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">2. Literature Synthesis</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">LITERATURE AGENT</span>
                      </div>
                      {globalState?.proposal?.sections?.["2_literature_review"]?.content || globalState?.literature?.synthesis ? (
                        <div className="flex flex-col gap-3 animate-fade-in">
                          <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed">
                            {globalState.proposal?.sections?.["2_literature_review"]?.content || globalState.literature.synthesis}
                          </p>
                          {!globalState.proposal?.sections?.["2_literature_review"]?.content && globalState.literature?.consensus_findings && globalState.literature.consensus_findings.length > 0 && (
                            <div className="mt-2 p-3 bg-zinc-900/10 border border-zinc-900 rounded-lg">
                              <strong className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">Consensus Findings (Intermediate)</strong>
                              <ul className="list-disc pl-4 text-[11px] text-zinc-400 font-light flex flex-col gap-1">
                                {globalState.literature.consensus_findings.slice(0, 3).map((f, idx) => (
                                  <li key={idx}>{f}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 animate-pulse opacity-30">
                          <div className="h-2.5 bg-zinc-850 rounded w-full" />
                          <div className="h-2.5 bg-zinc-850 rounded w-11/12" />
                          <div className="h-2.5 bg-zinc-850 rounded w-4/5" />
                        </div>
                      )}
                    </section>

                    {/* Section 3: Hypotheses */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">3. Experimental Hypotheses</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">HYPOTHESIS AGENT</span>
                      </div>
                      
                      {globalState?.hypotheses && globalState.hypotheses.length > 0 ? (
                        <div className="flex flex-col gap-4 mt-2">
                          {[
                            globalState.proposal?.sections?.["3_hypotheses"]?.hypothesis_1 || globalState.hypotheses[0],
                            globalState.proposal?.sections?.["3_hypotheses"]?.hypothesis_2 || globalState.hypotheses[1],
                            globalState.proposal?.sections?.["3_hypotheses"]?.hypothesis_3 || globalState.hypotheses[2]
                          ].map((h: any, i) => {
                            if (!h || !h.title) return null;
                            const title = h.title;
                            const statement = typeof h.statement === 'string' ? h.statement : h.statement?.if_then_because;
                            const nullHyp = h.null_hyp || h.statement?.H0;
                            const altHyp = h.alt_hyp || h.statement?.H1;
                            return (
                              <div key={i} className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-lg flex flex-col gap-2 animate-fade-in">
                                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                                  <span className="w-1.5 h-3 bg-purple-500 rounded-full" />
                                  H{i + 1}: {title}
                                </span>
                                <p className="text-xs text-zinc-300 font-calendas italic leading-relaxed pl-3 border-l border-zinc-850">
                                  "{statement}"
                                </p>
                                <div className="grid grid-cols-2 gap-3 text-[10px] text-zinc-500 mt-1 font-light leading-normal border-t border-zinc-900/60 pt-2">
                                  <div>
                                    <strong className="text-zinc-400 block text-[9px] uppercase font-mono mb-0.5">H₀ (Null)</strong>
                                    {nullHyp}
                                  </div>
                                  <div>
                                    <strong className="text-zinc-400 block text-[9px] uppercase font-mono mb-0.5">H₁ (Alternative)</strong>
                                    {altHyp}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 animate-pulse opacity-25 mt-1.5">
                          <div className="h-10 bg-zinc-900 border border-zinc-900/60 rounded-lg w-full" />
                          <div className="h-10 bg-zinc-900 border border-zinc-900/60 rounded-lg w-full" />
                        </div>
                      )}
                    </section>

                    {/* Section 4: Methodology */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">4. Experimental Protocols</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">METHODOLOGY AGENT</span>
                      </div>
                      
                      {globalState?.experiments && globalState.experiments.length > 0 ? (
                        <div className="flex flex-col gap-3 animate-fade-in">
                          <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed">
                            {globalState.proposal?.sections?.["4_methodology"]?.overview || `The experimental design is optimized for testing formulated hypotheses using quantitative empirical protocols. Three separate designs (E1, E2, E3) have been developed by the Methodology Agent.`}
                          </p>
                          
                          {(() => {
                            const exp = globalState.proposal?.sections?.["4_methodology"]?.primary_experiment || globalState.experiments[0];
                            if (!exp) return null;
                            return (
                              <div className="mt-2 p-4 bg-zinc-900/30 border border-zinc-900 rounded-lg flex flex-col gap-3.5">
                                <span className="font-bold text-purple-400 text-xs font-mono uppercase tracking-wide">
                                  Prioritized Protocol (E1): {exp.study_design}
                                </span>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-light text-zinc-400 leading-relaxed">
                                  <div>
                                    <strong className="text-zinc-500 block text-[9px] uppercase font-mono">Sample Size & Power Analysis</strong>
                                    {exp.participants_or_subjects?.sample_size || exp.participants_or_subjects?.power_analysis}
                                  </div>
                                  <div>
                                    <strong className="text-zinc-500 block text-[9px] uppercase font-mono">Blinding Standard</strong>
                                    {exp.procedure?.blinding}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="h-14 bg-zinc-900 border border-zinc-900/60 rounded-lg w-full animate-pulse opacity-25 mt-1.5" />
                      )}
                    </section>

                    {/* Section 5: Ethics */}
                    <section className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">5. Ethical Disclosures</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">CRITIQUE AGENT</span>
                      </div>
                      {globalState?.proposal?.sections?.["5_ethical_considerations"] || (globalState?.critique?.per_hypothesis && globalState.critique.per_hypothesis.length > 0) ? (
                        <div className="flex flex-col gap-2 animate-fade-in">
                          <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed">
                            {globalState.proposal?.sections?.["5_ethical_considerations"] || `Ethical assessment has been performed for each hypothesis and design strategy. No blocking fatal flaws were identified, and appropriate IRB/ethics oversight recommendations have been compiled.`}
                          </p>
                          {!globalState.proposal?.sections?.["5_ethical_considerations"] && globalState.critique.per_hypothesis.map((crit, idx) => (
                            <div key={idx} className="p-2.5 bg-zinc-900/10 border border-zinc-900 rounded text-[11px] text-zinc-400 mt-1.5">
                              <strong className="text-zinc-300 font-mono text-[9px] uppercase">H{idx+1} Ethical Assessment (Intermediate)</strong>
                              <div className="flex gap-4 mt-1 font-mono text-[9px]">
                                <span className={crit.ethical_assessment?.irb_required ? "text-red-400" : "text-green-400"}>
                                  IRB Required: {crit.ethical_assessment?.irb_required ? "YES" : "NO"}
                                </span>
                                <span className={crit.ethical_assessment?.animal_welfare_issues ? "text-yellow-400" : "text-green-400"}>
                                  Animal Welfare Concerns: {crit.ethical_assessment?.animal_welfare_issues ? "YES" : "NO"}
                                </span>
                              </div>
                              <p className="mt-1 italic">Recommendation: {crit.ethical_assessment?.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-8 bg-zinc-900 border border-zinc-900/60 rounded-lg w-full animate-pulse opacity-20 mt-1.5" />
                      )}
                    </section>

                    {/* Section 6: Timeline & Budget */}
                    <section className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">6. Resource Projection</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">SYNTHESIZER</span>
                      </div>
                      {globalState?.proposal?.sections?.["6_timeline_and_budget"] || (globalState?.experiments && globalState.experiments.length > 0) ? (
                        <div className="flex flex-col gap-2.5 animate-fade-in">
                          <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed">
                            {globalState.proposal?.sections?.["6_timeline_and_budget"] || `Resource projections compiled from intermediate experimental protocols. The table below represents estimated durations and costs.`}
                          </p>
                          {!globalState.proposal?.sections?.["6_timeline_and_budget"] && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
                              {globalState.experiments.map((e, idx) => (
                                <div key={idx} className="p-2 bg-zinc-900/20 border border-zinc-900 rounded text-[10px]">
                                  <strong className="text-zinc-400 block font-mono text-[9px] uppercase">E{idx+1} Cost & Timeline</strong>
                                  <div className="mt-1 font-mono">Cost: <span className="text-purple-400 font-bold">{e.budget_estimate?.total_estimated}</span></div>
                                  <div className="font-mono">Duration: <span className="text-white">{e.timeline?.total_duration}</span></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-8 bg-zinc-900 border border-zinc-900/60 rounded-lg w-full animate-pulse opacity-20 mt-1.5" />
                      )}
                    </section>

                    {/* Section 10: References */}
                    <section className="flex flex-col gap-3 border-t border-zinc-900 pt-6 mt-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">References</h3>
                      {globalState?.proposal?.sections?.["10_references"] || (globalState?.literature?.papers && globalState.literature.papers.length > 0) ? (
                        <ul className="text-[10px] text-zinc-500 font-mono flex flex-col gap-2 list-none pl-0 leading-relaxed animate-fade-in">
                          {(globalState.proposal?.sections?.["10_references"] || 
                            globalState.literature.papers.map((p) => {
                              const authorLastName = p.authors?.[0]?.split(",")?.[0]?.trim() || "Unknown";
                              return `${authorLastName} et al. (${p.year}). ${p.title}. ${p.venue}.`;
                            })
                          ).map((ref, idx) => (
                            <li key={idx} className="pl-6 -indent-6 text-justify">
                              {ref}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex flex-col gap-1.5 animate-pulse opacity-20 mt-1.5 font-mono">
                          <div className="h-2 bg-zinc-900 rounded w-5/6" />
                          <div className="h-2 bg-zinc-900 rounded w-4/5" />
                        </div>
                      )}
                    </section>
                  </article>
                )}
              </div>
            </section>

            {/* COLUMN 3: AGENT PEER REVIEW & RETRIEVAL DETAILS (3 Columns) */}
            <aside className="lg:col-span-3 flex flex-col gap-5 h-full">
              {/* Context Selector Tabs */}
              <div className="p-1.5 bg-zinc-950 border border-zinc-900 rounded-xl flex gap-1">
                {[
                  { 
                    id: "papers", 
                    label: "Papers", 
                    icon: Database, 
                    available: !!(globalState?.literature?.papers && globalState.literature.papers.length > 0) 
                  },
                  { 
                    id: "protocols", 
                    label: "Protocols", 
                    icon: FlaskConical, 
                    available: !!(globalState?.experiments && globalState.experiments.length > 0) 
                  },
                  { 
                    id: "critiques", 
                    label: "Critique", 
                    icon: ShieldAlert, 
                    available: !!(globalState?.critique?.per_hypothesis && globalState.critique.per_hypothesis.length > 0) 
                  }
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveInspectorTab(t.id as any)}
                      disabled={!t.available}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                        activeInspectorTab === t.id
                          ? "bg-zinc-900 text-white border border-zinc-800"
                          : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inspector Content Sheet */}
              <div className="flex-1 p-5 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col gap-4 overflow-y-auto max-h-[80vh] scrollbar-thin">
                {!globalState ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <HelpCircle className="w-8 h-8 text-zinc-800 mb-2 animate-pulse" />
                    <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Inspector Locked</span>
                    <p className="text-[10px] text-zinc-600 mt-1 font-light leading-normal">
                      Run the pipeline to activate metadata tabs.
                    </p>
                  </div>
                ) : (
                  <div className="flex-col flex gap-4 h-full">
                    
                    {/* PAPERS INSPECTOR */}
                    {activeInspectorTab === "papers" && (
                      <div className="flex flex-col gap-4">
                        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block border-b border-zinc-900 pb-1.5">
                          Semantic Scholar Index
                        </span>
                        
                        <div className="flex flex-col gap-3">
                          {globalState.literature.papers.map((p) => (
                            <div key={p.paper_id} className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-lg flex flex-col gap-1.5 hover:border-zinc-800 transition-all text-[11px] leading-relaxed">
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-semibold text-white truncate w-40">{p.title}</span>
                                <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[8px] ${
                                  p.relevance_score >= 8 ? "bg-green-500/25 text-green-400" : "bg-yellow-500/25 text-yellow-400"
                                }`}>
                                  R:{p.relevance_score}
                                </span>
                              </div>
                              <span className="text-[9px] text-zinc-500">{p.authors[0]} ({p.year}) &bull; {p.venue}</span>
                              <p className="text-[10px] text-zinc-400 italic line-clamp-2 mt-0.5">"{p.abstract_summary}"</p>
                              <div className="flex justify-between items-center pt-1.5 border-t border-zinc-900/60 mt-1 text-[9px] text-zinc-500 font-mono">
                                <span>Citations: {p.citation_count}</span>
                                <a href={p.doi_or_url} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
                                  SOURCE &rarr;
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PROTOCOLS INSPECTOR */}
                    {activeInspectorTab === "protocols" && (
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-1.5 border-b border-zinc-900 pb-2">
                          {globalState.experiments.map((e, idx) => (
                            <button
                              key={e.experiment_id}
                              onClick={() => setSelectedExpIndex(idx)}
                              className={`flex-1 py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                                selectedExpIndex === idx
                                  ? "bg-purple-500/10 border-purple-500 text-purple-300"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                              }`}
                            >
                              {e.experiment_id}
                            </button>
                          ))}
                        </div>

                        {(() => {
                          const e = globalState.experiments[selectedExpIndex];
                          const h = globalState.hypotheses[selectedExpIndex];
                          if (!e || !h) return null;
                          return (
                            <div className="flex flex-col gap-4 text-[11px] leading-relaxed">
                              <div>
                                <span className="text-[9px] text-zinc-500 font-mono uppercase">Design Strategy</span>
                                <span className="text-white block font-medium mt-0.5">{e.study_design}</span>
                                <span className="text-[10px] text-zinc-400 font-light block leading-normal mt-1 bg-zinc-900/30 p-2 border border-zinc-900 rounded">
                                  {e.design_justification}
                                </span>
                              </div>

                              <div className="border-t border-zinc-900 pt-3">
                                <span className="text-[9px] text-zinc-500 font-mono uppercase">Power analysis</span>
                                <span className="text-white block font-medium mt-0.5 capitalize">{e.participants_or_subjects.type} (N={e.participants_or_subjects.sample_size})</span>
                                <span className="text-[10px] text-zinc-400 font-mono block leading-normal mt-1 bg-zinc-900/30 p-2 border border-zinc-900 rounded">
                                  {e.participants_or_subjects.power_analysis}
                                </span>
                              </div>

                              <div className="border-t border-zinc-900 pt-3">
                                <span className="text-[9px] text-zinc-500 font-mono uppercase">Material Checklist</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {e.materials_and_tools.equipment.slice(0, 3).map((item, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[9px] border border-zinc-800">{item}</span>
                                  ))}
                                </div>
                              </div>

                              <div className="border-t border-zinc-900 pt-3">
                                <span className="text-[9px] text-zinc-500 font-mono uppercase">Timeline & Budget</span>
                                <div className="grid grid-cols-2 gap-2 mt-1.5">
                                  <div className="p-2 bg-zinc-900/20 border border-zinc-900 rounded">
                                    <span className="text-[8px] text-zinc-500 font-mono block uppercase">Total Cost</span>
                                    <span className="text-purple-300 font-bold text-xs">{e.budget_estimate.total_estimated}</span>
                                  </div>
                                  <div className="p-2 bg-zinc-900/20 border border-zinc-900 rounded">
                                    <span className="text-[8px] text-zinc-500 font-mono block uppercase">Timeline</span>
                                    <span className="text-white font-bold text-xs">{e.timeline.total_duration}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* CRITIQUES INSPECTOR */}
                    {activeInspectorTab === "critiques" && (
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-1.5 border-b border-zinc-900 pb-2">
                          {globalState.critique.per_hypothesis.map((crit, idx) => (
                            <button
                              key={crit.hypothesis_id}
                              onClick={() => setSelectedHypIndex(idx)}
                              className={`flex-1 py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                                selectedHypIndex === idx
                                  ? "bg-purple-500/10 border-purple-500 text-purple-300"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                              }`}
                            >
                              {crit.hypothesis_id}
                            </button>
                          ))}
                        </div>

                        {(() => {
                          const crit = globalState.critique.per_hypothesis[selectedHypIndex];
                          if (!crit) return null;
                          return (
                            <div className="flex flex-col gap-4">
                              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">
                                Peer Evaluation Dials
                              </span>
                              
                              <div className="flex flex-col gap-2.5">
                                {renderRadialScore(crit.novelty_assessment.score, 10, "Novelty Rating")}
                                {renderRadialScore(crit.feasibility_assessment.score, 10, "Feasibility Rating")}
                                {renderRadialScore(crit.scientific_rigor_assessment.score, 10, "Scientific Rigor")}
                              </div>

                              <div className="border-t border-zinc-900 pt-3 text-[11px] leading-relaxed">
                                <span className="text-[9px] text-zinc-500 font-mono uppercase">Rigor Verdict</span>
                                <p className="text-zinc-300 font-light mt-0.5">{crit.summary_for_researcher}</p>
                              </div>

                              <div className="border-t border-zinc-900 pt-3 text-[11px] leading-relaxed">
                                <span className="text-[9px] text-zinc-500 font-mono uppercase">Ethical Safety Check</span>
                                <div className="flex flex-wrap gap-2 text-[9px] font-mono text-zinc-400 mt-1">
                                  <span className={crit.ethical_assessment.irb_required ? "text-red-400" : "text-green-400"}>
                                    IRB: {crit.ethical_assessment.irb_required ? "REQUIRED" : "EXEMPT"}
                                  </span>
                                  <span className={crit.ethical_assessment.animal_welfare_issues ? "text-yellow-400" : "text-green-400"}>
                                    ANIMAL: {crit.ethical_assessment.animal_welfare_issues ? "YES" : "NO"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>

          </div>

          {/* Workbench Footer */}
          <footer className="mt-auto border-t border-zinc-900 bg-black py-3 px-6 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
            <span>Workbench Status: Operational &bull; Sequentially Synchronized Agents</span>
            <span>&copy; {new Date().getFullYear()} Autonomous Research Lab</span>
          </footer>
          <Dock items={dockItems} />
        </div>
      )}
    </div>
  );
}
