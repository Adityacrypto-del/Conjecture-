import type { GlobalState, PaperObject } from "../../src/lib/types";
import type { RawPaper } from "./semanticScholar";

/** Best available canonical URL for a real paper. */
function paperUrl(raw: RawPaper): string {
  if (raw.externalIds?.DOI) return `https://doi.org/${raw.externalIds.DOI}`;
  if (raw.openAccessPdf?.url) return raw.openAccessPdf.url;
  if (raw.externalIds?.ArXiv) return `https://arxiv.org/abs/${raw.externalIds.ArXiv}`;
  return `https://www.semanticscholar.org/paper/${raw.paperId}`;
}

/**
 * Overwrites factual fields (title, authors, year, venue, citation count, URL)
 * on each LLM-produced paper with the REAL Semantic Scholar metadata, keyed by
 * paper_id. The LLM's interpretive fields (summary, findings, scores) are kept.
 * Papers whose id matches no retrieved paper are dropped — they were invented.
 */
export function reconcilePapers(
  llmPapers: PaperObject[],
  rawById: Map<string, RawPaper>
): PaperObject[] {
  if (!Array.isArray(llmPapers)) return [];
  const reconciled: PaperObject[] = [];

  for (const p of llmPapers) {
    const raw = rawById.get(p.paper_id);
    if (!raw) continue; // invented citation — drop it
    reconciled.push({
      ...p,
      paper_id: raw.paperId,
      title: raw.title || p.title,
      authors: raw.authors?.length ? raw.authors.map((a) => a.name) : p.authors,
      year: raw.year ?? p.year,
      venue: raw.venue || p.venue,
      citation_count: raw.citationCount ?? p.citation_count,
      doi_or_url: paperUrl(raw)
    });
  }

  return reconciled;
}

/** Builds a deterministic APA-style reference list from real paper metadata. */
export function buildReferences(papers: PaperObject[]): string[] {
  return papers.map((p) => {
    const authors = p.authors?.length ? p.authors.join(", ") : "Unknown author";
    const year = p.year || "n.d.";
    const venue = p.venue ? `${p.venue}. ` : "";
    return `${authors} (${year}). ${p.title}. ${venue}${p.doi_or_url}`;
  });
}

/** Short in-text citation tokens, e.g. "Smith et al. (2023)". */
export function buildInTextCitations(papers: PaperObject[]): string[] {
  return papers.map((p) => {
    const first = p.authors?.[0]?.split(",")[0]?.trim() || "Unknown";
    const etAl = (p.authors?.length || 0) > 1 ? " et al." : "";
    return `${first}${etAl} (${p.year || "n.d."})`;
  });
}

/**
 * Removes any paper_id cited by downstream agents that is not in the set of
 * retained (real) papers. Mutates the relevant arrays in place and returns the
 * list of dropped ids so they can be surfaced to the user.
 */
export function validateCitations(state: GlobalState, validIds: Set<string>): string[] {
  const dropped = new Set<string>();

  const filter = (ids: string[] | undefined): string[] => {
    if (!Array.isArray(ids)) return [];
    return ids.filter((id) => {
      if (validIds.has(id)) return true;
      dropped.add(id);
      return false;
    });
  };

  for (const h of state.hypotheses ?? []) {
    if (h.evidence_map) {
      h.evidence_map.supporting_papers = filter(h.evidence_map.supporting_papers);
      h.evidence_map.contradicting_papers = filter(h.evidence_map.contradicting_papers);
    }
  }

  for (const c of state.literature?.contradictions ?? []) {
    c.paper_ids_side_a = filter(c.paper_ids_side_a);
    c.paper_ids_side_b = filter(c.paper_ids_side_b);
  }

  return [...dropped];
}
