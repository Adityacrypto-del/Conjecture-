# Conjecture

> From question to grounded research proposal.

An AI research-proposal generator. Give it a research question and a pipeline of six
specialized agents searches the literature, generates hypotheses, designs experiments,
runs a peer-review critique, and compiles a full, citation-backed research proposal —
streaming each stage into the UI in real time.

Built with React 19 + TypeScript + Vite on the frontend and an **Express API** on the
backend. The pipeline and your API keys run **server-side** — keys are never exposed to
the browser. Supports **Google Gemini** and **Groq** as LLM providers, with an
**offline simulation mode** that needs no API key.

## Architecture

```
Browser (React SPA)                 Express API (server/)            External APIs
┌────────────────────┐  POST /api/pipeline  ┌──────────────────┐   ┌──────────────┐
│ App.tsx            │ ───────────────────▶ │ runFullResearch  │ ─▶│ Gemini /Groq │
│ lib/api.ts (SSE)   │ ◀─── SSE stream ──── │ Pipeline (6      │   │ Semantic     │
│ lib/simulator.ts   │   progress + state   │ stages)          │ ─▶│ Scholar      │
└────────────────────┘                      └──────────────────┘   └──────────────┘
        │                                      keys from .env (never sent to client)
        └─ Offline Sim runs fully in-browser, no network
```

The frontend sends a research question to the backend and receives each pipeline stage
back over **Server-Sent Events**, so the manuscript fills in live. In development, Vite
proxies `/api/*` to the Express server (`http://localhost:8787`).

## The pipeline

A research question flows through six sequential agents, each building on the shared
`GlobalState`:

| Stage | Agent | What it does |
| ----- | ----- | ------------ |
| 1 | **Orchestrator** | Parses the question into domain, variables (independent/dependent/confounding), research type, and search keywords. |
| 2 | **Literature Agent** | Queries the [Semantic Scholar API](https://api.semanticscholar.org), scores and filters papers, then synthesizes findings, knowledge gaps, consensus, and contradictions. |
| 3 | **Hypothesis Agent** | Generates three hypotheses using distinct strategies — gap-filling, mechanistic, and contrarian — each in If-Then-Because form with H₀/H₁ and falsification criteria. |
| 4 | **Experiment Agent** | Designs a full protocol per hypothesis (E1–E3): study design, sample size & power analysis, materials, procedure, statistics, timeline, and budget. |
| 5 | **Critique Agent** | Acts as a senior peer reviewer — scoring novelty, feasibility, ethics, and scientific rigor, then ranking the proposals. |
| 6 | **Synthesizer** | Assembles everything into a formal 10-section proposal with an abstract and APA references. |
| 7 | **Verification Agent** *(optional)* | Fact-checks each generated claim against the real source abstracts and reports a trust score. Off by default; toggle it in the Config drawer. |

The full schema for each stage lives in [`src/lib/types.ts`](src/lib/types.ts).

### Grounding & trust

To keep proposals honest, the backend:

- **Builds references and DOIs in code** from the real Semantic Scholar metadata — the model never writes the reference list, so citations can't be fabricated.
- **Validates every cited `paper_id`** against the papers actually retrieved, dropping any the model invented (surfaced as an "invented dropped" badge).
- **Reports grounding** (how many retrieved papers had abstracts) and warns when a run is weakly grounded.
- **Optionally verifies claims** against source abstracts when the Verification Agent is enabled, showing a colored trust-score badge on the proposal.

## Getting started

### Prerequisites

- Node.js 18+ and npm

### Install & run

```bash
npm install
cp .env.example .env   # then add your API key(s) — optional for Offline Sim
npm run dev
```

`npm run dev` starts **both** the Express API and the Vite dev server together. Open the
client at <http://localhost:5173>.

### Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start the backend API **and** Vite client together (HMR) |
| `npm run dev:client` | Start only the Vite frontend |
| `npm run dev:server` | Start only the Express API (watch mode) |
| `npm run build` | Type-check and build the frontend for production |
| `npm run start:server` | Run the backend API (production) |
| `npm run typecheck:server` | Type-check the `server/` code |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Execution modes

Open the **Config** drawer (gear icon in the dock) to choose a mode:

- **Offline Sim** — generates a realistic mock proposal locally. No API key required, great for demos and UI work.
- **Live Gemini** — runs the real pipeline against Google Gemini.
- **Live Groq** — runs the real pipeline against Groq.

### API keys

Keys live **server-side only**. Add them to a `.env` file in the project root (copy
`.env.example`):

```bash
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
PORT=8787
```

- Get a Gemini key from [Google AI Studio](https://aistudio.google.com/apikey).
- Get a Groq key from the [Groq Console](https://console.groq.com/keys).

The backend reads these from `process.env` and calls the providers directly, so the key
never reaches the browser. As a fallback, a user can still paste a key into the Config
drawer (bring-your-own-key) when the server has none configured.

### Supported models

| Provider | Models |
| -------- | ------ |
| Gemini | `gemini-2.5-flash` (default), `gemini-2.5-pro` |
| Groq | `llama-3.3-70b-versatile` (default), `deepseek-r1-distill-llama-70b` |

## Using the app

1. From the landing page, click through to the workbench.
2. Enter a research question, or pick one of the **quick-load templates**.
3. Choose your execution mode and model in the Config drawer.
4. Hit **Run Engine** in the dock and watch the manuscript compile stage by stage.
5. Inspect retrieved papers, protocols, and critiques in the right-hand panel.
6. Export the result as **Markdown** or copy the raw proposal **JSON**.

## Project structure

```
server/                     # Express backend (API keys + pipeline live here)
├── index.ts                # Express app, SSE /api/pipeline endpoint, /api/health
├── agents/
│   └── pipeline.ts         # 6-stage pipeline, queryLLM (Gemini+Groq), Semantic Scholar
└── tsconfig.json

src/
├── App.tsx                 # Main workbench UI, orchestration, export
├── lib/
│   ├── api.ts              # Frontend client — calls backend, parses the SSE stream
│   ├── simulator.ts        # Offline mock proposal generator (runs in-browser)
│   ├── types.ts            # GlobalState and all agent output schemas (shared)
│   └── utils.ts
└── components/
    └── ui/                 # Landing page, dock, animated globe, visual effects
```

## Tech stack

**Frontend:** React 19 · TypeScript · Vite · Tailwind CSS · Framer Motion · D3 · lucide-react
**Backend:** Node · Express · Server-Sent Events · dotenv
