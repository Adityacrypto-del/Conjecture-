import { useState, useEffect, useRef } from "react";
import { GooeyDemo } from "@/components/ui/demo";
import { generateOfflineProposal } from "@/lib/simulator";
import { runFullResearchPipeline } from "@/lib/gemini";
import type { GlobalState, PipelineStep, LogEntry } from "@/lib/types";
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
  const [apiKey, setApiKey] = useState("");
  const [useRealApi, setUseRealApi] = useState(false);
  const [model, setModel] = useState("gemini-1.5-flash");
  
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
        await new Promise((resolve) => setTimeout(resolve, 1200));
        
        setStep("literature_agent");
        setProgressPercent(35);
        addLog("Literature Agent", "Sourcing databases and scoring primary literature...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        addLog("Literature Agent", "Identified 5 relevant studies. Synthesized knowledge base and gaps.", "success");
        
        setStep("hypothesis_agent");
        setProgressPercent(55);
        addLog("Hypothesis Agent", "Formulating testable alternative (H1) and null (H0) hypotheses...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        addLog("Hypothesis Agent", "Mapped evidence trees for 3 distinct hypothesis angles.", "success");
        
        setStep("experiment_agent");
        setProgressPercent(75);
        addLog("Experiment Agent", "Drafting experimental protocols, budgets, and power analyses...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        addLog("Experiment Agent", "Created E1, E2, and E3 protocols. Factored potential confounding factors.", "success");
        
        setStep("critique_agent");
        setProgressPercent(90);
        addLog("Critique Agent", "Evaluating design rigor, technical feasibility, and ethical safeguards...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1200));
        addLog("Critique Agent", "Critique complete. Average Rigor Score: 8.3/10. Priority order indexed.", "success");
        
        setStep("proposal_synthesizer");
        setProgressPercent(97);
        addLog("Synthesizer", "Compiling final APA-formatted research manuscript...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1200));
        
        const finalState = generateOfflineProposal(question);
        setGlobalState(finalState);
        setStep("completed");
        setProgressPercent(100);
        addLog("Orchestrator", "Research proposal successfully generated and indexed!", "success");
      } catch (err: any) {
        setStep("error");
        addLog("Orchestrator", `Critical error in simulated pipeline: ${err.message}`, "error");
      }
    } else {
      // Real API Mode using Gemini
      if (!apiKey) {
        alert("Please enter your Gemini API key to run the live pipeline.");
        setStep("idle");
        return;
      }
      
      try {
        const state = await runFullResearchPipeline(
          question,
          apiKey,
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

  return (
    <div className="w-full min-h-screen bg-black text-gray-200 selection:bg-purple-500/30 overflow-x-hidden font-sans">
      {view === "landing" ? (
        <GooeyDemo onStart={() => setView("app")} />
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Header Banner - Minimal and high contrast */}
          <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-black/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView("landing")}
                className="p-2 hover:bg-zinc-900 border border-zinc-900 rounded-lg transition-all group"
                title="Back to Landing Page"
              >
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-bold font-overusedGrotesk tracking-wide text-white uppercase">
                  MANUSCRIPT WORKBENCH
                </span>
                <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
                  PS-AG8 Research Engine
                </span>
              </div>
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

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-xs hover:text-white transition-all cursor-pointer font-mono"
              >
                <Settings className={`w-3.5 h-3.5 transition-transform duration-500 ${showConfig ? "rotate-90" : ""}`} />
                <span>CONFIG</span>
              </button>

              <button
                onClick={triggerPipeline}
                disabled={step !== "idle" && step !== "completed" && step !== "error"}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                  step !== "idle" && step !== "completed" && step !== "error"
                    ? "bg-purple-950/40 text-purple-400 border border-purple-950/50 cursor-not-allowed"
                    : "bg-white hover:bg-zinc-200 text-black cursor-pointer hover:scale-[1.02]"
                }`}
              >
                {step !== "idle" && step !== "completed" && step !== "error" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Run Engine</span>
                  </>
                )}
              </button>
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
                    Engine Mode
                  </label>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setUseRealApi(false)}
                      className={`flex-1 py-1.5 rounded text-[10px] uppercase font-mono font-bold border transition-all ${
                        !useRealApi
                          ? "bg-purple-500/10 border-purple-500 text-purple-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      Offline Simulation
                    </button>
                    <button
                      onClick={() => setUseRealApi(true)}
                      className={`flex-1 py-1.5 rounded text-[10px] uppercase font-mono font-bold border transition-all ${
                        useRealApi
                          ? "bg-purple-500/10 border-purple-500 text-purple-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      Live Gemini API
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    disabled={!useRealApi}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={useRealApi ? "AIzaSy..." : "Disabled (Simulation Mode active)"}
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
                    <option value="gemini-1.5-flash">gemini-1.5-flash (fast)</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash (recommended)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (deep research)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Three-Column Workspace */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 items-stretch max-w-8xl w-full mx-auto">
            
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
                {!globalState ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center gap-4">
                    {step === "idle" ? (
                      <>
                        <div className="w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900/30 flex items-center justify-center text-zinc-500 animate-pulse">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Manuscript Drafting Area</h4>
                        <p className="text-xs text-zinc-500 max-w-sm font-light">
                          Configure your parameters and trigger the research pipeline. The generated manuscript draft will compile here in real-time.
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono animate-pulse">
                          {step.replace("_", " ").toUpperCase()} ACTIVE
                        </h4>
                        
                        {/* Skeleton manuscript placeholder */}
                        <div className="w-80 flex flex-col gap-2 mt-4 opacity-30 animate-pulse">
                          <div className="h-4 bg-zinc-800 rounded w-3/4 mx-auto" />
                          <div className="h-2 bg-zinc-900 rounded w-1/2 mx-auto mt-2" />
                          <div className="h-2.5 bg-zinc-800 rounded w-full mt-6" />
                          <div className="h-2.5 bg-zinc-800 rounded w-5/6" />
                          <div className="h-2.5 bg-zinc-800 rounded w-4/5" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <article className="flex flex-col gap-10">
                    {/* Document Header */}
                    <div className="text-center pb-8 border-b border-zinc-900">
                      <h1 className="text-2xl font-calendas text-white leading-snug font-bold max-w-xl mx-auto">
                        {globalState.proposal.title}
                      </h1>
                      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                        <span>SESSION: {globalState.session_id.substring(0, 8)}</span>
                        <span>&bull;</span>
                        <span>DATE: {new Date(globalState.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Abstract Section */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">Abstract</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">SYNTHESIZED</span>
                      </div>
                      <p className="text-xs text-zinc-400 italic text-justify leading-relaxed pl-4 border-l border-purple-500/30">
                        {globalState.proposal.abstract}
                      </p>
                    </section>

                    {/* Section 1: Intro */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">1. Introduction & Problem Scope</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">ORCHESTRATOR</span>
                      </div>
                      <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed">
                        {globalState.proposal.sections["1_introduction"].background}
                      </p>
                      
                      <div className="p-3.5 bg-zinc-900/20 border border-zinc-900 rounded-lg text-xs font-light leading-relaxed text-zinc-400 mt-2">
                        <strong className="text-white text-[10px] block font-mono uppercase tracking-wide mb-1">Problem Statement</strong>
                        {globalState.proposal.sections["1_introduction"].problem_statement}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-light leading-relaxed mt-1">
                        <div className="p-3 bg-zinc-900/10 border border-zinc-900 rounded-lg">
                          <strong className="text-zinc-500 block text-[9px] uppercase font-mono">Formal Research Inquiry</strong>
                          <p className="text-zinc-300 italic mt-1 font-calendas">"{globalState.proposal.sections["1_introduction"].research_question}"</p>
                        </div>
                        <div className="p-3 bg-zinc-900/10 border border-zinc-900 rounded-lg">
                          <strong className="text-zinc-500 block text-[9px] uppercase font-mono">Significance & Utility</strong>
                          <p className="text-zinc-400 mt-1 leading-normal text-[11px]">{globalState.proposal.sections["1_introduction"].significance}</p>
                        </div>
                      </div>
                    </section>

                    {/* Section 2: Lit Review */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">2. Literature Synthesis</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">LITERATURE AGENT</span>
                      </div>
                      <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed">
                        {globalState.proposal.sections["2_literature_review"].content}
                      </p>
                    </section>

                    {/* Section 3: Hypotheses */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">3. Experimental Hypotheses</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">HYPOTHESIS AGENT</span>
                      </div>
                      
                      <div className="flex flex-col gap-4 mt-2">
                        {[
                          globalState.proposal.sections["3_hypotheses"].hypothesis_1,
                          globalState.proposal.sections["3_hypotheses"].hypothesis_2,
                          globalState.proposal.sections["3_hypotheses"].hypothesis_3
                        ].map((h, i) => (
                          <div key={i} className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-lg flex flex-col gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                              <span className="w-1 h-3 bg-purple-500 rounded-full" />
                              H{i + 1}: {h.title}
                            </span>
                            <p className="text-xs text-zinc-300 font-calendas italic leading-relaxed pl-3 border-l border-zinc-800">
                              "{h.statement}"
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-[10px] text-zinc-500 mt-1 font-light leading-normal border-t border-zinc-900/60 pt-2">
                              <div>
                                <strong className="text-zinc-400 block text-[9px] uppercase font-mono mb-0.5">H₀ (Null)</strong>
                                {h.null_hyp}
                              </div>
                              <div>
                                <strong className="text-zinc-400 block text-[9px] uppercase font-mono mb-0.5">H₁ (Alternative)</strong>
                                {h.alt_hyp}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Section 4: Methodology */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">4. Experimental Protocols</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">METHODOLOGY AGENT</span>
                      </div>
                      <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed">
                        {globalState.proposal.sections["4_methodology"].overview}
                      </p>
                      
                      <div className="mt-2 p-4 bg-zinc-900/30 border border-zinc-900 rounded-lg flex flex-col gap-3.5">
                        <span className="font-bold text-purple-400 text-xs font-mono uppercase tracking-wide">
                          Prioritized Protocol (E1): {globalState.proposal.sections["4_methodology"].primary_experiment?.study_design}
                        </span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-light text-zinc-400 leading-relaxed">
                          <div>
                            <strong className="text-zinc-500 block text-[9px] uppercase font-mono">Sample Size & Power Analysis</strong>
                            {globalState.proposal.sections["4_methodology"].primary_experiment?.participants_or_subjects?.sample_size}
                          </div>
                          <div>
                            <strong className="text-zinc-500 block text-[9px] uppercase font-mono">Blinding Standard</strong>
                            {globalState.proposal.sections["4_methodology"].primary_experiment?.procedure?.blinding}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Section 5: Ethics */}
                    <section className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">5. Ethical Disclosures</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">CRITIQUE AGENT</span>
                      </div>
                      <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed">
                        {globalState.proposal.sections["5_ethical_considerations"]}
                      </p>
                    </section>

                    {/* Section 6: Timeline & Budget */}
                    <section className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">6. Resource Projection</h3>
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[8px] font-mono rounded">SYNTHESIZER</span>
                      </div>
                      <p className="text-xs text-zinc-400 text-justify font-light leading-relaxed">
                        {globalState.proposal.sections["6_timeline_and_budget"]}
                      </p>
                    </section>

                    {/* Section 10: References */}
                    <section className="flex flex-col gap-3 border-t border-zinc-900 pt-6 mt-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">References</h3>
                      <ul className="text-[10px] text-zinc-500 font-mono flex flex-col gap-2 list-none pl-0 leading-relaxed">
                        {globalState.proposal.sections["10_references"].map((ref, idx) => (
                          <li key={idx} className="pl-6 -indent-6 text-justify">
                            {ref}
                          </li>
                        ))}
                      </ul>
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
                  { id: "papers", label: "Papers", icon: Database },
                  { id: "protocols", label: "Protocols", icon: FlaskConical },
                  { id: "critiques", label: "Critique", icon: ShieldAlert }
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveInspectorTab(t.id as any)}
                      disabled={!globalState}
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
        </div>
      )}
    </div>
  );
}
