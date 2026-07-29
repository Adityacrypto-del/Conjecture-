import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Maximize2, Minimize2, Network } from "lucide-react";
import type { GlobalState, PaperObject, HypothesisObject } from "@/lib/types";

/**
 * Force-directed evidence network for a completed pipeline run.
 *
 * Nodes:
 *   - papers      — sized by citation count, colored by stance toward the thesis
 *   - hypotheses  — H1/H2/H3, the claims the papers are marshalled for/against
 *
 * Edges are derived ONLY from real data in GlobalState (never fabricated):
 *   - support / contradict — from each hypothesis' evidence_map
 *   - contradiction        — cross-paper disagreements from literature.contradictions
 *   - related              — papers sharing an author or venue
 *
 * Rendering pattern: React owns the SVG DOM; the d3 force simulation only mutates
 * node positions, which are pushed into React state each tick. Dragging is handled
 * with React pointer events that pin a node's fx/fy on the live simulation.
 */

type NodeDatum = d3.SimulationNodeDatum & {
  id: string;
  kind: "paper" | "hypothesis";
  label: string;
  radius: number;
  color: string;
  paper?: PaperObject;
  hyp?: HypothesisObject;
};

type LinkKind = "support" | "contradict" | "related";
type LinkDatum = d3.SimulationLinkDatum<NodeDatum> & {
  kind: LinkKind;
  sourceId: string;
  targetId: string;
};

const STANCE_COLOR: Record<string, string> = {
  supports: "#34d399", // green
  contradicts: "#f87171", // red
  neutral: "#a1a1aa", // zinc
  mixed: "#fbbf24", // amber
};
const HYP_COLOR = "#c084fc"; // purple

const LINK_STYLE: Record<LinkKind, { stroke: string; dash?: string; opacity: number }> = {
  support: { stroke: "#34d399", opacity: 0.5 },
  contradict: { stroke: "#f87171", dash: "4 3", opacity: 0.6 },
  related: { stroke: "#3f3f46", opacity: 0.5 },
};

function paperRadius(citations: number): number {
  // sqrt scale keeps a 2000-citation paper from dwarfing a 20-citation one.
  return Math.max(6, Math.min(20, 6 + Math.sqrt(Math.max(0, citations)) * 0.7));
}

function buildGraph(state: GlobalState): { nodes: NodeDatum[]; links: LinkDatum[] } {
  const papers = state.literature?.papers ?? [];
  const hypotheses = state.hypotheses ?? [];

  const nodes: NodeDatum[] = [];
  const nodeIds = new Set<string>();

  for (const p of papers) {
    if (!p.paper_id || nodeIds.has(p.paper_id)) continue;
    nodeIds.add(p.paper_id);
    nodes.push({
      id: p.paper_id,
      kind: "paper",
      label: p.title || "Untitled",
      radius: paperRadius(p.citation_count || 0),
      color: STANCE_COLOR[p.supports_direction] || STANCE_COLOR.neutral,
      paper: p,
    });
  }

  for (const h of hypotheses) {
    if (!h.hypothesis_id || nodeIds.has(h.hypothesis_id)) continue;
    nodeIds.add(h.hypothesis_id);
    nodes.push({
      id: h.hypothesis_id,
      kind: "hypothesis",
      label: h.hypothesis_id,
      radius: 16,
      color: HYP_COLOR,
      hyp: h,
    });
  }

  // Dedupe links by unordered endpoint pair + kind.
  const seen = new Set<string>();
  const links: LinkDatum[] = [];
  const addLink = (a: string, b: string, kind: LinkKind) => {
    if (a === b || !nodeIds.has(a) || !nodeIds.has(b)) return;
    const key = [a, b].sort().join("|") + "|" + kind;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source: a, target: b, sourceId: a, targetId: b, kind });
  };

  // Hypothesis → paper evidence edges.
  for (const h of hypotheses) {
    const em = h.evidence_map;
    if (!em) continue;
    (em.supporting_papers || []).forEach((pid) => addLink(h.hypothesis_id, pid, "support"));
    (em.contradicting_papers || []).forEach((pid) => addLink(h.hypothesis_id, pid, "contradict"));
  }

  // Cross-paper contradictions (capped so a big disagreement can't hairball the view).
  for (const c of state.literature?.contradictions ?? []) {
    const a = (c.paper_ids_side_a || []).slice(0, 3);
    const b = (c.paper_ids_side_b || []).slice(0, 3);
    for (const x of a) for (const y of b) addLink(x, y, "contradict");
  }

  // Relatedness: shared author or shared (non-generic) venue.
  const GENERIC = new Set(["", "academic journal", "journal", "n/a", "unknown"]);
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const p1 = papers[i];
      const p2 = papers[j];
      const authors1 = new Set((p1.authors || []).map((a) => a.toLowerCase().trim()));
      const sharesAuthor = (p2.authors || []).some((a) => authors1.has(a.toLowerCase().trim()));
      const v1 = (p1.venue || "").toLowerCase().trim();
      const v2 = (p2.venue || "").toLowerCase().trim();
      const sharesVenue = v1 && v1 === v2 && !GENERIC.has(v1);
      if (sharesAuthor || sharesVenue) addLink(p1.paper_id, p2.paper_id, "related");
    }
  }

  return { nodes, links };
}

function useContainerSize(ref: React.RefObject<HTMLElement | null>, reattachKey: unknown) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    // Only update state when the size genuinely changed — returning the previous
    // object on a no-op keeps ResizeObserver from re-rendering into an infinite
    // measure→render→measure loop (which freezes the tab in fullscreen).
    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // reattachKey forces re-observation when the observed element is swapped
    // in the tree (e.g. entering/exiting fullscreen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, reattachKey]);
  return size;
}

export default function CitationGraph({ state }: { state: GlobalState }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [hovered, setHovered] = useState<NodeDatum | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<NodeDatum, LinkDatum> | null>(null);
  const nodesRef = useRef<NodeDatum[]>([]);
  const draggingRef = useRef<string | null>(null);
  const size = useContainerSize(wrapRef, fullscreen);

  const { nodes, links } = useMemo(() => buildGraph(state), [state]);

  // Build the force simulation and settle it SYNCHRONOUSLY.
  //
  // We deliberately don't rely on d3's async (requestAnimationFrame) timer: in
  // React StrictMode the effect's setup/cleanup can stop the simulation before
  // its first animation frame ever fires, leaving every node stuck at center.
  // Running a fixed batch of ticks in-line produces a stable layout every time,
  // independent of timers. Drag then re-settles on demand (see handlers below).
  const flush = () => {
    const width = size.width;
    const height = size.height;
    const next: Record<string, { x: number; y: number }> = {};
    for (const n of nodesRef.current) {
      // Clamp inside the viewport so no node drifts off-screen in the narrow panel.
      const pad = n.radius + 4;
      const x = Math.max(pad, Math.min(width - pad, n.x ?? width / 2));
      const y = Math.max(pad, Math.min(height - pad, n.y ?? height / 2));
      n.x = x;
      n.y = y;
      next[n.id] = { x, y };
    }
    setPositions(next);
  };

  useEffect(() => {
    if (size.width === 0 || size.height === 0 || nodes.length === 0) return;

    const width = size.width;
    const height = size.height;
    // Fresh node objects so re-runs don't inherit stale fixed positions.
    const simNodes: NodeDatum[] = nodes.map((n) => ({ ...n }));
    const simLinks: LinkDatum[] = links.map((l) => ({ ...l, source: l.sourceId, target: l.targetId }));
    nodesRef.current = simNodes;

    // Scale spacing with the canvas so the graph stays compact in the narrow
    // inspector panel but spreads out to fill the fullscreen view.
    const spread = Math.max(1, Math.min(3, Math.min(width, height) / 300));

    const sim = d3
      .forceSimulation<NodeDatum>(simNodes)
      .force(
        "link",
        d3
          .forceLink<NodeDatum, LinkDatum>(simLinks)
          .id((d) => d.id)
          .distance((l) => (l.kind === "related" ? 70 : 55) * spread)
          .strength(0.25)
      )
      .force("charge", d3.forceManyBody().strength(-140 * spread))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.07))
      .force("y", d3.forceY(height / 2).strength(0.07))
      .force("collide", d3.forceCollide<NodeDatum>().radius((d) => d.radius + 6))
      .stop();

    simRef.current = sim;

    // Settle to a good static layout, then paint once.
    const ticks = Math.min(400, Math.max(200, Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay()))));
    for (let i = 0; i < ticks; i++) sim.tick();
    flush();

    return () => {
      sim.stop();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, size.width, size.height]);

  // ---- Drag handling via React pointer events on the live simulation ----
  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = id;
    const node = nodesRef.current.find((n) => n.id === id);
    if (node) {
      const { x, y } = clientToSvg(e.clientX, e.clientY);
      node.fx = x;
      node.fy = y;
      flush();
    }
  };

  const onSvgPointerMove = (e: React.PointerEvent) => {
    const id = draggingRef.current;
    if (!id) return;
    const sim = simRef.current;
    const node = nodesRef.current.find((n) => n.id === id);
    if (node) {
      const { x, y } = clientToSvg(e.clientX, e.clientY);
      node.fx = x;
      node.fy = y;
      // Re-settle the neighbourhood a little so edges follow the dragged node.
      if (sim) for (let i = 0; i < 3; i++) sim.tick();
      flush();
    }
  };

  const endDrag = () => {
    const id = draggingRef.current;
    if (!id) return;
    draggingRef.current = null;
    const node = nodesRef.current.find((n) => n.id === id);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  };

  const empty = nodes.length === 0;
  const pos = (id: string) => positions[id] || { x: size.width / 2, y: size.height / 2 };

  const graphBody = (
    <div
      ref={wrapRef}
      className="relative w-full h-full min-h-[320px] bg-zinc-950 overflow-hidden"
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      {empty ? (
        <div className="absolute inset-0 flex items-center justify-center text-center px-6">
          <span className="text-[11px] text-zinc-600 font-mono">No retrieved papers to graph yet.</span>
        </div>
      ) : (
        <svg
          ref={svgRef}
          width={size.width}
          height={size.height}
          className="block touch-none"
          onPointerMove={onSvgPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <g className="links">
            {links.map((l, i) => {
              const s = LINK_STYLE[l.kind];
              const a = pos(l.sourceId);
              const b = pos(l.targetId);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={s.stroke}
                  strokeOpacity={s.opacity}
                  strokeWidth={1.2}
                  strokeDasharray={s.dash}
                />
              );
            })}
          </g>
          <g className="nodes">
            {nodes.map((n) => {
              const p = pos(n.id);
              return (
                <g
                  key={n.id}
                  className="node cursor-grab active:cursor-grabbing"
                  transform={`translate(${p.x},${p.y})`}
                  onPointerDown={(e) => onNodePointerDown(e, n.id)}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {n.kind === "hypothesis" ? (
                    <rect
                      x={-n.radius}
                      y={-n.radius}
                      width={n.radius * 2}
                      height={n.radius * 2}
                      rx={4}
                      transform="rotate(45)"
                      fill={n.color}
                      fillOpacity={hovered && hovered.id !== n.id ? 0.35 : 0.85}
                      stroke="#000"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <circle
                      r={n.radius}
                      fill={n.color}
                      fillOpacity={hovered && hovered.id !== n.id ? 0.3 : 0.85}
                      stroke="#000"
                      strokeWidth={1.5}
                    />
                  )}
                  {n.kind === "hypothesis" && (
                    <text textAnchor="middle" dy="0.35em" fontSize={10} fontWeight={700} fill="#1a1a1a" pointerEvents="none">
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-20 max-w-[240px] p-2.5 bg-black border border-zinc-700 rounded-lg shadow-xl text-[10px] leading-snug"
          style={{ left: Math.min(mouse.x + 12, (size.width || 300) - 240), top: mouse.y + 12 }}
        >
          {hovered.kind === "paper" && hovered.paper ? (
            <>
              <div className="font-semibold text-white mb-1">{hovered.paper.title}</div>
              <div className="text-zinc-400">
                {(hovered.paper.authors || []).slice(0, 3).join(", ")}
                {(hovered.paper.authors || []).length > 3 ? " et al." : ""} · {hovered.paper.year}
              </div>
              <div className="text-zinc-500">{hovered.paper.venue}</div>
              <div className="mt-1 flex gap-2 text-zinc-400 font-mono">
                <span>{hovered.paper.citation_count} cites</span>
                <span>·</span>
                <span>R:{hovered.paper.relevance_score}</span>
                <span>·</span>
                <span style={{ color: hovered.color }}>{hovered.paper.supports_direction}</span>
              </div>
            </>
          ) : hovered.hyp ? (
            <>
              <div className="font-semibold text-purple-300 mb-1">
                {hovered.hyp.hypothesis_id}: {hovered.hyp.title}
              </div>
              <div className="text-zinc-400">{hovered.hyp.strategy}</div>
              <div className="mt-1 text-zinc-400 font-mono">
                Novelty {hovered.hyp.novelty_score}/10 · Testability {hovered.hyp.testability_score}/10
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Legend */}
      {!empty && (
        <div className="absolute bottom-2 left-2 z-10 flex flex-wrap gap-x-3 gap-y-1 p-2 bg-black/60 backdrop-blur rounded-md text-[8px] font-mono text-zinc-400">
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: STANCE_COLOR.supports }} />supports</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: STANCE_COLOR.contradicts }} />contradicts</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: STANCE_COLOR.neutral }} />neutral</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 inline-block rotate-45" style={{ background: HYP_COLOR }} />hypothesis</span>
          <span className="text-zinc-600">· size = citations</span>
        </div>
      )}

      {/* Fullscreen toggle */}
      <button
        onClick={() => setFullscreen((f) => !f)}
        className="absolute top-2 right-2 z-10 p-1.5 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 rounded-md text-zinc-400 hover:text-white transition-all cursor-pointer"
        title={fullscreen ? "Exit fullscreen" : "Expand graph"}
      >
        {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">Evidence Network</span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {nodes.length} nodes · {links.length} links
          </span>
        </div>
        <div className="flex-1 border border-zinc-800 rounded-xl overflow-hidden">{graphBody}</div>
      </div>
    );
  }

  return <div className="w-full h-[360px]">{graphBody}</div>;
}
