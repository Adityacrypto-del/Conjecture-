import { useState, useEffect, useRef } from "react";
import { GooeyDemo } from "@/components/ui/demo";
import { generateOfflineProposal } from "@/lib/simulator";
import { runFullResearchPipeline } from "@/lib/gemini";
import type { GlobalState, PipelineStep, LogEntry, HypothesisObject, ExperimentObject } from "@/lib/types";
import {
  BookOpen,
  Lightbulb,
  FlaskConical,
  ShieldAlert,
  FileText,
  Terminal,
  Settings,
  Key,
  Cpu,
  Play,
  Download,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Search,
  Database,
  Calendar,
  DollarSign,
  Award,
  Activity,
  Copy,
  Check,
  Info,
  Layers,
  ArrowLeft
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

  // Active tabs & toggles in Dashboard
  const [activeTab, setActiveTab] = useState<"overview" | "literature" | "hypotheses" | "experiments" | "critique" | "proposal">("overview");
  const [selectedHypothesisIndex, setSelectedHypothesisIndex] = useState(0);
  const [selectedExperimentIndex, setSelectedExperimentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

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
    setActiveTab("overview");

    addLog("Orchestrator", `Initializing pipeline for session.`, "info");
    addLog("Orchestrator", `Research question parsed: "${question}"`, "success");

    if (!useRealApi) {
      // Offline Simulated Mode
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        setStep("literature_agent");
        setProgressPercent(35);
        addLog("Literature Agent", "Initiating literature retrieval via simulated Semantic Scholar...", "info");
        addLog("Literature Agent", "Formulating primary, secondary, and tertiary search parameters.", "info");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        addLog("Literature Agent", "Successfully retrieved and scored 5 high-relevance papers (score >= 7).", "success");
        addLog("Literature Agent", "Synthesized literature, formulated 3 knowledge gaps, and resolved 1 contradiction.", "success");
        
        setStep("hypothesis_agent");
        setProgressPercent(55);
        addLog("Hypothesis Agent", "Creating novel, falsifiable hypotheses based on literature synthesis...", "info");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        addLog("Hypothesis Agent", "Created H1 (Gap-filling), H2 (Mechanistic), and H3 (Contrarian). Checked evidence anchors.", "success");
        
        setStep("experiment_agent");
        setProgressPercent(75);
        addLog("Experiment Agent", "Developing detailed experimental protocols and statistical power analyses...", "info");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        addLog("Experiment Agent", "Completed experimental designs E1 (Factorial), E2 (In-Vitro), E3 (Cohort). Rationale compiled.", "success");
        
        setStep("critique_agent");
        setProgressPercent(90);
        addLog("Critique Agent", "Evaluating hypotheses and experiment designs for scientific rigor and ethical concerns...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1800));
        addLog("Critique Agent", "Critique complete. Score: 8.3/10. Recommended sequence: H1 -> H3 -> H2.", "success");
        
        setStep("proposal_synthesizer");
        setProgressPercent(97);
        addLog("Synthesizer", "Generating academic research proposal outline and references...", "info");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
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

  const getStepBadgeColor = (badgeStep: PipelineStep) => {
    if (step === badgeStep) return "bg-purple-500/20 text-purple-400 border-purple-500/50 animate-pulse";
    if (step === "completed" || getStepProgress(step) > getStepProgress(badgeStep)) {
      return "bg-green-500/20 text-green-400 border-green-500/50";
    }
    return "bg-zinc-800/50 text-zinc-500 border-zinc-700/50";
  };

  return (
    <div className="w-full min-h-screen bg-black text-gray-200 selection:bg-purple-500/30 overflow-x-hidden">
      {view === "landing" ? (
        <GooeyDemo onStart={() => setView("app")} />
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Header Banner */}
          <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("landing")}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors group"
                title="Back to Landing Page"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </button>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-overusedGrotesk tracking-tight text-white">
                    PS-AG8
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-medium tracking-wider bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 font-mono">
                    ACTIVE PIPELINE
                  </span>
                </div>
                <span className="text-xs text-zinc-500">Autonomous Scientific Proposal Generator</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-sm hover:text-white transition-all cursor-pointer"
              >
                <Settings className={`w-4 h-4 transition-transform duration-500 ${showConfig ? "rotate-90" : ""}`} />
                <span>Engine Config</span>
              </button>

              <button
                onClick={triggerPipeline}
                disabled={step !== "idle" && step !== "completed" && step !== "error"}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium text-sm transition-all shadow-[0_0_20px_rgba(147,51,234,0.15)] ${
                  step !== "idle" && step !== "completed" && step !== "error"
                    ? "bg-purple-950/40 text-purple-400 border border-purple-500/30 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer hover:scale-[1.02]"
                }`}
              >
                {step !== "idle" && step !== "completed" && step !== "error" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Execute Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* Config Panel Drawer */}
          {showConfig && (
            <div className="w-full border-b border-zinc-800 bg-zinc-950/90 px-8 py-6 transition-all duration-300 animate-in slide-in-from-top">
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    Execution Model
                  </label>
                  <p className="text-xs text-zinc-500 mb-1">Select agent engine backend.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUseRealApi(false)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        !useRealApi
                          ? "bg-purple-500/10 border-purple-500 text-purple-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      Simulation Mode (Offline)
                    </button>
                    <button
                      onClick={() => setUseRealApi(true)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        useRealApi
                          ? "bg-purple-500/10 border-purple-500 text-purple-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      Gemini API Mode (Live)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    Gemini API Key
                  </label>
                  <p className="text-xs text-zinc-500 mb-1">Stored securely in-memory only.</p>
                  <input
                    type="password"
                    disabled={!useRealApi}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={useRealApi ? "AIzaSy..." : "API key disabled in Simulation Mode"}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs focus:outline-none focus:border-purple-500 disabled:opacity-50 text-white"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-400" />
                    Live LLM Selection
                  </label>
                  <p className="text-xs text-zinc-500 mb-1">Choose model temperature and capability.</p>
                  <select
                    disabled={!useRealApi}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs focus:outline-none focus:border-purple-500 text-white disabled:opacity-50"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - Speed)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (High Quality)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Research)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Main workspace layout */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Input & Control Column (Left 4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full">
              {/* Card 1: Input Setup */}
              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-4">
                <h3 className="text-base font-bold text-white font-overusedGrotesk flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-400" />
                  Research Inquiry
                </h3>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-zinc-400">Specify your thesis topic or research question:</label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={4}
                    disabled={step !== "idle" && step !== "completed" && step !== "error"}
                    placeholder="Enter scientific question..."
                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50 text-white resize-none"
                  />
                </div>
                
                {step === "idle" && (
                  <div className="p-3 bg-purple-950/20 rounded-lg border border-purple-500/10 text-xs text-purple-300 leading-relaxed flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 text-purple-400 mt-0.5" />
                    <span>
                      Press <strong>Execute Pipeline</strong> to trigger our multi-agent workflow sequentially: Parse → Retrieve → Hypothesize → Design → Critique → Synthesize.
                    </span>
                  </div>
                )}
              </div>

              {/* Card 2: Pipeline Visualizer */}
              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-4">
                <h3 className="text-base font-bold text-white font-overusedGrotesk flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Pipeline Sequence
                </h3>
                
                {/* Progress bar */}
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 h-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  {[
                    { id: "orchestrator_parse", name: "1. Orchestrator Parser", desc: "Queries structure mapping" },
                    { id: "literature_agent", name: "2. Literature Agent", desc: "Retrives & synthesizes papers" },
                    { id: "hypothesis_agent", name: "3. Hypothesis Agent", desc: "Formulates If-Then-Because" },
                    { id: "experiment_agent", name: "4. Methodologist Agent", desc: "Designs experimental protocol" },
                    { id: "critique_agent", name: "5. Critique Agent", desc: "Validates rigor & ethics" },
                    { id: "proposal_synthesizer", name: "6. Synthesizer", desc: "Compiles PDF-ready output" }
                  ].map((s) => (
                    <div
                      key={s.id}
                      className={`p-3 rounded-lg border text-xs flex justify-between items-center transition-all ${getStepBadgeColor(s.id as PipelineStep)}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-[10px] opacity-70 mt-0.5">{s.desc}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Execution Terminal */}
              <div className="flex-1 p-6 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-4 min-h-[220px]">
                <h3 className="text-base font-bold text-white font-overusedGrotesk flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  Orchestrator Logs
                </h3>
                
                <div className="flex-1 bg-black border border-zinc-900 rounded-lg p-3 font-mono text-[11px] overflow-y-auto max-h-[260px] flex flex-col gap-2">
                  {logs.length === 0 ? (
                    <span className="text-zinc-600 italic">Terminal ready. Run pipeline to stream agent thoughts...</span>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="flex flex-col border-b border-zinc-950 pb-1">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className={`font-semibold ${
                            log.type === "success" ? "text-green-400" :
                            log.type === "error" ? "text-red-400" :
                            log.type === "warning" ? "text-yellow-400" : "text-purple-400"
                          }`}>
                            [{log.agent}]
                          </span>
                          <span className="text-[9px] text-zinc-600">{log.timestamp}</span>
                        </div>
                        <span className="text-zinc-400 mt-0.5">{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>

            {/* Results / Proposal View Column (Right 8 cols) */}
            <div className="lg:col-span-8 flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden min-h-[500px]">
              {/* Tab Selector Header */}
              <div className="w-full bg-zinc-900/60 border-b border-zinc-800 px-6 py-1 flex items-center justify-between overflow-x-auto">
                <div className="flex gap-2">
                  {[
                    { id: "overview", label: "Overview", icon: Layers },
                    { id: "literature", label: "Literature Review", icon: BookOpen },
                    { id: "hypotheses", label: "Hypotheses", icon: Lightbulb },
                    { id: "experiments", label: "Experiment Designs", icon: FlaskConical },
                    { id: "critique", label: "Ethics & Critique", icon: ShieldAlert },
                    { id: "proposal", label: "Research Proposal", icon: FileText }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        disabled={!globalState && tab.id !== "overview"}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer ${
                          activeTab === tab.id
                            ? "border-purple-500 text-white"
                            : "border-transparent text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Workspace Body */}
              <div className="flex-1 p-6 overflow-y-auto max-h-[85vh]">
                
                {/* 1. OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    {!globalState ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 animate-bounce">
                          <Cpu className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-white font-overusedGrotesk">
                          {step === "idle" ? "Autonomous Research Pipeline Ready" : "Executing Research Steps..."}
                        </h4>
                        <p className="text-sm text-zinc-400 max-w-md">
                          {step === "idle"
                            ? "Input a research topic and click 'Execute Pipeline' in the top right to start the research engine."
                            : "The orchestrator is invoking agents sequentially to construct the scientific document. Check terminal logs on the left."}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {/* Domain card */}
                        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Academic Domain</span>
                            <span className="text-sm font-bold text-white">{globalState.parsed_query.domain}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Sub-discipline</span>
                            <span className="text-sm font-bold text-white">{globalState.parsed_query.subdomain}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Research Archetype</span>
                            <span className="text-sm font-bold text-white capitalize">{globalState.parsed_query.research_type}</span>
                          </div>
                        </div>

                        {/* Executive Summary critique */}
                        <div className="p-6 rounded-xl border border-purple-500/20 bg-purple-950/10 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                              <Award className="w-4 h-4" />
                              Orchestrated Proposal Summary
                            </h4>
                            <div className="px-3 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold font-mono">
                              SCORE: {globalState.critique.overall_score}/10
                            </div>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed font-light">
                            {globalState.critique.summary}
                          </p>
                          <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-purple-500/10 text-xs">
                            <span className="text-zinc-400">
                              Best Path: <strong className="text-white">{globalState.critique.best_hypothesis}</strong>
                            </span>
                            <span className="text-zinc-400">
                              Sequence: <strong className="text-white">{globalState.critique.recommended_sequence.join(" → ")}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Variables studied */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/10 flex flex-col gap-3">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              Independent Variables
                            </span>
                            <ul className="text-xs text-zinc-400 flex flex-col gap-1.5 list-disc pl-4">
                              {globalState.parsed_query.variables.independent.map((v, i) => (
                                <li key={i}>{v}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/10 flex flex-col gap-3">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Dependent Variables
                            </span>
                            <ul className="text-xs text-zinc-400 flex flex-col gap-1.5 list-disc pl-4">
                              {globalState.parsed_query.variables.dependent.map((v, i) => (
                                <li key={i}>{v}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/10 flex flex-col gap-3">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                              Confounding Variables
                            </span>
                            <ul className="text-xs text-zinc-400 flex flex-col gap-1.5 list-disc pl-4">
                              {globalState.parsed_query.variables.confounding.map((v, i) => (
                                <li key={i}>{v}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. LITERATURE TAB */}
                {activeTab === "literature" && globalState && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    {/* Synthesis Paragraph */}
                    <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-3">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-400" />
                        Literature Synthesis
                      </h4>
                      <p className="text-sm text-gray-300 leading-relaxed font-light whitespace-pre-line">
                        {globalState.literature.synthesis}
                      </p>
                    </div>

                    {/* Gaps, Consensus, Contradictions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-3">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-orange-400" />
                          Identified Knowledge Gaps
                        </span>
                        <ul className="text-xs text-zinc-400 flex flex-col gap-2 list-disc pl-4">
                          {globalState.literature.knowledge_gaps.map((g, i) => (
                            <li key={i} className="leading-relaxed">{g}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-3">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Consensus Findings
                        </span>
                        <ul className="text-xs text-zinc-400 flex flex-col gap-2 list-disc pl-4">
                          {globalState.literature.consensus_findings.map((c, i) => (
                            <li key={i} className="leading-relaxed">{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Grounded Papers */}
                    <div className="flex flex-col gap-3 mt-4">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Database className="w-4 h-4 text-purple-400" />
                        Scored Academic Reference List
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {globalState.literature.papers.map((p, i) => (
                          <div key={i} className="p-4 rounded-lg border border-zinc-800 bg-zinc-950 flex flex-col gap-2 hover:border-zinc-700 transition-all">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-bold text-white hover:text-purple-400 cursor-pointer line-clamp-2">
                                {p.title}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded flex-shrink-0 ${
                                p.relevance_score >= 8 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                              }`}>
                                S: {p.relevance_score}/10
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {p.authors.join(", ")} ({p.year}) — <em>{p.venue}</em>
                            </span>
                            <p className="text-xs text-zinc-400 line-clamp-3 italic mt-1">
                              "{p.abstract_summary}"
                            </p>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-900 text-[10px] text-zinc-500">
                              <span>Citations: {p.citation_count}</span>
                              <a
                                href={p.doi_or_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-purple-400 hover:underline"
                              >
                                View Paper URL
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. HYPOTHESES TAB */}
                {activeTab === "hypotheses" && globalState && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    {/* Selectors */}
                    <div className="flex gap-2">
                      {globalState.hypotheses.map((h, i) => (
                        <button
                          key={h.hypothesis_id}
                          onClick={() => setSelectedHypothesisIndex(i)}
                          className={`flex-1 p-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            selectedHypothesisIndex === i
                              ? "bg-purple-500/10 border-purple-500 text-purple-300"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          {h.hypothesis_id} ({h.strategy.toUpperCase()})
                        </button>
                      ))}
                    </div>

                    {/* Selected Hypothesis Card */}
                    {(() => {
                      const h: HypothesisObject = globalState.hypotheses[selectedHypothesisIndex];
                      if (!h) return null;
                      return (
                        <div className="flex flex-col gap-6">
                          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-4">
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Title</span>
                              <h3 className="text-lg font-bold text-white mt-0.5">{h.title}</h3>
                            </div>

                            <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col gap-2">
                              <span className="text-[10px] text-purple-400 uppercase tracking-wider font-mono">Formal If-Then-Because</span>
                              <p className="text-sm font-calendas text-white leading-relaxed italic">
                                "{h.statement.if_then_because}"
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-900 flex flex-col gap-1">
                                <span className="text-zinc-500 font-mono text-[9px] uppercase">Null Hypothesis (H₀)</span>
                                <span className="text-zinc-300 font-light">{h.statement.H0}</span>
                              </div>
                              <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-900 flex flex-col gap-1">
                                <span className="text-zinc-500 font-mono text-[9px] uppercase">Alternative Hypothesis (H₁)</span>
                                <span className="text-zinc-300 font-light">{h.statement.H1}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border-t border-zinc-900 pt-4 mt-2">
                              <div>
                                <span className="text-[10px] text-zinc-500 block mb-1">Independent Variable</span>
                                <span className="text-white font-medium">{h.variables.independent}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block mb-1">Dependent Variable</span>
                                <span className="text-white font-medium">{h.variables.dependent}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block mb-1">Control Variables</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {h.variables.controls.map((ctrl, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">
                                      {ctrl}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Evidence Mapping & Falsification */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-3 text-xs">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-purple-400" />
                                Predicted Outcomes & Falsification
                              </span>
                              <div className="flex flex-col gap-2">
                                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                                  <strong className="text-zinc-400 block mb-1 text-[10px]">PREDICTED MEASUREMENT:</strong>
                                  <p className="text-zinc-300">{h.predicted_outcome}</p>
                                </div>
                                <div className="p-3 bg-red-950/15 border border-red-500/10 rounded-lg">
                                  <strong className="text-red-400 block mb-1 text-[10px]">FALSIFICATION CRITERION:</strong>
                                  <p className="text-red-300 font-mono text-[11px]">{h.falsification_criterion}</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-3 text-xs">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <Database className="w-4 h-4 text-purple-400" />
                                Literature Evidence Map
                              </span>
                              <div className="flex flex-col gap-3">
                                <div>
                                  <strong className="text-zinc-500 block text-[9px] uppercase">Supporting Papers</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {h.evidence_map.supporting_papers.map((pId) => (
                                      <span key={pId} className="px-2 py-0.5 rounded bg-purple-950/20 text-purple-300 border border-purple-500/20 text-[10px]">
                                        {pId}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-zinc-400 mt-1.5 leading-relaxed font-light">{h.evidence_map.supporting_reasoning}</p>
                                </div>
                                
                                {h.evidence_map.contradicting_papers.length > 0 && (
                                  <div className="border-t border-zinc-900 pt-2">
                                    <strong className="text-zinc-500 block text-[9px] uppercase">Challenging Papers</strong>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {h.evidence_map.contradicting_papers.map((pId) => (
                                        <span key={pId} className="px-2 py-0.5 rounded bg-red-950/20 text-red-300 border border-red-500/20 text-[10px]">
                                          {pId}
                                        </span>
                                      ))}
                                    </div>
                                    <p className="text-zinc-400 mt-1.5 leading-relaxed font-light">{h.evidence_map.contradicting_reasoning}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 4. EXPERIMENTS TAB */}
                {activeTab === "experiments" && globalState && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    {/* Selectors */}
                    <div className="flex gap-2">
                      {globalState.experiments.map((e, i) => (
                        <button
                          key={e.experiment_id}
                          onClick={() => setSelectedExperimentIndex(i)}
                          className={`flex-1 p-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            selectedExperimentIndex === i
                              ? "bg-purple-500/10 border-purple-500 text-purple-300"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          {e.experiment_id} ({globalState.hypotheses[i]?.strategy.toUpperCase()})
                        </button>
                      ))}
                    </div>

                    {/* Selected Experiment Card */}
                    {(() => {
                      const e: ExperimentObject = globalState.experiments[selectedExperimentIndex];
                      if (!e) return null;
                      return (
                        <div className="flex flex-col gap-6">
                          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-4">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Study Design Type</span>
                                <h3 className="text-lg font-bold text-white mt-0.5">{e.study_design}</h3>
                              </div>
                              <div className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                                Target Hypothesis: {e.hypothesis_id}
                              </div>
                            </div>

                            <p className="text-xs text-zinc-400 leading-relaxed font-light bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                              <strong>Design Justification:</strong> {e.design_justification}
                            </p>

                            {/* Section 1: Subjects & Sampling */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-900 pt-4 text-xs">
                              <div className="flex flex-col gap-2">
                                <span className="font-bold text-white uppercase text-[10px] tracking-wider font-mono text-purple-400">Subjects & Power analysis</span>
                                <div>
                                  <span className="text-zinc-500 block">Subject Archetype:</span>
                                  <span className="text-white capitalize">{e.participants_or_subjects.type}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-500 block">Sample Size (N):</span>
                                  <span className="text-white">{e.participants_or_subjects.sample_size}</span>
                                </div>
                                <div className="p-2 bg-zinc-950 rounded border border-zinc-900 mt-1">
                                  <span className="text-[9px] text-zinc-500 block">Statistical Power Rationale:</span>
                                  <span className="text-zinc-400 text-[11px] font-mono leading-normal">{e.participants_or_subjects.power_analysis}</span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                <span className="font-bold text-white uppercase text-[10px] tracking-wider font-mono text-purple-400">Materials, Tools & Software</span>
                                <div className="flex flex-col gap-1.5">
                                  <div>
                                    <span className="text-zinc-500 block">Primary Equipment:</span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {e.materials_and_tools.equipment.map((eq, i) => (
                                        <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[10px]">{eq}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block">Software Pipeline:</span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {e.materials_and_tools.software.map((sw, i) => (
                                        <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[10px]">{sw}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Procedure Phases */}
                          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-purple-400" />
                              Protocol Procedure Steps
                            </h4>

                            <div className="flex flex-col gap-3">
                              {e.procedure.phases.map((ph, idx) => (
                                <div key={idx} className="p-4 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col gap-2 text-xs">
                                  <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5">
                                    <span className="font-bold text-purple-300 text-[11px] uppercase tracking-wide">
                                      Phase {idx + 1}: {ph.phase_name}
                                    </span>
                                    <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 rounded font-mono text-[10px]">
                                      {ph.duration}
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-col gap-1.5 mt-1">
                                    <span className="text-zinc-500 text-[9px] uppercase font-mono">Execution Steps:</span>
                                    <ul className="list-decimal pl-4 flex flex-col gap-1 text-zinc-400 leading-relaxed font-light">
                                      {ph.steps.map((st, i) => (
                                        <li key={i}>{st}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border-t border-zinc-900 pt-4 mt-2">
                              <div>
                                <span className="text-[10px] text-zinc-500 block mb-1">Blinding Protocol</span>
                                <span className="px-2 py-0.5 rounded bg-zinc-900 text-white font-medium capitalize">{e.procedure.blinding}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block mb-1">Control Group Standard</span>
                                <span className="text-zinc-400 leading-normal block">{e.procedure.control_group_description}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block mb-1">Statistical Analysis Test</span>
                                <span className="text-white font-semibold font-mono">{e.statistical_analysis.primary_test} ({e.statistical_analysis.software})</span>
                              </div>
                            </div>
                          </div>

                          {/* Budget & Timeline & Confounds */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-3 text-xs">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-purple-400" />
                                Budget & Duration Estimates
                              </span>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col">
                                  <span className="text-[9px] text-zinc-500 font-mono uppercase">Personnel</span>
                                  <span className="text-white font-semibold mt-1">{e.budget_estimate.personnel}</span>
                                </div>
                                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col">
                                  <span className="text-[9px] text-zinc-500 font-mono uppercase">Consumables</span>
                                  <span className="text-white font-semibold mt-1">{e.budget_estimate.consumables}</span>
                                </div>
                                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col col-span-2">
                                  <span className="text-[9px] text-zinc-500 font-mono uppercase">Total Projected Budget</span>
                                  <span className="text-purple-300 font-bold mt-1 text-sm">{e.budget_estimate.total_estimated}</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-3 text-xs">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4 text-purple-400" />
                                Confounds & Mitigation Strategy
                              </span>
                              <div className="flex flex-col gap-2">
                                {e.potential_confounds.map((conf, idx) => (
                                  <div key={idx} className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                                    <div className="flex gap-2 items-start">
                                      <span className="px-1.5 py-0.5 rounded bg-orange-950/20 text-orange-400 border border-orange-500/20 text-[9px] font-mono uppercase mt-0.5">
                                        Confound
                                      </span>
                                      <span className="text-white font-medium">{conf}</span>
                                    </div>
                                    <div className="text-zinc-400 text-[11px] leading-relaxed font-light mt-1.5 pl-2 border-l border-purple-500/30">
                                      <strong>Mitigation:</strong> {e.mitigation_strategies[idx] || "Standard laboratory normalization."}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 5. CRITIQUE TAB */}
                {activeTab === "critique" && globalState && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-xl flex flex-col gap-3">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-purple-400" />
                        Critique Agent Review
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        Each hypothesis-experiment pair has been thoroughly analyzed by our peer-review and ethics agent across novelty, feasibility, and technical rigor.
                      </p>
                    </div>

                    <div className="flex flex-col gap-6">
                      {globalState.critique.per_hypothesis.map((crit, idx) => (
                        <div key={idx} className="p-6 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col gap-4">
                          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 font-bold text-purple-400 font-mono text-sm">
                                {crit.hypothesis_id}
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-white">
                                  {globalState.hypotheses[idx]?.title || "Hypothesis Pair Evaluation"}
                                </h4>
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                                  Experiment Reference: {crit.experiment_id}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold font-mono text-purple-300">
                                Score: {crit.overall_score}/10
                              </div>
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
                                Priority Rank: #{crit.priority_ranking}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            {/* Novelty */}
                            <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-900 flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Novelty</span>
                                <span className="font-mono text-purple-400 font-semibold">{crit.novelty_assessment.score}/10</span>
                              </div>
                              <span className="text-zinc-500 text-[10px] capitalize">Verdict: {crit.novelty_assessment.verdict}</span>
                              <p className="text-zinc-400 leading-relaxed font-light text-[11px]">
                                {crit.novelty_assessment.rationale}
                              </p>
                              {crit.novelty_assessment.prior_art_concerns && (
                                <p className="text-[10px] text-orange-400 border-t border-zinc-900 pt-1.5 mt-1">
                                  <strong>Prior Art:</strong> {crit.novelty_assessment.prior_art_concerns}
                                </p>
                              )}
                            </div>

                            {/* Feasibility */}
                            <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-900 flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Feasibility</span>
                                <span className="font-mono text-purple-400 font-semibold">{crit.feasibility_assessment.score}/10</span>
                              </div>
                              <span className="text-zinc-500 text-[10px] capitalize">Resource Load: {crit.feasibility_assessment.resource_requirements}</span>
                              <p className="text-zinc-400 leading-relaxed font-light text-[11px]">
                                {crit.feasibility_assessment.rationale}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1 text-[9px]">
                                {crit.feasibility_assessment.technical_barriers.map((b, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-950 text-red-400 border border-red-500/10">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Rigor */}
                            <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-900 flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Scientific Rigor</span>
                                <span className="font-mono text-purple-400 font-semibold">{crit.scientific_rigor_assessment.score}/10</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                <div className="flex justify-between border-b border-zinc-900 pb-0.5">
                                  <span className="text-zinc-500">Internal Validity:</span>
                                  <span className="text-white font-medium uppercase">{crit.scientific_rigor_assessment.internal_validity}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-0.5">
                                  <span className="text-zinc-500">External Validity:</span>
                                  <span className="text-white font-medium uppercase">{crit.scientific_rigor_assessment.external_validity}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-0.5">
                                  <span className="text-zinc-500">Power:</span>
                                  <span className="text-white font-medium uppercase">{crit.scientific_rigor_assessment.statistical_power}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-0.5">
                                  <span className="text-zinc-500">Confound Control:</span>
                                  <span className="text-white font-medium uppercase text-[9px]">{crit.scientific_rigor_assessment.confound_control}</span>
                                </div>
                              </div>
                              <p className="text-zinc-400 leading-relaxed font-light text-[11px] mt-1">
                                <strong>Rigor Recommendation:</strong> {crit.scientific_rigor_assessment.recommendation}
                              </p>
                            </div>
                          </div>

                          {/* Ethical concerns list */}
                          <div className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-lg text-xs flex flex-col gap-2">
                            <span className="font-bold text-white flex items-center gap-1">
                              <ShieldAlert className="w-4 h-4 text-orange-400" />
                              Ethical & IRB Safeguards
                            </span>
                            <div className="flex flex-wrap gap-4 text-[10px] text-zinc-400 mb-1">
                              <span>IRB Approval Required: <strong className="text-white">{crit.ethical_assessment.irb_required ? "Yes" : "No"}</strong></span>
                              <span>Animal Welfare: <strong className="text-white">{crit.ethical_assessment.animal_welfare_issues ? "Yes" : "No"}</strong></span>
                              <span>Data Privacy: <strong className="text-white">{crit.ethical_assessment.data_privacy_issues ? "Yes" : "No"}</strong></span>
                              <span>Dual Use Risk: <strong className="text-white">{crit.ethical_assessment.dual_use_risk ? "Yes" : "No"}</strong></span>
                            </div>
                            
                            {crit.ethical_assessment.concerns_identified && (
                              <div className="flex flex-col gap-1.5 border-t border-zinc-900 pt-2 mt-1">
                                {crit.ethical_assessment.concern_list.map((c, i) => (
                                  <div key={i} className="p-2 bg-red-950/10 border border-red-500/10 rounded flex justify-between gap-4">
                                    <div className="flex flex-col">
                                      <span className="text-red-300 font-medium">Issue: {c.concern}</span>
                                      <span className="text-zinc-400 text-[10px] mt-0.5">Mitigation: {c.mitigation}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 text-[9px] font-mono uppercase h-fit">
                                      {c.severity} Severity
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. FULL PROPOSAL TAB */}
                {activeTab === "proposal" && globalState && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    {/* Exporter control panel */}
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-bold text-white font-overusedGrotesk">Compile & Export Proposal</h4>
                        <span className="text-[10px] text-zinc-500">Document generated in complete academic format.</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(globalState.proposal, null, 2))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold hover:text-white transition-colors cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" />
                              <span className="text-green-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={downloadMarkdown}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Markdown</span>
                        </button>
                      </div>
                    </div>

                    {/* Academic Manuscript View */}
                    <div className="p-8 md:p-12 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col gap-8 shadow-inner select-text">
                      {/* Document Header */}
                      <div className="text-center flex flex-col gap-4 border-b border-zinc-900 pb-8">
                        <h1 className="text-2xl md:text-3xl font-calendas text-white leading-snug font-bold max-w-3xl mx-auto">
                          {globalState.proposal.title}
                        </h1>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest font-mono mt-1">
                          PROPOSAL IDENTIFIER: {globalState.session_id.substring(0, 8).toUpperCase()} // DATE: {new Date(globalState.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Abstract */}
                      <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          Abstract
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed font-light text-justify italic pl-4 border-l-2 border-purple-500/30">
                          {globalState.proposal.abstract}
                        </p>
                      </div>

                      {/* Section 1: Introduction */}
                      <div className="flex flex-col gap-3">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          1. Introduction & Background
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed font-light text-justify">
                          {globalState.proposal.sections["1_introduction"].background}
                        </p>
                        <div className="p-3 bg-zinc-900/30 rounded border border-zinc-900 mt-2">
                          <strong className="text-purple-400 text-[10px] block font-mono uppercase">Problem Statement:</strong>
                          <p className="text-xs text-gray-300 mt-1 font-light leading-relaxed">
                            {globalState.proposal.sections["1_introduction"].problem_statement}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <strong className="text-zinc-500 text-[9px] uppercase font-mono">Formal Research Inquiry:</strong>
                            <p className="text-xs text-white italic mt-1 font-light">
                              {globalState.proposal.sections["1_introduction"].research_question}
                            </p>
                          </div>
                          <div>
                            <strong className="text-zinc-500 text-[9px] uppercase font-mono">Significance & Scientific Impact:</strong>
                            <p className="text-xs text-zinc-400 mt-1 font-light leading-relaxed">
                              {globalState.proposal.sections["1_introduction"].significance}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Literature Review */}
                      <div className="flex flex-col gap-3">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          2. Literature Review & Citation Index
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed font-light text-justify">
                          {globalState.proposal.sections["2_literature_review"].content}
                        </p>
                        <div className="flex flex-col gap-1 mt-2">
                          <strong className="text-zinc-500 text-[9px] uppercase font-mono">Primary Citations:</strong>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {globalState.proposal.sections["2_literature_review"].citations.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 text-[10px] border border-zinc-800">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Hypotheses */}
                      <div className="flex flex-col gap-3">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          3. Testable Hypotheses
                        </h4>
                        <div className="flex flex-col gap-4 mt-2">
                          {[
                            globalState.proposal.sections["3_hypotheses"].hypothesis_1,
                            globalState.proposal.sections["3_hypotheses"].hypothesis_2,
                            globalState.proposal.sections["3_hypotheses"].hypothesis_3
                          ].map((h, i) => (
                            <div key={i} className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-lg flex flex-col gap-2">
                              <span className="font-bold text-white text-xs">
                                Hypothesis {i + 1}: {h.title}
                              </span>
                              <p className="text-xs text-gray-300 leading-relaxed font-light italic pl-3 border-l border-purple-500/25">
                                "{h.statement}"
                              </p>
                              <div className="grid grid-cols-2 gap-3 text-[10px] text-zinc-400 mt-1">
                                <div>
                                  <strong className="text-zinc-500 block text-[9px] uppercase font-mono">H₀:</strong> {h.null_hyp}
                                </div>
                                <div>
                                  <strong className="text-zinc-500 block text-[9px] uppercase font-mono">H₁:</strong> {h.alt_hyp}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 4: Methodology */}
                      <div className="flex flex-col gap-3">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          4. Experimental Methodology
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed font-light text-justify">
                          {globalState.proposal.sections["4_methodology"].overview}
                        </p>
                        
                        <div className="mt-3 p-4 bg-zinc-900/30 border border-zinc-900 rounded-lg flex flex-col gap-3">
                          <span className="font-bold text-purple-400 text-xs">
                            Prioritized Protocol (E1): {globalState.proposal.sections["4_methodology"].primary_experiment?.study_design}
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-light text-zinc-400">
                            <div>
                              <strong>Sample Size Rationale:</strong> {globalState.proposal.sections["4_methodology"].primary_experiment?.participants_or_subjects?.sample_size}
                            </div>
                            <div>
                              <strong>Blinding protocol:</strong> {globalState.proposal.sections["4_methodology"].primary_experiment?.procedure?.blinding}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 5: Ethical considerations */}
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          5. Ethical Considerations & Dual Use Risks
                        </h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-light text-justify">
                          {globalState.proposal.sections["5_ethical_considerations"]}
                        </p>
                      </div>

                      {/* Section 6: Budget & Timeline */}
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          6. Timeline and Budget Outline
                        </h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-light text-justify">
                          {globalState.proposal.sections["6_timeline_and_budget"]}
                        </p>
                      </div>

                      {/* Section 7: Expected Outcomes */}
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          7. Expected Outcomes & Implications
                        </h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-light text-justify">
                          {globalState.proposal.sections["7_expected_outcomes"]}
                        </p>
                      </div>

                      {/* Section 8: Limitations */}
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          8. Research Limitations
                        </h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-light text-justify">
                          {globalState.proposal.sections["8_limitations"]}
                        </p>
                      </div>

                      {/* Section 9: Future Directions */}
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-1">
                          9. Future Research Horizons
                        </h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-light text-justify">
                          {globalState.proposal.sections["9_future_directions"]}
                        </p>
                      </div>

                      {/* References */}
                      <div className="flex flex-col gap-3 border-t border-zinc-900 pt-6 mt-4">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          10. References
                        </h4>
                        <ul className="text-[10px] text-zinc-500 font-mono flex flex-col gap-2 list-none pl-0">
                          {globalState.proposal.sections["10_references"].map((ref, idx) => (
                            <li key={idx} className="pl-6 -indent-6 leading-normal text-justify">
                              {ref}
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>

          </main>
          
          {/* Dashboard Footer */}
          <footer className="mt-auto border-t border-zinc-800 bg-black py-4 px-6 flex items-center justify-between text-xs text-zinc-500">
            <span>Powered by Gemini generative models. Strictly sequential multi-agent execution pipeline.</span>
            <span>&copy; {new Date().getFullYear()} Autonomous Research Lab.</span>
          </footer>
        </div>
      )}
    </div>
  );
}
